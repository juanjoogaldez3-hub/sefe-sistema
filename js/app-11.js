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

// Una boleta para VARIOS cobros: cuando el repartidor deposita todo lo del día
// junto. Se marcan los cobros que entraron en esa boleta (vienen todos
// marcados) y a cada uno se le anota el mismo número.
function agregarBoletaVarios(){
  const mios=cobrosRuta.filter(c=>c.estado==='cobrado'&&c.piloto===currentUser)
    .sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  if(!mios.length){toast('No hay cobros por depositar',null,true);return;}
  const fila=c=>`<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer;font-size:12.5px">
      <input type="checkbox" class="bolv-chk" data-id="${c.id}" data-monto="${c.monto}" checked onchange="_bolvTotal()" style="width:17px;height:17px;flex:none;margin:0">
      <span style="flex:1"><b>${escHtml(c.docNum)}</b> · ${escHtml(c.cliente)}<span style="display:block;color:var(--muted-2);font-size:11px">${c.modo==='efectivo'?'💵 Efectivo':'🏦 Cheque '+escHtml(c.cheque||'')} · Recibo ${escHtml(c.noRecibo||'')} · ${fdate(c.fecha)}</span></span>
      <span class="num" style="font-weight:700">${money(c.monto)}</span></label>`;
  openMod('Depositar varios con una boleta',`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Marcá los cobros que entraron en el depósito y anotá el número de la boleta del banco.</p>
    <div style="max-height:300px;overflow:auto;margin-bottom:10px">${mios.map(fila).join('')}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px;align-items:baseline;margin-bottom:12px"><span id="bolv-n" style="font-size:12px;color:var(--muted)"></span><span style="font-size:12px;color:var(--muted)">Total del depósito</span><span id="bolv-total" class="num" style="font-size:19px;font-weight:800"></span></div>
    <div class="row"><div><label>No. de boleta de depósito</label><input id="bolv-num" placeholder="No. boleta del banco"></div></div>
    <div class="note n-danger" id="bolv-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const err=t=>{const e=$('#bolv-err');e.style.display='flex';e.querySelector('span').textContent=t;};
      const ids=Array.from(document.querySelectorAll('.bolv-chk')).filter(x=>x.checked).map(x=>Number(x.dataset.id));
      if(!ids.length)return err('Marcá al menos un cobro');
      const bol=$('#bolv-num').value.trim();
      if(!bol)return err('Ingresá el No. de boleta');
      const ahora=new Date().toISOString();
      const sel=cobrosRuta.filter(c=>ids.includes(c.id)&&c.estado==='cobrado');
      sel.forEach(c=>{c.noBoleta=bol;c.estado='depositado';c.depositadoFecha=ahora;});
      const tot=sel.reduce((s,c)=>s+Number(c.monto||0),0);
      logAudit('Cobros depositados (una boleta)','Boleta '+bol+' · '+money(tot)+' · '+sel.map(c=>c.docNum).join(', '));
      closeMod();renderMisEntregas();
      toast('✓ Boleta agregada',sel.length+' cobro'+(sel.length!==1?'s':'')+' · '+money(tot)+' · pasa a logística');
      if(typeof guardarCobroRuta==='function')sel.forEach(c=>guardarCobroRuta(c));
    });
  $('#m-save').textContent='Guardar boleta';
  _bolvTotal();
}
window.agregarBoletaVarios=agregarBoletaVarios;
function _bolvTotal(){
  const chk=Array.from(document.querySelectorAll('.bolv-chk')).filter(x=>x.checked);
  const t=chk.reduce((s,x)=>s+Number(x.dataset.monto||0),0);
  const e=$('#bolv-total');if(e)e.textContent=money(t);
  const n=$('#bolv-n');if(n)n.textContent=chk.length+' cobro'+(chk.length!==1?'s':'')+' ·';
}
window._bolvTotal=_bolvTotal;

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

// Regresa una entrega a "Asignado" y reinicia el avance (preparación/entrega).
// Para corregir cuando alguien marcó de más (preparó, salió en ruta o entregó por error).
function regresarEntrega(id){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  if(!canAsignarPiloto()){toast('Sin permiso','Solo admin/logística pueden regresar una entrega.',true);return;}
  const est=estadoEntrega(d);
  if(est==='sin'){toast('Nada que regresar','Esta entrega ya está sin asignar.');return;}
  const ref=d.serie?d.serie+'-'+d.numeroDte:('PED-'+padn(d.numero));
  const aviso=(est==='entregado')
    ? 'Vas a regresar '+ref+' a "Asignado". OJO: esto NO borra cobros o abonos que se hayan registrado en la entrega — revisalos aparte si corresponde.'
    : 'Vas a regresar '+ref+' a "Asignado" y se borra el avance de preparación.';
  confirmar('Regresar entrega',aviso,'Regresar',()=>{
    // Las entregas PARCIALES ya hechas (mercadería que el cliente sí recibió) se conservan.
    const _parcAnt=_parcialesDe(d);
    d.estadoEntrega='asignado'; d.preparacion=null; d.entregaInfo=_parcAnt.length?{parciales:_parcAnt}:null; d._evid=undefined; // la próxima entrega reemplaza firma/foto
    if(typeof guardarDocumento==='function')guardarDocumento(d);
    logAudit('Entrega regresada a Asignado',ref+' · '+(d.clienteComercial||d.clienteNombre));
    if(typeof renderDespachos==='function')renderDespachos();
    if(typeof renderMisEntregas==='function')renderMisEntregas();
    toast('↩ Regresada a Asignado',(d.clienteComercial||d.clienteNombre));
  });
}
window.regresarEntrega=regresarEntrega;

// ================= ESCÁNER DE CÓDIGO DE BARRAS (cámara) =================
// Usa html5-qrcode (CDN). Abre la cámara a pantalla completa y llama onCode(codigo)
// por cada lectura. continuo=true → sigue leyendo; false → cierra tras la primera.
let _escanerPromise=null;
function _cargarEscaner(){
  if(window.Html5Qrcode)return Promise.resolve(window.Html5Qrcode);
  if(_escanerPromise)return _escanerPromise;
  _escanerPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    s.onload=()=>res(window.Html5Qrcode);
    s.onerror=()=>rej(new Error('No se pudo cargar el escáner'));
    document.head.appendChild(s);
  });
  return _escanerPromise;
}
let _scanInstancia=null, _scanStream=null, _scanTimer=null, _scanTorchOn=false, _scanUltimo={code:'',ts:0};
let _scanHintBase='', _scanBeepCtx=null, _scanFbTimer=null, _scanGap=true, _scanVisto=0;
const _SCAN_AUSENCIA=700; // ms que el código debe estar FUERA del cuadro para volver a contarlo
// Bip corto de confirmación (agudo=ok, grave=error)
function _scanBeep(ok){
  try{
    _scanBeepCtx=_scanBeepCtx||new (window.AudioContext||window.webkitAudioContext)();
    const c=_scanBeepCtx, o=c.createOscillator(), g=c.createGain();
    o.type='square'; o.frequency.value=ok?880:220; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.12,c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+0.16);
    o.start(); o.stop(c.currentTime+0.17);
  }catch(e){}
}
// Confirmación visible DENTRO del escáner (la barra de abajo), + vibración + bip.
// tipo: 'ok' (verde) · 'warn' (rojo) · 'alerta' (rojo + aviso agresivo: de más)
function _scanFeedback(texto,tipo){
  const esAlerta=(tipo==='alerta'), esRojo=(tipo==='warn'||esAlerta);
  const hint=document.getElementById('scan-hint');
  if(hint){
    hint.textContent=texto;
    hint.style.background=esRojo?'#B3261E':'#137333';
    hint.style.fontWeight='700'; hint.style.fontSize=esAlerta?'16px':'15px';
    if(_scanFbTimer)clearTimeout(_scanFbTimer);
    _scanFbTimer=setTimeout(()=>{ const h=document.getElementById('scan-hint'); if(h){h.style.background='#111';h.style.fontWeight='';h.style.fontSize='13px';h.textContent=_scanHintBase;} },esAlerta?1800:1100);
  }
  try{ if(navigator.vibrate)navigator.vibrate(esAlerta?[120,60,120,60,120]:(esRojo?[60,40,60]:70)); }catch(e){}
  _scanBeep(!esRojo);
  if(esAlerta)setTimeout(()=>_scanBeep(false),170); // doble bip grave = de más
}
window._scanFeedback=_scanFeedback;
async function _scanCam(onCode, opts){
  opts=opts||{};
  let ov=document.getElementById('scan-ov');
  if(!ov){
    ov=document.createElement('div'); ov.id='scan-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:100001;background:#000;display:flex;flex-direction:column';
    ov.innerHTML='<div style="color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;background:#111"><button onclick="_scanCerrar()" style="background:#333;color:#fff;border:0;border-radius:8px;padding:8px 13px;font-weight:700;font-size:14px">‹ Volver</button><div id="scan-tit" style="font-weight:700;font-size:14px;flex:1;text-align:center"></div><button id="scan-torch" onclick="_scanTorch()" style="display:none;background:#fff;border:0;border-radius:8px;padding:8px 13px;font-weight:700;font-size:14px">🔦 Linterna</button></div>'+
      '<div style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">'+
        '<video id="scan-video" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>'+
        '<div id="scan-reader" style="width:100%;height:100%;display:none"></div>'+
        '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:78%;max-width:340px;height:120px;border:3px solid #4ADE80;border-radius:14px;pointer-events:none"></div>'+
      '</div>'+
      '<div id="scan-hint" style="color:#fff;text-align:center;padding:12px 16px;font-size:13px;background:#111"></div>';
    document.body.appendChild(ov);
  }
  ov.style.display='flex';
  document.getElementById('scan-tit').textContent=opts.titulo||'Escaneá el código de barras';
  _scanHintBase=opts.hint||'Apuntá la cámara al código de barras del empaque.';
  const _h0=document.getElementById('scan-hint'); if(_h0){_h0.textContent=_scanHintBase;_h0.style.background='#111';_h0.style.fontWeight='';_h0.style.fontSize='13px';}
  _scanUltimo={code:'',ts:0}; _scanGap=true; _scanVisto=0;
  const emit=(txt)=>{
    const now=Date.now(); txt=String(txt||'').trim(); if(!txt)return;
    // Cuenta de nuevo el MISMO código sólo si salió del cuadro (hubo un "hueco"),
    // así se pueden escanear 2 unidades iguales; otro código cuenta siempre.
    if(txt===_scanUltimo.code && !_scanGap)return;
    if(now-_scanUltimo.ts<400)return; // anti-rebote mínimo
    _scanUltimo={code:txt,ts:now}; _scanGap=false;
    try{onCode(txt);}catch(e){}
    if(!opts.continuo)_scanCerrar();
  };
  // 1) Lector NATIVO del navegador (Android/Chrome): cámara limpia, sin parpadeo
  let Detector=null;
  if('BarcodeDetector' in window){
    try{ Detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','codabar']}); }catch(e){ Detector=null; }
  }
  if(Detector){
    const video=document.getElementById('scan-video'); video.style.display='';
    const rd=document.getElementById('scan-reader'); if(rd)rd.style.display='none';
    let stream;
    try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}); }
    catch(e){ toast('No se pudo abrir la cámara','Revisá el permiso de cámara del navegador, o marcá a mano.',true); _scanCerrar(); return; }
    _scanStream=stream; video.srcObject=stream;
    try{ await video.play(); }catch(e){}
    // Mostrar el botón de linterna sólo si el dispositivo la permite
    _scanTorchOn=false;
    const _tbtn=document.getElementById('scan-torch');
    if(_tbtn){
      const _trk=stream.getVideoTracks()[0];
      const _caps=(_trk&&_trk.getCapabilities)?_trk.getCapabilities():{};
      if(_caps&&_caps.torch){_tbtn.style.display='';_tbtn.textContent='🔦 Linterna';}else{_tbtn.style.display='none';}
    }
    _scanTimer=setInterval(async()=>{
      if(!_scanStream||!video.videoWidth)return;
      try{
        const codes=await Detector.detect(video); const now=Date.now();
        if(codes&&codes.length){ _scanVisto=now; emit(codes[0].rawValue); }
        else if(now-_scanVisto>_SCAN_AUSENCIA){ _scanGap=true; } // ausente de verdad → se puede volver a contar
      }catch(e){}
    },200);
    return;
  }
  // 2) Respaldo: html5-qrcode (iPhone u otros sin lector nativo)
  let Html5Qrcode;
  try{ Html5Qrcode=await _cargarEscaner(); }
  catch(e){ toast('Escáner no disponible','No se pudo cargar el lector. Marcá los productos a mano.',true); _scanCerrar(); return; }
  const _v=document.getElementById('scan-video'); if(_v)_v.style.display='none';
  const rd=document.getElementById('scan-reader'); if(rd)rd.style.display='';
  const F=window.Html5QrcodeSupportedFormats;
  const fmts=F?[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_128,F.CODE_39,F.ITF,F.CODABAR]:undefined;
  _scanInstancia=new Html5Qrcode('scan-reader',{formatsToSupport:fmts,verbose:false});
  try{
    await _scanInstancia.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:150}},
      (t)=>{_scanVisto=Date.now();emit(t);},
      ()=>{ if(Date.now()-_scanVisto>_SCAN_AUSENCIA)_scanGap=true; });
  }catch(e){
    toast('No se pudo abrir la cámara','Revisá el permiso de cámara del navegador, o marcá a mano.',true);
    _scanCerrar();
  }
}
// Enciende/apaga la linterna del teléfono (sólo lector nativo, Android/Chrome).
async function _scanTorch(){
  if(!_scanStream){return;}
  const track=_scanStream.getVideoTracks()[0]; if(!track)return;
  const caps=track.getCapabilities?track.getCapabilities():{};
  if(!caps||!caps.torch){toast('Sin linterna','Este dispositivo no permite encender la linterna desde el navegador.',false);return;}
  _scanTorchOn=!_scanTorchOn;
  try{ await track.applyConstraints({advanced:[{torch:_scanTorchOn}]}); }
  catch(e){ _scanTorchOn=!_scanTorchOn; toast('No se pudo cambiar la linterna',null,true); return; }
  const tbtn=document.getElementById('scan-torch'); if(tbtn)tbtn.textContent=_scanTorchOn?'🔦 Apagar':'🔦 Linterna';
}
window._scanTorch=_scanTorch;
function _scanCerrar(){
  _scanTorchOn=false;
  const _tb=document.getElementById('scan-torch'); if(_tb)_tb.style.display='none';
  if(_scanTimer){clearInterval(_scanTimer);_scanTimer=null;}
  if(_scanStream){try{_scanStream.getTracks().forEach(t=>t.stop());}catch(e){} _scanStream=null;}
  const v=document.getElementById('scan-video'); if(v){try{v.pause();}catch(e){} try{v.srcObject=null;}catch(e){}}
  const ov=document.getElementById('scan-ov');
  const done=()=>{ if(ov)ov.style.display='none'; };
  if(_scanInstancia){
    const inst=_scanInstancia; _scanInstancia=null;
    inst.stop().then(()=>{try{inst.clear();}catch(e){}}).catch(()=>{}).finally(done);
  }else done();
}
window._scanCerrar=_scanCerrar;
// Captura el código de barras de un producto (en su ficha) escaneándolo una vez.
function escanearBarrasProducto(){
  _scanCam((code)=>{ const inp=document.getElementById('p-barras'); if(inp)inp.value=code; toast('✓ Código capturado',code); },
    {titulo:'Escaneá el código del producto',hint:'Apuntá al código de barras del empaque.'});
}
window.escanearBarrasProducto=escanearBarrasProducto;

// ================= ENTREGA PARCIAL =================
// Cuando se entrega solo una parte, cada entrega parcial queda en
// entregaInfo.parciales = [{fecha,piloto,recibe,firma,lineas:{idx:cant},…}].
// Lo pendiente de cada línea = cantidad − lo ya entregado en parciales.
function _parcialesDe(d){ return (d&&d.entregaInfo&&Array.isArray(d.entregaInfo.parciales))?d.entregaInfo.parciales:[]; }
function _entregadoLinea(d,idx){ return _parcialesDe(d).reduce((s,p)=>s+(Number(p.lineas&&p.lineas[idx])||0),0); }
function _pendLinea(d,idx){ const it=(d.items||[])[idx]; const c=Number(it&&it.cantidad)||0; return Math.max(0,Math.round((c-_entregadoLinea(d,idx))*1000)/1000); }
function tieneParcial(d){ return _parcialesDe(d).length>0&&estadoEntrega(d)!=='entregado'; }
// Valor (con descuento prorrateado) de q unidades de la línea idx.
function _valorLinea(d,idx,q){ const it=(d.items||[])[idx]; if(!it)return 0; const c=Number(it.cantidad)||0; if(!c)return 0; const tot=c*(Number(it.precio)||0)-(Number(it.descuento)||0); return tot*q/c; }
// Texto "faltan …" de lo pendiente.
function _faltanTxt(d){ return (d.items||[]).map((it,i)=>{const p=_pendLinea(d,i);return p>0?p+'× '+it.nombre:'';}).filter(Boolean).join(', '); }
// Avisos naranjas para Despachos / Mis entregas.
function parcialTxt(d){
  let h='';
  if(tieneParcial(d)){
    const ps=_parcialesDe(d), ult=ps[ps.length-1];
    h+=`<div style="margin-top:3px;font-size:11.5px;font-weight:600;color:#a35a00">◐ Entrega parcial (${ps.length}) · faltan: ${escHtml(_faltanTxt(d)||'—')}<span style="font-weight:400;color:var(--muted)"> · última: ${escHtml(typeof fdatehora==='function'?fdatehora(ult.fecha):ult.fecha)}${ult.recibe?' · recibió '+escHtml(ult.recibe):''}</span></div>`;
  }
  if(_prepDe(d).parcial&&['preparado','ruta'].includes(estadoEntrega(d))){
    const lleva=(d.items||[]).map((it,i)=>{const q=_prepCant(d,i),m=_prepMetaD(d,i);return m>0?q+' de '+m+'× '+it.nombre:'';}).filter(Boolean).join(', ');
    h+=`<div style="margin-top:3px;font-size:11.5px;font-weight:600;color:#a35a00">📦 Lleva solo una parte: ${escHtml(lleva)}</div>`;
  }
  return h;
}
if(typeof window!=='undefined'){ Object.assign(window,{_parcialesDe,_entregadoLinea,_pendLinea,tieneParcial,_valorLinea,_faltanTxt,parcialTxt}); }

// ================= PREPARACIÓN DE ENTREGA (checklist del piloto) =================
function _prepDe(d){ const p=(d.preparacion&&typeof d.preparacion==='object')?d.preparacion:{}; return {packed:(p.packed&&typeof p.packed==='object')?p.packed:{},por:p.por,fecha:p.fecha,parcial:p.parcial===true}; }
// Cuántas unidades hay que empacar en esa línea (cantidad entera; si es rara, 1).
function _prepMeta(it){ const c=Number(it&&it.cantidad); return (isFinite(c)&&c>=1)?Math.max(1,Math.round(c)):1; }
// Cuántas unidades lleva empacadas la línea idx (true viejo = completa).
// Meta de la línea para ESTA preparación: si ya hubo entregas parciales, solo
// lo que falta (0 = esa línea ya se entregó completa).
function _prepMetaD(d,idx){ if(!_parcialesDe(d).length)return _prepMeta((d.items||[])[idx]); const p=_pendLinea(d,idx); return p>0?Math.max(1,Math.round(p)):0; }
function _prepCant(d,idx){ const v=_prepDe(d).packed[idx]; const meta=_prepMetaD(d,idx); if(v===true)return meta; const n=Number(v)||0; return Math.max(0,Math.min(n,meta)); }
function _prepLineaLista(d,idx){ return _prepCant(d,idx)>=_prepMetaD(d,idx); }
function _prepPacked(d){ return (d.items||[]).reduce((n,_,i)=>n+(_prepLineaLista(d,i)?1:0),0); } // líneas completas
function _prepTotal(d){ return (d.items||[]).length; }
function _prepCompleta(d){ const t=_prepTotal(d); if(t<=0)return false; for(let i=0;i<t;i++)if(!_prepLineaLista(d,i))return false; return true; }
function _prepGuardar(d){
  if(_prepCompleta(d)){
    if(['sin','asignado'].includes(estadoEntrega(d))){
      d.estadoEntrega='preparado';
      const pr=_prepDe(d); pr.por=currentUser; pr.fecha=new Date().toISOString(); d.preparacion=pr;
    }
  }else if(estadoEntrega(d)==='preparado'&&!_prepDe(d).parcial){ d.estadoEntrega='asignado'; }
  if(typeof guardarDocumento==='function')guardarDocumento(d);
}
let _prepModalId=null;
function _prepModalHTML(d){
  const done=_prepPacked(d), tot=_prepTotal(d);
  const rows=(d.items||[]).map((it,i)=>{
    const prod=productos.find(p=>p.codigo&&it.codigo&&String(p.codigo)===String(it.codigo));
    const sinBarras=!(prod&&prod.codigoBarras);
    const meta=_prepMetaD(d,i), cant=_prepCant(d,i), lista=cant>=meta;
    if(meta===0)return `<div style="padding:9px 12px;border:1.5px dashed var(--line);border-radius:10px;margin-bottom:8px;font-size:12.5px;color:var(--muted)">✓ ${it.cantidad}× ${it.nombre} — ya entregado antes</div>`;
    // Más de 1 unidad: botones − / + para marcar a mano cuántas se llevan
    // (la casilla marca o desmarca la línea completa de un toque).
    const _stop='event.preventDefault();event.stopPropagation();';
    const contador=meta>1?`<span style="flex:none;display:flex;align-items:center;gap:6px">
        <button type="button" class="btn btn-ghost btn-sm" style="min-width:38px;min-height:38px;padding:0;font-size:18px;font-weight:700" ${cant<=0?'disabled':''} onclick="${_stop}prepAjustar(${d.id},${i},-1)" aria-label="Uno menos">−</button>
        <span style="font-weight:700;font-size:13px;padding:3px 10px;border-radius:20px;min-width:52px;text-align:center;background:${lista?'#DCF0DC':(cant>0?'#FFF4E0':'#FDECEA')};color:${lista?'#137333':(cant>0?'#a35a00':'#B3261E')}">${cant}/${meta}</span>
        <button type="button" class="btn btn-ghost btn-sm" style="min-width:38px;min-height:38px;padding:0;font-size:18px;font-weight:700" ${cant>=meta?'disabled':''} onclick="${_stop}prepAjustar(${d.id},${i},1)" aria-label="Uno más">+</button>
      </span>`:'';
    return `<label style="display:flex;align-items:center;gap:11px;padding:11px 12px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:8px;${lista?'background:#EEF9EE;border-color:#BFE0BF':''}">
      <input type="checkbox" ${lista?'checked':''} onchange="prepTogglear(${d.id},${i},this.checked)" style="width:20px;height:20px;flex:none">
      <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${meta<_prepMeta(it)?meta+'× '+it.nombre+' <span style="font-weight:400;color:#a35a00">(faltan '+meta+' de '+it.cantidad+')</span>':it.cantidad+'× '+it.nombre}</div><div style="font-size:11px;color:var(--muted)">${it.codigo||''}${sinBarras?' · <span style="color:var(--warn)">sin barras (marcá a mano)</span>':''}</div></div>
      ${contador}
    </label>`;
  }).join('');
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="prepEscanear(${d.id})">📷 Escanear</button>
      <span style="font-size:13px;color:var(--muted)"><b style="color:var(--ink)">${done}</b> / ${tot} listos</span>
    </div>
    ${rows||'<div class="empty">Esta entrega no tiene productos.</div>'}
    ${(done<tot&&(d.items||[]).some((_,i)=>_prepCant(d,i)>0))?`<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line-strong)">
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px">¿No está todo en bodega? Podés llevar lo que ya marcaste; lo que falte se manda después.</div>
      <button class="btn btn-ghost btn-sm" style="color:#a35a00;border-color:#f0d29a" onclick="prepLlevarParcial(${d.id})">📦 Llevar solo lo marcado (entrega parcial)</button></div>`:''}
    ${(done>=tot&&tot>0)?'<div class="note n-ok" style="margin-top:6px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span>Todo preparado. Ya podés cargar y salir en ruta.</span></div>':''}`;
}
function _renderPrepModal(d){ if(_prepModalId!==d.id)return; const body=document.getElementById('m-body'); if(body)body.innerHTML=_prepModalHTML(d); }
function abrirPreparacion(id){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  _prepModalId=id;
  openMod('📦 Preparar · '+((d.clienteComercial||d.clienteNombre)||''),_prepModalHTML(d),()=>{_prepModalId=null;closeMod();renderMisEntregas();});
  $('#m-save').textContent='Listo';
}
window.abrirPreparacion=abrirPreparacion;
// Preparación incompleta: el repartidor lleva solo lo que marcó. Queda
// "Preparado" con la bandera parcial; al entregar, la ventana arranca en
// "Solo una parte" con esas cantidades.
function prepLlevarParcial(id){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  const lleva=(d.items||[]).map((it,i)=>{const q=_prepCant(d,i);return q>0?q+'× '+it.nombre:'';}).filter(Boolean);
  if(!lleva.length){toast('No marcaste nada','Marcá lo que vas a llevar',true);return;}
  confirmar('Llevar solo una parte','Vas a llevar: <b>'+escHtml(lleva.join(', '))+'</b>.<br>Lo que falte (<b>'+escHtml((d.items||[]).map((it,i)=>{const f=_prepMetaD(d,i)-_prepCant(d,i);return f>0?f+'× '+it.nombre:'';}).filter(Boolean).join(', '))+'</b>) queda pendiente y regresa a Despachos cuando entregues.','Llevar esto',()=>{
    const pr=_prepDe(d); pr.parcial=true; pr.por=currentUser; pr.fecha=new Date().toISOString(); d.preparacion=pr;
    d.estadoEntrega='preparado';
    const ref=d.serie?d.serie+'-'+d.numeroDte:(typeof refPed==='function'?refPed(d):'PED-'+padn(d.numero));
    logAudit('Preparación parcial',ref+' · lleva: '+lleva.join(', '));
    _prepModalId=null; renderMisEntregas();
    toast('📦 Listo para llevar','Lleva solo una parte; al entregar se registra como parcial.');
    if(typeof guardarDocumento==='function')guardarDocumento(d);
  });
}
window.prepLlevarParcial=prepLlevarParcial;
function prepTogglear(id,idx,checked){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  // El tildado manual completa (o vacía) toda la línea de un toque.
  const pr=_prepDe(d); pr.packed[idx]=checked?_prepMetaD(d,idx):0; d.preparacion=pr;
  _prepGuardar(d);
  _renderPrepModal(d);
}
window.prepTogglear=prepTogglear;
// − / + : sube o baja de a una unidad lo preparado de esa línea.
function prepAjustar(id,idx,delta){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  const meta=_prepMetaD(d,idx); const nuevo=Math.max(0,Math.min(meta,_prepCant(d,idx)+delta));
  const pr=_prepDe(d); pr.packed[idx]=nuevo; d.preparacion=pr;
  _prepGuardar(d);
  _renderPrepModal(d);
}
window.prepAjustar=prepAjustar;
// Escaneo continuo: cada lectura marca el producto correspondiente de la entrega.
function prepEscanear(id){
  const d=documentos.find(x=>x.id===id); if(!d)return;
  _scanCam((code)=>{
    let idx=-1;
    const prod=productos.find(p=>p.codigoBarras&&String(p.codigoBarras).trim()===code);
    if(prod)idx=(d.items||[]).findIndex(it=>String(it.codigo)===String(prod.codigo));
    if(idx<0)idx=(d.items||[]).findIndex(it=>String(it.codigo)===code); // por si el código escaneado es el código interno
    if(idx<0){ _scanFeedback('✗ No va en esta entrega','warn'); return; }
    const nom=d.items[idx].nombre, meta=_prepMetaD(d,idx), cant=_prepCant(d,idx);
    if(cant>=meta){ _scanFeedback('⚠ ¡DE MÁS! '+nom+' ya estaba completo ('+meta+'/'+meta+')','alerta'); }
    else {
      const nuevo=cant+1; const pr=_prepDe(d); pr.packed[idx]=nuevo; d.preparacion=pr; _prepGuardar(d);
      _scanFeedback((nuevo>=meta?'✓ '+nom+' completo ('+meta+'/'+meta+')':'✓ '+nom+' ('+nuevo+'/'+meta+')'),'ok');
    }
    _renderPrepModal(d);
    if(_prepCompleta(d)){ _scanCerrar(); toast('📦 ¡Preparación lista!','Ya podés cargar y salir en ruta.'); }
  },{continuo:true,titulo:'Escaneá los productos',hint:'Escaneá cada producto; se van marcando solos.'});
}
window.prepEscanear=prepEscanear;

