// ---- Exportación Excel ----
async function exportarExcel(){
  if(!repLastData.length){toast('Sin datos para exportar','Generá un reporte primero',true);return;}
  try{
  // Librería con soporte de estilos (negrita, etc.); si falla, respaldo a SheetJS normal (exporta sin estilos).
  let XLSX,_styled=false;
  try{const _m=await import('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/+esm');XLSX=_m.default||_m;if(XLSX&&XLSX.utils)_styled=true;else throw 0;}
  catch(_e){XLSX=await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs');}
  const TIPO_NOMBRES={resumen:'Resumen',costos:'Costos vs Ventas',vendedor:'VALOR FACTURACION VENTAS vs COSTOS',producto:'Ventas por Producto',cliprod:'VENTAS POR CLIENTE Y PRODUCTO',climes:'VENTAS POR CLIENTE Y MES',climescomp:'COMPARATIVA CLIENTE POR MES',comision:'COMISIONES POR PRODUCTO',dircli:'LISTADO DE CLIENTES',factem:'FACTURAS EMITIDAS',cardex:'CARDEX DE INVENTARIO',canalvend:'VENTAS POR CANAL (WHATICKET)',cprov:'Compras por Proveedor',cprod:'Compras por Producto',cxc:'Pendientes por Cliente',estcta:'ESTADO DE CUENTA GENERAL',factabo:'FACTURAS Y ABONOS',banco:'MOVIMIENTOS DE BANCO',recibos:'LISTADO DE RECIBOS',pagos:'LISTADO DE PAGOS',retenciones:'RETENCIONES IVA-ISR',invactual:'INVENTARIO ACTUAL',invcosto:'INVENTARIO VALORIZADO'};
  const _esInv=(repType==='invactual'||repType==='invcosto');
  const meta=[['Reporte:',TIPO_NOMBRES[repType]||repType],[_esInv?'Existencias al:':'Período:',_esInv?(repFiltros.invFecha?fdate(repFiltros.invFecha):'Hoy'):repPeriod],['Generado el:',fdatehora(new Date())],['Generado por:',currentUser],[]];
  const ws=XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.sheet_add_json(ws,repLastData,{origin:'A6'});
  // Estado de cuenta: nombres de cliente y "TOTALES CLIENTE" en negrita (si la librería soporta estilos).
  // Negrita en las filas que encabezan o cierran un bloque: el nombre
  // del cliente y "TOTALES CLIENTE". Se reconocen porque su primera
  // columna NO es un documento.
  //
  // En "Facturas y abonos" los documentos son FA (factura), RE (recibo),
  // RT (retención) y NC (nota de crédito); en el estado de cuenta
  // general sólo hay FA.
  if(_styled&&(repType==='estcta'||repType==='factabo')){
    const _esDoc=repType==='factabo'?/^(FA |RE|RT|NC)/:/^FA /;
    repLastData.forEach((row,i)=>{const doc=(row&&row.Documento)||'';if(doc&&!_esDoc.test(doc)){const ref='A'+(7+i);if(ws[ref])ws[ref].s={font:{bold:true}};}});
  }
  // Ancho de columnas automático según el contenido (para que no salgan cortadas).
  if(repLastData.length){const _keys=Object.keys(repLastData[0]);ws['!cols']=_keys.map(k=>{let w=String(k).length;repLastData.forEach(r=>{const v=r[k];const l=(v==null?'':String(v)).length;if(l>w)w=l;});return {wch:Math.min(Math.max(w+2,9),60)};});}
  // Formato moneda (Q) en las columnas de importe del estado de cuenta.
  if(repType==='estcta'&&repLastData.length){const _k=Object.keys(repLastData[0]);const _cur=['Corriente','30 Días','60 Días','90 Días','+90 Días'];repLastData.forEach((r,i)=>{_k.forEach((kk,ci)=>{if(_cur.indexOf(kk)>=0&&typeof r[kk]==='number'){const ref=XLSX.utils.encode_cell({c:ci,r:6+i});if(ws[ref])ws[ref].z='"Q"#,##0.00';}});});}
  // Formato moneda (Q) en columnas de importe del resto de reportes (por nombre; excluye % y cantidades).
  if(repType!=='estcta'&&repLastData.length){const _k=Object.keys(repLastData[0]);const _inc=/precio|costo|venta|valor|saldo|monto|margen\s*q|\biva\b|neto|entrada|salida|abono|ganancia|compra|d[eé]bito|cr[eé]dito|pendiente|total|corriente/i;const _mes=/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i;const _exc=/%|porcentaje|unidad|cantidad|existencia|recibos?|[oó]rdenes/i;const _money=_k.filter(k=>!_exc.test(k)&&(_inc.test(k)||_mes.test(k)||/^Δ/.test(k)));repLastData.forEach((r,i)=>{_k.forEach((kk,ci)=>{if(_money.indexOf(kk)>=0&&typeof r[kk]==='number'){const ref=XLSX.utils.encode_cell({c:ci,r:6+i});if(ws[ref])ws[ref].z='"Q"#,##0.00';}});});}
  // Fila de TOTALES al pie (suma de columnas numéricas), si el reporte no la trae ya.
  if(repLastData.length){
    const _k=Object.keys(repLastData[0]);
    const _yaTot=repLastData.some(r=>_k.some(k=>typeof r[k]==='string'&&/^\s*(sub)?total/i.test(r[k])));
    const _excT=/%|porcentaje|unitari|precio\s*lista|fecha|d[ií]as?/i;
    const _sumCols=_k.filter(k=>!_excT.test(k)&&repLastData.some(r=>typeof r[k]==='number'));
    if(!_yaTot&&_sumCols.length){
      const _incM=/precio|costo|venta|valor|saldo|monto|margen\s*q|\biva\b|neto|entrada|salida|abono|ganancia|compra|d[eé]bito|cr[eé]dito|pendiente|total|corriente/i;
      const _excM=/%|porcentaje|unidad|cantidad|existencia|recibos?|[oó]rdenes/i;
      const _mesM=/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i;
      const _esMoney=k=>!_excM.test(k)&&(_incM.test(k)||_mesM.test(k)||/^Δ/.test(k));
      const _rt=6+repLastData.length; // fila (0-index) de los totales
      _k.forEach((kk,ci)=>{
        const val=ci===0?'TOTALES':(_sumCols.indexOf(kk)>=0?repLastData.reduce((s,r)=>s+(typeof r[kk]==='number'?r[kk]:0),0):null);
        if(val===null)return;
        const ref=XLSX.utils.encode_cell({c:ci,r:_rt});
        ws[ref]={t:typeof val==='number'?'n':'s',v:val};
        if(typeof val==='number'&&_esMoney(kk))ws[ref].z='"Q"#,##0.00';
        if(_styled)ws[ref].s={font:{bold:true}};
      });
      ws['!ref']=XLSX.utils.encode_range({s:{c:0,r:0},e:{c:_k.length-1,r:_rt}});
    }
  }
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,String(TIPO_NOMBRES[repType]||'Reporte').replace(/[\\\/?*\[\]:]/g,' ').slice(0,31));
  XLSX.writeFile(wb,`SEFE_${repType}_${fechaHoyGT()}.xlsx`);
  toast('✓ Excel descargado','SEFE_'+repType+'_'+fechaHoyGT()+'.xlsx');
  }catch(e){console.error('Error exportando Excel:',e);toast('No se pudo generar el Excel',e.message||String(e),true);}
}
window.exportarExcel=exportarExcel;

