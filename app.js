/* Mis Inversiones — Copyright (c) 2026 Felipe Manrique. Todos los derechos reservados. */
(function () {
  'use strict';
  const C = window.Calc;
  const $ = (id) => document.getElementById(id);
  const KEY = 'mis-inversiones:v1';
  const KEY_GEMINI = 'mis-inversiones:gemini';
  const KEY_Q = 'mis-inversiones:cotizaciones';
  const VERSION = '2.0.1';
  const ESP = ' ';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= utilidades ================= */
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaCorta = (iso) => { const [y, m, d] = iso.split('-'); return +d + ' ' + MESES[+m - 1].slice(0, 3) + (y !== hoyISO().slice(0, 4) ? ' ' + y : ''); };
  const ars = (x) => '$' + ESP + C.num(x, Math.abs(x) >= 1000 ? 0 : 2);
  const usd = (x) => 'US$' + ESP + C.num(x, Math.abs(x) >= 100000 ? 0 : 2);
  const conSigno = (x, f) => (x > 0.004 ? '+' : '') + f(x);
  const pctf = (p) => (p === null || p === undefined || !isFinite(p) ? '—' : (p > 0.00005 ? '+' : '') + C.num(p * 100, Math.abs(p) >= 10 ? 0 : 1) + ' %');
  const clsSigno = (x, tol) => (x > (tol || 0.5) ? 'pos' : x < -(tol || 0.5) ? 'neg' : 'neu');
  const precioF = (px, cur) => (cur === 'USD' ? 'US$' : '$') + ESP + C.num(px, C.decimalesPrecio(px));
  const COLOR_CLASE = { cedear: 'var(--c1)', accion: 'var(--c9)', bono: 'var(--c2)', on: 'var(--c6)', letra: 'var(--c4)', cripto: 'var(--c3)', usa: 'var(--c5)', fci: 'var(--c7)', otro: 'var(--c8)', efectivo: 'var(--c8)' };
  const PALETA = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c9)', 'var(--c8)'];
  const ic = (d) => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
  const I = {
    in: ic('<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 21h14"/>'),
    out: ic('<path d="M12 21V9m-5 5 5-5 5 5"/><path d="M5 3h14"/>'),
    buy: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
    sell: ic('<path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/>'),
    coin: ic('<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v2m0 8v2"/>'),
    cam: ic('<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>'),
    pen: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    x: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
    chart: ic('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    trash: ic('<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>'),
    spark: ic('<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>'),
    nube: ic('<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.25 4.25 0 0 1-.25 8.5z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>'),
  };
  const TIPOS = {
    ingreso: { nombre: 'Ingreso de dinero', icon: I.in },
    compra: { nombre: 'Compra', icon: I.buy },
    venta: { nombre: 'Venta', icon: I.sell },
    retiro: { nombre: 'Retiro de dinero', icon: I.out },
    renta: { nombre: 'Dividendo / cupón / renta', icon: I.coin },
  };

  // BTCUSDT → BTC en cripto; sin espacios en todos
  function limpiarTicker(t, clase) {
    t = String(t || '').toUpperCase().replace(/\s+/g, '');
    if (clase === 'cripto') { const x = t.replace(/[/-]?(USDT|USDC|USD|ARS)$/, ''); if (x.length >= 2) t = x; }
    return t;
  }

  /* ================= estado ================= */
  const VACIO = () => ({
    v: 1, movs: [], carteras: [{ id: 'principal', nombre: 'Principal' }],
    personas: [{ id: 'yo', nombre: 'Yo', letra: 'M', color: '#FF8D28' }, { id: 'novia', nombre: 'Mi novia', letra: 'P', color: '#FF5C8A' }],
    seguir: [], manual: {}, nombres: {}, snaps: {}, fxCache: {},
    ajustes: { tema: '', intervalo: 30, cartera: '', persona: '' },
  });
  let S = VACIO();
  const KEY_TEMA = 'mis-inversiones:tema';     // se guarda aparte (sin cifrar) para pintar la pantalla del PIN
  const Seg = window.Seguridad;
  function cargar(x) {
    if (!x) { try { x = JSON.parse(localStorage.getItem(KEY)); } catch (e) { x = null; } }
    if (x && Array.isArray(x.movs)) S = Object.assign(VACIO(), x, { ajustes: Object.assign(VACIO().ajustes, x.ajustes) });
    S.personas.forEach((p, i) => { if (!p.color) p.color = COLORES_PERSONA[i % COLORES_PERSONA.length]; });
  }
  const ACENTOS = ['#FF8D28', '#0088FF', '#34C759', '#00A2B0', '#6155F5', '#FF2D55', '#CB30E0', '#FFB800'];
  const COLORES_PERSONA = ['#FF8D28', '#FF5C8A', '#00A2B0', '#6155F5', '#34A853', '#FFB800'];
  const colorDe = (pid) => ((S.personas.find((p) => p.id === pid) || {}).color) || '#8E8A85';
  // Etiqueta de persona: punto de su color + nombre (reemplaza a las letras M/P)
  const chip = (pid, txt) => `<span class="who" style="--pc:${esc(colorDe(pid))}"><i></i>${esc(txt)}</span>`;
  const nombreDe = (pid) => (S.personas.find((p) => p.id === pid) || {}).nombre || '';
  // Con PIN activo todo se guarda cifrado (seguridad.js); sin PIN, en claro como Mis Finanzas.
  let tGuardar = null;
  function guardarYa() {
    clearTimeout(tGuardar); tGuardar = null;
    try { localStorage.setItem(KEY_TEMA, S.ajustes.tema || ''); } catch (e) {}
    const menor = soloFoto; soloFoto = false;
    if (typeof programarSubida === 'function') programarSubida(menor);
    if (Seg.activo()) { Seg.guardar(S).catch(() => toast('No se pudo guardar en este dispositivo')); return; }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este dispositivo'); }
  }
  let soloFoto = false;   // la foto diaria del valor cambia cada 30 s: no subir a Drive por eso
  function guardar(menor) { if (!menor) soloFoto = false; else if (!tGuardar) soloFoto = true; clearTimeout(tGuardar); tGuardar = setTimeout(guardarYa, 150); }
  // La clave de Gemini: con PIN va dentro de los datos cifrados; sin PIN, en el almacenamiento del teléfono.
  const gemini = {
    get() { if (Seg.activo()) return S._g || ''; try { return localStorage.getItem(KEY_GEMINI) || ''; } catch (e) { return ''; } },
    set(v) {
      if (Seg.activo()) { if (v) S._g = v; else delete S._g; guardar(); return; }
      try { v ? localStorage.setItem(KEY_GEMINI, v) : localStorage.removeItem(KEY_GEMINI); } catch (e) {}
    },
  };
  const paraCopia = () => { const c = JSON.parse(JSON.stringify(S)); delete c._g; delete c.fxCache; return c; };
  const persona = (id) => S.personas.find((p) => p.id === id);
  const personaDef = () => S.personas[0].id;
  const nombreCartera = (id) => (S.carteras.find((c) => c.id === id) || {}).nombre || '';

  /* ================= tema ================= */
  // Barra de estado del iPhone (hora, wifi): siempre del color de fondo REAL de la app, no del modo del teléfono.
  // Si la app está en Claro y el iPhone en Oscuro (o al revés), sin esto queda una franja negra/blanca arriba.
  function pintarBarraEstado() {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#F7F2EC';
    let metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m, i) => { if (i) m.remove(); });
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.removeAttribute('media'); m.setAttribute('content', bg);
  }
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => pintarBarraEstado()); } catch (e) {}
  function aplicarTema() {
    const t = S.ajustes.tema;
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const root = document.documentElement.style;
    root.setProperty('--glass-tint', String(Math.min(1, Math.max(0, S.ajustes.vidrio ?? 0.35))));
    root.setProperty('--ui-zoom', S.ajustes.letraGrande ? '1.12' : '1');
    requestAnimationFrame(pintarBarraEstado);
    // color de acento elegido (vacío = el naranja original)
    const c = S.ajustes.acento;
    ['--accent', '--accent-btn', '--accent-ink', '--accent-tint', '--aurora-1', '--aurora-2', '--aurora-3'].forEach((v) => root.removeProperty(v));
    if (c) {
      root.setProperty('--accent', c);
      root.setProperty('--accent-btn', `color-mix(in srgb, ${c} 88%, #000)`);
      root.setProperty('--accent-ink', `color-mix(in srgb, ${c} 72%, var(--label))`);
      root.setProperty('--accent-tint', `color-mix(in srgb, ${c} 17%, transparent)`);
      root.setProperty('--aurora-1', `color-mix(in srgb, ${c} 28%, transparent)`);
      root.setProperty('--aurora-2', `color-mix(in srgb, ${c} 12%, transparent)`);
      root.setProperty('--aurora-3', `color-mix(in srgb, ${c} 14%, transparent)`);
    }
  }

  /* ================= aviso ================= */
  let tToast;
  function toast(msg, accion, fn) {
    $('toastMsg').textContent = msg; const b = $('toastBtn');
    b.hidden = !accion; b.textContent = accion || ''; b.onclick = () => { $('toast').classList.remove('on'); fn && fn(); };
    $('toast').classList.add('on'); clearTimeout(tToast); tToast = setTimeout(() => $('toast').classList.remove('on'), accion ? 6000 : 2600);
  }

  /* ================= cotizaciones ================= */
  const LISTA = { cedear: 'arg_cedears', accion: 'arg_stocks', bono: 'arg_bonds', on: 'arg_corp', letra: 'arg_notes', usa: 'usa_stocks' };
  const HIST = { cedear: 'cedears', accion: 'stocks', bono: 'bonds', on: 'bonds', letra: 'bonds' };
  let Q = { lists: {}, crypto: {}, fx: null, at: 0, fxAt: 0, err: false };
  try { const q = JSON.parse(localStorage.getItem(KEY_Q)); if (q && q.lists) Q = Object.assign(Q, q); } catch (e) {}
  let cargando = false;
  // Con PIN no se guardan las cripto pedidas (dirían cuáles tenés); las listas de BYMA son completas y no dicen nada.
  function guardarQ() { try { localStorage.setItem(KEY_Q, JSON.stringify(window.Seguridad.activo() ? Object.assign({}, Q, { crypto: {} }) : Q)); } catch (e) {} }

  async function pedir(url, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 12000);
    try { const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
  }
  const fxHoy = () => Q.fx || { oficial: 0, ccl: 0, mep: 0, cripto: 0 };

  function monedaCotiz(clase, t, list) {
    if (clase === 'usa') return 'USD';
    if (clase === 'letra' || clase === 'accion') return 'ARS';
    if (clase === 'on') return /[DC]$/.test(t) ? 'USD' : 'ARS';
    return /[DC]$/.test(t) && list[t.slice(0, -1)] ? 'USD' : 'ARS';
  }
  function cotizar(clase, ticker) {
    const t = String(ticker || '').toUpperCase();
    if (clase === 'cripto') {
      if (C.ESTABLES[t]) return { px: 1, cur: 'USD', pct: 0 };
      const q = Q.crypto[t]; return q ? { px: q.px, cur: 'USD', pct: q.pct } : null;
    }
    if (clase === 'fci' || clase === 'otro') { const m = S.manual[C.clave(clase, t)]; return m ? { px: m.px, cur: m.cur, pct: null, manual: m.at } : null; }
    const list = Q.lists[LISTA[clase]]; if (!list || !list[t]) return null;
    const q = list[t]; return { px: q.c, cur: monedaCotiz(clase, t, list), pct: q.pct };
  }

  function necesarios() {
    const clases = new Set(), cripto = new Set();
    const add = (cl, t) => { if (!t) return; if (cl === 'cripto') { if (!C.ESTABLES[t.toUpperCase()]) cripto.add(t.toUpperCase()); } else if (LISTA[cl]) clases.add(LISTA[cl]); };
    S.movs.forEach((m) => add(m.clase, m.ticker)); S.seguir.forEach((w) => add(w.clase, w.ticker));
    return { listas: [...clases], cripto: [...cripto] };
  }

  async function actualizar(forzar) {
    if (cargando) return; cargando = true; pintarVivo();
    const n = necesarios();
    const antes = {}; ultimoCalc && ultimoCalc.abiertos.forEach((a) => { if (a.cotiz) antes[a.key] = a.cotiz.px; });
    const tareas = [];
    let error = false;
    if (forzar || !Q.fx || Date.now() - Q.fxAt > 5 * 60000) {
      tareas.push(pedir('https://dolarapi.com/v1/dolares').then((arr) => {
        const m = {}; arr.forEach((d) => { m[d.casa] = d.venta; });
        Q.fx = { oficial: m.oficial, ccl: m.contadoconliqui, mep: m.bolsa, cripto: m.cripto, blue: m.blue, mayorista: m.mayorista };
        Q.fxAt = Date.now();
      }).catch(() => { error = true; }));
    }
    n.listas.forEach((l) => tareas.push(pedir('https://data912.com/live/' + l).then((arr) => guardarLista(l, arr)).catch(() => { error = true; })));
    if (n.cripto.length) tareas.push(precioCripto(n.cripto).catch(() => { error = true; }));
    // Dólar cripto = USDT en pesos (Binance, en vivo)
    tareas.push(pedir('https://api.binance.com/api/v3/ticker/24hr?symbol=USDTARS').then((x) => { Q.usdt = { px: +x.lastPrice, pct: +x.priceChangePercent }; }).catch(() => {}));
    await Promise.all(tareas);
    Q.at = Date.now(); Q.err = error; cargando = false;
    guardarQ();
    render();
    // destello en los activos cuyo precio cambió
    if (ultimoCalc) ultimoCalc.abiertos.forEach((a) => {
      const prev = antes[a.key]; if (!prev || !a.cotiz || prev === a.cotiz.px) return;
      const el = document.querySelector(`.asset[data-k="${CSS.escape(a.key)}"]`);
      if (el) { el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add(a.cotiz.px > prev ? 'flash-up' : 'flash-down'); }
    });
  }
  function guardarLista(l, arr) {
    const m = {}; arr.forEach((q) => { const c = q.c || (q.px_bid && q.px_ask ? (q.px_bid + q.px_ask) / 2 : q.px_bid || q.px_ask || 0); m[q.symbol] = { c, pct: q.pct_change }; });
    Q.lists[l] = m;
  }
  const usdt = () => (Q.usdt && Q.usdt.px ? Q.usdt : fxHoy().cripto ? { px: fxHoy().cripto, pct: null } : null);
  // Rincón del dólar (debajo del título, en todas las pantallas)
  function pintarFx() {
    const fx = fxHoy(), u = usdt(), el = $('fxbar'); if (!el) return;
    if (!fx.oficial) { el.textContent = 'Cargando dólar…'; return; }
    el.innerHTML = `Oficial <b>${esc(ars(fx.oficial))}</b> · USDT <b>${u ? esc(precioF(u.px, 'ARS')) : '—'}</b>${u && u.pct !== null && isFinite(u.pct) ? ` <span class="${clsSigno(u.pct, 0.005)}">${esc((u.pct > 0 ? '+' : '') + C.num(u.pct, 1))}%</span>` : ''}`;
  }
  async function precioCripto(syms) {
    const pares = syms.map((s) => s + 'USDT');
    try {
      const arr = await pedir('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(pares)));
      arr.forEach((x) => { Q.crypto[x.symbol.replace(/USDT$/, '')] = { px: +x.lastPrice, pct: +x.priceChangePercent }; });
    } catch (e) {   // si un símbolo no existe, Binance rechaza todo el pedido: se piden de a uno
      await Promise.all(pares.map((p) => pedir('https://api.binance.com/api/v3/ticker/24hr?symbol=' + p).then((x) => { Q.crypto[p.replace(/USDT$/, '')] = { px: +x.lastPrice, pct: +x.priceChangePercent }; }).catch(() => {})));
    }
  }

  // Historial diario (para el minigráfico y el gráfico de cada activo). Se guarda un día.
  const histMem = {};
  async function historial(clase, ticker) {
    const t = String(ticker).toUpperCase(), k = C.clave(clase, t);
    if (histMem[k] && histMem[k].d === hoyISO()) return histMem[k].s;
    if (!Seg.activo()) { try { const x = JSON.parse(localStorage.getItem('mis-inversiones:h:' + k)); if (x && x.d === hoyISO()) { histMem[k] = x; return x.s; } } catch (e) {} }
    let s = [];
    try {
      if (clase === 'cripto') {
        if (C.ESTABLES[t]) return [];
        const arr = await pedir('https://api.binance.com/api/v3/klines?symbol=' + t + 'USDT&interval=1d&limit=1000');
        s = arr.map((r) => ({ t: new Date(r[0]).toISOString().slice(0, 10), c: +r[4] }));
      } else if (HIST[clase]) {
        const arr = await pedir('https://data912.com/historical/' + HIST[clase] + '/' + encodeURIComponent(t), 15000);
        s = arr.map((r) => ({ t: r.date, c: r.c }));
      }
    } catch (e) { s = []; }
    s = s.filter((p) => p.c > 0).slice(-800);
    histMem[k] = { d: hoyISO(), s };
    if (!Seg.activo()) { try { localStorage.setItem('mis-inversiones:h:' + k, JSON.stringify(histMem[k])); } catch (e) {} }   // con PIN no queda rastro de qué tenés
    return s;
  }

  // Dólar de una fecha pasada (para pasar cada compra/ingreso a dólares de ese día).
  async function fxDeFecha(fecha) {
    if (!fecha || fecha >= hoyISO()) return Object.assign({}, fxHoy());
    if (S.fxCache[fecha]) return S.fxCache[fecha];
    const casas = { oficial: 'oficial', ccl: 'contadoconliqui', mep: 'bolsa', cripto: 'cripto' };
    for (let atras = 0; atras < 7; atras++) {
      const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - atras);
      const ruta = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
      const r = {};
      await Promise.all(Object.keys(casas).map((k) => pedir('https://api.argentinadatos.com/v1/cotizaciones/dolares/' + casas[k] + '/' + ruta, 8000).then((x) => { r[k] = x.venta; }).catch(() => {})));
      if (r.oficial) { S.fxCache[fecha] = r; return r; }
    }
    return Object.assign({ aprox: true }, fxHoy());
  }

  /* ================= cálculo ================= */
  let ultimoCalc = null;
  const precioDe = (a) => cotizar(a.clase, a.ticker);
  function calc(personaId, carteraId) {
    return C.calcular(S.movs, precioDe, fxHoy(), { cartera: carteraId === undefined ? S.ajustes.cartera : carteraId, persona: personaId === undefined ? S.ajustes.persona : personaId, personaDefecto: personaDef() });
  }
  function guardarFoto() {
    if (!Q.fx || !Q.fx.oficial || !S.movs.length) return;
    const hoy = hoyISO();
    const ids = [''].concat(S.personas.map((p) => p.id));
    ids.forEach((pid) => {
      const r = calc(pid, '');
      if (!r.completo || !r.movimientos) return;
      const k = pid || '*';
      S.snaps[k] = S.snaps[k] || {};
      S.snaps[k][hoy] = { v: r.valor.ars, vo: r.valor.of, k: r.capital.ars, ko: r.capital.of };
    });
    guardar(true);
  }

  /* ================= gráficos ================= */
  function spark(serie, cls, mini) {
    if (!serie || serie.length < 2) return '';
    const w = 300, h = 34, min = Math.min(...serie), max = Math.max(...serie), r = max - min || 1;
    const pts = serie.map((v, i) => [i / (serie.length - 1) * w, h - 3 - (v - min) / r * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const col = cls === 'neg' ? 'var(--loss)' : cls === 'pos' ? 'var(--gain)' : 'var(--label-3)';
    return `<svg class="spark${mini ? ' mini' : ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}L${w} ${h}L0 ${h}Z" style="fill:${col};opacity:.10"/><path d="${d}" style="fill:none;stroke:${col};stroke-width:1.8;vector-effect:non-scaling-stroke;stroke-linejoin:round"/></svg>`;
  }

  function donut(segs, centro, sub) {
    const tot = segs.reduce((s, x) => s + Math.max(0, x.valor), 0) || 1, R = 58, Cc = 2 * Math.PI * R;
    let acc = 0;
    const arcs = segs.map((s) => {
      const len = Math.max(0, s.valor) / tot * Cc, gap = segs.length > 1 ? Math.min(2, len / 3) : 0;
      const el = `<circle class="seg-arc" cx="75" cy="75" r="${R}" style="fill:none;stroke:${s.color};stroke-width:22" stroke-dasharray="0 ${Cc}" data-da="${Math.max(0, len - gap)} ${Cc}" stroke-dashoffset="${-acc}" transform="rotate(-90 75 75)"/>`;
      acc += len; return el;
    }).join('');
    return `<svg viewBox="0 0 150 150" role="img" aria-label="Distribución">${arcs}
      <text x="75" y="72" text-anchor="middle" style="font-size:17px;font-weight:700;fill:var(--label)">${esc(centro)}</text>
      <text x="75" y="90" text-anchor="middle" style="font-size:11px;fill:var(--label-3)">${esc(sub)}</text></svg>`;
  }
  function animarDonas(root) {
    root.querySelectorAll('circle[data-da]').forEach((c) => { const v = c.dataset.da; if (reduceMotion) c.setAttribute('stroke-dasharray', v); else requestAnimationFrame(() => requestAnimationFrame(() => c.setAttribute('stroke-dasharray', v))); });
  }

  // Gráfico de líneas con barrido táctil. series: [{pts:[{t,y}], color, area, nombre}]
  const charts = new Map();
  function lineChart(id, series, opts) {
    opts = opts || {};
    const W = 340, H = opts.h || 170, pl = 4, pr = 4, pt = 26, pb = 18;
    const todos = series.flatMap((s) => s.pts.map((p) => p.y)).concat(opts.ref ? [opts.ref.y] : []);
    if (!series.length || series[0].pts.length < 2) return `<p class="muted" style="text-align:center;padding:24px 0">${esc(opts.vacio || 'Todavía no hay datos para graficar.')}</p>`;
    let min = Math.min(...todos), max = Math.max(...todos); const pad = (max - min) * 0.08 || Math.abs(max) * 0.05 || 1; min -= pad; max += pad;
    const n = series[0].pts.length;
    const X = (i) => pl + i / (n - 1) * (W - pl - pr), Y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    const paths = series.map((s, si) => {
      const d = s.pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join('');
      return (s.area ? `<path d="${d}L${X(n - 1)} ${H - pb}L${X(0)} ${H - pb}Z" style="fill:url(#g-${id})"/>` : '') +
        `<path d="${d}" style="fill:none;stroke:${s.color};stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;${s.dash ? 'stroke-dasharray:5 4;' : ''}"/>`;
    }).join('');
    const ref = opts.ref ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(opts.ref.y)}" y2="${Y(opts.ref.y)}" style="stroke:var(--label-3);stroke-dasharray:3 4;stroke-width:1"/><text x="${W - pr}" y="${Y(opts.ref.y) - 5}" text-anchor="end">${esc(opts.ref.label)}</text>` : '';
    const s0 = series[0].pts;
    charts.set(id, { series, X, Y, n, W, fmt: opts.fmt || ((v) => C.num(v)) });
    return `<div class="chart" id="${id}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs><linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${series[0].color};stop-opacity:.28"/><stop offset="1" style="stop-color:${series[0].color};stop-opacity:0"/></linearGradient></defs>
      ${ref}${paths}
      <text x="${pl}" y="${H - 4}">${esc(fechaCorta(s0[0].t))}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end">${esc(fechaCorta(s0[n - 1].t))}</text>
      <line class="cur" x1="0" x2="0" y1="${pt - 6}" y2="${H - pb}" style="stroke:var(--label-3);stroke-width:1;opacity:0"/>
      ${series.map((s, i) => `<circle class="dot${i}" r="4" cx="-10" cy="-10" style="fill:${s.color};stroke:var(--surface-2);stroke-width:2;opacity:0"/>`).join('')}
    </svg><div class="tip" hidden></div></div>`;
  }
  function activarCharts(root) {
    root.querySelectorAll('.chart').forEach((el) => {
      const c = charts.get(el.id); if (!c) return;
      const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), line = svg.querySelector('.cur');
      const mover = (ev) => {
        const r = svg.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width * c.W;
        let i = Math.round((x - c.X(0)) / (c.X(c.n - 1) - c.X(0)) * (c.n - 1)); i = Math.max(0, Math.min(c.n - 1, i));
        line.setAttribute('x1', c.X(i)); line.setAttribute('x2', c.X(i)); line.style.opacity = 1;
        c.series.forEach((s, si) => { const d = svg.querySelector('.dot' + si); const p = s.pts[i]; if (!p) return; d.setAttribute('cx', c.X(i)); d.setAttribute('cy', c.Y(p.y)); d.style.opacity = 1; });
        tip.hidden = false; tip.style.left = Math.max(60, Math.min(r.width - 60, c.X(i) / c.W * r.width)) + 'px';
        tip.innerHTML = `<b>${esc(fechaCorta(c.series[0].pts[i].t))}</b> · ` + c.series.map((s) => (s.nombre ? esc(s.nombre) + ' ' : '') + esc(c.fmt(s.pts[i].y))).join(' · ');
      };
      const salir = () => { tip.hidden = true; line.style.opacity = 0; svg.querySelectorAll('circle').forEach((d) => { d.style.opacity = 0; }); };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerdown', mover); el.addEventListener('pointerleave', salir); el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') salir(); });
    });
  }

  /* ================= números animados ================= */
  const prevNum = new Map();
  const FMT = { ars, usd, sars: (x) => conSigno(x, ars), susd: (x) => conSigno(x, usd) };
  function animarNumeros(root) {
    root.querySelectorAll('[data-anim]').forEach((el) => {
      const k = el.dataset.anim, v = +el.dataset.v, f = FMT[el.dataset.fmt] || ars;
      const desde = prevNum.has(k) ? prevNum.get(k) : v * 0.82; prevNum.set(k, v);
      if (reduceMotion || desde === v) { el.textContent = f(v); return; }
      const t0 = performance.now(), dur = 800;
      const paso = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(desde + (v - desde) * e); if (p < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    });
  }
  const anim = (k, v, fmt) => `<span class="num" data-anim="${esc(k)}" data-v="${v}" data-fmt="${fmt}">${esc(FMT[fmt](v))}</span>`;

  /* ================= vistas ================= */
  let vista = 'activos', filtroClase = '';
  const VISTAS = ['activos', 'resumen', 'seguir', 'movs', 'ajustes'];
  let vistaPrev = 'activos';

  function render() {
    ultimoCalc = calc();
    if (ultimoCalc.completo) guardarFoto();
    $('carteraNombre').textContent = S.ajustes.cartera ? nombreCartera(S.ajustes.cartera) : 'Todas';
    pintarFx();
    if (vista === 'activos') renderActivos();
    else if (vista === 'resumen') renderResumen();
    else if (vista === 'seguir') renderSeguir();
    else if (vista === 'movs') renderMovs();
    else if (vista === 'ajustes') pintarNube();   // Ajustes no se redibuja solo (no pisar lo que estás escribiendo)
    pintarVivo();
  }

  function haceTxt() {
    if (cargando) return 'Actualizando…';
    if (!Q.at) return 'Sin cotizaciones todavía';
    const s = Math.round((Date.now() - Q.at) / 1000);
    return (Q.err ? 'Algunas fuentes no respondieron · ' : 'En vivo · ') + (s < 5 ? 'recién' : s < 60 ? 'hace ' + s + ' s' : 'hace ' + Math.round(s / 60) + ' min');
  }
  function pintarVivo() {
    document.querySelectorAll('.live').forEach((el) => {
      el.classList.toggle('on', !!Q.at && !Q.err && !cargando && Date.now() - Q.at < 120000);
      el.classList.toggle('err', !!Q.err);
      const t = el.querySelector('.txt'); if (t) t.textContent = haceTxt();
    });
  }

  /* ---------- pila de widgets: Total · Mío · Novia ---------- */
  const paginas = () => [{ id: '', nombre: 'Total entre los dos' }].concat(S.personas.map((p) => ({ id: p.id, nombre: p.id === personaDef() ? 'Lo mío' : 'Lo de ' + p.nombre.replace(/^Mi /i, 'mi ') })));
  function paginaHTML(pg, i) {
    const r = calc(pg.id);
    const k = 'p' + i + ':';
    const g = r.ganancia;
    return `<div class="hero vivid ${pg.id ? 'persona' : 'p0'}" data-p="${esc(pg.id)}"${pg.id ? ` style="--pc:${esc(colorDe(pg.id))}"` : ''}>
      <span class="orb a"></span><span class="orb b"></span><span class="orb c"></span>
      <div class="hero-top"><span class="who-t">${esc(pg.nombre)}</span><span class="sp"></span>${S.ajustes.cartera ? `<span class="tag neu">${esc(nombreCartera(S.ajustes.cartera))}</span>` : ''}</div>
      <span class="lbl">Valor actual</span>
      <div class="big">${anim(k + 'v', r.valor.ars, 'ars')}</div>
      <div class="usd">${anim(k + 'vo', r.valor.of, 'usd')} <span class="ccl">oficial</span></div>
      <div class="ccl">${esc(usd(r.valor.ccl))} contado con liqui</div>
      <div class="spacer"></div>
      <div class="hero-grid">
        <div class="mini"><span class="t">Ingresaste</span><span class="v">${anim(k + 'k', r.capital.ars, 'ars')}</span><span class="s">${esc(usd(r.capital.of))} oficial</span></div>
        <div class="mini"><span class="t">Ganancia real</span><span class="v">${anim(k + 'g', g.ars, 'sars')}</span>
          <span class="s"><span class="tag ${clsSigno(g.ars)}">${esc(pctf(r.rend.ars))}</span> ${esc(conSigno(g.of, usd))} <b>${esc(pctf(r.rend.of))}</b></span></div>
      </div>
      <div class="live"><i></i><span class="txt"></span></div>
    </div>`;
  }
  function renderStack(cont) {
    const pgs = paginas();
    let wrap = cont.querySelector('.stack-wrap');
    const idx = Math.max(0, pgs.findIndex((p) => p.id === (S.ajustes.persona || '')));
    if (!wrap) {
      wrap = document.createElement('div'); wrap.className = 'stack-wrap';
      wrap.innerHTML = `<div class="stack" id="stack" tabindex="0" aria-label="Resumen por persona. Deslizá hacia arriba o abajo."></div><div class="dots" id="dots"></div>`;
      cont.prepend(wrap);
      const st = wrap.querySelector('.stack');
      let t;
      st.addEventListener('scroll', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const i = Math.round(st.scrollTop / st.clientHeight), pg = paginas()[i];
          if (!pg || pg.id === (S.ajustes.persona || '')) return;
          S.ajustes.persona = pg.id; guardar();
          if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(6);
          marcarDots(); ultimoCalc = calc(); renderDebajo();
        }, 110);
      }, { passive: true });
    }
    const st = wrap.querySelector('.stack');
    st.innerHTML = pgs.map(paginaHTML).join('');
    wrap.querySelector('.dots').innerHTML = pgs.map((p, i) => `<button data-i="${i}" aria-label="${esc(p.nombre)}"></button>`).join('');
    wrap.querySelectorAll('.dots button').forEach((b) => { b.onclick = () => st.scrollTo({ top: +b.dataset.i * st.clientHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); });
    if (Math.round(st.scrollTop / (st.clientHeight || 1)) !== idx) st.scrollTop = idx * st.clientHeight;
    marcarDots();
    animarNumeros(st);
  }
  function marcarDots() {
    const i = Math.max(0, paginas().findIndex((p) => p.id === (S.ajustes.persona || '')));
    document.querySelectorAll('#dots button').forEach((b, j) => b.classList.toggle('on', j === i));
  }
  // Lo que va debajo de la pila (cambia según la página elegida)
  function renderDebajo() {
    const cont = $(vista === 'resumen' ? 'v-resumen' : 'v-activos');
    const body = cont.querySelector('.debajo'); if (!body) return;
    body.innerHTML = vista === 'resumen' ? htmlResumen() : htmlActivos();
    montarDebajo(body);
  }
  function montarDebajo(body) {
    animarNumeros(body); animarDonas(body); activarCharts(body);
    body.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => abrirActivo(b.dataset.k); });
    body.querySelectorAll('[data-clase]').forEach((b) => { b.onclick = () => { filtroClase = b.dataset.clase; renderDebajo(); }; });
    body.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => ACCIONES[b.dataset.act](b); });
    body.querySelectorAll('.seg[data-seg] button').forEach((b) => { b.onclick = () => { const k = b.parentElement.dataset.seg; S.ajustes[k] = b.dataset.val; guardar(); renderDebajo(); }; });
    if (vista === 'activos') cargarSparks();
  }
  function conPila(cont, primeraVez) {
    if (!S.movs.length) { cont.innerHTML = htmlVacio(); montarDebajo(cont); activarBotonGoogle(cont.querySelector('#vGo')); return; }
    if (!cont.querySelector('.debajo')) { cont.innerHTML = '<div class="stack-hint">Deslizá el panel ↕ para ver lo tuyo, lo de ella o el total</div><div class="debajo" style="display:grid;gap:12px"></div>'; }
    renderStack(cont);
    renderDebajo();
  }

  function htmlVacio() {
    return `<div class="card empty">${I.chart}<h3>Tu cartera, sin confusiones</h3>
      <p>Cargá tus ingresos de dinero y tus compras. La app separa lo que pusiste de lo que realmente rinden tus activos.</p>
      ${nubeOn() ? '' : `${botonGoogle('vGo', 'Entrar con Google')}<p class="muted" style="font-size:13px;margin-top:-4px">Guarda una copia cifrada en tu Drive y, si ya tenés una, la recupera.</p>`}
      <div class="btns" style="width:100%"><button class="btn ${nubeOn() ? '' : 'sec'}" data-act="captura">${I.cam}Subir captura</button><button class="btn sec" data-act="manual">${I.pen}A mano</button></div>
      <button class="link" data-act="demo">Probar con datos de ejemplo</button></div>
      <p class="foot">Sólo organiza tus datos; no es asesoramiento financiero.</p>`;
  }

  /* ---------- Activos ---------- */
  function renderActivos() { conPila($('v-activos')); }
  function cinta(r) {
    const fx = fxHoy(); const items = [];
    if (fx.oficial) items.push(['Oficial', ars(fx.oficial), null], ['MEP', ars(fx.mep), null], ['CCL', ars(fx.ccl), null], ['Cripto', ars(fx.cripto), null]);
    r.abiertos.forEach((a) => { if (a.cotiz) items.push([a.ticker, precioF(a.cotiz.px, a.cotiz.cur), a.cotiz.pct]); });
    S.seguir.forEach((w) => { const q = cotizar(w.clase, w.ticker); if (q && !r.abiertos.some((a) => a.ticker === w.ticker.toUpperCase())) items.push([w.ticker.toUpperCase(), precioF(q.px, q.cur), q.pct]); });
    if (!items.length) return '';
    const h = items.map((x) => `<span class="tk"><b>${esc(x[0])}</b><span class="num">${esc(x[1])}</span>${x[2] !== null && x[2] !== undefined ? `<span class="${x[2] > 0 ? 'pos' : x[2] < 0 ? 'neg' : ''}">${esc((x[2] > 0 ? '+' : '') + C.num(x[2], 1))}%</span>` : ''}</span>`).join('');
    return `<div class="tape" aria-label="Cotizaciones"><div class="tape-in">${h}${h}</div></div>`;
  }
  // De quién es cada activo y en qué proporción (por cantidad que tiene cada uno hoy)
  function partesActivo(a) {
    if (S.ajustes.persona) { const p = persona(S.ajustes.persona); return p ? [{ p, f: 1 }] : []; }
    const ps = S.personas.map((p) => ({ p, q: (C.calcular(a.movs, precioDe, fxHoy(), { persona: p.id, personaDefecto: personaDef() }).abiertos.find((x) => x.key === a.key) || {}).qty || 0 }));
    const tot = ps.reduce((s0, x) => s0 + x.q, 0);
    const out = tot ? ps.filter((x) => x.q > 0).map((x) => ({ p: x.p, f: x.q / tot })) : [];
    let resto = 100; out.forEach((x, i) => { x.pct = i === out.length - 1 ? resto : Math.round(x.f * 100); resto -= x.pct; });
    return out;
  }
  function etiquetaTitular(a) {
    if (S.ajustes.persona) return '';
    const ps = partesActivo(a); if (!ps.length) return '';
    if (ps.length === 1) return `<span class="whos">${chip(ps[0].p.id, ps[0].p.nombre)}</span>`;
    return `<span class="whos">${ps.map((x) => chip(x.p.id, x.p.nombre + ' ' + x.pct + '%')).join('')}</span>`;
  }
  // Fondo de la tarjeta con el color del dueño; si es de los dos, mezcla con el corte en su proporción
  function fondoActivo(a) {
    const ps = partesActivo(a); if (!ps.length) return '';
    const t = (c) => `color-mix(in srgb, ${c} var(--tinte), transparent)`;
    if (ps.length === 1) { const c = ps[0].p.color; return `background-image:linear-gradient(90deg, ${t(c)}, ${t(c)})`; }
    // división vertical, de izquierda a derecha: cada uno ocupa su porcentaje, con un borde suave corto
    const c1 = ps[0].p.color, c2 = ps[1].p.color, m = ps[0].f * 100, an = 2.5;
    return `background-image:linear-gradient(90deg, ${t(c1)} 0%, ${t(c1)} ${Math.max(0, m - an).toFixed(1)}%, ${t(c2)} ${Math.min(100, m + an).toFixed(1)}%, ${t(c2)} 100%)`;
  }


  function tarjetaActivo(a) {
    const q = a.cotiz, cl = C.CLASES[a.clase] || { corto: a.clase };
    const nom = S.nombres[a.key];
    // en activos que cotizan en dólares (cripto, NVDA…) el oficial ya es el valor en dólares: no repetirlo
    const sub = a.cur === 'USD' ? '' : `${esc(usd(a.valor.ccl))} CCL`;
    const unidades = C.POR100[a.clase] ? 'VN' : 'u.';
    return `<button class="asset" data-k="${esc(a.key)}" style="${esc(fondoActivo(a))}">
      <div class="a-top"><div class="badge" style="background:${COLOR_CLASE[a.clase] || 'var(--c8)'};font-size:${a.ticker.length > 4 ? 10 : 12}px">${esc(a.ticker.slice(0, 5))}</div>
        <div class="a-name"><b>${esc(a.ticker)}</b><span>${esc(nom || cl.corto)} · <span class="priv">${esc(C.cantidad(a.qty))} ${unidades}</span>${S.carteras.length > 1 && !S.ajustes.cartera ? ' · ' + esc(Object.keys(a.carteras).map(nombreCartera).filter(Boolean).join(', ')) : ''}</span></div>
        <div class="a-val priv"><b class="num">${esc(ars(a.valor.ars))}</b><span class="num">${esc(usd(a.valor.of))} oficial</span>${sub ? `<span class="ccl num">${sub}</span>` : ''}</div></div>
      <div class="spk" data-spk="${esc(a.key)}">${sparkDe(a)}</div>
      <div class="a-row">${q ? `<span class="num">Ahora ${esc(precioF(q.px, q.cur))}</span>${q.pct !== null && q.pct !== undefined ? `<span class="tag ${clsSigno(q.pct, 0.005)}">hoy ${esc(pctf(q.pct / 100))}</span>` : ''}` : '<span class="sinprecio">Sin precio: se muestra al costo</span>'}
        <span class="sp"></span><span class="num priv" title="Precio promedio de compra: lo que pagaste en promedio por unidad, con comisiones">Prom. compra ${esc(precioF(a.ppc, a.cur))}</span></div>
      <div class="a-row priv"><span class="tag ${clsSigno(a.ganancia.ars)}">${esc(conSigno(a.ganancia.ars, ars))} · ${esc(pctf(a.rend.ars))}</span>
        <span class="tag ${clsSigno(a.ganancia.of, 0.005)}">${esc(conSigno(a.ganancia.of, usd))} · ${esc(pctf(a.rend.of))}</span><span class="sp"></span><span>${C.num(a.peso * 100, 1)} %</span></div>
      <div class="weight"><i style="width:${Math.min(100, a.peso * 100).toFixed(1)}%"></i></div>
    </button>`;
  }
  function sparkDe(a, mini) {
    const h = histMem[a.key]; if (!h || !h.s.length) return '';
    const serie = h.s.slice(-30).map((p) => p.c); if (a.cotiz) serie.push(a.cotiz.px);
    return spark(serie, serie[serie.length - 1] >= serie[0] ? 'pos' : 'neg', mini);
  }
  let sparkCorriendo = false;
  async function cargarSparks() {
    if (sparkCorriendo || !ultimoCalc) return; sparkCorriendo = true;
    const lista = ultimoCalc.abiertos.concat(S.seguir.map((w) => ({ key: C.clave(w.clase, w.ticker), clase: w.clase, ticker: w.ticker.toUpperCase(), cotiz: cotizar(w.clase, w.ticker) })));
    const falta = lista.filter((a) => !(histMem[a.key] && histMem[a.key].d === hoyISO()) && (a.clase === 'cripto' || HIST[a.clase]));
    for (const a of falta) {
      await historial(a.clase, a.ticker);
      document.querySelectorAll(`[data-spk="${CSS.escape(a.key)}"]`).forEach((el) => { el.innerHTML = sparkDe(a, el.classList.contains('spk-mini')); });
    }
    sparkCorriendo = false;
  }
  function htmlActivos() {
    const r = ultimoCalc;
    const clases = [...new Set(r.abiertos.map((a) => a.clase))];
    const lista = r.abiertos.filter((a) => !filtroClase || a.clase === filtroClase);
    const demo = S.movs.some((m) => m.demo);
    return `${demo ? `<div class="banner"><span class="sp">Estás viendo datos de ejemplo.</span><button class="link" data-act="borrarDemo">Borrarlos</button></div>` : ''}
      ${cinta(r)}
      <div class="section-title">Activos<span class="sp"></span><button class="link" data-act="refrescar">Actualizar</button></div>
      ${clases.length > 1 ? `<div class="chips"><button data-clase="" class="${filtroClase ? '' : 'on'}">Todos</button>${clases.map((c) => `<button data-clase="${c}" class="${filtroClase === c ? 'on' : ''}"><i style="background:${COLOR_CLASE[c]}"></i>${esc(C.CLASES[c].corto)}</button>`).join('')}</div>` : ''}
      <div class="assets">${lista.map(tarjetaActivo).join('') || '<p class="muted" style="text-align:center">No hay activos abiertos acá.</p>'}</div>
      ${r.efectivo.ars > 0.5 ? `<div class="card priv" style="gap:4px"><div class="a-row" style="font-size:15px;color:var(--label)"><b>Efectivo sin invertir</b><span class="sp"></span><b class="num">${esc(ars(r.efectivo.ars))}</b></div><p class="muted" style="font-size:13px">${r.caja.ARS > 0.5 ? esc(ars(r.caja.ARS)) + ' en pesos' : ''}${r.caja.ARS > 0.5 && r.caja.USD > 0.005 ? ' · ' : ''}${r.caja.USD > 0.005 ? esc(usd(r.caja.USD)) + ' en dólares' : ''}. No cuenta como ganancia.</p></div>` : ''}
      ${r.sinPrecio.length ? `<p class="foot">Sin precio en vivo: ${esc(r.sinPrecio.map((a) => a.ticker).join(', '))}. Se muestran al costo (ni ganan ni pierden) hasta que haya precio.</p>` : ''}
      ${r.cerrados.length ? `<div class="section-title">Posiciones cerradas</div><div class="group">${r.cerrados.map((a) => `<button class="item" data-k="${esc(a.key)}"><span class="ic" style="color:${COLOR_CLASE[a.clase]}">${I.chart}</span><span class="tx"><b>${esc(a.ticker)}</b><span>${esc(C.CLASES[a.clase].corto)} · vendida</span></span><span class="rt ${clsSigno(a.realizado.ars)}">${esc(conSigno(a.realizado.ars, ars))}<span>${esc(conSigno(a.realizado.of, usd))} oficial</span></span></button>`).join('')}</div>` : ''}
      <p class="foot">Precios: data912 (BYMA, ~20 s de demora), Binance y dolarapi. Todo en dólar oficial: cada ingreso y compra al oficial de su día, el valor actual al de hoy. Sólo organiza tus datos; no es asesoramiento financiero.</p>`;
  }

  /* ---------- Resumen ---------- */
  function renderResumen() { conPila($('v-resumen')); }
  function tarjetaSuma(titulo, v, extra, k) {
    return `<div class="card sum-card" style="gap:4px"><h2>${titulo}</h2>
      <div class="big">${anim(k, v.ars, 'ars')}</div><div class="usd num">${esc(usd(v.of))} <span class="ccl">oficial</span></div><div class="ccl num">${esc(usd(v.ccl))} contado con liqui</div>${extra || ''}</div>`;
  }
  function htmlResumen() {
    const r = ultimoCalc, g = r.ganancia;
    const camb = { ars: g.ars - r.noRealizada.ars - r.realizada.ars - r.rentas.ars, of: g.of - r.noRealizada.of - r.realizada.of - r.rentas.of };
    // por persona (sólo en Total)
    let porPersona = '';
    if (!S.ajustes.persona) {
      const rs = S.personas.map((p, i) => ({ p, i, r: calc(p.id) }));
      const tot = rs.reduce((s, x) => s + Math.max(0, x.r.valor.ars), 0) || 1;
      porPersona = `<div class="card"><h2>Entre los dos</h2>
        <div class="split">${rs.map((x) => `<i style="width:${(Math.max(0, x.r.valor.ars) / tot * 100).toFixed(1)}%;background:${esc(x.p.color)}"></i>`).join('')}</div>
        <dl class="kv" style="grid-template-columns:1fr auto auto">${rs.map((x) => `<dt>${chip(x.p.id, x.p.nombre)}</dt>
          <dd class="num">${esc(ars(x.r.valor.ars))}<small>ingresó ${esc(ars(x.r.capital.ars))}</small></dd>
          <dd class="num ${clsSigno(x.r.ganancia.ars)}">${esc(pctf(x.r.rend.ars))}<small>${esc(conSigno(x.r.ganancia.of, usd))} · ${esc(pctf(x.r.rend.of))}</small></dd>`).join('')}</dl></div>`;
    }
    const modo = S.ajustes.dist || 'tipo';
    const segs = modo === 'tipo'
      ? C.porClase(r).map((x) => ({ nombre: x.nombre, valor: x.valor, color: COLOR_CLASE[x.id] || 'var(--c8)' }))
      : r.abiertos.map((a, i) => ({ nombre: a.ticker, valor: a.valor.ars, color: PALETA[i % PALETA.length] })).concat(r.efectivo.ars > 0.5 ? [{ nombre: 'Efectivo', valor: r.efectivo.ars, color: 'var(--c8)' }] : []);
    const totSeg = segs.reduce((s, x) => s + x.valor, 0) || 1;
    // evolución
    const mon = S.ajustes.evo || 'ars';
    const snaps = S.snaps[S.ajustes.persona || '*'] || {};
    const dias = Object.keys(snaps).sort();
    const evo = dias.length >= 2 ? lineChart('evo', [
      { nombre: 'Valor', color: 'var(--accent)', area: true, pts: dias.map((d) => ({ t: d, y: mon === 'ars' ? snaps[d].v : snaps[d].vo })) },
      { nombre: 'Ingresado', color: 'var(--label-3)', dash: true, pts: dias.map((d) => ({ t: d, y: mon === 'ars' ? snaps[d].k : snaps[d].ko })) },
    ], { fmt: mon === 'ars' ? ars : usd }) : `<p class="muted" style="text-align:center;padding:12px 0">Se arma solo, un punto por día que abras la app.${dias.length ? ' Ya hay 1.' : ''}</p>`;
    // ranking
    const rk = r.abiertos.slice().sort((a, b) => (b.rend.of || 0) - (a.rend.of || 0));
    const maxAbs = Math.max(0.0001, ...rk.map((a) => Math.abs(a.rend.of || 0)));
    return `
      ${tarjetaSuma('Capital invertido', r.capital, `<p class="muted" style="font-size:13px;margin-top:6px">Todo lo que ingresaste para invertir, menos lo que retiraste. No es ganancia.${r.capitalImplicito.ars > 1 ? ` Incluye ${esc(ars(r.capitalImplicito.ars))} de compras cargadas sin su ingreso.` : ''}</p>`, 'rk')}
      ${tarjetaSuma('Valor actual', r.valor, `<p class="muted" style="font-size:13px;margin-top:6px">Activos ${esc(ars(r.valorActivos.ars))} · efectivo ${esc(ars(r.efectivo.ars))}</p>`, 'rv')}
      <div class="card sum-card" style="gap:4px"><h2>Ganancia actual</h2>
        <div class="big ${clsSigno(g.ars)}">${anim('rg', g.ars, 'sars')}</div>
        <div class="row2"><span class="tag ${clsSigno(g.ars)}">${esc(pctf(r.rend.ars))} en pesos</span><span class="tag ${clsSigno(g.of, 0.005)}">${esc(conSigno(g.of, usd))} · ${esc(pctf(r.rend.of))} en dólares oficiales</span></div>
        <div class="ccl num" style="margin-top:2px">${esc(conSigno(g.ccl, usd))} · ${esc(pctf(r.rend.ccl))} al contado con liqui</div>
        <dl class="kv" style="margin-top:10px">
          <dt>En activos que tenés</dt><dd class="num ${clsSigno(r.noRealizada.ars)}">${esc(conSigno(r.noRealizada.ars, ars))}<small>${esc(conSigno(r.noRealizada.of, usd))}</small></dd>
          <dt>Realizada en ventas</dt><dd class="num ${clsSigno(r.realizada.ars)}">${esc(conSigno(r.realizada.ars, ars))}<small>${esc(conSigno(r.realizada.of, usd))}</small></dd>
          <dt>Dividendos, cupones y rentas</dt><dd class="num ${clsSigno(r.rentas.ars)}">${esc(conSigno(r.rentas.ars, ars))}<small>${esc(conSigno(r.rentas.of, usd))}</small></dd>
          ${Math.abs(camb.ars) > 1 ? `<dt>Efectivo y tipo de cambio</dt><dd class="num ${clsSigno(camb.ars)}">${esc(conSigno(camb.ars, ars))}<small>${esc(conSigno(camb.of, usd))}</small></dd>` : ''}
        </dl></div>
      ${porPersona}
      <div class="card"><div class="a-row" style="font-size:15px;color:var(--label)"><b>Distribución</b><span class="sp"></span></div>
        <div class="seg" data-seg="dist"><button data-val="tipo" class="${modo === 'tipo' ? 'on' : ''}">Por tipo</button><button data-val="activo" class="${modo === 'activo' ? 'on' : ''}">Por activo</button></div>
        <div class="donut-wrap">${donut(segs, segs.length + '', modo === 'tipo' ? (segs.length === 1 ? 'tipo' : 'tipos') : 'posiciones')}
          <ul class="legend">${segs.map((s) => `<li><i style="background:${s.color}"></i><span>${esc(s.nombre)}</span><b class="num">${C.num(s.valor / totSeg * 100, 1)} %<small>${esc(ars(s.valor))}</small></b></li>`).join('')}</ul></div></div>
      <div class="card"><div class="a-row" style="font-size:15px;color:var(--label)"><b>Evolución</b><span class="sp"></span></div>
        <div class="seg" data-seg="evo"><button data-val="ars" class="${mon === 'ars' ? 'on' : ''}">Pesos</button><button data-val="usd" class="${mon === 'usd' ? 'on' : ''}">Dólares oficiales</button></div>
        ${evo}<div class="legend-inline"><span><i style="background:var(--accent)"></i>Valor de la cartera</span><span><i style="background:var(--label-3)"></i>Lo que ingresaste</span></div></div>
      ${rk.length ? `<div class="card"><h2>Rendimiento por activo (en dólares oficiales)</h2>${rk.map((a) => { const p = a.rend.of || 0, w = Math.abs(p) / maxAbs * 50; return `<button class="item" style="padding:6px 0;min-height:0" data-k="${esc(a.key)}"><span class="tx" style="flex:0 0 64px"><b style="font-size:14px">${esc(a.ticker)}</b></span><span style="flex:1;position:relative;height:10px;background:var(--fill);border-radius:5px"><i style="position:absolute;top:0;bottom:0;border-radius:5px;${p >= 0 ? 'left:50%' : 'right:50%'};width:${w.toFixed(1)}%;background:${p >= 0 ? 'var(--gain)' : 'var(--loss)'}"></i></span><span class="rt num ${clsSigno(p, 0.0005)}" style="flex:0 0 68px;font-size:14px">${esc(pctf(p))}</span></button>`; }).join('')}</div>` : ''}
      <p class="foot">Ganancia = valor actual − capital ingresado. En dólares, cada ingreso y compra se pasa al dólar oficial de su fecha, así la devaluación no se ve como ganancia.</p>`;
  }

  /* ---------- Seguimiento ---------- */
  function renderSeguir() {
    const fx = fxHoy(), r = ultimoCalc, u = usdt();
    const fila = (cl, t, rmv) => {
      const q = cotizar(cl, t), k = C.clave(cl, t);
      const a = { key: k, cotiz: q };
      return `<div class="item seg-row" data-ver="${esc(cl)}|${esc(t)}"><span class="tx"><b>${esc(t)}</b><span>${esc((C.CLASES[cl] || {}).corto || cl)}${S.nombres[k] ? ' · ' + esc(S.nombres[k]) : ''}</span></span>
        <span class="spk spk-mini" data-spk="${esc(k)}">${sparkDe(a, true)}</span>
        <span class="rt num">${q ? esc(precioF(q.px, q.cur)) : '—'}${q && q.pct !== null && q.pct !== undefined ? `<span class="tag ${clsSigno(q.pct, 0.005)}">${esc(pctf(q.pct / 100))}</span>` : ''}</span>
        ${rmv ? `<button class="close" data-quitar="${esc(cl)}|${esc(t)}" aria-label="Dejar de seguir ${esc(t)}">${I.x}</button>` : ''}</div>`;
    };
    const brecha = (v) => (fx.oficial && v ? `<span>brecha ${esc(C.num((v / fx.oficial - 1) * 100, 1))} %</span>` : '');
    const dolares = fx.oficial ? [
      ['Oficial', 'Banco Nación', fx.oficial, null, false],
      ['Cripto (USDT)', 'Binance · en vivo', u && u.px, u && u.pct, true],
      ['MEP', 'Bolsa', fx.mep, null, true],
      ['Contado con liqui', 'CCL', fx.ccl, null, true],
      ['Blue', 'Informal', fx.blue, null, true],
    ] : [];
    $('v-seguir').innerHTML = `
      <div class="section-title">Dólar<span class="sp"></span><div class="live" style="margin:0"><i></i><span class="txt"></span></div></div>
      <div class="group">${dolares.map((d) => `<div class="item"><span class="tx"><b>${esc(d[0])}</b><span>${esc(d[1])}</span></span>
        <span class="rt num">${d[2] ? esc(precioF(d[2], 'ARS')) : '—'}${d[3] !== null && d[3] !== undefined && isFinite(d[3]) ? `<span class="${clsSigno(d[3], 0.005)}">${esc((d[3] > 0 ? '+' : '') + C.num(d[3], 1))} % hoy</span>` : ''}${d[4] ? brecha(d[2]) : ''}</span></div>`).join('') || '<p class="muted" style="padding:14px">Cargando…</p>'}</div>
      <div class="section-title">Siguiendo<span class="sp"></span><button class="link" id="addSeguir">${I.plus.replace('class="i"', 'class="i" style="width:16px;height:16px;vertical-align:-3px"')} Agregar</button></div>
      ${S.seguir.length ? `<div class="group">${S.seguir.map((w) => fila(w.clase, w.ticker.toUpperCase(), true)).join('')}</div>`
        : `<button class="drop" id="addSeguir2">${I.plus}Armá tu lista de seguimiento<small>Buscá CEDEARs, acciones, bonos, letras, ONs, acciones de EE.UU. o cripto, aunque no las tengas.</small></button>`}
      ${r.abiertos.length ? `<div class="section-title">Tus activos</div><div class="group">${r.abiertos.map((a) => fila(a.clase, a.ticker, false)).join('')}</div>` : ''}
      <p class="foot">Precios cada ${S.ajustes.intervalo || 30} s mientras la app está abierta. Tocá un activo para ver su gráfico.</p>`;
    $('addSeguir').onclick = abrirSeguir;
    const a2 = $('addSeguir2'); if (a2) a2.onclick = abrirSeguir;
    $('v-seguir').querySelectorAll('[data-ver]').forEach((el) => { el.onclick = (e) => { if (e.target.closest('[data-quitar]')) return; const [cl, t] = el.dataset.ver.split('|'); abrirActivo(C.clave(cl, t), { clase: cl, ticker: t }); }; });
    $('v-seguir').querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = () => { const [cl, t] = b.dataset.quitar.split('|'); S.seguir = S.seguir.filter((w) => !(w.clase === cl && w.ticker.toUpperCase() === t)); guardar(); render(); toast('Dejaste de seguir ' + t); }; });
    cargarSparks();
  }

  /* ---------- Movimientos ---------- */
  function renderMovs() {
    const pid = S.ajustes.persona;
    const lista = S.movs.filter((m) => (!S.ajustes.cartera || m.cartera === S.ajustes.cartera) && (!pid || C.parteDe(m, pid, personaDef()) > 0))
      .slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.t || 0) - (a.t || 0)));
    let html = `<div class="section-title">Movimientos<span class="sp"></span>${pid ? `<span class="tag neu">${esc(persona(pid).nombre)}</span>` : ''}</div>`;
    if (!lista.length) html += `<div class="card empty">${I.pen}<h3>Sin movimientos</h3><p>Subí una captura o cargá uno a mano con el botón +.</p></div>`;
    let mes = '';
    lista.forEach((m, i) => {
      const mm = m.fecha.slice(0, 7);
      if (mm !== mes) { if (mes) html += '</div>'; mes = mm; html += `<div class="month">${MESES[+mm.slice(5) - 1]} ${mm.slice(0, 4)}</div><div class="group">`; }
      html += filaMov(m);
    });
    if (mes) html += '</div>';
    html += '<p class="foot">El color indica de quién es cada movimiento.</p>';
    $('v-movs').innerHTML = html;
    $('v-movs').querySelectorAll('[data-mov]').forEach((b) => { b.onclick = () => abrirForm(S.movs.find((m) => m.id === b.dataset.mov)); });
  }
  function letraMov(m) {
    if (m.reparto) return S.personas.map((p) => chip(p.id, p.nombre + ' ' + Math.round(C.parteDe(m, p.id) * 100) + '%')).join(' ');
    const p = persona(m.titular || personaDef()) || S.personas[0];
    return chip(p.id, p.nombre);
  }
  function filaMov(m) {
    const t = TIPOS[m.tipo] || TIPOS.compra;
    const mon = m.moneda === 'USD' ? usd : ars;
    let titulo, monto;
    if (m.tipo === 'compra' || m.tipo === 'venta') {
      titulo = `${t.nombre} ${m.ticker.toUpperCase()}`;
      const tot = (+m.cantidad) * (+m.precio) / C.factor(m.clase) + (m.tipo === 'compra' ? 1 : -1) * (+m.comision || 0);
      monto = (m.tipo === 'compra' ? '−' : '+') + mon(tot);
    } else { titulo = m.tipo === 'renta' && m.ticker ? `${t.nombre.split(' /')[0]} ${m.ticker.toUpperCase()}` : t.nombre; monto = (m.tipo === 'retiro' ? '−' : '+') + mon(+m.monto); }
    const det = (m.tipo === 'compra' || m.tipo === 'venta') ? `${C.cantidad(m.cantidad)} × ${precioF(+m.precio, m.moneda)}`
      : m.pesos > 0 ? `pagaste ${ars(+m.pesos)} (${ars(m.pesos / m.monto)} por dólar)` : (m.nota || '');
    return `<button class="item" data-mov="${esc(m.id)}"><span class="ic" style="${m.tipo === 'ingreso' ? 'color:var(--gain)' : m.tipo === 'retiro' ? 'color:var(--loss)' : 'color:var(--accent-ink)'}">${t.icon}</span>
      <span class="tx"><b>${esc(titulo)} ${letraMov(m)}</b><span>${esc(fechaCorta(m.fecha))}${det ? ' · ' + esc(det) : ''}${S.carteras.length > 1 ? ' · ' + esc(nombreCartera(m.cartera)) : ''}</span></span>
      <span class="rt num">${esc(monto)}${m.origen === 'captura' ? '<span>desde captura</span>' : ''}</span></button>`;
  }

  /* ================= hojas ================= */
  let hojaActual = null;
  function abrirHoja(titulo, html, alMontar, alCerrar) {
    cerrarHoja(true);
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', titulo);
    sh.innerHTML = `<div class="grabber"></div><div class="sheet-head"><h3>${esc(titulo)}</h3><button class="close" aria-label="Cerrar">${I.x}</button></div><div class="sheet-body">${html}</div>`;
    document.body.append(scrim, sh);
    requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
    scrim.onclick = () => cerrarHoja(); sh.querySelector('.close').onclick = () => cerrarHoja();
    // deslizar hacia abajo desde el agarre para cerrar
    let y0 = null; sh.addEventListener('touchstart', (e) => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    sh.addEventListener('touchmove', (e) => { if (y0 === null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; } }, { passive: true });
    sh.addEventListener('touchend', (e) => { if (y0 === null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) cerrarHoja(); });
    hojaActual = { scrim, sh, alCerrar };
    if (alMontar) alMontar(sh.querySelector('.sheet-body'), sh);
    return sh;
  }
  function cerrarHoja(inmediato) {
    if (!hojaActual) return; const { scrim, sh, alCerrar } = hojaActual; hojaActual = null;
    if (alCerrar) setTimeout(alCerrar, 0);
    if (inmediato) { scrim.remove(); sh.remove(); return; }
    scrim.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => { scrim.remove(); sh.remove(); }, 420);
  }

  /* ---------- detalle de un activo ---------- */
  async function abrirActivo(key, suelto) {
    const a = (ultimoCalc.abiertos.concat(ultimoCalc.cerrados)).find((x) => x.key === key);
    const clase = a ? a.clase : suelto.clase, ticker = (a ? a.ticker : suelto.ticker).toUpperCase();
    const q = cotizar(clase, ticker);
    const rango = { v: S.ajustes.rango || '3M' };
    const sh = abrirHoja(ticker, `
      <div><div class="big num">${q ? esc(precioF(q.px, q.cur)) : 'Sin precio'}</div>
        <div class="a-row">${esc((C.CLASES[clase] || {}).nombre || clase)}${C.POR100[clase] ? ' · precio cada 100 nominales' : ''}${q && q.pct !== null && q.pct !== undefined ? ` · <span class="tag ${clsSigno(q.pct, 0.005)}">${esc(pctf(q.pct / 100))} hoy</span>` : ''}</div></div>
      <div class="seg" id="rangos">${['1M', '3M', '6M', '1A', 'Todo'].map((x) => `<button data-val="${x}" class="${rango.v === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div id="graf"><div style="display:grid;place-items:center;height:170px"><div class="spinner"></div></div></div>
      ${a && a.qty > 0 ? `<div class="card" style="background:var(--surface-2)"><dl class="kv">
        <dt>Cantidad</dt><dd class="num">${esc(C.cantidad(a.qty))} ${C.POR100[clase] ? 'VN' : ''}</dd>
        <dt>Precio promedio de compra</dt><dd class="num">${esc(precioF(a.ppc, a.cur))}</dd>
        <dt>Invertido</dt><dd class="num">${esc(ars(a.costo.ars))}<small>${esc(usd(a.costo.of))} oficial del día de compra</small></dd>
        <dt>Vale hoy</dt><dd class="num">${esc(ars(a.valor.ars))}<small>${esc(usd(a.valor.of))} oficial${a.cur === 'USD' ? '' : ' · ' + esc(usd(a.valor.ccl)) + ' CCL'}</small></dd>
        <dt>Ganancia</dt><dd class="num ${clsSigno(a.ganancia.ars)}">${esc(conSigno(a.ganancia.ars, ars))} · ${esc(pctf(a.rend.ars))}<small>${esc(conSigno(a.ganancia.of, usd))} · ${esc(pctf(a.rend.of))} en dólares</small></dd>
        ${Math.abs(a.realizado.ars) > 0.5 ? `<dt>Realizada en ventas</dt><dd class="num ${clsSigno(a.realizado.ars)}">${esc(conSigno(a.realizado.ars, ars))}</dd>` : ''}
        ${Math.abs(a.rentas.ars) > 0.5 ? `<dt>Rentas cobradas</dt><dd class="num pos">${esc(conSigno(a.rentas.ars, ars))}</dd>` : ''}
        <dt>Peso en la cartera</dt><dd class="num">${C.num(a.peso * 100, 1)} %</dd></dl></div>` : ''}
      ${(clase === 'fci' || clase === 'otro') ? `<div class="card" style="background:var(--surface-2)"><h2>Valor a mano</h2><p class="muted" style="font-size:13px">Este tipo de activo no tiene precio en vivo. Cargá el valor de la cuotaparte o unidad cuando lo veas en tu broker.</p>
        <div class="cols"><label class="field"><span>Precio por unidad</span><input id="mpx" inputmode="decimal" value="${q ? esc(q.px) : ''}"></label><label class="field"><span>Moneda</span><select id="mcur"><option>ARS</option><option ${q && q.cur === 'USD' ? 'selected' : ''}>USD</option></select></label></div>
        <button class="btn sec" id="mguardar">Guardar valor</button></div>` : ''}
      ${a ? htmlDuenoCartera(key) : ''}
      <div class="btns">${a && a.qty > 0 ? `<button class="btn" id="mas">Comprar más</button><button class="btn sec" id="vender">Vender</button>` : `<button class="btn" id="mas">Cargar compra</button>`}</div>
      ${a ? `<div class="month" style="margin:4px 4px 0">Movimientos</div><div class="group">${a.movs.slice().reverse().map(filaMov).join('')}</div>` : ''}`,
    (body) => {
      body.querySelector('#mas').onclick = () => abrirForm(null, { tipo: 'compra', clase, ticker });
      if (a) montarDuenoCartera(body, key, ticker);
      const v = body.querySelector('#vender'); if (v) v.onclick = () => abrirForm(null, { tipo: 'venta', clase, ticker, cantidad: a.qty });
      body.querySelectorAll('[data-mov]').forEach((b) => { b.onclick = () => abrirForm(S.movs.find((m) => m.id === b.dataset.mov)); });
      const mg = body.querySelector('#mguardar');
      if (mg) mg.onclick = () => { const px = C.leerNumero(body.querySelector('#mpx').value); if (!(px > 0)) return toast('Poné un precio válido'); S.manual[C.clave(clase, ticker)] = { px, cur: body.querySelector('#mcur').value, at: hoyISO() }; guardar(); render(); cerrarHoja(); toast('Valor guardado'); };
      body.querySelectorAll('#rangos button').forEach((b) => { b.onclick = () => { rango.v = b.dataset.val; S.ajustes.rango = rango.v; guardar(); body.querySelectorAll('#rangos button').forEach((x) => x.classList.toggle('on', x === b)); dibujar(); }; });
      let serie = null;
      const dibujar = () => {
        const g = body.querySelector('#graf'); if (!g) return;
        if (!serie || serie.length < 2) { g.innerHTML = `<p class="muted" style="text-align:center;padding:24px 0">${clase === 'fci' || clase === 'otro' || clase === 'usa' ? 'Este activo no tiene historial de precios en las fuentes gratuitas.' : 'No hay historial para este activo.'}</p>`; return; }
        const dias = { '1M': 31, '3M': 92, '6M': 183, '1A': 366, Todo: 1e5 }[rango.v];
        const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
        let pts = serie.filter((p) => p.t >= desde).map((p) => ({ t: p.t, y: p.c }));
        if (q && pts.length && pts[pts.length - 1].t !== hoyISO()) pts.push({ t: hoyISO(), y: q.px });
        const sube = pts.length > 1 && pts[pts.length - 1].y >= pts[0].y;
        const ref = a && a.qty > 0 && a.cur === (q ? q.cur : a.cur) ? { y: a.ppc, label: 'Tu precio promedio ' + precioF(a.ppc, a.cur) } : null;
        g.innerHTML = lineChart('ch-' + Date.now(), [{ color: sube ? 'var(--gain)' : 'var(--loss)', area: true, pts }], { ref, fmt: (y) => precioF(y, q ? q.cur : 'ARS') });
        activarCharts(g);
      };
      historial(clase, ticker).then((s) => { serie = s; dibujar(); });
    });
    return sh;
  }

  // Dueño y cartera de un activo: se cambian en TODOS sus movimientos (compras, ventas, rentas)
  const movsDelActivo = (key) => S.movs.filter((m) => (m.tipo === 'compra' || m.tipo === 'venta' || m.tipo === 'renta') && m.ticker && C.clave(m.clase, m.ticker) === key);
  function htmlDuenoCartera(key) {
    const ms = movsDelActivo(key); if (!ms.length) return '';
    const duenos = new Set(ms.map((m) => (m.reparto ? 'compartido:' + JSON.stringify(m.reparto) : m.titular || personaDef())));
    const actual = duenos.size === 1 ? [...duenos][0].split(':')[0] : 'mixto';
    const carts = new Set(ms.map((m) => m.cartera));
    const cart = carts.size === 1 ? [...carts][0] : 'varias';
    const r0 = ms.find((m) => m.reparto);
    const pct0 = r0 && actual === 'compartido' ? Math.round(C.parteDe(r0, S.personas[0].id) * 100) : 50;
    // reparto real hoy (por cantidad)
    const partes = S.personas.map((p) => { const x = C.calcular(ms, precioDe, fxHoy(), { persona: p.id, personaDefecto: personaDef() }).abiertos.find((y) => y.key === key); return { p, q: x ? x.qty : 0 }; });
    const tot = partes.reduce((s0, x) => s0 + x.q, 0);
    return `<div class="card" style="background:var(--surface-2)" id="dueno"><h2>Dueño y cartera</h2>
      ${tot ? `<div class="split">${partes.map((x) => `<i style="width:${(x.q / tot * 100).toFixed(1)}%;background:${esc(x.p.color)}"></i>`).join('')}</div>
        <div class="whos">${partes.filter((x) => x.q > 0).map((x) => chip(x.p.id, x.p.nombre + ' ' + Math.round(x.q / tot * 100) + '%')).join('')}</div>` : ''}
      <div class="cols"><label class="field"><span>De quién es</span><select id="dcDueno">
          ${actual === 'mixto' ? '<option value="mixto" selected>Mezclado (como está)</option>' : ''}
          ${S.personas.map((p) => `<option value="${esc(p.id)}" ${actual === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}
          <option value="compartido" ${actual === 'compartido' ? 'selected' : ''}>Compartido</option></select></label>
        <label class="field"><span>Cartera</span><select id="dcCart">
          ${cart === 'varias' ? '<option value="varias" selected>Varias (como está)</option>' : ''}
          ${S.carteras.map((c) => `<option value="${esc(c.id)}" ${cart === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label></div>
      <label class="field" id="dcPctW" ${actual === 'compartido' ? '' : 'hidden'}><span>% de ${esc(S.personas[0].nombre)} (el resto, de ${esc(S.personas[1].nombre)})</span><input id="dcPct" inputmode="decimal" value="${pct0}"></label>
      <p class="muted" style="font-size:13px">Se aplica a los ${ms.length} movimientos de este activo (compras, ventas y rentas). Los ingresos de dinero no se tocan.</p>
      <button class="btn sec" id="dcOk" hidden>Aplicar cambio</button></div>`;
  }
  function montarDuenoCartera(body, key, ticker) {
    const d = body.querySelector('#dcDueno'); if (!d) return;
    const c = body.querySelector('#dcCart'), ok = body.querySelector('#dcOk'), pw = body.querySelector('#dcPctW');
    const d0 = d.value, c0 = c.value;
    const cambio = () => { pw.hidden = d.value !== 'compartido'; ok.hidden = d.value === d0 && c.value === c0 && d.value !== 'compartido'; };
    d.onchange = cambio; c.onchange = cambio; body.querySelector('#dcPct').oninput = () => { ok.hidden = false; };
    ok.onclick = () => {
      const ms = movsDelActivo(key), partes = [];
      if (d.value !== 'mixto' && (d.value !== d0 || d.value === 'compartido')) partes.push(d.value === 'compartido' ? 'compartido' : 'de ' + nombreDe(d.value));
      if (c.value !== 'varias' && c.value !== c0) partes.push('en la cartera ' + nombreCartera(c.value));
      if (!partes.length) return;
      if (!confirm(`¿Pasar ${ticker} (${ms.length} movimientos) a ${partes.join(' y ')}?`)) return;
      const pct = Math.max(0, Math.min(100, C.leerNumero(body.querySelector('#dcPct').value) || 50));
      ms.forEach((m) => {
        if (d.value === 'compartido') { m.reparto = { [S.personas[0].id]: pct, [S.personas[1].id]: 100 - pct }; delete m.titular; }
        else if (d.value !== 'mixto') { m.titular = d.value; delete m.reparto; }
        if (c.value !== 'varias') m.cartera = c.value;
      });
      guardar(); render(); toast(ticker + ' actualizado'); abrirActivo(key, { clase: key.split(':')[0], ticker });
    };
  }

  /* ---------- formulario de movimiento ---------- */
  const CAMPOS_POR_TIPO = {
    ingreso: ['monto', 'moneda', 'pesos'], retiro: ['monto', 'moneda'],
    compra: ['clase', 'ticker', 'cantidad', 'precio', 'moneda', 'comision', 'total'],
    venta: ['clase', 'ticker', 'cantidad', 'precio', 'moneda', 'comision', 'total'],
    renta: ['clase', 'ticker', 'monto', 'moneda'],
  };
  function camposMov(m) {
    const opt = (v, txt, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(txt)}</option>`;
    const quien = m.reparto ? 'compartido' : (m.titular || (m._sinMarca ? '' : personaDef()));
    const pct0 = m.reparto ? Math.round(C.parteDe(m, S.personas[0].id) * 100) : 50;
    return `<div class="form mf">
      <div class="cols"><label class="field"><span>Tipo</span><select data-f="tipo">${Object.keys(TIPOS).map((k) => opt(k, TIPOS[k].nombre, m.tipo === k)).join('')}</select></label>
        <label class="field"><span>Fecha</span><input type="date" data-f="fecha" value="${esc(m.fecha || hoyISO())}" max="${hoyISO()}"></label></div>
      <div class="cols"><label class="field"><span>De quién</span><select data-f="quien">${quien === '' ? opt('', 'Elegí…', true) : ''}${S.personas.map((p) => opt(p.id, p.nombre, quien === p.id)).join('')}${opt('compartido', 'Compartido', quien === 'compartido')}</select></label>
        <label class="field" data-w="pct"><span>% de ${esc(S.personas[0].nombre)}</span><input data-f="pct" inputmode="decimal" value="${pct0}"></label></div>
      <div class="cols" data-w="clase"><label class="field"><span>Tipo de activo</span><select data-f="clase">${Object.keys(C.CLASES).map((k) => opt(k, C.CLASES[k].nombre, (m.clase || 'cedear') === k)).join('')}</select></label>
        <label class="field" data-w="ticker"><span>Ticker</span><input data-f="ticker" value="${esc(m.ticker || '')}" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="SPY, AL30, BTC"></label></div>
      <div class="cols"><label class="field" data-w="cantidad"><span data-l="cantidad">Cantidad</span><input data-f="cantidad" inputmode="decimal" value="${esc(m.cantidad ?? '')}"></label>
        <label class="field" data-w="precio"><span data-l="precio">Precio por unidad</span><input data-f="precio" inputmode="decimal" value="${esc(m.precio ?? '')}"></label></div>
      <div class="cols"><label class="field" data-w="monto"><span>Monto</span><input data-f="monto" inputmode="decimal" value="${esc(m.monto ?? '')}"></label>
        <label class="field" data-w="comision"><span>Comisión</span><input data-f="comision" inputmode="decimal" value="${esc(m.comision ?? '')}" placeholder="0"></label>
        <label class="field" data-w="moneda"><span>Moneda</span><select data-f="moneda">${opt('ARS', 'Pesos', m.moneda !== 'USD')}${opt('USD', 'Dólares', m.moneda === 'USD')}</select></label></div>
      <label class="field" data-w="pesos"><span>Pesos que pagaste por esos dólares (opcional)</span><input data-f="pesos" inputmode="decimal" value="${esc(m.pesos ?? '')}" placeholder="Si lo sabés, el capital se cuenta con esto"></label>
      <div class="total" data-w="total"><span>Total</span><b class="num" data-total></b></div>
      ${S.carteras.length > 1 ? `<label class="field"><span>Cartera</span><select data-f="cartera">${S.carteras.map((c) => opt(c.id, c.nombre, (m.cartera || S.ajustes.cartera || S.carteras[0].id) === c.id)).join('')}</select></label>` : ''}
      <label class="field"><span>Nota</span><input data-f="nota" value="${esc(m.nota || '')}" placeholder="Broker, detalle…"></label>
    </div>`;
  }
  function montarCampos(el) {
    const f = (k) => el.querySelector(`[data-f="${k}"]`);
    const act = () => {
      const tipo = f('tipo').value, vis = CAMPOS_POR_TIPO[tipo] || [];
      el.querySelectorAll('[data-w]').forEach((w) => { const k = w.dataset.w; if (k === 'pct') return; w.hidden = !vis.includes(k); });
      // filas de dos columnas sin campos visibles se ocultan enteras
      el.querySelectorAll('.cols').forEach((c) => { const hijos = [...c.children]; if (hijos.every((h) => h.hidden)) c.hidden = true; else c.hidden = c.dataset.w ? !vis.includes(c.dataset.w) : false; });
      el.querySelector('[data-w="pct"]').hidden = f('quien').value !== 'compartido';
      el.querySelector('[data-w="pesos"]').hidden = !(vis.includes('pesos') && f('moneda').value === 'USD');
      const por100 = C.POR100[f('clase').value];
      el.querySelector('[data-l="precio"]').textContent = por100 ? 'Precio c/100 nominales' : 'Precio por unidad';
      el.querySelector('[data-l="cantidad"]').textContent = por100 ? 'Nominales (VN)' : 'Cantidad';
      const q = C.leerNumero(f('cantidad').value), p = C.leerNumero(f('precio').value), c = C.leerNumero(f('comision').value) || 0;
      const tot = q * p / C.factor(f('clase').value) + (tipo === 'venta' ? -c : c);
      el.querySelector('[data-total]').textContent = isFinite(tot) && tot > 0 ? (f('moneda').value === 'USD' ? usd(tot) : ars(tot)) : '—';
    };
    el.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', act));
    act();
  }
  function leerCampos(el, base) {
    const f = (k) => { const x = el.querySelector(`[data-f="${k}"]`); return x ? x.value : ''; };
    const m = Object.assign({}, base || {});
    m.tipo = f('tipo'); m.fecha = f('fecha') || hoyISO(); m.moneda = f('moneda') || 'ARS'; m.nota = f('nota').trim();
    m.cartera = f('cartera') || m.cartera || S.ajustes.cartera || S.carteras[0].id;
    const quien = f('quien');
    if (!quien) return { m, error: 'Elegí de quién es' };
    if (quien === 'compartido') { const p = Math.max(0, Math.min(100, C.leerNumero(f('pct')) || 50)); m.reparto = { [S.personas[0].id]: p, [S.personas[1].id]: 100 - p }; delete m.titular; }
    else { m.titular = quien; delete m.reparto; }
    const vis = CAMPOS_POR_TIPO[m.tipo];
    ['clase', 'ticker', 'cantidad', 'precio', 'comision', 'monto'].forEach((k) => { if (!vis.includes(k)) delete m[k]; });
    if (vis.includes('clase')) m.clase = f('clase');
    if (vis.includes('ticker')) m.ticker = limpiarTicker(f('ticker'), m.clase);
    ['cantidad', 'precio', 'comision', 'monto'].forEach((k) => { if (vis.includes(k)) m[k] = C.leerNumero(f(k)) || 0; });
    const pesos = C.leerNumero(f('pesos'));
    if (vis.includes('pesos') && m.moneda === 'USD' && pesos > 0) m.pesos = pesos; else delete m.pesos;
    let error = '';
    if ((m.tipo === 'compra' || m.tipo === 'venta') && (!m.ticker || !(m.cantidad > 0) || !(m.precio > 0))) error = 'Completá ticker, cantidad y precio';
    if ((m.tipo === 'ingreso' || m.tipo === 'retiro' || m.tipo === 'renta') && !(m.monto > 0)) error = 'Completá el monto';
    if (m.fecha > hoyISO()) error = 'La fecha no puede ser futura';
    return { m, error };
  }
  async function guardarMovs(lista) {
    for (const m of lista) {
      if (!m.id) m.id = uid();
      if (!m.t) m.t = Date.now();
      if (!m.fx || m.fx._fecha !== m.fecha) { const fx = await fxDeFecha(m.fecha); m.fx = Object.assign({}, fx, { _fecha: m.fecha }); }
      if (m.nombre && m.ticker) S.nombres[C.clave(m.clase, m.ticker)] = m.nombre;
      const i = S.movs.findIndex((x) => x.id === m.id); if (i >= 0) S.movs[i] = m; else S.movs.push(m);
    }
    guardar();
    await actualizar();
  }
  function abrirForm(mov, pre) {
    const nuevo = !mov;
    const duenaCart = (S.carteras.find((c) => c.id === S.ajustes.cartera) || {}).duena;
    const m = mov || Object.assign({ tipo: 'compra', fecha: hoyISO(), moneda: 'ARS', titular: S.ajustes.persona || duenaCart || personaDef() }, pre || {});
    abrirHoja(nuevo ? 'Nuevo movimiento' : 'Editar movimiento', `${camposMov(m)}
      <div class="btns"><button class="btn wide" id="fGuardar">Guardar</button></div>
      ${nuevo ? '' : `<button class="btn danger wide" id="fBorrar">${I.trash}Borrar movimiento</button>`}`, (body) => {
      const cont = body.querySelector('.mf'); montarCampos(cont);
      body.querySelector('#fGuardar').onclick = async (e) => {
        const { m: x, error } = leerCampos(cont, mov); if (error) return toast(error);
        e.target.disabled = true; e.target.textContent = 'Guardando…';
        await guardarMovs([x]); cerrarHoja(); toast(nuevo ? 'Movimiento guardado' : 'Cambios guardados');
      };
      const b = body.querySelector('#fBorrar');
      if (b) b.onclick = () => {
        const copia = S.movs.slice();
        S.movs = S.movs.filter((x) => x.id !== mov.id); guardar(); cerrarHoja(); render();
        toast('Movimiento borrado', 'Deshacer', () => { S.movs = copia; guardar(); render(); });
      };
    });
  }

  /* ---------- cargar: captura o a mano ---------- */
  function abrirCargar() {
    const tieneClave = !!gemini.get();
    abrirHoja('Cargar', `
      <button class="drop" id="cSubir">${I.cam}Subir capturas<small>Comprobantes de compra, ingresos de dinero, rentas. Primero elegís de quién son.</small></button>
      ${tieneClave ? '' : `<div class="banner"><span class="sp">Para leer capturas falta conectar Gemini (gratis).</span><button class="link" id="cConfig">Configurar</button></div>`}
      <div class="month" style="margin:4px 4px 0">O cargalo a mano</div>
      <div class="group">
        <button class="item" data-t="ingreso"><span class="ic" style="color:var(--gain)">${I.in}</span><span class="tx"><b>Ingreso de dinero</b><span>Plata que pusiste para invertir</span></span></button>
        <button class="item" data-t="compra"><span class="ic" style="color:var(--accent-ink)">${I.buy}</span><span class="tx"><b>Compra</b><span>CEDEAR, acción, bono, cripto…</span></span></button>
        <button class="item" data-t="venta"><span class="ic" style="color:var(--accent-ink)">${I.sell}</span><span class="tx"><b>Venta</b></span></button>
        <button class="item" data-t="renta"><span class="ic" style="color:var(--gain)">${I.coin}</span><span class="tx"><b>Dividendo, cupón o renta</b></span></button>
        <button class="item" data-t="retiro"><span class="ic" style="color:var(--loss)">${I.out}</span><span class="tx"><b>Retiro de dinero</b></span></button>
      </div>`, (body) => {
      body.querySelector('#cSubir').onclick = elegirQuien;
      const cc = body.querySelector('#cConfig'); if (cc) cc.onclick = abrirAjustes;
      body.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => abrirForm(null, { tipo: b.dataset.t }); });
    });
  }

  // Antes de elegir las imágenes: ¿de quién son? (el toque en la persona abre el selector de fotos)
  let quienCaptura = null;
  function elegirQuien() {
    if (!gemini.get()) { abrirAjustes(); return toast('Primero pegá tu clave de Gemini'); }
    abrirHoja('¿De quién son?', `<p class="muted">Todo lo que leas en estas capturas se carga a nombre de quien elijas. Después, en la revisión, podés cambiarlo movimiento por movimiento.</p>
      <div class="group">${S.personas.map((p) => `<button class="item" data-q="${esc(p.id)}"><span class="ic" style="background:${esc(p.color)};color:#fff;font-weight:800">${esc(p.nombre.slice(0, 1).toUpperCase())}</span><span class="tx"><b>De ${esc(p.nombre)}</b></span></button>`).join('')}
        <button class="item" data-q="compartido"><span class="ic" style="background:linear-gradient(90deg, ${esc(S.personas[0].color)} 50%, ${esc(S.personas[1].color)} 50%);color:#fff;font-weight:800">½</span><span class="tx"><b>Compartidas</b><span>50 % y 50 %, se puede ajustar después</span></span></button></div>`, (body) => {
      body.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => { quienCaptura = b.dataset.q; window.pausarBloqueo(); $('fileIn').click(); }; });
    });
  }
  async function comprimir(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.86));
    const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    return { b64, url: URL.createObjectURL(blob) };
  }

  function promptGemini(n) {
    return `Sos un asistente que lee capturas de pantalla de brokers, bancos y exchanges argentinos (IOL, Cocos, Balanz, Bull Market, PPI, Allaria, Binance, Lemon, Belo, Ripio, Mercado Pago, etc.) y extrae movimientos de inversión.
Hoy es ${hoyISO()}. Recibís ${n} captura(s), numeradas desde 1 en el orden en que llegan.
Devolvé SOLO JSON: {"movimientos":[...]}. Cada movimiento tiene:
- captura: número de la captura de donde sale.
- tipo: "ingreso" (depósito o transferencia de dinero a la cuenta de inversión), "retiro", "compra", "venta" o "renta" (dividendo, cupón, renta, amortización, interés, staking).
- fecha: "AAAA-MM-DD". Si no figura el año, usá el año actual (y si así quedaría en el futuro, el anterior). Si no hay fecha, null.
- clase: "cedear", "accion" (acción argentina), "bono" (título público: AL30, GD30, TX26…), "on" (obligación negociable), "letra" (LECAP, BONCAP, S31O6…), "cripto", "usa" (acción comprada directo en el exterior), "fci" u "otro". null en ingreso o retiro.
- ticker: símbolo como cotiza (SPY, GGAL, AL30, GD30D, BTC). Para cripto, la moneda sin el par (BTC, no BTCUSDT).
- nombre: nombre del activo si aparece (ej. "SPDR S&P 500"), si no null.
- cantidad: unidades o valor nominal. Número.
- precio: precio por unidad en la moneda de la operación. Bonos, ON y letras: precio CADA 100 nominales (si la captura muestra el precio por 1 nominal, multiplicalo por 100).
- moneda: "ARS" o "USD" (USDT, USDC y dólar MEP o cable cuentan como USD).
- comision: comisión + derechos de mercado + IVA, en la moneda de la operación; 0 si no figura.
- monto: importe total en la moneda indicada (en compras y ventas, el total de la operación).
- nota: broker o exchange si se reconoce.
Los números en las capturas argentinas usan coma decimal y punto de miles (1.234,56 = 1234.56): devolvelos como número JSON. No inventes datos: si algo no se ve, null. Si una captura no tiene movimientos, no agregues nada por ella.`;
  }
  // Prueba mínima de la clave: una pregunta de texto cortita (no gasta casi cuota)
  async function probarGemini(key) {
    const body = { contents: [{ parts: [{ text: 'Respondé sólo con la palabra OK.' }] }], generationConfig: { temperature: 0, maxOutputTokens: 5 } };
    let ultimo = '';
    for (const modelo of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
      let r;
      try { r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }); }
      catch (e) { return { ok: false, txt: 'Sin conexión con Google. Revisá internet.' }; }
      if (r.ok) return { ok: true, txt: 'La clave funciona. Ya podés leer capturas.' };
      let det = ''; try { det = ((await r.json()).error || {}).status || ''; } catch (e) {}
      if (r.status === 400 || r.status === 401 || r.status === 403) return { ok: false, txt: det === 'PERMISSION_DENIED' ? 'Google rechazó la clave: puede que la API no esté habilitada en ese proyecto.' : 'La clave no es válida. Copiala de nuevo desde AI Studio.' };
      ultimo = r.status === 429 ? 'La clave es válida, pero se terminó la cuota gratis de hoy.' : 'Gemini no respondió (' + r.status + '). Probá en un rato.';
    }
    return { ok: /válida/.test(ultimo), txt: ultimo };
  }
  async function leerConGemini(imgs) {
    const key = gemini.get();
    const body = { contents: [{ parts: [{ text: promptGemini(imgs.length) }].concat(imgs.map((i) => ({ inline_data: { mime_type: 'image/jpeg', data: i.b64 } }))) }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } };
    let ultimoError = '';
    for (const modelo of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
      if (r.ok) {
        const j = await r.json();
        const txt = (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map((p) => p.text || '').join('');
        const data = JSON.parse(txt.replace(/^```json|```$/g, '').trim());
        return Array.isArray(data) ? data : data.movimientos || [];
      }
      ultimoError = r.status === 400 || r.status === 403 ? 'La clave de Gemini no es válida' : r.status === 429 ? 'Se terminó la cuota gratis de Gemini por hoy' : 'Gemini no respondió (' + r.status + ')';
      if (r.status === 400 || r.status === 403) break;
    }
    throw new Error(ultimoError);
  }
  function normalizar(x) {
    const m = { origen: 'captura' };
    m.tipo = TIPOS[x.tipo] ? x.tipo : 'compra';
    m.fecha = /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && x.fecha <= hoyISO() ? x.fecha : hoyISO();
    m.moneda = String(x.moneda || '').toUpperCase() === 'USD' ? 'USD' : 'ARS';
    m.clase = C.CLASES[x.clase] ? x.clase : (m.tipo === 'ingreso' || m.tipo === 'retiro' ? undefined : 'cedear');
    if (x.ticker) m.ticker = limpiarTicker(x.ticker, m.clase);
    ['cantidad', 'precio', 'comision', 'monto'].forEach((k) => { const v = C.leerNumero(x[k]); if (isFinite(v)) m[k] = v; });
    if ((m.tipo === 'compra' || m.tipo === 'venta') && !(m.precio > 0) && m.monto > 0 && m.cantidad > 0) m.precio = (m.monto - (m.comision || 0) * (m.tipo === 'compra' ? 1 : -1)) / m.cantidad * C.factor(m.clase);
    if (x.nombre) m.nombre = String(x.nombre).slice(0, 60);
    if (x.nota) m.nota = String(x.nota).slice(0, 80);
    const q = x.quien || quienCaptura;
    if (q === 'compartido') m.reparto = { [S.personas[0].id]: 50, [S.personas[1].id]: 50 };
    else if (persona(q)) m.titular = q;
    else m._sinMarca = true;   // nadie elegido: la revisión obliga a elegir
    m._captura = x.captura;
    return m;
  }
  async function procesarCapturas(files) {
    if (!files.length) return;
    const imgs = [];
    const sh = abrirHoja('Leyendo capturas', `<div class="thumbs" id="thumbs"></div><div style="display:flex;gap:12px;align-items:center;justify-content:center;padding:18px 0"><div class="spinner"></div><span class="muted">Leyendo ${files.length} captura${files.length > 1 ? 's' : ''} con Gemini…</span></div>`);
    try {
      for (const f of files) { const c = await comprimir(f); imgs.push(c); const im = document.createElement('img'); im.src = c.url; im.alt = 'Captura'; sh.querySelector('#thumbs') && sh.querySelector('#thumbs').appendChild(im); }
      const crudos = await leerConGemini(imgs);
      const movs = crudos.map(normalizar);
      revisar(movs, imgs);
    } catch (e) {
      cerrarHoja(); toast(e.message || 'No se pudo leer la captura');
    }
  }
  function revisar(movs, imgs) {
    if (!movs.length) { cerrarHoja(); return toast('No encontré movimientos en esas capturas'); }
    const sinMarca = movs.filter((m) => m._sinMarca).length;
    abrirHoja(`Revisá ${movs.length} movimiento${movs.length > 1 ? 's' : ''}`, `
      <p class="muted">Revisá lo que leyó. Podés corregir cualquier dato, también de quién es, antes de guardar.${sinMarca ? ` <b>Elegí de quién es cada uno.</b>` : ''}</p>
      <div id="rev" style="display:grid;gap:12px">${movs.map((m, i) => `<div class="review" data-i="${i}">
        <div class="review-head">${imgs[(m._captura || 1) - 1] ? `<img src="${imgs[(m._captura || 1) - 1].url}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:8px">` : ''}<span>Movimiento ${i + 1}</span>${m._sinMarca ? '<span class="tag neg">¿de quién?</span>' : letraMov(m)}<span class="sp"></span><button class="close" data-quitar="${i}" aria-label="Descartar">${I.x}</button></div>
        ${camposMov(m)}</div>`).join('')}</div>
      <button class="btn wide" id="rGuardar">Guardar todo</button>`, (body) => {
      body.querySelectorAll('.review .mf').forEach(montarCampos);
      body.querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = () => b.closest('.review').remove(); });
      body.querySelector('#rGuardar').onclick = async (e) => {
        const out = [];
        for (const el of body.querySelectorAll('.review')) {
          const base = movs[+el.dataset.i]; const { m, error } = leerCampos(el.querySelector('.mf'), { origen: 'captura', nombre: base.nombre });
          if (error) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('Movimiento ' + (+el.dataset.i + 1) + ': ' + error); }
          out.push(m);
        }
        if (!out.length) { cerrarHoja(); return; }
        e.target.disabled = true; e.target.textContent = 'Guardando…';
        await guardarMovs(out); cerrarHoja(); toast(out.length + ' movimiento' + (out.length > 1 ? 's' : '') + ' guardado' + (out.length > 1 ? 's' : ''));
        imgs.forEach((i) => URL.revokeObjectURL(i.url));
      };
    });
  }

  /* ---------- seguir un activo ---------- */
  const MERCADOS = [['cedear', 'arg_cedears'], ['accion', 'arg_stocks'], ['bono', 'arg_bonds'], ['letra', 'arg_notes'], ['on', 'arg_corp'], ['usa', 'usa_stocks']];
  const CRIPTO_POP = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'TRX', 'TON', 'AVAX', 'LINK', 'DOT', 'LTC', 'POL', 'SHIB', 'UNI', 'ATOM', 'NEAR', 'ARB', 'OP', 'PEPE', 'SUI', 'USDC'];
  async function cargarListas() {
    await Promise.all(MERCADOS.filter((x) => !Q.lists[x[1]]).map((x) => pedir('https://data912.com/live/' + x[1]).then((arr) => guardarLista(x[1], arr)).catch(() => {})));
  }
  function buscarActivos(texto) {
    const q = texto.trim().toUpperCase().replace(/\s+/g, '');
    if (!q) return [];
    const out = [];
    MERCADOS.forEach(([cl, l]) => {
      const list = Q.lists[l]; if (!list) return;
      Object.keys(list).forEach((t) => {
        if (!t.includes(q)) return;
        // las versiones en dólares (…D / …C) de CEDEARs y bonos sólo si se buscan exactas
        if ((cl === 'cedear' || cl === 'bono') && /[DC]$/.test(t) && list[t.slice(0, -1)] && t !== q) return;
        out.push({ clase: cl, ticker: t, q: { px: list[t].c, cur: monedaCotiz(cl, t, list), pct: list[t].pct } });
      });
    });
    CRIPTO_POP.filter((t) => t.includes(q)).forEach((t) => out.push({ clase: 'cripto', ticker: t, q: Q.crypto[t] ? { px: Q.crypto[t].px, cur: 'USD', pct: Q.crypto[t].pct } : null }));
    if (/^[A-Z0-9]{2,10}$/.test(q) && !CRIPTO_POP.includes(q)) out.push({ clase: 'cripto', ticker: q, q: null, probar: true });
    // exacto > empieza con > contiene; a igual coincidencia: cripto conocidas, CEDEAR, acciones, bonos… y al final "probar en Binance"
    const ORDEN = { cripto: 0, cedear: 1, accion: 2, bono: 3, letra: 4, on: 5, usa: 6 };
    const peso = (x) => (x.probar ? 9 : x.ticker === q ? 0 : x.ticker.startsWith(q) ? 1 : 2) * 1000 + x.ticker.length * 10 + ORDEN[x.clase];
    return out.sort((a, b) => peso(a) - peso(b)).slice(0, 40);
  }
  function abrirSeguir() {
    abrirHoja('Seguir activos', `<label class="field"><span>Buscar por ticker</span><input id="sBuscar" type="search" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="SPY, GGAL, AL30, BTC…" enterkeyhint="search"></label>
      <div id="sRes" class="group"><p class="muted" style="padding:14px">Cargando mercados…</p></div>
      <p class="foot">CEDEARs, acciones y bonos: BYMA vía data912 (~20 s). Cripto: Binance. Tocá para seguir o dejar de seguir.</p>`, async (body) => {
      const inp = body.querySelector('#sBuscar'), res = body.querySelector('#sRes');
      const sigo = (cl, t) => S.seguir.some((w) => w.clase === cl && w.ticker.toUpperCase() === t);
      const pintar = () => {
        const r = buscarActivos(inp.value);
        if (!inp.value.trim()) { res.innerHTML = `<p class="muted" style="padding:14px">Escribí un ticker o parte de él. Ya seguís ${S.seguir.length} activo${S.seguir.length === 1 ? '' : 's'}.</p>`; return; }
        if (!r.length) { res.innerHTML = '<p class="muted" style="padding:14px">No encontré nada con eso.</p>'; return; }
        res.innerHTML = r.map((x) => `<button class="item" data-add="${esc(x.clase)}|${esc(x.ticker)}"><span class="ic" style="color:${COLOR_CLASE[x.clase]}">${sigo(x.clase, x.ticker) ? '<svg class="i" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' : I.plus}</span>
          <span class="tx"><b>${esc(x.ticker)}</b><span>${esc(C.CLASES[x.clase].nombre)}${x.probar ? ' · probar en Binance' : ''}</span></span>
          <span class="rt num">${x.q && x.q.px ? esc(precioF(x.q.px, x.q.cur)) : ''}${x.q && x.q.pct !== null && x.q.pct !== undefined ? `<span class="${clsSigno(x.q.pct, 0.005)}">${esc(pctf(x.q.pct / 100))}</span>` : ''}</span></button>`).join('');
        res.querySelectorAll('[data-add]').forEach((b) => { b.onclick = async () => {
          const [cl, t] = b.dataset.add.split('|');
          if (sigo(cl, t)) { S.seguir = S.seguir.filter((w) => !(w.clase === cl && w.ticker.toUpperCase() === t)); toast('Dejaste de seguir ' + t); }
          else { S.seguir.push({ clase: cl, ticker: t }); toast('Siguiendo ' + t); }
          guardar(); pintar();
          if (cl === 'cripto' && sigo(cl, t)) { await actualizar(); if (!cotizar(cl, t)) { S.seguir = S.seguir.filter((w) => !(w.clase === cl && w.ticker === t)); guardar(); toast(t + ' no cotiza en Binance contra USDT'); pintar(); } }
        }; });
      };
      inp.addEventListener('input', pintar);
      setTimeout(() => inp.focus(), 350);
      await cargarListas(); pintar();
    }, () => { actualizar(); });
  }

  /* ---------- cartera ---------- */
  function abrirCarteras() {
    abrirHoja('Cartera', `<div class="group">
      ${[{ id: '', nombre: 'Todas las carteras' }].concat(S.carteras).map((c) => `<button class="item" data-c="${esc(c.id)}"><span class="tx"><b>${esc(c.nombre)}</b>${c.id ? `<span>${c.duena ? 'De ' + esc(nombreDe(c.duena)) : 'Compartida'}</span>` : ''}</span>${(S.ajustes.cartera || '') === c.id ? `<span class="rt" style="color:var(--accent-ink)">✓</span>` : ''}</button>`).join('')}</div>
      <button class="btn sec wide" id="cNueva">${I.plus}Nueva cartera</button>
      <p class="foot">Separá por objetivo (largo plazo, cripto, ahorro de viaje). Las personas se eligen deslizando el panel de arriba.</p>`, (body) => {
      body.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { S.ajustes.cartera = b.dataset.c; guardar(); cerrarHoja(); render(); }; });
      body.querySelector('#cNueva').onclick = () => { const n = (prompt('Nombre de la nueva cartera') || '').trim(); if (!n) return; const id = uid(); S.carteras.push({ id, nombre: n.slice(0, 40) }); S.ajustes.cartera = id; guardar(); cerrarHoja(); render(); toast('Cartera creada'); };
    });
  }

  /* ---------- ajustes ---------- */
  // Ajustes es una pantalla propia (como en Mis Finanzas), no una hoja desde abajo
  function paginaAjustes(html, montar) {
    const el = $('v-ajustes');
    el.innerHTML = `<div class="page-head"><button class="back" id="ajVolver"><svg class="i" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>${esc({ activos: 'Activos', resumen: 'Resumen', seguir: 'Seguimiento', movs: 'Movimientos' }[vistaPrev] || 'Volver')}</button></div>
      <h2 class="large-title">Ajustes</h2>` + html;
    el.querySelector('#ajVolver').onclick = () => irA(vistaPrev || 'activos');
    montar(el);
  }
  function abrirAjustes() {
    cerrarHoja(true);
    if (vista !== 'ajustes') { vistaPrev = vista; irA('ajustes'); }
    const t = S.ajustes.tema || '';
    paginaAjustes(`
      <div class="card" style="background:var(--surface-2)"><h2>Apariencia</h2>
        <div class="seg" id="aTema"><button data-val="" class="${t === '' ? 'on' : ''}">Automático</button><button data-val="light" class="${t === 'light' ? 'on' : ''}">Claro</button><button data-val="dark" class="${t === 'dark' ? 'on' : ''}">Oscuro</button></div>
        <span class="hint" style="padding:6px 0 0">Vidrio: más transparente o más fácil de leer</span>
        <label class="range-row"><span>Transparente</span><input type="range" id="aVidrio" min="0" max="1" step="0.05" value="${S.ajustes.vidrio ?? 0.35}" aria-label="Transparencia del vidrio"><span>Esmerilado</span></label>
        <span class="hint" style="padding:6px 0 0">Color de acento</span>
        <div class="paleta" id="aAcento">${ACENTOS.map((c, i) => `<button class="sw${(S.ajustes.acento || '') === (i ? c : '') ? ' on' : ''}" data-ac="${i ? c : ''}" style="background:${c}" aria-label="${i ? 'Acento ' + c : 'Naranja original'}"></button>`).join('')}
          <label class="sw rueda${S.ajustes.acento && !ACENTOS.includes(S.ajustes.acento) ? ' on' : ''}" aria-label="Elegir otro color"><input type="color" id="aAcentoRueda" value="${esc(S.ajustes.acento || '#FF8D28')}"></label></div>
        <label class="toggle-row"><span>Letra grande<small>Agranda textos y botones</small></span><input type="checkbox" id="aGrande" class="switch" ${S.ajustes.letraGrande ? 'checked' : ''}></label></div>
      <div class="card" style="background:var(--surface-2)"><h2>Actualizar precios cada</h2>
        <div class="seg" id="aInt">${[15, 30, 60].map((s) => `<button data-val="${s}" class="${S.ajustes.intervalo === s ? 'on' : ''}">${s} s</button>`).join('')}</div>
        <p class="muted" style="font-size:13px">Sólo mientras la app está abierta. Las cripto se mueven 24/7; acciones y bonos argentinos, en horario de mercado (11 a 17 h).</p></div>
      <div class="card" style="background:var(--surface-2)"><h2>Personas</h2>
        ${S.personas.map((p, i) => `<div class="persona-row"><label class="field" style="flex:1"><span>Nombre</span><input data-pn="${i}" value="${esc(p.nombre)}" maxlength="24"></label>
          <div class="field"><span>Color</span><div class="paleta">${COLORES_PERSONA.map((c) => `<button class="sw${p.color.toLowerCase() === c.toLowerCase() ? ' on' : ''}" data-pc="${i}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
            <label class="sw rueda" aria-label="Elegir otro color"><input type="color" data-pcw="${i}" value="${esc(p.color)}"></label></div></div></div>`).join('')}
        <p class="muted" style="font-size:13px">El color de cada uno se usa en su panel de arriba, en las etiquetas y en «Entre los dos». La rueda abre todos los colores del teléfono.</p>
        <button class="btn sec" id="aPersonas">Guardar</button></div>
      <div class="card" style="background:var(--surface-2)"><h2>Lectura de capturas (Gemini)</h2>
        <p class="muted" style="font-size:13px">Pegá una clave gratuita de Google AI Studio (<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent-ink)">aistudio.google.com/apikey</a>). Queda guardada sólo en este teléfono y no se incluye en las copias. Plan gratis: unas 20 lecturas por día.</p>
        <label class="field"><span>Clave</span><input id="aKey" type="password" autocomplete="off" placeholder="${gemini.get() ? '•••••••• (guardada)' : 'AIza…'}"></label>
        <div class="btns"><button class="btn sec" id="aKeyOk">Guardar y probar</button>${gemini.get() ? '<button class="btn gray" id="aKeyTest">Probar clave</button><button class="btn danger" id="aKeyDel">Quitar</button>' : ''}</div>
        <p class="muted" id="aKeyRes" style="font-size:13px" hidden></p></div>
      <div class="card" style="background:var(--surface-2)"><h2>Carteras</h2>
        <div class="group" style="box-shadow:none;background:transparent">${S.carteras.map((c) => `<div class="item" style="padding:6px 0"><span class="tx"><b>${esc(c.nombre)}</b><span>${S.movs.filter((m) => m.cartera === c.id).length} movimientos</span></span><select class="mini-sel" data-duena="${esc(c.id)}" aria-label="Dueño de ${esc(c.nombre)}"><option value="">Compartida</option>${S.personas.map((p) => `<option value="${esc(p.id)}" ${c.duena === p.id ? 'selected' : ''}>De ${esc(p.nombre)}</option>`).join('')}</select><button class="link" data-ren="${esc(c.id)}">Renombrar</button>${S.carteras.length > 1 ? `<button class="link" style="color:var(--loss)" data-del="${esc(c.id)}">Borrar</button>` : ''}</div>`).join('')}</div></div>
      ${htmlNubeAjustes()}
      <div class="card" style="background:var(--surface-2)"><h2>PIN de ingreso</h2>
        ${Seg.activo() ? `<p class="muted" style="font-size:13px">Activo. Tus datos en este teléfono están cifrados con tu PIN (AES-256). Tras 5 intentos fallidos la app hace esperar, cada vez más.</p>
          <span class="hint" style="padding:0">Bloquear al salir de la app</span>
          <div class="seg" id="aBloq">${[[0, 'Al instante'], [60, '1 min'], [300, '5 min']].map((x) => `<button data-val="${x[0]}" class="${(S.ajustes.bloqueo ?? 60) === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>
          <label class="toggle-row"><span>Desbloquear con Face ID<small id="aBioTxt">${Seg.bioActivo() ? 'Activo en este teléfono. Si falla, usás el PIN.' : 'Abrí la app mirando el teléfono. El PIN queda de respaldo.'}</small></span><input type="checkbox" id="aBio" class="switch" ${Seg.bioActivo() ? 'checked' : ''}></label>
          <div class="btns"><button class="btn sec" id="aPinCambiar">Cambiar PIN</button><button class="btn danger" id="aPinQuitar">Quitar PIN</button></div>`
        : `<p class="muted" style="font-size:13px">Pedí un PIN cada vez que abras la app. Además, los datos guardados en el teléfono quedan cifrados con ese PIN.</p><button class="btn sec" id="aPinOn">Activar PIN</button>`}
        <p class="muted" style="font-size:13px">Si olvidás el PIN no hay forma de recuperar los datos: bajá cada tanto una copia cifrada.</p></div>
      <div class="card" style="background:var(--surface-2)"><h2>Tus datos</h2>
        <p class="muted" style="font-size:13px">Todo se guarda sólo en este dispositivo. La copia se baja cifrada con una contraseña que elegís (mismo cifrado que Mis Finanzas).</p>
        <div class="btns"><button class="btn sec" id="aExp">Bajar copia cifrada</button><button class="btn gray" id="aImp">Importar archivo</button></div>
        ${S.movs.some((m) => m.demo) ? '<button class="btn gray" id="aDemo">Borrar datos de ejemplo</button>' : ''}
        <button class="btn danger" id="aBorrar">Borrar todo</button></div>
      <p class="foot">Mis Inversiones ${VERSION} · Precios: data912, Binance, dolarapi y ArgentinaDatos. Sólo organiza tus datos; no es asesoramiento financiero.</p>`, (body) => {
      body.querySelectorAll('#aTema button').forEach((b) => { b.onclick = () => { S.ajustes.tema = b.dataset.val; guardar(); aplicarTema(); body.querySelectorAll('#aTema button').forEach((x) => x.classList.toggle('on', x === b)); }; });
      body.querySelectorAll('#aInt button').forEach((b) => { b.onclick = () => { S.ajustes.intervalo = +b.dataset.val; guardar(); programar(); body.querySelectorAll('#aInt button').forEach((x) => x.classList.toggle('on', x === b)); }; });
      const vid = body.querySelector('#aVidrio');
      vid.oninput = () => { S.ajustes.vidrio = +vid.value; aplicarTema(); };
      vid.onchange = () => guardar();
      const ponerAcento = (c) => {
        S.ajustes.acento = c; aplicarTema(); guardar();
        body.querySelectorAll('#aAcento [data-ac]').forEach((b) => b.classList.toggle('on', b.dataset.ac === c));
        body.querySelector('#aAcentoRueda').parentElement.classList.toggle('on', !!c && !ACENTOS.includes(c));
      };
      body.querySelectorAll('#aAcento [data-ac]').forEach((b) => { b.onclick = () => ponerAcento(b.dataset.ac); });
      body.querySelector('#aAcentoRueda').oninput = (e) => ponerAcento(e.target.value);
      body.querySelector('#aGrande').onchange = (e) => { S.ajustes.letraGrande = e.target.checked; aplicarTema(); guardar(); };
      const colores = S.personas.map((p) => p.color);
      const marcar = (i) => {
        let en = false;
        body.querySelectorAll(`[data-pc="${i}"]`).forEach((b) => { const si = b.dataset.c.toLowerCase() === colores[i].toLowerCase(); en = en || si; b.classList.toggle('on', si); });
        const ru = body.querySelector(`[data-pcw="${i}"]`).parentElement; ru.classList.toggle('on', !en); ru.style.boxShadow = en ? '' : `inset 0 0 0 7px ${colores[i]}`;
      };
      S.personas.forEach((p, i) => marcar(i));
      body.querySelectorAll('[data-pc]').forEach((b) => { b.onclick = () => { const i = +b.dataset.pc; colores[i] = b.dataset.c; body.querySelector(`[data-pcw="${i}"]`).value = b.dataset.c; marcar(i); }; });
      body.querySelectorAll('[data-pcw]').forEach((inp) => { inp.oninput = () => { const i = +inp.dataset.pcw; colores[i] = inp.value; marcar(i); }; });
      body.querySelector('#aPersonas').onclick = () => {
        for (let i = 0; i < S.personas.length; i++) if (!body.querySelector(`[data-pn="${i}"]`).value.trim()) return toast('Completá los nombres');
        S.personas.forEach((p, i) => { p.nombre = body.querySelector(`[data-pn="${i}"]`).value.trim(); p.color = colores[i]; });
        guardar(); ['v-activos', 'v-resumen'].forEach((id) => { $(id).innerHTML = ''; }); render(); toast('Personas guardadas');
      };
      body.querySelectorAll('[data-duena]').forEach((sel) => { sel.onchange = () => { const c = S.carteras.find((x) => x.id === sel.dataset.duena); if (sel.value) c.duena = sel.value; else delete c.duena; guardar(); render(); toast(c.nombre + ': ' + (sel.value ? 'de ' + nombreDe(sel.value) : 'compartida')); }; });
      const resKey = body.querySelector('#aKeyRes');
      const probar = async (k, btn) => {
        btn.disabled = true; const t = btn.textContent; btn.textContent = 'Probando…';
        resKey.hidden = false; resKey.style.color = ''; resKey.textContent = 'Consultando a Gemini…';
        const r = await probarGemini(k);
        btn.disabled = false; btn.textContent = t;
        resKey.textContent = (r.ok ? '✓ ' : '✗ ') + r.txt; resKey.style.color = r.ok ? 'var(--gain)' : 'var(--loss)';
        return r;
      };
      body.querySelector('#aKeyOk').onclick = async (e) => {
        const k = body.querySelector('#aKey').value.trim(); if (!k) return toast('Pegá la clave');
        if (!/^[A-Za-z0-9_-]{20,}$/.test(k)) return toast('Eso no parece una clave: copiala entera, sin espacios');
        const r = await probar(k, e.target);
        if (r.ok) { gemini.set(k); body.querySelector('#aKey').value = ''; body.querySelector('#aKey').placeholder = '•••••••• (guardada)'; toast('Clave guardada'); }
      };
      const kt = body.querySelector('#aKeyTest'); if (kt) kt.onclick = (e) => probar(gemini.get(), e.target);
      const kd = body.querySelector('#aKeyDel'); if (kd) kd.onclick = () => { gemini.set(''); abrirAjustes(); toast('Clave quitada'); };
      body.querySelectorAll('[data-ren]').forEach((b) => { b.onclick = () => { const c = S.carteras.find((x) => x.id === b.dataset.ren); const n = (prompt('Nuevo nombre', c.nombre) || '').trim(); if (!n) return; c.nombre = n.slice(0, 40); guardar(); abrirAjustes(); render(); }; });
      body.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => {
        const id = b.dataset.del, n = S.movs.filter((m) => m.cartera === id).length, destino = S.carteras.find((c) => c.id !== id);
        if (!confirm(`¿Borrar la cartera? ${n ? `Sus ${n} movimientos pasan a «${destino.nombre}».` : ''}`)) return;
        S.movs.forEach((m) => { if (m.cartera === id) m.cartera = destino.id; }); S.carteras = S.carteras.filter((c) => c.id !== id); if (S.ajustes.cartera === id) S.ajustes.cartera = ''; guardar(); abrirAjustes(); render();
      }; });
      montarNubeAjustes(body);
      body.querySelectorAll('#aBloq button').forEach((b) => { b.onclick = () => { S.ajustes.bloqueo = +b.dataset.val; guardar(); body.querySelectorAll('#aBloq button').forEach((x) => x.classList.toggle('on', x === b)); }; });
      const pon = body.querySelector('#aPinOn');
      if (pon) pon.onclick = async () => {
        const pin = await Seg.elegirPin(); if (!pin) return;
        const g = gemini.get(); if (g) S._g = g;
        await Seg.activar(pin, S);
        try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_GEMINI); Object.keys(localStorage).filter((x) => x.startsWith('mis-inversiones:h:')).forEach((x) => localStorage.removeItem(x)); } catch (e) {}
        guardarQ();
        abrirAjustes(); toast('PIN activado. Tus datos quedaron cifrados.');
      };
      const pc = body.querySelector('#aPinCambiar');
      if (pc) pc.onclick = async () => {
        if (!(await Seg.pedirPin({ titulo: 'PIN actual', sub: 'Ingresá el PIN que usás hoy', cancelable: true }))) return;
        const pin = await Seg.elegirPin(); if (!pin) return;
        const habiaBio = Seg.bioActivo();
        await Seg.activar(pin, S); Seg.quitarBio(); abrirAjustes();
        toast(habiaBio ? 'PIN cambiado. Volvé a activar Face ID.' : 'PIN cambiado');
      };
      const bio = body.querySelector('#aBio');
      if (bio) bio.onchange = async () => {
        if (!bio.checked) { Seg.quitarBio(); abrirAjustes(); toast('Face ID desactivado'); return; }
        bio.checked = false;
        if (!(await Seg.bioDisponible())) return toast('Este teléfono no ofrece Face ID a las apps web');
        const r = await Seg.pedirPin({ titulo: 'Confirmá tu PIN', sub: 'Para activar Face ID', cancelable: true, conPin: true });
        if (!r) return;
        window.pausarBloqueo();
        try { await Seg.activarBio(r.pin); abrirAjustes(); toast('Face ID activado. La próxima vez que abras, mirá el teléfono.'); }
        catch (e) {
          Seg.quitarBio();
          toast(e.message === 'sin_prf' ? 'Tu iPhone no permite Face ID en apps web (hace falta iOS 18 o más nuevo).' : e.name === 'NotAllowedError' ? 'Se canceló Face ID.' : 'No se pudo activar Face ID.');
        }
      };
      const pq = body.querySelector('#aPinQuitar');
      if (pq) pq.onclick = async () => {
        if (!(await Seg.pedirPin({ titulo: 'Quitar PIN', sub: 'Ingresá tu PIN para confirmar', cancelable: true }))) return;
        const g = S._g; delete S._g;
        Seg.quitar(); if (g) gemini.set(g); guardarYa();
        abrirAjustes(); toast('PIN quitado. Los datos ya no están cifrados.');
      };
      body.querySelector('#aExp').onclick = exportar;
      body.querySelector('#aImp').onclick = importar;
      const dm = body.querySelector('#aDemo'); if (dm) dm.onclick = () => { ACCIONES.borrarDemo(); abrirAjustes(); };
      body.querySelector('#aBorrar').onclick = () => {
        if (!confirm('¿Borrar todos los movimientos, carteras y ajustes de este dispositivo? No se puede deshacer (salvo que tengas una copia).')) return;
        const tema = S.ajustes.tema, g = S._g; S = VACIO(); S.ajustes.tema = tema; if (g) S._g = g; guardar(); prevNum.clear(); abrirAjustes(); render(); toast('Datos borrados');
      };
    });
  }
  function pedirContrasena(titulo, nueva) {
    return new Promise((resolve) => {
      let listo = false;
      abrirHoja(titulo, `<div class="form">
        <p class="muted">${nueva ? 'Elegí una contraseña para cifrar la copia. Sin ella nadie puede abrir el archivo, ni vos: guardala en el llavero del teléfono.' : 'Ingresá la contraseña con la que creaste esta copia.'}</p>
        <label class="field"><span>Contraseña</span><input id="pw1" type="password" autocomplete="${nueva ? 'new-password' : 'current-password'}" placeholder="mínimo 8 caracteres"></label>
        ${nueva ? '<label class="field"><span>Repetila</span><input id="pw2" type="password" autocomplete="new-password"></label>' : ''}
        <button class="btn wide" id="pwOk">${nueva ? 'Cifrar y bajar' : 'Abrir copia'}</button></div>`, (body, sh) => {
        const ok = () => {
          const p1 = body.querySelector('#pw1').value;
          if (p1.length < 8) return toast('Mínimo 8 caracteres');
          if (nueva && p1 !== body.querySelector('#pw2').value) return toast('Las contraseñas no coinciden');
          listo = true; cerrarHoja(); resolve(p1);
        };
        body.querySelector('#pwOk').onclick = ok;
        body.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); }));
        setTimeout(() => body.querySelector('#pw1').focus(), 350);
        const obs = new MutationObserver(() => { if (!document.body.contains(sh)) { obs.disconnect(); if (!listo) resolve(null); } });
        obs.observe(document.body, { childList: true });
      });
    });
  }
  async function exportar() {
    const pw = await pedirContrasena('Bajar copia cifrada', true); if (!pw) return;
    toast('Cifrando…');
    const sobre = await Seg.sellar(await Seg.claveNueva(pw), paraCopia(), { exportado: new Date().toISOString(), movimientos: S.movs.length });
    const blob = new Blob([JSON.stringify(sobre)], { type: 'application/json' });
    window.pausarBloqueo();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis-inversiones-' + hoyISO() + '.cifrado.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia cifrada lista');
  }
  function importar() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    window.pausarBloqueo();
    inp.onchange = async () => {
      let x;
      try { x = JSON.parse(await inp.files[0].text()); } catch (e) { return toast('Ese archivo no es una copia válida'); }
      if (x && x.data && x.salt && x.iv) {          // copia cifrada
        const pw = await pedirContrasena('Abrir copia', false); if (!pw) return;
        try { x = await Seg.abrir(await Seg.claveDeSobre(pw, x), x); } catch (e) { return toast('Esa contraseña no abre la copia'); }
      }
      if (!x || !Array.isArray(x.movs)) return toast('Ese archivo no es una copia válida');
      if (x.tipo === 'movimientos') return agregarLote(x.movs);
      if (!confirm(`¿Reemplazar lo de este dispositivo por la copia (${x.movs.length} movimientos)?`)) return;
      delete x.app; delete x.exportado; delete x._g;
      const g = S._g;
      S = Object.assign(VACIO(), x, { ajustes: Object.assign(VACIO().ajustes, x.ajustes) }); if (g) S._g = g;
      guardar(); aplicarTema(); prevNum.clear(); cerrarHoja(); await actualizar(); toast('Copia restaurada');
    };
    inp.click();
  }

  // Lote de movimientos armado afuera (por ej. Claude leyendo capturas): agrega los nuevos y
  // actualiza los que ya estaban (mismo id) si cambió algún dato. Nunca borra nada.
  async function agregarLote(lista) {
    const porId = new Map(S.movs.map((m) => [m.id, m]));
    const porLetra = (l) => (S.personas.find((p) => p.letra.toUpperCase() === String(l || '').toUpperCase()) || {}).id;
    const limpio = (m) => {
      const c = Object.assign({}, m); delete c.fx;
      if (c.titular && !persona(c.titular)) c.titular = porLetra(c.titular) || personaDef();
      if (c.reparto) { const r = {}; Object.keys(c.reparto).forEach((k) => { r[persona(k) ? k : porLetra(k) || k] = c.reparto[k]; }); c.reparto = r; }
      if (!c.cartera || !S.carteras.some((k) => k.id === c.cartera)) c.cartera = S.ajustes.cartera || S.carteras[0].id;
      if (c.ticker) c.ticker = limpiarTicker(c.ticker, c.clase);
      return c;
    };
    const firma = (m) => JSON.stringify(['tipo', 'fecha', 'clase', 'ticker', 'cantidad', 'precio', 'moneda', 'comision', 'monto', 'pesos', 'titular', 'reparto', 'nota'].map((k) => m[k] ?? null));
    const validos = lista.filter((m) => m && TIPOS[m.tipo]).map(limpio);
    const nuevos = validos.filter((m) => !porId.has(m.id));
    const cambian = validos.filter((m) => porId.has(m.id)).map((m) => { const viejo = porId.get(m.id); const c = Object.assign({}, m, { cartera: viejo.cartera }); return firma(c) === firma(viejo) ? null : Object.assign({}, viejo, c, { fx: viejo.fx }); }).filter(Boolean);
    if (!nuevos.length && !cambian.length) return toast(lista.length ? 'Ya estaba todo cargado, sin cambios' : 'El archivo no trae movimientos');
    const cuenta = S.personas.map((p) => `${nuevos.filter((m) => C.parteDe(m, p.id, personaDef()) > 0).length} de ${p.nombre}`).join(', ');
    const partes = [];
    if (nuevos.length) partes.push(`agregar ${nuevos.length} movimientos (${cuenta})`);
    if (cambian.length) partes.push(`actualizar ${cambian.length} que ya estaban`);
    if (!confirm(`¿${partes.join(' y ').replace(/^./, (x) => x.toUpperCase())}?`)) return;
    cerrarHoja(); toast('Guardando y buscando el dólar de cada fecha…');
    await guardarMovs(cambian.concat(nuevos));
    toast([nuevos.length ? nuevos.length + ' agregados' : '', cambian.length ? cambian.length + ' actualizados' : ''].filter(Boolean).join(' · '));
  }

  /* ================= Copia cifrada en Google Drive (mismo esquema que Mis Finanzas) ================= */
  // Cada persona entra con su cuenta de Google. Permiso mínimo (drive.appdata): la app sólo ve su carpeta oculta,
  // no el resto del Drive. Lo que sube va cifrado (AES-GCM 256) con la «contraseña de copias». El intermediario
  // (Apps Script de Mis Finanzas) sólo canjea el inicio de sesión: nunca recibe los datos.
  const GOOGLE_CLIENT_ID = '872037994128-cjgsu37c3mh7cdlsk9ic9l9f03f75agf.apps.googleusercontent.com';
  const BROKER_URL = 'https://script.google.com/macros/s/AKfycbzqMyt30WtQnaUyPxk6SOzmhvmL7Dzp_A6Y1QLTYwAUdyH89j1SoiD54lMbqLWtX_Sv/exec';
  const REDIRECT_URI = 'https://felipemanrique.github.io/mis-finanzas/oauth.html';   // registrada en Google Cloud y en el intermediario
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const NUBE_KEY = 'mis-inversiones:drive';
  const ARCH = 'mis-inversiones.enc.json', DIARIA = 'mis-inversiones-', DIAS_GUARDA = 60;
  const DAPI = 'https://www.googleapis.com/drive/v3/files', DUP = 'https://www.googleapis.com/upload/drive/v3/files';
  let nube = (() => { try { return JSON.parse(localStorage.getItem(NUBE_KEY)) || {}; } catch (e) { return {}; } })();
  let acceso = null, tSync = null, tReint = null, tClaim = null, subiendo = false, otraVez = false, reclamando = false, claveCopias = null;
  function guardarNube() { try { localStorage.setItem(NUBE_KEY, JSON.stringify(nube)); } catch (e) {} pintarNube(); }
  const nubeOn = () => !!nube.refreshToken;
  const idAzar = () => btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // clave de las copias: en IndexedDB, como CryptoKey no exportable
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('mis-inversiones', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbDo(modo, fn) { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction('keys', modo); const q = fn(tx.objectStore('keys')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); }
  async function getClave() { if (claveCopias) return claveCopias; try { claveCopias = (await idbDo('readonly', (s) => s.get('copias'))) || null; } catch (e) { claveCopias = null; } return claveCopias; }
  async function setClave(k) { claveCopias = k; try { await idbDo('readwrite', (s) => (k ? s.put(k, 'copias') : s.delete('copias'))); } catch (e) {} }

  async function broker(action, extra) {
    const r = await fetch(BROKER_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action }, extra || {})) });
    try { return JSON.parse(await r.text()); } catch (e) { throw new Error('broker'); }
  }
  async function token() {
    if (acceso && acceso.exp - Date.now() > 60000) return acceso.token;
    const r = await broker('refresh', { refresh_token: nube.refreshToken });
    if (!r.ok) { if (r.error === 'invalid_grant') { nube.error = 'reauth'; guardarNube(); throw new Error('reauth'); } throw new Error('broker'); }
    acceso = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
    return acceso.token;
  }
  async function g(method, url, body, headers, otra) {
    const t = await token();
    const r = await fetch(url, { method, headers: Object.assign({ Authorization: 'Bearer ' + t }, headers || {}), body });
    if (r.status === 401 && !otra) { acceso = null; return g(method, url, body, headers, true); }
    if (!r.ok) { const e = new Error('drive_' + r.status); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    const txt = await r.text(); try { return JSON.parse(txt); } catch (e) { return txt; }
  }
  const listar = async (q) => ((await g('GET', `${DAPI}?spaces=appDataFolder&pageSize=1000&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(q || 'trashed=false')}`)) || {}).files || [];
  const buscar = async (nombre) => (await listar(`name='${nombre}' and trashed=false`))[0] || null;
  function crear(nombre, contenido) {
    const b = 'mi' + Math.random().toString(36).slice(2);
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: nombre, parents: ['appDataFolder'] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${contenido}\r\n--${b}--`;
    return g('POST', `${DUP}?uploadType=multipart&fields=id`, body, { 'Content-Type': 'multipart/related; boundary=' + b });
  }
  const actualizarArch = (id, contenido) => g('PATCH', `${DUP}/${id}?uploadType=media&fields=id`, contenido, { 'Content-Type': 'application/json' });
  const leerArch = (id) => g('GET', `${DAPI}/${id}?alt=media`);
  const borrarArch = (id) => g('DELETE', `${DAPI}/${id}`);
  async function escribirPrincipal(c) {
    if (nube.fileId) { try { await actualizarArch(nube.fileId, c); return; } catch (e) { if (e.status !== 404) throw e; nube.fileId = null; } }
    const f = await buscar(ARCH);
    if (f) { nube.fileId = f.id; await actualizarArch(f.id, c); } else nube.fileId = (await crear(ARCH, c)).id;
  }
  async function leerPrincipal() {
    const f = nube.fileId ? { id: nube.fileId } : await buscar(ARCH);
    if (!f) return null;
    try { const env = await leerArch(f.id); nube.fileId = f.id; return env; } catch (e) { if (e.status === 404 && nube.fileId) { nube.fileId = null; return leerPrincipal(); } throw e; }
  }
  async function escribirDiaria(c) {
    const dia = hoyISO(); if (nube.ultimaDiaria === dia) return;
    const nombre = DIARIA + dia + '.enc.json', f = await buscar(nombre);
    if (f) await actualizarArch(f.id, c); else await crear(nombre, c);
    nube.ultimaDiaria = dia;
    const limite = new Date(Date.now() - DIAS_GUARDA * 864e5).toISOString().slice(0, 10);
    const viejas = (await listar(`name contains '${DIARIA}2' and trashed=false`)).filter((x) => (x.name.match(/\d{4}-\d{2}-\d{2}/) || [''])[0] < limite);
    for (const x of viejas) { try { await borrarArch(x.id); } catch (e) {} }
  }

  // Subir: 2,5 s después de cada cambio tuyo; las fotos diarias del valor, como mucho cada 30 min.
  function programarSubida(menor) {
    if (!nubeOn()) return;
    if (menor && tSync) return;
    if (!nube.pending) { nube.pending = true; guardarNube(); }
    clearTimeout(tSync); tSync = setTimeout(() => { tSync = null; subir(); }, menor ? 30 * 60000 : 2500);
  }
  async function subir(forzar) {
    if (!nubeOn() || (!nube.pending && !forzar)) return;
    if (!navigator.onLine) { nube.error = 'offline'; guardarNube(); return; }
    if (subiendo) { otraVez = true; return; }
    const k = await getClave();
    if (!k) { nube.error = 'nokey'; nube.pending = true; guardarNube(); return; }
    if (!S.movs.length && nube.cuantos > 0 && !forzar) { nube.error = 'vacia'; guardarNube(); return; }   // no pisar una copia con datos usando una app vacía
    subiendo = true; clearTimeout(tReint); nube.pending = false; pintarNube();
    try {
      const env = await Seg.sellar(k, Object.assign({ version: 1 }, paraCopia()), { savedAt: new Date().toISOString() });
      const c = JSON.stringify(env);
      await escribirPrincipal(c); await escribirDiaria(c);
      nube.lastAt = env.savedAt; nube.cuantos = S.movs.length; nube.error = null;
    } catch (e) { nube.pending = true; nube.error = e.message === 'reauth' ? 'reauth' : navigator.onLine ? 'server' : 'offline'; }
    subiendo = false; guardarNube();
    if (otraVez) { otraVez = false; programarSubida(); } else if (nube.pending && nube.error === 'server') tReint = setTimeout(() => subir(), 60000);
  }
  function relTiempo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    return s < 60 ? 'recién' : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : fechaCorta(iso.slice(0, 10));
  }
  function estadoNube() {
    if (!nubeOn()) return { nivel: 'off', txt: 'Sin copia en Drive' };
    if (subiendo) return { nivel: 'busy', txt: 'Subiendo copia cifrada…' };
    const e = nube.error;
    if (e === 'reauth') return { nivel: 'error', txt: 'Google cerró el acceso. Volvé a conectar tu cuenta.' };
    if (e === 'nokey') return { nivel: 'error', txt: 'Falta tu contraseña de copias en este teléfono.' };
    if (e === 'vacia') return { nivel: 'error', txt: 'La app está vacía y tu Drive tiene datos: no subí nada. Restaurá desde Drive.' };
    if (nube.pending && e === 'offline') return { nivel: 'pending', txt: 'Sin conexión. Se sube sola cuando vuelva internet.' };
    if (nube.pending && e === 'server') return { nivel: 'pending', txt: 'No se pudo subir. Reintento en un minuto.' };
    if (nube.pending) return { nivel: 'pending', txt: 'Hay cambios por subir.' };
    if (nube.lastAt) return { nivel: 'ok', txt: 'Copia cifrada al día · ' + relTiempo(nube.lastAt) };
    return { nivel: 'ok', txt: 'Conectado. La copia se sube con el próximo cambio.' };
  }
  function pintarNube() { const el = document.getElementById('nubeEstado'); if (el) { const st = estadoNube(); el.textContent = st.txt; el.dataset.nivel = st.nivel; } }

  // Conectar: un enlace real (en iPhone es la única forma de abrir Google desde la app instalada)
  function urlGoogle(sesion) {
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', state: sesion });
  }
  const botonGoogle = (id, txt) => `<a class="btn wide" id="${id}" href="#" role="button" style="text-decoration:none">${I.nube}${esc(txt || 'Continuar con Google')}</a>`;
  function activarBotonGoogle(el) {
    if (!el) return;
    el.onclick = () => {
      nube.pendingSession = idAzar(); nube.sessionAt = Date.now(); guardarNube();
      el.href = urlGoogle(nube.pendingSession); el.target = '_blank'; el.rel = 'noopener';
      window.pausarBloqueo();
      setTimeout(hojaEsperando, 400);
      empezarReclamo();
    };
  }
  function hojaEsperando() {
    abrirHoja('Conectando con Google', `<div style="display:grid;justify-items:center;gap:14px;padding:12px 0;text-align:center"><div class="spinner" style="width:34px;height:34px"></div>
      <p class="muted">Elegí tu cuenta y tocá «Continuar» en la pantalla de Google (puede decir «Mis Finanzas»: es la misma conexión). Cuando diga «Listo», volvé a esta app.</p>
      <a class="link" href="${esc(urlGoogle(nube.pendingSession))}" target="_blank" rel="noopener">Abrir Google de nuevo</a></div>`, null, () => { if (!nubeOn()) { pararReclamo(); } });
  }
  function pararReclamo() { clearInterval(tClaim); tClaim = null; }
  function empezarReclamo() { pararReclamo(); tClaim = setInterval(reclamar, 2500); }
  async function reclamar() {
    if (!nube.pendingSession || reclamando) return;
    if (Date.now() - (nube.sessionAt || 0) > 15 * 60000) { pararReclamo(); delete nube.pendingSession; guardarNube(); return; }
    reclamando = true;
    try {
      const r = await broker('claim', { session: nube.pendingSession });
      if (r.ok) {
        pararReclamo();
        nube = { refreshToken: r.refresh_token };
        acceso = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
        guardarNube(); cerrarHoja(true);
        await despuesDeGoogle();
      }
    } catch (e) { /* sigue esperando */ }
    reclamando = false;
  }
  async function despuesDeGoogle() {
    try { const a = await g('GET', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)'); nube.email = a && a.user && a.user.emailAddress; guardarNube(); } catch (e) {}
    let env = null;
    try { env = await leerPrincipal(); } catch (e) { return toast('No pude leer tu Drive. Probá de nuevo desde Ajustes.'); }
    pedirContrasenaCopias(env);
  }
  // Primera vez: elegir contraseña. Si ya hay copia: la contraseña con la que se creó.
  function pedirContrasenaCopias(env, mal) {
    const primera = !env;
    abrirHoja(primera ? 'Último paso' : 'Tu contraseña de copias', `<div class="form">
      ${mal ? '<div class="banner"><span class="sp">Esa contraseña no abre tus copias. Probá de nuevo.</span></div>' : ''}
      ${nube.email ? `<p class="muted">Conectado como <b>${esc(nube.email)}</b></p>` : ''}
      <p class="muted">${primera ? 'Elegí una contraseña para cifrar tus copias en Drive. Te la vamos a pedir sólo si cambiás de teléfono. Puede ser la misma que usás en Mis Finanzas.'
        : `Tu Drive ya tiene una copia${env.savedAt ? ' (la última del ' + esc(fechaCorta(env.savedAt.slice(0, 10))) + ')' : ''}. Ingresá la contraseña con la que la creaste.`}</p>
      <label class="field"><span>Contraseña</span><input id="cp1" type="password" autocomplete="${primera ? 'new-password' : 'current-password'}" placeholder="mínimo 8 caracteres"></label>
      ${primera ? `<label class="field"><span>Repetila</span><input id="cp2" type="password" autocomplete="new-password"></label>
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:15px"><input type="checkbox" id="cpOk" style="width:22px;height:22px;flex:none;margin-top:1px">Entiendo que si la olvido, las copias no se pueden recuperar.</label>` : '<button class="link" id="cpReset" style="justify-self:start;color:var(--loss)">La olvidé: empezar de cero</button>'}
      <button class="btn wide" id="cpGo">${primera ? 'Listo' : 'Abrir copia'}</button></div>`, (body) => {
      setTimeout(() => body.querySelector('#cp1').focus(), 400);
      const rs = body.querySelector('#cpReset'); if (rs) rs.onclick = empezarDeCero;
      body.querySelector('#cpGo').onclick = async (e) => {
        const p1 = body.querySelector('#cp1').value;
        if (p1.length < 8) return toast('La contraseña tiene que tener al menos 8 caracteres');
        if (primera) {
          if (p1 !== body.querySelector('#cp2').value) return toast('Las contraseñas no coinciden');
          if (!body.querySelector('#cpOk').checked) return toast('Confirmá que entendés que no se puede recuperar');
          e.target.disabled = true;
          await setClave(await Seg.claveNueva(p1)); nube.error = null; guardarNube();
          cerrarHoja(); if (S.movs.length) programarSubida(); else nube.pending = false;
          toast('Listo: cada cambio se guarda cifrado en tu Drive');
          return;
        }
        e.target.disabled = true; e.target.textContent = 'Abriendo…';
        const k = await Seg.claveDeSobre(p1, env);
        try { const remoto = await Seg.abrir(k, env); await setClave(k); if (nube.error === 'nokey') nube.error = null; guardarNube(); elegirDatos(remoto, env.savedAt); }
        catch (err) { pedirContrasenaCopias(env, true); }
      };
    });
  }
  // Con datos en los dos lados: combinar, usar Drive o usar el teléfono
  function elegirDatos(remoto, savedAt) {
    const rm = Array.isArray(remoto.movs) ? remoto.movs : [];
    const aplicar = (base, movs, msg) => {
      const g0 = S._g, tema = S.ajustes.tema;
      S = Object.assign(VACIO(), base, { movs, ajustes: Object.assign(VACIO().ajustes, base.ajustes, { tema }) }); delete S.app; delete S.version;
      if (g0) S._g = g0;
      nube.cuantos = rm.length; guardarYa(); aplicarTema(); prevNum.clear();
      ['v-activos', 'v-resumen'].forEach((id) => { $(id).innerHTML = ''; });
      cerrarHoja(); render(); actualizar(); toast(msg); programarSubida();
    };
    if (!S.movs.length) return aplicar(remoto, rm, `${rm.length} movimientos recuperados de Drive`);
    const ids = new Set(S.movs.map((m) => m.id)), extra = rm.filter((m) => !ids.has(m.id)).length;
    abrirHoja('Hay datos en los dos lados', `<p class="muted">Este teléfono tiene <b>${S.movs.length}</b> movimientos y tu Drive <b>${rm.length}</b>${savedAt ? ' (copia del ' + esc(fechaCorta(savedAt.slice(0, 10))) + ')' : ''}.</p>
      <button class="btn wide" id="edMez">Combinar (quedan ${S.movs.length + extra})</button>
      <button class="btn sec wide" id="edDrive">Usar sólo los de Drive</button>
      <button class="btn gray wide" id="edLocal">Usar sólo los de este teléfono</button>`, (body) => {
      body.querySelector('#edMez').onclick = () => aplicar(S, S.movs.concat(rm.filter((m) => !ids.has(m.id))), 'Datos combinados');
      body.querySelector('#edDrive').onclick = () => aplicar(remoto, rm, 'Datos de Drive restaurados');
      body.querySelector('#edLocal').onclick = () => { nube.cuantos = S.movs.length; cerrarHoja(); subir(true); toast('Se usan los datos de este teléfono'); };
    });
  }
  async function restaurarDeDrive() {
    let env;
    try { env = await leerPrincipal(); } catch (e) { return toast(e.message === 'reauth' ? 'Volvé a conectar tu cuenta de Google.' : 'No pude leer tu Drive. Revisá internet.'); }
    if (!env) return toast('Todavía no hay copias en tu Drive.');
    const k = await getClave(); if (!k) return pedirContrasenaCopias(env);
    try { elegirDatos(await Seg.abrir(k, env), env.savedAt); } catch (e) { pedirContrasenaCopias(env, true); }
  }
  function empezarDeCero() {
    abrirHoja('Empezar de cero', `<div class="form"><p class="muted">Se borran las copias de esta app en tu Drive (sin la contraseña no se pueden abrir) y se crea una nueva con los ${S.movs.length} movimientos de este teléfono. No toca las copias de Mis Finanzas.</p>
      <label class="field"><span>Nueva contraseña</span><input id="np1" type="password" autocomplete="new-password" placeholder="mínimo 8 caracteres"></label>
      <label class="field"><span>Repetila</span><input id="np2" type="password" autocomplete="new-password"></label>
      <button class="btn danger wide" id="npGo">Borrar copias y empezar de cero</button></div>`, (body) => {
      const b = body.querySelector('#npGo');
      b.onclick = async () => {
        const p1 = body.querySelector('#np1').value;
        if (p1.length < 8 || p1 !== body.querySelector('#np2').value) return toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden');
        if (!b.dataset.armado) { b.dataset.armado = 1; b.textContent = 'Tocá de nuevo para borrar las copias'; return; }
        b.disabled = true; b.textContent = 'Borrando…';
        try {
          for (const f of await listar(`name contains '${DIARIA}' and trashed=false`)) await borrarArch(f.id);
          for (const f of await listar(`name='${ARCH}' and trashed=false`)) await borrarArch(f.id);
          nube.fileId = null; nube.ultimaDiaria = null; nube.cuantos = 0;
          await setClave(await Seg.claveNueva(p1)); nube.error = null; guardarNube();
          await subir(true); cerrarHoja(); toast('Copias nuevas creadas');
        } catch (e) { b.disabled = false; b.textContent = 'Borrar copias y empezar de cero'; toast('No pude borrar las copias. Revisá internet.'); }
      };
    });
  }
  function cambiarContrasenaCopias() {
    abrirHoja('Cambiar contraseña de copias', `<div class="form"><p class="muted">Las copias se vuelven a cifrar con la contraseña nueva. Las diarias anteriores se borran, porque usan la vieja.</p>
      <label class="field"><span>Nueva contraseña</span><input id="np1" type="password" autocomplete="new-password" placeholder="mínimo 8 caracteres"></label>
      <label class="field"><span>Repetila</span><input id="np2" type="password" autocomplete="new-password"></label>
      <button class="btn wide" id="npGo">Guardar</button></div>`, (body) => {
      body.querySelector('#npGo').onclick = async (e) => {
        const p1 = body.querySelector('#np1').value;
        if (p1.length < 8 || p1 !== body.querySelector('#np2').value) return toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden');
        e.target.disabled = true;
        try {
          for (const f of await listar(`name contains '${DIARIA}2' and trashed=false`)) await borrarArch(f.id);
          nube.ultimaDiaria = null; await setClave(await Seg.claveNueva(p1)); await subir(true);
          cerrarHoja(); toast('Contraseña cambiada');
        } catch (err) { e.target.disabled = false; toast('No pude cambiarla. Revisá internet.'); }
      };
    });
  }
  async function desconectarNube() {
    const rt = nube.refreshToken;
    nube = {}; acceso = null; guardarNube(); await setClave(null);
    if (rt) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(rt), { method: 'POST', mode: 'no-cors' }).catch(() => {});
  }
  function htmlNubeAjustes() {
    if (!nubeOn()) return `<div class="card" style="background:var(--surface-2)"><h2>Copia en Google Drive</h2>
      <p class="muted" style="font-size:13px">Entrá con tu cuenta de Google y cada cambio se guarda solo en tu Drive, cifrado con una contraseña tuya. Si cambiás o perdés el teléfono, recuperás todo. La app sólo ve su propia carpeta oculta, no tus archivos.</p>
      ${botonGoogle('nGo')}</div>`;
    return `<div class="card" style="background:var(--surface-2)"><h2>Copia en Google Drive</h2>
      <p style="margin:0;font-size:15px"><b>${esc(nube.email || 'Cuenta de Google')}</b></p>
      <p class="muted" id="nubeEstado" style="font-size:13px"></p>
      <div class="btns"><button class="btn sec" id="nAhora">Subir ahora</button><button class="btn gray" id="nRest">Restaurar desde Drive</button></div>
      <div class="btns"><button class="btn gray" id="nPass">Cambiar contraseña</button><button class="btn danger" id="nOff">Desconectar</button></div>
      <p class="muted" style="font-size:12px">Una copia siempre al día y una por día (últimos ${DIAS_GUARDA}). Para borrarlas: Drive → Configuración → Administrar apps → Mis Finanzas → Borrar datos ocultos (borra también las de Mis Finanzas).</p></div>`;
  }
  function montarNubeAjustes(body) {
    activarBotonGoogle(body.querySelector('#nGo'));
    pintarNube();
    const on = (id, fn) => { const b = body.querySelector(id); if (b) b.onclick = fn; };
    on('#nAhora', async () => { await subir(true); toast(estadoNube().txt); });
    on('#nRest', restaurarDeDrive);
    on('#nPass', cambiarContrasenaCopias);
    on('#nOff', async () => { if (!confirm('¿Desconectar Google? Las copias quedan en tu Drive; tus datos siguen en este teléfono.')) return; await desconectarNube(); abrirAjustes(); toast('Google desconectado'); });
  }

  /* ---------- datos de ejemplo ---------- */
  async function cargarDemo() {
    toast('Armando ejemplo con precios reales…');
    S.seguir = S.seguir.length ? S.seguir : [{ clase: 'cedear', ticker: 'QQQ' }];
    const tmp = [{ clase: 'cedear', ticker: 'SPY' }, { clase: 'bono', ticker: 'AL30' }, { clase: 'cripto', ticker: 'BTC' }, { clase: 'cedear', ticker: 'MELI' }];
    S.movs = tmp.map((x) => Object.assign({ tipo: 'compra', id: 'tmp' + x.ticker, fecha: hoyISO(), cantidad: 0, precio: 1, cartera: 'principal' }, x));
    await actualizar(true);
    const px = (cl, t) => { const q = cotizar(cl, t); return q ? q.px : null; };
    const d = (dias) => { const x = new Date(Date.now() - dias * 864e5); return x.toISOString().slice(0, 10); };
    const P = S.personas[0].id, N = S.personas[1].id;
    const L = [
      { tipo: 'ingreso', fecha: d(120), monto: 1500000, moneda: 'ARS', titular: P },
      { tipo: 'ingreso', fecha: d(118), monto: 700000, moneda: 'ARS', titular: N },
      { tipo: 'compra', fecha: d(117), clase: 'cedear', ticker: 'SPY', cantidad: 12, precio: Math.round((px('cedear', 'SPY') || 40000) * 0.86), moneda: 'ARS', comision: 2900, reparto: { [P]: 50, [N]: 50 } },
      { tipo: 'compra', fecha: d(90), clase: 'bono', ticker: 'AL30', cantidad: 500, precio: Math.round((px('bono', 'AL30') || 80000) * 1.04), moneda: 'ARS', comision: 1800, titular: P },
      { tipo: 'compra', fecha: d(60), clase: 'cripto', ticker: 'BTC', cantidad: 0.002, precio: Math.round((px('cripto', 'BTC') || 60000) * 0.93 * ((fxHoy().cripto) || 1500)), moneda: 'ARS', comision: 0, titular: N },
      { tipo: 'compra', fecha: d(40), clase: 'cedear', ticker: 'MELI', cantidad: 6, precio: Math.round((px('cedear', 'MELI') || 20000) * 0.97), moneda: 'ARS', comision: 900, titular: P },
      { tipo: 'renta', fecha: d(25), clase: 'bono', ticker: 'AL30', monto: 6200, moneda: 'ARS', titular: P },
      { tipo: 'venta', fecha: d(10), clase: 'cedear', ticker: 'SPY', cantidad: 2, precio: Math.round((px('cedear', 'SPY') || 40000) * 0.97), moneda: 'ARS', comision: 600, reparto: { [P]: 50, [N]: 50 } },
    ].map((m) => Object.assign(m, { cartera: 'principal', demo: true, nota: 'Ejemplo' }));
    S.movs = [];
    await guardarMovs(L);
    toast('Listo: así se ve con datos. Borralos desde el aviso cuando quieras.');
  }

  const ACCIONES = {
    captura: () => elegirQuien(),
    manual: () => abrirCargar(),
    demo: () => cargarDemo(),
    refrescar: () => actualizar(true),
    borrarDemo: () => { S.movs = S.movs.filter((m) => !m.demo); S.snaps = {}; guardar(); prevNum.clear(); $('v-activos').innerHTML = ''; $('v-resumen').innerHTML = ''; render(); toast('Datos de ejemplo borrados'); },
  };

  /* ================= navegación ================= */
  function irA(v) {
    vista = v;
    VISTAS.forEach((x) => { $('v-' + x).hidden = x !== v; });
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    // la pila vive en Activos y en Resumen: se reconstruye al cambiar
    ['v-activos', 'v-resumen'].forEach((id) => { if (id !== 'v-' + v) $(id).innerHTML = ''; });
    window.scrollTo({ top: 0 });
    render();
  }
  $('tabbar').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b && b.dataset.v !== vista) irA(b.dataset.v); });
  $('fab').onclick = abrirCargar;
  // Ojito: tapa tus montos, cantidades y ganancias (precios y cotizaciones siguen a la vista)
  const OJO_ABIERTO = '<svg class="i" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OJO_CERRADO = '<svg class="i" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function aplicarOjo() {
    let o = false; try { o = localStorage.getItem('mis-inversiones:ocultar') === '1'; } catch (e) {}
    document.body.classList.toggle('oculto', o);
    $('btnOjo').innerHTML = o ? OJO_CERRADO : OJO_ABIERTO;
    $('btnOjo').setAttribute('aria-pressed', String(o));
    $('btnOjo').setAttribute('aria-label', o ? 'Mostrar montos' : 'Ocultar montos');
  }
  $('btnOjo').onclick = () => {
    const o = !document.body.classList.contains('oculto');
    try { localStorage.setItem('mis-inversiones:ocultar', o ? '1' : '0'); } catch (e) {}
    aplicarOjo(); toast(o ? 'Montos ocultos' : 'Montos visibles');
  };
  aplicarOjo();
  $('btnAjustes').onclick = () => (vista === 'ajustes' ? irA(vistaPrev || 'activos') : abrirAjustes());
  $('fxbar').onclick = () => { if (vista !== 'seguir') irA('seguir'); };
  $('btnCartera').onclick = abrirCarteras;
  $('fileIn').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; cerrarHoja(true); procesarCapturas(fs); });

  /* ================= ciclo de actualización ================= */
  let tPoll;
  function programar() {
    clearTimeout(tPoll);
    tPoll = setTimeout(async () => { if (listo && !document.hidden && !hojaActual) await actualizar(); programar(); }, (S.ajustes.intervalo || 30) * 1000);
  }
  let listo = false, ocultaDesde = 0;
  // Elegir fotos/archivos o bajar una copia esconde la página un momento: eso no tiene que bloquear la app.
  let eligiendo = false;
  window.pausarBloqueo = () => { eligiendo = true; };
  document.addEventListener('visibilitychange', () => {
    if (!listo) return;
    if (eligiendo) { if (!document.hidden) setTimeout(() => { eligiendo = false; }, 1500); return; }
    if (document.hidden) {
      ocultaDesde = Date.now(); if (tGuardar) guardarYa();
      if (nubeOn() && nube.pending && tSync) { clearTimeout(tSync); tSync = null; subir(); }
      if (Seg.activo()) document.body.classList.add('privado');   // tapa el contenido en el selector de apps
      return;
    }
    if (Seg.activo() && Date.now() - ocultaDesde >= (S.ajustes.bloqueo ?? 60) * 1000) { location.reload(); return; }
    document.body.classList.remove('privado'); actualizar(); programar();
    if (nube.pendingSession) reclamar();
    if (nubeOn() && (nube.pending || nube.error === 'server')) subir();
  });
  window.addEventListener('online', () => { if (nubeOn() && nube.pending) subir(); });
  window.addEventListener('pagehide', () => { if (tGuardar) guardarYa(); });
  setInterval(pintarVivo, 1000);

  /* ================= arranque ================= */
  (async function iniciar() {
    try { const t = localStorage.getItem(KEY_TEMA); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    pintarBarraEstado();   // antes del PIN, para que la pantalla de bloqueo ya tenga la barra del color correcto
    if (Seg.activo()) cargar(await Seg.pedirPin()); else cargar();
    aplicarTema(); listo = true;
    render();
    actualizar(); programar();
    if (nube.pendingSession) { empezarReclamo(); reclamar(); }
    if (nubeOn() && nube.pending) subir();
  })();
  window.App = { estado: () => S, calc: () => ultimoCalc, actualizar, normalizar, revisar, agregarLote };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
