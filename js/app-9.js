function renderReportes(){
  bindRep();renderRepFilters();
  const r=repRange();
  let ventas=documentos.filter(d=>['certificada','facturado'].includes(d.estado)&&d.tipoDoc!=='notaCredito'&&enRango(d.creada,r));
  let comprasR=compras.filter(c=>enRango(c.fecha,r));
  // aplicar filtros comunes
  if(repFiltros.cliente)ventas=ventas.filter(d=>String(d.clienteId)===repFiltros.cliente);
  if(repFiltros.vendedor_simple)ventas=ventas.filter(d=>d.vendedorNombre===repFiltros.vendedor_simple);
  if(repFiltros.proveedor)comprasR=comprasR.filter(c=>String(c.proveedorId)===repFiltros.proveedor);
  let html='',exportData=[];
  const periodoLabel=repFiltros.cliente?clientes.find(c=>String(c.id)===repFiltros.cliente)?.nombre||'':repPeriod==='mes'?'Este mes':repPeriod==='3m'?'Últimos 3 meses':repPeriod==='anio'?'Este año':'Todo';
  if(repType==='resumen'){
    const total=ventas.reduce((s,d)=>s+d.totales.total,0);
    const porCobrar=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').reduce((s,d)=>s+arInfo(d).saldo,0);
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Ventas del período',val:money(total),sub:ventas.length+' documentos'},
      {ic:'i-blue',svg:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',lbl:'Ticket promedio',val:money(ventas.length?total/ventas.length:0)},
      {ic:'i-lime',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Por cobrar actual',val:money(porCobrar)},
      {ic:'i-warn',svg:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',lbl:'Clientes',val:new Set(ventas.map(d=>d.clienteId)).size,sub:'compraron'}])}</div>`;
    const meses=mesesSerie(ventas,d=>d.creada,d=>d.totales.total);
    // Por cliente_id (estable): el mismo cliente traía el nombre comercial vacío
    // en las facturas viejas y lleno en las nuevas; por nombre se duplicaría.
    const porCli={};ventas.forEach(d=>{const k=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'Sin cliente');const nom=d.clienteComercial||d.clienteNombre||'Sin cliente';if(!porCli[k])porCli[k]={nombre:nom,total:0};if(d.clienteComercial)porCli[k].nombre=d.clienteComercial;porCli[k].total+=d.totales.total;});
    const porP={};ventas.forEach(d=>d.items.forEach(it=>{porP[it.nombre]=(porP[it.nombre]||0)+(it.cantidad*it.precio-(it.descuento||0));}));
    exportData=Object.values(porCli).sort((a,b)=>b.total-a.total).map(o=>({Cliente:o.nombre,Total:o.total}));
    html+=`<div class="rep-grid2" style="margin-bottom:16px">
      <div class="panel" style="margin:0"><div class="panel-head"><h3>Ventas por mes</h3></div><div class="panel-body">${barsHTML(meses)}</div></div>
      <div class="panel" style="margin:0"><div class="panel-head"><h3>Top clientes</h3></div><div class="panel-body">${hbars(Object.values(porCli).sort((a,b)=>b.total-a.total).slice(0,6).map(o=>({n:o.nombre,v:o.total})))}</div></div></div>
      <div class="panel"><div class="panel-head"><h3>Productos más vendidos</h3></div><div class="panel-body">${hbars(Object.entries(porP).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n,v,c:'var(--green)'})))}</div></div>`;
  }
  else if(repType==='costos'){
    let vTot=0,cTot=0;ventas.forEach(d=>{vTot+=d.totales.total;cTot+=costoDoc(d);});
    const margen=vTot-cTot;const pct=vTot?(margen/vTot*100):0;
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-blue',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Ventas',val:money(vTot)},
      {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/>',lbl:'Costo de lo vendido',val:money(cTot)},
      {ic:'i-green',svg:'<path d="M23 6l-9.5 9.5-5-5L1 18"/>',lbl:'Margen bruto',val:money(margen)},
      {ic:'i-lime',svg:'<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',lbl:'Margen %',val:pct.toFixed(1)+'%'}])}</div>`;
    const ejeV=mesesEje(ventas,d=>d.creada);
    const mv=mesesSerie(ventas,d=>d.creada,d=>d.totales.total,ejeV);
    const mc=mesesSerie(ventas,d=>d.creada,d=>costoDoc(d),ejeV);
    const max=Math.max(1,...mv.map(m=>m.v));
    exportData=mv.map((m,i)=>{const mg=m.v-mc[i].v;return {Mes:m.lbl,Ventas:m.v,Costo:mc[i].v,Margen:mg,'Margen%':m.v?(mg/m.v*100).toFixed(1):0};});
    html+=`<div class="panel"><div class="panel-head"><h3>Ventas vs costos por mes</h3>
      <div style="display:flex;gap:14px;font-size:11.5px"><span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:var(--lime)"></span>Ventas</span><span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:var(--muted-2)"></span>Costo</span></div></div>
      <div class="panel-body"><div class="bars">${mv.map((m,i)=>`<div class="bcol"><div style="display:flex;gap:3px;align-items:flex-end;height:100%;width:100%;justify-content:center">
        <div class="bar" style="height:${Math.round(m.v/max*100)}%;max-width:18px"></div>
        <div class="bar" style="height:${Math.round(mc[i].v/max*100)}%;max-width:18px;background:var(--muted-2)"></div></div><div class="blbl">${m.lbl}</div></div>`).join('')}</div></div></div>
      <div class="panel"><table><thead><tr><th>Mes</th><th>Ventas</th><th>Costo</th><th>Margen</th><th>%</th></tr></thead><tbody>
      ${mv.map((m,i)=>{const mg=m.v-mc[i].v;return `<tr><td style="font-weight:600">${m.lbl}</td><td class="num">${money(m.v)}</td><td class="num" style="color:var(--muted)">${money(mc[i].v)}</td><td class="num" style="font-weight:600">${money(mg)}</td><td class="num">${m.v?(mg/m.v*100).toFixed(0):0}%</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  else if(repType==='vendedor'){
    const seleccionados=repFiltros.vendedores.length?repFiltros.vendedores:[...new Set(ventas.map(d=>d.vendedorNombre||'Sin asignar'))];
    const colores={};seleccionados.forEach((n,i)=>colores[n]=VEND_COLORS[i%VEND_COLORS.length]);
    // por vendedor: monto total y por mes
    const datos={};const ejeVend=mesesEje(ventas,d=>d.creada);seleccionados.forEach(n=>{datos[n]={v:0,c:0,n:0,meses:mesesSerie(ventas.filter(d=>d.vendedorNombre===n),d=>d.creada,d=>d.totales.total,ejeVend)};});
    ventas.filter(d=>seleccionados.includes(d.vendedorNombre||'Sin asignar')).forEach(d=>{const k=d.vendedorNombre||'Sin asignar';if(datos[k]){datos[k].v+=d.totales.total;datos[k].n++;
      // costo de lo vendido por este vendedor (costo promedio del mes; para
      // las facturas históricas sin líneas usa el costo histórico guardado)
      datos[k].c+=costoDoc(d);
    }});
    // Ocultar vendedores sin ventas en el período (salvo que se hayan elegido explícitamente)
    const activos=repFiltros.vendedores.length?seleccionados:seleccionados.filter(n=>datos[n].n>0);
    const arr=activos.map(n=>[n,datos[n]]).sort((a,b)=>b[1].v-a[1].v);
    // Export estilo Crystal: Vendedor | Ventas | Costos | Ganancia
    // Comisión: 5% sobre las ventas sin IVA (ventas / 1.12 * 0.05)
    const COMISION_PCT=0.05, IVA=1.12;
    const comisionDe=v=>v/IVA*COMISION_PCT;
    exportData=arr.map(([n,o])=>({Vendedor:n,Ventas:o.v,Costos:o.c,Ganancia:o.v-o.c,'Comisión':comisionDe(o.v)}));
    // barras comparativas por mes
    const mesesLbl=datos[activos[0]]?.meses.map(m=>m.lbl)||[];
    const maxComp=Math.max(1,...activos.flatMap(n=>datos[n]?.meses.map(m=>m.v)||[]));
    const compBarras=`<div class="panel"><div class="panel-head"><h3>Comparativa por mes</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">${activos.map((n,i)=>`<span style="display:flex;align-items:center;gap:5px;font-size:11.5px"><span style="width:10px;height:10px;border-radius:3px;background:${colores[n]}"></span>${n}</span>`).join('')}</div></div>
      <div class="panel-body"><div class="bars">${mesesLbl.map((lbl,mi)=>`<div class="bcol">
        <div class="bar-wrap">${activos.map(n=>`<div class="bar" style="height:${Math.round((datos[n]?.meses[mi]?.v||0)/maxComp*100)}%;max-width:${Math.floor(36/Math.max(activos.length,1))}px;background:${colores[n]}"></div>`).join('')}</div>
        <div class="blbl">${lbl}</div></div>`).join('')}</div></div></div>`;
    html+=compBarras;
    html+=`<div class="panel"><div class="panel-head"><h3>Resumen por vendedor</h3></div>
      <div class="panel-body">${hbars(arr.map(([n,o])=>({n,v:o.v,c:colores[n]})))}</div></div>
      <div class="panel"><table><thead><tr><th>Vendedor</th><th>Ventas</th><th>Costos</th><th>Ganancia</th><th>Comisión</th></tr></thead><tbody>
      ${arr.map(([n,o])=>`<tr><td style="font-weight:600;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${colores[n]};flex-shrink:0"></span>${n}</td><td class="num">${money(o.v)}</td><td class="num" style="color:var(--muted)">${money(o.c)}</td><td class="num" style="font-weight:700;color:var(--green)">${money(o.v-o.c)}</td><td class="num" style="font-weight:600;color:var(--blue)">${money(comisionDe(o.v))}</td></tr>`).join('')}
      <tr style="border-top:2px solid var(--line-strong);font-weight:700"><td>Total</td><td class="num">${money(arr.reduce((s,[,o])=>s+o.v,0))}</td><td class="num">${money(arr.reduce((s,[,o])=>s+o.c,0))}</td><td class="num" style="color:var(--green)">${money(arr.reduce((s,[,o])=>s+(o.v-o.c),0))}</td><td class="num" style="color:var(--blue)">${money(arr.reduce((s,[,o])=>s+comisionDe(o.v),0))}</td></tr></tbody></table></div>
      <div class="note" style="margin-top:12px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La comisión es el 5% sobre las ventas sin IVA (ventas ÷ 1.12 × 5%).</span></div>`;
  }
  else if(repType==='producto'){
    // Filtrar ventas por cliente si está seleccionado
    let ventasProd=ventas;
    if(repFiltros.cliente){
      const cid=Number(repFiltros.cliente);
      ventasProd=ventasProd.filter(d=>d.clienteId===cid);
    }
    const porP={};ventasProd.forEach(d=>d.items.forEach(it=>{const v=it.cantidad*it.precio-(it.descuento||0);if(!porP[it.id])porP[it.id]={nombre:it.nombre,codigo:it.codigo,q:0,v:0,marca:(productos.find(x=>x.id===it.id)||{}).marca||''};porP[it.id].q+=it.cantidad;porP[it.id].v+=v;}));
    let arr=Object.values(porP).sort((a,b)=>b.v-a.v);
    // Filtrar por marca si está seleccionada
    if(repFiltros.marca_prod)arr=arr.filter(p=>p.marca===repFiltros.marca_prod);
    exportData=arr.map(p=>({Código:p.codigo,Producto:p.nombre,Marca:p.marca||'',Unidades:p.q,Ingresos:p.v}));
    html+=`<div class="panel"><div class="panel-head"><h3>Ventas por producto</h3><span style="font-size:12px;color:var(--muted)">${arr.length} producto${arr.length!==1?'s':''}</span></div>
      <table><thead><tr><th>Producto</th><th>Código</th><th>Marca</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>
      ${arr.length?arr.map(p=>`<tr><td style="font-weight:600">${p.nombre}</td><td class="num" style="color:var(--muted)">${p.codigo}</td><td style="font-size:12.5px;color:var(--muted)">${p.marca||'—'}</td><td class="num">${p.q}</td><td class="num" style="font-weight:600">${money(p.v)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Sin ventas</td></tr>'}</tbody></table></div>`;
  }
  else if(repType==='cliprod'){
    // VENTAS POR CLIENTE Y PRODUCTO — jerarquía Vendedor → Cliente → Productos
    // Construir estructura agrupada
    const grupos={}; // vendedor -> cliente -> {productos, subtotales}
    // Para volúmenes grandes: si es la primera vez que se ve este reporte,
    // colapsar los clientes por defecto (mostrar solo vendedores y sus clientes,
    // sin los productos). El usuario expande lo que quiera ver.
    const primeraVez=!gruposColapsados.__inicializado;
    const nombresCli={}; // id-clave del cliente -> nombre para mostrar
    ventas.forEach(d=>{
      const vend=d.vendedorNombre||'Sin vendedor';
      // Por cliente_id (estable), no por nombre: el nombre comercial venía vacío
      // en las facturas viejas y lleno en las nuevas; por nombre el mismo cliente
      // se partía en dos.
      const cli=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'Sin cliente');
      if(d.clienteComercial)nombresCli[cli]=d.clienteComercial;
      else if(!nombresCli[cli])nombresCli[cli]=d.clienteNombre||'Sin cliente';
      if(!grupos[vend])grupos[vend]={};
      if(!grupos[vend][cli])grupos[vend][cli]={};
      const _dtP=new Date(d.creada);
      (d.items||[]).forEach(it=>{
        const _p=productos.find(x=>x.id===it.id);
        const esUnidad=!!(_p&&_p.tipoEmpaque==='caja_unidad'&&it.modoVenta!=='caja');
        const costoUnit=costoUnitVentaMes(it,_dtP.getFullYear(),_dtP.getMonth());
        const key=(it.id||it.codigo)+(esUnidad?'|u':'|c');
        if(!grupos[vend][cli][key]){
          grupos[vend][cli][key]={codigo:it.codigo+(esUnidad?'-U':''),nombre:it.nombre,cant:0,vUnit:it.precio,costoUnit:costoUnit,ventaTotal:0,costoTotal:0};
        }
        const g=grupos[vend][cli][key];
        g.cant+=it.cantidad;
        g.ventaTotal+=it.cantidad*it.precio-(it.descuento||0);
        g.costoTotal+=costoUnit*it.cantidad;
      });
    });
    // Para exportación: filas planas
    const expFilas=[];
    // Totales generales
    let gVenta=0,gCosto=0;
    // Construir HTML jerárquico
    let cuerpo='';
    const vendOrden=Object.keys(grupos).sort();
    if(!vendOrden.length){
      cuerpo='<tr><td colspan="8" class="empty">Sin ventas en el período</td></tr>';
    }
    vendOrden.forEach(vend=>{
      let vVenta=0,vCosto=0;
      let filasVend='';
      const cliOrden=Object.keys(grupos[vend]).sort((a,b)=>(nombresCli[a]||a).localeCompare(nombresCli[b]||b,'es'));
      cliOrden.forEach(cli=>{
        let cVenta=0,cCosto=0;
        let filasCli='';
        const prods=Object.values(grupos[vend][cli]).sort((a,b)=>b.ventaTotal-a.ventaTotal);
        prods.forEach(p=>{
          const margenQ=p.ventaTotal-p.costoTotal;
          const margenPct=p.ventaTotal?(margenQ/p.ventaTotal*100):0;
          cVenta+=p.ventaTotal;cCosto+=p.costoTotal;
          filasCli+=`<tr data-pertenece="1" data-vend="${vend}" data-cli="${cli}">
            <td style="padding-left:24px;font-size:12px">${p.codigo?`<span style="color:var(--muted);font-size:11px">${p.codigo}</span> `:''}${p.nombre}</td>
            <td class="num">${p.cant}</td>
            <td class="num">${money(p.vUnit)}</td>
            <td class="num" style="font-weight:600">${money(p.ventaTotal)}</td>
            <td class="num" style="color:var(--muted)">${money(p.costoUnit)}</td>
            <td class="num" style="color:var(--muted)">${money(p.costoTotal)}</td>
            <td class="num" style="color:var(--green);font-weight:600">${money(margenQ)}</td>
            <td class="num" style="color:var(--green)">${margenPct.toFixed(1)}%</td></tr>`;
          expFilas.push({Vendedor:vend,Cliente:(nombresCli[cli]||cli),'Código':p.codigo,Producto:p.nombre,Cantidad:p.cant,'Precio Unit.':p.vUnit,'Venta Total':p.ventaTotal,'Costo Unit.':p.costoUnit,'Costo Total':p.costoTotal,'Margen Q':margenQ,'Margen %':margenPct.toFixed(1)});
        });
        vVenta+=cVenta;vCosto+=cCosto;
        const cMargen=cVenta-cCosto;
        const cPct=cVenta?(cMargen/cVenta*100):0;
        const cliKey='C:'+vend+'|'+cli;
        // Primera vez: colapsar clientes por defecto (para no saturar con miles de productos)
        if(primeraVez&&gruposColapsados[cliKey]===undefined)gruposColapsados[cliKey]=true;
        // Encabezado de cliente (clickeable para colapsar) + sus productos + subtotal
        filasVend+=`<tr data-pertenece="1" data-vend="${vend}" data-grupo-key="${cliKey}" style="background:var(--surface-2);cursor:pointer" onclick="toggleGrupo('${cliKey.replace(/'/g,"\\'")}')"><td colspan="8" style="font-weight:700;font-size:12.5px;padding:7px 10px;color:var(--ink)"><span class="flecha-grupo" style="display:inline-block;width:14px;color:var(--muted)">▾</span>${nombresCli[cli]||cli}</td></tr>`+filasCli+
          `<tr data-pertenece="1" data-vend="${vend}" data-cli="${cli}" style="border-bottom:1px solid var(--line)"><td style="text-align:right;font-size:11px;color:var(--muted);font-style:italic">Subtotal ${nombresCli[cli]||cli}:</td><td></td><td></td><td class="num" style="font-weight:600;font-size:11.5px">${money(cVenta)}</td><td></td><td class="num" style="font-size:11.5px;color:var(--muted)">${money(cCosto)}</td><td class="num" style="font-weight:600;font-size:11.5px;color:var(--green)">${money(cMargen)}</td><td class="num" style="font-size:11.5px;color:var(--green)">${cPct.toFixed(1)}%</td></tr>`;
      });
      gVenta+=vVenta;gCosto+=vCosto;
      const vMargen=vVenta-vCosto;
      const vPct=vVenta?(vMargen/vVenta*100):0;
      const vendKey='V:'+vend;
      // Encabezado de vendedor (banda verde, clickeable) + clientes + subtotal vendedor
      cuerpo+=`<tr data-grupo-key="${vendKey}" style="background:var(--green);cursor:pointer" onclick="toggleGrupo('${vendKey.replace(/'/g,"\\'")}')"><td colspan="8" style="color:#fff;font-weight:700;font-size:13px;padding:8px 10px"><span class="flecha-grupo" style="display:inline-block;width:14px">▾</span>${vend}</td></tr>`+filasVend+
        `<tr data-pertenece="1" data-vend="${vend}" style="border-bottom:2px solid var(--line-strong);background:#f0f5e8"><td style="text-align:right;font-weight:700;font-size:12px">TOTAL ${vend}:</td><td></td><td></td><td class="num" style="font-weight:700">${money(vVenta)}</td><td></td><td class="num" style="font-weight:700;color:var(--muted)">${money(vCosto)}</td><td class="num" style="font-weight:700;color:var(--green)">${money(vMargen)}</td><td class="num" style="font-weight:700;color:var(--green)">${vPct.toFixed(1)}%</td></tr>
        <tr><td colspan="8" style="height:8px"></td></tr>`;
    });
    exportData=expFilas;
    gruposColapsados.__inicializado=true;
    const gMargen=gVenta-gCosto;
    const gPct=gVenta?(gMargen/gVenta*100):0;
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-blue',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Ventas totales',val:money(gVenta)},
      {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/>',lbl:'Costo total',val:money(gCosto)},
      {ic:'i-green',svg:'<path d="M23 6l-9.5 9.5-5-5L1 18"/>',lbl:'Margen total',val:money(gMargen)},
      {ic:'i-lime',svg:'<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',lbl:'Margen %',val:gPct.toFixed(1)+'%'}])}</div>
      <div class="panel"><div class="panel-head"><h3>Ventas por cliente y producto</h3></div>
      <table style="font-size:12px"><thead><tr>
        <th>Producto</th><th class="num">Cant.</th><th class="num">Precio Unit.</th><th class="num">Venta Total</th>
        <th class="num">Costo Unit.</th><th class="num">Costo Total</th><th class="num">Margen Q</th><th class="num">Margen %</th>
      </tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  }
  else if(repType==='climes'){
    // VENTAS POR CLIENTE Y MES — vendedor → clientes, montos por mes (con IVA) + total
    const primeraVezMes=!gruposColapsados.__mesInit;
    // Filtro de vendedor (ventas ya viene filtrada si se eligió uno)
    // 1) Determinar los meses presentes en el rango de ventas
    const mesKey=d=>{const f=new Date(d.creada);return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');};
    const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesLbl=k=>{const [a,m]=k.split('-');return MESES_ES[Number(m)-1]+' '+a;};
    const mesesSet=new Set();
    ventas.forEach(d=>mesesSet.add(mesKey(d)));
    const meses=[...mesesSet].sort();
    // 2) Agrupar: vendedor → cliente → {mes: monto, total}
    const grupos={};
    ventas.forEach(d=>{
      const vend=d.vendedorNombre||'Sin vendedor';
      // Por cliente_id (estable), no por nombre: el mismo cliente traía el
      // nombre comercial vacío en las facturas viejas y lleno en las nuevas;
      // por nombre se partía en dos filas y agosto caía en la otra.
      const cli=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'Sin cliente');
      const nombre=d.clienteComercial||d.clienteNombre||'Sin cliente';
      const mk=mesKey(d);
      const monto=Number(d.totales?.total||0); // con IVA (total facturado)
      if(!grupos[vend])grupos[vend]={};
      if(!grupos[vend][cli])grupos[vend][cli]={meses:{},total:0,nombre};
      if(d.clienteComercial)grupos[vend][cli].nombre=d.clienteComercial;
      grupos[vend][cli].meses[mk]=(grupos[vend][cli].meses[mk]||0)+monto;
      grupos[vend][cli].total+=monto;
    });
    // 3) Construir tabla + export
    const expFilas=[]; let nClientes=0;
    const totalesGen={}; meses.forEach(m=>totalesGen[m]=0); let granTotal=0;
    let cuerpo='';
    Object.keys(grupos).sort((a,b)=>a.localeCompare(b,'es')).forEach(vend=>{
      const clientesV=grupos[vend];
      const subt={}; meses.forEach(m=>subt[m]=0); let subTotalVend=0;
      const vendKey='V:'+vend;
      // Colapsar por defecto la primera vez
      if(primeraVezMes&&gruposColapsados[vendKey]===undefined)gruposColapsados[vendKey]=true;
      // encabezado vendedor (clickeable)
      cuerpo+=`<tr data-grupo-key="${vendKey}" style="background:var(--green);cursor:pointer" onclick="toggleGrupo('${vendKey.replace(/'/g,"\\'")}')"><td colspan="${meses.length+2}" style="color:#fff;font-weight:700;font-size:13px;padding:8px 12px"><span class="flecha-grupo" style="display:inline-block;width:14px">▾</span>${vend}</td></tr>`;
      // clientes ordenados por total desc
      Object.entries(clientesV).sort((a,b)=>b[1].total-a[1].total).forEach(([cliKey,info])=>{
        const cli=info.nombre;
        let celdas='';
        const filaExp={Vendedor:vend,Cliente:cli};
        meses.forEach(m=>{
          const val=info.meses[m]||0;
          subt[m]+=val; totalesGen[m]+=val;
          celdas+=`<td class="num">${val?money(val):'<span style="color:var(--muted-2)">—</span>'}</td>`;
          filaExp[mesLbl(m)]=val;
        });
        filaExp['Total']=info.total;
        expFilas.push(filaExp); nClientes++;
        subTotalVend+=info.total; granTotal+=info.total;
        cuerpo+=`<tr data-pertenece="1" data-vend="${vend}" style="border-bottom:1px solid var(--line)"><td style="padding-left:26px">${cli}</td>${celdas}<td class="num" style="font-weight:600;background:#fafdf5">${money(info.total)}</td></tr>`;
      });
      // subtotal del vendedor para el Excel/PDF
      const filaSub={Vendedor:vend,Cliente:'Total '+vend};
      meses.forEach(m=>{filaSub[mesLbl(m)]=subt[m];});
      filaSub['Total']=subTotalVend;
      expFilas.push(filaSub);
      // fila en blanco para separar cada bloque de vendedor en el Excel/PDF
      const filaBlank={Vendedor:'',Cliente:''};
      meses.forEach(m=>{filaBlank[mesLbl(m)]='';});
      filaBlank['Total']='';
      expFilas.push(filaBlank);
      // subtotal vendedor
      let celdasSub='';
      meses.forEach(m=>{celdasSub+=`<td class="num" style="font-weight:700">${money(subt[m])}</td>`;});
      cuerpo+=`<tr data-pertenece="1" data-vend="${vend}" style="border-bottom:2px solid var(--line-strong);background:#f0f5e8"><td style="text-align:right;font-weight:700;font-size:12px">Total ${vend}:</td>${celdasSub}<td class="num" style="font-weight:700">${money(subTotalVend)}</td></tr>
        <tr data-pertenece="1" data-vend="${vend}"><td colspan="${meses.length+2}" style="height:8px"></td></tr>`;
    });
    // total general para el Excel/PDF
    const filaGen={Vendedor:'TOTAL GENERAL',Cliente:''};
    meses.forEach(m=>{filaGen[mesLbl(m)]=totalesGen[m];});
    filaGen['Total']=granTotal;
    expFilas.push(filaGen);
    // total general
    let celdasGen='';
    meses.forEach(m=>{celdasGen+=`<td class="num" style="font-weight:800">${money(totalesGen[m])}</td>`;});
    cuerpo+=`<tr style="border-top:3px solid var(--green);background:#eaf0e0"><td style="padding:11px 12px;font-weight:800;font-size:13px">TOTAL GENERAL</td>${celdasGen}<td class="num" style="font-weight:800">${money(granTotal)}</td></tr>`;
    // encabezados de meses
    const ths=meses.map(m=>`<th class="num">${mesLbl(m)}</th>`).join('');
    exportData=expFilas;
    gruposColapsados.__mesInit=true;
    if(!meses.length){
      html+=`<div class="panel"><div class="panel-body"><p class="empty">No hay ventas en el período seleccionado.</p></div></div>`;
    }else{
      html+=`<div class="panel"><div class="panel-head"><h3>Ventas por cliente y mes</h3><span style="font-size:12px;color:var(--muted)">Montos con IVA · ${nClientes} cliente${nClientes!==1?'s':''}</span></div>
        <table style="font-size:12.5px"><thead><tr><th>Vendedor / Cliente</th>${ths}<th class="num" style="background:#f0f5e8">Total</th></tr></thead>
        <tbody>${cuerpo}</tbody></table></div>`;
    }
  }
  else if(repType==='climescomp'){
    // COMPARATIVA CLIENTE MES CON MES — clientes en filas, meses en columnas + variación del último mes vs. el anterior
    const mesKey=d=>{const f=new Date(d.creada);return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');};
    const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesLbl=k=>{const [a,m]=k.split('-');return MESES_ES[Number(m)-1]+' '+a;};
    const mesAbbr=k=>{const [a,m]=k.split('-');return MESES_ES[Number(m)-1].slice(0,3)+' '+a.slice(2);};
    // Esta es una COMPARATIVA: siempre tiene que incluir el mes en curso y el
    // anterior para poder comparar. Sin importar el período elegido, forzamos
    // que el rango llegue hasta hoy y empiece a más tardar en el mes pasado.
    // (Ej.: filtro "Este mes" → sale este mes y el anterior, no uno solo.)
    const _ahora=new Date();
    const _finCurso=new Date(_ahora.getFullYear(),_ahora.getMonth()+1,0,23,59,59); // último día del mes actual
    const _iniPrev=new Date(_ahora.getFullYear(),_ahora.getMonth()-1,1);           // 1° del mes anterior
    const _rComp={start:(r.start<_iniPrev?r.start:_iniPrev),end:(r.end>_finCurso?r.end:_finCurso)};
    let ventasC=documentos.filter(d=>['certificada','facturado'].includes(d.estado)&&d.tipoDoc!=='notaCredito'&&enRango(d.creada,_rComp));
    if(repFiltros.cliente)ventasC=ventasC.filter(d=>String(d.clienteId)===repFiltros.cliente);
    if(repFiltros.vendedor_simple)ventasC=ventasC.filter(d=>d.vendedorNombre===repFiltros.vendedor_simple);
    const _mkDate=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
    const mesesSet=new Set();
    ventasC.forEach(d=>mesesSet.add(mesKey(d)));
    mesesSet.add(_mkDate(_ahora));   // el mes en curso SIEMPRE es columna
    mesesSet.add(_mkDate(_iniPrev)); // y el anterior, para que siempre haya con qué comparar
    const meses=[...mesesSet].sort();
    const porCli={};
    ventasC.forEach(d=>{
      // Agrupar por cliente_id (identidad estable), NO por nombre. Las facturas
      // históricas traían el nombre comercial vacío (se agrupaban por el nombre
      // legal) y las nuevas lo traen lleno (se agrupaban por el comercial); por
      // nombre, el mismo cliente se partía en dos filas y agosto caía en la otra.
      const key=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'Sin cliente');
      const nombre=d.clienteComercial||d.clienteNombre||'Sin cliente';
      const mk=mesKey(d),monto=Number(d.totales?.total||0);
      if(!porCli[key])porCli[key]={meses:{},total:0,nombre};
      if(d.clienteComercial)porCli[key].nombre=d.clienteComercial; // etiqueta preferida: el nombre comercial
      porCli[key].meses[mk]=(porCli[key].meses[mk]||0)+monto;
      porCli[key].total+=monto;
    });
    const ultM=meses[meses.length-1],prevM=meses[meses.length-2],hayComp=meses.length>=2;
    const filas=Object.entries(porCli).sort((a,b)=>b[1].total-a[1].total);
    const totalesGen={};meses.forEach(m=>totalesGen[m]=0);let granTotal=0;
    const expFilas=[];let cuerpo='';
    const varTd=(dif,pv,peso)=>{
      const col=dif>0.005?'var(--green)':(dif<-0.005?'var(--danger)':'var(--muted)');
      const arr=dif>0.005?'▲':(dif<-0.005?'▼':'▬');
      const pct=pv?Math.abs(dif/pv*100):(Math.abs(dif)>0.005?100:0);
      return `<td class="num" style="color:${col};font-weight:${peso};white-space:nowrap">${arr} ${money(Math.abs(dif))}${pv?` <span style="font-size:10.5px">(${dif>=0?'+':'-'}${pct.toFixed(0)}%)</span>`:''}</td>`;
    };
    filas.forEach(([key,info])=>{
      const cli=info.nombre;
      let celdas='';const filaExp={Cliente:cli};
      meses.forEach(m=>{
        const val=info.meses[m]||0;totalesGen[m]+=val;
        celdas+=`<td class="num">${val?money(val):'<span style="color:var(--muted-2)">—</span>'}</td>`;
        filaExp[mesLbl(m)]=val;
      });
      granTotal+=info.total;
      let varCell='';
      if(hayComp){
        const u=info.meses[ultM]||0,pv=info.meses[prevM]||0,dif=u-pv;
        varCell=varTd(dif,pv,600);
        filaExp['Δ '+mesLbl(ultM)]=dif;filaExp['Var %']=pv?Number((dif/pv*100).toFixed(1)):'';
      }
      filaExp['Total']=info.total;expFilas.push(filaExp);
      cuerpo+=`<tr style="border-bottom:1px solid var(--line)"><td style="font-weight:600">${cli}</td>${celdas}${varCell}<td class="num" style="font-weight:600;background:#fafdf5">${money(info.total)}</td></tr>`;
    });
    let celdasGen='';meses.forEach(m=>{celdasGen+=`<td class="num" style="font-weight:800">${money(totalesGen[m])}</td>`;});
    let varGen='';
    if(hayComp){const dif=(totalesGen[ultM]||0)-(totalesGen[prevM]||0);varGen=varTd(dif,totalesGen[prevM]||0,800);}
    const filaGen={Cliente:'TOTAL GENERAL'};meses.forEach(m=>{filaGen[mesLbl(m)]=totalesGen[m];});
    if(hayComp){filaGen['Δ '+mesLbl(ultM)]=(totalesGen[ultM]||0)-(totalesGen[prevM]||0);filaGen['Var %']='';}
    filaGen['Total']=granTotal;expFilas.push(filaGen);
    exportData=expFilas;
    const ths=meses.map(m=>`<th class="num">${mesLbl(m)}</th>`).join('');
    if(!meses.length){
      html+=`<div class="panel"><div class="panel-body"><p class="empty">No hay ventas en el período seleccionado.</p></div></div>`;
    }else{
      const aviso=hayComp?'':'<div style="font-size:12px;color:#b26a00;padding:2px 4px 10px">Elegí un período con varios meses (ej. «Este año» o un rango de fechas) para poder comparar mes con mes.</div>';
      html+=`<div class="panel"><div class="panel-head"><h3>Comparativa cliente mes con mes</h3><span style="font-size:12px;color:var(--muted)">Montos con IVA · ${filas.length} cliente${filas.length!==1?'s':''}${hayComp?' · variación '+mesLbl(prevM)+' → '+mesLbl(ultM):''}</span></div>
        ${aviso}
        <div style="overflow-x:auto"><table style="font-size:12.5px;min-width:${420+meses.length*110}px"><thead><tr><th>Cliente</th>${ths}${hayComp?`<th class="num" style="background:#eef6ff">Δ ${mesAbbr(ultM)}</th>`:''}<th class="num" style="background:#f0f5e8">Total</th></tr></thead>
        <tbody>${cuerpo}<tr style="border-top:3px solid var(--green);background:#eaf0e0"><td style="padding:11px 12px;font-weight:800;font-size:13px">TOTAL GENERAL</td>${celdasGen}${varGen}<td class="num" style="font-weight:800">${money(granTotal)}</td></tr></tbody></table></div></div>`;
    }
  }
  else if(repType==='prodmescomp'){
    // COMPARATIVA PRODUCTO/MES POR CLIENTE — cada cliente es una sección
    // colapsable; debajo, sus productos con los meses en columnas y la
    // variación del último mes vs. el anterior. Botón monto (Q) / cantidad.
    // OJO: ene–jul se importó sin detalle de productos → sólo agosto en adelante.
    const _esCant=(repFiltros.prodMetrica==='cantidad');
    const fmt=n=>_esCant?(Math.round((Number(n)||0)*100)/100).toLocaleString('es-GT'):money(n);
    const mesKey=d=>{const f=new Date(d.creada);return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');};
    const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesLbl=k=>{const [a,m]=k.split('-');return MESES_ES[Number(m)-1]+' '+a;};
    const mesAbbr=k=>{const [a,m]=k.split('-');return MESES_ES[Number(m)-1].slice(0,3)+' '+a.slice(2);};
    const _ahora=new Date();
    const _finCurso=new Date(_ahora.getFullYear(),_ahora.getMonth()+1,0,23,59,59);
    const _iniPrev=new Date(_ahora.getFullYear(),_ahora.getMonth()-1,1);
    const _rComp={start:(r.start<_iniPrev?r.start:_iniPrev),end:(r.end>_finCurso?r.end:_finCurso)};
    let ventasC=documentos.filter(d=>['certificada','facturado'].includes(d.estado)&&d.tipoDoc!=='notaCredito'&&enRango(d.creada,_rComp));
    if(repFiltros.cliente)ventasC=ventasC.filter(d=>String(d.clienteId)===repFiltros.cliente);
    if(repFiltros.vendedor_simple)ventasC=ventasC.filter(d=>d.vendedorNombre===repFiltros.vendedor_simple);
    const _mkDate=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
    const mesesSet=new Set();
    ventasC.forEach(d=>{ if((d.items||[]).length) mesesSet.add(mesKey(d)); });
    mesesSet.add(_mkDate(_ahora)); mesesSet.add(_mkDate(_iniPrev));
    const meses=[...mesesSet].sort();
    const ultM=meses[meses.length-1],prevM=meses[meses.length-2],hayComp=meses.length>=2;
    const valLinea=it=>_esCant?(Number(it.cantidad)||0):((Number(it.cantidad)||0)*(Number(it.precio)||0)-(Number(it.descuento)||0));
    const grupos={};
    ventasC.forEach(d=>{
      const cliKey=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'Sin cliente');
      const cliNom=d.clienteComercial||d.clienteNombre||'Sin cliente';
      const mk=mesKey(d);
      if(!grupos[cliKey])grupos[cliKey]={nombre:cliNom,prods:{},meses:{},total:0};
      if(d.clienteComercial)grupos[cliKey].nombre=d.clienteComercial;
      (d.items||[]).forEach(it=>{
        const pKey=(it.id!=null?('#'+it.id):(it.codigo||it.nombre||'—'));
        const g=grupos[cliKey];
        if(!g.prods[pKey])g.prods[pKey]={codigo:it.codigo||'',nombre:it.nombre||'—',meses:{},total:0};
        const v=valLinea(it);
        g.prods[pKey].meses[mk]=(g.prods[pKey].meses[mk]||0)+v;
        g.prods[pKey].total+=v;
        g.meses[mk]=(g.meses[mk]||0)+v;
        g.total+=v;
      });
    });
    const totalesGen={};meses.forEach(m=>totalesGen[m]=0);let granTotal=0;
    const expFilas=[];let cuerpo='';
    const varTd=(dif,pv,peso,claro)=>{
      const col=claro?'#fff':(dif>0.005?'var(--green)':(dif<-0.005?'var(--danger)':'var(--muted)'));
      const arr=dif>0.005?'▲':(dif<-0.005?'▼':'▬');
      const pct=pv?Math.abs(dif/pv*100):(Math.abs(dif)>0.005?100:0);
      return `<td class="num" style="color:${col};font-weight:${peso};white-space:nowrap">${arr} ${fmt(Math.abs(dif))}${pv?` <span style="font-size:10.5px">(${dif>=0?'+':'-'}${pct.toFixed(0)}%)</span>`:''}</td>`;
    };
    const cliOrden=Object.entries(grupos).sort((a,b)=>b[1].total-a[1].total);
    const primeraVez=!gruposColapsados.__prodMesInit;
    cliOrden.forEach(([cliKey,g])=>{
      const gk='V:'+cliKey;
      if(primeraVez&&gruposColapsados[gk]===undefined)gruposColapsados[gk]=true;
      let celdasCli='';meses.forEach(m=>{const val=g.meses[m]||0;totalesGen[m]+=val;celdasCli+=`<td class="num" style="color:#fff;font-weight:700">${val?fmt(val):'—'}</td>`;});
      granTotal+=g.total;
      let varCli='';
      if(hayComp){const u=g.meses[ultM]||0,pv=g.meses[prevM]||0;varCli=varTd(u-pv,pv,700,true);}
      cuerpo+=`<tr data-grupo-key="${gk}" style="background:var(--green);cursor:pointer" onclick="toggleGrupo('${gk.replace(/'/g,"\\'")}')"><td style="color:#fff;font-weight:700;padding:8px 12px"><span class="flecha-grupo" style="display:inline-block;width:14px">▾</span>${g.nombre}</td>${celdasCli}${varCli}<td class="num" style="color:#fff;font-weight:800">${fmt(g.total)}</td></tr>`;
      const prods=Object.values(g.prods).sort((a,b)=>b.total-a.total);
      prods.forEach(p=>{
        const nom=(p.codigo?`<span style="color:var(--muted);font-size:11px">${p.codigo}</span> `:'')+p.nombre;
        let celdas='';const filaExp={Cliente:g.nombre,'Código':p.codigo,Producto:p.nombre};
        meses.forEach(m=>{const val=p.meses[m]||0;celdas+=`<td class="num">${val?fmt(val):'<span style="color:var(--muted-2)">—</span>'}</td>`;filaExp[mesLbl(m)]=val;});
        let varCell='';
        if(hayComp){const u=p.meses[ultM]||0,pv=p.meses[prevM]||0,dif=u-pv;varCell=varTd(dif,pv,600,false);filaExp['Δ '+mesLbl(ultM)]=dif;filaExp['Var %']=pv?Number((dif/pv*100).toFixed(1)):'';}
        filaExp['Total']=p.total;expFilas.push(filaExp);
        cuerpo+=`<tr data-pertenece="1" data-vend="${cliKey}" style="border-bottom:1px solid var(--line)"><td style="padding-left:26px">${nom}</td>${celdas}${varCell}<td class="num" style="font-weight:600;background:#fafdf5">${fmt(p.total)}</td></tr>`;
      });
    });
    gruposColapsados.__prodMesInit=true;
    let celdasGen='';meses.forEach(m=>{celdasGen+=`<td class="num" style="font-weight:800">${fmt(totalesGen[m])}</td>`;});
    let varGen='';
    if(hayComp){const dif=(totalesGen[ultM]||0)-(totalesGen[prevM]||0);varGen=varTd(dif,totalesGen[prevM]||0,800,false);}
    exportData=expFilas;
    const ths=meses.map(m=>`<th class="num">${mesLbl(m)}</th>`).join('');
    const _cliSel=repFiltros.cliente?((clientes.find(c=>String(c.id)===repFiltros.cliente)||{}).nombre||''):'';
    const toggle=`<div style="display:flex;gap:6px;margin-bottom:10px"><button class="btn btn-sm ${_esCant?'btn-ghost':'btn-primary'}" onclick="setRepMetrica('monto')">Q Monto</button><button class="btn btn-sm ${_esCant?'btn-primary':'btn-ghost'}" onclick="setRepMetrica('cantidad')"># Cantidad</button></div>`;
    const avisoHist=`<div style="font-size:11.5px;color:#7A4A07;background:var(--warn-bg);border:1px solid rgba(168,130,0,.2);border-radius:8px;padding:7px 10px;margin-bottom:10px">Sólo aparecen productos de <b>agosto 2026 en adelante</b>: las ventas de ene–jul se importaron sin el detalle de productos.</div>`;
    if(!cliOrden.length){
      html+=`${toggle}${avisoHist}<div class="panel"><div class="panel-body"><p class="empty">No hay ventas con detalle de productos en el período seleccionado.</p></div></div>`;
    }else{
      const aviso=hayComp?'':'<div style="font-size:12px;color:#b26a00;padding:2px 4px 10px">Elegí un período con varios meses para poder comparar mes con mes.</div>';
      html+=`${toggle}${avisoHist}<div class="panel"><div class="panel-head"><h3>Comparativa producto/mes por cliente${_cliSel?' · '+_cliSel:''}</h3><span style="font-size:12px;color:var(--muted)">${_esCant?'Cantidades':'Montos con IVA'} · ${cliOrden.length} cliente${cliOrden.length!==1?'s':''}${hayComp?' · variación '+mesLbl(prevM)+' → '+mesLbl(ultM):''} · tocá un cliente para ver sus productos</span></div>
        ${aviso}
        <div style="overflow-x:auto"><table style="font-size:12.5px;min-width:${420+meses.length*110}px"><thead><tr><th>Cliente / Producto</th>${ths}${hayComp?`<th class="num" style="background:#eef6ff">Δ ${mesAbbr(ultM)}</th>`:''}<th class="num" style="background:#f0f5e8">Total</th></tr></thead>
        <tbody>${cuerpo}<tr style="border-top:3px solid var(--green);background:#eaf0e0"><td style="padding:11px 12px;font-weight:800;font-size:13px">TOTAL GENERAL</td>${celdasGen}${varGen}<td class="num" style="font-weight:800">${fmt(granTotal)}</td></tr></tbody></table></div></div>`;
    }
  }
  else if(repType==='comision'){
    // COMISIONES POR PRODUCTO — replica el reporte de comisiones (Excel). Comisión 5% sobre la venta sin IVA.
    // it.precio ya incluye IVA (convención GT): Precio Final = Σ(cant·precio − desc) con IVA; Venta sin IVA = /1.12.
    const COMISION_PCT=5, IVA=1.12, r2=n=>Math.round((Number(n)||0)*100)/100;
    const porProd={};
    ventas.forEach(d=>{
      const dt=new Date(d.creada);
      // Exenta: la venta ya viene SIN IVA (no dividir /1.12). Si no, el importe incluye IVA.
      const exenta=!!(d.exenta||d.esExenta)||(d.totales&&Number(d.totales.iva||0)<=0.001&&Number(d.totales.total||0)>0.001);
      (d.items||[]).forEach(it=>{
        const p=productos.find(x=>x.id===it.id)||productos.find(x=>x.codigo===it.codigo);
        const cajaUnidad=!!(p&&p.tipoEmpaque==='caja_unidad'),upc=Number(p&&p.unidadesPorCaja)||1;
        const cant=Number(it.cantidad)||0,linea=cant*(Number(it.precio)||0)-(Number(it.descuento)||0);
        const costoCaja=costoProductoMes(p?p.id:it.id,dt.getFullYear(),dt.getMonth()); // por CAJA en caja_unidad
        // caja_unidad se parte en 2 renglones: ventas por CAJA (código) y por UNIDAD (subcódigo -U).
        let key,codigo,nombre,valorUnit,costoUnit;
        if(cajaUnidad&&it.modoVenta==='caja'){
          key=(it.id||it.codigo)+'|caja'; codigo=it.codigo||(p&&p.codigo)||''; nombre=it.nombre||(p&&p.nombre)||'';
          valorUnit=Number(p.precio)||0; costoUnit=costoCaja;                     // por caja
        }else if(cajaUnidad){
          key=(it.id||it.codigo)+'|und'; codigo=(it.codigo||(p&&p.codigo)||'')+'-U'; nombre=it.nombre||(p&&p.nombre)||'';
          valorUnit=(p.precioUnidad&&Number(p.precioUnidad)>0)?Number(p.precioUnidad):((Number(p.precio)||0)/upc); costoUnit=costoCaja/upc; // por unidad
        }else{
          key=it.id||it.codigo; codigo=it.codigo||(p&&p.codigo)||''; nombre=it.nombre||(p&&p.nombre)||'';
          valorUnit=(p&&Number(p.precio))||Number(it.precio)||0; costoUnit=costoCaja;
        }
        if(!porProd[key])porProd[key]={codigo,nombre,cant:0,costoTotal:0,precioFinal:0,ventaSinIva:0,precioLista:0,valorUnit};
        const g=porProd[key];
        g.cant+=cant;
        g.precioFinal+=linea;
        g.ventaSinIva+=exenta?linea:linea/IVA;
        g.costoTotal+=costoUnit*cant;
        g.precioLista+=cant*(exenta?valorUnit/IVA:valorUnit);   // lista comparable (exenta sin IVA)
      });
    });
    const arr=Object.values(porProd).filter(g=>g.cant>0);
    arr.forEach(g=>{
      g.costoUnit=g.cant?g.costoTotal/g.cant:0;
      g.pctDesc=g.precioLista?(g.precioLista-g.precioFinal)/g.precioLista*100:0;
      g.valorComision=g.ventaSinIva*COMISION_PCT/100;
      g.ganancia=g.precioFinal-g.costoTotal-g.valorComision;
      g.pctGan=g.precioFinal?g.ganancia/g.precioFinal*100:0;
    });
    arr.sort((a,b)=>b.valorComision-a.valorComision);
    const T={cant:0,costoTotal:0,precioLista:0,precioFinal:0,ventaSinIva:0,valorComision:0,ganancia:0};
    arr.forEach(g=>{T.cant+=g.cant;T.costoTotal+=g.costoTotal;T.precioLista+=g.precioLista;T.precioFinal+=g.precioFinal;T.ventaSinIva+=g.ventaSinIva;T.valorComision+=g.valorComision;T.ganancia+=g.ganancia;});
    // % globales (ponderados con los totales, no un promedio simple)
    const TpctDesc=T.precioLista?(T.precioLista-T.precioFinal)/T.precioLista*100:0;
    const TpctGan=T.precioFinal?T.ganancia/T.precioFinal*100:0;
    exportData=arr.map(g=>({'Código':g.codigo,'NombreProducto':g.nombre,'Cantidad':g.cant,'Costo Unitario Promedio':r2(g.costoUnit),'Costo Total':r2(g.costoTotal),'Valor Unitario':r2(g.valorUnit),'Precio Lista':r2(g.precioLista),'Precio Final':r2(g.precioFinal),'Porcentaje Descuento':r2(g.pctDesc),'Venta Total sin IVA':r2(g.ventaSinIva),'Comision':COMISION_PCT,'Valor Comision':r2(g.valorComision),'Ganancia':r2(g.ganancia),'Porcentaje Ganancia':r2(g.pctGan)}));
    if(arr.length)exportData.push({'Código':'','NombreProducto':'TOTAL','Cantidad':T.cant,'Costo Unitario Promedio':'','Costo Total':r2(T.costoTotal),'Valor Unitario':'','Precio Lista':r2(T.precioLista),'Precio Final':r2(T.precioFinal),'Porcentaje Descuento':r2(TpctDesc),'Venta Total sin IVA':r2(T.ventaSinIva),'Comision':'','Valor Comision':r2(T.valorComision),'Ganancia':r2(T.ganancia),'Porcentaje Ganancia':r2(TpctGan)});
    const filasHtml=arr.map(g=>`<tr>
      <td style="color:var(--muted);font-size:11px">${g.codigo||'—'}</td>
      <td style="font-weight:600">${g.nombre||'—'}</td>
      <td class="num">${g.cant}</td>
      <td class="num" style="color:var(--muted)">${money(g.costoUnit)}</td>
      <td class="num" style="color:var(--muted)">${money(g.costoTotal)}</td>
      <td class="num" style="color:var(--muted)">${money(g.valorUnit)}</td>
      <td class="num">${money(g.precioLista)}</td>
      <td class="num" style="font-weight:600">${money(g.precioFinal)}</td>
      <td class="num" style="color:${g.pctDesc<0?'var(--danger)':'var(--muted)'}">${g.pctDesc.toFixed(1)}%</td>
      <td class="num">${money(g.ventaSinIva)}</td>
      <td class="num" style="color:var(--muted)">${COMISION_PCT}%</td>
      <td class="num" style="font-weight:700;color:var(--green)">${money(g.valorComision)}</td>
      <td class="num" style="color:${g.ganancia<0?'var(--danger)':'var(--ink)'}">${money(g.ganancia)}</td>
      <td class="num" style="color:${g.pctGan<0?'var(--danger)':'var(--muted)'}">${g.pctGan.toFixed(1)}%</td></tr>`).join('');
    const totalRow=arr.length?`<tr style="border-top:3px solid var(--green);background:#eaf0e0;font-weight:800">
      <td colspan="2" style="padding:10px 12px">TOTAL · ${arr.length} producto(s)</td>
      <td class="num">${T.cant}</td><td></td>
      <td class="num">${money(T.costoTotal)}</td><td></td>
      <td class="num">${money(T.precioLista)}</td>
      <td class="num">${money(T.precioFinal)}</td><td class="num" style="color:${TpctDesc<0?'var(--danger)':'inherit'}">${TpctDesc.toFixed(1)}%</td>
      <td class="num">${money(T.ventaSinIva)}</td><td></td>
      <td class="num" style="color:var(--green)">${money(T.valorComision)}</td>
      <td class="num">${money(T.ganancia)}</td><td class="num" style="color:${TpctGan<0?'var(--danger)':'inherit'}">${TpctGan.toFixed(1)}%</td></tr>`:'';
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Comisión total ('+COMISION_PCT+'%)',val:money(T.valorComision),sub:arr.length+' producto(s)'},
      {ic:'i-blue',svg:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',lbl:'Venta sin IVA',val:money(T.ventaSinIva)},
      {ic:'i-lime',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Ganancia',val:money(T.ganancia)},
      {ic:'i-blue',svg:'<path d="M20 7 9 18l-5-5"/>',lbl:'Costo total',val:money(T.costoTotal)}
    ])}</div>
    <div class="panel"><div class="panel-head"><h3>Comisiones por producto</h3><span style="font-size:12px;color:var(--muted)">${periodoLabel} · comisión ${COMISION_PCT}% sobre venta sin IVA${repFiltros.vendedor_simple?' · '+repFiltros.vendedor_simple:''}</span></div>
      <div style="overflow-x:auto"><table style="font-size:11.5px;min-width:1180px"><thead><tr>
        <th>Código</th><th>Producto</th><th class="num">Cant.</th><th class="num">Costo U.</th><th class="num">Costo Total</th><th class="num">Valor U.</th><th class="num">Precio Lista</th><th class="num">Precio Final</th><th class="num">% Desc</th><th class="num">Venta s/IVA</th><th class="num">Com.</th><th class="num">Valor Com.</th><th class="num">Ganancia</th><th class="num">% Gan.</th>
      </tr></thead><tbody>${filasHtml||'<tr><td colspan="14" class="empty">Sin ventas en el período</td></tr>'}${totalRow}</tbody></table></div></div>`;
  }
  else if(repType==='dircli'){
    // LISTADO DE CLIENTES — directorio de contactos agrupado por vendedor
    const primeraVezDir=!gruposColapsados.__dirInit;
    // Filtrar clientes por vendedor si se eligió uno
    let clientesDir=clientes.filter(c=>c.nit!=='CF'); // excluir Consumidor Final
    if(repFiltros.vendedor_simple){
      const v=vendedores.find(x=>x.nombre===repFiltros.vendedor_simple);
      if(v)clientesDir=clientesDir.filter(c=>c.vendedorId===v.id);
    }
    // Agrupar por vendedor
    const porVend={};
    clientesDir.forEach(c=>{
      const v=vendedores.find(x=>x.id===c.vendedorId);
      const nombreVend=v?v.nombre:'Sin vendedor';
      if(!porVend[nombreVend])porVend[nombreVend]=[];
      porVend[nombreVend].push(c);
    });
    const dash='<span style="color:var(--muted-2)">—</span>';
    const expFilas=[];
    let cuerpo='';
    let totalClientes=0;
    Object.keys(porVend).sort((a,b)=>a.localeCompare(b,'es')).forEach(vend=>{
      const cls=porVend[vend].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
      const vendKey='V:'+vend;
      // Colapsar por defecto la primera vez
      if(primeraVezDir&&gruposColapsados[vendKey]===undefined)gruposColapsados[vendKey]=true;
      cuerpo+=`<tr data-grupo-key="${vendKey}" style="background:var(--green);cursor:pointer" onclick="toggleGrupo('${vendKey.replace(/'/g,"\\'")}')"><td colspan="7" style="color:#fff;font-weight:700;font-size:12.5px;padding:7px 12px"><span class="flecha-grupo" style="display:inline-block;width:14px">▾</span>${vend} <span style="font-weight:400;opacity:.8">(${cls.length})</span></td></tr>`;
      cls.forEach(c=>{
        totalClientes++;
        const cc=c.contactoCompras||{}, cp=c.contactoPagos||{};
        cuerpo+=`<tr data-pertenece="1" data-vend="${vend}" style="border-bottom:1px solid var(--line)">
          <td style="font-weight:600">${c.nombre||dash}</td>
          <td style="font-size:11px;color:var(--muted)">${c.nit||dash}</td>
          <td style="color:var(--muted)">${c.razonSocial||dash}</td>
          <td style="color:var(--muted);font-size:11px">${c.direccion||dash}</td>
          <td style="color:var(--muted);font-size:11px">${c.email||dash}</td>
          <td>${cc.nombre||dash}<div style="font-family:monospace;font-size:11px;color:var(--muted)">${cc.telefono||''}</div></td>
          <td>${cp.nombre||dash}<div style="font-family:monospace;font-size:11px;color:var(--muted)">${cp.telefono||''}</div></td>
        </tr>`;
        expFilas.push({
          Vendedor:vend, Cliente:c.nombre||'', NIT:c.nit||'', 'Razón Social':c.razonSocial||'',
          'Dirección':c.direccion||'', 'Correo':c.email||'',
          'Contacto Compras':cc.nombre||'', 'Tel. Compras':cc.telefono||'',
          'Contacto Pagos':cp.nombre||'', 'Tel. Pagos':cp.telefono||''
        });
      });
    });
    exportData=expFilas;
    gruposColapsados.__dirInit=true;
    if(!totalClientes){
      html+=`<div class="panel"><div class="panel-body"><p class="empty">No hay clientes para mostrar.</p></div></div>`;
    }else{
      html+=`<div class="panel"><div class="panel-head"><h3>Listado de clientes</h3><span style="font-size:12px;color:var(--muted)">${totalClientes} cliente${totalClientes!==1?'s':''}</span></div>
        <table style="font-size:11.5px"><thead><tr>
          <th>Cliente</th><th>NIT</th><th>Razón Social</th><th>Dirección</th><th>Correo</th>
          <th style="background:#f0f5e8">Contacto Compras</th><th style="background:#fef6e8">Contacto Pagos</th>
        </tr></thead><tbody>${cuerpo}</tbody></table></div>`;
    }
  }
  else if(repType==='factem'){
    // REPORTE GENERAL DE FACTURAS EMITIDAS
    // Columnas: Documento, Fecha, Cliente, Tipo (Contado/Crédito), Neto, IVA, Valor, Saldo
    // Filtra por rango de fechas (selector global) y por cliente
    let facts=documentos.filter(d=>d.tipoDoc==='cambiaria'&&['certificada','facturado'].includes(d.estado)&&enRango(d.creada,r));
    if(repFiltros.cliente){
      facts=facts.filter(d=>String(d.clienteId)===String(repFiltros.cliente));
    }
    // Ordenar por fecha ascendente (como en la imagen)
    facts.sort((a,b)=>new Date(a.creada)-new Date(b.creada));
    const expFilas=[];
    const filas=facts.map(f=>{
      const ai=arInfo(f);
      const valor=Number(f.totales.total)||0;      // total con IVA
      const neto=Math.round((valor/1.12)*100)/100;  // sin IVA (12% Guatemala)
      const iva=Math.round((valor-neto)*100)/100;
      const tipo=(f.diasCredito>0)?'Crédito':'Contado';
      const doc=(f.serie||'')+'-'+(f.numeroDte||'');
      const cli=f.clienteComercial||f.clienteNombre||'—';
      expFilas.push({
        Documento:doc, Fecha:fdate(f.creada), Cliente:cli, Tipo:tipo,
        Neto:neto, IVA:iva, Valor:valor, Saldo:ai.saldo
      });
      return `<tr style="border-bottom:1px solid var(--line)">
        <td style="font-size:11.5px;font-weight:600">${doc}</td>
        <td style="font-size:11.5px;color:var(--muted)">${fdate(f.creada)}</td>
        <td style="font-size:12px">${cli}</td>
        <td style="font-size:11.5px"><span style="color:${tipo==='Crédito'?'var(--warn)':'var(--muted)'}">${tipo}</span></td>
        <td class="num" style="font-size:11.5px">${money(neto)}</td>
        <td class="num" style="font-size:11.5px;color:var(--muted)">${money(iva)}</td>
        <td class="num" style="font-size:11.5px;font-weight:600">${money(valor)}</td>
        <td class="num" style="font-size:11.5px;font-weight:${ai.saldo>0.001?'700':'400'};color:${ai.saldo>0.001?'var(--warn)':'var(--muted-2)'}">${ai.saldo>0.001?money(ai.saldo):'—'}</td>
      </tr>`;
    }).join('');
    exportData=expFilas;
    const cliNom=repFiltros.cliente?(clientes.find(c=>String(c.id)===String(repFiltros.cliente))?.nombre||''):'';
    if(!facts.length){
      html+=`<div class="panel"><div class="panel-body"><p class="empty">No hay facturas emitidas en el período${cliNom?' para '+cliNom:''}.</p></div></div>`;
    }else{
      html+=`<div class="panel"><div class="panel-head"><h3>Facturas emitidas</h3><span style="font-size:12px;color:var(--muted)">${facts.length} factura${facts.length!==1?'s':''}${cliNom?' · '+cliNom:''}</span></div>
        <table style="font-size:12px"><thead><tr>
          <th>Documento</th><th>Fecha</th><th>Cliente</th><th>Tipo</th>
          <th class="num">Neto</th><th class="num">IVA</th><th class="num">Valor</th><th class="num">Saldo</th>
        </tr></thead><tbody>${filas}</tbody></table></div>`;
    }
  }
  else if(repType==='cardex'){
    // CARDEX DE INVENTARIO — todos los movimientos de entrada y salida por producto
    // Salidas: facturas (cambiaria) que rebajaron inventario
    // Ingresos: compras recibidas (con historial de recepciones)
    const prodSel=repFiltros.producto?productos.find(p=>String(p.id)===String(repFiltros.producto)):null;
    // Normaliza toda cantidad a UNIDADES (el saldo corriente y el stock actual van en unidades).
    // En caja_unidad, las compras y las ventas POR CAJA vienen en cajas → se multiplican por el factor.
    const _aUnid=(prodId,cant,modo)=>{const pp=productos.find(x=>x.id===prodId);return (pp&&pp.tipoEmpaque==='caja_unidad'&&modo==='caja')?cant*(Number(pp.unidadesPorCaja)||1):cant;};
    // 1) Reunir todos los movimientos
    const movs=[];
    // SALIDAS: facturas certificadas/facturadas (no anuladas) que rebajaron stock
    documentos.filter(d=>d.tipoDoc==='cambiaria'&&['certificada','facturado'].includes(d.estado)&&enRango(d.creada,r)).forEach(f=>{
      (f.items||[]).forEach(it=>{
        if(prodSel&&it.id!==prodSel.id)return;
        movs.push({
          fecha:f.creada, tipo:'salida', prodId:it.id,
          prodNombre:it.nombre, prodCodigo:it.codigo,
          cantidad:_aUnid(it.id,Number(it.cantidad)||0,it.modoVenta||'unidad'),
          doc:(f.serie||'')+'-'+(f.numeroDte||''),
          docTipo:'Factura', tercero:f.clienteComercial||f.clienteNombre||'—',
          usuario:f.vendedorNombre||'—', usuarioLbl:'Facturó'
        });
      });
    });
    // SALIDAS: pedidos abiertos, préstamos y envíos (todos rebajan stock al crearse; la factura ya
    // se cuenta arriba, y como al facturar el tipo pasa a 'cambiaria' no hay doble conteo).
    // Los préstamos/envíos devueltos suman su ingreso (neto 0).
    documentos.filter(d=>['pedido','prestamo','envio'].includes(d.tipoDoc)&&d.estado!=='anulada'&&!d.anulado&&enRango(d.creada,r)).forEach(f=>{
      (f.items||[]).forEach(it=>{
        if(prodSel&&it.id!==prodSel.id)return;
        const lbl=(TIPO_LBL[f.tipoDoc]?TIPO_LBL[f.tipoDoc][0]:'Documento');
        const cant=_aUnid(it.id,Number(it.cantidad)||0,it.modoVenta||'unidad');
        movs.push({fecha:f.creada, tipo:'salida', prodId:it.id, prodNombre:it.nombre, prodCodigo:it.codigo, cantidad:cant,
          doc:refPed(f), docTipo:lbl, tercero:f.clienteComercial||f.clienteNombre||'—',
          usuario:f.vendedorNombre||'—', usuarioLbl:f.tipoDoc==='pedido'?'Vendió':'Entregó'});
        if(f.estado==='devuelto')movs.push({fecha:f.devueltoFecha||f.creada, tipo:'ingreso', prodId:it.id, prodNombre:it.nombre, prodCodigo:it.codigo, cantidad:cant,
          doc:refPed(f), docTipo:'Devolución', tercero:f.clienteComercial||f.clienteNombre||'—',
          usuario:f.vendedorNombre||'—', usuarioLbl:'Devolvió'});
      });
    });
    // INGRESOS: compras con recepciones registradas
    compras.filter(c=>enRango(c.fecha,r)||( (c.items||[]).some(it=>(it.recepciones||[]).some(rc=>enRango(rc.fecha,r))))).forEach(c=>{
      (c.items||[]).forEach(it=>{
        if(prodSel&&it.id!==prodSel.id)return;
        // Si hay historial de recepciones, usar cada una; si no, usar el recibido total con la fecha de compra
        if(it.recepciones&&it.recepciones.length){
          it.recepciones.forEach(rc=>{
            if(!enRango(rc.fecha,r))return;
            movs.push({
              fecha:rc.fecha, tipo:'ingreso', prodId:it.id,
              prodNombre:it.nombre, prodCodigo:it.codigo,
              cantidad:_aUnid(it.id,Number(rc.cantidad)||0,'caja'),
              doc:'CMP-'+padn(c.id), docTipo:'Compra',
              tercero:c.proveedorNombre||'—',
              usuario:rc.recibidoPor||'—', usuarioLbl:'Recibió'
            });
          });
        }else if((it.recibido||0)>0&&enRango(c.fecha,r)){
          movs.push({
            fecha:c.fecha, tipo:'ingreso', prodId:it.id,
            prodNombre:it.nombre, prodCodigo:it.codigo,
            cantidad:_aUnid(it.id,Number(it.recibido)||0,'caja'),
            doc:'CMP-'+padn(c.id), docTipo:'Compra',
            tercero:c.proveedorNombre||'—',
            usuario:'—', usuarioLbl:'Recibió'
          });
        }
      });
    });
    // CONVERSIONES: caja(s) abierta(s) a unidades sueltas. Neto cero en unidades (informativo, para trazabilidad).
    productos.forEach(pp=>{
      if(prodSel&&pp.id!==prodSel.id)return;
      (pp.conversiones||[]).forEach(cv=>{
        if(!enRango(cv.fecha,r))return;
        const _cj=Number(cv.cajas)||0,_un=Number(cv.unidades)||0;
        movs.push({
          fecha:cv.fecha, tipo:'conversion', prodId:pp.id,
          prodNombre:pp.nombre, prodCodigo:pp.codigo, cantidad:0,
          detalle:_cj+' caja(s) → '+_un+' und',
          doc:'Conversión', docTipo:'Interno', tercero:'—',
          usuario:cv.usuario||'—', usuarioLbl:'Convirtió'
        });
      });
    });
    // 2) Ordenar por fecha
    movs.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
    const expFilas=[];
    // 3) Construir la tabla
    if(prodSel){
      // ── VISTA POR PRODUCTO: con saldo corriente ──
      // Calcular stock inicial (stock actual menos los movimientos del rango, hacia atrás no es exacto,
      // así que mostramos el saldo corriente partiendo de 0 en el rango y sumando/restando)
      let saldo=0;
      const filas=movs.map(m=>{
        saldo+=(m.tipo==='ingreso'?m.cantidad:m.tipo==='salida'?-m.cantidad:0);
        expFilas.push({
          Fecha:fdate(m.fecha), Documento:m.doc, Tipo:m.docTipo,
          'Entra':m.tipo==='ingreso'?m.cantidad:'', 'Sale':m.tipo==='salida'?m.cantidad:'',
          Saldo:saldo, Tercero:m.tipo==='conversion'?m.detalle:m.tercero, Usuario:m.usuario
        });
        return `<tr style="border-bottom:1px solid var(--line)">
          <td style="font-size:11.5px;color:var(--muted)">${fdate(m.fecha)}</td>
          <td style="font-size:11.5px;font-weight:600">${m.doc}<div style="font-size:10px;color:var(--muted-2)">${m.docTipo}</div></td>
          <td style="font-size:11.5px">${m.tipo==='conversion'?m.detalle:m.tercero}</td>
          <td class="num" style="font-size:11.5px;color:var(--ok);font-weight:${m.tipo==='ingreso'?'700':'400'}">${m.tipo==='ingreso'?'+'+m.cantidad:'—'}</td>
          <td class="num" style="font-size:11.5px;color:var(--danger);font-weight:${m.tipo==='salida'?'700':'400'}">${m.tipo==='salida'?'−'+m.cantidad:'—'}</td>
          <td class="num" style="font-size:11.5px;font-weight:700;background:#fafdf5">${saldo}</td>
          <td style="font-size:11px;color:var(--muted)">${m.usuarioLbl}: ${m.usuario}</td>
        </tr>`;
      }).join('');
      exportData=expFilas;
      const stockActual=prodSel.tipoEmpaque==='caja_unidad'?((prodSel.stock||0)+(prodSel.stockCajas||0)*(prodSel.unidadesPorCaja||0)):(prodSel.stock||0);
      html+=`<div class="panel"><div class="panel-head"><h3>Cardex: ${prodSel.nombre}</h3><span style="font-size:12px;color:var(--muted)">${prodSel.codigo} · Stock actual: <b style="color:var(--ink)">${stockActual}</b> · ${movs.length} movimiento${movs.length!==1?'s':''}</span></div>
        ${movs.length?`<table style="font-size:12px"><thead><tr>
          <th>Fecha</th><th>Documento</th><th>Cliente / Proveedor</th>
          <th class="num">Entra</th><th class="num">Sale</th><th class="num">Saldo</th><th>Quién</th>
        </tr></thead><tbody>${filas}</tbody></table>`:'<div class="panel-body"><p class="empty">Sin movimientos para este producto en el período.</p></div>'}</div>`;
    }else{
      // ── VISTA GENERAL: todos los productos, sin saldo corriente ──
      const filas=movs.map(m=>{
        expFilas.push({
          Fecha:fdate(m.fecha), Producto:m.prodNombre, Codigo:m.prodCodigo,
          Movimiento:m.tipo==='ingreso'?'Ingreso':m.tipo==='salida'?'Salida':'Conversión',
          Cantidad:m.tipo==='conversion'?m.detalle:m.cantidad, Documento:m.doc, Tipo:m.docTipo,
          'Cliente/Proveedor':m.tipo==='conversion'?'—':m.tercero, Usuario:m.usuario
        });
        return `<tr style="border-bottom:1px solid var(--line)">
          <td style="font-size:11px;color:var(--muted)">${fdate(m.fecha)}</td>
          <td style="font-size:11.5px;font-weight:600">${m.prodNombre}<div style="font-size:10px;color:var(--muted-2)">${m.prodCodigo}</div></td>
          <td style="font-size:11px">${m.tipo==='conversion'?'<span class="badge b-muted" style="font-size:10px">⇄ Conversión</span>':'<span class="badge '+(m.tipo==='ingreso'?'b-ok':'b-danger')+'" style="font-size:10px">'+(m.tipo==='ingreso'?'▲ Ingreso':'▼ Salida')+'</span>'}</td>
          <td class="num" style="font-size:11.5px;font-weight:700;color:${m.tipo==='conversion'?'var(--muted)':(m.tipo==='ingreso'?'var(--ok)':'var(--danger)')}">${m.tipo==='conversion'?m.detalle:(m.tipo==='ingreso'?'+':'−')+m.cantidad}</td>
          <td style="font-size:11.5px;font-weight:600">${m.doc}<div style="font-size:10px;color:var(--muted-2)">${m.docTipo}</div></td>
          <td style="font-size:11px">${m.tercero}</td>
          <td style="font-size:11px;color:var(--muted)">${m.usuarioLbl}: ${m.usuario}</td>
        </tr>`;
      }).join('');
      exportData=expFilas;
      html+=`<div class="panel"><div class="panel-head"><h3>Cardex general de inventario</h3><span style="font-size:12px;color:var(--muted)">${movs.length} movimiento${movs.length!==1?'s':''} · elegí un producto arriba para ver su saldo corriente</span></div>
        ${movs.length?`<table style="font-size:12px"><thead><tr>
          <th>Fecha</th><th>Producto</th><th>Movimiento</th><th class="num">Cantidad</th>
          <th>Documento</th><th>Cliente / Proveedor</th><th>Quién</th>
        </tr></thead><tbody>${filas}</tbody></table>`:'<div class="panel-body"><p class="empty">Sin movimientos de inventario en el período.</p></div>'}</div>`;
    }
  }
  else if(repType==='canalvend'){
    // VENTAS POR CANAL — desglosa las ventas de vendedores tipo canal (Whaticket)
    // por la persona que realmente vendió (subVendedorNombre)
    const facts=documentos.filter(d=>d.tipoDoc==='cambiaria'&&['certificada','facturado'].includes(d.estado)&&enRango(d.creada,r)&&esVendedorCanal(d.vendedorNombre));
    // Agrupar por sub-vendedor
    const porPersona={};
    facts.forEach(f=>{
      const persona=f.subVendedorNombre||'(sin especificar)';
      if(!porPersona[persona])porPersona[persona]={cantidad:0,total:0};
      porPersona[persona].cantidad++;
      porPersona[persona].total+=Number(f.totales.total)||0;
    });
    const filasDatos=Object.entries(porPersona).sort((a,b)=>b[1].total-a[1].total);
    const totalGeneral=facts.reduce((s,f)=>s+(Number(f.totales.total)||0),0);
    const expFilas=filasDatos.map(([persona,d])=>({
      Vendedor:persona, Facturas:d.cantidad, Total:d.total,
      Porcentaje:totalGeneral>0?Math.round(d.total/totalGeneral*1000)/10+'%':'0%'
    }));
    exportData=expFilas;
    if(!facts.length){
      html+=`<div class="panel"><div class="panel-body"><p class="empty">No hay ventas por canal (Whaticket) en el período seleccionado.</p></div></div>`;
    }else{
      const filas=filasDatos.map(([persona,d])=>{
        const pct=totalGeneral>0?(d.total/totalGeneral*100):0;
        return `<tr style="border-bottom:1px solid var(--line)">
          <td style="font-size:12.5px;font-weight:600">${persona==='(sin especificar)'?`<span style="color:var(--muted-2)">${persona}</span>`:persona}</td>
          <td class="num" style="font-size:12px">${d.cantidad}</td>
          <td class="num" style="font-size:12.5px;font-weight:600">${money(d.total)}</td>
          <td class="num" style="font-size:12px;color:var(--muted)">${pct.toFixed(1)}%</td>
        </tr>`;
      }).join('');
      html+=`<div class="panel"><div class="panel-head"><h3>Ventas por canal · Whaticket</h3><span style="font-size:12px;color:var(--muted)">${facts.length} factura${facts.length!==1?'s':''} · Total: <b style="color:var(--ink)">${money(totalGeneral)}</b></span></div>
        <table style="font-size:12px"><thead><tr>
          <th>Vendedor (quién vendió)</th><th class="num">Facturas</th><th class="num">Total vendido</th><th class="num">%</th>
        </tr></thead><tbody>${filas}</tbody></table></div>`;
    }
  }
  else if(repType==='cprov'){
    const rval=c=>{const v=(c.items||[]).reduce((s,it)=>s+(it.recibido||0)*(it.costo||it.precio||0),0);return v>0?v:Number(c.total||0);};
    const porPr={};comprasR.forEach(c=>{const v=rval(c);if(v<=0)return;if(!porPr[c.proveedorNombre])porPr[c.proveedorNombre]={v:0,n:0};porPr[c.proveedorNombre].v+=v;porPr[c.proveedorNombre].n++;});
    const arr=Object.entries(porPr).sort((a,b)=>b[1].v-a[1].v);
    exportData=arr.map(([n,o])=>({Proveedor:n,Órdenes:o.n,'Total comprado':o.v}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/>',lbl:'Compras recibidas',val:money(comprasR.reduce((s,c)=>s+rval(c),0)),sub:arr.reduce((s,[,o])=>s+o.n,0)+' órdenes'},
      {ic:'i-blue',svg:'<path d="M3 3h18v18H3z"/>',lbl:'Proveedores',val:arr.length}])}</div>
      <div class="panel"><div class="panel-head"><h3>Compras por proveedor</h3></div><div class="panel-body">${hbars(arr.map(([n,o])=>({n,v:o.v,c:'var(--blue)'})))}</div></div>
      <div class="panel"><table><thead><tr><th>Proveedor</th><th>Órdenes</th><th>Total comprado</th></tr></thead><tbody>
      ${arr.length?arr.map(([n,o])=>`<tr><td style="font-weight:600">${n}</td><td class="num">${o.n}</td><td class="num" style="font-weight:600">${money(o.v)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Sin compras</td></tr>'}</tbody></table></div>`;
  }
  else if(repType==='cprod'){
    const porP={};comprasR.forEach(c=>(c.items||[]).forEach(it=>{const q=it.recibido||0;if(q<=0)return;const k=it.codigo||it.id||it.nombre;if(!porP[k])porP[k]={nombre:it.nombre,codigo:it.codigo,q:0,v:0};porP[k].q+=q;porP[k].v+=q*(it.costo||it.precio||0);}));
    const arr=Object.values(porP).sort((a,b)=>b.v-a.v);
    exportData=arr.map(p=>({Código:p.codigo,Producto:p.nombre,'Unidades compradas':p.q,'Costo total':p.v}));
    html+=`<div class="panel"><div class="panel-head"><h3>Compras por producto</h3></div>
      <table><thead><tr><th>Producto</th><th>Código</th><th>Unidades compradas</th><th>Costo total</th></tr></thead><tbody>
      ${arr.length?arr.map(p=>`<tr><td style="font-weight:600">${p.nombre}</td><td class="num" style="color:var(--muted)">${p.codigo}</td><td class="num">${p.q}</td><td class="num" style="font-weight:600">${money(p.v)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Sin compras</td></tr>'}</tbody></table></div>`;
  }
  else if(repType==='cxc'){
    const porCli={};
    documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').forEach(d=>{
      if(repFiltros.cliente&&String(d.clienteId)!==repFiltros.cliente)return;
      if(repFiltros.tiempoCredito){const c=clientes.find(x=>x.id===d.clienteId);if(!c||String(c.tiempoCredito||0)!==repFiltros.tiempoCredito)return;}
      const inf=arInfo(d);if(inf.saldo<=0.001)return;
      if(repFiltros.soloVencidos&&!inf.vencido)return;
      // Por cliente_id (estable), no por nombre: si no, el mismo cliente sale
      // en dos filas (nombre viejo sin comercial vs. nuevo con comercial).
      const k=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'—');
      if(!porCli[k])porCli[k]={nombre:(d.clienteComercial||d.clienteNombre||'—'),n:0,total:0,abonado:0,saldo:0,venc:0};
      if(d.clienteComercial)porCli[k].nombre=d.clienteComercial;
      porCli[k].n++;porCli[k].total+=d.totales.total;porCli[k].abonado+=inf.abon;porCli[k].saldo+=inf.saldo;if(inf.vencido)porCli[k].venc+=inf.saldo;
    });
    const arr=Object.entries(porCli).sort((a,b)=>b[1].saldo-a[1].saldo);
    const totalSaldo=arr.reduce((s,[,o])=>s+o.saldo,0);
    exportData=arr.map(([,o])=>({Cliente:o.nombre,Facturas:o.n,Total:o.total,Abonado:o.abonado,Saldo:o.saldo,'Vencido':o.venc}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Total pendiente',val:money(totalSaldo),sub:arr.length+' clientes'},
      {ic:'i-blue',svg:'<path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>',lbl:'Vencido',val:money(arr.reduce((s,[,o])=>s+o.venc,0))}])}</div>
      <div class="panel"><div class="panel-head"><h3>Facturas pendientes de pago por cliente</h3></div>
      <table><thead><tr><th>Cliente</th><th>Facturas</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Vencido</th></tr></thead><tbody>
      ${arr.length?arr.map(([,o])=>`<tr><td style="font-weight:600">${o.nombre}</td><td class="num">${o.n}</td><td class="num" style="color:var(--muted)">${money(o.total)}</td><td class="num" style="color:var(--muted)">${money(o.abonado)}</td><td class="num" style="font-weight:700">${money(o.saldo)}</td><td class="num" style="color:${o.venc>0?'var(--danger)':'var(--muted-2)'}">${money(o.venc)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Sin saldos pendientes</td></tr>'}${arr.length?`<tr style="border-top:2px solid var(--line-strong);font-weight:700"><td>Total</td><td class="num">${arr.reduce((s,[,o])=>s+o.n,0)}</td><td class="num">${money(arr.reduce((s,[,o])=>s+o.total,0))}</td><td class="num">${money(arr.reduce((s,[,o])=>s+o.abonado,0))}</td><td class="num">${money(totalSaldo)}</td><td class="num" style="color:var(--danger)">${money(arr.reduce((s,[,o])=>s+o.venc,0))}</td></tr>`:''}</tbody></table></div>`;
  }
  else if(repType==='estcta'){
    const hoy=new Date();
    const porCli={};
    documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').forEach(d=>{
      if(repFiltros.cliente&&String(d.clienteId)!==repFiltros.cliente)return;
      const cliRec=clientes.find(x=>x.id===d.clienteId);
      if(repFiltros.tiempoCredito){if(!cliRec||String(cliRec.tiempoCredito||0)!==repFiltros.tiempoCredito)return;}
      const inf=arInfo(d);if(inf.saldo<=0.001)return;
      if(repFiltros.soloVencidos&&!inf.vencido)return;
      const k=(d.clienteId!=null)?('c'+d.clienteId):('n'+((d.clienteComercial||d.clienteNombre||'—').toUpperCase()));
      if(!porCli[k])porCli[k]={nombre:(cliRec?(cliRec.nombre||cliRec.razonSocial):(d.clienteComercial||d.clienteNombre))||'—',b1:0,b2:0,b3:0,saldo:0,facts:[],nit:(cliRec&&cliRec.nit)||d.clienteNit||''};
      const dias=Math.floor((hoy-new Date(d.creada))/86400000); // antigüedad desde emisión
      const tramo=dias<=30?'b1':(dias<=90?'b2':'b3');
      // Antigüedad por VENCIMIENTO (para el reporte de antigüedad de saldos): días vencidos
      const dv=d.vencimiento?Math.floor((hoy-new Date(d.vencimiento))/86400000):0;
      const bv=dv<=0?'corr':(dv<=30?'b30':(dv<=60?'b60':(dv<=90?'b90':'b90p')));
      porCli[k][tramo]+=inf.saldo; porCli[k].saldo+=inf.saldo;
      porCli[k].facts.push({num:d.numeroDte||d.serie||('#'+d.id),serie:d.serie||'',dte:d.numeroDte||'',emitida:d.creada,vence:d.vencimiento,dias,saldo:inf.saldo,vencido:inf.vencido,tramo,bv});
    });
    const arr=Object.entries(porCli).sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||'','es'));
    const T={b1:0,b2:0,b3:0,saldo:0};
    arr.forEach(([,o])=>{T.b1+=o.b1;T.b2+=o.b2;T.b3+=o.b3;T.saldo+=o.saldo;});
    // Datos para exportar (una fila por cliente)
    // Export: formato "antigüedad de saldos" (por cliente con NIT, cada factura en su tramo de vencido + totales)
    const KEYV={corr:'Corriente',b30:'30 Días',b60:'60 Días',b90:'90 Días',b90p:'+90 Días'};
    const COLSV=['Corriente','30 Días','60 Días','90 Días','+90 Días'];
    const vaciosV=()=>{const o={};COLSV.forEach(c=>o[c]='');return o;};
    const filasExp=[];
    arr.forEach(([k,o])=>{
      filasExp.push(Object.assign({Documento:(o.nit?'('+o.nit+') ':'')+o.nombre,Fecha:''},vaciosV()));
      const tot={corr:0,b30:0,b60:0,b90:0,b90p:0};
      o.facts.slice().sort((a,b)=>b.dias-a.dias).forEach(f=>{
        const row=Object.assign({Documento:'FA '+((f.serie?f.serie+'-':'')+(f.dte||f.num)),Fecha:f.emitida?fdate(f.emitida.slice(0,10)):''},vaciosV());
        row[KEYV[f.bv]]=Math.round(f.saldo*100)/100; tot[f.bv]+=f.saldo;
        filasExp.push(row);
      });
      const trow=Object.assign({Documento:'TOTALES CLIENTE',Fecha:''},vaciosV());
      Object.keys(tot).forEach(kk=>trow[KEYV[kk]]=Math.round(tot[kk]*100)/100);
      filasExp.push(trow);
      filasExp.push(Object.assign({Documento:'',Fecha:''},vaciosV()));
    });
    exportData=filasExp;
    const tramoBadge=t=>t==='b1'?'<span class="badge b-ok" style="font-size:9.5px">0-30</span>':t==='b2'?'<span class="badge b-warn" style="font-size:9.5px">30-90</span>':'<span class="badge b-danger" style="font-size:9.5px">90+</span>';
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-warn',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Saldo total pendiente',val:money(T.saldo),sub:arr.length+' clientes'},
      {ic:'i-ok',svg:'<path d="M20 6 9 17l-5-5"/>',lbl:'0-30 días',val:money(T.b1)},
      {ic:'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'30-90 días',val:money(T.b2)},
      {ic:'i-danger',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',lbl:'90+ días',val:money(T.b3)}])}</div>
      <div class="panel"><div class="panel-head"><h3>Estado de cuenta general · saldos pendientes</h3><span style="font-size:12px;color:var(--muted)">Tocá un cliente para ver el detalle</span></div>
      <table><thead><tr><th>Cliente</th><th>0-30 días</th><th>30-90 días</th><th>90+ días</th><th>Saldo total</th></tr></thead><tbody>
      ${arr.length?arr.map(([k,o],i)=>`
        <tr class="estcta-cli" style="cursor:pointer" onclick="toggleEstcta(${i})">
          <td style="font-weight:600"><span id="estcta-arrow-${i}" style="color:var(--muted-2);display:inline-block;width:14px">▸</span>${o.nombre}</td>
          <td class="num" style="color:${o.b1>0?'var(--ink)':'var(--muted-2)'}">${money(o.b1)}</td>
          <td class="num" style="color:${o.b2>0?'#9A6B07':'var(--muted-2)'}">${money(o.b2)}</td>
          <td class="num" style="color:${o.b3>0?'var(--danger)':'var(--muted-2)'}">${money(o.b3)}</td>
          <td class="num" style="font-weight:700">${money(o.saldo)}</td>
        </tr>
        <tr id="estcta-det-${i}" style="display:none"><td colspan="5" style="padding:0;background:var(--surface-2)">
          <div style="padding:8px 14px">
            <table style="width:100%"><thead><tr><th style="font-size:10px">Factura</th><th style="font-size:10px">Emitida</th><th style="font-size:10px">Vence</th><th style="font-size:10px">Días</th><th style="font-size:10px">Tramo</th><th style="font-size:10px">Saldo</th></tr></thead><tbody>
            ${o.facts.sort((a,b)=>b.dias-a.dias).map(f=>`<tr>
              <td style="font-size:11.5px">${f.num}</td>
              <td style="font-size:11.5px;color:var(--muted)">${f.emitida?fdate(String(f.emitida).slice(0,10)):'—'}</td>
              <td style="font-size:11.5px;color:${f.vencido?'var(--danger)':'var(--muted)'}">${f.vence?fdate(String(f.vence).slice(0,10)):'—'}</td>
              <td class="num" style="font-size:11.5px">${f.dias}</td>
              <td>${tramoBadge(f.tramo)}</td>
              <td class="num" style="font-size:11.5px;font-weight:600">${money(f.saldo)}</td>
            </tr>`).join('')}
            </tbody></table>
          </div>
        </td></tr>`).join(''):'<tr><td colspan="5" class="empty">Sin saldos pendientes</td></tr>'}
      ${arr.length?`<tr style="border-top:2px solid var(--line-strong);font-weight:700"><td>TOTAL</td><td class="num">${money(T.b1)}</td><td class="num" style="color:#9A6B07">${money(T.b2)}</td><td class="num" style="color:var(--danger)">${money(T.b3)}</td><td class="num">${money(T.saldo)}</td></tr>`:''}
      </tbody></table></div>`;
  }
  else if(repType==='banco'){
    const r=repRange();
    const enR=iso=>{if(!iso)return false;const t=new Date((iso+'').slice(0,10)+'T12:00:00');return t>=r.start&&t<=r.end;};
    let movs=(typeof movimientosBanco!=='undefined'?movimientosBanco:[]).filter(m=>!m.anulado&&enR(m.fecha));
    if(repFiltros.cuentaBanco)movs=movs.filter(m=>String(m.cuentaId)===String(repFiltros.cuentaBanco));
    if(repFiltros.categoria)movs=movs.filter(m=>(m.categoria||'otro')===repFiltros.categoria);
    let totEnt=0,totSal=0;
    movs.forEach(m=>{if(m.tipo==='entrada')totEnt+=Number(m.monto||0);else totSal+=Number(m.monto||0);});
    const neto=totEnt-totSal;
    const saldoActualTotal=cuentasActivasBanco().filter(c=>!repFiltros.cuentaBanco||String(c.id)===String(repFiltros.cuentaBanco)).reduce((s,c)=>s+saldoCuenta(c.id),0);
    // Por cuenta
    const porCta={};
    movs.forEach(m=>{const k=m.cuentaId;if(!porCta[k])porCta[k]={ent:0,sal:0};if(m.tipo==='entrada')porCta[k].ent+=Number(m.monto||0);else porCta[k].sal+=Number(m.monto||0);});
    const filasCta=Object.entries(porCta).map(([id,o])=>({id:Number(id),nombre:(cuentasBanco.find(c=>c.id===Number(id))||{}).nombre||'—',ent:o.ent,sal:o.sal,neto:o.ent-o.sal,saldo:saldoCuenta(Number(id))})).sort((a,b)=>b.neto-a.neto);
    // Por categoría
    const porCat={};
    movs.forEach(m=>{const k=m.categoria||'otro';if(!porCat[k])porCat[k]={ent:0,sal:0};if(m.tipo==='entrada')porCat[k].ent+=Number(m.monto||0);else porCat[k].sal+=Number(m.monto||0);});
    const filasCat=Object.entries(porCat).map(([k,o])=>({cat:CAT_MOV_LBL[k]||k,ent:o.ent,sal:o.sal,neto:o.ent-o.sal})).sort((a,b)=>(b.ent+b.sal)-(a.ent+a.sal));
    exportData=filasCta.map(f=>({Cuenta:f.nombre,Entradas:f.ent,Salidas:f.sal,Neto:f.neto,'Saldo actual':f.saldo}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-green',svg:'<path d="M12 5v14M19 12l-7 7-7-7"/>',lbl:'Entradas del período',val:money(totEnt)},
      {ic:'i-danger',svg:'<path d="M12 19V5M5 12l7-7 7 7"/>',lbl:'Salidas del período',val:money(totSal)},
      {ic:(neto>=0?'i-green':'i-danger'),svg:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',lbl:'Neto del período',val:money(neto)},
      {ic:'i-blue',svg:'<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/>',lbl:'Saldo actual'+(repFiltros.cuentaBanco?'':' (todas)'),val:money(saldoActualTotal)}])}</div>
      <div class="panel"><div class="panel-head"><h3>Entradas y salidas por cuenta</h3></div>
      <table><thead><tr><th>Cuenta</th><th>Entradas</th><th>Salidas</th><th>Neto</th><th>Saldo actual</th></tr></thead><tbody>
      ${filasCta.length?filasCta.map(f=>`<tr>
        <td style="font-weight:600">${f.nombre}</td>
        <td class="num" style="color:var(--ok)">${money(f.ent)}</td>
        <td class="num" style="color:var(--danger)">${money(f.sal)}</td>
        <td class="num" style="font-weight:700;color:${f.neto>=0?'var(--ok)':'var(--danger)'}">${money(f.neto)}</td>
        <td class="num" style="font-weight:700">${money(f.saldo)}</td>
      </tr>`).join(''):'<tr><td colspan="5" class="empty">Sin movimientos en el período</td></tr>'}
      ${filasCta.length?`<tr style="border-top:2px solid var(--line-strong);font-weight:700"><td>TOTAL</td><td class="num" style="color:var(--ok)">${money(totEnt)}</td><td class="num" style="color:var(--danger)">${money(totSal)}</td><td class="num" style="color:${neto>=0?'var(--ok)':'var(--danger)'}">${money(neto)}</td><td class="num">${money(saldoActualTotal)}</td></tr>`:''}
      </tbody></table></div>
      <div class="panel"><div class="panel-head"><h3>Desglose por categoría</h3></div>
      <table><thead><tr><th>Categoría</th><th>Entradas</th><th>Salidas</th><th>Neto</th></tr></thead><tbody>
      ${filasCat.length?filasCat.map(f=>`<tr>
        <td><span class="badge b-muted" style="font-size:10.5px">${f.cat}</span></td>
        <td class="num" style="color:var(--ok)">${f.ent?money(f.ent):'—'}</td>
        <td class="num" style="color:var(--danger)">${f.sal?money(f.sal):'—'}</td>
        <td class="num" style="font-weight:600;color:${f.neto>=0?'var(--ok)':'var(--danger)'}">${money(f.neto)}</td>
      </tr>`).join(''):'<tr><td colspan="4" class="empty">Sin movimientos en el período</td></tr>'}
      </tbody></table></div>`;
  }
  else if(repType==='recibos'){
    const filas=[];
    documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').forEach(d=>{
      if(repFiltros.cliente&&String(d.clienteId)!==repFiltros.cliente)return;
      (d.abonos||[]).filter(a=>!a.anulado).forEach(a=>{
        if(repFiltros.metodoRec&&a.metodo!==repFiltros.metodoRec)return;
        if(!enRango(a.registradoEl||a.fecha,r))return;
        filas.push({facturaId:d.id,cliente:d.clienteComercial||d.clienteNombre,nit:d.clienteNit||'',factura:d.serie+'-'+d.numeroDte,noRecibo:a.noRecibo||'—',fecha:a.fecha,monto:a.monto,metodo:a.metodo||'—',referencia:a.referencia||'',registradoPor:a.registradoPor||'—'});
      });
    });
    const _nrec=x=>{const d=String(x.noRecibo||'').replace(/[^0-9]/g,'');return d?parseInt(d,10):-Infinity;};
    filas.sort((a,b)=>{const na=_nrec(a),nb=_nrec(b);return na!==nb?nb-na:(new Date(b.fecha)-new Date(a.fecha));});
    const totalRec=filas.reduce((s,x)=>s+x.monto,0);
    exportData=filas.map(x=>({'NombreComercial':x.cliente,'NIT':x.nit,'Recibo':x.noRecibo,'FechaRecibo':fdate(x.fecha),'Factura':x.factura,'ValorAbono':x.monto}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Total cobrado',val:money(totalRec),sub:filas.length+' recibos'},
      {ic:'i-blue',svg:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',lbl:'Clientes',val:new Set(filas.map(x=>x.cliente)).size}])}</div>
      <div class="panel"><div class="panel-head"><h3>Recibos de cobro</h3><span style="font-size:12px;color:var(--muted)">${filas.length} recibo${filas.length!==1?'s':''}</span></div>
      <table><thead><tr><th>No. Recibo</th><th>Cliente</th><th>Factura</th><th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Registrado por</th></tr></thead><tbody>
      ${filas.length?filas.map(x=>`<tr>
        <td style="font-weight:700;color:var(--green)">${x.noRecibo}</td>
        <td style="font-weight:600">${x.cliente}</td>
        <td style="color:var(--muted)">${x.factura}</td>
        <td style="color:var(--muted)">${fdate(x.fecha)}</td>
        <td class="num" style="font-weight:700">${money(x.monto)}</td>
        <td>${x.metodo}</td>
        <td style="color:var(--muted)">${x.referencia||'—'}</td>
        <td style="font-size:12px;color:var(--muted)">${x.registradoPor}</td>
      </tr>`).join(''):'<tr><td colspan="8" class="empty">Sin recibos en el período</td></tr>'}</tbody></table>
      ${filas.length?`<div style="text-align:right;padding:13px 18px;font-family:var(--disp);font-size:15px;font-weight:600;border-top:1.5px solid var(--line-strong)">Total: ${money(totalRec)}</div>`:''}</div>`;
  }
  else if(repType==='factabo'){
    // FACTURAS Y ABONOS — el mismo detalle que la pestaña de la ficha
    // del cliente, pero para varios clientes y exportable.
    //
    // Cada factura, y debajo lo que se le aplicó (abonos y notas de
    // crédito), con el saldo bajando renglón por renglón.
    const facts=documentos
      .filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada'&&enRango(d.creada,r))
      .filter(d=>!repFiltros.cliente||String(d.clienteId)===repFiltros.cliente);

    // Agrupar por cliente, y dentro de cada uno las facturas de la más
    // vieja a la más nueva.
    // Por cliente_id (estable), no por nombre: si no, el mismo cliente sale en
    // dos bloques (nombre viejo sin comercial vs. nuevo con comercial).
    const porCli={}, nombreCli={};
    facts.forEach(f=>{
      const k=(f.clienteId!=null)?('#'+f.clienteId):(f.clienteComercial||f.clienteNombre||'—');
      if(f.clienteComercial)nombreCli[k]=f.clienteComercial;
      else if(!nombreCli[k])nombreCli[k]=f.clienteNombre||'—';
      if(!porCli[k])porCli[k]=[];
      porCli[k].push(f);
    });
    Object.keys(porCli).forEach(k=>porCli[k].sort((a,b)=>
      String(a.creada||'').localeCompare(String(b.creada||''))||((a.id||0)-(b.id||0))));
    const clis=Object.keys(porCli).sort((a,b)=>(nombreCli[a]||a).localeCompare(nombreCli[b]||b,'es'));

    let filasHTML='', saldoTotal=0, nFact=0;
    // El Excel sigue la misma forma que el Estado de cuenta general:
    // una fila con el nombre del cliente, las filas del detalle, y una
    // de TOTALES CLIENTE. Las que NO empiezan con "FA " salen en
    // negrita (ver exportarExcel), así se leen los bloques de un vistazo.
    const vacio=()=>({Fecha:'',Detalle:'',Monto:'',Saldo:''});

    clis.forEach(cli=>{
      const cliNom=nombreCli[cli]||cli;
      filasHTML+=`<tr style="background:var(--surface-2)"><td colspan="5"
        style="font-family:var(--disp);font-weight:700;padding-top:14px">${escHtml(cliNom)}</td></tr>`;
      exportData.push(Object.assign({Documento:cliNom},vacio()));

      let facturadoCli=0, saldoCli=0;
      porCli[cli].forEach(f=>{
        nFact++;
        let saldo=Number(f.totales.total)||0;
        facturadoCli+=saldo;
        const numFact=(f.serie?f.serie+'-':'')+(f.numeroDte||'');
        filasHTML+=`<tr style="border-top:2px solid var(--line-strong)">
          <td style="color:var(--muted);white-space:nowrap">${fdate(f.creada)}</td>
          <td></td>
          <td style="font-weight:600">Factura ${escHtml(numFact)}</td>
          <td class="num" style="font-weight:600">${money(f.totales.total)}</td>
          <td class="num" style="font-weight:600">${money(saldo)}</td>
        </tr>`;
        exportData.push({Documento:'FA '+numFact, Fecha:fdate(f.creada),
          Detalle:'Factura', Monto:Math.round(saldo*100)/100, Saldo:Math.round(saldo*100)/100});

        const aplic=aplicacionesDeFactura(f);
        aplic.forEach(x=>{
          if(!x.anulado)saldo=Math.round((saldo-x.monto)*100)/100;
          const det=detalleAplicacion(x);
          const tachado=x.anulado?'text-decoration:line-through;opacity:.55;':'';
          filasHTML+=`<tr>
            <td style="color:var(--muted);white-space:nowrap;${tachado}">${fdate(x.fecha)}</td>
            <td></td>
            <td style="color:var(--muted);padding-left:22px;${tachado}">${escHtml(det)}${x.anulado?' <span class="badge b-danger" style="font-size:9px">ANULADO</span>':''}</td>
            <td class="num" style="${tachado}">${money(x.monto)}</td>
            <td class="num" style="color:var(--muted)">${x.anulado?'—':money(saldo)}</td>
          </tr>`;
          exportData.push({Documento:x.ref||'', Fecha:fdate(x.fecha),
            Detalle:det+(x.anulado?' (ANULADO)':''),
            Monto:Math.round(x.monto*100)/100,
            Saldo:x.anulado?'':Math.round(saldo*100)/100});
        });
        if(!aplic.length){
          filasHTML+=`<tr><td></td><td></td><td style="color:var(--muted-2);padding-left:22px">Sin abonos registrados</td><td></td><td></td></tr>`;
          exportData.push({Documento:'', Fecha:'', Detalle:'Sin abonos registrados', Monto:'', Saldo:''});
        }
        saldoCli=Math.round((saldoCli+arInfo(f).saldo)*100)/100;
      });

      saldoTotal=Math.round((saldoTotal+saldoCli)*100)/100;
      filasHTML+=`<tr style="border-top:2px solid var(--line-strong);background:var(--surface-2)">
        <td></td><td></td><td style="font-weight:700">TOTALES ${escHtml(cliNom)}</td>
        <td class="num" style="font-weight:700">${money(facturadoCli)}</td>
        <td class="num" style="font-weight:700;color:${saldoCli>0.001?'var(--danger)':'var(--ok)'}">${money(saldoCli)}</td>
      </tr>`;
      exportData.push({Documento:'TOTALES CLIENTE', Fecha:'', Detalle:'',
        Monto:Math.round(facturadoCli*100)/100, Saldo:Math.round(saldoCli*100)/100});
      exportData.push(Object.assign({Documento:''},vacio()));
    });

    const totalFacturado=facts.reduce((s,f)=>s+(Number(f.totales.total)||0),0);
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-blue',svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',lbl:'Facturas',val:nFact,sub:'en el período'},
      {ic:'i-lime',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Total facturado',val:money(totalFacturado)},
      {ic:'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'Saldo pendiente',val:money(saldoTotal),sub:'de esas facturas'}
    ])}</div>
      <div class="panel"><div class="panel-head"><h3>Facturas y abonos</h3></div>
      <table><thead><tr><th>Fecha</th><th></th><th>Detalle</th><th class="num">Monto</th><th class="num">Saldo</th></tr></thead><tbody>
      ${filasHTML||'<tr><td colspan="5" class="empty">Sin facturas en el período seleccionado</td></tr>'}
      </tbody></table></div>`;
  }
  else if(repType==='pagos'){
    // Reporte de Pagos agrupado por cliente
    const porCli={};
    documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').forEach(d=>{
      if(repFiltros.cliente&&String(d.clienteId)!==repFiltros.cliente)return;
      // Por cliente_id (estable), no por nombre: si no, el mismo cliente sale
      // en dos filas (nombre viejo sin comercial vs. nuevo con comercial).
      const k=(d.clienteId!=null)?('#'+d.clienteId):(d.clienteComercial||d.clienteNombre||'—');
      (d.abonos||[]).filter(a=>!a.anulado).forEach(a=>{
        if(repFiltros.metodoRec&&a.metodo!==repFiltros.metodoRec)return;
        if(!enRango(a.registradoEl||a.fecha,r))return;
        if(!porCli[k])porCli[k]={nombre:(d.clienteComercial||d.clienteNombre||'—'),total:0,abonos:[],facturas:new Set()};
        if(d.clienteComercial)porCli[k].nombre=d.clienteComercial;
        porCli[k].total+=a.monto;porCli[k].abonos.push({...a,factura:d.serie+'-'+d.numeroDte});porCli[k].facturas.add(d.id);
      });
    });
    const arr=Object.entries(porCli).sort((a,b)=>b[1].total-a[1].total);
    const totalPag=arr.reduce((s,[,o])=>s+o.total,0);
    exportData=arr.map(([,o])=>({Cliente:o.nombre,Recibos:o.abonos.length,Facturas:o.facturas.size,'Total pagado':o.total}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Total cobrado',val:money(totalPag),sub:'en el período'},
      {ic:'i-blue',svg:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',lbl:'Clientes',val:arr.length,sub:'con pagos'}])}</div>
      <div class="panel"><div class="panel-head"><h3>Pagos por cliente</h3></div>
      <div class="panel-body">${hbars(arr.map(([,o])=>({n:o.nombre,v:o.total})))}</div></div>
      <div class="panel"><table><thead><tr><th>Cliente</th><th>Recibos</th><th>Facturas</th><th>Total pagado</th></tr></thead><tbody>
      ${arr.length?arr.map(([,o])=>`<tr><td style="font-weight:600">${o.nombre}</td><td class="num">${o.abonos.length}</td><td class="num">${o.facturas.size}</td><td class="num" style="font-weight:700;color:var(--ok)">${money(o.total)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Sin pagos en el período</td></tr>'}
      </tbody></table>
      ${arr.length?`<div style="text-align:right;padding:13px 18px;font-family:var(--disp);font-size:15px;font-weight:600;border-top:1.5px solid var(--line-strong)">Total: ${money(totalPag)}</div>`:''}</div>
      ${repFiltros.cliente&&arr.length?`<div class="panel"><div class="panel-head"><h3>Detalle de recibos · ${arr[0][1].nombre}</h3></div>
      <table><thead><tr><th>No. Recibo</th><th>Factura</th><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead><tbody>
      ${arr[0][1].abonos.map(a=>`<tr><td style="font-weight:700;color:var(--green)">${a.noRecibo||'—'}</td><td style="color:var(--muted)">${a.factura}</td><td style="color:var(--muted)">${fdate(a.fecha)}</td><td class="num" style="font-weight:600">${money(a.monto)}</td><td>${a.metodo||'—'}</td></tr>`).join('')}</tbody></table></div>`:''}`
  }
  else if(repType==='invactual'){
    const _stk=p=>p.tipoEmpaque==='caja_unidad'?(Number(p.stock)||0)+(Number(p.stockCajas)||0)*(Number(p.unidadesPorCaja)||0):(Number(p.stock)||0);
    const corte=repFiltros.invFecha||fechaHoyGT();const esHoy=corte>=fechaHoyGT();
    const movs=_movsInvDespuesDe(corte);
    const exDe=p=>{const mm=movs[p.codigo];return Math.max(0,_stk(p)-((mm&&mm.entra)||0)+((mm&&mm.sale)||0));};
    let lista=productos.filter(p=>p.activo!==false);
    if(repFiltros.marca_prod)lista=lista.filter(p=>(p.marca||'')===repFiltros.marca_prod);
    lista=lista.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    // Cada producto es una fila; los caja_unidad se parten en 2 filas: caja (sufijo -C)
    // y unidades sueltas (sufijo -U), diferenciadas con etiqueta de color.
    const _filas=[];
    lista.forEach(p=>{
      const e=exDe(p);
      if(p.tipoEmpaque==='caja_unidad'){
        const upc=Number(p.unidadesPorCaja)||1,cj=Math.max(0,Number(p.stockCajas)||0),un=Math.max(0,Math.round(e-cj*upc)); // cajas REALES (stock_cajas), no el resultado de dividir las unidades sueltas
        _filas.push({codigo:(p.codigo||'')+'-C',nombre:p.nombre||'',marca:p.marca||'',medida:'Caja',cant:cj});
        _filas.push({codigo:(p.codigo||'')+'-U',nombre:p.nombre||'',marca:p.marca||'',medida:'Unidad',cant:un});
      }else _filas.push({codigo:p.codigo||'',nombre:p.nombre||'',marca:p.marca||'',medida:medidaProducto(p),cant:e});
    });
    exportData=_filas.map(f=>({'Código':f.codigo,Producto:f.nombre,Marca:f.marca,'Unidad de medida':f.medida,Existencias:f.cant}));
    const totU=_filas.reduce((s,f)=>s+f.cant,0);
    // Etiqueta de color para diferenciar caja (verde) de unidad (azul) de un vistazo.
    const _medBadge=m=>`<span class="badge ${m==='Caja'?'b-ok':(m==='Unidad'?'b-info':'b-muted')}" style="font-size:10px">${m}</span>`;
    html+=`<div class="panel"><div class="panel-head"><h3>Inventario actual</h3><span style="font-size:12px;color:var(--muted)">${esHoy?'Existencias actuales':'Existencias al '+fdate(corte)} · ${lista.length} producto(s)${repFiltros.marca_prod?' · '+repFiltros.marca_prod:''}</span></div>
      <table><thead><tr><th>Código</th><th>Producto</th><th>Marca</th><th>Unidad de medida</th><th>Existencias</th></tr></thead><tbody>
      ${_filas.length?_filas.map(f=>`<tr><td style="color:var(--muted)">${f.codigo||'—'}</td><td style="font-weight:600">${f.nombre||'—'}</td><td style="color:var(--muted)">${f.marca||'—'}</td><td>${_medBadge(f.medida)}</td><td class="num">${f.cant.toLocaleString('es-GT')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Sin productos</td></tr>'}
      </tbody></table>
      ${_filas.length?`<div style="text-align:right;padding:13px 18px;font-family:var(--disp);font-size:14px;font-weight:600;border-top:1.5px solid var(--line-strong)">Total existencias: ${totU.toLocaleString('es-GT')}</div>`:''}
      ${esHoy?'':'<div style="font-size:11px;color:var(--muted-2);padding:8px 4px 0">Existencias reconstruidas del historial de compras y ventas; pueden variar por ajustes manuales de stock.</div>'}</div>`;
  }
  else if(repType==='invcosto'){
    const _stk=p=>p.tipoEmpaque==='caja_unidad'?(Number(p.stock)||0)+(Number(p.stockCajas)||0)*(Number(p.unidadesPorCaja)||0):(Number(p.stock)||0);
    const corte=repFiltros.invFecha||fechaHoyGT();const esHoy=corte>=fechaHoyGT();
    const movs=_movsInvDespuesDe(corte);
    const exDe=p=>{const mm=movs[p.codigo];return Math.max(0,_stk(p)-((mm&&mm.entra)||0)+((mm&&mm.sale)||0));};
    let base=productos.filter(p=>p.activo!==false);
    if(repFiltros.marca_prod)base=base.filter(p=>(p.marca||'')===repFiltros.marca_prod);
    base=base.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    // Cada caja/unidad se parte en 2 filas: cajas (código, costo por caja) y unidades sueltas (subcódigo -U, costo por unidad).
    const filas=[];
    base.forEach(p=>{
      const e=exDe(p),co=Number(costoActual(p))||0;
      if(p.tipoEmpaque==='caja_unidad'){
        const upc=Number(p.unidadesPorCaja)||1,cj=Math.floor(e/upc),un=Math.max(0,Math.round(e-cj*upc)),cou=co/upc;
        filas.push({codigo:p.codigo||'',medida:'Caja',desc:p.nombre||'',cant:cj,co:co,tot:co*cj});
        filas.push({codigo:(p.codigo||'')+'-U',medida:'Unidad',desc:p.nombre||'',cant:un,co:cou,tot:cou*un});
      }else{filas.push({codigo:p.codigo||'',medida:medidaProducto(p),desc:p.nombre||'',cant:e,co:co,tot:co*e});}
    });
    exportData=filas.map(f=>({'Código':f.codigo,'Unidad de medida':f.medida,'Descripción':f.desc,'Cantidad':f.cant,'Costo unitario':f.co,'Costo total':f.tot}));
    const granTotal=filas.reduce((s,f)=>s+f.tot,0);
    html+=`<div class="panel"><div class="panel-head"><h3>Inventario valorizado</h3><span style="font-size:12px;color:var(--muted)">${esHoy?'Al día de hoy':'Al '+fdate(corte)} · ${base.length} producto(s)${repFiltros.marca_prod?' · '+repFiltros.marca_prod:''}</span></div>
      <table><thead><tr><th>Código</th><th>Unidad de medida</th><th>Descripción</th><th>Cantidad</th><th>Costo unitario</th><th>Costo total</th></tr></thead><tbody>
      ${filas.length?filas.map(f=>`<tr><td style="color:var(--muted)">${f.codigo||'—'}</td><td style="color:var(--muted)">${f.medida}</td><td style="font-weight:600">${f.desc||'—'}</td><td class="num">${f.cant.toLocaleString('es-GT')}</td><td class="num">${money(f.co)}</td><td class="num" style="font-weight:600">${money(f.tot)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Sin productos</td></tr>'}
      </tbody></table>
      ${filas.length?`<div style="text-align:right;padding:13px 18px;font-family:var(--disp);font-size:15px;font-weight:700;border-top:1.5px solid var(--line-strong)">Valor total del inventario: ${money(granTotal)}</div>`:''}
      ${esHoy?'':'<div style="font-size:11px;color:var(--muted-2);padding:8px 4px 0">Existencias reconstruidas del historial; el costo usado es el costo actual del producto.</div>'}</div>`;
  }
  else if(repType==='retenciones'){
    // RETENCIONES IVA/ISR — abonos con método 'Retención ...' en el período (por fecha del abono).
    const tipoDe=m=>{const s=String(m||'');return /ISR/i.test(s)?'ISR':(/IVA/i.test(s)?'IVA':'—');};
    const filas=[];
    documentos.forEach(d=>{
      if(d.tipoDoc!=='cambiaria')return;
      if(repFiltros.cliente&&String(d.clienteId)!==repFiltros.cliente)return;
      (d.abonos||[]).forEach(a=>{
        if(a.anulado||!/^Retenci/i.test(String(a.metodo||'')))return;
        if(!enRango(a.fecha,r))return;
        filas.push({fecha:a.fecha,cliente:d.clienteComercial||d.clienteNombre,factura:(d.serie?d.serie+'-'+d.numeroDte:('#'+d.id)),tipo:tipoDe(a.metodo),constancia:(a.referencia||'').replace(/^Constancia\s*/i,''),monto:Number(a.monto)||0});
      });
    });
    filas.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    const totIVA=filas.filter(x=>x.tipo==='IVA').reduce((s,x)=>s+x.monto,0);
    const totISR=filas.filter(x=>x.tipo==='ISR').reduce((s,x)=>s+x.monto,0);
    const tot=totIVA+totISR;
    exportData=filas.map(x=>({Fecha:fdate(x.fecha),Cliente:x.cliente,Factura:x.factura,Tipo:x.tipo,'No. Constancia':x.constancia,'Monto retenido':x.monto}));
    html+=`<div class="kpis stagger">${kpiHTML([
      {ic:'i-blue',svg:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',lbl:'Retención IVA',val:money(totIVA),sub:filas.filter(x=>x.tipo==='IVA').length+' constancia(s)'},
      {ic:'i-lime',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Retención ISR',val:money(totISR),sub:filas.filter(x=>x.tipo==='ISR').length+' constancia(s)'},
      {ic:'i-green',svg:'<path d="M20 6 9 17l-5-5"/>',lbl:'Total retenido',val:money(tot),sub:filas.length+' retención(es)'}
    ])}</div>
    <div class="panel"><div class="panel-head"><h3>Retenciones IVA / ISR</h3><span style="font-size:12px;color:var(--muted)">${periodoLabel} · ${filas.length} retención(es)</span></div>
      <table style="font-size:12.5px"><thead><tr><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Tipo</th><th>No. Constancia</th><th class="num">Monto retenido</th></tr></thead><tbody>
      ${filas.length?filas.map(x=>`<tr><td style="color:var(--muted)">${fdate(x.fecha)}</td><td style="font-weight:600">${x.cliente}</td><td style="color:var(--muted)">${x.factura}</td><td><span class="badge ${x.tipo==='IVA'?'b-info':'b-warn'}">${x.tipo}</span></td><td>${x.constancia||'—'}</td><td class="num" style="font-weight:600">${money(x.monto)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Sin retenciones en el período</td></tr>'}
      </tbody></table>
      ${filas.length?`<div style="text-align:right;padding:13px 18px;font-family:var(--disp);font-size:14px;font-weight:700;border-top:1.5px solid var(--line-strong)">Total retenido: ${money(tot)}</div>`:''}</div>`;
  }
  repLastData=exportData;
  $('#rep-body').innerHTML=html;
  try{agregarTotalesReportes();}catch(e){console.error('totales',e);}
  try{prepararOrdenReportes();}catch(e){console.error('orden',e);}
  // Si es el reporte cliente/producto, aplicar el estado de colapso guardado
  if(repType==='cliprod'||repType==='dircli'||repType==='climes'||repType==='prodmescomp')aplicarColapso();
  enhanceRepTables();
}

