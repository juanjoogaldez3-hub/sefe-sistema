// ============================================================
//  SEFE · test-realtime.js — PRUEBAS DE LA SINCRONIZACIÓN EN VIVO
// ============================================================
//  Cómo se corre:   node test-realtime.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Qué hace: carga db.js y realtime.js DE VERDAD (los mismos que
//  usa el sistema) dentro de un navegador simulado, y les dispara
//  eventos de Postgres falsos para comprobar que:
//    · los cambios de otros usuarios entran a los arrays
//    · se redibuja la vista correcta y sólo esa
//    · no se redibuja por el eco de tus propios cambios
//    · no se redibuja encima de alguien que está escribiendo
//
//  Si algo de esto se rompe en el futuro, este archivo lo avisa
//  antes de que lo note un usuario.
// ============================================================

// Banco de pruebas de realtime.js — carga db.js y realtime.js REALES
// en un contexto simulado y les dispara eventos de Postgres.
const vm = require('vm');
const fs = require('fs');
const BASE = __dirname + '/';

let fallos = 0, pruebas = 0;
function ok(nombre, cond, extra) {
  pruebas++;
  if (cond) { console.log('  ✓ ' + nombre); }
  else { fallos++; console.log('  ✗ ' + nombre + (extra ? '\n      → ' + extra : '')); }
}

// ---------- DOM simulado ----------
const estadoDOM = { vistaActiva: 'documentos', modalAbierto: false, foco: null, oculta: false };
const nodo = () => ({ id:'', className:'', textContent:'', innerHTML:'', style:{}, type:'',
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
              contains(c){return this._s.has(c);} },
  appendChild(){}, insertBefore(){}, onclick:null, parentNode:{ insertBefore(){} } });

const elementos = {};
const doc = {
  get hidden(){ return estadoDOM.oculta; },
  get activeElement(){ return estadoDOM.foco; },
  head:{ appendChild(){} }, body:{ appendChild(){} },
  createElement(){ return nodo(); },
  getElementById(id){ if(!elementos[id]) elementos[id]=nodo(); return elementos[id]; },
  querySelector(sel){
    if (sel === '.view.active') { const n=nodo(); n.id='v-'+estadoDOM.vistaActiva; return n; }
    if (sel.includes('overlay')) return estadoDOM.modalAbierto ? nodo() : null;
    return null;
  },
  addEventListener(){}, removeEventListener(){},
};

// ---------- Supabase simulado: captura los callbacks del canal ----------
const suscripciones = {};
const canalFalso = {
  on(_tipo, cfg, cb){ suscripciones[cfg.table] = cb; return canalFalso; },
  subscribe(cb){ if(cb) cb('SUBSCRIBED'); return canalFalso; },
};
const sbFalso = { channel(){ return canalFalso; }, removeChannel(){}, auth:{} };

// ---------- Contexto ----------
const ctx = {
  console, JSON, Math, Array, Object, Set, Number, String, Boolean, Date, RegExp, Error,
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: doc,
  supabase: { createClient: () => sbFalso },
  SEFE_CONFIG: { url:'https://x.supabase.co', key:'k' },
};
ctx.addEventListener = () => {};
ctx.removeEventListener = () => {};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

// Los arrays globales que en la app viven en el <script> de index.html
Object.assign(ctx, {
  documentos: [], clientes: [], productos: [], proveedores: [], categorias: [],
  compras: [], cobrosRuta: [], cuentasBanco: [], movimientosBanco: [],
  talonarios: [], recibosAnulados: [], recordatorios: [], cotizaciones: [],
  usuarios: [], auditLog: [], pilotos: [], vendedores: [],
  cliN:1, prodN:1, corr:1, cotN:1, compN:1, usrN:1, pilN:1, vendN:1, cobroRutaN:1, provN:1,
});

// Contadores de render, para saber si se redibujó
const renders = {};
['renderPanel','render','renderCotizaciones','renderDocs','renderCobros','renderCli','renderCliDet',
 'renderRecordatorios','renderProd','renderCompras','renderPorPagar','renderBancos','renderProveedores',
 'renderProveedorDet','renderTalonarios','renderUsuarios','renderAuditoria','renderDespachos',
 'renderMisEntregas'].forEach(n => { renders[n]=0; ctx[n]=()=>{renders[n]++;}; });

