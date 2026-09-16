// ============================================================
//  SEFE · test-redondeo-sat.js — TOTALES COMO LOS CALCULA SAT
// ============================================================
//  Cómo se corre:   node test-redondeo-sat.js
//
//  SAT redondea el PRECIO UNITARIO a 2 decimales (centavos) ANTES de
//  multiplicar por la cantidad. Un precio con 3 decimales (ej. Q1.415)
//  hacía que el total de SEFE (360×1.415=509.40) no cuadrara con el
//  certificado (360×1.42=511.20). Esta prueba fija ese cálculo.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Cableado (código) ═══');
ok('existen los ayudantes _cent y _impLin', /function _cent\(n\)\{return Math\.round/.test(src) && /function _impLin\(it\)\{return _cent\(_cent\(it\.precio\)/.test(src));
ok('el total del carrito se suma con _impLin', /const total=_cent\(cart\.reduce\(\(s,it\)=>s\+_impLin\(it\)/.test(src));
ok('la fila del carrito muestra el importe SAT (_impLin)', /money\(_impLin\(it\)\)/.test(src) && /money\(_impLin\(cart\[i\]\)\)/.test(src));
ok('al guardar el pedido se redondean los precios a centavos', /const itemsPed=cart\.map\(it=>\(\{\.\.\.it,precio:_cent\(it\.precio\)\}\)\)/.test(src) && /items:itemsPed,totales/.test(src));

console.log('\n═══ El cálculo (funcional) ═══');
(() => {
  const ctx = { Math, Number }; vm.createContext(ctx);
  const i = src.indexOf('function _cent(n)');
  const j = src.indexOf('function _impLin(it)');
  const end = src.indexOf('\n', j);
  vm.runInContext(src.slice(i, end + 1) + ';globalThis.__cent=_cent;globalThis.__imp=_impLin;', ctx);
  const cent = ctx.__cent, imp = ctx.__imp;
  const round2 = n => Math.round(n * 100) / 100;

  // El caso real de la factura de Hanera
  ok('jabón: 360 × 1.415 se cobra como SAT (1.42) = 511.20', imp({ precio: 1.415, cantidad: 360, descuento: 0 }) === 511.20, 'dio ' + imp({ precio: 1.415, cantidad: 360, descuento: 0 }));
  ok('shampoo: 1 × 1011.75 = 1011.75', imp({ precio: 1011.75, cantidad: 1, descuento: 0 }) === 1011.75);
  const total = round2(imp({ precio: 1.415, cantidad: 360, descuento: 0 }) + imp({ precio: 1011.75, cantidad: 1, descuento: 0 }));
  ok('total de la factura = 1522.95 (igual que SAT)', total === 1522.95, 'dio ' + total);

  // Antes (multiplicando al precio completo) daba 1521.15 — el error que teníamos
  const viejo = round2(360 * 1.415 + 1011.75);
  ok('(control) el cálculo viejo daba 1521.15', viejo === 1521.15, 'dio ' + viejo);

  // Otros
  ok('_cent redondea a centavos (1.415 → 1.42)', cent(1.415) === 1.42);
  ok('descuento se resta después de redondear el precio', imp({ precio: 1.415, cantidad: 360, descuento: 11.20 }) === 500.00, 'dio ' + imp({ precio: 1.415, cantidad: 360, descuento: 11.20 }));
  ok('precio ya de 2 decimales no cambia (5.50 × 3 = 16.50)', imp({ precio: 5.5, cantidad: 3, descuento: 0 }) === 16.50);
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
