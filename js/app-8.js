function filtroMarcaInv(){
  const marcas=[...new Set(productos.filter(p=>p.activo!==false||_verInactivos).map(p=>p.marca).filter(m=>m&&m.trim()))].sort((a,b)=>a.localeCompare(b,'es'));
  if(!marcas.length)return '';
  const opts=['<option value="">Todas las marcas</option>']
    .concat(marcas.map(m=>`<option value="${m}"${_filtroMarca===m?' selected':''}>${m}</option>`))
    .join('');
  return `<select onchange="setFiltroMarca(this.value)" style="margin-right:8px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;max-width:180px">${opts}</select> `;
}
window.setFiltroMarca=function(v){_filtroMarca=v;renderProd();};
function toggleVerInactivos(){_verInactivos=!_verInactivos;renderProd();}
window.toggleVerInactivos=toggleVerInactivos;

// ── TRAZABILIDAD DE PRODUCTO ────────────────────────────────
// Recorre documentos (salidas) y compras (entradas) para mostrar
// el historial de movimientos de un producto: a qué factura/pedido
// se fue y de qué compra entró.
function trazabilidadProducto(prod){
  const cod=prod.codigo;
  const movs=[];
  // Normaliza la cantidad a la MEDIDA del producto (cajas para tipos caja).
  // Una salida por unidad de un caja_unidad viene en unidades → se pasa a cajas.
  const esCU=prod.tipoEmpaque==='caja_unidad', upc=Number(prod.unidadesPorCaja)||1;
  const enMedida=(cant,modo)=>(esCU&&(modo||'unidad')!=='caja')?cant/upc:cant;
  // SALIDAS: documentos (pedidos, facturas, notas) que contienen el producto
  documentos.forEach(d=>{
    if(d.estado==='anulada'||d.anulado)return;
    (d.items||[]).forEach(it=>{
      if(it.codigo!==cod)return;
      const docRef=d.serie&&d.numeroDte?`${d.serie}-${d.numeroDte}`:`${refPed(d)}`;
      const tipo=(TIPO_LBL[d.tipoDoc]?TIPO_LBL[d.tipoDoc][0]:d.tipoDoc)||'Documento';
      movs.push({
        fecha:d.creada,
        tipo:'salida',
        doc:docRef,
        detalle:tipo+(d.clienteComercial?' · '+d.clienteComercial:''),
        cant:enMedida(Number(it.cantidad)||0,it.modoVenta)
      });
      // Préstamo/envío devuelto: el inventario volvió → entrada de devolución (queda neto 0)
      if(d.estado==='devuelto')movs.push({
        fecha:d.devueltoFecha||d.creada,
        tipo:'entrada',
        doc:docRef,
        detalle:'Devolución · '+tipo,
        cant:enMedida(Number(it.cantidad)||0,it.modoVenta)
      });
    });
  });
  // ENTRADAS: compras recibidas que contienen el producto
  compras.forEach(c=>{
    if(c.anulado)return;
    (c.items||[]).forEach(it=>{
      if(it.codigo!==cod)return;
      const recibido=Number(it.recibido||0);
      if(recibido<=0)return;
      movs.push({
        fecha:c.fecha,
        tipo:'entrada',
        doc:c.docProv||('Compra #'+c.id),
        detalle:'Compra · '+(c.proveedorNombre||'Proveedor'),
        cant:recibido
      });
    });
  });
  movs.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  const totalEntra=movs.filter(m=>m.tipo==='entrada').reduce((s,m)=>s+m.cant,0);
  const totalSale=movs.filter(m=>m.tipo==='salida').reduce((s,m)=>s+m.cant,0);
  return {movs,totalEntra,totalSale};
}

