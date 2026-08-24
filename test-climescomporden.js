// ============================================================
//  SEFE · test-climescomporden.js — ORDEN DE LA COMPARATIVA CLIENTE/MES
// ============================================================
//  Cómo se corre:   node test-climescomporden.js
//  No necesita instalar nada ni conectarse a internet.
//
//  La Comparativa cliente/mes se puede ordenar por Total (default) o por la
//  VARIACIÓN % del último mes vs. el anterior: "Más creció" (mayor % arriba) o
//  "Más cayó" (menor % arriba). Un cliente nuevo (sin mes anterior) cuenta como
//  +100%; uno que dejó de comprar, −100%; empate de % se rompe por monto (Q).
//  Esta prueba carga el bloque real de orden.
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

// Clientes con jul→ago pensados para distinguir % de Q y cubrir los bordes:
//   BIG:   100000→110000  (+10%,  +10.000 Q)  ← mucho dinero, poco %
//   SMALL: 100→300        (+200%, +200 Q)     ← poco dinero, mucho %
//   TB:    500→1000       (+100%, +500 Q)     ┐ empate de % …
//   TA:    100→200        (+100%, +100 Q)     ┘ … se rompe por Q
//   DROP:  1000→500       (−50%,  −500 Q)
//   GONE:  400→0          (−100%, −400 Q)     ← dejó de comprar
//   NUEVO: (sin jul)→800  (+100%, +800 Q)     ← cliente nuevo = +100%
const base = () => ({
  '#BIG':   { meses: { '2026-07': 100000, '2026-08': 110000 }, total: 210000, nombre: 'BIG' },
  '#SMALL': { meses: { '2026-07': 100, '2026-08': 300 }, total: 400, nombre: 'SMALL' },
  '#TB':    { meses: { '2026-07': 500, '2026-08': 1000 }, total: 1500, nombre: 'TB' },
  '#TA':    { meses: { '2026-07': 100, '2026-08': 200 }, total: 300, nombre: 'TA' },
  '#DROP':  { meses: { '2026-07': 1000, '2026-08': 500 }, total: 1500, nombre: 'DROP' },
  '#GONE':  { meses: { '2026-07': 400, '2026-08': 0 }, total: 400, nombre: 'GONE' },
  '#NUEVO': { meses: { '2026-08': 800 }, total: 800, nombre: 'NUEVO' },
});
function ordenar(modo, pc) {
  const ctx = { Math, porCli: pc || base(), ultM: '2026-08', prevM: '2026-07', hayComp: true, repFiltros: { climescompOrden: modo } };
  vm.createContext(ctx);
  vm.runInContext(frag + '\n;globalThis.__filas=filas;', ctx);
  return ctx.__filas.map(([k, v]) => v.nombre);
}

console.log('\n═══ Total (default): el que más compró arriba ═══');
// Totales: BIG 210000 > TB 1500 = DROP 1500 > NUEVO 800 > SMALL 400 = GONE 400 > TA 300
ok('BIG primero por total', ordenar('total')[0] === 'BIG');
ok('vacío/indefinido = Total (BIG primero)', ordenar('')[0] === 'BIG');

console.log('\n═══ Más creció: por % (no por Q) ═══');
const cre = ordenar('crecio');
ok('SMALL (+200%) va antes que BIG (+10%) — ordena por %, no por Q', cre.indexOf('SMALL') < cre.indexOf('BIG'));
ok('cliente NUEVO cuenta como +100%', cre.indexOf('NUEVO') < cre.indexOf('BIG') && cre.indexOf('SMALL') < cre.indexOf('NUEVO'));
ok('empate +100%: TB (+500 Q) antes que TA (+100 Q)', cre.indexOf('TB') < cre.indexOf('TA'));
ok('SMALL es el primero (+200%)', cre[0] === 'SMALL');
ok('GONE (−100%) es el último', cre[cre.length - 1] === 'GONE');

console.log('\n═══ Más cayó: por % ascendente ═══');
const cay = ordenar('cayo');
ok('GONE (−100%) primero', cay[0] === 'GONE');
ok('DROP (−50%) segundo', cay[1] === 'DROP');
ok('SMALL (+200%) último', cay[cay.length - 1] === 'SMALL');

console.log('\n═══ Sin dos meses para comparar: cae a Total ═══');
(() => {
  const ctx = { Math, porCli: base(), ultM: '2026-08', prevM: undefined, hayComp: false, repFiltros: { climescompOrden: 'crecio' } };
  vm.createContext(ctx);
  vm.runInContext(frag + '\n;globalThis.__filas=filas;', ctx);
  ok('con hayComp=false ordena por Total (BIG primero)', ctx.__filas.map(([, v]) => v.nombre)[0] === 'BIG');
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
