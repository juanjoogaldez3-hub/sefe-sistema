// ============================================================
//  SEFE · test-pagoprov.js — EL PAGO A PROVEEDOR SE GUARDA ANTES
// ============================================================
//  Cómo se corre:   node test-pagoprov.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE
//
//  Antes, "Registrar pago" a proveedor guardaba el abono AL FINAL y sin
//  esperar: si esa grabación fallaba, el movimiento de banco ya quedaba
//  pero el abono no, y la compra seguía mostrando pendiente (le pasó a
//  3 pagos de DIMARES). El blindaje: guardar el abono PRIMERO y esperar;
//  si falla, no crear el movimiento y avisar.
//
//  Esta prueba carga la función real openAbonoProv y verifica los dos
//  caminos.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const i = src.indexOf('function openAbonoProv(id){');
const j = src.indexOf('\nwindow.openAbonoProv=openAbonoProv;');
if (i < 0 || j < 0) { console.log('✗ no se encontró openAbonoProv'); process.exit(1); }
const fnSrc = src.slice(i, j);

let saveCb = null, campos = {}, movs = [], guardado = [], cerrado = false, toasts = [];
let guardarDevuelve = true;               // qué devuelve guardarPagoProveedor
const elErr = { style: {}, querySelector: () => ({ textContent: '' }) };
const elBtn = { disabled: false };
const $ = sel => {
  const id = sel.replace('#', '');
  if (id === 'pp-err') return elErr;
  if (id === 'm-save') return elBtn;
  return (id in campos) ? { value: campos[id] } : null;
};

const ctx = {
  console, Number, String, Date,
  canRegistrarAbono: () => true,
  compras: [], _compFoto: null, currentUser: 'Tester',
  apInfo: () => ({ saldo: 1000 }),
  fechaHoyGT: () => '2026-08-19',
  money: n => 'Q' + n, padn: n => String(n),
  compFotoHTML: () => '', selectorCuentaBancoHTML: () => '<select id="pp-cuenta"></select>',
  openMod: (t, h, cb) => { saveCb = cb; },
  closeMod: () => { cerrado = true; },
  renderPorPagar: () => {}, renderCompras: () => {}, logAudit: () => {},
  toast: (t) => toasts.push(t),
  $,
  guardarPagoProveedor: async (id, pago) => { guardado.push({ id, pago }); return guardarDevuelve; },
  registrarMovimientoBanco: (m) => { movs.push(m); return m; },
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__open=openAbonoProv;', ctx);
const openAbonoProv = ctx.__open;

async function correr(dev) {
  saveCb = null; movs = []; guardado = []; cerrado = false; toasts = []; elBtn.disabled = false;
  guardarDevuelve = dev;
  ctx.compras = [{ id: 5, proveedorNombre: 'DIMARES', abonos: [] }];
  openAbonoProv(5);
  campos = { 'pp-monto': '875', 'pp-recibo': 'PAGO COMPRA', 'pp-cuenta': '4', 'pp-ref': 'CH-1', 'pp-fecha': '2026-08-14', 'pp-met': 'Transferencia' };
  await saveCb();
  return ctx.compras[0];
}

(async () => {
  console.log('\n═══ El abono se guarda ANTES que el movimiento ═══');
  let c = await correr(true);
  ok('se llamó a guardar el abono', guardado.length === 1);
  ok('el abono quedó en la compra', c.abonos.length === 1 && c.abonos[0].monto === 875);
  ok('se creó el movimiento de banco', movs.length === 1 && movs[0].tipo === 'salida');
  ok('el modal se cerró y avisó éxito', cerrado === true && toasts.some(t => /registrado/i.test(t)));

  console.log('\n═══ Si el abono NO se guarda → no hay movimiento ═══');
  c = await correr(false);
  ok('NO se crea el movimiento de banco', movs.length === 0);
  ok('el abono NO queda colgado en la compra', c.abonos.length === 0);
  ok('el modal NO se cierra (se puede reintentar)', cerrado === false);
  ok('NO se muestra "registrado"', !toasts.some(t => /registrado/i.test(t)));
  ok('el botón Guardar se vuelve a habilitar', elBtn.disabled === false);

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
