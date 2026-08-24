// ============================================================
//  SEFE · test-cotmodo.js — LA COTIZACIÓN RESERVA BIEN EL STOCK
// ============================================================
//  Cómo se corre:   node test-cotmodo.js
//  No necesita instalar nada ni conectarse a internet.
//
//  La cotización usa el precio de CAJA. Si el modo de venta queda en
//  'unidad', al pasar a pedido el inventario se rebaja por unidad (1 de
//  6 = 0.17 de caja) en vez de por caja. Esta prueba carga la función
//  real cotAddProducto y verifica que un producto por caja quede con
//  modoVenta='caja', y uno por unidad con 'unidad'.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const i = src.indexOf('function cotAddProducto(pid){');
const j = src.indexOf('\nwindow.cotAddProducto=cotAddProducto;');
if (i < 0 || j < 0) { console.log('✗ no se encontró cotAddProducto'); process.exit(1); }
const fnSrc = src.slice(i, j);

const ctx = { console, Number, cotCart: [], cotClienteSel: null, cotRenderCart: () => {}, productos: [] };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__add=cotAddProducto;', ctx);
const cotAddProducto = ctx.__add;

function agregar(prod) {
  ctx.cotCart = []; ctx.productos = [prod];
  cotAddProducto(prod.id);
  return ctx.cotCart[0];
}

console.log('\n═══ Producto por caja/unidad ═══');
let it = agregar({ id: 1, codigo: 'TRK294331', nombre: 'TOALLA', precio: 485, precioUnidad: 80.83, unidad: 'UNI', tipoEmpaque: 'caja_unidad', unidadesPorCaja: 6 });
ok('se cotiza en modo CAJA', it.modoVenta === 'caja', 'quedó ' + it.modoVenta);
ok('con el precio de caja (485)', it.precio === 485, 'precio ' + it.precio);

console.log('\n═══ Producto sólo caja ═══');
it = agregar({ id: 2, codigo: 'CJ1', nombre: 'CAJA', precio: 100, unidad: 'CAJA', tipoEmpaque: 'caja', unidadesPorCaja: 12 });
ok('modo CAJA', it.modoVenta === 'caja');

console.log('\n═══ Producto por unidad ═══');
it = agregar({ id: 3, codigo: 'U1', nombre: 'SUELTO', precio: 5, unidad: 'UNI', tipoEmpaque: 'unidad' });
ok('modo UNIDAD', it.modoVenta === 'unidad', 'quedó ' + it.modoVenta);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
