// ============================================================
// SEFE — Capa de conexión a Supabase (db.js)
// ============================================================
// Este archivo NO necesita que toques nada. Las credenciales
// están en config.js (ese es el único archivo que editás vos).
//
// Si en el futuro te paso un db.js nuevo, podés reemplazar este
// archivo sin miedo: tus credenciales viven en config.js y no
// se pierden.
// ============================================================

// Lee las credenciales desde config.js
const SUPABASE_URL = (typeof SEFE_CONFIG !== 'undefined') ? SEFE_CONFIG.url : '';
const SUPABASE_KEY = (typeof SEFE_CONFIG !== 'undefined') ? SEFE_CONFIG.key : '';

if (!SUPABASE_URL || SUPABASE_URL.includes('TU-PROYECTO') || !SUPABASE_KEY || SUPABASE_KEY.includes('TU-ANON')) {
  console.error('⚠️ Faltan las credenciales en config.js. Editá ese archivo con tu Project URL y tu anon key.');
}

// Cliente de Supabase (se carga la librería desde el HTML)
// Sesión por navegador: se guarda en sessionStorage → al CERRAR el navegador se borra y vuelve a pedir
// login (más seguro en PC compartida). Recargar la pestaña mantiene la sesión; abrir otra pestaña pide login.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true }
});

// ============================================================
// fetchAll — trae TODAS las filas de una tabla, paginando.
// Supabase devuelve máximo 1000 filas por consulta; esta función
// pide de a 1000 hasta traer todo. Necesario para tablas grandes
// como documentos y abonos.
// ============================================================
async function fetchAll(tabla, ordenCampo, cols){
  const PAGE=1000;
  let desde=0, todo=[];
  const sel=cols||'*';
  while(true){
    const {data,error}=await sb.from(tabla).select(sel).order(ordenCampo).range(desde,desde+PAGE-1);
    if(error){console.error('Error cargando '+tabla+':',error);break;}
    if(!data||!data.length)break;
    todo=todo.concat(data);
    if(data.length<PAGE)break; // última página
    desde+=PAGE;
  }
  return {data:todo};
}

// Columnas de 'documentos' SIN los blobs pesados (pdf_base64, xml_base64).
// Esos dos guardan el PDF y el XML de cada factura en base64 y son el 90%
// del peso de la base. No se necesitan para ver listas, cobros ni dashboard;
// sólo al abrir o imprimir UNA factura. Por eso la carga inicial los omite
// (bajaba 24 MB en cada login) y se traen a pedido con asegurarPdfDoc().
const DOC_COLS_SIN_BLOBS='id,numero,tipo_doc,cliente_id,cliente_nombre,cliente_comercial,cliente_nit,vendedor_id,vendedor_nombre,sub_vendedor_nombre,items,totales,estado,estado_pago,inventario_rebajado,autorizacion,serie,numero_dte,orden_compra,observaciones,nota_interna,dias_credito,vencimiento,exenta,escenario_exenta,piloto_id,orden_ruta,estado_entrega,entrega_info,anulado,motivo_anulacion,fecha_certificacion,factura_origen_id,nit_facturado,nombre_facturado,sede,creada,costo_historico';

// Trae el PDF/XML de UNA factura sólo cuando se necesita (verla, imprimirla,
// descargarla) y lo deja cacheado en el objeto en memoria. Si ya está, no
// hace nada. Devuelve el PDF en base64 o null.
async function asegurarPdfDoc(f){
  if(!f)return null;
  if(f.pdfBase64)return f.pdfBase64;      // ya cargado en esta sesión
  if(!f.autorizacion)return null;         // no es un documento con PDF oficial
  try{
    const {data,error}=await sb.from('documentos').select('pdf_base64,xml_base64').eq('id',f.id).single();
    if(error){console.error('Error trayendo el PDF de la factura:',error);return null;}
    if(data){f.pdfBase64=data.pdf_base64;f.xmlBase64=data.xml_base64;}
    return f.pdfBase64||null;
  }catch(e){console.error('Error trayendo el PDF de la factura:',e);return null;}
}
if(typeof window!=='undefined')window.asegurarPdfDoc=asegurarPdfDoc;

