// ============================================================
//  SEFE · app-14.js — TIENDA EN LÍNEA (lado del sistema)
// ============================================================
//  La página pública vive en /tienda/ y habla con la base por las
//  funciones tienda_* (ver 20261126120000_tienda_en_linea.sql).
//  Acá está lo que hace el personal:
//    · Pedidos web: revisar lo que entró, decidir QUÉ EMPRESA lo vende
//      (producto por producto si hace falta) y pasarlo a pedido (PED-…).
//    · Productos: qué se muestra en la tienda y con qué foto.
//    · Clientes: dar la clave para que un cliente entre y vea sus precios.
//    · Configuración: encender/apagar la tienda, WhatsApp, pedido mínimo.
//  La tienda es UNIFICADA: muestra una ficha por código aunque el
//  producto exista en SEFE y en LAML. Por eso foto y "oculto" se
//  aplican a todos los productos con ese código.
// ============================================================

let _twTab='pedidos', _twPedidos=null, _twSinTabla=false, _twFiltro='nuevo';
let _twExtra=null;            // {idProducto:{img,oculto,desc}}
let _twAccesos=null;          // {clienteId:{creado}}
let _twProdQ='', _twCliQ='', _twProdSolo='todos';
let _twNuevosAntes=null;

const _TW_PAGO={transferencia:'Transferencia o depósito',contra_entrega:'Pago contra entrega',credito:'Crédito'};
const _twCod=c=>String(c==null?'':c).trim().toUpperCase();
const _twNit=n=>String(n==null?'':n).replace(/[^0-9A-Za-z]/g,'').toUpperCase();
const _twNum=p=>'WEB-'+String(p.id).padStart(4,'0');
function _twCfg(){
  const base={activa:false,mostrarAgotados:false,whatsapp:'',pedidoMinimo:0,aviso:'',tema:'original'};
  const v=(typeof ajustes!=='undefined'&&ajustes&&ajustes.tienda)||{};
  return Object.assign(base,(v&&typeof v==='object')?v:{});
}
function _twPuede(){return !(typeof soloLectura==='function'&&soloLectura());}
function _twUrl(){return new URL('tienda/',location.href.split('#')[0].split('?')[0]).href;}
// Existencias que cuentan para vender por la tienda (igual que en la base).
function _twDisp(p){return Math.max(0,Number(p.tipoEmpaque==='caja_unidad'?p.stockCajas:p.stock)||0);}
function _twModo(p){return (p.tipoEmpaque==='caja'||p.tipoEmpaque==='caja_unidad')?'caja':'unidad';}

// ── Carga ───────────────────────────────────────────────────
async function _twCargarPedidos(){
  try{
    const {data,error}=await sb.from('pedidos_web').select('*').order('id',{ascending:false}).limit(300);
    if(error){_twSinTabla=true;_twPedidos=[];return;}
    _twSinTabla=false;_twPedidos=data||[];
  }catch(e){_twSinTabla=true;_twPedidos=[];}
}
async function _twCargarExtra(){
  _twExtra={};
  try{
    const filas=(typeof fetchAll==='function')?await fetchAll('productos','id','id,imagen_url,tienda_oculto,tienda_descripcion'):[];
    (filas||[]).forEach(r=>{_twExtra[r.id]={img:r.imagen_url||'',oculto:r.tienda_oculto===true,desc:String(r.tienda_descripcion||'').trim()};});
  }catch(e){console.warn('Tienda: no se pudieron leer fotos/visibilidad/descripciones',e);}
}
async function _twCargarAccesos(){
  _twAccesos={};
  try{
    const {data}=await sb.from('tienda_accesos').select('cliente_id,creado');
    (data||[]).forEach(r=>{_twAccesos[r.cliente_id]={creado:r.creado};});
  }catch(e){}
}

// Cuenta los pedidos web sin atender y lo muestra en el menú.
async function _twContarNuevos(){
  try{
    if(typeof sb==='undefined'||typeof tienePermiso!=='function'||!tienePermiso('tiendaweb'))return;
    const {count,error}=await sb.from('pedidos_web').select('id',{count:'exact',head:true}).eq('estado','nuevo');
    if(error)return;
    const btn=document.querySelector('.nav button[data-view="tiendaweb"] span');
    if(btn)btn.innerHTML='Tienda en línea'+(count?` <b class="badge b-warn" style="margin-left:4px">${count}</b>`:'');
    if(_twNuevosAntes!=null&&count>_twNuevosAntes&&typeof toast==='function')toast('🛒 Pedido nuevo de la tienda en línea','Revisalo en Tienda en línea → Pedidos web');
    _twNuevosAntes=count||0;
  }catch(e){}
}

// ── Vista ───────────────────────────────────────────────────
async function renderTiendaWeb(){
  const box=document.getElementById('tiendaweb-body'); if(!box)return;
  if(_twPedidos===null){box.innerHTML='<div class="empty">Cargando…</div>';await _twCargarPedidos();}
  const cfg=_twCfg();
  const nuevos=(_twPedidos||[]).filter(p=>p.estado==='nuevo').length;
  const tabs=[['pedidos','Pedidos web'+(nuevos?` (${nuevos})`:'')],['productos','Productos y fotos'],['clientes','Acceso de clientes'],['config','Configuración']];
  let cuerpo='';
  if(_twSinTabla)cuerpo='<div class="note"><span>La tienda todavía no está activada en la base.</span></div>';
  else if(_twTab==='pedidos')cuerpo=_twHtmlPedidos();
  else if(_twTab==='productos'){if(_twExtra===null){await _twCargarExtra();}cuerpo=_twHtmlProductos();}
  else if(_twTab==='clientes'){if(_twAccesos===null){await _twCargarAccesos();}cuerpo=_twHtmlClientes();}
  else cuerpo=_twHtmlConfig();
  box.innerHTML=`
    <div class="note ${cfg.activa?'n-ok':''}" style="margin:0 0 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="flex:1;min-width:220px">${cfg.activa?'🟢 La tienda está <b>abierta al público</b>.':'⚪ La tienda está <b>apagada</b>: el público ve "Estamos preparando la tienda". Se enciende en Configuración.'}
      <br><span style="font-size:12px;color:var(--muted)">${escHtml(_twUrl())}</span></span>
      <button class="btn" onclick="twCopiarLink()">Copiar enlace</button>
      <button class="btn btn-primary" onclick="twAbrirTienda()">${cfg.activa?'Abrir tienda':'Vista previa'}</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${tabs.map(([k,l])=>`<button class="btn${_twTab===k?' btn-primary':''}" onclick="twTab('${k}')">${l}</button>`).join('')}</div>
    ${cuerpo}`;
}
function twTab(t){_twTab=t;renderTiendaWeb();}
function twCopiarLink(){try{navigator.clipboard.writeText(_twUrl());toast('✓ Enlace copiado',_twUrl());}catch(e){toast('Enlace de la tienda',_twUrl());}}
// Abre la tienda. Si está apagada, pasa la sesión en el #hash (no viaja al
// servidor) para que el personal la vea igual: vista previa.
async function twAbrirTienda(){
  let url=_twUrl();
  if(!_twCfg().activa){
    try{const {data}=await sb.auth.getSession();const t=data&&data.session&&data.session.access_token;if(t)url+='#previa='+encodeURIComponent(t);}catch(e){}
  }
  window.open(url,'_blank','noopener');
}

