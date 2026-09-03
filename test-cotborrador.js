// ============================================================
//  SEFE · test-cotborrador.js — BORRADOR AUTOMÁTICO DE COTIZACIÓN
// ============================================================
//  Cómo se corre:   node test-cotborrador.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Si la pantalla se cierra o desloguea mientras se arma una cotización, el
//  trabajo NO se debe perder: se autoguarda un borrador en el navegador y se
//  ofrece recuperarlo. Esta prueba valida (1) el guardar/leer/limpiar del
//  borrador y (2) el cableado (autosave en el carrito, limpiar al guardar,
//  aviso en la lista, aviso al entrar).
// ============================================================
const vm = require('vm');
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// ── Extraer las 3 funciones núcleo (guardar / limpiar / hay) ──
const ini = src.indexOf("const COT_BORRADOR_KEY=");
const fin = src.indexOf("function _cotRenderAviso(");
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el borrador de cotización'); process.exit(1); }
const bloque = src.slice(ini, fin);

// localStorage y document falsos.
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const campos = {};
const ctx = {
  Number, String, Math, Date, JSON, console, localStorage,
  document: { getElementById: id => (id in campos ? { value: campos[id] } : { value: '' }) },
  window: {},
  cotEditId: null, cotCart: [], cotClienteSel: null,
};
vm.createContext(ctx);
vm.runInContext(bloque + '\n;globalThis.__api={_cotGuardarBorrador,_cotLimpiarBorrador,_cotHayBorrador};', ctx);
const A = ctx.__api;

console.log('\n═══ Guardar y leer el borrador ═══');
ctx.cotCart = [{ id: 1, nombre: 'PAPEL', cantidad: 3, precio: 10 }];
ctx.cotClienteSel = { id: 77 };
campos['cot-cli-search'] = 'INTELLEGO · 123';
campos['cot-obs'] = 'entregar el viernes';
campos['cot-validez'] = '20';
A._cotGuardarBorrador();
let b = A._cotHayBorrador();
ok('guarda el borrador con el carrito', b && b.cart && b.cart.length === 1 && b.cart[0].nombre === 'PAPEL', JSON.stringify(b && b.cart));
ok('guarda el cliente seleccionado (id)', b && b.clienteId === 77, b && b.clienteId);
ok('guarda los campos (obs, validez, búsqueda de cliente)', b && b.obs === 'entregar el viernes' && b.validez === '20' && b.cliSearch === 'INTELLEGO · 123', JSON.stringify(b));
ok('guarda la marca de tiempo (ts)', b && typeof b.ts === 'number' && b.ts > 0);

console.log('\n═══ Carrito vacío → sin borrador ═══');
ctx.cotCart = [];
A._cotGuardarBorrador();
ok('con el carrito vacío no queda borrador', A._cotHayBorrador() === null);

console.log('\n═══ Editando una cotización existente → NO se guarda ═══');
ctx.cotCart = [{ id: 1, nombre: 'PAPEL', cantidad: 1, precio: 10 }];
ctx.cotEditId = 55;             // estamos editando una guardada
A._cotGuardarBorrador();
ok('no guarda borrador cuando se edita una existente', A._cotHayBorrador() === null);
ctx.cotEditId = null;

console.log('\n═══ Limpiar el borrador ═══');
ctx.cotCart = [{ id: 1, nombre: 'PAPEL', cantidad: 1, precio: 10 }];
A._cotGuardarBorrador();
ok('hay borrador antes de limpiar', A._cotHayBorrador() !== null);
A._cotLimpiarBorrador();
ok('se limpia con _cotLimpiarBorrador', A._cotHayBorrador() === null);

console.log('\n═══ Cableado ═══');
ok('index.html tiene el contenedor del aviso (#cot-borrador-aviso)', /id="cot-borrador-aviso"/.test(html));
ok('el carrito autoguarda el borrador (cotRenderCart → _cotGuardarBorrador)', /cot-total'\)[\s\S]{0,140}_cotGuardarBorrador\(\)/.test(src));
ok('al guardar la cotización se limpia el borrador', /_cotLimpiarBorrador\(\);\s*\n\s*cotEditId=null;renderCotizaciones\(\)/.test(src));
ok('la lista pinta el aviso de recuperación (_cotRenderAviso)', /_cotRenderAviso\(\)/.test(src) && /function _cotRenderAviso\(/.test(src));
ok('existen recuperar y descartar (en window)', /window\._cotRecuperarBorrador=/.test(src) && /window\._cotDescartarBorrador=/.test(src));
ok('al entrar avisa si hay una cotización sin guardar', /_cotHayBorrador\(\)\)toast\('📝 Cotización sin guardar'/.test(src));
ok('el editor autoguarda al cambiar campos (listener input/change)', /edBox\.addEventListener\('input',_g\)/.test(src) && /edBox\.addEventListener\('change',_g\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
