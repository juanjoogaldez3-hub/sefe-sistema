function agregarBoleta(cobroId){
  const c=cobrosRuta.find(x=>x.id===cobroId);if(!c||c.estado!=='cobrado')return;
  openMod('Agregar boleta de depósito',`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">${c.docNum} · ${c.cliente} · ${money(c.monto)} (${c.modo==='efectivo'?'efectivo':'cheque '+c.cheque})</p>
    <div class="row"><div><label>No. de boleta de depósito</label><input id="bol-num" placeholder="No. boleta del banco"></div></div>
    <div class="note n-ok" style="margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>Una vez agregada, el cobro pasa a logística para que confirme la recepción de la boleta + recibo.</span></div>`,
    ()=>{
      const bol=$('#bol-num').value.trim();
      if(!bol){toast('Ingresá el No. de boleta',null,true);return;}
      c.noBoleta=bol;c.estado='depositado';c.depositadoFecha=new Date().toISOString();
      logAudit('Cobro depositado',c.docNum+' · '+c.cliente+' · Boleta '+bol+' · '+money(c.monto));
      closeMod();renderMisEntregas();
      toast('✓ Boleta agregada','Pasa a logística para confirmar');
      if(typeof guardarCobroRuta==='function')guardarCobroRuta(c);
    });
}
window.agregarBoleta=agregarBoleta;

function marcarEnRuta(id){
  const d=documentos.find(x=>x.id===id);if(!d)return;
  d.estadoEntrega='ruta';
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  logAudit('Producto cargado',docNum+' · '+(d.clienteComercial||d.clienteNombre)+' · en ruta');
  renderMisEntregas();
  toast('📦 En ruta',(d.clienteComercial||d.clienteNombre));
  if(typeof guardarDocumento==='function')guardarDocumento(d);
}
window.marcarEnRuta=marcarEnRuta;

// Estado de la entrega en curso (modal)
let _entregaPago='efectivo'; // efectivo | cheque | contrasena | credito
let _firmaCanvas=null,_firmaCtx=null,_firmando=false,_firmaVacia=true;
let _curEntregaId=null;
function _entregaDocId(){return _curEntregaId;}