// ============================================================
// CARGA INICIAL — trae todo de la base y llena los arrays de la app
// ============================================================
async function cargarTodo() {
  try {
    const [
      rClientes, rProductos, rVendedores, rPilotos, rProveedores,
      rDocumentos, rAbonos, rCobrosRuta, rCompras, rPagos, rRoles, rUsuarios, rAudit, rDashboard, rTalonarios, rRecAnul,
      rCuentasBanco, rMovBanco
    ] = await Promise.all([
      sb.from('clientes').select('*').order('id'),
      sb.from('productos').select('*').order('id'),
      sb.from('vendedores').select('*').order('id'),
      sb.from('pilotos').select('*').order('id'),
      sb.from('proveedores').select('*').order('id'),
      fetchAll('documentos','id',DOC_COLS_SIN_BLOBS),
      fetchAll('abonos','id'),
      sb.from('cobros_ruta').select('*').order('id'),
      sb.from('compras').select('*').order('id'),
      fetchAll('pagos_proveedor','id'),
      sb.from('roles').select('*'),
      sb.from('usuarios').select('*').order('id'),
      sb.from('auditoria').select('*').order('seq',{ascending:false}).limit(1),
      sb.from('dashboard_config').select('*'),
      sb.from('talonarios').select('*').order('numero_inicial'),
      sb.from('recibos_anulados').select('*'),
      sb.from('cuentas_banco').select('*').order('id'),
      fetchAll('movimientos_banco','id'),
    ]);

    // Mapear de snake_case (base) a camelCase (app)
    clientes = (rClientes.data||[]).map(mapClienteFromDB);
    productos = (rProductos.data||[]).map(mapProductoFromDB);
    vendedores = rVendedores.data||[];
    pilotos = rPilotos.data||[];
    proveedores = (rProveedores.data||[]).map(mapProveedorFromDB);
    documentos = (rDocumentos.data||[]).map(d=>mapDocumentoFromDB(d, rAbonos.data||[]));
    cobrosRuta = (rCobrosRuta.data||[]).map(mapCobroRutaFromDB);
    compras = (rCompras.data||[]).map(c=>mapCompraFromDB(c, rPagos.data||[]));
    usuarios = (rUsuarios.data||[]).map(mapUsuarioFromDB);
    // Roles: reconstruir el objeto ROLES
    (rRoles.data||[]).forEach(r=>{
      // views puede venir como array, como string "ALL", o como texto JSON sin parsear
      let views = r.views;
      if (typeof views === 'string') {
        if (views === 'ALL') {
          views = 'ALL';
        } else {
          try { views = JSON.parse(views); } catch(e) { views = []; }
        }
      }
      if (Array.isArray(views) && views.length === 1 && views[0] === 'ALL') views = 'ALL';
      ROLES[r.rol] = {
        label:r.label,
        views: views,
        anular:r.anular, facturar:r.facturar, crearCliente:r.crear_cliente,
        editarInventario:r.editar_inventario, registrarAbono:r.registrar_abono,
        readonly:r.readonly, compraEspecial:r.compra_especial, asignarPiloto:r.asignar_piloto,
        convertirCajas:r.convertir_cajas
      };
    });
    // Auditoría
    // Sólo se baja el ÚLTIMO registro de auditoría (para la cadena de hashes y
    // el correlativo). El historial completo se carga a pedido al abrir el
    // módulo de auditoría — así el login no baja una tabla que crece sin fin
    // (era una de las que más egress consumía).
    auditLog = (rAudit.data||[]).map(mapAuditoriaFromDB); // ya viene el más nuevo primero
    auditSeq = auditLog.length ? auditLog[0].seq : 0;
    if (typeof window !== 'undefined') window._auditFullLoaded = false;

    // Dashboard config por rol (si la variable global existe)
    if (typeof dashboardConfig !== 'undefined') {
      (rDashboard.data||[]).forEach(d=>{
        let cfg = d.config;
        if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch(e) { cfg = {}; } }
        dashboardConfig[d.rol] = cfg || {};
      });
    }

    // Talonarios de recibos
    if (typeof talonarios !== 'undefined') {
      talonarios = (rTalonarios.data||[]).map(mapTalonarioFromDB);
    }

    // Recibos anulados
    if (typeof recibosAnulados !== 'undefined') {
      recibosAnulados = (rRecAnul.data||[]).map(mapReciboAnuladoFromDB);
    }

    // Cuentas de banco
    if (typeof cuentasBanco !== 'undefined') {
      cuentasBanco = (rCuentasBanco.data||[]).map(mapCuentaBancoFromDB);
    }
    // Movimientos de banco
    if (typeof movimientosBanco !== 'undefined') {
      movimientosBanco = (rMovBanco.data||[]).map(mapMovimientoBancoFromDB);
    }

    // Categorías (umbrales de stock por categoría). Tolera que la tabla no exista todavía.
    try {
      const rCat = await sb.from('categorias').select('*');
      if (!rCat.error && typeof categorias !== 'undefined') {
        categorias = (rCat.data||[]).map(mapCategoriaFromDB);
      }
    } catch(e){ /* tabla aún no creada */ }

    // Recordatorios (módulo general). Tolera que la tabla no exista todavía.
    try {
      const rRec = await sb.from('recordatorios').select('*');
      if (!rRec.error && typeof recordatorios !== 'undefined') {
        recordatorios = (rRec.data||[]).map(mapRecordatorioFromDB);
      }
    } catch(e){ /* tabla aún no creada */ }

    // Cotizaciones. Tolera que la tabla no exista todavía.
    try {
      const rCot = await sb.from('cotizaciones').select('*');
      if (!rCot.error && typeof cotizaciones !== 'undefined') {
        cotizaciones = (rCot.data||[]).map(mapCotizacionFromDB);
      }
    } catch(e){ /* tabla aún no creada */ }

    // Saldo a favor de clientes. Tolera que la tabla no exista todavía
    // (así el código puede publicarse antes de correr la migración).
    // La marca _saldoFavorTabla es el "interruptor": el sobrepago sólo se
    // habilita cuando la tabla existe de verdad (sin ella, un crédito no se
    // podría guardar y el banco quedaría descuadrado).
    try {
      const rCred = await sb.from('creditos_cliente').select('*');
      if (!rCred.error) {
        if (typeof creditosCliente !== 'undefined') creditosCliente = (rCred.data||[]).map(mapCreditoFromDB);
        if (typeof window !== 'undefined') window._saldoFavorTabla = true;
      }
    } catch(e){ /* tabla aún no creada */ }

    // (El costo histórico por factura ahora viene en la carga principal de
    // 'documentos' — es una columna más en DOC_COLS_SIN_BLOBS y la llena el
    // mapper. Antes se traía en una segunda recorrida completa de la tabla.)

    // Marca de que los datos vienen REALMENTE de la base.
    //
    // No alcanza con que la consulta no haya reventado: con RLS activo
    // y sin sesión, Supabase devuelve listas vacías SIN error. Por eso
    // la marca se pone sólo si llegaron usuarios, que es lo mínimo que
    // el sistema necesita para resolver roles y permisos.
    window._sefeDatosBase = Array.isArray(usuarios) && usuarios.length > 0;
    console.log(window._sefeDatosBase
      ? '✓ Datos cargados desde Supabase'
      : '⚠️ Supabase respondió sin datos (¿sin sesión todavía?)');
    return true;
  } catch (e) {
    console.error('Error cargando datos:', e);
    alert('No se pudo conectar con la base de datos. Revisá tu conexión y las credenciales en db.js');
    return false;
  }
}

