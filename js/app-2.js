async function hacerUpdatePass(){
  const p1=(($('#reset-pass')||{}).value)||'', p2=(($('#reset-pass2')||{}).value)||'';
  const msg=$('#reset-msg'), btn=$('#reset-btn');
  const set=(c,t)=>{ if(msg){msg.style.color=c;msg.textContent=t;} };
  if(p1.length<6){ set('#c0392b','La contraseña debe tener al menos 6 caracteres'); return; }
  if(p1!==p2){ set('#c0392b','Las contraseñas no coinciden'); return; }
  if(typeof sb==='undefined'||!sb.auth){ set('#c0392b','Sin conexión con el servidor.'); return; }
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  try{
    const {error}=await sb.auth.updateUser({password:p1});
    if(error){ set('#c0392b','No se pudo cambiar: '+error.message); if(btn){btn.disabled=false;btn.textContent='Guardar contraseña';} return; }
    set('#2e7d32','✓ Contraseña actualizada. Ya podés iniciar sesión.');
    try{ await sb.auth.signOut(); }catch(e){}
    _modoRecovery=false;
    setTimeout(()=>{ try{ history.replaceState(null,'',location.pathname); }catch(e){} const r=$('#reset-screen');if(r)r.style.display='none'; const l=$('#login-screen');if(l)l.style.display='flex'; }, 1600);
  }catch(e){ set('#c0392b','Error: '+(e&&e.message||e)); if(btn){btn.disabled=false;btn.textContent='Guardar contraseña';} }
}
window.hacerUpdatePass=hacerUpdatePass;
// 4) Detectar el evento de recuperación de Supabase (cuando llega desde el correo)
try{ if(typeof sb!=='undefined'&&sb.auth&&sb.auth.onAuthStateChange){ sb.auth.onAuthStateChange((event)=>{ if(event==='PASSWORD_RECOVERY')mostrarResetPass(); }); } }catch(e){}

function toast(msg,sub,err){const t=$('#toast');t.className='toast show'+(err?' err':'');
  t.innerHTML=`<div class="tk"><svg viewBox="0 0 24 24">${err?'<path d="M18 6 6 18M6 6l12 12"/>':'<path d="M20 6 9 17l-5-5"/>'}</svg></div><div><div>${msg}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>`;
  setTimeout(()=>t.classList.remove('show'),4500);}

// ================= CONFIGURACIÓN DE DASHBOARD POR ROL =================
// Cada rol tiene flags para KPIs y sub-paneles. Admin puede cambiarlos desde Administración.
const DB_WIDGETS=[
  {key:'kpi_ventas',    lbl:'KPI — Ventas del mes',          grp:'KPIs'},
  {key:'kpi_cobrar',    lbl:'KPI — Por cobrar',               grp:'KPIs'},
  {key:'kpi_pedidos',   lbl:'KPI — Pedidos abiertos',         grp:'KPIs'},
  {key:'kpi_stock',     lbl:'KPI — Stock bajo',               grp:'KPIs'},
  {key:'kpi_clientes',  lbl:'KPI — Mis clientes (Ventas)',    grp:'KPIs'},
  {key:'kpi_facturar',  lbl:'KPI — Por facturar',             grp:'KPIs'},
  {key:'kpi_ocpend',    lbl:'KPI — OC pendientes (Bodega)',   grp:'KPIs'},
  {key:'kpi_cobrarmis', lbl:'KPI — Por cobrar mis clientes (Ventas)', grp:'KPIs'},
  {key:'kpi_cobradomes',lbl:'KPI — Cobrado este mes',         grp:'KPIs'},
  {key:'kpi_porvencer', lbl:'KPI — Por vencer (7 días)',      grp:'KPIs'},
  {key:'panel_docs',    lbl:'Panel — Documentos recientes',   grp:'Paneles'},
  {key:'panel_venc',    lbl:'Panel — Cobros / vencimientos',  grp:'Paneles'},
  {key:'panel_stocktbl',lbl:'Panel — Stock bajo',             grp:'Paneles'},
  {key:'panel_ped',     lbl:'Panel — Pedidos / resumen',      grp:'Paneles'},
  {key:'panel_miscobros',lbl:'Panel — Mis clientes con vencido (Ventas)', grp:'Paneles'},
  {key:'alerta_venc',   lbl:'Alerta — Facturas vencidas',     grp:'Alertas'},
  {key:'alerta_stock',  lbl:'Alerta — Stock bajo / sin stock',grp:'Alertas'},
  {key:'alerta_oc',     lbl:'Alerta — OC sin recibir',        grp:'Alertas'},
  {key:'alerta_esp',    lbl:'Alerta — Compras especiales',    grp:'Alertas'},
];
let dashboardConfig={
  admin:      {kpi_ventas:true, kpi_cobrar:true, kpi_pedidos:true, kpi_stock:true, kpi_clientes:false,kpi_facturar:false,kpi_ocpend:false, panel_docs:true, panel_venc:true,  panel_stocktbl:true,  panel_ped:true,  alerta_venc:true, alerta_stock:true, alerta_oc:true, alerta_esp:true},
  gerencia:   {kpi_ventas:true, kpi_cobrar:true, kpi_pedidos:true, kpi_stock:true, kpi_clientes:false,kpi_facturar:false,kpi_ocpend:false, panel_docs:true, panel_venc:true,  panel_stocktbl:true,  panel_ped:true,  alerta_venc:true, alerta_stock:true, alerta_oc:true, alerta_esp:true},
  ventas:     {kpi_ventas:true, kpi_cobrar:false,kpi_pedidos:true, kpi_stock:false,kpi_clientes:true, kpi_facturar:false,kpi_ocpend:false, panel_docs:true, panel_venc:false, panel_stocktbl:false, panel_ped:true,  alerta_venc:false,alerta_stock:false,alerta_oc:false,alerta_esp:false},
  cobros:     {kpi_ventas:false,kpi_cobrar:true, kpi_pedidos:false,kpi_stock:false,kpi_clientes:false,kpi_facturar:true, kpi_ocpend:false, panel_docs:true, panel_venc:true,  panel_stocktbl:false, panel_ped:true,  alerta_venc:true, alerta_stock:false,alerta_oc:false,alerta_esp:false},
  bodega:     {kpi_ventas:false,kpi_cobrar:false,kpi_pedidos:false,kpi_stock:true, kpi_clientes:false,kpi_facturar:false,kpi_ocpend:true,  panel_docs:false,panel_venc:true,  panel_stocktbl:true,  panel_ped:true,  alerta_venc:false,alerta_stock:true, alerta_oc:true, alerta_esp:true},
  contabilidad:{kpi_ventas:false,kpi_cobrar:true,kpi_pedidos:false,kpi_stock:false,kpi_clientes:false,kpi_facturar:true, kpi_ocpend:false, panel_docs:true, panel_venc:true,  panel_stocktbl:false, panel_ped:true,  alerta_venc:true, alerta_stock:false,alerta_oc:false,alerta_esp:false},
  auditoria:  {kpi_ventas:true, kpi_cobrar:true, kpi_pedidos:true, kpi_stock:true, kpi_clientes:false,kpi_facturar:false,kpi_ocpend:false, panel_docs:true, panel_venc:true,  panel_stocktbl:true,  panel_ped:true,  alerta_venc:true, alerta_stock:true, alerta_oc:true, alerta_esp:true},
  facturador: {kpi_ventas:false,kpi_cobrar:false,kpi_pedidos:false,kpi_stock:false,kpi_clientes:false,kpi_facturar:true, kpi_ocpend:false, panel_docs:true, panel_venc:false, panel_stocktbl:false, panel_ped:true,  alerta_venc:false,alerta_stock:false,alerta_oc:false,alerta_esp:false},
};
function dbConf(key){return dashboardConfig[currentRole]?.[key]??false;}

