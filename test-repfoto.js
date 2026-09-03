// ============================================================
//  SEFE · test-repfoto.js — INVENTARIO ES FOTO A UNA FECHA (sin rango)
// ============================================================
//  Cómo se corre:   node test-repfoto.js
//
//  Los reportes de inventario (actual / valorizado) son una FOTO a una fecha
//  de corte: no usan período ni rango Desde/Hasta. Tener las dos cosas a la
//  vez confundía ("¿el rango o el día?"). Ahora, en esos reportes, se oculta
//  la barra de rango y queda sólo "Existencias al día". Esta prueba verifica
//  el cableado.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ La barra de rango se puede ocultar ═══');
ok('index.html envuelve Desde/Hasta en #rep-rango', /id="rep-rango"/.test(html));
ok('existe el bloque de período #rep-period', /id="rep-period"/.test(html));

console.log('\n═══ En inventario (foto) se oculta el rango ═══');
const rf = src.slice(src.indexOf('function renderRepFilters('), src.indexOf('function renderRepFilters(') + 900);
ok('detecta los reportes de foto (invactual / invcosto)', /_esFoto=\(repType==='invactual'\|\|repType==='invcosto'\)/.test(rf), 'no detecta _esFoto');
ok('oculta el período cuando es foto', /_per\.style\.display=_esFoto\?'none':'flex'/.test(rf));
ok('oculta el rango Desde/Hasta cuando es foto', /_ran\.style\.display=_esFoto\?'none':'flex'/.test(rf));
ok('el inventario conserva su campo "Existencias al día"', /Existencias al día/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