// ── Pedidos web ─────────────────────────────────────────────
function _twBadge(p){
  if(p.estado==='nuevo')return '<span class="badge b-warn">Nuevo</span>';
  if(p.estado==='convertido')return '<span class="badge b-ok">Pasado a pedido</span>';
  if(p.estado==='rechazado')return '<span class="badge b-danger">Rechazado</span>';
  return `<span class="badge b-info">${escHtml(p.estado)}</span>`;
}
function _twHtmlPedidos(){
  const lista=(_twPedidos||[]).filter(p=>_twFiltro==='todos'||p.estado===_twFiltro);
  const filtros=[['nuevo','Sin atender'],['convertido','Pasados a pedido'],['rechazado','Rechazados'],['todos','Todos']];
  const filas=lista.map(p=>{
    const its=Array.isArray(p.items)?p.items:[];
    const peds=(Array.isArray(p.pedidos_ids)?p.pedidos_ids:[]).map(id=>{const d=(typeof documentos!=='undefined'?documentos:[]).find(x=>x.id===id);return d?'PED-'+padn(d.numero)+' ('+escHtml(d.empresa||'')+')':'';}).filter(Boolean).join(', ');
    return `<div class="panel" style="margin-bottom:10px"><div class="panel-head" style="flex-wrap:wrap;gap:8px">
        <h3>${_twNum(p)} · ${escHtml(p.nombre)}</h3>
        <span style="display:flex;gap:8px;align-items:center">${_twBadge(p)}<b class="num">${money(p.total)}</b></span></div>
      <div class="panel-body" style="font-size:13px">
        <div style="color:var(--muted);margin-bottom:8px">${escHtml(fdatehora(p.creado))} · NIT ${escHtml(p.nit||'CF')} · Tel. ${escHtml(p.telefono||'—')}${p.email?' · '+escHtml(p.email):''}
          · <b>${escHtml(_TW_PAGO[p.forma_pago]||p.forma_pago||'')}</b>${p.cliente_id?' · <span class="badge b-info">Cliente con acceso</span>':''}</div>
        <div style="margin-bottom:8px">📍 ${escHtml(p.direccion||'')}${p.notas?`<br>📝 ${escHtml(p.notas)}`:''}</div>
        <table><thead><tr><th>Código</th><th>Producto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>
        ${its.map(it=>`<tr><td>${escHtml(it.codigo)}</td><td>${escHtml(it.nombre)}</td><td class="num" style="text-align:right">${Number(it.cantidad)}</td><td class="num" style="text-align:right">${money(it.precio)}</td><td class="num" style="text-align:right">${money(Number(it.precio)*Number(it.cantidad))}</td></tr>`).join('')}
        </tbody></table>
        ${p.estado==='convertido'?`<div class="note n-ok" style="margin-top:10px"><span>✓ ${peds||'Pasado a pedido'} · por ${escHtml(p.atendido_por||'')} el ${escHtml(fdatehora(p.atendido_el))}</span></div>`:''}
        ${p.estado==='rechazado'?`<div class="note" style="margin-top:10px"><span>Rechazado por ${escHtml(p.atendido_por||'')}: ${escHtml(p.motivo_rechazo||'sin motivo')}</span></div>`:''}
        ${(p.estado==='nuevo'&&_twPuede())?`<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
          <button class="btn" onclick="twRechazar(${p.id})">Rechazar</button>
          <button class="btn btn-primary" onclick="twConvertir(${p.id})">Elegir empresa y pasar a pedido</button></div>`:''}
      </div></div>`;
  }).join('');
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      ${filtros.map(([k,l])=>`<button class="btn${_twFiltro===k?' btn-primary':''}" style="font-size:12px" onclick="twFiltro('${k}')">${l}</button>`).join('')}
      <button class="btn" style="font-size:12px;margin-left:auto" onclick="twRecargar()">↻ Actualizar</button></div>
    ${filas||'<div class="empty">No hay pedidos de la tienda en esta lista.</div>'}`;
}
function twFiltro(f){_twFiltro=f;renderTiendaWeb();}
async function twRecargar(){_twPedidos=null;await renderTiendaWeb();_twContarNuevos();}

// Productos del sistema que corresponden a una línea del pedido web.
function _twCandidatos(it){
  return (typeof productos!=='undefined'?productos:[]).filter(p=>p.activo!==false&&_twCod(p.codigo)===_twCod(it.codigo));
}
// Empresa sugerida para una línea: la preferida si tiene existencias; si
// no, la que sí tenga; si ninguna, la preferida igual.
function _twSugerida(it,pref){
  const c=_twCandidatos(it); if(!c.length)return '';
  const cant=Number(it.cantidad)||0;
  const enPref=c.find(p=>(p.empresa||'SEFE')===pref);
  if(enPref&&_twDisp(enPref)>=cant)return pref;
  const otra=c.find(p=>_twDisp(p)>=cant);
  return (otra&&(otra.empresa||'SEFE'))||(enPref?pref:(c[0].empresa||'SEFE'));
}
// Cliente del sistema que se usará en una empresa (o null → se crea).
function _twClienteEn(pw,emp){
  const cs=(typeof clientes!=='undefined'?clientes:[]).filter(c=>c.activo!==false&&(c.empresa||'SEFE')===emp);
  if(pw.cliente_id){const c=cs.find(x=>x.id===pw.cliente_id);if(c)return c;}
  const nit=_twNit(pw.nit);
  if(nit&&nit!=='CF'){
    const mismos=cs.filter(c=>_twNit(c.nit)===nit);
    return mismos.find(c=>!c.sedesDe)||mismos[0]||null;
  }
  return null;
}

function twConvertir(id){
  const pw=(_twPedidos||[]).find(p=>p.id===id); if(!pw||pw.estado!=='nuevo')return;
  if(!_twPuede()){toast('Sin permiso','Tu usuario es de sólo lectura.',true);return;}
  const emps=((typeof empresas!=='undefined'&&empresas.length)?empresas.filter(e=>e.activo!==false).map(e=>e.codigo):['SEFE']);
  const pref=(typeof empresaParaNuevo==='function'?empresaParaNuevo():'SEFE');
  const its=Array.isArray(pw.items)?pw.items:[];
  const filas=its.map((it,i)=>{
    const c=_twCandidatos(it);
    const sug=_twSugerida(it,emps.includes(pref)?pref:emps[0]);
    const ops=c.map(p=>{const e=p.empresa||'SEFE';return `<option value="${escHtml(e)}"${e===sug?' selected':''}>${escHtml(nombreEmpresa(e))} · hay ${_twDisp(p)}</option>`;}).join('');
    return `<tr><td>${escHtml(it.nombre)}<br><span style="font-size:11.5px;color:var(--muted)">${escHtml(it.codigo)} · ${money(it.precio)}</span></td>
      <td class="num" style="text-align:right">${Number(it.cantidad)}</td>
      <td>${c.length?`<select class="tw-emp" data-i="${i}" onchange="_twResumen(${pw.id})">${ops}</select>`:'<span style="color:var(--danger)">Ya no existe en el sistema</span>'}</td></tr>`;
  }).join('');
  openMod('Pasar '+_twNum(pw)+' a pedido',`
    <p style="font-size:13px;color:var(--muted);line-height:1.5;margin:0 0 10px">Elegí <b>qué empresa vende</b> cada producto. Se crea un pedido abierto por empresa, con el precio que vio el comprador, y se reserva el inventario.</p>
    ${emps.length>1?`<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">${emps.map(e=>`<button type="button" class="btn" style="font-size:12px" onclick="_twTodoA('${escHtml(e)}',${pw.id})">Todo a ${escHtml(nombreEmpresa(e))}</button>`).join('')}</div>`:''}
    <table><thead><tr><th>Producto</th><th style="text-align:right">Cant.</th><th>La vende</th></tr></thead><tbody>${filas}</tbody></table>
    <div id="tw-resumen" style="margin-top:12px;font-size:13px"></div>`,()=>_twConfirmarConvertir(pw.id));
  $('#m-save').textContent='Pasar a pedido';
  _twResumen(pw.id);
}
function _twTodoA(emp,id){
  document.querySelectorAll('select.tw-emp').forEach(s=>{if([...s.options].some(o=>o.value===emp))s.value=emp;});
  _twResumen(id);
}
// Arma el plan según lo elegido: {grupos:{EMP:[{p,it}]}, errores:[]}
function _twPlan(pw){
  const its=Array.isArray(pw.items)?pw.items:[];
  const grupos={}, errores=[];
  its.forEach((it,i)=>{
    const sel=document.querySelector(`select.tw-emp[data-i="${i}"]`);
    if(!sel){errores.push(`${it.nombre}: ya no existe en el sistema`);return;}
    const p=_twCandidatos(it).find(x=>(x.empresa||'SEFE')===sel.value);
    if(!p){errores.push(`${it.nombre}: no está en ${sel.value}`);return;}
    const cant=Number(it.cantidad)||0;
    if(cant>_twDisp(p))errores.push(`${it.nombre}: pide ${cant} y en ${nombreEmpresa(sel.value)} hay ${_twDisp(p)}`);
    (grupos[sel.value]=grupos[sel.value]||[]).push({p,it});
  });
  return {grupos,errores};
}
function _twResumen(id){
  const pw=(_twPedidos||[]).find(p=>p.id===id); const box=document.getElementById('tw-resumen'); if(!pw||!box)return;
  const {grupos,errores}=_twPlan(pw);
  const partes=Object.keys(grupos).map(e=>{
    const tot=grupos[e].reduce((s,x)=>s+Number(x.it.precio)*Number(x.it.cantidad),0);
    const cli=_twClienteEn(pw,e);
    return `<div style="padding:8px 10px;border:1px solid var(--line,#e5e5e5);border-radius:8px;margin-bottom:6px"><b>Pedido de ${escHtml(nombreEmpresa(e))}</b> · ${grupos[e].length} producto(s) · ${money(tot)}<br>
      <span style="color:var(--muted)">Cliente: ${cli?escHtml(cli.nombre)+' (ya existe)':'se crea <b>'+escHtml(pw.nombre)+'</b> · NIT '+escHtml(pw.nit||'CF')}</span></div>`;
  }).join('');
  box.innerHTML=partes+(errores.length?`<div class="note" style="margin-top:6px"><span><b>No se puede pasar todavía:</b><br>${errores.map(escHtml).join('<br>')}<br>Cambiá la empresa de esa línea, reabastecé, o rechazá el pedido.</span></div>`:'');
  const sv=document.getElementById('m-save'); if(sv)sv.disabled=errores.length>0||!Object.keys(grupos).length;
}
async function _twConfirmarConvertir(id){
  const pw=(_twPedidos||[]).find(p=>p.id===id); if(!pw)return;
  const {grupos,errores}=_twPlan(pw);
  if(errores.length||!Object.keys(grupos).length){_twResumen(id);return;}
  const sv=document.getElementById('m-save'); if(sv)sv.disabled=true;
  // 1) Apartar el pedido web: si otra persona ya lo tomó, no se duplica.
  const ahora=new Date().toISOString();
  const {data:tomado,error:eTomar}=await sb.from('pedidos_web').update({estado:'convertido',atendido_por:currentUser,atendido_el:ahora})
    .eq('id',id).eq('estado','nuevo').select('id');
  if(eTomar||!tomado||!tomado.length){closeMod();toast('Ya fue atendido','Otra persona ya tomó este pedido web.',true);await twRecargar();return;}
  const creados=[]; let fallo='';
  for(const emp of Object.keys(grupos)){
    // 2) Cliente en esa empresa (existente o nuevo).
    let cli=_twClienteEn(pw,emp);
    if(!cli){
      const vend0=(typeof vendedorDefaultDe==='function')?vendedorDefaultDe(emp):null;
      cli={id:cliN++,nit:(pw.nit||'CF'),nombre:pw.nombre,razonSocial:pw.nombre,direccion:pw.direccion||'Ciudad',direccionEntrega:pw.direccion||'',
        email:pw.email||'',tiempoCredito:0,vendedorId:vend0?vend0.id:null,nitsSecundarios:[],precios:{},
        contactoPagos:{nombre:'',telefono:'',correo:''},contactoCompras:{nombre:pw.nombre,telefono:pw.telefono||'',correo:pw.email||''},
        fechaAlta:fechaHoyGT(),empresa:emp,activo:true,_nuevo:true};
      clientes.push(cli);
      await guardarCliente(cli);
      if(cli._nuevo){clientes.splice(clientes.indexOf(cli),1);fallo='no se pudo crear el cliente en '+nombreEmpresa(emp);break;}
      logAudit('Cliente creado',cli.nombre+' · NIT '+cli.nit+' · desde tienda en línea');
    }
    // 3) Pedido abierto con el precio que vio el comprador.
    const vend=vendedores.find(v=>v.id===cli.vendedorId)||((typeof vendedorDefaultDe==='function')?vendedorDefaultDe(emp):null);
    const items=grupos[emp].map(({p,it})=>({id:p.id,codigo:p.codigo,nombre:p.nombre,precio:Number(it.precio),unidad:p.unidad,cantidad:Number(it.cantidad),descuento:0,
      modoVenta:_twModo(p),tipoEmpaque:p.tipoEmpaque||'unidad',unidadesPorCaja:p.unidadesPorCaja}));
    const total=Math.round(items.reduce((s,x)=>s+x.precio*x.cantidad,0)*100)/100;
    const obs=['Pedido de la tienda en línea '+_twNum(pw),_TW_PAGO[pw.forma_pago]||'',pw.telefono?'Tel. '+pw.telefono:'',pw.direccion?'Entregar en: '+pw.direccion:'',pw.notas||''].filter(Boolean).join(' · ');
    const doc={id:-(Date.now()+creados.length),numero:corr,tipoDoc:'pedido',clienteId:cli.id,clienteNombre:cli.razonSocial||cli.nombre,clienteComercial:cli.nombre,clienteNit:cli.nit,
      vendedorId:vend?vend.id:null,vendedorNombre:vend?vend.nombre:'',subVendedorNombre:null,items,totales:{total,baseSinIva:total/1.12,iva:total-total/1.12},
      estado:'abierto',inventarioRebajado:true,creada:ahora,ordenCompra:'',observaciones:obs,notaInterna:'',nitFacturado:cli.nit,nombreFacturado:cli.razonSocial||cli.nombre,empresa:emp,_nuevo:true};
    const ok=await guardarDocumento(doc);
    if(!ok){fallo='no se pudo guardar el pedido de '+nombreEmpresa(emp);break;}
    documentos.push(doc);corr=Math.max(corr,(doc.numero||0))+1;
    items.forEach(x=>{const p=productos.find(y=>y.id===x.id);if(p&&typeof aplicarStock==='function')aplicarStock(p,-x.cantidad,x.modoVenta);});
    logAudit('Pedido web pasado a pedido',_twNum(pw)+' → PED-'+padn(doc.numero)+' ('+emp+')');
    creados.push(doc);
  }
  // 4) Dejar anotado qué se creó (o devolver el pedido web a "nuevo" si no se creó nada).
  if(!creados.length){
    await sb.from('pedidos_web').update({estado:'nuevo',atendido_por:null,atendido_el:null}).eq('id',id);
  }else{
    await sb.from('pedidos_web').update({empresa_asignada:creados.map(d=>d.empresa).join('+'),pedidos_ids:creados.map(d=>d.id)}).eq('id',id);
  }
  closeMod();
  if(fallo)toast('No se completó','Falló: '+fallo+(creados.length?'. Sí se creó '+creados.map(d=>'PED-'+padn(d.numero)).join(', ')+'; el resto hacelo a mano.':'. No se creó nada.'),true);
  else toast('✓ Pasado a pedido',creados.map(d=>'PED-'+padn(d.numero)+' ('+d.empresa+')').join(' · ')+' · inventario reservado');
  await twRecargar();
}
function twRechazar(id){
  const pw=(_twPedidos||[]).find(p=>p.id===id); if(!pw||pw.estado!=='nuevo')return;
  if(!_twPuede()){toast('Sin permiso','Tu usuario es de sólo lectura.',true);return;}
  openMod('Rechazar '+_twNum(pw),`<p style="font-size:13px;color:var(--muted);line-height:1.5">El pedido web queda como rechazado y no se crea ningún pedido. Avisale al comprador (${escHtml(pw.telefono||'sin teléfono')}).</p>
    <label>Motivo</label><input id="tw-motivo" maxlength="200" placeholder="Ej. sin existencias, no contestó, pedido duplicado">`,async()=>{
    const motivo=($('#tw-motivo').value||'').trim();
    if(!motivo){toast('Falta el motivo',null,true);return;}
    const {data,error}=await sb.from('pedidos_web').update({estado:'rechazado',motivo_rechazo:motivo,atendido_por:currentUser,atendido_el:new Date().toISOString()}).eq('id',id).eq('estado','nuevo').select('id');
    closeMod();
    if(error||!data||!data.length)toast('No se pudo rechazar','Puede que otra persona ya lo haya atendido.',true);
    else{logAudit('Pedido web rechazado',_twNum(pw)+' · '+motivo);toast('Pedido web rechazado');}
    await twRecargar();
  });
  $('#m-save').textContent='Rechazar pedido';
}

// ── Productos y fotos ───────────────────────────────────────
// Una fila por CÓDIGO (como se ve en la tienda).
function _twFichas(){
  const m={};
  (typeof productos!=='undefined'?productos:[]).forEach(p=>{
    if(p.activo===false||!_twCod(p.codigo)||!(Number(p.precio)>0))return;
    if(String(p.categoria||'').toLowerCase()==='servicios')return;
    const k=_twCod(p.codigo), x=_twExtra[p.id]||{};
    const f=m[k]||(m[k]={cod:k,nombre:p.nombre,marca:p.marca||'',ids:[],emps:[],img:'',desc:'',oculto:false,disp:0,precio:0});
    if((p.empresa||'SEFE')==='SEFE')f.nombre=p.nombre;
    f.ids.push(p.id);f.emps.push(p.empresa||'SEFE');
    if(x.img&&x.img>f.img)f.img=x.img;
    if(!f.desc&&x.desc&&String(x.desc).trim())f.desc=String(x.desc).trim();
    if(x.oculto)f.oculto=true;
    f.disp=Math.max(f.disp,_twDisp(p));f.precio=Math.max(f.precio,Number(p.precio)||0);
  });
  return Object.values(m).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}
function _twHtmlProductos(){
  const todas=_twFichas();
  const q=_twProdQ.trim().toLowerCase();
  let l=todas.filter(f=>!q||(f.nombre+' '+f.cod+' '+f.marca).toLowerCase().includes(q));
  if(_twProdSolo==='sinfoto')l=l.filter(f=>!f.img&&!f.oculto);
  else if(_twProdSolo==='sindesc')l=l.filter(f=>!f.desc&&!f.oculto);
  else if(_twProdSolo==='ocultos')l=l.filter(f=>f.oculto);
  else if(_twProdSolo==='constock')l=l.filter(f=>f.disp>0&&!f.oculto);
  const conFoto=todas.filter(f=>f.img).length, ocultos=todas.filter(f=>f.oculto).length, conDesc=todas.filter(f=>f.desc).length;
  const puede=_twPuede();
  const filas=l.slice(0,120).map(f=>`<tr>
      <td style="width:58px">${f.img?`<img src="${escHtml(f.img)}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid var(--line,#e5e5e5)">`:'<div style="width:48px;height:48px;border-radius:6px;background:var(--bg,#f2f2f2);display:grid;place-items:center;font-size:10px;color:var(--muted)">sin foto</div>'}</td>
      <td>${escHtml(f.nombre)}<br><span style="font-size:11.5px;color:var(--muted)">${escHtml(f.cod)} · ${escHtml(f.emps.join(' + '))} · ${f.disp>0?'hay '+f.disp:'<b>agotado</b>'} · ${f.desc?'<span style="color:var(--ok,#2e7d32)">con descripción</span>':'sin descripción'}</span></td>
      <td class="num" style="text-align:right">${money(f.precio)}</td>
      <td style="text-align:right;white-space:nowrap">${puede?`
        <button class="btn" style="font-size:12px" onclick="twFoto('${escHtml(f.cod)}')">${f.img?'Cambiar foto':'Subir foto'}</button>
        <button class="btn" style="font-size:12px" onclick="twDesc('${escHtml(f.cod)}')">${f.desc?'Editar descripción':'Descripción'}</button>
        <button class="btn" style="font-size:12px" onclick="twOcultar('${escHtml(f.cod)}',${f.oculto?'false':'true'})">${f.oculto?'Mostrar en tienda':'Ocultar'}</button>`:''}
        ${f.oculto?'<span class="badge b-danger">Oculto</span>':''}</td></tr>`).join('');
  const sel=[['todos','Todos'],['constock','Con existencias'],['sinfoto','Sin foto'],['sindesc','Sin descripción'],['ocultos','Ocultos']];
  return `<div class="panel"><div class="panel-head" style="flex-wrap:wrap;gap:8px"><h3>Lo que se ve en la tienda</h3>
      <span style="font-size:12px;color:var(--muted)">${todas.length} productos · ${conFoto} con foto · ${conDesc} con descripción · ${ocultos} ocultos</span></div>
    <div class="panel-body">
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">La tienda muestra una ficha por código (aunque el producto esté en las dos empresas), con el precio de lista más alto. La foto, la descripción y "Ocultar" se aplican al código completo. Fotos: JPG o PNG, se achican solas.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <input id="tw-prodq" placeholder="Buscar producto, código o marca…" value="${escHtml(_twProdQ)}" oninput="twProdBuscar(this.value)" style="flex:1;min-width:200px">
        ${sel.map(([k,t])=>`<button class="btn${_twProdSolo===k?' btn-primary':''}" style="font-size:12px" onclick="twProdSolo('${k}')">${t}</button>`).join('')}
      </div>
      ${puede?`<div class="note" style="margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px">¿Sin fotos o sin descripciones? Se pueden traer las de la tienda anterior (solucionesefectivasgt.com), emparejando por nombre. Sólo se completa lo que falta.</span><button class="btn" onclick="twTraerFotos()">Traer fotos y descripciones de la tienda anterior</button></div>`:''}
      <input type="file" id="tw-file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="_twFotoElegida(this)">
      <div style="overflow-x:auto"><table><thead><tr><th></th><th>Producto</th><th style="text-align:right">Precio público</th><th></th></tr></thead><tbody>${filas||'<tr><td colspan="4"><div class="empty">Sin resultados.</div></td></tr>'}</tbody></table></div>
      ${l.length>120?`<div style="font-size:12px;color:var(--muted);margin-top:8px">Mostrando 120 de ${l.length}. Usá el buscador para llegar al resto.</div>`:''}
    </div></div>`;
}
let _twProdT=null;
function twProdBuscar(v){_twProdQ=v;clearTimeout(_twProdT);_twProdT=setTimeout(async()=>{await renderTiendaWeb();const i=document.getElementById('tw-prodq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
function twProdSolo(k){_twProdSolo=k;renderTiendaWeb();}
function _twIdsDe(cod){return (typeof productos!=='undefined'?productos:[]).filter(p=>_twCod(p.codigo)===cod).map(p=>p.id);}
async function twOcultar(cod,ocultar){
  const ids=_twIdsDe(cod); if(!ids.length)return;
  const {error}=await sb.from('productos').update({tienda_oculto:ocultar}).in('id',ids);
  if(error){toast('No se pudo guardar',error.message,true);return;}
  ids.forEach(id=>{(_twExtra[id]=_twExtra[id]||{}).oculto=ocultar;});
  logAudit(ocultar?'Tienda: producto oculto':'Tienda: producto visible',cod);
  renderTiendaWeb();
}
let _twFotoCod='';
function twFoto(cod){_twFotoCod=cod;const f=document.getElementById('tw-file');if(f){f.value='';f.click();}}
// Achica la foto a 900px y la guarda como JPG (fondo blanco) antes de subirla.
function _twAchicar(file){
  return new Promise((res,rej)=>{
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=900, k=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b=>b?res(b):rej(new Error('No se pudo procesar la imagen')),'image/jpeg',0.85);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('El archivo no es una imagen válida'));};
    img.src=url;
  });
}
async function _twFotoElegida(input){
  const file=input.files&&input.files[0], cod=_twFotoCod; if(!file||!cod)return;
  const ids=_twIdsDe(cod); if(!ids.length)return;
  toast('Subiendo foto…');
  try{
    const blob=await _twAchicar(file);
    const ruta=cod.replace(/[^A-Za-z0-9_-]/g,'_')+'-'+Date.now()+'.jpg';
    const up=await sb.storage.from('productos').upload(ruta,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});
    if(up.error)throw up.error;
    const url=sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    const {error}=await sb.from('productos').update({imagen_url:url}).in('id',ids);
    if(error)throw error;
    ids.forEach(id=>{(_twExtra[id]=_twExtra[id]||{}).img=url;});
    logAudit('Tienda: foto de producto',cod);
    toast('✓ Foto guardada');renderTiendaWeb();
  }catch(e){toast('No se pudo subir la foto',(e&&e.message)||'',true);}
}

// ── Descripción del producto (a mano) ───────────────────────
// La tienda pública la muestra en la página de cada producto. Formato:
// 1.ª línea = resumen; cada línea = un párrafo; "## Título" = subtítulo;
// "• texto" = viñeta; "@pdf Etiqueta|https://…pdf" = enlace a hoja técnica.
const _TW_DESC_MAX=4000;
// Deja el texto listo para guardar: sin espacios sobrantes, "- " y "* " al
// inicio de línea pasan a "• ", sin renglones vacíos de más y con tope de largo.
function _twLimpiarDesc(texto){
  return String(texto==null?'':texto).replace(/\r\n?/g,'\n').split('\n')
    .map(l=>l.replace(/[ \t ]+/g,' ').trim().replace(/^[-*•]\s+/,'• '))
    .join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,_TW_DESC_MAX).trim();
}
function twDesc(cod){
  if(!_twPuede()){toast('Sin permiso','Tu usuario es de sólo lectura.',true);return;}
  const f=_twFichas().find(x=>x.cod===cod); if(!f)return;
  const ej='Toalla de manos en rollo, hoja doble.\n## Características\n• Rollo de 240 metros\n• 6 rollos por caja\n@pdf Hoja técnica|https://ejemplo.com/hoja.pdf';
  openMod('Descripción de '+f.nombre,`<p style="font-size:12.5px;color:var(--muted);line-height:1.5;margin:0 0 8px">Es lo que se lee en la página del producto en la tienda. Se aplica al código <b>${escHtml(f.cod)}</b> completo (${escHtml(f.emps.join(' + '))}).</p>
    <textarea id="tw-desc" rows="14" maxlength="${_TW_DESC_MAX}" style="width:100%;min-height:260px;font-family:inherit;font-size:13px;line-height:1.5;resize:vertical" oninput="_twDescCuenta()">${escHtml(f.desc||'')}</textarea>
    <div id="tw-desc-n" style="font-size:11.5px;color:var(--muted);text-align:right;margin:2px 0 8px">${(f.desc||'').length} de ${_TW_DESC_MAX}</div>
    <div class="note" style="font-size:12px;line-height:1.55;margin:0"><b>Cómo se escribe:</b> la primera línea es el resumen; cada línea es un párrafo; <code>## Título</code> hace un subtítulo; <code>• texto</code> (o <code>- texto</code>) hace una viñeta; <code>@pdf Etiqueta|https://…pdf</code> agrega un enlace a la hoja técnica. Dejalo vacío para quitar la descripción.
      <pre style="margin:6px 0 0;font-size:11.5px;white-space:pre-wrap;color:var(--muted)">${escHtml(ej)}</pre></div>`,async()=>{
    const el=document.getElementById('tw-desc'); if(!el)return;
    const txt=_twLimpiarDesc(el.value), ids=_twIdsDe(cod); if(!ids.length)return;
    const {error}=await sb.from('productos').update({tienda_descripcion:txt||null}).in('id',ids);
    if(error){toast('No se pudo guardar',error.message,true);return;}
    ids.forEach(id=>{(_twExtra[id]=_twExtra[id]||{}).desc=txt;});
    closeMod();logAudit(txt?'Tienda: descripción de producto':'Tienda: descripción quitada',cod);
    toast(txt?'✓ Descripción guardada':'✓ Descripción quitada');renderTiendaWeb();
  });
  $('#m-save').textContent='Guardar descripción';
}
function _twDescCuenta(){const t=document.getElementById('tw-desc'),n=document.getElementById('tw-desc-n');if(t&&n)n.textContent=t.value.length+' de '+_TW_DESC_MAX;}

// ── Fotos y descripciones de la tienda anterior ─────────────
// tienda/fichas-anteriores.json trae [nombre, urlFoto, descripcion] de los
// productos de solucionesefectivasgt.com (foto o descripción pueden venir
// vacías). Se emparejan por nombre con las fichas a las que les falta foto
// O descripción, y a cada una se le completa SÓLO lo que le falta (nunca se
// pisa lo que ya tiene). Primero se muestra cuántas y cuáles, y recién al
// confirmar se guardan. Las fotos siguen alojadas en la tienda anterior.
function _twNorm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();}
// Devuelve [{f, img, desc, de, seguro}]: img/desc son lo que hay que
// completar en la ficha f ('' = no se toca ese campo).
function _twEmparejar(fichas,anteriores){
  const exacto={}, lista=[];
  (Array.isArray(anteriores)?anteriores:[]).forEach(r=>{
    if(!Array.isArray(r))return;
    const n=String(r[0]||''), k=_twNorm(n); if(!k)return;
    const img=String(r[1]||'').trim(), desc=_twLimpiarDesc(r[2]);
    if(!img&&!desc)return;
    // Si el mismo nombre viene repetido, se juntan sus datos (gana el primero no vacío).
    let x=exacto[k];
    if(x){if(!x.img)x.img=img;if(!x.desc)x.desc=desc;}
    else{x=exacto[k]={k,t:new Set(k.split(' ')),img,desc,n};lista.push(x);}
  });
  const res=[];
  fichas.forEach(f=>{
    const faltaImg=!f.img, faltaDesc=!String(f.desc||'').trim();
    if(!faltaImg&&!faltaDesc)return;
    const k=_twNorm(f.nombre); if(!k)return;
    let x=exacto[k], seguro=true;
    if(!x){
      const t=new Set(k.split(' ')); if(t.size<3)return;
      let mejor=null, pm=0;
      lista.forEach(y=>{let c=0;t.forEach(w=>{if(y.t.has(w))c++;});const p=c/(t.size+y.t.size-c);if(p>pm){pm=p;mejor=y;}});
      if(!mejor||pm<0.8)return;
      x=mejor;seguro=false;
    }
    const img=faltaImg?x.img:'', desc=faltaDesc?x.desc:'';
    if(!img&&!desc)return;
    res.push({f,img,desc,de:seguro?f.nombre:x.n,seguro});
  });
  return res;
}
async function twTraerFotos(){
  if(!_twPuede())return;
  let ant=[];
  try{const r=await fetch(_twUrl()+'fichas-anteriores.json',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);ant=await r.json();if(!Array.isArray(ant))throw new Error('formato');}
  catch(e){toast('No se pudo leer la lista de la tienda anterior',null,true);return;}
  const pares=_twEmparejar(_twFichas(),ant);
  if(!pares.length){toast('No hay nada nuevo para traer','Los productos sin foto o sin descripción no coinciden por nombre con la tienda anterior.');return;}
  const dudosos=pares.filter(x=>!x.seguro);
  const cuenta=l=>({img:l.filter(x=>x.img).length,desc:l.filter(x=>x.desc).length});
  const tot=cuenta(pares);
  const que=x=>[x.img?'foto':'',x.desc?'descripción':''].filter(Boolean).join(' y ');
  openMod('Traer fotos y descripciones de la tienda anterior',`<p style="font-size:13px;color:var(--muted);line-height:1.5">Se encontraron datos para <b>${pares.length}</b> producto(s): <b>${tot.img}</b> reciben foto y <b>${tot.desc}</b> reciben descripción. ${pares.length-dudosos.length} coinciden con el mismo nombre y ${dudosos.length} con nombre parecido. Sólo se completa lo que falta: no se cambia ninguna foto ni descripción que ya esté. Después podés corregir cualquiera con "Cambiar foto" o "Editar descripción".</p>
    ${dudosos.length?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="tw-dudosos" checked style="width:auto"> Incluir también los de nombre parecido:</label>
    <div style="max-height:220px;overflow:auto;font-size:12px;border:1px solid var(--line,#e5e5e5);border-radius:8px;padding:8px">${dudosos.map(x=>`<div style="margin-bottom:6px"><b>${escHtml(x.f.nombre)}</b> <span style="color:var(--muted)">(${que(x)})</span><br><span style="color:var(--muted)">← ${escHtml(x.de)}</span></div>`).join('')}</div>`:''}`,async()=>{
    const inc=!document.getElementById('tw-dudosos')||document.getElementById('tw-dudosos').checked;
    const usar=pares.filter(x=>x.seguro||inc);
    let ok=0, nImg=0, nDesc=0;
    for(const x of usar){
      const cambio={};
      if(x.img)cambio.imagen_url=x.img;
      if(x.desc)cambio.tienda_descripcion=x.desc;
      const {error}=await sb.from('productos').update(cambio).in('id',x.f.ids);
      if(error)continue;
      ok++;if(x.img)nImg++;if(x.desc)nDesc++;
      x.f.ids.forEach(id=>{const e=_twExtra[id]=_twExtra[id]||{};if(x.img)e.img=x.img;if(x.desc)e.desc=x.desc;});
    }
    const det=nImg+' fotos y '+nDesc+' descripciones';
    closeMod();logAudit('Tienda: fotos y descripciones de la tienda anterior',ok+' productos ('+det+')');
    toast(ok===usar.length?'✓ Datos traídos':'Se trajo una parte',det+' en '+ok+' de '+usar.length+' productos',ok!==usar.length);renderTiendaWeb();
  });
  $('#m-save').textContent='Traer fotos y descripciones';
}

