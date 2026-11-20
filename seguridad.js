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
  function quitar() { clavePin = null; localStorage.removeItem(K_SOBRE); }

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
          <button class="pad-txt" data-x="cancel">${opts.cancelable ? 'Cancelar' : ''}</button><button data-d="0">0</button>
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
        if (ocupado || bloqueo()) return;
        if (d === 'del') { pin = pin.slice(0, -1); pintar(); return; }
        if (d === 'cancel') { if (opts.cancelable) cerrar(null); return; }
        if (pin.length >= largo) return;
        pin += d; pintar();
        if (pin.length < largo) return;
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
    });
  }

  // Pide el PIN guardado (al abrir la app o antes de cambiarlo/quitarlo), con límite de intentos.
  // Devuelve los datos descifrados, o null si se canceló.
  async function pedirPin(opts) {
    opts = opts || {};
    const sobre = leerSobre();
    let datos = null;
    const ok = await teclado({
      titulo: opts.titulo || 'Mis Inversiones', sub: opts.sub || 'Ingresá tu PIN', largo: sobre.largo || 4, conLimite: true, cancelable: !!opts.cancelable,
      alListo: async (pin) => {
        try { datos = await probar(pin); intentos.set({ n: 0, hasta: 0 }); return null; } catch (e) {
          const it = intentos.get(); it.n += 1; it.hasta = Date.now() + espera(it.n); intentos.set(it);
          return it.n >= 5 ? 'PIN incorrecto' : `PIN incorrecto · te quedan ${5 - it.n} intento${5 - it.n === 1 ? '' : 's'} antes de esperar`;
        }
      },
    });
    return ok ? datos : null;
  }

  // Elegir un PIN nuevo (dos veces). Devuelve el PIN o null.
  async function elegirPin() {
    const obvio = (p) => /^(\d)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p);
    const p1 = await teclado({ titulo: 'Elegí un PIN', sub: 'Lo vas a usar para abrir la app', elegirLargo: true, cancelable: true, alListo: async (p) => (obvio(p) ? 'Muy fácil de adivinar. Probá otro.' : null) });
    if (!p1) return null;
    const p2 = await teclado({ titulo: 'Repetí el PIN', largo: p1.length, cancelable: true, alListo: async (p) => (p === p1 ? null : 'No coincide. Probá de nuevo.') });
    return p2 || null;
  }

  root.Seguridad = { activo, activar, guardar, probar, quitar, pedirPin, elegirPin, teclado, sellar, abrir, claveNueva, claveDeSobre, desbloqueada: () => !!clavePin };
})(self);