// ============================================================
// MAPEADORES — convierten entre la base (snake_case) y la app (camelCase)
// ============================================================
function mapClienteFromDB(c){
  return {
    id:c.id, nit:c.nit, nombre:c.nombre, razonSocial:c.razon_social,
    direccion:c.direccion, email:c.email, tiempoCredito:c.tiempo_credito,
    vendedorId:c.vendedor_id, subVendedorNombre:c.sub_vendedor_nombre, sedesDe:c.sedes_de,
    direccionEntrega:c.direccion_entrega, ruta:c.ruta||'', fechaAlta:c.fecha_alta,
    nitsSecundarios:c.nits_secundarios||[],
    contactoPagos:c.contacto_pagos||{}, contactoCompras:c.contacto_compras||{},
    precios:c.precios||{},
    cobroInfo:c.cobro_info||{}, seguimientos:c.seguimientos||[]
  };
}
function mapProductoFromDB(p){
  return {
    id:p.id, codigo:p.codigo, nombre:p.nombre, precio:Number(p.precio),
    costo:Number(p.costo), unidad:p.unidad, stock:Number(p.stock),
    proveedorIds:p.proveedor_ids||[], skuProveedor:p.sku_proveedor, nombreProveedor:p.nombre_proveedor,
    marca:p.marca||'', activo:p.activo!==false,
    tipoEmpaque:p.tipo_empaque||'unidad', unidadesPorCaja:p.unidades_por_caja, stockCajas:Number(p.stock_cajas||0),
    precioUnidad:Number(p.precio_unidad)||0, conversiones:p.conversiones||[], categoria:p.categoria||''
  };
}
function mapProveedorFromDB(p){
  return {
    id:p.id, nombre:p.nombre, razonSocial:p.razon_social, nit:p.nit,
    telefono:p.telefono, correo:p.correo, diasCredito:p.dias_credito
  };
}
// Un abono suelto (fila de la tabla 'abonos'). Se usa tanto al armar el
// documento completo como al recibir un cambio en tiempo real.
function mapAbonoFromDB(a){
  return {
    fecha:a.fecha, monto:Number(a.monto), metodo:a.metodo, referencia:a.referencia,
    noRecibo:a.no_recibo, comprobante:a.comprobante, registradoPor:a.registrado_por,
    registradoEl:a.registrado_el, anulado:a.anulado, motivoAnulacion:a.motivo_anulacion,
    origenCobroRuta:a.origen_cobro_ruta, cuentaBancoId:a.cuenta_banco_id, _id:a.id
  };
}
function mapDocumentoFromDB(d, todosAbonos){
  const abonos = (todosAbonos||[]).filter(a=>a.documento_id===d.id).map(mapAbonoFromDB);
  return {
    id:d.id, numero:d.numero, tipoDoc:d.tipo_doc, clienteId:d.cliente_id,
    clienteNombre:d.cliente_nombre, clienteComercial:d.cliente_comercial, clienteNit:d.cliente_nit,
    vendedorId:d.vendedor_id, vendedorNombre:d.vendedor_nombre, subVendedorNombre:d.sub_vendedor_nombre,
    items:d.items||[], totales:d.totales||{}, estado:d.estado, estadoPago:d.estado_pago,
    inventarioRebajado:d.inventario_rebajado, autorizacion:d.autorizacion,
    serie:d.serie, numeroDte:d.numero_dte, ordenCompra:d.orden_compra,
    observaciones:d.observaciones, notaInterna:d.nota_interna,
    diasCredito:d.dias_credito, vencimiento:d.vencimiento,
    exenta:d.exenta, escenarioExenta:d.escenario_exenta,
    pilotoId:d.piloto_id, ordenRuta:d.orden_ruta, estadoEntrega:d.estado_entrega,
    entregaInfo:d.entrega_info, anulado:d.anulado, motivoAnulacion:d.motivo_anulacion,
    pdfBase64:d.pdf_base64, xmlBase64:d.xml_base64, fechaCertificacion:d.fecha_certificacion,
    facturaOrigenId:d.factura_origen_id, nitFacturado:d.nit_facturado, nombreFacturado:d.nombre_facturado,
    sede:d.sede, costoHistorico:(d.costo_historico!=null?Number(d.costo_historico):undefined),
    creada:d.creada, abonos
  };
}
function mapCobroRutaFromDB(c){
  return {
    id:c.id, docId:c.documento_id, docNum:c.doc_num, cliente:c.cliente,
    monto:Number(c.monto), modo:c.modo, noBoleta:c.no_boleta, noRecibo:c.no_recibo,
    cheque:c.cheque, banco:c.banco, piloto:c.piloto, fecha:c.fecha, estado:c.estado,
    recibidoPor:c.recibido_por, recibidoFecha:c.recibido_fecha,
    procesadoPor:c.procesado_por, procesadoFecha:c.procesado_fecha
  };
}
// Un pago a proveedor suelto (fila de 'pagos_proveedor').
function mapPagoProveedorFromDB(p){
  return {
    fecha:p.fecha, monto:Number(p.monto), metodo:p.metodo, referencia:p.referencia,
    noRecibo:p.no_recibo, comprobante:p.comprobante, registradoPor:p.registrado_por,
    registradoEl:p.registrado_el, anulado:p.anulado, motivoAnulacion:p.motivo_anulacion,
    esCierre:p.es_cierre, cuentaBancoId:p.cuenta_banco_id, _id:p.id
  };
}
function mapCompraFromDB(c, todosPagos){
  const abonos = (todosPagos||[]).filter(p=>p.compra_id===c.id).map(mapPagoProveedorFromDB);
  return {
    id:c.id, proveedorId:c.proveedor_id, proveedorNombre:c.proveedor_nombre,
    items:c.items||[], total:Number(c.total), fecha:c.fecha,
    estadoRecepcion:c.estado_recepcion, facturada:c.facturada, docProv:c.doc_prov,
    tipoPago:c.tipo_pago, diasCredito:c.dias_credito, vencimiento:c.vencimiento,
    especial:c.especial, oficializada:c.oficializada, mes:c.mes,
    anulado:c.anulado, motivoAnulacion:c.motivo_anulacion, abonos
  };
}
function mapUsuarioFromDB(u){
  return {
    id:u.id, nombre:u.nombre, correo:u.correo, rol:u.rol, activo:u.activo,
    vendedorId:u.vendedor_id, pilotoId:u.piloto_id, authId:u.auth_id
  };
}
function mapTalonarioFromDB(t){
  return {
    id:t.id, numeroInicial:t.numero_inicial, numeroFinal:t.numero_final,
    cantidad:t.cantidad, asignadoA:t.asignado_a, asignadoId:t.asignado_id,
    descripcion:t.descripcion, estado:t.estado, fechaEntrega:t.fecha_entrega, creado:t.creado
  };
}
function mapReciboAnuladoFromDB(r){
  return {
    id:r.id, numero:r.numero, talonarioId:r.talonario_id,
    motivo:r.motivo, anuladoPor:r.anulado_por, fecha:r.fecha
  };
}
function mapCuentaBancoFromDB(c){
  return {
    id:c.id, nombre:c.nombre, banco:c.banco, numero:c.numero, tipo:c.tipo||'monetaria',
    moneda:c.moneda||'GTQ', saldoInicial:Number(c.saldo_inicial)||0, activo:c.activo!==false, creada:c.creada
  };
}
function mapMovimientoBancoFromDB(m){
  return {
    id:m.id, cuentaId:m.cuenta_id, fecha:m.fecha, tipo:m.tipo, monto:Number(m.monto)||0,
    concepto:m.concepto, categoria:m.categoria, origen:m.origen, origenId:m.origen_id,
    cuentaDestinoId:m.cuenta_destino_id, referencia:m.referencia, poliza:m.poliza, registradoPor:m.registrado_por,
    registradoEl:m.registrado_el, anulado:m.anulado===true
  };
}
function mapCategoriaFromDB(c){
  return { nombre:c.nombre, umbralStock:Number(c.umbral_stock)||0 };
}
function mapAuditoriaFromDB(a){
  return {
    seq:a.seq, fecha:a.fecha, usuario:a.usuario, rol:a.rol,
    accion:a.accion, detalle:a.detalle, prevHash:a.prev_hash, hash:a.hash
  };
}

