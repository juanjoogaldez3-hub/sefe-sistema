// ============================================================
//  SEFE · test-prodmescomp.js — COMPARATIVA PRODUCTO/MES POR CLIENTE
// ============================================================
//  Cómo se corre:   node test-prodmescomp.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El reporte agrupa por CLIENTE → PRODUCTO, con los meses en columnas, y
//  muestra monto (Q) o cantidad según el botón. Las facturas históricas sin
//  líneas no aportan productos. Esta prueba extrae el bloque real del reporte
//  de index.html (hasta armar 'grupos') y lo corre con fecha fija.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ancla = src.indexOf("repType==='prodmescomp'){");
const ini = src.indexOf("const _esCant=(repFiltros.prodMetrica==='cantidad');", ancla);
const finMarca = 'const cliOrden=Object.entries(grupos).sort((a,b)=>b[1].total-a[1].total);';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el bloque prodmescomp'); process.exit(1); }
const bloque = src.slice(ini, fin + finMarca.length);

const NOW = '2026-08-19T12:00:00';
class FakeDate extends Date { constructor(...a) { if (a.length === 0) super(NOW); else super(...a); } }
const enRango = (iso, r) => { const t = new FakeDate(iso); return t >= r.start && t <= r.end; };
const money = n => 'Q' + n;

function correr(documentos, repFiltros) {
  const r = { start: new FakeDate(0), end: new FakeDate('2999-01-01') };
  const ctx = { Number, Math, Set, Object, Date: FakeDate, enRango, money, documentos, r,
    repFiltros: Object.assign({ cliente: '', vendedor_simple: '' }, repFiltros) };
  vm.createContext(ctx);
  vm.runInContext(bloque + '\n;globalThis.__out={grupos,meses};', ctx);
  return ctx.__out;
}

const docs = [
  // Agosto CON líneas, cliente 1
  { estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 1, clienteNombre: 'CLIENTE UNO', creada: '2026-08-15T12:00:00',
    items: [ { id: 5, codigo: 'X5', nombre: 'PROD X', cantidad: 2, precio: 100 },
             { id: 6, codigo: 'Y6', nombre: 'PROD Y', cantidad: 1, precio: 50 } ] },
  // Julio histórica SIN líneas → no aporta productos
  { estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 1, clienteNombre: 'CLIENTE UNO', creada: '2026-07-15T12:00:00', items: [] },
  // Agosto cliente 2
  { estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 2, clienteNombre: 'CLIENTE DOS', creada: '2026-08-16T12:00:00',
    items: [ { id: 5, codigo: 'X5', nombre: 'PROD X', cantidad: 10, precio: 100 } ] },
];

console.log('\n═══ Agrupa por cliente → producto (MONTO) ═══');
let o = correr(docs, { prodMetrica: 'monto' });
ok('hay dos clientes', Object.keys(o.grupos).length === 2, Object.keys(o.grupos).join(','));
ok('cliente 1 tiene sus 2 productos', Object.keys(o.grupos['#1'].prods).length === 2);
ok('cliente 1 · PROD X agosto = 200', (o.grupos['#1'].prods['#5'].meses['2026-08'] || 0) === 200, JSON.stringify(o.grupos['#1'].prods['#5']));
ok('cliente 1 · total agosto = 250', (o.grupos['#1'].meses['2026-08'] || 0) === 250);
ok('el nombre del cliente queda en el grupo', o.grupos['#1'].nombre === 'CLIENTE UNO');
ok('la histórica sin líneas no crea productos en cliente 1', Object.keys(o.grupos['#1'].prods).length === 2);
ok('agosto y julio son columnas', o.meses.includes('2026-08') && o.meses.includes('2026-07'));

console.log('\n═══ Por CANTIDAD ═══');
o = correr(docs, { prodMetrica: 'cantidad' });
ok('cliente 2 · PROD X cantidad = 10', (o.grupos['#2'].prods['#5'].meses['2026-08'] || 0) === 10, JSON.stringify(o.grupos['#2'].prods['#5']));

console.log('\n═══ Filtro por cliente ═══');
o = correr(docs, { prodMetrica: 'monto', cliente: '1' });
ok('con cliente=1 sólo queda ese cliente', Object.keys(o.grupos).length === 1 && !!o.grupos['#1']);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
