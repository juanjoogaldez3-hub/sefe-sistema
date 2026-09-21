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
  const usrOpts=usuarios.filter(u=>u.activo!==false).map(u=>`<option value="${_escRec(u.nombre)}"${(r?r.asignadoA:(preset.asignadoA||currentUser))===u.nombre?' selected':''}>${_escRec(u.nombre)}</option>`).join('');
  const tipoOpts=[['tarea','Tarea libre'],['cliente','Cliente'],['contrasena','Contraseña de pago'],['factura','Factura'],['producto','Producto'],['compra','Compra']].map(([v,l])=>`<option value="${v}"${curTipo===v?' selected':''}>${l}</option>`).join('');
  const prioOpts=[['alta','Alta'],['normal','Normal'],['baja','Baja']].map(([v,l])=>`<option value="${v}"${(r?r.prioridad:'normal')===v?' selected':''}>${l}</option>`).join('');
  openMod(id?'Editar recordatorio':'Nuevo recordatorio',
    `<div class="row" id="rec-titulo-wrap"><div style="grid-column:1/-1"><label>Título</label><input id="rec-titulo" value="${r&&curTipo!=='contrasena'?_escRec(r.titulo):(preset.titulo?_escRec(preset.titulo):'')}" placeholder="Ej. Llamar al cliente por su orden de compra"></div></div>
     <div class="row" id="rec-forma-wrap" style="display:none"><div style="grid-column:1/-1"><label>Forma de cobro</label><select id="rec-forma" onchange="recFormaChange()"><option value="contra"${curForma==='contra'?' selected':''}>Con contraseña de pago</option><option value="credito"${curForma==='credito'?' selected':''}>Al crédito (sin contraseña)</option></select></div></div>
     <div class="row" id="rec-contra-wrap" style="display:none"><div style="grid-column:1/-1"><label>No. de contraseña de pago</label><input id="rec-contra" value="${_escRec(contraNo)}" placeholder="Ej. 04521"></div></div>
     <div class="row"><div style="grid-column:1/-1"><label>Nota <span style="color:var(--muted);font-weight:400">(opcional)</span></label><input id="rec-nota" value="${r?_escRec(r.nota):(preset.nota?_escRec(preset.nota):'')}" placeholder="Detalle"></div></div>
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
  if(typeof _cotRenderAviso==='function')_cotRenderAviso();
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
    (item)=>{cotClienteSel=item?clientes.find(c=>c.id===item.valor):null;const n=document.getElementById('cot-cli-nit');if(n&&cotClienteSel)n.value='';if(cotClienteSel){const t=document.getElementById('cot-cli-tel');if(t)t.value=cotClienteSel.telefono||'';const m=document.getElementById('cot-cli-mail');if(m)m.value=cotClienteSel.correo||'';}cotInfoCliente();if(!cotEditId&&typeof _cotGuardarBorrador==='function')_cotGuardarBorrador();});
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
  // Autoguardar el borrador cuando cambian los campos del editor (una sola vez).
  if(edBox&&!edBox.dataset.borrWired){
    edBox.dataset.borrWired='1';
    const _g=()=>{if(!cotEditId&&typeof _cotGuardarBorrador==='function')_cotGuardarBorrador();};
    edBox.addEventListener('input',_g);edBox.addEventListener('change',_g);
  }
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
function cerrarCotEditor(){cotEditId=null;_cotLimpiarBorrador();renderCotizaciones();}
window.cerrarCotEditor=cerrarCotEditor;

// ===== Borrador automático de la cotización (se guarda en el navegador) =====
// Igual que el borrador del pedido: si la pantalla se cierra o desloguea, la
// cotización a medias no se pierde. Sólo para cotizaciones NUEVAS (las que se
// están editando ya están guardadas en la base).
const COT_BORRADOR_KEY='sefe_borrador_cotizacion';
function _cotGuardarBorrador(){
  try{
    if(cotEditId)return;                                   // sólo cotización nueva
    if(!cotCart.length){localStorage.removeItem(COT_BORRADOR_KEY);return;}
    const g=id=>(document.getElementById(id)||{}).value||'';
    localStorage.setItem(COT_BORRADOR_KEY,JSON.stringify({
      cart:cotCart, clienteId:cotClienteSel?cotClienteSel.id:null,
      cliSearch:g('cot-cli-search'), cliNit:g('cot-cli-nit'), cliContacto:g('cot-cli-contacto'),
      cliTel:g('cot-cli-tel'), cliMail:g('cot-cli-mail'),
      vendNom:g('cot-vend-nom'), vendTel:g('cot-vend-tel'), vendMail:g('cot-vend-mail'),
      validez:g('cot-validez'), estado:g('cot-estado'), obs:g('cot-obs'), ts:Date.now()
    }));
  }catch(e){/* si el navegador no permite, no pasa nada */}
}
window._cotGuardarBorrador=_cotGuardarBorrador;
function _cotLimpiarBorrador(){try{localStorage.removeItem(COT_BORRADOR_KEY);}catch(e){}}
window._cotLimpiarBorrador=_cotLimpiarBorrador;
function _cotHayBorrador(){try{const r=localStorage.getItem(COT_BORRADOR_KEY);if(!r)return null;const b=JSON.parse(r);return (b&&b.cart&&b.cart.length)?b:null;}catch(e){return null;}}
window._cotHayBorrador=_cotHayBorrador;
// Pinta (o limpia) el aviso de "cotización sin guardar" arriba de la lista.
function _cotRenderAviso(){
  const box=document.getElementById('cot-borrador-aviso'); if(!box)return;
  const b=_cotHayBorrador();
  if(!b){box.innerHTML='';return;}
  const nItems=b.cart.length, cli=b.cliSearch?(' · '+cotEsc(b.cliSearch.split(' · ')[0])):'';
  const cuando=b.ts?fdatehora(new Date(b.ts)):'';
  box.innerHTML=`<div class="note" style="margin:0 0 12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-color:#e0b100;background:#fffbea">
    <svg viewBox="0 0 24 24" style="flex-shrink:0"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg>
    <span style="flex:1;min-width:180px">Tenés una <b>cotización sin guardar</b> (${nItems} producto${nItems!==1?'s':''}${cli})${cuando?` · ${cuando}`:''}.</span>
    <button class="btn btn-primary btn-sm" onclick="_cotRecuperarBorrador()">Recuperar</button>
    <button class="btn btn-ghost btn-sm" onclick="_cotDescartarBorrador()">Descartar</button>
  </div>`;
}
function _cotRecuperarBorrador(){
  const b=_cotHayBorrador(); if(!b){toast('No hay borrador',null,true);return;}
  cotEditId=null;
  cotCart=(b.cart||[]).map(it=>({...it}));
  cotClienteSel=b.clienteId?(clientes.find(c=>c.id===b.clienteId)||null):null;
  abrirCotEditor('Cotización recuperada');
  setTimeout(()=>{
    const s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    if(!cotClienteSel){const cs=document.getElementById('cot-cli-search');if(cs)cs.value=b.cliSearch||'';}
    s('cot-cli-nit',b.cliNit||''); s('cot-cli-contacto',b.cliContacto||'');
    s('cot-cli-tel',b.cliTel||''); s('cot-cli-mail',b.cliMail||'');
    s('cot-vend-nom',b.vendNom||''); s('cot-vend-tel',b.vendTel||''); s('cot-vend-mail',b.vendMail||'');
    s('cot-validez',b.validez||15); s('cot-estado',b.estado||'borrador'); s('cot-obs',b.obs||'');
  },0);
  toast('📝 Cotización recuperada','Seguí donde la dejaste');
}
window._cotRecuperarBorrador=_cotRecuperarBorrador;
function _cotDescartarBorrador(){
  confirmar('Descartar borrador','¿Seguro que querés descartar la cotización sin guardar? No se puede deshacer.','Descartar',()=>{
    _cotLimpiarBorrador();_cotRenderAviso();toast('Borrador descartado');
  });
}
window._cotDescartarBorrador=_cotDescartarBorrador;
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
  if(typeof _cotGuardarBorrador==='function')_cotGuardarBorrador();
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
  _cotLimpiarBorrador();
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
  // Solo líneas con producto y cantidad REAL (>0). Antes bastaba con que el
  // arreglo tuviera longitud, y una cotización con líneas en 0 (o vacías)
  // pasaba a un pedido sin productos.
  const lineasVal=(Array.isArray(c.items)?c.items:[]).filter(it=>it&&it.id!=null&&Number(it.cantidad)>0);
  if(!lineasVal.length){toast('Sin productos','La cotización no tiene productos con cantidad — no se puede pasar a pedido',true);return;}
  if(c.estado==='convertida'){toast('Ya convertida','Esta cotización ya se convirtió en pedido',true);return;}
  if(!c.clienteId){toast('Cliente no registrado','Esta cotización es para un cliente nuevo (prospecto). Creá el cliente en el sistema y reasignálo en la cotización antes de convertirla en pedido.',true);return;}
  // Validar STOCK antes de convertir. La conversión reserva inventario, y sin
  // este chequeo dejaba el stock en negativo — a diferencia del pedido normal,
  // que bloquea el botón cuando falta existencia. Se calcula la disponibilidad
  // igual que el pedido (por caja o por unidad, según el empaque del producto).
  const faltantes=[];
  lineasVal.forEach(it=>{
    const p=productos.find(x=>x.id===it.id);
    if(!p||(typeof esServicio==='function'&&esServicio(p)))return; // servicios: sin inventario
    const te=(p.tipoEmpaque)||it.tipoEmpaque||'unidad';
    const modo=(te==='caja'||te==='caja_unidad')?'caja':(it.modoVenta||'unidad');
    const disp=(modo==='caja')?(te==='caja'?(Number(p.stock)||0):(Number(p.stockCajas)||0)):(Number(p.stock)||0);
    const pide=Number(it.cantidad)||0;
    if(pide>disp)faltantes.push(`${p.nombre} (pide ${pide}, hay ${disp} ${modo==='caja'?'caja(s)':'unidad(es)'})`);
  });
  if(faltantes.length){
    toast('Inventario insuficiente','No se puede pasar a pedido: no alcanza el stock de '+faltantes.join('; ')+'. Ajustá las cantidades de la cotización o reabastecé antes de convertir.',true);
    return;
  }
  confirmar('Convertir a pedido','Se creará un pedido abierto con los productos de <b>COT-'+padn(c.numero)+'</b>, reservando inventario. ¿Continuar?','Convertir a pedido',async()=>{
    const cli=clientes.find(x=>x.id===c.clienteId);
    const vend=vendedores.find(v=>v.id===(c.vendedorId||(cli&&cli.vendedorId)))||vendedores[0];
    const items=lineasVal.map(it=>{
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
      [SEFE_MARCA.membrete],
      ['COTIZACIÓN COT-'+padn(c.numero)],
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
    _estiloExcelHoja(XLSX,ws,{styled:_styled,headerRow:HDR,nCols:6,dataRows:filas.length,moneyCols:[3,5],totalRow,brandRow:0,titleRow:1,metaRows:[2,3,4,5,6,7,8,9,10,11]});
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'COT-'+padn(c.numero));
    descargarXlsx(XLSX,wb,`SEFE_cotizacion_COT-${padn(c.numero)}.xlsx`);
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
    // La ganancia por factura es sólo para admin: Ganancia = Total − costo de lo
    // vendido (mismo criterio que el reporte de vendedores en app-9.js).
    const esAdmin=currentRole==="admin";
    const gananciaTd=f=>{
      if(!esAdmin)return '';
      const tot=Number(f.totales?.total)||0;
      const g=tot-costoDoc(f);
      // Margen % sobre el total de la factura (mismo criterio que el reporte de vendedores).
      const pct=tot>0?(g/tot*100):0;
      const col=pct<0?'var(--danger)':(pct<15?'var(--warn)':'var(--ok)');
      return `<td class="num" style="font-weight:600;color:${col}">${pct.toFixed(1)}%</td>`;
    };
    body=`<div class="panel"><div class="panel-head"><h3>Facturas Cambiarias emitidas</h3></div>
      <table><thead><tr><th>No.</th><th>Tipo</th><th>Fecha</th><th>Total</th>${esAdmin?'<th>Ganancia</th>':''}<th>Estado</th><th></th></tr></thead><tbody>
      ${facturas.length?facturas.slice().reverse().map(f=>`<tr><td style="font-weight:600">${f.serie}-${f.numeroDte}</td><td><span class="pill ${(TIPO_LBL[f.tipoDoc]||["","p-ped"])[1]}">${(TIPO_LBL[f.tipoDoc]||["Documento"])[0]}</span></td><td style="color:var(--muted)">${fdate(f.creada)}</td><td class="num" style="font-weight:600">${money(f.totales.total)}</td>${gananciaTd(f)}<td><span class="badge b-ok">${f.estado}</span></td><td><button class="btn btn-ghost btn-sm" onclick="verDoc(${f.id})">Ver</button></td></tr>`).join(''):`<tr><td colspan="${esAdmin?7:6}" class="empty">Sin Facturas Cambiarias emitidas</td></tr>`}
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
  }else if(cliTab==='ubicacion'){
    const puedeEditar=canCrearCliente();
    const tiene=(c.lat!=null&&c.lng!=null);
    const gmaps=tiene?`https://www.google.com/maps?q=${c.lat},${c.lng}`:'';
    const waze=tiene?`https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`:'';
    body=`<div class="panel">
      <div class="panel-head"><h3>Ubicación del cliente</h3><span id="cli-ubic-coords" style="font-size:12px;color:var(--muted)">${tiene?`📍 ${Number(c.lat).toFixed(6)}, ${Number(c.lng).toFixed(6)}`:'Sin ubicación guardada'}</span></div>
      <div class="panel-body">
        ${puedeEditar?`<div style="display:flex;gap:6px;margin-bottom:8px">
          <input id="cli-ubic-q" placeholder="Buscar dirección o lugar… (ej. 12 calle 1-25 zona 10, o el nombre del negocio)" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter'){event.preventDefault();_cliUbicBuscar();}">
          <button id="cli-ubic-btn-buscar" class="btn btn-ghost btn-sm" onclick="_cliUbicBuscar()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>Buscar</button>
        </div>
        <div id="cli-ubic-resultados" style="margin-bottom:8px"></div>
        <div style="display:flex;gap:6px;margin-bottom:8px"><input id="cli-ubic-link" placeholder="o pegá un link de Google Maps / Waze / WhatsApp…" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter'){event.preventDefault();_cliUbicPegarLink();}"><button class="btn btn-ghost btn-sm" onclick="_cliUbicPegarLink()">Usar link</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button class="btn btn-primary btn-sm" onclick="_cliUbicGPS()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>Usar mi ubicación actual (GPS)</button>
          <button class="btn btn-ghost btn-sm" onclick="_cliUbicGuardar(${c.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Guardar ubicación</button>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Buscá la dirección arriba, o tocá el mapa para poner el pin (arrastralo para ajustar). Si estás parado en el cliente, usá el <b>GPS</b>. Acordate de <b>Guardar</b>.</div>`:''}
        <div id="cli-mapa" style="height:380px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#eef1ea"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px" id="cli-ubic-abrir">
          ${tiene?`<a class="btn btn-ghost btn-sm" href="${gmaps}" target="_blank" rel="noopener">Abrir en Google Maps</a>
          <a class="btn btn-ghost btn-sm" href="${waze}" target="_blank" rel="noopener">Abrir en Waze</a>`:'<span style="font-size:12px;color:var(--muted-2)">Guardá una ubicación para poder abrirla en Google Maps o Waze.</span>'}
        </div>
      </div>
    </div>`;
    setTimeout(()=>{try{_initMapaCliente(c);}catch(e){console.error('mapa cliente',e);}},0);
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
    <div class="ct-tabs">${tabBtn('precios','Precios')}${tabBtn('facturas','Facturas Cambiarias')}${tabBtn('factabonos','Facturas y abonos')}${tabBtn('prestamos','Órdenes de préstamo')}${tabBtn('cobros','Cobros')}${tabBtn('seguimiento','Seguimiento')}${tabBtn('ubicacion','📍 Ubicación')}${tabBtn('reportes','Reportes de ventas')}</div>
    ${body}`;
}
function cliSetTab(t){cliTab=t;renderCliDet();}
window.cliSetTab=cliSetTab;