// ── Acceso de clientes ──────────────────────────────────────
function _twHtmlClientes(){
  const q=_twCliQ.trim().toLowerCase(), qn=_twNit(_twCliQ);
  const todos=(typeof clientes!=='undefined'?clientes:[]).filter(c=>c.activo!==false);
  const conAcceso=todos.filter(c=>_twAccesos[c.id]);
  const l=(q?todos.filter(c=>(String(c.nombre||'')+' '+String(c.razonSocial||'')).toLowerCase().includes(q)||(qn&&_twNit(c.nit).includes(qn))):conAcceso).slice(0,40);
  const puede=_twPuede();
  const filas=l.map(c=>{
    const a=_twAccesos[c.id], cf=!_twNit(c.nit)||_twNit(c.nit)==='CF';
    return `<tr><td>${escHtml(c.nombre)}<br><span style="font-size:11.5px;color:var(--muted)">NIT ${escHtml(c.nit||'CF')} · ${escHtml(nombreEmpresa(c.empresa||'SEFE'))}${Object.keys(c.precios||{}).length?' · '+Object.keys(c.precios).length+' precios especiales':''}</span></td>
      <td>${a?`<span class="badge b-ok">Con acceso</span><br><span style="font-size:11.5px;color:var(--muted)">desde ${escHtml(fdatehora(a.creado))}</span>`:'<span class="badge b-info">Sin acceso</span>'}</td>
      <td style="text-align:right;white-space:nowrap">${!puede?'':cf?'<span style="font-size:12px;color:var(--muted)">Necesita NIT para entrar</span>':`
        <button class="btn btn-primary" style="font-size:12px" onclick="twDarClave(${c.id})">${a?'Nueva clave':'Dar acceso'}</button>
        ${a?`<button class="btn" style="font-size:12px" onclick="twQuitarClave(${c.id})">Quitar</button>`:''}`}</td></tr>`;
  }).join('');
  return `<div class="panel"><div class="panel-head"><h3>Clientes que pueden entrar a la tienda</h3><span style="font-size:12px;color:var(--muted)">${conAcceso.length} con acceso</span></div>
    <div class="panel-body">
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">Un cliente con acceso entra con su <b>NIT</b> y una <b>clave</b>, y ve sus precios especiales y su crédito. La clave sólo se muestra una vez, al crearla: pasásela por WhatsApp. Sin acceso, cualquiera compra igual con el precio de lista.</p>
      <input id="tw-cliq" placeholder="Buscar cliente por nombre o NIT…" value="${escHtml(_twCliQ)}" oninput="twCliBuscar(this.value)" style="width:100%;margin-bottom:10px">
      <div style="overflow-x:auto"><table><thead><tr><th>Cliente</th><th>Acceso</th><th></th></tr></thead><tbody>${filas||`<tr><td colspan="3"><div class="empty">${q?'Sin resultados.':'Todavía nadie tiene acceso. Buscá un cliente para dárselo.'}</div></td></tr>`}</tbody></table></div>
    </div></div>`;
}
let _twCliT=null;
function twCliBuscar(v){_twCliQ=v;clearTimeout(_twCliT);_twCliT=setTimeout(async()=>{await renderTiendaWeb();const i=document.getElementById('tw-cliq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
// Clave de 8 caracteres sin letras/números que se confunden (0/O, 1/l…).
function _twClaveNueva(){
  const abc='ABCDEFGHJKMNPQRSTUVWXYZ23456789', a=new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a,n=>abc[n%abc.length]).join('');
}
function twDarClave(id){
  const c=clientes.find(x=>x.id===id); if(!c)return;
  const ya=!!_twAccesos[id];
  confirmar(ya?'Nueva clave':'Dar acceso a la tienda',(ya?'La clave anterior de <b>'+escHtml(c.nombre)+'</b> deja de servir. ':'')+'Se va a crear una clave para que <b>'+escHtml(c.nombre)+'</b> entre a la tienda con su NIT '+escHtml(c.nit)+' y vea sus precios. ¿Continuar?','Crear clave',async()=>{
    const clave=_twClaveNueva();
    const {data,error}=await sb.rpc('tienda_poner_clave',{p_cliente_id:id,p_clave:clave});
    if(error||!data||!data.ok){toast('No se pudo crear la clave',(data&&data.error)||(error&&error.message)||'',true);return;}
    _twAccesos[id]={creado:new Date().toISOString()};
    logAudit('Tienda: acceso de cliente',c.nombre+' · NIT '+c.nit);
    const msg='Hola, ya podés hacer tus pedidos en línea con tus precios:\n'+_twUrl()+'\nEntrá en "Soy cliente" con\nNIT: '+c.nit+'\nClave: '+clave;
    openMod('Clave de '+c.nombre,`<p style="font-size:13px;color:var(--muted);line-height:1.5">Copiá estos datos y enviáselos al cliente. <b>La clave no se vuelve a mostrar</b> (si se pierde, se crea otra).</p>
      <textarea id="tw-msg" readonly style="width:100%;min-height:130px;font-size:13px">${escHtml(msg)}</textarea>`,()=>{
        try{navigator.clipboard.writeText(msg);toast('✓ Copiado');}catch(e){const t=$('#tw-msg');t.select();document.execCommand('copy');toast('✓ Copiado');}
        closeMod();renderTiendaWeb();
      });
    $('#m-save').textContent='Copiar y cerrar';
  });
}
function twQuitarClave(id){
  const c=clientes.find(x=>x.id===id); if(!c)return;
  confirmar('Quitar acceso','<b>'+escHtml(c.nombre)+'</b> ya no va a poder entrar a la tienda como cliente (puede seguir comprando con precio de lista). ¿Continuar?','Quitar acceso',async()=>{
    const {data,error}=await sb.rpc('tienda_quitar_clave',{p_cliente_id:id});
    if(error||!data||!data.ok){toast('No se pudo quitar',(data&&data.error)||(error&&error.message)||'',true);return;}
    delete _twAccesos[id];
    logAudit('Tienda: acceso quitado',c.nombre);
    toast('Acceso quitado');renderTiendaWeb();
  });
}

// ── Configuración ───────────────────────────────────────────
function _twHtmlConfig(){
  const c=_twCfg(), admin=(currentRole==='admin'||currentRole==='gerencia')&&_twPuede();
  const dis=admin?'':'disabled';
  return `<div class="panel"><div class="panel-head"><h3>Configuración de la tienda</h3></div>
    <div class="panel-body" style="display:grid;gap:14px;max-width:560px">
      <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="tw-activa" ${c.activa?'checked':''} ${dis} style="margin-top:3px;width:auto">
        <span><b>Tienda abierta al público</b><br><span style="font-size:12px;color:var(--muted)">Apagada, nadie de afuera ve productos ni precios ni puede pedir.</span></span></label>
      <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="tw-agotados" ${c.mostrarAgotados?'checked':''} ${dis} style="margin-top:3px;width:auto">
        <span><b>Mostrar también los productos agotados</b><br><span style="font-size:12px;color:var(--muted)">Salen marcados "Agotado" y no se pueden pedir. Apagado, sólo se ve lo que hay.</span></span></label>
      <div><label>Diseño de la tienda</label><select id="tw-tema" ${dis}>${[['original','Original (igual a la tienda anterior)'],['a','A · Aire — blanco, redondeado, letra Manrope'],['b','B · Natural — fondo crema, títulos con serifa'],['c','C · Contraste — encabezado verde, botones lima']].map(([k,t])=>`<option value="${k}"${(c.tema||'original')===k?' selected':''}>${t}</option>`).join('')}</select>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">Para compararlos antes de elegir: abrí la Vista previa y usá los botones "Diseño" de arriba.</div></div>
      <div><label>WhatsApp para avisos <span style="font-weight:400;color:var(--muted-2)">(opcional, 8 dígitos)</span></label><input id="tw-wa" value="${escHtml(c.whatsapp||'')}" ${dis} placeholder="Ej. 55551234" maxlength="15">
        <div style="font-size:12px;color:var(--muted);margin-top:3px">Al terminar su pedido, el comprador ve un botón para escribirles a este número.</div></div>
      <div><label>Pedido mínimo en quetzales <span style="font-weight:400;color:var(--muted-2)">(0 = sin mínimo)</span></label><input id="tw-min" type="number" min="0" step="1" value="${Number(c.pedidoMinimo)||0}" ${dis}></div>
      <div><label>Aviso arriba de la tienda <span style="font-weight:400;color:var(--muted-2)">(opcional)</span></label><input id="tw-aviso" value="${escHtml(c.aviso||'')}" ${dis} maxlength="160" placeholder="Ej. Entregas en la capital de lunes a viernes"></div>
      ${admin?'<div><button class="btn btn-primary" onclick="twGuardarConfig()">Guardar configuración</button></div>':'<div class="note"><span>Sólo Administrador o Gerencia pueden cambiar la configuración.</span></div>'}
      <div class="note"><span><b>Pago con tarjeta:</b> todavía no está activo. La tienda recibe pedidos con transferencia, contra entrega o crédito (clientes con crédito). Para cobrar con tarjeta hay que contratar una pasarela de pago.</span></div>
    </div></div>`;
}
async function twGuardarConfig(){
  const antes=_twCfg();
  const nueva={activa:$('#tw-activa').checked,mostrarAgotados:$('#tw-agotados').checked,
    whatsapp:($('#tw-wa').value||'').replace(/\D/g,''),pedidoMinimo:Math.max(0,Number($('#tw-min').value)||0),aviso:($('#tw-aviso').value||'').trim(),tema:$('#tw-tema').value||'original'};
  const guardar=async()=>{
    const ok=await guardarAjuste('tienda',nueva);
    if(!ok){toast('No se pudo guardar',null,true);return;}
    logAudit('Tienda: configuración',nueva.activa?(antes.activa?'actualizada':'TIENDA ENCENDIDA'):(antes.activa?'TIENDA APAGADA':'actualizada'));
    toast('✓ Configuración guardada',nueva.activa?'La tienda está abierta al público':'La tienda está apagada');
    renderTiendaWeb();
  };
  if(nueva.activa&&!antes.activa)confirmar('Abrir la tienda al público','Cualquier persona con el enlace va a poder ver los productos con su <b>precio de lista</b> y enviar pedidos. ¿Abrir la tienda?','Sí, abrir',guardar);
  else await guardar();
}

if(typeof window!=='undefined'){
  Object.assign(window,{renderTiendaWeb,twTab,twCopiarLink,twAbrirTienda,twFiltro,twRecargar,twConvertir,twRechazar,_twTodoA,_twResumen,
    twProdBuscar,twProdSolo,twOcultar,twFoto,_twFotoElegida,twTraerFotos,twDesc,_twDescCuenta,twCliBuscar,twDarClave,twQuitarClave,twGuardarConfig,_twContarNuevos});
  // Revisa cada 2 minutos si entró un pedido nuevo (consulta liviana: sólo cuenta).
  setTimeout(_twContarNuevos,8000);
  setInterval(_twContarNuevos,120000);
}
