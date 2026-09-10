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

console.log('\n═══ Stock: no dejar el inventario negativo ═══');
// Misma disponibilidad que usa la conversión (por caja o por unidad).
const disp = (p, modo) => (modo === 'caja') ? (p.tipoEmpaque === 'caja' ? (Number(p.stock) || 0) : (Number(p.stockCajas) || 0)) : (Number(p.stock) || 0);
const falta = (p, modo, pide) => (Number(pide) || 0) > disp(p, modo);
ok('unidades: pide más de lo que hay → falta', falta({ tipoEmpaque: 'unidad', stock: 5 }, 'unidad', 8) === true);
ok('unidades: pide lo que hay o menos → alcanza', falta({ tipoEmpaque: 'unidad', stock: 5 }, 'unidad', 5) === false);
ok('cajas (caja_unidad): mide contra stockCajas', falta({ tipoEmpaque: 'caja_unidad', stock: 200, stockCajas: 2 }, 'caja', 3) === true && falta({ tipoEmpaque: 'caja_unidad', stock: 200, stockCajas: 5 }, 'caja', 3) === false);
ok('stock 0 → cualquier cantidad falta (raíz del bug)', falta({ tipoEmpaque: 'unidad', stock: 0 }, 'unidad', 1) === true);

console.log('\n═══ Cableado ═══');
const fn = src.slice(src.indexOf('function convertirCotizacionAPedido('), src.indexOf('window.convertirCotizacionAPedido='));
ok('el candado filtra por cantidad > 0 (no solo .length)', /lineasVal=\(Array\.isArray\(c\.items\)\?c\.items:\[\]\)\.filter\(it=>it&&it\.id!=null&&Number\(it\.cantidad\)>0\)/.test(fn));
ok('avisa "Sin productos" y corta si no hay líneas válidas', /if\(!lineasVal\.length\)\{toast\('Sin productos'/.test(fn));
ok('el pedido se arma con las líneas válidas (no con c.items crudo)', /const items=lineasVal\.map\(/.test(fn) && !/const items=\(c\.items\|\|\[\]\)\.map\(/.test(fn));
ok('valida el stock antes de convertir (junta faltantes)', /const faltantes=\[\]/.test(fn) && /if\(pide>disp\)faltantes\.push/.test(fn));
ok('si falta stock, avisa y NO convierte (bloquea antes del confirmar)', /if\(faltantes\.length\)\{[\s\S]*?Inventario insuficiente[\s\S]*?return;\s*\}[\s\S]*?confirmar\('Convertir a pedido'/.test(fn));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