// ============================================================
// GUARDAR — funciones para escribir cambios en la base
// Estas se llaman desde la app cuando se crea/edita algo.
// (En la Etapa 2 las conectamos a cada acción del prototipo)
// ============================================================

async function guardarCliente(cli){
  const row = {
    nit:cli.nit, nombre:cli.nombre, razon_social:cli.razonSocial,
    direccion:cli.direccion, email:cli.email, tiempo_credito:cli.tiempoCredito,
    vendedor_id:cli.vendedorId, sub_vendedor_nombre:cli.subVendedorNombre, sedes_de:cli.sedesDe,
    direccion_entrega:cli.direccionEntrega, ruta:cli.ruta||null, fecha_alta:cli.fechaAlta,
    nits_secundarios:cli.nitsSecundarios,
    contacto_pagos:cli.contactoPagos, contacto_compras:cli.contactoCompras, precios:cli.precios,
    cobro_info:cli.cobroInfo||{}, seguimientos:cli.seguimientos||[]
  };
  if (cli._nuevo) {
    delete cli._nuevo;
    const {data,error} = await sb.from('clientes').insert(row).select().single();
    if(error){console.error('Error guardando cliente:',error); cli._nuevo=true;}
    else cli.id = data.id;
  } else {
    const {error} = await sb.from('clientes').update(row).eq('id', cli.id);
    if(error)console.error('Error actualizando cliente:',error);
  }
}

async function borrarCliente(id){
  const {error} = await sb.from('clientes').delete().eq('id', id);
  if(error)console.error('Error borrando cliente:',error);
}
window.borrarCliente = borrarCliente;

async function guardarDocumento(d){
  const row = {
    numero:d.numero, tipo_doc:d.tipoDoc, cliente_id:d.clienteId,
    cliente_nombre:d.clienteNombre, cliente_comercial:d.clienteComercial, cliente_nit:d.clienteNit,
    vendedor_id:d.vendedorId, vendedor_nombre:d.vendedorNombre, sub_vendedor_nombre:d.subVendedorNombre,
    items:d.items, totales:d.totales, estado:d.estado, estado_pago:d.estadoPago,
    inventario_rebajado:d.inventarioRebajado, autorizacion:d.autorizacion,
    serie:d.serie, numero_dte:d.numeroDte, orden_compra:d.ordenCompra,
    observaciones:d.observaciones||null, nota_interna:d.notaInterna||null,
    dias_credito:d.diasCredito, vencimiento:d.vencimiento,
    exenta:d.exenta, escenario_exenta:d.escenarioExenta,
    piloto_id:d.pilotoId, orden_ruta:d.ordenRuta, estado_entrega:d.estadoEntrega,
    entrega_info:d.entregaInfo, anulado:d.anulado, motivo_anulacion:d.motivoAnulacion,
    pdf_base64:d.pdfBase64, xml_base64:d.xmlBase64, fecha_certificacion:d.fechaCertificacion,
    factura_origen_id:d.facturaOrigenId||null, nit_facturado:d.nitFacturado||null, nombre_facturado:d.nombreFacturado||null,
    sede:d.sede||null,
    creada:d.creada
  };
  if (d._nuevo) {
    delete d._nuevo;
    const {data,error} = await sb.from('documentos').insert(row).select().single();
    if(error){console.error('Error guardando documento:',error); d._nuevo=true;}
    else d.id = data.id;
  } else {
    const {error} = await sb.from('documentos').update(row).eq('id', d.id);
    if(error)console.error('Error actualizando documento:',error);
  }
}

