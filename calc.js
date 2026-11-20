/* Mis Inversiones — Copyright (c) 2026 Felipe Manrique. Todos los derechos reservados. */
/* Cálculo puro de la cartera (sin DOM): se prueba con `node test/calc.test.js`.
   Idea central: lo que ingresás es CAPITAL, no ganancia. Ganancia = valor actual − capital neto ingresado.
   Cada flujo se pasa a pesos con el dólar de SU fecha y se guarda en tres medidas:
   ars (pesos nominales), of (dólares al oficial de ese día) y ccl (dólares al contado con liqui de ese día). */
(function (root) {
  'use strict';

  const CLASES = {
    cedear: { nombre: 'CEDEAR', corto: 'CEDEAR' },
    accion: { nombre: 'Acción argentina', corto: 'Acción' },
    bono: { nombre: 'Bono', corto: 'Bono' },
    on: { nombre: 'Obligación negociable', corto: 'ON' },
    letra: { nombre: 'Letra', corto: 'Letra' },
    cripto: { nombre: 'Cripto', corto: 'Cripto' },
    usa: { nombre: 'Acción del exterior', corto: 'Exterior' },
    fci: { nombre: 'Fondo común (FCI)', corto: 'FCI' },
    otro: { nombre: 'Otro', corto: 'Otro' },
  };
  const POR100 = { bono: true, on: true, letra: true };   // cotizan cada 100 nominales
  const ESTABLES = { USDT: 1, USDC: 1, DAI: 1, FDUSD: 1, USDP: 1, TUSD: 1 };

  const factor = (clase) => (POR100[clase] ? 100 : 1);
  const clave = (clase, ticker) => clase + ':' + String(ticker || '').trim().toUpperCase();

  // Qué dólar convierte un monto en USD a pesos: SIEMPRE el oficial (pedido de Felipe, 2026-11-19),
  // el del día del movimiento para ingresos/compras/ventas y el de hoy para valuar. Así un dólar que
  // entra y queda quieto vale lo mismo en dólares oficiales (no aparece ganancia ni pérdida por mezclar
  // MEP, cripto o CCL). El CCL queda sólo como segunda lectura (más tenue) en pantalla.
  function dolarDe() { return 'oficial'; }
  function tasa(fx, k) { fx = fx || {}; return fx[k] || fx.ccl || fx.mep || fx.oficial || 1; }
  function aPesos(monto, moneda, fx, k) { return moneda === 'USD' ? monto * tasa(fx, k) : monto; }

  const tri = () => ({ ars: 0, of: 0, ccl: 0 });
  function sumar(o, ars, fx) { o.ars += ars; o.of += ars / tasa(fx, 'oficial'); o.ccl += ars / tasa(fx, 'ccl'); }
  function escalar(o, f) { return { ars: o.ars * f, of: o.of * f, ccl: o.ccl * f }; }
  function restar(a, b) { return { ars: a.ars - b.ars, of: a.of - b.of, ccl: a.ccl - b.ccl }; }
  function pct(g, base) {
    return { ars: base.ars > 0 ? g.ars / base.ars : null, of: base.of > 0 ? g.of / base.of : null, ccl: base.ccl > 0 ? g.ccl / base.ccl : null };
  }
  const n = (x) => (typeof x === 'number' && isFinite(x) ? x : parseFloat(x) || 0);

  function ordenar(movs) {
    return movs.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.t || 0) - (b.t || 0)));
  }

  /**
   * @param movs   movimientos {tipo, fecha, cartera, clase, ticker, cantidad, precio, moneda, comision, monto, fx}
   * @param precio (activo) => {px (por unidad o c/100 VN), cur 'ARS'|'USD', pct?} | null
   * @param fxHoy  {oficial, ccl, mep, cripto}
   * @param opts   {cartera}
   */
  // Parte de un movimiento que le corresponde a una persona (0..1).
  // m.titular = id de la persona, o m.reparto = {idPersona: porcentaje} si es compartido.
  function parteDe(m, persona, porDefecto) {
    if (m.reparto && typeof m.reparto === 'object') {
      const tot = Object.values(m.reparto).reduce((s, x) => s + n(x), 0) || 100;
      return n(m.reparto[persona]) / tot;
    }
    return (m.titular || porDefecto) === persona ? 1 : 0;
  }
  // Copia del movimiento con los importes escalados a esa parte (la fecha y el precio no cambian).
  function escalarMov(m, f) {
    if (f === 1) return m;
    const c = Object.assign({}, m);
    ['cantidad', 'monto', 'comision'].forEach((k) => { if (c[k] !== undefined && c[k] !== null && c[k] !== '') c[k] = n(c[k]) * f; });
    return c;
  }

  function calcular(movs, precio, fxHoy, opts) {
    opts = opts || {};
    let base = movs.filter((m) => !opts.cartera || m.cartera === opts.cartera);
    if (opts.persona) base = base.map((m) => [m, parteDe(m, opts.persona, opts.personaDefecto)]).filter((x) => x[1] > 0).map((x) => escalarMov(x[0], x[1]));
    const lista = ordenar(base);
    const cap = tri(), capImplicito = tri(), realizado = tri(), rentas = tri();
    const caja = { ARS: 0, USD: 0 };
    const activos = {};

    // Saca `monto` de la caja en `mon`; si falta, usa la otra moneda y, si tampoco alcanza,
    // lo cuenta como capital ingresado (compras cargadas sin su ingreso de dinero).
    function pagar(monto, mon, fx, k) {
      caja[mon] -= monto;
      if (caja[mon] >= -1e-9) return;
      let falta = -caja[mon]; caja[mon] = 0;
      const otra = mon === 'ARS' ? 'USD' : 'ARS';
      const r = tasa(fx, k);
      const disponible = otra === 'USD' ? caja.USD * r : caja.ARS / r;      // en `mon`
      const usa = Math.min(disponible, falta);
      if (usa > 0) { caja[otra] -= otra === 'USD' ? usa / r : usa * r; falta -= usa; }
      if (falta > 1e-9) { const ars = aPesos(falta, mon, fx, k); sumar(cap, ars, fx); sumar(capImplicito, ars, fx); }
    }

    function activo(m) {
      const k = clave(m.clase, m.ticker);
      return activos[k] || (activos[k] = {
        key: k, clase: m.clase, ticker: String(m.ticker || '').trim().toUpperCase(), qty: 0,
        costo: tri(), costoUSD: 0, realizado: tri(), rentas: tri(), movs: [], carteras: {},
      });
    }

    for (const m of lista) {
      const fx = m.fx || fxHoy;
      const mon = m.moneda === 'USD' ? 'USD' : 'ARS';
      if (m.tipo === 'ingreso' || m.tipo === 'retiro') {
        const s = m.tipo === 'ingreso' ? 1 : -1;
        caja[mon] += s * n(m.monto);
        // Dólares comprados con pesos: el capital es lo que REALMENTE se pagó en pesos (m.pesos), si se conoce.
        const ars = mon === 'USD' && n(m.pesos) > 0 ? n(m.pesos) : aPesos(n(m.monto), mon, fx, 'oficial');
        sumar(cap, s * ars, fx);
        continue;
      }
      if (m.tipo === 'renta') {
        const ars = aPesos(n(m.monto), mon, fx, dolarDe(m.clase, m.ticker));
        caja[mon] += n(m.monto);
        sumar(rentas, ars, fx);
        if (m.ticker) { const a = activo(m); sumar(a.rentas, ars, fx); a.movs.push(m); a.carteras[m.cartera] = 1; }
        continue;
      }
      if (m.tipo !== 'compra' && m.tipo !== 'venta') continue;
      const a = activo(m); a.movs.push(m); a.carteras[m.cartera] = 1;
      const k = dolarDe(a.clase, a.ticker);
      const bruto = n(m.cantidad) * n(m.precio) / factor(a.clase);
      if (m.tipo === 'compra') {
        const total = bruto + n(m.comision);
        pagar(total, mon, fx, k);
        const ars = aPesos(total, mon, fx, k);
        a.qty += n(m.cantidad);
        sumar(a.costo, ars, fx);
        a.costoUSD += mon === 'USD' ? total : ars / tasa(fx, k);
      } else {
        const neto = bruto - n(m.comision);
        caja[mon] += neto;
        const ars = aPesos(neto, mon, fx, k);
        const f = a.qty > 1e-12 ? Math.min(1, n(m.cantidad) / a.qty) : 0;
        const sale = escalar(a.costo, f);
        const entra = tri(); sumar(entra, ars, fx);
        const g = restar(entra, sale);
        ['ars', 'of', 'ccl'].forEach((x) => { a.realizado[x] += g[x]; realizado[x] += g[x]; a.costo[x] -= sale[x]; });
        a.costoUSD *= 1 - f;
        a.qty = Math.max(0, a.qty - n(m.cantidad));
      }
    }

    // Valuación a precios de hoy
    const abiertos = [], cerrados = [], sinPrecio = [];
    const valAct = tri(), costoAb = tri();
    for (const a of Object.values(activos)) {
      if (a.qty <= 1e-10) { a.qty = 0; if (a.movs.some((m) => m.tipo === 'compra' || m.tipo === 'venta')) cerrados.push(a); continue; }
      const q = precio(a);
      a.cotiz = q || null;
      let ars;
      if (q && q.px > 0) {
        ars = a.qty * q.px / factor(a.clase) * (q.cur === 'USD' ? tasa(fxHoy, dolarDe(a.clase, a.ticker)) : 1);
        a.valorUSD = q.cur === 'USD' ? a.qty * q.px / factor(a.clase) : ars / tasa(fxHoy, dolarDe(a.clase, a.ticker));
      } else { ars = a.costo.ars; a.valorUSD = a.costoUSD; sinPrecio.push(a); }   // sin precio: se muestra al costo (ni gana ni pierde)
      a.valor = { ars, of: ars / tasa(fxHoy, 'oficial'), ccl: ars / tasa(fxHoy, 'ccl') };
      a.ganancia = restar(a.valor, a.costo);
      a.rend = pct(a.ganancia, a.costo);
      a.cur = q ? q.cur : (a.clase === 'cripto' || a.clase === 'usa' ? 'USD' : 'ARS');
      a.ppc = a.qty > 0 ? (a.cur === 'USD' ? a.costoUSD : a.costo.ars) / a.qty * factor(a.clase) : 0;
      ['ars', 'of', 'ccl'].forEach((x) => { valAct[x] += a.valor[x]; costoAb[x] += a.costo[x]; });
      abiertos.push(a);
    }
    const cajaARS = caja.ARS + caja.USD * tasa(fxHoy, 'oficial');
    const efectivo = { ars: cajaARS, of: cajaARS / tasa(fxHoy, 'oficial'), ccl: cajaARS / tasa(fxHoy, 'ccl') };
    const valor = { ars: valAct.ars + efectivo.ars, of: valAct.of + efectivo.of, ccl: valAct.ccl + efectivo.ccl };
    abiertos.forEach((a) => { a.peso = valor.ars > 0 ? a.valor.ars / valor.ars : 0; });
    abiertos.sort((x, y) => y.valor.ars - x.valor.ars);
    const ganancia = restar(valor, cap);
    return {
      capital: cap, capitalImplicito: capImplicito, valor, valorActivos: valAct, efectivo, caja,
      ganancia, rend: pct(ganancia, cap),
      noRealizada: restar(valAct, costoAb), realizada: realizado, rentas,
      abiertos, cerrados, sinPrecio, completo: sinPrecio.length === 0, movimientos: lista.length,
    };
  }

  // Agrupa el valor por clase (para la torta); el efectivo va aparte.
  function porClase(r) {
    const g = {};
    r.abiertos.forEach((a) => { g[a.clase] = (g[a.clase] || 0) + a.valor.ars; });
    const out = Object.keys(g).map((k) => ({ id: k, nombre: CLASES[k] ? CLASES[k].nombre : k, valor: g[k] }));
    if (r.efectivo.ars > 0.5) out.push({ id: 'efectivo', nombre: 'Efectivo', valor: r.efectivo.ars });
    return out.sort((a, b) => b.valor - a.valor);
  }

  // Número con punto decimal y espacio angosto entre miles (como pidió Felipe en Mis Finanzas).
  const ESP = ' ';
  function num(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    const s = Math.abs(x).toFixed(dec === undefined ? 2 : dec);
    const p = s.split('.');
    return (x < 0 && Math.abs(x) >= Math.pow(10, -(dec || 0)) / 2 ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ESP) + (p[1] ? '.' + p[1] : '');
  }
  function decimalesPrecio(x) { const a = Math.abs(x); return a >= 1000 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 4 : 8; }
  function cantidad(x) { const s = (+x).toFixed(8).replace(/\.?0+$/, ''); const p = s.split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ESP) + (p[1] ? '.' + p[1] : ''); }
  // Lee números escritos a mano: el punto es siempre decimal; la coma también se acepta como decimal.
  function leerNumero(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').replace(/[\s  $]/g, '').replace(/^US/i, '');
    if (!s) return NaN;
    if (s.includes('.') && s.includes(',')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else s = s.replace(',', '.');
    return parseFloat(s);
  }

  const api = { CLASES, POR100, ESTABLES, factor, clave, dolarDe, tasa, calcular, parteDe, porClase, num, decimalesPrecio, cantidad, leerNumero };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Calc = api;
})(typeof self !== 'undefined' ? self : this);