// ---- Exportación PDF ----
// Plantilla corporativa compartida (membrete, doble filete verde/lima, pie en cada página)
function _pdfTH(extra){return 'padding:8px 10px;background:#173916;color:#fff;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;text-align:left;'+(extra||'');}
function _pdfTD(extra){return 'padding:7px 10px;border-bottom:1px solid #E7EBDF;font-size:11.5px;'+(extra||'');}
function _pdfSec(t){return '<div style="font-size:10.5px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.8px;margin:22px 0 8px;display:flex;align-items:center;gap:10px"><span>'+t+'</span><span style="flex:1;height:1px;background:#D6DCC9"></span></div>';}
function _pdfShell(o){
  const hoy=new Date();
  const fecha=fdate(hoy);
  const hora=hoy.toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'});
  const usuario=(typeof currentUser!=='undefined'&&currentUser)?currentUser:'';
  const pageSize=o.tamano?o.tamano:('letter '+(o.orientacion||'portrait'));
  const pageMargin=o.margen||'13mm 12mm 18mm';
  const cmp=o.compacto;
  return `
  <style>@page{size:${pageSize};margin:${pageMargin}}</style>
  <div style="font-family:Inter,Arial,sans-serif;color:#1c1f17;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
      <div>
        <img src="${SEFE_LOGO}" alt="SEFE, S.A." style="width:${cmp?108:150}px;height:auto;display:block">
      </div>
      ${o.sinTitulo?'':`<div style="text-align:right">
        <div style="display:inline-block;background:#173916;color:#fff;padding:${cmp?'5px 14px':'8px 18px'};border-radius:6px;font-weight:700;font-size:${cmp?13:14}px;letter-spacing:.5px">${o.titulo}</div>
        ${o.subtitulo?`<div style="font-size:12.5px;color:#444;margin-top:${cmp?4:8}px;font-weight:600">${o.subtitulo}</div>`:''}
        ${o.sinEmitido?'':`<div style="font-size:11px;color:#666B5C;margin-top:${cmp?3:6}px">Emitido el ${fecha} · ${hora}${usuario?(cmp?' · Por: '+usuario:'<br>Por: '+usuario):''}</div>`}
      </div>`}
    </div>
    <div style="height:3px;background:#173916;margin-top:${cmp?8:14}px"></div>
    <div style="height:2px;background:#A8C038;margin-top:2px;margin-bottom:${cmp?9:16}px"></div>
    ${o.body}
    ${o.sinPie?'':`<div style="position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #D6DCC9;padding-top:5px;display:flex;justify-content:space-between;font-size:9px;color:#909584">
      <span>SEFE, S.A.</span>
      <span>SEFE · Sistema de Pedidos y Facturación · ${fdate(hoy)}</span>
    </div>`}
  </div>`;
}
async function _abrirPDF(html){
  let old=document.getElementById('rep-print-area');if(old)old.remove();
  const div=document.createElement('div');div.id='rep-print-area';
  div.innerHTML=html;
  document.body.appendChild(div);
  // Esperar a que el logo esté dibujado. Antes se imprimía en la misma
  // línea en que se armaba el HTML, así que el reporte salía sin logo.
  await esperarImagenes(div);
  window.print();
  setTimeout(()=>{const e=document.getElementById('rep-print-area');if(e)e.remove();},1000);
}
function exportarPDF(){
  if(!repLastData.length){toast('Sin datos para exportar','Generá un reporte primero',true);return;}
  const TIPO_NOMBRES={resumen:'Resumen',costos:'Costos vs Ventas',vendedor:'VALOR FACTURACION VENTAS vs COSTOS',producto:'Ventas por Producto',cliprod:'VENTAS POR CLIENTE Y PRODUCTO',climes:'VENTAS POR CLIENTE Y MES',climescomp:'COMPARATIVA CLIENTE POR MES',comision:'COMISIONES POR PRODUCTO',dircli:'LISTADO DE CLIENTES',factem:'FACTURAS EMITIDAS',cardex:'CARDEX DE INVENTARIO',canalvend:'VENTAS POR CANAL (WHATICKET)',cprov:'Compras por Proveedor',cprod:'Compras por Producto',cxc:'Pendientes por Cliente',estcta:'ESTADO DE CUENTA GENERAL',factabo:'FACTURAS Y ABONOS',banco:'MOVIMIENTOS DE BANCO',recibos:'LISTADO DE RECIBOS',pagos:'LISTADO DE PAGOS',retenciones:'RETENCIONES IVA-ISR',invactual:'INVENTARIO ACTUAL',invcosto:'INVENTARIO VALORIZADO'};
  const cols=repLastData.length?Object.keys(repLastData[0]):[];
  const MESES_NUM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const esNum=(c)=>['ValorAbono','Monto','Total','Ventas','Costo','Costos','Ganancia','Comisión','Margen','Margen Q','Ingresos','Total comprado','Cantidad','Precio Unit.','Venta Total','Costo Unit.','Costo Total','Unidades','Neto','IVA','Valor','Saldo','Entra','Sale','Facturas','Total','Existencias','Existencia','Cantidad','Costo unitario','Costo total',
    'Abonado','Vencido','0-30 días','30-90 días','90+ días','Saldo total','Entradas','Salidas','Saldo actual',
    'Total pagado','Recibos','Unidades compradas','Órdenes'].includes(c)||MESES_NUM.some(m=>c.startsWith(m+' '));
  const ths=cols.map(c=>`<th style="${_pdfTH(esNum(c)?'text-align:right':'')}">${c}</th>`).join('');
  const trs=repLastData.map(row=>`<tr>${cols.map(c=>`<td style="${_pdfTD(esNum(c)?'text-align:right;font-variant-numeric:tabular-nums':'')}">${esNum(c)&&typeof row[c]==='number'?row[c].toLocaleString('es-GT',{minimumFractionDigits:2}):row[c]}</td>`).join('')}</tr>`).join('');
  const _invFch=(repType==='invactual'||repType==='invcosto')&&repFiltros.invFecha&&repFiltros.invFecha<fechaHoyGT()?' · al '+fdate(repFiltros.invFecha):'';
  const body=`${_pdfSec((TIPO_NOMBRES[repType]||repType)+_invFch+' · '+repLastData.length+' registros')}
    <table style="width:100%;border-collapse:collapse"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  _abrirPDF(_pdfShell({titulo:'REPORTE',subtitulo:(TIPO_NOMBRES[repType]||repType)+_invFch,orientacion:cols.length>6?'landscape':'portrait',body}));
}
window.exportarPDF=exportarPDF;

// ── EXPORTAR INVENTARIO (Excel y PDF) ───────────────────────
function _filasInventario(){
  let lista=_verInactivos?productos:productos.filter(p=>p.activo!==false);
  if(_filtroMarca)lista=lista.filter(p=>(p.marca||'')===_filtroMarca);
  return lista.map(p=>{
    const provs=(p.proveedorIds||[]).map(id=>{const x=proveedores.find(v=>v.id===id);return x?x.nombre:null;}).filter(Boolean);
    let stock=p.stock;
    if(p.tipoEmpaque==='caja_unidad')stock=`${p.stockCajas||0} cajas + ${p.stock} und`;
    return {'Código':p.codigo||'','Producto':p.nombre||'','Marca':p.marca||'','Proveedor(es)':provs.length?provs.join(', '):'Sin asignar','Existencias':stock};
  });
}
async function exportarInventarioExcel(){
  const data=_filasInventario();
  if(!data.length){toast('Sin productos para exportar','El inventario está vacío',true);return;}
  const XLSX=await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs');
  const meta=[['Inventario · Soluciones Efectivas GT'],['Generado el:',fdatehora(new Date())],['Generado por:',currentUser],['Marca:',_filtroMarca||'Todas las marcas'],['Total productos:',data.length],[]];
  const ws=XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.sheet_add_json(ws,data,{origin:'A7'});
  ws['!cols']=[{wch:14},{wch:48},{wch:16},{wch:30},{wch:18}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Inventario');
  const fn=`SEFE_Inventario_${fechaHoyGT()}.xlsx`;
  XLSX.writeFile(wb,fn);
  toast('✓ Excel descargado',fn);
}
window.exportarInventarioExcel=exportarInventarioExcel;
function exportarInventarioPDF(){
  const data=_filasInventario();
  if(!data.length){toast('Sin productos para exportar','El inventario está vacío',true);return;}
  const cols=['Código','Producto','Marca','Proveedor(es)','Existencias'];
  const ths=cols.map(c=>`<th style="${_pdfTH(c==='Existencias'?'text-align:right':'')}">${c}</th>`).join('');
  const trs=data.map(row=>`<tr>${cols.map(c=>`<td style="${_pdfTD(c==='Existencias'?'text-align:right':'')}">${row[c]}</td>`).join('')}</tr>`).join('');
  const body=`${_pdfSec('Existencias · '+data.length+' productos'+(_filtroMarca?' · Marca: '+_filtroMarca:''))}
    <table style="width:100%;border-collapse:collapse"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  _abrirPDF(_pdfShell({titulo:'INVENTARIO',subtitulo:_filtroMarca?'Reporte de existencias · '+_filtroMarca:'Reporte de existencias',orientacion:'portrait',body}));
}
window.exportarInventarioPDF=exportarInventarioPDF;


