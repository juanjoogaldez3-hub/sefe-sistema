// ============================================================
//  SEFE · test-tooltip-barras.js — TOOLTIP EN LOS GRÁFICOS DE BARRAS
// ============================================================
//  Cómo se corre:   node test-tooltip-barras.js
//
//  Al pasar el mouse sobre una barra (reporte Vendedor "Comparativa por mes"
//  y Costos "Ventas vs costos por mes") se muestra vendedor/mes: monto.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const css = require('fs').readFileSync(__dirname + '/css/estilos.css', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Tooltip ═══');
ok('existen las funciones del tooltip', /function _barTip\(e,txt\)/.test(src) && /function _barTipHide\(\)/.test(src) && /window\._barTip=_barTip/.test(src));
ok('hay estilo para #chart-tip', /#chart-tip\{/.test(css) && /pointer-events:none/.test(css));
ok('las barras de "Comparativa por mes" tienen tooltip', /onmousemove="_barTip\(event,'\$\{_tip\}'\)"/.test(src) && /onmouseleave="_barTipHide\(\)"/.test(src));
ok('las barras de "Ventas vs costos" tienen tooltip', /_tipSafe\('Ventas · '\+m\.lbl/.test(src) && /_tipSafe\('Costo · '\+m\.lbl/.test(src));

console.log('\n═══ El texto del tooltip es seguro (sin comillas que rompan el HTML) ═══');
(() => {
  const ini = src.indexOf('function _tipSafe(s)');
  const fin = src.indexOf('window.abrirReporte=function');
  const ctx = { String }; vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=_tipSafe;', ctx);
  ok('quita comillas y backslash', ctx.__f(`O'Brien "x" \\y`) === 'O Brien  x   y');
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
