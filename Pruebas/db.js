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
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// CARGA INICIAL — trae todo de la base y llena los arrays de la app
// ============================================================
async function cargarTodo() {
  try {
    const [
      rClientes, rProductos, rVendedores, rPilotos, rProveedores,
      rDocumentos, rAbonos, rCobrosRuta, rCompras, rPagos, rRoles, rUsuarios, rAudit, rDashboard, rTalonarios
    ] = await Promise.all([
      sb.from('clientes').select('*').order('id'),
      sb.from('productos').select('*').order('id'),
      sb.from('vendedores').select('*').order('id'),
      sb.from('pilotos').select('*').order('id'),
      sb.from('proveedores').select('*').order('id'),
      sb.from('documentos').select('*').order('id'),
      sb.from('abonos').select('*').order('id'),
      sb.from('cobros_ruta').select('*').order('id'),
      sb.from('compras').select('*').order('id'),
      sb.from('pagos_proveedor').select('*').order('id'),
      sb.from('roles').select('*'),
      sb.from('usuarios').select('*').order('id'),
      sb.from('auditoria').select('*').order('seq'),
      sb.from('dashboard_config').select('*'),
      sb.from('talonarios').select('*').order('numero_inicial'),
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
    auditLog = (rAudit.data||[]).map(a=>({
      seq:a.seq, fecha:a.fecha, usuario:a.usuario, rol:a.rol,
      accion:a.accion, detalle:a.detalle, prevHash:a.prev_hash, hash:a.hash
    })).reverse();
    auditSeq = auditLog.length ? Math.max(...auditLog.map(a=>a.seq)) : 0;

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
      talonarios = (rTalonarios.data||[]).map(t=>({
        id:t.id, numeroInicial:t.numero_inicial, numeroFinal:t.numero_final,
        cantidad:t.cantidad, asignadoA:t.asignado_a, asignadoId:t.asignado_id,
        descripcion:t.descripcion, estado:t.estado, fechaEntrega:t.fecha_entrega, creado:t.creado
      }));
    }

    console.log('✓ Datos cargados desde Supabase');
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
    vendedorId:c.vendedor_id, sedesDe:c.sedes_de,
    contactoPagos:c.contacto_pagos||{}, contactoCompras:c.contacto_compras||{},
    precios:c.precios||{}
  };
}
function mapProductoFromDB(p){
  return {
    id:p.id, codigo:p.codigo, nombre:p.nombre, precio:Number(p.precio),
    costo:Number(p.costo), unidad:p.unidad, stock:Number(p.stock),
    proveedorIds:p.proveedor_ids||[], skuProveedor:p.sku_proveedor, nombreProveedor:p.nombre_proveedor,
    marca:p.marca||'', activo:p.activo!==false,
    tipoEmpaque:p.tipo_empaque||'unidad', unidadesPorCaja:p.unidades_por_caja, stockCajas:Number(p.stock_cajas||0)
  };
}
function mapProveedorFromDB(p){
  return {
    id:p.id, nombre:p.nombre, razonSocial:p.razon_social, nit:p.nit,
    telefono:p.telefono, correo:p.correo, diasCredito:p.dias_credito
  };
}
function mapDocumentoFromDB(d, todosAbonos){
  const abonos = todosAbonos.filter(a=>a.documento_id===d.id).map(a=>({
    fecha:a.fecha, monto:Number(a.monto), metodo:a.metodo, referencia:a.referencia,
    noRecibo:a.no_recibo, comprobante:a.comprobante, registradoPor:a.registrado_por,
    registradoEl:a.registrado_el, anulado:a.anulado, motivoAnulacion:a.motivo_anulacion,
    origenCobroRuta:a.origen_cobro_ruta, _id:a.id
  }));
  return {
    id:d.id, numero:d.numero, tipoDoc:d.tipo_doc, clienteId:d.cliente_id,
    clienteNombre:d.cliente_nombre, clienteComercial:d.cliente_comercial, clienteNit:d.cliente_nit,
    vendedorId:d.vendedor_id, vendedorNombre:d.vendedor_nombre,
    items:d.items||[], totales:d.totales||{}, estado:d.estado, estadoPago:d.estado_pago,
    inventarioRebajado:d.inventario_rebajado, autorizacion:d.autorizacion,
    serie:d.serie, numeroDte:d.numero_dte, ordenCompra:d.orden_compra,
    diasCredito:d.dias_credito, vencimiento:d.vencimiento,
    exenta:d.exenta, escenarioExenta:d.escenario_exenta,
    pilotoId:d.piloto_id, ordenRuta:d.orden_ruta, estadoEntrega:d.estado_entrega,
    entregaInfo:d.entrega_info, anulado:d.anulado, motivoAnulacion:d.motivo_anulacion,
    pdfBase64:d.pdf_base64, xmlBase64:d.xml_base64, fechaCertificacion:d.fecha_certificacion,
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
function mapCompraFromDB(c, todosPagos){
  const abonos = todosPagos.filter(p=>p.compra_id===c.id).map(p=>({
    fecha:p.fecha, monto:Number(p.monto), metodo:p.metodo, referencia:p.referencia,
    noRecibo:p.no_recibo, comprobante:p.comprobante, registradoPor:p.registrado_por,
    registradoEl:p.registrado_el, anulado:p.anulado, motivoAnulacion:p.motivo_anulacion,
    esCierre:p.es_cierre, _id:p.id
  }));
  return {
    id:c.id, proveedorId:c.proveedor_id, proveedorNombre:c.proveedor_nombre,
    items:c.items||[], total:Number(c.total), fecha:c.fecha,
    estadoRecepcion:c.estado_recepcion, facturada:c.facturada, docProv:c.doc_prov,
    tipoPago:c.tipo_pago, diasCredito:c.dias_credito, vencimiento:c.vencimiento,
    especial:c.especial, oficializada:c.oficializada,
    anulado:c.anulado, motivoAnulacion:c.motivo_anulacion, abonos
  };
}
function mapUsuarioFromDB(u){
  return {
    id:u.id, nombre:u.nombre, correo:u.correo, rol:u.rol, activo:u.activo,
    vendedorId:u.vendedor_id, pilotoId:u.piloto_id, authId:u.auth_id
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
    vendedor_id:cli.vendedorId, sedes_de:cli.sedesDe,
    contacto_pagos:cli.contactoPagos, contacto_compras:cli.contactoCompras, precios:cli.precios
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

async function guardarDocumento(d){
  const row = {
    numero:d.numero, tipo_doc:d.tipoDoc, cliente_id:d.clienteId,
    cliente_nombre:d.clienteNombre, cliente_comercial:d.clienteComercial, cliente_nit:d.clienteNit,
    vendedor_id:d.vendedorId, vendedor_nombre:d.vendedorNombre,
    items:d.items, totales:d.totales, estado:d.estado, estado_pago:d.estadoPago,
    inventario_rebajado:d.inventarioRebajado, autorizacion:d.autorizacion,
    serie:d.serie, numero_dte:d.numeroDte, orden_compra:d.ordenCompra,
    dias_credito:d.diasCredito, vencimiento:d.vencimiento,
    exenta:d.exenta, escenario_exenta:d.escenarioExenta,
    piloto_id:d.pilotoId, orden_ruta:d.ordenRuta, estado_entrega:d.estadoEntrega,
    entrega_info:d.entregaInfo, anulado:d.anulado, motivo_anulacion:d.motivoAnulacion,
    pdf_base64:d.pdfBase64, xml_base64:d.xmlBase64, fecha_certificacion:d.fechaCertificacion,
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
    anulado:ab.anulado, motivo_anulacion:ab.motivoAnulacion, origen_cobro_ruta:ab.origenCobroRuta
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
    oficializada:c.oficializada, anulado:c.anulado, motivo_anulacion:c.motivoAnulacion
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

// Guardar un pago a proveedor (abono sobre una compra)
async function guardarPagoProveedor(compraId, pago){
  const row = {
    compra_id:compraId, fecha:pago.fecha, monto:pago.monto, metodo:pago.metodo,
    referencia:pago.referencia, no_recibo:pago.noRecibo, comprobante:pago.comprobante,
    registrado_por:pago.registradoPor, registrado_el:pago.registradoEl,
    anulado:pago.anulado, motivo_anulacion:pago.motivoAnulacion, es_cierre:pago.esCierre
  };
  const {data,error} = await sb.from('pagos_proveedor').insert(row).select().single();
  if(error)console.error('Error guardando pago a proveedor:',error); else pago._id = data.id;
}

async function guardarProducto(p){
  const row = {
    codigo:p.codigo, nombre:p.nombre, precio:p.precio, costo:p.costo,
    unidad:p.unidad, stock:p.stock, proveedor_ids:p.proveedorIds,
    sku_proveedor:p.skuProveedor, nombre_proveedor:p.nombreProveedor,
    marca:p.marca||null, activo:p.activo!==false,
    tipo_empaque:p.tipoEmpaque||'unidad', unidades_por_caja:p.unidadesPorCaja, stock_cajas:p.stockCajas||0
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

// Anular un pago a proveedor (UPDATE por su id en la base)
async function anularPagoProveedorDB(pago){
  if(!pago._id)return;
  const {error}=await sb.from('pagos_proveedor').update({
    anulado:true, motivo_anulacion:pago.motivoAnulacion
  }).eq('id', pago._id);
  if(error)console.error('Error anulando pago a proveedor:',error);
}

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
