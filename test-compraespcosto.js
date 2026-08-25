// ============================================================
//  SEFE · test-compraespcosto.js — EDITAR COSTO EN COMPRA ESPECIAL (con motivo)
// ============================================================
//  Cómo se corre:   node test-compraespcosto.js
//  No necesita instalar nada ni conectarse a internet.
//
//  En "Editar compra especial" ahora el costo es editable, pero cualquier
//  cambio EXIGE un motivo (queda en auditoría). Cambiar el costo NO toca el
//  inventario; sí recalcula el total (y de ahí el promedio de reportería).
//  Esta prueba carga la función real updEspecialItemCosto.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf("let _motivoCompraEsp=''");
const finMarca = 'window.updEspecialItemCosto=updEspecialItemCosto;';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el bloque de compra especial'); process.exit(1); }
const bloque = src.slice(ini, fin + finMarca.length);

function nuevoCtx() {
  const ahora = new Date();
  const mesActual = ahora.getFullYear() + '-' + (ahora.getMonth() + 1);
  const compra = { id: 348, especial: true, oficializada: false, mes: mesActual,
    proveedorNombre: 'IDEAS EN PAPEL', total: 456,
    items: [{ id: 52, codigo: 'ET0884', nombre: 'ELITE', nombreProveedor: 'ELITE', skuProveedor: 'AB50', costo: 114, cantidad: 4, recibido: 4 }] };
  const toasts = [], audits = [], guardadas = [];
  const ctx = {
    Math, Number, String, Date, console, window: {},
    compras: [compra], productos: [],
    money: n => 'Q' + (Number(n) || 0), padn: n => String(n),
    toast: (t, s, err) => toasts.push({ t, s, err }),
    logAudit: (a, b) => audits.push(a + ' | ' + b),
    guardarCompra: c => guardadas.push(c.id),
    aplicarStock: () => {},
    openMod: () => {}, closeMod: () => {}, renderCompras: () => {},
    $: sel => {
      if (sel === '#esp-rows') return { innerHTML: '' };
      if (sel === '#m-save') return { textContent: '', className: '' };
      if (sel === '#esp-add') return { value: '' };
      return { value: '' };
    },
    _t: { compra, toasts, audits, guardadas },
  };
  vm.createContext(ctx);
  vm.runInContext(bloque + '\n;globalThis.__costo=updEspecialItemCosto;', ctx);
  return ctx;
}

console.log('\n═══ Sin motivo: NO cambia el costo ═══');
let ctx = nuevoCtx();
ctx.__costo(348, 0, '200'); // sin haber puesto motivo
ok('el costo sigue en 114 (no se aplicó)', ctx._t.compra.items[0].costo === 114);
ok('avisó que falta el motivo', ctx._t.toasts.some(x => /motivo/i.test(x.t + ' ' + x.s)));
ok('no registró auditoría del costo', !ctx._t.audits.some(a => /costo/i.test(a)));

console.log('\n═══ Con motivo: cambia el costo y recalcula el total ═══');
ctx = nuevoCtx();
vm.runInContext("_motivoCompraEsp='alza de precio del proveedor';", ctx);
ctx.__costo(348, 0, '200');
ok('el costo quedó en 200', ctx._t.compra.items[0].costo === 200);
ok('el total se recalculó (4 × 200 = 800)', ctx._t.compra.total === 800);
ok('guardó la compra', ctx._t.guardadas.includes(348));
ok('auditó con el motivo y el antes→después', ctx._t.audits.some(a => a.includes('114') && a.includes('200') && a.includes('alza de precio del proveedor')));

console.log('\n═══ Mismo costo: no audita de más ═══');
ctx = nuevoCtx();
vm.runInContext("_motivoCompraEsp='revisión';", ctx);
ctx.__costo(348, 0, '114'); // igual al actual
ok('no registra cambio si el costo es el mismo', !ctx._t.audits.some(a => /costo/i.test(a)));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