let saveFn=null;
function openMod(title,html,fn){$('#m-title').textContent=title;$('#m-body').innerHTML=html;saveFn=fn;$('#m-save').disabled=false;$('#m-save').textContent='Guardar';$('#m-save').style.display='';$('#m-save').style.background='';$('#m-save').style.color='';$('#m-save').onclick=()=>{if(saveFn)saveFn();};$('#ov').classList.add('show');}
function closeMod(){$('#ov').classList.remove('show');$('#ov').classList.remove('modal-wide');}
window.closeMod=closeMod;
$('#m-save').onclick=()=>{if(saveFn)saveFn();};
/* cierre por clic afuera desactivado: el modal solo se cierra con × o Cancelar para no perder datos */
function openCli(id){
  if(!id&&!canCrearCliente()){toast('Sin permiso','Solo Admin y Gerencia pueden crear clientes',true);return;}
  const c=id?clientes.find(x=>x.id===id):null;
  const cp=c?c.contactoPagos||{}:{},cc=c?c.contactoCompras||{}:{};
  const tc=c?(c.tiempoCredito!=null?c.tiempoCredito:0):0;
  const OPTS=[0,15,30,45,60];
  const esPers=!OPTS.includes(tc);
  openMod(c?'Editar cliente':'Nuevo cliente',`
  <div class="row"><div><label>Nombre comercial</label><input id="c-nom" value="${c?c.nombre:''}"></div></div>
  <div class="row"><div><label>Razón social</label><input id="c-rs" value="${c?(c.razonSocial||''):''}"></div></div>
  <div class="row"><div><label>NIT (o CF)</label>
    <div style="display:flex;gap:6px">
      <input id="c-nit" value="${c?c.nit:'CF'}" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();buscarRazonSocial();}">
      <button type="button" class="btn btn-ghost btn-sm" id="btn-buscar-nit" onclick="buscarRazonSocial()" title="Buscar razón social en SAT" style="white-space:nowrap">🔍 Buscar</button>
    </div>
  </div><div><label>Correo</label><input id="c-mail" value="${c?(c.email||''):''}"></div></div>
  <div class="row"><div>
    <label>NITs adicionales de facturación <span style="font-weight:400;color:var(--muted-2)">(si el cliente pide factura a otro NIT)</span></label>
    <div id="nits-sec-lista" style="display:flex;flex-direction:column;gap:7px;margin-bottom:8px">${(c&&c.nitsSecundarios||[]).map((n,i)=>`
      <div class="nit-sec-row" style="display:flex;gap:7px;align-items:center">
        <input class="nit-sec-nit" value="${n.nit||''}" placeholder="NIT" style="flex:0 0 130px">
        <input class="nit-sec-nombre" value="${(n.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre de referencia" style="flex:1">
        <button type="button" class="btn btn-ghost btn-sm" onclick="buscarRazonSocialSec(this)" title="Buscar razón social en SAT" style="white-space:nowrap;padding:6px 9px">🔍</button>
        <button type="button" class="x" onclick="this.closest('.nit-sec-row').remove()" title="Quitar">×</button>
      </div>`).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="agregarNitSecRow()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar NIT</button>
  </div></div>
  <div class="row"><div><label>Dirección</label><input id="c-dir" value="${c?(c.direccion||'Ciudad'):'Ciudad'}"></div></div>
  <div class="row"><div><label>Dirección de entrega <span style="font-weight:400;color:var(--muted-2)">(si es distinta a la de facturación)</span></label><input id="c-dirent" value="${c?(c.direccionEntrega||''):''}" placeholder="Dejar vacío si entrega en la misma dirección"></div></div>
  <div class="row"><div><label>Ruta <span style="font-weight:400;color:var(--muted-2)">(elegí una existente o escribí una nueva)</span></label><input id="c-ruta" list="c-rutas-list" value="${c?(c.ruta||''):''}" placeholder="Ej. Ruta 1, Zona 11…"><datalist id="c-rutas-list">${[...new Set(clientes.map(x=>(x.ruta||'').trim()).filter(Boolean))].sort().map(r=>`<option value="${escHtml(r)}">`).join('')}</datalist></div></div>
  <div class="row"><div><label>Tiempo de crédito</label><select id="c-tc">
      <option value="0" ${tc===0?'selected':''}>Contado</option>
      <option value="15" ${tc===15?'selected':''}>15 días</option>
      <option value="30" ${tc===30?'selected':''}>30 días</option>
      <option value="45" ${tc===45?'selected':''}>45 días</option>
      <option value="60" ${tc===60?'selected':''}>60 días</option>
      <option value="custom" ${esPers?'selected':''}>Personalizado…</option>
    </select></div>
    <div id="c-tc-custom-wrap" style="${esPers?'':'display:none'}"><label>Días personalizados</label><input id="c-tc-custom" type="number" value="${esPers?tc:''}"></div>
  </div>
  <div class="row"><div><label>Vendedor responsable</label><select id="c-vend">
    <option value="">Sin asignar</option>
    ${vendedores.map(v=>`<option value="${v.id}" ${c&&c.vendedorId===v.id?'selected':''}>${v.nombre}</option>`).join('')}
    </select></div>
  </div>
  <div class="row" id="c-subvend-wrap" style="display:none"><div><label>Sub-vendedor por Whaticket <span style="font-weight:400;color:var(--muted-2)">(quién le vende a este cliente por el canal)</span></label><select id="c-subvend">
    <option value="">— Sin especificar —</option>
    ${SUBVENDEDORES_WHATICKET.map(n=>`<option value="${n.replace(/"/g,'&quot;')}" ${c&&c.subVendedorNombre===n?'selected':''}>${n}</option>`).join('')}
    </select></div>
  </div>
  <div class="row"><div><label>Esta es una sede de <span style="font-weight:400;color:var(--muted-2)">(opcional — mismo NIT, distinta ubicación)</span></label><select id="c-sede">
    <option value="">No es sede (cliente independiente)</option>
    ${clientes.filter(x=>!x.sedesDe&&x.id!==(c?.id)).map(x=>`<option value="${x.id}" ${c&&c.sedesDe===x.id?'selected':''}>${x.nombre} — ${x.nit}</option>`).join('')}
    </select></div>
  </div>
  <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">Contacto de pagos</div>
  <div class="row"><div><label>Nombre</label><input id="cp-nom" value="${cp.nombre||''}"></div><div><label>Teléfono</label><input id="cp-tel" value="${cp.telefono||''}"></div></div>
  <div class="row"><div><label>Correo</label><input id="cp-mail" value="${cp.correo||''}"></div></div>
  <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">Contacto de compras</div>
  <div class="row"><div><label>Nombre</label><input id="cc-nom" value="${cc.nombre||''}"></div><div><label>Teléfono</label><input id="cc-tel" value="${cc.telefono||''}"></div></div>
  <div class="row"><div><label>Correo</label><input id="cc-mail" value="${cc.correo||''}"></div></div>`,()=>{
    const nom=$('#c-nom').value.trim();if(!nom)return;
    const tcSel=$('#c-tc').value;
    const tiempoCredito=tcSel==='custom'?(Number($('#c-tc-custom').value)||0):Number(tcSel);
    const vendedorId=$('#c-vend').value?Number($('#c-vend').value):null;
    const sedesDe=$('#c-sede').value?Number($('#c-sede').value):null;
    const _vendSel=vendedores.find(v=>v.id===vendedorId);
    const subVendedorNombre=esVendedorCanal(_vendSel?.nombre)?($('#c-subvend')?.value||null):null;
    const datos={nombre:nom,razonSocial:$('#c-rs').value.trim()||nom,nit:normalizarNit($('#c-nit').value)||'CF',email:$('#c-mail').value,direccion:$('#c-dir').value,direccionEntrega:$('#c-dirent').value.trim(),ruta:$('#c-ruta').value.trim(),tiempoCredito,vendedorId,subVendedorNombre,sedesDe,nitsSecundarios:leerNitsSecundarios(),
      contactoPagos:{nombre:$('#cp-nom').value,telefono:$('#cp-tel').value,correo:$('#cp-mail').value},
      contactoCompras:{nombre:$('#cc-nom').value,telefono:$('#cc-tel').value,correo:$('#cc-mail').value}};
    const creditoAnterior=c?(c.tiempoCredito||0):null;
    if(c){Object.assign(c,datos);logAudit('Cliente editado',nom+' · NIT '+datos.nit);toast('✓ Cliente actualizado');if(typeof guardarCliente==='function')guardarCliente(c);}
    else{const nuevo={id:cliN++,...datos,fechaAlta:fechaHoyGT(),precios:{},_nuevo:true};clientes.push(nuevo);logAudit('Cliente creado',nom+' · NIT '+datos.nit);toast('✓ Cliente agregado');if(typeof guardarCliente==='function')guardarCliente(nuevo);}
    closeMod();initForm();renderCli();if(cliActual&&$('#v-clientedet').classList.contains('active'))renderCliDet();
    if(c&&creditoAnterior!==tiempoCredito)ofrecerRecalcVencimientos(c,tiempoCredito);});
  setTimeout(()=>{const s=$('#c-tc');if(s)s.onchange=()=>{$('#c-tc-custom-wrap').style.display=s.value==='custom'?'block':'none';};
    const cv=$('#c-vend'),sw=$('#c-subvend-wrap');
    const toggleSub=()=>{if(!sw)return;const vn=vendedores.find(v=>v.id===Number(cv.value));sw.style.display=esVendedorCanal(vn?.nombre)?'':'none';};
    if(cv){cv.onchange=toggleSub;toggleSub();}
  },0);
}
window.openCli=openCli;
// Facturas cambiarias del cliente con saldo pendiente (para recalcular vencimientos)
function facturasPendientesCredito(cli){
  return documentos.filter(d=>d.clienteId===cli.id && d.tipoDoc==='cambiaria' && d.estado!=='anulada' && d.creada && arInfo(d).saldo>0.01);
}
// Al cambiar el crédito de un cliente, ofrecer recalcular el vencimiento de sus facturas PENDIENTES
function ofrecerRecalcVencimientos(cli,dias){
  const pend=facturasPendientesCredito(cli);
  if(!pend.length)return;
  // Automático: al cambiar los días de crédito del cliente, recalcula el vencimiento de sus
  // facturas pendientes (desde la fecha de emisión). Solo afecta facturas con saldo; las pagadas no se tocan.
  pend.forEach(f=>{
    f.diasCredito=dias;
    f.vencimiento=dias>0?new Date(new Date(f.creada).getTime()+dias*86400000).toISOString():null;
    if(typeof guardarDocumento==='function')guardarDocumento(f);
  });
  logAudit('Vencimientos recalculados (auto)',cli.nombre+' · '+pend.length+' factura(s) · '+(dias>0?dias+' días':'contado'));
  toast('✓ Vencimientos actualizados',pend.length+' factura(s) de '+cli.nombre+' · '+(dias>0?dias+' días':'contado'));
  if(typeof renderDocs==='function')renderDocs();
  if(typeof renderCobros==='function')renderCobros();
  if(cliActual&&$('#v-clientedet')&&$('#v-clientedet').classList.contains('active'))renderCliDet();
}
window.ofrecerRecalcVencimientos=ofrecerRecalcVencimientos;
// Agregar una fila vacía de NIT secundario en el formulario del cliente
function agregarNitSecRow(){
  const cont=document.getElementById('nits-sec-lista');
  if(!cont)return;
  const div=document.createElement('div');
  div.className='nit-sec-row';
  div.style.cssText='display:flex;gap:7px;align-items:center';
  div.innerHTML=`<input class="nit-sec-nit" value="" placeholder="NIT" style="flex:0 0 130px">
    <input class="nit-sec-nombre" value="" placeholder="Nombre de referencia" style="flex:1">
    <button type="button" class="btn btn-ghost btn-sm" onclick="buscarRazonSocialSec(this)" title="Buscar razón social en SAT" style="white-space:nowrap;padding:6px 9px">🔍</button>
    <button type="button" class="x" onclick="this.closest('.nit-sec-row').remove()" title="Quitar">×</button>`;
  cont.appendChild(div);
}
window.agregarNitSecRow=agregarNitSecRow;
// Leer los NITs secundarios del formulario
function leerNitsSecundarios(){
  const filas=document.querySelectorAll('#nits-sec-lista .nit-sec-row');
  const arr=[];
  filas.forEach(f=>{
    const nit=normalizarNit(f.querySelector('.nit-sec-nit')?.value||'');
    const nombre=(f.querySelector('.nit-sec-nombre')?.value||'').trim();
    if(nit)arr.push({nit,nombre:nombre||nit});
  });
  return arr;
}

// ── CONSULTAR NIT EN SAT (vía backend EcoFactura) ───────────
// Consulta el NIT en el endpoint /api/nit y autocompleta la
// razón social (y el nombre comercial si está vacío).
async function buscarRazonSocial(){
  const nitInput=$('#c-nit');
  if(!nitInput)return;
  const nit=(nitInput.value||'').trim();
  if(!nit||nit.toUpperCase()==='CF'){
    toast('Ingresá un NIT','Escribí el NIT antes de buscar',true);
    return;
  }
  if(typeof FEL_BACKEND_URL==='undefined'||FEL_BACKEND_URL.includes('TU-BACKEND')){
    toast('Backend no configurado','No se puede consultar el NIT sin el backend FEL',true);
    return;
  }
  const btn=$('#btn-buscar-nit');
  const txtOrig=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Buscando…';}
  try{
    const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/nit/'+encodeURIComponent(nit));
    const data=await r.json();
    // Error de servidor/conexión
    if(!r.ok&&data.error){
      toast('Error al consultar',data.error,true);
      return;
    }
    // EcoFactura devuelve { valido, nit, nombre, direccion } o { valido:false, codigo, mensaje }
    if(data.valido===false){
      toast('NIT no encontrado',data.mensaje||'La SAT no devolvió datos para ese NIT',true);
      return;
    }
    const razon=data.nombre||'';
    if(razon){
      const rs=$('#c-rs');if(rs)rs.value=razon;
      const nom=$('#c-nom');if(nom&&!nom.value.trim())nom.value=razon;
      if(data.direccion){const dir=$('#c-dir');if(dir&&(!dir.value.trim()||dir.value.trim()==='Ciudad'))dir.value=data.direccion;}
      // Normaliza el NIT al que devolvió la SAT (sin guiones)
      if(data.nit&&nitInput)nitInput.value=data.nit;
      toast('✓ NIT encontrado',razon);
    }else{
      toast('Sin razón social','La SAT no devolvió el nombre para ese NIT',true);
    }
  }catch(e){
    console.error('Error consultando NIT:',e);
    toast('Error de conexión','No se pudo consultar el NIT. Revisá tu conexión.',true);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=txtOrig;}
  }
}
window.buscarRazonSocial=buscarRazonSocial;

// Consulta la razón social en SAT para una fila de NIT secundario y llena su nombre
async function buscarRazonSocialSec(btn){
  const row=btn.closest('.nit-sec-row');if(!row)return;
  const nitInput=row.querySelector('.nit-sec-nit');
  const nombreInput=row.querySelector('.nit-sec-nombre');
  const nit=(nitInput?.value||'').trim();
  if(!nit||nit.toUpperCase()==='CF'){toast('Ingresá un NIT','Escribí el NIT secundario antes de buscar',true);return;}
  if(typeof FEL_BACKEND_URL==='undefined'||FEL_BACKEND_URL.includes('TU-BACKEND')){toast('Backend no configurado','No se puede consultar el NIT sin el backend FEL',true);return;}
  const txtOrig=btn.textContent;btn.disabled=true;btn.textContent='…';
  try{
    const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/nit/'+encodeURIComponent(nit));
    const data=await r.json();
    if(!r.ok&&data.error){toast('Error al consultar',data.error,true);return;}
    if(data.valido===false){toast('NIT no encontrado',data.mensaje||'La SAT no devolvió datos para ese NIT',true);return;}
    const razon=data.nombre||'';
    if(razon){
      if(nombreInput)nombreInput.value=razon;
      if(data.nit&&nitInput)nitInput.value=data.nit; // normaliza el NIT
      toast('✓ NIT encontrado',razon);
    }else{toast('Sin razón social','La SAT no devolvió el nombre para ese NIT',true);}
  }catch(e){console.error('Error consultando NIT secundario:',e);toast('Error de conexión','No se pudo consultar el NIT.',true);}
  finally{btn.disabled=false;btn.textContent=txtOrig;}
}
window.buscarRazonSocialSec=buscarRazonSocialSec;

// ── COMPLETAR RAZÓN SOCIAL MASIVO (clientes sin razón social) ──
// Recorre los clientes con NIT válido pero sin razón social,
// consulta cada NIT en la SAT (con pausa de 1s para no saturar),
// y guarda el resultado. Muestra progreso y resumen al final.
let _cancelarRS=false;
async function completarRazonSocial(){
  if(!canCrearCliente()){toast('Sin permiso','Solo Admin y Gerencia pueden hacer esto',true);return;}
  if(typeof FEL_BACKEND_URL==='undefined'||FEL_BACKEND_URL.includes('TU-BACKEND')){
    toast('Backend no configurado','No se puede consultar la SAT sin el backend',true);return;
  }
  // Candidatos: NIT distinto de CF y sin razón social (o igual al nombre)
  const pend=clientes.filter(c=>{
    const nit=(c.nit||'').toUpperCase().replace(/[-\s.]/g,'');
    if(!nit||nit==='CF')return false;
    const rs=(c.razonSocial||'').trim();
    return !rs || rs===c.nombre;
  });

  if(!pend.length){toast('Nada que completar','Todos los clientes con NIT ya tienen razón social');return;}

  _cancelarRS=false;
  openMod('Completar razón social',
    `<p style="font-size:13px;margin-bottom:10px">Se consultarán <b>${pend.length}</b> clientes en la SAT. Esto puede tardar unos <b>${Math.ceil(pend.length/60)} min</b>.</p>
     <div style="background:var(--surface-2);border-radius:8px;padding:14px">
       <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
         <span id="rs-estado">Listo para empezar</span>
         <span id="rs-cont" class="num">0 / ${pend.length}</span>
       </div>
       <div style="height:8px;background:var(--line);border-radius:6px;overflow:hidden">
         <div id="rs-bar" style="height:100%;width:0%;background:var(--blue,#446084);transition:width .2s"></div>
       </div>
       <div id="rs-log" style="margin-top:10px;max-height:180px;overflow-y:auto;font-size:11.5px;color:var(--muted)"></div>
     </div>
     <div class="note" style="margin-top:10px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>No cierres esta ventana mientras corre. Podés cancelar en cualquier momento.</span></div>`,
    null);
  // Cambiar botones del modal
  const sv=$('#m-save');
  if(sv){sv.style.display='';sv.textContent='Empezar';sv.disabled=false;
    sv.onclick=async()=>{
      sv.disabled=true;sv.textContent='Procesando…';
      await _ejecutarRS(pend);
    };
  }
}
window.completarRazonSocial=completarRazonSocial;