// ── Ubicación del cliente (mapa + GPS) ──────────────────────
// Carga Leaflet (mapa) una sola vez, bajo demanda (solo al abrir el tab).
let _leafletPromise=null;
function _cargarLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(_leafletPromise)return _leafletPromise;
  _leafletPromise=new Promise((res,rej)=>{
    const css=document.createElement('link');
    css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload=()=>res(window.L);s.onerror=()=>rej(new Error('No se pudo cargar el mapa'));
    document.head.appendChild(s);
  });
  return _leafletPromise;
}
let _cliMapa=null;        // { setPin(lat,lng), center(lat,lng,zoom) }
let _cliUbicPend=null;    // {lat,lng} pendiente de guardar
// Texto de coordenadas bajo el título del panel.
function _cliUbicRefrescar(lat,lng,guardado){const s=document.getElementById('cli-ubic-coords');if(s)s.textContent='📍 '+lat.toFixed(6)+', '+lng.toFixed(6)+(guardado?'':' (sin guardar)');}
// Abre el mapa: si hay llave de Google, usa Google Maps + Places; si falla o no
// hay llave, cae a OpenStreetMap (respaldo gratis).
async function _initMapaCliente(c){
  const cont=document.getElementById('cli-mapa'); if(!cont)return;
  if(typeof GOOGLE_MAPS_KEY!=='undefined' && GOOGLE_MAPS_KEY && !_gmapsAuthFail){
    try{ await _initMapaClienteGoogle(c); return; }
    catch(e){ console.error('Google Maps falló, uso OpenStreetMap:',e); }
    if(!document.getElementById('cli-mapa'))return;
  }
  return _initMapaClienteOSM(c);
}
async function _initMapaClienteOSM(c){
  const cont=document.getElementById('cli-mapa'); if(!cont)return;
  let L;
  try{L=await _cargarLeaflet();}
  catch(e){cont.innerHTML='<div style="padding:24px;text-align:center;color:var(--danger);font-size:13px">No se pudo cargar el mapa. Revisá la conexión.</div>';return;}
  if(!document.getElementById('cli-mapa'))return; // el usuario cambió de tab mientras cargaba
  const tiene=(c.lat!=null&&c.lng!=null);
  const centro=tiene?[Number(c.lat),Number(c.lng)]:[14.6349,-90.5069]; // Guatemala por defecto
  const map=L.map(cont).setView(centro,tiene?16:12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  let marker=tiene?L.marker(centro,{draggable:true}).addTo(map):null;
  _cliUbicPend=tiene?{lat:Number(c.lat),lng:Number(c.lng)}:null;
  function setPin(lat,lng){
    _cliUbicPend={lat,lng};
    if(marker){marker.setLatLng([lat,lng]);}
    else{marker=L.marker([lat,lng],{draggable:true}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();setPin(p.lat,p.lng);});}
    _cliUbicRefrescar(lat,lng,false);
  }
  if(marker)marker.on('dragend',()=>{const p=marker.getLatLng();setPin(p.lat,p.lng);});
  map.on('click',(e)=>setPin(e.latlng.lat,e.latlng.lng));
  _cliMapa={setPin,center:(lat,lng,z)=>map.setView([lat,lng],z||16)};
  setTimeout(()=>{try{map.invalidateSize();}catch(e){}},150);
}
// ── Google Maps + Places ────────────────────────────────────
let _gmapsPromise=null, _gmapsAuthFail=false;
function _cargarGoogleMaps(){
  if(_gmapsAuthFail)return Promise.reject(new Error('Google Maps no autorizado'));
  if(window.google&&window.google.maps)return Promise.resolve(window.google.maps);
  if(_gmapsPromise)return _gmapsPromise;
  _gmapsPromise=new Promise((res,rej)=>{
    window.__gmapsReady=()=>{ (window.google&&window.google.maps)?res(window.google.maps):rej(new Error('Google Maps no cargó')); };
    const s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GOOGLE_MAPS_KEY)+'&libraries=places&language=es&region=GT&loading=async&callback=__gmapsReady';
    s.async=true; s.onerror=()=>rej(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(s);
  });
  return _gmapsPromise;
}
// Google llama a esta función si la llave/dominio no está autorizada: caemos a OSM.
window.gm_authFailure=function(){
  _gmapsAuthFail=true;
  try{
    if(typeof cliActual!=='undefined'&&cliActual!=null&&typeof cliTab!=='undefined'&&cliTab==='ubicacion'){
      const c=(typeof clientes!=='undefined'?clientes:[]).find(x=>x.id===cliActual);
      const cont=document.getElementById('cli-mapa');
      if(c&&cont){cont.innerHTML='';_initMapaClienteOSM(c);}
    }
  }catch(e){}
  toast('Mapa de Google no disponible','Revisá la llave/APIs en Google Cloud (dominio y facturación). Uso OpenStreetMap por ahora.',true);
};
async function _initMapaClienteGoogle(c){
  const cont=document.getElementById('cli-mapa'); if(!cont)return;
  const gm=await _cargarGoogleMaps();
  if(!document.getElementById('cli-mapa'))return;
  const tiene=(c.lat!=null&&c.lng!=null);
  const centro=tiene?{lat:Number(c.lat),lng:Number(c.lng)}:{lat:14.6349,lng:-90.5069}; // Guatemala por defecto
  const map=new gm.Map(cont,{center:centro,zoom:tiene?16:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:true});
  let marker=tiene?new gm.Marker({position:centro,map,draggable:true}):null;
  _cliUbicPend=tiene?{lat:Number(c.lat),lng:Number(c.lng)}:null;
  function setPin(lat,lng){
    _cliUbicPend={lat,lng};
    if(marker){marker.setPosition({lat,lng});}
    else{marker=new gm.Marker({position:{lat,lng},map,draggable:true});marker.addListener('dragend',()=>{const p=marker.getPosition();setPin(p.lat(),p.lng());});}
    _cliUbicRefrescar(lat,lng,false);
  }
  if(marker)marker.addListener('dragend',()=>{const p=marker.getPosition();setPin(p.lat(),p.lng());});
  map.addListener('click',(e)=>setPin(e.latLng.lat(),e.latLng.lng()));
  _cliMapa={setPin,center:(lat,lng,z)=>{map.setCenter({lat,lng});if(z)map.setZoom(z);}};
  // Buscador de Google (Places Autocomplete) sobre el mismo input; reemplaza al
  // buscador de OSM (se ocultan su botón y su lista de resultados).
  try{
    const inp=document.getElementById('cli-ubic-q');
    if(inp&&gm.places&&gm.places.Autocomplete){
      const ac=new gm.places.Autocomplete(inp,{fields:['geometry','name','formatted_address'],componentRestrictions:{country:'gt'}});
      ac.bindTo('bounds',map);
      ac.addListener('place_changed',()=>{
        const pl=ac.getPlace();
        if(pl&&pl.geometry&&pl.geometry.location){const loc=pl.geometry.location;map.setCenter(loc);map.setZoom(17);setPin(loc.lat(),loc.lng());}
        else toast('Elegí un lugar de la lista','Escribí y tocá una opción del desplegable de Google',true);
      });
      const btn=document.getElementById('cli-ubic-btn-buscar'); if(btn)btn.style.display='none';
      const box=document.getElementById('cli-ubic-resultados'); if(box)box.innerHTML='';
      inp.placeholder='Buscar en Google: dirección o nombre del negocio…';
    }
  }catch(e){console.error('Places autocomplete:',e);}
}
function _cliUbicGPS(){
  if(!navigator.geolocation){toast('Sin GPS','Este dispositivo no permite ubicación',true);return;}
  toast('📍 Obteniendo ubicación…','Permití el acceso si te lo pide el navegador');
  navigator.geolocation.getCurrentPosition(
    (pos)=>{const{latitude,longitude}=pos.coords;if(_cliMapa){_cliMapa.center(latitude,longitude,17);_cliMapa.setPin(latitude,longitude);}toast('✓ Ubicación tomada','Revisá el pin y tocá Guardar');},
    (err)=>{toast('No se pudo obtener la ubicación',err&&err.code===1?'Diste que no al permiso de ubicación':(err.message||'Intentá de nuevo'),true);},
    {enableHighAccuracy:true,timeout:12000,maximumAge:0}
  );
}
window._cliUbicGPS=_cliUbicGPS;
async function _cliUbicGuardar(cid){
  const c=clientes.find(x=>x.id===cid); if(!c)return;
  if(!_cliUbicPend||_cliUbicPend.lat==null){toast('Sin ubicación','Poné el pin primero: usá el GPS o tocá el mapa',true);return;}
  c.lat=Math.round(_cliUbicPend.lat*1e6)/1e6;
  c.lng=Math.round(_cliUbicPend.lng*1e6)/1e6;
  const ok=await (typeof guardarCliente==='function'?guardarCliente(c):Promise.resolve());
  if(ok===false){toast('No se pudo guardar','¿Ya corriste el SQL de ubicación?',true);return;}
  if(typeof logAudit==='function')logAudit('Ubicación de cliente',(c.nombre||'#'+c.id)+' · '+c.lat+', '+c.lng);
  toast('✓ Ubicación guardada',c.nombre);
  renderCliDet();
}
window._cliUbicGuardar=_cliUbicGuardar;
// Buscar una dirección/lugar (como Google Maps) usando el geocodificador libre
// de OpenStreetMap (Nominatim). Prioriza Guatemala. Muestra resultados para
// elegir; al tocar uno, cae el pin ahí.
async function _cliUbicBuscar(){
  const inp=document.getElementById('cli-ubic-q'); if(!inp)return;
  const q=(inp.value||'').trim();
  const box=document.getElementById('cli-ubic-resultados');
  if(!q){if(box)box.innerHTML='';return;}
  if(box)box.innerHTML='<div style="padding:6px 2px;color:var(--muted);font-size:12px">Buscando…</div>';
  try{
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=gt&accept-language=es&q='+encodeURIComponent(q);
    const r=await fetch(url,{headers:{'Accept':'application/json'}});
    const arr=await r.json();
    if(!Array.isArray(arr)||!arr.length){if(box)box.innerHTML='<div style="padding:6px 2px;color:var(--muted-2);font-size:12px">Sin resultados. Probá con la dirección más completa, la zona, o el nombre del lugar. También podés tocar el punto directo en el mapa.</div>';return;}
    if(box)box.innerHTML='<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">'+arr.map((x,i)=>`<button class="btn btn-ghost btn-sm" style="display:block;width:100%;text-align:left;white-space:normal;border:0;border-top:${i?'1px solid var(--line)':'0'};border-radius:0;padding:8px 10px;font-size:12.5px" onclick="_cliUbicElegir(${Number(x.lat)},${Number(x.lon)})">📍 ${escHtml(x.display_name)}</button>`).join('')+'</div>';
  }catch(e){if(box)box.innerHTML='<div style="padding:6px 2px;color:var(--danger);font-size:12px">No se pudo buscar. Revisá la conexión.</div>';}
}
window._cliUbicBuscar=_cliUbicBuscar;
function _cliUbicElegir(lat,lng){
  if(_cliMapa){_cliMapa.center(lat,lng,17);_cliMapa.setPin(lat,lng);}
  const box=document.getElementById('cli-ubic-resultados'); if(box)box.innerHTML='';
  toast('Ubicación encontrada','Revisá el pin en el mapa y tocá Guardar');
}
window._cliUbicElegir=_cliUbicElegir;
// Pegar un link de Google Maps / Waze / WhatsApp en la ficha → cae el pin.
function _cliUbicPegarLink(){
  const inp=document.getElementById('cli-ubic-link'); if(!inp)return;
  const r=_parseLatLngDeLink(inp.value);
  if(!r){toast('No pude leer el link','Si es un link corto (maps.app.goo.gl), abrilo y pegá el link largo, o pegá "lat, lng"',true);return;}
  if(_cliMapa){_cliMapa.center(r.lat,r.lng,17);_cliMapa.setPin(r.lat,r.lng);}
  toast('Ubicación del link tomada','Revisá el pin en el mapa y tocá Guardar');
}
window._cliUbicPegarLink=_cliUbicPegarLink;

