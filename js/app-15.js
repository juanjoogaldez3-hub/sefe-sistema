// =====================================================================
//  PLAN DE COMPRAS — comprar lo que se vende, con el crédito del proveedor
// =====================================================================
// Por empresa (la activa) y por proveedor. Para cada producto calcula cuánto
// se vende por día, cuánto hay (más lo que viene en camino) y para cuántos
// días alcanza. Con eso lo marca:
//   🔴 Pedir ya       → alcanza para menos que entrega + colchón
//   🟢 Bien           → entre el punto de pedido y el máximo
//   🟡 No comprar     → hay más días que el máximo (sobre stock)
//   ⚫ Sin movimiento → hay stock y no se vendió nada en el período
// y sugiere cuánto pedir para quedar en el máximo de días.
//
// La regla del dinero: lo que se compra a crédito (45 días con Ideas en
// Papel) se tiene que VENDER y COBRAR antes de pagarlo:
//   días en bodega + días que tarda el cliente en pagar ≤ días de crédito.
// La pestaña "Flujo de dinero" muestra semana por semana lo que vence con
// proveedores contra lo que se va a cobrar.
//
// Parámetros por empresa en ajustes['plan_compras'][empresa]:
//   entrega (días que tarda el proveedor), colchon (días de seguridad),
//   maximo (días de stock como tope), ventana (días de venta a promediar),
//   credito {provId: límite en Q}.
// =====================================================================
const PC_DEF={entrega:3,colchon:10,maximo:20,ventana:60,credito:{}};
let _pcProv=null, _pcFiltro='todos', _pcBusca='', _pcTab='productos', _pcLlenar=false, _pcBanco=null;

function _pcEmp(){ return (typeof empresaActiva!=='undefined'&&empresaActiva)||'SEFE'; }
function _pcParams(){
  const todo=(typeof ajustes!=='undefined'&&ajustes&&ajustes.plan_compras)||{};
  const p=todo[_pcEmp()]||{};
  return {...PC_DEF,...p,credito:{...(p.credito||{})}};
}
async function _pcGuardarParams(np){
  const todo={...((typeof ajustes!=='undefined'&&ajustes&&ajustes.plan_compras)||{})};
  todo[_pcEmp()]=np;
  const ok=typeof guardarAjuste==='function'?await guardarAjuste('plan_compras',todo):false;
  if(!ok){ ajustes.plan_compras=todo; toast('Guardado solo en esta pantalla','No se pudo guardar en la base; se pierde al recargar.',true); }
  return ok;
}
// Proveedor por defecto: Ideas en Papel de la empresa activa, si existe.
function _pcProvDefault(){
  const ps=deEmpresa(proveedores||[]).filter(p=>p.activo!==false);
  const ideas=ps.find(p=>/ideas\s+en\s+papel/i.test(p.nombre||''));
  return ideas?ideas.id:(ps[0]?ps[0].id:null);
}
const _pcDia=86400000;
function _pcFechaMs(f){ const t=new Date(f).getTime(); return isNaN(t)?0:t; }

// Unidad de compra de un producto: cajas para los que se manejan por caja,
// unidades para el resto. Todo el plan va en esa unidad (como se le pide al
// proveedor) y el costo es por esa unidad.
function _pcUnidad(p){ return (p.tipoEmpaque==='caja_unidad'||p.tipoEmpaque==='caja')?'caja':(String(p.unidad||'unidad').toLowerCase()); }
function _pcStock(p){ const v=(p.tipoEmpaque==='caja_unidad'||p.tipoEmpaque==='caja')?existenciaCajas(p):(Number(p.stock)||0); return Math.max(0,v); }
// Cantidad vendida en una línea de documento, en unidad de compra.
function _pcCantLinea(p,it){
  const c=Number(it.cantidad)||0;
  if(p.tipoEmpaque==='caja_unidad'){ const upc=Number(p.unidadesPorCaja)||Number(it.unidadesPorCaja)||1; return it.modoVenta==='caja'?c:c/upc; }
  return c;
}

