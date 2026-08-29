function abrirFacturarExenta(id){
  const f=documentos.find(d=>d.id===id);
  const opts=ESCENARIOS_EXENTA.map(e=>`<option value="${e.cod}">${e.cod}. ${e.desc}</option>`).join('');
  openMod('⚡ Factura Exenta de IVA — PED-'+padn(f.numero),
    notaInternaAlertHTML(f)+dirCiudadAlertHTML(f)+`<div class="note n-danger" style="margin-bottom:16px">
      <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <span><b>Solo para casos especiales autorizados por SAT.</b> Esta factura no genera IVA para el receptor. Usá este tipo únicamente si el escenario aplica según la Ley del IVA. Una factura exenta emitida incorrectamente genera inconsistencias fiscales.</span>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">
      Pedido <b style="color:var(--ink)">${refPed(f)}</b> por <b style="color:var(--ink)">${money(f.totales.total)}</b> · ${f.clienteComercial||f.clienteNombre}
    </p>
    <label>Escenario de exención <span style="color:var(--danger)">*</span></label>
    <select id="ex-esc" style="margin-bottom:0"><option value="">— Seleccioná el escenario que aplica —</option>${opts}</select>${selectorNitHTML(f,clientes.find(c=>c.id===f.clienteId))}
    <div style="margin-top:16px;padding-top:13px;border-top:1px solid var(--line);text-align:center"><button class="btn btn-ghost btn-sm" onclick="cerrarTodo();editarPedido(${f.id})">✏️ Editar pedido antes de facturar</button></div>`,
    ()=>{
      const esc=Number($('#ex-esc').value);
      if(!esc){toast('Seleccioná el escenario de exención',null,true);return;}
      const cli=clientes.find(c=>c.id===f.clienteId);
      // Aplicar NIT secundario si se eligió
      const selNit=document.getElementById('fac-nit-sel');
      if(selNit && selNit.value!=='__principal__'){
        const ns=nitsSecNorm(cli)[Number(selNit.value)]||null;
        if(ns){f.nitFacturado=ns.nit;f.nombreFacturado=ns.nombre||ns.nit;}
      }else{ f.nitFacturado=null; f.nombreFacturado=null; }
      const dias=cli?.tiempoCredito||0;
      facturarPedidoExento(id,dias,esc);
    });
  $('#m-save').textContent='Generar Factura Exenta';
  $('#m-save').style.background='var(--warn)';
  if(((f.notaInterna)||'').trim())$('#m-save').disabled=true;
}
window.abrirFacturarExenta=abrirFacturarExenta;
async function facturarPedidoExento(id,dias,escenario){
  const f=documentos.find(d=>d.id===id);
  if(!f){toast('Pedido no encontrado',null,true);return;}
  // EXENTA: el precio de lista incluye IVA, así que se factura la BASE (se le quita el 12%).
  // Se bajan también los precios de línea para que el detalle cuadre con el total ante SAT.
  const _IVA=1.12, _r2=n=>Math.round((Number(n)||0)*100)/100;
  const itemsEx=(f.items||[]).map(it=>({...it,precio:_r2((Number(it.precio)||0)/_IVA),descuento:_r2((Number(it.descuento)||0)/_IVA)}));
  const totalEx=_r2(itemsEx.reduce((s,it)=>s+((Number(it.cantidad)||0)*(Number(it.precio)||0)-(Number(it.descuento)||0)),0));

  // Modo simulado si no hay backend configurado
  if(typeof FEL_BACKEND_URL==='undefined' || FEL_BACKEND_URL.includes('TU-BACKEND')){
    const uuid='SIM-'+Math.random().toString(36).slice(2,10).toUpperCase();
    Object.assign(f,{tipoDoc:'cambiaria',estado:'certificada',autorizacion:uuid,serie:uuid.slice(4),numeroDte:String(1000000000+f.id),
      diasCredito:dias,vencimiento:new Date(Date.now()+dias*86400000).toISOString(),abonos:[],estadoPago:'pendiente',
      exenta:true,escenarioExenta:escenario,items:itemsEx,totales:{...f.totales,total:totalEx,baseSinIva:totalEx,iva:0},creada:new Date().toISOString(),fechaCertificacion:new Date().toISOString()});
    closeMod();renderDocs();
    toast('✓ Factura Exenta SIMULADA','Configurá el backend para emitir de verdad');
    if(typeof guardarDocumento==='function')guardarDocumento(f);
    return;
  }

  // Modo real: llamar al backend con los datos de exención
  toast('⏳ Emitiendo factura exenta...','Conectando con EcoFactura');
  const hoy=fechaHoyGT();
  const venc=sumarDiasFecha(fechaHoyGT(),dias);
  const condicionPago=(dias>0)?'CREDITO':'CONTADO';
  const vendedorIniciales=inicialesVendedor(f.vendedorNombre||currentUser||'');
  const vencDDMMAAAA=(()=>{const d=new Date(Date.now()+dias*86400000);return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();})();
  const payload={
    numero:f.id, fecha:hoy,
    cliente:{nit:f.nitFacturado||f.clienteNit||'CF', nombre:f.nombreFacturado||f.clienteNombre||f.clienteComercial||'Consumidor Final', direccion:dirFiscalDoc(f), email:f.clienteEmail||''},
    items:itemsEx.map(it=>{
      const _uS=it.tipoEmpaque==='caja_unidad'&&it.modoVenta==='unidad';
      const _hc=it.codigo&&(''+it.codigo).trim()&&(''+it.codigo).trim().toUpperCase()!=='GEN';
      const _cod=_hc?(''+it.codigo).trim()+(_uS?'-U':''):'GEN';
      const _uni=_uS?'UNIDAD':((''+(it.unidad||'UNI')).trim()||'UNI');
      return {codigo:_cod, nombre:(_hc?_cod+' - ':'')+it.nombre+' - '+_uni, cantidad:it.cantidad, precio:it.precio, descuento:it.descuento||0, unidad:_uni, tipo:'B'};
    }),
    total:totalEx, vencimiento:venc, observaciones:f.observaciones||'',
    // Datos de exención
    exenta:true, fraseTipo:4, escenario:escenario,
    // Campos comerciales extra (para TrnCampAd en el backend)
    condicionPago:condicionPago, vendedor:vendedorIniciales, vencimientoTexto:vencDDMMAAAA,
  };

  try{
    const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/certificar',{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
    });
    const data=await r.json();
    if(r.ok && data.ok){
      Object.assign(f,{tipoDoc:'cambiaria',estado:'certificada',
        autorizacion:data.uuid, serie:data.serie, numeroDte:data.numeroDTE,
        fechaCertificacion:data.fechaCert, pdfBase64:data.pdfBase64, xmlBase64:data.xmlBase64,
        diasCredito:dias, vencimiento:new Date(Date.now()+dias*86400000).toISOString(),
        abonos:[], estadoPago:'pendiente',
        exenta:true, escenarioExenta:escenario, items:itemsEx, totales:{...f.totales,total:totalEx,baseSinIva:totalEx,iva:0}, creada:new Date().toISOString()});
      closeMod();renderDocs();
      toast('✓ Factura Exenta CERTIFICADA','Autorización SAT: '+data.uuid);
      logAudit('Factura Exenta emitida (FEL real)',f.serie+'-'+f.numeroDte+' · Esc.'+escenario+' · '+money(f.totales.total));
      if(typeof guardarDocumento==='function')guardarDocumento(f);
      if(f.pdfBase64)descargarFacturaPDF(f.id);
    }else{
      const msg=data.mensaje||data.error||'Error desconocido';
      toast('✗ EcoFactura rechazó la factura exenta',msg,true);
      logAudit('Error al facturar exenta',refPed(f)+' · '+msg);
    }
  }catch(err){
    toast('✗ No se pudo conectar con el servidor FEL','¿Está el backend andando? '+err.message,true);
  }
}
window.facturarPedidoExento=facturarPedidoExento;
function generarNota(id,type){
  const f=documentos.find(d=>d.id===id);
  if(!f)return;
  Object.assign(f,{tipoDoc:type,estado:'pendiente'});
  renderDocs();
  toast('✓ '+(TIPO_LBL[type]||['Documento'])[0]+' generada',refPed(f));
  logAudit((TIPO_LBL[type]||['Documento'])[0]+' generada',refPed(f)+' · '+(f.clienteComercial||f.clienteNombre));
  if(typeof guardarDocumento==='function')guardarDocumento(f);
}
window.generarNota=generarNota;
function cancelarPedido(id){
  const f=documentos.find(d=>d.id===id);
  if(f.inventarioRebajado){f.items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,it.cantidad,it.modoVenta);});f.inventarioRebajado=false;}
  f.estado='anulada';f.anuladoFecha=new Date().toISOString();f.anuladoPor=currentUser;closeMod();renderDocs();
  toast('✓ Pedido cancelado','Inventario reintegrado');
  logAudit('Pedido cancelado',refPed(f)+' · '+(f.clienteComercial||f.clienteNombre));
  if(typeof guardarDocumento==='function')guardarDocumento(f);
}
window.cancelarPedido=cancelarPedido;

window.devolver=id=>{const f=documentos.find(d=>d.id===id);let reintegrado=false;if(f.inventarioRebajado){f.items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,it.cantidad,it.modoVenta);});f.inventarioRebajado=false;reintegrado=true;}
  f.estado='devuelto';closeMod();renderDocs();toast('✓ Préstamo devuelto',reintegrado?'Inventario reingresado':'El inventario no estaba rebajado; no se modificó el stock');logAudit('Préstamo devuelto',refPed(f)+(reintegrado?'':' · sin reintegro (no estaba rebajado)'));if(typeof guardarDocumento==='function')guardarDocumento(f);};
