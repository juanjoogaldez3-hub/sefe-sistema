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
  // 'bat' y 'gas' llegan en las partes 2 y 3.
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
