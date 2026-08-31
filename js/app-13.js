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

let _ctrlTab='amb';       // pestaña activa
let _ambVista='lista';    // 'lista' | 'cal'
let _ambCalRef=null;      // {anio,mes} del mes que se está viendo en el calendario

function renderControles(){ ctrlTab(_ctrlTab||'amb'); }
window.renderControles=renderControles;

function ctrlTab(t){
  _ctrlTab=t;
  ['amb','bat','gas'].forEach(x=>{
    const pane=document.getElementById('ctrl-'+x); if(pane)pane.hidden=(x!==t);
    const btn=document.querySelector('.ctrl-tab[data-tab="'+x+'"]');
    if(btn)btn.className='btn btn-sm ctrl-tab '+(x===t?'btn-primary':'btn-ghost');
  });
  if(t==='amb')_ambRender();
  else if(t==='bat')renderBaterias();
  // 'gas' llega en la parte 3.
}
window.ctrlTab=ctrlTab;

// Fecha (YYYY-MM-DD) → siguiente día hábil si cae sábado o domingo (→ lunes).
function _siguienteHabil(fecha){
  if(!fecha)return fecha;
  const f=String(fecha).slice(0,10);
  const d=new Date(f+'T00:00:00Z'); if(isNaN(d))return fecha;
  const dow=d.getUTCDay();            // 0 dom … 6 sáb
  if(dow===6)d.setUTCDate(d.getUTCDate()+2);   // sábado → lunes
  else if(dow===0)d.setUTCDate(d.getUTCDate()+1); // domingo → lunes
  return d.toISOString().slice(0,10);
}
window._siguienteHabil=_siguienteHabil;

