// node test/calc.test.js
const C = require('../calc.js');
let fallas = 0;
const ok = (c, msg) => { if (!c) { fallas++; console.log('✗', msg); } else console.log('✓', msg); };
const cerca = (a, b, tol = 0.01) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const fx1 = { oficial: 1000, ccl: 1200, mep: 1150, cripto: 1210 };
const hoy = { oficial: 1500, ccl: 1700, mep: 1650, cripto: 1720 };

// 1) Ingresar plata NO es ganancia
let r = C.calcular([{ tipo: 'ingreso', fecha: '2026-01-01', monto: 1e6, moneda: 'ARS', fx: fx1 }], () => null, hoy);
ok(cerca(r.capital.ars, 1e6) && cerca(r.valor.ars, 1e6) && Math.abs(r.ganancia.ars) < 1e-6, 'ingreso: capital = valor, ganancia 0 en pesos');
ok(cerca(r.capital.of, 1000) && cerca(r.valor.of, 666.67), 'ingreso: en dólares oficiales se ve la pérdida por devaluación');

// 2) Compra y suba del precio
const movs = [
  { tipo: 'ingreso', fecha: '2026-01-01', monto: 1e6, moneda: 'ARS', fx: fx1 },
  { tipo: 'compra', fecha: '2026-01-02', clase: 'cedear', ticker: 'spy', cantidad: 10, precio: 50000, moneda: 'ARS', comision: 1000, fx: fx1 },
];
r = C.calcular(movs, (a) => (a.ticker === 'SPY' ? { px: 60000, cur: 'ARS' } : null), hoy);
const spy = r.abiertos[0];
ok(cerca(spy.costo.ars, 501000) && cerca(spy.valor.ars, 600000), 'compra: costo con comisión y valor actual');
ok(cerca(spy.ganancia.ars, 99000) && cerca(spy.rend.ars, 99000 / 501000), 'compra: ganancia y % en pesos');
ok(cerca(r.efectivo.ars, 499000) && cerca(r.ganancia.ars, 99000), 'total: ganancia = valor − capital (efectivo incluido)');
ok(cerca(spy.ppc, 50100), 'PPC incluye comisión');

// 3) Compra sin ingreso cargado → capital implícito
r = C.calcular([movs[1]], (a) => ({ px: 50100, cur: 'ARS' }), hoy);
ok(cerca(r.capital.ars, 501000) && cerca(r.capitalImplicito.ars, 501000) && Math.abs(r.ganancia.ars) < 1, 'compra sin ingreso: cuenta como capital');

// 4) Venta parcial → ganancia realizada
r = C.calcular(movs.concat([{ tipo: 'venta', fecha: '2026-02-01', clase: 'cedear', ticker: 'SPY', cantidad: 5, precio: 70000, moneda: 'ARS', comision: 0, fx: hoy }]),
  () => ({ px: 70000, cur: 'ARS' }), hoy);
ok(cerca(r.realizada.ars, 350000 - 250500), 'venta: ganancia realizada');
ok(cerca(r.abiertos[0].qty, 5) && cerca(r.abiertos[0].costo.ars, 250500), 'venta: queda la mitad al costo');
ok(cerca(r.ganancia.ars, r.realizada.ars + r.noRealizada.ars), 'total = realizada + no realizada');

