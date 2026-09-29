// ============================================================
//  SEFE · test-multiempresa-fase3.js — FASE 3: reportes por empresa
// ============================================================
//  Cómo se corre:   node test-multiempresa-fase3.js
//
//  Qué cuida: que el módulo de Reportes (app-9.js) agregue SOLO la
//  empresa activa, y que el reporte de ambientales también. Las
//  búsquedas por id (clientes.find / productos.find) NO se filtran.
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Reportes: la data se filtra por empresa activa ═══');
ok('ventas del período', /let ventas=deEmpresa\(documentos\)\.filter/.test(src));
ok('compras del período', /let comprasR=deEmpresa\(compras\)\.filter/.test(src));
ok('por cobrar (resumen)', /const porCobrar=deEmpresa\(documentos\)\.filter/.test(src));
ok('costos: ventas del período', /let ventasC=deEmpresa\(documentos\)\.filter/.test(src));
ok('cartera de clientes', /let clientesDir=deEmpresa\(clientes\)\.filter/.test(src));
ok('facturas (let facts)', /let facts=deEmpresa\(documentos\)\.filter/.test(src));
ok('facturas de canal (const facts)', /const facts=deEmpresa\(documentos\)\.filter/.test(src));
ok('conversiones de inventario', /deEmpresa\(productos\)\.forEach\(pp=>/.test(src));
ok('inventario valorizado (lista)', /let lista=deEmpresa\(productos\)\.filter\(p=>p\.activo!==false\)/.test(src));
ok('inventario (base)', /let base=deEmpresa\(productos\)\.filter\(p=>p\.activo!==false\)/.test(src));
ok('retenciones', /const filas=\[\];\s*\n\s*deEmpresa\(documentos\)\.forEach/.test(src));

console.log('\n═══ No queda ninguna lectura de lista sin filtrar en reportes ═══');
// El bloque de renderReportes va desde "function renderReportes" hasta el
// primer cierre de nivel raíz. Chequeamos que dentro no haya
// documentos/compras/productos/clientes .filter/.forEach/.reduce SIN deEmpresa.
(function(){
  const ini = src.indexOf('function renderReportes()');
  const fin = src.indexOf('\nfunction ', ini + 10);
  const bloque = src.slice(ini, fin>ini?fin:undefined);
  const re = /(?<!deEmpresa\()\b(documentos|compras|productos|clientes)\.(filter|forEach|reduce)\(/g;
  const malas = [];
  let m; while((m = re.exec(bloque))) malas.push(m[0]);
  ok('todas las agregaciones usan deEmpresa()', malas.length===0, 'sin filtrar: '+malas.join(', '));
})();

console.log('\n═══ Reporte de ambientales por empresa ═══');
ok('reporteAmbientalesPDF filtra', /function reporteAmbientalesPDF\(\)\{\s*\n\s*const servicios=deEmpresa\(/.test(src));
ok('_ambServiciosOrdenados (Excel) filtra', /function _ambServiciosOrdenados\(\)\{\s*\n\s*return deEmpresa\(/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