// Abre un diálogo que pide el motivo y luego anula ante EcoFactura
function abrirAnular(id){
  const f=documentos.find(d=>d.id===id);
  if(!f){toast('Documento no encontrado',null,true);return;}
  // Si es una factura ya certificada ante SAT (tiene UUID real), hay que anular en EcoFactura
  const esRealFEL=f.autorizacion && !String(f.autorizacion).startsWith('SIM-');
  const tieneAbonos=(f.abonos||[]).length>0;
  const puedeDevolver=!tieneAbonos && (f.items||[]).length>0;
  openMod('Anular '+(f.serie?f.serie+'-'+f.numeroDte:refPed(f)),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:6px">Vas a anular esta factura por <b style="color:var(--ink)">${money(f.totales.total)}</b>.</p>
     ${esRealFEL?'<p style="font-size:12px;color:var(--danger);margin-bottom:12px">⚠️ Esta factura está certificada ante SAT. Se anulará también en EcoFactura. Esta acción no se puede deshacer.</p>':'<p style="font-size:12px;color:var(--muted);margin-bottom:12px">El inventario se reintegrará.</p>'}
     <label>Motivo de la anulación</label>
     <input id="anular-motivo" type="text" maxlength="255" placeholder="Ej: Error en datos del cliente" style="width:100%;box-sizing:border-box">
     ${puedeDevolver?`<label style="display:flex;align-items:flex-start;gap:8px;margin-top:14px;font-size:13px;cursor:pointer;color:var(--ink)"><input type="checkbox" id="anular-devolver" style="width:auto;margin:2px 0 0 0;flex-shrink:0"><span>Devolver a pedido<br><span style="font-size:11.5px;color:var(--muted)">Queda un pedido abierto con los mismos productos para volver a facturarla.</span></span></label>`:(tieneAbonos?`<p style="font-size:11.5px;color:var(--muted-2);margin-top:12px;margin-bottom:0">Esta factura tiene abonos/cobros registrados, por eso no se puede devolver a pedido.</p>`:'')}`,
    ()=>{
      const motivo=($('#anular-motivo')?.value||'').trim();
      if(!motivo){toast('Escribí el motivo de la anulación',null,true);return false;}
      const devolver=!!($('#anular-devolver')?.checked);
      anularFacturaReal(id,motivo,devolver);
    });
}
window.abrirAnular=abrirAnular;

// Anula la factura: primero en EcoFactura (si es real), luego en el sistema
async function anularFacturaReal(id,motivo,devolverAPedido){
  if(!canAnular()){toast('Sin permiso','Tu rol no puede anular',true);return;}
  const f=documentos.find(d=>d.id===id);
  if(!f)return;
  const esRealFEL=f.autorizacion && !String(f.autorizacion).startsWith('SIM-');

  // Si es factura real certificada, anular primero en EcoFactura
  if(esRealFEL && typeof FEL_BACKEND_URL!=='undefined' && !FEL_BACKEND_URL.includes('TU-BACKEND')){
    toast('⏳ Anulando en EcoFactura...','Conectando con SAT (puede tardar un momento)');
    try{
      const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/anular',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({uuid:f.autorizacion,motivo})
      });
      const data=await r.json();
      if(!(r.ok && data.ok)){
        const msg=data.mensaje||data.error||'No se pudo anular';
        toast('✗ EcoFactura no anuló la factura',msg,true);
        logAudit('Error al anular','('+(f.serie||'')+'-'+(f.numeroDte||'')+') '+msg);
        return; // NO cambiamos nada si EcoFactura rechazó
      }
      // Guardar el PDF/XML de anulación que devuelve EcoFactura (si vino)
      // para que en el sistema se vea el documento anulado, no el original.
      if(data.pdfBase64){
        f.pdfAnulacionBase64=data.pdfBase64;
      }
      if(data.xmlBase64){
        f.xmlAnulacionBase64=data.xmlBase64;
      }
      // Descargar el PDF de anulación que devuelve EcoFactura (si vino)
      if(data.pdfBase64){
        try{
          const bytes=atob(data.pdfBase64);
          const arr=new Uint8Array(bytes.length);
          for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
          const blob=new Blob([arr],{type:'application/pdf'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');
          a.href=url;
          a.download='Anulacion-'+(f.serie||'')+'-'+(f.numeroDte||f.numero)+'.pdf';
          document.body.appendChild(a);a.click();document.body.removeChild(a);
          setTimeout(()=>URL.revokeObjectURL(url),1000);
        }catch(e){console.error('No se pudo descargar el PDF de anulación:',e);}
      }
    }catch(err){
      toast('✗ No se pudo conectar con el servidor FEL','¿Está el backend andando? '+err.message,true);
      return;
    }
  }

  // EcoFactura confirmó (o era simulada): anular en el sistema y reintegrar inventario
  if(f.inventarioRebajado){
    f.items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,it.cantidad,it.modoVenta);});
    f.inventarioRebajado=false;
  }
  f.estado='anulada';f.motivo=motivo;f.anuladoFecha=new Date().toISOString();f.anuladoPor=currentUser;
  if(typeof guardarDocumento==='function')await guardarDocumento(f);
  logAudit('Factura anulada',(f.serie?f.serie+'-'+f.numeroDte:refPed(f))+' · '+motivo);
  // Opción A: devolver a pedido SOLO si no tiene abonos y tiene items
  let pedNum=null;
  if(devolverAPedido && !(f.abonos||[]).length && (f.items||[]).length){
    const nuevoId=-Date.now();
    const ped={id:nuevoId,numero:corr,tipoDoc:'pedido',clienteId:f.clienteId,clienteNombre:f.clienteNombre,clienteComercial:f.clienteComercial,clienteNit:f.clienteNit,
      vendedorId:f.vendedorId,vendedorNombre:f.vendedorNombre,subVendedorNombre:f.subVendedorNombre||null,
      items:f.items.map(it=>({...it})),totales:{...f.totales},estado:'abierto',inventarioRebajado:true,
      creada:new Date().toISOString(),ordenCompra:f.ordenCompra||'',observaciones:f.observaciones||'',notaInterna:f.notaInterna||'',
      nitFacturado:f.nitFacturado,nombreFacturado:f.nombreFacturado,origenAnulacionId:f.id,_nuevo:true};
    // la anulación reintegró el inventario; el pedido nuevo lo vuelve a reservar
    ped.items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,-it.cantidad,it.modoVenta);});
    documentos.push(ped);corr++;pedNum=ped.numero;
    logAudit('Factura devuelta a pedido',(f.serie?f.serie+'-'+f.numeroDte:refPed(f))+' → PED-'+padn(ped.numero));
    if(typeof guardarDocumento==='function')await guardarDocumento(ped);
  }
  closeMod();renderDocs();
  if(pedNum!=null)toast('✓ Factura anulada y devuelta a pedido','PED-'+padn(pedNum)+' · abierto para volver a facturar');
  else toast('✓ Factura anulada',esRealFEL?'Anulada ante SAT · '+(f.serie||''):'Inventario reingresado');
}
window.anularFacturaReal=anularFacturaReal;

window.anular=id=>{const f=documentos.find(d=>d.id===id);if(f.inventarioRebajado){f.items.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,it.cantidad,it.modoVenta);});f.inventarioRebajado=false;}
  f.estado='anulada';f.anuladoFecha=new Date().toISOString();f.anuladoPor=currentUser;closeMod();renderDocs();toast('✓ Anulado','Inventario reingresado');logAudit('Documento anulado',(f.serie?f.serie+'-'+f.numeroDte:refPed(f)));if(typeof guardarDocumento==='function')guardarDocumento(f);};
window.editarPedido=id=>{const f=documentos.find(d=>d.id===id);if(f.tipoDoc!=='pedido'||f.estado!=='abierto')return;
  editId=id;editOldMap={};f.items.forEach(it=>editOldMap[it.id]={q:it.cantidad,modo:it.modoVenta});
  cart=f.items.map(it=>({...it}));
  initForm();
  const cli=clientes.find(c=>c.id===f.clienteId);
  if(cli){$('#f-cli').value=String(cli.id);$('#f-cli-search').value=`${cli.nombre} · ${cli.nit}`;actualizarVendedorInfo(cli);poblarSelectorNitPedido(cli,f.nitFacturado);}
  if(f.subVendedorNombre&&$('#f-subvend')){$('#f-subvend').value=f.subVendedorNombre;}
  $('#f-oc').value=f.ordenCompra||'';$('#f-obs').value=f.observaciones||'';if($('#f-nota'))$('#f-nota').value=f.notaInterna||'';
  go('pedido');render();toast('Editando PED-'+padn(f.numero),'Ajustá productos o cliente y guardá');};
window.cancelarEdicion=()=>{editId=null;editOldMap={};cart=[];if($('#f-cli'))$('#f-cli').value='';if($('#f-cli-search'))$('#f-cli-search').value='';if(typeof actualizarVendedorInfo==='function')actualizarVendedorInfo(null);$('#f-oc').value='';$('#f-obs').value='';if($('#f-nota'))$('#f-nota').value='';if($('#f-subvend'))$('#f-subvend').value='';if($('#f-subvend-wrap'))$('#f-subvend-wrap').style.display='none';if($('#f-nit-wrap'))$('#f-nit-wrap').style.display='none';render();go('documentos');};
window.regresar=id=>{const f=documentos.find(d=>d.id===id);if(!['envio','prestamo'].includes(f.tipoDoc)||f.estado!=='pendiente')return;
  Object.assign(f,{tipoDoc:'pedido',estado:'abierto'});delete f.autorizacion;delete f.serie;delete f.numeroDte;
  closeMod();renderDocs();
  toast('✓ Regresado a pedido',refPed(f)+' · ahora podés editarlo o facturarlo de nuevo');};

// ---- Nota de Crédito ----
function openNotaCD(facturaId){
  const f=documentos.find(d=>d.id===facturaId);
  const ai=arInfo(f);const hoy=fechaHoyGT();
  const maxCred=Math.max(0,ai.totalAjustado);
  openMod('Nota de Crédito · '+f.serie+'-'+f.numeroDte,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">${f.clienteComercial||f.clienteNombre} · Total: <b style="color:var(--ink)">${money(f.totales.total)}</b>${ai.cr?` · Saldo ajustado: <b>${money(ai.totalAjustado)}</b>`:''}</p>
     <div class="row"><div><label>Monto de la nota</label><input id="cd-monto" type="number" step="0.01" value="${Math.min(maxCred,f.totales.total).toFixed(2)}"></div><div><label>Fecha</label><input id="cd-fecha" type="date" value="${hoy}"></div></div>
     <label>Motivo</label><textarea id="cd-motivo" rows="3" placeholder="Ej. devolución de mercadería, descuento por daño, corrección de precio…" style="resize:vertical"></textarea>
     <div class="note n-danger" id="cd-err" style="display:none;margin-top:10px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const monto=Number($('#cd-monto').value);const motivo=$('#cd-motivo').value.trim();
      if(!(monto>0)){$('#cd-err').style.display='flex';$('#cd-err').querySelector('span').textContent='El monto debe ser mayor a cero';return;}
      if(monto>maxCred+0.001){$('#cd-err').style.display='flex';$('#cd-err').querySelector('span').textContent='La nota de crédito no puede superar '+money(maxCred);return;}
      if(!motivo){$('#cd-err').style.display='flex';$('#cd-err').querySelector('span').textContent='El motivo es obligatorio';return;}
      crearNotaCD(f,monto,motivo,$('#cd-fecha').value||hoy);
    });
}
window.openNotaCD=openNotaCD;
async function crearNotaCD(f,monto,motivo,fecha){
  const uuid='SIM-'+Math.random().toString(36).slice(2,10).toUpperCase();
  // Id temporal negativo (no puede chocar con un id real de la base). El número
  // de DTE simulado se deriva del correlativo, que es estable y no depende del id.
  const nuevoIdNC=-Date.now();
  const doc={id:nuevoIdNC,numero:corr,tipoDoc:'notaCredito',clienteId:f.clienteId,clienteNombre:f.clienteNombre,clienteComercial:f.clienteComercial,clienteNit:f.clienteNit,
    items:[],totales:{total:monto,baseSinIva:monto/1.12,iva:monto-monto/1.12},estado:'certificada',
    autorizacion:uuid,serie:uuid.slice(4),numeroDte:String(1000000000+corr),
    creada:new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha)?fecha+'T12:00:00':fecha).toISOString(),facturaOrigenId:f.id,motivo,creadoPor:currentUser,_nuevo:true};
  documentos.push(doc);corr++;
  // Esperamos el id real antes de seguir, para que los botones no queden con el temporal
  if(typeof guardarDocumento==='function')await guardarDocumento(doc);
  const nuevo=arInfo(f);f.estadoPago=nuevo.estado;
  closeMod();renderDocs();
  toast('✓ Nota de Crédito generada',money(monto)+' · saldo de la factura: '+money(nuevo.saldo));
  logAudit('Nota de crédito','Factura '+f.serie+'-'+f.numeroDte+' · '+money(monto)+' · Motivo: '+motivo);
}
window.crearNotaCD=crearNotaCD;
window.anularNotaCD=id=>{const d=documentos.find(x=>x.id===id);if(!d)return;
  d.estado='anulada';d.anuladoPor=currentUser;d.anuladoFecha=new Date().toISOString();
  if(typeof guardarDocumento==='function')guardarDocumento(d);
  const f=documentos.find(x=>x.id===d.facturaOrigenId);
  if(f){const nuevo=arInfo(f);f.estadoPago=nuevo.estado;toast('✓ '+(TIPO_LBL[d.tipoDoc]||['Documento'])[0]+' anulada','Saldo de la factura recalculado: '+money(nuevo.saldo));}
  else toast('✓ '+(TIPO_LBL[d.tipoDoc]||['Documento'])[0]+' anulada');
  renderDocs();};

function notaPrestamoHTML(f){
  const cli=clientes.find(c=>c.id===f.clienteId)||{};
  const dir=cli.direccion||'';
  const razon=f.clienteNombre||f.clienteComercial||'Cliente';
  const comercial=(f.clienteComercial&&f.clienteComercial!==razon)?f.clienteComercial:'';
  const fechaLarga=f.creada?fdate(f.creada):'';
  const firmante='Gerencia General';
  const filas=(f.items||[]).map(it=>`<tr>
      <td class="num" style="padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #EEF1E8">${it.codigo||'—'}</td>
      <td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #EEF1E8">${it.nombre}</td>
      <td class="num" style="padding:12px 16px;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #EEF1E8">${Number(it.cantidad).toFixed(2)}</td>
      <td class="num" style="padding:12px 16px;font-size:13px;text-align:right;border-bottom:1px solid #EEF1E8">${money(Number(it.precio)||0)}</td>
    </tr>`).join('');
  return `
  <div style="font-family:'Inter',sans-serif;color:#1c1f17;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
      <div>
        <img src="${SEFE_MARCA.logo}" alt="${SEFE_MARCA.razonSocial}" style="width:172px;height:auto;display:block">
        <div style="font-size:11px;color:#7a7f6e;margin-top:10px;line-height:1.5">${SEFE_MARCA.razonSocial}<br>NIT ${SEFE_MARCA.nit} · ${SEFE_MARCA.ciudadPais}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="display:inline-block;background:var(--green);color:#fff;font-family:var(--disp);font-weight:600;font-size:14px;letter-spacing:.3px;padding:8px 16px;border-radius:8px">NOTA DE PRÉSTAMO</div>
        <div style="margin-top:14px;font-size:12px;color:#7a7f6e">Referencia</div>
        <div style="font-family:var(--disp);font-size:20px;font-weight:700;letter-spacing:-.3px">${refPed(f)}</div>
        <div style="margin-top:10px;font-size:12px;color:#3a3f33">Guatemala, ${fechaLarga}</div>
      </div>
    </div>
    <div style="height:3px;background:var(--lime);width:100%;border-radius:2px;margin:22px 0 26px"></div>
    <div style="font-size:13.5px;line-height:1.6">
      <div style="font-size:11px;font-weight:700;color:#9aa089;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Señores</div>
      <div style="font-family:var(--disp);font-size:16px;font-weight:700">${razon}${f.sede?` · ${String(f.sede).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}`:""}</div>
      ${comercial?`<div style="color:#3a3f33">${comercial}</div>`:''}
      ${dir?`<div style="color:#3a3f33">${dir}</div>`:''}
      <div style="color:#7a7f6e;margin-top:2px">Presente.</div>
    </div>
    <p style="font-size:13.5px;line-height:1.7;color:#3a3f33;margin-top:22px">Estimados señores:</p>
    <p style="font-size:13.5px;line-height:1.7;color:#3a3f33;margin-top:10px">Por este medio hacemos de su conocimiento que se instaló en su establecimiento el siguiente equipo, propiedad de Soluciones Efectivas:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:18px;border:1px solid #E1E6D6;border-radius:10px;overflow:hidden">
      <thead><tr style="background:var(--green);color:#fff">
        <th style="text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 16px;width:120px">Código</th>
        <th style="text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 16px">Producto</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 16px;width:100px">Cantidad</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 16px;width:120px">Valor unitario</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="font-size:12.5px;line-height:1.7;color:#3a3f33;margin-top:20px">Este equipo es <b style="color:var(--green)">propiedad de Soluciones Efectivas</b> y se entrega en calidad de préstamo por el consumo de nuestros productos. Deberá ser devuelto en el momento en que la relación comercial finalice.</p>
    <div style="margin-top:18px;border:1px solid #DCE6C9;background:#F4F8EA;border-radius:12px;padding:16px 20px">
      <div style="font-family:var(--disp);font-size:13px;font-weight:700;color:var(--green);letter-spacing:.2px;margin-bottom:7px">Garantía del equipo</div>
      <p style="font-size:12.5px;line-height:1.65;color:#3a3f33">El equipo tiene garantía por desperfectos de fabricación, exceptuando si el daño es causado por el mal uso del equipo, en cuyo caso el cliente se hará cargo de acuerdo al valor del mismo.</p>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px dashed #C9D6AD">
        <span style="font-size:11px;font-weight:700;color:#7a7f6e;text-transform:uppercase;letter-spacing:.5px">Costo total del equipo</span>
        <span class="num" style="font-family:var(--disp);font-size:19px;font-weight:700;color:var(--green);letter-spacing:-.3px">${money(f.totales.total)}</span>
      </div>
    </div>
    <p style="font-size:13px;line-height:1.7;color:#3a3f33;margin-top:24px">Agradeciendo de antemano su atención, me suscribo.</p>
    <p style="font-size:13px;color:#3a3f33;margin-top:18px">Atentamente,</p>
    <div style="margin-top:30px"><div style="width:240px;border-top:1.5px solid #1c1f17;padding-top:7px">
      <div style="font-family:var(--disp);font-size:14px;font-weight:700">${firmante}</div>
      <div style="font-size:11.5px;color:#7a7f6e">${SEFE_MARCA.razonSocial}</div>
    </div></div>
    <div style="margin-top:46px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:26px">
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Firma de quien recibe</div></div>
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Nombre de quien recibe</div></div>
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Fecha de recepción</div></div>
    </div>
  </div>`;
}
function notaEnvioHTML(f){
  const cli=clientes.find(c=>c.id===f.clienteId)||{};
  const razon=f.clienteNombre||f.clienteComercial||'Cliente';
  const comercial=(f.clienteComercial&&f.clienteComercial!==razon)?f.clienteComercial:'';
  // Dirección de entrega si existe, si no la de facturación
  const dirFiscal=cli.direccion||'';
  const dirEntrega=cli.direccionEntrega||dirFiscal;
  const cc=cli.contactoCompras||{};
  const fechaLarga=f.creada?fdate(f.creada):'';
  const firmante='Gerencia General';
  let totalGen=0;
  const filas=(f.items||[]).map(it=>{
    const cant=Number(it.cantidad)||0;
    const pu=Number(it.precio)||0;
    const tot=cant*pu-(Number(it.descuento)||0);
    totalGen+=tot;
    return `<tr>
      <td class="num" style="padding:11px 14px;font-size:12.5px;font-weight:600;border-bottom:1px solid #EEF1E8">${it.codigo||'—'}</td>
      <td style="padding:11px 14px;font-size:12.5px;border-bottom:1px solid #EEF1E8">${it.nombre}</td>
      <td class="num" style="padding:11px 14px;font-size:12.5px;text-align:right;font-weight:600;border-bottom:1px solid #EEF1E8">${cant.toFixed(2)}</td>
      <td class="num" style="padding:11px 14px;font-size:12.5px;text-align:right;border-bottom:1px solid #EEF1E8">${money(pu)}</td>
      <td class="num" style="padding:11px 14px;font-size:12.5px;text-align:right;font-weight:600;border-bottom:1px solid #EEF1E8">${money(tot)}</td>
    </tr>`;
  }).join('');
  return `
  <div style="font-family:'Inter',sans-serif;color:#1c1f17;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
      <div>
        <img src="${SEFE_MARCA.logo}" alt="${SEFE_MARCA.razonSocial}" style="width:172px;height:auto;display:block">
        <div style="font-size:11px;color:#7a7f6e;margin-top:10px;line-height:1.5">${SEFE_MARCA.razonSocial}<br>NIT ${SEFE_MARCA.nit} · ${SEFE_MARCA.ciudadPais}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="display:inline-block;background:var(--green);color:#fff;font-family:var(--disp);font-weight:600;font-size:14px;letter-spacing:.3px;padding:8px 16px;border-radius:8px">NOTA DE ENVÍO</div>
        <div style="margin-top:14px;font-size:12px;color:#7a7f6e">Referencia</div>
        <div style="font-family:var(--disp);font-size:20px;font-weight:700;letter-spacing:-.3px">${refPed(f)}</div>
        <div style="margin-top:10px;font-size:12px;color:#3a3f33">Guatemala, ${fechaLarga}</div>
      </div>
    </div>
    <div style="height:3px;background:var(--lime);width:100%;border-radius:2px;margin:22px 0 26px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div style="font-size:13px;line-height:1.55">
        <div style="font-size:11px;font-weight:700;color:#9aa089;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Cliente</div>
        <div style="font-family:var(--disp);font-size:15px;font-weight:700">${razon}</div>
        ${comercial?`<div style="color:#3a3f33">${comercial}</div>`:''}
        ${cli.nit?`<div style="color:#7a7f6e;font-size:12px;margin-top:2px">NIT ${cli.nit}</div>`:''}
      </div>
      <div style="font-size:13px;line-height:1.55;background:#F4F8EA;border:1px solid #DCE6C9;border-radius:12px;padding:14px 18px">
        <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">🚚 Entregar en</div>
        <div style="color:#3a3f33">${dirEntrega||'—'}</div>
        ${cc.nombre?`<div style="color:#7a7f6e;font-size:12px;margin-top:6px">Contacto: ${cc.nombre}${cc.telefono?' · ☎ '+cc.telefono:''}</div>`:''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:22px;border:1px solid #E1E6D6;border-radius:10px;overflow:hidden">
      <thead><tr style="background:var(--green);color:#fff">
        <th style="text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px;width:110px">Código</th>
        <th style="text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px">Producto</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px;width:90px">Cantidad</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px;width:110px">P. Unitario</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px;width:120px">Total</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr>
        <td colspan="4" style="padding:12px 14px;text-align:right;font-size:12px;font-weight:700;color:#7a7f6e;text-transform:uppercase;letter-spacing:.5px">Total</td>
        <td class="num" style="padding:12px 14px;text-align:right;font-family:var(--disp);font-size:16px;font-weight:700;color:var(--green)">${money(totalGen)}</td>
      </tr></tfoot>
    </table>
    ${f.observaciones?`<div style="margin-top:16px;font-size:12.5px;color:#3a3f33"><b>Observaciones:</b> ${f.observaciones}</div>`:''}
    <p style="font-size:12px;line-height:1.6;color:#7a7f6e;margin-top:22px">Documento no tributario para control de despacho y entrega de mercadería. No genera crédito fiscal. Verifique las cantidades al momento de recibir.</p>
    <div style="margin-top:24px"><div style="width:240px;border-top:1.5px solid #1c1f17;padding-top:7px">
      <div style="font-family:var(--disp);font-size:14px;font-weight:700">${firmante}</div>
      <div style="font-size:11.5px;color:#7a7f6e">Entregado por · ${SEFE_MARCA.razonSocial}</div>
    </div></div>
    <div style="margin-top:52px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:26px">
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Firma de quien recibe</div></div>
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Nombre de quien recibe</div></div>
      <div style="text-align:center"><div style="border-top:1.2px solid #aeb3a2;padding-top:7px;font-size:11px;color:#7a7f6e">Fecha y hora de recepción</div></div>
    </div>
  </div>`;
}
let _docSedeId=null;
// Poner/cambiar la sede de una Nota de préstamo (texto libre; sale al lado del nombre).
function editarSedeNP(){
  const f=documentos.find(d=>d.id===_docSedeId);
  if(!f||f.tipoDoc!=='prestamo'){toast('Abrí una nota de préstamo primero',null,true);return;}
  const _esc=s=>String(s||'').replace(/"/g,'&quot;');
  openMod('Sede · '+refPed(f),
    `<label>Sede <span style="color:var(--muted);font-weight:400">(sale al lado del nombre; dejala vacía para quitarla)</span></label>
     <input id="np-sede" maxlength="120" value="${_esc(f.sede)}" placeholder="Ej. Zona 10, Bodega Central…" autocomplete="off">`,
    ()=>{
      f.sede=(($('#np-sede')?.value)||'').trim()||null;
      if(typeof guardarDocumento==='function')guardarDocumento(f);
      closeMod();
      $('#doc-sheet').innerHTML=notaPrestamoHTML(f);
      logAudit('Sede en NP',refPed(f)+' · '+(f.sede||'(sin sede)'));
      toast('✓ Sede actualizada',f.sede||'Sede quitada');
    });
}
window.editarSedeNP=editarSedeNP;
async function verDoc(id){
  const f=documentos.find(d=>d.id===id);
  // Botón "Sede" sólo para notas de préstamo; se oculta para el resto.
  const _sedeBtn=document.getElementById('doc-sede-btn');
  if(_sedeBtn)_sedeBtn.style.display=(f&&f.tipoDoc==='prestamo')?'':'none';
  if(f&&f.tipoDoc==='prestamo')_docSedeId=f.id;
  // El PDF oficial ya no viene en la carga inicial (pesaba 24 MB): si esta
  // factura tiene uno, se trae a pedido antes de decidir cómo mostrarla.
  if(f && !f.pdfBase64 && f.autorizacion && typeof asegurarPdfDoc==='function')await asegurarPdfDoc(f);

  // Si la factura tiene el PDF oficial de EcoFactura, mostrarlo directamente
  if(f.pdfBase64){
    const numeroTit=(f.serie?f.serie+'-'+f.numeroDte:refPed(f));
    const esAnulada=f.estado==='anulada';
    $('#doc-bar-t').textContent=TIPO_TIT[f.tipoDoc]+'  ·  '+numeroTit+(esAnulada?'  ·  ANULADA':'');
    // Si está anulada y EcoFactura devolvió el PDF de anulación, mostrar ese; si no, el original con aviso
    const pdfMostrar=(esAnulada&&f.pdfAnulacionBase64)?f.pdfAnulacionBase64:f.pdfBase64;
    const pdfUrl='data:application/pdf;base64,'+pdfMostrar;
    const nombreArch=(esAnulada?'Anulacion-':'Factura-')+(f.serie||'')+'-'+(f.numeroDte||f.numero)+'.pdf';
    const bannerAnulada=esAnulada?`<div style="background:#FDECEA;border:1.5px solid var(--danger);color:#B3261E;border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <svg viewBox="0 0 24 24" style="width:22px;height:22px;flex:none" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9 19.1 19.1"/></svg>
        <div><b>FACTURA ANULADA</b>${f.anuladoFecha?` · ${fdate(f.anuladoFecha)}`:''}${f.motivo?`<div style="font-size:12px;font-weight:500;margin-top:2px">Motivo: ${f.motivo}</div>`:''}${!f.pdfAnulacionBase64?`<div style="font-size:11.5px;color:#8A1C13;margin-top:3px">Se muestra la factura original. La anulación está registrada ante SAT.</div>`:''}</div>
      </div>`:'';
    $('#doc-sheet').innerHTML=`
      ${bannerAnulada}
      <div style="width:100%;height:82vh;background:#525659;border-radius:8px;overflow:hidden">
        <iframe src="${pdfUrl}#zoom=page-width&toolbar=1" style="width:100%;height:100%;border:none" title="Factura EcoFactura"></iframe>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--muted)">${esAnulada&&f.pdfAnulacionBase64?'Documento de anulación certificado por EcoFactura ante SAT':'Documento oficial certificado por EcoFactura ante SAT'} · Aut.: ${f.autorizacion}</span>
        <button class="btn btn-primary btn-sm" onclick="descargarFacturaPDF(${f.id})">⬇ Descargar PDF</button>
      </div>
      ${f.entregaInfo?`<div style="background:#fff;border-radius:10px;padding:20px 24px;margin-top:14px;color:#1a1a17">${reciboEntregaHTML(f)}</div>`:''}`;
    // Guardar referencia para imprimir/descargar
    window._pdfActual=pdfUrl;
    window._pdfNombre=nombreArch;
    $('#docov').classList.add('show');
    return;
  }
  window._pdfActual=null;
  window._pdfNombre=null;

  if(f.tipoDoc==='prestamo'){
    $('#doc-bar-t').textContent=TIPO_TIT[f.tipoDoc]+'  ·  PED-'+padn(f.numero);
    $('#doc-sheet').innerHTML=notaPrestamoHTML(f);
    $('#docov').classList.add('show');
    return;
  }
  if(f.tipoDoc==='envio'){
    $('#doc-bar-t').textContent=TIPO_TIT[f.tipoDoc]+'  ·  PED-'+padn(f.numero);
    $('#doc-sheet').innerHTML=notaEnvioHTML(f);
    $('#docov').classList.add('show');
    return;
  }

  const fiscal=FISCAL[f.tipoDoc];const cert=['certificada','facturado'].includes(f.estado);
  const esNotaCD=f.tipoDoc==='notaCredito';
  const origenDoc=f.facturaOrigenId?documentos.find(x=>x.id===f.facturaOrigenId):null;
  let stamp='';
  if(f.tipoDoc==='pedido')stamp=`<div class="ds-stamp" style="color:var(--purple)">PEDIDO · SIN FACTURAR</div>`;
  else if(f.estado==='anulada')stamp=`<div class="ds-stamp" style="color:var(--danger)">ANULADO</div>`;
  else if(!fiscal&&!esNotaCD)stamp=`<div class="ds-stamp" style="color:var(--muted)">DOCUMENTO NO TRIBUTARIO · NO GENERA CRÉDITO FISCAL</div>`;
  else if(!cert)stamp=`<div class="ds-stamp" style="color:var(--warn)">PENDIENTE DE CERTIFICAR</div>`;
  let felBox='';
  if(cert)felBox=`<div class="ds-fel"><div class="ft">Documento Tributario Electrónico Certificado</div><p>Número de autorización: <b>${f.autorizacion}</b><br>Serie: ${f.serie} &nbsp; Número: ${f.numeroDte}<br>Certificado por EcoFactura ante SAT</p>${f.pdfBase64?`<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="verFacturaPDF(${f.id})">📄 Ver PDF de la factura</button>`:''}</div>`;
  else if(f.tipoDoc==='pedido')felBox=`<div class="ds-foot">Pedido de venta. Facturalo o generá una nota de envío o préstamo desde Documentos.</div>`;
  else if(!fiscal)felBox=`<div class="ds-foot">${f.tipoDoc==='envio'?'Nota de envío para control de despacho. Puede facturarse posteriormente.':'Nota de préstamo de mercadería. Puede facturarse o devolverse.'}</div>`;
  const numeroTit=esNotaCD?(f.serie+'-'+f.numeroDte):(refPed(f));
  $('#doc-bar-t').textContent=TIPO_TIT[f.tipoDoc]+'  ·  '+numeroTit;
  const docTypeRef=esNotaCD?`Ref. ${f.serie} · ${f.numeroDte}${origenDoc?`<br>Aplica a: ${origenDoc.serie}-${origenDoc.numeroDte}`:''}`:(f.tipoDoc==='pedido'?'No. pedido: PED-'+padn(f.numero):'Pedido: PED-'+padn(f.numero)+(f.serie?`<br>Serie ${f.serie} · ${f.numeroDte}`:''));
  const tablaBody=esNotaCD?
    `<tr><td><b>Crédito aplicado a factura</b><br><span style="font-size:10px;color:var(--muted)">${f.motivo||''}</span></td><td style="text-align:center" class="num">1</td><td style="text-align:right" class="num">${money(f.totales.total)}</td><td style="text-align:right;font-weight:600" class="num">${money(f.totales.total)}</td></tr>`
    :f.items.map(it=>`<tr><td><b>${it.nombre}</b><br><span style="font-size:10px;color:var(--muted)">${it.codigo}</span></td><td style="text-align:center" class="num">${it.cantidad}</td><td style="text-align:right" class="num">${money(it.precio)}</td><td style="text-align:right;font-weight:600" class="num">${money(it.cantidad*it.precio-it.descuento)}</td></tr>`).join('');
  $('#doc-sheet').innerHTML=`
    <div class="ds-head">
      <div class="ds-emisor"><div class="ds-mk">${SEFE_MARCA.monograma}</div><div><h4>${SEFE_MARCA.nombreDoc}</h4><p>NIT: ${SEFE_MARCA.nit}<br>${SEFE_MARCA.ciudadDoc}</p></div></div>
      <div class="ds-doctype"><div class="dt">${TIPO_TIT[f.tipoDoc]}</div><p>${docTypeRef}</p></div>
    </div>${stamp}
    <div class="ds-meta">
      <div><div class="mt-l">Facturado a</div><div class="mt-v">${f.nombreFacturado||f.clienteNombre}</div><div class="mt-s">NIT: ${f.nitFacturado||f.clienteNit}</div>${f.nitFacturado?`<div class="mt-s" style="color:var(--muted-2);font-size:10.5px">Venta registrada a: ${f.clienteComercial||f.clienteNombre}</div>`:''}</div>
      <div style="text-align:right"><div class="mt-l">Fecha</div><div class="mt-v">${fdate(f.creada)}</div>${f.ordenCompra?`<div class="mt-s">OC: ${f.ordenCompra}</div>`:''}</div>
    </div>
    <table class="ds-table"><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${tablaBody}</tbody></table>
    <div class="ds-tot">
      ${(f.exenta||f.esExenta)?`<div class="r"><span style="color:var(--warn);font-weight:600">⚡ Exenta de IVA</span><span style="font-size:11px;color:var(--muted)">Esc.${f.escenarioExenta||f.escExenta} — ${ESCENARIOS_EXENTA?.find(e=>e.cod===(f.escenarioExenta||f.escExenta))?.desc||''}</span></div>
      <div class="r"><span>Base</span><span class="num">${money(f.totales.total)}</span></div>
      <div class="r"><span>IVA</span><span class="num" style="color:var(--muted)">Q 0.00 (Exenta)</span></div>`
      :`<div class="r"><span>Base (sin IVA)</span><span class="num">${money(f.totales.baseSinIva)}</span></div>
      <div class="r"><span>IVA (12%)</span><span class="num">${money(f.totales.iva)}</span></div>`}
      <div class="r big"><span>TOTAL</span><b class="num">${money(f.totales.total)}</b></div>
    </div>
    ${reciboEntregaHTML(f)}${f.notaInterna?`<div class="ds-internal" style="margin-top:12px;background:#FFF8E1;border:1px dashed #C9A227;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#7A5C00"><b>📌 Nota interna</b> (no aparece en factura): ${f.notaInterna}</div>`:''}
    ${felBox}`;
  $('#docov').classList.add('show');
}
window.verDoc=verDoc;

// Imprimir/descargar: si hay PDF oficial de EcoFactura, abrirlo; si no, imprimir la vista
// ============================================================
//  Esperar a que las imágenes estén listas antes de imprimir
// ============================================================
//  El logo va incrustado en el HTML como imagen en base64 (~40 KB).
//  Aunque no se descargue de internet, el navegador igual necesita un
//  momento para decodificarla. Si se llama a window.print() antes de
//  eso, el PDF sale SIN LOGO — y a la segunda sale bien, porque ya
//  quedó decodificada. De ahí el "hay que cerrar y volver a abrir".
//
//  Espera a que todas las imágenes del contenedor estén listas, más
//  dos cuadros de dibujo para que el navegador alcance a pintarlas.
//  Con tope de 3 segundos: si una imagen nunca carga, se imprime
//  igual en vez de dejar al usuario esperando para siempre.
function esperarImagenes(contenedor){
  const cont=contenedor||document;
  const imgs=Array.prototype.slice.call(cont.querySelectorAll('img'));
  const listas=imgs.map(img=>{
    if(img.complete && img.naturalWidth>0){
      return img.decode ? img.decode().catch(()=>{}) : Promise.resolve();
    }
    return new Promise(res=>{ img.onload=img.onerror=()=>res(); });
  });
  const pintado=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const tope=new Promise(r=>setTimeout(r,3000));
  return Promise.race([Promise.all(listas).then(pintado), tope]);
}
window.esperarImagenes=esperarImagenes;

async function imprimirDoc(){
  if(window._pdfActual){
    // Abrir el PDF oficial de EcoFactura en pestaña nueva (desde ahí se imprime/descarga)
    const w=window.open('','_blank');
    if(w){ w.document.write('<iframe src="'+window._pdfActual+'" style="width:100%;height:100%;border:none"></iframe>'); w.document.title='Factura EcoFactura'; }
    else { toast('Permití las ventanas emergentes para ver el PDF',null,true); }
  } else {
    // Sin esto el logo no alcanza a dibujarse y el PDF sale sin él.
    await esperarImagenes(document.getElementById('docov')||document);
    window.print();
  }
}
window.imprimirDoc=imprimirDoc;

// Descargar el PDF oficial de EcoFactura como archivo
async function descargarFacturaPDF(id){
  const f=documentos.find(d=>d.id===id);
  if(f && !(f.estado==='anulada' && f.pdfAnulacionBase64) && typeof asegurarPdfDoc==='function')await asegurarPdfDoc(f);
  const pdf=(f && f.estado==='anulada' && f.pdfAnulacionBase64)?f.pdfAnulacionBase64:(f&&f.pdfBase64);
  if(!f||!pdf){toast('Esta factura no tiene PDF',null,true);return;}
  try{
    const bytes=atob(pdf);
    const arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
    const blob=new Blob([arr],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=nombreArchivoFactura(f);
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('✓ PDF descargado',a.download);
  }catch(e){toast('Error al descargar',e.message,true);}
}
window.descargarFacturaPDF=descargarFacturaPDF;

// Arma el nombre del archivo: Factura-SERIE-CLIENTE.pdf (limpio para nombre de archivo)
function nombreArchivoFactura(f){
  const cli=(f.clienteComercial||f.clienteNombre||'Cliente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // quita acentos
    .replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/\s+/g,'_').slice(0,40); // limpia y acorta
  const serie=f.serie||'SF';
  const prefijo=(f.estado==='anulada'&&f.pdfAnulacionBase64)?'ANULADA-':'';
  return prefijo+'Factura-'+serie+'-'+cli+'.pdf';
}

// Bloque de comprobante de recepción / entrega en el PDF
function reciboEntregaHTML(f){
  const ei=f.entregaInfo;if(!ei)return '';
  const fechaEnt=fdatehora(ei.fecha);
  const modoTxt={efectivo:'Pagado en efectivo'+(ei.monto?' · '+money(ei.monto):''),cheque:'Pagado con cheque '+(ei.cheque||'')+(ei.banco?' ('+ei.banco+')':'')+(ei.monto?' · '+money(ei.monto):''),contrasena:'Contraseña de pago No. '+(ei.contrasena||''),credito:'Recibido a crédito'}[ei.modoPago]||'';
  return `<div style="margin-top:22px;border-top:1.5px dashed var(--line-strong);padding-top:16px">
    <div style="font-size:10px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Comprobante de recepción</div>
    <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap">
      <div style="flex:1;min-width:160px;font-size:11.5px;color:var(--muted)">
        <div>Entregado: <b style="color:var(--ink)">${fechaEnt}</b></div>
        <div>Piloto: <b style="color:var(--ink)">${ei.piloto||'—'}</b></div>
        ${modoTxt?`<div>Pago: <b style="color:var(--ink)">${modoTxt}</b></div>`:''}
        ${ei.recibe?`<div>Recibió: <b style="color:var(--ink)">${ei.recibe}</b></div>`:''}
        ${ei.observacion?`<div>Obs.: ${ei.observacion}</div>`:''}
      </div>
      ${ei.firma?`<div style="text-align:center">
        <img src="${ei.firma}" style="max-width:170px;max-height:75px;border-bottom:1.5px solid var(--ink)">
        <div style="font-size:10px;color:var(--muted-2);margin-top:3px">Firma de recepción</div>
      </div>`:''}
    </div>
  </div>`;
}
function closeDoc(){$('#docov').classList.remove('show');}
window.closeDoc=closeDoc;
$('#docov').onclick=e=>{if(e.target.id==='docov')closeDoc();};

function saldoCliente(c){return documentos.filter(d=>d.clienteId===c.id&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada').reduce((s,f)=>s+arInfo(f).saldo,0);}
// ── Saldo a favor del cliente (sobrepagos / anticipos) ──────
// Lo que ENTRÓ de crédito menos lo que ya se APLICÓ, sin anulados.
function saldoFavor(clienteId){
  if(clienteId==null)return 0;
  const cid=Number(clienteId);
  let s=0;
  (creditosCliente||[]).forEach(c=>{ if(c.anulado)return; if(Number(c.clienteId)!==cid)return;
    s += (c.tipo==='aplicacion' ? -Number(c.monto||0) : Number(c.monto||0)); });
  return Math.round(s*100)/100;
}
window.saldoFavor=saldoFavor;
function tcLabel(n){return n===0?'Contado':n+' días';}
function renderCli(){
  const acc=$('#cli-acciones');
  if(acc)acc.innerHTML=canCrearCliente()?`<button class="btn btn-ghost btn-sm" id="btn-nuevo-cli" onclick="openCli()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo</button>`+
    ` <button class="btn btn-ghost btn-sm" onclick="completarRazonSocial()" title="Consultar SAT y rellenar razón social de clientes que no la tienen" style="color:var(--blue)">Completar razón social</button>`:'';
  const listaBase=esVentas()?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;
  const filasCli=listaBase.slice().reverse().map(c=>{const saldo=saldoCliente(c);
  const esSede=!!c.sedesDe;const padre=esSede?clientes.find(x=>x.id===c.sedesDe):null;
  const nSedes=clientes.filter(x=>x.sedesDe===c.id).length;
  return `<tr style="cursor:pointer" onclick="abrirCliente(${c.id})">
    <td style="font-weight:600">${esSede?`<span style="color:var(--muted-2);font-size:11px;margin-right:4px">↳</span>`:''}${c.nombre}${nSedes?`<div style="font-size:10.5px;color:var(--blue);margin-top:2px">${nSedes} sede${nSedes!==1?'s':''}</div>`:''}${esSede?`<div style="font-size:10.5px;color:var(--muted-2);margin-top:2px">Sede de ${padre?.nombre||'—'}</div>`:''}
    </td>
    <td style="color:var(--muted)">${c.razonSocial||'—'}</td>
    <td class="num">${c.nit}</td>
    <td style="color:var(--muted)">${c.contactoPagos&&c.contactoPagos.nombre?`${c.contactoPagos.nombre}${c.contactoPagos.telefono?`<div style="font-size:10.5px;color:var(--muted-2);margin-top:1px">☎ ${c.contactoPagos.telefono}</div>`:''}`:'—'}</td>
    <td style="color:var(--muted);font-size:12px">${c.fechaAlta?fdate(c.fechaAlta):'—'}</td>
    <td>${tcLabel(c.tiempoCredito||0)}</td>
    <td class="num" style="font-weight:${saldo>0?'700':'400'};color:${saldo>0?'var(--warn)':'var(--muted-2)'}">${saldo>0?money(saldo):'—'}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();abrirCliente(${c.id})">Abrir</button></td>
  </tr>`;});renderPaginado('t-cli',filasCli,'Sin clientes');enhanceTable('t-cli');}

// ---- Detalle de cliente ----
let cliTab='precios',cliActual=null;
function abrirCliente(id){cliActual=id;cliTab='precios';
  document.querySelectorAll('.view').forEach(s=>s.classList.remove('active'));
  $('#v-clientedet').classList.add('active');
  $('#ttl').textContent='Cliente';$('#sub').textContent='Ficha integral del cliente';
  renderCliDet();
}
window.abrirCliente=abrirCliente;
function contactoCard(tit,c){return `<div class="panel" style="margin:0"><div class="panel-body" style="padding:15px 17px">
  <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:9px">${tit}</div>
  <div style="font-family:var(--disp);font-weight:600;font-size:14px">${c&&c.nombre?c.nombre:'—'}</div>
  <div style="font-size:12px;color:var(--muted);margin-top:5px">${c&&c.telefono?'☎ '+c.telefono:''}</div>
  <div style="font-size:12px;color:var(--muted)">${c&&c.correo?'✉ '+c.correo:''}</div></div></div>`;}
function clienteStats(c){
  // Cada cliente/sede maneja su propia cuenta (independiente): solo sus propias facturas.
  const facturas=documentos.filter(d=>d.clienteId===c.id&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada').sort((a,b)=>new Date(a.creada)-new Date(b.creada));
  const totalFacturado=facturas.reduce((s,f)=>s+f.totales.total,0);
  const totalCobrado=facturas.reduce((s,f)=>s+arInfo(f).abon,0);
  const saldoActual=facturas.reduce((s,f)=>s+arInfo(f).saldo,0);
  const vencidos=facturas.filter(f=>arInfo(f).vencido);
  const ultima=facturas.length?facturas[facturas.length-1].creada:null;
  let frecuencia=null;
  if(facturas.length>=2){const dias=facturas.map(f=>new Date(f.creada).getTime());let sum=0;for(let i=1;i<dias.length;i++)sum+=(dias[i]-dias[i-1]);frecuencia=Math.round(sum/(facturas.length-1)/86400000);}
  const pagadasConAbono=facturas.filter(f=>(f.abonos||[]).length&&arInfo(f).saldo<=0.001);
  let promPago=null;
  if(pagadasConAbono.length){const tot=pagadasConAbono.reduce((s,f)=>{const activos=(f.abonos||[]).filter(a=>!a.anulado);const ult=activos[activos.length-1];if(!ult)return s;const dp=(new Date(ult.fecha)-new Date(f.creada))/86400000;return s+Math.max(0,dp);},0);promPago=Math.round(tot/pagadasConAbono.length);}
  const buckets={c30:0,c60:0,c90:0,c90p:0};
  facturas.forEach(f=>{const ai=arInfo(f);if(ai.saldo<=0.001||!f.vencimiento)return;const dias=Math.floor((new Date()-new Date(f.vencimiento))/86400000);if(dias<=0)return;
    if(dias<=30)buckets.c30+=ai.saldo;else if(dias<=60)buckets.c60+=ai.saldo;else if(dias<=90)buckets.c90+=ai.saldo;else buckets.c90p+=ai.saldo;});
  const movimientos=[];
  facturas.forEach(f=>{
    // Se anota desde dónde arrancan los movimientos de ESTA factura,
    // para marcarlos todos al final del bloque sin tener que repetir
    // los datos en cada push.
    const _desde=movimientos.length;
    movimientos.push({fecha:f.creada,doc:f.serie+'-'+f.numeroDte,detalle:'Factura Cambiaria',cargo:f.totales.total,abono:0,mov:'factura'});
    (f.abonos||[]).forEach(a=>{
      if(a.anulado)movimientos.push({fecha:a.anuladoFecha||a.fecha,doc:refRecibo(a),detalle:`${esRetencion(a)?'Retención':'Abono'} ANULADO (${money(a.monto)} · ${a.motivoAnulacion||'sin motivo'})`,cargo:0,abono:0,mov:'abono'});
      // En una retención el método ya dice "Retención IVA/ISR", así que
      // se usa tal cual: anteponerle "Retención ·" lo dejaría repetido.
      else movimientos.push({fecha:a.fecha,doc:refRecibo(a),detalle:(esRetencion(a)?String(a.metodo||'Retención'):('Abono'+(a.metodo?' · '+a.metodo:'')))+(a.referencia?' ('+a.referencia+')':''),cargo:0,abono:Number(a.monto),mov:'abono'});
    });
    documentos.filter(d=>d.facturaOrigenId===f.id).forEach(n=>{
      if(n.estado==='anulada')movimientos.push({fecha:n.anuladoFecha||n.creada,doc:n.serie+'-'+n.numeroDte,detalle:`${(TIPO_LBL[n.tipoDoc]||['Documento'])[0]} ANULADA (${money(n.totales.total)} · ${n.motivo||'sin motivo'})`,cargo:0,abono:0,mov:'nota',docId:n.id});
      else if(n.tipoDoc==='notaCredito')movimientos.push({fecha:n.creada,doc:n.serie+'-'+n.numeroDte,detalle:'Nota de Crédito · '+(n.motivo||''),cargo:0,abono:n.totales.total,mov:'nota',docId:n.id});
    });
    // Marcar todo lo que salió de esta factura: la propia factura, sus
    // abonos y sus notas. Con esto se pueden agrupar después.
    for(let i=_desde;i<movimientos.length;i++){
      movimientos[i].fFac=f.creada;      // fecha de emisión de la factura
      movimientos[i].idFac=f.id;
      movimientos[i].esFac=(i===_desde); // la factura encabeza su grupo
    }
  });
  // Los abonos van PEGADOS A SU FACTURA, y los grupos se ordenan por la
  // fecha de emisión de la factura.
  //
  // Antes era una lista plana por fecha: un abono de julio quedaba lejos
  // de la factura de junio que estaba pagando, y había que ir cruzando
  // renglones para entender qué pagaba qué.
  movimientos.sort((a,b)=>
    (new Date(a.fFac||0)-new Date(b.fFac||0))          // por fecha de la factura
    || ((a.idFac||0)-(b.idFac||0))                     // desempate estable
    || ((b.esFac?1:0)-(a.esFac?1:0))                   // la factura, arriba de su grupo
    || (new Date(a.fecha||0)-new Date(b.fecha||0))     // y sus movimientos por fecha
  );
  // El saldo corrido se calcula DESPUÉS de ordenar, en el mismo orden en
  // que se va a leer. Al revés, la columna no cuadraría con la pantalla.
  let bal=0;movimientos.forEach(m=>{bal+=m.cargo-m.abono;m.balance=bal;});
  return {facturas,totalFacturado,totalCobrado,saldoActual,vencidos,ultima,frecuencia,promPago,buckets,movimientos};
}
// ¿Este cliente es un principal (paraguas) con sedes?
function esPrincipal(c){return clientes.some(x=>x.sedesDe===c.id);}
// Devuelve las sedes de un principal
function obtenerSedes(c){return clientes.filter(x=>x.sedesDe===c.id).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));}
// Estadísticas consolidadas del grupo (principal + todas sus sedes)
function grupoStats(principal){
  const sedes=obtenerSedes(principal);
  // El principal es paraguas: el grupo son sus sedes (y el principal mismo por si tuviera facturas sueltas)
  const miembros=[principal,...sedes];
  let totalFacturado=0,totalCobrado=0,saldoActual=0,vencidosN=0;
  const buckets={c30:0,c60:0,c90:0,c90p:0};
  const porSede=miembros.map(m=>{
    const st=clienteStats(m);
    totalFacturado+=st.totalFacturado;
    totalCobrado+=st.totalCobrado;
    saldoActual+=st.saldoActual;
    vencidosN+=st.vencidos.length;
    buckets.c30+=st.buckets.c30;buckets.c60+=st.buckets.c60;buckets.c90+=st.buckets.c90;buckets.c90p+=st.buckets.c90p;
    return {cliente:m,st,esPrincipal:m.id===principal.id};
  }).filter(x=>x.esPrincipal?x.st.totalFacturado>0||sedes.length===0:true); // ocultar el principal si no compra
  return {sedes,porSede,totalFacturado,totalCobrado,saldoActual,vencidosN,buckets};
}
function fichaIntegral(c,st){
  const k=(lbl,val,sub,color)=>`<div class="kpi"><div class="k-lbl">${lbl}</div><div class="k-val num" style="${color?'color:'+color:''}">${val}</div>${sub?`<div class="k-sub">${sub}</div>`:''}</div>`;
  const kpis=[
    k('Total facturado',money(st.totalFacturado),st.facturas.length+' Factura(s) Cambiaria(s)'),
    k('Total cobrado',money(st.totalCobrado)),
    k('Saldo actual',money(st.saldoActual),null,st.saldoActual>0?'var(--warn)':'var(--ok)'),
    (saldoFavor(c.id)>0.001?k('Saldo a favor',money(saldoFavor(c.id)),'a aplicar en próximas facturas','var(--ok)'):''),
    k('Documentos vencidos',st.vencidos.length,st.vencidos.length?'requiere gestión':'al día',st.vencidos.length?'var(--danger)':'var(--ok)'),
    k('Última compra',st.ultima?fdate(st.ultima):'—'),
    k('Frecuencia de compra',st.frecuencia?'cada '+st.frecuencia+' días':'—'),
    k('Promedio días de pago',st.promPago!=null?st.promPago+' días':'—'),
    k('Tiempo de crédito',tcLabel(c.tiempoCredito||0)),
  ];
  const maxB=Math.max(1,st.buckets.c30,st.buckets.c60,st.buckets.c90,st.buckets.c90p);
  const ageRow=(lbl,v,color)=>`<div class="hbar-row"><div class="hbar-name">${lbl}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v/maxB*100)}%;background:${color}"></div></div><div class="hbar-val num">${money(v)}</div></div>`;
  const hayMora=st.buckets.c30+st.buckets.c60+st.buckets.c90+st.buckets.c90p>0;
  // Del más viejo al más nuevo, que es como se lee un estado de cuenta.
  //
  // Antes se mostraba al revés, y eso rompía la columna de Saldo: el
  // saldo corrido se calcula sumando en orden cronológico (ver
  // clienteStats), así que listado de nuevo a viejo cada fila mostraba
  // un acumulado que no correspondía a lo que se venía leyendo. El
  // encabezado ya decía "orden cronológico"; ahora es cierto.
  // Acciones por fila: ver/imprimir la factura o la nota; ver los abonos.
  const _accMov=m=>{
    if(m.mov==='factura')return `<button class="btn btn-ghost btn-sm" onclick="verDoc(${m.idFac})">Ver</button><button class="btn btn-ghost btn-sm" onclick="descargarFacturaPDF(${m.idFac})" title="Descargar PDF">PDF</button>`;
    if(m.mov==='nota')return `<button class="btn btn-ghost btn-sm" onclick="verDoc(${m.docId})">Ver</button><button class="btn btn-ghost btn-sm" onclick="descargarFacturaPDF(${m.docId})" title="Descargar PDF">PDF</button>`;
    if(m.mov==='abono')return `<button class="btn btn-ghost btn-sm" onclick="openHistorialAbonos(${m.idFac})">Ver abono</button>`;
    return '';
  };
  const movRows=st.movimientos.length?st.movimientos.map(m=>`<tr>
      <td style="color:var(--muted)">${fdate(m.fecha)}</td>
      <td style="font-weight:600">${m.doc}</td>
      <td style="color:var(--muted)">${m.detalle}</td>
      <td class="num" style="color:${m.cargo?'var(--ink)':'var(--muted-2)'}">${m.cargo?money(m.cargo):'—'}</td>
      <td class="num" style="color:${m.abono?'var(--ok)':'var(--muted-2)'}">${m.abono?money(m.abono):'—'}</td>
      <td class="num" style="font-weight:700;color:${m.balance>0?'var(--warn)':'var(--ok)'}">${money(m.balance)}</td>
      <td><div class="acts">${_accMov(m)}</div></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Sin movimientos todavía</td></tr>';
  return `<div class="panel"><div class="panel-head"><h3>Estado de cuenta</h3></div><div class="panel-body">
    <div class="kpis" style="margin-bottom:${hayMora?'16px':'0'}">${kpis.join('')}</div>
    ${hayMora?`<div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Antigüedad de saldos</div>
    ${ageRow('0–30 días',st.buckets.c30,'var(--warn)')}${ageRow('31–60 días',st.buckets.c60,'#D98A2B')}${ageRow('61–90 días',st.buckets.c90,'#C45A2C')}${ageRow('+90 días',st.buckets.c90p,'var(--danger)')}`:''}
  </div>
  <div style="border-top:1px solid var(--line)">
    <div style="padding:13px 20px 0;font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px">Movimientos (cada factura con sus abonos, por fecha de factura)</div>
    <div style="max-height:300px;overflow:auto">
      <table><thead><tr><th>Fecha</th><th>Documento</th><th>Detalle</th><th>Cargo</th><th>Abono</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>${movRows}</tbody></table>
    </div>
  </div></div>`;
}
// Vista consolidada del cliente PRINCIPAL (paraguas): total del grupo + desglose por sede
function renderGrupoConsolidado(c){
  const g=grupoStats(c);
  const k=(lbl,val,sub,color)=>`<div class="kpi"><div class="kpi-label">${lbl}</div><div class="kpi-value"${color?` style="color:${color}"`:''}>${val}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
  const kpis=[
    k('Saldo del grupo',money(g.saldoActual),g.sedes.length+' sede(s)',g.saldoActual>0?'var(--warn)':'var(--ok)'),
    k('Total facturado',money(g.totalFacturado)),
    k('Total cobrado',money(g.totalCobrado)),
    k('Facturas vencidas',g.vencidosN,g.vencidosN?'requiere gestión':'al día',g.vencidosN?'var(--danger)':'var(--ok)'),
  ].join('');
  const maxB=Math.max(1,g.buckets.c30,g.buckets.c60,g.buckets.c90,g.buckets.c90p);
  const ageRow=(lbl,v,color)=>`<div class="hbar-row"><div class="hbar-name">${lbl}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v/maxB*100)}%;background:${color}"></div></div><div class="hbar-val num">${money(v)}</div></div>`;
  const hayMora=g.buckets.c30+g.buckets.c60+g.buckets.c90+g.buckets.c90p>0;
  const filasSedes=g.porSede.map(x=>{
    const s=x.cliente, st=x.st;
    const etiqueta=x.esPrincipal?' <span class="badge b-muted" style="font-size:9px">Principal</span>':'';
    return `<tr style="cursor:pointer" onclick="abrirCliente(${s.id})">
      <td style="font-weight:600">${s.nombre}${etiqueta}<div style="font-size:10.5px;color:var(--muted)">${s.direccion||''}</div></td>
      <td class="num" style="color:var(--muted)">${money(st.totalFacturado)}</td>
      <td class="num" style="color:var(--ok)">${money(st.totalCobrado)}</td>
      <td class="num" style="font-weight:700;color:${st.saldoActual>0?'var(--warn)':'var(--muted-2)'}">${st.saldoActual>0?money(st.saldoActual):'—'}</td>
      <td class="num" style="color:${st.vencidos.length?'var(--danger)':'var(--muted-2)'}">${st.vencidos.length||'—'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();abrirCliente(${s.id})">Abrir</button></td>
    </tr>`;
  }).join('');
  const vend=c.vendedorId?vendedores.find(v=>v.id===c.vendedorId)?.nombre:null;
  $('#v-clientedet').innerHTML=`
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="go('clientes')">← Volver a clientes</button>
    <div class="panel"><div class="panel-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div style="font-family:var(--disp);font-size:22px;font-weight:700;letter-spacing:-.4px">${c.nombre} <span class="badge b-info" style="font-size:11px;vertical-align:middle">Grupo · ${g.sedes.length} sede${g.sedes.length!==1?'s':''}</span></div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">${c.razonSocial||''} · NIT ${c.nit}${vend?` · Vendedor: ${vend}`:''}</div>
        <div style="font-size:12px;color:var(--muted-2);margin-top:2px">Cliente paraguas — el detalle de compras y pagos se maneja en cada sede</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="estadoCuentaGrupoPDF(${c.id})" title="Estado de cuenta consolidado del grupo en PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>Estado de cuenta del grupo</button>
          ${canRegistrarAbono()?`<button class="btn btn-primary btn-sm" onclick="openPagoGlobalCliente(${(g.sedes[0]||c).id})"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Pago del grupo</button>`:''}
          ${canCrearCliente()?`<button class="btn btn-ghost btn-sm" onclick="openCliSede(${c.id})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar sede</button>`:''}
          ${canCrearCliente()?`<button class="btn btn-ghost btn-sm" onclick="openCli(${c.id})">Editar datos</button>`:''}
        </div>
      </div>
    </div></div>
    <div class="panel"><div class="panel-head"><h3>Estado de cuenta consolidado</h3></div><div class="panel-body">
      <div class="kpis" style="margin-bottom:${hayMora?'16px':'0'}">${kpis}</div>
      ${hayMora?`<div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Antigüedad de saldos (todo el grupo)</div>
      ${ageRow('0–30 días',g.buckets.c30,'var(--warn)')}${ageRow('31–60 días',g.buckets.c60,'#D98A2B')}${ageRow('61–90 días',g.buckets.c90,'#C45A2C')}${ageRow('+90 días',g.buckets.c90p,'var(--danger)')}`:''}
    </div></div>
    <div class="panel"><div class="panel-head"><h3>Sedes del grupo</h3><span style="font-size:12px;color:var(--muted)">Tocá una sede para ver su detalle</span></div>
      <table><thead><tr><th>Sede</th><th>Facturado</th><th>Cobrado</th><th>Saldo</th><th>Vencidas</th><th></th></tr></thead>
      <tbody>${filasSedes||'<tr><td colspan="6" class="empty">Sin sedes</td></tr>'}</tbody></table>
    </div>`;
}
// ---- Cobros: configuración y seguimiento de cobro del cliente ----
const DIAS_COBRO=[['lun','Lun'],['mar','Mar'],['mie','Mié'],['jue','Jue'],['vie','Vie'],['sab','Sáb'],['dom','Dom']];
const RESULT_SEG={pago:['Pagó','b-ok'],parcial:['Abono parcial','b-info'],promesa:['Prometió pago','b-warn'],noestaba:['No estaba','b-muted'],sinrespuesta:['Sin respuesta','b-muted'],reprogramado:['Reprogramado','b-info'],otro:['Otro','b-muted']};
function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function guardarCobroInfo(cliId){
  const c=clientes.find(x=>x.id===cliId);if(!c)return;
  const dias=Array.from(document.querySelectorAll('.co-dia:checked')).map(x=>x.value);
  c.cobroInfo={dias,horario:($('#co-horario')?.value||'').trim(),frecuencia:$('#co-frec')?.value||'',notas:($('#co-notas')?.value||'').trim()};
  if(typeof guardarCliente==='function')guardarCliente(c);
  logAudit('Config. de cobro actualizada',c.nombre);
  toast('✓ Configuración de cobro guardada',c.nombre);
}
window.guardarCobroInfo=guardarCobroInfo;
function agregarSeguimiento(cliId){
  const c=clientes.find(x=>x.id===cliId);if(!c)return;
  const fecha=$('#sg-fecha')?.value||fechaHoyGT();
  const resultado=$('#sg-result')?.value||'otro';
  const nota=($('#sg-nota')?.value||'').trim();
  const proximaFecha=$('#sg-prox')?.value||'';
  if(!nota&&!proximaFecha){toast('Falta información','Escribí una nota o una fecha de próximo seguimiento',true);return;}
  c.seguimientos=Array.isArray(c.seguimientos)?c.seguimientos:[];
  const nid=c.seguimientos.reduce((m,s)=>Math.max(m,s.id||0),0)+1;
  c.seguimientos.push({id:nid,fecha,resultado,nota,proximaFecha,usuario:currentUser,registrado:new Date().toISOString()});
  if(typeof guardarCliente==='function')guardarCliente(c);
  logAudit('Seguimiento de cobro',c.nombre+' · '+((RESULT_SEG[resultado]||[])[0]||resultado));
  renderCliDet();
  if(typeof actualizarBellRecordatorios==='function')actualizarBellRecordatorios();
  toast('✓ Seguimiento agregado',c.nombre);
}
window.agregarSeguimiento=agregarSeguimiento;
function borrarSeguimiento(cliId,segId){
  const c=clientes.find(x=>x.id===cliId);if(!c)return;
  c.seguimientos=(c.seguimientos||[]).filter(s=>s.id!==segId);
  if(typeof guardarCliente==='function')guardarCliente(c);
  renderCliDet();
  toast('Seguimiento eliminado');
}
window.borrarSeguimiento=borrarSeguimiento;

// ========== MÓDULO RECORDATORIOS (general, para todos) ==========
let recFiltro='pendientes';
const _escRec=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Recordatorios visibles para el usuario actual (admin ve todos; el resto los asignados a él o creados por él)
function recVisibles(){
  if(currentRole==='admin'||currentRole==='gerencia')return recordatorios.slice();
  // Las contraseñas de pago las ve TODO el mundo en el listado; el resto, solo propias/asignadas
  return recordatorios.filter(r=>r.tipo==='contrasena'||r.asignadoA===currentUser||r.creadoPor===currentUser);
}
// Recordatorios que DISPARAN notificación (campana/pop-up) para el usuario actual.
// Contraseñas de pago: notifican a admin/gerencia/cobros/contabilidad (+ creador/asignado); no a todos.
function recNotificables(){
  if(currentRole==='admin'||currentRole==='gerencia')return recordatorios.slice();
  const notifContra=currentRole==='cobros'||currentRole==='contabilidad';
  return recordatorios.filter(r=>r.tipo==='contrasena'
    ?(notifContra||r.asignadoA===currentUser||r.creadoPor===currentUser)
    :(r.asignadoA===currentUser||r.creadoPor===currentUser));
}
// Recordatorios pendientes de HOY o vencidos, del usuario actual (para la campana/pop-up)
function recordatoriosPendientesHoy(){
  const hoy=fechaHoyGT();
  return recNotificables().filter(r=>!r.hecho&&r.fechaVencimiento&&r.fechaVencimiento<=hoy)
    .sort((a,b)=>(a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||''));
}
window.setRecFiltro=function(f){recFiltro=f;document.querySelectorAll('#rec-tabs .ct-tab').forEach(b=>b.classList.toggle('on',b.dataset.f===f));renderRecordatorios();};