async function guardarAbono(documentoId, ab){
  const row = {
    documento_id:documentoId, fecha:ab.fecha, monto:ab.monto, metodo:ab.metodo,
    referencia:ab.referencia, no_recibo:ab.noRecibo, comprobante:ab.comprobante,
    registrado_por:ab.registradoPor, registrado_el:ab.registradoEl,
    anulado:ab.anulado, motivo_anulacion:ab.motivoAnulacion, origen_cobro_ruta:ab.origenCobroRuta,
    cuenta_banco_id:ab.cuentaBancoId||null
  };
  const {data,error} = await sb.from('abonos').insert(row).select().single();
  if(error)console.error(error); else ab._id = data.id;
}

async function guardarCobroRuta(c){
  const row = {
    documento_id:c.docId, doc_num:c.docNum, cliente:c.cliente, monto:c.monto,
    modo:c.modo, no_boleta:c.noBoleta, no_recibo:c.noRecibo, cheque:c.cheque,
    banco:c.banco, piloto:c.piloto, fecha:c.fecha, estado:c.estado,
    recibido_por:c.recibidoPor, recibido_fecha:c.recibidoFecha,
    procesado_por:c.procesadoPor, procesado_fecha:c.procesadoFecha
  };
  if (c._nuevo) {
    delete c._nuevo;
    const {data,error} = await sb.from('cobros_ruta').insert(row).select().single();
    if(error){console.error('Error guardando cobro en ruta:',error); c._nuevo=true;}
    else c.id = data.id;
  } else {
    const {error} = await sb.from('cobros_ruta').update(row).eq('id', c.id);
    if(error)console.error('Error actualizando cobro en ruta:',error);
  }
}

async function guardarCompra(c){
  const row = {
    proveedor_id:c.proveedorId, proveedor_nombre:c.proveedorNombre,
    items:c.items, total:c.total, fecha:c.fecha, estado_recepcion:c.estadoRecepcion,
    facturada:c.facturada, doc_prov:c.docProv, tipo_pago:c.tipoPago,
    dias_credito:c.diasCredito, vencimiento:c.vencimiento, especial:c.especial,
    oficializada:c.oficializada, mes:c.mes, anulado:c.anulado, motivo_anulacion:c.motivoAnulacion
  };
  if (c._nuevo) {
    delete c._nuevo;
    const {data,error} = await sb.from('compras').insert(row).select().single();
    if(error){console.error('Error guardando compra:',error); c._nuevo=true;}
    else c.id = data.id;
  } else {
    const {error} = await sb.from('compras').update(row).eq('id', c.id);
    if(error)console.error('Error actualizando compra:',error);
  }
}

async function borrarCompra(id){
  const {error} = await sb.from('compras').delete().eq('id', id);
  if(error)console.error('Error eliminando compra:',error);
}
if(typeof window!=='undefined')window.borrarCompra=borrarCompra;

// Guardar un pago a proveedor (abono sobre una compra)
async function guardarPagoProveedor(compraId, pago){
  const row = {
    compra_id:compraId, fecha:pago.fecha, monto:pago.monto, metodo:pago.metodo,
    referencia:pago.referencia, no_recibo:pago.noRecibo, comprobante:pago.comprobante,
    registrado_por:pago.registradoPor, registrado_el:pago.registradoEl,
    anulado:pago.anulado, motivo_anulacion:pago.motivoAnulacion, es_cierre:pago.esCierre,
    cuenta_banco_id:pago.cuentaBancoId||null
  };
  const {data,error} = await sb.from('pagos_proveedor').insert(row).select().single();
  if(error){console.error('Error guardando pago a proveedor:',error);return false;}
  pago._id = data.id; return true;
}

async function guardarProducto(p){
  const row = {
    codigo:p.codigo, nombre:p.nombre, precio:p.precio, costo:p.costo,
    unidad:p.unidad, stock:p.stock, proveedor_ids:p.proveedorIds,
    sku_proveedor:p.skuProveedor, nombre_proveedor:p.nombreProveedor,
    marca:p.marca||null, activo:p.activo!==false,
    tipo_empaque:p.tipoEmpaque||'unidad', unidades_por_caja:p.unidadesPorCaja, stock_cajas:p.stockCajas||0,
    precio_unidad:p.precioUnidad||0, conversiones:p.conversiones||[], categoria:p.categoria||null
  };
  if (p._nuevo) {
    // Producto nuevo: INSERT, y Supabase genera el id real
    delete p._nuevo;
    const {data,error} = await sb.from('productos').insert(row).select().single();
    if(error){console.error('Error guardando producto:',error); p._nuevo=true;}
    else p.id = data.id;
  } else {
    // Producto existente: UPDATE
    const {error} = await sb.from('productos').update(row).eq('id', p.id);
    if(error)console.error('Error actualizando producto:',error);
  }
}

async function guardarCategoria(cat){
  const row = { nombre:cat.nombre, umbral_stock:Number(cat.umbralStock)||0 };
  const {error} = await sb.from('categorias').upsert(row,{onConflict:'nombre'});
  if(error)console.error('Error guardando categoría:',error);
  return !error;
}
async function borrarCategoria(nombre){
  const {error} = await sb.from('categorias').delete().eq('nombre', nombre);
  if(error)console.error('Error borrando categoría:',error);
  return !error;
}