async function _ejecutarRS(pend){
  let ok=0,fail=0,i=0;
  const log=$('#rs-log');
  const addLog=(msg,color)=>{if(log){log.innerHTML=`<div style="color:${color||'var(--muted)'}">${msg}</div>`+log.innerHTML;}};
  for(const c of pend){
    if(_cancelarRS){addLog('⏹ Cancelado por el usuario','var(--warn)');break;}
    i++;
    if($('#rs-cont'))$('#rs-cont').textContent=`${i} / ${pend.length}`;
    if($('#rs-bar'))$('#rs-bar').style.width=Math.round(i/pend.length*100)+'%';
    if($('#rs-estado'))$('#rs-estado').textContent='Consultando '+(c.nombre||c.nit);
    try{
      const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/nit/'+encodeURIComponent(c.nit));
      const data=await r.json();
      if(data.valido!==false && data.nombre){
        c.razonSocial=data.nombre;
        if(data.nit)c.nit=data.nit;
        if(typeof guardarCliente==='function')await guardarCliente(c);
        ok++;
        addLog(`✓ ${c.nombre} → ${data.nombre}`,'var(--ok,#1a7f37)');
      }else{
        fail++;
        addLog(`✗ ${c.nombre||c.nit} · ${data.mensaje||'sin datos'}`,'var(--muted)');
      }
    }catch(e){
      fail++;
      addLog(`✗ ${c.nombre||c.nit} · error de conexión`,'var(--danger)');
    }
    // Pausa de 1 segundo entre consultas
    await new Promise(res=>setTimeout(res,1000));
  }
  if($('#rs-estado'))$('#rs-estado').textContent='Terminado';
  addLog(`<b>Listo: ${ok} actualizados, ${fail} sin datos</b>`,'var(--ink)');
  renderCli();
  const sv=$('#m-save');
  if(sv){sv.textContent='Cerrar';sv.disabled=false;sv.onclick=()=>cerrarTodo();}
  toast('✓ Proceso terminado',`${ok} razones sociales completadas`);
}



