// ============================================================
//  SEFE · test-dashboard-mejoras.js — KPIs clicables + comparativo,
//  mini-gráfico de ventas y panel "Despachos de hoy"
// ============================================================
//  Cómo se corre:   node test-dashboard-mejoras.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ KPIs clicables + comparativo ═══');
ok('los KPIs se vuelven clicables (kpi-click + go)', /class="kpi\$\{x\.view\?' kpi-click'/.test(src) && /onclick="go\('\$\{x\.view\}'\)"/.test(src));
ok('varios KPIs llevan a su sección (view)', /sub:'sin facturar',view:'documentos'/.test(src) && /val:money\(porCobrar\),sub:[^}]*view:'cobros'/.test(src));
ok('existe el comparativo _cmp (▲▼ %)', /const _cmp=\(act,ant\)=>/.test(src) && /▲/.test(src) && /▼/.test(src));
ok('calcula ventas y cobros del mes pasado al mismo día', /const ventasMesAnt=/.test(src) && /let cobradoMesAnt=0/.test(src) && /mesAntFin/.test(src));
ok('el KPI de ventas y el de cobrado muestran comparativo', /cmp:_cmp\(ventasMes,ventasMesAnt\)/.test(src) && /cmp:_cmp\(cobradoMes,cobradoMesAnt\)/.test(src));
ok('el render pinta el comparativo junto al KPI', /\$\{x\.cmp\?x\.cmp\+' · ':''\}\$\{x\.sub\}/.test(src));

console.log('\n═══ Mini-gráfico de ventas (6 meses) ═══');
ok('panel en el HTML (#panel-bloque-ventas6 / #panel-ventas6)', /id="panel-bloque-ventas6"/.test(html) && /id="panel-ventas6"/.test(html));
ok('arma las barras de 6 meses', /panel-ventas6'\)\.innerHTML=`<div class="v6-chart">/.test(src) && /for\(let k=5;k>=0;k--\)/.test(src));
ok('registrado como panel movible y widget', /id:'panel-bloque-ventas6'/.test(src) && /key:'panel_ventas6'/.test(src));

console.log('\n═══ Panel Despachos de hoy ═══');
ok('panel en el HTML (#panel-bloque-desphoy / #panel-desphoy)', /id="panel-bloque-desphoy"/.test(html) && /id="panel-desphoy"/.test(html));
ok('cuenta sin asignar / en ruta / entregadas hoy', /docsDespachables\(\)/.test(src) && /_est\(d\)==='sin'/.test(src) && /_est\(d\)==='ruta'/.test(src));
ok('gated por permiso de despachos', /tienePermiso\('despachos'\)/.test(src));
ok('registrado como panel movible y widget', /id:'panel-bloque-desphoy'/.test(src) && /key:'panel_desphoy'/.test(src));

console.log('\n═══ Alertas compactas (no abultadas) ═══');
ok('la alerta de sin-stock resume con "y N más" (_listaCorta)', /_listaCorta\(sinStock\.map\(p=>p\.nombre\),3\)/.test(src) && /const _listaCorta=/.test(src));
ok('cada alerta va en una sola línea (.alert-msg)', /<span class="alert-msg"/.test(src));
(() => {
  const i = src.indexOf('const _listaCorta=(arr,n=3)=>');
  const j = src.indexOf('\n', i); // es una sola línea
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src.slice(i, j) + ';globalThis.__l=_listaCorta;', ctx);
  const l = ctx.__l;
  ok('lista corta: 5 ítems → 3 + "y 2 más"', l(['A', 'B', 'C', 'D', 'E'], 3) === 'A, B, C y 2 más', l(['A', 'B', 'C', 'D', 'E'], 3));
  ok('lista corta: 2 ítems → sin resumen', l(['A', 'B'], 3) === 'A, B', l(['A', 'B'], 3));
})();

console.log('\n═══ Formato compacto _kMoney ═══');
(() => {
  const i = src.indexOf('function _kMoney(n){');
  const j = src.indexOf('\n', i);
  const ctx = { Number, Math };
  vm.createContext(ctx);
  vm.runInContext(src.slice(i, j) + ';globalThis.__k=_kMoney;', ctx);
  const k = ctx.__k;
  ok('80000 → Q80k', k(80000) === 'Q80k', k(80000));
  ok('1200 → Q1.2k', k(1200) === 'Q1.2k', k(1200));
  ok('950 → Q950', k(950) === 'Q950', k(950));
  ok('0 → Q0', k(0) === 'Q0', k(0));
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