// ── Recordatorios (módulo general) ──────────────────────────
function mapRecordatorioFromDB(r){
  return {
    id:r.id, titulo:r.titulo, nota:r.nota||'', tipo:r.tipo||'tarea',
    refId:r.ref_id, refLabel:r.ref_label||'',
    fechaVencimiento:r.fecha_vencimiento, asignadoA:r.asignado_a||'', creadoPor:r.creado_por||'',
    prioridad:r.prioridad||'normal', hecho:r.hecho===true, hechoPor:r.hecho_por||'', hechoFecha:r.hecho_fecha,
    creado:r.creado
  };
}
async function guardarRecordatorio(rec){
  const row={
    titulo:rec.titulo, nota:rec.nota||null, tipo:rec.tipo||'tarea',
    ref_id:rec.refId||null, ref_label:rec.refLabel||null,
    fecha_vencimiento:rec.fechaVencimiento||null, asignado_a:rec.asignadoA||null, creado_por:rec.creadoPor||null,
    prioridad:rec.prioridad||'normal', hecho:rec.hecho===true, hecho_por:rec.hechoPor||null, hecho_fecha:rec.hechoFecha||null
  };
  if(rec._nuevo){
    delete rec._nuevo;
    const {data,error}=await sb.from('recordatorios').insert(row).select().single();
    if(error){console.error('Error guardando recordatorio:',error); rec._nuevo=true;}
    else rec.id=data.id;
  }else{
    const {error}=await sb.from('recordatorios').update(row).eq('id',rec.id);
    if(error)console.error('Error actualizando recordatorio:',error);
  }
}
async function borrarRecordatorio(id){
  const {error}=await sb.from('recordatorios').delete().eq('id',id);
  if(error)console.error('Error borrando recordatorio:',error);
}
if(typeof window!=='undefined'){window.guardarRecordatorio=guardarRecordatorio;window.borrarRecordatorio=borrarRecordatorio;}

function mapCotizacionFromDB(c){
  return {
    id:c.id, numero:c.numero,
    clienteId:c.cliente_id, clienteNombre:c.cliente_nombre||'', clienteComercial:c.cliente_comercial||'', clienteNit:c.cliente_nit||'', clienteContacto:c.cliente_contacto||'', clienteTel:c.cliente_tel||'', clienteEmail:c.cliente_email||'',
    vendedorId:c.vendedor_id, vendedorNombre:c.vendedor_nombre||'', vendedorTel:c.vendedor_tel||'', vendedorEmail:c.vendedor_email||'',
    items:c.items||[], totales:c.totales||{},
    observaciones:c.observaciones||'', validezDias:Number(c.validez_dias)||15, fechaVence:c.fecha_vence,
    estado:c.estado||'borrador', creadoPor:c.creado_por||'', creada:c.creada,
    convertidoPedidoId:c.convertido_pedido_id||null
  };
}
async function guardarCotizacion(cot){
  const row={
    numero:cot.numero, cliente_id:cot.clienteId||null, cliente_nombre:cot.clienteNombre||null,
    cliente_comercial:cot.clienteComercial||null, cliente_nit:cot.clienteNit||null, cliente_contacto:cot.clienteContacto||null, cliente_tel:cot.clienteTel||null, cliente_email:cot.clienteEmail||null,
    vendedor_id:cot.vendedorId||null, vendedor_nombre:cot.vendedorNombre||null, vendedor_tel:cot.vendedorTel||null, vendedor_email:cot.vendedorEmail||null,
    items:cot.items||[], totales:cot.totales||{},
    observaciones:cot.observaciones||null, validez_dias:cot.validezDias||15, fecha_vence:cot.fechaVence||null,
    estado:cot.estado||'borrador', creado_por:cot.creadoPor||null, creada:cot.creada||null,
    convertido_pedido_id:cot.convertidoPedidoId||null
  };
  if(cot._nuevo){
    delete cot._nuevo;
    const {data,error}=await sb.from('cotizaciones').insert(row).select().single();
    if(error){console.error('Error guardando cotización:',error); cot._nuevo=true; return false;}
    cot.id=data.id; return true;
  }else{
    const {error}=await sb.from('cotizaciones').update(row).eq('id',cot.id);
    if(error){console.error('Error actualizando cotización:',error); return false;}
    return true;
  }
}
async function borrarCotizacion(id){
  const {error}=await sb.from('cotizaciones').delete().eq('id',id);
  if(error)console.error('Error borrando cotización:',error);
}
if(typeof window!=='undefined'){window.guardarCotizacion=guardarCotizacion;window.borrarCotizacion=borrarCotizacion;}

