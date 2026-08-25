// ============================================================
//  SEFE · test-comprapend.js — EDITAR ORDEN DE COMPRA PENDIENTE
// ============================================================
//  Cómo se corre:   node test-comprapend.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Una orden de compra normal se puede editar SÓLO mientras está pendiente
//  (sin recibir). Se edita cantidad y costo, pidiendo un motivo (queda en
//  auditoría), y NO toca el inventario (nada se recibió todavía). Una vez
//  recibida, es inamovible. Esta prueba carga la función real updPendItem.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf("let _motivoCompraEsp=''");
const finMarca = 'window.addPendItem=addPendItem;';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el bloque de compras'); process.exit(1); }
const bloque = src.slice(ini, fin + finMarca.length);

function nuevoCtx(estadoRecepcion) {
  const compra = { id: 400, especial: false, anulado: false, estadoRecepcion: estadoRecepcion || 'pendiente',
    proveedorNombre: 'PROV', total: 200,
    items: [{ id: 52, codigo: 'X1', nombre: 'X', nombreProveedor: 'X', skuProveedor: 'X1', costo: 50, cantidad: 4, recibido: 0 }] };
  const audits = [], toasts = []; let stockCalls = 0;
  const ctx = {
    Math, Number, String, Date, console, window: {},
    compras: [compra], productos: [],
    money: n => 'Q' + (Number(n) || 0), padn: n => String(n),
    toast: (t, s, err) => toasts.push({ t, s }),
    logAudit: (a, b) => audits.push(a + ' | ' + b),
    guardarCompra: () => {},
    aplicarStock: () => { stockCalls++; },
    openMod: () => {}, closeMod: () => {}, renderCompras: () => {},
    $: sel => ({ innerHTML: '', textContent: '', className: '', value: '' }),
    _t: { compra, audits, toasts, stock: () => stockCalls },
  };
  vm.createContext(ctx);
  vm.runInContext(bloque + '\n;globalThis.__upd=updPendItem;', ctx);
  return ctx;
}

console.log('\n═══ Sin motivo: no cambia nada ═══');
let ctx = nuevoCtx();
ctx.__upd(400, 0, 'cantidad', '6');
ok('la cantidad sigue en 4', ctx._t.compra.items[0].cantidad === 4);
ok('avisó que falta el motivo', ctx._t.toasts.some(x => /motivo/i.test(x.t + ' ' + x.s)));

console.log('\n═══ Con motivo: edita cantidad SIN tocar inventario ═══');
ctx = nuevoCtx();
vm.runInContext("_motivoCompraEsp='se pidió de más';", ctx);
ctx.__upd(400, 0, 'cantidad', '6');
ok('la cantidad quedó en 6', ctx._t.compra.items[0].cantidad === 6);
ok('el total se recalculó (6 × 50 = 300)', ctx._t.compra.total === 300);
ok('NO tocó el inventario (aplicarStock no se llamó)', ctx._t.stock() === 0);
ok('auditó con el motivo', ctx._t.audits.some(a => a.includes('se pidió de más') && a.includes('cantidad')));

console.log('\n═══ Con motivo: edita el costo ═══');
ctx = nuevoCtx();
vm.runInContext("_motivoCompraEsp='corrección de costo';", ctx);
ctx.__upd(400, 0, 'costo', '70');
ok('el costo quedó en 70', ctx._t.compra.items[0].costo === 70);
ok('el total se recalculó (4 × 70 = 280)', ctx._t.compra.total === 280);
ok('sigue sin tocar inventario', ctx._t.stock() === 0);

console.log('\n═══ Ya recibida: inamovible ═══');
ctx = nuevoCtx('recibida');
vm.runInContext("_motivoCompraEsp='intento';", ctx);
ctx.__upd(400, 0, 'cantidad', '99');
ok('una orden recibida no se edita (cantidad sigue en 4)', ctx._t.compra.items[0].cantidad === 4);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
