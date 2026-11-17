// ============================================================
//  SEFE · test-multiempresa-cruces.js — QUE NO SE CRUCEN LAS EMPRESAS
// ============================================================
//  Cómo se corre:   node test-multiempresa-cruces.js
//
//  Después de PED-2781 se revisaron TODOS los formularios con el mismo
//  patrón (estado que queda pegado al cambiar de empresa, o búsqueda por
//  nombre con clientes repetidos en las 2 empresas). Esta prueba EJECUTA la
//  lógica real (lee los .js en vivo) con el caso "SEFE, S.A." duplicado
//  (id 2264 en SEFE, id 5165 en LAML) y revisa el cableado de cada arreglo.
// ============================================================
const fs = require('fs');
const L = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
const app1 = L('js/app-1.js'), app2 = L('js/app-2.js'), app4 = L('js/app-4.js'), app5 = L('js/app-5.js'),
      app6 = L('js/app-6.js'), app7 = L('js/app-7.js'), app10 = L('js/app-10.js'), app13 = L('js/app-13.js'), db = L('db.js');
const entre = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encontré ' + a); return s.slice(i, j); };

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Datos de prueba
const clientes = [ { id: 2264, nombre: 'SEFE, S.A.', nit: '107778602', empresa: 'SEFE' }, { id: 5165, nombre: 'SEFE, S.A.', nit: '107778602', empresa: 'LAML' } ];
const productos = [ { id: 1, codigo: 'S1', nombre: 'Prod SEFE', empresa: 'SEFE' }, { id: 1597, codigo: 'ET1058', nombre: 'Servilleta LAML', empresa: 'LAML' } ];
const vendedores = [ { id: 1, nombre: 'Oficina', empresa: 'SEFE' }, { id: 9, nombre: 'Luis Menocal', empresa: 'LAML' } ];
const toasts = []; const toast = (a, b) => toasts.push(a + ' | ' + (b || ''));

console.log('\n═══ Reglas comunes (app-1.js) ═══');
const helpers = entre(app1, 'function nombreEmpresa(cod){', "if(typeof window!=='undefined'){ window.itemsDeOtraEmpresa");
const H = new Function('productos', 'vendedores', 'toast', 'empresas', helpers + ';return {itemsDeOtraEmpresa,avisarCruceEmpresa,avisarClienteOtraEmpresa,vendedorDefaultDe};')(productos, vendedores, toast, []);
ok('detecta un producto de SEFE en un documento de LAML', H.itemsDeOtraEmpresa([{ id: 1 }, { id: 1597 }], 'LAML').length === 1);
ok('no marca nada si todo es de la misma empresa', H.itemsDeOtraEmpresa([{ id: 1597 }], 'LAML').length === 0);
ok('avisarCruceEmpresa frena y avisa', H.avisarCruceEmpresa([{ id: 1, nombre: 'Prod SEFE' }], 'LAML', 'este pedido') === true && /Prod SEFE/.test(toasts.pop()));
ok('avisarClienteOtraEmpresa frena el "SEFE, S.A." de SEFE en LAML', H.avisarClienteOtraEmpresa(clientes[0], 'LAML', 'este pedido') === true && /Soluciones Efectivas/.test(toasts.pop()));
ok('y deja pasar el "SEFE, S.A." de LAML', H.avisarClienteOtraEmpresa(clientes[1], 'LAML') === false);
ok('vendedor por defecto de LAML es de LAML (no el primero del array)', H.vendedorDefaultDe('LAML').id === 9);
ok('cambiarEmpresa avisa a pedido, cotización y compra', /_pedidoAlCambiarEmpresa\(_empPrev\)/.test(app1) && /_cotAlCambiarEmpresa\(_empPrev\)/.test(app1) && /_compraAlCambiarEmpresa\(_empPrev\)/.test(app1));
ok('cambiarEmpresa limpia el filtro de proveedor de Por pagar', /_ppProv=''/.test(app1));

