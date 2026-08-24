// ============================================================
//  SEFE · test-estadoacc.js — BOTONES DE ACCIÓN EN ESTADO DE CUENTA
// ============================================================
//  Cómo se corre:   node test-estadoacc.js
//  No necesita instalar nada ni conectarse a internet.
//
//  En el Estado de cuenta del cliente, cada movimiento trae un botón de
//  acción: la factura y la nota se pueden Ver e imprimir en PDF; el abono
//  tiene "Ver abono". Esta prueba carga la función real _accMov.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('const _accMov=m=>{');
const fin = src.indexOf('\n  };', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _accMov'); process.exit(1); }
const fnSrc = src.slice(ini, fin + 4);

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=_accMov;', ctx);
const _accMov = ctx.__f;

console.log('\n═══ Factura: Ver + PDF, apuntando a la factura ═══');
let h = _accMov({ mov: 'factura', idFac: 42 });
ok('trae botón Ver', h.includes('verDoc(42)'));
ok('trae botón PDF', h.includes('descargarFacturaPDF(42)'));

console.log('\n═══ Nota de crédito: Ver + PDF, apuntando a la nota (docId) ═══');
h = _accMov({ mov: 'nota', docId: 99, idFac: 42 });
ok('Ver usa el id de la nota, no el de la factura', h.includes('verDoc(99)') && !h.includes('verDoc(42)'));
ok('PDF usa el id de la nota', h.includes('descargarFacturaPDF(99)'));

console.log('\n═══ Abono: sólo "Ver abono", apuntando a la factura ═══');
h = _accMov({ mov: 'abono', idFac: 42 });
ok('trae "Ver abono"', h.includes('Ver abono') && h.includes('openHistorialAbonos(42)'));
ok('el abono NO ofrece PDF', !h.includes('descargarFacturaPDF'));

console.log('\n═══ Movimiento sin tipo conocido: sin botones ═══');
ok('devuelve vacío', _accMov({ mov: 'otro' }) === '');

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