function renderPanel(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const semana=new Date(hoy);semana.setDate(semana.getDate()+7);
  const mes=new Date(hoy.getFullYear(),hoy.getMonth(),1);
  const rol=currentRole;
  const esVentasRol=rol==='ventas';
  const esBodega=rol==='bodega';
  const esConta=['contabilidad','cobros'].includes(rol);
  const esFacturador=rol==='facturador';

  // ── Datos base ──────────────────────────────────────────────
  const misDocsBase=esVentasRol&&miVendedorId()?documentos.filter(d=>d.vendedorId===miVendedorId()):documentos;
  const facturasMes=misDocsBase.filter(d=>['certificada','facturado'].includes(d.estado)&&d.tipoDoc==='cambiaria'&&new Date(d.creada)>=mes);
  const ventasMes=facturasMes.reduce((s,d)=>s+d.totales.total,0);
  const porCobrar=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').reduce((s,d)=>s+arInfo(d).saldo,0);
  const vencidos=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&arInfo(d).vencido);
  const pedAbiertos=misDocsBase.filter(d=>d.tipoDoc==='pedido'&&d.estado==='abierto');
  // Stock efectivo: para caja_unidad cuenta las unidades sueltas + las que hay en cajas cerradas
  const stockEfectivo=p=>{
    if(p.tipoEmpaque==='caja_unidad')return (Number(p.stock)||0)+(Number(p.stockCajas)||0)*(Number(p.unidadesPorCaja)||0);
    if(p.tipoEmpaque==='caja')return Number(p.stockCajas)||Number(p.stock)||0;
    return Number(p.stock)||0;
  };
  const activos=productos.filter(p=>p.activo!==false);
  const stockBajo=activos.filter(p=>!esServicio(p)&&(()=>{const s=stockEfectivo(p);return s<=umbralStock(p)&&s>0;})());
  const sinStock=activos.filter(p=>!esServicio(p)&&stockEfectivo(p)===0);
  const ocPend=compras.filter(c=>!c.anulado&&c.estadoRecepcion!=='recibida');
  const espPend=compras.filter(c=>c.especial&&!c.oficializada&&!c.anulado);
  const porVencer=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&d.vencimiento&&!arInfo(d).vencido&&new Date(d.vencimiento)<=semana&&arInfo(d).saldo>0);
  const diasFinMes=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate()-hoy.getDate();
  const docsFacturar=documentos.filter(d=>['pedido','envio','prestamo'].includes(d.tipoDoc)&&d.estado==='abierto');
  const misClis=esVentasRol&&miVendedorId()?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;

  // ── Datos para KPIs nuevos ──────────────────────────────────
  // Por cobrar de mis clientes (Ventas): usa misDocsBase, que ya filtra por vendedor
  const porCobrarMis=misDocsBase.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').reduce((s,d)=>s+arInfo(d).saldo,0);
  const vencidosMis=misDocsBase.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&arInfo(d).vencido);
  // Cobrado en el mes actual (todos los abonos no anulados con fecha dentro del mes)
  let cobradoMes=0;documentos.forEach(d=>(d.abonos||[]).forEach(a=>{if(!a.anulado&&a.fecha&&new Date(a.fecha)>=mes)cobradoMes+=Number(a.monto);}));
  // Monto que vence en los próximos 7 días (porVencer ya está calculado arriba)
  const porVencerMonto=porVencer.reduce((s,d)=>s+arInfo(d).saldo,0);

  // ── Resumen del día ──────────────────────────────────────
  const hoyStr=fechaHoyGT();
  const hojE=new Date();
  const saludo=hojE.getHours()<12?'Buenos días':hojE.getHours()<19?'Buenas tardes':'Buenas noches';
  const fechaLarga=hojE.toLocaleDateString('es-GT',{weekday:'long'})+' '+fdate(hojE);
  const facturasHoy=misDocsBase.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&d.creada?.slice(0,10)===hoyStr);
  const ventasHoy=facturasHoy.reduce((s,d)=>s+d.totales.total,0);
  let cobradoHoy=0;misDocsBase.forEach(d=>(d.abonos||[]).forEach(a=>{if(!a.anulado&&a.fecha===hoyStr)cobradoHoy+=Number(a.monto);}));
  const pedidosHoy=misDocsBase.filter(d=>d.tipoDoc==='pedido'&&d.creada?.slice(0,10)===hoyStr).length;
  const vencenHoy=misDocsBase.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&d.vencimiento&&d.vencimiento.slice(0,10)===hoyStr&&arInfo(d).saldo>0).length;
  const rdItems=[];
  if(dbConf('kpi_ventas')||['admin','gerencia','auditoria'].includes(rol))rdItems.push({lbl:esVentasRol?'Mis ventas hoy':'Vendido hoy',val:money(ventasHoy),sub:facturasHoy.length+' factura'+(facturasHoy.length!==1?'s':'')});
  if(dbConf('kpi_cobrar')||esConta||['admin','gerencia','auditoria'].includes(rol))rdItems.push({lbl:esVentasRol?'Mis cobros hoy':'Cobrado hoy',val:money(cobradoHoy),sub:'abonos recibidos'});
  rdItems.push({lbl:esVentasRol?'Mis pedidos hoy':'Pedidos hoy',val:pedidosHoy,sub:'nuevos pedidos'});
  rdItems.push({lbl:'Vencen hoy',val:vencenHoy,sub:vencenHoy?'requieren cobro':'ninguno'});
  const rd=$('#resumen-dia');
  if(rd)rd.innerHTML=`<div class="resumen-dia">
    <div class="rd-hi">${saludo}, ${currentUser.split(' ')[0]}</div>
    <div class="rd-fecha">${fechaLarga.charAt(0).toUpperCase()+fechaLarga.slice(1)}</div>
    <div class="rd-grid">${rdItems.slice(0,4).map(x=>`<div class="rd-item"><div class="rd-lbl">${x.lbl}</div><div class="rd-val">${x.val}</div><div class="rd-sub">${x.sub}</div></div>`).join('')}</div>
    <div class="rd-foot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>Este resumen se enviará automáticamente por correo o WhatsApp cuando el sistema esté en producción.</div>
  </div>`;

  // ── KPIs ──────────────────────────────────────────────────
  const kpis=[];
  if(dbConf('kpi_ventas'))kpis.push({ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:esVentasRol?'Mis ventas del mes':'Ventas del mes',val:money(ventasMes),sub:facturasMes.length+' facturas certificadas'});
  if(dbConf('kpi_cobrar'))kpis.push({ic:vencidos.length?'i-danger':'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-2.5-2h-1a2.5 2.5 0 0 0 0 5h1a2.5 2.5 0 0 1 0 5h-1A2.5 2.5 0 0 1 9 14.5"/>',lbl:'Por cobrar',val:money(porCobrar),sub:vencidos.length?vencidos.length+' vencida'+(vencidos.length!==1?'s':''):'al día'});
  if(dbConf('kpi_pedidos'))kpis.push({ic:pedAbiertos.length?'i-warn':'i-blue',svg:'<path d="M5 7h14M5 12h14M5 17h9"/><circle cx="19" cy="17" r="2.5"/>',lbl:esVentasRol?'Mis pedidos abiertos':'Pedidos abiertos',val:pedAbiertos.length,sub:'sin facturar'});
  if(dbConf('kpi_stock'))kpis.push({ic:sinStock.length?'i-danger':stockBajo.length?'i-warn':'i-lime',svg:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',lbl:'Stock bajo',val:stockBajo.length+sinStock.length,sub:sinStock.length?sinStock.length+' sin stock':'por reabastecer'});
  if(dbConf('kpi_clientes'))kpis.push({ic:'i-lime',svg:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',lbl:'Mis clientes',val:misClis.length,sub:'asignados a mí'});
  if(dbConf('kpi_facturar'))kpis.push({ic:'i-warn',svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',lbl:esConta?'Facturas del mes':'Por facturar',val:esConta?facturasMes.length:docsFacturar.length,sub:esConta?money(ventasMes)+' certificados':'documentos abiertos'});
  if(dbConf('kpi_ocpend'))kpis.push({ic:ocPend.length?'i-warn':'i-lime',svg:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',lbl:'OC pendientes',val:ocPend.length,sub:'de recibir'});
  // KPI: Por cobrar de mis clientes (Ventas)
  if(dbConf('kpi_cobrarmis')||esVentasRol)kpis.push({ic:vencidosMis.length?'i-danger':'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-2.5-2h-1a2.5 2.5 0 0 0 0 5h1a2.5 2.5 0 0 1 0 5h-1A2.5 2.5 0 0 1 9 14.5"/>',lbl:'Por cobrar (mis clientes)',val:money(porCobrarMis),sub:vencidosMis.length?vencidosMis.length+' vencida'+(vencidosMis.length!==1?'s':''):'al día'});
  // KPI: Cobrado este mes (Cobros, Contabilidad, Admin, Gerencia)
  if(dbConf('kpi_cobradomes')||['cobros','contabilidad','admin','gerencia'].includes(rol))kpis.push({ic:'i-green',svg:'<path d="M20 6 9 17l-5-5"/>',lbl:'Cobrado este mes',val:money(cobradoMes),sub:'abonos recibidos'});
  // KPI: Por vencer en los próximos 7 días (Cobros, Contabilidad, Admin, Gerencia)
  if(dbConf('kpi_porvencer')||['cobros','contabilidad','admin','gerencia'].includes(rol))kpis.push({ic:porVencer.length?'i-warn':'i-lime',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'Por vencer (7 días)',val:money(porVencerMonto),sub:porVencer.length?porVencer.length+' factura'+(porVencer.length!==1?'s':''):'ninguna'});
  if(!kpis.length)kpis.push({ic:'i-blue',svg:'<path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/>',lbl:'Bienvenido',val:'—',sub:'Dashboard de SEFE'});
  $('#kpis').innerHTML=kpis.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-body"><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div></div>`).join('');

  // ── Alertas ──────────────────────────────────────────────
  const alertas=[];
  if(dbConf('alerta_venc')){
    if(vencidos.length)alertas.push({tipo:'danger',msg:`${vencidos.length} factura${vencidos.length!==1?'s':''} vencida${vencidos.length!==1?'s':''} · ${money(vencidos.reduce((s,d)=>s+arInfo(d).saldo,0))} pendiente`,view:'cobros'});
    if(porVencer.length)alertas.push({tipo:'warn',msg:`${porVencer.length} factura${porVencer.length!==1?'s':''} vence${porVencer.length===1?'':'n'} en los próximos 7 días`,view:'cobros'});
  }
  if(dbConf('alerta_stock')){
    if(sinStock.length)alertas.push({tipo:'danger',msg:`${sinStock.length} producto${sinStock.length!==1?'s':''} sin stock: ${sinStock.map(p=>p.nombre).join(', ')}`,view:'inventario'});
    else if(stockBajo.length)alertas.push({tipo:'warn',msg:`${stockBajo.length} producto${stockBajo.length!==1?'s':''} con stock bajo (según el umbral de su categoría)`,view:'inventario'});
  }
  if(dbConf('alerta_oc')&&ocPend.length)alertas.push({tipo:'info',msg:`${ocPend.length} orden${ocPend.length!==1?'es':''} de compra pendiente${ocPend.length!==1?'s':''} de recibir`,view:'compras'});
  if(dbConf('alerta_esp')&&espPend.length){
    const urgente=diasFinMes<=5;
    alertas.push({tipo:urgente?'danger':'warn',msg:`${espPend.length} compra${espPend.length!==1?'s':''} especial${espPend.length!==1?'es':''} pendiente${espPend.length!==1?'s':''} de oficializar · quedan ${diasFinMes} día${diasFinMes!==1?'s':''} para fin de mes`,view:'compras'});
  }
  $('#panel-alertas').innerHTML=alertas.map(a=>`<div class="alert-bar alert-${a.tipo}" onclick="go('${a.view}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${a.tipo==='info'?'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>':'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'}</svg>${a.msg}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-left:auto;opacity:.5"><path d="M9 18l6-6-6-6"/></svg></div>`).join('');

  // ── Panel 1: Documentos / Cobros vencidos ────────────────
  if(dbConf('panel_docs')){
    const titulo=esFacturador?'Por facturar':esVentasRol?'Mis documentos recientes':esConta&&vencidos.length?'Cobros vencidos':'Documentos recientes';
    const lista=esFacturador?docsFacturar.slice(0,8):esConta&&vencidos.length?null:misDocsBase.slice().reverse().slice(0,8);
    $('#panel-docs-title').textContent=titulo;
    if(lista)$('#recent').innerHTML=lista.map(rowDoc(false)).join('')||'<tr><td colspan="5" class="empty">Sin documentos</td></tr>';
    else $('#recent').innerHTML=vencidos.slice(0,8).map(d=>`<tr onclick="go('cobros')" style="cursor:pointer"><td style="font-weight:600">${d.serie}-${d.numeroDte}</td><td>FC</td><td>${d.clienteComercial||d.clienteNombre}</td><td class="num" style="color:var(--danger);font-weight:700">${money(arInfo(d).saldo)}</td><td><span class="badge b-danger">Vencida</span></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sin cobros vencidos</td></tr>';
    document.getElementById('panel-bloque-docs').style.display='';
  }else document.getElementById('panel-bloque-docs').style.display='none';

  // ── Panel 2: Vencimientos / OCs pendientes ───────────────
  if(dbConf('panel_venc')){
    const usaOC=esBodega&&!vencidos.length;
    $('#panel-venc-title').textContent=usaOC?'Órdenes de compra pendientes':'Cobros próximos a vencer';
    if(usaOC){
      $('#panel-vencimientos').innerHTML=ocPend.slice(0,6).map(c=>`<tr onclick="go('compras')" style="cursor:pointer"><td style="font-weight:600;font-size:12px">CMP-${padn(c.id)}</td><td style="font-size:12px;color:var(--muted)">${c.proveedorNombre}</td><td style="font-size:12px;color:var(--muted)">${fdate(c.fecha)}</td><td class="num" style="font-weight:700;font-size:12px">${money(c.total)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sin órdenes pendientes</td></tr>';
    }else{
      const prox=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&d.vencimiento&&arInfo(d).saldo>0).sort((a,b)=>new Date(a.vencimiento)-new Date(b.vencimiento)).slice(0,6);
      $('#panel-vencimientos').innerHTML=prox.length?prox.map(d=>{const ai=arInfo(d);const dias=Math.ceil((new Date(d.vencimiento)-new Date())/(86400000));const color=dias<0?'var(--danger)':dias<=3?'var(--warn)':'var(--muted)';return `<tr><td style="font-weight:600;font-size:12px">${d.serie}-${d.numeroDte}</td><td style="font-size:12px;color:var(--muted)">${d.clienteComercial||d.clienteNombre}</td><td style="color:${color};font-size:12px;font-weight:600">${dias<0?`Vencido ${Math.abs(dias)}d`:dias===0?'Hoy':`${dias}d`}</td><td class="num" style="font-weight:700;font-size:12px">${money(ai.saldo)}</td></tr>`;}).join(''):'<tr><td colspan="4" class="empty">Sin vencimientos próximos</td></tr>';
    }
    document.getElementById('panel-bloque-venc').style.display='';
  }else document.getElementById('panel-bloque-venc').style.display='none';

  // ── Panel: Mis clientes con saldo vencido (Ventas) ──────────
  const bloqueMisCob=document.getElementById('panel-bloque-miscobros');
  if(bloqueMisCob){
    if(dbConf('panel_miscobros')||esVentasRol){
      const porCli={};
      misDocsBase.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').forEach(d=>{
        const ai=arInfo(d);if(ai.saldo<=0.001)return;
        const k=d.clienteId;
        if(!porCli[k])porCli[k]={nombre:d.clienteComercial||d.clienteNombre,saldo:0,vencido:0};
        porCli[k].saldo+=ai.saldo;
        if(ai.vencido)porCli[k].vencido+=ai.saldo;
      });
      // Solo clientes con saldo vencido, los más urgentes primero
      const lista=Object.values(porCli).filter(c=>c.vencido>0.001).sort((a,b)=>b.vencido-a.vencido);
      $('#panel-miscobros').innerHTML=lista.length
        ?lista.map(c=>`<tr><td style="font-weight:600;font-size:12.5px">${c.nombre}</td><td class="num" style="font-size:12.5px;color:var(--muted)">${money(c.saldo)}</td><td class="num" style="font-weight:700;font-size:12.5px;color:var(--danger)">${money(c.vencido)}</td></tr>`).join('')
        :'<tr><td colspan="3" class="empty" style="font-size:12px">Ningún cliente tuyo con saldo vencido 🎉</td></tr>';
      bloqueMisCob.style.display='';
    }else bloqueMisCob.style.display='none';
  }

  // ── Panel 3: Stock bajo ──────────────────────────────────
  if(dbConf('panel_stocktbl')){
    const rows=[...sinStock,...stockBajo].slice(0,6);
    $('#panel-stock').innerHTML=rows.length?rows.map(p=>{const se=stockEfectivo(p);return `<tr><td style="font-weight:600;font-size:12px">${p.nombre}</td><td class="num" style="font-size:12px;color:var(--muted)">${p.codigo}</td><td><span class="stk ${se===0?'low':'mid'} num">${se}</span></td></tr>`;}).join(''):'<tr><td colspan="3" class="empty" style="font-size:12px">Stock en orden</td></tr>';
    document.getElementById('panel-bloque-stock').style.display='';
  }else document.getElementById('panel-bloque-stock').style.display='none';

  // ── Panel 4: Pedidos / resumen ───────────────────────────
  if(dbConf('panel_ped')){
    let titulo='Pedidos abiertos',rows='';
    if(esVentasRol||['admin','gerencia','auditoria'].includes(rol)){
      titulo=esVentasRol?'Mis pedidos abiertos':'Pedidos abiertos';
      rows=pedAbiertos.slice(0,5).map(d=>`<tr style="cursor:pointer" onclick="verDoc(${d.id})"><td style="font-weight:600;font-size:12px">${refPed(d)}</td><td style="font-size:12px;color:var(--muted)">${d.clienteComercial||d.clienteNombre}</td><td class="num" style="font-weight:700;font-size:12px">${money(d.totales.total)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty" style="font-size:12px">Sin pedidos abiertos</td></tr>';
    }else if(esBodega){
      titulo='Compras especiales activas';
      rows=espPend.slice(0,5).map(c=>`<tr onclick="go('compras')" style="cursor:pointer"><td style="font-weight:600;font-size:12px">CMP-${padn(c.id)}</td><td style="font-size:12px;color:var(--muted)">${c.proveedorNombre}</td><td class="num" style="font-weight:700;font-size:12px">${money(c.total)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty" style="font-size:12px">Sin compras especiales activas</td></tr>';
    }else if(esConta){
      titulo='Clientes con mayor saldo';
      rows=clientes.map(c=>({c,saldo:saldoCliente(c)})).filter(x=>x.saldo>0).sort((a,b)=>b.saldo-a.saldo).slice(0,5).map(({c,saldo})=>`<tr onclick="go('cobros')" style="cursor:pointer"><td style="font-weight:600;font-size:12px">${c.nombre}</td><td style="font-size:12px;color:var(--muted)">${c.nit}</td><td class="num" style="font-weight:700;font-size:12px;color:var(--warn)">${money(saldo)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty" style="font-size:12px">Sin saldos pendientes</td></tr>';
    }else if(esFacturador){
      titulo='Documentos sin facturar';
      rows=docsFacturar.slice(0,5).map(d=>`<tr style="cursor:pointer" onclick="verDoc(${d.id})"><td style="font-weight:600;font-size:12px">${refPed(d)}</td><td style="font-size:12px;color:var(--muted)">${d.clienteComercial||d.clienteNombre}</td><td class="num" style="font-weight:700;font-size:12px">${money(d.totales.total)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty" style="font-size:12px">Sin documentos pendientes</td></tr>';
    }
    $('#panel-ped-title').textContent=titulo;
    $('#panel-pedidos').innerHTML=rows;
    document.getElementById('panel-bloque-ped').style.display='';
  }else document.getElementById('panel-bloque-ped').style.display='none';

  renderSeguimiento();
}

// Reporte de seguimiento: frecuencia de compra y días sin facturar, por cliente
function renderSeguimiento(){
  const cont=document.getElementById('panel-seguimiento');
  if(!cont)return;
  const bloque=document.getElementById('panel-bloque-seguimiento');
  const esVentasRol=currentRole==='ventas';
  const miVend=miVendedorId();

  // Solo facturas certificadas/cambiarias (ventas reales)
  const facturas=documentos.filter(d=>(d.tipoDoc==='cambiaria'||d.estado==='certificada') && d.estado!=='anulada');

  // Agrupar por cliente
  const porCliente={};
  facturas.forEach(f=>{
    const cid=f.clienteId;
    if(cid==null)return;
    if(!porCliente[cid])porCliente[cid]={fechas:[],nombre:f.clienteComercial||f.clienteNombre,vendedorId:null};
    const fch=f.fechaCertificacion||f.creada;
    if(fch)porCliente[cid].fechas.push(new Date(fch).getTime());
  });

  const hoy=Date.now();
  let filas=[];
  Object.entries(porCliente).forEach(([cid,info])=>{
    const cli=clientes.find(c=>String(c.id)===String(cid));
    const vendId=cli?cli.vendedorId:null;
    // Si es vendedor, solo sus clientes
    if(esVentasRol && vendId!==miVend)return;

    const fechas=info.fechas.sort((a,b)=>a-b);
    const ultima=fechas[fechas.length-1];
    const diasSinComprar=Math.floor((hoy-ultima)/86400000);

    // Frecuencia: promedio de días entre compras (si hay 2+ facturas)
    let frecuencia='—';
    if(fechas.length>=2){
      let suma=0;
      for(let i=1;i<fechas.length;i++)suma+=(fechas[i]-fechas[i-1]);
      const prom=Math.round(suma/(fechas.length-1)/86400000);
      frecuencia=prom+' días';
    }

    const vend=vendedores.find(v=>v.id===vendId);
    const vendNom=vend?vend.nombre:'—';

    // Color de alerta según días sin comprar
    let colorDias='var(--muted)';
    if(diasSinComprar>=60)colorDias='var(--danger)';
    else if(diasSinComprar>=30)colorDias='#C9A227';

    filas.push({nombre:info.nombre,vendNom,frecuencia,ultima,diasSinComprar,colorDias,nFacturas:fechas.length});
  });

  // Ordenar por días sin comprar (los más urgentes primero)
  filas.sort((a,b)=>b.diasSinComprar-a.diasSinComprar);

  if(!filas.length){
    cont.innerHTML='<tr><td colspan="5" class="empty">Aún no hay facturas para mostrar seguimiento</td></tr>';
    return;
  }

  cont.innerHTML=filas.map(f=>`<tr>
    <td style="font-weight:600">${f.nombre}</td>
    <td style="font-size:12px;color:var(--muted)">${f.vendNom}</td>
    <td style="font-size:12px">${f.frecuencia}</td>
    <td style="font-size:12px;color:var(--muted)">${fdate(new Date(f.ultima).toISOString())}</td>
    <td style="font-weight:700;color:${f.colorDias}">${f.diasSinComprar} días</td>
  </tr>`).join('');
}

// ══════════ AUTOCOMPLETADO PROPIO ══════════
// Reemplaza los <datalist> nativos (que muestran todo de golpe y se ven mal)
// por un dropdown que solo sugiere al escribir, filtrando en vivo.
//
// crearAutocomplete(inputId, getItems, onSelect)
//   inputId  : id del <input>
//   getItems : función que devuelve [{texto, sub, valor}] según lo escrito
//   onSelect : función(item) al elegir una opción
const MAX_SUGERENCIAS=8;
function crearAutocomplete(inputId, getItems, onSelect){
  const input=document.getElementById(inputId);
  if(!input)return;
  if(input._acWired)return; // ya configurado: no volver a agregar listeners
  input._acWired=true;
  // Quitar el datalist nativo si lo tenía
  input.removeAttribute('list');
  // Crear el contenedor del dropdown (una sola vez)
  let box=document.getElementById(inputId+'-ac');
  if(!box){
    box=document.createElement('div');
    box.id=inputId+'-ac';
    box.className='ac-box';
    box.style.cssText='position:absolute;z-index:9999;background:var(--surface,#fff);border:1px solid var(--line,#e0e0e0);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.14);max-height:280px;overflow-y:auto;display:none;-webkit-overflow-scrolling:touch';
    document.body.appendChild(box);
  }
  let idx=-1, items=[];
  const posicionar=()=>{
    const r=input.getBoundingClientRect();
    const margen=8;
    // Ancho: igual al input, pero al menos 200px y nunca más que la pantalla
    let ancho=Math.max(r.width, 200);
    ancho=Math.min(ancho, window.innerWidth - margen*2);
    box.style.width=ancho+'px';
    // Posición horizontal: alineado al input, pero sin salirse de la pantalla
    let left=r.left+window.scrollX;
    if(left+ancho > window.innerWidth+window.scrollX - margen){
      left=window.innerWidth+window.scrollX - ancho - margen;
    }
    if(left < margen) left=margen;
    box.style.left=left+'px';
    // Posición vertical: debajo del input. Si no cabe abajo, ponerlo arriba.
    const espacioAbajo=window.innerHeight - r.bottom;
    const altoMax=Math.min(280, Math.max(espacioAbajo-margen, 160));
    box.style.maxHeight=altoMax+'px';
    box.style.top=(r.bottom+window.scrollY+4)+'px';
  };
  const cerrar=()=>{box.style.display='none';idx=-1;};
  const pintar=()=>{
    if(!items.length){cerrar();return;}
    box.innerHTML=items.map((it,i)=>`<div class="ac-item" data-i="${i}" style="padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--line-soft,#f0f0f0);${i===idx?'background:var(--surface-2,#f4f7ef)':''}">
      <div style="font-weight:600;font-size:14px;color:var(--ink,#1a1a1a);line-height:1.3">${it.texto}</div>
      ${it.sub?`<div style="font-size:12px;color:var(--muted,#888);margin-top:1px">${it.sub}</div>`:''}
    </div>`).join('');
    posicionar();box.style.display='block';
    box.querySelectorAll('.ac-item').forEach(el=>{
      el.onmousedown=(e)=>{e.preventDefault();elegir(items[Number(el.dataset.i)]);};
      el.onmouseenter=()=>{idx=Number(el.dataset.i);pintarActivo();};
    });
  };
  const pintarActivo=()=>{
    box.querySelectorAll('.ac-item').forEach((el,i)=>{el.style.background=i===idx?'var(--surface-2,#f4f7ef)':'';});
  };
  const elegir=(it)=>{
    if(!it)return;
    input.value=it.texto;
    cerrar();
    if(onSelect)onSelect(it);
  };
  input.addEventListener('input',()=>{
    const q=input.value.trim();
    if(q.length<1){cerrar();if(onSelect)onSelect(null);return;}
    items=getItems(q).slice(0,MAX_SUGERENCIAS);
    idx=-1;pintar();
  });
  input.addEventListener('keydown',(e)=>{
    if(box.style.display==='none')return;
    if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,items.length-1);pintarActivo();}
    else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0);pintarActivo();}
    else if(e.key==='Enter'){if(idx>=0){e.preventDefault();elegir(items[idx]);}}
    else if(e.key==='Escape'){cerrar();}
  });
  input.addEventListener('blur',()=>setTimeout(cerrar,150));
  input.addEventListener('focus',()=>{const q=input.value.trim();if(q){items=getItems(q).slice(0,MAX_SUGERENCIAS);pintar();}});
}

// Configura todos los autocompletados del formulario de pedido
function setupAutocomplete(){
  // CLIENTES
  crearAutocomplete('f-cli-search',
    (q)=>{
      const ql=q.toLowerCase();
      let base=esVentas()?clientes.filter(c=>c.vendedorId===miVendedorId()):clientes;
      return base.filter(c=>
        (c.nombre||'').toLowerCase().includes(ql)||
        (c.razonSocial||'').toLowerCase().includes(ql)||
        (c.nit||'').toLowerCase().includes(ql)
      ).map(c=>({texto:`${c.nombre} · ${c.nit}`, sub:c.razonSocial&&c.razonSocial!==c.nombre?c.razonSocial:'', valor:c.id}));
    },
    (item)=>{
      // Disparar la misma lógica que tenía el oninput original
      if($('#f-cli-search'))$('#f-cli-search').dispatchEvent(new Event('cli-elegido'));
      aplicarClienteSeleccionado(item?item.valor:null);
    });
  // PRODUCTOS (agregar al pedido)
  crearAutocomplete('f-add',
    (q)=>{
      const ql=q.toLowerCase();
      return productos.filter(p=>p.activo!==false).filter(p=>
        (p.codigo||'').toLowerCase().includes(ql)||
        (p.nombre||'').toLowerCase().includes(ql)||
        (p.skuProveedor||'').toLowerCase().includes(ql)
      ).map(p=>({texto:`${p.codigo} — ${p.nombre}`, sub:p.marca||'', valor:p.id}));
    },
    (item)=>{ if(item){agregarProductoPorId(item.valor);$('#f-add').value='';} });
}

// Puebla el selector "Facturar a nombre de" del PEDIDO según los NITs secundarios del cliente.
// nitSel (opcional) = NIT a preseleccionar (ej. al editar un pedido ya guardado).
function poblarSelectorNitPedido(cli, nitSel){
  const wrap=document.getElementById('f-nit-wrap'), sel=document.getElementById('f-nit-sel');
  if(!wrap||!sel)return;
  const nitsSec=cli?nitsSecNorm(cli):[];
  if(!cli||!nitsSec.length){wrap.style.display='none';sel.innerHTML='';return;}
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm=x=>String(x||'').replace(/[-\s]/g,'').toUpperCase();
  let idxSel='__principal__';
  if(nitSel){const i=nitsSec.findIndex(n=>norm(n.nit)===norm(nitSel));if(i>=0)idxSel=String(i);}
  const principalNombre=cli.razonSocial||cli.nombre;
  sel.innerHTML=`<option value="__principal__"${idxSel==='__principal__'?' selected':''}>${esc(principalNombre)} · NIT ${esc(cli.nit||'CF')} (principal)</option>`+
    nitsSec.map((n,i)=>`<option value="${i}"${idxSel===String(i)?' selected':''}>${esc(n.nombre||n.nit)} · NIT ${esc(n.nit)}</option>`).join('');
  wrap.style.display='';
}
// Lee la selección de NIT del pedido -> {nit, nombre} (o nulos si es el principal / no aplica).
function leerNitPedido(cli){
  const s=document.getElementById('f-nit-sel'), w=document.getElementById('f-nit-wrap');
  if(!s||!w||w.style.display==='none'||!s.value||s.value==='__principal__')return {nit:null,nombre:null};
  const ns=(cli?nitsSecNorm(cli):[])[Number(s.value)]||null;
  return ns?{nit:ns.nit,nombre:ns.nombre||ns.nit}:{nit:null,nombre:null};
}
// Aplica la selección de cliente (extraído del oninput original)
function aplicarClienteSeleccionado(cliId){
  const cli=cliId?clientes.find(c=>c.id===cliId):null;
  if(cli&&esVentas()&&cli.vendedorId!==miVendedorId()){
    $('#f-cli').value='';actualizarVendedorInfo(null);
    const box=$('#f-saldo-alert');
    if(box){box.style.display='block';box.innerHTML=`<div class="note n-danger" style="margin:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>Este cliente no está asignado a vos. Solo podés crear pedidos para tus clientes.</span></div>`;}
    return;
  }
  if(cli){$('#f-cli').value=String(cli.id);actualizarVendedorInfo(cli);poblarSelectorNitPedido(cli);cart.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)it.precio=precioCliente(cli,p);});render();}
  else{$('#f-cli').value='';actualizarVendedorInfo(null);poblarSelectorNitPedido(null);}
}

function initForm(){
  // Configurar autocompletados propios (reemplazan a los datalist nativos)
  setupAutocomplete();
  // Autoguardar el borrador cuando cambia CUALQUIER campo del pedido (cliente,
  // OC, observaciones, nota interna…), no solo cuando cambia el carrito. Antes,
  // si escribías notas y se cerraba la pantalla sin tocar productos, se perdían.
  // Se engancha una sola vez sobre el contenedor de la vista.
  const cont=document.getElementById('v-pedido');
  if(cont&&!cont.dataset.borrWired){
    cont.dataset.borrWired='1';
    const _g=()=>{if(typeof guardarBorrador==='function')guardarBorrador();};
    cont.addEventListener('input',_g);cont.addEventListener('change',_g);
  }
}
function clienteSel(){return clientes.find(c=>c.id===Number($('#f-cli').value));}
function actualizarVendedorInfo(cli){
  const el=$('#f-vend-info');if(!el)return;
  let nombreVend=null;
  if(!cli||!cli.vendedorId){el.textContent='Sin vendedor asignado';el.style.color='var(--muted-2)';}
  else{const v=vendedores.find(x=>x.id===cli.vendedorId);nombreVend=v?v.nombre:null;el.textContent=v?v.nombre:'—';el.style.color='var(--ink)';el.style.fontWeight='600';}
  // El sub-vendedor de Whaticket ahora es FIJO por cliente (se elige en la ficha del cliente,
  // no en el pedido). Aquí solo se oculta el selector viejo y se muestra a título informativo.
  const wrap=$('#f-subvend-wrap');
  if(wrap)wrap.style.display='none';
  if(el&&esVendedorCanal(nombreVend)&&cli&&cli.subVendedorNombre){
    el.textContent=(nombreVend||'—')+' · vende: '+cli.subVendedorNombre;
  }
  mostrarAlertaSaldo(cli);
}
function mostrarAlertaSaldo(cli){
  const box=$('#f-saldo-alert');if(!box)return;
  if(!cli){box.style.display='none';return;}
  // Cada cliente/sede maneja su propia cuenta (independiente).
  const facturas=documentos.filter(d=>d.clienteId===cli.id&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada');
  const vencidas=facturas.filter(f=>arInfo(f).vencido);
  const saldoTotal=facturas.reduce((s,f)=>s+arInfo(f).saldo,0);
  const saldoVencido=vencidas.reduce((s,f)=>s+arInfo(f).saldo,0);
  if(saldoVencido>0.001){
    box.style.display='block';
    box.innerHTML=`<div class="note n-danger" style="margin:0;cursor:pointer" onclick="abrirCliente(${cli.id})">
      <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <span><b>⚠ Cliente con saldo vencido:</b> ${money(saldoVencido)} en ${vencidas.length} factura${vencidas.length!==1?'s':''} vencida${vencidas.length!==1?'s':''}. Saldo total pendiente: ${money(saldoTotal)}. Confirmá con cobros antes de despachar.</span></div>`;
  }else if(saldoTotal>0.001){
    box.style.display='block';
    box.innerHTML=`<div class="note" style="margin:0;background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2)">
      <svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg>
      <span>Este cliente tiene un saldo pendiente de <b>${money(saldoTotal)}</b> (al día). Sin facturas vencidas.</span></div>`;
  }else{
    box.style.display='none';
  }
}
window.mostrarAlertaSaldo=mostrarAlertaSaldo;
// (El manejo del input de cliente ahora lo hace el autocompletado en setupAutocomplete)
function precioCliente(cli,prod){return (cli&&cli.precios&&cli.precios[prod.id]!=null)?cli.precios[prod.id]:prod.precio;}
// Guarda los precios del pedido actual en la ficha del cliente (lista de precios por cliente)
function guardarPreciosAlCliente(){
  const cli=clienteSel();
  if(!cli){toast('✗ Seleccioná un cliente','Elegí el cliente antes de guardar precios',true);return;}
  if(!cart.length){toast('✗ Pedido vacío','Agregá productos al pedido primero',true);return;}
  if(!cli.precios)cli.precios={};
  let nuevos=0,cambiados=0;
  cart.forEach(it=>{
    const prod=productos.find(p=>p.id===it.id);
    const base=prod?prod.precio:null;
    const actual=cli.precios[it.id];
    const nuevo=Number(it.precio)||0;
    // Solo guardamos si el precio difiere del precio de lista, o si ya tenía uno especial
    if(actual==null){ if(base==null||nuevo!==base){cli.precios[it.id]=nuevo;nuevos++;} }
    else if(actual!==nuevo){cli.precios[it.id]=nuevo;cambiados++;}
  });
  if(nuevos+cambiados===0){toast('Sin cambios','Los precios ya coinciden con la ficha del cliente');return;}
  if(typeof guardarCliente==='function')guardarCliente(cli);
  logAudit('Precios guardados a cliente',`${cli.nombre}: ${nuevos} nuevo(s), ${cambiados} actualizado(s)`);
  toast('✓ Precios guardados',`${cli.nombre}: ${nuevos} nuevo(s), ${cambiados} actualizado(s)`);
}
// Muestra/oculta el botón según haya cliente y productos
function toggleBtnPrecios(){
  const b=$('#btn-guardar-precios');if(!b)return;
  b.style.display=(clienteSel()&&cart.length)?'':'none';
}
// ---- Búsqueda flexible de productos ----
// Acepta: "CLO-002", "Cloro", "CLO-002 — Cloro concentrado", "CLO-002 — Cloro concer (stock: 7)", etc.
function buscarProducto(v){
  const q=v.toLowerCase().trim();
  // 1. Coincidencia exacta con el formato del datalist
  let r=productos.find(x=>`${x.codigo} — ${x.nombre} (stock: ${x.stock})`.toLowerCase()===q);
  if(r)return r;
  // 2. Empieza con el código (cuando el browser trunca la sugerencia)
  r=productos.find(x=>q.startsWith(x.codigo.toLowerCase()));
  if(r)return r;
  // 3. Código exacto
  r=productos.find(x=>x.codigo.toLowerCase()===q);
  if(r)return r;
  // 4. El valor contiene el código al inicio (ej "clo-002 — cloro concer")
  r=productos.find(x=>q.includes(x.codigo.toLowerCase()));
  if(r)return r;
  // 5. Nombre parcial
  r=productos.find(x=>x.nombre.toLowerCase().includes(q)||q.includes(x.nombre.toLowerCase().slice(0,8)));
  return r||null;
}

function addPedidoProducto(){
  const inp=$('#f-add');const v=(inp.value||'').trim();if(!v)return;
  const p=buscarProducto(v);
  if(!p){toast('✗ Producto no encontrado','Buscá por SKU o nombre',true);return;}
  agregarAlCart(p);
  inp.value='';render();
}
// Agrega un producto al carrito por su ID (usado por el autocompletado)
function agregarProductoPorId(id){
  const p=productos.find(x=>x.id===id);
  if(!p){toast('✗ Producto no encontrado','',true);return;}
  agregarAlCart(p);render();
}
window.agregarProductoPorId=agregarProductoPorId;
// ── Movimiento de stock: fuente única ────────────────────────
// Aplica un cambio de existencias al "bucket" correcto según el empaque
// y el modo de venta. delta>0 reingresa, delta<0 descuenta.
// Solo un producto caja_unidad vendido POR CAJA mueve stockCajas;
// todo lo demás mueve stock.
function aplicarStock(p,delta,modoVenta){
  if(!p||!delta)return;
  if(esServicio(p))return; // los servicios no manejan inventario
  if(p.tipoEmpaque==='caja_unidad'&&modoVenta==='caja')p.stockCajas=(Number(p.stockCajas)||0)+delta;
  else p.stock=(Number(p.stock)||0)+delta;
  if(typeof guardarProducto==='function')guardarProducto(p);
}
window.aplicarStock=aplicarStock;
// Lógica común de agregar al carrito
function agregarAlCart(p){
  // Todo producto que se maneja por caja entra al pedido POR CAJA por defecto
  // (se puede cambiar a "por unidad" en el selector de la línea).
  const modoDefault=(p.tipoEmpaque==='caja'||p.tipoEmpaque==='caja_unidad')?'caja':'unidad';
  const ex=cart.find(c=>c.id===p.id&&c.modoVenta===modoDefault);
  if(ex)ex.cantidad++;
  else{
    const modoVenta=modoDefault;
    const pc=precioCliente(clienteSel(),p);
    const precio0=(p.tipoEmpaque==='caja_unidad'&&modoVenta==='unidad')?(Number(p.precioUnidad)||(p.unidadesPorCaja?+(pc/Number(p.unidadesPorCaja)).toFixed(2):pc)):pc;
    cart.push({id:p.id,codigo:p.codigo,nombre:p.nombre,precio:precio0,unidad:p.unidad,cantidad:1,descuento:0,stock:p.stock,
      tipoEmpaque:p.tipoEmpaque||'unidad',unidadesPorCaja:p.unidadesPorCaja,modoVenta});
  }
}
window.addPedidoProducto=addPedidoProducto;
// Cambiar entre vender unidad o caja en una línea del pedido
window.setModoVenta=(i,modo)=>{
  const it=cart[i];it.modoVenta=modo;
  const p=productos.find(x=>x.id===it.id);
  if(p){
    // caja → precio de la caja (o precio del cliente) · unidad → precio de la unidad suelta
    const pc=precioCliente(clienteSel(),p);
    if(modo==='caja')it.precio=pc;
    else it.precio=Number(p.precioUnidad)||(p.unidadesPorCaja?+(pc/Number(p.unidadesPorCaja)).toFixed(2):pc);
  }
  render();
};
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement.id==='f-add')addPedidoProducto();});

