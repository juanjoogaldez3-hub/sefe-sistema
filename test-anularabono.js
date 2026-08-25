// ============================================================
//  SEFE · test-anularabono.js — ANULAR ABONO BORRA EL RASTRO EN BANCOS
// ============================================================
//  Cómo se corre:   node test-anularabono.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Al anular un abono, el sistema ya NO crea una "reversa" en bancos: anula el
//  movimiento de ENTRADA original del cobro. Nunca entró, nunca salió. Si el
//  abono no había entrado a una cuenta, o el monto no coincide con ninguna
//  entrada, no toca nada (no se lleva por delante un cobro real de otro monto).
//  Esta prueba carga la función real _anularEntradaBancoDeAbono.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function _anularEntradaBancoDeAbono(');
const finMarca = 'window._anularEntradaBancoDeAbono=_anularEntradaBancoDeAbono;';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _anularEntradaBancoDeAbono'); process.exit(1); }
const fnSrc = src.slice(ini, fin + finMarca.length);

function ctxCon(movs) {
  const guardados = [];
  const ctx = { Number, window: {}, movimientosBanco: movs,
    guardarMovimientoBanco: m => guardados.push(m.id), _guardados: guardados };
  vm.createContext(ctx);
  vm.runInContext(fnSrc + '\n;globalThis.__f=_anularEntradaBancoDeAbono;', ctx);
  return ctx;
}
const F = { id: 2667, serie: 'A', numeroDte: '123' };
const entrada = () => ({ id: 193, anulado: false, origen: 'cobro', origenId: 2667, cuentaId: 5, monto: 575 });

console.log('\n═══ Entrada que coincide: se anula (sin reversa) ═══');
let ctx = ctxCon([entrada()]);
let r = ctx.__f(F, { cuentaBancoId: 5, monto: 575 });
ok('devuelve el movimiento anulado', r && r.id === 193);
ok('la entrada quedó anulada', ctx.movimientosBanco[0].anulado === true);
ok('se guardó el cambio', ctx._guardados.includes(193));

console.log('\n═══ Abono sin cuenta de banco: no toca nada ═══');
ctx = ctxCon([entrada()]);
ok('devuelve null', ctx.__f(F, { monto: 575 }) === null);
ok('la entrada sigue viva', ctx.movimientosBanco[0].anulado === false);

console.log('\n═══ Monto que NO coincide (caso 32128): no se lleva el cobro real ═══');
// Entrada real de Q1115; se anula un abono de Q90 → NO debe tocar la de Q1115.
ctx = ctxCon([{ id: 95, anulado: false, origen: 'cobro', origenId: 2036, cuentaId: 5, monto: 1115 }]);
ok('devuelve null', ctx.__f({ id: 2036, serie: 'A', numeroDte: '9' }, { cuentaBancoId: 5, monto: 90 }) === null);
ok('la entrada de Q1115 sigue intacta', ctx.movimientosBanco[0].anulado === false);

console.log('\n═══ Entrada ya anulada: no se vuelve a tocar ═══');
ctx = ctxCon([{ ...entrada(), anulado: true }]);
ok('devuelve null (ya estaba anulada)', ctx.__f(F, { cuentaBancoId: 5, monto: 575 }) === null);

console.log('\n═══ Otra cuenta: no se confunde ═══');
ctx = ctxCon([entrada()]);
ok('cuenta distinta → null', ctx.__f(F, { cuentaBancoId: 9, monto: 575 }) === null);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
