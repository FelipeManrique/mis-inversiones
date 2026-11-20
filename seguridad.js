/* Mis Inversiones — Copyright (c) 2026 Felipe Manrique. Todos los derechos reservados. */
/* Seguridad (mismo esquema que Mis Finanzas: AES-GCM 256 + PBKDF2-SHA256 600 000 iteraciones).
   - PIN de ingreso: con PIN activo los datos del teléfono quedan CIFRADOS con una clave derivada del PIN
     (no es sólo una pantalla: sin el PIN no se pueden leer). Límite de intentos con espera creciente.
   - Copias: el archivo que se baja va cifrado con una contraseña (mín. 8 caracteres). */
(function (root) {
  'use strict';
  // No dejar que otra página la muestre dentro de un marco (GitHub Pages no permite cabeceras anti-clickjacking).
  if (root.top !== root.self) { try { root.top.location = root.self.location; } catch (e) { document.documentElement.innerHTML = ''; } }

  const subtle = root.crypto.subtle;
  const ITER = 600000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const K_SOBRE = 'mis-inversiones:cifrado';
  const K_INTENTOS = 'mis-inversiones:intentos';

  const b64 = (buf) => { const by = new Uint8Array(buf); let s = ''; for (let i = 0; i < by.length; i += 0x8000) s += String.fromCharCode.apply(null, by.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const azar = (n) => root.crypto.getRandomValues(new Uint8Array(n));

  async function derivar(secreto, sal, iter) {
    const base = await subtle.importKey('raw', enc.encode(String(secreto).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter || ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function claveNueva(secreto) { const sal = azar(16); return { key: await derivar(secreto, sal), salt: b64(sal), iter: ITER }; }
  async function claveDeSobre(secreto, sobre) { return { key: await derivar(secreto, unb64(sobre.salt), sobre.iter || ITER), salt: sobre.salt, iter: sobre.iter || ITER }; }
  async function sellar(k, obj, extra) {
    const iv = azar(12);
    const data = await subtle.encrypt({ name: 'AES-GCM', iv }, k.key, enc.encode(JSON.stringify(obj)));
    return Object.assign({ v: 1, app: 'mis-inversiones', kdf: 'PBKDF2-SHA256', iter: k.iter, salt: k.salt, iv: b64(iv), data: b64(data) }, extra || {});
  }
  async function abrir(k, sobre) {   // tira error si la clave no corresponde (AES-GCM verifica integridad)
    const plano = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(sobre.iv) }, k.key, unb64(sobre.data));
    return JSON.parse(dec.decode(plano));
  }

  /* ---------- PIN ---------- */
  let clavePin = null;           // CryptoKey en memoria mientras la app está desbloqueada
  const leerSobre = () => { try { return JSON.parse(localStorage.getItem(K_SOBRE)); } catch (e) { return null; } };
  const activo = () => !!leerSobre();
  const intentos = {
    get() { try { return JSON.parse(localStorage.getItem(K_INTENTOS)) || { n: 0, hasta: 0 }; } catch (e) { return { n: 0, hasta: 0 }; } },
    set(x) { try { localStorage.setItem(K_INTENTOS, JSON.stringify(x)); } catch (e) {} },
  };
  // 5 fallos → 30 s; cada fallo extra duplica la espera (tope 1 h).
  const espera = (n) => (n < 5 ? 0 : Math.min(3600, 30 * Math.pow(2, n - 5))) * 1000;

  async function activar(pin, datos) {
    clavePin = await claveNueva(pin);
    localStorage.setItem(K_SOBRE, JSON.stringify(await sellar(clavePin, datos, { largo: String(pin).length })));
  }
  async function guardar(datos) {
    if (!clavePin) throw new Error('bloqueada');
    const s = leerSobre();
    localStorage.setItem(K_SOBRE, JSON.stringify(await sellar(clavePin, datos, { largo: s ? s.largo : 4 })));
  }
  async function probar(pin) {
    const sobre = leerSobre(); if (!sobre) return null;
    const k = await claveDeSobre(pin, sobre);
    const datos = await abrir(k, sobre);    // error = PIN incorrecto
    clavePin = k; return datos;
  }
  // Reinicio corto (al cambiar el tema): la llave del PIN (CryptoKey, no exportable) se guarda 15 s en IndexedDB
  // para no pedir el PIN de nuevo en ESE reinicio. Se borra apenas se usa o vence.
  function idbSesion() { return new Promise((res, rej) => { const r = indexedDB.open('mis-inversiones-sesion', 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function sesionCorta() {
    if (!clavePin) return;
    const d = await idbSesion();
    await new Promise((res, rej) => { const tx = d.transaction('s', 'readwrite'); tx.objectStore('s').put({ k: clavePin, t: Date.now() }, 'x'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function retomarSesion() {
    try {
      const d = await idbSesion();
      const v = await new Promise((res) => { const tx = d.transaction('s', 'readwrite'), st = tx.objectStore('s'), q = st.get('x'); q.onsuccess = () => { st.delete('x'); res(q.result); }; q.onerror = () => res(null); });
      if (!v || Date.now() - v.t > 15000) return null;
      const datos = await abrir(v.k, leerSobre()); clavePin = v.k; return datos;
    } catch (e) { return null; }
  }
  function quitar() { clavePin = null; localStorage.removeItem(K_SOBRE); localStorage.removeItem('mis-inversiones:faceid'); }

  /* ---------- pantalla de PIN (teclado propio, como el de iOS) ---------- */
  function teclado(opts) {
    // opts: {titulo, sub, largo (fijo) | elegirLargo, alListo(pin) => Promise<string|null error>, cancelable}
    return new Promise((resolve) => {
      let largo = opts.largo || 4, pin = '';
      const el = document.createElement('div');
      el.className = 'lock'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = `<div class="lock-in">
        <div class="lock-ic"><svg class="i" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg></div>
        <h2 class="lock-t"></h2><p class="lock-s"></p>
        <div class="lock-dots" aria-live="polite"></div>
        ${opts.elegirLargo ? '<div class="seg lock-len"><button data-l="4" class="on">4 dígitos</button><button data-l="6">6 dígitos</button></div>' : ''}
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('')}
          ${!opts.cancelable && opts.bio ? `<button class="pad-txt pad-bio" data-x="bio" aria-label="Desbloquear con Face ID">${ICONO_FACE}</button>` : `<button class="pad-txt" data-x="cancel">${opts.cancelable ? 'Cancelar' : ''}</button>`}<button data-d="0">0</button>
          <button class="pad-txt" data-x="del" aria-label="Borrar"><svg class="i" viewBox="0 0 24 24"><path d="M21 5H9l-6 7 6 7h12z"/><path d="m16 9-5 6m0-6 5 6"/></svg></button></div></div>`;
      document.body.appendChild(el);
      const t = el.querySelector('.lock-t'), s = el.querySelector('.lock-s'), dots = el.querySelector('.lock-dots');
      t.textContent = opts.titulo; s.textContent = opts.sub || '';
      let ocupado = false, tEspera = null;
      const pintar = () => { dots.innerHTML = Array.from({ length: largo }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
      const bloqueo = () => {
        if (!opts.conLimite) return false;
        const it = intentos.get(), falta = it.hasta - Date.now();
        if (falta > 0) {
          s.textContent = `Demasiados intentos. Esperá ${Math.ceil(falta / 1000)} s.`;
          clearTimeout(tEspera); tEspera = setTimeout(() => { if (!bloqueo()) s.textContent = opts.sub || ''; }, 1000);
          return true;
        }
        return false;
      };
      const cerrar = (v) => { clearTimeout(tEspera); el.classList.add('out'); setTimeout(() => el.remove(), 250); resolve(v); };
      const tecla = async (d) => {
        if (ocupado) return;
        if (d === 'bio') {   // Face ID: si devuelve el PIN, se verifica como si lo hubieras escrito (no cuenta como intento fallido si se cancela)
          if (!opts.bio) return;
          ocupado = true; s.textContent = 'Mirá el teléfono…';
          const p = await opts.bio();
          ocupado = false;
          if (!p) { s.textContent = opts.sub || ''; bloqueo(); return; }
          pin = p.slice(0, largo); pintar();
        } else {
          if (bloqueo()) return;
          if (d === 'del') { pin = pin.slice(0, -1); pintar(); return; }
          if (d === 'cancel') { if (opts.cancelable) cerrar(null); return; }
          if (pin.length >= largo) return;
          pin += d; pintar();
          if (pin.length < largo) return;
        }
        ocupado = true; s.textContent = 'Verificando…';
        const error = await opts.alListo(pin);
        ocupado = false;
        if (!error) { cerrar(pin); return; }
        el.querySelector('.lock-in').classList.remove('shake'); void el.offsetWidth; el.querySelector('.lock-in').classList.add('shake');
        if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
        pin = ''; pintar(); s.textContent = error; bloqueo();
      };
      el.querySelectorAll('.pad button').forEach((b) => { b.onclick = () => tecla(b.dataset.d !== undefined ? b.dataset.d : b.dataset.x); });
      el.querySelectorAll('.lock-len button').forEach((b) => { b.onclick = () => { largo = +b.dataset.l; pin = ''; el.querySelectorAll('.lock-len button').forEach((x) => x.classList.toggle('on', x === b)); pintar(); }; });
      const teclas = (e) => { if (!document.body.contains(el)) { root.removeEventListener('keydown', teclas); return; } if (/^\d$/.test(e.key)) tecla(e.key); else if (e.key === 'Backspace') tecla('del'); else if (e.key === 'Escape') tecla('cancel'); };
      root.addEventListener('keydown', teclas);
      pintar(); bloqueo();
      if (opts.bio && opts.bioAuto) setTimeout(() => tecla('bio'), 450);   // se intenta solo al abrir
    });
  }

  // Pide el PIN guardado (al abrir la app o antes de cambiarlo/quitarlo), con límite de intentos.
  // Devuelve los datos descifrados, o null si se canceló.
  async function pedirPin(opts) {
    opts = opts || {};
    const sobre = leerSobre();
    let datos = null;
    const conBio = !opts.cancelable && !!bioGuardado();
    const ok = await teclado({
      titulo: opts.titulo || 'Mis Inversiones', sub: opts.sub || (conBio ? 'Usá Face ID o ingresá tu PIN' : 'Ingresá tu PIN'), largo: sobre.largo || 4, conLimite: true, cancelable: !!opts.cancelable,
      bio: conBio ? async () => { try { return await pinPorBio(); } catch (e) { return null; } } : null, bioAuto: conBio,
      alListo: async (pin) => {
        try { datos = await probar(pin); intentos.set({ n: 0, hasta: 0 }); return null; } catch (e) {
          const it = intentos.get(); it.n += 1; it.hasta = Date.now() + espera(it.n); intentos.set(it);
          return it.n >= 5 ? 'PIN incorrecto' : `PIN incorrecto · te quedan ${5 - it.n} intento${5 - it.n === 1 ? '' : 's'} antes de esperar`;
        }
      },
    });
    if (!ok) return null;
    return opts.conPin ? { datos, pin: ok } : datos;
  }

  /* ---------- Face ID (llave de acceso del iPhone + extensión PRF) ----------
     Al activarlo, el iPhone crea una llave de acceso protegida con tu cara. Esa llave entrega un secreto (PRF)
     que sólo sale después de Face ID; con él se cifra tu PIN. Al abrir, Face ID → secreto → PIN → datos.
     Sin tu cara (o el código del iPhone) el PIN no se puede leer. Necesita iOS 18 o más nuevo. */
  const K_BIO = 'mis-inversiones:faceid';
  const ICONO_FACE = '<svg class="i" viewBox="0 0 24 24"><path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M9 9v1.5M15 9v1.5M12 9v4.5h-1M9.5 16.5c1.4 1 3.6 1 5 0"/></svg>';
  function bioGuardado() { try { return JSON.parse(localStorage.getItem(K_BIO)); } catch (e) { return null; } }
  async function bioDisponible() {
    try { return !!(root.PublicKeyCredential && navigator.credentials && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
  }
  async function secretoBio(credId, sal) {
    const a = await navigator.credentials.get({ publicKey: {
      challenge: azar(32), rpId: location.hostname, timeout: 60000, userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: credId, transports: ['internal', 'hybrid'] }],
      extensions: { prf: { eval: { first: sal } } } } });
    const r = a.getClientExtensionResults(), out = r && r.prf && r.prf.results && r.prf.results.first;
    if (!out) throw new Error('sin_prf');
    return subtle.importKey('raw', new Uint8Array(out), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async function activarBio(pin) {
    const sal = azar(32);
    const cred = await navigator.credentials.create({ publicKey: {
      rp: { name: 'Mis Inversiones', id: location.hostname },
      user: { id: azar(16), name: 'Mis Inversiones', displayName: 'Mis Inversiones' },
      challenge: azar(32), timeout: 60000,
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
      extensions: { prf: { eval: { first: sal } } } } });
    const ext = cred.getClientExtensionResults() || {};
    if (!ext.prf || ext.prf.enabled === false) throw new Error('sin_prf');
    const credId = new Uint8Array(cred.rawId);
    const k = ext.prf.results && ext.prf.results.first
      ? await subtle.importKey('raw', new Uint8Array(ext.prf.results.first), 'AES-GCM', false, ['encrypt', 'decrypt'])
      : await secretoBio(credId, sal);   // algunos iPhone dan el secreto recién al usar la llave
    const iv = azar(12);
    const data = await subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(String(pin)));
    localStorage.setItem(K_BIO, JSON.stringify({ id: b64(credId), sal: b64(sal), iv: b64(iv), data: b64(data) }));
  }
  async function pinPorBio() {
    const g = bioGuardado(); if (!g) return null;
    const k = await secretoBio(unb64(g.id), unb64(g.sal));
    return dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(g.iv) }, k, unb64(g.data)));
  }
  function quitarBio() { localStorage.removeItem(K_BIO); }

  // Elegir un PIN nuevo (dos veces). Devuelve el PIN o null.
  async function elegirPin() {
    const obvio = (p) => /^(\d)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p);
    const p1 = await teclado({ titulo: 'Elegí un PIN', sub: 'Lo vas a usar para abrir la app', elegirLargo: true, cancelable: true, alListo: async (p) => (obvio(p) ? 'Muy fácil de adivinar. Probá otro.' : null) });
    if (!p1) return null;
    const p2 = await teclado({ titulo: 'Repetí el PIN', largo: p1.length, cancelable: true, alListo: async (p) => (p === p1 ? null : 'No coincide. Probá de nuevo.') });
    return p2 || null;
  }

  root.Seguridad = { activo, activar, guardar, probar, quitar, pedirPin, elegirPin, teclado, sellar, abrir, claveNueva, claveDeSobre, desbloqueada: () => !!clavePin,
    bioDisponible, activarBio, quitarBio, bioActivo: () => !!bioGuardado(), sesionCorta, retomarSesion };
})(self);
