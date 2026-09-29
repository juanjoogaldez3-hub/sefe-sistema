// ============================================================
//  SEFE · test-multiempresa-fase1.js — FASE 1: selector + filtrado
// ============================================================
//  Cómo se corre:   node test-multiempresa-fase1.js
//
//  Qué cuida: el selector de empresa, el filtrado de las vistas
//  separadas por empresa activa, la etiqueta por fila en las vistas
//  compartidas, y que al CREAR un registro se le marque su empresa
//  (tanto en la app como en el guardado de db.js).
// ============================================================
const fs   = require('fs');
const vm   = require('vm');
const src  = require('./test-fuente');
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const css  = fs.readFileSync(__dirname + '/css/estilos.css', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Helpers de estado (app) ═══');
ok('deEmpresa(arr) existe', /function deEmpresa\(arr\)\{/.test(src));
ok('empresaParaNuevo() existe', /function empresaParaNuevo\(\)\{ return empresaActiva\|\|'SEFE'; \}/.test(src));
ok('iniciarEmpresaActiva() lee del navegador', /function iniciarEmpresaActiva\(\)\{[\s\S]*?localStorage\.getItem\(EMPRESA_KEY\)/.test(src));
ok('cambiarEmpresa() recuerda y re-dibuja', /function cambiarEmpresa\(codigo\)\{[\s\S]*?localStorage\.setItem\(EMPRESA_KEY,codigo\)[\s\S]*?go\(v\)/.test(src));
ok('renderSelectorEmpresa() se esconde con una sola empresa', /function renderSelectorEmpresa\(\)\{[\s\S]*?if\(!haymultiempresa\(\)\)\{[\s\S]*?display='none'/.test(src));
ok('empTag() para vistas compartidas', /function empTag\(codigo\)\{[\s\S]*?if\(!haymultiempresa\(\)\) return '';/.test(src));

console.log('\n═══ deEmpresa: funciona de verdad ═══');
(function(){
  // Extraer deEmpresa + empresaParaNuevo y correrlas con un empresaActiva controlado.
  const iniD = src.indexOf('function deEmpresa(arr){');
  const finD = src.indexOf('\n}', iniD) + 2;
  const iniN = src.indexOf('function empresaParaNuevo(){');
  const finN = src.indexOf('\n', iniN);
  const ctx = { empresaActiva:null };
  vm.createContext(ctx);
  vm.runInContext(src.slice(iniD,finD) + '\n' + src.slice(iniN,finN) + '\nthis.deEmpresa=deEmpresa;this.empresaParaNuevo=empresaParaNuevo;', ctx);
  const datos = [{id:1,empresa:'SEFE'},{id:2,empresa:'LAML'},{id:3},{id:4,empresa:'SEFE'}];
  ctx.empresaActiva=null;
  ok('sin empresa activa → devuelve todo', ctx.deEmpresa(datos).length===4);
  ctx.empresaActiva='SEFE';
  const s=ctx.deEmpresa(datos);
  ok('SEFE → 3 filas (incluye la que no trae empresa)', s.length===3 && s.every(x=>[1,3,4].includes(x.id)));
  ok('empresaParaNuevo() = SEFE cuando SEFE activa', ctx.empresaParaNuevo()==='SEFE');
  ctx.empresaActiva='LAML';
  ok('LAML → solo la fila de LAML', ctx.deEmpresa(datos).length===1 && ctx.deEmpresa(datos)[0].id===2);
})();

console.log('\n═══ Vistas separadas: filtradas por empresa activa ═══');
[
  ['inventario (renderProd)',        /const _prods=deEmpresa\(productos\);/],
  ['clientes (renderCli)',           /const _clis=deEmpresa\(clientes\);/],
  ['documentos (renderDocs)',        /let filtrados=deEmpresa\(documentos\)\.filter\(docsEnRango\)/],
  ['cobros (renderCobros)',          /const ars=deEmpresa\(documentos\)\.filter\(d=>d\.tipoDoc==='cambiaria'/],
  ['cotizaciones (renderCotizaciones)', /const base=deEmpresa\(cotVisibles\(\)\)/],
  ['compras (renderCompras)',        /const filtradas=deEmpresa\(compras\)\.filter/],
  ['proveedores (renderProveedores)',/deEmpresa\(proveedores\)\.slice\(\)\.reverse\(\)/],
  ['por pagar (renderPorPagar)',     /const todas=deEmpresa\(compras\)\.map/],
  ['bancos: cuentas',                /const lista=deEmpresa\(cuentasBanco\)\.filter/],
  ['bancos: movimientos',            /let movs=deEmpresa\(movimientosBanco\)\.filter/],
  ['dashboard: alias filtrados',     /const _docs=deEmpresa\(documentos\), _prods=deEmpresa\(productos\), _comps=deEmpresa\(compras\), _clis=deEmpresa\(clientes\);/],
].forEach(([n,re]) => ok(n, re.test(src)));

console.log('\n═══ Vista compartida (despachos): etiqueta por fila ═══');
ok('despachos muestra empTag(d.empresa)', /\$\{empTag\(d\.empresa\)\}/.test(src));

console.log('\n═══ Escritura (app): el registro nuevo nace con su empresa ═══');
[
  ['pedido',        /nombreFacturado:_nitPed\.nombre,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['cliente',       /precios:\{\},empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['sede',          /empresa:padre\.empresa\|\|empresaParaNuevo\(\),_nuevo:true/],
  ['producto',      /activo:true,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['cotización',    /convertidoPedidoId:null,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['compra (parcial)', /oficializada:false,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['compra (normal)',  /oficializada:false,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['proveedor',     /const nuevoProv=\{id:provN\+\+,\.\.\.datos,empresa:empresaParaNuevo\(\),_nuevo:true\}/],
  ['cuenta banco',  /activo:true,empresa:empresaParaNuevo\(\),_nuevo:true/],
  ['movimiento banco hereda de la cuenta', /empresa:\(_ctaMov&&_ctaMov\.empresa\)\|\|empresaParaNuevo\(\),_nuevo:true/],
  ['factura→pedido hereda el origen', /origenAnulacionId:f\.id,empresa:f\.empresa\|\|empresaParaNuevo\(\),_nuevo:true/],
  ['nota de crédito hereda el origen', /creadoPor:currentUser,empresa:f\.empresa\|\|empresaParaNuevo\(\),_nuevo:true/],
  ['abono hereda del documento',    /cuentaBancoId:_cta,empresa:f\.empresa\|\|empresaParaNuevo\(\)/],
  ['cobro en ruta hereda del documento', /estado:'cobrado',empresa:d\.empresa\|\|empresaParaNuevo\(\),_nuevo:true/],
].forEach(([n,re]) => ok(n, re.test(src)));

console.log('\n═══ Escritura (db.js): la columna empresa viaja al guardar ═══');
[
  ['guardarCliente',        /function guardarCliente[\s\S]*?empresa:cli\.empresa\|\|'SEFE'/],
  ['guardarDocumento',      /function guardarDocumento[\s\S]*?empresa:d\.empresa\|\|'SEFE'/],
  ['guardarAbono',          /function guardarAbono[\s\S]*?empresa:ab\.empresa\|\|'SEFE'/],
  ['guardarCobroRuta',      /function guardarCobroRuta[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['guardarCompra',         /function guardarCompra[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['guardarProducto',       /function guardarProducto[\s\S]*?empresa:p\.empresa\|\|'SEFE'/],
  ['guardarCotizacion',     /convertido_pedido_id:cot\.convertidoPedidoId\|\|null,\s*empresa:cot\.empresa\|\|'SEFE'/],
  ['guardarProveedor',      /function guardarProveedor[\s\S]*?empresa:pr\.empresa\|\|'SEFE'/],
  ['guardarCuentaBanco',    /function guardarCuentaBanco[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['guardarMovimientoBanco',/function guardarMovimientoBanco[\s\S]*?empresa:m\.empresa\|\|'SEFE'/],
  ['guardarCredito',        /function guardarCredito[\s\S]*?empresa:cr\.empresa\|\|'SEFE'/],
  ['guardarAmbServicio',    /function guardarAmbServicio[\s\S]*?empresa:s\.empresa\|\|'SEFE'/],
].forEach(([n,re]) => ok(n, re.test(dbjs)));

console.log('\n═══ Candado: no facturar otra empresa antes de Fase 2 ═══');
ok('empresaPuedeFacturar() solo permite SEFE por ahora', /function empresaPuedeFacturar\(codigo\)\{ return \(codigo\|\|'SEFE'\)==='SEFE'; \}/.test(src));
ok('facturarPedido tiene el candado', /if\(!empresaPuedeFacturar\(f\.empresa\)\)\{[\s\S]*?Facturación no disponible/.test(src));
ok('facturarPedidoExento tiene el candado', (src.match(/if\(!empresaPuedeFacturar\(f\.empresa\)\)/g)||[]).length>=2);

console.log('\n═══ UI: contenedor del selector + estilos ═══');
ok('index.html tiene el contenedor del selector', /id="sel-empresa-cont"/.test(html));
ok('entrarVistaInicial inicializa el selector', /iniciarEmpresaActiva\(\); if\(typeof renderSelectorEmpresa==='function'\)renderSelectorEmpresa\(\)/.test(src));
ok('CSS del selector', /\.sel-empresa\{/.test(css));
ok('CSS de la etiqueta por fila', /\.emp-tag\{/.test(css));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