window.verTrazabilidad=function(id){
  const p=productos.find(x=>x.id===id);
  if(!p)return;
  const {movs,totalEntra,totalSale}=trazabilidadProducto(p);
  const filas=movs.length?movs.map(m=>{
    const fecha=fdate(m.fecha);
    const esEntrada=m.tipo==='entrada';
    const signo=esEntrada?'+':'−';
    const color=esEntrada?'var(--ok,#1a7f37)':'var(--danger,#c0392b)';
    const badge=esEntrada
      ?'<span class="badge b-ok" style="font-size:9.5px">Entrada</span>'
      :'<span class="badge b-muted" style="font-size:9.5px">Salida</span>';
    return `<tr>
      <td style="font-size:12px;color:var(--muted)">${fecha}</td>
      <td>${badge}</td>
      <td style="font-weight:600">${m.doc}</td>
      <td style="font-size:12px;color:var(--muted)">${m.detalle}</td>
      <td class="num" style="font-weight:700;color:${color}">${signo}${fmtCajas(m.cant)}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">Sin movimientos registrados para este producto</td></tr>';

  if($('#ov'))$('#ov').classList.add('modal-wide');
  openMod('Trazabilidad · '+p.nombre,
    `<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
       <div style="flex:1;min-width:90px;background:var(--surface-2);border-radius:8px;padding:10px 12px">
         <div style="font-size:11px;color:var(--muted)">Código</div>
         <div style="font-weight:700">${p.codigo}</div></div>
       <div style="flex:1;min-width:90px;background:#E8F5E9;border-radius:8px;padding:10px 12px">
         <div style="font-size:11px;color:#1a7f37">Total entradas</div>
         <div style="font-weight:700;color:#1a7f37">+${fmtCajas(totalEntra)}</div></div>
       <div style="flex:1;min-width:90px;background:#FDECEA;border-radius:8px;padding:10px 12px">
         <div style="font-size:11px;color:#c0392b">Total salidas</div>
         <div style="font-weight:700;color:#c0392b">−${fmtCajas(totalSale)}</div></div>
       <div style="flex:1;min-width:90px;background:var(--surface-2);border-radius:8px;padding:10px 12px">
         <div style="font-size:11px;color:var(--muted)">Stock actual</div>
         <div style="font-weight:700">${p.tipoEmpaque==='caja_unidad'?existenciaDesglose(p):existenciaTotal(p).toLocaleString('es-GT')}</div>${p.tipoEmpaque==='caja_unidad'?`<div style="font-size:10px;color:var(--muted-2);margin-top:2px">${existenciaTotal(p).toLocaleString('es-GT')} und en total</div>`:''}</div>
     </div>
     <div style="max-height:48vh;overflow-y:auto;border:1px solid var(--line);border-radius:8px">
       <table style="width:100%;border-collapse:collapse;font-size:13px">
         <thead><tr style="background:var(--surface-2);position:sticky;top:0">
           <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted)">FECHA</th>
           <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted)">TIPO</th>
           <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted)">DOCUMENTO</th>
           <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted)">DETALLE</th>
           <th style="text-align:right;padding:8px 10px;font-size:11px;color:var(--muted)">${(p.tipoEmpaque==='caja_unidad'||p.tipoEmpaque==='caja')?'CAJAS':'UNIDADES'}</th>
         </tr></thead>
         <tbody>${filas}</tbody>
       </table>
     </div>
     <div class="note n-ok" style="margin-top:12px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>Entradas = compras recibidas. Salidas = pedidos y facturas. Los documentos anulados no se cuentan.</span></div>`,
    null);
  // Modal solo de lectura: ocultar botón Guardar
  const sv=$('#m-save');if(sv)sv.style.display='none';
};


// Desactivar producto (lo oculta pero conserva todo su historial)
function desactivarProducto(id){
  if(!canEditInventario()){toast('Sin permiso','Solo Admin, Gerencia y Bodega editan inventario',true);return;}
  const p=productos.find(x=>x.id===id);if(!p)return;
  openMod('Desactivar producto',
    `<div class="note" style="background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2);margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span><b>${p.nombre}</b> (${p.codigo}) dejará de aparecer en pedidos y listas, pero <b>su historial en facturas y compras queda intacto</b>. Lo podés reactivar cuando quieras.</span></div>`,
    ()=>{
      p.activo=false;
      logAudit('Producto desactivado',p.nombre+' · '+p.codigo);
      closeMod();renderProd();
      toast('✓ Producto desactivado',p.nombre);
      if(typeof guardarProducto==='function')guardarProducto(p);
    });
  $('#m-save').textContent='Desactivar';$('#m-save').className='btn btn-primary';$('#m-save').style.background='var(--warn)';
}
window.desactivarProducto=desactivarProducto;

function reactivarProducto(id){
  if(!canEditInventario()){toast('Sin permiso',null,true);return;}
  const p=productos.find(x=>x.id===id);if(!p)return;
  p.activo=true;
  logAudit('Producto reactivado',p.nombre+' · '+p.codigo);
  renderProd();
  toast('✓ Producto reactivado',p.nombre);
  if(typeof guardarProducto==='function')guardarProducto(p);
}
window.reactivarProducto=reactivarProducto;

