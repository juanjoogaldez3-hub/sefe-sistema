function openRecibir(id){
  const c=compras.find(x=>x.id===id);
  openMod('Recibir mercadería · CMP-'+padn(c.id),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">${c.proveedorNombre} · Indicá cuánto llega ahora de cada producto.</p>
     <div class="li head" style="grid-template-columns:1fr 70px 70px 80px"><span>Producto</span><span>Pedido</span><span>Recibido</span><span>Llega ahora</span></div>
     ${c.items.map((it,i)=>{const pend=it.cantidad-(it.recibido||0);const prod=productos.find(x=>x.id===it.id);const esCaja=prod&&prod.tipoEmpaque==='caja_unidad';return `<div class="li" style="grid-template-columns:1fr 70px 70px 80px">
       <div><div class="nm">${it.nombre}${esCaja?' <span class="badge b-info" style="font-size:9px">en cajas</span>':''}</div><div class="sk">${it.codigo}</div></div>
       <div class="num" style="text-align:center">${it.cantidad}</div>
       <div class="num" style="text-align:center;color:var(--muted)">${it.recibido||0}</div>
       <input type="number" min="0" max="${pend}" value="${pend}" data-i="${i}" class="rec-in" style="text-align:center"></div>`;}).join('')}`,
    ()=>{let algo=false;
      document.querySelectorAll('#m-body .rec-in').forEach(inp=>{const i=Number(inp.dataset.i);let q=Number(inp.value)||0;const it=c.items[i];const pend=it.cantidad-(it.recibido||0);if(q>pend)q=pend;if(q>0){const p=productos.find(x=>x.id===it.id);if(p){if(p.tipoEmpaque==='caja_unidad')p.stockCajas=(p.stockCajas||0)+q;else p.stock+=q;if(typeof guardarProducto==='function')guardarProducto(p);}it.recibido=(it.recibido||0)+q;
        // Registrar quién y cuándo recibió (historial de recepciones para el cardex)
        it.recepciones=it.recepciones||[];
        it.recepciones.push({cantidad:q,fecha:new Date().toISOString(),recibidoPor:currentUser});
        algo=true;}});
      if(!algo){toast('No ingresaste cantidades a recibir',null,true);return;}
      const totRec=recRecibido(c),totPed=recTotal(c);
      c.estadoRecepcion=totRec>=totPed?'recibida':'parcial';
      closeMod();renderCompras();renderProd();
      toast('✓ Mercadería recibida','Inventario actualizado'+(c.estadoRecepcion==='recibida'?'':' (recepción parcial)'));
      logAudit('Mercadería recibida','CMP-'+padn(c.id)+' · '+c.proveedorNombre);
      if(typeof guardarCompra==='function')guardarCompra(c);});
}
window.openRecibir=openRecibir;
function openFacturaProv(id){
  const c=compras.find(x=>x.id===id);const hoy=fechaHoyGT();
  const prov=proveedores.find(p=>p.id===c.proveedorId);
  openMod('Registrar factura del proveedor · CMP-'+padn(c.id),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${c.proveedorNombre} · Total: <b style="color:var(--ink)">${money(c.total)}</b></p>
     <div class="row"><div><label>No. de factura del proveedor</label><input id="fp-doc" placeholder="FACT-…"></div><div><label>Fecha</label><input id="fp-fecha" type="date" value="${hoy}"></div></div>
     <div class="row"><div><label>Forma de pago</label><select id="fp-pago"><option value="contado">Contado (pagada)</option><option value="credito" ${prov.diasCredito>0?'selected':''}>Crédito</option></select></div><div id="fp-dias-wrap" style="${prov.diasCredito>0?'':'display:none'}"><label>Días de crédito</label><input id="fp-dias" type="number" value="${prov.diasCredito||30}"></div></div>
     <div class="row" id="fp-cuenta-wrap" style="${prov.diasCredito>0?'display:none':''}">${selectorCuentaBancoHTML('fp-cuenta','¿De qué cuenta salió el dinero? (contado)',(cuentasActivasBanco()[0]||{}).id)}</div>`,
    ()=>{const tipoPago=$('#fp-pago').value;const dias=Number($('#fp-dias').value)||0;const fechaF=$('#fp-fecha').value?new Date($('#fp-fecha').value+'T12:00:00').toISOString():new Date().toISOString();
      const cuentaContado=tipoPago==='contado'?($('#fp-cuenta')?.value||null):null;
      Object.assign(c,{facturada:true,docProv:$('#fp-doc').value||'—',tipoPago,diasCredito:tipoPago==='credito'?dias:0,
        vencimiento:tipoPago==='credito'?new Date(new Date(fechaF).getTime()+dias*86400000).toISOString():null,
        abonos:tipoPago==='contado'?[{fecha:fechaF.slice(0,10),monto:c.total,metodo:'Contado',referencia:($('#fp-doc').value||null),cuentaBancoId:cuentaContado,registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false}]:[]});
      // El abono de contado vive en pagos_proveedor: si no se guarda ahí, se pierde al recargar
      if(tipoPago==='contado'&&c.abonos[0]&&typeof guardarPagoProveedor==='function')guardarPagoProveedor(c.id,c.abonos[0]);
      // Contado con cuenta: salida de banco + póliza de cheque, igual que "Registrar pago".
      // Antes el contado no generaba ni movimiento ni póliza.
      if(tipoPago==='contado'&&cuentaContado&&typeof registrarMovimientoBanco==='function'){
        registrarMovimientoBanco({cuentaId:cuentaContado,tipo:'salida',monto:c.total,
          concepto:'Pago contado · '+c.proveedorNombre+(c.docProv&&c.docProv!=='—'?(' · '+c.docProv):''),
          categoria:'proveedor',origen:'pago_proveedor',origenId:c.id,referencia:c.docProv||null,
          fecha:fechaF.slice(0,10),beneficiario:c.proveedorNombre});
      }
      closeMod();renderCompras();
      toast('✓ Factura registrada',tipoPago==='credito'?('Cuenta por pagar · vence en '+dias+' días'):('Pagada de contado'+(cuentaContado?' · con movimiento de banco':'')));
      logAudit('Factura de proveedor','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+tipoPago+(cuentaContado?' · con movimiento de banco':''));
      if(typeof guardarCompra==='function')guardarCompra(c);});
  setTimeout(()=>{const s=$('#fp-pago');if(s)s.onchange=()=>{const cred=s.value==='credito';$('#fp-dias-wrap').style.display=cred?'block':'none';const cw=$('#fp-cuenta-wrap');if(cw)cw.style.display=cred?'none':'';};},0);
}
window.openFacturaProv=openFacturaProv;
let _ppProv='';
let _ppEstados=new Set(),_ppPeriodo='',_ppExport=[],_ppFilterOpen=false;
function setPpProv(v){_ppProv=v;renderPorPagar();}
window.setPpProv=setPpProv;
function togglePpEstado(v){if(_ppEstados.has(v))_ppEstados.delete(v);else _ppEstados.add(v);renderPorPagar();}
window.togglePpEstado=togglePpEstado;
function togglePpFilter(){_ppFilterOpen=!_ppFilterOpen;renderPorPagar();}
window.togglePpFilter=togglePpFilter;
function setPpPeriodo(v){_ppPeriodo=v;renderPorPagar();}
window.setPpPeriodo=setPpPeriodo;
function ppEnPeriodo(fecha){
  if(!_ppPeriodo)return true;
  const f=new Date(fecha); if(isNaN(f))return true;
  const hoy=new Date(fechaHoyGT()+'T00:00:00');const y=hoy.getFullYear(),m=hoy.getMonth();
  if(_ppPeriodo==='mes')return f>=new Date(y,m,1);
  if(_ppPeriodo==='mesant')return f>=new Date(y,m-1,1)&&f<new Date(y,m,1);
  if(_ppPeriodo==='2m')return f>=new Date(y,m-1,1);
  if(_ppPeriodo==='3m')return f>=new Date(y,m-2,1);
  return true;
}
function renderPorPagar(){
  // Excluye compras anuladas (antes aparecían como deuda)
  const todas=compras.map(c=>({c,...apInfo(c)})).filter(x=>x.c.facturada&&x.c.tipoPago==='credito'&&!x.c.anulado);
  // Filtro por proveedor
  const provIds=[...new Set(todas.map(x=>x.c.proveedorId))];
  const opts=provIds.map(id=>{const p=proveedores.find(v=>v.id===id);return {v:String(id),l:(p&&p.nombre)||'Sin proveedor'};}).sort((a,b)=>a.l.localeCompare(b.l,'es'));
  const fil=$('#pp-filtros');
  if(fil)fil.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <select onchange="setPpProv(this.value)" style="font-size:12.5px;padding:6px 10px;max-width:220px"><option value="">Todos los proveedores</option>${opts.map(o=>`<option value="${o.v}"${_ppProv===o.v?' selected':''}>${o.l}</option>`).join('')}</select>
    <div style="position:relative">
      <button class="btn btn-ghost btn-sm" onclick="togglePpFilter()"><svg viewBox="0 0 24 24" style="width:15px;height:15px" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>Filtrar${_ppEstados.size?' ('+_ppEstados.size+')':''}</button>
      <div style="display:${_ppFilterOpen?'block':'none'};position:absolute;top:100%;left:0;z-index:50;margin-top:4px;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow-lg);padding:6px;min-width:180px">${[['vencido','Vencido'],['pendiente','Pendiente'],['parcial','Parcial'],['pagado','Pagado']].map(([v,l])=>`<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;font-size:13px;cursor:pointer;border-radius:6px">
        <input type="checkbox" ${_ppEstados.has(v)?'checked':''} onchange="togglePpEstado('${v}')" style="width:auto;margin:0">${l}</label>`).join('')}</div>
    </div>
    <select onchange="setPpPeriodo(this.value)" style="font-size:12.5px;padding:6px 10px;max-width:180px"><option value="">Todo el tiempo</option>${[['mes','Este mes'],['mesant','Mes anterior'],['2m','Últimos 2 meses'],['3m','Últimos 3 meses']].map(([v,l])=>`<option value="${v}"${_ppPeriodo===v?' selected':''}>${l}</option>`).join('')}</select>
    <button class="btn btn-ghost btn-sm" onclick="exportarPorPagarExcel()"><svg viewBox="0 0 24 24" style="width:15px;height:15px" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Excel</button>
  </div>`;
  let info=_ppProv?todas.filter(x=>String(x.c.proveedorId)===String(_ppProv)):todas;
  if(_ppEstados.size)info=info.filter(x=>_ppEstados.has(x.vencido?'vencido':x.estado));
  if(_ppPeriodo)info=info.filter(x=>ppEnPeriodo(x.c.fecha));
  const porPagar=info.reduce((s,x)=>s+Math.max(0,x.saldo),0);
  const vencidoM=info.filter(x=>x.vencido).reduce((s,x)=>s+x.saldo,0);
  const pend=info.filter(x=>x.saldo>0.001).length;
  const provs=new Set(info.filter(x=>x.saldo>0.001).map(x=>x.c.proveedorId)).size;
  const k=[
    {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Total por pagar',val:money(porPagar),sub:pend+' facturas pendientes'},
    {ic:'i-green',svg:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',lbl:'Vencido',val:money(vencidoM),sub:'pagos atrasados'},
    {ic:'i-blue',svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',lbl:'Compras a crédito',val:info.length,sub:'activas'},
    {ic:'i-lime',svg:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',lbl:'Proveedores con saldo',val:provs,sub:'con deuda'},
  ];
  $('#pp-kpis').innerHTML=k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div>`).join('');
  $('#pp-empty').style.display=info.length?'none':'block';
  const EST={pagado:['Pagado','b-ok'],parcial:['Parcial','b-info'],pendiente:['Pendiente','b-warn']};
  const infoOrd=info.slice().sort((a,b)=>(b.vencido?1:0)-(a.vencido?1:0));
  _ppExport=infoOrd.map(x=>({Compra:'CMP-'+padn(x.c.id),Factura:x.c.docProv||'',Proveedor:x.c.proveedorNombre,Fecha:fdate(x.c.fecha),Vence:fdate(x.c.vencimiento),Total:x.c.total,Abonado:x.abon,Saldo:x.saldo,Estado:x.vencido?'Vencido':({pagado:'Pagado',parcial:'Parcial',pendiente:'Pendiente'})[x.estado]}));
  $('#t-pp').innerHTML=infoOrd.map(x=>{const c=x.c;const [en,ec]=x.vencido?['Vencido','b-danger']:EST[x.estado];
    let acts=`<button class="btn btn-ghost btn-sm" onclick="verCompra(${c.id})">Ver</button>`;
    if((c.abonos||[]).filter(a=>!a.anulado).length)acts=`<button class="btn btn-ghost btn-sm" onclick="histPagosProv(${c.id})">Historial</button>`+acts;
    if(x.saldo>0.001&&canRegistrarAbono())acts=`<button class="btn btn-primary btn-sm" onclick="openAbonoProv(${c.id})">Registrar pago</button>`+acts;
    return `<tr><td style="font-weight:600">CMP-${padn(c.id)}</td><td style="font-weight:600;color:var(--blue)">${c.docProv||'—'}</td><td>${c.proveedorNombre}</td><td style="color:var(--muted)">${fdate(c.fecha)}</td><td style="color:${x.vencido?'var(--danger)':'var(--muted)'};font-weight:${x.vencido?'600':'400'}">${fdate(c.vencimiento)}</td><td class="num">${money(c.total)}</td><td class="num" style="color:var(--ok)">${money(x.abon)}</td><td class="num" style="font-weight:700">${money(x.saldo)}</td><td><span class="badge ${ec}">${en}</span></td><td><div class="acts">${acts}</div></td></tr>`;
  }).join('');
  enhanceTable('t-pp');
}
async function exportarPorPagarExcel(){
  if(!_ppExport.length){toast('Sin datos para exportar',null,true);return;}
  try{
    const {XLSX,styled:_styled}=await _cargarXLSX();
    const prov=_ppProv?(proveedores.find(p=>String(p.id)===String(_ppProv))?.nombre||'—'):'Todos';
    const est=_ppEstados.size?[..._ppEstados].map(e=>({vencido:'Vencido',pendiente:'Pendiente',parcial:'Parcial',pagado:'Pagado'})[e]).join(', '):'Todos';
    const per=_ppPeriodo?({mes:'Este mes',mesant:'Mes anterior','2m':'Últimos 2 meses','3m':'Últimos 3 meses'})[_ppPeriodo]:'Todo el tiempo';
    const meta=[
      ['SEFE, S.A.'],
      ['CUENTAS POR PAGAR'],
      ['Proveedor:',prov],['Estado:',est],['Período:',per],
      ['Generado el:',fdatehora(new Date())],['Generado por:',currentUser],
      []
    ];
    const HR=8; // encabezado de columnas tras el membrete
    const ws=XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.sheet_add_json(ws,_ppExport,{origin:'A'+(HR+1)});
    const _keys=Object.keys(_ppExport[0]);
    const moneyCols=_keys.map((k,i)=>/total|abonad|saldo/i.test(k)?i:-1).filter(i=>i>=0);
    // Fila de totales (Total, Abonado, Saldo).
    const totalRow=HR+1+_ppExport.length;
    _keys.forEach((k,ci)=>{
      const val=ci===0?'TOTALES':(moneyCols.indexOf(ci)>=0?Math.round(_ppExport.reduce((s,r)=>s+(Number(r[k])||0),0)*100)/100:null);
      if(val===null)return;
      const ref=XLSX.utils.encode_cell({c:ci,r:totalRow});
      ws[ref]={t:typeof val==='number'?'n':'s',v:val};
    });
    ws['!ref']=XLSX.utils.encode_range({s:{c:0,r:0},e:{c:_keys.length-1,r:totalRow}});
    _estiloExcelHoja(XLSX,ws,{styled:_styled,headerRow:HR,nCols:_keys.length,dataRows:_ppExport.length,moneyCols,totalRow,brandRow:0,titleRow:1,metaRows:[2,3,4,5,6]});
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Por pagar');
    XLSX.writeFile(wb,'SEFE_por_pagar_'+fechaHoyGT()+'.xlsx');
    toast('✓ Excel descargado','SEFE_por_pagar_'+fechaHoyGT()+'.xlsx');
  }catch(e){console.error(e);toast('No se pudo generar el Excel',e.message||String(e),true);}
}
window.exportarPorPagarExcel=exportarPorPagarExcel;