function marcarEntregado(id){
  _entregaPago='efectivo';_firmaVacia=true;_curEntregaId=id;
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const saldo=arInfo(d).saldo;
  openMod('Confirmar entrega · '+docNum,`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:6px">${d.clienteComercial||d.clienteNombre}</p>
    <p style="font-size:13px;margin-bottom:14px">Total: <b>${money(d.totales.total)}</b>${saldo<d.totales.total?` · Saldo pendiente: <b>${money(saldo)}</b>`:''}</p>
    <label>¿Cómo se resolvió el pago?</label>
    <div class="pay-opt" id="pay-opt">
      <div class="pay-btn on" data-pago="efectivo" onclick="selPago('efectivo')"><span class="pi">💵</span>Efectivo</div>
      <div class="pay-btn" data-pago="cheque" onclick="selPago('cheque')"><span class="pi">🏦</span>Cheque</div>
      <div class="pay-btn" data-pago="contrasena" onclick="selPago('contrasena')"><span class="pi">📄</span>Contraseña de pago</div>
      <div class="pay-btn" data-pago="credito" onclick="selPago('credito')"><span class="pi">✍️</span>Queda a crédito</div>
    </div>
    <div id="pay-detalle"></div>
    <div class="row"><div><label>Observación <span style="font-weight:400;color:var(--muted-2)">(opcional)</span></label><input id="ent-obs" placeholder="Ej. dejado en recepción"></div></div>
    <div class="note n-danger" id="ent-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>confirmarEntrega(id));
  selPago('efectivo',saldo);
}
window.marcarEntregado=marcarEntregado;

function selPago(tipo,saldoForzado){
  _entregaPago=tipo;
  document.querySelectorAll('#pay-opt .pay-btn').forEach(b=>b.classList.toggle('on',b.dataset.pago===tipo));
  const d=documentos.find(x=>x.id===_entregaDocId());
  const saldo=saldoForzado!=null?saldoForzado:(d?arInfo(d).saldo:0);
  const det=$('#pay-detalle');if(!det)return;
  if(tipo==='efectivo'){
    det.innerHTML=`<div class="row"><div><label>Monto recibido en efectivo</label><input id="ent-monto" type="number" step="0.01" value="${saldo.toFixed(2)}"></div><div><label>No. de recibo</label><input id="ent-recibo-num" placeholder="Recibo entregado al cliente"></div></div>
      <div class="note" style="background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El piloto cobra y entrega recibo. Luego deposita y, en su <b>cierre del día</b>, agrega el No. de boleta del banco.</span></div>`;
  }else if(tipo==='cheque'){
    det.innerHTML=`<div class="row"><div><label>Monto del cheque</label><input id="ent-monto" type="number" step="0.01" value="${saldo.toFixed(2)}"></div><div><label>No. de recibo</label><input id="ent-recibo-num" placeholder="Recibo entregado al cliente"></div></div>
      <div class="row"><div><label>No. de cheque</label><input id="ent-cheque" placeholder="No. cheque"></div><div><label>Banco</label><input id="ent-banco" placeholder="Banco emisor"></div></div>
      <div class="note" style="background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El piloto recibe el cheque y entrega recibo. Luego lo deposita y agrega la boleta en su cierre del día.</span></div>`;
  }else if(tipo==='contrasena'){
    det.innerHTML=`<div class="row"><div><label>No. de contraseña de pago</label><input id="ent-contra" placeholder="No. de contraseña"></div></div>
      <div class="row"><div><label>Fecha prometida de pago <span style="font-weight:400;color:var(--muted-2)">(opcional)</span></label><input id="ent-fechaprom" type="date"></div></div>
      <div class="note" style="background:#E6EEF6;color:var(--blue);border-color:rgba(68,96,132,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La factura queda pendiente de cobro. Cobros le da seguimiento con el número de contraseña.</span></div>`;
  }else{ // crédito → firma
    det.innerHTML=`<label>Firma de recepción <span style="color:var(--danger)">*</span></label>
      <div class="firma-wrap"><canvas id="firma-canvas" class="firma-canvas"></canvas>
        <div class="firma-foot"><span>Firmá con el dedo o el mouse</span><button class="btn btn-ghost btn-sm" type="button" onclick="limpiarFirma()">Borrar</button></div></div>
      <div class="row" style="margin-top:11px"><div><label>¿Quién recibió?</label><input id="ent-recibe" placeholder="Nombre de quien firma"></div></div>
      <div class="note" style="background:#E6EEF6;color:var(--blue);border-color:rgba(68,96,132,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La firma y la fecha quedan estampadas en el PDF de la factura como comprobante de recepción. La factura sigue como cuenta por cobrar.</span></div>`;
    setTimeout(initFirma,50);
  }
}
window.selPago=selPago;

function initFirma(){
  _firmaCanvas=$('#firma-canvas');if(!_firmaCanvas)return;
  const rect=_firmaCanvas.getBoundingClientRect();
  _firmaCanvas.width=rect.width;_firmaCanvas.height=160;
  _firmaCtx=_firmaCanvas.getContext('2d');
  _firmaCtx.strokeStyle='#163916';_firmaCtx.lineWidth=2.2;_firmaCtx.lineCap='round';_firmaCtx.lineJoin='round';
  _firmaVacia=true;
  const pos=e=>{const r=_firmaCanvas.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return {x:t.clientX-r.left,y:t.clientY-r.top};};
  const start=e=>{e.preventDefault();_firmando=true;_firmaVacia=false;const p=pos(e);_firmaCtx.beginPath();_firmaCtx.moveTo(p.x,p.y);};
  const move=e=>{if(!_firmando)return;e.preventDefault();const p=pos(e);_firmaCtx.lineTo(p.x,p.y);_firmaCtx.stroke();};
  const end=()=>{_firmando=false;};
  _firmaCanvas.onmousedown=start;_firmaCanvas.onmousemove=move;_firmaCanvas.onmouseup=end;_firmaCanvas.onmouseleave=end;
  _firmaCanvas.ontouchstart=start;_firmaCanvas.ontouchmove=move;_firmaCanvas.ontouchend=end;
}
function limpiarFirma(){if(_firmaCtx&&_firmaCanvas){_firmaCtx.clearRect(0,0,_firmaCanvas.width,_firmaCanvas.height);_firmaVacia=true;}}
window.limpiarFirma=limpiarFirma;