// Cálculo completo del plan para la empresa activa y un proveedor.
function _pcCalcular(provId){
  const P=_pcParams(), ahora=Date.now();
  const docs=deEmpresa(documentos||[]).filter(d=>['cambiaria','envio'].includes(d.tipoDoc)&&!d.anulado&&!['anulada','borrador'].includes(d.estado));
  // Desde cuándo hay detalle de productos en las ventas de esta empresa (las
  // facturas importadas de otro sistema pueden venir sin líneas).
  let primero=ahora;
  docs.forEach(d=>{ if(Array.isArray(d.items)&&d.items.length){ const t=_pcFechaMs(d.creada); if(t&&t<primero)primero=t; } });
  const diasDatos=Math.max(1,(ahora-primero)/_pcDia);
  const ventana=Math.max(7,Math.min(Number(P.ventana)||60,diasDatos));
  const desde=ahora-ventana*_pcDia;
  // Ventas por producto (id) en la ventana + última venta (de todo el historial).
  const vend={}, ultima={}, ventaQ={tot:0};
  docs.forEach(d=>{
    const t=_pcFechaMs(d.creada);
    (d.items||[]).forEach(it=>{ const k=it.id!=null?it.id:it.codigo; if(!ultima[k]||t>ultima[k])ultima[k]=t; });
    if(t<desde)return;
    (d.items||[]).forEach(it=>{ const k=it.id!=null?it.id:it.codigo; (vend[k]=vend[k]||[]).push(it); });
  });
  // Productos del proveedor: marcados con él o comprados a él en el último año.
  const comprados=new Set(), compProv=deEmpresa(compras||[]).filter(c=>!c.anulado&&String(c.proveedorId)===String(provId));
  compProv.filter(c=>_pcFechaMs(c.fecha)>=ahora-365*_pcDia).forEach(c=>(c.items||[]).forEach(it=>comprados.add(String(it.id))));
  // En camino: compras (de cualquier proveedor) todavía sin recibir completas.
  const camino={};
  deEmpresa(compras||[]).filter(c=>!c.anulado&&c.estadoRecepcion!=='recibida').forEach(c=>(c.items||[]).forEach(it=>{
    const f=Math.max(0,(Number(it.cantidad)||0)-(Number(it.recibido)||0)); if(f>0)camino[it.id]=(camino[it.id]||0)+f;
  }));
  const minDias=(Number(P.entrega)||0)+(Number(P.colchon)||0), maxDias=Math.max(minDias,Number(P.maximo)||0);
  const filas=[];
  deEmpresa(productos||[]).filter(p=>p.activo!==false&&!(typeof esServicio==='function'&&esServicio(p))).forEach(p=>{
    const delProv=(Array.isArray(p.proveedorIds)&&p.proveedorIds.map(String).includes(String(provId)))||comprados.has(String(p.id));
    if(!delProv)return;
    const lineas=(vend[p.id]||[]).concat(p.codigo&&vend[p.codigo]?vend[p.codigo]:[]);
    const vendido=lineas.reduce((s,it)=>s+_pcCantLinea(p,it),0);
    const vdia=vendido/ventana;
    const stock=_pcStock(p), enCamino=camino[p.id]||0, disp=stock+enCamino;
    const costo=Number(typeof costoActual==='function'?costoActual(p):p.costo)||0;
    if(vdia<=0&&disp<=0)return; // ni se vende ni hay: no cuenta
    const dias=vdia>0?disp/vdia:Infinity;
    let estado;
    if(vdia<=0)estado='sinmov';
    else if(dias<minDias)estado='pedir';
    else if(dias>maxDias)estado='sobra';
    else estado='bien';
    const objetivo=vdia*maxDias;
    let sugerido=0;
    if(estado==='pedir'||(estado==='bien'&&_pcLlenar))sugerido=Math.max(0,Math.ceil(objetivo-disp-1e-9));
    const exceso=estado==='sobra'?Math.max(0,stock-objetivo):(estado==='sinmov'?stock:0);
    const ult=ultima[p.id]||ultima[p.codigo]||0;
    filas.push({p,vdia,vendido,stock,enCamino,disp,dias,estado,sugerido,costo,unidad:_pcUnidad(p),
      valor:stock*costo,valorSug:sugerido*costo,valorExceso:exceso*costo,ultimaVenta:ult,
      diasSinVenta:ult?Math.floor((ahora-ult)/_pcDia):null});
  });
  // Deuda con el proveedor (compras con saldo) y lo comprado este mes.
  let deuda=0, vencido=0, proxVenc=null;
  compProv.forEach(c=>{ const i=apInfo(c); if(i.saldo>0.009){ deuda+=i.saldo; if(i.vencido)vencido+=i.saldo; else if(i.venc&&(!proxVenc||i.venc<proxVenc.f))proxVenc={f:i.venc,m:i.saldo}; } });
  const hoy=new Date(), iniMes=new Date(hoy.getFullYear(),hoy.getMonth(),1).getTime();
  const compradoMes=compProv.filter(c=>_pcFechaMs(c.fecha)>=iniMes).reduce((s,c)=>s+(Number(c.total)||0),0);
  const T=filas.reduce((a,f)=>{a.valor+=f.valor;a.costoDia+=f.vdia*f.costo;return a;},{valor:0,costoDia:0});
  return {P,ventana,diasDatos,minDias,maxDias,filas,deuda,vencido,proxVenc,compradoMes,
    valor:T.valor,costoMes:T.costoDia*30,diasCob:T.costoDia>0?T.valor/T.costoDia:null,
    limite:Number(P.credito&&P.credito[provId])||0};
}