// ===== BANCOS: cuentas =====
// Saldo actual de una cuenta = saldo inicial + entradas - salidas (movimientos no anulados)
function saldoCuenta(cuentaId){
  const c=cuentasBanco.find(x=>x.id===cuentaId);
  let s=c?c.saldoInicial:0;
  movimientosBanco.forEach(m=>{
    if(m.anulado||m.cuentaId!==cuentaId)return;
    s+=(m.tipo==='entrada'?1:-1)*Number(m.monto||0);
  });
  return s;
}
function nMovsCuenta(cuentaId){return movimientosBanco.filter(m=>!m.anulado&&m.cuentaId===cuentaId).length;}
function cuentasActivasBanco(){return (typeof cuentasBanco!=='undefined'?cuentasBanco:[]).filter(c=>c.activo!==false);}
// Selector reutilizable de cuenta de banco (para cobros, pagos, gastos)
function selectorCuentaBancoHTML(idSel,label,sel){
  const cuentas=cuentasActivasBanco();
  if(!cuentas.length)return `<div><label>${label}</label><div style="font-size:12px;color:var(--muted);padding:9px 0">Sin cuentas — creá una en la sección Bancos para registrar el movimiento.</div></div>`;
  return `<div><label>${label}</label><select id="${idSel}"><option value="">— Sin especificar —</option>${cuentas.map(c=>`<option value="${c.id}"${String(sel)===String(c.id)?' selected':''}>${c.nombre}</option>`).join('')}</select></div>`;
}
// Registra un movimiento de banco (entrada/salida) ligado a un origen (cobro, pago, gasto)
function registrarMovimientoBanco({cuentaId,tipo,monto,concepto,categoria,origen,origenId,referencia,fecha,beneficiario,sinPoliza}){
  if(!cuentaId||!(monto>0))return null;
  const mov={cuentaId:Number(cuentaId),fecha:fecha||fechaHoyGT(),tipo,monto:Number(monto),
    concepto:concepto||'',categoria:categoria||'otro',origen:origen||'manual',origenId:origenId||null,
    referencia:referencia||null,registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false,_nuevo:true};
  // Correlativo global de póliza de cheque para toda SALIDA (las reversas no llevan póliza)
  if(tipo==='salida'&&!sinPoliza){
    const maxPol=(movimientosBanco.reduce((m,x)=>Math.max(m,x.poliza||0),0)||0);
    mov.poliza=maxPol+1;
    if(beneficiario)mov.beneficiario=beneficiario;
  }
  movimientosBanco.push(mov);
  if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mov);
  // Abrir la póliza de cheque automáticamente para salidas
  if(tipo==='salida'&&mov.poliza){setTimeout(()=>{try{polizaChequePDF(mov,beneficiario)}catch(e){console.error('poliza',e)}},150);}
  return mov;
}
// Convierte un número a letras en español (para el monto de la póliza)
function _numLetras(n){
  n=Math.floor(Math.abs(n));
  if(n===0)return 'cero';
  const U=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte'];
  const D=['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const C=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  const chunk=x=>{
    let s='';
    const c=Math.floor(x/100),d=Math.floor((x%100)/10),u=x%10,dd=x%100;
    if(x===100)return 'cien';
    if(c)s+=C[c]+' ';
    if(dd<=20)s+=U[dd];
    else if(dd<30)s+='veinti'+U[u];
    else{s+=D[d];if(u)s+=' y '+U[u];}
    return s.trim();
  };
  let s='';
  const millones=Math.floor(n/1000000),miles=Math.floor((n%1000000)/1000),resto=n%1000;
  if(millones)s+=(millones===1?'un millón':chunk(millones)+' millones')+' ';
  if(miles)s+=(miles===1?'mil':chunk(miles)+' mil')+' ';
  if(resto)s+=chunk(resto);
  return s.trim().replace(/\s+/g,' ');
}
function montoEnLetras(monto,moneda){
  const ent=Math.floor(Math.abs(monto));
  const cent=Math.round((Math.abs(monto)-ent)*100);
  let txt=_numLetras(ent).toUpperCase();
  txt+=' CON '+String(cent).padStart(2,'0')+'/100 '+(moneda==='USD'?'DÓLARES':'QUETZALES');
  return txt;
}
const TIPO_CUENTA_LBL={monetaria:'Monetaria',ahorro:'Ahorro',efectivo:'Efectivo / Caja'};
const CAT_MOV_LBL={cobro:'Cobro',proveedor:'Proveedor',pagos:'Pagos',pago_prestamo:'Pago préstamo',pago_intereses:'Pago intereses',planilla:'Planilla',servicios:'Servicios',alquiler:'Alquiler',impuestos:'Impuestos',combustible:'Combustible',transporte:'Transporte / Fletes',mantenimiento:'Mantenimiento / Reparaciones',papeleria:'Papelería / Útiles',publicidad:'Publicidad / Mercadeo',honorarios:'Honorarios profesionales',comisiones_banco:'Comisiones bancarias',viaticos:'Viáticos',seguros:'Seguros',transferencia:'Transferencia',ajuste:'Ajuste',otro:'Otro'};
const CAT_MOV_OPCIONES=['cobro','proveedor','pagos','pago_prestamo','pago_intereses','planilla','servicios','alquiler','impuestos','combustible','transporte','mantenimiento','papeleria','publicidad','honorarios','comisiones_banco','viaticos','seguros','transferencia','ajuste','otro'];
function renderBancos(){
  if(typeof renderSinCuenta==='function')renderSinCuenta();
  const lista=cuentasBanco.filter(c=>c.activo!==false);
  $('#bancos-empty').style.display=lista.length?'none':'block';
  const saldoTotal=lista.reduce((s,c)=>s+saldoCuenta(c.id),0);
  const hoyStr=fechaHoyGT(), mesStr=hoyStr.slice(0,7);
  const fCta=document.getElementById('mov-filtro-cuenta')?.value||'';
  const fDesde=document.getElementById('mov-desde')?.value||'';
  const fHasta=document.getElementById('mov-hasta')?.value||'';
  const hayFecha=!!(fDesde||fHasta);
  const pDesde=hayFecha?(fDesde||'0000-01-01'):(mesStr+'-01');
  const pHasta=hayFecha?(fHasta||'9999-12-31'):hoyStr;
  let entPer=0,salPer=0,entHoy=0,salHoy=0;
  movimientosBanco.forEach(m=>{if(m.anulado)return;if(fCta&&String(m.cuentaId)!==String(fCta))return;const f=(m.fecha||'').slice(0,10);const mo=Number(m.monto||0);
    if(f>=pDesde&&f<=pHasta){if(m.tipo==='entrada')entPer+=mo;else salPer+=mo;}
    if(f===hoyStr){if(m.tipo==='entrada')entHoy+=mo;else salHoy+=mo;}});
  const perLbl=hayFecha?((fDesde===hoyStr&&fHasta===hoyStr)?'de hoy':'del período'):'del mes';
  const perSub=hayFecha?((fDesde?fdate(fDesde):'inicio')+' – '+(fHasta?fdate(fHasta):'hoy')):null;
  $('#bancos-kpis').innerHTML=kpiHTML([
    {ic:'i-green',svg:'<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/>',lbl:'Saldo total en bancos',val:money(saldoTotal),sub:lista.length+' cuenta'+(lista.length!==1?'s':'')},
    {ic:'i-blue',svg:'<path d="M12 5v14M19 12l-7 7-7-7"/>',lbl:'Entradas '+perLbl,val:money(entPer),sub:perSub||('Hoy: '+money(entHoy))},
    {ic:'i-warn',svg:'<path d="M12 19V5M5 12l7-7 7 7"/>',lbl:'Salidas '+perLbl,val:money(salPer),sub:perSub||('Hoy: '+money(salHoy))}]);
  $('#t-bancos').innerHTML=lista.map(c=>{
    const sact=saldoCuenta(c.id);
    return `<tr>
      <td style="font-weight:600"><a href="#" onclick="verEstadoCuentaBanco(${c.id});return false" style="color:var(--brand);text-decoration:none">${c.nombre}</a></td>
      <td style="color:var(--muted)">${c.banco||'—'}</td>
      <td style="color:var(--muted)">${c.numero||'—'}</td>
      <td><span class="badge b-muted" style="font-size:10px">${TIPO_CUENTA_LBL[c.tipo]||c.tipo}</span></td>
      <td class="num" style="color:var(--muted)">${moneyC(c.saldoInicial,c.moneda)}</td>
      <td class="num">${nMovsCuenta(c.id)}</td>
      <td class="num" style="font-weight:700;color:${sact>=0?'var(--ink)':'var(--danger)'}">${moneyC(sact,c.moneda)}</td>
      <td><div class="acts"><button class="btn btn-ghost btn-sm" onclick="verEstadoCuentaBanco(${c.id})" title="Estado de cuenta detallado">Estado de cuenta</button><button class="btn btn-ghost btn-sm" onclick="openCuentaBanco(${c.id})">Editar</button></div></td>
    </tr>`;
  }).join('');
  enhanceTable('t-bancos');
  // ── Movimientos recientes ──
  const selCta=document.getElementById('mov-filtro-cuenta');
  if(selCta){
    const valPrev=selCta.value;
    selCta.innerHTML='<option value="">Todas las cuentas</option>'+cuentasBanco.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
    selCta.value=valPrev;
  }
  const fTipo=document.getElementById('mov-filtro-tipo')?.value||'';
  let movs=movimientosBanco.filter(m=>!m.anulado);
  if(fCta)movs=movs.filter(m=>String(m.cuentaId)===String(fCta));
  if(fTipo)movs=movs.filter(m=>m.tipo===fTipo);
  if(fDesde)movs=movs.filter(m=>(m.fecha||'').slice(0,10)>=fDesde);
  if(fHasta)movs=movs.filter(m=>(m.fecha||'').slice(0,10)<=fHasta);
  movs=movs.slice().sort((a,b)=>{const d=(b.fecha||'').localeCompare(a.fecha||'');return d!==0?d:((Number(b.id)||0)-(Number(a.id)||0));}).slice(0,200);
  const empM=document.getElementById('mov-empty');if(empM)empM.style.display=movs.length?'none':'block';
  const nombreCuenta=id=>{const c=cuentasBanco.find(x=>x.id===id);return c?c.nombre:'—';};
  const monedaCuenta=id=>{const c=cuentasBanco.find(x=>x.id===id);return c?c.moneda:'GTQ';};
  const tb=document.getElementById('t-movimientos');
  if(tb)tb.innerHTML=movs.map(m=>`<tr>
      <td style="color:var(--muted)">${m.fecha?fdate(String(m.fecha).slice(0,10)):'—'}</td>
      <td>${nombreCuenta(m.cuentaId)}</td>
      <td>${m.concepto||'—'}</td>
      <td><span class="badge b-muted" style="font-size:10px">${CAT_MOV_LBL[m.categoria]||m.categoria||'otro'}</span></td>
      <td class="num" style="color:var(--ok);font-weight:${m.tipo==='entrada'?'700':'400'}">${m.tipo==='entrada'?moneyC(m.monto,monedaCuenta(m.cuentaId)):'—'}</td>
      <td class="num" style="color:var(--danger);font-weight:${m.tipo==='salida'?'700':'400'}">${m.tipo==='salida'?moneyC(m.monto,monedaCuenta(m.cuentaId)):'—'}</td>
      <td><div class="acts">${m.poliza?`<button class="btn btn-ghost btn-sm" onclick="polizaChequeUI(${m.id})" title="Póliza de cheque POL-${String(m.poliza).padStart(6,'0')}">📄 Póliza</button><button class="btn btn-ghost btn-sm" onclick="openEditarPoliza(${m.id})" title="Editar la póliza">✏️ Editar</button>`:''}${m.origen==='manual'?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="anularMovimientoBancoUI(${m.id})" title="Anular">✕</button>`:(m.poliza?'':`<span style="font-size:10.5px;color:var(--muted-2)">auto</span>`)}</div></td>
    </tr>`).join('');
  if(tb)enhanceTable('t-movimientos');
}
function openCuentaBanco(id){
  const c=id?cuentasBanco.find(x=>x.id===id):null;
  const t=c?c.tipo:'monetaria';
  const opt=(v,l)=>`<option value="${v}"${t===v?' selected':''}>${l}</option>`;
  openMod(c?'Editar cuenta':'Nueva cuenta de banco',
    `<div class="row"><div><label>Nombre de la cuenta</label><input id="cb-nom" value="${c?c.nombre:''}" placeholder="Ej. Banrural Monetaria"></div></div>
     <div class="row"><div><label>Banco</label><input id="cb-banco" value="${c?(c.banco||''):''}" placeholder="Ej. Banrural"></div><div><label>Número de cuenta</label><input id="cb-num" value="${c?(c.numero||''):''}"></div></div>
     <div class="row"><div><label>Tipo</label><select id="cb-tipo">${opt('monetaria','Monetaria')}${opt('ahorro','Ahorro')}${opt('efectivo','Efectivo / Caja')}</select></div><div><label>Moneda</label><select id="cb-moneda"><option value="GTQ"${(c?(c.moneda||'GTQ'):'GTQ')==='GTQ'?' selected':''}>Quetzales (Q)</option><option value="USD"${(c&&c.moneda==='USD')?' selected':''}>Dólares ($)</option></select></div></div>
     <div class="row"><div><label>Saldo inicial</label><input id="cb-saldo" type="number" step="0.01" value="${c?c.saldoInicial:0}"></div></div>
     ${c?`<div style="margin-top:6px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarCuentaBancoUI(${c.id})">🗑 Eliminar cuenta</button></div>`:''}`,
    ()=>{
      const nom=$('#cb-nom').value.trim();
      if(!nom){toast('Poné un nombre a la cuenta',null,true);return;}
      if(c){
        Object.assign(c,{nombre:nom,banco:$('#cb-banco').value.trim(),numero:$('#cb-num').value.trim(),tipo:$('#cb-tipo').value,moneda:$('#cb-moneda').value||'GTQ',saldoInicial:Number($('#cb-saldo').value)||0});
      }else{
        const nueva={nombre:nom,banco:$('#cb-banco').value.trim(),numero:$('#cb-num').value.trim(),tipo:$('#cb-tipo').value,moneda:$('#cb-moneda').value||'GTQ',saldoInicial:Number($('#cb-saldo').value)||0,activo:true,_nuevo:true};
        cuentasBanco.push(nueva);
      }
      if(typeof guardarCuentaBanco==='function')guardarCuentaBanco(c||cuentasBanco[cuentasBanco.length-1]);
      logAudit(c?'Cuenta de banco editada':'Cuenta de banco creada',nom);
      closeMod();renderBancos();
    });
}
window.openCuentaBanco=openCuentaBanco;
window.renderBancos=renderBancos;
window.movRango=function(tipo){
  const n=fechaHoyGT();
  const d=document.getElementById('mov-desde'),h=document.getElementById('mov-hasta');
  if(tipo==='hoy'){if(d)d.value=n;if(h)h.value=n;}
  else if(tipo==='mes'){if(d)d.value=n.slice(0,7)+'-01';if(h)h.value=n;}
  else{if(d)d.value='';if(h)h.value='';}
  renderBancos();
};
window.eliminarCuentaBancoUI=function(id){
  const c=cuentasBanco.find(x=>x.id===id);if(!c)return;
  if(nMovsCuenta(id)>0){toast('No se puede eliminar','La cuenta tiene movimientos registrados. Desactivala en vez de borrarla.',true);return;}
  confirmar('¿Eliminar la cuenta "'+c.nombre+'"?','Esta acción no se puede deshacer.',()=>{
    cuentasBanco=cuentasBanco.filter(x=>x.id!==id);
    if(typeof eliminarCuentaBanco==='function')eliminarCuentaBanco(id);
    logAudit('Cuenta de banco eliminada',c.nombre);
    closeMod();renderBancos();
  });
};

// ── Compras al contado que quedaron SIN cuenta de banco asignada ──
// Un pago de contado sin cuentaBancoId y sin movimiento de banco: alguien
// en compras lo registró sin saber de qué cuenta salió. Contabilidad lo
// resuelve desde acá asignándole la cuenta (y ahí se crea el movimiento).
function comprasContadoSinCuenta(){
  const out=[];
  (compras||[]).forEach(c=>{
    if(c.anulado)return;
    (c.abonos||[]).forEach((a,idx)=>{
      if(a.anulado)return;
      if(a.metodo!=='Contado')return;
      if(a.cuentaBancoId)return; // ya tiene cuenta
      // ¿ya existe un movimiento de banco para esta compra? entonces no está pendiente
      const yaHayMov=(typeof movimientosBanco!=='undefined')&&movimientosBanco.some(m=>!m.anulado&&m.origen==='pago_proveedor'&&Number(m.origenId)===Number(c.id));
      if(yaHayMov)return;
      out.push({c,a,idx});
    });
  });
  return out;
}
function renderSinCuenta(){
  const panel=document.getElementById('panel-sin-cuenta');if(!panel)return;
  const pend=comprasContadoSinCuenta();
  if(!pend.length){panel.style.display='none';return;}
  panel.style.display='';
  const cont=document.getElementById('sin-cuenta-cont');if(cont)cont.textContent=pend.length;
  const tb=document.getElementById('t-sin-cuenta');if(!tb)return;
  tb.innerHTML=pend.map(({c,a,idx})=>`<tr>
    <td style="font-weight:600">${c.proveedorNombre||'—'}</td>
    <td style="color:var(--muted)">${c.docProv||'—'}</td>
    <td style="color:var(--muted)">${fdate(a.fecha||c.fecha)}</td>
    <td class="num" style="font-weight:700">${money(a.monto)}</td>
    <td style="text-align:right"><button class="btn btn-primary btn-sm" onclick="asignarCuentaContado(${c.id},${idx})">Asignar cuenta</button></td>
  </tr>`).join('');
}
window.renderSinCuenta=renderSinCuenta;
function asignarCuentaContado(compraId,idx){
  if(!canRegistrarAbono()){toast('Sin permiso','Solo Admin y Contabilidad asignan cuentas',true);return;}
  const c=compras.find(x=>x.id===compraId);if(!c)return;
  const a=(c.abonos||[])[idx];if(!a||a.anulado){toast('El pago ya no está disponible',null,true);renderBancos();return;}
  if(!cuentasActivasBanco().length){toast('Sin cuentas','Creá primero una cuenta de banco',true);return;}
  openMod('Asignar cuenta · '+c.proveedorNombre,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Compra CMP-${padn(c.id)} · Pago de contado por <b style="color:var(--ink)">${money(a.monto)}</b> del ${fdate(a.fecha||c.fecha)}.</p>
     <div class="row">${selectorCuentaBancoHTML('sc-cuenta','¿De qué cuenta salió el dinero?',(cuentasActivasBanco()[0]||{}).id)}</div>
     <div class="row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="sc-poliza" checked style="width:auto"> Generar póliza de cheque</label></div>
     <div class="note n-danger" id="sc-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const cuenta=$('#sc-cuenta')?.value||null;
      if(!cuenta){$('#sc-err').style.display='flex';$('#sc-err').querySelector('span').textContent='Elegí una cuenta';return;}
      a.cuentaBancoId=cuenta;
      if(typeof actualizarCuentaPagoProveedor==='function')actualizarCuentaPagoProveedor(a);
      if(typeof registrarMovimientoBanco==='function'){
        registrarMovimientoBanco({cuentaId:cuenta,tipo:'salida',monto:a.monto,
          concepto:'Pago contado · '+c.proveedorNombre+(c.docProv&&c.docProv!=='—'?(' · '+c.docProv):''),
          categoria:'proveedor',origen:'pago_proveedor',origenId:c.id,referencia:c.docProv||null,
          fecha:(a.fecha||c.fecha),beneficiario:c.proveedorNombre,sinPoliza:!$('#sc-poliza')?.checked});
      }
      logAudit('Cuenta asignada a compra contado','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+money(a.monto));
      closeMod();renderBancos();renderCompras&&renderCompras();
      toast('✓ Cuenta asignada','Movimiento de banco registrado por '+money(a.monto));
    });
}
window.asignarCuentaContado=asignarCuentaContado;
// Registrar un movimiento manual (gasto, depósito, transferencia, ajuste)
function openMovimientoBanco(){
  if(!cuentasActivasBanco().length){toast('Sin cuentas','Creá primero una cuenta de banco',true);return;}
  const hoy=fechaHoyGT();
  const cats=CAT_MOV_OPCIONES.map(k=>`<option value="${k}">${CAT_MOV_LBL[k]}</option>`).join('');
  openMod('Registrar movimiento / gasto',
    `<div class="row"><div><label>Tipo</label><select id="mv-tipo" onchange="onTipoMov()"><option value="salida">Salida (gasto/pago)</option><option value="entrada">Entrada (depósito/ingreso)</option><option value="transferencia">Transferencia entre cuentas</option></select></div><div><label>Monto</label><input id="mv-monto" type="number" step="0.01" placeholder="0.00"></div></div>
     <div class="row"><div><label id="mv-cuenta-lbl">Cuenta</label><select id="mv-cuenta">${cuentasActivasBanco().map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}</select></div><div><label>Fecha</label><input id="mv-fecha" type="date" value="${hoy}"></div></div>
     <div class="row" id="mv-destino-row" style="display:none"><div><label>Cuenta destino</label><select id="mv-destino">${cuentasActivasBanco().map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}</select></div></div>
     <div class="row"><div><label>Categoría</label><select id="mv-cat">${cats}</select></div><div><label>No. cheque / autorización / transferencia</label><input id="mv-ref" placeholder="Según la forma de pago (opcional)"></div></div>
     <div class="row"><div><label>Beneficiario / a favor de <span style="font-weight:400;color:var(--muted-2)">(para la póliza de cheque en salidas)</span></label><input id="mv-benef" placeholder="Nombre de a quién se le paga"></div></div>
     <div class="row"><div><label>Concepto / descripción</label><input id="mv-concepto" placeholder="Ej. Pago de planilla quincena, luz, alquiler..."></div></div>
     <div class="note n-danger" id="mv-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const monto=Number($('#mv-monto').value);
      const err=(msg)=>{$('#mv-err').style.display='flex';$('#mv-err').querySelector('span').textContent=msg;};
      if(!(monto>0)){err('El monto debe ser mayor a cero');return;}
      const concepto=$('#mv-concepto').value.trim();
      if(!concepto){err('Escribí un concepto para el movimiento');return;}
      const tipo=$('#mv-tipo').value, cuenta=$('#mv-cuenta').value, fecha=$('#mv-fecha').value||hoy, ref=$('#mv-ref').value;
      if(tipo==='transferencia'){
        const destino=$('#mv-destino').value;
        if(!destino||destino===cuenta){err('Elegí una cuenta destino distinta a la de origen');return;}
        const cOrig=(cuentasBanco.find(x=>String(x.id)===String(cuenta))||{}).nombre||'', cDest=(cuentasBanco.find(x=>String(x.id)===String(destino))||{}).nombre||'';
        // Dos patas: sale de la cuenta origen, entra a la destino (sin póliza)
        registrarMovimientoBanco({cuentaId:cuenta,tipo:'salida',monto,concepto:concepto+' → '+cDest,categoria:'transferencia',origen:'transferencia',referencia:ref,fecha,sinPoliza:true});
        registrarMovimientoBanco({cuentaId:destino,tipo:'entrada',monto,concepto:concepto+' ← '+cOrig,categoria:'transferencia',origen:'transferencia',referencia:ref,fecha});
        logAudit('Transferencia entre cuentas',cOrig+' → '+cDest+' · '+money(monto));
      }else{
        registrarMovimientoBanco({cuentaId:cuenta,tipo,monto,concepto,categoria:$('#mv-cat').value,origen:'manual',referencia:ref,fecha,beneficiario:$('#mv-benef')?.value||''});
        logAudit('Movimiento de banco',tipo+' · '+money(monto)+' · '+concepto);
      }
      closeMod();renderBancos();toast('✓ Movimiento registrado',concepto+' · '+money(monto));
    });
}
window.openMovimientoBanco=openMovimientoBanco;
// Muestra la cuenta destino solo en transferencias; ajusta etiquetas
window.onTipoMov=function(){
  const t=$('#mv-tipo')?.value, esTrans=t==='transferencia';
  const dr=$('#mv-destino-row');if(dr)dr.style.display=esTrans?'flex':'none';
  const lbl=$('#mv-cuenta-lbl');if(lbl)lbl.textContent=esTrans?'Cuenta origen':'Cuenta';
};
window.anularMovimientoBancoUI=function(id){
  const m=movimientosBanco.find(x=>x.id===id);if(!m)return;
  confirmar('¿Anular este movimiento?','Se revertirá su efecto en el saldo de la cuenta.','Anular',()=>{
    m.anulado=true;
    if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(m);
    logAudit('Movimiento de banco anulado',(m.concepto||'')+' · '+money(m.monto));
    closeMod();renderBancos();
  });
};