// Estado de la entrega en curso (modal)
let _entregaPago='efectivo'; // efectivo | cheque | contrasena | credito
let _firmaCanvas=null,_firmaCtx=null,_firmando=false,_firmaVacia=true;
let _curEntregaId=null;
function _entregaDocId(){return _curEntregaId;}

// ---- No se pudo entregar ----
// El repartidor llegó pero no pudo entregar (cerrado, no recibió, etc.).
// Queda registrado el intento (motivo, comentario, quién y cuándo) dentro de
// entregaInfo.intentos, y la entrega vuelve a "Preparado" (sigue cargada):
// el repartidor puede reintentar y logística la ve marcada en rojo en
// Despachos para reprogramarla, reasignarla o regresarla.
const MOTIVOS_NO_ENTREGA=['Cliente cerrado','No estaba quien recibe','No tenía para pagar','Dirección incorrecta / no se encontró','No quiso recibir el pedido','Otro'];
let _noEntMotivo='';
function noEntregado(id){
  const d=documentos.find(x=>x.id===id);if(!d)return;
  _noEntMotivo='';
  const ref=d.serie?d.serie+'-'+d.numeroDte:(typeof refPed==='function'?refPed(d):'PED-'+padn(d.numero));
  openMod('No se pudo entregar · '+ref,`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${escHtml(d.clienteComercial||d.clienteNombre||'')}</p>
    <label>¿Qué pasó? <span style="color:var(--danger)">*</span></label>
    <div id="ne-motivos" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px">${MOTIVOS_NO_ENTREGA.map(m=>`<button type="button" class="btn btn-ghost btn-sm ne-mot" data-m="${escHtml(m)}" onclick="_neMotivo(this)">${escHtml(m)}</button>`).join('')}</div>
    <label>Comentario <span id="ne-com-req" style="font-weight:400;color:var(--muted-2)">(opcional)</span></label>
    <textarea id="ne-com" rows="3" placeholder="Ej. regreso a las 3 pm · el guardia dice que el encargado llega mañana"></textarea>
    <div class="note" style="margin:10px 0 0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La entrega sigue en tu ruta para reintentar, y en la oficina la ven marcada en rojo para reprogramarla.</span></div>
    <div class="note n-danger" id="ne-err" style="display:none;margin:10px 0 0"><span></span></div>`,
    ()=>confirmarNoEntregado(id));
  const sv=document.getElementById('m-save'); if(sv){sv.textContent='Registrar';}
}
window.noEntregado=noEntregado;
function _neMotivo(btn){
  _noEntMotivo=btn.dataset.m;
  document.querySelectorAll('#ne-motivos .ne-mot').forEach(b=>{const on=b===btn;b.style.background=on?'var(--danger,#c0392b)':'';b.style.color=on?'#fff':'';b.style.borderColor=on?'var(--danger,#c0392b)':'';});
  const err=document.getElementById('ne-err'); if(err)err.style.display='none';
  const req=document.getElementById('ne-com-req'); if(req)req.textContent=_noEntMotivo==='Otro'?'*':'(opcional)';
  if(req)req.style.color=_noEntMotivo==='Otro'?'var(--danger)':'var(--muted-2)';
}
window._neMotivo=_neMotivo;
function confirmarNoEntregado(id){
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const err=document.getElementById('ne-err'), errTxt=err&&err.querySelector('span');
  const com=(document.getElementById('ne-com')?.value||'').trim();
  if(!_noEntMotivo){err.style.display='flex';errTxt.textContent='Elegí qué pasó';return;}
  if(_noEntMotivo==='Otro'&&!com){err.style.display='flex';errTxt.textContent='Contá qué pasó en el comentario';return;}
  const intento={fecha:new Date().toISOString(),piloto:currentUser,motivo:_noEntMotivo,comentario:com};
  const _eiAnt=d.entregaInfo||{};
  const prev=(d.entregaInfo&&Array.isArray(d.entregaInfo.intentos))?d.entregaInfo.intentos:[];
  d.entregaInfo={intentos:prev.concat([intento]),noEntregado:intento};
  if(Array.isArray(_eiAnt.parciales)&&_eiAnt.parciales.length)d.entregaInfo.parciales=_eiAnt.parciales;
  d.estadoEntrega='preparado'; d.etaEntrega=null;
  const ref=d.serie?d.serie+'-'+d.numeroDte:(typeof refPed==='function'?refPed(d):'PED-'+padn(d.numero));
  logAudit('No se pudo entregar',ref+' · '+(d.clienteComercial||d.clienteNombre||'')+' · '+_noEntMotivo+(com?' · '+com:''));
  closeMod();
  if(typeof renderMisEntregas==='function')renderMisEntregas();
  if(typeof renderDespachos==='function'&&document.getElementById('v-despachos')?.classList.contains('active'))renderDespachos();
  toast('Registrado: no se entregó',_noEntMotivo+' · sigue en tu ruta para reintentar');
  if(typeof guardarDocumento==='function')guardarDocumento(d);
}
window.confirmarNoEntregado=confirmarNoEntregado;
// Texto corto del último intento fallido (o '' si no hay / ya se entregó).
function noEntregadoTxt(d){
  const ne=d&&estadoEntrega(d)!=='entregado'&&d.entregaInfo&&d.entregaInfo.noEntregado;
  if(!ne)return '';
  const f=typeof fdatehora==='function'?fdatehora(ne.fecha):ne.fecha;
  return `<div style="margin-top:3px;font-size:11.5px;font-weight:600;color:var(--danger)">✕ No se entregó: ${escHtml(ne.motivo||'')}${ne.comentario?' — '+escHtml(ne.comentario):''}<span style="font-weight:400;color:var(--muted)"> · ${escHtml(f||'')}${ne.piloto?' · '+escHtml(ne.piloto):''}</span></div>`;
}
window.noEntregadoTxt=noEntregadoTxt;
function marcarEntregado(id){
  _entregaPago='efectivo';_firmaVacia=true;_curEntregaId=id;
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const saldo=arInfo(d).saldo;
  // Nota de préstamo: es equipo prestado (instalación), no se cobra. Se pide
  // solo la prueba de entrega (firma + quién recibió + foto opcional).
  const _esPrest=d.tipoDoc==='prestamo';
  openMod((_esPrest?'Confirmar instalación · ':'Confirmar entrega · ')+(_esPrest?refPed(d):docNum),`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:6px">${d.clienteComercial||d.clienteNombre}</p>
    ${_esPrest?`<p style="font-size:13px;margin-bottom:14px">Nota de préstamo · equipo propiedad de la empresa. <b>No se cobra.</b> El cliente firma de recibido.</p>`:
    `<p style="font-size:13px;margin-bottom:14px">Total: <b>${money(d.totales.total)}</b>${saldo<d.totales.total?` · Saldo pendiente: <b>${money(saldo)}</b>`:''}</p>`}
    ${(!_esPrest&&(d.items||[]).length)?`<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px dashed var(--line-strong)">
      ${_parcialesDe(d).length?`<div class="note" style="margin:0 0 10px;background:#fff4e0;border-color:#f0d29a;color:#7a4a07"><span>Ya hubo ${_parcialesDe(d).length} entrega(s) parcial(es). Faltan: <b>${escHtml(_faltanTxt(d))}</b></span></div>`:''}
      <label>¿Se entregó todo?</label>
      <div class="pay-opt" id="ent-todo-opt">
        <div class="pay-btn on" data-v="todo" onclick="_entTodo('todo')"><span class="pi">✅</span>Sí, todo</div>
        <div class="pay-btn" data-v="parcial" onclick="_entTodo('parcial')"><span class="pi">◐</span>Solo una parte</div>
      </div>
      <div id="ent-parcial-det" style="display:none">
        <div style="font-size:12px;color:var(--muted);margin:4px 0 8px">Poné cuánto entregás AHORA de cada producto. Lo que falte regresa a Despachos para mandarlo después.</div>
        ${(d.items||[]).map((it,i)=>{const pe=_pendLinea(d,i);if(pe<=0)return '';const pre=_prepDe(d).parcial?Math.min(pe,_prepCant(d,i)):pe;return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${escHtml(it.nombre||'')}</div><div style="font-size:11px;color:var(--muted)">pendiente: ${pe}</div></div>
          <input type="number" class="ent-pq" data-i="${i}" data-max="${pe}" min="0" max="${pe}" step="1" value="${pre}" oninput="_entParcialResumen(${d.id})" style="width:78px;text-align:center">
        </div>`;}).join('')}
        <div id="ent-parcial-res" style="font-size:12.5px;margin-top:8px"></div>
      </div>
    </div>`:''}
    <div style="${_esPrest?'display:none':''}">
    <label>¿Cómo se resolvió el pago?</label>
    <div class="pay-opt" id="pay-opt">
      <div class="pay-btn on" data-pago="efectivo" onclick="selPago('efectivo')"><span class="pi">💵</span>Efectivo</div>
      <div class="pay-btn" data-pago="cheque" onclick="selPago('cheque')"><span class="pi">🏦</span>Cheque</div>
      <div class="pay-btn" data-pago="contrasena" onclick="selPago('contrasena')"><span class="pi">📄</span>Contraseña de pago</div>
      <div class="pay-btn" data-pago="credito" onclick="selPago('credito')"><span class="pi">✍️</span>Queda a crédito</div>
    </div>
    <div id="pay-detalle"></div>
    </div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line-strong)">
      <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Prueba de entrega</div>
      <label>Firma de quien recibe <span style="color:var(--danger)">*</span></label>
      <div class="firma-wrap"><canvas id="firma-canvas" class="firma-canvas"></canvas>
        <div class="firma-foot"><span>Firmá con el dedo o el mouse</span><button class="btn btn-ghost btn-sm" type="button" onclick="limpiarFirma()">Borrar</button></div></div>
      <div class="row" style="margin-top:11px"><div><label>¿Quién recibió? <span style="color:var(--danger)">*</span></label><input id="ent-recibe" placeholder="Nombre de quien firma"></div></div>
      <label>Foto <span style="font-weight:400;color:var(--muted-2)">(opcional: mercadería entregada, factura sellada… se guarda 30 días)</span></label>
      <input type="file" id="ent-foto-file" accept="image/*" capture="environment" style="display:none" onchange="cargarFotoEntrega(this)">
      <div id="ent-foto-zone" style="margin-bottom:12px"><button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('ent-foto-file').click()">📷 Tomar foto</button></div>
    </div>
    <div class="row"><div><label>Observación <span style="font-weight:400;color:var(--muted-2)">(opcional)</span></label><input id="ent-obs" placeholder="Ej. dejado en recepción"></div></div>
    <div class="note n-danger" id="ent-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>confirmarEntrega(id));
  _fotoEntrega=null; _entModo='todo';
  if(_esPrest)_entregaPago='prestamo'; else selPago('efectivo',saldo);
  // Si se cargó solo una parte, la ventana arranca en "Solo una parte".
  if(!_esPrest&&_prepDe(d).parcial)_entTodo('parcial');
  setTimeout(initFirma,50);
}
// ---- Entrega parcial dentro de la ventana de entrega ----
let _entModo='todo';
function _entTodo(v){
  _entModo=v;
  document.querySelectorAll('#ent-todo-opt .pay-btn').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  const det=document.getElementById('ent-parcial-det'); if(det)det.style.display=v==='parcial'?'':'none';
  // La foto queda para la entrega final (la parcial guarda firma y cantidades).
  const fz=document.getElementById('ent-foto-zone'); if(fz)fz.style.display=v==='parcial'?'none':'';
  if(v==='parcial')_entParcialResumen(_curEntregaId);
}
window._entTodo=_entTodo;
// Lee las cantidades de la entrega parcial: {lineas, valor, algo, completa, malo}.
function _entParcialLeer(d){
  const lineas={}; let valor=0, algo=false, completa=true, malo=false;
  document.querySelectorAll('#ent-parcial-det .ent-pq').forEach(inp=>{
    const i=Number(inp.dataset.i), max=Number(inp.dataset.max);
    let q=Number(inp.value); if(!isFinite(q)||q<0){q=0;malo=true;} if(q>max){q=max;malo=true;}
    if(q>0){lineas[i]=q;algo=true;valor+=_valorLinea(d,i,q);}
    if(q<max)completa=false;
  });
  return {lineas,valor,algo,completa,malo};
}
function _entParcialResumen(id){
  const d=documentos.find(x=>x.id===id); const box=document.getElementById('ent-parcial-res'); if(!d||!box)return;
  const r=_entParcialLeer(d);
  box.innerHTML=r.malo?'<span style="color:var(--danger)">Revisá las cantidades: no pueden ser más que lo pendiente.</span>'
    :!r.algo?'<span style="color:var(--danger)">Poné al menos un producto entregado.</span>'
    :r.completa?'<span style="color:var(--muted)">Así se entrega todo lo pendiente (no queda nada para después).</span>'
    :`Valor de lo que entregás ahora: <b>${money(r.valor)}</b> <span style="color:var(--muted)">(referencia para el cobro)</span>`;
}
window._entParcialResumen=_entParcialResumen;
// ── Foto de la entrega: se achica en el celular antes de guardarla ──
// (una foto de teléfono pesa 3-5 MB; achicada a 1280 px en JPG queda en
// ~150 KB, suficiente para ver la mercadería o el sello).
let _fotoEntrega=null;
function _achicarFoto(file,maxLado,calidad){
  return new Promise((ok,mal)=>{
    const fr=new FileReader();
    fr.onerror=()=>mal(new Error('No se pudo leer la foto'));
    fr.onload=()=>{
      const img=new Image();
      img.onerror=()=>mal(new Error('Formato de foto no soportado'));
      img.onload=()=>{
        const k=Math.min(1,maxLado/Math.max(img.width,img.height));
        const cv=document.createElement('canvas');
        cv.width=Math.max(1,Math.round(img.width*k));cv.height=Math.max(1,Math.round(img.height*k));
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        ok(cv.toDataURL('image/jpeg',calidad));
      };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function cargarFotoEntrega(input){
  const file=input.files&&input.files[0];if(!file)return;
  const z=$('#ent-foto-zone');
  try{
    if(z)z.innerHTML='<span style="font-size:12px;color:var(--muted)">Preparando foto…</span>';
    _fotoEntrega=await _achicarFoto(file,1280,0.6);
    if(z)z.innerHTML=`<div class="comp-preview"><img src="${_fotoEntrega}" alt="Foto de la entrega"><button class="comp-x" onclick="quitarFotoEntrega()" type="button">×</button></div>`;
  }catch(e){_fotoEntrega=null;toast('No se pudo cargar la foto',e.message||String(e),true);quitarFotoEntrega();}
  input.value='';
}
window.cargarFotoEntrega=cargarFotoEntrega;
function quitarFotoEntrega(){
  _fotoEntrega=null;
  const z=$('#ent-foto-zone');
  if(z)z.innerHTML=`<button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('ent-foto-file').click()">📷 Tomar foto</button>`;
}
window.quitarFotoEntrega=quitarFotoEntrega;
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
  }else{ // crédito: la firma (abajo, en "Prueba de entrega") es la constancia
    det.innerHTML=`<div class="note" style="background:#E6EEF6;color:var(--blue);border-color:rgba(68,96,132,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La factura queda a crédito. La firma de abajo y la fecha quedan como comprobante de recepción en la factura.</span></div>`;
  }
}
window.selPago=selPago;

// Color de la firma: azul pavo real, como lapicero (lo mismo en el PDF).
const FIRMA_TINTA='#00509E'; // azul pavo real profundo (elegido por Juanjo)
function initFirma(){
  _firmaCanvas=$('#firma-canvas');if(!_firmaCanvas)return;
  // Tamaño REAL del lienzo: offsetWidth no se ve afectado por la animación de
  // la ventana (arranca al 96%). Antes se medía con getBoundingClientRect en
  // plena animación y el lienzo quedaba 4% más angosto: lo que se firmaba
  // cerca del borde derecho se perdía (firmas incompletas).
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=_firmaCanvas.offsetWidth||_firmaCanvas.getBoundingClientRect().width||360;
  const h=_firmaCanvas.offsetHeight||160;
  _firmaCanvas.width=Math.round(w*dpr);_firmaCanvas.height=Math.round(h*dpr);
  _firmaCtx=_firmaCanvas.getContext('2d');
  _firmaCtx.strokeStyle=FIRMA_TINTA;_firmaCtx.fillStyle=FIRMA_TINTA;_firmaCtx.lineWidth=2.2*dpr;_firmaCtx.lineCap='round';_firmaCtx.lineJoin='round';
  _firmaVacia=true;
  // Punto del dedo/mouse → coordenadas del lienzo (con su escala real, aunque
  // la ventana todavía se esté animando o el lienzo esté estirado).
  const pos=e=>{const r=_firmaCanvas.getBoundingClientRect();const t=e.touches?e.touches[0]:e;
    return {x:(t.clientX-r.left)*(_firmaCanvas.width/(r.width||1)),y:(t.clientY-r.top)*(_firmaCanvas.height/(r.height||1))};};
  const start=e=>{e.preventDefault();_firmando=true;_firmaVacia=false;const p=pos(e);
    _firmaCtx.beginPath();_firmaCtx.arc(p.x,p.y,_firmaCtx.lineWidth/2,0,Math.PI*2);_firmaCtx.fill(); // un toque también marca
    _firmaCtx.beginPath();_firmaCtx.moveTo(p.x,p.y);};
  const move=e=>{if(!_firmando)return;e.preventDefault();const p=pos(e);_firmaCtx.lineTo(p.x,p.y);_firmaCtx.stroke();};
  const end=()=>{_firmando=false;};
  _firmaCanvas.onmousedown=start;_firmaCanvas.onmousemove=move;_firmaCanvas.onmouseup=end;_firmaCanvas.onmouseleave=end;
  _firmaCanvas.ontouchstart=start;_firmaCanvas.ontouchmove=move;_firmaCanvas.ontouchend=end;
}
function limpiarFirma(){if(_firmaCtx&&_firmaCanvas){_firmaCtx.clearRect(0,0,_firmaCanvas.width,_firmaCanvas.height);_firmaVacia=true;}}
window.limpiarFirma=limpiarFirma;

async function confirmarEntrega(id){
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const docNum=d.serie?d.serie+'-'+d.numeroDte:(typeof refPed==='function'?refPed(d):'PED-'+padn(d.numero));
  const err=$('#ent-err');const errTxt=err.querySelector('span');
  const obs=$('#ent-obs')?.value.trim()||'';
  const fecha=new Date().toISOString();
  const tipo=_entregaPago;
  let entregaInfo={fecha,piloto:currentUser,observacion:obs,modoPago:tipo};
  let _cobroNuevo=null;
  // Prueba de entrega (en cualquier forma de pago): firma + quién recibió.
  if(_firmaVacia||!_firmaCanvas){err.style.display='flex';errTxt.textContent='Falta la firma de quien recibe';return;}
  const recibe=$('#ent-recibe')?.value.trim();
  if(!recibe){err.style.display='flex';errTxt.textContent='Indicá quién recibió';return;}
  entregaInfo.recibe=recibe;
  // ¿Entrega parcial? Validar antes de registrar nada (cobro, firma).
  let _parc=null;
  if(_entModo==='parcial'&&d.tipoDoc!=='prestamo'){
    const r=_entParcialLeer(d);
    if(r.malo){err.style.display='flex';errTxt.textContent='Revisá las cantidades: no pueden ser más que lo pendiente';return;}
    if(!r.algo){err.style.display='flex';errTxt.textContent='Poné al menos un producto entregado';return;}
    if(!r.completa)_parc=r; // si entrega todo lo pendiente, es la entrega final normal
  }

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
      cheque,banco,piloto:currentUser,fecha,estado:'cobrado',empresa:d.empresa||empresaParaNuevo(),_nuevo:true
    };
  }else if(tipo==='contrasena'){
    const contra=$('#ent-contra').value.trim();
    if(!contra){err.style.display='flex';errTxt.textContent='Ingresá el número de contraseña';return;}
    entregaInfo.contrasena=contra;entregaInfo.fechaPromesa=$('#ent-fechaprom').value||null;
  }
  // ── Entrega PARCIAL: queda registrada (con su firma) y lo pendiente vuelve
  // a Despachos como "Sin asignar" para mandarlo después.
  if(_parc){
    const firmaP=_firmaCanvas.toDataURL('image/png');
    const prevEI=d.entregaInfo||{};
    const rec=Object.assign({},entregaInfo,{firma:firmaP,lineas:_parc.lineas,valor:Math.round(_parc.valor*100)/100});
    d.entregaInfo={intentos:prevEI.intentos,parciales:_parcialesDe(d).concat([rec])};
    d.estadoEntrega='sin'; d.pilotoId=null; d.ordenRuta=null; d.etaEntrega=null; d.preparacion=null;
    if(_cobroNuevo)cobrosRuta.push(_cobroNuevo);
    const det=Object.entries(_parc.lineas).map(([i,q])=>q+'× '+((d.items[i]||{}).nombre||'')).join(', ');
    logAudit('Entrega parcial',docNum+' · '+(d.clienteComercial||d.clienteNombre)+' · entregó: '+det+' · faltan: '+_faltanTxt(d)+' · recibió '+recibe);
    closeMod();renderMisEntregas();
    toast('◐ Entrega parcial registrada','Lo pendiente regresó a Despachos para mandarlo después.');
    if(typeof guardarDocumento==='function')guardarDocumento(d);
    if(_cobroNuevo&&typeof guardarCobroRuta==='function')guardarCobroRuta(_cobroNuevo);
    return;
  }
  // Firma y foto van a la tabla aparte (no se bajan en cada login). Si esa
  // tabla todavía no existe o falla, la firma se guarda como antes dentro de
  // la entrega para no perderla (la foto, que pesa, no).
  const firma=_firmaCanvas.toDataURL('image/png');
  const _ev={firma,foto:_fotoEntrega,recibe,registradoPor:currentUser,registradoEl:fecha};
  const _okEv=(typeof guardarEvidenciaEntrega==='function')?await guardarEvidenciaEntrega(d.id,_ev):false;
  if(_okEv){entregaInfo.evidencia=true;entregaInfo.conFoto=!!_fotoEntrega;d._evid={firma,foto:_fotoEntrega,recibe};}
  else{
    entregaInfo.firma=firma;
    if(_fotoEntrega)toast('⚠ La foto no se guardó','La entrega y la firma sí quedaron registradas.',true);
  }
  if(_cobroNuevo)cobrosRuta.push(_cobroNuevo);
  // Conservar el historial de intentos fallidos (si los hubo).
  if(d.entregaInfo&&Array.isArray(d.entregaInfo.intentos)&&d.entregaInfo.intentos.length)entregaInfo.intentos=d.entregaInfo.intentos;
  // …y de las entregas parciales anteriores.
  if(_parcialesDe(d).length){
    entregaInfo.parciales=_parcialesDe(d);
    // Lo que se entregó en ESTA entrega final (lo que faltaba).
    const fin={}; (d.items||[]).forEach((_,i)=>{const q=_pendLinea(d,i);if(q>0)fin[i]=q;}); entregaInfo.lineas=fin;
  }
  d.estadoEntrega='entregado';
  d.entregaInfo=entregaInfo;
  const resumenPago={efectivo:'Efectivo '+money(entregaInfo.monto||0)+' · Recibo '+(entregaInfo.noRecibo||''),cheque:'Cheque '+money(entregaInfo.monto||0)+' · Recibo '+(entregaInfo.noRecibo||''),contrasena:'Contraseña '+entregaInfo.contrasena,credito:'A crédito',prestamo:'Instalación (equipo en préstamo)'}[tipo]+' · recibió '+recibe;
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
  const {XLSX,styled:_styled}=await _cargarXLSX();
  const data=auditLog.map(e=>({'Fecha/Hora':fdatehora(e.fecha),Usuario:e.usuario,Rol:e.rol,Acción:e.accion,Detalle:e.detalle}));
  const meta=[
    [marcaActiva().membrete],
    ['BITÁCORA DE AUDITORÍA'],
    ['Registros:',data.length],
    ['Generado el:',fdatehora(new Date())],
    ['Generado por:',currentUser],
    []
  ];
  const HR=6;
  const ws=XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.sheet_add_json(ws,data,{origin:'A'+(HR+1)});
  _estiloExcelHoja(XLSX,ws,{styled:_styled,headerRow:HR,nCols:Object.keys(data[0]).length,dataRows:data.length,moneyCols:[],totalRow:null,brandRow:0,titleRow:1,metaRows:[2,3,4]});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Auditoría');
  descargarXlsx(XLSX,wb,`SEFE_Auditoria_${fechaHoyGT()}.xlsx`);
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
  // Versión visible: para diagnosticar "cada quien ve algo distinto" (casi
  // siempre es un caché viejo). Si dos personas ven diferente, comparan esto.
  const _ver=$('#sb-ver'); if(_ver)_ver.textContent='v. '+String(window.APP_VERSION||'—').replace(/^v=/,'');
  $('#role-badge').textContent=r.label;
  const badgeColors={admin:['var(--ok-bg)','var(--ok)'],gerencia:['#E6EEF6','var(--blue)'],ventas:['var(--ok-bg)','var(--ok)'],cobros:['#E6EEF6','var(--blue)'],bodega:['var(--warn-bg)','var(--warn)'],contabilidad:['#F0EBF7','#7A4A9E'],auditoria:['#EEF0E8','var(--muted)'],facturador:['var(--warn-bg)','var(--warn)'],piloto:['#E6EEF6','var(--blue)']};
  const [bg,col]=badgeColors[currentRole]||['#EEF0E8','var(--muted)'];
  $('#role-badge').style.background=bg;$('#role-badge').style.color=col;
  // Ocultar los títulos de sección (Operaciones, Finanzas, Bodega, …) que
  // quedaron sin ningún botón visible, sea por rol o por módulo apagado.
  document.querySelectorAll('.nav .lbl').forEach(lbl=>{
    let visible=false;
    let el=lbl.nextElementSibling;
    while(el && !el.classList.contains('lbl')){
      if(el.matches('button[data-view]') && el.style.display!=='none'){ visible=true; break; }
      el=el.nextElementSibling;
    }
    lbl.style.display=visible?'':'none';
  });
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
const VISTAS_VALIDAS=['panel','pedido','cotizaciones','documentos','cobros','clientes','recordatorios','inventario','reportes','compras','nuevacompra','porpagar','bancos','talonarios','proveedores','usuarios','auditoria','despachos','misentregas','evidencias','controles'];
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
  // Multiempresa: fijar la empresa activa y dibujar el selector antes de la
  // primera vista (con una sola empresa, no hace nada visible).
  try{ if(typeof iniciarEmpresaActiva==='function')iniciarEmpresaActiva(); if(typeof renderSelectorEmpresa==='function')renderSelectorEmpresa(); if(typeof aplicarMarcaEmpresa==='function')aplicarMarcaEmpresa(); if(typeof cargarEmpresasFEL==='function')cargarEmpresasFEL(); }catch(e){}
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
        currentUserId=u.id!=null?u.id:null;
        currentDashLayout=(u.dashboardLayout&&typeof u.dashboardLayout==='object')?u.dashboardLayout:{order:[],hidden:[]};
        $('#login-screen').style.display='none';$('#app-layout').style.display='flex';
        if(typeof mostrarBotonIA==='function')mostrarBotonIA(true);
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
        // Recordatorios (tareas + cobros): campana/popup unificado al restaurar sesión (F5)
        setTimeout(()=>{try{actualizarBellRec();mostrarRecordatoriosPopup();}catch(e){console.error(e);}},2400);
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
