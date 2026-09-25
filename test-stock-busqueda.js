// ============================================================
//  SEFE · test-stock-busqueda.js — STOCK EN EL BUSCADOR DEL PEDIDO
// ============================================================
//  Cómo se corre:   node test-stock-busqueda.js
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Buscar producto en el pedido muestra el stock ═══');
ok('el buscador (f-add) calcula y muestra el stock', /crearAutocomplete\('f-add'/.test(src) && /Sin stock/.test(src) && /'Stock: '\+st/.test(src));
ok('para caja+unidad muestra cajas y unidades', /cu\?`\$\{p\.stockCajas\|\|0\} cajas \+ \$\{p\.stock\|\|0\} und`/.test(src));
ok('marca color según haya o no existencias', /tot<=0\?'var\(--danger\)':\(tot<=5\?'var\(--warn\)':'var\(--muted\)'\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