function render(){
  guardarBorrador();
  $('#f-empty').style.display=cart.length?'none':'block';
  // Disponibilidad según el modo de venta de la línea
  const avail=it=>{
    const p=productos.find(x=>x.id===it.id);if(!p)return 0;
    if(esServicio(p))return Infinity; // servicio: disponibilidad ilimitada
    const _prev=editId?editOldMap[it.id]:null;
    const oldQ=(_prev&&_prev.modo===it.modoVenta)?(_prev.q||0):0;
    if(it.modoVenta==='caja'){
      // vende cajas: disponibles son las cajas cerradas
      return (p.tipoEmpaque==='caja'?p.stock:(p.stockCajas||0))+oldQ;
    }
    return p.stock+oldQ; // vende unidades
  };
  $('#f-items').innerHTML=cart.map((it,i)=>{const a=avail(it);const ex=it.cantidad>a;
    const esCajaUnidad=it.tipoEmpaque==='caja_unidad';
    const selModo=esCajaUnidad?`<select onchange="setModoVenta(${i},this.value)" style="font-size:11px;padding:3px 5px;margin-top:3px">
        <option value="unidad" ${it.modoVenta==='unidad'?'selected':''}>por unidad</option>
        <option value="caja" ${it.modoVenta==='caja'?'selected':''}>por caja (${it.unidadesPorCaja} u)</option>
      </select>`:'';
    const unidadTxt=it.modoVenta==='caja'?'caja':(it.unidad||'und');
    return `<div class="li">
    <div><div class="nm">${it.nombre}</div><div class="sk">${it.codigo} · <span class="${ex?'stk low':''}">${a===Infinity?'servicio · sin inventario':`disp. ${a} ${unidadTxt}${a!==1?'s':''}`}</span>${selModo}</div></div>
    <input type="number" min="1" value="${it.cantidad}" style="${ex?'border-color:var(--danger)':''}" oninput="updLive(${i},'cantidad',this.value)" onblur="render()">
    <input type="number" min="0" step="0.01" value="${it.precio}" oninput="updLive(${i},'precio',this.value)" onblur="render()">
    <input type="number" min="0" step="0.01" value="${it.descuento}" oninput="updLive(${i},'descuento',this.value)" onblur="render()">
    <div style="text-align:right;font-weight:600" class="num">${money(it.cantidad*it.precio-it.descuento)}</div>
    <button class="x" onclick="rm(${i})">×</button></div>`;}).join('');
  const total=cart.reduce((s,it)=>s+(it.cantidad*it.precio-it.descuento),0);
  $('#s-base').textContent=money(total/1.12);$('#s-iva').textContent=money(total-total/1.12);$('#s-tot').textContent=money(total);
  const sin=cart.filter(it=>it.cantidad>avail(it));
  $('#n-stk').style.display=sin.length?'flex':'none';
  if(sin.length)$('#n-stk').querySelector('span').textContent='Inventario insuficiente: '+sin.map(it=>`${it.nombre} (disp. ${avail(it)})`).join(', ');
  $('#f-go').textContent=editId?'Guardar cambios':'Ingresar pedido';
  $('#f-cancel').style.display=editId?'block':'none';
  $('#f-go').disabled=!cart.length||sin.length>0;
  toggleBtnPrecios();
}
window.upd=(i,k,v)=>{cart[i][k]=Number(v)||0;render();};
window.updLive=(i,k,v)=>{
  cart[i][k]=Number(v)||0;
  // El descuento no puede superar el importe de la línea (dejaba totales negativos)
  if(k==='descuento'||k==='cantidad'||k==='precio'){
    const it=cart[i], tope=(Number(it.cantidad)||0)*(Number(it.precio)||0);
    if((Number(it.descuento)||0)>tope)it.descuento=Math.round(tope*100)/100;
    if((Number(it.descuento)||0)<0)it.descuento=0;
  }
  // Recalcula solo los totales y el subtotal de la fila, sin redibujar inputs
  const total=cart.reduce((s,it)=>s+(it.cantidad*it.precio-it.descuento),0);
  if($('#s-base'))$('#s-base').textContent=money(total/1.12);
  if($('#s-iva'))$('#s-iva').textContent=money(total-total/1.12);
  if($('#s-tot'))$('#s-tot').textContent=money(total);
  // Actualiza el subtotal visible de la fila editada
  const fila=document.querySelectorAll('.li')[i];
  if(fila){const sub=fila.querySelector('.num');if(sub)sub.textContent=money(cart[i].cantidad*cart[i].precio-cart[i].descuento);}
};
window.rm=i=>{cart.splice(i,1);render();};

