// ============================================================
//  SEFE · test-climescomporden.js — ORDEN DE LA COMPARATIVA CLIENTE/MES
// ============================================================
//  Cómo se corre:   node test-climescomporden.js
//  No necesita instalar nada ni conectarse a internet.
//
//  La Comparativa cliente/mes se puede ordenar por Total (default) o por la
//  diferencia del último mes vs. el anterior: "Más creció" (mayor alza arriba)
//  o "Más cayó" (mayor baja arriba). Esta prueba carga el bloque real de orden.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('const _difCli=info=>');
const marca = 'return b[1].total-a[1].total;';
const fin = src.indexOf('});', src.indexOf(marca));
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el bloque de orden'); process.exit(1); }
const frag = src.slice(ini, fin + 2);

// Tres clientes con distinta diferencia último mes (ago) vs. anterior (jul):
//   A: 100→300  (+200, total 400)
//   B: 500→100  (-400, total 600)
//   C:  50→ 60  (+10,  total 110)
const base = () => ({
  '#A': { meses: { '2026-07': 100, '2026-08': 300 }, total: 400, nombre: 'A' },
  '#B': { meses: { '2026-07': 500, '2026-08': 100 }, total: 600, nombre: 'B' },
  '#C': { meses: { '2026-07': 50, '2026-08': 60 }, total: 110, nombre: 'C' },
});
function ordenar(modo) {
  const ctx = { porCli: base(), ultM: '2026-08', prevM: '2026-07', hayComp: true, repFiltros: { climescompOrden: modo } };
  vm.createContext(ctx);
  vm.runInContext(frag + '\n;globalThis.__filas=filas;', ctx);
  return ctx.__filas.map(([k, v]) => v.nombre);
}

console.log('\n═══ Total (default): el que más compró arriba ═══');
ok('orden B, A, C', JSON.stringify(ordenar('total')) === JSON.stringify(['B', 'A', 'C']));
ok('vacío/indefinido = Total', JSON.stringify(ordenar('')) === JSON.stringify(['B', 'A', 'C']));

console.log('\n═══ Más creció: mayor alza (Q) arriba ═══');
ok('orden A(+200), C(+10), B(-400)', JSON.stringify(ordenar('crecio')) === JSON.stringify(['A', 'C', 'B']));

console.log('\n═══ Más cayó: mayor baja (Q) arriba ═══');
ok('orden B(-400), C(+10), A(+200)', JSON.stringify(ordenar('cayo')) === JSON.stringify(['B', 'C', 'A']));

console.log('\n═══ Sin dos meses para comparar: cae a Total ═══');
(() => {
  const ctx = { porCli: base(), ultM: '2026-08', prevM: undefined, hayComp: false, repFiltros: { climescompOrden: 'crecio' } };
  vm.createContext(ctx);
  vm.runInContext(frag + '\n;globalThis.__filas=filas;', ctx);
  ok('con hayComp=false ordena por Total', JSON.stringify(ctx.__filas.map(([, v]) => v.nombre)) === JSON.stringify(['B', 'A', 'C']));
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