// Días promedio que tardan los clientes en pagar (ponderado por monto), con
// las facturas ya pagadas de los últimos 5 meses.
function _pcDiasCobro(){
  const ahora=Date.now(); let s=0,w=0;
  deEmpresa(documentos||[]).forEach(d=>{
    if(d.tipoDoc!=='cambiaria'||d.anulado||d.estado==='anulada')return;
    const t=_pcFechaMs(d.creada); if(t<ahora-150*_pcDia)return;
    const i=arInfo(d); if(i.estado!=='pagado')return;
    const ab=(d.abonos||[]).filter(a=>!a.anulado); if(!ab.length)return;
    const ult=Math.max(...ab.map(a=>_pcFechaMs(a.fecha+(String(a.fecha).length===10?'T12:00:00':''))));
    const dias=Math.max(0,(ult-t)/_pcDia), m=Number(d.totales&&d.totales.total)||0;
    s+=dias*m; w+=m;
  });
  return w>0?s/w:null;
}

const PC_EST={pedir:['🔴','Pedir ya','danger'],bien:['🟢','Bien','ok'],sobra:['🟡','No comprar','warn'],sinmov:['⚫','Sin movimiento','muted']};
function _pcNum(n,dec){ return (Math.round(n*(dec?100:1))/(dec?100:1)).toLocaleString('es-GT',{maximumFractionDigits:dec?2:0}); }
function _pcDiasTxt(d){ return d===Infinity?'—':(d>=999?'+999':_pcNum(d)); }

