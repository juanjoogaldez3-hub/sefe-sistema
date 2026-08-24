// ============================================================
//  SEFE · test-sincuenta.js — MÓDULO "CONTADO SIN CUENTA"
// ============================================================
//  Cómo se corre:   node test-sincuenta.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Cubre el módulo de Bancos que junta las compras al contado que se
//  registraron sin cuenta, y la acción de asignarles una (que crea el
//  movimiento de banco). Carga las funciones reales del index.html.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

function trozo(desde, hasta) {
  const i = src.indexOf(desde); const j = src.indexOf(hasta, i);
  if (i < 0 || j < 0) { console.log('✗ no se encontró: ' + desde); process.exit(1); }
  return src.slice(i, j);
}

// ── Detección ────────────────────────────────────────────────
console.log('\n═══ comprasContadoSinCuenta() detecta lo correcto ═══');
const detSrc = trozo('function comprasContadoSinCuenta(){', 'function renderSinCuenta');
const ctxD = { console, Number };
vm.createContext(ctxD);

function detectar(compras, movimientosBanco) {
  ctxD.compras = compras; ctxD.movimientosBanco = movimientosBanco;
  vm.runInContext(detSrc + '\n;globalThis.__d=comprasContadoSinCuenta;', ctxD);
  return ctxD.__d();
}

const contadoPend = { id: 1, proveedorNombre: 'P1', abonos: [{ metodo: 'Contado', monto: 250, cuentaBancoId: null, anulado: false }] };
ok('contado sin cuenta ni movimiento → aparece', detectar([contadoPend], []).length === 1);
ok('contado CON cuenta → no aparece',
  detectar([{ id: 2, abonos: [{ metodo: 'Contado', monto: 250, cuentaBancoId: 4 }] }], []).length === 0);
ok('contado sin cuenta pero con movimiento → no aparece',
  detectar([contadoPend], [{ origen: 'pago_proveedor', origenId: 1, anulado: false }]).length === 0);
ok('abono anulado → no aparece',
  detectar([{ id: 3, abonos: [{ metodo: 'Contado', monto: 250, cuentaBancoId: null, anulado: true }] }], []).length === 0);
ok('pago que no es contado → no aparece',
  detectar([{ id: 4, abonos: [{ metodo: 'Transferencia', monto: 250, cuentaBancoId: null }] }], []).length === 0);
ok('compra anulada → no aparece',
  detectar([{ id: 5, anulado: true, abonos: [{ metodo: 'Contado', monto: 250, cuentaBancoId: null }] }], []).length === 0);
ok('un movimiento anulado NO cuenta como respaldo → sí aparece',
  detectar([contadoPend], [{ origen: 'pago_proveedor', origenId: 1, anulado: true }]).length === 1);

// ── Acción de asignar ────────────────────────────────────────
console.log('\n═══ asignarCuentaContado() crea el movimiento ═══');
const accSrc = trozo('function asignarCuentaContado(compraId,idx){', '\nwindow.asignarCuentaContado');

let movs = [], cuentasSet = [], saveCb = null, campos = {};
const elErr = { style: {}, querySelector: () => ({ textContent: '' }) };
const $ = sel => {
  const id = sel.replace('#', '');
  if (id === 'sc-err') return elErr;                 // el cuadro de error del modal
  if (id in campos) return (campos[id] && typeof campos[id] === 'object') ? campos[id] : { value: campos[id], checked: campos[id] };
  return null;
};
const ctxA = {
  console, Number,
  canRegistrarAbono: () => true,
  cuentasActivasBanco: () => [{ id: 4, nombre: 'Bi Monetaria' }],
  padn: n => String(n), money: n => 'Q' + n, fdate: d => String(d),
  selectorCuentaBancoHTML: () => '<select id="sc-cuenta"></select>',
  $, openMod: (t, h, cb) => { saveCb = cb; }, closeMod: () => {},
  renderBancos: () => {}, renderCompras: () => {}, toast: () => {}, logAudit: () => {},
  actualizarCuentaPagoProveedor: (a) => cuentasSet.push(a),
  registrarMovimientoBanco: (m) => { movs.push(m); return m; },
  compras: [],
};
vm.createContext(ctxA);
vm.runInContext(accSrc + '\n;globalThis.__a=asignarCuentaContado;', ctxA);
const asignar = ctxA.__a;

function correrAsignar(campo) {
  movs = []; cuentasSet = []; saveCb = null;
  ctxA.compras = [{ id: 7, proveedorNombre: 'PROVEEDOR X', docProv: 'FAC-9', fecha: '2026-08-12',
    abonos: [{ metodo: 'Contado', monto: 250, cuentaBancoId: null, anulado: false }] }];
  asignar(7, 0);
  campos = campo;
  saveCb();
}

correrAsignar({ 'sc-cuenta': '4', 'sc-poliza': { checked: true } });
ok('registra un movimiento de salida por el monto', movs.length === 1 && movs[0].tipo === 'salida' && movs[0].monto === 250, JSON.stringify(movs[0]));
ok('sale de la cuenta elegida', String(movs[0].cuentaId) === '4');
ok('lleva beneficiario (proveedor)', movs[0].beneficiario === 'PROVEEDOR X');
ok('con la casilla marcada, sí genera póliza (sinPoliza=false)', movs[0].sinPoliza === false);
ok('le asigna la cuenta al pago en la base', cuentasSet.length === 1 && cuentasSet[0].cuentaBancoId === '4');

correrAsignar({ 'sc-cuenta': '4', 'sc-poliza': { checked: false } });
ok('con la casilla desmarcada, no genera póliza (sinPoliza=true)', movs[0].sinPoliza === true);

correrAsignar({ 'sc-cuenta': '', 'sc-poliza': { checked: true } });
ok('sin cuenta elegida no registra nada', movs.length === 0 && cuentasSet.length === 0);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