// ── Mapa de TODOS los clientes ──────────────────────────────
// Ver a todos los clientes pineados en un solo mapa (Google o, si falla, OSM),
// filtrable por vendedor y ruta. Clic en un pin → botón para abrir la ficha.
let _mapaTodos=null;
function _clientesConLoc(){
  const base=(typeof esVentas==='function'&&esVentas())?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;
  return base.filter(c=>c.lat!=null&&c.lng!=null); // solo los que tienen pin
}
function openMapaClientes(){
  const rutas=[...new Set((typeof clientes!=='undefined'?clientes:[]).map(c=>(c.ruta||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const optVend='<option value="">Todos los vendedores</option>'+(typeof vendedores!=='undefined'?vendedores:[]).map(v=>`<option value="${v.id}">${escHtml(v.nombre)}</option>`).join('');
  const optRuta='<option value="">Todas las rutas</option>'+rutas.map(r=>`<option value="${escHtml(r)}">${escHtml(r)}</option>`).join('');
  openMod('Mapa de clientes',
    `<div class="row" style="margin-bottom:8px">
       <div><label>Vendedor</label><select id="mt-vend" onchange="_mapaTodosPintar()">${optVend}</select></div>
       <div><label>Ruta</label><select id="mt-ruta" onchange="_mapaTodosPintar()">${optRuta}</select></div>
       <div><label>Ver por</label><select id="mt-color" onchange="_mapaTodosPintar()">
         <option value="">Normal</option>
         <option value="saldo">Saldo pendiente</option>
         <option value="ultima">Última compra</option>
         <option value="ventas">Ventas (total)</option>
       </select></div>
     </div>
     <div id="mt-info" style="font-size:12px;color:var(--muted);margin-bottom:8px"></div>
     <div id="mt-leyenda" style="font-size:11.5px;color:var(--muted);margin-bottom:8px;display:none"></div>
     <div id="mapa-todos" style="height:60vh;min-height:340px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#eef1ea"></div>`,
    null);
  const sv=document.getElementById('m-save'); if(sv)sv.style.display='none';
  $('#ov').classList.add('modal-wide'); const _m=document.querySelector('#ov .modal'); if(_m)_m.style.maxWidth='min(98vw,1100px)';
  setTimeout(_initMapaTodos,0);
}
window.openMapaClientes=openMapaClientes;
async function _initMapaTodos(){
  const cont=document.getElementById('mapa-todos'); if(!cont)return;
  if(typeof GOOGLE_MAPS_KEY!=='undefined'&&GOOGLE_MAPS_KEY&&!_gmapsAuthFail){
    try{
      const gm=await _cargarGoogleMaps();
      if(!document.getElementById('mapa-todos'))return;
      const map=new gm.Map(cont,{center:{lat:14.6349,lng:-90.5069},zoom:11,mapTypeControl:false,streetViewControl:false});
      _mapaTodos={tipo:'google',gm,map,markers:[],info:new gm.InfoWindow()};
      _mapaTodosPintar(); return;
    }catch(e){console.error('Mapa de todos (Google):',e);}
    if(!document.getElementById('mapa-todos'))return;
  }
  try{
    const L=await _cargarLeaflet();
    if(!document.getElementById('mapa-todos'))return;
    const map=L.map(cont).setView([14.6349,-90.5069],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    _mapaTodos={tipo:'osm',L,map,markers:[]};
    _mapaTodosPintar();
    setTimeout(()=>{try{map.invalidateSize();}catch(e){}},150);
  }catch(e){cont.innerHTML='<div style="padding:24px;text-align:center;color:var(--danger)">No se pudo cargar el mapa.</div>';}
}
function _mapaTodosPintar(){
  if(!_mapaTodos)return;
  const fVend=(document.getElementById('mt-vend')||{}).value||'';
  const fRuta=(document.getElementById('mt-ruta')||{}).value||'';
  const modo=(document.getElementById('mt-color')||{}).value||'';
  let lista=_clientesConLoc();
  if(fVend)lista=lista.filter(c=>String(c.vendedorId)===fVend);
  if(fRuta)lista=lista.filter(c=>(c.ruta||'').trim()===fRuta);
  const info=document.getElementById('mt-info'); if(info)info.textContent=lista.length+' cliente(s) con ubicación en el mapa';
  const ley=document.getElementById('mt-leyenda'); if(ley){const lh=_mapaLeyenda(modo); ley.innerHTML=lh; ley.style.display=lh?'':'none';}
  (_mapaTodos.markers||[]).forEach(m=>{try{_mapaTodos.tipo==='google'?m.setMap(null):_mapaTodos.map.removeLayer(m);}catch(e){}});
  _mapaTodos.markers=[];
  if(_mapaTodos.tipo==='google'){
    const gm=_mapaTodos.gm, map=_mapaTodos.map, bounds=new gm.LatLngBounds();
    lista.forEach(c=>{
      const pos={lat:Number(c.lat),lng:Number(c.lng)};
      const col=_mapaColor(c,modo);
      const mk=new gm.Marker({position:pos,map,title:c.nombre,icon:modo?{path:gm.SymbolPath.CIRCLE,scale:8,fillColor:col,fillOpacity:.95,strokeColor:'#fff',strokeWeight:1.5}:undefined});
      mk.addListener('click',()=>{_mapaTodos.info.setContent(_mapaInfoHTML(c,modo)); _mapaTodos.info.open(map,mk);});
      _mapaTodos.markers.push(mk); bounds.extend(pos);
    });
    if(lista.length){map.fitBounds(bounds); gm.event.addListenerOnce(map,'idle',()=>{if(map.getZoom()>16)map.setZoom(16);});}
  }else{
    const L=_mapaTodos.L, map=_mapaTodos.map, pts=[];
    lista.forEach(c=>{
      const col=_mapaColor(c,modo);
      const mk=modo?L.circleMarker([Number(c.lat),Number(c.lng)],{radius:8,color:'#fff',weight:1.5,fillColor:col,fillOpacity:.95}).addTo(map):L.marker([Number(c.lat),Number(c.lng)]).addTo(map);
      mk.bindPopup(_mapaInfoHTML(c,modo));
      _mapaTodos.markers.push(mk); pts.push([Number(c.lat),Number(c.lng)]);
    });
    if(pts.length)map.fitBounds(pts,{maxZoom:16,padding:[30,30]});
  }
}
window._mapaTodosPintar=_mapaTodosPintar;
// ---- Métricas por cliente (para colorear el mapa y armar rutas) ----
function _cliUltimaCompra(c){
  let ult=null;
  (typeof documentos!=='undefined'?documentos:[]).forEach(d=>{
    if(d.clienteId===c.id&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada'){
      const f=d.fechaCertificacion||d.creada; if(f&&(!ult||new Date(f)>new Date(ult)))ult=f;
    }
  });
  return ult;
}
function _cliDiasSinComprar(c){const u=_cliUltimaCompra(c); return u?Math.floor((Date.now()-new Date(u))/86400000):null;}
function _cliVentasTotal(c){return (typeof documentos!=='undefined'?documentos:[]).filter(d=>d.clienteId===c.id&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada').reduce((s,d)=>s+((d.totales&&d.totales.total)||0),0);}
// ============================================================
//  SEGUIMIENTO DE CLIENTES — a quién llamar y por qué
// ============================================================
// A partir del historial de compras de UN cliente, determina su estado:
//   dejo      → era comprador regular y se calló (rojo, urgente)
//   reponer   → se pasó de su ciclo de recompra (amarillo)
//   cayendo   → este mes va muy por debajo de su ritmo (a los mismos días)
//   creciendo → va por arriba de su ritmo (verde)
//   ok        → sin señal · nunca → nunca compró
// 'ventas' = [{fecha, monto}] del cliente. 'hoy' = fecha de referencia (para
// poder probarlo). Función PURA: no lee nada de afuera.
function _segEstadoVentas(ventas, hoy){
  hoy=hoy||new Date();
  const _dia=86400000;
  const v=(ventas||[]).map(x=>({t:new Date(x.fecha),m:Number(x.monto)||0})).filter(x=>!isNaN(x.t)).sort((a,b)=>a.t-b.t);
  const n=v.length;
  if(!n)return {comprasCount:0,estado:'nunca',color:'#9e9e9e',prioridad:0,razon:'Nunca compró',diasSinComprar:null,cadencia:null,promMensual:0,varPct:null,ultimaCompra:null,mtd:0,baseMismoDia:0};
  const ultima=v[n-1].t;
  const diasSin=Math.floor((hoy-ultima)/_dia);
  // Cadencia = promedio de días entre compras (si hay al menos 2 compras).
  let cadencia=null;
  if(n>=2){let s=0;for(let i=1;i<n;i++)s+=(v[i].t-v[i-1].t)/_dia;cadencia=Math.round(s/(n-1));}
  // Ritmo mensual reciente: ventas de los últimos 90 días / 3.
  const hace90=new Date(hoy.getTime()-90*_dia);
  const prom=v.filter(x=>x.t>=hace90).reduce((s,x)=>s+x.m,0)/3;
  // Ritmo JUSTO del mes en curso: mes al día X vs mes anterior al día X.
  const y=hoy.getFullYear(),mo=hoy.getMonth(),dc=hoy.getDate();
  const enMes=(t,yy,mm)=>t.getFullYear()===yy&&t.getMonth()===mm;
  const prevY=mo===0?y-1:y, prevMo=mo===0?11:mo-1;
  const mtd=v.filter(x=>enMes(x.t,y,mo)).reduce((s,x)=>s+x.m,0);
  const baseMis=v.filter(x=>enMes(x.t,prevY,prevMo)&&x.t.getDate()<=dc).reduce((s,x)=>s+x.m,0);
  let varPct=null;
  if(baseMis>0.005)varPct=(mtd-baseMis)/baseMis;
  else if(mtd>0.005)varPct=1;
  // Estado, por prioridad (el más urgente gana).
  let estado='ok';
  if(n>=2&&cadencia&&diasSin>Math.max(cadencia*2.5,30))estado='dejo';
  else if(cadencia&&diasSin>Math.round(cadencia*1.4)&&diasSin>=10)estado='reponer';
  else if(varPct!=null&&prom>0&&varPct<=-0.35)estado='cayendo';
  else if(varPct!=null&&varPct>=0.3)estado='creciendo';
  const pesoSev={dejo:3,cayendo:2.2,reponer:1.7,creciendo:0.6,ok:0,nunca:0}[estado];
  const size=prom>0?prom:v.reduce((s,x)=>s+x.m,0)/Math.max(1,n);
  const prioridad=Math.round(size*pesoSev);
  const color={dejo:'#c62828',cayendo:'#e65100',reponer:'#f9a825',creciendo:'#2e7d32',ok:'#9e9e9e',nunca:'#9e9e9e'}[estado];
  const razones={
    dejo:`Dejó de comprar — última compra hace ${diasSin} días`+(cadencia?` (solía cada ${cadencia})`:''),
    reponer:`Toca reponer — hace ${diasSin} días`+(cadencia?`, suele comprar cada ${cadencia}`:''),
    cayendo:`Va ${Math.round((varPct||0)*100)}% este mes vs. los mismos días del mes pasado`,
    creciendo:`Creciendo · +${Math.round((varPct||0)*100)}% vs. los mismos días del mes pasado`,
    ok:'Al día',nunca:'Nunca compró'
  };
  return {comprasCount:n,estado,color,prioridad,razon:razones[estado],diasSinComprar:diasSin,cadencia,promMensual:Math.round(prom),varPct,ultimaCompra:ultima.toISOString().slice(0,10),mtd:Math.round(mtd),baseMismoDia:Math.round(baseMis)};
}
window._segEstadoVentas=_segEstadoVentas;
// Arma la lista de seguimiento de todos los clientes (respeta al vendedor del
// rol Ventas, y un filtro opcional por vendedor). Ordenada por prioridad.
function _seguimientoClientes(opts){
  opts=opts||{};
  const hoy=new Date();
  let base=(typeof esVentas==='function'&&esVentas())?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;
  if(opts.vendedorNombre){base=base.filter(c=>{const v=(typeof vendedores!=='undefined'?vendedores:[]).find(x=>x.id===c.vendedorId);return (v&&v.nombre)===opts.vendedorNombre;});}
  const ventasDe={};
  (typeof documentos!=='undefined'?documentos:[]).forEach(d=>{
    if(d.tipoDoc!=='cambiaria'||d.estado==='anulada'||d.clienteId==null)return;
    (ventasDe[d.clienteId]=ventasDe[d.clienteId]||[]).push({fecha:d.fechaCertificacion||d.creada,monto:(d.totales&&d.totales.total)||0});
  });
  const out=[];
  base.forEach(c=>{
    if(c.sedesDe)return;
    const est=_segEstadoVentas(ventasDe[c.id]||[],hoy);
    const vend=(typeof vendedores!=='undefined'?vendedores:[]).find(x=>x.id===c.vendedorId);
    out.push(Object.assign({clienteId:c.id,nombre:c.nombre,vendedorNombre:vend?vend.nombre:''},est));
  });
  out.sort((a,b)=>b.prioridad-a.prioridad);
  return out;
}
window._seguimientoClientes=_seguimientoClientes;
// Los estados que ameritan una llamada (para la lista corta y el panel).
const SEG_ATENCION=['dejo','cayendo','reponer'];
function _seguimientoParaLlamar(opts){return _seguimientoClientes(opts).filter(c=>SEG_ATENCION.includes(c.estado));}
window._seguimientoParaLlamar=_seguimientoParaLlamar;
// Abre un recordatorio de seguimiento ya prellenado desde la lista.
function crearSeguimiento(clienteId){
  const c=clientes.find(x=>x.id===clienteId); if(!c)return;
  const est=_segEstadoVentas((typeof documentos!=='undefined'?documentos:[]).filter(d=>d.clienteId===clienteId&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada').map(d=>({fecha:d.fechaCertificacion||d.creada,monto:(d.totales&&d.totales.total)||0})),new Date());
  const vend=(typeof vendedores!=='undefined'?vendedores:[]).find(x=>x.id===c.vendedorId);
  openRecordatorio(null,{tipo:'cliente',refId:c.id,refLabel:c.nombre,
    titulo:'Seguimiento: '+c.nombre,
    nota:est.razon||'',
    asignadoA:(vend&&vend.nombre)||undefined});
}
window.crearSeguimiento=crearSeguimiento;
function _cliPedidosAbiertos(c){return (typeof documentos!=='undefined'?documentos:[]).filter(d=>d.clienteId===c.id&&d.tipoDoc==='pedido'&&d.estado==='abierto').length;}
// Color del pin según el modo elegido
function _mapaColor(c,modo){
  if(modo==='saldo'){const s=(typeof saldoCliente==='function')?saldoCliente(c):0; return s>0.5?'#c62828':'#9e9e9e';}
  if(modo==='ultima'){const d=_cliDiasSinComprar(c); if(d==null)return '#9e9e9e'; if(d<=15)return '#2e7d32'; if(d<=45)return '#8bc34a'; if(d<=90)return '#f9a825'; return '#c62828';}
  if(modo==='ventas'){const v=_cliVentasTotal(c); if(v<=0)return '#9e9e9e'; if(v<2000)return '#c8e6c9'; if(v<10000)return '#81c784'; if(v<40000)return '#43a047'; return '#1b5e20';}
  return '#2e7d32';
}
function _mapaLeyenda(modo){
  const p=(col,txt)=>`<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px"><span style="width:11px;height:11px;border-radius:50%;background:${col};border:1px solid #fff;box-shadow:0 0 0 1px #ccc"></span>${txt}</span>`;
  if(modo==='saldo')return p('#c62828','Debe')+p('#9e9e9e','Al día');
  if(modo==='ultima')return p('#2e7d32','≤15 días')+p('#8bc34a','≤45')+p('#f9a825','≤90')+p('#c62828','+90 / olvidado')+p('#9e9e9e','Nunca');
  if(modo==='ventas')return p('#1b5e20','Muy alto')+p('#43a047','Alto')+p('#81c784','Medio')+p('#c8e6c9','Bajo')+p('#9e9e9e','Sin ventas');
  return '';
}
function _mapaInfoHTML(c,modo){
  let extra='';
  const s=(typeof saldoCliente==='function')?saldoCliente(c):0;
  if(modo==='saldo')extra=s>0.5?'<br><span style="color:#c62828;font-weight:600">Debe '+money(s)+'</span>':'<br><span style="color:#666">Al día</span>';
  else if(modo==='ultima'){const d=_cliDiasSinComprar(c); extra=d==null?'<br><span style="color:#666">Nunca compró</span>':'<br><span style="color:#666">Última compra: hace '+d+' día'+(d===1?'':'s')+'</span>';}
  else if(modo==='ventas')extra='<br><span style="color:#666">Ventas: '+money(_cliVentasTotal(c))+'</span>';
  else if(s>0.5)extra='<br><span style="color:#c62828">Debe '+money(s)+'</span>';
  const ped=_cliPedidosAbiertos(c); if(ped)extra+='<br><span style="color:#1565c0">'+ped+' pedido(s) abierto(s)</span>';
  return '<div style="font-size:13px;min-width:160px"><b>'+escHtml(c.nombre)+'</b>'+(c.ruta?'<br><span style="color:#666">'+escHtml(c.ruta)+'</span>':'')+extra+'<br><button onclick="_mapaTodosVerFicha('+c.id+')" style="margin-top:6px;background:#2e7d32;color:#fff;border:0;border-radius:6px;padding:5px 10px;cursor:pointer">Ver ficha</button></div>';
}
function _mapaTodosVerFicha(id){ if(typeof closeMod==='function')closeMod(); if(typeof abrirCliente==='function')abrirCliente(id); }
window._mapaTodosVerFicha=_mapaTodosVerFicha;

// Saca lat/lng de un link de Google Maps / Waze, o de un "lat, lng" pegado.
// Cubre los formatos comunes; los links CORTOS (maps.app.goo.gl / goo.gl) no
// traen las coordenadas, así que devuelven null (hay que abrirlos y copiar el
// link largo). Devuelve {lat,lng} o null.
function _parseLatLngDeLink(s){
  s=(s||'').trim(); if(!s)return null;
  const val=(a,b)=>{const la=parseFloat(a),ln=parseFloat(b);return (isFinite(la)&&isFinite(ln)&&Math.abs(la)<=90&&Math.abs(ln)<=180)?{lat:la,lng:ln}:null;};
  let m;
  // Google Maps: /@lat,lng  ·  ?q=lat,lng  ·  &ll=lat,lng  ·  q=loc:lat,lng
  m=s.match(/[@=](?:loc:)?(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/i); if(m){const r=val(m[1],m[2]);if(r)return r;}
  // Waze: ?ll=lat,lng  ·  &ll=lat%2Clng
  m=s.match(/ll=(-?\d{1,2}\.\d+)[,%]+(-?\d{1,3}\.\d+)/i); if(m){const r=val(m[1],m[2]);if(r)return r;}
  // Google place URL: !3dLAT!4dLNG
  m=s.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/); if(m){const r=val(m[1],m[2]);if(r)return r;}
  // "lat, lng" pegado directo
  m=s.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/); if(m){const r=val(m[1],m[2]);if(r)return r;}
  return null;
}
window._parseLatLngDeLink=_parseLatLngDeLink;

// ── Asignar ubicaciones en tanda (clientes sin pin) ─────────
// Un asistente que recorre los clientes SIN ubicación uno por uno: por cada
// uno, buscás en Google o pegás un link (Maps/WhatsApp) y Guardás → siguiente.
let _pendLista=[], _pendIdx=0, _pendLatLng=null, _pendMapaObj=null, _pendResultados=[];
function openPendientesUbicacion(){
  const base=(typeof _clientesUbicPendientes==='function')?_clientesUbicPendientes():clientes.filter(c=>!c.sedesDe&&(c.lat==null||c.lng==null));
  _pendLista=base.slice().sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),'es'));
  _pendIdx=0; _pendLatLng=null;
  if(!_pendLista.length){toast('¡Todo ubicado!','No hay clientes sin ubicación',false);return;}
  openMod('Asignar ubicaciones','<div id="pend-wrap"></div>',null);
  const sv=document.getElementById('m-save'); if(sv)sv.style.display='none';
  _pendRender();
}
window.openPendientesUbicacion=openPendientesUbicacion;
function _pendRender(){
  const wrap=document.getElementById('pend-wrap'); if(!wrap)return;
  if(_pendIdx>=_pendLista.length){
    wrap.innerHTML='<div style="text-align:center;padding:22px"><div style="font-size:34px">✅</div><div style="font-weight:700;margin-top:6px">¡Listo!</div><div style="font-size:12.5px;color:var(--muted);margin-top:4px">Terminaste de asignar ubicaciones.</div><button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="closeMod()">Cerrar</button></div>';
    return;
  }
  _pendLatLng=null; _pendResultados=[]; _pendMapaObj=null;
  const c=_pendLista[_pendIdx];
  const dir=(c.direccion&&c.direccion.toLowerCase()!=='ciudad')?c.direccion:'';
  wrap.innerHTML=`
    <div style="font-size:12px;color:var(--muted-2)">Cliente ${_pendIdx+1} de ${_pendLista.length}</div>
    <div style="font-weight:700;font-size:15px;color:var(--ink);margin:2px 0 2px">${escHtml(c.nombre)}</div>
    ${dir?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Dirección registrada: ${escHtml(dir)}</div>`:'<div style="font-size:12px;color:var(--muted-2);margin-bottom:8px">Sin dirección registrada</div>'}
    <label>Buscar en Google (de un toque)</label>
    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="_pendBuscarTexto('nombre')">🔎 Por nombre</button>
      ${dir?`<button class="btn btn-ghost btn-sm" onclick="_pendBuscarTexto('dir')">🔎 Por dirección</button>`:''}
    </div>
    <input id="pend-search" autocomplete="off" placeholder="…o escribí a mano (negocio o dirección)" value="">
    <div style="display:flex;gap:6px;margin-top:8px"><input id="pend-link" placeholder="o pegá un link de Maps / Waze / WhatsApp  ·  o  14.63, -90.51" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter'){event.preventDefault();_pendUsarLink();}"><button class="btn btn-ghost btn-sm" onclick="_pendUsarLink()">Usar</button></div>
    <div id="pend-resultados" style="margin-top:8px"></div>
    <div id="pend-map" style="height:230px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#eef1ea;margin-top:8px"></div>
    <div id="pend-status" style="font-size:12.5px;margin-top:8px;color:var(--muted)">Buscá arriba (por nombre suele ser lo más certero), verificá el pin en el mapa y Guardá.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-primary btn-sm" onclick="_pendGuardar()">Guardar y siguiente</button>
      <button class="btn btn-ghost btn-sm" onclick="_pendSaltar()">Saltar</button>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="closeMod()">Cerrar</button>
    </div>`;
  setTimeout(()=>{_pendWireSearch();_pendInitMap();},0);
}
// Mapa del asistente (Google). Muestra el pin elegido; se puede tocar/arrastrar.
async function _pendInitMap(){
  const cont=document.getElementById('pend-map'); if(!cont)return;
  try{
    if(typeof GOOGLE_MAPS_KEY==='undefined'||!GOOGLE_MAPS_KEY){cont.innerHTML='<div style="padding:16px;text-align:center;color:var(--muted-2);font-size:12px">Mapa no disponible (falta la llave de Google).</div>';return;}
    const gm=await _cargarGoogleMaps();
    if(!document.getElementById('pend-map'))return;
    const map=new gm.Map(cont,{center:{lat:14.6349,lng:-90.5069},zoom:11,mapTypeControl:false,streetViewControl:false});
    _pendMapaObj={gm,map,marker:null};
    map.addListener('click',(e)=>_pendMarcar(e.latLng.lat(),e.latLng.lng(),'(tocado en el mapa)'));
    if(_pendLatLng)_pendPintarPin(_pendLatLng.lat,_pendLatLng.lng);
  }catch(e){cont.innerHTML='<div style="padding:16px;text-align:center;color:var(--muted-2);font-size:12px">No se pudo cargar el mapa.</div>';}
}
function _pendPintarPin(lat,lng){
  if(!_pendMapaObj)return;
  const {gm,map}=_pendMapaObj;
  map.setCenter({lat,lng}); map.setZoom(17);
  if(_pendMapaObj.marker){_pendMapaObj.marker.setPosition({lat,lng});}
  else{
    _pendMapaObj.marker=new gm.Marker({position:{lat,lng},map,draggable:true});
    _pendMapaObj.marker.addListener('dragend',()=>{const p=_pendMapaObj.marker.getPosition();_pendMarcar(p.lat(),p.lng(),'(ajustado a mano)');});
  }
}
function _pendRenderResultados(){
  const box=document.getElementById('pend-resultados'); if(!box)return;
  if(!_pendResultados.length){box.innerHTML='';return;}
  box.innerHTML='<div style="font-size:11px;color:var(--muted-2);margin:2px 2px 4px">Elegí la ubicación correcta:</div>'+
    '<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden;max-height:170px;overflow-y:auto">'+
    _pendResultados.map((r,i)=>`<button class="btn btn-ghost btn-sm" style="display:block;width:100%;text-align:left;white-space:normal;border:0;border-top:${i?'1px solid var(--line)':'0'};border-radius:0;padding:8px 10px;font-size:12.5px" onclick="_pendElegirResultado(${i})">📍 <b>${escHtml(r.nombre||'(sin nombre)')}</b>${r.dir?`<div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:1px">${escHtml(r.dir)}</div>`:''}</button>`).join('')+
    '</div>';
}
function _pendElegirResultado(i){
  const r=_pendResultados[i]; if(!r)return;
  _pendMarcar(r.lat,r.lng,r.nombre||r.dir||'');
}
window._pendElegirResultado=_pendElegirResultado;
async function _pendWireSearch(){
  try{
    if(typeof GOOGLE_MAPS_KEY==='undefined'||!GOOGLE_MAPS_KEY||_gmapsAuthFail)return;
    const inp=document.getElementById('pend-search'); if(!inp)return;
    const gm=await _cargarGoogleMaps();
    if(!gm.places||!gm.places.Autocomplete||!document.getElementById('pend-search'))return;
    const ac=new gm.places.Autocomplete(inp,{fields:['geometry','formatted_address','name'],componentRestrictions:{country:'gt'}});
    ac.addListener('place_changed',()=>{const pl=ac.getPlace();if(pl&&pl.geometry&&pl.geometry.location){const loc=pl.geometry.location;_pendMarcar(loc.lat(),loc.lng(),pl.formatted_address||pl.name||'');}});
  }catch(e){console.error('pend search',e);}
}
function _pendMarcar(lat,lng,txt){
  _pendLatLng={lat:Math.round(lat*1e6)/1e6,lng:Math.round(lng*1e6)/1e6};
  const s=document.getElementById('pend-status'); if(s)s.innerHTML='✓ Ubicación tomada: <b>'+_pendLatLng.lat+', '+_pendLatLng.lng+'</b>'+(txt?' · '+escHtml(txt):'')+' <span style="color:var(--muted-2)">— revisá el mapa y tocá Guardar</span>';
  _pendPintarPin(_pendLatLng.lat,_pendLatLng.lng);
}
// Buscar en Google por NOMBRE o por DIRECCIÓN del cliente actual. Usa
// textSearch, que devuelve VARIAS opciones (no sólo la primera): las
// listamos para que el usuario elija la correcta y verifique en el mapa.
async function _pendBuscarTexto(tipo){
  const c=_pendLista[_pendIdx]; if(!c)return;
  const q=((tipo==='nombre'?c.nombre:c.direccion)||'').trim();
  const s=document.getElementById('pend-status');
  _pendResultados=[]; _pendRenderResultados();
  if(!q){if(s)s.innerHTML='<span style="color:var(--danger)">Este cliente no tiene '+(tipo==='nombre'?'nombre':'dirección')+' para buscar.</span>';return;}
  if(s)s.textContent='Buscando en Google…';
  try{
    if(typeof GOOGLE_MAPS_KEY==='undefined'||!GOOGLE_MAPS_KEY){if(s)s.textContent='Falta la llave de Google';return;}
    const gm=await _cargarGoogleMaps();
    if(!gm.places||!gm.places.PlacesService){if(s)s.textContent='Buscador no disponible';return;}
    const svc=new gm.places.PlacesService(document.createElement('div'));
    svc.textSearch({query:q+', Guatemala'},(res,status)=>{
      if(status===gm.places.PlacesServiceStatus.OK && res && res.length){
        _pendResultados=res.slice(0,6).filter(p=>p.geometry&&p.geometry.location).map(p=>({lat:p.geometry.location.lat(),lng:p.geometry.location.lng(),nombre:p.name||'',dir:p.formatted_address||''}));
        _pendRenderResultados();
        if(s)s.innerHTML=_pendResultados.length>1?'Elegí la opción correcta de la lista 👇':(_pendResultados.length?'Encontré una opción 👇':'<span style="color:var(--danger)">Sin resultados. Probá el otro botón, escribí a mano, o pegá un link.</span>');
      }else{
        if(s)s.innerHTML='<span style="color:var(--danger)">No lo encontré '+(tipo==='nombre'?'por nombre':'por dirección')+'. Probá el otro botón, escribí a mano, o pegá un link.</span>';
      }
    });
  }catch(e){if(s)s.textContent='No se pudo buscar (revisá la conexión)';}
}
window._pendBuscarTexto=_pendBuscarTexto;
function _pendUsarLink(){
  const inp=document.getElementById('pend-link'); if(!inp)return;
  const r=_parseLatLngDeLink(inp.value);
  if(!r){const s=document.getElementById('pend-status'); if(s)s.innerHTML='<span style="color:var(--danger)">No pude leer coordenadas de ese link. Si es un link corto (maps.app.goo.gl), abrilo y pegá el link largo, o pegá "lat, lng".</span>';return;}
  _pendMarcar(r.lat,r.lng,'del link');
}
window._pendUsarLink=_pendUsarLink;
async function _pendGuardar(){
  const c=_pendLista[_pendIdx]; if(!c)return;
  if(!_pendLatLng){const s=document.getElementById('pend-status'); if(s)s.innerHTML='<span style="color:var(--danger)">Primero elegí una ubicación (buscá o pegá un link).</span>';return;}
  c.lat=_pendLatLng.lat; c.lng=_pendLatLng.lng;
  const ok=await (typeof guardarCliente==='function'?guardarCliente(c):Promise.resolve());
  if(ok===false){toast('No se pudo guardar','Revisá la conexión',true);return;}
  if(typeof logAudit==='function')logAudit('Ubicación de cliente',(c.nombre||'#'+c.id)+' · '+c.lat+', '+c.lng);
  _pendIdx++; _pendRender();
  if(typeof renderCli==='function'){try{renderCli();}catch(e){}}
}
window._pendGuardar=_pendGuardar;
function _pendSaltar(){ _pendIdx++; _pendRender(); }
window._pendSaltar=_pendSaltar;
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
