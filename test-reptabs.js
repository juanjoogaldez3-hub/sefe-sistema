// ============================================================
//  SEFE · test-reptabs.js — CADA REPORTE TIENE SU PESTAÑA
// ============================================================
//  Cómo se corre:   node test-reptabs.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Las pestañas de reporte (los <button class="ct-tab" data-r="X">) están en
//  index.html, y la lista de tipos en REP_TIPOS (js). Si se agrega un reporte a
//  REP_TIPOS pero se olvida la pestaña, el reporte "no sale" en la pantalla
//  (le pasó al Movimiento de inventario). Esta prueba verifica que todo tipo de
//  REP_TIPOS tenga su pestaña y que no haya pestañas huérfanas.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// REP_TIPOS desde el código
const mTipos = src.match(/const REP_TIPOS=\[([^\]]*)\]/);
if (!mTipos) { console.log('✗ no se encontró REP_TIPOS'); process.exit(1); }
const tipos = (mTipos[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ''));

// Pestañas desde index.html
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const tabs = (html.match(/data-r="([a-zA-Z]+)"/g) || []).map(s => s.replace(/data-r="([a-zA-Z]+)"/, '$1'));
const setTabs = new Set(tabs);
const setTipos = new Set(tipos);

console.log('\n═══ ' + tipos.length + ' tipos en REP_TIPOS · ' + tabs.length + ' pestañas en index.html ═══');

const sinPestana = tipos.filter(t => !setTabs.has(t));
ok('todo reporte de REP_TIPOS tiene su pestaña', sinPestana.length === 0, 'faltan: ' + sinPestana.join(', '));

const huerfanas = tabs.filter(t => !setTipos.has(t));
ok('no hay pestañas huérfanas (sin repType)', huerfanas.length === 0, 'sobran: ' + huerfanas.join(', '));

ok('el reporte "invmov" está en REP_TIPOS', setTipos.has('invmov'));
ok('el reporte "invmov" tiene su pestaña', setTabs.has('invmov'));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