// ── Saldo a favor de clientes (creditos_cliente) ────────────
// Libro del saldo a favor: 'ingreso' entra crédito (sobrepago/anticipo),
// 'aplicacion' lo usa en una factura. El saldo se calcula en la app.
function mapCreditoFromDB(c){
  return {
    id:c.id, clienteId:c.cliente_id, tipo:c.tipo||'ingreso', monto:Number(c.monto)||0,
    fecha:c.fecha, documentoId:c.documento_id, noRecibo:c.no_recibo, metodo:c.metodo,
    referencia:c.referencia, cuentaBancoId:c.cuenta_banco_id, concepto:c.concepto,
    registradoPor:c.registrado_por, registradoEl:c.registrado_el,
    anulado:c.anulado===true, motivoAnulacion:c.motivo_anulacion, _id:c.id
  };
}
async function guardarCredito(cr){
  const row={
    cliente_id:cr.clienteId, tipo:cr.tipo||'ingreso', monto:cr.monto, fecha:cr.fecha||null,
    documento_id:cr.documentoId||null, no_recibo:cr.noRecibo||null, metodo:cr.metodo||null,
    referencia:cr.referencia||null, cuenta_banco_id:cr.cuentaBancoId||null, concepto:cr.concepto||null,
    registrado_por:cr.registradoPor||null, registrado_el:cr.registradoEl||null, anulado:cr.anulado===true
  };
  const {data,error}=await sb.from('creditos_cliente').insert(row).select().single();
  if(error){console.error('Error guardando saldo a favor:',error);return false;}
  cr.id=data.id; cr._id=data.id; return true;
}
async function anularCreditoDB(cr){
  if(!cr._id&&!cr.id)return;
  const {error}=await sb.from('creditos_cliente').update({anulado:true,motivo_anulacion:cr.motivoAnulacion||null}).eq('id',cr._id||cr.id);
  if(error)console.error('Error anulando saldo a favor:',error);
}
if(typeof window!=='undefined'){window.guardarCredito=guardarCredito;window.anularCreditoDB=anularCreditoDB;}

async function guardarAuditoria(entry){
  const row = {
    fecha:entry.fecha, usuario:entry.usuario, rol:entry.rol,
    accion:entry.accion, detalle:entry.detalle, prev_hash:entry.prevHash, hash:entry.hash
  };
  const {error} = await sb.from('auditoria').insert(row);
  if(error)console.error(error);
}

// Actualizar solo el stock de un producto (usado al facturar/comprar)
async function actualizarStock(productoId, nuevoStock){
  const {error} = await sb.from('productos').update({stock:nuevoStock}).eq('id', productoId);
  if(error)console.error(error);
}

// Anular un abono (UPDATE por su id en la base)
async function anularAbonoDB(abono){
  if(!abono._id)return; // si no tiene id de base, no estaba guardado
  const {error}=await sb.from('abonos').update({
    anulado:true, motivo_anulacion:abono.motivoAnulacion
  }).eq('id', abono._id);
  if(error)console.error('Error anulando abono:',error);
}

// Editar un abono existente (UPDATE de campos editables por su id en la base).
async function actualizarAbonoDB(abono){
  if(!abono._id)return; // si no tiene id de base, no estaba guardado
  const {error}=await sb.from('abonos').update({
    fecha:abono.fecha, monto:abono.monto, metodo:abono.metodo,
    referencia:abono.referencia, no_recibo:abono.noRecibo
  }).eq('id', abono._id);
  if(error)console.error('Error actualizando abono:',error);
}

// Anular un pago a proveedor (UPDATE por su id en la base)
async function anularPagoProveedorDB(pago){
  if(!pago._id)return;
  const {error}=await sb.from('pagos_proveedor').update({
    anulado:true, motivo_anulacion:pago.motivoAnulacion
  }).eq('id', pago._id);
  if(error)console.error('Error anulando pago a proveedor:',error);
}

// Asignarle la cuenta de banco a un pago que se registró sin ella
// (compra al contado que quedó "sin asignar"). Se usa desde Bancos.
async function actualizarCuentaPagoProveedor(pago){
  if(!pago._id)return;
  const {error}=await sb.from('pagos_proveedor').update({
    cuenta_banco_id:pago.cuentaBancoId||null
  }).eq('id', pago._id);
  if(error)console.error('Error asignando la cuenta al pago:',error);
}
if(typeof window!=='undefined')window.actualizarCuentaPagoProveedor=actualizarCuentaPagoProveedor;

// Guardar/actualizar un usuario en la tabla usuarios
async function guardarUsuario(u){
  const row = {
    nombre:u.nombre, correo:u.correo, rol:u.rol, activo:u.activo,
    vendedor_id:u.vendedorId, piloto_id:u.pilotoId
  };
  if (u._nuevo) {
    delete u._nuevo;
    const {data,error} = await sb.from('usuarios').insert(row).select().single();
    if(error){console.error('Error guardando usuario:',error); u._nuevo=true;}
    else u.id = data.id;
  } else {
    const {error} = await sb.from('usuarios').update(row).eq('id', u.id);
    if(error)console.error('Error actualizando usuario:',error);
  }
}

// Guardar/actualizar un vendedor
async function guardarVendedor(v){
  const row = {nombre:v.nombre};
  if (v._nuevo) {
    delete v._nuevo;
    const {data,error} = await sb.from('vendedores').insert(row).select().single();
    if(error){console.error('Error guardando vendedor:',error); v._nuevo=true;}
    else v.id = data.id;
  } else {
    const {error} = await sb.from('vendedores').update(row).eq('id', v.id);
    if(error)console.error('Error actualizando vendedor:',error);
  }
}

// Guardar/actualizar un piloto
async function guardarPiloto(p){
  const row = {nombre:p.nombre};
  if (p._nuevo) {
    delete p._nuevo;
    const {data,error} = await sb.from('pilotos').insert(row).select().single();
    if(error){console.error('Error guardando piloto:',error); p._nuevo=true;}
    else p.id = data.id;
  } else {
    const {error} = await sb.from('pilotos').update(row).eq('id', p.id);
    if(error)console.error('Error actualizando piloto:',error);
  }
}

// Guardar/actualizar un proveedor
async function guardarProveedor(pr){
  const row = {nombre:pr.nombre, razon_social:pr.razonSocial, nit:pr.nit, telefono:pr.telefono, correo:pr.correo, dias_credito:pr.diasCredito};
  if (pr._nuevo) {
    delete pr._nuevo;
    const {data,error} = await sb.from('proveedores').insert(row).select().single();
    if(error){console.error('Error guardando proveedor:',error); pr._nuevo=true;}
    else pr.id = data.id;
  } else {
    const {error} = await sb.from('proveedores').update(row).eq('id', pr.id);
    if(error)console.error('Error actualizando proveedor:',error);
  }
}
if(typeof window!=='undefined')window.guardarProveedor=guardarProveedor;