function confirmarEntrega(id){
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const err=$('#ent-err');const errTxt=err.querySelector('span');
  const obs=$('#ent-obs')?.value.trim()||'';
  const fecha=new Date().toISOString();
  const tipo=_entregaPago;
  let entregaInfo={fecha,piloto:currentUser,observacion:obs,modoPago:tipo};
  let _cobroNuevo=null;

  if(tipo==='efectivo'||tipo==='cheque'){
    const monto=Number($('#ent-monto').value);
    if(!(monto>0)){err.style.display='flex';errTxt.textContent='Ingresá el monto';return;}
    const recibo=$('#ent-recibo-num').value.trim();
    if(!recibo){err.style.display='flex';errTxt.textContent='Ingresá el No. de recibo';return;}
    entregaInfo.monto=monto;entregaInfo.noRecibo=recibo;
    let cheque='',banco='';
    if(tipo==='cheque'){
      cheque=$('#ent-cheque').value.trim();banco=$('#ent-banco').value.trim();
      if(!cheque){err.style.display='flex';errTxt.textContent='Ingresá el número de cheque';return;}
      entregaInfo.cheque=cheque;entregaInfo.banco=banco;
    }
    // Crear cobro en ruta — nace "cobrado" (sin boleta; el piloto la agrega en su cierre)
    _cobroNuevo={
      id:cobroRutaN++,docId:d.id,docNum,cliente:d.clienteComercial||d.clienteNombre,
      monto,modo:tipo,noBoleta:'',noRecibo:recibo,
      cheque,banco,piloto:currentUser,fecha,estado:'cobrado',_nuevo:true
    };
    cobrosRuta.push(_cobroNuevo);
  }else if(tipo==='contrasena'){
    const contra=$('#ent-contra').value.trim();
    if(!contra){err.style.display='flex';errTxt.textContent='Ingresá el número de contraseña';return;}
    entregaInfo.contrasena=contra;entregaInfo.fechaPromesa=$('#ent-fechaprom').value||null;
  }else{ // crédito → firma
    if(_firmaVacia){err.style.display='flex';errTxt.textContent='Falta la firma de recepción';return;}
    const recibe=$('#ent-recibe')?.value.trim();
    if(!recibe){err.style.display='flex';errTxt.textContent='Indicá quién recibió';return;}
    entregaInfo.recibe=recibe;entregaInfo.firma=_firmaCanvas.toDataURL('image/png');
  }
  d.estadoEntrega='entregado';
  d.entregaInfo=entregaInfo;
  const resumenPago={efectivo:'Efectivo '+money(entregaInfo.monto||0)+' · Recibo '+(entregaInfo.noRecibo||''),cheque:'Cheque '+money(entregaInfo.monto||0)+' · Recibo '+(entregaInfo.noRecibo||''),contrasena:'Contraseña '+entregaInfo.contrasena,credito:'A crédito (firmado)'}[tipo];
  logAudit('Entrega confirmada',docNum+' · '+(d.clienteComercial||d.clienteNombre)+' · '+resumenPago);
  closeMod();renderMisEntregas();
  toast('✓ Entrega confirmada',resumenPago);
  if(typeof guardarDocumento==='function')guardarDocumento(d);
  if(_cobroNuevo&&typeof guardarCobroRuta==='function')guardarCobroRuta(_cobroNuevo);
}
window.confirmarEntrega=confirmarEntrega;