function openCliSede(padreId){
  if(!canCrearCliente()){toast('Sin permiso','Solo Admin y Gerencia pueden crear sedes',true);return;}
  const padre=clientes.find(x=>x.id===padreId);if(!padre)return;
  openMod('Nueva sede de '+padre.nombre,`
  <div class="note n-ok" style="margin-bottom:14px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>La sede comparte el NIT y razón social de <b>${padre.nombre}</b>. Solo cambian el nombre comercial, la dirección y los contactos.</span></div>
  <div class="row"><div><label>Nombre de la sede</label><input id="cs-nom" placeholder="Ej. ${padre.nombre} — Zona 10"></div></div>
  <div class="row"><div><label>Dirección de la sede</label><input id="cs-dir" placeholder="Dirección física"></div></div>
  <div class="row"><div><label>Dirección de entrega <span style="font-weight:400;color:var(--muted-2)">(si es distinta)</span></label><input id="cs-dirent" placeholder="Dejar vacío si entrega en la misma dirección"></div></div>
  <div class="row"><div><label>Correo</label><input id="cs-mail" value="${padre.email||''}"></div></div>
  <div style="font-size:11.5px;color:var(--muted);margin-top:4px">NIT: <b>${padre.nit}</b> · Razón social: <b>${padre.razonSocial||padre.nombre}</b> · Crédito: <b>${tcLabel(padre.tiempoCredito||0)}</b> (heredados del cliente principal)</div>`,
  ()=>{
    const nom=$('#cs-nom').value.trim();if(!nom){toast('Ingresá el nombre de la sede',null,true);return;}
    const nuevaSede={id:cliN++,nombre:nom,razonSocial:padre.razonSocial||padre.nombre,nit:padre.nit,email:$('#cs-mail').value,direccion:$('#cs-dir').value||'Ciudad',direccionEntrega:$('#cs-dirent').value.trim(),fechaAlta:fechaHoyGT(),tiempoCredito:padre.tiempoCredito||0,vendedorId:padre.vendedorId,sedesDe:padreId,
      contactoPagos:{...padre.contactoPagos},contactoCompras:{...padre.contactoCompras},precios:{...padre.precios},_nuevo:true};
    clientes.push(nuevaSede);
    logAudit('Sede creada',nom+' · sede de '+padre.nombre+' · NIT '+padre.nit);
    if(typeof guardarCliente==='function')guardarCliente(nuevaSede);
    closeMod();initForm();renderCli();if($('#v-clientedet').classList.contains('active'))renderCliDet();
    toast('✓ Sede agregada',nom);
  });
}
window.openCliSede=openCliSede;
let prodProvSel=[];
let _prodEditando=null;
function openProd(id){
  if(!canEditInventario()){toast('Sin permiso','Solo Admin, Gerencia y Bodega pueden modificar el inventario',true);return;}
  const p=id?productos.find(x=>x.id===id):null;
  _prodEditando=p;
  prodProvSel=p?[...(p.proveedorIds||[])]:[];
  const tipoEmp=p?(p.tipoEmpaque||'unidad'):'unidad';
  openMod(p?'Editar producto':'Nuevo producto',`
  <div class="row"><div style="flex:2"><label>Nombre interno</label><input id="p-nom" value="${p?p.nombre:''}"></div><div><label>Código</label><input id="p-cod" value="${p?p.codigo:''}"></div></div>
  <div class="row"><div style="flex:1"><label>Marca</label><input id="p-marca" placeholder="Opcional" value="${p?(p.marca||''):''}"></div><div style="flex:1"><label>Categoría <span style="color:var(--muted);font-weight:400">(umbral de stock)</span></label><input id="p-categoria" list="p-cat-list" placeholder="Ej. Papel, Jabón…" value="${p?(p.categoria||''):''}"><datalist id="p-cat-list">${[...new Set([...categorias.map(c=>c.nombre),...productos.map(x=>x.categoria)].map(s=>(s||'').trim()).filter(Boolean))].sort().map(n=>`<option value="${n.replace(/"/g,'&quot;')}"></option>`).join('')}</datalist></div></div>
  <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin:2px 0 8px">Nomenclatura del proveedor</div>
  <div class="row"><div style="flex:2"><label>Nombre del proveedor</label><input id="p-nom-prov" placeholder="Opcional" value="${p?(p.nombreProveedor||''):''}"></div><div><label>SKU del proveedor</label><input id="p-sku-prov" placeholder="Ej. QV-DES-1GL" value="${p?(p.skuProveedor||''):''}"></div></div>
  <div class="row"><div><label id="p-pre-lbl">${(tipoEmp==='caja_unidad'||tipoEmp==='caja')?'Precio de venta CAJA (IVA incl.)':'Precio de venta (IVA incl.)'}</label><input id="p-pre" type="number" step="0.01" value="${p?p.precio:0}" oninput="recalcPrecioUnidad()"></div><div><label>Costo</label><input id="p-cos" type="number" step="0.01" value="${p?(p.costo||0):0}"></div></div>
  <div class="row" id="p-row-preuni" style="display:${tipoEmp==='caja_unidad'?'flex':'none'}"><div><label>Precio de venta UNIDAD (IVA incl.)</label><input id="p-preuni" type="number" step="0.01" value="${p?((p.precioUnidad&&p.precioUnidad>0)?p.precioUnidad:(p.unidadesPorCaja?(Number(p.precio)/Number(p.unidadesPorCaja)).toFixed(2):0)):0}"></div><div style="display:flex;align-items:flex-end"><div style="font-size:11.5px;color:var(--muted);padding-bottom:9px">Se calcula solo (caja ÷ unidades) y podés editarlo. El de arriba es el precio de la caja.</div></div></div>
  <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin:2px 0 8px">Empaque y unidad</div>
  <div class="row"><div><label>¿Cómo se maneja este producto?</label>
    <select id="p-tipo" onchange="onTipoEmpaque()">
      <option value="unidad" ${tipoEmp==='unidad'?'selected':''}>Solo unidades</option>
      <option value="caja" ${tipoEmp==='caja'?'selected':''}>Solo cajas</option>
      <option value="caja_unidad" ${tipoEmp==='caja_unidad'?'selected':''}>Caja que se convierte a unidades</option>
    </select></div></div>
  <div class="row" id="p-row-upc" style="display:${tipoEmp==='caja_unidad'?'flex':'none'}"><div><label>¿Cuántas unidades trae una caja?</label><input id="p-upc" type="number" min="1" value="${p?(p.unidadesPorCaja||''):''}" placeholder="Ej. 24" oninput="recalcPrecioUnidad()"></div></div>
  <div class="row"><div><label id="p-uni-lbl">Unidad de venta</label><input id="p-uni" value="${p?p.unidad:'UNI'}"></div>
    <div id="p-row-stk"><label id="p-stk-lbl">Stock (unidades)</label><input id="p-stk" type="number" value="${p?p.stock:0}" ${p?'disabled title=\"El stock cambia con compras y pedidos\"':''}></div></div>
  <div class="row" id="p-row-stkcaj" style="display:${tipoEmp==='caja_unidad'?'flex':'none'}"><div><label>Stock de cajas cerradas</label><input id="p-stkcaj" type="number" value="${p?(p.stockCajas||0):0}" ${p?'disabled title=\"El stock cambia con compras y conversiones\"':''}></div></div>
  <div class="note" id="p-aviso-reaco" style="display:none;margin-bottom:13px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span></span></div>
  <label>Proveedores que surten este producto</label>
  <div id="p-prov-chips" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px"></div>
  <div style="display:flex;gap:8px;margin-bottom:13px">
    <input id="p-prov-add" list="p-prov-list" placeholder="Buscar proveedor…" style="flex:1">
    <datalist id="p-prov-list"></datalist>
    <button class="btn btn-ghost btn-sm" onclick="addProvProd()">Agregar</button>
  </div>
  <div class="note n-ok" style="margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El costo se ingresa manualmente y se usa para calcular el margen en reportes.</span></div>`,()=>{
    const nom=$('#p-nom').value.trim();if(!nom)return;
    const proveedorIds=[...prodProvSel];
    const tipoEmpaque=$('#p-tipo').value;
    const unidadesPorCaja=tipoEmpaque==='caja_unidad'?(Number($('#p-upc').value)||0):null;
    if(tipoEmpaque==='caja_unidad'&&!(unidadesPorCaja>0)){toast('Faltan unidades por caja','Indicá cuántas unidades trae una caja',true);return;}
    const datos={codigo:$('#p-cod').value,nombre:nom,marca:$('#p-marca').value.trim(),skuProveedor:$('#p-sku-prov').value.trim(),nombreProveedor:$('#p-nom-prov').value.trim(),precio:Number($('#p-pre').value)||0,precioUnidad:Number($('#p-preuni')?.value)||0,costo:Number($('#p-cos').value)||0,unidad:$('#p-uni').value,proveedorIds,tipoEmpaque,unidadesPorCaja,categoria:($('#p-categoria')?.value||'').trim()};
    if(p){
      const tipoViejo=p.tipoEmpaque||'unidad';
      // Si cambió el tipo de empaque y hay stock, reacomodar (o bloquear)
      if(tipoViejo!==tipoEmpaque){
        const reaco=reacomodarStock(p,tipoViejo,tipoEmpaque,unidadesPorCaja);
        if(reaco.bloqueado){toast('No se puede cambiar el tipo',reaco.motivo,true);return;}
        // aplicar el reacomodo calculado
        Object.assign(p,datos,{stock:reaco.stock,stockCajas:reaco.stockCajas});
        logAudit('Producto editado',nom+' · '+datos.codigo+' · Tipo: '+tipoViejo+'→'+tipoEmpaque+' · '+reaco.resumen);
      }else{
        Object.assign(p,datos);
        logAudit('Producto editado',nom+' · '+datos.codigo);
      }
      toast('✓ Producto actualizado');if(typeof guardarProducto==='function')guardarProducto(p);
    }
    else{const nuevo={id:prodN++,...datos,stock:Number($('#p-stk').value)||0,stockCajas:Number($('#p-stkcaj').value)||0,activo:true,_nuevo:true};productos.push(nuevo);logAudit('Producto creado',nom+' · '+datos.codigo);toast('✓ Producto agregado');if(typeof guardarProducto==='function')guardarProducto(nuevo);}
    closeMod();initForm();renderProd();});
  setTimeout(renderProvChips,0);}
window.openProd=openProd;

// Calcula cómo queda el stock al cambiar de tipo de empaque (o bloquea si no encaja)
function reacomodarStock(p,viejo,nuevo,upcNuevo){
  const stock=p.stock||0, cajas=p.stockCajas||0;
  // Unidad ↔ Caja: el número es el mismo, solo cambia el significado de la etiqueta
  if((viejo==='unidad'&&nuevo==='caja')||(viejo==='caja'&&nuevo==='unidad')){
    return {stock:stock, stockCajas:0, resumen:'stock se mantiene en '+stock};
  }
  // Caja → Caja que se convierte: lo que estaba en stock eran cajas → pasa a cajas cerradas
  if(viejo==='caja'&&nuevo==='caja_unidad'){
    return {stock:0, stockCajas:stock, resumen:stock+' cajas pasaron a cajas cerradas, 0 unidades sueltas'};
  }
  // Unidad → Caja que se convierte: lo que estaba en stock eran unidades → quedan como sueltas
  if(viejo==='unidad'&&nuevo==='caja_unidad'){
    return {stock:stock, stockCajas:0, resumen:stock+' unidades quedaron como sueltas, 0 cajas'};
  }
  // Caja que se convierte → Caja: las unidades sueltas no caben en el modelo de solo cajas
  if(viejo==='caja_unidad'&&nuevo==='caja'){
    if(stock>0)return {bloqueado:true, motivo:'Hay '+stock+' unidades sueltas que no caben en "solo cajas". Convertí o vaciá las unidades primero.'};
    return {stock:cajas, stockCajas:0, resumen:cajas+' cajas pasaron a stock'};
  }
  // Caja que se convierte → Unidad: las cajas cerradas habría que convertirlas primero
  if(viejo==='caja_unidad'&&nuevo==='unidad'){
    if(cajas>0)return {bloqueado:true, motivo:'Hay '+cajas+' cajas cerradas. Convertilas a unidades antes de cambiar el tipo.'};
    return {stock:stock, stockCajas:0, resumen:stock+' unidades se mantienen'};
  }
  // Por defecto, sin cambios
  return {stock:stock, stockCajas:cajas, resumen:'sin cambios de stock'};
}

