// ============================================================
//  SEFE · test-cotconvertir.js — CONVERTIR COTIZACIÓN A PEDIDO
// ============================================================
//  Cómo se corre:   node test-cotconvertir.js
//
//  Al pasar una cotización a pedido no debe crearse un pedido SIN productos.
//  El candado ahora exige líneas con cantidad real (>0), no solo que el
//  arreglo tenga longitud. Esta prueba fija esa lógica y el cableado.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Lógica del candado (líneas con cantidad > 0) ═══');
// Misma regla que usa convertirCotizacionAPedido.
const lineasVal = items => (Array.isArray(items) ? items : []).filter(it => it && it.id != null && Number(it.cantidad) > 0);
ok('cotización sin items → 0 líneas (bloquea)', lineasVal(undefined).length === 0 && lineasVal([]).length === 0);
ok('items con cantidad 0 → 0 líneas (bloquea)', lineasVal([{ id: 1, cantidad: 0 }, { id: 2, cantidad: 0 }]).length === 0);
ok('items nulos o sin id → se descartan', lineasVal([null, { cantidad: 3 }, { id: 5 }]).length === 0);
ok('items válidos con cantidad > 0 → pasan', lineasVal([{ id: 1, cantidad: 2 }, { id: 2, cantidad: 0 }, { id: 3, cantidad: 1 }]).length === 2);

console.log('\n═══ Cableado ═══');
const fn = src.slice(src.indexOf('function convertirCotizacionAPedido('), src.indexOf('window.convertirCotizacionAPedido='));
ok('el candado filtra por cantidad > 0 (no solo .length)', /lineasVal=\(Array\.isArray\(c\.items\)\?c\.items:\[\]\)\.filter\(it=>it&&it\.id!=null&&Number\(it\.cantidad\)>0\)/.test(fn));
ok('avisa "Sin productos" y corta si no hay líneas válidas', /if\(!lineasVal\.length\)\{toast\('Sin productos'/.test(fn));
ok('el pedido se arma con las líneas válidas (no con c.items crudo)', /const items=lineasVal\.map\(/.test(fn) && !/const items=\(c\.items\|\|\[\]\)\.map\(/.test(fn));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