let auditLog=[];
let auditSeq=0;
// Hash simple (djb2) para encadenar registros — si se altera uno, la cadena se rompe
function _hashAudit(str){let h=5381;for(let i=0;i<str.length;i++)h=((h<<5)+h+str.charCodeAt(i))>>>0;return h.toString(16);}
function logAudit(accion,detalle){
  const prev=auditLog[0];
  const prevHash=prev?prev.hash:'GENESIS';
  const seq=++auditSeq;
  const fecha=new Date().toISOString();
  const base=seq+'|'+fecha+'|'+currentUser+'|'+accion+'|'+detalle+'|'+prevHash;
  const hash=_hashAudit(base);
  const entry={seq,fecha,usuario:currentUser,rol:ROLES[currentRole]?.label||currentRole,accion,detalle,prevHash,hash};
  auditLog.unshift(entry);
  if(auditLog.length>500)auditLog.length=500;
  // Guardar en Supabase (si está conectado)
  if(typeof guardarAuditoria==='function')guardarAuditoria(entry);
}
// Verifica la integridad de la cadena de auditoría
function verificarIntegridadAuditoria(){
  // Reconstruir en orden cronológico (auditLog está en orden inverso)
  const ordenado=auditLog.slice().reverse();
  // Normaliza la fecha al mismo formato ISO con que se generó el hash original.
  // Supabase devuelve '2026-06-24 02:28:34.56+00' pero el hash se creó con
  // new Date().toISOString() => '2026-06-24T02:28:34.560Z'. Sin esto, da falso positivo.
  const isoFecha=f=>{try{const d=new Date(f);return isNaN(d)?f:d.toISOString();}catch(_){return f;}};
  for(let i=0;i<ordenado.length;i++){
    const e=ordenado[i];
    const prevHash=i===0?'GENESIS':ordenado[i-1].hash;
    // Prueba primero con la fecha tal cual; si no cuadra, prueba con la fecha normalizada.
    const baseRaw=e.seq+'|'+e.fecha+'|'+e.usuario+'|'+e.accion+'|'+e.detalle+'|'+prevHash;
    const baseIso=e.seq+'|'+isoFecha(e.fecha)+'|'+e.usuario+'|'+e.accion+'|'+e.detalle+'|'+prevHash;
    const hashOk=(_hashAudit(baseRaw)===e.hash)||(_hashAudit(baseIso)===e.hash);
    if(!hashOk||e.prevHash!==prevHash){
      return {ok:false,seq:e.seq,fecha:e.fecha};
    }
  }
  return {ok:true,total:ordenado.length};
}
window.verificarIntegridadAuditoria=verificarIntegridadAuditoria;
// Trae el historial COMPLETO de auditoría, a pedido, al abrir el módulo.
// En el login sólo se baja el último registro (para no gastar egress con una
// tabla que crece sin fin). Se hace una sola vez por sesión, y no pisa la
// cadena de hashes si la carga fallara.
let _auditCargando=null;
async function _cargarAuditoriaCompleta(){
  if(window._auditFullLoaded)return;
  if(_auditCargando)return _auditCargando;
  _auditCargando=(async()=>{
    try{
      const r=await fetchAll('auditoria','seq');            // ascendente por seq
      const full=(r.data||[]).map(mapAuditoriaFromDB);
      if(full.length>=auditLog.length){                    // sólo si trajo todo (no pisar por un error)
        auditLog=full.reverse();                           // más nuevo primero
        if(auditLog.length)auditSeq=Math.max(auditSeq,auditLog[0].seq);
        window._auditFullLoaded=true;
      }
    }catch(e){console.error('Error cargando la auditoría completa:',e);}
    _auditCargando=null;
  })();
  return _auditCargando;
}
window._cargarAuditoriaCompleta=_cargarAuditoriaCompleta;
async function renderAuditoria(){
  await _cargarAuditoriaCompleta();
  const selUsr=$('#aud-usr');
  if(selUsr&&selUsr.dataset.built!=='1'){
    selUsr.innerHTML='<option value="">Todos</option>'+usuarios.map(u=>`<option value="${u.nombre}">${u.nombre}</option>`).join('');
    selUsr.dataset.built='1';
    ['aud-usr','aud-acc','aud-desde','aud-hasta'].forEach(id=>{const e=$('#'+id);if(e)e.onchange=renderAuditoria;});
  }
  const fUsr=$('#aud-usr')?.value,fAcc=$('#aud-acc')?.value,fDesde=$('#aud-desde')?.value,fHasta=$('#aud-hasta')?.value;
  let rows=auditLog.filter(e=>{
    if(fUsr&&e.usuario!==fUsr)return false;
    if(fAcc&&e.accion!==fAcc)return false;
    if(fDesde&&new Date(e.fecha)<new Date(fDesde+'T00:00:00'))return false;
    if(fHasta&&new Date(e.fecha)>new Date(fHasta+'T23:59:59'))return false;
    return true;
  });
  $('#aud-empty').style.display=rows.length?'none':'block';
  // Banner de integridad de la cadena
  const integridad=verificarIntegridadAuditoria();
  const banner=$('#aud-integridad');
  if(banner){
    if(integridad.ok){
      banner.innerHTML=`<div class="note n-ok" style="margin:0"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span><b>Registro íntegro.</b> ${integridad.total} eventos verificados — la cadena no ha sido alterada. Cada registro está encadenado al anterior; en producción será inmutable a nivel de base de datos.</span></div>`;
    }else{
      banner.innerHTML=`<div class="note n-danger" style="margin:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span><b>⚠ Alerta de integridad.</b> La cadena de auditoría fue alterada cerca del registro #${integridad.seq}. Esto indica manipulación.</span></div>`;
    }
  }
  $('#t-aud').innerHTML=rows.map(e=>`<tr>
    <td style="color:var(--muted-2);font-weight:700;font-size:11px">#${String(e.seq).padStart(4,'0')}</td>
    <td style="color:var(--muted);white-space:nowrap">${fdatehora(e.fecha)}</td>
    <td style="font-weight:600">${e.usuario}</td>
    <td><span class="aud-badge">${e.rol}</span></td>
    <td><span class="badge b-info" style="font-size:11px">${e.accion}</span></td>
    <td style="color:var(--muted);font-size:12.5px">${e.detalle}</td>
  </tr>`).join('');
  enhanceTable('t-aud');
}
function limpiarAuditoria(){['aud-usr','aud-acc','aud-desde','aud-hasta'].forEach(id=>{const e=$('#'+id);if(e)e.value='';});renderAuditoria();}
window.limpiarAuditoria=limpiarAuditoria;
async function exportarAuditoria(){
  if(!auditLog.length){toast('Sin registros','No hay eventos de auditoría',true);return;}
  const XLSX=await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs');
  const data=auditLog.map(e=>({'Fecha/Hora':fdatehora(e.fecha),Usuario:e.usuario,Rol:e.rol,Acción:e.accion,Detalle:e.detalle}));
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Auditoría');
  XLSX.writeFile(wb,`SEFE_Auditoria_${fechaHoyGT()}.xlsx`);
  toast('✓ Excel descargado');
}
window.exportarAuditoria=exportarAuditoria;