// Cargar el código real
vm.runInContext(fs.readFileSync(BASE+'db.js','utf8'), ctx);
vm.runInContext(fs.readFileSync(BASE+'realtime.js','utf8'), ctx);

// Arrancar (registra las suscripciones en el canal falso)
ctx.iniciarRealtime();

// Helper: dispara un evento de Postgres y corre los timers pendientes
const emitir = (tabla, eventType, nueva, vieja) => {
  const cb = suscripciones[tabla];
  if (!cb) throw new Error('sin suscripción a ' + tabla);
  cb({ eventType, new: nueva || null, old: vieja || null });
};
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
console.log('\n═══ TABLAS SUSCRITAS ═══');
ok('se suscribió a las 17 tablas', Object.keys(suscripciones).length === 17,
   'suscritas: ' + Object.keys(suscripciones).length);

console.log('\n═══ 1. TABLA PLANA (documentos) ═══');
emitir('documentos','INSERT',{ id:1, numero:100, tipo_doc:'pedido', cliente_id:5,
  cliente_nombre:'Tienda La Bendición', estado:'abierto', items:[], totales:{total:250} });
await esperar(600);
ok('INSERT agrega el documento', ctx.documentos.length===1 && ctx.documentos[0].numero===100);
ok('mapea snake_case → camelCase', ctx.documentos[0].tipoDoc==='pedido' && ctx.documentos[0].clienteId===5);
ok('redibuja la vista activa (documentos)', renders.renderDocs===1, 'renderDocs='+renders.renderDocs);
ok('NO redibuja vistas no visibles', renders.renderCobros===0);

const rDocs = renders.renderDocs;
emitir('documentos','UPDATE',{ id:1, numero:100, tipo_doc:'cambiaria', cliente_id:5,
  cliente_nombre:'Tienda La Bendición', estado:'certificada', items:[], totales:{total:250} });
await esperar(600);
ok('UPDATE reemplaza en su lugar', ctx.documentos.length===1 && ctx.documentos[0].estado==='certificada');
ok('UPDATE redibuja', renders.renderDocs===rDocs+1);

console.log('\n═══ 2. SUPRESIÓN DE ECO (tu propio cambio) ═══');
const antes = renders.renderDocs;
emitir('documentos','UPDATE',{ id:1, numero:100, tipo_doc:'cambiaria', cliente_id:5,
  cliente_nombre:'Tienda La Bendición', estado:'certificada', items:[], totales:{total:250} });
await esperar(600);
ok('un cambio idéntico NO redibuja', renders.renderDocs===antes,
   'redibujó ' + (renders.renderDocs-antes) + ' vez de más');

console.log('\n═══ 3. TABLA ANIDADA (abonos dentro del documento) ═══');
emitir('abonos','INSERT',{ id:77, documento_id:1, fecha:'2026-08-12', monto:'150.50',
  metodo:'efectivo', no_recibo:'R-001' });
await esperar(600);
ok('el abono entra al documento padre', ctx.documentos[0].abonos.length===1);
ok('el monto se convierte a número', ctx.documentos[0].abonos[0].monto===150.5);
ok('guarda el id de la base como _id', ctx.documentos[0].abonos[0]._id===77);

emitir('documentos','UPDATE',{ id:1, numero:100, tipo_doc:'cambiaria', cliente_id:5,
  cliente_nombre:'Tienda La Bendición', estado:'certificada', items:[],
  totales:{total:250}, estado_pago:'parcial' });
await esperar(600);
ok('un UPDATE del documento NO borra sus abonos', ctx.documentos[0].abonos.length===1,
   'abonos quedaron en ' + ctx.documentos[0].abonos.length);

console.log('\n═══ 4. DELETE que sólo trae la llave primaria ═══');
// Así manda Postgres los DELETE por defecto: sin documento_id.
emitir('abonos','DELETE', null, { id:77 });
await esperar(600);
ok('encuentra el padre por el hijo y borra el abono', ctx.documentos[0].abonos.length===0,
   'quedaron ' + ctx.documentos[0].abonos.length);