$('#f-go').onclick=async()=>{
  const cli=clientes.find(c=>c.id===Number($('#f-cli').value));
  if(!cli){toast('Seleccioná un cliente','Buscá por nombre o NIT en el campo de cliente',true);return;}
  if(esVentas()&&cli.vendedorId!==miVendedorId()){toast('Cliente no asignado','Solo podés crear pedidos para tus clientes',true);return;}
  const total=cart.reduce((s,it)=>s+(it.cantidad*it.precio-it.descuento),0);
  const totales={total,baseSinIva:total/1.12,iva:total-total/1.12};
  const _nitPed=leerNitPedido(cli);
  if(editId){
    const f=documentos.find(d=>d.id===editId);
    const ids=new Set([...Object.keys(editOldMap).map(Number),...cart.map(it=>it.id)]);
    ids.forEach(id=>{
      const prev=editOldMap[id]||{q:0,modo:undefined};
      const ci=cart.find(it=>it.id===id);
      const p=productos.find(x=>x.id===id);if(!p)return;
      const newQ=ci?ci.cantidad:0, newModo=ci?ci.modoVenta:prev.modo;
      // Si cambió el modo (caja↔unidad) hay que devolver al bucket viejo y descontar del nuevo
      if(prev.modo===newModo)aplicarStock(p,-(newQ-(prev.q||0)),newModo);
      else{aplicarStock(p,prev.q||0,prev.modo);aplicarStock(p,-newQ,newModo);}
    });
    const vend=vendedores.find(v=>v.id===cli.vendedorId)||vendedores[0];
    const subVendEd=esVendedorCanal(vend?.nombre)?(cli.subVendedorNombre||null):null;
    Object.assign(f,{clienteId:cli.id,clienteNombre:cli.razonSocial||cli.nombre,clienteComercial:cli.nombre,clienteNit:cli.nit,vendedorId:vend.id,vendedorNombre:vend.nombre,subVendedorNombre:subVendEd,items:cart.map(it=>({...it})),totales,ordenCompra:$('#f-oc').value,observaciones:$('#f-obs').value,notaInterna:$('#f-nota')?.value||'',nitFacturado:_nitPed.nit,nombreFacturado:_nitPed.nombre});
    toast('✓ Pedido actualizado',refPed(f)+' · inventario ajustado');
    logAudit('Pedido editado',refPed(f)+' · '+cli.nombre+' · '+money(totales.total));
    if(typeof guardarDocumento==='function')guardarDocumento(f);
    editId=null;editOldMap={};
  }else{
    cart.forEach(it=>{const p=productos.find(x=>x.id===it.id);if(p)aplicarStock(p,-it.cantidad,it.modoVenta);});
    const vend=vendedores.find(v=>v.id===cli.vendedorId)||vendedores[0];
    const subVend=esVendedorCanal(vend?.nombre)?(cli.subVendedorNombre||null):null;
    // Id temporal NEGATIVO: los ids reales de la base son positivos, así que un
    // temporal nunca puede coincidir con otro documento (evita facturar el equivocado).
    const nuevoId=-Date.now();
    const doc={id:nuevoId,numero:corr,tipoDoc:'pedido',clienteId:cli.id,clienteNombre:cli.razonSocial||cli.nombre,clienteComercial:cli.nombre,clienteNit:cli.nit,vendedorId:vend?.id,vendedorNombre:vend?.nombre,subVendedorNombre:subVend,
      items:cart.map(it=>({...it})),totales,estado:'abierto',inventarioRebajado:true,creada:new Date().toISOString(),ordenCompra:$('#f-oc').value,observaciones:$('#f-obs').value,notaInterna:$('#f-nota')?.value||'',nitFacturado:_nitPed.nit,nombreFacturado:_nitPed.nombre,_nuevo:true};
    documentos.push(doc);corr++;
    logAudit('Pedido creado','PED-'+padn(doc.numero)+' · '+cli.nombre+' · '+money(totales.total));
    // Esperamos el id real de la base ANTES de dibujar la lista, para que los
    // botones (Ver / Facturar) nazcan apuntando al documento correcto.
    if(typeof guardarDocumento==='function')await guardarDocumento(doc);
    if(doc.id<0)toast('⚠ Pedido guardado solo en pantalla','No se pudo confirmar con la base. Recargá y verificá antes de facturarlo.',true);
    else toast('✓ Pedido ingresado','PED-'+padn(doc.numero)+' · inventario rebajado. Facturalo o convertilo en Documentos.');
  }
  cart=[];if($('#f-cli'))$('#f-cli').value='';if($('#f-cli-search'))$('#f-cli-search').value='';if(typeof actualizarVendedorInfo==='function')actualizarVendedorInfo(null);$('#f-oc').value='';$('#f-obs').value='';if($('#f-nota'))$('#f-nota').value='';if($('#f-subvend'))$('#f-subvend').value='';if($('#f-subvend-wrap'))$('#f-subvend-wrap').style.display='none';if($('#f-nit-wrap'))$('#f-nit-wrap').style.display='none';limpiarBorrador();initForm();render();go('documentos');
};