// Recalcula el precio de la UNIDAD suelta = precio de caja ÷ unidades por caja (editable)
function recalcPrecioUnidad(){
  const inp=$('#p-preuni');if(!inp)return;
  if($('#p-tipo')?.value!=='caja_unidad')return;
  const pre=Number($('#p-pre')?.value)||0, upc=Number($('#p-upc')?.value)||0;
  if(upc>0)inp.value=(pre/upc).toFixed(2);
}
window.recalcPrecioUnidad=recalcPrecioUnidad;
function onTipoEmpaque(){
  const t=$('#p-tipo').value;
  const esCajaUnidad=t==='caja_unidad';
  $('#p-row-upc').style.display=esCajaUnidad?'flex':'none';
  $('#p-row-stkcaj').style.display=esCajaUnidad?'flex':'none';
  const _rpu=$('#p-row-preuni');if(_rpu)_rpu.style.display=esCajaUnidad?'flex':'none';
  const _pl=$('#p-pre-lbl');if(_pl)_pl.textContent=(t==='caja_unidad'||t==='caja')?'Precio de venta CAJA (IVA incl.)':'Precio de venta (IVA incl.)';
  if(esCajaUnidad)recalcPrecioUnidad();
  // Ajustar etiquetas
  $('#p-stk-lbl').textContent=esCajaUnidad?'Stock (unidades sueltas)':(t==='caja'?'Stock (cajas)':'Stock (unidades)');
  $('#p-uni-lbl').textContent=t==='caja'?'Unidad (caja)':'Unidad de venta';
  // Unidad predeterminada: UNI para unidades, CAJ para cualquier tipo de caja
  const uniInp=$('#p-uni');
  if(uniInp){
    const actual=(uniInp.value||'').trim().toUpperCase();
    // Solo autocompletar si está vacío o tiene un valor por defecto (UNI/CAJ), para no pisar uno personalizado
    if(actual===''||actual==='UNI'||actual==='CAJ'){
      uniInp.value=(t==='unidad')?'UNI':'CAJ';
    }
  }
  // Aviso de reacomodo si es un producto existente con stock y cambió el tipo
  const aviso=$('#p-aviso-reaco');
  if(aviso&&_prodEditando){
    const viejo=_prodEditando.tipoEmpaque||'unidad';
    if(viejo!==t){
      const upc=Number($('#p-upc')?.value)||_prodEditando.unidadesPorCaja||0;
      const r=reacomodarStock(_prodEditando,viejo,t,upc);
      if(r.bloqueado){
        aviso.style.display='flex';aviso.className='note n-danger';
        aviso.querySelector('span').innerHTML='<b>No se podrá guardar:</b> '+r.motivo;
      }else if((_prodEditando.stock||0)>0||(_prodEditando.stockCajas||0)>0){
        aviso.style.display='flex';aviso.className='note';aviso.style.background='var(--warn-bg)';aviso.style.color='#7A4A07';aviso.style.borderColor='rgba(168,130,0,.2)';
        aviso.querySelector('span').innerHTML='<b>El stock se reacomodará:</b> '+r.resumen;
      }else{aviso.style.display='none';}
    }else{aviso.style.display='none';}
  }
}
window.onTipoEmpaque=onTipoEmpaque;
function renderProvChips(){
  const wrap=$('#p-prov-chips');if(!wrap)return;
  wrap.innerHTML=prodProvSel.length?prodProvSel.map(id=>{const pv=proveedores.find(x=>x.id===id);if(!pv)return'';
    return `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1.5px solid var(--line-strong);border-radius:20px;padding:5px 6px 5px 12px;font-size:12.5px;font-weight:600">${pv.nombre}<button class="x" style="width:20px;height:20px" onclick="quitarProvProd(${id})">×</button></span>`;}).join(''):'<span style="font-size:12.5px;color:var(--muted)">Ningún proveedor asignado todavía</span>';
  const list=$('#p-prov-list');if(list)list.innerHTML=proveedores.filter(pv=>!prodProvSel.includes(pv.id)).map(pv=>`<option value="${pv.nombre}">`).join('');
}
function addProvProd(){
  const inp=$('#p-prov-add');const v=(inp.value||'').trim();if(!v)return;
  const pv=proveedores.find(x=>x.nombre.toLowerCase()===v.toLowerCase());
  if(!pv){toast('✗ Proveedor no encontrado','Seleccioná uno de la lista',true);return;}
  if(prodProvSel.includes(pv.id)){toast('Ese proveedor ya está asignado');inp.value='';return;}
  prodProvSel.push(pv.id);inp.value='';renderProvChips();
}
window.addProvProd=addProvProd;
function quitarProvProd(id){prodProvSel=prodProvSel.filter(x=>x!==id);renderProvChips();}
window.quitarProvProd=quitarProvProd;

// ================= AUDITORÍA GLOBAL =================
// ================= DESPACHOS Y ENTREGAS =================
const ESTADO_ENTREGA={
  sin:['Sin asignar','b-muted'],
  asignado:['Asignado','b-info'],
  ruta:['En ruta','b-warn'],
  entregado:['Entregado','b-ok'],
};
// Documentos despachables: facturas cambiarias, notas de envío y préstamo, no anuladas
function docsDespachables(){
  return documentos.filter(d=>
    ['cambiaria','envio','prestamo'].includes(d.tipoDoc) &&
    d.estado!=='anulada' &&
    (d.tipoDoc==='cambiaria' ? ['certificada','facturado'].includes(d.estado) : d.estado==='pendiente')
  );
}
function estadoEntrega(d){return d.estadoEntrega||'sin';}
function dirEntrega(d){
  const cli=clientes.find(c=>c.id===d.clienteId);
  return cli?.direccion||'—';
}