function renderPlanCompras(){
  const box=document.getElementById('pc-body'); if(!box)return;
  const provs=deEmpresa(proveedores||[]).filter(p=>p.activo!==false).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
  if(_pcProv==null||!provs.some(p=>String(p.id)===String(_pcProv)))_pcProv=_pcProvDefault();
  if(_pcProv==null){ box.innerHTML='<div class="panel"><div class="panel-body"><div class="empty">No hay proveedores en esta empresa.</div></div></div>'; return; }
  const prov=provs.find(p=>String(p.id)===String(_pcProv));
  const provN=String(prov&&prov.nombre||'').replace(/\.+$/,'');
  const R=_pcCalcular(_pcProv), P=R.P;
  const cobro=_pcDiasCobro();
  const credDias=Number(prov&&prov.diasCredito)||0;
  const cnt={pedir:0,bien:0,sobra:0,sinmov:0}; R.filas.forEach(f=>cnt[f.estado]++);
  const sumE=e=>R.filas.filter(f=>f.estado===e);
  const valSobra=sumE('sobra').reduce((s,f)=>s+f.valorExceso,0), valSin=sumE('sinmov').reduce((s,f)=>s+f.valor,0);
  const ped=R.filas.filter(f=>f.sugerido>0), valPed=ped.reduce((s,f)=>s+f.valorSug,0);
  const disp=R.limite?R.limite-R.deuda:null;
  // Regla del dinero
  const ciclo=cobro!=null?R.maxDias+cobro:null;
  const reglaOk=ciclo!=null&&credDias?ciclo<=credDias:null;
  const kpi=(lbl,val,sub,cls)=>`<div class="pc-kpi${cls?' '+cls:''}"><small>${lbl}</small><b>${val}</b>${sub?`<span>${sub}</span>`:''}</div>`;
  const head=`<div class="panel"><div class="panel-body pc-top">
      <div><label>Proveedor</label><select onchange="_pcSetProv(this.value)">${provs.map(p=>`<option value="${p.id}"${String(p.id)===String(_pcProv)?' selected':''}>${escHtml(p.nombre)}</option>`).join('')}</select></div>
      <div class="pc-params">Entrega <b>${P.entrega} d</b> · colchón <b>${P.colchon} d</b> · pedir cuando alcance para menos de <b>${R.minDias} d</b> · máximo <b>${R.maxDias} d</b> de stock · venta promedio de los últimos <b>${_pcNum(R.ventana)} d</b>
        ${(currentRole==='admin'||currentRole==='gerencia')?`<button class="btn btn-ghost btn-sm" onclick="_pcAbrirParams()">⚙ Parámetros</button>`:''}</div>
    </div></div>`;
  const avisoDatos=R.diasDatos<(Number(P.ventana)||60)?`<div class="note" style="margin:0 0 12px"><span>📊 Esta empresa tiene detalle de ventas solo desde hace <b>${_pcNum(R.diasDatos)} días</b>: el promedio se calcula con esos días. Mientras más días pasen, más exacto.</span></div>`:'';
  const kpis=`<div class="pc-kpis">
      ${kpi('Stock de este proveedor (a costo)',money(R.valor),R.diasCob!=null?`alcanza para <b>${_pcNum(R.diasCob)} días</b> de venta`:'sin ventas en el período',R.diasCob!=null&&R.diasCob>R.maxDias?'warn':'')}
      ${kpi('Se vende al mes (a costo)',money(R.costoMes),'promedio del período')}
      ${kpi('Sobra (arriba del máximo)',money(valSobra+valSin),`${cnt.sobra} con exceso · ${cnt.sinmov} sin movimiento`,valSobra+valSin>0?'warn':'')}
      ${kpi('Pedido sugerido hoy',money(valPed),`${ped.length} producto${ped.length!==1?'s':''}`,ped.length?'danger':'')}
      ${kpi('Crédito con el proveedor',R.limite?money(disp):money(R.deuda),R.limite?`disponible de ${money(R.limite)} · debemos ${money(R.deuda)}`:`debemos · <a href="javascript:_pcAbrirParams()">poner límite</a>`,R.limite&&disp<valPed?'danger':'')}
      ${kpi('Comprado este mes',money(R.compradoMes),`se vende ~${money(R.costoMes)} al mes`,R.compradoMes>R.costoMes*1.05?'warn':'')}
    </div>
    ${ciclo!=null&&credDias?`<div class="note ${reglaOk?'n-ok':''}" style="margin:0 0 12px"><span>💡 <b>Regla del dinero:</b> ${R.maxDias} días en bodega + ${_pcNum(cobro)} días que tardan los clientes en pagar = <b>${_pcNum(ciclo)} días</b> ${reglaOk?'≤':'>'} ${credDias} días de crédito de ${escHtml(provN)}. ${reglaOk?'Lo que se compra se vende y se cobra antes de pagarlo ✓':'El dinero llega después del vencimiento: bajá el máximo de días.'}</span></div>`:''}
    ${R.vencido>0?`<div class="note" style="margin:0 0 12px;border-color:var(--danger)"><span>⚠ Hay <b>${money(R.vencido)}</b> vencido con ${escHtml(provN)}.</span></div>`:''}`;
  const tabs=`<div class="ct-tabs pc-tabs"><button class="ct-tab${_pcTab==='productos'?' on':''}" onclick="_pcSetTab('productos')">📦 Productos y pedido</button><button class="ct-tab${_pcTab==='flujo'?' on':''}" onclick="_pcSetTab('flujo')">💵 Flujo de dinero (8 semanas)</button></div>`;
  box.innerHTML=head+avisoDatos+kpis+tabs+(_pcTab==='flujo'?_pcFlujoHTML(prov,R,cobro):_pcProductosHTML(R,cnt,ped,valPed,prov));
}
window.renderPlanCompras=renderPlanCompras;

