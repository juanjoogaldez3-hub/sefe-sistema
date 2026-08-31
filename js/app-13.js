// ============================================================
//  MÓDULO CONTROLES  (sección "Controles")
// ============================================================
//  Tres pestañas: Ambientales, Baterías y Gasolina.
//   · Parte 1 (esta): Ambientales — servicios de recarga por cliente.
//   · Parte 2 (luego): Baterías — cambios por cliente + stock.
//   · Parte 3 (luego): Gasolina — consumo por vehículo + carga a Bancos.
//
//  Acceso: es un permiso otorgable (MODULOS_PERMISOS 'controles'), así el
//  admin lo ve siempre y a los demás roles se les puede dar desde Usuarios.
// ============================================================

let _ctrlTab='amb';   // pestaña activa

function renderControles(){ ctrlTab(_ctrlTab||'amb'); }
window.renderControles=renderControles;

function ctrlTab(t){
  _ctrlTab=t;
  ['amb','bat','gas'].forEach(x=>{
    const pane=document.getElementById('ctrl-'+x); if(pane)pane.hidden=(x!==t);
    const btn=document.querySelector('.ctrl-tab[data-tab="'+x+'"]');
    if(btn)btn.className='btn btn-sm ctrl-tab '+(x===t?'btn-primary':'btn-ghost');
  });
  if(t==='amb')renderAmbServicios();
  // 'bat' y 'gas' llegan en las partes 2 y 3.
}
window.ctrlTab=ctrlTab;

// Badge según el próximo servicio (vencido / pronto / al día).
function _ctrlVenceBadge(fecha){
  if(!fecha)return '';
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  const f=String(fecha).slice(0,10);
  if(f<hoy)return ' <span class="badge b-danger" style="font-size:10px">Vencido</span>';
  const dias=(new Date(f)-new Date(hoy))/86400000;
  if(dias<=7)return ' <span class="badge b-warn" style="font-size:10px">Pronto</span>';
  return ' <span class="badge b-ok" style="font-size:10px">Al día</span>';
}

// ── Ambientales (servicios de recarga) ─────────────────────
function _ctrlNombreCliente(id){
  const c=(typeof clientes!=='undefined'?clientes:[]).find(x=>String(x.id)===String(id));
  return c?c.nombre:('Cliente '+id);
}
function renderAmbServicios(){
  const tb=$('#t-amb'); if(!tb)return;
  const lista=(typeof ambServicios!=='undefined'?ambServicios:[]).slice()
    .sort((a,b)=>String(b.proximo||b.fecha||'').localeCompare(String(a.proximo||a.fecha||'')));
  const empty=$('#amb-empty'); if(empty)empty.style.display=lista.length?'none':'block';
  tb.innerHTML=lista.map(s=>`<tr>
      <td style="font-weight:600">${escHtml(_ctrlNombreCliente(s.clienteId))}${s.ubicacion?`<div style="font-size:11px;color:var(--muted-2)">${escHtml(s.ubicacion)}</div>`:''}</td>
      <td>${escHtml(s.aroma||'—')}</td>
      <td>${s.fecha?fdate(s.fecha):'—'}</td>
      <td>${s.proximo?fdate(s.proximo)+_ctrlVenceBadge(s.proximo):'<span style="color:var(--muted-2)">—</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openAmbServicio(${s.id})">Editar</button></td>
    </tr>`).join('');
  if(typeof enhanceTable==='function')enhanceTable('t-amb');
}
window.renderAmbServicios=renderAmbServicios;

function openAmbServicio(id){
  const s=id?ambServicios.find(x=>String(x.id)===String(id)):null;
  const optCli=`<option value="">— Elegí cliente —</option>`+
    (typeof clientes!=='undefined'?clientes:[]).slice()
      .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
      .map(c=>`<option value="${c.id}"${s&&String(s.clienteId)===String(c.id)?' selected':''}>${escHtml(c.nombre)}</option>`).join('');
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():'';
  openMod(s?'Editar servicio de ambiental':'Nuevo servicio de ambiental',
    `<div class="row"><div><label>Cliente</label><select id="amb-cli">${optCli}</select></div><div><label>Ubicación <span style="font-weight:400;color:var(--muted-2)">(dónde)</span></label><input id="amb-ubi" value="${s?escHtml(s.ubicacion||''):''}" placeholder="Ej. Baño hombres, Recepción"></div></div>
     <div class="row"><div><label>Aroma / fragancia</label><input id="amb-aroma" value="${s?escHtml(s.aroma||''):''}" placeholder="Ej. Lavanda"></div><div><label>Nota</label><input id="amb-nota" value="${s?escHtml(s.nota||''):''}"></div></div>
     <div class="row"><div><label>Fecha del servicio</label><input id="amb-fecha" type="date" value="${s&&s.fecha?String(s.fecha).slice(0,10):hoy}"></div><div><label>Próximo servicio</label><input id="amb-prox" type="date" value="${s&&s.proximo?String(s.proximo).slice(0,10):''}"></div></div>
     ${s?`<div style="margin-top:4px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="_ambBorrar(${s.id})">Eliminar servicio</button></div>`:''}
     <div class="note n-danger" id="amb-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#amb-err').style.display='flex';$('#amb-err').querySelector('span').textContent=m;};
      const clienteId=$('#amb-cli').value?Number($('#amb-cli').value):null;
      if(!clienteId){err('Elegí el cliente');return;}
      const rec=s||{_nuevo:true};
      rec.clienteId=clienteId;
      rec.ubicacion=$('#amb-ubi').value.trim();
      rec.aroma=$('#amb-aroma').value.trim();
      rec.nota=$('#amb-nota').value.trim();
      rec.fecha=$('#amb-fecha').value||null;
      rec.proximo=$('#amb-prox').value||null;
      if(!rec.creadoPor&&typeof currentUser!=='undefined')rec.creadoPor=currentUser;
      const ok=await (typeof guardarAmbServicio==='function'?guardarAmbServicio(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de Controles?');if(!s)rec._nuevo=true;return;}
      if(!s)ambServicios.push(rec);
      if(typeof logAudit==='function')logAudit(s?'Ambiental · servicio editado':'Ambiental · servicio creado',_ctrlNombreCliente(clienteId));
      closeMod();renderAmbServicios();toast('✓ Servicio guardado',_ctrlNombreCliente(clienteId));
    });
}
window.openAmbServicio=openAmbServicio;

function _ambBorrar(id){
  const s=(typeof ambServicios!=='undefined'?ambServicios:[]).find(x=>String(x.id)===String(id)); if(!s)return;
  const _do=async()=>{
    const ok=await (typeof borrarAmbServicio==='function'?borrarAmbServicio(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=ambServicios.findIndex(x=>String(x.id)===String(id)); if(idx>=0)ambServicios.splice(idx,1);
    if(typeof logAudit==='function')logAudit('Ambiental · servicio eliminado',_ctrlNombreCliente(s.clienteId));
    if(typeof closeMod==='function')closeMod();
    renderAmbServicios(); toast('✓ Servicio eliminado');
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar el servicio?','Se quita del control de ambientales.','Eliminar',_do);
  else if(confirm('¿Eliminar el servicio?'))_do();
}
window._ambBorrar=_ambBorrar;
