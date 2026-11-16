// ============================================================
//  SEFE · test-pedido-empresa.js — PEDIDO NO SE CRUZA DE EMPRESA
// ============================================================
//  Cómo se corre:   node test-pedido-empresa.js
//
//  Caso real (PED-2781): "SEFE, S.A." existe como cliente en las 2 empresas
//  (id 2264 en SEFE, id 5165 en LAML). Un pedido empezado en SEFE quedaba
//  con el cliente 2264 en el formulario/borrador; al pasar a LAML y guardar,
//  el pedido se iba a SEFE. Esta prueba EJECUTA la lógica real del borrador
//  (lee js/app-1.js en vivo) y revisa la validación al guardar (app-2.js).
// ============================================================
const fs = require('fs');
const app1 = fs.readFileSync(__dirname + '/js/app-1.js', 'utf8');
const app2 = fs.readFileSync(__dirname + '/js/app-2.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// ── Entorno falso mínimo ──
const ini = app1.indexOf("const BORRADOR_KEY='sefe_borrador_pedido';");
const fin = app1.indexOf('window.limpiarBorrador=limpiarBorrador;');
const bloque = app1.slice(ini, fin);
const store = new Map();
const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const els = {}; ['#f-cli','#f-cli-search','#f-oc','#f-obs','#f-nota','#f-subvend','#f-subvend-wrap','#f-nit-wrap'].forEach(k => els[k] = { value: '', style: {} });
const $ = sel => els[sel];
const clientes = [ { id: 2264, nombre: 'SEFE, S.A.', empresa: 'SEFE' }, { id: 5165, nombre: 'SEFE, S.A.', empresa: 'LAML' } ];
let empresaActiva = 'SEFE', editId = null, cart = [];
const initForm = () => {}, actualizarVendedorInfo = () => {}, toast = () => {};
const sandbox = new Function('localStorage','$','clientes','initForm','actualizarVendedorInfo','toast','getEmp','setCart','getCart','getEdit',
  'let empresaActiva, editId, cart;' +
  'const sync=()=>{empresaActiva=getEmp();editId=getEdit();cart=getCart();};' +
  'function render(){ guardarBorrador(); }' +
  bloque.replace(/cart=/g, 'cart=').toString() +
  ';return { sync, guardarBorrador:()=>{sync();guardarBorrador();}, recuperar:()=>{sync();const r=recuperarBorrador();setCart(cart);return r;},' +
  ' cambiar:(prev)=>{sync();_pedidoAlCambiarEmpresa(prev);setCart(cart);}, limpiar:()=>{sync();limpiarBorrador();} };');
const S = sandbox(localStorage, $, clientes, initForm, actualizarVendedorInfo, toast,
  () => empresaActiva, c => { cart = c; }, () => cart, () => editId);

console.log('\n═══ Borrador por empresa ═══');
// 1) En SEFE: pedido a medias con el cliente 2264
empresaActiva = 'SEFE'; cart = [{ id: 1, nombre: 'Prod SEFE' }]; els['#f-cli'].value = '2264'; els['#f-cli-search'].value = 'SEFE, S.A. · 107778602';
S.guardarBorrador();
ok('el borrador se guarda con la clave de SEFE', store.has('sefe_borrador_pedido:SEFE'));
ok('ya no se usa la clave única vieja', !store.has('sefe_borrador_pedido'));

// 2) Cambia a LAML: el formulario queda limpio, sin el cliente de SEFE
empresaActiva = 'LAML'; S.cambiar('SEFE');
ok('al pasar a LAML se vacía el cliente elegido', els['#f-cli'].value === '', 'f-cli=' + els['#f-cli'].value);
ok('al pasar a LAML se vacía el carrito', cart.length === 0);
ok('el borrador de SEFE se conserva', store.has('sefe_borrador_pedido:SEFE'));

// 3) Vuelve a SEFE: se recupera su pedido con su cliente
empresaActiva = 'SEFE'; S.cambiar('LAML');
ok('al volver a SEFE se recupera el carrito', cart.length === 1);
ok('al volver a SEFE se recupera el cliente 2264', els['#f-cli'].value === '2264', 'f-cli=' + els['#f-cli'].value);

console.log('\n═══ Borrador viejo (sin empresa) ═══');
store.clear(); cart = []; Object.values(els).forEach(e => e.value = '');
store.set('sefe_borrador_pedido', JSON.stringify({ cart: [{ id: 1 }], cliSel: '2264', cliSearch: 'SEFE, S.A.' }));
empresaActiva = 'LAML';
const r = S.recuperar();
ok('estando en LAML NO se recupera un borrador viejo de un cliente de SEFE', r === false && els['#f-cli'].value === '');
ok('el borrador viejo se pasa a la clave de SEFE', store.has('sefe_borrador_pedido:SEFE') && !store.has('sefe_borrador_pedido'));

console.log('\n═══ Validación al guardar el pedido (app-2.js) ═══');
const go = app2.slice(app2.indexOf("$('#f-go').onclick"), app2.indexOf('_guardandoPedido=true;', app2.indexOf("$('#f-go').onclick")));
ok('compara la empresa del cliente con la del pedido', /_empCli!==_empPed/.test(go));
ok('al editar usa la empresa del pedido original', /editId\?\(\(\(documentos\.find\(d=>d\.id===editId\)/.test(go));
ok('revisa que los productos sean de la empresa del cliente', /\(p\.empresa\|\|'SEFE'\)!==_empCli/.test(go));
ok('la validación va ANTES de trabar y guardar', go.length > 0 && /Cliente de otra empresa/.test(go));
ok('cambiarEmpresa avisa al pedido', /_pedidoAlCambiarEmpresa\(_empPrev\)/.test(app1));

console.log(fallos ? `\n✗ ${fallos} de ${pruebas} pruebas fallaron` : `\n✓ TODO BIEN — ${pruebas} pruebas pasaron`);
process.exit(fallos ? 1 : 0);