function _pcProductosHTML(R,cnt,ped,valPed,prov){
  const q=_pcBusca.trim().toLowerCase();
  const orden={pedir:0,sobra:1,sinmov:2,bien:3};
  let fs=R.filas.filter(f=>_pcFiltro==='todos'||f.estado===_pcFiltro);
  if(q)fs=fs.filter(f=>((f.p.nombre||'')+' '+(f.p.codigo||'')+' '+(f.p.skuProveedor||'')).toLowerCase().includes(q));
  fs.sort((a,b)=>(orden[a.estado]-orden[b.estado])||(a.estado==='pedir'?a.dias-b.dias:(b.valorExceso-a.valorExceso))||(a.p.nombre||'').localeCompare(b.p.nombre||'','es'));
  const chip=(k,lbl,n)=>`<button class="pc-chip${_pcFiltro===k?' on':''}" onclick="_pcSetFiltro('${k}')">${lbl} <b>${n}</b></button>`;
  const fila=f=>{const [ic,lb,cl]=PC_EST[f.estado];const u=f.unidad==='caja'?'cj':escHtml(f.unidad.slice(0,3));
    const nota=f.estado==='sobra'?`sobran ${money(f.valorExceso)} · ${_pcNum(f.dias-R.maxDias)} d de más`:(f.estado==='sinmov'?(f.diasSinVenta!=null?`última venta hace ${f.diasSinVenta} d`:'nunca se ha vendido'):(f.estado==='pedir'?`se acaba en ~${_pcNum(f.dias)} d`:''));
    return `<tr class="pc-r-${f.estado}">
      <td><span class="pc-est pc-est-${cl}">${ic} ${lb}</span></td>
      <td><b>${escHtml(f.p.nombre||'')}</b><div class="pc-sub">${escHtml(f.p.codigo||'')}${f.p.skuProveedor?' · prov. '+escHtml(f.p.skuProveedor):''}${nota?' · '+nota:''}</div></td>
      <td class="num">${_pcNum(f.vdia*30,1)} <span class="pc-u">${u}</span></td>
      <td class="num">${_pcNum(f.stock,1)}${f.enCamino?`<div class="pc-sub">+${_pcNum(f.enCamino,1)} en camino</div>`:''}</td>
      <td class="num"><b>${_pcDiasTxt(f.dias)}</b></td>
      <td class="num">${f.sugerido?`<b>${_pcNum(f.sugerido)}</b> <span class="pc-u">${u}</span>`:'—'}</td>
      <td class="num">${f.sugerido?money(f.valorSug):''}</td></tr>`;};
  const card=f=>{const [ic,lb,cl]=PC_EST[f.estado];const u=f.unidad==='caja'?'cajas':escHtml(f.unidad);
    return `<div class="pc-card pc-r-${f.estado}"><div class="pc-card-top"><span class="pc-est pc-est-${cl}">${ic} ${lb}</span>${f.sugerido?`<b>Pedir ${_pcNum(f.sugerido)} ${u}</b>`:''}</div>
      <div class="pc-card-nom">${escHtml(f.p.nombre||'')}</div><div class="pc-sub">${escHtml(f.p.codigo||'')}${f.p.skuProveedor?' · prov. '+escHtml(f.p.skuProveedor):''}</div>
      <div class="pc-card-g"><div><small>Vende/mes</small><b>${_pcNum(f.vdia*30,1)}</b></div><div><small>Hay</small><b>${_pcNum(f.stock,1)}${f.enCamino?'+'+_pcNum(f.enCamino,1):''}</b></div><div><small>Alcanza</small><b>${_pcDiasTxt(f.dias)} d</b></div><div><small>${f.estado==='sobra'||f.estado==='sinmov'?'Sobra':'Pedido'}</small><b>${money(f.estado==='sobra'||f.estado==='sinmov'?f.valorExceso:f.valorSug)}</b></div></div></div>`;};
  return `<div class="panel"><div class="panel-head pc-ph"><h3>Productos de ${escHtml(prov.nombre)}</h3>
      <div class="pc-acc">
        <label class="pc-llenar" title="Además de los que están por acabarse, completar al máximo los que están bien (para aprovechar el mismo pedido)"><input type="checkbox" ${_pcLlenar?'checked':''} onchange="_pcLlenar=this.checked;renderPlanCompras()"> Llenar también los 🟢</label>
        <button class="btn btn-ghost btn-sm" onclick="_pcCopiarPedido()" ${ped.length?'':'disabled'}>📋 Copiar pedido</button>
        <button class="btn btn-primary btn-sm" onclick="_pcExcel()">⬇ Excel</button>
      </div></div>
    <div class="panel-body">
      <div class="pc-chips">${chip('todos','Todos',R.filas.length)}${chip('pedir','🔴 Pedir ya',cnt.pedir)}${chip('bien','🟢 Bien',cnt.bien)}${chip('sobra','🟡 No comprar',cnt.sobra)}${chip('sinmov','⚫ Sin movimiento',cnt.sinmov)}
        <input class="pc-busca" placeholder="Buscar producto o código…" value="${escHtml(_pcBusca)}" oninput="_pcBuscar(this.value)"></div>
      ${ped.length?`<div class="pc-total-ped">Pedido sugerido: <b>${ped.length}</b> producto${ped.length!==1?'s':''} por <b>${money(valPed)}</b></div>`:''}
      ${fs.length?`<div class="pc-tabla-wrap"><table class="pc-tabla"><thead><tr><th>Estado</th><th>Producto</th><th class="num">Vende al mes</th><th class="num">Hay</th><th class="num">Días que alcanza</th><th class="num">Pedir</th><th class="num">Valor pedido</th></tr></thead><tbody>${fs.map(fila).join('')}</tbody></table></div>
        <div class="pc-cards">${fs.map(card).join('')}</div>`:'<div class="empty">Nada en este filtro.</div>'}
      <div class="pc-sub" style="margin-top:10px">Cantidades en la unidad en que se compra (cajas para los productos por caja). "Hay" incluye cajas abiertas como fracción.</div>
    </div></div>`;
}