// Cambiar entre Lista y Calendario.
function ambVista(v){
  _ambVista=v;
  ['lista','cal'].forEach(x=>{
    const el=document.getElementById('amb-'+x); if(el)el.hidden=(x!==v);
    const btn=document.querySelector('.amb-vista[data-vista="'+x+'"]');
    if(btn)btn.className='btn btn-sm amb-vista '+(x===v?'btn-primary':'btn-ghost');
  });
  _ambRender();
}
window.ambVista=ambVista;
function _ambRender(){ if(_ambVista==='cal')renderAmbCalendario(); else renderAmbServicios(); }

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
     <div class="row"><div><label>Fecha del servicio</label><input id="amb-fecha" type="date" value="${s&&s.fecha?String(s.fecha).slice(0,10):hoy}"></div><div><label>Próximo servicio <span style="font-weight:400;color:var(--muted-2)">(si cae fin de semana pasa al lunes)</span></label><input id="amb-prox" type="date" onchange="this.value=_siguienteHabil(this.value)" value="${s&&s.proximo?String(s.proximo).slice(0,10):''}"></div></div>
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
      // Si el próximo servicio cae sábado/domingo, se corre al lunes.
      if(rec.proximo){const hab=_siguienteHabil(rec.proximo);if(hab!==rec.proximo){rec.proximo=hab;toast('Próximo servicio movido','Caía en fin de semana → '+fdate(hab));}}
      if(!rec.creadoPor&&typeof currentUser!=='undefined')rec.creadoPor=currentUser;
      const ok=await (typeof guardarAmbServicio==='function'?guardarAmbServicio(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de Controles?');if(!s)rec._nuevo=true;return;}
      if(!s)ambServicios.push(rec);
      if(typeof logAudit==='function')logAudit(s?'Ambiental · servicio editado':'Ambiental · servicio creado',_ctrlNombreCliente(clienteId));
      closeMod();_ambRender();toast('✓ Servicio guardado',_ctrlNombreCliente(clienteId));
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
    _ambRender(); toast('✓ Servicio eliminado');
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar el servicio?','Se quita del control de ambientales.','Eliminar',_do);
  else if(confirm('¿Eliminar el servicio?'))_do();
}
window._ambBorrar=_ambBorrar;

// ── Ambientales · vista Calendario ─────────────────────────
// Muestra los PRÓXIMOS servicios programados, por día del mes.
const _MESES_AMB=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function renderAmbCalendario(){
  const cont=document.getElementById('amb-cal'); if(!cont)return;
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  const anio=_ambCalRef?_ambCalRef.anio:+hoy.slice(0,4);
  const mes=_ambCalRef?_ambCalRef.mes:+hoy.slice(5,7);
  const mm=String(mes).padStart(2,'0');
  const dias=new Date(Date.UTC(anio,mes,0)).getUTCDate();
  const dowPrimero=(new Date(Date.UTC(anio,mes-1,1)).getUTCDay()+6)%7; // Lun=0 … Dom=6
  // Agrupar próximos servicios por día del mes visible
  const porDia={};
  (typeof ambServicios!=='undefined'?ambServicios:[]).forEach(s=>{
    if(!s.proximo)return;
    const p=String(s.proximo).slice(0,10);
    if(p.slice(0,7)===`${anio}-${mm}`){const d=+p.slice(8,10);(porDia[d]=porDia[d]||[]).push(s);}
  });
  const celdas=[];
  for(let i=0;i<dowPrimero;i++)celdas.push('<div class="amb-cal-cell amb-cal-empty"></div>');
  for(let d=1;d<=dias;d++){
    const fechaStr=`${anio}-${mm}-${String(d).padStart(2,'0')}`;
    const dow=new Date(Date.UTC(anio,mes-1,d)).getUTCDay(); // 0 dom … 6 sáb
    const finde=(dow===0||dow===6), esHoy=(fechaStr===hoy);
    const items=porDia[d]||[];
    celdas.push(`<div class="amb-cal-cell${finde?' amb-cal-finde':''}${esHoy?' amb-cal-hoy':''}">
        <div class="amb-cal-num">${d}</div>
        ${items.map(s=>`<div class="amb-cal-ev" onclick="openAmbServicio(${s.id})" title="${escHtml(_ctrlNombreCliente(s.clienteId))}${s.ubicacion?' · '+escHtml(s.ubicacion):''}${s.aroma?' · '+escHtml(s.aroma):''}">${escHtml(_ctrlNombreCliente(s.clienteId))}</div>`).join('')}
      </div>`);
  }
  const dowLbls=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  cont.innerHTML=`<style>
      #amb-cal .amb-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
      #amb-cal .amb-cal-dow{font-size:10px;font-weight:700;color:var(--muted-2);text-transform:uppercase;text-align:center;letter-spacing:.5px;padding-bottom:2px}
      #amb-cal .amb-cal-cell{min-height:80px;border:1px solid var(--line);border-radius:8px;padding:4px;background:var(--surface);overflow:hidden}
      #amb-cal .amb-cal-empty{background:transparent;border:none}
      #amb-cal .amb-cal-finde{background:var(--surface-2)}
      #amb-cal .amb-cal-hoy{border-color:var(--green);box-shadow:0 0 0 1px var(--green) inset}
      #amb-cal .amb-cal-num{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:3px}
      #amb-cal .amb-cal-ev{font-size:10.5px;background:var(--green);color:#fff;border-radius:5px;padding:2px 6px;margin-bottom:3px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 10px">
      <div style="font-weight:700;font-size:15px;text-transform:capitalize">${_MESES_AMB[mes-1]} ${anio}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="ambCalMover(-1)" title="Mes anterior">‹</button>
        <button class="btn btn-ghost btn-sm" onclick="ambCalHoy()">Hoy</button>
        <button class="btn btn-ghost btn-sm" onclick="ambCalMover(1)" title="Mes siguiente">›</button>
      </div>
    </div>
    <div class="amb-cal-grid" style="margin-bottom:4px">${dowLbls.map(l=>`<div class="amb-cal-dow">${l}</div>`).join('')}</div>
    <div class="amb-cal-grid">${celdas.join('')}</div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:10px">Se muestran los <b>próximos servicios</b> programados. Tocá un cliente para editarlo. Los fines de semana van en gris.</div>`;
}
window.renderAmbCalendario=renderAmbCalendario;
function ambCalMover(delta){
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  let anio=_ambCalRef?_ambCalRef.anio:+hoy.slice(0,4);
  let mes=(_ambCalRef?_ambCalRef.mes:+hoy.slice(5,7))+delta;
  if(mes<1){mes=12;anio--;} if(mes>12){mes=1;anio++;}
  _ambCalRef={anio,mes}; renderAmbCalendario();
}
function ambCalHoy(){ _ambCalRef=null; renderAmbCalendario(); }
window.ambCalMover=ambCalMover; window.ambCalHoy=ambCalHoy;

// ============================================================
//  BATERÍAS  (parte 2) — existencias (stock) + cambios por cliente
// ============================================================
function _batNombreTipo(id){
  const t=(typeof batTipos!=='undefined'?batTipos:[]).find(x=>String(x.id)===String(id));
  return t?t.nombre:'—';
}
function _batStockBadge(stock){
  if(stock<=0)return ' <span class="badge b-danger" style="font-size:10px">Sin stock</span>';
  if(stock<=5)return ' <span class="badge b-warn" style="font-size:10px">Bajo</span>';
  return '';
}
function renderBaterias(){
  // Existencias
  const ts=$('#t-bat-stock');
  if(ts){
    const lista=(typeof batTipos!=='undefined'?batTipos:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
    const e=$('#bat-stock-empty'); if(e)e.style.display=lista.length?'none':'block';
    ts.innerHTML=lista.map(t=>`<tr>
        <td style="font-weight:600">${escHtml(t.nombre)}</td>
        <td class="num" style="font-weight:700">${(Number(t.stock)||0)}${_batStockBadge(Number(t.stock)||0)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="_batEntrada(${t.id})" title="Sumar existencias">＋ Entrada</button>
          <button class="btn btn-ghost btn-sm" onclick="openBatTipo(${t.id})">Editar</button></td>
      </tr>`).join('');
    if(typeof enhanceTable==='function')enhanceTable('t-bat-stock');
  }
  // Cambios
  const tc=$('#t-bat-cambios');
  if(tc){
    const lista=(typeof batCambios!=='undefined'?batCambios:[]).slice()
      .sort((a,b)=>String(b.proximo||b.fecha||'').localeCompare(String(a.proximo||a.fecha||'')));
    const e=$('#bat-cambios-empty'); if(e)e.style.display=lista.length?'none':'block';
    tc.innerHTML=lista.map(c=>`<tr>
        <td style="font-weight:600">${escHtml(_ctrlNombreCliente(c.clienteId))}${c.equipo?`<div style="font-size:11px;color:var(--muted-2)">${escHtml(c.equipo)}</div>`:''}</td>
        <td>${escHtml(_batNombreTipo(c.tipoId))}</td>
        <td class="num">${Number(c.cantidad)||0}</td>
        <td>${c.fecha?fdate(c.fecha):'—'}</td>
        <td>${c.proximo?fdate(c.proximo)+_ctrlVenceBadge(c.proximo):'<span style="color:var(--muted-2)">—</span>'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openBatCambio(${c.id})">Editar</button></td>
      </tr>`).join('');
    if(typeof enhanceTable==='function')enhanceTable('t-bat-cambios');
  }
}
window.renderBaterias=renderBaterias;

// Ajusta el stock de un tipo (delta + o −) y lo guarda.
async function _batAjustarStock(tipoId,delta){
  if(!tipoId||!delta)return;
  const t=(typeof batTipos!=='undefined'?batTipos:[]).find(x=>String(x.id)===String(tipoId));
  if(!t)return;
  t.stock=(Number(t.stock)||0)+delta;
  await (typeof guardarBatTipo==='function'?guardarBatTipo(t):Promise.resolve());
}

// ── Tipos / existencias ──
function openBatTipo(id){
  const t=id?batTipos.find(x=>String(x.id)===String(id)):null;
  openMod(t?'Editar tipo de batería':'Nuevo tipo de batería',
    `<div class="row"><div><label>Nombre / modelo</label><input id="bat-nom" value="${t?escHtml(t.nombre):''}" placeholder="Ej. AA, D, 9V"></div><div><label>Existencia (stock)</label><input id="bat-stock" type="number" step="1" value="${t?(Number(t.stock)||0):0}"></div></div>
     ${t?`<div style="margin-top:4px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="_batTipoBorrar(${t.id})">Eliminar tipo</button></div>`:''}
     <div class="note n-danger" id="bat-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#bat-err').style.display='flex';$('#bat-err').querySelector('span').textContent=m;};
      const nombre=$('#bat-nom').value.trim();
      if(!nombre){err('Escribí el nombre del tipo');return;}
      const rec=t||{_nuevo:true};
      rec.nombre=nombre; rec.stock=Number($('#bat-stock').value)||0;
      const ok=await (typeof guardarBatTipo==='function'?guardarBatTipo(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de Baterías?');if(!t)rec._nuevo=true;return;}
      if(!t)batTipos.push(rec);
      if(typeof logAudit==='function')logAudit(t?'Batería · tipo editado':'Batería · tipo creado',nombre);
      closeMod();renderBaterias();toast('✓ Tipo guardado',nombre);
    });
}
window.openBatTipo=openBatTipo;

function _batEntrada(id){
  const t=batTipos.find(x=>String(x.id)===String(id)); if(!t)return;
  openMod('Entrada de baterías · '+escHtml(t.nombre),
    `<div class="row"><div><label>Cantidad que ingresa</label><input id="bat-ent" type="number" step="1" value="1"></div><div><label>Nota</label><input id="bat-ent-nota" placeholder="Ej. Compra"></div></div>
     <div style="font-size:12px;color:var(--muted)">Existencia actual: <b>${Number(t.stock)||0}</b></div>`,
    async ()=>{
      const cant=Number($('#bat-ent').value)||0;
      if(cant<=0){toast('Cantidad inválida','Poné un número mayor a 0',true);return;}
      await _batAjustarStock(t.id,cant);
      if(typeof logAudit==='function')logAudit('Batería · entrada',t.nombre+' +'+cant+($('#bat-ent-nota').value?(' · '+$('#bat-ent-nota').value.trim()):''));
      closeMod();renderBaterias();toast('✓ Entrada registrada',t.nombre+' +'+cant);
    });
}
window._batEntrada=_batEntrada;

function _batTipoBorrar(id){
  const t=batTipos.find(x=>String(x.id)===String(id)); if(!t)return;
  const usado=(typeof batCambios!=='undefined'?batCambios:[]).some(c=>String(c.tipoId)===String(id));
  const _do=async()=>{
    const ok=await (typeof borrarBatTipo==='function'?borrarBatTipo(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=batTipos.findIndex(x=>String(x.id)===String(id)); if(idx>=0)batTipos.splice(idx,1);
    if(typeof logAudit==='function')logAudit('Batería · tipo eliminado',t.nombre);
    if(typeof closeMod==='function')closeMod(); renderBaterias(); toast('✓ Tipo eliminado');
  };
  const msg=usado?'Ojo: hay cambios registrados con este tipo. Se van a quedar sin tipo.':'Se quita de las existencias.';
  if(typeof confirmar==='function')confirmar('¿Eliminar el tipo?',msg,'Eliminar',_do);
  else if(confirm('¿Eliminar el tipo?'))_do();
}
window._batTipoBorrar=_batTipoBorrar;

// ── Cambios por cliente/equipo (descuentan del stock) ──
function openBatCambio(id){
  const c=id?batCambios.find(x=>String(x.id)===String(id)):null;
  const old=c?{tipoId:c.tipoId,cantidad:Number(c.cantidad)||0}:null; // para ajustar el stock
  const optCli=`<option value="">— Elegí cliente —</option>`+
    (typeof clientes!=='undefined'?clientes:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
      .map(x=>`<option value="${x.id}"${c&&String(c.clienteId)===String(x.id)?' selected':''}>${escHtml(x.nombre)}</option>`).join('');
  const optTipo=`<option value="">— Elegí tipo —</option>`+
    (typeof batTipos!=='undefined'?batTipos:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
      .map(t=>`<option value="${t.id}"${c&&String(c.tipoId)===String(t.id)?' selected':''}>${escHtml(t.nombre)} (stock ${Number(t.stock)||0})</option>`).join('');
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():'';
  openMod(c?'Editar cambio de batería':'Nuevo cambio de batería',
    `<div class="row"><div><label>Cliente</label><select id="bc-cli">${optCli}</select></div><div><label>Equipo / ubicación</label><input id="bc-eq" value="${c?escHtml(c.equipo||''):''}" placeholder="Ej. Dispensador baño 1"></div></div>
     <div class="row"><div><label>Tipo de batería</label><select id="bc-tipo">${optTipo}</select></div><div><label>Cantidad</label><input id="bc-cant" type="number" step="1" value="${c?(Number(c.cantidad)||1):1}"></div></div>
     <div class="row"><div><label>Fecha del cambio</label><input id="bc-fecha" type="date" value="${c&&c.fecha?String(c.fecha).slice(0,10):hoy}"></div><div><label>Próximo cambio <span style="font-weight:400;color:var(--muted-2)">(si cae fin de semana pasa al lunes)</span></label><input id="bc-prox" type="date" onchange="this.value=_siguienteHabil(this.value)" value="${c&&c.proximo?String(c.proximo).slice(0,10):''}"></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Nota</label><input id="bc-nota" value="${c?escHtml(c.nota||''):''}"></div></div>
     ${c?`<div style="margin-top:4px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="_batCambioBorrar(${c.id})">Eliminar cambio</button></div>`:''}
     <div class="note" id="bc-info" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span></span></div>
     <div class="note n-danger" id="bc-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#bc-err').style.display='flex';$('#bc-err').querySelector('span').textContent=m;};
      const clienteId=$('#bc-cli').value?Number($('#bc-cli').value):null;
      if(!clienteId){err('Elegí el cliente');return;}
      const tipoId=$('#bc-tipo').value?Number($('#bc-tipo').value):null;
      if(!tipoId){err('Elegí el tipo de batería');return;}
      const cantidad=Number($('#bc-cant').value)||0;
      if(cantidad<=0){err('La cantidad debe ser mayor a 0');return;}
      const rec=c||{_nuevo:true};
      rec.clienteId=clienteId; rec.equipo=$('#bc-eq').value.trim(); rec.tipoId=tipoId; rec.cantidad=cantidad;
      rec.fecha=$('#bc-fecha').value||null;
      rec.proximo=$('#bc-prox').value||null;
      if(rec.proximo){const hab=_siguienteHabil(rec.proximo);if(hab!==rec.proximo){rec.proximo=hab;toast('Próximo cambio movido','Caía en fin de semana → '+fdate(hab));}}
      rec.nota=$('#bc-nota').value.trim();
      if(!rec.creadoPor&&typeof currentUser!=='undefined')rec.creadoPor=currentUser;
      const ok=await (typeof guardarBatCambio==='function'?guardarBatCambio(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de Baterías?');if(!c)rec._nuevo=true;return;}
      if(!c)batCambios.push(rec);
      // Ajuste de stock: la salida descuenta; en edición se corrige el delta.
      if(!old){ await _batAjustarStock(tipoId,-cantidad); }
      else if(String(old.tipoId)===String(tipoId)){ await _batAjustarStock(tipoId, old.cantidad-cantidad); }
      else { await _batAjustarStock(old.tipoId, old.cantidad); await _batAjustarStock(tipoId, -cantidad); }
      if(typeof logAudit==='function')logAudit(c?'Batería · cambio editado':'Batería · cambio creado',_ctrlNombreCliente(clienteId)+' · '+_batNombreTipo(tipoId)+' x'+cantidad);
      closeMod();renderBaterias();toast('✓ Cambio guardado',_ctrlNombreCliente(clienteId));
    });
  // Aviso de stock insuficiente (informativo, no bloquea)
  setTimeout(()=>{ const sel=$('#bc-tipo'); if(sel)sel.onchange=()=>{
      const t=batTipos.find(x=>String(x.id)===String(sel.value)); const info=$('#bc-info');
      if(t&&info){const falta=(Number(t.stock)||0);info.style.display=falta<=5?'flex':'none';if(falta<=5)info.querySelector('span').textContent='Stock de '+t.nombre+': '+falta+(falta<=0?' (vas a quedar en negativo)':'');}
    }; },50);
}
window.openBatCambio=openBatCambio;

function _batCambioBorrar(id){
  const c=(typeof batCambios!=='undefined'?batCambios:[]).find(x=>String(x.id)===String(id)); if(!c)return;
  const _do=async()=>{
    const ok=await (typeof borrarBatCambio==='function'?borrarBatCambio(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=batCambios.findIndex(x=>String(x.id)===String(id)); if(idx>=0)batCambios.splice(idx,1);
    // Devolver al stock lo que había descontado ese cambio
    await _batAjustarStock(c.tipoId, Number(c.cantidad)||0);
    if(typeof logAudit==='function')logAudit('Batería · cambio eliminado',_ctrlNombreCliente(c.clienteId));
    if(typeof closeMod==='function')closeMod(); renderBaterias(); toast('✓ Cambio eliminado (stock devuelto)');
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar el cambio?','Se quita del control y se devuelve la cantidad al stock.','Eliminar',_do);
  else if(confirm('¿Eliminar el cambio?'))_do();
}
window._batCambioBorrar=_batCambioBorrar;