// ── ESTADO DE CUENTA DETALLADO POR CUENTA DE BANCO ──────────
// Calcula saldo inicial del rango, movimientos con saldo corriente, totales y desglose
function _estadoCuentaBancoData(id,desde,hasta){
  const c=cuentasBanco.find(x=>x.id===id);if(!c)return null;
  const movs=movimientosBanco.filter(m=>!m.anulado&&m.cuentaId===id)
    .slice().sort((a,b)=>{const d=((a.fecha||'')).localeCompare(b.fecha||'');return d!==0?d:((a.id||0)-(b.id||0));});
  const dz=desde||'0000-01-01',hz=hasta||'9999-12-31';
  const val=m=>m.tipo==='entrada'?Number(m.monto||0):-Number(m.monto||0);
  let saldoAntes=Number(c.saldoInicial||0);
  movs.forEach(m=>{const f=(m.fecha||'').slice(0,10);if(f<dz)saldoAntes+=val(m);});
  const enRango=movs.filter(m=>{const f=(m.fecha||'').slice(0,10);return f>=dz&&f<=hz;});
  let run=saldoAntes,totEnt=0,totSal=0;const porCat={};
  const filas=enRango.map(m=>{
    const ent=m.tipo==='entrada'?Number(m.monto||0):0,sal=m.tipo==='salida'?Number(m.monto||0):0;
    run+=ent-sal;totEnt+=ent;totSal+=sal;
    const k=m.categoria||'otro';if(!porCat[k])porCat[k]={ent:0,sal:0};porCat[k].ent+=ent;porCat[k].sal+=sal;
    return {fecha:fdate((m.fecha||'').slice(0,10)),concepto:m.concepto||'—',categoria:CAT_MOV_LBL[m.categoria]||m.categoria||'Otro',referencia:m.referencia||'',ent,sal,saldo:run,origen:m.origen||'manual'};
  });
  return {cuenta:c,saldoAntes,filas,totEnt,totSal,saldoFinal:run,porCat};
}
function verEstadoCuentaBanco(id){
  const c=cuentasBanco.find(x=>x.id===id);if(!c)return;
  openMod('Estado de cuenta · '+c.nombre,
    `<div class="row">
       <div><label>Desde</label><input id="ecb-desde" type="date" onchange="_renderEstadoCtaBco(${id})"></div>
       <div><label>Hasta</label><input id="ecb-hasta" type="date" onchange="_renderEstadoCtaBco(${id})"></div>
     </div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 12px">
       <button type="button" class="btn btn-ghost btn-sm" onclick="_ecbRango('mes',${id})">Este mes</button>
       <button type="button" class="btn btn-ghost btn-sm" onclick="_ecbRango('anio',${id})">Este año</button>
       <button type="button" class="btn btn-ghost btn-sm" onclick="_ecbRango('todo',${id})">Todo</button>
       <span style="flex:1"></span>
       <button type="button" class="btn btn-ghost btn-sm" onclick="estadoCuentaBancoPDF(${id})" title="Descargar PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>PDF</button>
       <button type="button" class="btn btn-primary btn-sm" onclick="estadoCuentaBancoExcel(${id})" title="Descargar balance detallado en Excel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h2l2 5 2-5h2"/></svg>Excel</button>
     </div>
     <div id="ecb-cont"></div>`, null);
  $('#m-save').style.display='none';
  $('#ov').classList.add('modal-wide');
  _renderEstadoCtaBco(id);
}
window.verEstadoCuentaBanco=verEstadoCuentaBanco;
window._ecbRango=function(tipo,id){
  const n=new Date();
  const iso=d=>d.toISOString().slice(0,10);
  if(tipo==='mes'){$('#ecb-desde').value=iso(new Date(n.getFullYear(),n.getMonth(),1));$('#ecb-hasta').value=iso(n);}
  else if(tipo==='anio'){$('#ecb-desde').value=iso(new Date(n.getFullYear(),0,1));$('#ecb-hasta').value=iso(n);}
  else{$('#ecb-desde').value='';$('#ecb-hasta').value='';}
  _renderEstadoCtaBco(id);
};
window._renderEstadoCtaBco=function(id){
  const desde=$('#ecb-desde')?.value||'',hasta=$('#ecb-hasta')?.value||'';
  const d=_estadoCuentaBancoData(id,desde,hasta);if(!d)return;
  const M=x=>moneyC(x,d.cuenta.moneda);
  const cont=$('#ecb-cont');if(!cont)return;
  const filasHTML=d.filas.length?d.filas.map(f=>`<tr>
      <td style="color:var(--muted);white-space:nowrap">${f.fecha}</td>
      <td style="word-break:break-word">${f.concepto}${f.referencia?`<span style="color:var(--muted-2);font-size:11px"> · ${f.referencia}</span>`:''}</td>
      <td><span class="badge b-muted" style="font-size:10px">${f.categoria}</span></td>
      <td class="num" style="color:var(--danger)">${f.sal?M(f.sal):'—'}</td>
      <td class="num" style="color:var(--ok)">${f.ent?M(f.ent):'—'}</td>
      <td class="num" style="font-weight:700;color:${f.saldo>=0?'var(--ink)':'var(--danger)'}">${M(f.saldo)}</td>
    </tr>`).join(''):'<tr><td colspan="6" class="empty">Sin movimientos en el rango seleccionado</td></tr>';
  cont.innerHTML=`
    <div class="kpis" style="margin-bottom:12px">${kpiHTML([
      {ic:'i-muted',svg:'<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/>',lbl:'Saldo inicial',val:M(d.saldoAntes)},
      {ic:'i-green',svg:'<path d="M12 5v14M19 12l-7 7-7-7"/>',lbl:'Entradas',val:M(d.totEnt)},
      {ic:'i-danger',svg:'<path d="M12 19V5M5 12l7-7 7 7"/>',lbl:'Salidas',val:M(d.totSal)},
      {ic:(d.saldoFinal>=0?'i-blue':'i-danger'),svg:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',lbl:'Saldo final',val:M(d.saldoFinal)}])}</div>
    <div style="overflow-y:auto;overflow-x:hidden;max-height:46vh;border:1px solid var(--line);border-radius:8px">
    <table style="margin:0;width:100%;table-layout:fixed"><colgroup><col style="width:11%"><col style="width:34%"><col style="width:13%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead><tbody>
      <tr style="background:var(--bg-soft,#f6f8f2)"><td colspan="5" style="font-weight:600;color:var(--muted)">Saldo inicial ${desde?('al '+fdate(desde)):'(apertura de la cuenta)'}</td><td class="num" style="font-weight:700">${M(d.saldoAntes)}</td></tr>
      ${filasHTML}
      <tr style="border-top:2px solid var(--line-strong);font-weight:700"><td colspan="3">TOTALES DEL PERÍODO</td><td class="num" style="color:var(--danger)">${M(d.totSal)}</td><td class="num" style="color:var(--ok)">${M(d.totEnt)}</td><td class="num">${M(d.saldoFinal)}</td></tr>
    </tbody></table></div>`;
};
// PDF del estado de cuenta bancario
function estadoCuentaBancoPDF(id){
  const desde=$('#ecb-desde')?.value||'',hasta=$('#ecb-hasta')?.value||'';
  const d=_estadoCuentaBancoData(id,desde,hasta);if(!d)return;
  const c=d.cuenta;
  const sm=simboloMoneda(c.moneda);
  const periodo=(desde||hasta)?`${desde?fdate(desde):'inicio'} — ${hasta?fdate(hasta):'hoy'}`:'Historial completo';
  const filas=d.filas.length?d.filas.map(f=>`<tr>
    <td style="${_pdfTD()}">${f.fecha}</td>
    <td style="${_pdfTD()}">${f.concepto}${f.referencia?' · '+f.referencia:''}</td>
    <td style="${_pdfTD()}">${f.categoria}</td>
    <td style="${_pdfTD('text-align:right;color:#BE4326')}">${f.sal?sm+' '+f.sal.toLocaleString('es-GT',{minimumFractionDigits:2}):'—'}</td>
    <td style="${_pdfTD('text-align:right;color:#2a7d2a')}">${f.ent?sm+' '+f.ent.toLocaleString('es-GT',{minimumFractionDigits:2}):'—'}</td>
    <td style="${_pdfTD('text-align:right;font-weight:700')}">${sm} ${f.saldo.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
  </tr>`).join(''):'<tr><td colspan="6" style="padding:14px;text-align:center;color:#999">Sin movimientos en el período</td></tr>';
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="flex:1;min-width:240px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Cuenta</div>
        <div style="font-size:17px;font-weight:700;margin-top:3px;color:#173916">${c.nombre||''}</div>
        <div style="font-size:12px;color:#666B5C;margin-top:4px">${c.banco||''}${c.numero?' · No. '+c.numero:''}</div>
        <div style="font-size:12px;color:#666B5C">Tipo: ${TIPO_CUENTA_LBL[c.tipo]||c.tipo}</div>
        <div style="font-size:12px;color:#666B5C">Período: ${periodo}</div>
      </div>
      <div style="text-align:right;min-width:230px;background:#F4F7EF;border:1px solid #D6DCC9;border-radius:8px;padding:12px 16px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Saldo final</div>
        <div style="font-size:28px;font-weight:800;color:${d.saldoFinal>=0?'#3B6D11':'#BE4326'};margin-top:2px">${sm} ${d.saldoFinal.toLocaleString('es-GT',{minimumFractionDigits:2})}</div>
        <div style="font-size:11.5px;color:#666B5C;margin-top:8px">Entradas: ${sm} ${d.totEnt.toLocaleString('es-GT',{minimumFractionDigits:2})}</div>
        <div style="font-size:11.5px;color:#666B5C">Salidas: ${sm} ${d.totSal.toLocaleString('es-GT',{minimumFractionDigits:2})}</div>
      </div>
    </div>
    ${_pdfSec('Movimientos con saldo corriente')}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${_pdfTH()}">Fecha</th><th style="${_pdfTH()}">Concepto</th><th style="${_pdfTH()}">Categoría</th>
        <th style="${_pdfTH('text-align:right')}">Debe</th><th style="${_pdfTH('text-align:right')}">Haber</th><th style="${_pdfTH('text-align:right')}">Saldo</th>
      </tr></thead>
      <tbody>
        <tr><td colspan="5" style="${_pdfTD('font-weight:600;color:#555')}">Saldo inicial ${desde?('al '+fdate(desde)):'(apertura)'}</td><td style="${_pdfTD('text-align:right;font-weight:700')}">${sm} ${d.saldoAntes.toLocaleString('es-GT',{minimumFractionDigits:2})}</td></tr>
        ${filas}
        <tr style="background:#F4F7EF"><td colspan="3" style="${_pdfTD('font-weight:700')}">TOTALES</td><td style="${_pdfTD('text-align:right;font-weight:700;color:#BE4326')}">${sm} ${d.totSal.toLocaleString('es-GT',{minimumFractionDigits:2})}</td><td style="${_pdfTD('text-align:right;font-weight:700;color:#2a7d2a')}">${sm} ${d.totEnt.toLocaleString('es-GT',{minimumFractionDigits:2})}</td><td style="${_pdfTD('text-align:right;font-weight:800')}">${sm} ${d.saldoFinal.toLocaleString('es-GT',{minimumFractionDigits:2})}</td></tr>
      </tbody>
    </table>`;
  _abrirPDF(_pdfShell({titulo:'ESTADO DE CUENTA BANCARIO',subtitulo:c.nombre||'',orientacion:'landscape',body}));
}
window.estadoCuentaBancoPDF=estadoCuentaBancoPDF;
// Excel: balance general detallado (2 hojas: movimientos con saldo corriente + resumen por categoría)
async function estadoCuentaBancoExcel(id){
  const desde=$('#ecb-desde')?.value||'',hasta=$('#ecb-hasta')?.value||'';
  const d=_estadoCuentaBancoData(id,desde,hasta);if(!d)return;
  const c=d.cuenta;
  try{
    const {XLSX,styled:_styled}=await _cargarXLSX();
    const _Q='"Q"#,##0.00';
    const _C='_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)'; // formato contable
    // ── Hoja 1: Movimientos (libro mayor con saldo corriente) ──
    const meta=[
      ['SEFE, S.A.'],
      ['ESTADO DE CUENTA BANCARIO'],
      ['Cuenta:',c.nombre||''],
      ['Banco:',(c.banco||'')+(c.numero?' · No. '+c.numero:'')],
      ['Tipo:',TIPO_CUENTA_LBL[c.tipo]||c.tipo],
      ['Período:',(desde?fdate(desde):'inicio')+' a '+(hasta?fdate(hasta):'hoy')],
      ['Generado:',fdatehora(new Date())],
      []
    ];
    const HR=8; // encabezado de columnas tras el membrete
    // Formato contable: Debe = salidas, Haber = entradas (como lo muestra el banco), y Saldo.
    const cab=['Fecha','Concepto','Categoría','Referencia','Origen','Debe','Haber','Saldo'];
    const filas=[['','Saldo inicial'+(desde?(' al '+fdate(desde)):' (apertura)'),'','','','','',d.saldoAntes]];
    d.filas.forEach(f=>filas.push([f.fecha,f.concepto,f.categoria,f.referencia,f.origen==='manual'?'Manual':'Automático',f.sal||0,f.ent||0,f.saldo]));
    // Columnas: Fecha, Concepto, Categoría, Referencia, Origen, Debe(salidas), Haber(entradas), Saldo.
    // Los totales van en Debe (idx 5) y Haber (idx 6); el saldo final va en su fila.
    filas.push(['','TOTALES','','','',d.totSal,d.totEnt,'']);
    filas.push(['','SALDO FINAL','','','','','',d.saldoFinal]);
    const ws1=XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.sheet_add_aoa(ws1,[cab],{origin:'A'+(HR+1)});
    XLSX.utils.sheet_add_aoa(ws1,filas,{origin:'A'+(HR+2)});
    const nData1=1+d.filas.length;   // saldo inicial + movimientos
    const totalRow1=HR+1+nData1;     // fila TOTALES
    _estiloExcelHoja(XLSX,ws1,{styled:_styled,headerRow:HR,nCols:8,dataRows:nData1,moneyCols:[5,6,7],totalRow:totalRow1,brandRow:0,titleRow:1,metaRows:[2,3,4,5,6],moneyFmt:_C});
    // Fila SALDO FINAL (debajo de TOTALES): saldo en contable y negrita.
    const _rf=totalRow1+1, _refS=XLSX.utils.encode_cell({c:7,r:_rf});
    if(ws1[_refS]){ws1[_refS].z=_C;if(_styled)ws1[_refS].s={font:{bold:true,color:{rgb:'173916'}},alignment:{horizontal:'right'}};}
    const _refL=XLSX.utils.encode_cell({c:1,r:_rf}); if(_styled&&ws1[_refL])ws1[_refL].s={font:{bold:true,color:{rgb:'173916'}}};
    // ── Hoja 2: Resumen por categoría ──
    const resumen=[
      ['SEFE, S.A.'],
      ['RESUMEN POR CATEGORÍA'],
      ['Cuenta:',c.nombre||''],
      [],
      ['Categoría','Debe','Haber','Neto']
    ];
    const HR2=4;
    // Debe = salidas, Haber = entradas (mismo criterio que la hoja 1).
    Object.entries(d.porCat).sort((a,b)=>(b[1].ent+b[1].sal)-(a[1].ent+a[1].sal)).forEach(([k,o])=>{
      resumen.push([CAT_MOV_LBL[k]||k,o.sal,o.ent,o.ent-o.sal]);
    });
    const nCats=Object.keys(d.porCat).length;
    const totalRow2=HR2+1+nCats;
    resumen.push(['TOTAL',d.totSal,d.totEnt,d.totEnt-d.totSal]);
    resumen.push([]);resumen.push(['Saldo inicial:',d.saldoAntes]);resumen.push(['Saldo final:',d.saldoFinal]);
    const ws2=XLSX.utils.aoa_to_sheet(resumen);
    _estiloExcelHoja(XLSX,ws2,{styled:_styled,headerRow:HR2,nCols:4,dataRows:nCats,moneyCols:[1,2,3],totalRow:totalRow2,brandRow:0,titleRow:1,metaRows:[2],moneyFmt:_C});
    // Saldo inicial/final del pie: contable + etiqueta en negrita.
    [totalRow2+2,totalRow2+3].forEach(r=>{const rv=XLSX.utils.encode_cell({c:1,r});if(ws2[rv])ws2[rv].z=_C;const rl=XLSX.utils.encode_cell({c:0,r});if(_styled&&ws2[rl])ws2[rl].s={font:{bold:true,color:{rgb:'173916'}}};});
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws1,'Movimientos');
    XLSX.utils.book_append_sheet(wb,ws2,'Resumen');
    const fn=`SEFE_EstadoCuenta_${(c.nombre||'cuenta').replace(/[^a-zA-Z0-9]/g,'_')}_${fechaHoyGT()}.xlsx`;
    XLSX.writeFile(wb,fn);
    toast('✓ Excel descargado',fn);
  }catch(e){console.error('Error Excel estado cuenta:',e);toast('Error al generar Excel',e.message,true);}
}
window.estadoCuentaBancoExcel=estadoCuentaBancoExcel;

// ── PÓLIZA DE CHEQUE (comprobante de egreso) ────────────────
function polizaChequePDF(mov,beneficiario){
  if(!mov)return;
  const c=cuentasBanco.find(x=>x.id===mov.cuentaId)||{};
  const benef=(beneficiario||mov.beneficiario||'').trim()||(mov.concepto||'—');
  const numPol='POL-'+String(mov.poliza||0).padStart(6,'0');
  const numChq=(mov.referencia||'').toString().trim();
  const fechaTxt=mov.fecha?fdate(mov.fecha):'—';
  const montoNum=moneyC(mov.monto,c.moneda);
  const numAut=(mov.referencia||'').toString().trim();
  // Beneficiario: para pagos a proveedor usar la razón social del NIT
  let payee=benef, provNit='';
  if(mov.origen==='pago_proveedor'){
    const _cmp=compras.find(x=>x.id===mov.origenId);
    const _prov=_cmp?proveedores.find(p=>p.id===_cmp.proveedorId):null;
    if(_prov){ payee=_prov.razonSocial||_prov.nombre||benef; provNit=_prov.nit||''; }
  }
  // Concepto del egreso: quitar el prefijo "Pago a <proveedor> ·" (redundante con el beneficiario)
  let conceptoEgreso=(mov.concepto||'').trim();
  if(mov.origen==='pago_proveedor'){
    const _i=conceptoEgreso.indexOf('·');
    conceptoEgreso=(_i>=0?conceptoEgreso.slice(_i+1):'').trim();
  }
  if(!conceptoEgreso)conceptoEgreso='—';
  const sec=t=>`<div style="font-size:10px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.7px;margin:11px 0 4px;display:flex;align-items:center;gap:8px"><span>${t}</span><span style="flex:1;height:1px;background:#D6DCC9"></span></div>`;
  const cajaFirma=(rol)=>`<td style="width:33.3%;padding:0 8px;text-align:center;vertical-align:bottom">
      <div style="border-top:1px solid #555;margin-top:16px;padding-top:5px;font-size:10px;color:#555">${rol}</div></td>`;
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;align-items:flex-start">
      <div style="flex:1;min-width:230px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Fecha</div>
        <div style="font-size:14px;font-weight:700;margin-top:2px;color:#173916">Guatemala, ${fechaTxt}</div>
      </div>
      <div style="text-align:right;min-width:200px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Monto</div>
        <div style="font-size:21px;font-weight:800;color:#173916;margin-top:1px">${montoNum}</div>
      </div>
    </div>

    <div style="margin-top:10px;border:1.5px solid #173916;border-radius:8px;overflow:hidden">
      <div style="padding:7px 14px;border-bottom:1px solid #D6DCC9">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">Páguese a la orden de</div>
        <div style="font-size:15px;font-weight:700;color:#173916;margin-top:1px">${payee}</div>
      </div>
      <div style="padding:7px 14px">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">La cantidad de</div>
        <div style="font-size:12.5px;font-weight:600;color:#333;margin-top:1px;font-style:italic">${montoEnLetras(mov.monto,c.moneda)}</div>
      </div>
    </div>

    <div style="display:flex;gap:22px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        ${sec('Concepto del egreso')}
        <div style="font-size:12px;color:#333;padding:2px 2px 4px;min-height:22px">${conceptoEgreso}</div>
        <div style="font-size:11px;color:#909584;margin-top:2px">Categoría: ${CAT_MOV_LBL[mov.categoria]||mov.categoria||'Otro'}</div>
      </div>
      <div style="flex:1;min-width:0">
        ${sec('Cuenta de banco / Forma de pago')}
        <div style="font-size:13.5px;font-weight:700;color:#173916">${c.numero?c.numero+' / ':''}${c.banco||c.nombre||'—'}</div>
        ${c.nombre?`<div style="font-size:12px;color:#666B5C;margin-top:1px">${c.nombre}</div>`:''}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:12px"><tr>
      ${cajaFirma('Elaborado por')}
      ${cajaFirma('Autorizado por')}
      ${cajaFirma('Recibí conforme')}
    </tr></table>
    <div style="text-align:right;margin-top:12px;font-size:19px;color:#173916;font-weight:800;letter-spacing:.3px">${numAut||'________'}</div>`;
  // Carta vertical; la póliza va compacta en la mitad de arriba (horizontal) para cortar la hoja al medio.
  _abrirPDF(_pdfShell({titulo:'PÓLIZA DE CHEQUE',sinEmitido:true,orientacion:'portrait',margen:'6mm 12mm',sinPie:true,compacto:true,body}));
}
window.polizaChequePDF=polizaChequePDF;
window.polizaChequeUI=function(id){const m=movimientosBanco.find(x=>x.id===id);if(m)polizaChequePDF(m);};
// Editar los datos de una póliza (movimiento de banco)
window.openEditarPoliza=function(id){
  const m=movimientosBanco.find(x=>x.id===id);
  if(!m){toast('Movimiento no encontrado',null,true);return;}
  const esManual=m.origen==='manual';
  const numPol='POL-'+String(m.poliza||0).padStart(6,'0');
  const cats=CAT_MOV_OPCIONES.map(k=>`<option value="${k}"${m.categoria===k?' selected':''}>${CAT_MOV_LBL[k]}</option>`).join('');
  const cEsc=(m.concepto||'').replace(/"/g,'&quot;');
  openMod('Editar póliza '+numPol,
    `<div class="row"><div><label>Fecha</label><input id="ep-fecha" type="date" value="${(m.fecha||'').slice(0,10)}"></div><div><label>Monto</label><input id="ep-monto" type="number" step="0.01" value="${Number(m.monto)}"${esManual?'':' disabled'}></div></div>
     <div class="row"><div><label>No. de autorización / cheque</label><input id="ep-ref" value="${(m.referencia||'').toString().replace(/"/g,'&quot;')}" placeholder="Número que sale grande en la póliza"></div><div><label>Categoría</label><select id="ep-cat">${cats}</select></div></div>
     <div class="row"><div><label>Concepto</label><input id="ep-concepto" value="${cEsc}"></div></div>
     ${esManual?'':'<div class="note" style="margin-bottom:0;background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>Movimiento ligado a un pago (proveedor/cobro): el monto no se edita aquí para no descuadrar. Podés editar fecha, No. de autorización, concepto y categoría.</span></div>'}`,
    ()=>{
      const nuevoMonto=Number($('#ep-monto').value);
      if(esManual&&!(nuevoMonto>0)){toast('Monto inválido','Debe ser mayor a cero',true);return;}
      m.fecha=$('#ep-fecha').value||m.fecha;
      if(esManual)m.monto=nuevoMonto;
      m.referencia=$('#ep-ref').value.trim()||null;
      m.categoria=$('#ep-cat').value;
      m.concepto=$('#ep-concepto').value.trim();
      if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(m);
      logAudit('Póliza editada',numPol+' · '+money(m.monto)+' · '+(m.concepto||''));
      closeMod();renderBancos();
      toast('✓ Póliza actualizada',numPol);
      try{polizaChequePDF(m);}catch(e){console.error('poliza',e);}
    });
};
function openAbonoProv(id){
  if(!canRegistrarAbono()){toast('Sin permiso','Solo Admin y Contabilidad registran pagos',true);return;}
  _compFoto=null;
  const c=compras.find(x=>x.id===id);const ai=apInfo(c);const saldo=ai.saldo;const hoy=fechaHoyGT();
  // Sugerir número de recibo de egreso
  const totalPagos=compras.reduce((s,x)=>s+(x.abonos||[]).filter(a=>!a.anulado).length,0);
  const recSugerido='EG-'+String(totalPagos+1).padStart(4,'0');
  openMod('Registrar pago · CMP-'+padn(c.id),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${c.proveedorNombre} · Saldo pendiente: <b style="color:var(--ink)">${money(saldo)}</b></p>
     <div class="row"><div><label>Monto del pago</label><input id="pp-monto" type="number" step="0.01" value="${saldo.toFixed(2)}"></div><div><label>Fecha</label><input id="pp-fecha" type="date" value="${hoy}"></div></div>
     <div class="row"><div><label>No. de comprobante de egreso</label><input id="pp-recibo" value="${recSugerido}"></div><div><label>Método</label><select id="pp-met"><option>Transferencia</option><option>Cheque</option><option>Efectivo</option><option>Depósito</option></select></div></div>
     <div class="row"><div><label>No. cheque / autorización / transferencia</label><input id="pp-ref" placeholder="Según la forma de pago"></div></div>
     <div class="row">${selectorCuentaBancoHTML('pp-cuenta','¿De qué cuenta salió el dinero?')}</div>
     ${compFotoHTML()}
     <div class="note n-danger" id="pp-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{const monto=Number($('#pp-monto').value);
      if(!(monto>0)){$('#pp-err').style.display='flex';$('#pp-err').querySelector('span').textContent='El monto debe ser mayor a cero';return;}
      if(monto>saldo+0.001){$('#pp-err').style.display='flex';$('#pp-err').querySelector('span').textContent='El pago no puede superar el saldo de '+money(saldo);return;}
      const _noRec=$('#pp-recibo').value, _cuenta=$('#pp-cuenta')?.value||null, _ref=$('#pp-ref').value;
      const _pago={fecha:$('#pp-fecha').value||hoy,monto,metodo:$('#pp-met').value,referencia:_ref,noRecibo:_noRec,comprobante:_compFoto,cuentaBancoId:_cuenta,registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
      // Guardar el abono PRIMERO y esperar confirmación. Si falla, no seguimos: así
      // nunca queda un movimiento de banco sin su abono (la compra mostraría pendiente).
      const _btn=$('#m-save');if(_btn)_btn.disabled=true;
      let _ok=true;
      if(typeof guardarPagoProveedor==='function')_ok=await guardarPagoProveedor(c.id,_pago);
      if(_ok===false){if(_btn)_btn.disabled=false;$('#pp-err').style.display='flex';$('#pp-err').querySelector('span').textContent='No se pudo guardar el pago. Revisá tu conexión e intentá de nuevo.';return;}
      c.abonos=c.abonos||[];c.abonos.push(_pago);
      // Movimiento de banco: salida de la cuenta elegida (recién ahora que el abono quedó guardado)
      if(_cuenta){
        registrarMovimientoBanco({cuentaId:_cuenta,tipo:'salida',monto,
          concepto:'Pago a '+c.proveedorNombre+' · '+(_noRec||''),
          categoria:'proveedor',origen:'pago_proveedor',origenId:c.id,referencia:_ref,fecha:_pago.fecha,beneficiario:c.proveedorNombre});
      }
      logAudit('Pago a proveedor','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+money(monto)+' · '+_noRec);
      closeMod();renderPorPagar();renderCompras();toast('✓ Pago registrado',_noRec+' · saldo '+money(apInfo(c).saldo));});
}
window.openAbonoProv=openAbonoProv;

function histPagosProv(id){
  const c=compras.find(x=>x.id===id);if(!c)return;
  const ai=apInfo(c);
  const det=a=>{
    if(a.registradoPor==='migracion'||a.metodo==='Migracion'){
      return 'Migración · '+((a.referencia||'').toLowerCase().includes('ajuste')?'Ajuste de saldo':'Saldo inicial');
    }
    return `${a.metodo||''}${a.referencia?' · '+a.referencia:''}${a.registradoPor?`<div style="color:var(--muted-2)">por ${a.registradoPor}</div>`:''}`;
  };
  const rows=(c.abonos||[]).map((a,i)=>{
    if(a.anulado)return `<tr style="opacity:.5"><td style="color:var(--muted)">${fdate(a.fecha)}</td><td style="font-weight:600;color:var(--danger)">${a.noRecibo||'—'} · ANULADO</td><td class="num" style="text-decoration:line-through">${money(a.monto)}</td><td style="color:var(--muted);font-size:11.5px">${det(a)}<div style="color:var(--danger)">Motivo: ${a.motivoAnulacion||'—'}</div></td><td></td></tr>`;
    return `<tr><td style="color:var(--muted)">${fdate(a.fecha)}</td><td style="font-weight:600;color:var(--green)">${a.noRecibo||'—'}</td><td class="num" style="font-weight:600">${money(a.monto)}</td><td style="color:var(--muted);font-size:11.5px">${det(a)}</td><td style="white-space:nowrap;text-align:right">${a.comprobante?`<button class="btn btn-ghost btn-sm" onclick="verComprobante('compra',${id},${i})">📷 Ver</button>`:''}${canAnular()?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="anularPagoProv(${id},${i})">Anular</button>`:''}</td></tr>`;
  }).join('');
  openMod('Historial de pagos · CMP-'+padn(c.id),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">${c.proveedorNombre} · Total ${money(c.total)} · Abonado ${money(ai.abon)} · Saldo <b style="color:var(--ink)">${money(ai.saldo)}</b></p>
     <div style="overflow-x:auto"><table style="width:100%;min-width:420px"><thead><tr><th style="text-align:left;font-size:10.5px;color:var(--muted-2);padding:6px 0">Fecha</th><th style="text-align:left;font-size:10.5px;color:var(--muted-2)">Comprobante</th><th style="text-align:right;font-size:10.5px;color:var(--muted-2)">Monto</th><th style="text-align:left;font-size:10.5px;color:var(--muted-2)">Detalle</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Sin pagos registrados</td></tr>'}</tbody></table></div>`,
    ()=>closeMod());
  $('#m-save').textContent='Cerrar';$('#m-save').className='btn btn-ghost';
}
window.histPagosProv=histPagosProv;

function anularPagoProv(compraId,idx){
  if(!canAnular()){toast('Sin permiso','Tu rol no puede anular',true);return;}
  const c=compras.find(x=>x.id===compraId);if(!c)return;
  const a=c.abonos[idx];if(!a||a.anulado)return;
  openMod('Anular pago · '+(a.noRecibo||''),
    `<div class="note n-danger" style="margin-bottom:13px"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>El pago de ${money(a.monto)} se marcará como anulado y el saldo de la cuenta por pagar aumentará.</span></div>
     <label>Motivo de anulación <span style="color:var(--danger)">*</span></label>
     <textarea id="ap-motivo" rows="3" placeholder="Ej. pago duplicado, monto incorrecto, error de proveedor…" style="resize:vertical"></textarea>
     <div class="note n-danger" id="ap-err" style="display:none;margin-top:10px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3l16.94 0a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>El motivo es obligatorio.</span></div>`,
    ()=>{
      const motivo=$('#ap-motivo').value.trim();
      if(!motivo){$('#ap-err').style.display='flex';return;}
      a.anulado=true;a.anuladoPor=currentUser;a.anuladoFecha=new Date().toISOString();a.motivoAnulacion=motivo;
      logAudit('Pago a proveedor anulado','CMP-'+padn(c.id)+' · '+(a.noRecibo||'')+' · '+money(a.monto)+' · Motivo: '+motivo);
      cerrarTodo();renderPorPagar();renderCompras();
      toast('✓ Pago anulado','Saldo actualizado: '+money(apInfo(c).saldo));
      if(typeof anularPagoProveedorDB==='function')anularPagoProveedorDB(a);
    });
  $('#m-save').textContent='Anular pago';$('#m-save').className='btn btn-primary';$('#m-save').style.background='var(--danger)';
}
window.anularPagoProv=anularPagoProv;
function verCompra(id){
  const c=compras.find(x=>x.id===id);const ai=apInfo(c);
  window._pdfActual=null;window._pdfNombre=null; // esto NO es factura EcoFactura: imprimir usa la hoja interna
  const REC={pendiente:'Pendiente de recibir',parcial:'Recepción parcial',recibida:'Recibida completa'};
  $('#doc-bar-t').textContent='ORDEN DE COMPRA · CMP-'+padn(c.id);
  $('#doc-sheet').innerHTML=`
    <div class="ds-head"><div class="ds-emisor"><div class="ds-mk">SE</div><div><h4>Soluciones Efectivas GT</h4><p>Orden de compra</p></div></div>
      <div class="ds-doctype"><div class="dt">ORDEN DE COMPRA</div><p>CMP-${padn(c.id)}${c.docProv&&c.docProv!=='—'?'<br>Factura: '+c.docProv:''}</p></div></div>
    <div class="ds-stamp" style="color:${c.estadoRecepcion==='recibida'?'var(--ok)':'var(--warn)'}">${REC[c.estadoRecepcion].toUpperCase()}${c.facturada?' · FACTURADA':' · SIN FACTURA'}</div>
    <div class="ds-meta"><div><div class="mt-l">Proveedor</div><div class="mt-v">${c.proveedorNombre}</div></div>
      <div style="text-align:right"><div class="mt-l">Fecha</div><div class="mt-v">${fdate(c.fecha)}</div><div class="mt-s">${c.facturada?(c.tipoPago==='credito'?'Crédito '+c.diasCredito+' días':'Contado'):'Pago por definir'}</div></div></div>
    <table class="ds-table"><thead><tr><th>Producto</th><th style="text-align:center">Pedido</th><th style="text-align:center">Recibido</th><th style="text-align:right">Costo</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${c.items.map(it=>`<tr><td><b>${it.nombreProveedor||it.nombre}</b><br><span style="font-size:10px;color:var(--muted)">SKU proveedor: ${it.skuProveedor||it.codigo}${it.skuProveedor?` (interno: ${it.codigo})`:''}</span></td><td style="text-align:center" class="num">${it.cantidad}</td><td style="text-align:center" class="num">${it.recibido||0}</td><td style="text-align:right" class="num">${money(it.costo)}</td><td style="text-align:right;font-weight:600" class="num">${money(it.cantidad*it.costo)}</td></tr>`).join('')}</tbody></table>
    <div class="ds-tot"><div class="r big"><span>TOTAL</span><b class="num">${money(c.total)}</b></div>
      ${c.facturada&&c.tipoPago==='credito'?`<div class="r"><span>Abonado</span><span class="num">${money(ai.abon)}</span></div><div class="r"><span>Saldo</span><span class="num">${money(ai.saldo)}</span></div>`:''}</div>
    <div class="ds-foot">Orden de compra interna · el inventario sube al recibir</div>`;
  $('#docov').classList.add('show');
}
window.verCompra=verCompra;

// Nueva compra
let compraCart=[];
function initCompra(){
  $('#co-prov').innerHTML=proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
  // Buscador con dropdown propio (nombres completos), igual que en pedidos
  crearAutocomplete('co-add',
    (q)=>{
      const ql=q.toLowerCase();
      return productos.filter(p=>p.activo!==false).filter(p=>
        (p.skuProveedor||'').toLowerCase().includes(ql)||
        (p.codigo||'').toLowerCase().includes(ql)||
        (p.nombreProveedor||'').toLowerCase().includes(ql)||
        (p.nombre||'').toLowerCase().includes(ql)
      ).map(p=>{
        const distinto=(p.nombreProveedor&&p.nombreProveedor!==p.nombre);
        return {texto:`${p.skuProveedor||p.codigo} — ${p.nombreProveedor||p.nombre}`,
                sub:distinto?`Interno: ${p.codigo} · ${p.nombre}`:(p.marca||''), valor:p.id};
      });
    },
    (item)=>{ if(item){agregarCompraPorId(item.valor);$('#co-add').value='';} });
  $('#co-fecha').value=fechaHoyGT();
}
// Agrega un producto al carrito de compra por su id (usado por el autocomplete)
function agregarCompraPorId(id){
  const p=productos.find(x=>x.id===id);if(!p)return;
  const ex=compraCart.find(c=>c.id===p.id);
  if(ex)ex.cantidad++;else compraCart.push({id:p.id,codigo:p.codigo,skuProveedor:p.skuProveedor||p.codigo,nombre:p.nombre,nombreProveedor:p.nombreProveedor||p.nombre,costo:p.costo||0,cantidad:1});
  renderCompraForm();
}
window.agregarCompraPorId=agregarCompraPorId;
function addCompraProducto(){
  const inp=$('#co-add');const v=(inp.value||'').trim();if(!v)return;
  // Buscar también por SKU proveedor
  const q=v.toLowerCase();
  let p=productos.find(x=>{const sku=(x.skuProveedor||x.codigo).toLowerCase();const nom=(x.nombreProveedor||x.nombre).toLowerCase();
    return `${sku} — ${nom}`===q||q.startsWith(sku)||q.includes(sku);});
  if(!p)p=buscarProducto(v);
  if(!p){toast('✗ Producto no encontrado','Buscá por Código, SKU proveedor o nombre',true);return;}
  const ex=compraCart.find(c=>c.id===p.id);
  if(ex)ex.cantidad++;else compraCart.push({id:p.id,codigo:p.codigo,skuProveedor:p.skuProveedor||p.codigo,nombre:p.nombre,nombreProveedor:p.nombreProveedor||p.nombre,costo:p.costo||0,cantidad:1});
  inp.value='';renderCompraForm();
}
window.addCompraProducto=addCompraProducto;
// Enter también agrega
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement.id==='co-add')addCompraProducto();});
function renderCompraForm(){
  const bloque=$('#bloque-compra-especial');
  if(bloque)bloque.style.display=canCompraEspecial()?'block':'none';
  $('#co-empty').style.display=compraCart.length?'none':'block';
  $('#co-items').innerHTML=compraCart.map((it,i)=>{const _p=productos.find(x=>x.id===it.id);const _esCaja=_p&&(_p.tipoEmpaque==='caja_unidad'||_p.tipoEmpaque==='caja');return `<div class="li">
    <div><div class="nm">${it.nombreProveedor||it.nombre}<span style="font-size:10px;color:var(--muted);font-weight:400"> · ${it.nombre}</span>${_esCaja?' <span class="badge b-info" style="font-size:9px">cantidad en CAJAS</span>':''}</div><div class="sk">SKU prov: ${it.skuProveedor||it.codigo}</div></div>
    <input type="number" min="1" value="${it.cantidad}" oninput="updCompra(${i},'cantidad',this.value)" onblur="renderCompraForm()">
    <input type="number" min="0" step="0.01" value="${it.costo}" oninput="updCompra(${i},'costo',this.value)" onblur="renderCompraForm()">
    <div id="co-line-${i}" style="text-align:right;font-weight:600;grid-column:span 2" class="num">${money(it.cantidad*it.costo)}</div>
    <button class="x" onclick="rmCompra(${i})">×</button></div>`;}).join('');
  const total=compraCart.reduce((s,it)=>s+it.cantidad*it.costo,0);
  $('#co-tot').textContent=money(total);
  $('#co-go').disabled=!compraCart.length;
}
window.updCompra=(i,k,v)=>{compraCart[i][k]=Number(v)||0;const it=compraCart[i];const l=$('#co-line-'+i);if(l)l.textContent=money(it.cantidad*it.costo);const el=$('#co-tot');if(el)el.textContent=money(compraCart.reduce((s,x)=>s+x.cantidad*x.costo,0));};
window.rmCompra=i=>{compraCart.splice(i,1);renderCompraForm();};
// Toggle visual del checkbox compra especial
$('#co-especial').onchange=()=>{
  const esp=$('#co-especial').checked;
  $('#co-nota-normal').style.display=esp?'none':'flex';
  $('#co-nota-especial').style.display=esp?'flex':'none';
  $('#co-go').textContent=esp?'Crear compra especial':'Crear orden de compra';
};

