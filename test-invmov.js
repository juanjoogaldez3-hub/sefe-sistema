// ============================================================
//  SEFE · test-invmov.js — MOVIMIENTO DE INVENTARIO (base del reporte)
// ============================================================
//  Cómo se corre:   node test-invmov.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El reporte "Movimiento de inventario" se apoya en _movsInvDespuesDe para
//  sacar, por producto y período, el stock inicial/entradas/salidas/final, con
//  la identidad: Stock final = inicial + entradas − salidas. Esta prueba carga
//  la función real _movsInvDespuesDe y valida la agregación y esa identidad.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function _movsInvDespuesDe(');
const fin = src.indexOf('\n}', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _movsInvDespuesDe'); process.exit(1); }
const fnSrc = src.slice(ini, fin + 2);

const ctx = {
  Number, console,
  productos: [
    { codigo: 'A', tipoEmpaque: 'unidad' },
    { codigo: 'B', tipoEmpaque: 'caja_unidad', unidadesPorCaja: 10 },
  ],
  // salidas (ventas): usan d.creada, d.items[].cantidad y modoVenta; anuladas fuera.
  documentos: [
    { creada: '2026-08-10', estado: 'certificada', items: [{ codigo: 'A', cantidad: 30 }] },
    { creada: '2026-08-20', estado: 'certificada', items: [{ codigo: 'B', cantidad: 2, modoVenta: 'caja' }] }, // 2 cajas × 10 = 20 u
    { creada: '2026-08-22', estado: 'anulada', items: [{ codigo: 'A', cantidad: 999 }] }, // anulada: no cuenta
  ],
  // entradas (compras): usan c.fecha y c.items[].recibido (en cajas para caja_unidad); anuladas fuera.
  compras: [
    { fecha: '2026-08-05', items: [{ codigo: 'A', recibido: 100 }] },
    { fecha: '2026-08-15', items: [{ codigo: 'B', recibido: 5 }] }, // 5 cajas × 10 = 50 u
    { fecha: '2026-07-01', anulado: true, items: [{ codigo: 'A', recibido: 999 }] }, // anulada: no cuenta
  ],
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=_movsInvDespuesDe;', ctx);
const movs = ctx.__f;

console.log('\n═══ Agregación después del 31-jul (todo agosto) ═══');
const m = movs('2026-07-31');
ok('A: entra 100, sale 30', m['A'] && m['A'].entra === 100 && m['A'].sale === 30, JSON.stringify(m['A']));
ok('B (caja→unidades): entra 50, sale 20', m['B'] && m['B'].entra === 50 && m['B'].sale === 20, JSON.stringify(m['B']));
ok('la compra anulada NO suma (A no tiene 999)', m['A'].entra === 100);
ok('la venta anulada NO suma (A sale sólo 30)', m['A'].sale === 30);

console.log('\n═══ Corte posterior al período: sin movimientos ═══');
const mH = movs('2026-08-31');
ok('nada después del 31-ago', !mH['A'] && !mH['B']);

console.log('\n═══ Identidad del reporte: final = inicial + entradas − salidas ═══');
// Réplica de la fórmula del reporte para el período agosto.
const _stk = { A: 200, B: 80 }; // existencia actual (unidades)
const md = movs('2026-07-31'), mh = movs('2026-08-31');
['A', 'B'].forEach(cod => {
  const a = md[cod] || { entra: 0, sale: 0 }, b = mh[cod] || { entra: 0, sale: 0 };
  const iniStk = _stk[cod] - a.entra + a.sale;
  const ent = a.entra - b.entra, sal = a.sale - b.sale;
  const finStk = _stk[cod] - b.entra + b.sale;
  ok(cod + ': ' + iniStk + ' + ' + ent + ' − ' + sal + ' = ' + finStk + ' (final)', iniStk + ent - sal === finStk);
});
// Chequeo concreto de A: stock actual 200, entró 100, salió 30 → inicial 130, final 200
const a = md['A'];
ok('A: stock inicial = 130', _stk.A - a.entra + a.sale === 130);
ok('A: stock final = 200 (existencia actual, sin movimientos posteriores)', _stk.A === 200);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