// ================= DASHBOARD MEJORADO =================
// renderPanel está definido arriba — versión unificada por rol

// ================= PERMISOS DE BOTONES POR ROL =================
const PERMISOS_VISTAS={
  pedido:['admin','gerencia','ventas'],
  documentos:['admin','gerencia','ventas','contabilidad','auditoria'],
  clientes:['admin','gerencia','ventas','cobros'],
  cobros:['admin','gerencia','cobros','contabilidad'],
  porpagar:['admin','gerencia','bodega','contabilidad'],
  bancos:['admin','gerencia','contabilidad'],
  inventario:['admin','gerencia','bodega','ventas'],
  compras:['admin','gerencia','bodega'],
  proveedores:['admin','gerencia','bodega'],
  reportes:['admin','gerencia','contabilidad','auditoria'],
  usuarios:['admin'],
  auditoria:['admin','gerencia'],
};
// Override ROLES views con la nueva config
// El Object.assign ya no es necesario porque ROLES se define arriba con todos los sub-permisos.
// Se mantiene vacío para compatibilidad.
function aplicarPermisosUI(){
  const r=ROLES[currentRole];
  if(!r){
    alert('El rol "'+currentRole+'" no está configurado. Revisá la tabla "roles" en Supabase.');
    return;
  }
  document.querySelectorAll('.nav button[data-view]').forEach(b=>{
    const ok=tienePermiso(b.dataset.view);
    b.style.display=ok?'':'none';
  });
  const esAdmin=currentRole==='admin';
  const esAdminOGer=['admin','gerencia'].includes(currentRole);
  $('#lbl-admin').style.display=esAdminOGer?'':'none';
  $('#nav-usuarios').style.display=esAdmin?'':'none';
  $('#nav-auditoria').style.display=esAdminOGer?'':'none';
  // Ocultar botón Nuevo pedido en Documentos si no tiene permiso
  const btnNuevoPed=document.querySelector('#v-documentos .btn-primary');
  if(btnNuevoPed)btnNuevoPed.style.display=tienePermiso('pedido')&&!soloLectura()?'':'none';
  // Solo lectura: ocultar botones de creación/edición
  const sl=soloLectura();
  ['btn-nuevo-cli','btn-nueva-compra','btn-nuevo-prov'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=sl?'none':'';
  });
  // Auditoría ve todos los módulos pero sin Nuevo pedido en el menú
  if(sl){const navPed=document.querySelector('.nav button[data-view="pedido"]');if(navPed)navPed.style.display='none';}
  $('#sb-av').textContent=iniciales(currentUser);
  $('#sb-nm').textContent=currentUser;
  $('#sb-rl').textContent=r.label;
  $('#role-badge').textContent=r.label;
  const badgeColors={admin:['var(--ok-bg)','var(--ok)'],gerencia:['#E6EEF6','var(--blue)'],ventas:['var(--ok-bg)','var(--ok)'],cobros:['#E6EEF6','var(--blue)'],bodega:['var(--warn-bg)','var(--warn)'],contabilidad:['#F0EBF7','#7A4A9E'],auditoria:['#EEF0E8','var(--muted)'],facturador:['var(--warn-bg)','var(--warn)'],piloto:['#E6EEF6','var(--blue)']};
  const [bg,col]=badgeColors[currentRole]||['#EEF0E8','var(--muted)'];
  $('#role-badge').style.background=bg;$('#role-badge').style.color=col;
}