function renderDespachos(){
  // poblar selector de pilotos
  const selPil=$('#desp-piloto');
  if(selPil&&selPil.dataset.built!=='1'){
    selPil.innerHTML='<option value="">Todos</option>'+pilotos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
    selPil.dataset.built='1';
  }
  const fEstado=$('#desp-estado')?.value,fPiloto=$('#desp-piloto')?.value;
  let lista=docsDespachables().filter(d=>{
    if(fEstado){if(estadoEntrega(d)!==fEstado)return false;}
    else if(estadoEntrega(d)==='entregado')return false; // por defecto, ocultar los ya entregados
    if(fPiloto&&String(d.pilotoId||'')!==fPiloto)return false;
    return true;
  });
  // KPIs
  const todos=docsDespachables();
  const activos=todos.filter(d=>estadoEntrega(d)!=='entregado'); // los que realmente falta despachar
  const sinAsig=todos.filter(d=>estadoEntrega(d)==='sin').length;
  const enRuta=todos.filter(d=>estadoEntrega(d)==='ruta').length;
  const entregadosHoy=todos.filter(d=>estadoEntrega(d)==='entregado'&&fechaLocalDe(d.entregaInfo?.fecha)===fechaHoyGT()).length;
  const k=[
    {ic:sinAsig?'i-warn':'i-lime',svg:'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',lbl:'Sin asignar',val:sinAsig,sub:'esperan piloto'},
    {ic:'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'En ruta',val:enRuta,sub:'en camino'},
    {ic:'i-green',svg:'<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',lbl:'Entregados hoy',val:entregadosHoy,sub:'completados'},
    {ic:'i-blue',svg:'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>',lbl:'Total a despachar',val:activos.length,sub:'documentos activos'},
  ];
  $('#desp-kpis').innerHTML=k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div>`).join('');
  // Ordenar por ruta (los que tienen orden primero, luego por número)
  lista.sort((a,b)=>{
    const ra=a.ordenRuta??999,rb=b.ordenRuta??999;
    if(ra!==rb)return ra-rb;
    return (a.numeroDte||a.numero||0)-(b.numeroDte||b.numero||0);
  });
  $('#desp-empty').style.display=lista.length?'none':'block';
  const docNum=d=>d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const tipoCorto={cambiaria:'Factura',envio:'N. envío',prestamo:'N. préstamo'};
  $('#t-despachos').innerHTML=lista.map(d=>{
    const est=estadoEntrega(d);const [en,ec]=ESTADO_ENTREGA[est];
    const piloto=pilotos.find(p=>p.id===d.pilotoId);
    let acts='';
    acts+=`<button class="btn btn-ghost btn-sm" onclick="verDoc(${d.id})">Ver</button>`;
    if(est!=='entregado')acts=`<button class="btn btn-primary btn-sm" onclick="asignarDespacho(${d.id})">${d.pilotoId?'Reasignar':'Asignar'}</button>`+acts;
    return `<tr>
      <td class="num" style="font-weight:700;color:var(--green)">${d.ordenRuta!=null?'#'+d.ordenRuta:'—'}</td>
      <td style="font-weight:600">${docNum(d)}<div style="font-size:10.5px;color:var(--muted)">${tipoCorto[d.tipoDoc]}</div></td>
      <td>${d.clienteComercial||d.clienteNombre}</td>
      <td style="color:var(--muted);font-size:12px;max-width:170px;white-space:normal">${dirEntrega(d)}</td>
      <td class="num" style="font-weight:600">${money(d.totales.total)}</td>
      <td>${piloto?piloto.nombre:'<span style="color:var(--muted-2)">—</span>'}</td>
      <td><span class="badge ${ec}">${en}</span></td>
      <td><div class="acts">${acts}</div></td>
    </tr>`;
  }).join('');
  enhanceTable('t-despachos');
  renderConciliacion();
}
window.renderDespachos=renderDespachos;

// ---- Conciliación de cobros en ruta (3 estados) ----
function renderConciliacion(){
  const box=$('#desp-conciliacion');if(!box)return;
  const pend=cobrosRuta.filter(c=>c.estado!=='procesado');
  if(!pend.length){box.style.display='none';return;}
  box.style.display='';
  const EST={cobrado:['Por depositar (piloto)','b-muted'],depositado:['Depositado por piloto','b-info'],recibido:['Recibido por logística','b-warn']};
  const puedeRecibir=canAsignarPiloto()||currentRole==='admin'; // logística
  const puedeProcesar=canRegistrarAbono(); // contabilidad
  const row=c=>{
    const [en,ec]=EST[c.estado];
    let btn='';
    if(c.estado==='cobrado')btn='<span style="font-size:11px;color:var(--muted-2)">Piloto debe depositar</span>';
    else if(c.estado==='depositado'&&puedeRecibir)btn=`<button class="btn btn-primary btn-sm" onclick="recibirCobro(${c.id})">Confirmar recibido</button>`;
    else if(c.estado==='recibido'&&puedeProcesar)btn=`<button class="btn btn-primary btn-sm" onclick="procesarCobro(${c.id})">Procesar abono</button>`;
    else if(c.estado==='depositado')btn='<span style="font-size:11px;color:var(--muted-2)">Espera logística</span>';
    else if(c.estado==='recibido')btn='<span style="font-size:11px;color:var(--muted-2)">Espera contabilidad</span>';
    return `<tr>
      <td style="font-weight:600;font-size:12.5px">${c.docNum}<div style="font-size:10.5px;color:var(--muted)">${c.cliente}</div></td>
      <td style="font-size:12px">${c.modo==='efectivo'?'💵 Efectivo':'🏦 Cheque '+(c.cheque||'')}<div style="font-size:10.5px;color:var(--muted)">Recibo ${c.noRecibo}${c.noBoleta?' · Boleta '+c.noBoleta:''}</div></td>
      <td style="font-size:12px;color:var(--muted)">${c.piloto}</td>
      <td class="num" style="font-weight:700">${money(c.monto)}</td>
      <td><span class="badge ${ec}">${en}</span></td>
      <td>${btn}</td>
    </tr>`;
  };
  const totalPend=pend.reduce((s,c)=>s+c.monto,0);
  box.innerHTML=`<div class="panel-head"><h3>🏦 Cobros en ruta por conciliar</h3><span style="font-size:12px;color:var(--muted)">${pend.length} cobro${pend.length!==1?'s':''} · ${money(totalPend)}</span></div>
    <div style="padding:11px 18px 0;font-size:11.5px;color:var(--muted)">Flujo: <b>Cobrado</b> (piloto entrega recibo) → <b>Depositado</b> (piloto agrega boleta en su cierre) → <b>Recibido</b> (logística valida boleta + recibo) → <b>Procesado</b> (contabilidad aplica el abono)</div>
    <table><thead><tr><th>Documento</th><th>Pago</th><th>Piloto</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${pend.map(row).join('')}</tbody></table>`;
}
window.renderConciliacion=renderConciliacion;

// Logística confirma que recibió la boleta + recibo físico
function recibirCobro(id){
  if(!(canAsignarPiloto()||currentRole==='admin')){toast('Sin permiso','Solo Logística confirma la recepción',true);return;}
  const c=cobrosRuta.find(x=>x.id===id);if(!c||c.estado!=='depositado')return;
  c.estado='recibido';c.recibidoPor=currentUser;c.recibidoFecha=new Date().toISOString();
  logAudit('Cobro en ruta recibido',c.docNum+' · '+c.cliente+' · Boleta '+c.noBoleta+' · '+money(c.monto));
  renderDespachos();
  toast('✓ Recepción confirmada',c.docNum+' · pasa a contabilidad');
  if(typeof guardarCobroRuta==='function')guardarCobroRuta(c);
}
window.recibirCobro=recibirCobro;

// Contabilidad procesa: recién aquí se crea el abono real en la factura
function procesarCobro(id){
  if(!canRegistrarAbono()){toast('Sin permiso','Solo Contabilidad procesa el abono',true);return;}
  const c=cobrosRuta.find(x=>x.id===id);if(!c||c.estado!=='recibido')return;
  const d=documentos.find(x=>x.id===c.docId);if(!d){toast('Documento no encontrado',null,true);return;}
  _compFoto=null;
  const ai=arInfo(d);const saldo=ai.saldo;
  const hoy=fechaHoyGT();
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const metodoCobro=c.modo==='efectivo'?'Efectivo':'Cheque';
  const refDefault='Cobrado en ruta · Boleta '+c.noBoleta+(c.cheque?' · Cheque '+c.cheque:'');
  openMod('Procesar abono · '+docNum,
    `<div class="note n-ok" style="margin-bottom:13px"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span>Cobro en ruta de <b>${c.piloto}</b> · Recibo ${c.noRecibo} · Boleta ${c.noBoleta}. Verificá los datos y aplicá el abono a la factura.</span></div>
     <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${d.clienteComercial||d.clienteNombre} · Saldo pendiente: <b style="color:var(--ink)">${money(saldo)}</b></p>
     <div class="row"><div><label>No. de recibo</label><input id="ab-recibo" value="${c.noRecibo||''}"></div><div><label>Fecha</label><input id="ab-fecha" type="date" value="${c.fecha?c.fecha.slice(0,10):hoy}"></div></div>
     <div class="row"><div><label>Monto del abono</label><input id="ab-monto" type="number" step="0.01" value="${c.monto.toFixed(2)}"></div><div><label>Método</label><select id="ab-met"><option ${metodoCobro==='Efectivo'?'selected':''}>Efectivo</option><option>Transferencia</option><option ${metodoCobro==='Cheque'?'selected':''}>Cheque</option><option>Depósito</option><option>Tarjeta</option></select></div></div>
     <div class="row"><div><label>Referencia / No. boleta / cheque</label><input id="ab-ref" value="${refDefault}"></div></div>
     <div class="row">${selectorCuentaBancoHTML('ab-cuenta','¿A qué cuenta entró el dinero?')}</div>
     ${compFotoHTML()}
     <div class="note n-danger" id="ab-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const monto=Number($('#ab-monto').value);
      if(!(monto>0)){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='El monto debe ser mayor a cero';return;}
      if(!($('#ab-cuenta')?.value)){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='Elegí la cuenta de banco a la que entró el dinero';return;}
      // Interruptor: sin la tabla de saldo a favor, se mantiene el bloqueo viejo.
      if(!window._saldoFavorTabla && monto>saldo+0.001){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='El abono no puede superar el saldo de '+money(saldo);return;}
      // Sobrepago: se aplica hasta el saldo y el resto queda como saldo a favor
      // del cliente. El banco registra lo que el piloto depositó de verdad.
      const aplicado=Math.min(monto,Math.max(0,saldo));
      const exceso=Math.round((monto-aplicado)*100)/100;
      const _cta=$('#ab-cuenta')?.value||null, _fecha=$('#ab-fecha').value||hoy;
      const _rec=$('#ab-recibo').value.trim(), _met=$('#ab-met').value, _ref=$('#ab-ref').value;
      if(aplicado>0.001){
        d.abonos=d.abonos||[];
        const _ab={fecha:_fecha,monto:aplicado,metodo:_met,referencia:_ref,
          noRecibo:_rec,comprobante:_compFoto,cuentaBancoId:_cta,
          registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false,origenCobroRuta:c.id};
        d.abonos.push(_ab);
        d.estadoPago=arInfo(d).estado;
        if(typeof guardarAbono==='function')guardarAbono(d.id,_ab);
        if(typeof guardarDocumento==='function')guardarDocumento(d);
      }
      if(exceso>0.001){
        const _cr={clienteId:d.clienteId,tipo:'ingreso',monto:exceso,fecha:_fecha,documentoId:d.id,
          noRecibo:_rec,metodo:_met,referencia:_ref,cuentaBancoId:_cta,
          concepto:'Sobrepago en ruta recibo '+(_rec||'—')+' · '+(d.clienteComercial||d.clienteNombre),
          registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
        creditosCliente=creditosCliente||[];creditosCliente.push(_cr);
        if(typeof guardarCredito==='function')guardarCredito(_cr);
      }
      // Movimiento de banco por lo que realmente entró (depósito completo)
      if(_cta&&typeof registrarMovimientoBanco==='function'){
        registrarMovimientoBanco({cuentaId:_cta,tipo:'entrada',monto,
          concepto:'Cobro en ruta '+(_rec||'')+' · '+(d.clienteComercial||d.clienteNombre)+(exceso>0.001?' (incluye saldo a favor '+money(exceso)+')':''),
          categoria:'cobro',origen:'cobro',origenId:d.id,referencia:_ref,fecha:_fecha});
      }
      c.estado='procesado';c.procesadoPor=currentUser;c.procesadoFecha=new Date().toISOString();
      closeMod();renderDespachos();
      logAudit('Cobro en ruta procesado',docNum+' · '+c.cliente+' · '+money(monto)+(exceso>0.001?' (saldo a favor '+money(exceso)+')':'')+' · saldo '+money(arInfo(d).saldo));
      toast(exceso>0.001?'✓ Cobro con saldo a favor':'✓ Abono aplicado',docNum+' · '+(exceso>0.001?'saldo a favor '+money(exceso):'saldo '+money(arInfo(d).saldo)));
      if(typeof guardarCobroRuta==='function')guardarCobroRuta(c);
    });
}
window.procesarCobro=procesarCobro;

