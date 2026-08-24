// ============================================================
//  SEFE · test-npsede.js — LA SEDE SALE AL LADO DEL NOMBRE EN LA NP
// ============================================================
//  Cómo se corre:   node test-npsede.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Grupo Gecko se maneja centralizado (sin sedes creadas). Para llevar
//  control de las Notas de préstamo se puede escribir una "sede" de
//  texto libre que sale al lado del nombre del cliente. Esta prueba
//  carga la función real notaPrestamoHTML y verifica que:
//   - con sede → aparece "NOMBRE · Sede"
//   - sin sede → aparece sólo el nombre
//   - la sede se escapa (no rompe el HTML)
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const i = src.indexOf('function notaPrestamoHTML(f){');
const j = src.indexOf('\n}', i);
if (i < 0 || j < 0) { console.log('✗ no se encontró notaPrestamoHTML'); process.exit(1); }
const fnSrc = src.slice(i, j + 2);

const ctx = {
  console, Number, String,
  clientes: [{ id: 1, nombre: 'GRUPO GECKO', direccion: 'Ciudad' }],
  fdate: () => '19-08-2026', money: n => 'Q' + n,
  SEFE_LOGO: 'x', refPed: f => 'NP-' + (f.numero || 0),
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__np=notaPrestamoHTML;', ctx);
const notaPrestamoHTML = ctx.__np;

const base = { id: 5, tipoDoc: 'prestamo', numero: 12, clienteId: 1, clienteNombre: 'GRUPO GECKO', items: [], totales: { total: 0 }, creada: '2026-08-19' };

console.log('\n═══ Con sede ═══');
let html = notaPrestamoHTML({ ...base, sede: 'Zona 10' });
ok('el nombre y la sede salen juntos', html.includes('GRUPO GECKO · Zona 10'), 'no se encontró "GRUPO GECKO · Zona 10"');

console.log('\n═══ Sin sede ═══');
html = notaPrestamoHTML({ ...base });
ok('sale el nombre', html.includes('GRUPO GECKO'));
ok('NO agrega el separador " · " del nombre', !html.includes('GRUPO GECKO · '), 'apareció un separador de más');

console.log('\n═══ La sede se escapa ═══');
html = notaPrestamoHTML({ ...base, sede: '<b>x</b>' });
ok('no inyecta HTML crudo de la sede', !html.includes('<b>x</b>') && html.includes('&lt;b&gt;'), 'la sede no se escapó');

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
