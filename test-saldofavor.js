// ============================================================
//  SEFE · test-saldofavor.js — SALDO A FAVOR DEL CLIENTE
// ============================================================
//  Cómo se corre:   node test-saldofavor.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El saldo a favor de un cliente = lo que ENTRÓ de crédito
//  ('ingreso', por sobrepago/anticipo) menos lo que ya se APLICÓ
//  ('aplicacion'), sin contar los anulados, y sólo de ESE cliente.
//  Esta prueba carga la función real saldoFavor de index.html.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function saldoFavor(clienteId){');
const fin = src.indexOf('window.saldoFavor=saldoFavor;', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró saldoFavor'); process.exit(1); }
const fnSrc = src.slice(ini, fin);

const ctx = { Number, Math, creditosCliente: [] };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=saldoFavor;', ctx);
const saldoFavor = ctx.__f;

function set(arr) { ctx.creditosCliente = arr; }

console.log('\n═══ Suma ingresos menos aplicaciones ═══');
set([
  { clienteId: 10, tipo: 'ingreso', monto: 100 },
  { clienteId: 10, tipo: 'ingreso', monto: 50 },
  { clienteId: 10, tipo: 'aplicacion', monto: 30 },
]);
ok('100 + 50 − 30 = 120', saldoFavor(10) === 120, 'dio ' + saldoFavor(10));

console.log('\n═══ Ignora anulados ═══');
set([
  { clienteId: 10, tipo: 'ingreso', monto: 100 },
  { clienteId: 10, tipo: 'ingreso', monto: 999, anulado: true },
]);
ok('el ingreso anulado no cuenta', saldoFavor(10) === 100, 'dio ' + saldoFavor(10));

console.log('\n═══ Separa por cliente ═══');
set([
  { clienteId: 10, tipo: 'ingreso', monto: 100 },
  { clienteId: 20, tipo: 'ingreso', monto: 70 },
]);
ok('cliente 10 = 100', saldoFavor(10) === 100);
ok('cliente 20 = 70', saldoFavor(20) === 70);
ok('cliente sin créditos = 0', saldoFavor(30) === 0);

console.log('\n═══ Bordes ═══');
set([{ clienteId: 10, tipo: 'aplicacion', monto: 40 }]);
ok('sólo aplicaciones → negativo (crédito sobregirado se ve)', saldoFavor(10) === -40, 'dio ' + saldoFavor(10));
set([]);
ok('sin datos = 0', saldoFavor(10) === 0);
ok('clienteId nulo = 0', saldoFavor(null) === 0);
set([{ clienteId: 10, tipo: 'ingreso', monto: 33.33 }, { clienteId: 10, tipo: 'aplicacion', monto: 11.11 }]);
ok('redondeo a 2 decimales', saldoFavor(10) === 22.22, 'dio ' + saldoFavor(10));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