emitir('documentos','DELETE', null, { id:1 });
await esperar(600);
ok('DELETE quita el documento', ctx.documentos.length===0);

console.log('\n═══ 5. NO PISAR AL QUE ESTÁ TRABAJANDO ═══');
estadoDOM.modalAbierto = true;
const rConModal = renders.renderDocs;
emitir('documentos','INSERT',{ id:2, numero:101, tipo_doc:'pedido', cliente_id:5,
  cliente_nombre:'Otro', estado:'abierto', items:[], totales:{} });
await esperar(600);
ok('con modal abierto NO redibuja', renders.renderDocs===rConModal);
ok('pero SÍ actualiza el array por debajo', ctx.documentos.length===1);
ok('deja el cambio pendiente', ctx._realtime.estado().pendientes===1,
   'pendientes=' + ctx._realtime.estado().pendientes);

estadoDOM.modalAbierto = false;
await esperar(1500); // el vigilante corre cada 1200ms
ok('al cerrar el modal redibuja solo', renders.renderDocs===rConModal+1,
   'renderDocs=' + renders.renderDocs + ' esperado=' + (rConModal+1));
ok('ya no quedan pendientes', ctx._realtime.estado().pendientes===0);

console.log('\n═══ 6. CURSOR DENTRO DE UN CAMPO ═══');
estadoDOM.foco = { tagName:'INPUT', type:'text', readOnly:false };
const rConFoco = renders.renderDocs;
emitir('documentos','INSERT',{ id:3, numero:102, tipo_doc:'pedido', cliente_id:5,
  cliente_nombre:'Tercero', estado:'abierto', items:[], totales:{} });
await esperar(600);
ok('mientras se escribe NO redibuja', renders.renderDocs===rConFoco);
estadoDOM.foco = null;
await esperar(1500);
ok('al salir del campo redibuja', renders.renderDocs===rConFoco+1);

console.log('\n═══ 7. AUDITORÍA (va al frente, no al final) ═══');
estadoDOM.vistaActiva = 'auditoria';
emitir('auditoria','INSERT',{ seq:1, fecha:'2026-08-12', usuario:'Juanjo', rol:'admin',
  accion:'Factura emitida', detalle:'A-1', prev_hash:'x', hash:'y' });
emitir('auditoria','INSERT',{ seq:2, fecha:'2026-08-12', usuario:'Ana', rol:'ventas',
  accion:'Pedido creado', detalle:'PED-2', prev_hash:'y', hash:'z' });
await esperar(600);
ok('el más nuevo queda de primero', ctx.auditLog.length===2 && ctx.auditLog[0].seq===2,
   'orden: ' + ctx.auditLog.map(a=>a.seq).join(','));
ok('redibuja auditoría', renders.renderAuditoria===1);

console.log('\n═══ 8. TABLA CON LLAVE DE TEXTO (categorias) ═══');
estadoDOM.vistaActiva = 'inventario';
emitir('categorias','INSERT',{ nombre:'Lácteos', umbral_stock:12 });
await esperar(600);
ok('inserta la categoría', ctx.categorias.length===1 && ctx.categorias[0].umbralStock===12);
emitir('categorias','UPDATE',{ nombre:'Lácteos', umbral_stock:30 });
await esperar(600);
ok('actualiza por nombre, no duplica', ctx.categorias.length===1 && ctx.categorias[0].umbralStock===30,
   'quedaron ' + ctx.categorias.length);

console.log('\n═══ 9. PAGOS A PROVEEDOR (anidados en compras) ═══');
estadoDOM.vistaActiva = 'compras';
emitir('compras','INSERT',{ id:9, proveedor_id:3, proveedor_nombre:'Distribuidora X',
  items:[], total:'1000', fecha:'2026-08-01', estado_recepcion:'recibida' });
