// ============================================================
//  SEFE · test-editabono.js — EDITAR LA FECHA MUEVE EL MOVIMIENTO
// ============================================================
//  Cómo se corre:   node test-editabono.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE
//
//  Al editar un abono que entró a una cuenta de banco, el movimiento de
//  banco tiene que quedar con la MISMA fecha y monto. Antes sólo se
//  ajustaba cuando cambiaba el monto: editar sólo la fecha dejaba el
//  movimiento con la fecha vieja, y el cobro seguía apareciendo en el
//  mes equivocado. Esta prueba carga la función real openEditarAbono.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const i = src.indexOf('function openEditarAbono(facturaId,abonoIdx){');
const j = src.indexOf('\nwindow.openEditarAbono=openEditarAbono;');
if (i < 0 || j < 0) { console.log('✗ no se encontró openEditarAbono'); process.exit(1); }
const fnSrc = src.slice(i, j);

let saveCb = null, campos = {}, guardados = [];
const elErr = { style: {}, querySelector: () => ({ textContent: '' }) };
const $ = sel => {
  const id = sel.replace('#', '');
  if (id === 'ea-err') return elErr;
  return (id in campos) ? { value: campos[id] } : null;
};

const ctx = {
  console, Number, String,
  canRegistrarAbono: () => true,
  toast: () => {}, logAudit: () => {}, money: n => 'Q' + n,
  openMod: (t, h, cb) => { saveCb = cb; },
  $, arInfo: () => ({ saldo: 0, estado: 'pagada' }),
  openHistorialAbonos: () => {}, renderCobros: () => {},
  actualizarAbonoDB: () => {}, guardarDocumento: () => {},
  guardarMovimientoBanco: (m) => guardados.push(m),
  documentos: [], movimientosBanco: [],
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__e=openEditarAbono;', ctx);
const openEditarAbono = ctx.__e;

function escenario() {
  saveCb = null; guardados = [];
  const abono = { noRecibo: '31494', fecha: '2026-08-03', monto: 250, metodo: 'Transferencia', referencia: '', cuentaBancoId: 4, anulado: false };
  const mov = { origen: 'cobro', origenId: 700, cuentaId: 4, monto: 250, fecha: '2026-08-03', anulado: false };
  ctx.documentos = [{ id: 700, serie: 'A', numeroDte: '9', abonos: [abono], estadoPago: 'pagada' }];
  ctx.movimientosBanco = [mov];
  openEditarAbono(700, 0);
  return { abono, mov };
}

console.log('\n═══ Editar SÓLO la fecha ═══');
let { abono, mov } = escenario();
campos = { 'ea-recibo': '31494', 'ea-fecha': '2026-07-31', 'ea-monto': '250', 'ea-met': 'Transferencia', 'ea-ref': '' };
saveCb();
ok('el movimiento de banco toma la fecha nueva', mov.fecha === '2026-07-31', 'quedó ' + mov.fecha);
ok('el monto del movimiento no cambia', mov.monto === 250);
ok('se guardó el movimiento en la base', guardados.length === 1);

console.log('\n═══ Editar la fecha Y el monto ═══');
({ abono, mov } = escenario());
campos = { 'ea-recibo': '31494', 'ea-fecha': '2026-07-31', 'ea-monto': '200', 'ea-met': 'Transferencia', 'ea-ref': '' };
saveCb();
ok('el movimiento toma fecha y monto nuevos', mov.fecha === '2026-07-31' && mov.monto === 200, mov.fecha + ' / ' + mov.monto);

console.log('\n═══ No cambiar nada relevante → no toca el movimiento ═══');
({ abono, mov } = escenario());
campos = { 'ea-recibo': '31494', 'ea-fecha': '2026-08-03', 'ea-monto': '250', 'ea-met': 'Transferencia', 'ea-ref': '' };
saveCb();
ok('no se guarda el movimiento si no cambió fecha ni monto', guardados.length === 0);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