function rowDoc(withActions){
  return f=>{
    const [lbl,cls]=TIPO_LBL[f.tipoDoc]||['Documento','p-ped'];
    const lblFinal=(f.exenta||f.esExenta)?lbl+' <span style="font-size:10px;background:var(--warn-bg);color:var(--warn);padding:1px 6px;border-radius:8px;font-weight:700;vertical-align:middle">EXENTA</span>':lbl;
    const E={abierto:['Abierto','b-warn'],pendiente:['Pendiente de facturar','b-warn'],certificada:['Certificada','b-ok'],facturado:['Facturado','b-ok'],anulada:['Anulada','b-muted'],devuelto:['Devuelto','b-info']};
    let [en,ec]=E[f.estado]||['—','b-muted'];
    if(f.estado==='pendiente'&&f.tipoDoc==='prestamo')en='En préstamo';
    else if(f.estado==='pendiente'&&f.tipoDoc==='envio')en='Enviado';
    const origen=f.facturaOrigenId?(()=>{const fo=documentos.find(x=>x.id===f.facturaOrigenId);return `<div class="sub-origen">Aplica a: ${fo?fo.serie+'-'+fo.numeroDte:'factura'}</div>`;})():(f.tipoDoc!=='pedido'?`<div class="sub-origen">Origen: PED-${padn(f.numero)}</div>`:'');
    let items=[];
    if(withActions){
      // Ver siempre visible
      items.push(`<button class="act-primary" onclick="verDoc(${f.id})">Ver documento</button>`);
      if(f.clienteId)items.push(`<button onclick="abrirCliente(${f.clienteId})">Ver cliente</button>`);
      items.push(`<button onclick="recordatorioDesdeDoc(${f.id})">Recordatorio</button>`);

      if(f.tipoDoc==='pedido'&&f.estado==='abierto'){
        items.push('<div class="act-sep"></div>');
        if(canFacturar())items.push(`<button class="act-primary" onclick="confirmar('Facturar pedido','Vas a generar la Factura Cambiaria de ${refPed(f)} por ${money(f.totales.total)}. Esta acción certifica el documento ante SAT.','Facturar',()=>abrirFacturar(${f.id}))">Facturar</button>`);
        if(canFacturar()&&canAnular())items.push(`<button class="act-warn" onclick="abrirFacturarExenta(${f.id})">⚡ Factura exenta de IVA</button>`);
        items.push('<div class="act-sep"></div>');
        items.push(`<button onclick="generarNota(${f.id},'envio')">Nota de envío</button>`);
        items.push(`<button onclick="generarNota(${f.id},'prestamo')">Nota de préstamo</button>`);
        items.push(`<button onclick="editarPedido(${f.id})">Editar pedido</button>`);
        if(canAnular()){items.push('<div class="act-sep"></div>');items.push(`<button class="act-danger" onclick="confirmar('Cancelar pedido','Se cancelará ${refPed(f)} y se reintegrará el inventario rebajado. Esta acción no se puede deshacer.','Cancelar pedido',()=>cancelarPedido(${f.id}))">Cancelar pedido</button>`);}
      }
      if((f.tipoDoc==='envio'||f.tipoDoc==='prestamo')&&f.estado==='pendiente'){
        items.push('<div class="act-sep"></div>');
        if(canFacturar())items.push(`<button class="act-primary" onclick="confirmar('Facturar','Vas a generar la Factura Cambiaria de ${refPed(f)} por ${money(f.totales.total)}. Esta acción certifica el documento ante SAT.','Facturar',()=>abrirFacturar(${f.id}))">Facturar</button>`);
        if(canFacturar()&&canAnular())items.push(`<button class="act-warn" onclick="abrirFacturarExenta(${f.id})">⚡ Factura exenta de IVA</button>`);
        items.push(`<button onclick="confirmar('Regresar a pedido','${refPed(f)} volverá a estado Pedido y podrás editarlo o generar otro documento.','Regresar a pedido',()=>regresar(${f.id}))">Regresar a pedido</button>`);
      }
      if(f.tipoDoc==='prestamo'&&f.estado==='pendiente')
        items.push(`<button onclick="confirmar('Devolver préstamo','El inventario de ${refPed(f)} se reintegrará y la nota quedará marcada como devuelta.','Devolver',()=>devolver(${f.id}))">Devolver</button>`);
      if(f.tipoDoc==='cambiaria'&&['certificada','facturado'].includes(f.estado)){
        items.push('<div class="act-sep"></div>');
        if(canAnular())items.push(`<button onclick="openNotaCD(${f.id})">Nota de crédito</button>`);
        if(canAnular())items.push(`<button class="act-danger" onclick="abrirAnular(${f.id})">Anular</button>`);
      }
      if(f.tipoDoc==='notaCredito'&&f.estado==='certificada'&&canAnular()){
        items.push('<div class="act-sep"></div>');
        items.push(`<button class="act-danger" onclick="confirmar('Anular ${(TIPO_LBL[f.tipoDoc]||["Documento"])[0]}','Vas a anular ${f.serie}-${f.numeroDte} por ${money(f.totales.total)}. El saldo de la factura origen se recalculará. Esta acción no se puede deshacer.','Anular',()=>anularNotaCD(${f.id}))">Anular nota</button>`);
      }
    }
    const noCol=(f.serie?f.serie+'-'+f.numeroDte:refPed(f));
    const dropId='drop-'+f.id;
    return `<tr>
      <td style="font-weight:600">${noCol}</td>
      <td><span class="pill ${cls}">${lblFinal}</span>${origen}</td>
      <td>${f.clienteComercial||f.clienteNombre}</td>
      ${withActions?`<td style="color:var(--muted)">${fdate(fechaDoc(f))}</td>`:''}
      <td class="num" style="font-weight:600">${money(f.totales.total)}</td>
      ${withActions?`<td class="num">${(f.tipoDoc==='cambiaria'&&f.estado!=='anulada')?(()=>{const _inf=arInfo(f);const _c=_inf.saldo<=0.001?'var(--ok)':(_inf.abon>0?'var(--warn)':'var(--danger)');return `<span style="color:${_c};font-weight:700">${money(_inf.saldo)}</span>`;})():'<span style="color:var(--muted)">—</span>'}</td>`:''}
      <td><span class="badge ${ec}">${en}</span></td>
      ${withActions?`<td><div class="acts"><button class="acts-btn" onclick="toggleDrop('${dropId}',event)">Acciones<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button><div class="acts-drop" id="${dropId}">${items.join('')}</div></div></td>`:''}
    </tr>`;
  };
}
function toggleDrop(id,e){
  e.stopPropagation();
  const drop=document.getElementById(id);if(!drop)return;
  const isOpen=drop.classList.contains('open');
  document.querySelectorAll('.acts-drop.open').forEach(d=>d.classList.remove('open'));
  if(!isOpen)drop.classList.add('open');
}
window.toggleDrop=toggleDrop;
document.addEventListener('click',e=>{
  if(e.target.closest('.acts-drop'))document.querySelectorAll('.acts-drop.open').forEach(d=>d.classList.remove('open'));
  else if(!e.target.closest('.acts-btn'))document.querySelectorAll('.acts-drop.open').forEach(d=>d.classList.remove('open'));
});
function docsEnRango(d){
  // Por defecto los anulados no se muestran (hacen bulto). El check "Ver
  // anulados" los vuelve a mostrar. No se borran: siguen en la base (las
  // facturas anuladas son registro fiscal), sólo se ocultan de la lista.
  if(!$('#docs-ver-anulados')?.checked && (d.estado==='anulada'||d.anulado))return false;
  const tipo=$('#docs-tipo')?.value;
  if(tipo&&d.tipoDoc!==tipo)return false;
  const desde=$('#docs-desde')?.value,hasta=$('#docs-hasta')?.value;
  if(desde&&new Date(d.creada)<new Date(desde+'T00:00:00'))return false;
  if(hasta&&new Date(d.creada)>new Date(hasta+'T23:59:59'))return false;
  return true;
}
function limpiarFechaDocs(){$('#docs-tipo').value='';$('#docs-desde').value='';$('#docs-hasta').value='';renderDocs();}
window.limpiarFechaDocs=limpiarFechaDocs;
function esteMesDocs(){const hoy=fechaHoyGT();$('#docs-desde').value=hoy.slice(0,7)+'-01';$('#docs-hasta').value=hoy;renderDocs();}
window.esteMesDocs=esteMesDocs;
// Última actividad del documento: el más reciente de creación, facturación, anulación, devolución o abonos.
function ultimaActividad(d){
  let t=new Date(d.creada||0).getTime()||0;
  const upd=x=>{ if(x){ const v=new Date(x).getTime(); if(v>t)t=v; } };
  upd(d.fechaCertificacion); upd(d.anuladoFecha); upd(d.devueltoFecha);
  (d.abonos||[]).forEach(a=>upd(a.registradoEl||a.fecha));
  return t;
}
// Fecha a MOSTRAR del documento: último cambio del propio documento (facturación/anulación/devolución),
// SIN contar los abonos: un cobro no cambia la fecha de la factura.
function fechaDoc(d){
  let t=new Date(d.creada||0).getTime()||0;
  const upd=x=>{ if(x){ const v=new Date(x).getTime(); if(v>t)t=v; } };
  upd(d.fechaCertificacion); upd(d.anuladoFecha); upd(d.devueltoFecha);
  return t;
}
function renderDocs(){
  let filtrados=documentos.filter(docsEnRango);
  if(esVentas()&&miVendedorId())filtrados=filtrados.filter(d=>d.vendedorId===miVendedorId());
  $('#docs-empty').style.display=filtrados.length?'none':'block';
  // Orden por ÚLTIMA ACTIVIDAD: lo recién facturado/cobrado/creado sube arriba (id como desempate).
  renderPaginado('t-docs',filtrados.slice().sort((a,b)=>(fechaDoc(b)-fechaDoc(a))||((b.id||0)-(a.id||0))).map(rowDoc(true)),'Sin documentos');
  enhanceTable('t-docs');
}
$('#docs-tipo').onchange=renderDocs;
$('#docs-desde').onchange=renderDocs;
$('#docs-hasta').onchange=renderDocs;

