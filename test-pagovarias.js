// ============================================================
//  SEFE · test-pagovarias.js — UN COMPROBANTE, VARIAS FACTURAS
// ============================================================
//  Cómo se corre:   node test-pagovarias.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE
//
//  1) Por pagar: cuando un cheque pagaba varias facturas de un proveedor,
//     había que registrar cada factura por separado (un movimiento de banco
//     por factura, que no cuadraba con el cheque) y después costaba
//     encontrarlos. Ahora "Pagar varias facturas" deja un pago por factura
//     con el MISMO comprobante y UN solo movimiento de banco por el total.
//     Anular uno de esos pagos anula el comprobante completo.
//  2) Talonarios: el detalle de un recibo que pagó varias facturas sólo
//     mostraba la primera.
//
//  OJO: esta prueba lee el código ACTUAL de js/app-*.js (no test-fuente.js).
// ============================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
let src = '';
for (let i = 1; i <= 13; i++) src += fs.readFileSync(path.join(__dirname, 'js', 'app-' + i + '.js'), 'utf8') + '\n';

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };
const trozo = (ini, fin) => {
  const i = src.indexOf(ini), j = src.indexOf(fin, i);
  if (i < 0 || j < 0) { console.log('✗ no se encontró: ' + ini); process.exit(1); }
  return src.slice(i, j + fin.length);
};
const codigo = [
  trozo('function apInfo(c){', '\n}\n'),
  trozo('function _anularSalidaBancoDePagoProv(', 'window._anularSalidaBancoDePagoProv=_anularSalidaBancoDePagoProv;'),
  trozo('// ══════════ COMPROBANTES DE EGRESO', 'window.verPagoProvGrupo=verPagoProvGrupo;'),
  trozo('// ══════════ PAGAR VARIAS FACTURAS', 'window.anularPagoProv=anularPagoProv;'),
  trozo('window.verAbonoPorRecibo=function(num){', '\n};\n'),
].join('\n');