$('#co-go').onclick=()=>{
  const prov=proveedores.find(p=>p.id===Number($('#co-prov').value));
  const total=compraCart.reduce((s,it)=>s+it.cantidad*it.costo,0);
  const fecha=$('#co-fecha').value?new Date($('#co-fecha').value+'T12:00:00').toISOString():new Date().toISOString();
  const esEspecial=$('#co-especial').checked;
  const ahora=new Date();
  const mes=ahora.getFullYear()+'-'+(ahora.getMonth()+1);

  const c={id:compN++,proveedorId:prov.id,proveedorNombre:prov.nombre,
    items:compraCart.map(it=>({...it,recibido:esEspecial?it.cantidad:0})),
    total,fecha,referencia:$('#co-doc').value,
    estadoRecepcion:esEspecial?'recibida':'pendiente',
    facturada:false,docProv:'',tipoPago:null,diasCredito:0,vencimiento:null,abonos:[],
    especial:esEspecial,mes:esEspecial?mes:null,oficializada:false,_nuevo:true};

  // Compra especial: subir inventario de inmediato
  if(esEspecial){
    compraCart.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,it.cantidad,'caja');});
    toast('✓ Compra especial creada','CMP-'+padn(c.id)+' · inventario actualizado · recordatorio antes de fin de mes');
    logAudit('Compra especial creada','CMP-'+padn(c.id)+' · '+prov.nombre+' · '+money(total)+' · mes '+mes);
  }else{
    toast('✓ Orden de compra creada','CMP-'+padn(c.id)+' · pendiente de recibir');
    logAudit('Compra creada','CMP-'+padn(c.id)+' · '+prov.nombre+' · '+money(total));
  }
  compras.push(c);
  if(typeof guardarCompra==='function')guardarCompra(c);
  compraCart=[];$('#co-doc').value='';$('#co-especial').checked=false;
  $('#co-nota-normal').style.display='flex';$('#co-nota-especial').style.display='none';
  $('#co-go').textContent='Crear orden de compra';
  renderCompraForm();go('compras');
};

// Divide una lista de items en varias "facturas" con cantidades en múltiplos de 10;
// se permite que alguna factura pase un poco del límite para respetar los bloques de 10.
