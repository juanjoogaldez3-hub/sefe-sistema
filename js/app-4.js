function renderRecordatorios(){
  const hoy=fechaHoyGT();
  const base=recVisibles();
  const pend=base.filter(r=>!r.hecho);
  const venc=pend.filter(r=>r.fechaVencimiento&&r.fechaVencimiento<hoy);
  const deHoy=pend.filter(r=>r.fechaVencimiento===hoy);
  const kp=$('#rec-kpis');
  if(kp)kp.innerHTML=kpiHTML([
    {ic:venc.length?'i-danger':'i-lime',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',lbl:'Vencidos',val:venc.length},
    {ic:'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'Para hoy',val:deHoy.length},
    {ic:'i-blue',svg:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',lbl:'Pendientes',val:pend.length}]);
  let arr=base;
  if(recFiltro==='pendientes')arr=base.filter(r=>!r.hecho);
  else if(recFiltro==='hoy')arr=base.filter(r=>!r.hecho&&r.fechaVencimiento&&r.fechaVencimiento<=hoy);
  else if(recFiltro==='hechos')arr=base.filter(r=>r.hecho);
  const prioW={alta:0,normal:1,baja:2};
  arr=arr.slice().sort((a,b)=>{
    if(a.hecho!==b.hecho)return a.hecho?1:-1;
    const av=a.fechaVencimiento||'9999-12-31',bv=b.fechaVencimiento||'9999-12-31';
    if(av!==bv)return av<bv?-1:1;
    return (prioW[a.prioridad]??1)-(prioW[b.prioridad]??1);
  });
  const tipoIcon={tarea:'📌',cliente:'👤',contrasena:'🔑',factura:'🧾',producto:'📦',compra:'🛒'};
  const tb=$('#t-recordatorios');if(!tb)return;
  tb.innerHTML=arr.length?arr.map(r=>{
    const vencido=!r.hecho&&r.fechaVencimiento&&r.fechaVencimiento<hoy;
    const esHoy=!r.hecho&&r.fechaVencimiento===hoy;
    const prioBadge=r.prioridad==='alta'?'<span class="badge b-danger" style="font-size:9.5px">Alta</span>':(r.prioridad==='baja'?'<span class="badge b-muted" style="font-size:9.5px">Baja</span>':'');
    return `<tr style="${r.hecho?'opacity:.55':''}">
      <td style="text-align:center"><input type="checkbox" ${r.hecho?'checked':''} onclick="toggleHechoRecordatorio(${r.id})" title="Marcar hecho" style="width:16px;height:16px;cursor:pointer"></td>
      <td><div style="font-weight:600;${r.hecho?'text-decoration:line-through':''}">${tipoIcon[r.tipo]||'📌'} ${_escRec(r.titulo)}</div>${r.nota?`<div style="font-size:11.5px;color:var(--muted)">${_escRec(r.nota)}</div>`:''}</td>
      <td style="font-size:12px;color:var(--muted)">${r.refLabel?_escRec(r.refLabel):'—'}</td>
      <td style="font-size:12px">${_escRec(r.asignadoA||'—')}</td>
      <td style="color:${vencido?'var(--danger)':(esHoy?'#9A6B07':'var(--muted)')};font-weight:${vencido||esHoy?'700':'400'}">${r.fechaVencimiento?fdate(r.fechaVencimiento)+(vencido?' · vencido':(esHoy?' · hoy':'')):'—'}</td>
      <td>${prioBadge}</td>
      <td><div class="acts"><button class="btn btn-ghost btn-sm" onclick="openRecordatorio(${r.id})">Editar</button><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="borrarRecordatorioUI(${r.id})">✕</button></div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="7" class="empty">Sin recordatorios ${recFiltro==='hechos'?'hechos':'en esta vista'}</td></tr>`;
}
window.renderRecordatorios=renderRecordatorios;
// Configura el autocomplete "Ligado a" según el tipo elegido (lee el tipo en vivo)
function recTipoChange(forceTipo){
  const tipo=forceTipo||document.getElementById('rec-tipo')?.value||'tarea';
  const esContra=tipo==='contrasena';
  const wrap=document.getElementById('rec-ref-wrap');
  if(wrap)wrap.style.display=tipo==='tarea'?'none':'';
  const tw=document.getElementById('rec-titulo-wrap');if(tw)tw.style.display=esContra?'none':'';
  const formaW=document.getElementById('rec-forma-wrap');if(formaW)formaW.style.display=esContra?'':'none';
  const _forma=document.getElementById('rec-forma')?.value||'contra';
  const cw=document.getElementById('rec-contra-wrap');if(cw)cw.style.display=(esContra&&_forma==='contra')?'':'none';
  const fw=document.getElementById('rec-fact-wrap');if(fw)fw.style.display=esContra?'':'none';
  const rl=document.getElementById('rec-ref-label');if(rl)rl.textContent=(esContra||tipo==='cliente')?'Cliente':(tipo==='factura'?'Factura':tipo==='producto'?'Producto':tipo==='compra'?'Compra':'Ligado a');
  const fl=document.getElementById('rec-fecha-label');if(fl)fl.textContent=esContra?'Fecha de pago':'Vence';
  if(!forceTipo){const rid=document.getElementById('rec-refid'),rf=document.getElementById('rec-ref'),fid=document.getElementById('rec-factid'),ff=document.getElementById('rec-fact');if(rid)rid.value='';if(rf)rf.value='';if(fid)fid.value='';if(ff)ff.value='';}
}
window.recTipoChange=recTipoChange;
// Muestra/oculta el No. de contraseña según la forma de cobro (contraseña vs al crédito)
function recFormaChange(){
  const tipo=document.getElementById('rec-tipo')?.value||'tarea';
  const forma=document.getElementById('rec-forma')?.value||'contra';
  const cw=document.getElementById('rec-contra-wrap');if(cw)cw.style.display=(tipo==='contrasena'&&forma==='contra')?'':'none';
}
window.recFormaChange=recFormaChange;
function openRecordatorio(id,preset){
  const r=id?recordatorios.find(x=>x.id===id):null;
  preset=preset||{};
  const curTipo=r?r.tipo:(preset.tipo||'tarea');
  let presetRefLabel=preset.refLabel||'';
  if(!r&&preset.refId&&!presetRefLabel&&preset.tipo==='cliente'){const _c=clientes.find(x=>x.id===preset.refId);presetRefLabel=_c?_c.nombre:'';}
  const curForma=(curTipo==='contrasena'&&r&&/^al cr[eé]dito/i.test(String(r.titulo||'')))?'credito':'contra';
  const contraNo=(curTipo==='contrasena'&&r&&curForma==='contra')?((String(r.titulo||'').match(/No\.\s*(.+)$/i)||[])[1]||'').trim():'';
  // Contraseña de pago: cliente (filtro) + factura (referencia que se guarda en refId)
  let cliRefId='',cliRefLabel='',factRefId='',factRefLabel='';
  if(curTipo==='contrasena'){
    if(r){factRefId=r.refId||'';factRefLabel=r.refLabel||'';const _fd=documentos.find(d=>d.id===r.refId);if(_fd){const _c=clientes.find(x=>x.id===_fd.clienteId);cliRefId=_fd.clienteId||'';cliRefLabel=_c?_c.nombre:(_fd.clienteComercial||_fd.clienteNombre||'');}}
    else if(preset.refId){const _c=clientes.find(x=>x.id===preset.refId);cliRefId=preset.refId;cliRefLabel=_c?_c.nombre:'';}
  }
  const refInit=(curTipo==='contrasena')?cliRefLabel:((r&&r.refLabel)?r.refLabel:presetRefLabel);
  const refIdInit=(curTipo==='contrasena')?cliRefId:((r&&r.refId)?r.refId:(preset.refId||''));
  const usrOpts=usuarios.filter(u=>u.activo!==false).map(u=>`<option value="${_escRec(u.nombre)}"${(r?r.asignadoA:currentUser)===u.nombre?' selected':''}>${_escRec(u.nombre)}</option>`).join('');
  const tipoOpts=[['tarea','Tarea libre'],['cliente','Cliente'],['contrasena','Contraseña de pago'],['factura','Factura'],['producto','Producto'],['compra','Compra']].map(([v,l])=>`<option value="${v}"${curTipo===v?' selected':''}>${l}</option>`).join('');
  const prioOpts=[['alta','Alta'],['normal','Normal'],['baja','Baja']].map(([v,l])=>`<option value="${v}"${(r?r.prioridad:'normal')===v?' selected':''}>${l}</option>`).join('');
  openMod(id?'Editar recordatorio':'Nuevo recordatorio',
    `<div class="row" id="rec-titulo-wrap"><div style="grid-column:1/-1"><label>Título</label><input id="rec-titulo" value="${r&&curTipo!=='contrasena'?_escRec(r.titulo):''}" placeholder="Ej. Llamar al cliente por su orden de compra"></div></div>
     <div class="row" id="rec-forma-wrap" style="display:none"><div style="grid-column:1/-1"><label>Forma de cobro</label><select id="rec-forma" onchange="recFormaChange()"><option value="contra"${curForma==='contra'?' selected':''}>Con contraseña de pago</option><option value="credito"${curForma==='credito'?' selected':''}>Al crédito (sin contraseña)</option></select></div></div>
     <div class="row" id="rec-contra-wrap" style="display:none"><div style="grid-column:1/-1"><label>No. de contraseña de pago</label><input id="rec-contra" value="${_escRec(contraNo)}" placeholder="Ej. 04521"></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Nota <span style="color:var(--muted);font-weight:400">(opcional)</span></label><input id="rec-nota" value="${r?_escRec(r.nota):''}" placeholder="Detalle"></div></div>
     <div class="row"><div><label>Tipo</label><select id="rec-tipo" onchange="recTipoChange()">${tipoOpts}</select></div>
       <div id="rec-ref-wrap"><label id="rec-ref-label">Ligado a</label><input id="rec-ref" placeholder="Buscar…" autocomplete="off" value="${_escRec(refInit)}"><input type="hidden" id="rec-refid" value="${refIdInit}"></div></div>
     <div class="row" id="rec-fact-wrap" style="display:none"><div style="grid-column:1/-1"><label>Factura</label><input id="rec-fact" placeholder="Buscar factura del cliente…" autocomplete="off" value="${_escRec(factRefLabel)}"><input type="hidden" id="rec-factid" value="${factRefId}"></div></div>
     <div class="row"><div><label id="rec-fecha-label">Vence</label><input id="rec-fecha" type="date" value="${r&&r.fechaVencimiento?String(r.fechaVencimiento).slice(0,10):''}"></div><div><label>Prioridad</label><select id="rec-prio">${prioOpts}</select></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Asignar a</label><select id="rec-asig">${usrOpts}</select></div></div>`,
    ()=>{
      const tipo=$('#rec-tipo').value;
      let titulo=$('#rec-titulo').value.trim();
      let contraFactId=null,contraFactLabel='';
      if(tipo==='contrasena'){
        const forma=$('#rec-forma')?.value||'contra';
        if(!$('#rec-refid').value){toast('Falta el cliente','Elegí el cliente',true);return;}
        if(!$('#rec-factid').value){toast('Falta la factura','Elegí la factura',true);return;}
        if(forma==='contra'){
          const num=($('#rec-contra')?.value||'').trim();
          if(!num){toast('Falta el No. de contraseña','Escribí el número de contraseña de pago',true);return;}
          titulo='Contraseña de pago No. '+num;
        }else{
          titulo='Al crédito (sin contraseña)';
        }
        contraFactId=Number($('#rec-factid').value);
        contraFactLabel=($('#rec-fact').value.trim()||'')+' · '+($('#rec-ref').value.trim()||'');
      }
      if(!titulo){toast('Falta el título','Escribí qué hay que recordar',true);return;}
      const datos={titulo,nota:$('#rec-nota').value.trim(),tipo,
        refId:tipo==='contrasena'?contraFactId:(tipo==='tarea'?null:(($('#rec-refid').value)?Number($('#rec-refid').value):null)),
        refLabel:tipo==='contrasena'?contraFactLabel:(tipo==='tarea'?'':($('#rec-ref').value.trim()||'')),
        fechaVencimiento:$('#rec-fecha').value||null,asignadoA:$('#rec-asig').value,prioridad:$('#rec-prio').value};
      if(r){Object.assign(r,datos);if(typeof guardarRecordatorio==='function')guardarRecordatorio(r);logAudit('Recordatorio editado',titulo);}
      else{const nuevo={id:(recordatorios.reduce((m,x)=>Math.max(m,x.id||0),0)+1),...datos,hecho:false,creadoPor:currentUser,creado:new Date().toISOString(),_nuevo:true};recordatorios.push(nuevo);if(typeof guardarRecordatorio==='function')guardarRecordatorio(nuevo);logAudit('Recordatorio creado',titulo);}
      closeMod();renderRecordatorios();actualizarBellRec();toast('✓ Recordatorio guardado',titulo);
      if(typeof _reRenderCliSiAbierto==='function')_reRenderCliSiAbierto(cliActual);
    });
  setTimeout(()=>{
    recTipoChange(curTipo);
    crearAutocomplete('rec-ref',
      (q)=>{
        const tipo=document.getElementById('rec-tipo')?.value||'tarea';const ql=q.toLowerCase();
        if(tipo==='cliente'||tipo==='contrasena')return clientes.filter(c=>(c.nombre||'').toLowerCase().includes(ql)||(c.razonSocial||'').toLowerCase().includes(ql)||(c.nit||'').toLowerCase().includes(ql)).slice(0,8).map(c=>({texto:c.nombre,sub:c.razonSocial&&c.razonSocial!==c.nombre?c.razonSocial:(c.nit||''),valor:c.id}));
        if(tipo==='factura')return documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.serie).filter(d=>((d.serie+'-'+d.numeroDte).toLowerCase().includes(ql)||(d.clienteComercial||d.clienteNombre||'').toLowerCase().includes(ql))).slice(0,8).map(d=>({texto:d.serie+'-'+d.numeroDte,sub:d.clienteComercial||d.clienteNombre||'',valor:d.id}));
        if(tipo==='producto')return productos.filter(p=>(p.codigo||'').toLowerCase().includes(ql)||(p.nombre||'').toLowerCase().includes(ql)).slice(0,8).map(p=>({texto:`${p.codigo} — ${p.nombre}`,sub:p.marca||'',valor:p.id}));
        if(tipo==='compra')return compras.filter(c=>('CMP-'+padn(c.id)).toLowerCase().includes(ql)||(c.proveedorNombre||'').toLowerCase().includes(ql)).slice(0,8).map(c=>({texto:'CMP-'+padn(c.id)+' · '+c.proveedorNombre,sub:money(c.total),valor:c.id}));
        return [];
      },
      (item)=>{ if(item){document.getElementById('rec-refid').value=item.valor;document.getElementById('rec-ref').value=item.texto;const rf=document.getElementById('rec-fact'),rfi=document.getElementById('rec-factid');if(rf)rf.value='';if(rfi)rfi.value='';} });
    crearAutocomplete('rec-fact',
      (q)=>{
        const cliId=Number(document.getElementById('rec-refid')?.value||0);const ql=q.toLowerCase();
        return documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.serie&&d.estado!=='anulada'&&(!cliId||d.clienteId===cliId)).filter(d=>((d.serie+'-'+d.numeroDte).toLowerCase().includes(ql)||String(d.numeroDte||'').includes(ql)||(d.clienteComercial||d.clienteNombre||'').toLowerCase().includes(ql))).slice(0,10).map(d=>({texto:d.serie+'-'+d.numeroDte,sub:(d.clienteComercial||d.clienteNombre||'')+' · '+money((d.totales&&d.totales.total)||0),valor:d.id}));
      },
      (item)=>{ if(item){document.getElementById('rec-factid').value=item.valor;document.getElementById('rec-fact').value=item.texto;} });
  },0);
}
window.openRecordatorio=openRecordatorio;
// Shortcut: crear un recordatorio ya rellenado con el documento (factura → tipo factura; otros → ligado al cliente)
window.recordatorioDesdeDoc=function(docId){
  const d=documentos.find(x=>x.id===docId);if(!d)return;
  const cli=d.clienteComercial||d.clienteNombre||'';
  if(d.tipoDoc==='cambiaria'&&d.serie){
    openRecordatorio(null,{tipo:'factura',refId:d.id,refLabel:d.serie+'-'+d.numeroDte+(cli?' · '+cli:'')});
  }else{
    openRecordatorio(null,{tipo:'cliente',refId:d.clienteId,refLabel:cli});
  }
};
window.toggleHechoRecordatorio=function(id){
  const r=recordatorios.find(x=>x.id===id);if(!r)return;
  r.hecho=!r.hecho;
  if(r.hecho){r.hechoPor=currentUser;r.hechoFecha=new Date().toISOString();}else{r.hechoPor='';r.hechoFecha=null;}
  if(typeof guardarRecordatorio==='function')guardarRecordatorio(r);
  logAudit('Recordatorio '+(r.hecho?'completado':'reabierto'),r.titulo);
  renderRecordatorios();actualizarBellRec();
  if(typeof _reRenderCliSiAbierto==='function')_reRenderCliSiAbierto(cliActual);
};
window.borrarRecordatorioUI=function(id){
  const r=recordatorios.find(x=>x.id===id);if(!r)return;
  confirmar('¿Borrar recordatorio?','Se eliminará "'+(_escRec(r.titulo))+'". Esta acción no se puede deshacer.','Borrar',()=>{
    recordatorios=recordatorios.filter(x=>x.id!==id);
    if(typeof borrarRecordatorio==='function')borrarRecordatorio(id);
    logAudit('Recordatorio eliminado',r.titulo);
    renderRecordatorios();actualizarBellRec();toast('Recordatorio eliminado');
    if(typeof _reRenderCliSiAbierto==='function')_reRenderCliSiAbierto(cliActual);
  });
};
// Campana de recordatorios (para todos los roles)
function actualizarBellRec(){
  const b=document.getElementById('bell-recmod');if(!b)return;
  const n=recordatoriosPendientesHoy().length;
  b.style.display=n>0?'flex':'none';
  const s=document.getElementById('bell-recmod-n');if(s)s.textContent=n;
}
window.actualizarBellRec=actualizarBellRec;
function mostrarRecordatoriosPopup(forzar){
  actualizarBellRec();
  const lista=recordatoriosPendientesHoy();
  if(!lista.length){if(forzar)toast('Sin recordatorios','No tenés recordatorios para hoy ni vencidos');return;}
  const hoy=fechaHoyGT();
  const body=$('#recmod-body');
  if(body)body.innerHTML=lista.map(r=>{
    const vencido=r.fechaVencimiento<hoy;
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid var(--line)">
      <input type="checkbox" onclick="toggleHechoRecordatorio(${r.id});this.closest('div').style.opacity=.4" style="width:16px;height:16px;margin-top:2px;cursor:pointer">
      <div style="flex:1"><div style="font-weight:600">${_escRec(r.titulo)}</div>${r.refLabel?`<div style="font-size:11.5px;color:var(--muted)">${_escRec(r.refLabel)}</div>`:''}${r.nota?`<div style="font-size:11.5px;color:var(--muted)">${_escRec(r.nota)}</div>`:''}<div style="font-size:11px;color:${vencido?'var(--danger)':'#9A6B07'};font-weight:700;margin-top:2px">${vencido?'Vencido · ':'Hoy · '}${fdate(r.fechaVencimiento)}</div></div>
    </div>`;
  }).join('');
  const ov=$('#recmod');if(ov)ov.classList.add('show');
}
window.mostrarRecordatoriosPopup=mostrarRecordatoriosPopup;

// ==================== COTIZACIONES ====================
let cotCart=[];         // items en edición
let cotEditId=null;     // id de la cotización que se edita (null = nueva)
let cotClienteSel=null; // cliente elegido en el editor
let cotFiltro='activas';
const COT_ESTADO={borrador:['Borrador','b-muted'],enviada:['Enviada','b-info'],aceptada:['Aceptada','b-ok'],rechazada:['Rechazada','b-danger'],convertida:['Convertida','b-warn']};
function cotEsc(s){return (typeof _escRec==='function')?_escRec(s):String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function cotTotal(c){return (c.totales&&c.totales.total)||0;}
function cotVisibles(){
  if(typeof esVentas==='function'&&esVentas())return cotizaciones.filter(c=>c.creadoPor===currentUser||(typeof miVendedorId==='function'&&c.vendedorId===miVendedorId()));
  return cotizaciones.slice();
}
function setCotFiltro(f){cotFiltro=f;document.querySelectorAll('#cot-tabs .ct-tab').forEach(b=>b.classList.toggle('on',b.dataset.f===f));renderCotizaciones();}
window.setCotFiltro=setCotFiltro;
function renderCotizaciones(){
  const listBox=document.getElementById('cot-list'),edBox=document.getElementById('cot-editor');
  if(listBox)listBox.style.display='';if(edBox)edBox.style.display='none';
  const base=cotVisibles().slice().sort((a,b)=>(b.numero||0)-(a.numero||0));
  let lista=base;
  if(cotFiltro==='activas')lista=base.filter(c=>['borrador','enviada'].includes(c.estado));
  else if(cotFiltro==='aceptada')lista=base.filter(c=>c.estado==='aceptada');
  else if(cotFiltro==='convertida')lista=base.filter(c=>c.estado==='convertida');
  const kpis=document.getElementById('cot-kpis');
  if(kpis&&typeof kpiHTML==='function'){
    const nAct=base.filter(c=>['borrador','enviada'].includes(c.estado)).length;
    const nAcc=base.filter(c=>c.estado==='aceptada').length;
    const montoVig=base.filter(c=>['borrador','enviada','aceptada'].includes(c.estado)).reduce((s,c)=>s+cotTotal(c),0);
    kpis.innerHTML=kpiHTML([
      {ic:'i-warn',svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',lbl:'Activas',val:nAct},
      {ic:'i-ok',svg:'<path d="M20 6 9 17l-5-5"/>',lbl:'Aceptadas',val:nAcc},
      {ic:'i-blue',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Monto vigente',val:money(montoVig)}
    ]);
  }
  const tb=document.getElementById('t-cotizaciones');if(!tb)return;
  tb.innerHTML=lista.length?lista.map(c=>{
    const [en,ec]=COT_ESTADO[c.estado]||['—','b-muted'];
    const vencida=c.fechaVence&&c.estado!=='convertida'&&String(c.fechaVence)<fechaHoyGT();
    return `<tr>
      <td style="font-weight:600">COT-${padn(c.numero)}</td>
      <td>${cotEsc(c.clienteComercial||c.clienteNombre||'—')}</td>
      <td style="color:var(--muted)">${c.creada?fdate(String(c.creada).slice(0,10)):'—'}</td>
      <td style="color:${vencida?'var(--danger)':'var(--muted)'}">${c.fechaVence?fdate(c.fechaVence):'—'}${vencida?' · vencida':''}</td>
      <td class="num" style="font-weight:700">${money(cotTotal(c))}</td>
      <td><span class="badge ${ec}">${en}</span></td>
      <td><div class="acts">
        <button class="btn btn-ghost btn-sm" onclick="cotizacionPDF(${c.id})" title="Ver PDF">PDF</button>
        <button class="btn btn-ghost btn-sm" onclick="cotizacionExcel(${c.id})" title="Exportar a Excel">Excel</button>
        <button class="btn btn-ghost btn-sm" onclick="editarCotizacion(${c.id})">Editar</button>
        ${c.estado!=='convertida'?`<button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="convertirCotizacionAPedido(${c.id})" title="Convertir a pedido">→ Pedido</button>`:''}
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="borrarCotizacionUI(${c.id})">✕</button>
      </div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="7" class="empty">Sin cotizaciones ${cotFiltro==='todas'?'':'en esta vista'}</td></tr>`;
}
window.renderCotizaciones=renderCotizaciones;
function cotInfoCliente(){
  const box=document.getElementById('cot-cli-info');if(!box)return;
  box.textContent=cotClienteSel?(((cotClienteSel.razonSocial&&cotClienteSel.razonSocial!==cotClienteSel.nombre)?cotClienteSel.razonSocial+' · ':'')+(cotClienteSel.nit?'NIT '+cotClienteSel.nit:'')):'';
}
function cotWireAutocomplete(){
  if(typeof crearAutocomplete!=='function')return;
  crearAutocomplete('cot-cli-search',
    (q)=>{const ql=q.toLowerCase();let base=(typeof esVentas==='function'&&esVentas())?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;
      return base.filter(c=>(c.nombre||'').toLowerCase().includes(ql)||(c.razonSocial||'').toLowerCase().includes(ql)||(c.nit||'').toLowerCase().includes(ql)).slice(0,8).map(c=>({texto:`${c.nombre} · ${c.nit||''}`,sub:c.razonSocial&&c.razonSocial!==c.nombre?c.razonSocial:'',valor:c.id}));},
    (item)=>{cotClienteSel=item?clientes.find(c=>c.id===item.valor):null;const n=document.getElementById('cot-cli-nit');if(n&&cotClienteSel)n.value='';if(cotClienteSel){const t=document.getElementById('cot-cli-tel');if(t)t.value=cotClienteSel.telefono||'';const m=document.getElementById('cot-cli-mail');if(m)m.value=cotClienteSel.correo||'';}cotInfoCliente();});
  crearAutocomplete('cot-add',
    (q)=>{const ql=q.toLowerCase();
      return productos.filter(p=>p.activo!==false).filter(p=>(p.codigo||'').toLowerCase().includes(ql)||(p.nombre||'').toLowerCase().includes(ql)||(p.skuProveedor||'').toLowerCase().includes(ql)).slice(0,8).map(p=>({texto:`${p.codigo} — ${p.nombre}`,sub:p.marca||'',valor:p.id}));},
    (item)=>{if(item){cotAddProducto(item.valor);const el=document.getElementById('cot-add');if(el)el.value='';}});
}
function abrirCotEditor(titulo){
  const listBox=document.getElementById('cot-list'),edBox=document.getElementById('cot-editor');
  if(listBox)listBox.style.display='none';if(edBox)edBox.style.display='';
  const t=document.getElementById('cot-ed-title');if(t)t.textContent=titulo;
  const cs=document.getElementById('cot-cli-search');if(cs)cs.value=cotClienteSel?`${cotClienteSel.nombre} · ${cotClienteSel.nit||''}`:'';
  cotInfoCliente();cotRenderCart();
  setTimeout(cotWireAutocomplete,0);
}
function nuevaCotizacion(){
  cotEditId=null;cotCart=[];cotClienteSel=null;
  abrirCotEditor('Nueva cotización');
  setTimeout(()=>{const v=document.getElementById('cot-validez');if(v)v.value=15;const e=document.getElementById('cot-estado');if(e)e.value='borrador';const o=document.getElementById('cot-obs');if(o)o.value='';const n=document.getElementById('cot-cli-nit');if(n)n.value='';const vn=document.getElementById('cot-vend-nom');if(vn)vn.value=(typeof usuarios!=='undefined'&&(usuarios.find(u=>u.correo===currentUser)||{}).nombre)||'';const vt=document.getElementById('cot-vend-tel');if(vt)vt.value='';const vmail=document.getElementById('cot-vend-mail');if(vmail)vmail.value='';const cc=document.getElementById('cot-cli-contacto');if(cc)cc.value='';const ct=document.getElementById('cot-cli-tel');if(ct)ct.value='';const cm=document.getElementById('cot-cli-mail');if(cm)cm.value='';},0);
}
window.nuevaCotizacion=nuevaCotizacion;
function editarCotizacion(id){
  const c=cotizaciones.find(x=>x.id===id);if(!c)return;
  cotEditId=id;cotCart=(c.items||[]).map(it=>({...it}));cotClienteSel=clientes.find(x=>x.id===c.clienteId)||null;
  abrirCotEditor('Editar COT-'+padn(c.numero));
  setTimeout(()=>{const v=document.getElementById('cot-validez');if(v)v.value=c.validezDias||15;const e=document.getElementById('cot-estado');if(e)e.value=(c.estado==='convertida'?'aceptada':c.estado)||'borrador';const o=document.getElementById('cot-obs');if(o)o.value=c.observaciones||'';const n=document.getElementById('cot-cli-nit');if(!cotClienteSel){const s=document.getElementById('cot-cli-search');if(s)s.value=c.clienteComercial||c.clienteNombre||'';if(n)n.value=c.clienteNit||'';}else if(n){n.value='';}const vn=document.getElementById('cot-vend-nom');if(vn)vn.value=c.vendedorNombre||'';const vt=document.getElementById('cot-vend-tel');if(vt)vt.value=c.vendedorTel||'';const vmail=document.getElementById('cot-vend-mail');if(vmail)vmail.value=c.vendedorEmail||'';const cc=document.getElementById('cot-cli-contacto');if(cc)cc.value=c.clienteContacto||'';const ct=document.getElementById('cot-cli-tel');if(ct)ct.value=c.clienteTel||'';const cm=document.getElementById('cot-cli-mail');if(cm)cm.value=c.clienteEmail||'';},0);
}
window.editarCotizacion=editarCotizacion;
function cerrarCotEditor(){cotEditId=null;renderCotizaciones();}
window.cerrarCotEditor=cerrarCotEditor;
function cotAddProducto(pid){
  const p=productos.find(x=>x.id===pid);if(!p)return;
  const ex=cotCart.find(it=>it.id===pid);
  if(ex){ex.cantidad++;}
  else{
    let precio=Number(p.precio)||0;
    if(cotClienteSel&&typeof precioCliente==='function'){try{const pc=precioCliente(cotClienteSel,p);if(pc>0)precio=pc;}catch(e){}}
    // El precio que se usa es el de CAJA, así que el modo debe ser 'caja' para
    // los productos por caja; si no, al pasar a pedido se reserva mal el stock
    // (rebajaba 1 unidad en vez de 1 caja).
    const modoVenta=(p.tipoEmpaque==='caja'||p.tipoEmpaque==='caja_unidad')?'caja':'unidad';
    cotCart.push({id:p.id,codigo:p.codigo,nombre:p.nombre,precioBase:precio,precio:precio,cantidad:1,descuento:0,unidad:p.unidad,modoVenta,tipoEmpaque:p.tipoEmpaque||'unidad',unidadesPorCaja:p.unidadesPorCaja});
  }
  cotRenderCart();
}
window.cotAddProducto=cotAddProducto;
function cotCalcTotal(){return cotCart.reduce((s,it)=>s+Number(it.precio)*(1-(Number(it.descuento)||0)/100)*Number(it.cantidad),0);}
function cotRenderCart(){
  const tb=document.getElementById('cot-cart');if(!tb)return;
  let total=0;
  tb.innerHTML=cotCart.length?cotCart.map((it,i)=>{
    const eff=Number(it.precio)*(1-(Number(it.descuento)||0)/100);
    const sub=eff*Number(it.cantidad);total+=sub;
    return `<tr>
      <td style="font-weight:600">${cotEsc(it.nombre)}<div style="font-size:11px;color:var(--muted)">${cotEsc(it.codigo||'')}</div></td>
      <td class="num"><input type="number" min="0" step="1" value="${it.cantidad}" style="width:70px;text-align:right" onchange="cotSet(${i},'cantidad',this.value)"></td>
      <td class="num"><input type="number" min="0" step="0.01" value="${Number(it.precio).toFixed(2)}" style="width:92px;text-align:right" onchange="cotSet(${i},'precio',this.value)"></td>
      <td class="num"><input type="number" min="0" max="100" step="1" value="${it.descuento||0}" style="width:64px;text-align:right" onchange="cotSet(${i},'descuento',this.value)"></td>
      <td class="num" style="font-weight:700">${money(sub)}</td>
      <td><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="cotRemove(${i})">✕</button></td>
    </tr>`;
  }).join(''):`<tr><td colspan="6" class="empty">Agregá productos al presupuesto…</td></tr>`;
  const tot=document.getElementById('cot-total');if(tot)tot.textContent=money(total);
}
function cotSet(i,campo,val){
  if(!cotCart[i])return;let n=Number(val);if(isNaN(n))n=0;
  if(campo==='cantidad'){n=Math.max(0,Math.round(n));if(n===0){cotCart.splice(i,1);cotRenderCart();return;}cotCart[i].cantidad=n;}
  else if(campo==='precio'){cotCart[i].precio=Math.max(0,n);}
  else if(campo==='descuento'){cotCart[i].descuento=Math.min(100,Math.max(0,n));}
  cotRenderCart();
}
window.cotSet=cotSet;
function cotRemove(i){cotCart.splice(i,1);cotRenderCart();}
window.cotRemove=cotRemove;
async function guardarCotizacionUI(){
  if(!cotCart.length){toast('Agregá productos','La cotización no tiene productos',true);return;}
  const txt=((document.getElementById('cot-cli-search')||{}).value||'').trim();
  let cliObj=cotClienteSel;
  if(cliObj){const disp=`${cliObj.nombre} · ${cliObj.nit||''}`.trim();if(txt&&txt!==disp)cliObj=null;}
  if(!cliObj&&!txt){toast('Falta el cliente','Elegí un cliente o escribí el nombre de uno nuevo',true);return;}
  let clienteId,clienteNombre,clienteComercial,clienteNit,vend;
  if(cliObj){
    clienteId=cliObj.id;clienteNombre=cliObj.razonSocial||cliObj.nombre;clienteComercial=cliObj.nombre;clienteNit=cliObj.nit;
    vend=vendedores.find(v=>v.id===cliObj.vendedorId)||null;
  }else{
    clienteId=null;clienteNombre=txt;clienteComercial=txt;clienteNit=((document.getElementById('cot-cli-nit')||{}).value||'').trim();vend=null;
  }
  const vendNom=((document.getElementById('cot-vend-nom')||{}).value||'').trim();
  const vendTel=((document.getElementById('cot-vend-tel')||{}).value||'').trim();
  const vendMail=((document.getElementById('cot-vend-mail')||{}).value||'').trim();
  const clienteContacto=((document.getElementById('cot-cli-contacto')||{}).value||'').trim();
  const clienteTel=((document.getElementById('cot-cli-tel')||{}).value||'').trim();
  const clienteEmail=((document.getElementById('cot-cli-mail')||{}).value||'').trim();
  const validez=Math.max(1,parseInt((document.getElementById('cot-validez')||{}).value)||15);
  const estado=(document.getElementById('cot-estado')||{}).value||'borrador';
  const obs=((document.getElementById('cot-obs')||{}).value||'').trim();
  const total=cotCalcTotal();
  const hoy=fechaHoyGT();
  const fechaVence=(()=>{const d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()+validez);return d.toISOString().slice(0,10);})();
  let cot;
  if(cotEditId){
    cot=cotizaciones.find(c=>c.id===cotEditId);if(!cot){toast('No encontrada',null,true);return;}
    Object.assign(cot,{clienteId,clienteNombre,clienteComercial,clienteNit,clienteContacto,clienteTel,clienteEmail,vendedorId:vend?vend.id:null,vendedorNombre:vendNom,vendedorTel:vendTel,vendedorEmail:vendMail,items:cotCart.map(it=>({...it})),totales:{total},observaciones:obs,validezDias:validez,fechaVence,estado});
  }else{
    cot={id:-Date.now(),numero:cotN,clienteId,clienteNombre,clienteComercial,clienteNit,clienteContacto,clienteTel,clienteEmail,vendedorId:vend?vend.id:null,vendedorNombre:vendNom,vendedorTel:vendTel,vendedorEmail:vendMail,items:cotCart.map(it=>({...it})),totales:{total},observaciones:obs,validezDias:validez,fechaVence,estado,creadoPor:currentUser,creada:new Date().toISOString(),convertidoPedidoId:null,_nuevo:true};
    cotizaciones.push(cot);cotN++;
  }
  const ok=(typeof guardarCotizacion==='function')?await guardarCotizacion(cot):true;
  logAudit(cotEditId?'Cotización editada':'Cotización creada','COT-'+padn(cot.numero)+' · '+(cot.clienteComercial||cot.clienteNombre)+' · '+money(total));
  if(ok===false)toast('⚠ Guardada solo en pantalla','No se pudo confirmar con la base. Revisá conexión.',true);
  else toast('✓ Cotización guardada','COT-'+padn(cot.numero));
  cotEditId=null;renderCotizaciones();
}
window.guardarCotizacionUI=guardarCotizacionUI;
function borrarCotizacionUI(id){
  const c=cotizaciones.find(x=>x.id===id);if(!c)return;
  confirmar('Borrar cotización','¿Seguro que querés borrar <b>COT-'+padn(c.numero)+'</b>? Esta acción no se puede deshacer.','Borrar',()=>{
    cotizaciones=cotizaciones.filter(x=>x.id!==id);
    if(typeof borrarCotizacion==='function')borrarCotizacion(id);
    logAudit('Cotización borrada','COT-'+padn(c.numero));
    renderCotizaciones();toast('Cotización borrada');
  });
}
window.borrarCotizacionUI=borrarCotizacionUI;
function convertirCotizacionAPedido(id){
  const c=cotizaciones.find(x=>x.id===id);if(!c)return;
  if(!(c.items||[]).length){toast('Sin productos',null,true);return;}
  if(c.estado==='convertida'){toast('Ya convertida','Esta cotización ya se convirtió en pedido',true);return;}
  if(!c.clienteId){toast('Cliente no registrado','Esta cotización es para un cliente nuevo (prospecto). Creá el cliente en el sistema y reasignálo en la cotización antes de convertirla en pedido.',true);return;}
  confirmar('Convertir a pedido','Se creará un pedido abierto con los productos de <b>COT-'+padn(c.numero)+'</b>, reservando inventario. ¿Continuar?','Convertir a pedido',async()=>{
    const cli=clientes.find(x=>x.id===c.clienteId);
    const vend=vendedores.find(v=>v.id===(c.vendedorId||(cli&&cli.vendedorId)))||vendedores[0];
    const items=(c.items||[]).map(it=>{
      const eff=Math.round(Number(it.precio)*(1-(Number(it.descuento)||0)/100)*100)/100;
      // El modo se deriva del producto real: la cotización usa el precio de caja,
      // así que un producto por caja se reserva como caja (no como unidad).
      const _p=productos.find(x=>x.id===it.id);
      const _te=(_p&&_p.tipoEmpaque)||it.tipoEmpaque||'unidad';
      const _modo=(_te==='caja'||_te==='caja_unidad')?'caja':(it.modoVenta||'unidad');
      return {id:it.id,codigo:it.codigo,nombre:it.nombre,precio:eff,unidad:it.unidad,cantidad:Number(it.cantidad),descuento:0,modoVenta:_modo,tipoEmpaque:_te,unidadesPorCaja:(_p&&_p.unidadesPorCaja)||it.unidadesPorCaja};
    });
    const total=items.reduce((s,it)=>s+it.precio*it.cantidad,0);
    const doc={id:-Date.now(),numero:corr,tipoDoc:'pedido',clienteId:c.clienteId,clienteNombre:c.clienteNombre,clienteComercial:c.clienteComercial,clienteNit:c.clienteNit,vendedorId:vend?vend.id:null,vendedorNombre:vend?vend.nombre:'',subVendedorNombre:null,items,totales:{total},estado:'abierto',inventarioRebajado:true,creada:new Date().toISOString(),ordenCompra:'',observaciones:'Generado desde COT-'+padn(c.numero),notaInterna:'',nitFacturado:(cli&&cli.nit)||c.clienteNit,nombreFacturado:(cli&&cli.nombre)||c.clienteComercial,_nuevo:true};
    items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p&&typeof aplicarStock==='function')aplicarStock(p,-it.cantidad,it.modoVenta);});
    documentos.push(doc);corr++;
    if(typeof guardarDocumento==='function')await guardarDocumento(doc);
    c.estado='convertida';c.convertidoPedidoId=doc.id;
    if(typeof guardarCotizacion==='function')await guardarCotizacion(c);
    logAudit('Cotización convertida','COT-'+padn(c.numero)+' → PED-'+padn(doc.numero));
    renderCotizaciones();
    toast('✓ Convertida a pedido','PED-'+padn(doc.numero)+' · inventario reservado');
  });
}
window.convertirCotizacionAPedido=convertirCotizacionAPedido;
function cotizacionPDF(id){
  const c=cotizaciones.find(x=>x.id===id);if(!c){toast('No encontrada',null,true);return;}
  if(typeof _pdfShell!=='function'||typeof _abrirPDF!=='function'){toast('PDF no disponible',null,true);return;}
  const cli=clientes.find(x=>x.id===c.clienteId);
  const fecha=c.creada?fdate(String(c.creada).slice(0,10)):fdate(fechaHoyGT());
  const rows=(c.items||[]).map(it=>{
    const eff=Number(it.precio)*(1-(Number(it.descuento)||0)/100);const sub=eff*Number(it.cantidad);
    return `<tr>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE">${cotEsc(it.codigo||'')}</td>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE">${cotEsc(it.nombre)}</td>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE;text-align:right">${it.cantidad}</td>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE;text-align:right">${money(it.precio)}</td>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE;text-align:right">${(Number(it.descuento)||0)>0?it.descuento+'%':'—'}</td>
      <td style="padding:5px 4px;border-bottom:1px solid #EEE;text-align:right">${money(sub)}</td>
    </tr>`;
  }).join('');
  const total=cotTotal(c);
  const body=`
    <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:12px">
      <div style="font-size:12px;line-height:1.55">
        <div style="font-weight:700;font-size:12.5px;color:#173916">CLIENTE</div>
        ${cotEsc(c.clienteComercial||c.clienteNombre||'')}<br>
        ${c.clienteNit?'NIT: '+cotEsc(c.clienteNit)+'<br>':''}
        ${c.clienteContacto?'Contacto: '+cotEsc(c.clienteContacto)+'<br>':''}
        ${c.clienteTel?'☎ '+cotEsc(c.clienteTel)+'<br>':''}
        ${c.clienteEmail?'✉ '+cotEsc(c.clienteEmail)+'<br>':''}
        ${cli&&cli.direccion?cotEsc(cli.direccion):''}
      </div>
      <div style="font-size:12px;line-height:1.55;text-align:right">
        <div><b>Cotización:</b> COT-${padn(c.numero)}</div>
        <div><b>Fecha:</b> ${fecha}</div>
        <div><b>Válida hasta:</b> ${c.fechaVence?fdate(c.fechaVence):'—'}</div>
        ${c.vendedorNombre?'<div style="margin-top:4px"><b>Atiende:</b> '+cotEsc(c.vendedorNombre)+'</div>':''}
        ${c.vendedorTel?'<div>☎ '+cotEsc(c.vendedorTel)+'</div>':''}
        ${c.vendedorEmail?'<div>✉ '+cotEsc(c.vendedorEmail)+'</div>':''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F4F8F3">
        <th style="text-align:left;padding:6px 4px;border-bottom:2px solid #173916">Código</th>
        <th style="text-align:left;padding:6px 4px;border-bottom:2px solid #173916">Descripción</th>
        <th style="text-align:right;padding:6px 4px;border-bottom:2px solid #173916">Cant.</th>
        <th style="text-align:right;padding:6px 4px;border-bottom:2px solid #173916">Precio</th>
        <th style="text-align:right;padding:6px 4px;border-bottom:2px solid #173916">Desc.</th>
        <th style="text-align:right;padding:6px 4px;border-bottom:2px solid #173916">Subtotal</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right;font-weight:700;padding:8px 4px;border-top:2px solid #173916">TOTAL (IVA incluido)</td><td style="text-align:right;font-weight:700;padding:8px 4px;border-top:2px solid #173916">${money(total)}</td></tr></tfoot>
    </table>
    ${c.observaciones?`<div style="margin-top:12px;font-size:11.5px;color:#555"><b>Observaciones:</b> ${cotEsc(c.observaciones)}</div>`:''}
    <div style="margin-top:14px;font-size:10.5px;color:#888">Precios en quetzales, IVA incluido. Cotización válida por ${c.validezDias||15} días a partir de su emisión. Sujeta a existencias.</div>
  `;
  _abrirPDF(_pdfShell({titulo:'COTIZACIÓN',subtitulo:c.clienteComercial||c.clienteNombre||'',orientacion:'portrait',body}));
}
window.cotizacionPDF=cotizacionPDF;
async function cotizacionExcel(id){
  const c=cotizaciones.find(x=>x.id===id);if(!c){toast('No encontrada',null,true);return;}
  try{
    const {XLSX,styled:_styled}=await _cargarXLSX();
    const fecha=c.creada?fdate(String(c.creada).slice(0,10)):fdate(fechaHoyGT());
    const meta=[
      ['SEFE, S.A.'],
      ['Cotización:','COT-'+padn(c.numero)],
      ['Cliente:',c.clienteComercial||c.clienteNombre||''],
      ['NIT:',c.clienteNit||''],
      ['Contacto cliente:',c.clienteContacto||''],
      ['Tel. cliente:',c.clienteTel||''],
      ['Correo cliente:',c.clienteEmail||''],
      ['Fecha:',fecha],
      ['Válida hasta:',c.fechaVence?fdate(c.fechaVence):''],
      ['Atiende:',c.vendedorNombre||''],
      ['Tel. vendedor:',c.vendedorTel||''],
      ['Correo vendedor:',c.vendedorEmail||''],
      []
    ];
    const ws=XLSX.utils.aoa_to_sheet(meta);
    const filas=(c.items||[]).map(it=>{
      const eff=Number(it.precio)*(1-(Number(it.descuento)||0)/100);
      return {'Código':it.codigo||'','Descripción':it.nombre||'','Cantidad':Number(it.cantidad),'Precio unit.':Number(it.precio),'Desc %':Number(it.descuento)||0,'Subtotal':Math.round(eff*Number(it.cantidad)*100)/100};
    });
    const HDR=13; // fila 0-index del encabezado de la tabla (tras el membrete)
    XLSX.utils.sheet_add_json(ws,filas,{origin:'A'+(HDR+1)});
    const totalRow=HDR+1+filas.length;
    XLSX.utils.sheet_add_aoa(ws,[['','','','','TOTAL (IVA incl.)',cotTotal(c)]],{origin:{r:totalRow,c:0}});
    // Formato estándar: membrete, encabezado verde, Q en precio/subtotal, totales, anchos.
    _estiloExcelHoja(XLSX,ws,{styled:_styled,headerRow:HDR,nCols:6,dataRows:filas.length,moneyCols:[3,5],totalRow,brandRow:0,metaRows:[1,2,3,4,5,6,7,8,9,10,11]});
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'COT-'+padn(c.numero));
    XLSX.writeFile(wb,`SEFE_cotizacion_COT-${padn(c.numero)}.xlsx`);
    toast('✓ Excel descargado','SEFE_cotizacion_COT-'+padn(c.numero)+'.xlsx');
  }catch(e){console.error('Error exportando cotización a Excel:',e);toast('No se pudo generar el Excel',e.message||String(e),true);}
}
window.cotizacionExcel=cotizacionExcel;
// ==================== FIN COTIZACIONES ====================
window.cerrarRecmod=function(){const ov=$('#recmod');if(ov)ov.classList.remove('show');};
// ---- Recordatorios de cobro: pop-up en la pantalla principal ----
// Solo los ve el admin y el rol de cobros/contabilidad. Muestra los
// "próximo seguimiento" cuya fecha es HOY y que aún no se atendieron.
let _recDismissed=false;
function puedeVerRecordatorios(){return currentRole==='admin'||['cobros','contabilidad'].includes(currentRole);}
function sumarDiasFecha(fechaStr,n){const p=String(fechaStr||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!p)return fechaStr;const dt=new Date(+p[1],+p[2]-1,+p[3]+n);const z=x=>String(x).padStart(2,'0');return dt.getFullYear()+'-'+z(dt.getMonth()+1)+'-'+z(dt.getDate());}
function recordatoriosDeHoy(){
  const hoy=fechaHoyGT();const out=[];
  clientes.forEach(c=>{(c.seguimientos||[]).forEach(s=>{if(s.proximaFecha===hoy&&!s.hecho)out.push({cliente:c,seg:s});});});
  return out;
}
function actualizarBellRecordatorios(){
  const bell=document.getElementById('bell-rec');if(!bell)return;
  const n=puedeVerRecordatorios()?recordatoriosDeHoy().length:0;
  if(n>0){bell.style.display='inline-flex';const s=document.getElementById('bell-rec-n');if(s)s.textContent=n;}
  else bell.style.display='none';
}
window.actualizarBellRecordatorios=actualizarBellRecordatorios;
function mostrarRecordatoriosHoy(forzar){
  actualizarBellRecordatorios();
  if(!puedeVerRecordatorios())return;
  const lista=recordatoriosDeHoy();
  if(!lista.length){$('#ov-rec')?.classList.remove('show');return;}
  if(!forzar&&_recDismissed)return;
  const body=$('#rec-body');if(!body)return;
  body.innerHTML=lista.map(({cliente,seg})=>{
    const r=RESULT_SEG[seg.resultado]||['—','b-muted'];
    const tel=cliente.contactoPagos&&cliente.contactoPagos.telefono?cliente.contactoPagos.telefono:'';
    const cont=cliente.contactoPagos&&cliente.contactoPagos.nombre?cliente.contactoPagos.nombre:'';
    return `<div style="border:1px solid var(--line);border-radius:10px;padding:12px 13px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="font-family:var(--disp);font-weight:700;font-size:15px">${escHtml(cliente.nombre)}</div>
        <span class="badge ${r[1]}">${r[0]}</span>
      </div>
      ${seg.nota?`<div style="font-size:13px;color:var(--muted);margin-top:5px">${escHtml(seg.nota)}</div>`:''}
      ${tel?`<div style="font-size:12.5px;color:var(--muted-2);margin-top:4px">☎ ${escHtml(tel)}${cont?' · '+escHtml(cont):''}</div>`:''}
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="abrirClienteDesdeRec(${cliente.id})">Abrir cliente</button>
        <button class="btn btn-ghost btn-sm" onclick="posponerRecordatorio(${cliente.id},${seg.id})">Posponer a mañana</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--ok)" onclick="marcarRecordatorioHecho(${cliente.id},${seg.id})">✓ Hecho</button>
      </div>
    </div>`;
  }).join('');
  $('#ov-rec').classList.add('show');
}
window.mostrarRecordatoriosHoy=mostrarRecordatoriosHoy;
function cerrarRecordatorios(){_recDismissed=true;$('#ov-rec')?.classList.remove('show');}
window.cerrarRecordatorios=cerrarRecordatorios;
function _segDe(cliId,segId){const c=clientes.find(x=>x.id===cliId);if(!c)return null;const s=(c.seguimientos||[]).find(x=>x.id===segId);return s?{c,s}:null;}
function _refrescarRec(){const l=recordatoriosDeHoy();actualizarBellRecordatorios();if($('#ov-rec')?.classList.contains('show')){if(!l.length)$('#ov-rec').classList.remove('show');else mostrarRecordatoriosHoy(true);}}
function _reRenderCliSiAbierto(cliId){if(cliActual===cliId&&$('#v-clientedet')?.classList.contains('active'))renderCliDet();}
function marcarRecordatorioHecho(cliId,segId){
  const r=_segDe(cliId,segId);if(!r)return;
  r.s.hecho=true;r.s.hechoPor=currentUser;r.s.hechoEl=new Date().toISOString();
  if(typeof guardarCliente==='function')guardarCliente(r.c);
  toast('✓ Recordatorio atendido',r.c.nombre);
  _reRenderCliSiAbierto(cliId);_refrescarRec();
}
window.marcarRecordatorioHecho=marcarRecordatorioHecho;
function posponerRecordatorio(cliId,segId){
  const r=_segDe(cliId,segId);if(!r)return;
  r.s.proximaFecha=sumarDiasFecha(r.s.proximaFecha||fechaHoyGT(),1);
  if(typeof guardarCliente==='function')guardarCliente(r.c);
  toast('Recordatorio pospuesto para mañana',r.c.nombre);
  _reRenderCliSiAbierto(cliId);_refrescarRec();
}
window.posponerRecordatorio=posponerRecordatorio;
function abrirClienteDesdeRec(cliId){_recDismissed=true;$('#ov-rec')?.classList.remove('show');abrirCliente(cliId);setTimeout(()=>cliSetTab('seguimiento'),40);}
window.abrirClienteDesdeRec=abrirClienteDesdeRec;
function renderCliDet(){
  const c=clientes.find(x=>x.id===cliActual);if(!c)return;
  // Si es un cliente PRINCIPAL (paraguas) con sedes, mostrar vista consolidada del grupo
  if(esPrincipal(c)){ renderGrupoConsolidado(c); return; }
  const st=clienteStats(c);
  const facturas=st.facturas;
  const prestamos=documentos.filter(d=>d.clienteId===c.id&&d.tipoDoc==='prestamo');
  const tabBtn=(t,l)=>`<button class="ct-tab ${cliTab===t?'on':''}" onclick="cliSetTab('${t}')">${l}</button>`;
  let body='';
  if(cliTab==='precios'){
    const esAdmin=currentRole==="admin";
    const ids=Object.keys(c.precios||{}).map(Number).filter(id=>productos.find(p=>p.id===id));
    const opts=productos.filter(p=>!(c.precios&&c.precios[p.id]!=null)).map(p=>`<option value="${p.codigo} — ${p.nombre}">`).join('');
    const rows=ids.length?ids.map(pid=>{
      const p=productos.find(x=>x.id===pid);
      const precioCli=Number(c.precios[pid])||0;
      const base=Number(p.precio)||0;
      const costo=Number(p.costo)||0;
      // Descuento: cuánto menos paga el cliente vs el precio base (en %)
      const desc=base>0?((precioCli-base)/base*100):0;
      const descTxt=desc<-0.05?`<span style="color:var(--ok)">${desc.toFixed(1)}%</span>`:(desc>0.05?`<span style="color:var(--warn)">+${desc.toFixed(1)}%</span>`:'<span style="color:var(--muted-2)">—</span>');
      // Margen: ganancia sobre el precio de venta al cliente (en %), solo admin
      const margen=precioCli>0?((precioCli-costo)/precioCli*100):0;
      const margenColor=margen<0?'var(--danger)':(margen<15?'var(--warn)':'var(--ok)');
      const margenVal=costo>0?margen.toFixed(1)+'%':'<span style="color:var(--muted-2)">—</span>';
      const margenTd=esAdmin?`<td class="num" style="color:${margenColor};font-weight:600">${margenVal}</td>`:'';
      return `<tr><td style="font-weight:600">${p.nombre}<div style="font-size:10.5px;color:var(--muted)">${p.codigo}</div></td>
      <td class="num" style="color:var(--muted)">${money(base)}</td>
      <td><input type="number" step="0.01" class="num" style="max-width:120px;padding:7px 9px" value="${c.precios[pid]}" oninput="setPrecioCli(${pid},this.value)"></td>
      <td class="num">${descTxt}</td>
      ${margenTd}
      <td><button class="x" onclick="quitarPrecio(${pid})">×</button></td></tr>`;
    }).join(''):`<tr><td colspan="${esAdmin?6:5}" class="empty">Este cliente aún no tiene precios asignados. Agregá los productos que compra.</td></tr>`;
    body=`<div class="panel">
      <div class="panel-head"><h3>Precios específicos</h3><span style="font-size:12px;color:var(--muted)">${ids.length} producto(s) asignado(s)${ids.length?' · <span id="cli-prom-desc">'+_promDescLabel(_promDescCli(c))+'</span>':''}</span></div>
      <div class="panel-body" style="padding-bottom:8px">
        <div style="display:flex;gap:9px;align-items:flex-end">
          <div style="flex:1"><label>Agregar producto</label><input id="cp-add" list="cp-prods" placeholder="Buscar por código o nombre…" onkeydown="if(event.key==='Enter')addPrecioProd()"><datalist id="cp-prods">${opts}</datalist></div>
          <button class="btn btn-ghost" onclick="addPrecioProd()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar</button>
          <button class="btn btn-ghost" id="btn-guardar-precios-cli" onclick="guardarPreciosCli()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Guardar precios</button>
        </div>
      </div>
      <table><thead><tr><th>Producto</th><th>Precio base</th><th>Precio cliente</th><th>Descuento</th>${esAdmin?'<th>Margen</th>':''}<th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }else if(cliTab==='facturas'){
    body=`<div class="panel"><div class="panel-head"><h3>Facturas Cambiarias emitidas</h3></div>
      <table><thead><tr><th>No.</th><th>Tipo</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
      ${facturas.length?facturas.slice().reverse().map(f=>`<tr><td style="font-weight:600">${f.serie}-${f.numeroDte}</td><td><span class="pill ${(TIPO_LBL[f.tipoDoc]||["","p-ped"])[1]}">${(TIPO_LBL[f.tipoDoc]||["Documento"])[0]}</span></td><td style="color:var(--muted)">${fdate(f.creada)}</td><td class="num" style="font-weight:600">${money(f.totales.total)}</td><td><span class="badge b-ok">${f.estado}</span></td><td><button class="btn btn-ghost btn-sm" onclick="verDoc(${f.id})">Ver</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Sin Facturas Cambiarias emitidas</td></tr>'}
      </tbody></table></div>`;
  }else if(cliTab==='factabonos'){
    // Estado de cuenta ordenado por EMISIÓN DE FACTURA: cada factura y,
    // debajo, los abonos que se le aplicaron.
    //
    // Es distinto de la tabla de Movimientos de arriba, que mezcla todo
    // por fecha. Éste sirve para cobrar: de un vistazo se ve qué se le
    // abonó a cada factura, sin tener que cruzar el diario.
    //
    // `facturas` ya viene de clienteStats ordenado de la más vieja a la
    // más nueva, que es justo lo que se pidió.
    const filas=facturas.map(f=>{
      const info=arInfo(f);
      // Todo lo que se aplica CONTRA la factura, junto y en orden: los
      // abonos y las notas de crédito.
      //
      // Las notas de crédito tienen que estar: reducen la factura igual
      // que un abono (así lo calcula arInfo). Si no se mostraran, la
      // columna de Saldo no cerraría con el saldo que muestra el resto
      // del sistema, y eso es peor que un renglón de más.
      const aplicaciones=aplicacionesDeFactura(f);

      // El saldo arranca en el total de la factura y va bajando.
      let saldo=Number(f.totales.total)||0;
      const filaFactura=`<tr style="border-top:2px solid var(--line-strong)">
        <td style="color:var(--muted);white-space:nowrap">${fdate(f.creada)}</td>
        <td style="font-weight:600">Factura ${escHtml((f.serie?f.serie+'-':'')+(f.numeroDte||''))}</td>
        <td class="num" style="font-weight:600">${money(f.totales.total)}</td>
        <td class="num" style="font-weight:600">${money(saldo)}</td>
      </tr>`;

      const filasAplic=aplicaciones.map(x=>{
        // Un abono anulado NO baja el saldo: se muestra tachado y el
        // saldo queda igual, para que se vea que existió pero no contó.
        if(!x.anulado) saldo=Math.round((saldo-x.monto)*100)/100;
        // Todo abono debería llevar número de recibo. Los que no tienen
        // son de antes de que se usara esa práctica: se marcan en gris
        // para que se note cuáles quedaron incompletos.
        const detalle=(x.clase==='abono'&&!x.noRecibo)
          ? 'Abono <span style="color:var(--muted-2)">· sin recibo</span>'
          : escHtml(detalleAplicacion(x));
        const tachado=x.anulado?'text-decoration:line-through;opacity:.55;':'';
        return `<tr>
          <td style="color:var(--muted);white-space:nowrap;padding-left:24px;${tachado}">${fdate(x.fecha)}</td>
          <td style="color:var(--muted);padding-left:24px;${tachado}">${detalle}${x.anulado?' <span class="badge b-danger" style="font-size:9px">ANULADO</span>':''}</td>
          <td class="num" style="${tachado}">${money(x.monto)}</td>
          <td class="num" style="color:var(--muted)">${x.anulado?'—':money(saldo)}</td>
        </tr>`;
      }).join('');

      const sinAplic=aplicaciones.length?'':
        `<tr><td></td><td style="color:var(--muted-2);padding-left:24px">Sin abonos registrados</td><td></td><td></td></tr>`;
      return filaFactura+filasAplic+sinAplic;
    }).join('');

    const saldoTotal=facturas.reduce((s,f)=>s+arInfo(f).saldo,0);
    body=`<div class="panel"><div class="panel-head"><h3>Facturas y abonos</h3></div>
      <table><thead><tr><th>Fecha</th><th>Detalle</th><th class="num">Monto</th><th class="num">Saldo</th></tr></thead><tbody>
      ${filas||'<tr><td colspan="4" class="empty">Este cliente no tiene facturas emitidas</td></tr>'}
      ${facturas.length?`<tr style="border-top:2px solid var(--line-strong)">
        <td></td><td style="font-weight:700">SALDO TOTAL DEL CLIENTE</td><td></td>
        <td class="num" style="font-weight:700;color:${saldoTotal>0.001?'var(--danger)':'var(--ok)'}">${money(saldoTotal)}</td>
      </tr>`:''}
      </tbody></table></div>`;
  }else if(cliTab==='prestamos'){
    body=`<div class="panel"><div class="panel-head"><h3>Órdenes de préstamo emitidas</h3></div>
      <table><thead><tr><th>No.</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
      ${prestamos.length?prestamos.slice().reverse().map(f=>`<tr><td style="font-weight:600">${refPed(f)}</td><td style="color:var(--muted)">${fdate(f.creada)}</td><td class="num" style="font-weight:600">${money(f.totales.total)}</td><td><span class="badge ${f.estado==='pendiente'?'b-warn':(f.estado==='facturado'?'b-ok':'b-info')}">${f.estado}</span></td><td><button class="btn btn-ghost btn-sm" onclick="verDoc(${f.id})">Ver</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Sin órdenes de préstamo</td></tr>'}
      </tbody></table></div>`;
  }else if(cliTab==='cobros'){
    const ci=c.cobroInfo||{};
    const puedeEditar=canRegistrarAbono()||canCrearCliente();
    const diasSel=Array.isArray(ci.dias)?ci.dias:[];
    const chkDias=DIAS_COBRO.map(([k,l])=>`<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;user-select:none"><input type="checkbox" class="co-dia" value="${k}" ${diasSel.includes(k)?'checked':''} ${puedeEditar?'':'disabled'}>${l}</label>`).join('');
    const frecOpts=[['','—'],['semanal','Semanal'],['quincenal','Quincenal'],['mensual','Mensual']].map(([v,l])=>`<option value="${v}" ${ci.frecuencia===v?'selected':''}>${l}</option>`).join('');
    body=`<div class="panel">
      <div class="panel-head"><h3>Configuración de cobro</h3>${puedeEditar?`<button class="btn btn-primary btn-sm" onclick="guardarCobroInfo(${c.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Guardar</button>`:''}</div>
      <div class="panel-body">
        <label>Días de cobro</label>
        <div style="display:flex;flex-wrap:wrap;gap:14px;margin:6px 0 16px">${chkDias}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div><label>Horario de cobro</label><input id="co-horario" placeholder="Ej. 8:00 – 12:00" value="${escHtml(ci.horario)}" ${puedeEditar?'':'disabled'}></div>
          <div><label>Frecuencia</label><select id="co-frec" ${puedeEditar?'':'disabled'}>${frecOpts}</select></div>
        </div>
        <label style="display:block;margin-top:14px">Notas / instrucciones de cobro</label>
        <textarea id="co-notas" rows="3" placeholder="Instrucciones especiales, referencia, con quién dejar el cobro, etc." ${puedeEditar?'':'disabled'}>${escHtml(ci.notas)}</textarea>
      </div>
    </div>`;
  }else if(cliTab==='seguimiento'){
    const puedeEditar=canRegistrarAbono()||canCrearCliente();
    // Recordatorios del módulo ligados a este cliente (directo, o vía sus facturas/documentos)
    const _idsDocsCli=new Set(documentos.filter(d=>d.clienteId===c.id).map(d=>d.id));
    const _recsCli=recordatorios.filter(r=>(r.tipo==='cliente'&&r.refId===c.id)||((r.tipo==='factura'||r.tipo==='contrasena')&&r.refId&&_idsDocsCli.has(r.refId))).sort((a,b)=>(a.hecho?1:0)-(b.hecho?1:0)||String(a.fechaVencimiento||'9999').localeCompare(String(b.fechaVencimiento||'9999')));
    const _tiRec={tarea:'📌',cliente:'👤',contrasena:'🔑',factura:'🧾',producto:'📦',compra:'🛒'};
    const _hoyRec=fechaHoyGT();
    const _recRows=_recsCli.length?_recsCli.map(r=>{
      const _venc=!r.hecho&&r.fechaVencimiento&&String(r.fechaVencimiento)<_hoyRec;
      const _esHoy=!r.hecho&&String(r.fechaVencimiento)===_hoyRec;
      return `<tr style="${r.hecho?'opacity:.55':''}">
        <td style="text-align:center"><input type="checkbox" ${r.hecho?'checked':''} onclick="toggleHechoRecordatorio(${r.id})" title="Marcar hecho" style="width:15px;height:15px;cursor:pointer"></td>
        <td><div style="font-weight:600;${r.hecho?'text-decoration:line-through':''}">${_tiRec[r.tipo]||'📌'} ${_escRec(r.titulo)}</div>${r.nota?`<div style="font-size:11px;color:var(--muted)">${_escRec(r.nota)}</div>`:''}</td>
        <td style="font-size:12px;color:var(--muted)">${r.refLabel?_escRec(r.refLabel):'—'}</td>
        <td style="font-size:12px;white-space:nowrap;color:${_venc?'var(--danger)':(_esHoy?'var(--warn)':'var(--muted)')};font-weight:${_venc||_esHoy?'700':'400'}">${r.fechaVencimiento?fdate(r.fechaVencimiento)+(_venc?' · vencido':(_esHoy?' · hoy':'')):'—'}</td>
        <td style="font-size:11.5px;color:var(--muted-2)">${_escRec(r.asignadoA||'—')}</td>
        <td style="white-space:nowrap">${puedeEditar?`<button class="btn btn-ghost btn-sm" onclick="openRecordatorio(${r.id})">Editar</button><button class="x" onclick="borrarRecordatorioUI(${r.id})">×</button>`:''}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6" class="empty">Sin recordatorios ligados a este cliente</td></tr>';
    const _recPanelCli=`<div class="panel">
      <div class="panel-head"><h3>Recordatorios ligados <span style="font-weight:400;font-size:12px;color:var(--muted)">· ${_recsCli.filter(r=>!r.hecho).length} pendiente(s)</span></h3>${puedeEditar?`<button class="btn btn-primary btn-sm" onclick="openRecordatorio(null,{tipo:'cliente',refId:${c.id}})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo recordatorio</button>`:''}</div>
      <table><thead><tr><th style="width:34px"></th><th>Recordatorio</th><th>Ligado a</th><th>Vence</th><th>Asignado</th><th></th></tr></thead><tbody>${_recRows}</tbody></table>
    </div>`;
    const segs=Array.isArray(c.seguimientos)?c.seguimientos:[];
    const resultOpts=Object.entries(RESULT_SEG).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
    const filas=segs.length?segs.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||((b.id||0)-(a.id||0))).map(s=>{
      const r=RESULT_SEG[s.resultado]||['—','b-muted'];
      return `<tr>
        <td style="color:var(--muted);white-space:nowrap">${s.fecha?fdate(s.fecha):'—'}</td>
        <td><span class="badge ${r[1]}">${r[0]}</span></td>
        <td>${s.nota?escHtml(s.nota):'<span style="color:var(--muted-2)">—</span>'}</td>
        <td style="color:var(--muted);white-space:nowrap">${s.proximaFecha?fdate(s.proximaFecha)+(s.hecho?' <span style="color:var(--ok)" title="Atendido">✓</span>':(s.proximaFecha===fechaHoyGT()?' <span style="color:var(--warn)" title="Recordatorio para hoy">🔔</span>':'')):'—'}</td>
        <td style="color:var(--muted-2);font-size:11.5px">${escHtml(s.usuario)||'—'}</td>
        <td style="white-space:nowrap">${puedeEditar?`${(s.proximaFecha&&!s.hecho)?`<button class="btn btn-ghost btn-sm" style="color:var(--ok);padding:4px 8px" title="Marcar recordatorio como atendido" onclick="marcarRecordatorioHecho(${c.id},${s.id})">✓</button> `:''}<button class="x" onclick="borrarSeguimiento(${c.id},${s.id})">×</button>`:''}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6" class="empty">Sin seguimientos registrados todavía</td></tr>';
    body=_recPanelCli+`<div class="panel">
      <div class="panel-head"><h3>Seguimiento de cobro</h3><span style="font-size:12px;color:var(--muted)">${segs.length} anotación(es)</span></div>
      ${puedeEditar?`<div class="panel-body" style="border-bottom:1px solid var(--line)">
        <div style="display:grid;grid-template-columns:140px 1fr 160px;gap:11px;align-items:end">
          <div><label>Fecha</label><input type="date" id="sg-fecha" value="${fechaHoyGT()}"></div>
          <div><label>Resultado</label><select id="sg-result">${resultOpts}</select></div>
          <div><label>Próximo seguimiento</label><input type="date" id="sg-prox"></div>
        </div>
        <label style="display:block;margin-top:12px">Nota</label>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <textarea id="sg-nota" rows="2" placeholder="¿Qué pasó en la gestión de cobro?" style="flex:1"></textarea>
          <button class="btn btn-primary" style="white-space:nowrap" onclick="agregarSeguimiento(${c.id})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar</button>
        </div>
      </div>`:''}
      <table><thead><tr><th>Fecha</th><th>Resultado</th><th>Nota</th><th>Próximo</th><th>Registró</th><th></th></tr></thead><tbody>${filas}</tbody></table>
    </div>`;
  }else{
    // Reportes de ventas del cliente
    const facs=facturas;
    // Productos más comprados
    const prodMap={};
    facs.forEach(f=>f.items.forEach(it=>{
      if(!prodMap[it.id])prodMap[it.id]={nombre:it.nombre,codigo:it.codigo,cant:0,total:0};
      prodMap[it.id].cant+=it.cantidad;prodMap[it.id].total+=it.cantidad*it.precio*(1-(it.descuento||0)/100);
    }));
    const topProd=Object.values(prodMap).sort((a,b)=>b.total-a.total);
    // Ventas por mes
    const mesMap={};
    facs.forEach(f=>{const _d=new Date(f.creada);const m=_d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0');mesMap[m]=(mesMap[m]||0)+f.totales.total;});
    const meses=Object.keys(mesMap).sort();
    const maxMes=Math.max(1,...Object.values(mesMap));
    const prodRows=topProd.length?topProd.map(p=>`<tr><td style="font-weight:600">${p.nombre}<div style="font-size:10.5px;color:var(--muted)">${p.codigo}</div></td><td class="num">${p.cant}</td><td class="num" style="font-weight:600">${money(p.total)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Sin compras registradas</td></tr>';
    const mesRows=meses.length?meses.map(m=>{const v=mesMap[m];const fecha=new Date(m+'-01').toLocaleDateString('es-GT',{month:'short',year:'numeric'});return `<div class="hbar-row"><div class="hbar-name">${fecha}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v/maxMes*100)}%;background:var(--green)"></div></div><div class="hbar-val num">${money(v)}</div></div>`;}).join(''):'<div class="empty">Sin historial de ventas</div>';
    body=`<div class="rep-grid2">
      <div class="panel" style="margin:0"><div class="panel-head"><h3>Productos más comprados</h3></div>
        <table><thead><tr><th>Producto</th><th>Unidades</th><th>Total</th></tr></thead><tbody>${prodRows}</tbody></table>
      </div>
      <div class="panel" style="margin:0"><div class="panel-head"><h3>Ventas por mes</h3></div>
        <div class="panel-body">${mesRows}</div>
      </div>
    </div>`;
  }
  $('#v-clientedet').innerHTML=`
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="go('clientes')">← Volver a clientes</button>
    <div class="panel"><div class="panel-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div style="font-family:var(--disp);font-size:22px;font-weight:700;letter-spacing:-.4px">${c.nombre}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">${c.razonSocial||''} · NIT ${c.nit} · Crédito: ${tcLabel(c.tiempoCredito||0)}${c.vendedorId?` · Vendedor: ${vendedores.find(v=>v.id===c.vendedorId)?.nombre||'—'}`:''}
        </div>
        ${c.email?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">✉ ${c.email}</div>`:''}
        ${c.direccionEntrega?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">🚚 Entrega: ${c.direccionEntrega}</div>`:''}
        ${c.fechaAlta?`<div style="font-size:12px;color:var(--muted-2);margin-top:2px">Fecha de alta: ${fdate(c.fechaAlta)}</div>`:''}
        ${(c.nitsSecundarios&&c.nitsSecundarios.length)?`<div style="font-size:12px;color:var(--muted);margin-top:4px">🧾 NITs adicionales: ${c.nitsSecundarios.map(n=>`${n.nit}${n.nombre&&n.nombre!==n.nit?` (${n.nombre})`:''}`).join(' · ')}</div>`:''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="estadoCuentaPDF(${c.id})" title="Descargar estado de cuenta en PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>Estado de cuenta PDF</button>
          ${canRegistrarAbono()?`<button class="btn btn-primary btn-sm" onclick="openPagoGlobalCliente(${c.id})"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Pago global</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="openRecordatorio(null,{tipo:'contrasena',refId:${c.id}})" title="Registrar contraseña de pago o entrega al crédito, ligada a la factura"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>Contraseña / crédito</button>
          ${canCrearCliente()&&!c.sedesDe?`<button class="btn btn-ghost btn-sm" onclick="openCliSede(${c.id})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar sede</button>`:''}
          ${canCrearCliente()?`<button class="btn btn-ghost btn-sm" onclick="openCli(${c.id})">Editar datos</button>`:''}
          ${currentRole==="admin"?`<button class="btn btn-ghost btn-sm" style="color:var(--danger);border-color:#f0d0d0" onclick="eliminarCliente(${c.id})" title="Eliminar cliente (solo admin)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>Eliminar</button>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:18px">
        ${contactoCard('Contacto de pagos',c.contactoPagos)}
        ${contactoCard('Contacto de compras',c.contactoCompras)}
      </div>
    </div></div>
    ${fichaIntegral(c,st)}
    <div class="ct-tabs">${tabBtn('precios','Precios')}${tabBtn('facturas','Facturas Cambiarias')}${tabBtn('factabonos','Facturas y abonos')}${tabBtn('prestamos','Órdenes de préstamo')}${tabBtn('cobros','Cobros')}${tabBtn('seguimiento','Seguimiento')}${tabBtn('reportes','Reportes de ventas')}</div>
    ${body}`;
}
function cliSetTab(t){cliTab=t;renderCliDet();}
window.cliSetTab=cliSetTab;
// Genera el estado de cuenta del cliente en PDF (para imprimir o enviar)
function estadoCuentaPDF(cliId){
  const c=clientes.find(x=>x.id===cliId);if(!c)return;
  const st=clienteStats(c);
  const hoy=fdate(new Date());
  const vend=c.vendedorId?vendedores.find(v=>v.id===c.vendedorId)?.nombre:null;
  // Solo facturas con saldo pendiente (una línea por factura)
  const pendientes=st.facturas.filter(f=>arInfo(f).saldo>0.01).sort((a,b)=>new Date(a.creada)-new Date(b.creada));
  const movs=pendientes.length?pendientes.map(f=>{
    const ai=arInfo(f);
    const venc=f.vencimiento?fdate(f.vencimiento):'—';
    const estaVencida=ai.vencido;
    return `<tr>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px">${fdate(f.creada)}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;font-weight:600">${f.serie}-${f.numeroDte}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;${estaVencida?'color:#BE4326;font-weight:600':''}">${venc}${estaVencida?' (vencida)':''}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right">Q ${f.totales.total.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;color:#2a7d2a">${ai.abon>0?'Q '+ai.abon.toLocaleString('es-GT',{minimumFractionDigits:2}):'—'}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;font-weight:700">Q ${ai.saldo.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
  </tr>`;
  }).join(''):'<tr><td colspan="6" style="padding:14px;text-align:center;color:#999">Sin facturas pendientes — cuenta al día</td></tr>';
  // Antigüedad de saldos (solo si hay mora)
  const b=st.buckets;
  const hayMora=b.c30+b.c60+b.c90+b.c90p>0;
  const moraHTML=hayMora?`<div>${_pdfSec('Antigüedad de saldos')}
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <th style="${_pdfTH()}">0–30 días</th><th style="${_pdfTH()}">31–60 días</th><th style="${_pdfTH()}">61–90 días</th><th style="${_pdfTH()}">+90 días</th>
      </tr>
      <tr>
        <td style="${_pdfTD()}">Q ${b.c30.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
        <td style="${_pdfTD()}">Q ${b.c60.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
        <td style="${_pdfTD()}">Q ${b.c90.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
        <td style="${_pdfTD('color:#BE4326;font-weight:700')}">Q ${b.c90p.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      </tr>
    </table></div>`:'';

  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="flex:1;min-width:240px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Cliente</div>
        <div style="font-size:17px;font-weight:700;margin-top:3px;color:#173916">${c.nombre||''}</div>
        ${c.razonSocial?`<div style="font-size:12.5px;color:#555">${c.razonSocial}</div>`:''}
        <div style="font-size:12px;color:#666B5C;margin-top:4px">NIT: ${c.nit||'—'}</div>
        ${c.direccion?`<div style="font-size:12px;color:#666B5C">${c.direccion}</div>`:''}
        ${vend?`<div style="font-size:12px;color:#666B5C;margin-top:2px">Vendedor: ${vend}</div>`:''}
      </div>
      <div style="text-align:right;min-width:230px;background:#F4F7EF;border:1px solid #D6DCC9;border-radius:8px;padding:12px 16px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Saldo pendiente</div>
        <div style="font-size:28px;font-weight:800;color:${st.saldoActual>0?'#9A6B07':'#3B6D11'};margin-top:2px">Q ${st.saldoActual.toLocaleString('es-GT',{minimumFractionDigits:2})}</div>
        ${st.vencidos.length?`<div style="font-size:11.5px;color:#BE4326;font-weight:700;margin-top:8px">${st.vencidos.length} factura(s) vencida(s)</div>`:''}
      </div>
    </div>
    ${moraHTML}
    ${_pdfSec('Facturas pendientes de pago')}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${_pdfTH()}">Fecha</th>
        <th style="${_pdfTH()}">Documento</th>
        <th style="${_pdfTH()}">Vencimiento</th>
        <th style="${_pdfTH('text-align:right')}">Total</th>
        <th style="${_pdfTH('text-align:right')}">Abonado</th>
        <th style="${_pdfTH('text-align:right')}">Saldo</th>
      </tr></thead>
      <tbody>${movs}</tbody>
    </table>
    <div style="margin-top:24px;font-size:11px;color:#666B5C">Para cualquier consulta sobre su estado de cuenta, comuníquese con nosotros.</div>`;
  _abrirPDF(_pdfShell({titulo:'ESTADO DE CUENTA',subtitulo:c.nombre||'',orientacion:'portrait',body}));
}
window.estadoCuentaPDF=estadoCuentaPDF;
// Estado de cuenta CONSOLIDADO del grupo (principal + todas las sedes) en PDF