// ── Simulador mínimo del navegador ──
function nuevoCtx() {
  const campos = {}, inputs = [], llamadas = { guardados: [], movs: [], audit: [], toasts: [], anuladosDB: [], movGuardados: [], cerrado: 0 };
  const el = id => ({ id, style: {}, querySelector: () => ({ set textContent(v) { campos[id + ':msg'] = v; } }),
    get value() { return campos[id]; }, set value(v) { campos[id] = v; }, set innerHTML(v) { campos[id + ':html'] = v; } });
  const ctx = {
    console, Number, String, Date, Math, Set, Map, Array, Object, JSON, isNaN, parseInt,
    window: {}, compras: [], proveedores: [], documentos: [], cobrosRuta: [], movimientosBanco: [], cuentasBanco: [],
    currentUser: 'Tester', _compFoto: null, guardarFalla: -1,
    canRegistrarAbono: () => true, canAnular: () => true,
    fechaHoyGT: () => '2026-11-17', money: n => 'Q' + Number(n).toFixed(2), padn: n => String(n).padStart(6, '0'),
    fdate: f => String(f || '').slice(0, 10), refPed: d => 'PED-' + d.id,
    deEmpresa: a => a, empresaParaNuevo: () => 'SEFE', cuentasActivasBanco: () => [{ id: 4 }],
    compFotoHTML: () => '', selectorCuentaBancoHTML: () => '', cuentaLabel: c => c.nombre,
    logAudit: (a, b) => llamadas.audit.push(a + ' | ' + b), toast: (t, d) => llamadas.toasts.push(t + ' | ' + (d || '')),
    openMod: (t, h, cb) => { ctx._modal = { t, h, cb }; }, closeMod: () => { llamadas.cerrado++; }, cerrarTodo: () => { llamadas.cerrado++; },
    renderPorPagar: () => {}, renderCompras: () => {}, renderBancos: () => {}, enhanceTable: () => {},
    guardarPagoProveedor: async (id, pago) => {
      if (llamadas.guardados.length === ctx.guardarFalla) return false;
      llamadas.guardados.push({ id, pago }); return true;
    },
    registrarMovimientoBanco: m => { const mv = { id: 900 + llamadas.movs.length, anulado: false, ...m, cuentaId: Number(m.cuentaId) }; llamadas.movs.push(mv); ctx.movimientosBanco.push(mv); return mv; },
    guardarMovimientoBanco: m => llamadas.movGuardados.push(m.id),
    anularPagoProveedorDB: a => llamadas.anuladosDB.push(a),
    $: sel => { if (sel === '#m-save') return { style: {}, set textContent(v) {}, set className(v) {} };
                if (sel === '#ov') return { classList: { add() {}, remove() {} } };
                return el(sel.replace('#', '')); },
    document: { querySelectorAll: () => inputs },
    _campos: campos, _inputs: inputs, _ll: llamadas,
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  return ctx;
}
const pago = (o) => ({ fecha: '2026-11-10', monto: 100, metodo: 'Cheque', referencia: '5536', noRecibo: 'EG-0010', cuentaBancoId: 4, anulado: false, ...o });

console.log('\n═══ 1. Qué pagos van en el mismo comprobante ═══');
{
  const ctx = nuevoCtx();
  const c1 = { id: 1, proveedorId: 7, abonos: [pago({ monto: 100 })] };
  const c2 = { id: 2, proveedorId: 7, abonos: [pago({ monto: 50, noRecibo: ' eg-0010 ', fecha: '2026-11-10T00:00:00', cuentaBancoId: '4' })] };
  const c3 = { id: 3, proveedorId: 8, abonos: [pago({})] };                       // otro proveedor
  const c4 = { id: 4, proveedorId: 7, abonos: [pago({ fecha: '2026-11-11' })] };  // otra fecha
  const c5 = { id: 5, proveedorId: 7, abonos: [pago({ noRecibo: '' })] };         // sin comprobante
  const c6 = { id: 6, proveedorId: 7, abonos: [pago({ anulado: true })] };        // anulado
  const c7 = { id: 7, proveedorId: 7, abonos: [pago({ cuentaBancoId: 9 })] };     // otra cuenta
  ctx.compras = [c1, c2, c3, c4, c5, c6, c7];
  const g = ctx._grupoPagoProv(c1, c1.abonos[0]);
  ok('junta las 2 facturas del mismo comprobante (aunque varíe mayúsc./espacios/formato)', g.length === 2 && g.map(x => x.c.id).join() === '1,2', JSON.stringify(g.map(x => x.c.id)));
  ok('no mezcla otro proveedor, otra fecha, otra cuenta ni anulados', !g.some(x => [3, 4, 6, 7].includes(x.c.id)));
  ok('un pago sin comprobante queda suelto', ctx._grupoPagoProv(c5, c5.abonos[0]).length === 1);
  ok('el cierre por anulación no agrupa', ctx._clavePagoProv(c1, { noRecibo: '—', esCierre: true }) === null);
}

console.log('\n═══ 2. Número de comprobante sugerido ═══');
{
  const ctx = nuevoCtx();
  ctx.compras = [{ id: 1, abonos: [pago({ noRecibo: 'EG-0010' }), pago({ noRecibo: 'EG-0012', anulado: true }), pago({ noRecibo: 'PAGO COMPRA' })] }];
  ok('mayor usado (aunque esté anulado) + 1 → EG-0013', ctx._sugerirEgreso() === 'EG-0013', ctx._sugerirEgreso());
  ctx.compras = [];
  ok('sin pagos → EG-0001', ctx._sugerirEgreso() === 'EG-0001');
}

// Arma el modal "Pagar varias facturas" con montos y lo guarda.
async function pagarVarias(ctx, montos, datos, foto) {
  ctx.openPagoVariasProv();
  if (foto) ctx._compFoto = foto; // la foto se sube con el modal ya abierto
  Object.assign(ctx._campos, { 'pgp-prov': '7', 'pgp-recibo': 'EG-0020', 'pgp-fecha': '2026-11-17', 'pgp-met': 'Cheque', 'pgp-ref': '7788', 'pgp-cuenta': '4' }, datos || {});
  ctx._inputs.length = 0;
  Object.entries(montos).forEach(([id, v]) => ctx._inputs.push({ value: String(v), dataset: { id: String(id) } }));
  await ctx._modal.cb();
}
const comprasBase = () => [
  { id: 11, proveedorId: 7, proveedorNombre: 'DIMARES', docProv: 'A-100', total: 300, facturada: true, tipoPago: 'credito', empresa: 'SEFE', abonos: [] },
  { id: 12, proveedorId: 7, proveedorNombre: 'DIMARES', docProv: 'A-101', total: 200, facturada: true, tipoPago: 'credito', empresa: 'SEFE', abonos: [] },
];

(async () => {
  console.log('\n═══ 3. Pagar varias facturas con un solo cheque ═══');
  let ctx = nuevoCtx(); ctx.compras = comprasBase();
  await pagarVarias(ctx, { 11: 300, 12: 150 }, null, 'data:foto');
  const L = ctx._ll;
  ok('guarda un pago por factura', L.guardados.length === 2 && L.guardados[0].id === 11 && L.guardados[1].id === 12);
  ok('los dos llevan el mismo comprobante, cheque y cuenta', L.guardados.every(g => g.pago.noRecibo === 'EG-0020' && g.pago.referencia === '7788' && g.pago.cuentaBancoId === '4'));
  ok('cada factura con su monto', L.guardados[0].pago.monto === 300 && L.guardados[1].pago.monto === 150);
  ok('la foto se guarda una sola vez', L.guardados[0].pago.comprobante === 'data:foto' && L.guardados[1].pago.comprobante === null);
  ok('UN solo movimiento de banco por el total (Q450)', L.movs.length === 1 && L.movs[0].monto === 450 && L.movs[0].tipo === 'salida');
  ok('el movimiento queda ligado al proveedor (origen pago_proveedor)', L.movs[0].origen === 'pago_proveedor' && L.movs[0].origenId === 11);
  ok('el concepto dice el comprobante y las facturas', /EG-0020/.test(L.movs[0].concepto) && /A-100/.test(L.movs[0].concepto) && /A-101/.test(L.movs[0].concepto), L.movs[0].concepto);
  ok('saldos: A-100 pagada, A-101 queda con Q50', ctx.apInfo(ctx.compras[0]).saldo === 0 && ctx.apInfo(ctx.compras[1]).saldo === 50);
  ok('cierra y avisa "registrado"', L.cerrado === 1 && L.toasts.some(t => /✓ Pago registrado/.test(t)));
  ok('queda en auditoría', L.audit.some(a => /varias facturas/.test(a) && /EG-0020/.test(a)));

  console.log('\n═══ 4. Validaciones ═══');
  ctx = nuevoCtx(); ctx.compras = comprasBase();
  await pagarVarias(ctx, { 11: 301 });
  ok('no deja pagar más que el saldo', ctx._ll.guardados.length === 0 && /supera su saldo/.test(ctx._campos['pgp-err:msg']), ctx._campos['pgp-err:msg']);
  ctx = nuevoCtx(); ctx.compras = comprasBase(); ctx.compras[0].abonos.push(pago({ noRecibo: 'EG-0020', monto: 10 }));
  await pagarVarias(ctx, { 12: 100 });
  ok('no deja repetir un comprobante ya usado', ctx._ll.guardados.length === 0 && /ya se usó/.test(ctx._campos['pgp-err:msg']), ctx._campos['pgp-err:msg']);
  ctx = nuevoCtx(); ctx.compras = comprasBase(); ctx.compras[1].empresa = 'OTRA';
  await pagarVarias(ctx, { 11: 10, 12: 10 });
  ok('no mezcla facturas de empresas distintas', ctx._ll.guardados.length === 0 && /empresas distintas/.test(ctx._campos['pgp-err:msg']));
  ctx = nuevoCtx(); ctx.compras = comprasBase();
  await pagarVarias(ctx, {});
  ok('pide al menos un monto', ctx._ll.guardados.length === 0 && /al menos una factura/.test(ctx._campos['pgp-err:msg']));
  ctx = nuevoCtx(); ctx.compras = comprasBase();
  await pagarVarias(ctx, { 11: 50 }, { 'pgp-recibo': '  ' });
  ok('pide el No. de comprobante', ctx._ll.guardados.length === 0 && /comprobante/.test(ctx._campos['pgp-err:msg']));

  console.log('\n═══ 5. Si se cae la conexión a medio guardar ═══');
  ctx = nuevoCtx(); ctx.compras = comprasBase(); ctx.guardarFalla = 1; // el 2º no se guarda
  await pagarVarias(ctx, { 11: 300, 12: 200 });
  ok('el banco registra SOLO lo guardado (Q300)', ctx._ll.movs.length === 1 && ctx._ll.movs[0].monto === 300);
  ok('la factura que no se guardó no queda con pago', ctx.compras[1].abonos.length === 0);
  ok('avisa cuál quedó sin registrar', ctx._ll.toasts.some(t => /a medias/.test(t) && /A-101/.test(t)));
  ctx = nuevoCtx(); ctx.compras = comprasBase(); ctx.guardarFalla = 0;
  await pagarVarias(ctx, { 11: 300 });
  ok('si no se guardó nada: no hay banco y el modal sigue abierto', ctx._ll.movs.length === 0 && ctx._ll.cerrado === 0 && /No se pudo guardar/.test(ctx._campos['pgp-err:msg']));

  console.log('\n═══ 6. Anular uno → se anula el comprobante completo ═══');
  ctx = nuevoCtx(); ctx.compras = comprasBase();
  await pagarVarias(ctx, { 11: 300, 12: 150 });
  ctx.anularPagoProv(12, 0);
  ok('el aviso dice que se anula el comprobante completo', /comprobante completo/.test(ctx._modal.h) && /Anular comprobante/.test(ctx._modal.t));
  ctx._campos['ap-motivo'] = 'cheque mal emitido';
  ctx._modal.cb();
  ok('las 2 facturas quedan con su pago anulado', ctx.compras.every(c => c.abonos[0].anulado === true));
  ok('vuelven a tener saldo completo', ctx.apInfo(ctx.compras[0]).saldo === 300 && ctx.apInfo(ctx.compras[1]).saldo === 200);
  ok('el movimiento de banco del cheque queda anulado', ctx.movimientosBanco[0].anulado === true && ctx._ll.movGuardados.includes(ctx.movimientosBanco[0].id));
  ok('se anulan los 2 pagos en la base', ctx._ll.anuladosDB.length === 2);
  ok('no sale el aviso de "revisá bancos"', !ctx._ll.toasts.some(t => /Revisá Bancos/.test(t)));

  console.log('\n═══ 7. Pagos viejos (uno por uno, cada uno con su movimiento) ═══');
  ctx = nuevoCtx();
  ctx.compras = comprasBase();
  ctx.compras[0].abonos.push(pago({ monto: 100 })); ctx.compras[1].abonos.push(pago({ monto: 50 }));
  ctx.movimientosBanco.push({ id: 1, anulado: false, origen: 'pago_proveedor', origenId: 11, cuentaId: 4, monto: 100 },
                            { id: 2, anulado: false, origen: 'pago_proveedor', origenId: 12, cuentaId: 4, monto: 50 },
                            { id: 3, anulado: false, origen: 'pago_proveedor', origenId: 12, cuentaId: 4, monto: 999 });
  ctx.anularPagoProv(11, 0); ctx._campos['ap-motivo'] = 'x'; ctx._modal.cb();
  ok('anula los 2 movimientos sueltos, cada uno el suyo', ctx.movimientosBanco[0].anulado && ctx.movimientosBanco[1].anulado);
  ok('no toca otros movimientos del proveedor', ctx.movimientosBanco[2].anulado === false);

  console.log('\n═══ 8. Pago de una sola factura: igual que antes ═══');
  ctx = nuevoCtx(); ctx.compras = comprasBase();
  ctx.compras[0].abonos.push(pago({ monto: 100, noRecibo: 'EG-0001' }));
  ctx.movimientosBanco.push({ id: 1, anulado: false, origen: 'pago_proveedor', origenId: 11, cuentaId: 4, monto: 100 });
  ctx.anularPagoProv(11, 0);
  ok('el aviso es el de siempre ("Anular pago")', /Anular pago/.test(ctx._modal.t) && !/comprobante completo/.test(ctx._modal.h));
  ctx._campos['ap-motivo'] = 'x'; ctx._modal.cb();
  ok('anula el pago y su movimiento', ctx.compras[0].abonos[0].anulado && ctx.movimientosBanco[0].anulado);

  console.log('\n═══ 9. Talonarios: un recibo con varias facturas ═══');
  ctx = nuevoCtx();
  ctx.documentos = [
    { id: 1, serie: 'F1', numeroDte: '111', clienteNombre: 'Cliente X', abonos: [{ noRecibo: '28005', monto: 400, fecha: '2026-11-10', metodo: 'Efectivo' }] },
    { id: 2, serie: 'F1', numeroDte: '222', clienteNombre: 'Cliente X', abonos: [{ noRecibo: '28005', monto: 250, fecha: '2026-11-10', metodo: 'Efectivo' }] },
    { id: 3, serie: 'F1', numeroDte: '333', clienteNombre: 'Cliente X', abonos: [{ noRecibo: '28005', monto: 999, anulado: true }] },
  ];
  ctx.window.verAbonoPorRecibo(28005);
  const h = ctx._modal.h;
  ok('muestra las 2 facturas del recibo (antes sólo la 1ª)', /F1-111/.test(h) && /F1-222/.test(h));
  ok('no muestra el abono anulado', !/F1-333/.test(h));
  ok('muestra el total del recibo (Q650)', /Q650\.00/.test(h));
  ok('dice "2 facturas"', /2 facturas/.test(h));
  ctx.documentos = [ctx.documentos[0]];
  ctx.window.verAbonoPorRecibo(28005);
  ok('un recibo de una sola factura sigue funcionando', /F1-111/.test(ctx._modal.h) && /Q400\.00/.test(ctx._modal.h));

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
