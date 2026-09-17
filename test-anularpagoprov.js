// ============================================================
//  SEFE · test-anularpagoprov.js — ANULAR PAGO A PROVEEDOR BORRA SU MOV. DE BANCO
// ============================================================
//  Cómo se corre:   node test-anularpagoprov.js
//
//  Espejo de test-anularabono: al anular un pago a proveedor, el sistema
//  debe anular también su SALIDA de banco (origen 'pago_proveedor'). Antes
//  quedaba un movimiento huérfano que descuadraba la conciliación.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function _anularSalidaBancoDePagoProv(');
const finMarca = 'window._anularSalidaBancoDePagoProv=_anularSalidaBancoDePagoProv;';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _anularSalidaBancoDePagoProv'); process.exit(1); }
const fnSrc = src.slice(ini, fin + finMarca.length);

function ctxCon(movs) {
  const guardados = [];
  const ctx = { Number, String, window: {}, movimientosBanco: movs,
    guardarMovimientoBanco: m => guardados.push(m.id), _guardados: guardados };
  vm.createContext(ctx);
  vm.runInContext(fnSrc + '\n;globalThis.__f=_anularSalidaBancoDePagoProv;', ctx);
  return ctx;
}
const C = { id: 42 };
const salida = () => ({ id: 160, anulado: false, origen: 'pago_proveedor', origenId: 42, cuentaId: 4, monto: 600 });

console.log('\n═══ Salida que coincide: se anula ═══');
let ctx = ctxCon([salida()]);
let r = ctx.__f(C, { cuentaBancoId: 4, monto: 600 });
ok('devuelve el movimiento anulado', r && r.id === 160);
ok('la salida quedó anulada', ctx.movimientosBanco[0].anulado === true);
ok('se guardó el cambio', ctx._guardados.includes(160));

console.log('\n═══ Pago sin cuenta de banco: no toca nada ═══');
ctx = ctxCon([salida()]);
ok('devuelve null', ctx.__f(C, { monto: 600 }) === null);
ok('la salida sigue viva', ctx.movimientosBanco[0].anulado === false);

console.log('\n═══ Monto que NO coincide: no se lleva un pago real de otro monto ═══');
ctx = ctxCon([{ id: 90, anulado: false, origen: 'pago_proveedor', origenId: 42, cuentaId: 4, monto: 5000 }]);
ok('devuelve null', ctx.__f(C, { cuentaBancoId: 4, monto: 600 }) === null);
ok('la salida de Q5000 sigue intacta', ctx.movimientosBanco[0].anulado === false);

console.log('\n═══ Pago junto a otros (referencia): casa por ref + monto ≥ ═══');
ctx = ctxCon([{ id: 161, anulado: false, origen: 'pago_proveedor', origenId: 42, cuentaId: 4, monto: 1500, referencia: 'A1B2' }]);
r = ctx.__f(C, { cuentaBancoId: 4, monto: 600, referencia: 'A1B2' });
ok('encuentra el pago agrupado por referencia', r && r.id === 161);

console.log('\n═══ Otra cuenta / otro origen: no se confunde ═══');
ctx = ctxCon([salida()]);
ok('cuenta distinta → null', ctx.__f(C, { cuentaBancoId: 9, monto: 600 }) === null);
ctx = ctxCon([{ ...salida(), origen: 'cobro' }]);
ok('origen distinto (cobro) → null', ctx.__f(C, { cuentaBancoId: 4, monto: 600 }) === null);

console.log('\n═══ Cableado: anularPagoProv limpia banco y avisa ═══');
ok('anularPagoProv llama a la limpieza de banco', /_anularSalidaBancoDePagoProv\(c,a\)/.test(src));
ok('avisa si tenía cuenta pero no halló el movimiento', /else if\(a\.cuentaBancoId\)\{/.test(src.slice(src.indexOf('function anularPagoProv'))) && /no encontré su movimiento de banco/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