// ── Cuentas de banco ──────────────────────────────────────
async function guardarCuentaBanco(c){
  const row = {nombre:c.nombre, banco:c.banco||null, numero:c.numero||null, tipo:c.tipo||'monetaria',
    moneda:c.moneda||'GTQ', saldo_inicial:Number(c.saldoInicial)||0, activo:c.activo!==false};
  if (c._nuevo) {
    delete c._nuevo;
    const {data,error} = await sb.from('cuentas_banco').insert(row).select().single();
    if(error){console.error('Error guardando cuenta:',error); c._nuevo=true;}
    else c.id = data.id;
  } else {
    const {error} = await sb.from('cuentas_banco').update(row).eq('id', c.id);
    if(error)console.error('Error actualizando cuenta:',error);
  }
}
async function eliminarCuentaBanco(id){
  const {error} = await sb.from('cuentas_banco').delete().eq('id', id);
  if(error)console.error('Error eliminando cuenta:',error);
}
// ── Movimientos de banco (fase siguiente) ─────────────────
async function guardarMovimientoBanco(m){
  const row = {cuenta_id:m.cuentaId, fecha:m.fecha, tipo:m.tipo, monto:Number(m.monto)||0,
    concepto:m.concepto||null, categoria:m.categoria||null, origen:m.origen||'manual', origen_id:m.origenId||null,
    cuenta_destino_id:m.cuentaDestinoId||null, referencia:m.referencia||null, poliza:m.poliza||null,
    registrado_por:m.registradoPor||null, anulado:m.anulado===true};
  if (m._nuevo) {
    delete m._nuevo;
    const {data,error} = await sb.from('movimientos_banco').insert(row).select().single();
    if(error){console.error('Error guardando movimiento:',error); m._nuevo=true;}
    else m.id = data.id;
  } else {
    const {error} = await sb.from('movimientos_banco').update(row).eq('id', m.id);
    if(error)console.error('Error actualizando movimiento:',error);
  }
}
if(typeof window!=='undefined'){window.guardarCuentaBanco=guardarCuentaBanco;window.eliminarCuentaBanco=eliminarCuentaBanco;window.guardarMovimientoBanco=guardarMovimientoBanco;}

// ── Guardar/actualizar un ROL (permisos y sub-permisos) ──────
// Convierte el formato en memoria (camelCase) al de la base (snake_case).
// views se guarda como JSON: 'ALL' tal cual, o el array de secciones.
async function guardarRol(rolKey, r){
  if(!r) return;
  const viewsVal = (r.views === 'ALL') ? 'ALL' : (Array.isArray(r.views) ? r.views : []);
  const row = {
    label: r.label,
    views: viewsVal,
    anular: !!r.anular,
    facturar: !!r.facturar,
    crear_cliente: !!r.crearCliente,
    editar_inventario: !!r.editarInventario,
    registrar_abono: !!r.registrarAbono,
    readonly: !!r.readonly,
    compra_especial: !!r.compraEspecial,
    asignar_piloto: !!r.asignarPiloto,
    convertir_cajas: !!r.convertirCajas
  };
  const {error} = await sb.from('roles').update(row).eq('rol', rolKey);
  if(error) console.error('Error guardando rol '+rolKey+':', error);
  return !error;
}

// ── Guardar la configuración del DASHBOARD por rol ───────────
async function guardarDashboardConfig(rolKey, config){
  // upsert: si no existe la fila para ese rol, la crea; si existe, la actualiza.
  const {error} = await sb.from('dashboard_config')
    .upsert({rol: rolKey, config: config}, {onConflict: 'rol'});
  if(error) console.error('Error guardando dashboard_config '+rolKey+':', error);
  return !error;
}

// ── Guardar/actualizar un TALONARIO de recibos ──────────────
async function guardarTalonario(t){
  const row = {
    numero_inicial: t.numeroInicial,
    numero_final: t.numeroFinal,
    cantidad: t.cantidad||50,
    asignado_a: t.asignadoA||null,
    asignado_id: t.asignadoId||null,
    descripcion: t.descripcion||null,
    estado: t.estado||'activo',
    fecha_entrega: t.fechaEntrega||null
  };
  if (t._nuevo) {
    delete t._nuevo;
    const {data,error} = await sb.from('talonarios').insert(row).select().single();
    if(error){console.error('Error guardando talonario:',error); t._nuevo=true; return false;}
    else { t.id = data.id; return true; }
  } else {
    const {error} = await sb.from('talonarios').update(row).eq('id', t.id);
    if(error){console.error('Error actualizando talonario:',error); return false;}
    return true;
  }
}

// ── Eliminar un talonario ────────────────────────────────────
async function eliminarTalonario(id){
  const {error} = await sb.from('talonarios').delete().eq('id', id);
  if(error){console.error('Error eliminando talonario:',error); return false;}
  return true;
}

// ── Anular un recibo (marcarlo como dañado/no usado) ─────────
async function guardarReciboAnulado(r){
  const row = {
    numero: r.numero,
    talonario_id: r.talonarioId||null,
    motivo: r.motivo||null,
    anulado_por: r.anuladoPor||null
  };
  const {data,error} = await sb.from('recibos_anulados').insert(row).select().single();
  if(error){console.error('Error anulando recibo:',error); return false;}
  r.id = data.id;
  return true;
}

// ── Quitar la anulación de un recibo ─────────────────────────
async function eliminarReciboAnulado(id){
  const {error} = await sb.from('recibos_anulados').delete().eq('id', id);
  if(error){console.error('Error quitando anulación:',error); return false;}
  return true;
}
