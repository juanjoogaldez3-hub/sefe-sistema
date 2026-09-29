// ============================================================
//  SEFE · test-multiempresa-fugas.js — que NO se filtre de más
// ============================================================
//  Cómo se corre:   node test-multiempresa-fugas.js
//
//  Cuida que las vistas/reportes/selectores que leen datos SEPARADOS
//  pasen por deEmpresa() (si no, "fugan" datos de una empresa en otra).
//  Barrido hecho tras detectar fugas en los reportes de banco y de
//  seguimiento de clientes.
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Reportes (app-9) ═══');
ok('reporte de banco filtra movimientos', /repType==='banco'[\s\S]*?let movs=deEmpresa\(typeof movimientosBanco/.test(src));
ok('reporte de banco filtra el saldo por cuenta', /saldoActualTotal=deEmpresa\(cuentasActivasBanco\(\)\)/.test(src));
ok('reporte facturas y abonos (factabo) filtra', /repType==='factabo'[\s\S]*?const facts=deEmpresa\(documentos\)/.test(src));

console.log('\n═══ Seguimiento de clientes ═══');
ok('_seguimientoClientes filtra', /function _seguimientoClientes[\s\S]*?deEmpresa\(clientes\)/.test(src));
ok('_seguimientosPendientes filtra', /function _seguimientosPendientes\(\)\{[\s\S]*?deEmpresa\(typeof clientes/.test(src));
ok('recordatoriosDeHoy filtra', /function recordatoriosDeHoy\(\)\{[\s\S]*?deEmpresa\(clientes\)\.forEach/.test(src));

console.log('\n═══ Selectores de formulario (no elegir cruzado) ═══');
ok('autocomplete cliente del pedido', /crearAutocomplete\('f-cli-search'[\s\S]*?deEmpresa\(clientes\)/.test(src));
ok('autocomplete producto del pedido', /crearAutocomplete\('f-add'[\s\S]*?deEmpresa\(productos\)/.test(src));
ok('cotización: cliente y producto', /cot-cli-search[\s\S]*?deEmpresa\(clientes\)/.test(src) && /crearAutocomplete\('cot-add'[\s\S]*?deEmpresa\(productos\)/.test(src));
ok('pago global: datalist de clientes', /pg-cli-list[\s\S]*?deEmpresa\(clientes\)/.test(src));
ok('nueva compra: proveedor y producto', /\$\('#co-prov'\)\.innerHTML=deEmpresa\(proveedores\)/.test(src) && /crearAutocomplete\('co-add'[\s\S]*?deEmpresa\(productos\)/.test(src));

console.log('\n═══ Inventario / trazabilidad ═══');
ok('_movsInvDespuesDe filtra documentos y compras', /deEmpresa\(documentos\)\.forEach\(d=>\{if\(d\.estado==='anulada'[\s\S]*?deEmpresa\(compras\)\.forEach\(c=>\{if\(c\.anulado\)return;if\(\(c\.fecha/.test(src));
ok('trazabilidad filtra', /function trazabilidadProducto[\s\S]*?deEmpresa\(documentos\)\.forEach[\s\S]*?deEmpresa\(compras\)\.forEach/.test(src));
ok('export de inventario filtra', /function _filasInventario\(\)\{[\s\S]*?deEmpresa\(productos\)/.test(src));
ok('filtros de reporte: clientes por empresa', /const cliOpts=deEmpresa\(clientes\)\.map/.test(src));

console.log('\n═══ Mapa y ubicación de clientes ═══');
ok('_clientesConLoc filtra', /function _clientesConLoc\(\)\{[\s\S]*?deEmpresa\(clientes\)/.test(src));
ok('_clientesUbicPendientes filtra', /function _clientesUbicPendientes\(\)\{[\s\S]*?deEmpresa\(clientes\)/.test(src));

console.log('\n═══ Módulo de cotizaciones encendido ═══');
ok('MODULOS_DESACTIVADOS vacío (cotizaciones visible)', /const MODULOS_DESACTIVADOS=\[\];/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