console.log('\n═══ Cotización: borrador por empresa (app-4.js) ═══');
const cotBloque = entre(app4, "const COT_BORRADOR_KEY='sefe_borrador_cotizacion';", 'window._cotAlCambiarEmpresa=_cotAlCambiarEmpresa;');
const store = new Map();
const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const dom = {}; const document = { getElementById: id => dom[id] || (dom[id] = { value: '', innerHTML: '' }) };
const st = { emp: 'SEFE', cart: [], edit: null, cli: null };
const C = new Function('localStorage', 'document', 'clientes', 'productos', 'toast', 'st',
  'let empresaActiva, cotCart, cotEditId, cotClienteSel; const window={};' +
  'const pull=()=>{empresaActiva=st.emp;cotCart=st.cart;cotEditId=st.edit;cotClienteSel=st.cli;};' +
  'const push=()=>{st.cart=cotCart;st.edit=cotEditId;st.cli=cotClienteSel;};' +
  'function fdatehora(){return "";} function cotEsc(s){return s;} function confirmar(){} function abrirCotEditor(){}' +
  cotBloque + ';return { guardar:()=>{pull();_cotGuardarBorrador();}, hay:()=>{pull();return _cotHayBorrador();}, cambiar:(p)=>{pull();_cotAlCambiarEmpresa(p);push();} };'
)(localStorage, document, clientes, productos, toast, st);
st.emp = 'SEFE'; st.cart = [{ id: 1 }]; st.cli = clientes[0]; C.guardar();
ok('la cotización a medias se guarda en la clave de SEFE', store.has('sefe_borrador_cotizacion:SEFE'));
st.emp = 'LAML'; C.cambiar('SEFE');
ok('al pasar a LAML el editor queda vacío y sin cliente', st.cart.length === 0 && st.cli === null && st.edit === null);
ok('en LAML no aparece el borrador de SEFE', C.hay() === null);
st.emp = 'SEFE';
ok('al volver a SEFE el borrador sigue ahí', !!C.hay());
store.clear(); store.set('sefe_borrador_cotizacion', JSON.stringify({ cart: [{ id: 1597 }], clienteId: null, cliSearch: 'Prospecto' }));
st.emp = 'SEFE';
ok('un borrador viejo de un prospecto con productos LAML no aparece en SEFE', C.hay() === null);
ok('…y queda guardado como borrador de LAML', store.has('sefe_borrador_cotizacion:LAML') && !store.has('sefe_borrador_cotizacion'));

