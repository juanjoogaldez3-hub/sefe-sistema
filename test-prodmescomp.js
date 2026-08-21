// ============================================================
//  SEFE · test-prodmescomp.js — COMPARATIVA PRODUCTO/MES
// ============================================================
//  Cómo se corre:   node test-prodmescomp.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El reporte agrupa por PRODUCTO, con los meses en columnas, y muestra
//  monto (Q) o cantidad según el botón. Las facturas históricas sin líneas
//  no aportan productos. Esta prueba extrae el bloque real del reporte de
//  index.html (hasta armar 'filas') y lo corre con fecha fija.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ancla = src.indexOf("repType==='prodmescomp'){");
const ini = src.indexOf("const _esCant=(repFiltros.prodMetrica==='cantidad');", ancla);
const finMarca = 'const filas=Object.values(porProd).sort((a,b)=>b.total-a.total);';
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
  vm.runInContext(bloque + '\n;globalThis.__out={porProd,meses,filas};', ctx);
  return ctx.__out;
}

const docs = [
  // Agosto CON líneas
  { estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 1, creada: '2026-08-15T12:00:00',
    items: [ { id: 5, codigo: 'X5', nombre: 'PROD X', cantidad: 2, precio: 100 },
             { id: 6, codigo: 'Y6', nombre: 'PROD Y', cantidad: 1, precio: 50 } ] },
  // Julio histórica SIN líneas → no aporta productos
  { estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 1, creada: '2026-07-15T12:00:00', items: [] },
];

console.log('\n═══ Por MONTO (Q) ═══');
let o = correr(docs, { prodMetrica: 'monto' });
ok('PROD X en agosto = 200 (2×100)', (o.porProd['#5'].meses['2026-08'] || 0) === 200, JSON.stringify(o.porProd['#5']));
ok('PROD Y en agosto = 50', (o.porProd['#6'].meses['2026-08'] || 0) === 50);
ok('la histórica sin líneas no crea productos', Object.keys(o.porProd).length === 2);
ok('agosto es columna', o.meses.includes('2026-08'));
ok('julio también (comparativa)', o.meses.includes('2026-07'));

console.log('\n═══ Por CANTIDAD ═══');
o = correr(docs, { prodMetrica: 'cantidad' });
ok('PROD X cantidad agosto = 2', (o.porProd['#5'].meses['2026-08'] || 0) === 2, JSON.stringify(o.porProd['#5']));
ok('PROD Y cantidad agosto = 1', (o.porProd['#6'].meses['2026-08'] || 0) === 1);

console.log('\n═══ Filtro por cliente ═══');
const docs2 = docs.concat([{ estado: 'certificada', tipoDoc: 'cambiaria', clienteId: 2, creada: '2026-08-16T12:00:00',
  items: [ { id: 5, codigo: 'X5', nombre: 'PROD X', cantidad: 10, precio: 100 } ] }]);
o = correr(docs2, { prodMetrica: 'cantidad', cliente: '1' });
ok('con cliente=1, PROD X cantidad = 2 (no cuenta al cliente 2)', (o.porProd['#5'].meses['2026-08'] || 0) === 2, JSON.stringify(o.porProd['#5']));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