// ================= PAGO GLOBAL DESDE FICHA DE CLIENTE =================
function openPagoGlobalCliente(cliId){
  openPagoGlobal();
  setTimeout(()=>{
    const cli=clientes.find(c=>c.id===cliId);if(!cli)return;
    $pg('#pg-cli-search').value=`${cli.nombre} · ${cli.nit}`;
    $pg('#pg-cli-id').value=String(cliId);
    pgCargaFacturas();
  },50);
}
window.openPagoGlobalCliente=openPagoGlobalCliente;

// ================= HOOKS DE AUDITORÍA =================
// Se inyectan en los puntos clave del sistema
const _origGo=go;
window.go=function(v,desdeHash){
  if(v==='auditoria')renderAuditoria();
  _origGo(v,desdeHash);
};

// ---- Navegación por dirección (hash) ----
// Permite que el botón "atrás"/"adelante" del navegador y el recargar (F5)
// funcionen dentro del sistema. Cada sección tiene su dirección: #inventario, #reportes, etc.
const VISTAS_VALIDAS=['panel','pedido','cotizaciones','documentos','cobros','clientes','recordatorios','inventario','reportes','compras','nuevacompra','porpagar','bancos','talonarios','proveedores','usuarios','auditoria','despachos','misentregas'];
function irAHash(){
  // Solo navegar por hash si ya entramos al sistema (app visible)
  const app=document.getElementById('app-layout');
  if(!app||app.style.display==='none')return;
  const v=(location.hash||'').replace('#','');
  if(v && VISTAS_VALIDAS.includes(v) && tienePermiso(v)){
    window.go(v,true); // true = viene del hash, no reescribir
  }
}
window.addEventListener('hashchange',irAHash);
// Al entrar al sistema: si la dirección trae una sección válida y con permiso, ir ahí; si no, al panel.
function entrarVistaInicial(){
  const v=(location.hash||'').replace('#','');
  if(v && VISTAS_VALIDAS.includes(v) && tienePermiso(v)){
    window.go(v);
  }else{
    window.go('panel');
  }
}