// Convertir cajas cerradas en unidades sueltas
function convertirCajas(id){
  if(!canConvertir()){toast('Sin permiso','No tenés permiso para convertir cajas a unidades',true);return;}
  const p=productos.find(x=>x.id===id);if(!p||p.tipoEmpaque!=='caja_unidad')return;
  const upc=p.unidadesPorCaja||0;
  if(!(upc>0)){toast('Configuración incompleta','Este producto no tiene definidas las unidades por caja',true);return;}
  if((p.stockCajas||0)<=0){toast('Sin cajas disponibles','No hay cajas cerradas para convertir',true);return;}
  openMod('Convertir a unidades · '+p.nombre,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">Cajas disponibles: <b style="color:var(--ink)">${p.stockCajas}</b> · Cada caja trae <b style="color:var(--ink)">${upc} ${p.unidad}</b><br>Unidades sueltas actuales: <b style="color:var(--ink)">${p.stock}</b></p>
     <div class="row"><div><label>¿Cuántas cajas convertir?</label><input id="cv-cajas" type="number" min="1" max="${p.stockCajas}" value="1" oninput="cvPreview(${id})"></div></div>
     <div class="note n-ok" id="cv-preview" style="margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span></span></div>`,
    ()=>{
      const n=Number($('#cv-cajas').value);
      if(!(n>0)){toast('Indicá cuántas cajas',null,true);return;}
      if(n>p.stockCajas){toast('No hay tantas cajas','Solo tenés '+p.stockCajas+' cajas',true);return;}
      p.stockCajas-=n;
      p.stock+=n*upc;
      // Registrar la conversión para que aparezca en el cardex (trazabilidad de cuándo se rompió una caja)
      if(!Array.isArray(p.conversiones))p.conversiones=[];
      p.conversiones.push({fecha:new Date().toISOString(),cajas:n,unidades:n*upc,usuario:currentUser});
      logAudit('Cajas convertidas a unidades',p.nombre+' · '+n+' caja(s) → '+(n*upc)+' '+p.unidad+' · Quedan '+p.stockCajas+' cajas, '+p.stock+' unidades');
      closeMod();renderProd();
      toast('✓ Convertido',n+' caja(s) → '+(n*upc)+' '+p.unidad);
      if(typeof guardarProducto==='function')guardarProducto(p);
    });
  setTimeout(()=>cvPreview(id),0);
}
window.convertirCajas=convertirCajas;
function cvPreview(id){
  const p=productos.find(x=>x.id===id);if(!p)return;
  const n=Number($('#cv-cajas')?.value)||0;
  const upc=p.unidadesPorCaja||0;
  const span=$('#cv-preview')?.querySelector('span');if(!span)return;
  if(n>0&&n<=p.stockCajas){
    span.innerHTML=`Resultado: <b>${p.stockCajas-n} cajas</b> + <b>${p.stock+n*upc} ${p.unidad}</b> (se agregan ${n*upc} unidades)`;
  }else{
    span.textContent='Indicá una cantidad válida de cajas.';
  }
}
window.cvPreview=cvPreview;

