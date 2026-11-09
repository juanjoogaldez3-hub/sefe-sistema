// ============================================================
//  SEFE · test-multiempresa-blindaje.js
//  Que NINGÚN registro caiga en la empresa equivocada
// ============================================================
//  Cómo se corre:   node test-multiempresa-blindaje.js
//  No instala nada ni se conecta a internet.
//
//  POR QUÉ EXISTE
//  Era un error RECURRENTE: un registro de LAML terminaba guardado
//  en SEFE. Dos causas:
//    1) un desplegable que se armaba una sola vez (al entrar) y no se
//       volvía a armar al cambiar de empresa → se elegía un "padre"
//       de la otra empresa;
//    2) el guardado ponía `empresa: X.empresa || 'SEFE'`, así que si
//       algún camino olvidaba poner la empresa, caía en SEFE.
//
//  Blindaje (lo que esta prueba cuida que NO se rompa):
//    · db.js deriva la empresa del PADRE (cliente, proveedor, cuenta,
//      documento, compra) buscándolo por id. Nunca cae en SEFE por
//      defecto si el padre se puede resolver.
//    · el desplegable de proveedor de "Nueva compra" se reconstruye
//      cada vez que se dibuja el formulario (no queda cacheado).
//
//  A DIFERENCIA de las otras pruebas, ésta lee los ARCHIVOS REALES
//  (db.js, js/app-*.js), no el snapshot test-fuente.js, así siempre
//  refleja el código que está publicado.
// ============================================================
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || 'no se cumplió'))); if (!c) fallos++; };

const db = read('db.js');
const app6 = read('js/app-6.js');

console.log('\n═══ db.js · helpers centrales de empresa ═══');
ok('existe _empPorId(arr,id)', /function _empPorId\(arr,\s*id\)\{/.test(db));
ok('empresaDeCliente busca en clientes', /function empresaDeCliente\(id\)\{\s*return _empPorId\(typeof clientes/.test(db));
ok('empresaDeProveedor busca en proveedores', /function empresaDeProveedor\(id\)\{\s*return _empPorId\(typeof proveedores/.test(db));
ok('empresaDeCuenta busca en cuentasBanco', /function empresaDeCuenta\(id\)\{\s*return _empPorId\(typeof cuentasBanco/.test(db));
ok('empresaDeDocumento busca en documentos', /function empresaDeDocumento\(id\)\{\s*return _empPorId\(typeof documentos/.test(db));
ok('empresaDeCompra busca en compras', /function empresaDeCompra\(id\)\{\s*return _empPorId\(typeof compras/.test(db));

console.log('\n═══ db.js · cada registro hereda la empresa de su padre ═══');
ok('documento ← cliente', /guardarDocumento\(d\)\{[\s\S]{0,200}?d\.empresa\s*=\s*empresaDeCliente\(d\.clienteId\)/.test(db));
ok('cotización ← cliente', /cot\.empresa=empresaDeCliente\(cot\.clienteId\)/.test(db));
ok('compra ← proveedor', /guardarCompra\(c\)\{[\s\S]{0,160}?c\.empresa\s*=\s*empresaDeProveedor\(c\.proveedorId\)/.test(db));
ok('pago a proveedor ← compra', /guardarPagoProveedor\(compraId,\s*pago\)\{[\s\S]{0,160}?pago\.empresa\s*=\s*empresaDeCompra\(compraId\)/.test(db));
ok('abono ← documento', /guardarAbono\(documentoId,\s*ab\)\{[\s\S]{0,160}?ab\.empresa\s*=\s*empresaDeDocumento\(documentoId\)/.test(db));
ok('cobro en ruta ← documento', /guardarCobroRuta\(c\)\{[\s\S]{0,160}?c\.empresa\s*=\s*empresaDeDocumento\(c\.docId\)/.test(db));
ok('saldo a favor ← cliente', /cr\.empresa=empresaDeCliente\(cr\.clienteId\)/.test(db));
ok('movimiento de banco ← cuenta', /m\.empresa=empresaDeCuenta\(m\.cuentaId\)/.test(db));

console.log('\n═══ app-6.js · desplegable de proveedor no queda cacheado ═══');
ok('renderCompraForm reconstruye #co-prov por empresa',
   /function renderCompraForm\(\)\{[\s\S]*?\$\('#co-prov'\)\.innerHTML=_provsEmp\.map/.test(app6));
ok('usa deEmpresa(proveedores) para ese desplegable',
   /const _provsEmp=\(typeof deEmpresa==='function'\)\?deEmpresa\(proveedores\):proveedores;/.test(app6));
ok('conserva el proveedor elegido si sigue siendo válido',
   /_provsEmp\.some\(p=>String\(p\.id\)===String\(_selProv\)\)/.test(app6));
ok('guarda contra crear compra sin proveedor',
   /if\(!prov\)\{toast\('✗ Elegí un proveedor'/.test(app6));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