function asignarDespacho(id){
  if(!canAsignarPiloto()){toast('Sin permiso','Solo Logística puede asignar entregas',true);return;}
  const d=documentos.find(x=>x.id===id);if(!d)return;
  const docNum=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const pilOpts=pilotos.map(p=>`<option value="${p.id}" ${d.pilotoId===p.id?'selected':''}>${p.nombre}</option>`).join('');
  openMod('Asignar entrega · '+docNum,`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${d.clienteComercial||d.clienteNombre} · ${money(d.totales.total)}<br><span style="font-size:11.5px">📍 ${dirEntrega(d)}</span></p>
    <div class="row"><div><label>Piloto</label><select id="dsp-piloto"><option value="">— Seleccioná —</option>${pilOpts}</select></div>
      <div><label>Orden en la ruta</label><input id="dsp-orden" type="number" min="1" value="${d.ordenRuta||''}" placeholder="1, 2, 3…"></div></div>
    <div class="note n-ok" style="margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El piloto verá este documento en "Mis entregas". El número de ruta define el orden de visita.</span></div>`,
    ()=>{
      const pid=$('#dsp-piloto').value?Number($('#dsp-piloto').value):null;
      if(!pid){toast('Seleccioná un piloto',null,true);return;}
      d.pilotoId=pid;d.ordenRuta=$('#dsp-orden').value?Number($('#dsp-orden').value):null;
      if(estadoEntrega(d)==='sin')d.estadoEntrega='asignado';
      const pil=pilotos.find(p=>p.id===pid);
      logAudit('Entrega asignada',docNum+' · '+(d.clienteComercial||d.clienteNombre)+' · Piloto: '+(pil?.nombre||'—')+(d.ordenRuta?' · Ruta #'+d.ordenRuta:''));
      closeMod();renderDespachos();
      toast('✓ Entrega asignada',(pil?.nombre||'')+(d.ordenRuta?' · ruta #'+d.ordenRuta:''));
      if(typeof guardarDocumento==='function')guardarDocumento(d);
    });
}
window.asignarDespacho=asignarDespacho;

// ---- Vista del Piloto ----
function renderMisEntregas(){
  const pid=miPilotoId();
  // Admin/logística que entran a esta vista ven todo; un piloto ve solo lo suyo
  const mias=esPiloto()
    ? docsDespachables().filter(d=>d.pilotoId===pid)
    : docsDespachables().filter(d=>d.pilotoId!=null);
  // KPIs del piloto
  const pendientes=mias.filter(d=>estadoEntrega(d)!=='entregado').length;
  const enRuta=mias.filter(d=>estadoEntrega(d)==='ruta').length;
  const entregadas=mias.filter(d=>estadoEntrega(d)==='entregado').length;
  const k=[
    {ic:'i-warn',svg:'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',lbl:'Por entregar',val:pendientes,sub:'asignadas a mí'},
    {ic:'i-blue',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'En ruta',val:enRuta,sub:'cargadas'},
    {ic:'i-green',svg:'<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',lbl:'Entregadas',val:entregadas,sub:'completadas'},
  ];
  $('#pil-kpis').innerHTML=k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div>`).join('');
  // Ordenar por ruta
  mias.sort((a,b)=>{const ra=a.ordenRuta??999,rb=b.ordenRuta??999;return ra-rb;});
  const docNum=d=>d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
  const tipoCorto={cambiaria:'Factura',envio:'Nota de envío',prestamo:'Nota de préstamo'};
  if(!mias.length){
    $('#pil-lista').innerHTML=`<div class="panel"><div class="panel-body"><div class="empty">No tenés entregas asignadas en este momento.</div></div></div>`;
    return;
  }
  // Tarjetas tipo lista de entregas
  $('#pil-lista').innerHTML=`<div class="panel"><div class="panel-head"><h3>Mis entregas de hoy</h3><span style="font-size:12px;color:var(--muted)">${mias.length} en total · ordenadas por ruta</span></div><div class="panel-body" style="display:flex;flex-direction:column;gap:11px">`+
    mias.map(d=>{
      const est=estadoEntrega(d);const [en,ec]=ESTADO_ENTREGA[est];
      const cli=clientes.find(c=>c.id===d.clienteId);
      const tel=cli?.contactoCompras?.telefono||cli?.contactoPagos?.telefono||'';
      const items=d.items.map(it=>`${it.cantidad}× ${it.nombre}`).join(', ');
      let btn='';
      if(est==='asignado')btn=`<button class="btn btn-primary btn-sm" onclick="marcarEnRuta(${d.id})">📦 Cargado, voy en ruta</button>`;
      else if(est==='ruta')btn=`<button class="btn btn-primary btn-sm" onclick="marcarEntregado(${d.id})">✓ Marcar entregado</button>`;
      else if(est==='entregado')btn=`<span class="badge b-ok">✓ Entregado a ${d.entregaInfo?.recibe||'—'}</span>`;
      return `<div style="border:1.5px solid var(--line-strong);border-radius:12px;padding:14px 16px;${est==='entregado'?'opacity:.65':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              ${d.ordenRuta!=null?`<span style="background:var(--green);color:#fff;font-weight:700;font-size:12px;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center">${d.ordenRuta}</span>`:''}
              <span style="font-weight:700;font-size:15px">${d.clienteComercial||d.clienteNombre}</span>
              <span class="badge ${ec}">${en}</span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:3px">${docNum(d)} · ${tipoCorto[d.tipoDoc]} · ${money(d.totales.total)}</div>
            <div style="font-size:12.5px;color:var(--ink);margin-bottom:3px">📍 ${dirEntrega(d)}</div>
            ${tel?`<div style="font-size:12px"><a href="tel:${tel}" style="color:var(--blue);text-decoration:none">☎ ${tel}</a></div>`:''}
            <div style="font-size:11.5px;color:var(--muted-2);margin-top:6px">${items}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="verDoc(${d.id})">Ver doc</button>
        </div>
        <div style="margin-top:11px">${btn}</div>
      </div>`;
    }).join('')+`</div></div>`+corteCajaHTML(mias);
}
window.renderMisEntregas=renderMisEntregas;

// ---- Corte de caja del piloto (del día) ----
function corteCajaHTML(entregas){
  const hoy=fechaHoyGT();
  const pilName=esPiloto()?currentUser:null;
  // Cobros en ruta de hoy (de este piloto si es piloto, o todos si es logística/contabilidad)
  const cobrosHoy=cobrosRuta.filter(c=>c.fecha.slice(0,10)===hoy&&(!pilName||c.piloto===pilName));
  // Contraseñas y créditos de hoy desde entregaInfo
  const entregadasHoy=entregas.filter(d=>estadoEntrega(d)==='entregado'&&fechaLocalDe(d.entregaInfo?.fecha)===hoy);
  const contrasenas=[],credito=[];
  entregadasHoy.forEach(d=>{const ei=d.entregaInfo||{};const dn=d.serie?d.serie+'-'+d.numeroDte:'PED-'+padn(d.numero);
    if(ei.modoPago==='contrasena')contrasenas.push({dn,cliente:d.clienteComercial||d.clienteNombre,contra:ei.contrasena});
    else if(ei.modoPago==='credito')credito.push({dn,cliente:d.clienteComercial||d.clienteNombre,recibe:ei.recibe});
  });
  if(!cobrosHoy.length&&!contrasenas.length&&!credito.length)return '';
  const efectivo=cobrosHoy.filter(c=>c.modo==='efectivo');
  const cheques=cobrosHoy.filter(c=>c.modo==='cheque');
  const totalEf=efectivo.reduce((s,c)=>s+c.monto,0);
  const totalCh=cheques.reduce((s,c)=>s+c.monto,0);
  const EST_COBRO={cobrado:['Por depositar','b-warn'],depositado:['Depositado','b-info'],recibido:['Recibido por logística','b-info'],procesado:['Procesado','b-ok']};
  const fila=(lbl,val,color)=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)"><span style="font-size:13px">${lbl}</span><span class="num" style="font-weight:700;${color?'color:'+color:''}">${val}</span></div>`;
  const esMiCorte=esPiloto();
  const cobroRow=c=>{const [en,ec]=EST_COBRO[c.estado];
    const btnBoleta=(c.estado==='cobrado'&&esMiCorte)?`<button class="btn btn-primary btn-sm" style="margin-top:6px;padding:5px 10px;font-size:11px" onclick="agregarBoleta(${c.id})">+ Agregar boleta de depósito</button>`:'';
    return `<div style="padding:9px 0;border-bottom:1px solid var(--line);font-size:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div><b>${c.docNum}</b> · ${c.cliente}<div style="color:var(--muted-2);font-size:10.5px">${c.modo==='efectivo'?'💵 Efectivo':'🏦 Cheque '+(c.cheque||'')} · Recibo ${c.noRecibo}${c.noBoleta?' · Boleta '+c.noBoleta:''}</div></div>
      <div style="text-align:right;white-space:nowrap"><div class="num" style="font-weight:700">${money(c.monto)}</div><span class="badge ${ec}" style="font-size:9.5px">${en}</span></div>
    </div>${btnBoleta}
  </div>`;};
  const porDepositar=cobrosHoy.filter(c=>c.estado==='cobrado');
  return `<div class="panel" style="margin-top:16px">
    <div class="panel-head"><h3>💰 Corte del día</h3><span style="font-size:12px;color:var(--muted)">${fdate(new Date())}</span></div>
    <div class="panel-body">
      ${fila('💵 Efectivo cobrado ('+efectivo.length+')',money(totalEf),'var(--green)')}
      ${fila('🏦 Cheques cobrados ('+cheques.length+')',money(totalCh))}
      ${fila('📄 Contraseñas de pago',contrasenas.length)}
      ${fila('✍️ Entregas a crédito (firmadas)',credito.length)}
      <div style="display:flex;justify-content:space-between;padding:12px 0 4px"><span style="font-weight:700">Total cobrado</span><span class="num" style="font-weight:700;font-size:17px">${money(totalEf+totalCh)}</span></div>
      ${cobrosHoy.length?`<div style="margin-top:14px"><div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Cobros del día</div>${cobrosHoy.map(cobroRow).join('')}</div>`:''}
      ${contrasenas.length?`<div style="margin-top:12px"><div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Contraseñas para seguimiento</div>${contrasenas.map(c=>`<div style="font-size:12px;color:var(--muted);padding:3px 0">${c.contra} — ${c.cliente}</div>`).join('')}</div>`:''}
      <div class="note" style="background:${porDepositar.length?'var(--warn-bg)':'var(--ok-bg)'};color:${porDepositar.length?'#7A4A07':'var(--ok)'};border-color:rgba(168,130,0,.2);margin-top:14px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>${porDepositar.length?`Tenés <b>${porDepositar.length} cobro(s) por depositar</b>. Depositá en el banco y agregá la boleta a cada uno.`:'Todos tus cobros tienen boleta. Entregá las boletas y recibos a logística.'}</span></div>
    </div>
  </div>`;
}

// El piloto agrega la boleta de depósito a un cobro (en su cierre, ya pasó por el banco)
