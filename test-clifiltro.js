// ============================================================
//  SEFE · test-clifiltro.js — FILTRO POR VENDEDOR EN CLIENTES
// ============================================================
//  Cómo se corre:   node test-clifiltro.js
//
//  El catálogo de clientes tiene un filtro por vendedor (default: Todos),
//  visible solo para roles que ven todos los clientes. Esta prueba fija el
//  cableado y la lógica del filtrado.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Cableado ═══');
ok('existe la variable y el setter del filtro (default vacío = Todos)', /let _cliFiltroVend='';/.test(src) && /function _cliSetFiltroVend\(v\)/.test(src) && /window\._cliSetFiltroVend=/.test(src));
ok('el select se muestra solo si NO es rol ventas', /if\(!esVentas\(\)\)\{[\s\S]*?id="cli-filtro-vend"/.test(src));
ok('la opción por defecto es "Todos los vendedores"', /<option value="">Todos los vendedores<\/option>/.test(src));
ok('aplica el filtro a la lista (por vendedorId, o "sin asignar")', /_cliFiltroVend==='none'\)\?listaBase\.filter\(c=>c\.vendedorId==null\):listaBase\.filter\(c=>String\(c\.vendedorId\)===String\(_cliFiltroVend\)\)/.test(src));

console.log('\n═══ Lógica del filtro ═══');
const clientes = [
  { id: 1, vendedorId: 7 }, { id: 2, vendedorId: 7 }, { id: 3, vendedorId: 9 }, { id: 4, vendedorId: null },
];
const filtrar = (f) => f ? (f === 'none' ? clientes.filter(c => c.vendedorId == null) : clientes.filter(c => String(c.vendedorId) === String(f))) : clientes;
ok('vacío → todos', filtrar('').length === 4);
ok('un vendedor → solo los suyos', filtrar('7').length === 2 && filtrar('9').length === 1);
ok('"none" → los sin vendedor', filtrar('none').length === 1 && filtrar('none')[0].id === 4);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