// ── Flujo de dinero: 8 semanas ──
function _pcFlujoHTML(prov,R,cobro){
  const ahora=new Date(); const lun=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()); lun.setDate(lun.getDate()-((lun.getDay()+6)%7));
  const S=[...Array(8)].map((_,i)=>{const a=new Date(lun.getTime()+i*7*_pcDia);return {ini:a,fin:new Date(a.getTime()+7*_pcDia),cxc:0,venta:0,pagoProv:0,pagoOtros:0};});
  const idx=t=>{for(let i=0;i<S.length;i++)if(t>=S[i].ini.getTime()&&t<S[i].fin.getTime())return i;return t<S[0].ini.getTime()?-1:S.length;};
  let cxcVencida=0, provVencido=0, otrosVencido=0;
  // Por cobrar: facturas con saldo, en la semana que vencen.
  deEmpresa(documentos||[]).forEach(d=>{
    if(d.tipoDoc!=='cambiaria'||d.anulado||d.estado==='anulada')return;
    const i=arInfo(d); if(i.saldo<=0.009)return;
    const t=i.venc?i.venc.getTime():_pcFechaMs(d.creada);
    if(t<Date.now()){cxcVencida+=i.saldo;return;}
    const k=idx(t); if(k>=0&&k<S.length)S[k].cxc+=i.saldo;
  });
  // Por pagar: compras con saldo, en la semana que vencen. Lo ya vencido se
  // tiene que pagar igual: va en la semana 1. Las compras sin vencimiento
  // (pedidas y todavía sin recibir) vencen a la fecha + días de crédito.
  const hoy0=Date.now();
  deEmpresa(compras||[]).forEach(c=>{
    if(c.anulado)return; const i=apInfo(c); if(i.saldo<=0.009)return;
    const esProv=String(c.proveedorId)===String(prov.id);
    let t=i.venc?i.venc.getTime():null;
    if(t==null){ const pv=(proveedores||[]).find(x=>String(x.id)===String(c.proveedorId)); const dc2=Number(c.diasCredito)||Number(pv&&pv.diasCredito)||0; t=_pcFechaMs(c.fecha)+dc2*_pcDia; }
    if(t<hoy0){ if(esProv)provVencido+=i.saldo; else otrosVencido+=i.saldo; t=hoy0; }
    const k=idx(t); if(k>=0&&k<S.length){ if(esProv)S[k].pagoProv+=i.saldo; else S[k].pagoOtros+=i.saldo; }
  });
  // Venta proyectada (precio de venta, todas las líneas) que se cobra ~N días después.
  const ventana=R.ventana, desde=Date.now()-ventana*_pcDia;
  const ventaDia=deEmpresa(documentos||[]).filter(d=>d.tipoDoc==='cambiaria'&&!d.anulado&&d.estado!=='anulada'&&_pcFechaMs(d.creada)>=desde).reduce((s,d)=>s+(Number(d.totales&&d.totales.total)||0),0)/ventana;
  const dc=Math.round(cobro!=null?cobro:0);
  for(let d=0;d<56;d++){ const t=Date.now()+(d+dc)*_pcDia; const k=idx(t); if(k>=0&&k<S.length)S[k].venta+=ventaDia; }
  // Saldo en bancos de la empresa (punto de partida editable).
  let banco=_pcBanco;
  if(banco==null){ try{ banco=(typeof cuentasActivasBanco==='function'?cuentasActivasBanco(_pcEmp()):[]).reduce((s,c)=>s+(typeof saldoCuenta==='function'?saldoCuenta(c.id):0),0); }catch(e){banco=0;} }
  let acum=banco;
  const f=d=>`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const filas=S.map((s,i)=>{const ent=s.cxc+s.venta, sal=s.pagoProv+s.pagoOtros, neto=ent-sal; acum+=neto;
    return `<tr class="${acum<0?'pc-neg':''}"><td><b>Sem. ${i+1}</b><div class="pc-sub">${f(s.ini)} al ${f(new Date(s.fin.getTime()-_pcDia))}</div></td>
      <td class="num">${money(s.cxc)}</td><td class="num">${money(s.venta)}</td>
      <td class="num">${s.pagoProv?money(s.pagoProv):'—'}</td><td class="num">${s.pagoOtros?money(s.pagoOtros):'—'}</td>
      <td class="num"><b style="color:var(--${neto<0?'danger':'ok'})">${neto<0?'−':'+'}${money(Math.abs(neto))}</b></td>
      <td class="num"><b style="color:var(--${acum<0?'danger':'ink'})">${money(acum)}</b></td></tr>`;}).join('');
  const peor=S.reduce((a,s,i)=>{const x=a.acum+(s.cxc+s.venta-s.pagoProv-s.pagoOtros);return {acum:x,min:Math.min(a.min,x),sem:x<a.min?i+1:a.sem};},{acum:banco,min:banco,sem:0});
  return `<div class="panel"><div class="panel-head"><h3>Flujo de dinero · próximas 8 semanas</h3><span class="pc-sub">${escHtml(_pcEmp())}</span></div><div class="panel-body">
    <div class="pc-flujo-top">
      <div><label>Dinero hoy en bancos</label><input type="number" step="0.01" value="${(Math.round(banco*100)/100)}" onchange="_pcBanco=Number(this.value)||0;renderPlanCompras()"><div class="pc-sub">sale de Bancos; podés cambiarlo para probar</div></div>
      <div class="pc-sub" style="flex:1;min-width:220px">Entra: lo que vence por cobrar a clientes + la venta de cada día (promedio ${money(ventaDia)} diarios) cobrada ~${dc} días después. Sale: lo que vence con proveedores.</div>
    </div>
    ${peor.min<0?`<div class="note" style="margin:10px 0;border-color:var(--danger)"><span>⚠ En la <b>semana ${peor.sem}</b> el dinero no alcanza (queda en ${money(peor.min)}). Hay que cobrar antes, mover pagos o comprar menos.</span></div>`:`<div class="note n-ok" style="margin:10px 0"><span>✓ Con lo que se cobra y se vende, alcanza para pagar todo lo que vence en estas 8 semanas.</span></div>`}
    ${(provVencido||otrosVencido)?`<div class="pc-sub" style="margin-bottom:4px">La semana 1 incluye lo que <b>ya venció</b> con proveedores: ${escHtml(prov.nombre)} <b>${money(provVencido)}</b>${otrosVencido?` · otros <b>${money(otrosVencido)}</b>`:''}.</div>`:''}
    ${cxcVencida?`<div class="pc-sub" style="margin-bottom:8px">Por cobrar <b>ya vencido</b>: <b>${money(cxcVencida)}</b>. No se cuenta en las semanas (no se sabe cuándo entra); si se cobra, es dinero extra.</div>`:''}
    <div class="pc-tabla-wrap"><table class="pc-tabla pc-flujo"><thead><tr><th>Semana</th><th class="num">Cobros que vencen</th><th class="num">Venta proyectada</th><th class="num">Pago ${escHtml(prov.nombre.split(',')[0])}</th><th class="num">Otros proveedores</th><th class="num">Neto</th><th class="num">Queda</th></tr></thead><tbody>${filas}</tbody></table></div>
  </div></div>`;
}

function _pcSetProv(v){_pcProv=v;_pcBanco=null;renderPlanCompras();}
function _pcSetFiltro(v){_pcFiltro=v;renderPlanCompras();}
function _pcSetTab(v){_pcTab=v;renderPlanCompras();}
let _pcBT=null;
function _pcBuscar(v){_pcBusca=v;clearTimeout(_pcBT);_pcBT=setTimeout(()=>{renderPlanCompras();const i=document.querySelector('.pc-busca');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
Object.assign(window,{_pcSetProv,_pcSetFiltro,_pcSetTab,_pcBuscar});

function _pcAbrirParams(){
  const P=_pcParams(); const prov=(proveedores||[]).find(p=>String(p.id)===String(_pcProv));
  openMod('⚙ Parámetros del plan de compras · '+escHtml(_pcEmp()),`
    <div class="pc-sub" style="margin-bottom:10px">Se guardan para <b>${escHtml(_pcEmp())}</b>. Cada empresa tiene los suyos.</div>
    <div class="pc-g2"><div><label>Días que tarda en entregar</label><input type="number" id="pcp-entrega" min="0" value="${P.entrega}"></div>
      <div><label>Días de colchón (seguridad)</label><input type="number" id="pcp-colchon" min="0" value="${P.colchon}"></div></div>
    <div class="pc-g2" style="margin-top:10px"><div><label>Máximo de días de stock</label><input type="number" id="pcp-maximo" min="1" value="${P.maximo}"></div>
      <div><label>Promediar la venta de los últimos (días)</label><input type="number" id="pcp-ventana" min="7" value="${P.ventana}"></div></div>
    <div style="margin-top:10px"><label>Límite de crédito con ${escHtml(prov?prov.nombre:'el proveedor')} (Q)</label><input type="number" id="pcp-credito" min="0" step="1000" value="${Number(P.credito[_pcProv])||''}" placeholder="Ej. 500000"></div>
    <div class="pc-sub" style="margin-top:10px">Se pide cuando el stock alcanza para menos de <b>entrega + colchón</b> días, y se pide lo necesario para llegar al <b>máximo</b>.</div>`,
    async()=>{
      const n=id=>Number(document.getElementById(id).value);
      const np={...P,entrega:Math.max(0,n('pcp-entrega')||0),colchon:Math.max(0,n('pcp-colchon')||0),maximo:Math.max(1,n('pcp-maximo')||1),ventana:Math.max(7,n('pcp-ventana')||60),credito:{...P.credito}};
      const c=n('pcp-credito'); if(c>0)np.credito[_pcProv]=c; else delete np.credito[_pcProv];
      if(np.maximo<np.entrega+np.colchon){toast('Revisá los días','El máximo tiene que ser mayor que entrega + colchón ('+(np.entrega+np.colchon)+').',true);return;}
      await _pcGuardarParams(np);
      if(typeof logAudit==='function')logAudit('Plan de compras: parámetros',_pcEmp()+' · entrega '+np.entrega+' d · colchón '+np.colchon+' d · máximo '+np.maximo+' d · ventana '+np.ventana+' d'+(np.credito[_pcProv]?' · crédito '+money(np.credito[_pcProv]):''));
      closeMod(); toast('✓ Parámetros guardados'); renderPlanCompras();
    });
}
window._pcAbrirParams=_pcAbrirParams;

function _pcPedidoLineas(){
  const R=_pcCalcular(_pcProv); return R.filas.filter(f=>f.sugerido>0).sort((a,b)=>(a.p.nombre||'').localeCompare(b.p.nombre||'','es'));
}
function _pcCopiarPedido(){
  const ls=_pcPedidoLineas(); if(!ls.length){toast('Sin pedido','No hay productos para pedir.');return;}
  const prov=(proveedores||[]).find(p=>String(p.id)===String(_pcProv));
  const txt='Pedido '+_pcEmp()+' — '+(prov?prov.nombre:'')+' — '+fdate(new Date().toISOString())+'\n\n'+
    ls.map(f=>`${_pcNum(f.sugerido)} ${f.unidad==='caja'?'caja'+(f.sugerido!==1?'s':''):f.unidad} · ${f.p.skuProveedor?f.p.skuProveedor+' · ':''}${f.p.nombreProveedor||f.p.nombre}`).join('\n')+
    '\n\nTotal aprox. (a costo): '+money(ls.reduce((s,f)=>s+f.valorSug,0));
  const ok=()=>toast('📋 Pedido copiado',ls.length+' producto(s). Pegalo en WhatsApp o en el correo.');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok).catch(()=>_pcMostrarTexto(txt));
  else _pcMostrarTexto(txt);
}
function _pcMostrarTexto(txt){ openMod('📋 Pedido',`<div class="pc-sub" style="margin-bottom:6px">Copialo y pegalo en WhatsApp o en el correo.</div><textarea style="width:100%;min-height:260px;font-family:monospace;font-size:12.5px" onfocus="this.select()">${escHtml(txt)}</textarea>`,null); const b=document.getElementById('m-save'); if(b)b.style.display='none'; }
async function _pcExcel(){
  const R=_pcCalcular(_pcProv); const prov=(proveedores||[]).find(p=>String(p.id)===String(_pcProv));
  const rows=R.filas.map(f=>({Estado:PC_EST[f.estado][1],'Código':f.p.codigo||'','Código proveedor':f.p.skuProveedor||'',Producto:f.p.nombre||'',Unidad:f.unidad,
    'Vende al mes':Math.round(f.vdia*30*100)/100,'Hay':Math.round(f.stock*100)/100,'En camino':Math.round(f.enCamino*100)/100,
    'Días que alcanza':f.dias===Infinity?'':Math.round(f.dias),'Pedir':f.sugerido||'','Costo':Math.round(f.costo*100)/100,
    'Valor pedido':Math.round(f.valorSug*100)/100,'Valor stock':Math.round(f.valor*100)/100,'Valor que sobra':Math.round(f.valorExceso*100)/100,
    'Última venta (días)':f.diasSinVenta==null?'':f.diasSinVenta}));
  try{
    const {XLSX}=await _cargarXLSX(); const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    try{ if(typeof _anchosExcel==='function')_anchosExcel(XLSX,ws,Object.keys(rows[0]||{}).length); }catch(e){}
    XLSX.utils.book_append_sheet(wb,ws,'Plan de compras');
    await descargarXlsx(XLSX,wb,'Plan de compras '+_pcEmp()+' - '+((prov&&prov.nombre)||'').replace(/[\\/:*?"<>|,.]/g,'').trim()+' '+fechaHoyGT()+'.xlsx');
  }catch(e){ console.error(e); toast('No se pudo exportar',String(e&&e.message||e),true); }
}
Object.assign(window,{_pcCopiarPedido,_pcExcel});