// ---- Reportería ----
let repPeriod='mesant',repType='resumen';
let repFiltros={cliente:'',vendedores:[],proveedor:'',soloVencidos:false,tiempoCredito:'',metodoRec:'',marca_prod:'',producto:'',cuentaBanco:'',categoria:''};
function repRange(){
  const d=$('#rep-desde')?.value,h=$('#rep-hasta')?.value;
  if(d||h)return {start:d?new Date(d+'T00:00:00'):new Date(0),end:h?new Date(h+'T23:59:59'):new Date('2999-01-01')};
  const n=new Date();let start;
  if(repPeriod==='mes')start=new Date(n.getFullYear(),n.getMonth(),1);
  else if(repPeriod==='mesant'){
    // Mes anterior completo: del día 1 al último día del mes pasado
    const start=new Date(n.getFullYear(),n.getMonth()-1,1);
    const end=new Date(n.getFullYear(),n.getMonth(),0,23,59,59); // día 0 del mes actual = último día del mes anterior
    return {start,end};
  }
  else if(repPeriod==='3m'){
    // Últimos 3 meses COMPLETOS anteriores (sin el mes en curso). Ej. en julio: abril, mayo, junio
    const start=new Date(n.getFullYear(),n.getMonth()-3,1);
    const end=new Date(n.getFullYear(),n.getMonth(),0,23,59,59); // día 0 del mes actual = último día del mes anterior
    return {start,end};
  }
  else if(repPeriod==='anio')start=new Date(n.getFullYear(),0,1);
  else start=new Date(0);
  return {start,end:new Date('2999-01-01')};
}
function enRango(iso,r){const t=new Date(iso);return t>=r.start&&t<=r.end;}
// Etiqueta legible del RANGO DE FECHAS seleccionado, para estampar en los
// reportes generados (PDF y Excel). Si hay fechas manuales (desde/hasta) las
// usa; si no, arma el rango real del período elegido (mes, mes anterior, etc.).
function repRangoLabel(){
  const d=$('#rep-desde')?.value, h=$('#rep-hasta')?.value;
  if(d&&h)return 'Del '+fdate(d)+' al '+fdate(h);
  if(d)return 'Desde '+fdate(d);
  if(h)return 'Hasta '+fdate(h);
  const r=repRange();
  const sinIni=r.start.getFullYear()<=1970;
  const sinFin=r.end.getFullYear()>=2999;
  if(sinIni&&sinFin)return 'Todo el historial';
  if(sinFin)return 'Desde '+fdate(r.start);
  if(sinIni)return 'Hasta '+fdate(r.end);
  return 'Del '+fdate(r.start)+' al '+fdate(r.end);
}
window.repRangoLabel=repRangoLabel;
function setRepPeriod(p){repPeriod=p;$('#rep-desde').value='';$('#rep-hasta').value='';document.querySelectorAll('#rep-period .rep-tab').forEach(b=>b.classList.toggle('on',b.dataset.p===p));renderReportes();}
window.toggleEstcta=function(i){const det=document.getElementById('estcta-det-'+i),arr=document.getElementById('estcta-arrow-'+i);if(!det)return;const abierto=det.style.display!=='none';det.style.display=abierto?'none':'table-row';if(arr)arr.textContent=abierto?'▸':'▾';};
window.setRepPeriod=setRepPeriod;
// Cambia entre monto (Q) y cantidad en la Comparativa producto/mes.
function setRepMetrica(m){repFiltros.prodMetrica=m;renderReportes();}
window.setRepMetrica=setRepMetrica;
function toggleVend(nombre){const i=repFiltros.vendedores.indexOf(nombre);if(i>=0)repFiltros.vendedores.splice(i,1);else repFiltros.vendedores.push(nombre);renderRepFilters();renderReportes();}
window.toggleVend=toggleVend;
function setRepFiltro(k,v){repFiltros[k]=v;renderReportes();}
window.setRepFiltro=setRepFiltro;
// Filtros escribibles: el usuario teclea el nombre (label) y aquí se resuelve al valor guardado.
let _repSelOpts={};
function setRepFiltroBusca(k,id){
  const inp=document.getElementById(id);if(!inp)return;
  const txt=(inp.value||'').trim();
  const opts=_repSelOpts[k]||[];
  if(!txt){setRepFiltro(k,'');return;}
  let hit=opts.find(o=>(o.l||'').toLowerCase()===txt.toLowerCase());
  if(!hit){const part=opts.filter(o=>(o.l||'').toLowerCase().includes(txt.toLowerCase()));if(part.length===1)hit=part[0];}
  setRepFiltro(k,hit?hit.v:'');
}
window.setRepFiltroBusca=setRepFiltroBusca;
function renderRepFilters(){
  const f=$('#rep-filters');if(!f)return;
  let html='';
  const sel=(id,lbl,opts,val,k)=>{
    _repSelOpts[k]=opts;
    const cur=opts.find(o=>o.v===val);
    const dl=opts.map(o=>`<option value="${(o.l||'').replace(/"/g,'&quot;')}"></option>`).join('');
    return `<div><label>${lbl}</label><input list="${id}-dl" id="${id}" style="margin-top:4px" placeholder="Todos — escribí para buscar" value="${cur?(cur.l||'').replace(/"/g,'&quot;'):''}" onchange="setRepFiltroBusca('${k}','${id}')"><datalist id="${id}-dl">${dl}</datalist></div>`;
  };
  if(repType==='resumen'||repType==='costos'||repType==='producto'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    if(repType!=='producto')html+=sel('rf-cli','Cliente',cliOpts,repFiltros.cliente,'cliente');
    if(repType!=='producto')html+=sel('rf-vend','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple');
    if(repType==='producto'){
      // Filtros de cliente y marca para el reporte de ventas por producto
      html+=sel('rf-cli-prod','Cliente',cliOpts,repFiltros.cliente,'cliente');
      const marcas=[...new Set(productos.map(p=>p.marca).filter(m=>m&&m.trim()))].sort((a,b)=>a.localeCompare(b,'es'));
      const marcaOpts=marcas.map(m=>({v:m,l:m}));
      html+=sel('rf-marca','Marca',marcaOpts,repFiltros.marca_prod,'marca_prod');
    }
    html=`<div class="rep-filter-bar">${html}</div>`;
  }
  else if(repType==='vendedor'){
    const nombresV=[...new Set(documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada').map(d=>d.vendedorNombre||'Sin asignar'))].sort((a,b)=>a.localeCompare(b,'es'));
    const checks=nombresV.map(n=>`<button class="vend-chk ${repFiltros.vendedores.includes(n)?'on':''}" onclick="toggleVend('${n.replace(/'/g,"\\'")}')">${n}</button>`).join('');
    html=`<div class="rep-filter-bar"><div style="width:100%"><label>Vendedores a comparar <span style="color:var(--muted-2);font-weight:400">(seleccioná uno o más — vacío muestra todos)</span></label><div class="vend-checks">${checks}</div></div></div>`;
  }
  else if(repType==='cprov'||repType==='cprod'){
    const provOpts=proveedores.map(p=>({v:String(p.id),l:p.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-prov','Proveedor',provOpts,repFiltros.proveedor,'proveedor')}</div>`;
  }
  else if(repType==='cliprod'){
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    html=`<div class="rep-filter-bar">
      ${sel('rf-vend-cp','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple')}
      ${sel('rf-cli-cp','Cliente',cliOpts,repFiltros.cliente,'cliente')}
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(true)" title="Expandir todo">⊞ Expandir</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(false)" title="Colapsar todo">⊟ Colapsar</button>
      </div>
    </div>`;
  }
  else if(repType==='climes'){
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-vend-cm','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple')}
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(true)" title="Expandir todo">⊞ Expandir</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(false)" title="Colapsar todo">⊟ Colapsar</button>
      </div>
    </div>`;
  }
  else if(repType==='climescomp'||repType==='comision'){
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    // En la Comparativa cliente/mes se puede ordenar por Total (default) o por
    // la diferencia del último mes vs. el anterior: "Más creció" / "Más cayó".
    const ordCC=repType==='climescomp'?`<div><label>Ordenar por</label><select style="margin-top:4px;height:34px" onchange="setRepFiltro('climescompOrden',this.value)"><option value="total"${(repFiltros.climescompOrden||'total')==='total'?' selected':''}>Total</option><option value="crecio"${repFiltros.climescompOrden==='crecio'?' selected':''}>Más creció</option><option value="cayo"${repFiltros.climescompOrden==='cayo'?' selected':''}>Más cayó</option></select></div>`:'';
    html=`<div class="rep-filter-bar">${sel('rf-vend-cc','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple')}${sel('rf-cli-cc','Cliente',cliOpts,repFiltros.cliente,'cliente')}${ordCC}</div>`;
  }
  else if(repType==='prodmescomp'){
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-vend-pm','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple')}${sel('rf-cli-pm','Cliente',cliOpts,repFiltros.cliente,'cliente')}
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(true)" title="Expandir todo">⊞ Expandir</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(false)" title="Colapsar todo">⊟ Colapsar</button>
      </div>
    </div>`;
  }
  else if(repType==='retenciones'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-cli-ret','Cliente',cliOpts,repFiltros.cliente,'cliente')}</div>`;
  }
  else if(repType==='dircli'){
    const vendOpts=vendedores.map(v=>({v:v.nombre,l:v.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-vend-dc','Vendedor',vendOpts,repFiltros.vendedor_simple||'','vendedor_simple')}
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(true)" title="Expandir todo">⊞ Expandir</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleTodosGrupos(false)" title="Colapsar todo">⊟ Colapsar</button>
      </div>
    </div>`;
  }
  else if(repType==='factem'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-cli-fe','Cliente',cliOpts,repFiltros.cliente,'cliente')}</div>`;
  }
  else if(repType==='cardex'){
    const prodOpts=productos.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es')).map(p=>({v:String(p.id),l:`${p.codigo} — ${p.nombre}`}));
    html=`<div class="rep-filter-bar">${sel('rf-prod-cx','Producto (dejá "Todos" para ver el listado general)',prodOpts,repFiltros.producto||'','producto')}</div>`;
  }
  else if(repType==='cxc'||repType==='estcta'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    const tcOpts=[{v:'0',l:'Contado'},{v:'15',l:'15 días'},{v:'30',l:'30 días'},{v:'45',l:'45 días'},{v:'60',l:'60 días'}];
    html=`<div class="rep-filter-bar">
      ${sel('rf-cli2','Cliente',cliOpts,repFiltros.cliente,'cliente')}
      ${sel('rf-tc','Tiempo de crédito',tcOpts,repFiltros.tiempoCredito,'tiempoCredito')}
      <div><label>Solo vencidos</label><label style="display:flex;align-items:center;gap:7px;margin-top:8px;font-size:13px;font-weight:500;cursor:pointer"><input type="checkbox" ${repFiltros.soloVencidos?'checked':''} style="width:auto;margin:0" onchange="setRepFiltro('soloVencidos',this.checked)">Mostrar solo vencidos</label></div>
    </div>`;
  }
  else if(repType==='factabo'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    html=`<div class="rep-filter-bar">${sel('rf-cli-fa','Cliente',cliOpts,repFiltros.cliente,'cliente')}</div>`;
  }
  else if(repType==='recibos'||repType==='pagos'){
    const cliOpts=clientes.map(c=>({v:String(c.id),l:c.nombre}));
    const metOpts=[{v:'Efectivo',l:'Efectivo'},{v:'Transferencia',l:'Transferencia'},{v:'Cheque',l:'Cheque'},{v:'Depósito',l:'Depósito'},{v:'Tarjeta',l:'Tarjeta'}];
    html=`<div class="rep-filter-bar">
      ${sel('rf-cli-rec','Cliente',cliOpts,repFiltros.cliente,'cliente')}
      ${sel('rf-met-rec','Método de pago',metOpts,repFiltros.metodoRec||'','metodoRec')}
    </div>`;
  }
  else if(repType==='banco'){
    const ctaOpts=(typeof cuentasBanco!=='undefined'?cuentasBanco:[]).map(c=>({v:String(c.id),l:c.nombre}));
    const catOpts=(typeof CAT_MOV_LBL!=='undefined'?Object.keys(CAT_MOV_LBL):[]).map(k=>({v:k,l:CAT_MOV_LBL[k]}));
    html=`<div class="rep-filter-bar">
      ${sel('rf-cta-bco','Cuenta',ctaOpts,repFiltros.cuentaBanco,'cuentaBanco')}
      ${sel('rf-cat-bco','Categoría',catOpts,repFiltros.categoria,'categoria')}
    </div>`;
  }
  else if(repType==='invactual'||repType==='invcosto'){
    const marcas=[...new Set(productos.filter(p=>p.activo!==false).map(p=>p.marca).filter(m=>m&&m.trim()))].sort((a,b)=>a.localeCompare(b,'es'));
    const marcaOpts=marcas.map(m=>({v:m,l:m}));
    html=`<div class="rep-filter-bar">${sel('rf-marca-inv','Marca',marcaOpts,repFiltros.marca_prod,'marca_prod')}<div><label>Existencias al día</label><input type="date" style="margin-top:4px" value="${repFiltros.invFecha||fechaHoyGT()}" onchange="setRepFiltro('invFecha',this.value)"></div></div>`;
  }
  else if(repType==='invmov'){
    // Movimiento de inventario: usa la barra de período de arriba; acá sólo el filtro por marca.
    const marcas=[...new Set(productos.filter(p=>p.activo!==false).map(p=>p.marca).filter(m=>m&&m.trim()))].sort((a,b)=>a.localeCompare(b,'es'));
    const marcaOpts=marcas.map(m=>({v:m,l:m}));
    html=`<div class="rep-filter-bar">${sel('rf-marca-invmov','Marca',marcaOpts,repFiltros.marca_prod,'marca_prod')}</div>`;
  }
  f.innerHTML=html;
}
function bindRep(){
  // Mostrar/ocultar pestañas de reportes según los permisos del rol
  let primeraVisible=null;
  document.querySelectorAll('#rep-types .ct-tab').forEach(b=>{
    const permitido=puedeVerReporte(b.dataset.r);
    b.style.display=permitido?'':'none';
    if(permitido&&!primeraVisible)primeraVisible=b.dataset.r;
  });
  if(!puedeVerReporte(repType)&&primeraVisible){
    repType=primeraVisible;
    document.querySelectorAll('#rep-types .ct-tab').forEach(x=>x.classList.toggle('on',x.dataset.r===repType));
  }
  document.querySelectorAll('#rep-period .rep-tab').forEach(b=>b.onclick=()=>setRepPeriod(b.dataset.p));
  document.querySelectorAll('#rep-types .ct-tab').forEach(b=>b.onclick=()=>{repType=b.dataset.r;repFiltros={cliente:'',vendedores:[],proveedor:'',soloVencidos:false,tiempoCredito:'',marca_prod:'',producto:''};gruposColapsados={};document.querySelectorAll('#rep-types .ct-tab').forEach(x=>x.classList.toggle('on',x===b));renderRepFilters();renderReportes();});
  ['rep-desde','rep-hasta'].forEach(id=>{const e=$('#'+id);if(e)e.onchange=()=>{document.querySelectorAll('#rep-period .rep-tab').forEach(b=>b.classList.remove('on'));renderReportes();};});
}
const kpiHTML=k=>k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub||''}</div></div>`).join('');
const hbars=arr=>{const max=Math.max(1,...arr.map(x=>x.v));return arr.length?arr.map(x=>`<div class="hbar-row"><div class="hbar-name">${x.n}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(x.v/max*100)}%;${x.c?'background:'+x.c:''}"></div></div><div class="hbar-val num">${money(x.v)}</div></div>`).join(''):'<div class="empty">Sin datos en el período</div>';};
function mesesEje(docs,getF){
  let min=null,max=null;
  docs.forEach(d=>{const t=new Date(getF(d));if(isNaN(t))return;if(!min||t<min)min=t;if(!max||t>max)max=t;});
  if(!min){const n=new Date();min=new Date(n.getFullYear(),n.getMonth()-5,1);max=n;}
  const multiAnio=max.getFullYear()!==min.getFullYear();
  const meses=[];let y=min.getFullYear(),m=min.getMonth();const ey=max.getFullYear(),em=max.getMonth();let g=0;
  while((y<ey||(y===ey&&m<=em))&&g<240){
    meses.push({key:y+'-'+m,lbl:new Date(y,m,1).toLocaleDateString('es-GT',{month:'short'})+(multiAnio?' '+String(y).slice(2):''),v:0});
    m++;if(m>11){m=0;y++;}g++;
  }
  return meses;
}
function mesesSerie(docs,getF,getV,eje){
  const meses=(eje||mesesEje(docs,getF)).map(x=>({key:x.key,lbl:x.lbl,v:0}));
  docs.forEach(d=>{const dt=new Date(getF(d));const m=meses.find(x=>x.key===dt.getFullYear()+'-'+dt.getMonth());if(m)m.v+=getV(d);});
  return meses;
}
const barsHTML=(meses,fmt)=>{const max=Math.max(1,...meses.map(m=>m.v));return `<div class="bars">${meses.map((m,i)=>`<div class="bcol"><div class="bval num">${m.v?(fmt?fmt(m.v):Math.round(m.v/1000)+'k'):''}</div><div class="bar ${i===meses.length-1?'alt':''}" style="height:${Math.round(m.v/max*100)}%"></div><div class="blbl">${m.lbl}</div></div>`).join('')}</div>`;};

// colores por vendedor
const VEND_COLORS=['#173916','#446084','#7f9a26','#7A4A9E','#9A6B07','#BE4326'];
let repLastData=[];// para exportación
let gruposColapsados={};// estado de grupos colapsados en cliprod (key -> true si colapsado)

// Colapsar/expandir un grupo del reporte cliente/producto
window.toggleGrupo=function(key){
  gruposColapsados[key]=!gruposColapsados[key];
  aplicarColapso();
};
// Expandir o colapsar todos los grupos
window.toggleTodosGrupos=function(expandir){
  // Recolectar todas las keys de grupo presentes
  document.querySelectorAll('#rep-body [data-grupo-key]').forEach(el=>{
    const k=el.getAttribute('data-grupo-key');
    gruposColapsados[k]=!expandir;
  });
  aplicarColapso();
};
// Aplica el estado de colapso a las filas (muestra/oculta)
function aplicarColapso(){
  // Vendedores: ocultan todo lo que tenga data-vend=ese vendedor
  document.querySelectorAll('#rep-body tr[data-pertenece]').forEach(tr=>{
    const vend=tr.getAttribute('data-vend');
    const cli=tr.getAttribute('data-cli');
    const vendColapsado=vend&&gruposColapsados['V:'+vend];
    const cliColapsado=cli&&gruposColapsados['C:'+vend+'|'+cli];
    // Una fila se oculta si su vendedor está colapsado, o si es fila de cliente/producto y su cliente está colapsado
    tr.style.display=(vendColapsado||cliColapsado)?'none':'';
  });
  // Actualizar los íconos de flecha
  document.querySelectorAll('#rep-body [data-grupo-key]').forEach(el=>{
    const k=el.getAttribute('data-grupo-key');
    const flecha=el.querySelector('.flecha-grupo');
    if(flecha)flecha.textContent=gruposColapsados[k]?'▸':'▾';
  });
}
window.aplicarColapso=aplicarColapso;


// Movimientos de inventario (entradas de compras, salidas de documentos) con fecha POSTERIOR al corte.
// Se usa para reconstruir el stock que había a una fecha: stockHoy - entradas_después + salidas_después.
function _movsInvDespuesDe(corte){
  const m={};
  // Índice de productos por código, para saber el empaque de cada movimiento
  const porCod={};productos.forEach(p=>{if(p.codigo)porCod[p.codigo]=p;});
  // Normaliza toda cantidad a UNIDADES. En caja_unidad, las compras (recibido)
  // y las ventas POR CAJA vienen en cajas; las ventas por unidad ya vienen en unidades.
  const aUnidades=(cod,cant,modo)=>{
    const p=porCod[cod];
    if(p&&p.tipoEmpaque==='caja_unidad'&&modo!=='unidad')return cant*(Number(p.unidadesPorCaja)||1);
    return cant;
  };
  const add=(cod,campo,cant)=>{if(!cod)return;(m[cod]=m[cod]||{entra:0,sale:0})[campo]+=cant;};
  documentos.forEach(d=>{if(d.estado==='anulada'||d.anulado)return;if((d.creada||'').slice(0,10)<=corte)return;(d.items||[]).forEach(it=>add(it.codigo,'sale',aUnidades(it.codigo,Number(it.cantidad)||0,it.modoVenta||'unidad')));});
  compras.forEach(c=>{if(c.anulado)return;if((c.fecha||'').slice(0,10)<=corte)return;(c.items||[]).forEach(it=>{const r=Number(it.recibido||0);if(r>0)add(it.codigo,'entra',aUnidades(it.codigo,r,'caja'));});});
  return m;
}
// Agrega un buscador ("Buscar en la tabla…") a cada tabla de reporte. Se omite en los
// reportes agrupados/colapsables (cliprod, dircli, climes), donde chocaría con expandir/colapsar.
function enhanceRepTables(){
  if(['cliprod','dircli','climes','estcta','vendedor','climescomp','prodmescomp'].includes(repType))return;
  const body=document.getElementById('rep-body');if(!body)return;
  let i=0;
  body.querySelectorAll('table').forEach(table=>{
    if(table.closest('td'))return; // no enganchar tablas de detalle anidadas (dentro de una celda)
    const tb=table.querySelector('tbody');if(!tb)return;
    if(tb.querySelectorAll('tr').length<5)return; // tablas chicas no necesitan buscador
    if(!tb.id)tb.id='rep-tbl-'+(i++);
    enhanceTable(tb.id,{sort:false});
  });
}
// Agrega una fila de TOTALES al pie de cada tabla de reporte (suma columnas numéricas).
// Salta tablas jerárquicas (con colspan) o que ya tienen totales, y columnas de %, precios unitarios o fechas.
function agregarTotalesReportes(){
  const cont=document.getElementById('rep-body'); if(!cont)return;
  const parseNum=t=>{const n=parseFloat(String(t).replace(/[^0-9.\-]/g,''));return isNaN(n)?null:n;};
  cont.querySelectorAll('table').forEach(tbl=>{
    if(tbl.dataset.totales)return;
    const thead=tbl.querySelector('thead'), tbody=tbl.querySelector('tbody');
    if(!thead||!tbody)return;
    const headRow=thead.querySelector('tr'); if(!headRow)return;
    const heads=[...headRow.children].map(th=>(th.textContent||'').toLowerCase());
    const nCols=heads.length;
    const rows=[...tbody.querySelectorAll(':scope > tr')];
    const tieneColspan=rows.some(r=>[...r.children].some(td=>Number(td.getAttribute('colspan')||1)>1));
    const yaTotal=rows.some(r=>/^\s*(sub)?total(es)?\b/i.test((r.children[0]?.textContent||'').trim()));
    if(tieneColspan||yaTotal)return;
    const datos=rows.filter(r=>r.children.length===nCols);
    if(datos.length<2)return;
    const skip=c=>{const h=heads[c]||'';return h.includes('%')||h.includes('unitari')||h.includes('precio lista')||h.includes('fecha')||h.includes('día')||h.includes('dias');};
    const sums=new Array(nCols).fill(null), esMoney=new Array(nCols).fill(false);
    for(let c=1;c<nCols;c++){
      if(skip(c))continue;
      let ok=true, any=false, total=0, money_=false;
      for(const r of datos){
        const cell=r.children[c]; if(!cell){ok=false;break;}
        const raw=(cell.textContent||'').trim();
        if(!raw||raw==='—')continue;
        if(!cell.classList.contains('num')){ok=false;break;}
        if(raw.includes('%')){ok=false;break;}
        if(/Q/i.test(raw))money_=true;
        const n=parseNum(raw); if(n===null){ok=false;break;}
        total+=n; any=true;
      }
      if(ok&&any){sums[c]=total;esMoney[c]=money_;}
    }
    if(!sums.some(s=>s!==null))return;
    const tr=document.createElement('tr');
    tr.dataset.totalsRow='1';
    tr.style.cssText='font-weight:700;border-top:2px solid var(--line-strong);background:var(--surface-2)';
    for(let c=0;c<nCols;c++){
      const td=document.createElement('td');
      if(c===0)td.textContent='TOTALES';
      else if(sums[c]!==null){td.className='num';td.textContent=esMoney[c]?money(sums[c]):(Math.round(sums[c]*100)/100).toLocaleString('es-GT');}
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    tbl.dataset.totales='1';
  });
}
// Hace ordenables las tablas de reporte al hacer clic en el encabezado.
// Las planas además tienen buscador y sincronizan el orden con el Excel.
// Las agrupadas (con grupos y subtotales) se ordenan por corridas de datos
// sin romper la jerarquía; ahí no va buscador ni sync con Excel.
function prepararOrdenReportes(){
  const cont=document.getElementById('rep-body'); if(!cont)return;
  cont.querySelectorAll('table').forEach((tbl,ti)=>{
    if(tbl.dataset.ordenable)return;
    if(tbl.closest('td'))return; // no enganchar tablas anidadas (detalles dentro de una celda)
    const thead=tbl.querySelector('thead'), tbody=tbl.querySelector('tbody');
    if(!thead||!tbody)return;
    const rows=[...tbody.querySelectorAll(':scope > tr')];
    // Filas de datos = las que NO son estructura (encabezados de grupo,
    // subtotales, totales, separadores).
    const dataRows=rows.filter(r=>!_esFilaEstructural(r));
    if(dataRows.length<2)return;
    // ¿Es agrupada? Sólo cuenta como agrupada si hay bandas de grupo
    // (data-grupo-key) o filas con colspan (encabezados/separadores de sección);
    // una simple fila de "Total" al pie NO la vuelve agrupada. En las agrupadas
    // no va buscador ni sync con Excel (el orden en pantalla puede no
    // corresponder 1:1 con repLastData).
    const esAgrupada=rows.some(r=>r.hasAttribute('data-grupo-key')||[...r.children].some(td=>Number(td.getAttribute('colspan')||1)>1));
    // Sincronización con el Excel solo si hay 1 fila de datos por registro.
    const puedeSync=!esAgrupada&&Array.isArray(repLastData)&&repLastData.length===dataRows.length;
    if(puedeSync)dataRows.forEach((r,i)=>{r.dataset.ri=String(i);});
    if(!tbody.id)tbody.id='rep-tbody-'+ti;
    tbl.dataset.ordenable='1';
    enhanceTable(tbody.id,{noSearch:esAgrupada,onSort:()=>{
      // La fila de TOTALES siempre al final
      const tot=tbody.querySelector('tr[data-totals-row]'); if(tot)tbody.appendChild(tot);
      // Reordenar repLastData según el nuevo orden de pantalla (para que el Excel lo siga)
      if(puedeSync){
        const orden=[...tbody.querySelectorAll(':scope > tr[data-ri]')].map(r=>repLastData[Number(r.dataset.ri)]);
        if(orden.length===repLastData.length&&orden.every(x=>x!=null)){repLastData.length=0;repLastData.push(...orden);}
      }
    }});
  });
}