// ---- Confirmaciones de seguridad ----
let confirmFn=null;
function cerrarTodo(){
  closeMod();
  document.querySelectorAll('.acts-drop.open').forEach(d=>d.classList.remove('open'));
}
window.cerrarTodo=cerrarTodo;
function confirmar(titulo,mensaje,boton,fn){
  confirmFn=fn;
  openMod(titulo,`<p style="font-size:13px;color:var(--muted);line-height:1.5">${mensaje}</p>`,()=>{cerrarTodo();if(confirmFn)confirmFn();});
  $('#m-save').textContent=boton;$('#m-save').className='btn btn-primary';
}
window.confirmar=confirmar;

// ---- Facturar (siempre genera Factura Cambiaria; el usuario solo ve "Facturar") ----
// Normaliza los NITs secundarios de un cliente a un arreglo [{nit,nombre}] sin importar el formato guardado
function nitsSecNorm(cli){
  let raw=cli&&cli.nitsSecundarios;
  if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=[];}}
  if(!Array.isArray(raw))return [];
  return raw.map(n=>typeof n==='string'?{nit:n,nombre:n}:{nit:(n.nit||n.NIT||'').toString(),nombre:(n.nombre||n.nit||'').toString()}).filter(n=>n.nit);
}
// Construye el selector "Facturar a nombre de" (principal + secundarios), escapando caracteres especiales
function selectorNitHTML(f,cli){
  const nitsSec=nitsSecNorm(cli);
  if(!nitsSec.length)return '';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const nitPrincipalNombre=cli?(cli.razonSocial||cli.nombre):(f.clienteNombre||'');
  const _norm=x=>String(x||'').replace(/[-\s]/g,'').toUpperCase();
  let _idxSel='__principal__';
  if(f.nitFacturado){const i=nitsSec.findIndex(n=>_norm(n.nit)===_norm(f.nitFacturado));if(i>=0)_idxSel=String(i);}
  return `<div style="margin-top:12px">
      <label style="font-size:11px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px">Facturar a nombre de</label>
      <select id="fac-nit-sel" style="width:100%;margin-top:4px">
        <option value="__principal__"${_idxSel==='__principal__'?' selected':''}>${esc(nitPrincipalNombre)} · NIT ${esc(f.clienteNit||'CF')} (principal)</option>
        ${nitsSec.map((n,i)=>`<option value="${i}"${_idxSel===String(i)?' selected':''}>${esc(n.nombre||n.nit)} · NIT ${esc(n.nit)}</option>`).join('')}
      </select>
      <div style="font-size:11px;color:var(--muted);margin-top:5px">La factura sale al NIT elegido, pero la venta queda registrada en ${esc(nitPrincipalNombre)}.</div>
    </div>`;
}
// Alerta de nota interna para mostrar ANTES de facturar. Devuelve el banner + un checkbox
// que OBLIGA a confirmar (deshabilita el botón Facturar hasta marcarlo). Vacío si no hay nota.
function notaInternaAlertHTML(f){
  const nota=((f&&f.notaInterna)||'').trim();
  if(!nota)return '';
  const esc=String(nota).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div class="note n-danger" style="margin:0 0 10px"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span><b>📌 Nota interna:</b> ${esc}<br><span style="font-size:11px;opacity:.85">Revisá que no quede nada pendiente (inventario, datos) antes de facturar.</span></span></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--danger);margin:0 0 14px;cursor:pointer"><input type="checkbox" id="nota-ack" onchange="var b=document.getElementById('m-save');if(b)b.disabled=!this.checked" style="width:16px;height:16px;cursor:pointer"> Entendido, ya revisé lo pendiente de la nota</label>`;
}
function abrirFacturar(id){
  const f=documentos.find(d=>d.id===id);
  const esCF=String(f.clienteNit).toUpperCase().replace(/[-\s]/g,'')==='CF';
  if(esCF&&f.totales.total>=2500){toast('No se puede facturar como Consumidor Final por '+money(f.totales.total),'A partir de Q2,500 se requiere NIT, CUI o Pasaporte.',true);return;}
  // Los días de crédito se toman del cliente (ya configurados en su ficha)
  const cli=clientes.find(c=>c.id===f.clienteId);
  const dias=(cli&&typeof cli.tiempoCredito==='number')?cli.tiempoCredito:0;
  const creditoTxt=dias>0?(dias+' días de crédito'):'Contado (sin crédito)';
  // Si el cliente tiene NITs secundarios, ofrecer un menú para elegir a cuál facturar
  const selectorNit=selectorNitHTML(f,cli);
  // Si el vendedor del pedido es un CANAL (ej. Whaticket), pedir quién vendió realmente
  // El sub-vendedor de Whaticket ahora se captura al generar el pedido, no al facturar.
  const selectorSubVend='';
  openMod('Facturar PED-'+padn(f.numero),
    notaInternaAlertHTML(f)+dirCiudadAlertHTML(f)+`<p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">Se generará la Factura Cambiaria por <b style="color:var(--ink)">${money(f.totales.total)}</b>.</p>
     <div style="background:var(--surface-2);border-radius:8px;padding:12px 14px;font-size:12.5px">
       <div style="color:var(--muted)">Condición de pago del cliente:</div>
       <div style="font-weight:600;color:var(--ink);margin-top:2px">${creditoTxt}</div>
     </div>${selectorNit}${selectorSubVend}
     <div style="margin-top:16px;padding-top:13px;border-top:1px solid var(--line);text-align:center"><button class="btn btn-ghost btn-sm" onclick="cerrarTodo();editarPedido(${f.id})">✏️ Editar pedido antes de facturar</button></div>`,
    ()=>facturarPedido(id,dias));
  if(((f.notaInterna)||'').trim())$('#m-save').disabled=true;
}
window.abrirFacturar=abrirFacturar;
async function facturarPedido(id,dias){
  if(!canFacturar()){toast('Sin permiso','Tu rol no puede facturar',true);return;}
  const f=documentos.find(d=>d.id===id);
  if(!f){toast('✗ Pedido no encontrado',null,true);return;}

  // Si se eligió facturar a un NIT secundario, guardarlo aparte (la venta sigue en el cliente real)
  const selNit=document.getElementById('fac-nit-sel');
  if(selNit && selNit.value!=='__principal__'){
    const cli=clientes.find(c=>c.id===f.clienteId);
    const ns=nitsSecNorm(cli)[Number(selNit.value)]||null;
    if(ns){
      f.nitFacturado=ns.nit;
      f.nombreFacturado=ns.nombre||ns.nit;
    }
  }else{ f.nitFacturado=null; f.nombreFacturado=null; }
  // El sub-vendedor de Whaticket viaja desde el pedido; no se toca al facturar.

  // Si no hay backend configurado, usar modo simulado (como antes)
  if(typeof FEL_BACKEND_URL==='undefined' || FEL_BACKEND_URL.includes('TU-BACKEND')){
    const uuid='SIM-'+Math.random().toString(36).slice(2,10).toUpperCase();
    Object.assign(f,{tipoDoc:'cambiaria',estado:'certificada',autorizacion:uuid,serie:uuid.slice(4),numeroDte:String(1000000000+f.id),
      diasCredito:dias,vencimiento:new Date(Date.now()+dias*86400000).toISOString(),abonos:[],estadoPago:'pendiente',creada:new Date().toISOString(),fechaCertificacion:new Date().toISOString()});
    closeMod();renderDocs();
    toast('✓ Factura SIMULADA','Configurá FEL_BACKEND_URL para facturar de verdad');
    logAudit('Factura emitida (simulada)',f.serie+'-'+f.numeroDte+' · '+(f.clienteComercial||f.clienteNombre));
    if(typeof guardarDocumento==='function')guardarDocumento(f);
    return;
  }

  // Modo real: llamar al backend FEL
  toast('⏳ Emitiendo factura...','Conectando con EcoFactura (puede tardar un momento)');
  const hoy=fechaHoyGT();
  const venc=sumarDiasFecha(fechaHoyGT(),dias);
  // Datos comerciales extra para los campos adicionales del XML (TrnCampAd):
  // condición de pago, vendedor y fecha de vencimiento en formato dd/mm/aaaa
  const condicionPago=(dias>0)?'CREDITO':'CONTADO';
  const vendedorIniciales=inicialesVendedor(f.vendedorNombre||currentUser||'');
  const vencDDMMAAAA=(()=>{const d=new Date(Date.now()+dias*86400000);return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();})();
  const payload={
    numero:f.id,
    fecha:hoy,
    cliente:{
      nit:f.nitFacturado||f.clienteNit||'CF',
      nombre:f.nombreFacturado||f.clienteNombre||f.clienteComercial||'Consumidor Final',
      direccion:dirFiscalDoc(f),
      email:f.clienteEmail||'',
    },
    items:(f.items||[]).map(it=>{
      const _uS=it.tipoEmpaque==='caja_unidad'&&it.modoVenta==='unidad';
      const _hc=it.codigo&&(''+it.codigo).trim()&&(''+it.codigo).trim().toUpperCase()!=='GEN';
      const _cod=_hc?(''+it.codigo).trim()+(_uS?'-U':''):'GEN';
      const _uni=_uS?'UNIDAD':((''+(it.unidad||'UNI')).trim()||'UNI');
      return {codigo:_cod, nombre:(_hc?_cod+' - ':'')+it.nombre+' - '+_uni, cantidad:it.cantidad, precio:it.precio, descuento:it.descuento||0, unidad:_uni, tipo:'B'};
    }),
    total:f.totales.total,
    vencimiento:venc,
    observaciones:f.observaciones||'',
    // Campos comerciales extra (para TrnCampAd en el backend)
    condicionPago:condicionPago,
    vendedor:vendedorIniciales,
    vencimientoTexto:vencDDMMAAAA,
  };

  try{
    const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/certificar',{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
    });
    const data=await r.json();
    if(r.ok && data.ok){
      // Factura certificada de verdad
      Object.assign(f,{tipoDoc:'cambiaria',estado:'certificada',
        autorizacion:data.uuid, serie:data.serie, numeroDte:data.numeroDTE,
        fechaCertificacion:data.fechaCert, pdfBase64:data.pdfBase64, xmlBase64:data.xmlBase64,
        diasCredito:dias, vencimiento:new Date(Date.now()+dias*86400000).toISOString(),
        abonos:[], estadoPago:'pendiente', creada:new Date().toISOString()});
      closeMod();renderDocs();
      toast('✓ Factura Cambiaria CERTIFICADA','Autorización SAT: '+data.uuid);
      logAudit('Factura emitida (FEL real)',f.serie+'-'+f.numeroDte+' · '+(f.clienteComercial||f.clienteNombre)+' · '+money(f.totales.total));
      if(typeof guardarDocumento==='function')guardarDocumento(f);
      // Descargar el PDF automáticamente a la carpeta de Descargas
      if(f.pdfBase64)descargarFacturaPDF(f.id);
    }else{
      // EcoFactura devolvió un error
      const msg=data.mensaje||data.error||'Error desconocido';
      toast('✗ EcoFactura rechazó la factura',msg,true);
      logAudit('Error al facturar',refPed(f)+' · '+msg);
    }
  }catch(err){
    toast('✗ No se pudo conectar con el servidor FEL','¿Está el backend andando? '+err.message,true);
  }
}
window.facturarPedido=facturarPedido;

