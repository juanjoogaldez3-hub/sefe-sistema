// ============================================================
//  SEFE · test-costohist.js — COSTO POR DOCUMENTO (costoDoc)
// ============================================================
//  Cómo se corre:   node test-costohist.js
//  No necesita instalar nada ni conectarse a internet.
//
//  costoDoc(d) es lo que usan los reportes de Costos vs Ventas:
//   · Si la factura tiene líneas → suma el costo por línea (costo del mes).
//   · Si NO tiene líneas (histórico importado sólo con el total) → usa el
//     costo histórico guardado en la factura (costoHistorico).
//  Extrae la cadena real de funciones de costo de index.html.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function costoPromedioRango(pid,desde,hasta){');
const finMarca = 'return Number(d.costoHistorico)||0;\n}';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró la cadena de costo'); process.exit(1); }
const bloque = src.slice(ini, fin + finMarca.length);

const ctx = { Number, Date, Math, productos: [], compras: [] };
vm.createContext(ctx);
vm.runInContext(bloque + '\n;globalThis.__f=costoDoc;', ctx);
const costoDoc = ctx.__f;

console.log('\n═══ Factura SIN líneas (histórica) ═══');
ok('usa el costo histórico guardado', costoDoc({ creada: '2026-03-15', items: [], costoHistorico: 480.50 }) === 480.50);
ok('sin costo histórico → 0', costoDoc({ creada: '2026-03-15', items: [] }) === 0);
ok('items ausente → 0 (no revienta)', costoDoc({ creada: '2026-03-15' }) === 0);

console.log('\n═══ Factura CON líneas (calcula por producto) ═══');
ctx.productos = [{ id: 5, codigo: 'X5', costo: 10, tipoEmpaque: 'unidad' }];
ctx.compras = []; // sin compras → cae al costo manual del producto
const conLinea = { creada: '2026-08-15', items: [{ id: 5, codigo: 'X5', cantidad: 3, modoVenta: 'unidad' }], costoHistorico: 9999 };
ok('suma el costo por línea (10 × 3 = 30)', costoDoc(conLinea) === 30, 'dio ' + costoDoc(conLinea));
ok('IGNORA el costoHistorico si hay líneas', costoDoc(conLinea) !== 9999);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