console.log('\n═══ Cotización: validaciones ═══');
const guardarCot = entre(app4, 'async function guardarCotizacionUI(){', 'let clienteId,clienteNombre');
ok('al guardar valida el cliente contra la empresa', /avisarClienteOtraEmpresa\(cliObj,_empCot/.test(guardarCot));
ok('al guardar valida los productos', /avisarCruceEmpresa\(cotCart,_empIt/.test(guardarCot));
const conv = entre(app4, 'function convertirCotizacionAPedido(id){', "confirmar('Convertir a pedido'");
ok('al convertir a pedido valida los productos contra el cliente', /avisarCruceEmpresa\(lineasVal,_empC,'un pedido'\)/.test(conv));
ok('el vendedor por defecto al convertir es de la empresa del cliente', /vendedorDefaultDe\(\(cli&&cli\.empresa\)/.test(app4));

console.log('\n═══ Compras (app-6.js / app-7.js) ═══');
const compraHook = entre(app6, 'const _compraCartPorEmp={};', 'window._compraAlCambiarEmpresa=');
const K = new Function('st', 'document', 'let empresaActiva, compraCart; function renderCompraForm(){}' +
  'const pull=()=>{empresaActiva=st.emp;compraCart=st.cart;};' + compraHook +
  ';return { cambiar:(p)=>{pull();_compraAlCambiarEmpresa(p);st.cart=compraCart;} };')(st, { getElementById: () => null });
st.emp = 'SEFE'; st.cart = [{ id: 1 }];
st.emp = 'LAML'; K.cambiar('SEFE');
ok('al pasar a LAML el carrito de compra queda vacío', st.cart.length === 0);
st.cart = [{ id: 1597 }]; st.emp = 'SEFE'; K.cambiar('LAML');
ok('al volver a SEFE vuelve su carrito', st.cart.length === 1 && st.cart[0].id === 1);
const coGo = entre(app6, "$('#co-go').onclick=", 'const total=compraCart.reduce');
ok('"Crear orden de compra" valida productos contra el proveedor', /avisarCruceEmpresa\(compraCart,prov\.empresa/.test(coGo));
ok('la compra dividida también', /avisarCruceEmpresa\(compraCart,prov\.empresa/.test(entre(app7, 'function registrarCompraDividida(', 'facturas.forEach')));

console.log('\n═══ Pago global (app-5.js) ═══');
const pg = entre(app5, 'function pgGetCliId(){', 'function pgCargaFacturas(){');
const PG = new Function('clientes', 'st', 'let empresaActiva;' +
  "const deEmpresa=a=>a.filter(x=>(x.empresa||'SEFE')===empresaActiva);" +
  'let _v=""; const $pg=()=>({value:_v});' + pg +
  ';return (emp,v)=>{empresaActiva=emp;_v=v;return pgGetCliId();};')(clientes, st);
ok('en LAML, "SEFE, S.A. · NIT" resuelve al cliente de LAML (5165)', PG('LAML', 'SEFE, S.A. · 107778602') === 5165);
ok('en SEFE resuelve al de SEFE (2264)', PG('SEFE', 'SEFE, S.A. · 107778602') === 2264);
ok('por NIT también respeta la empresa', PG('LAML', '107778602') === 5165);
const pgCarga = entre(app5, 'function pgCargaFacturas(){', 'if(!pendientes.length)');
ok('las facturas pendientes del NIT son solo de la empresa activa', /deEmpresa\(clientes\)\.filter\(c=>c\.nit===nit/.test(pgCarga) && /deEmpresa\(documentos\)\.filter/.test(pgCarga));

console.log('\n═══ Cuentas de banco según la empresa del documento ═══');
ok('el selector acepta la empresa', /function selectorCuentaBancoHTML\(idSel,label,sel,emp\)/.test(app6) && /function cuentasActivasBanco\(emp\)/.test(app6));
ok('registrar abono usa la empresa de la factura', /selectorCuentaBancoHTML\('ab-cuenta','¿A qué cuenta entró el dinero\?',null,f\.empresa/.test(app5));
ok('procesar cobro en ruta usa la empresa de la factura', /selectorCuentaBancoHTML\('ab-cuenta','¿A qué cuenta entró el dinero\?',null,d\.empresa/.test(app10));
ok('pago a proveedor y factura contado usan la empresa de la compra', /'pp-cuenta'[^)]*c\.empresa/.test(app6) && /'fp-cuenta'[\s\S]{0,140}c\.empresa\|\|'SEFE'\)/.test(app6));

console.log('\n═══ Búsquedas por nombre ═══');
ok('controles (ambientales/baterías) buscan el cliente en la empresa activa', /const cs=\(typeof clientes!=='undefined'\?deEmpresa\(clientes\)/.test(app13));
ok('la ficha de producto busca el proveedor en la empresa activa', /deEmpresa\(proveedores\)\.find\(x=>\(x\.nombre/.test(app10));
ok('pedido: vendedor por defecto de la empresa del cliente', (app2.match(/vendedorDefaultDe\(cli\.empresa\)/g) || []).length === 2);

console.log('\n═══ Aviso cuando la BASE rechaza ═══');
ok('db.js tiene el aviso de "mezcla de empresas"', /function _avisoCandadoEmpresa\(error\)/.test(db));
['Error guardando documento:', 'Error actualizando documento:', 'Error guardando compra:', 'Error actualizando compra:', 'Error guardando cotización:', 'Error guardando pago a proveedor:', 'Error guardando saldo a favor:']
  .forEach(m => ok('avisa en: ' + m, new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "',error\\); _avisoCandadoEmpresa\\(error\\)").test(db)));
const av = new Function('toast', entre(db, 'function _avisoCandadoEmpresa(error){', 'if(typeof window') + ';return _avisoCandadoEmpresa;')(toast);
ok('muestra el motivo que manda la base', av({ message: 'Cruce de empresa: el producto S1 es de SEFE y este registro es de LAML.' }) === true && /producto S1 es de SEFE/.test(toasts.pop()));
ok('otros errores no muestran ese aviso', av({ message: 'timeout' }) === false);

console.log(fallos ? `\n✗ ${fallos} de ${pruebas} pruebas fallaron` : `\n✓ TODO BIEN — ${pruebas} pruebas pasaron`);
process.exit(fallos ? 1 : 0);
