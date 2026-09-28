// ============================================================
//  SEFE · test-dashboard-layout.js — DASHBOARD PERSONALIZABLE
//  (cada usuario reordena / oculta sus paneles; se guarda en su cuenta)
// ============================================================
//  Cómo se corre:   node test-dashboard-layout.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
const fs = require('fs');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Estructura (grilla movible + herramientas) ═══');
ok('el dashboard tiene la grilla #dash-grid', /id="dash-grid"/.test(html));
ok('tiene la barra de herramientas con Personalizar y Restablecer', /onclick="toggleDashEdit\(\)"/.test(html) && /onclick="dashReset\(\)"/.test(html));
ok('los paneles son .dash-panel y hay anchos (.dash-wide)', /class="panel dash-panel"/.test(html) && /dash-panel dash-wide/.test(html));
ok('los 7 paneles están dentro de la grilla', ['panel-bloque-docs','panel-bloque-venc','panel-bloque-stock','panel-bloque-ped','panel-bloque-seguimiento','panel-bloque-miscobros','panel-bloque-amb'].every(id => new RegExp('id="' + id + '"').test(html)));

console.log('\n═══ Funciones ═══');
ok('lista de paneles movibles DASH_PANELS', /const DASH_PANELS=\[/.test(src));
ok('aplica el acomodo (reordenar + ocultar)', /function _aplicarLayoutDashboard\(\)/.test(src));
ok('modo edición + drag (drag & drop)', /function _dashEditUI\(\)/.test(src) && /function _dashWireDrag\(\)/.test(src) && /dragover/.test(src));
ok('acciones expuestas en window', /window\.toggleDashEdit=/.test(src) && /window\.dashReset=/.test(src) && /window\.dashToggleOcultar=/.test(src));
ok('renderPanel aplica el layout al final', /_aplicarLayoutDashboard\(\);\s*_dashEditUI\(\);/.test(src));

console.log('\n═══ Guardado en la cuenta (por usuario) ═══');
ok('globales del usuario (id + layout)', /let currentUserId=null;/.test(src) && /let currentDashLayout=/.test(src));
ok('se capturan al iniciar sesión', /currentUserId=u\.id/.test(src) && /currentDashLayout=\(u\.dashboardLayout/.test(src));
ok('db.js guarda el layout (guardarDashboardLayout)', /async function guardarDashboardLayout\(userId, ?layout\)/.test(dbjs) && /dashboard_layout:layout/.test(dbjs));
ok('db.js mapea dashboard_layout del usuario', /dashboardLayout:\(u\.dashboard_layout/.test(dbjs));
ok('existe la migración de la columna', fs.readdirSync(__dirname + '/supabase/migrations').some(n => /usuarios_dashboard_layout/.test(n)));

console.log('\n═══ Normalización del layout (_dashLay) ═══');
(() => {
  const i = src.indexOf('function _dashLay(){');
  const j = src.indexOf('\n', i); // es una sola línea
  const fn = src.slice(i, j);
  // null → estructura vacía válida
  let ctx = { currentDashLayout: null, Array };
  vm.createContext(ctx);
  vm.runInContext(fn + ';globalThis.__f=_dashLay;', ctx);
  const r1 = ctx.__f();
  ok('null → {order:[],hidden:[]}', Array.isArray(r1.order) && r1.order.length === 0 && Array.isArray(r1.hidden) && r1.hidden.length === 0);
  // valores corruptos → se sanean
  ctx = { currentDashLayout: { order: 'malo', hidden: ['panel-bloque-amb'] }, Array };
  vm.createContext(ctx);
  vm.runInContext(fn + ';globalThis.__f=_dashLay;', ctx);
  const r2 = ctx.__f();
  ok('order inválido se vuelve []', Array.isArray(r2.order) && r2.order.length === 0);
  ok('hidden válido se conserva', r2.hidden.length === 1 && r2.hidden[0] === 'panel-bloque-amb');
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