// Abrir el PDF que devuelve EcoFactura (viene en Base64)
async function verFacturaPDF(id){
  const f=documentos.find(d=>d.id===id);
  // El PDF ya no viene en la carga inicial: se trae a pedido la primera vez.
  if(f && !(f.estado==='anulada' && f.pdfAnulacionBase64) && typeof asegurarPdfDoc==='function')await asegurarPdfDoc(f);
  // Si la factura está anulada y tenemos el PDF de anulación, mostrar ese (no el original)
  const pdf=(f && f.estado==='anulada' && f.pdfAnulacionBase64)?f.pdfAnulacionBase64:(f&&f.pdfBase64);
  if(!f||!pdf){toast('Esta factura no tiene PDF','Las facturas simuladas no generan PDF',true);return;}
  try{
    const bytes=atob(pdf);
    const arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
    const blob=new Blob([arr],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    window.open(url,'_blank');
  }catch(e){toast('Error al abrir el PDF',e.message,true);}
}
window.verFacturaPDF=verFacturaPDF;

// ---- Factura Exenta de IVA ----
// Escenarios de exención que usa SEFE (códigos OFICIALES de SAT, Frase tipo 4)
// Solo Maquila por ahora. Para agregar más, usar los códigos oficiales de la tabla SAT.
const ESCENARIOS_EXENTA=[
  {cod:11, desc:'Ventas a Maquila — No afecta al IVA (Decreto 29-89, Ley de Maquila)'},
];
