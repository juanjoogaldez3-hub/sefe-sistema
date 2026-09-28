// ============================================================
//  SEFE · test-meta-ventas.js — META DE VENTAS EN EL DASHBOARD
// ============================================================
//  Cómo se corre:   node test-meta-ventas.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
const fs = require('fs');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Cableado ═══');
ok('panel en el HTML (#panel-bloque-meta / #panel-meta)', /id="panel-bloque-meta"/.test(html) && /id="panel-meta"/.test(html));
ok('botón para definir la meta', /id="meta-edit-btn"/.test(html) && /onclick="editarMetaVentas\(\)"/.test(html));
ok('editarMetaVentas existe y en window', /function editarMetaVentas\(\)/.test(src) && /window\.editarMetaVentas=/.test(src));
ok('solo admin/gerencia puede definir la meta', /\['admin','gerencia'\]\.includes\(currentRole\)/.test(src));
ok('registrado como panel movible y widget', /id:'panel-bloque-meta'/.test(src) && /key:'panel_meta'/.test(src));
ok('el panel dibuja barra de progreso con ritmo esperado', /Ritmo esperado a hoy/.test(src) && /ventasMes\/meta\*100/.test(src));

console.log('\n═══ Datos ═══');
ok('global ajustes + helper metaVentasMes', /let ajustes=\{\};/.test(src) && /function metaVentasMes\(\)/.test(src));
ok('db.js carga ajustes en el arranque', /from\('ajustes'\)\.select/.test(dbjs) && /ajustes\[a\.clave\]=v/.test(dbjs));
ok('db.js guarda ajustes (guardarAjuste, upsert por clave)', /async function guardarAjuste\(clave, ?valor\)/.test(dbjs) && /upsert\(row,\{onConflict:'clave'\}\)/.test(dbjs));
ok('existe la migración de ajustes con RLS', fs.readdirSync(__dirname + '/supabase/migrations').some(n => /_ajustes\.sql$/.test(n)) && (() => { const m = fs.readFileSync(__dirname + '/supabase/migrations/20260928140000_ajustes.sql', 'utf8'); return /enable row level security/.test(m) && /sefe_leer/.test(m); })());

console.log('\n═══ metaVentasMes (lógica) ═══');
(() => {
  const i = src.indexOf('function metaVentasMes(){');
  const j = src.indexOf('\n', i);
  const fn = src.slice(i, j);
  const run = (aj) => { const ctx = { ajustes: aj, Number }; vm.createContext(ctx); vm.runInContext(fn + ';globalThis.__m=metaVentasMes;', ctx); return ctx.__m(); };
  ok('con meta definida devuelve el número', run({ meta_ventas_mes: 100000 }) === 100000);
  ok('sin meta devuelve 0', run({}) === 0);
  ok('valor inválido devuelve 0', run({ meta_ventas_mes: 'x' }) === 0);
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