// ---- ARRANQUE: cargar datos desde Supabase antes de mostrar la app ----
async function arrancarApp(){
  let conectado=false;
  // Si db.js está presente y configurado, cargamos de la base
  if(typeof cargarTodo==='function'){
    try{
      // Timeout: si la base no responde en 12 segundos, arrancamos en modo prueba
      const conTimeout=Promise.race([
        cargarTodo(),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timeout: la base no respondió en 12 segundos')),12000))
      ]);
      const ok=await conTimeout;
      if(ok){
        conectado=true;
        // Reconstruir contadores de IDs según lo que vino de la base
        cliN=(clientes.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
        prodN=(productos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
        corr=(documentos.reduce((m,d)=>Math.max(m,d.numero||0),0)||0)+1;cotN=(cotizaciones.reduce((m,c)=>Math.max(m,c.numero||0),0)||0)+1;
        compN=(compras.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
        usrN=(usuarios.reduce((m,u)=>Math.max(m,u.id),0)||0)+1;
        pilN=(pilotos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
        vendN=(vendedores.reduce((m,v)=>Math.max(m,v.id),0)||0)+1;
        cobroRutaN=(cobrosRuta.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
        provN=(proveedores.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
      }
    }catch(err){
      console.error('Error al cargar de la base:',err);
      conectado=false;
    }
  }
  window._sefeConectado=conectado;
  initForm();initCompra();render();renderPanel();renderUserGrid();
  // Indicador visual de conexión en la pantalla de login
  const badge=document.getElementById('conn-badge');
  if(badge){
    badge.textContent=conectado?'● Conectado a la base de datos':'● Modo prueba (sin conexión)';
    badge.style.color=conectado?'#7FBF4D':'#C9A227';
  }
}

// Al arrancar: si ya hay una sesión activa de Supabase Auth, entrar directo
async function verificarSesion(){
  try{
    // Si la app se abrió desde el enlace de recuperación, mostrar el form de nueva clave (no auto-entrar).
    if(_modoRecovery || /type=recovery/.test(location.hash)){ mostrarResetPass(); return; }
    if(typeof sb==='undefined'||!sb.auth)return;
    const {data}=await sb.auth.getSession();
    if(data && data.session && data.session.user){
      // Hay sesión guardada: mostrar el loader mientras preparamos los datos
      mostrarLoader();
      // Red de seguridad: si por timing los datos no cargaron (usuarios vacío
      // O documentos/clientes vacíos), reintentar cargarTodo y esperar a que
      // estén realmente completos antes de entrar.
      // ¿Los datos vienen de verdad de la base? `_sefeDatosBase` lo pone
      // cargarTodo() sólo cuando terminó bien. Antes acá se preguntaba
      // únicamente si la lista de usuarios estaba vacía, y eso nunca
      // pasaba porque el código traía usuarios de ejemplo: la red de
      // seguridad no saltaba nunca y el sistema se quedaba mostrando
      // datos inventados.
      const datosIncompletos=()=>(!window._sefeDatosBase||!usuarios||usuarios.length===0);
      if(datosIncompletos() && typeof cargarTodo==='function'){
        // Reintentar hasta 3 veces, esperando entre intentos
        for(let intento=0; intento<3 && datosIncompletos(); intento++){
          try{
            const ok=await cargarTodo();
            if(ok){
              window._sefeConectado=true;
              cliN=(clientes.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
              prodN=(productos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
              corr=(documentos.reduce((m,d)=>Math.max(m,d.numero||0),0)||0)+1;cotN=(cotizaciones.reduce((m,c)=>Math.max(m,c.numero||0),0)||0)+1;
              compN=(compras.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
              usrN=(usuarios.reduce((m,u)=>Math.max(m,u.id),0)||0)+1;
              pilN=(pilotos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
              vendN=(vendedores.reduce((m,v)=>Math.max(m,v.id),0)||0)+1;
              cobroRutaN=(cobrosRuta.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
              provN=(proveedores.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
              initForm();initCompra();render();renderPanel();renderUserGrid();
            }
          }catch(e2){ /* si vuelve a fallar, sigue al login */ }
          if(datosIncompletos())await new Promise(r=>setTimeout(r,500));
        }
      }
      const email=(data.session.user.email||'').toLowerCase();
      // Igual que en el login: se pregunta a la base con la sesión ya
      // abierta, para que funcione con RLS activo.
      const u=await buscarMiUsuario(data.session.user, email);
      if(u){
        currentUser=u.nombre;currentRole=u.rol;
        $('#login-screen').style.display='none';$('#app-layout').style.display='flex';
        aplicarPermisosUI();
        entrarVistaInicial();
        // Sincronización en vivo también al restaurar sesión (F5 / volver a abrir).
        if(typeof iniciarRealtime==='function')iniciarRealtime();
        // Red de seguridad contra timing: si los datos llegaron tarde, la vista
        // podría haber quedado vacía. Redibujamos la vista actual varias veces
        // en los primeros segundos para garantizar que se pinte con datos completos.
        const _vistaActual=()=>{
          const activa=document.querySelector('.view.active');
          return activa?activa.id.replace('v-',''):'panel';
        };
        const _redibujar=()=>{ try{ const v=_vistaActual(); if(v!=='pedido')go(v); }catch(e){} };
        setTimeout(_redibujar, 300);
        setTimeout(_redibujar, 900);
        setTimeout(_redibujar, 1800);
        // Recuperar el borrador DESPUÉS de los redibujados, para que no lo borren
        setTimeout(recuperarBorrador, 2000);
        // Recordatorios de cobro: mostrar el pop-up también al restaurar sesión (F5)
        _recDismissed=false;setTimeout(()=>{try{mostrarRecordatoriosHoy();}catch(e){console.error(e);}},2200);
        setTimeout(()=>{try{actualizarBellRec();mostrarRecordatoriosPopup();}catch(e){console.error(e);}},2600);
      }
    }
  }catch(e){ /* si falla, se queda en el login normal */ }
}

// Muestra la pantalla de carga (después del login o al entrar con sesión)
function mostrarLoader(){
  const l=document.getElementById('sefe-loader');
  if(!l)return;
  l.style.display='flex';
  l.classList.remove('oculto');
}

// Oculta la pantalla de carga con un desvanecido suave
function ocultarLoader(){
  const l=document.getElementById('sefe-loader');
  if(!l)return;
  l.classList.add('oculto');
  setTimeout(()=>{ if(l)l.style.display='none'; }, 600);
}

// Arrancar y luego verificar sesión.
// Espera a que la librería de Supabase (CDN) y db.js estén realmente
// listos antes de arrancar, para que la primera visita no salga en blanco
// si el CDN tarda en cargar. Reintenta hasta ~6 segundos.
function esperarDependencias(intentos){
  intentos = intentos||0;
  const supaListo = (typeof supabase!=='undefined') || (typeof sb!=='undefined');
  const dbListo   = (typeof cargarTodo==='function');
  if((supaListo && dbListo) || intentos>=60){
    // listo, o nos rendimos tras ~6s y arrancamos igual (modo prueba)
    arrancarApp().then(verificarSesion).finally(()=>{
      // Ocultar la pantalla de carga cuando todo el arranque terminó
      // (sea que entró con sesión o que quedó en el login).
      ocultarLoader();
    });
  } else {
    setTimeout(()=>esperarDependencias(intentos+1), 100);
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', ()=>esperarDependencias(0));
} else {
  esperarDependencias(0);
}
// Red de seguridad: si por lo que sea el loader no se ocultó en 12s, quitarlo
// para no dejar al usuario atascado en la pantalla de carga.
setTimeout(()=>{ if(typeof ocultarLoader==='function')ocultarLoader(); }, 12000);
