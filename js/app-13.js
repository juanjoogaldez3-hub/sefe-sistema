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
function _batNombrePiloto(id){
  const p=(typeof pilotos!=='undefined'?pilotos:[]).find(x=>String(x.id)===String(id));
  return p?p.nombre:'—';
}
// Inventario EN MANO por piloto y tipo: entregado − colocado.
function _batEnMano(){
  const m={}; // clave `${pilotoId}|${tipoId}` → {pilotoId,tipoId,entregado,colocado}
  const k=(p,t)=>String(p)+'|'+String(t);
  const get=(p,t)=>{const key=k(p,t);return m[key]||(m[key]={pilotoId:p,tipoId:t,entregado:0,colocado:0});};
  (typeof batEntregas!=='undefined'?batEntregas:[]).forEach(e=>{if(e.pilotoId&&e.tipoId)get(e.pilotoId,e.tipoId).entregado+=Number(e.cantidad)||0;});
  (typeof batCambios!=='undefined'?batCambios:[]).forEach(c=>{if(c.pilotoId&&c.tipoId)get(c.pilotoId,c.tipoId).colocado+=Number(c.cantidad)||0;});
  return Object.values(m);
}
function renderBaterias(){
  // 1) Existencias en bodega
  const ts=$('#t-bat-stock');
  if(ts){
    const lista=(typeof batTipos!=='undefined'?batTipos:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
    const e=$('#bat-stock-empty'); if(e)e.style.display=lista.length?'none':'block';
    ts.innerHTML=lista.map(t=>`<tr>
        <td style="font-weight:600">${escHtml(t.nombre)}</td>
        <td class="num" style="font-weight:700">${(Number(t.stock)||0)}${_batStockBadge(Number(t.stock)||0)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="_batEntrada(${t.id})" title="Sumar existencias a bodega">＋ Entrada</button>
          <button class="btn btn-ghost btn-sm" onclick="openBatTipo(${t.id})">Editar</button></td>
      </tr>`).join('');
    if(typeof enhanceTable==='function')enhanceTable('t-bat-stock');
  }
  // 2) Entregas a pilotos
  const te=$('#t-bat-entregas');
  if(te){
    const lista=(typeof batEntregas!=='undefined'?batEntregas:[]).slice().sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));
    const e=$('#bat-entregas-empty'); if(e)e.style.display=lista.length?'none':'block';
    te.innerHTML=lista.map(x=>`<tr>
        <td style="font-weight:600">${escHtml(_batNombrePiloto(x.pilotoId))}</td>
        <td>${escHtml(_batNombreTipo(x.tipoId))}</td>
        <td class="num">${Number(x.cantidad)||0}</td>
        <td>${x.fecha?fdate(x.fecha):'—'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openBatEntrega(${x.id})">Editar</button></td>
      </tr>`).join('');
    if(typeof enhanceTable==='function')enhanceTable('t-bat-entregas');
  }
  // 3) En mano por piloto (cuadre): entregado − colocado
  const tm=$('#t-bat-enmano');
  if(tm){
    const lista=_batEnMano().filter(r=>r.entregado||r.colocado)
      .sort((a,b)=>_batNombrePiloto(a.pilotoId).localeCompare(_batNombrePiloto(b.pilotoId))||_batNombreTipo(a.tipoId).localeCompare(_batNombreTipo(b.tipoId)));
    const e=$('#bat-enmano-empty'); if(e)e.style.display=lista.length?'none':'block';
    tm.innerHTML=lista.map(r=>{const mano=r.entregado-r.colocado;return `<tr>
        <td style="font-weight:600">${escHtml(_batNombrePiloto(r.pilotoId))}</td>
        <td>${escHtml(_batNombreTipo(r.tipoId))}</td>
        <td class="num">${r.entregado}</td>
        <td class="num">${r.colocado}</td>
        <td class="num" style="font-weight:700;${mano<0?'color:var(--danger)':''}">${mano}${mano<0?' <span class="badge b-danger" style="font-size:10px">Revisar</span>':''}</td>
      </tr>`;}).join('');
    if(typeof enhanceTable==='function')enhanceTable('t-bat-enmano');
  }
  // 4) Colocaciones (cambios) por cliente
  const tc=$('#t-bat-cambios');
  if(tc){
    const lista=(typeof batCambios!=='undefined'?batCambios:[]).slice()
      .sort((a,b)=>String(b.proximo||b.fecha||'').localeCompare(String(a.proximo||a.fecha||'')));
    const e=$('#bat-cambios-empty'); if(e)e.style.display=lista.length?'none':'block';
    tc.innerHTML=lista.map(c=>`<tr>
        <td style="font-weight:600">${escHtml(_ctrlNombreCliente(c.clienteId))}${c.equipo?`<div style="font-size:11px;color:var(--muted-2)">${escHtml(c.equipo)}</div>`:''}</td>
        <td>${escHtml(_batNombrePiloto(c.pilotoId))}</td>
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

// En mano de un piloto para un tipo (entregado − colocado), pudiendo
// excluir un cambio (el que se está editando).
function _batEnManoDe(pilotoId,tipoId,excludeId){
  if(!pilotoId||!tipoId)return 0;
  let ent=0,col=0;
  (typeof batEntregas!=='undefined'?batEntregas:[]).forEach(e=>{if(String(e.pilotoId)===String(pilotoId)&&String(e.tipoId)===String(tipoId))ent+=Number(e.cantidad)||0;});
  (typeof batCambios!=='undefined'?batCambios:[]).forEach(x=>{if(String(x.id)!==String(excludeId)&&String(x.pilotoId)===String(pilotoId)&&String(x.tipoId)===String(tipoId))col+=Number(x.cantidad)||0;});
  return ent-col;
}

// ── Colocaciones (cambios): salen del inventario del PILOTO ──
function _optClientes(sel){return `<option value="">— Elegí cliente —</option>`+
  (typeof clientes!=='undefined'?clientes:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(x=>`<option value="${x.id}"${String(sel)===String(x.id)?' selected':''}>${escHtml(x.nombre)}</option>`).join('');}
function _optTipos(sel){return `<option value="">— Elegí tipo —</option>`+
  (typeof batTipos!=='undefined'?batTipos:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(t=>`<option value="${t.id}"${String(sel)===String(t.id)?' selected':''}>${escHtml(t.nombre)}</option>`).join('');}
function _optPilotos(sel){return `<option value="">— Elegí piloto —</option>`+
  (typeof pilotos!=='undefined'?pilotos:[]).slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(p=>`<option value="${p.id}"${String(sel)===String(p.id)?' selected':''}>${escHtml(p.nombre)}</option>`).join('');}

function openBatCambio(id){
  const c=id?batCambios.find(x=>String(x.id)===String(id)):null;
  window._bcEditId=c?c.id:null;   // para excluir este cambio del "en mano"
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():'';
  openMod(c?'Editar colocación de batería':'Nueva colocación de batería',
    `<div class="row"><div><label>Cliente</label><select id="bc-cli">${_optClientes(c&&c.clienteId)}</select></div><div><label>Equipo / ubicación</label><input id="bc-eq" value="${c?escHtml(c.equipo||''):''}" placeholder="Ej. Dispensador baño 1"></div></div>
     <div class="row"><div><label>Piloto <span style="font-weight:400;color:var(--muted-2)">(de quién sale)</span></label><select id="bc-pil" onchange="_bcActualizarEnMano()">${_optPilotos(c&&c.pilotoId)}</select></div><div><label>Tipo de batería</label><select id="bc-tipo" onchange="_bcActualizarEnMano()">${_optTipos(c&&c.tipoId)}</select></div></div>
     <div class="row"><div><label>Cantidad</label><input id="bc-cant" type="number" step="1" value="${c?(Number(c.cantidad)||1):1}"></div><div></div></div>
     <div class="row"><div><label>Fecha del cambio</label><input id="bc-fecha" type="date" value="${c&&c.fecha?String(c.fecha).slice(0,10):hoy}"></div><div><label>Próximo cambio <span style="font-weight:400;color:var(--muted-2)">(si cae fin de semana pasa al lunes)</span></label><input id="bc-prox" type="date" onchange="this.value=_siguienteHabil(this.value)" value="${c&&c.proximo?String(c.proximo).slice(0,10):''}"></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Nota</label><input id="bc-nota" value="${c?escHtml(c.nota||''):''}"></div></div>
     ${c?`<div style="margin-top:4px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="_batCambioBorrar(${c.id})">Eliminar colocación</button></div>`:''}
     <div class="note" id="bc-info" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span></span></div>
     <div class="note n-danger" id="bc-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#bc-err').style.display='flex';$('#bc-err').querySelector('span').textContent=m;};
      const clienteId=$('#bc-cli').value?Number($('#bc-cli').value):null;
      if(!clienteId){err('Elegí el cliente');return;}
      const pilotoId=$('#bc-pil').value?Number($('#bc-pil').value):null;
      if(!pilotoId){err('Elegí de qué piloto sale la batería');return;}
      const tipoId=$('#bc-tipo').value?Number($('#bc-tipo').value):null;
      if(!tipoId){err('Elegí el tipo de batería');return;}
      const cantidad=Number($('#bc-cant').value)||0;
      if(cantidad<=0){err('La cantidad debe ser mayor a 0');return;}
      const rec=c||{_nuevo:true};
      rec.clienteId=clienteId; rec.equipo=$('#bc-eq').value.trim(); rec.pilotoId=pilotoId; rec.tipoId=tipoId; rec.cantidad=cantidad;
      rec.fecha=$('#bc-fecha').value||null;
      rec.proximo=$('#bc-prox').value||null;
      if(rec.proximo){const hab=_siguienteHabil(rec.proximo);if(hab!==rec.proximo){rec.proximo=hab;toast('Próximo cambio movido','Caía en fin de semana → '+fdate(hab));}}
      rec.nota=$('#bc-nota').value.trim();
      if(!rec.creadoPor&&typeof currentUser!=='undefined')rec.creadoPor=currentUser;
      const ok=await (typeof guardarBatCambio==='function'?guardarBatCambio(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de Baterías?');if(!c)rec._nuevo=true;return;}
      if(!c)batCambios.push(rec);
      // No toca bodega: el inventario del piloto (entregado − colocado) lo refleja solo.
      if(typeof logAudit==='function')logAudit(c?'Batería · colocación editada':'Batería · colocación creada',_batNombrePiloto(pilotoId)+' → '+_ctrlNombreCliente(clienteId)+' · '+_batNombreTipo(tipoId)+' x'+cantidad);
      closeMod();renderBaterias();toast('✓ Colocación guardada',_ctrlNombreCliente(clienteId));
    });
  setTimeout(_bcActualizarEnMano,50);
}
window.openBatCambio=openBatCambio;
// Muestra cuánto tiene en mano el piloto de ese tipo (para no colocar de más).
function _bcActualizarEnMano(){
  const pil=$('#bc-pil'), tipo=$('#bc-tipo'), info=$('#bc-info'); if(!pil||!tipo||!info)return;
  if(!pil.value||!tipo.value){info.style.display='none';return;}
  const mano=_batEnManoDe(pil.value,tipo.value,(window._bcEditId||null));
  info.style.display='flex';
  info.querySelector('span').textContent='En mano de '+_batNombrePiloto(pil.value)+' ('+_batNombreTipo(tipo.value)+'): '+mano+(mano<=0?' — no le queda de este tipo':'');
}
window._bcActualizarEnMano=_bcActualizarEnMano;

function _batCambioBorrar(id){
  const c=(typeof batCambios!=='undefined'?batCambios:[]).find(x=>String(x.id)===String(id)); if(!c)return;
  const _do=async()=>{
    const ok=await (typeof borrarBatCambio==='function'?borrarBatCambio(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=batCambios.findIndex(x=>String(x.id)===String(id)); if(idx>=0)batCambios.splice(idx,1);
    // No toca bodega; el en mano del piloto se recalcula solo.
    if(typeof logAudit==='function')logAudit('Batería · colocación eliminada',_ctrlNombreCliente(c.clienteId));
    if(typeof closeMod==='function')closeMod(); renderBaterias(); toast('✓ Colocación eliminada');
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar la colocación?','Se quita del control. Le vuelve a contar al piloto en su inventario.','Eliminar',_do);
  else if(confirm('¿Eliminar la colocación?'))_do();
}

// ── Entregas de bodega a pilotos (descuentan de bodega) ──
function openBatEntrega(id){
  const e=id?batEntregas.find(x=>String(x.id)===String(id)):null;
  const old=e?{tipoId:e.tipoId,cantidad:Number(e.cantidad)||0}:null;
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():'';
  openMod(e?'Editar entrega a piloto':'Nueva entrega a piloto',
    `<div class="row"><div><label>Piloto</label><select id="be-pil">${_optPilotos(e&&e.pilotoId)}</select></div><div><label>Tipo de batería</label><select id="be-tipo">${_optTipos(e&&e.tipoId)}</select></div></div>
     <div class="row"><div><label>Cantidad entregada</label><input id="be-cant" type="number" step="1" value="${e?(Number(e.cantidad)||1):1}"></div><div><label>Fecha</label><input id="be-fecha" type="date" value="${e&&e.fecha?String(e.fecha).slice(0,10):hoy}"></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Nota</label><input id="be-nota" value="${e?escHtml(e.nota||''):''}"></div></div>
     ${e?`<div style="margin-top:4px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="_batEntregaBorrar(${e.id})">Eliminar entrega</button></div>`:''}
     <div class="note n-danger" id="be-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#be-err').style.display='flex';$('#be-err').querySelector('span').textContent=m;};
      const pilotoId=$('#be-pil').value?Number($('#be-pil').value):null;
      if(!pilotoId){err('Elegí el piloto');return;}
      const tipoId=$('#be-tipo').value?Number($('#be-tipo').value):null;
      if(!tipoId){err('Elegí el tipo de batería');return;}
      const cantidad=Number($('#be-cant').value)||0;
      if(cantidad<=0){err('La cantidad debe ser mayor a 0');return;}
      const rec=e||{_nuevo:true};
      rec.pilotoId=pilotoId; rec.tipoId=tipoId; rec.cantidad=cantidad; rec.fecha=$('#be-fecha').value||null; rec.nota=$('#be-nota').value.trim();
      if(!rec.creadoPor&&typeof currentUser!=='undefined')rec.creadoPor=currentUser;
      const ok=await (typeof guardarBatEntrega==='function'?guardarBatEntrega(rec):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de entregas?');if(!e)rec._nuevo=true;return;}
      if(!e)batEntregas.push(rec);
      // La entrega SALE de bodega: descuenta del stock del tipo (en edición, delta).
      if(!old){ await _batAjustarStock(tipoId,-cantidad); }
      else if(String(old.tipoId)===String(tipoId)){ await _batAjustarStock(tipoId, old.cantidad-cantidad); }
      else { await _batAjustarStock(old.tipoId, old.cantidad); await _batAjustarStock(tipoId, -cantidad); }
      if(typeof logAudit==='function')logAudit(e?'Batería · entrega editada':'Batería · entrega a piloto',_batNombrePiloto(pilotoId)+' · '+_batNombreTipo(tipoId)+' x'+cantidad);
      closeMod();renderBaterias();toast('✓ Entrega guardada',_batNombrePiloto(pilotoId));
    });
}
window.openBatEntrega=openBatEntrega;

function _batEntregaBorrar(id){
  const e=(typeof batEntregas!=='undefined'?batEntregas:[]).find(x=>String(x.id)===String(id)); if(!e)return;
  const _do=async()=>{
    const ok=await (typeof borrarBatEntrega==='function'?borrarBatEntrega(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=batEntregas.findIndex(x=>String(x.id)===String(id)); if(idx>=0)batEntregas.splice(idx,1);
    // Devolver a bodega lo entregado
    await _batAjustarStock(e.tipoId, Number(e.cantidad)||0);
    if(typeof logAudit==='function')logAudit('Batería · entrega eliminada',_batNombrePiloto(e.pilotoId));
    if(typeof closeMod==='function')closeMod(); renderBaterias(); toast('✓ Entrega eliminada (devuelta a bodega)');
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar la entrega?','Se devuelve la cantidad a bodega.','Eliminar',_do);
  else if(confirm('¿Eliminar la entrega?'))_do();
}
window._batEntregaBorrar=_batEntregaBorrar;
window._batCambioBorrar=_batCambioBorrar;
