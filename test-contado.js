// ============================================================
//  SEFE · test-contado.js — LA COMPRA AL CONTADO GENERA BANCO
// ============================================================
//  Cómo se corre:   node test-contado.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Antes, al registrar una factura de proveedor "al contado", se
//  guardaba el pago pero NO se generaba el movimiento de banco ni la
//  póliza de cheque. Esta prueba carga la función real openFacturaProv
//  del index.html, le captura el "guardar" y verifica que:
//   - contado CON cuenta  → registra una SALIDA de banco (con póliza)
//   - crédito             → no toca el banco
//   - contado SIN cuenta  → guarda el pago pero no toca el banco
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// Extraer la función real
const i = src.indexOf('function openFacturaProv(id){');
const j = src.indexOf('\nwindow.openFacturaProv=openFacturaProv;');
if (i < 0 || j < 0) { console.log('✗ no se encontró openFacturaProv'); process.exit(1); }
const fnSrc = src.slice(i, j);

// Un DOM de mentira configurable: cada corrida define qué valen los campos
let campos = {};
const $ = sel => {
  const id = sel.replace('#', '');
  if (!(id in campos)) return null;
  return { value: campos[id] };
};

// Capturas
let movimientos = [];
let pagosGuardados = [];
let saveCb = null;

const ctx = {
  console, Number, Date, String, setTimeout: () => {},
  // datos
  compras: [{ id: 7, total: 1500, proveedorId: 1, proveedorNombre: 'PROVEEDOR X' }],
  proveedores: [{ id: 1, diasCredito: 0 }],
  currentUser: 'Tester',
  // helpers de UI que no importan acá
  padn: n => String(n), money: n => 'Q' + n, fechaHoyGT: () => '2026-08-19',
  cuentasActivasBanco: () => [{ id: 4, nombre: 'Bi Monetaria' }],
  selectorCuentaBancoHTML: () => '<select id="fp-cuenta"></select>',
  $,
  openMod: (title, html, cb) => { saveCb = cb; },
  closeMod: () => {}, renderCompras: () => {}, toast: () => {}, logAudit: () => {},
  guardarPagoProveedor: (id, pago) => pagosGuardados.push({ id, pago }),
  registrarMovimientoBanco: (mov) => { movimientos.push(mov); return mov; },
  guardarCompra: () => {},
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__open=openFacturaProv;', ctx);
const openFacturaProv = ctx.__open;

function correr(nuevosCampos) {
  movimientos = []; pagosGuardados = []; saveCb = null;
  // resetear la compra (openFacturaProv la muta)
  ctx.compras[0] = { id: 7, total: 1500, proveedorId: 1, proveedorNombre: 'PROVEEDOR X' };
  openFacturaProv(7);
  campos = nuevosCampos;
  saveCb();
}

console.log('\n═══ CONTADO CON CUENTA → salida de banco + póliza ═══');
correr({ 'fp-pago': 'contado', 'fp-dias': '0', 'fp-fecha': '2026-08-19', 'fp-doc': 'FACT-100', 'fp-cuenta': '4' });
ok('registró exactamente un movimiento de banco', movimientos.length === 1, 'fueron ' + movimientos.length);
const m = movimientos[0] || {};
ok('el movimiento es una SALIDA por el total', m.tipo === 'salida' && m.monto === 1500, JSON.stringify(m));
ok('sale de la cuenta elegida', String(m.cuentaId) === '4', 'cuenta=' + m.cuentaId);
ok('lleva beneficiario (para que se genere la póliza)', m.beneficiario === 'PROVEEDOR X', 'benef=' + m.beneficiario);
ok('queda categorizado como pago a proveedor', m.categoria === 'proveedor' && m.origen === 'pago_proveedor');
ok('el abono guardado lleva la cuenta', pagosGuardados[0] && pagosGuardados[0].pago.cuentaBancoId === '4');

console.log('\n═══ CRÉDITO → no toca el banco ═══');
correr({ 'fp-pago': 'credito', 'fp-dias': '30', 'fp-fecha': '2026-08-19', 'fp-doc': 'FACT-200', 'fp-cuenta': '4' });
ok('no registra ningún movimiento de banco', movimientos.length === 0, 'fueron ' + movimientos.length);
ok('no guarda pago de contado', pagosGuardados.length === 0);

console.log('\n═══ CONTADO SIN CUENTA → guarda el pago, no toca el banco ═══');
correr({ 'fp-pago': 'contado', 'fp-dias': '0', 'fp-fecha': '2026-08-19', 'fp-doc': 'FACT-300', 'fp-cuenta': '' });
ok('no registra movimiento de banco', movimientos.length === 0, 'fueron ' + movimientos.length);
ok('igual guarda el pago de contado', pagosGuardados.length === 1);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