// 5) Bono cada 100 VN y cripto en USD con pesos
r = C.calcular([
  { tipo: 'compra', fecha: '2026-01-02', clase: 'bono', ticker: 'AL30', cantidad: 1000, precio: 80000, moneda: 'ARS', fx: fx1 },
  { tipo: 'ingreso', fecha: '2026-01-02', monto: 100, moneda: 'USD', fx: fx1 },
  { tipo: 'compra', fecha: '2026-01-03', clase: 'cripto', ticker: 'BTC', cantidad: 0.001, precio: 90000, moneda: 'USD', fx: fx1 },
], (a) => (a.clase === 'bono' ? { px: 82000, cur: 'ARS' } : { px: 100000, cur: 'USD' }), hoy);
const al = r.abiertos.find((a) => a.ticker === 'AL30'), btc = r.abiertos.find((a) => a.ticker === 'BTC');
ok(cerca(al.costo.ars, 800000) && cerca(al.valor.ars, 820000), 'bono: precio cada 100 nominales');
ok(cerca(btc.valorUSD, 100) && cerca(btc.ppc, 90000) && cerca(btc.valor.ars, 100 * 1500), 'cripto: valor en USD y pesos al dólar oficial de hoy');
ok(cerca(r.caja.USD, 10), 'cripto: sobran 10 USD en caja');
// 5b) Un dólar ingresado que queda quieto no gana ni pierde en dólares oficiales
r = C.calcular([{ tipo: 'ingreso', fecha: '2026-01-02', monto: 100, moneda: 'USD', fx: fx1 }], () => null, hoy);
ok(cerca(r.capital.of, 100) && cerca(r.valor.of, 100) && Math.abs(r.ganancia.of) < 1e-9, 'USD quieto: ni gana ni pierde en dólares oficiales');
// 5c) Ingreso en USD y compra de cripto el mismo día: sin ganancia inventada por mezclar dólares
r = C.calcular([{ tipo: 'ingreso', fecha: '2026-01-02', monto: 100, moneda: 'USD', fx: fx1 }, { tipo: 'compra', fecha: '2026-01-02', clase: 'cripto', ticker: 'BTC', cantidad: 0.001, precio: 100000, moneda: 'USD', fx: fx1 }], () => ({ px: 100000, cur: 'USD' }), hoy);
ok(Math.abs(r.ganancia.of) < 1e-9 && cerca(r.capital.of, 100), 'USD a cripto sin mover precio: ganancia 0');
// 5d) Ingreso en pesos: se pasa a dólares con el oficial DE SU FECHA, no el de hoy
r = C.calcular([{ tipo: 'ingreso', fecha: '2026-06-06', monto: 100000, moneda: 'ARS', fx: { oficial: 1460, ccl: 1500, mep: 1461.4 } }], () => null, hoy);
ok(cerca(r.capital.of, 100000 / 1460, 0.0001), 'ingreso en pesos: dólares al oficial del día del ingreso');

// 6) Formato
ok(C.num(1234567.5, 2) === '1 234 567.50' && C.num(-3, 0) === '−3', 'formato con espacio angosto y punto decimal');
ok(C.leerNumero('1.234,5') === 1234.5 && C.leerNumero('1234.5') === 1234.5 && C.leerNumero('12,5') === 12.5, 'lee números a mano');

// 7) Titulares: lo de cada persona por separado, compartidos repartidos por %
const pm = [
  { tipo: 'ingreso', fecha: '2026-01-01', monto: 600000, moneda: 'ARS', titular: 'yo', fx: fx1 },
  { tipo: 'ingreso', fecha: '2026-01-01', monto: 400000, moneda: 'ARS', titular: 'novia', fx: fx1 },
  { tipo: 'compra', fecha: '2026-01-02', clase: 'cedear', ticker: 'SPY', cantidad: 10, precio: 50000, moneda: 'ARS', reparto: { yo: 60, novia: 40 }, fx: fx1 },
  { tipo: 'compra', fecha: '2026-01-02', clase: 'cripto', ticker: 'ETH', cantidad: 1, precio: 100000, moneda: 'ARS', titular: 'novia', fx: fx1 },
];
const pf = (a) => (a.ticker === 'SPY' ? { px: 60000, cur: 'ARS' } : { px: 100, cur: 'USD' });
const todos = C.calcular(pm, pf, hoy), yo = C.calcular(pm, pf, hoy, { persona: 'yo' }), ella = C.calcular(pm, pf, hoy, { persona: 'novia' });
ok(cerca(yo.capital.ars, 600000) && cerca(ella.capital.ars, 400000), 'titulares: capital de cada uno');
ok(cerca(yo.abiertos[0].qty, 6) && cerca(ella.abiertos.find((a) => a.ticker === 'SPY').qty, 4), 'titulares: compra compartida 60/40');
ok(!yo.abiertos.some((a) => a.ticker === 'ETH'), 'titulares: lo de ella no aparece en lo mío');
ok(cerca(yo.valor.ars + ella.valor.ars, todos.valor.ars) && cerca(yo.ganancia.ars + ella.ganancia.ars, todos.ganancia.ars), 'titulares: las partes suman el total');
ok(C.calcular(pm.slice(0, 1).map((m) => Object.assign({}, m, { titular: undefined })), pf, hoy, { persona: 'yo', personaDefecto: 'yo' }).capital.ars === 600000, 'titulares: sin titular cuenta para la persona por defecto');

// 8) Dólares comprados con pesos: el capital es lo que se pagó en pesos
r = C.calcular([{ tipo: 'ingreso', fecha: '2026-07-27', monto: 25, moneda: 'USD', pesos: 37500, fx: { oficial: 1520, ccl: 1600 } }], () => null, hoy);
ok(cerca(r.capital.ars, 37500) && cerca(r.capital.of, 37500 / 1520) && cerca(r.caja.USD, 25), 'ingreso en USD con pesos pagados: capital = pesos reales');
console.log(fallas ? `\n${fallas} fallas` : '\nTodo bien'); process.exit(fallas ? 1 : 0);