emitir('pagos_proveedor','INSERT',{ id:55, compra_id:9, fecha:'2026-08-05', monto:'400', metodo:'cheque' });
await esperar(600);
ok('el pago entra en la compra', ctx.compras.length===1 && ctx.compras[0].abonos.length===1);
ok('el pago mapea bien', ctx.compras[0].abonos[0].monto===400 && ctx.compras[0].abonos[0]._id===55);

console.log('\n═══ 10. EL AVISO LLEGA ANTES QUE EL ID (no duplicar) ═══');
// Este es el caso que se rompió en producción: al registrar un pago, la
// app lo muestra al instante con una copia local que TODAVÍA NO tiene id
// (el id se lo pone la base y llega después). Si el aviso del websocket
// llega antes que esa respuesta, buscar por id no encuentra nada y el
// registro se agregaba de nuevo: aparecía duplicado, pero sólo en la
// pantalla de quien lo creó.
estadoDOM.vistaActiva = 'porpagar';
ctx.compras.length = 0;
emitir('compras','INSERT',{ id:70, proveedor_id:1, proveedor_nombre:'Papelera',
  items:[], total:'22420', fecha:'2026-08-11', estado_recepcion:'recibida' });
await esperar(600);

// La app agrega el pago a la lista local, sin _id todavía
const selloPago = '2026-08-11T15:42:07.881Z';
ctx.compras[0].abonos.push({ fecha:'2026-08-11', monto:20500, metodo:'transferencia',
  referencia:'5253', registradoPor:'Wendy Ogaldez', registradoEl:selloPago });
ok('la copia local entra sin _id', ctx.compras[0].abonos.length===1 &&
   ctx.compras[0].abonos[0]._id===undefined);

// Ahora llega el aviso de la base, con el id ya asignado
emitir('pagos_proveedor','INSERT',{ id:901, compra_id:70, fecha:'2026-08-11',
  monto:'20500', metodo:'transferencia', referencia:'5253',
  registrado_por:'Wendy Ogaldez', registrado_el:selloPago });
await esperar(600);
ok('NO se duplica el pago', ctx.compras[0].abonos.length===1,
   'quedaron ' + ctx.compras[0].abonos.length + ' pagos');
ok('adopta el id que asignó la base', ctx.compras[0].abonos[0]._id===901);

// Un pago DISTINTO del mismo monto sí tiene que entrar
emitir('pagos_proveedor','INSERT',{ id:902, compra_id:70, fecha:'2026-08-11',
  monto:'20500', metodo:'transferencia', referencia:'5254',
  registrado_por:'Otro', registrado_el:'2026-08-11T16:10:00.000Z' });
await esperar(600);
ok('un pago realmente distinto sí se agrega', ctx.compras[0].abonos.length===2,
   'quedaron ' + ctx.compras[0].abonos.length);

console.log('\n═══ 11. LO MISMO EN DOCUMENTOS (id provisorio negativo) ═══');
estadoDOM.vistaActiva = 'documentos';
ctx.documentos.length = 0;
const selloDoc = '2026-08-12T09:15:33.512Z';
// Así crea la app un pedido: id negativo provisorio hasta que llega el real
ctx.documentos.push({ id:-1755000000000, numero:1500, tipoDoc:'pedido',
  clienteNombre:'Tienda', items:[], totales:{total:500}, estado:'abierto',
  creada:selloDoc, abonos:[] });
emitir('documentos','INSERT',{ id:4321, numero:1500, tipo_doc:'pedido',
  cliente_nombre:'Tienda', items:[], totales:{total:500}, estado:'abierto',
  creada:selloDoc });
await esperar(600);
ok('NO se duplica el pedido', ctx.documentos.length===1,
   'quedaron ' + ctx.documentos.length);
ok('reemplaza el id provisorio por el real', ctx.documentos[0].id===4321);

console.log('\n═══ 12. PARADA LIMPIA ═══');
ctx.detenerRealtime();
ok('queda inactivo', ctx._realtime.estado().activo===false);

console.log('\n' + '═'.repeat(46));
console.log(fallos===0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron`
                       : `✗ ${fallos} de ${pruebas} pruebas fallaron`);
console.log('═'.repeat(46) + '\n');
process.exit(fallos===0 ? 0 : 1);
})();
