function dividirCompraItems(items, limite){
  const facturas=[]; let cur={items:[],total:0}; let warnUnidad=false;
  const BLOQUE=10;
  const cerrar=()=>{ if(cur.items.length){facturas.push(cur); cur={items:[],total:0};} };
  for(const it of items){
    let restante=Number(it.cantidad)||0; const costo=Number(it.costo)||0;
    if(restante<=0)continue;
    if(costo<=0){ cur.items.push({...it,cantidad:restante}); continue; } // gratis: no suma al total
    while(restante>0){
      const caben=Math.floor((limite-cur.total+1e-6)/costo);   // unidades que caben sin pasar el límite
      let tomar=Math.floor(caben/BLOQUE)*BLOQUE;                // bajamos al múltiplo de 10 que cabe
      if(tomar<=0){
        if(cur.items.length>0){ cerrar(); continue; }          // no cabe ni un bloque -> nueva factura
        tomar=Math.min(BLOQUE,restante);                       // factura vacía: forzamos un bloque (se pasa un poco)
      }
      if(tomar>restante) tomar=restante;                       // último pedazo: el sobrante (puede ser <10)
      if(cur.total+tomar*costo>limite+1e-6) warnUnidad=true;
      cur.items.push({...it,cantidad:tomar}); cur.total+=tomar*costo; restante-=tomar;
    }
  }
  cerrar();
  return {facturas,warnUnidad};
}
// Muestra la división propuesta y permite registrar las N compras.
function dividirCompraUI(){
  if(!compraCart.length){toast('Sin productos','Agregá productos a la orden primero',true);return;}
  const prov=proveedores.find(p=>p.id===Number($('#co-prov')?.value));
  if(!prov){toast('Falta el proveedor','Elegí el proveedor primero',true);return;}
  const limite=Number($('#co-limite')?.value)||0;
  if(!(limite>0)){toast('Límite inválido','Poné un máximo por factura mayor a 0',true);return;}
  const {facturas,warnUnidad}=dividirCompraItems(compraCart,limite);
  const cuerpo=facturas.map((fac,i)=>{
    const total=fac.items.reduce((s,it)=>s+it.cantidad*it.costo,0);
    return `<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:12.5px;margin-bottom:6px"><span>Factura ${i+1}</span><span class="num">${money(total)}</span></div>
      ${fac.items.map(it=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted)"><span>${it.nombre} × ${it.cantidad}</span><span class="num">${money(it.cantidad*it.costo)}</span></div>`).join('')}</div>`;
  }).join('');
  const totalGen=facturas.reduce((s,f)=>s+f.items.reduce((ss,it)=>ss+it.cantidad*it.costo,0),0);
  openMod('Dividir orden en '+facturas.length+' factura'+(facturas.length!==1?'s':''),
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Cantidades en múltiplos de 10, apuntando a <b>${money(limite)}</b> por factura. Total: <b>${money(totalGen)}</b> repartido en <b>${facturas.length}</b> compra(s).</p>
     ${warnUnidad?`<div class="note" style="margin-bottom:10px;background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>Para mantener las cantidades en múltiplos de 10, alguna factura pasa un poco del límite.</span></div>`:''}
     ${cuerpo}`,
    ()=>registrarCompraDividida(facturas));
  const _b=$('#m-save'); if(_b){_b.className='btn btn-primary';_b.textContent='Registrar las '+facturas.length+' compras';}
}
window.dividirCompraUI=dividirCompraUI;
function registrarCompraDividida(facturas){
  const prov=proveedores.find(p=>p.id===Number($('#co-prov')?.value)); if(!prov)return;
  const fecha=$('#co-fecha')?.value?new Date($('#co-fecha').value+'T12:00:00').toISOString():new Date().toISOString();
  const ref=($('#co-doc')?.value||'').trim();
  const creadas=[];
  facturas.forEach((fac,idx)=>{
    const total=fac.items.reduce((s,it)=>s+it.cantidad*it.costo,0);
    const c={id:compN++,proveedorId:prov.id,proveedorNombre:prov.nombre,
      items:fac.items.map(it=>({...it,recibido:0})),
      total,fecha,referencia:(ref?ref+' · ':'')+'parte '+(idx+1)+'/'+facturas.length,
      estadoRecepcion:'pendiente',facturada:false,docProv:'',tipoPago:null,diasCredito:0,vencimiento:null,abonos:[],
      especial:false,mes:null,oficializada:false,_nuevo:true};
    compras.push(c); if(typeof guardarCompra==='function')guardarCompra(c); creadas.push(c);
  });
  logAudit('Orden dividida en '+facturas.length+' compras',prov.nombre+' · '+creadas.map(c=>'CMP-'+padn(c.id)).join(', '));
  toast('✓ Orden dividida','Se crearon '+facturas.length+' compras (cada una ≤ límite)');
  compraCart=[];$('#co-doc').value='';renderCompraForm();cerrarTodo();go('compras');
}
window.registrarCompraDividida=registrarCompraDividida;

// ---- Editar compra especial ----
function editarCompraEspecial(id){
  const c=compras.find(x=>x.id===id);if(!c||!c.especial||c.oficializada)return;
  const ahora=new Date();const mesActual=ahora.getFullYear()+'-'+(ahora.getMonth()+1);
  if(c.mes!==mesActual){toast('✗ Compra especial vencida','Solo se puede editar durante el mes de creación',true);return;}

  const opts=productos.map(p=>`<option value="${p.skuProveedor||p.codigo} — ${p.nombreProveedor||p.nombre}">`).join('');
  const rows=()=>c.items.map((it,i)=>`<tr>
    <td style="font-weight:600">${it.nombreProveedor||it.nombre}<div style="font-size:10.5px;color:var(--muted)">${it.skuProveedor||it.codigo}</div></td>
    <td><input type="number" min="1" value="${it.cantidad}" style="width:70px;text-align:right" onchange="updEspecialItem(${id},${i},this.value)"></td>
    <td class="num" style="color:var(--muted)">${money(it.costo)}</td>
    <td class="num" style="font-weight:600">${money(it.cantidad*it.costo)}</td>
    <td><button class="x" onclick="quitarEspecialItem(${id},${i})">×</button></td>
  </tr>`).join('');

  openMod('Editar compra especial · CMP-'+padn(c.id),`
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">${c.proveedorNombre} · Los cambios de cantidad ajustan el inventario en tiempo real.</p>
    <div style="display:flex;gap:8px;margin-bottom:13px">
      <input id="esp-add" list="esp-add-list" placeholder="Agregar producto…" autocomplete="off" style="flex:1">
      <datalist id="esp-add-list">${opts}</datalist>
      <button class="btn btn-primary btn-sm" onclick="addEspecialItem(${id})">Agregar</button>
    </div>
    <table style="width:100%;border-collapse:collapse"><thead><tr>
      <th style="text-align:left;font-size:10.5px;color:var(--muted-2);padding:6px 0;border-bottom:1px solid var(--line)">Producto</th>
      <th style="text-align:right;font-size:10.5px;color:var(--muted-2);padding:6px 0">Cant.</th>
      <th style="text-align:right;font-size:10.5px;color:var(--muted-2);padding:6px 0">Costo</th>
      <th style="text-align:right;font-size:10.5px;color:var(--muted-2);padding:6px 0">Subtotal</th>
      <th></th>
    </tr></thead><tbody id="esp-rows">${rows()}</tbody></table>`,
    ()=>closeMod());
  $('#m-save').textContent='Cerrar';$('#m-save').className='btn btn-ghost';
}
window.editarCompraEspecial=editarCompraEspecial;

function updEspecialItem(compraId,idx,val){
  const c=compras.find(x=>x.id===compraId);if(!c)return;
  const it=c.items[idx];if(!it)return;
  const nuevaCant=Math.max(1,Number(val)||1);
  const delta=nuevaCant-it.cantidad;
  const prod=productos.find(p=>p.id===it.id);
  if(prod)aplicarStock(prod,delta,'caja');
  it.cantidad=nuevaCant;it.recibido=nuevaCant;
  c.total=c.items.reduce((s,x)=>s+x.cantidad*x.costo,0);
  if(delta&&prod)logAudit('Inventario · compra especial','CMP-'+padn(compraId)+' · '+(it.nombreProveedor||it.nombre)+' · '+(delta>0?'+':'')+delta+' und → stock '+prod.stock);
  if(typeof guardarCompra==='function')guardarCompra(c);
  $('#esp-rows').innerHTML=c.items.map((it,i)=>`<tr>
    <td style="font-weight:600">${it.nombreProveedor||it.nombre}</td>
    <td><input type="number" min="1" value="${it.cantidad}" style="width:70px;text-align:right" onchange="updEspecialItem(${compraId},${i},this.value)"></td>
    <td class="num" style="color:var(--muted)">${money(it.costo)}</td>
    <td class="num" style="font-weight:600">${money(it.cantidad*it.costo)}</td>
    <td><button class="x" onclick="quitarEspecialItem(${compraId},${i})">×</button></td>
  </tr>`).join('');
}
window.updEspecialItem=updEspecialItem;

function quitarEspecialItem(compraId,idx){
  const c=compras.find(x=>x.id===compraId);if(!c)return;
  const it=c.items[idx];
  const prod=productos.find(p=>p.id===it.id);
  if(prod)aplicarStock(prod,-it.cantidad,'caja');
  logAudit('Inventario · compra especial','CMP-'+padn(compraId)+' · quitado '+(it.nombreProveedor||it.nombre)+' · -'+it.cantidad+' und → stock '+(prod?prod.stock:'?'));
  c.items.splice(idx,1);
  c.total=c.items.reduce((s,x)=>s+x.cantidad*x.costo,0);
  if(typeof guardarCompra==='function')guardarCompra(c);
  if(!c.items.length){toast('Sin productos — la compra especial quedó vacía');closeMod();renderCompras();return;}
  editarCompraEspecial(compraId);
}
window.quitarEspecialItem=quitarEspecialItem;

function addEspecialItem(compraId){
  const c=compras.find(x=>x.id===compraId);if(!c)return;
  const v=($('#esp-add').value||'').trim();if(!v)return;
  const p=productos.find(x=>`${x.skuProveedor||x.codigo} — ${x.nombreProveedor||x.nombre}`===v||x.codigo.toLowerCase()===v.toLowerCase()||x.nombre.toLowerCase().includes(v.toLowerCase()));
  if(!p){toast('✗ Producto no encontrado',null,true);return;}
  const ex=c.items.find(it=>it.id===p.id);
  if(ex){ex.cantidad++;ex.recibido++;aplicarStock(productos.find(x=>x.id===p.id),1,'caja');}
  else{c.items.push({id:p.id,codigo:p.codigo,skuProveedor:p.skuProveedor||p.codigo,nombre:p.nombre,nombreProveedor:p.nombreProveedor||p.nombre,costo:p.costo||0,cantidad:1,recibido:1});
    const prod=productos.find(x=>x.id===p.id);if(prod)aplicarStock(prod,1,'caja');}
  c.total=c.items.reduce((s,x)=>s+x.cantidad*x.costo,0);
  const _pAdd=productos.find(x=>x.id===p.id);
  logAudit('Inventario · compra especial','CMP-'+padn(compraId)+' · '+(p.nombreProveedor||p.nombre)+' · +1 und → stock '+(_pAdd?_pAdd.stock:'?'));
  if(typeof guardarCompra==='function')guardarCompra(c);
  $('#esp-add').value='';
  editarCompraEspecial(compraId);
}
window.addEspecialItem=addEspecialItem;

// ---- Oficializar compra especial ----
function oficializarCompraEspecial(id){
  const c=compras.find(x=>x.id===id);if(!c||!c.especial)return;
  c.oficializada=true;c.especial=false;
  logAudit('Compra especial oficializada','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+money(c.total));
  closeMod();renderCompras();renderPanel();
  toast('✓ Compra oficializada','CMP-'+padn(c.id)+' · ahora es una compra normal');
}
window.oficializarCompraEspecial=oficializarCompraEspecial;

// ---- Eliminar compra (sin inventario afectado — OC sin recibir) ----
function eliminarCompra(id){
  if(!canAnular()){toast('Sin permiso','Tu rol no puede eliminar compras',true);return;}
  const idx=compras.findIndex(x=>x.id===id);if(idx<0)return;
  const c=compras[idx];
  compras.splice(idx,1);
  if(typeof borrarCompra==='function')borrarCompra(id); // antes solo se quitaba de la pantalla
  logAudit('Compra eliminada','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+money(c.total));
  renderCompras();toast('✓ Compra eliminada','CMP-'+padn(c.id));
}
window.eliminarCompra=eliminarCompra;

// ---- Anular compra (revierte inventario recibido) ----
function abrirAnularCompra(id){
  const c=compras.find(x=>x.id===id);if(!c)return;
  const recibidos=c.items.filter(it=>(it.recibido||0)>0);
  const listaItems=recibidos.map(it=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px">
    <span>${it.nombre}</span>
    <span class="num" style="color:var(--danger)">−${it.recibido||it.cantidad} ${it.unidad||'UNI'}</span>
  </div>`).join('');
  openMod('Anular compra · CMP-'+padn(c.id),
    `<div class="note n-danger" style="margin-bottom:14px">
      <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <span>Esta acción revierte el inventario de todo lo recibido. Si parte de la mercadería ya se usó o vendió, el stock podría quedar negativo.</span>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${c.proveedorNombre} · ${money(c.total)}</p>
    <div style="margin-bottom:14px"><div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Inventario que se revertirá</div>${listaItems||'<p style="color:var(--muted);font-size:12.5px">Sin unidades recibidas</p>'}</div>
    <label>Motivo de anulación <span style="color:var(--danger)">*</span></label>
    <textarea id="ca-motivo" rows="3" placeholder="Ej. compra registrada al proveedor equivocado, error de precio, duplicado…" style="resize:vertical"></textarea>
    <div class="note n-danger" id="ca-err" style="display:none;margin-top:10px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>El motivo es obligatorio.</span></div>`,
    ()=>{
      const motivo=$('#ca-motivo').value.trim();
      if(!motivo){$('#ca-err').style.display='flex';return;}
      // Revertir inventario (respetando caja/unidad) y persistir el stock
      c.items.forEach(it=>{
        const cant=it.recibido||0;if(!cant)return;
        const p=productos.find(x=>x.id===it.id);
        if(p){if(p.tipoEmpaque==='caja_unidad')p.stockCajas=(p.stockCajas||0)-cant;else p.stock-=cant;if(typeof guardarProducto==='function')guardarProducto(p);}
      });
      c.anulado=true;c.motivoAnulacion=motivo;c.anuladoPor=currentUser;c.anuladoFecha=new Date().toISOString();
      // Si tenía cuenta por pagar, cerrarla con un abono de cierre (y persistirlo)
      if(c.facturada&&c.tipoPago==='credito'&&apInfo(c).saldo>0.001){
        const cierre={fecha:fechaHoyGT(),monto:apInfo(c).saldo,metodo:'Cierre por anulación',referencia:'Compra anulada',noRecibo:'—',registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false,esCierre:true};
        c.abonos.push(cierre);
        if(typeof guardarPagoProveedor==='function')guardarPagoProveedor(c.id,cierre);
      }
      if(typeof guardarCompra==='function')guardarCompra(c);
      logAudit('Compra anulada','CMP-'+padn(c.id)+' · '+c.proveedorNombre+' · '+money(c.total)+' · Motivo: '+motivo);
      cerrarTodo();renderCompras();renderPanel();
      toast('✓ Compra anulada','Inventario revertido · CMP-'+padn(c.id));
    });
  $('#m-save').textContent='Anular compra';$('#m-save').className='btn btn-primary';$('#m-save').style.background='var(--danger)';
}
window.abrirAnularCompra=abrirAnularCompra;
function renderProveedores(){$('#t-prov').innerHTML=proveedores.slice().reverse().map(p=>{
  const n=productos.filter(pr=>(pr.proveedorIds||[]).includes(p.id)).length;
  return `<tr style="cursor:pointer" onclick="abrirProveedor(${p.id})"><td style="font-weight:600">${p.nombre}</td><td style="color:var(--muted)">${p.razonSocial||'—'}</td><td class="num">${p.nit||'—'}</td><td style="color:var(--muted)">${p.telefono||'—'}</td><td>${p.diasCredito>0?p.diasCredito+' días':'Contado'}</td><td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();abrirProveedor(${p.id},'productos')">${n} producto${n===1?'':'s'}</button></td><td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openProveedor(${p.id})">Editar</button></td></tr>`;}).join('');enhanceTable('t-prov');}

// ---- Ficha integral de proveedor ----
let provActual=null,provTab='cuenta';
function abrirProveedor(id,tab){
  provActual=id;provTab=tab||'cuenta';
  document.querySelectorAll('.view').forEach(s=>s.classList.remove('active'));
  $('#v-proveedordet').classList.add('active');
  $('#ttl').textContent='Proveedor';$('#sub').textContent='Ficha integral del proveedor';
  renderProveedorDet();
}
window.abrirProveedor=abrirProveedor;
function proveedorStats(id){
  const todas=compras.filter(c=>c.proveedorId===id&&!c.anulado); // excluye anuladas (inflaban el estado de cuenta)
  const creditoFacturadas=todas.filter(c=>c.facturada&&c.tipoPago==='credito');
  const rval=c=>{const v=(c.items||[]).reduce((s,it)=>s+(it.recibido||0)*(it.costo||it.precio||0),0);return v>0?v:Number(c.total||0);};
  const totalComprado=todas.reduce((s,c)=>s+rval(c),0);
  const totalPagado=todas.reduce((s,c)=>s+(c.abonos||[]).reduce((a,x)=>a+Number(x.monto),0),0);
  const saldoActual=creditoFacturadas.reduce((s,c)=>s+apInfo(c).saldo,0);
  const pendRecibir=todas.filter(c=>c.estadoRecepcion!=='recibida').length;
  const ultima=todas.length?todas.reduce((m,c)=>new Date(c.fecha)>new Date(m)?c.fecha:m,todas[0].fecha):null;
  const vencidas=creditoFacturadas.filter(c=>apInfo(c).vencido);
  const buckets={c30:0,c60:0,c90:0,c90p:0};
  creditoFacturadas.forEach(c=>{const ai=apInfo(c);if(ai.saldo<=0.001||!c.vencimiento)return;const dias=Math.floor((new Date()-new Date(c.vencimiento))/86400000);if(dias<=0)return;
    if(dias<=30)buckets.c30+=ai.saldo;else if(dias<=60)buckets.c60+=ai.saldo;else if(dias<=90)buckets.c90+=ai.saldo;else buckets.c90p+=ai.saldo;});
  return {todas,creditoFacturadas,totalComprado,totalPagado,saldoActual,pendRecibir,ultima,vencidas,buckets};
}
function renderProveedorDet(){
  const p=proveedores.find(x=>x.id===provActual);if(!p)return;
  const st=proveedorStats(p.id);
  const k=(lbl,val,sub,color)=>`<div class="kpi"><div class="k-lbl">${lbl}</div><div class="k-val num" style="${color?'color:'+color:''}">${val}</div>${sub?`<div class="k-sub">${sub}</div>`:''}</div>`;
  const kpis=[
    k('Total comprado',money(st.totalComprado),st.todas.length+' orden(es)'),
    k('Total pagado',money(st.totalPagado)),
    k('Saldo actual',money(st.saldoActual),null,st.saldoActual>0?'var(--warn)':'var(--ok)'),
    k('Pendientes de recibir',st.pendRecibir,st.pendRecibir?'en camino':'al día',st.pendRecibir?'var(--warn)':'var(--ok)'),
    k('Última compra',st.ultima?fdate(st.ultima):'—'),
    k('Facturas vencidas',st.vencidas.length,null,st.vencidas.length?'var(--danger)':'var(--ok)'),
  ];
  const maxB=Math.max(1,st.buckets.c30,st.buckets.c60,st.buckets.c90,st.buckets.c90p);
  const ageRow=(lbl,v,color)=>`<div class="hbar-row"><div class="hbar-name">${lbl}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v/maxB*100)}%;background:${color}"></div></div><div class="hbar-val num">${money(v)}</div></div>`;
  const hayMora=st.buckets.c30+st.buckets.c60+st.buckets.c90+st.buckets.c90p>0;
  const ficha=`<div class="panel"><div class="panel-head"><h3>Estado de cuenta</h3></div><div class="panel-body">
    <div class="kpis" style="margin-bottom:${hayMora?'16px':'0'}">${kpis.join('')}</div>
    ${hayMora?`<div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Antigüedad de saldos</div>
    ${ageRow('0–30 días',st.buckets.c30,'var(--warn)')}${ageRow('31–60 días',st.buckets.c60,'#D98A2B')}${ageRow('61–90 días',st.buckets.c90,'#C45A2C')}${ageRow('+90 días',st.buckets.c90p,'var(--danger)')}`:''}
  </div></div>`;
  const tabBtn=(t,l)=>`<button class="ct-tab ${provTab===t?'on':''}" onclick="provSetTab('${t}')">${l}</button>`;
  let body='';
  if(provTab==='cuenta'){
    const EST={pagado:['Pagado','b-ok'],parcial:['Parcial','b-info'],pendiente:['Pendiente','b-warn']};
    body=`<div class="panel"><div class="panel-head"><h3>Compras a crédito</h3></div>
      <table><thead><tr><th>Compra</th><th>Fecha</th><th>Vence</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>
      ${st.creditoFacturadas.length?st.creditoFacturadas.slice().reverse().map(c=>{const ai=apInfo(c);const [en,ec]=ai.vencido?['Vencido','b-danger']:EST[ai.estado];
        return `<tr><td style="font-weight:600">CMP-${padn(c.id)}</td><td style="color:var(--muted)">${fdate(c.fecha)}</td><td style="color:${ai.vencido?'var(--danger)':'var(--muted)'}">${fdate(c.vencimiento)}</td><td class="num">${money(c.total)}</td><td class="num" style="color:var(--ok)">${money(ai.abon)}</td><td class="num" style="font-weight:700">${money(ai.saldo)}</td><td><span class="badge ${ec}">${en}</span></td><td>${ai.saldo>0.001?`<button class="btn btn-primary btn-sm" onclick="openAbonoProv(${c.id})">Pago</button>`:`<button class="btn btn-ghost btn-sm" onclick="verCompra(${c.id})">Ver</button>`}</td></tr>`;}).join(''):'<tr><td colspan="8" class="empty">Sin compras a crédito</td></tr>'}
      </tbody></table></div>`;
  }else if(provTab==='productos'){
    const asignados=productos.filter(pr=>(pr.proveedorIds||[]).includes(p.id));
    const opts=productos.filter(pr=>!(pr.proveedorIds||[]).includes(p.id)).map(pr=>`<option value="${pr.codigo} — ${pr.nombre}">`).join('');
    body=`<div class="panel"><div class="panel-head"><h3>Productos comprados</h3></div><div class="panel-body">
      <div style="display:flex;gap:8px;margin-bottom:13px">
        <input id="pp-add" list="pp-prods" placeholder="Buscar por código o nombre…" style="flex:1" onkeydown="if(event.key==='Enter')addProveedorProd(${p.id})"><datalist id="pp-prods">${opts}</datalist>
        <button class="btn btn-primary btn-sm" onclick="addProveedorProd(${p.id})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar</button>
      </div>
      <table><thead><tr><th>Producto</th><th>Costo</th><th></th></tr></thead><tbody>
      ${asignados.length?asignados.map(pr=>`<tr><td style="font-weight:600">${pr.nombre}<div style="font-size:10.5px;color:var(--muted)">${pr.codigo}</div></td><td class="num" style="color:var(--muted)">${money(pr.costo||0)}</td><td><button class="x" onclick="quitarProveedorProd(${p.id},${pr.id})">×</button></td></tr>`).join(''):'<tr><td colspan="3" class="empty">Sin productos asignados todavía</td></tr>'}
      </tbody></table></div></div>`;
  }else if(provTab==='movimiento'){
    const rval=c=>{const v=(c.items||[]).reduce((s,it)=>s+(it.recibido||0)*(it.costo||it.precio||0),0);return v>0?v:Number(c.total||0);};
    const meses=mesesSerie(st.todas,c=>c.fecha,rval);
    const porP={};st.todas.forEach(c=>(c.items||[]).forEach(it=>{const q=it.recibido||0;if(q<=0)return;const k=it.codigo||it.id||it.nombre;if(!porP[k])porP[k]={nombre:it.nombre,q:0,v:0};porP[k].q+=q;porP[k].v+=q*(it.costo||it.precio||0);}));
    const topP=Object.values(porP).sort((a,b)=>b.v-a.v);
    body=`<div class="panel"><div class="panel-head"><h3>Compras recibidas por mes</h3><span style="font-size:12px;color:var(--muted)">Últimos 6 meses</span></div><div class="panel-body">${barsHTML(meses)}</div></div>
      <div class="panel"><div class="panel-head"><h3>Productos comprados (acumulado)</h3></div>
      <table><thead><tr><th>Producto</th><th>Unidades recibidas</th><th>Costo total</th></tr></thead><tbody>
      ${topP.length?topP.map(x=>`<tr><td style="font-weight:600">${x.nombre}</td><td class="num">${x.q}</td><td class="num" style="font-weight:600">${money(x.v)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Sin compras recibidas</td></tr>'}
      </tbody></table></div>`;
  }
  $('#v-proveedordet').innerHTML=`
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="go('proveedores')">← Volver a proveedores</button>
    <div class="panel"><div class="panel-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div style="font-family:var(--disp);font-size:22px;font-weight:700;letter-spacing:-.4px">${p.nombre}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">${p.razonSocial||''} · NIT ${p.nit||'—'} · ${p.diasCredito>0?p.diasCredito+' días de crédito':'Contado'}</div>
        ${p.telefono?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">☎ ${p.telefono}</div>`:''}</div>
        <button class="btn btn-ghost btn-sm" onclick="openProveedor(${p.id})">Editar datos</button>
      </div>
    </div></div>
    ${ficha}
    <div class="ct-tabs">${tabBtn('cuenta','Estado de cuenta')}${tabBtn('productos','Productos comprados')}${tabBtn('movimiento','Movimiento mensual')}</div>
    ${body}`;
}
function provSetTab(t){provTab=t;renderProveedorDet();}
window.provSetTab=provSetTab;
function addProveedorProd(provId){
  const v=($('#pp-add').value||'').trim();if(!v)return;
  const p=productos.find(x=>`${x.codigo} — ${x.nombre}`===v||x.codigo.toLowerCase()===v.toLowerCase()||x.nombre.toLowerCase()===v.toLowerCase());
  if(!p){toast('✗ Producto no encontrado','Seleccioná uno de la lista',true);return;}
  p.proveedorIds=p.proveedorIds||[];
  if(p.proveedorIds.includes(provId)){toast('Ese producto ya está asignado');return;}
  p.proveedorIds.push(provId);
  if(typeof guardarProducto==='function')guardarProducto(p);
  renderProveedorDet();renderProveedores();renderProd();
  toast('✓ Producto asignado',p.nombre);
}
window.addProveedorProd=addProveedorProd;
function quitarProveedorProd(provId,prodId){
  const p=productos.find(x=>x.id===prodId);if(!p)return;
  p.proveedorIds=(p.proveedorIds||[]).filter(x=>x!==provId);
  if(typeof guardarProducto==='function')guardarProducto(p);
  renderProveedorDet();renderProveedores();renderProd();
}
window.quitarProveedorProd=quitarProveedorProd;
function openProveedor(id){const p=id?proveedores.find(x=>x.id===id):null;
  openMod(p?'Editar proveedor':'Nuevo proveedor',`
  <div class="row"><div><label>Nombre comercial</label><input id="pv-nom" value="${p?p.nombre:''}"></div></div>
  <div class="row"><div><label>Razón social</label><input id="pv-rs" value="${p?(p.razonSocial||''):''}"></div></div>
  <div class="row"><div><label>NIT</label><input id="pv-nit" value="${p?(p.nit||''):''}"></div><div><label>Días de crédito</label><input id="pv-dias" type="number" value="${p?(p.diasCredito||0):0}"></div></div>
  <div class="row"><div><label>Teléfono</label><input id="pv-tel" value="${p?(p.telefono||''):''}"></div><div><label>Correo</label><input id="pv-mail" value="${p?(p.correo||''):''}"></div></div>`,()=>{
    const nom=$('#pv-nom').value.trim();if(!nom)return;
    const datos={nombre:nom,razonSocial:$('#pv-rs').value.trim()||nom,nit:$('#pv-nit').value,telefono:$('#pv-tel').value,correo:$('#pv-mail').value,diasCredito:Number($('#pv-dias').value)||0};
    if(p){Object.assign(p,datos);if(typeof guardarProveedor==='function')guardarProveedor(p);toast('✓ Proveedor actualizado');}else{const nuevoProv={id:provN++,...datos,_nuevo:true};proveedores.push(nuevoProv);if(typeof guardarProveedor==='function')guardarProveedor(nuevoProv);toast('✓ Proveedor agregado');}
    closeMod();renderProveedores();initCompra();});}
window.openProveedor=openProveedor;

// ══════════ TALONARIOS DE RECIBOS ══════════
// Devuelve los números de recibo realmente usados (de abonos y cobros en ruta).
function recibosUsados(){
  const usados=new Set();
  documentos.forEach(d=>{
    (d.abonos||[]).forEach(a=>{
      if(a.anulado)return;
      const n=parseInt(String(a.noRecibo||'').replace(/\D/g,''),10);
      if(!isNaN(n))usados.add(n);
    });
  });
  // Cobros en ruta (si tienen número de recibo)
  if(typeof cobrosRuta!=='undefined'){
    cobrosRuta.forEach(c=>{
      const n=parseInt(String(c.noRecibo||'').replace(/\D/g,''),10);
      if(!isNaN(n))usados.add(n);
    });
  }
  return usados;
}

// Próximo número de recibo LIBRE de un talonario (menor no usado ni anulado); null si está lleno.
function proximoReciboLibre(t, usadosSet){
  const anul=new Set(recibosAnulados.map(r=>r.numero));
  const us=usadosSet||recibosUsados();
  for(let n=t.numeroInicial;n<=t.numeroFinal;n++){ if(!us.has(n)&&!anul.has(n))return n; }
  return null;
}
// Talonarios con al menos un recibo libre (para elegir al cobrar), con su próximo número.
function talonariosConLibres(){
  const us=recibosUsados();
  return (talonarios||[]).filter(t=>t.estado!=='anulado').map(t=>({t,proximo:proximoReciboLibre(t,us)})).filter(x=>x.proximo!=null);
}
// Calcula el cuadre de un talonario: usados, faltantes y anulados.
function cuadreTalonario(t, usadosSet){
  const anuladosSet=new Set(recibosAnulados.map(r=>r.numero));
  const usados=[],faltantes=[],anulados=[];
  for(let n=t.numeroInicial;n<=t.numeroFinal;n++){
    if(usadosSet.has(n))usados.push(n);
    else if(anuladosSet.has(n))anulados.push(n);
    else faltantes.push(n);
  }
  return {usados,faltantes,anulados,totalUsados:usados.length,totalFaltantes:faltantes.length,totalAnulados:anulados.length};
}

function renderTalonarios(){
  const acc=$('#tal-acciones');
  if(acc)acc.innerHTML=`<button class="btn btn-ghost btn-sm" onclick="openTalonario()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo talonario</button>`;

  const usadosSet=recibosUsados();
  const tbody=$('#t-talonarios');
  if(!talonarios.length){
    if(tbody)tbody.innerHTML='<tr><td colspan="7" class="empty">No hay talonarios registrados. Creá uno con el botón de arriba.</td></tr>';
    $('#tal-resumen').innerHTML='';
    return;
  }

  // Resumen general
  let totalEsperado=0,totalUsados=0,totalFaltantes=0,totalAnulados=0;
  talonarios.forEach(t=>{
    const c=cuadreTalonario(t,usadosSet);
    totalEsperado+=(t.numeroFinal-t.numeroInicial+1);
    totalUsados+=c.totalUsados;totalFaltantes+=c.totalFaltantes;totalAnulados+=c.totalAnulados;
  });
  $('#tal-resumen').innerHTML=`<div style="display:flex;gap:12px;flex-wrap:wrap">
    <div style="flex:1;min-width:100px;background:var(--surface-2);border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:var(--muted)">Talonarios</div><div style="font-weight:700;font-size:18px">${talonarios.length}</div></div>
    <div style="flex:1;min-width:100px;background:#E8F5E9;border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:#1a7f37">Recibos usados</div><div style="font-weight:700;font-size:18px;color:#1a7f37">${totalUsados}</div></div>
    <div style="flex:1;min-width:100px;background:#FDECEA;border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:#c0392b">Sin procesar</div><div style="font-weight:700;font-size:18px;color:#c0392b">${totalFaltantes}</div></div>
    <div style="flex:1;min-width:100px;background:#ECEFF1;border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:#78909C">Anulados</div><div style="font-weight:700;font-size:18px;color:#78909C">${totalAnulados}</div></div>
    <div style="flex:1;min-width:100px;background:var(--surface-2);border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:var(--muted)">Total recibos</div><div style="font-weight:700;font-size:18px">${totalEsperado}</div></div>
  </div>`;

  tbody.innerHTML=talonarios.map(t=>{
    const c=cuadreTalonario(t,usadosSet);
    const estadoBadge=t.estado==='cerrado'
      ?'<span class="badge b-muted">Cerrado</span>'
      :'<span class="badge b-ok">Activo</span>';
    const faltanBadge=c.totalFaltantes>0
      ?`<span style="color:var(--danger);font-weight:700">${c.totalFaltantes}</span>`
      :`<span style="color:var(--ok,#1a7f37);font-weight:700">0</span>`;
    return `<tr>
      <td style="font-weight:600">${t.descripcion||('Talón '+t.numeroInicial)}</td>
      <td style="font-family:monospace">${t.numeroInicial} – ${t.numeroFinal}</td>
      <td>${t.asignadoA||'<span style="color:var(--muted)">—</span>'}</td>
      <td class="num" style="color:var(--ok,#1a7f37);font-weight:600">${c.totalUsados}</td>
      <td class="num">${faltanBadge}</td>
      <td>${estadoBadge}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="verCuadreTalonario(${t.id})">Ver cuadre</button>
        <button class="btn btn-ghost btn-sm" onclick="openTalonario(${t.id})">Editar</button>
      </td></tr>`;
  }).join('');
}
window.renderTalonarios=renderTalonarios;

// Crear/editar un talonario
function openTalonario(id){
  const t=id?talonarios.find(x=>x.id===id):null;
  const vendOpts=['<option value="">— Sin asignar —</option>']
    .concat(vendedores.map(v=>`<option value="${v.nombre}"${t&&t.asignadoA===v.nombre?' selected':''}>${v.nombre}</option>`))
    .concat((typeof pilotos!=='undefined'?pilotos:[]).map(p=>`<option value="${p.nombre}"${t&&t.asignadoA===p.nombre?' selected':''}>${p.nombre} (piloto)</option>`))
    .join('');
  openMod(id?'Editar talonario':'Nuevo talonario',
    `<div class="row"><div><label>Número inicial</label><input id="tal-ini" type="number" value="${t?t.numeroInicial:''}" placeholder="28001" oninput="talCalcFin()"></div>
      <div><label>Número final <span style="color:var(--muted);font-weight:400">(automático)</span></label><input id="tal-fin" type="number" value="${t?t.numeroFinal:''}" readonly style="background:var(--surface-2)"></div></div>
     <div class="row"><div><label>Asignado a</label><select id="tal-asig">${vendOpts}</select></div>
      <div><label>Fecha de entrega</label><input id="tal-fecha" type="date" value="${t&&t.fechaEntrega?String(t.fechaEntrega).slice(0,10):fechaHoyGT()}"></div></div>
     <div class="row"><div><label>Descripción <span style="color:var(--muted);font-weight:400">(opcional)</span></label><input id="tal-desc" value="${t?(t.descripcion||''):''}" placeholder="Ej. Talón Oficina 1"></div></div>
     <div class="row"><div><label>Estado</label><select id="tal-estado"><option value="activo"${!t||t.estado==='activo'?' selected':''}>Activo</option><option value="cerrado"${t&&t.estado==='cerrado'?' selected':''}>Cerrado</option></select></div></div>
     ${id?`<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarTalonarioUI(${id})">Eliminar talonario</button></div>`:''}
     <div class="note n-ok" style="margin-top:6px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El talonario es de 50 recibos. El número final se calcula solo a partir del inicial.</span></div>`,
    async()=>{
      const ini=parseInt($('#tal-ini').value,10);
      if(isNaN(ini)||ini<=0){toast('Número inválido','Escribí el número inicial del talonario',true);return;}
      const fin=ini+49;
      const datos={numeroInicial:ini,numeroFinal:fin,cantidad:50,
        asignadoA:$('#tal-asig').value||null,
        descripcion:$('#tal-desc').value.trim()||null,
        estado:$('#tal-estado').value,
        fechaEntrega:$('#tal-fecha').value||null};
      let ok;
      if(id){Object.assign(t,datos);ok=await guardarTalonario(t);}
      else{const nuevo={...datos,_nuevo:true};ok=await guardarTalonario(nuevo);if(ok)talonarios.push(nuevo);}
      if(ok){toast('✓ Talonario guardado',`Recibos ${ini} al ${fin}`);cerrarTodo();renderTalonarios();}
      else{toast('Error al guardar','No se pudo guardar el talonario',true);}
    });
}
window.openTalonario=openTalonario;
window.talCalcFin=function(){const ini=parseInt($('#tal-ini').value,10);if(!isNaN(ini)&&$('#tal-fin'))$('#tal-fin').value=ini+49;};

window.eliminarTalonarioUI=async function(id){
  if(!confirm('¿Eliminar este talonario? Esto no borra los recibos ya registrados, solo el control del talonario.'))return;
  const ok=await eliminarTalonario(id);
  if(ok){talonarios=talonarios.filter(t=>t.id!==id);cerrarTodo();renderTalonarios();toast('Talonario eliminado','');}
  else toast('Error','No se pudo eliminar',true);
};

// Ver el cuadre detallado de un talonario (qué recibos faltan)
window.verCuadreTalonario=function(id){
  const t=talonarios.find(x=>x.id===id);if(!t)return;
  const c=cuadreTalonario(t,recibosUsados());
  // Chip rojo (faltante) — clickeable para anular
  const chips=n=>`<span onclick="anularReciboUI(${n},${t.id})" title="Clic para anular este recibo" style="cursor:pointer;display:inline-block;margin:2px;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:12px;background:#FDECEA;color:#c0392b;font-weight:700;transition:background .15s" onmouseover="this.style.background='#f5c6cb'" onmouseout="this.style.background='#FDECEA'">${n}</span>`;
  // Chip verde (usado) — clickeable para ver el abono
  const okChip=n=>`<span onclick="verAbonoPorRecibo(${n})" title="Ver detalle del abono" style="cursor:pointer;display:inline-block;margin:2px;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:11.5px;background:#E8F5E9;color:#1a7f37;transition:background .15s" onmouseover="this.style.background='#c8e6c9'" onmouseout="this.style.background='#E8F5E9'">${n}</span>`;
  // Chip gris (anulado) — clickeable para ver motivo / reactivar
  const anulChip=n=>{const ra=recibosAnulados.find(r=>r.numero===n);return `<span onclick="verReciboAnulado(${n})" title="${ra&&ra.motivo?('Motivo: '+ra.motivo.replace(/"/g,'')):'Recibo anulado'} — clic para ver" style="cursor:pointer;display:inline-block;margin:2px;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:11.5px;background:#ECEFF1;color:#78909C;font-weight:600;text-decoration:line-through;transition:background .15s" onmouseover="this.style.background='#cfd8dc'" onmouseout="this.style.background='#ECEFF1'">${n}</span>`;};
  openMod('Cuadre · '+(t.descripcion||('Talón '+t.numeroInicial)),
    `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
       <div style="flex:1;min-width:80px;background:var(--surface-2);border-radius:8px;padding:9px 11px"><div style="font-size:11px;color:var(--muted)">Rango</div><div style="font-weight:700;font-family:monospace;font-size:13px">${t.numeroInicial}–${t.numeroFinal}</div></div>
       <div style="flex:1;min-width:70px;background:#E8F5E9;border-radius:8px;padding:9px 11px"><div style="font-size:11px;color:#1a7f37">Usados</div><div style="font-weight:700;color:#1a7f37">${c.totalUsados}</div></div>
       <div style="flex:1;min-width:70px;background:#FDECEA;border-radius:8px;padding:9px 11px"><div style="font-size:11px;color:#c0392b">Faltantes</div><div style="font-weight:700;color:#c0392b">${c.totalFaltantes}</div></div>
       <div style="flex:1;min-width:70px;background:#ECEFF1;border-radius:8px;padding:9px 11px"><div style="font-size:11px;color:#78909C">Anulados</div><div style="font-weight:700;color:#78909C">${c.totalAnulados}</div></div>
     </div>
     ${t.asignadoA?`<p style="font-size:13px;margin-bottom:12px">Responsable: <b>${t.asignadoA}</b></p>`:''}
     ${c.totalFaltantes>0?`<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#c0392b;margin-bottom:6px">⚠ Recibos sin procesar (${c.totalFaltantes}):</div><div>${c.faltantes.map(chips).join('')}</div><div style="font-size:11.5px;color:var(--muted);margin-top:8px">Hacé clic en un recibo para <b>anularlo</b> (si se dañó o no se usó) y que deje de contar como faltante.</div></div>`:'<div class="note n-ok" style="margin-bottom:14px"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg><span>¡Talonario cuadrado! No hay recibos sin procesar.</span></div>'}
     ${c.totalAnulados>0?`<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#78909C;margin-bottom:6px">Recibos anulados (${c.totalAnulados}):</div><div>${c.anulados.map(anulChip).join('')}</div></div>`:''}
     <div><div style="font-size:12px;font-weight:700;color:#1a7f37;margin-bottom:6px">Recibos procesados (${c.totalUsados}):</div><div style="max-height:160px;overflow-y:auto">${c.usados.length?c.usados.map(okChip).join(''):'<span style="color:var(--muted);font-size:12px">Ninguno todavía</span>'}</div></div>`,
    null);
  const sv=$('#m-save');if(sv)sv.style.display='none';
};

// Anular un recibo (pedir motivo)
window.anularReciboUI=function(num,talId){
  openMod('Anular recibo '+num,
    `<p style="font-size:13px;margin-bottom:12px">Vas a anular el recibo <b style="font-family:monospace">${num}</b>. Esto lo marca como dañado o no usado, para que el cuadre no lo cuente como faltante. <b>No afecta ningún saldo ni abono.</b></p>
     <div><label>Motivo de la anulación</label><textarea id="anul-motivo" rows="2" placeholder="Ej. Recibo dañado al imprimir / anulado en papel" style="width:100%;margin-top:4px"></textarea></div>`,
    async()=>{
      const motivo=$('#anul-motivo').value.trim();
      if(!motivo){toast('Falta el motivo','Escribí por qué se anula el recibo',true);return;}
      const r={numero:num,talonarioId:talId,motivo:motivo,anuladoPor:currentUser};
      const ok=await guardarReciboAnulado(r);
      if(ok){
        recibosAnulados.push(r);
        logAudit('Recibo anulado','Recibo '+num+' · '+motivo);
        toast('✓ Recibo anulado','Recibo '+num+' marcado como anulado');
        cerrarTodo();
        verCuadreTalonario(talId);
      }else{toast('Error','No se pudo anular el recibo',true);}
    });
};

// Ver/quitar la anulación de un recibo
window.verReciboAnulado=function(num){
  const ra=recibosAnulados.find(r=>r.numero===num);if(!ra)return;
  const talId=ra.talonarioId;
  openMod('Recibo anulado '+num,
    `<div style="background:var(--surface-2);border-radius:10px;padding:14px 16px">
       <div style="font-family:monospace;font-weight:700;font-size:15px;color:#78909C;text-decoration:line-through;margin-bottom:10px">Recibo ${num}</div>
       <table style="width:100%;font-size:13px">
         <tr><td style="color:var(--muted);padding:3px 0">Motivo</td><td style="text-align:right;font-weight:600">${ra.motivo||'—'}</td></tr>
         <tr><td style="color:var(--muted);padding:3px 0">Anulado por</td><td style="text-align:right">${ra.anuladoPor||'—'}</td></tr>
         <tr><td style="color:var(--muted);padding:3px 0">Fecha</td><td style="text-align:right">${ra.fecha?fdate(ra.fecha):'—'}</td></tr>
       </table>
     </div>
     <div style="margin-top:14px;text-align:right"><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="reactivarRecibo(${num},${ra.id},${talId})">Quitar anulación</button></div>`,
    null);
  const sv=$('#m-save');if(sv)sv.style.display='none';
};

// Reactivar un recibo anulado (quitar la anulación)
window.reactivarRecibo=async function(num,id,talId){
  if(!confirm('¿Quitar la anulación del recibo '+num+'? Volverá a contar como faltante si no tiene abono.'))return;
  const ok=await eliminarReciboAnulado(id);
  if(ok){
    recibosAnulados=recibosAnulados.filter(r=>r.id!==id);
    logAudit('Anulación de recibo revertida','Recibo '+num);
    toast('Anulación quitada','Recibo '+num);
    cerrarTodo();
    if(talId)verCuadreTalonario(talId);
  }else{toast('Error','No se pudo quitar la anulación',true);}
};

// Muestra el detalle del abono asociado a un número de recibo (desde el cuadre)
window.verAbonoPorRecibo=function(num){
  // Buscar el abono con ese número de recibo
  let encontrado=null;
  for(const d of documentos){
    for(const a of (d.abonos||[])){
      if(a.anulado)continue;
      const n=parseInt(String(a.noRecibo||'').replace(/\D/g,''),10);
      if(n===num){encontrado={doc:d,abono:a};break;}
    }
    if(encontrado)break;
  }
  // Buscar también en cobros en ruta
  if(!encontrado&&typeof cobrosRuta!=='undefined'){
    for(const c of cobrosRuta){
      const n=parseInt(String(c.noRecibo||'').replace(/\D/g,''),10);
      if(n===num){encontrado={cobroRuta:c};break;}
    }
  }
  if(!encontrado){toast('Recibo no encontrado','No se halló el abono '+num,true);return;}

  let cuerpo,docId=null;
  if(encontrado.abono){
    const d=encontrado.doc,a=encontrado.abono;docId=d.id;
    const facturaRef=d.serie&&d.numeroDte?`${d.serie}-${d.numeroDte}`:`${refPed(d)}`;
    cuerpo=`<div style="background:var(--surface-2);border-radius:10px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-family:monospace;font-weight:700;font-size:15px;color:#1a7f37">Recibo ${a.noRecibo||num}</span>
        <span class="badge b-ok">Procesado</span>
      </div>
      <table style="width:100%;font-size:13px">
        <tr><td style="color:var(--muted);padding:3px 0">Cliente</td><td style="text-align:right;font-weight:600">${d.clienteComercial||d.clienteNombre||'—'}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Factura</td><td style="text-align:right;font-family:monospace">${facturaRef}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Monto</td><td style="text-align:right;font-weight:700;color:#1a7f37">${money(a.monto)}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Fecha</td><td style="text-align:right">${fdate(a.fecha)}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Método</td><td style="text-align:right">${a.metodo||'—'}</td></tr>
        ${a.referencia?`<tr><td style="color:var(--muted);padding:3px 0">Referencia</td><td style="text-align:right">${a.referencia}</td></tr>`:''}
        ${a.registradoPor?`<tr><td style="color:var(--muted);padding:3px 0">Registrado por</td><td style="text-align:right">${a.registradoPor}</td></tr>`:''}
      </table>
    </div>`;
  } else {
    const c=encontrado.cobroRuta;
    cuerpo=`<div style="background:var(--surface-2);border-radius:10px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-family:monospace;font-weight:700;font-size:15px;color:#1a7f37">Recibo ${c.noRecibo||num}</span>
        <span class="badge b-info">Cobro en ruta</span>
      </div>
      <table style="width:100%;font-size:13px">
        <tr><td style="color:var(--muted);padding:3px 0">Cliente</td><td style="text-align:right;font-weight:600">${c.cliente||'—'}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Monto</td><td style="text-align:right;font-weight:700;color:#1a7f37">${money(c.monto)}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Fecha</td><td style="text-align:right">${fdate(c.fecha)}</td></tr>
        <tr><td style="color:var(--muted);padding:3px 0">Piloto</td><td style="text-align:right">${c.piloto||'—'}</td></tr>
      </table>
    </div>`;
  }

  openMod('Detalle del recibo',
    cuerpo+(docId?`<div style="margin-top:14px;text-align:right"><button class="btn btn-primary btn-sm" onclick="irAFacturaDesdeRecibo(${docId})">Ver factura completa →</button></div>`:''),
    null);
  const sv=$('#m-save');if(sv)sv.style.display='none';
};

// Ir a la factura completa desde el detalle del recibo
window.irAFacturaDesdeRecibo=function(docId){
  cerrarTodo();
  const d=documentos.find(x=>x.id===docId);
  if(d&&typeof verDoc==='function'){go('documentos');setTimeout(()=>verDoc(docId),150);}
};
// Admin: cambiar la contraseña de un usuario (via backend seguro con la llave de servicio).
function openCambiarClave(id){
  if(currentRole!=='admin'){toast('Sin permiso','Solo el administrador puede cambiar contraseñas',true);return;}
  const u=usuarios.find(x=>x.id===id); if(!u)return;
  if(!u.correo){toast('Sin correo','Este usuario no tiene correo; no se puede cambiar la clave.',true);return;}
  openMod('Cambiar contraseña · '+u.nombre,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Asignás una nueva contraseña para <b>${u.nombre}</b> (${u.correo}). El usuario entra con esa clave la próxima vez.</p>
     <div class="row"><div style="flex:1"><label>Nueva contraseña</label><input id="cc-pass" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div></div>
     <div class="row"><div style="flex:1"><label>Repetir contraseña</label><input id="cc-pass2" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')document.getElementById('m-save').click()"></div></div>
     <div class="note n-danger" id="cc-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const p1=($('#cc-pass')?.value)||'', p2=($('#cc-pass2')?.value)||'';
      const err=$('#cc-err'); const setErr=t=>{if(err){err.style.display='flex';err.querySelector('span').textContent=t;}};
      if(p1.length<6){setErr('La contraseña debe tener al menos 6 caracteres');return;}
      if(p1!==p2){setErr('Las contraseñas no coinciden');return;}
      const btn=$('#m-save'); if(btn){btn.disabled=true;btn.textContent='Guardando...';}
      try{
        const {data:sess}=await sb.auth.getSession();
        const token=sess&&sess.session&&sess.session.access_token;
        if(!token){setErr('No hay sesión activa. Volvé a iniciar sesión.');if(btn){btn.disabled=false;btn.textContent='Cambiar contraseña';}return;}
        const r=await fetch(FEL_BACKEND_URL.replace(/\/$/,'')+'/api/set-password',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({authId:u.authId||null,email:u.correo,password:p1})
        });
        const data=await r.json().catch(()=>({}));
        if(r.ok&&data.ok){ cerrarTodo(); toast('✓ Contraseña actualizada',u.nombre+' ya puede entrar con la nueva clave'); if(typeof logAudit==='function')logAudit('Cambio de contraseña','Usuario: '+u.nombre); }
        else { setErr(data.error||'No se pudo cambiar la contraseña'); if(btn){btn.disabled=false;btn.textContent='Cambiar contraseña';} }
      }catch(e){ setErr('Error de conexión con el backend: '+(e.message||e)); if(btn){btn.disabled=false;btn.textContent='Cambiar contraseña';} }
    });
  const _b=$('#m-save'); if(_b)_b.textContent='Cambiar contraseña';
}
window.openCambiarClave=openCambiarClave;
function renderUsuarios(){
  $('#t-usr').innerHTML=usuarios.map(u=>`<tr><td style="font-weight:600">${u.nombre}</td><td style="color:var(--muted)">${u.correo||'—'}</td><td><span class="badge b-info">${ROLES[u.rol]?.label||u.rol}</span></td><td><span class="badge ${u.activo?'b-ok':'b-muted'}">${u.activo?'Activo':'Inactivo'}</span></td><td><div class="acts"><button class="btn btn-ghost btn-sm" onclick="openUsuario(${u.id})">Editar</button>${currentRole==='admin'&&u.correo?`<button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="openCambiarClave(${u.id})">Clave</button>`:''}${u.nombre!==currentUser?`<button class="btn btn-ghost btn-sm" onclick="toggleUsuario(${u.id})">${u.activo?'Desactivar':'Activar'}</button>`:''}</div></td></tr>`).join('');
  enhanceTable('t-usr');
  renderPermisos();
  renderDashboardConfig();
}

const MODULOS_PERMISOS=[
  {key:'panel',lbl:'Dashboard',grp:'Módulos'},
  {key:'pedido',lbl:'Nuevo pedido',grp:'Módulos'},
  {key:'cotizaciones',lbl:'Cotizaciones',grp:'Módulos'},
  {key:'documentos',lbl:'Documentos',grp:'Módulos'},
  {key:'clientes',lbl:'Clientes',grp:'Módulos'},
  {key:'recordatorios',lbl:'Recordatorios',grp:'Módulos'},
  {key:'cobros',lbl:'Cobros',grp:'Módulos'},
  {key:'porpagar',lbl:'Por pagar',grp:'Módulos'},
  {key:'bancos',lbl:'Bancos',grp:'Módulos'},
  {key:'talonarios',lbl:'Talonarios',grp:'Módulos'},
  {key:'inventario',lbl:'Inventario',grp:'Módulos'},
  {key:'compras',lbl:'Compras',grp:'Módulos'},
  {key:'nuevacompra',lbl:'Nueva compra',grp:'Módulos'},
  {key:'proveedores',lbl:'Proveedores',grp:'Módulos'},
  {key:'reportes',lbl:'Reportes',grp:'Módulos'},
  {key:'despachos',lbl:'Despachos (logística)',grp:'Módulos'},
  {key:'misentregas',lbl:'Mis entregas (piloto)',grp:'Módulos'},
  {key:'usuarios',lbl:'Usuarios',grp:'Módulos'},
  {key:'auditoria',lbl:'Auditoría',grp:'Módulos'},
  {key:'__facturar',lbl:'Puede facturar',grp:'Sub-permisos'},
  {key:'__anular',lbl:'Puede anular documentos',grp:'Sub-permisos'},
  {key:'__crearCliente',lbl:'Crear / editar clientes',grp:'Sub-permisos'},
  {key:'__editarInventario',lbl:'Editar inventario y productos',grp:'Sub-permisos'},
  {key:'__registrarAbono',lbl:'Registrar abonos y pagos',grp:'Sub-permisos'},
  {key:'__asignarPiloto',lbl:'Asignar y conciliar despachos',grp:'Sub-permisos'},
  {key:'__convertirCajas',lbl:'Convertir cajas a unidades',grp:'Sub-permisos'},
  {key:'__compraEspecial',lbl:'Crear compras especiales',grp:'Sub-permisos'},
  {key:'__readonly',lbl:'Solo lectura (sin acciones)',grp:'Sub-permisos'},
  {key:'rep_resumen',lbl:'Resumen',grp:'Reportes · Ventas'},
  {key:'rep_costos',lbl:'Costos vs ventas',grp:'Reportes · Ventas'},
  {key:'rep_vendedor',lbl:'Ventas por vendedor',grp:'Reportes · Ventas'},
  {key:'rep_producto',lbl:'Ventas por producto',grp:'Reportes · Ventas'},
  {key:'rep_cliprod',lbl:'Ventas cliente/producto',grp:'Reportes · Ventas'},
  {key:'rep_climes',lbl:'Ventas cliente/mes',grp:'Reportes · Ventas'},
  {key:'rep_climescomp',lbl:'Comparativa cliente/mes',grp:'Reportes · Ventas'},
  {key:'rep_prodmescomp',lbl:'Comparativa producto/mes',grp:'Reportes · Ventas'},
  {key:'rep_comision',lbl:'Comisiones',grp:'Reportes · Ventas'},
  {key:'rep_canalvend',lbl:'Ventas por canal (Whaticket)',grp:'Reportes · Ventas'},
  {key:'rep_factem',lbl:'Facturas emitidas',grp:'Reportes · Ventas'},
  {key:'rep_dircli',lbl:'Listado de clientes',grp:'Reportes · Clientes y cobros'},
  {key:'rep_cxc',lbl:'Pendientes por cliente',grp:'Reportes · Clientes y cobros'},
  {key:'rep_estcta',lbl:'Estado de cuenta general',grp:'Reportes · Clientes y cobros'},
  {key:'rep_factabo',lbl:'Facturas y abonos',grp:'Reportes · Clientes y cobros'},
  {key:'rep_recibos',lbl:'Recibos',grp:'Reportes · Clientes y cobros'},
  {key:'rep_pagos',lbl:'Pagos por cliente',grp:'Reportes · Clientes y cobros'},
  {key:'rep_retenciones',lbl:'Retenciones IVA/ISR',grp:'Reportes · Clientes y cobros'},
  {key:'rep_cardex',lbl:'Cardex de inventario',grp:'Reportes · Inventario'},
  {key:'rep_invactual',lbl:'Inventario actual',grp:'Reportes · Inventario'},
  {key:'rep_invcosto',lbl:'Inventario valorizado',grp:'Reportes · Inventario'},
  {key:'rep_cprov',lbl:'Compras por proveedor',grp:'Reportes · Compras y bancos'},
  {key:'rep_cprod',lbl:'Compras por producto',grp:'Reportes · Compras y bancos'},
  {key:'rep_banco',lbl:'Movimientos de banco',grp:'Reportes · Compras y bancos'},
];
const ROLES_EDIT=['gerencia','ventas','bodega','contabilidad','auditoria','facturador','piloto'];

// Mapa de tipos de reporte a su clave de permiso
const REP_TIPOS=['resumen','costos','vendedor','producto','cliprod','climes','climescomp','prodmescomp','comision','dircli','factem','cardex','invactual','invcosto','canalvend','cprov','cprod','cxc','estcta','factabo','banco','recibos','pagos','retenciones'];

// ¿El rol actual puede ver este reporte?
function puedeVerReporte(tipo){
  const r=ROLES[currentRole];
  if(!r)return true;
  if(r.views==='ALL')return true;
  const tieneAlgunRepPerm=REP_TIPOS.some(t=>r.views.includes('rep_'+t));
  if(!tieneAlgunRepPerm)return true; // sin config = ve todos (como antes)
  return r.views.includes('rep_'+tipo);
}

function tienePermisoMod(rol,key){
  const r=ROLES[rol];if(!r)return false;
  if(key==='__facturar')return !!r.facturar;
  if(key==='__anular')return !!r.anular;
  if(key==='__crearCliente')return !!r.crearCliente;
  if(key==='__editarInventario')return !!r.editarInventario;
  if(key==='__registrarAbono')return !!r.registrarAbono;
  if(key==='__asignarPiloto')return !!r.asignarPiloto;
  if(key==='__convertirCajas')return !!r.convertirCajas;
  if(key==='__compraEspecial')return !!r.compraEspecial;
  if(key==='__readonly')return !!r.readonly;
  return r.views==='ALL'||r.views.includes(key);
}

function renderDashboardConfig(){
  const tbl=$('#t-dashboard');if(!tbl)return;
  let thead=`<tr><th style="text-align:left">Widget</th><th style="color:var(--muted-2);text-align:center">Admin<br><span style="font-size:10px;font-weight:400">bloqueado</span></th>`;
  ROLES_EDIT.forEach(r=>thead+=`<th style="text-align:center">${ROLES[r]?.label||r}</th>`);
  thead+='</tr>';
  tbl.querySelector('thead').innerHTML=thead;
  let lastGrp='',tbody='';
  DB_WIDGETS.forEach(w=>{
    if(w.grp!==lastGrp){
      tbody+=`<tr class="perm-sep"><td colspan="${ROLES_EDIT.length+2}">${w.grp}</td></tr>`;
      lastGrp=w.grp;
    }
    tbody+=`<tr><td style="font-size:13px;font-weight:500">${w.lbl}</td>`;
    tbody+=`<td class="locked" style="text-align:center"><input type="checkbox" checked disabled></td>`;
    ROLES_EDIT.forEach(rol=>{
      const checked=dashboardConfig[rol]?.[w.key]??false;
      tbody+=`<td style="text-align:center"><input type="checkbox" ${checked?'checked':''} onchange="toggleDashboard('${rol}','${w.key}',this.checked)"></td>`;
    });
    tbody+='</tr>';
  });
  tbl.querySelector('tbody').innerHTML=tbody;
}
async function toggleDashboard(rol,key,val){
  if(!dashboardConfig[rol])dashboardConfig[rol]={};
  dashboardConfig[rol][key]=val;
  // GUARDAR en la base de datos
  if(typeof guardarDashboardConfig==='function'){
    const ok=await guardarDashboardConfig(rol,dashboardConfig[rol]);
    if(ok){toast('✓ Dashboard guardado','Configuración aplicada');}
    else{toast('Error al guardar','No se pudo guardar la configuración del dashboard',true);}
  }
}
window.toggleDashboard=toggleDashboard;

function renderPermisos(){
  const tbl=$('#t-permisos');if(!tbl)return;
  // Encabezado
  let thead=`<tr><th>Módulo / Permiso</th><th style="color:var(--muted-2)">Admin<br><span style="font-size:10px;font-weight:400">bloqueado</span></th>`;
  ROLES_EDIT.forEach(r=>thead+=`<th>${ROLES[r]?.label||r}</th>`);
  thead+='</tr>';
  tbl.querySelector('thead').innerHTML=thead;
  // Filas
  let lastGrp='',tbody='';
  MODULOS_PERMISOS.forEach(m=>{
    if(m.grp!==lastGrp){
      tbody+=`<tr class="perm-sep"><td colspan="${ROLES_EDIT.length+2}">${m.grp}</td></tr>`;
      lastGrp=m.grp;
    }
    tbody+=`<tr><td>${m.lbl}</td>`;
    // Admin — siempre ✅ bloqueado
    tbody+=`<td class="locked"><input type="checkbox" checked disabled></td>`;
    ROLES_EDIT.forEach(rol=>{
      const checked=tienePermisoMod(rol,m.key);
      tbody+=`<td><input type="checkbox" ${checked?'checked':''} onchange="togglePermiso('${rol}','${m.key}',this.checked)"></td>`;
    });
    tbody+='</tr>';
  });
  tbl.querySelector('tbody').innerHTML=tbody;
}

async function togglePermiso(rol,key,val){
  const r=ROLES[rol];if(!r)return;
  // Actualiza en memoria según el tipo de permiso
  if(key==='__facturar'){r.facturar=val;}
  else if(key==='__anular'){r.anular=val;}
  else if(key==='__crearCliente'){r.crearCliente=val;}
  else if(key==='__editarInventario'){r.editarInventario=val;}
  else if(key==='__registrarAbono'){r.registrarAbono=val;}
  else if(key==='__asignarPiloto'){r.asignarPiloto=val;}
  else if(key==='__convertirCajas'){r.convertirCajas=val;}
  else if(key==='__compraEspecial'){r.compraEspecial=val;}
  else if(key==='__readonly'){r.readonly=val;}
  else if(r.views==='ALL'){
    // Al quitar un módulo a un rol con acceso total, se parte de TODAS las vistas
    // válidas. (Antes se armaba con la unión de los otros roles, y se perdían en
    // silencio las que solo tienen los roles con acceso total: bancos, talonarios,
    // usuarios y auditoría.)
    if(!val){r.views=VISTAS_VALIDAS.concat(REP_TIPOS.map(t=>'rep_'+t)).filter(v=>v!==key);}
  }
  else{
    if(val){if(!r.views.includes(key))r.views.push(key);}
    else r.views=r.views.filter(v=>v!==key);
  }
  // GUARDAR en la base de datos
  if(typeof guardarRol==='function'){
    const ok=await guardarRol(rol,r);
    if(ok){toast('✓ Permiso guardado','Cambios aplicados al rol '+(r.label||rol));}
    else{toast('Error al guardar','No se pudo guardar el permiso. Revisá tu conexión.',true);}
  }
}
window.togglePermiso=togglePermiso;
function openUsuario(id){const u=id?usuarios.find(x=>x.id===id):null;
  const vendOpts=`<option value="">Sin asignar</option>`+vendedores.map(v=>`<option value="${v.id}" ${u&&u.vendedorId===v.id?'selected':''}>${v.nombre}</option>`).join('');
  const pilOpts=`<option value="">Sin asignar</option>`+pilotos.map(p=>`<option value="${p.id}" ${u&&u.pilotoId===p.id?'selected':''}>${p.nombre}</option>`).join('');
  openMod(u?'Editar usuario':'Nuevo usuario',`
  <div class="row"><div><label>Nombre</label><input id="u-nom" value="${u?u.nombre:''}"></div></div>
  <div class="row"><div><label>Correo</label><input id="u-mail" value="${u?(u.correo||''):''}"></div></div>
  <div class="row"><div><label>Rol</label><select id="u-rol">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${u&&u.rol===k?'selected':''}>${r.label}</option>`).join('')}</select></div></div>
  <div class="row"><div><label>Vendedor asignado <span style="color:var(--muted-2);font-weight:400">(solo rol Ventas)</span></label><select id="u-vend">${vendOpts}</select></div></div>
  <div class="row"><div><label>Piloto asignado <span style="color:var(--muted-2);font-weight:400">(solo rol Piloto)</span></label><select id="u-pil">${pilOpts}</select></div></div>
  <div class="row"><div><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="u-esvend" ${u&&u.vendedorId?'checked':''} style="width:auto;margin:0"> También es vendedor <span style="color:var(--muted-2);font-weight:400">(se le pueden asignar clientes y ventas)</span></label></div></div>
  <div class="note n-ok" style="margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El rol define qué módulos puede ver. Marcá "También es vendedor" si a esta persona (aunque sea admin o gerente) se le asignan clientes y ventas.</span></div>`,()=>{
    const nom=$('#u-nom').value.trim();if(!nom)return;
    const rol=$('#u-rol').value;
    const esVend=$('#u-esvend')?.checked;
    let vendedorId=$('#u-vend').value?Number($('#u-vend').value):null;
    let pilotoId=$('#u-pil').value?Number($('#u-pil').value):null;

    // Crear ficha de vendedor si: el rol es Ventas, O se marcó "también es vendedor"
    if((rol==='ventas' || esVend) && !vendedorId){
      const nv={id:vendN++,nombre:nom,_nuevo:true};
      vendedores.push(nv);
      if(typeof guardarVendedor==='function')guardarVendedor(nv);
      vendedorId=nv.id;
    }
    // Si se desmarcó "también es vendedor" y no es rol ventas, quitar el vendedor
    if(!esVend && rol!=='ventas'){vendedorId=null;}
    // Si el rol es Piloto y no tiene piloto asignado, crear su ficha de piloto automáticamente
    if(rol==='piloto' && !pilotoId){
      const np={id:pilN++,nombre:nom,_nuevo:true};
      pilotos.push(np);
      if(typeof guardarPiloto==='function')guardarPiloto(np);
      pilotoId=np.id;
    }

    const datos={nombre:nom,correo:$('#u-mail').value,rol,vendedorId,pilotoId};
    if(u){
      Object.assign(u,datos);
      // Sincronizar el nombre del vendedor/piloto vinculado
      if(u.vendedorId){const v=vendedores.find(x=>x.id===u.vendedorId);if(v&&v.nombre!==nom){v.nombre=nom;if(typeof guardarVendedor==='function')guardarVendedor(v);}}
      if(u.pilotoId){const p=pilotos.find(x=>x.id===u.pilotoId);if(p&&p.nombre!==nom){p.nombre=nom;if(typeof guardarPiloto==='function')guardarPiloto(p);}}
      if(typeof guardarUsuario==='function')guardarUsuario(u);
      logAudit('Usuario editado',nom+' · Rol: '+ROLES[rol]?.label);toast('✓ Usuario actualizado');
    }else{
      const nuevo={id:usrN++,...datos,activo:true,_nuevo:true};
      usuarios.push(nuevo);
      if(typeof guardarUsuario==='function')guardarUsuario(nuevo);
      logAudit('Usuario creado',nom+' · Rol: '+ROLES[rol]?.label);toast('✓ Usuario agregado','Recordá crear su acceso en Supabase Auth');
    }
    closeMod();renderUsuarios();renderUserGrid();});}
window.openUsuario=openUsuario;
function toggleUsuario(id){const u=usuarios.find(x=>x.id===id);if(!u)return;u.activo=!u.activo;if(typeof guardarUsuario==='function')guardarUsuario(u);renderUsuarios();renderUserGrid();toast(u.activo?'✓ Usuario activado':'✓ Usuario desactivado');}
window.toggleUsuario=toggleUsuario;

// Existencia TOTAL en unidades (suma las cajas cerradas convertidas) — fuente única de verdad
// Umbral de "stock bajo" de un producto, según su categoría. Default 10 si no tiene categoría o umbral.
const UMBRAL_STOCK_DEF=10;
function umbralStock(p){
  if(p&&p.categoria){const c=categorias.find(x=>x.nombre===p.categoria);if(c&&Number(c.umbralStock)>0)return Number(c.umbralStock);}
  return UMBRAL_STOCK_DEF;
}
// Producto de SERVICIO (marca "Servicios"): no maneja inventario, se puede facturar en 0.
function esServicio(p){ return !!(p && /^servicios?$/i.test(String(p.marca||'').trim())); }
function existenciaTotal(p){
  if(!p)return 0;
  if(p.tipoEmpaque==='caja_unidad')return (Number(p.stock)||0)+(Number(p.stockCajas)||0)*(Number(p.unidadesPorCaja)||0);
  if(p.tipoEmpaque==='caja')return (Number(p.stockCajas)||Number(p.stock)||0);
  return Number(p.stock)||0;
}
function existenciaDesglose(p){
  if(p&&p.tipoEmpaque==='caja_unidad'){
    const c=Number(p.stockCajas)||0,u=Number(p.stock)||0;
    return `${c} caja${c!==1?'s':''} y ${u} unidad${u!==1?'es':''}`;
  }
  return '';
}
// Existencia expresada en CAJAS (para productos manejados por caja)
function existenciaCajas(p){
  if(!p)return 0;
  if(p.tipoEmpaque==='caja_unidad'){const upc=Number(p.unidadesPorCaja)||1;return (Number(p.stockCajas)||0)+(Number(p.stock)||0)/upc;}
  if(p.tipoEmpaque==='caja')return (Number(p.stockCajas)||Number(p.stock)||0);
  return Number(p.stock)||0;
}
function fmtCajas(n){return (Math.round(n*100)/100).toLocaleString('es-GT',{maximumFractionDigits:2});}
function medidaProducto(p){return (p&&(p.tipoEmpaque==='caja_unidad'||p.tipoEmpaque==='caja'))?'Caja':((p&&p.unidad)||'UNI');}
// Modal para gestionar las categorías y su umbral de stock bajo.
function openCategorias(){
  if(!canEditInventario()){toast('Sin permiso','Solo Admin, Gerencia y Bodega pueden configurar categorías',true);return;}
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _nombresCat=[...new Set([...categorias.map(c=>c.nombre),...productos.map(p=>p.categoria)].map(s=>(s||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const filas=_nombresCat.map(nom=>{
    const c=categorias.find(x=>x.nombre===nom);
    const umb=c?(Number(c.umbralStock)||0):0;
    return `
    <div class="row" data-cat-row style="align-items:flex-end;gap:8px;margin-bottom:8px">
      <div style="flex:2"><input class="cat-nom" value="${esc(nom)}" readonly style="background:var(--surface-2);color:var(--muted)"></div>
      <div style="width:110px"><input class="cat-umb" type="number" min="0" value="${umb}" placeholder="${UMBRAL_STOCK_DEF}"></div>
      ${c?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="borrarCategoriaUI('${esc(nom).replace(/'/g,"\\'")}')">Quitar</button>`:`<span style="width:64px;font-size:9.5px;color:var(--muted-2);text-align:center">en productos</span>`}
    </div>`;
  }).join('');
  openMod('Categorías y umbrales de stock',
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Cuando un producto de la categoría baja de su umbral, se marca en alerta (rojo). Los productos sin categoría usan el umbral por defecto (${UMBRAL_STOCK_DEF} unidades).</p>
     <div class="row" style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;gap:8px;margin-bottom:6px"><div style="flex:2">Categoría</div><div style="width:110px">Umbral (unid.)</div><div style="width:64px"></div></div>
     <div id="cat-lista">${filas||'<div style="font-size:12.5px;color:var(--muted-2);padding:8px 0">Sin categorías todavía. Agregá una abajo.</div>'}</div>
     <div style="font-size:10.5px;font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">Agregar categoría</div>
     <div class="row" style="gap:8px"><div style="flex:2"><input id="cat-new-nom" placeholder="Nombre (ej. Papel)"></div><div style="width:110px"><input id="cat-new-umb" type="number" min="0" placeholder="${UMBRAL_STOCK_DEF}"></div></div>`,
    async ()=>{
      for(const r of [...document.querySelectorAll('#cat-lista [data-cat-row]')]){
        const nom=r.querySelector('.cat-nom').value.trim();
        const umb=Number(r.querySelector('.cat-umb').value)||0;
        let c=categorias.find(x=>x.nombre===nom);
        if(c){if(c.umbralStock!==umb){c.umbralStock=umb;if(typeof guardarCategoria==='function')await guardarCategoria(c);}}
        else if(umb>0){const nc={nombre:nom,umbralStock:umb};categorias.push(nc);if(typeof guardarCategoria==='function')await guardarCategoria(nc);}
      }
      const nn=($('#cat-new-nom')?.value||'').trim(), nu=Number($('#cat-new-umb')?.value)||UMBRAL_STOCK_DEF;
      if(nn&&!categorias.find(x=>(x.nombre||'').toLowerCase()===nn.toLowerCase())){
        const nueva={nombre:nn,umbralStock:nu};categorias.push(nueva);if(typeof guardarCategoria==='function')await guardarCategoria(nueva);
      }
      cerrarTodo();renderProd();toast('✓ Categorías guardadas');
    });
}
window.openCategorias=openCategorias;
async function borrarCategoriaUI(nombre){
  categorias=categorias.filter(c=>c.nombre!==nombre);
  if(typeof borrarCategoria==='function')await borrarCategoria(nombre);
  toast('Categoría quitada',nombre);openCategorias();
}
window.borrarCategoriaUI=borrarCategoriaUI;
function renderProd(){
  // Botón "Nuevo" en el encabezado (según permiso)
  const acc=$('#inv-acciones');
  if(acc)acc.innerHTML=(canEditInventario()?`<button class="btn btn-ghost btn-sm" onclick="openProd()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo</button>`+
    ` <button class="btn btn-ghost btn-sm" onclick="openCategorias()" title="Umbrales de stock por categoría"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Categorías</button>`+
    ` <button class="btn btn-ghost btn-sm" id="btn-ver-inactivos" onclick="toggleVerInactivos()" style="color:var(--muted)">${_verInactivos?'Ocultar inactivos':'Ver inactivos'}</button> `:'')+filtroMarcaInv();
  let lista=_verInactivos?productos:productos.filter(p=>p.activo!==false);
  // Filtrar por marca si está seleccionada
  if(_filtroMarca)lista=lista.filter(p=>(p.marca||'')===_filtroMarca);
  const filasProd=lista.slice().reverse().map(p=>{
  const inactivo=p.activo===false;
  const provs=(p.proveedorIds||[]).map(id=>proveedores.find(x=>x.id===id)).filter(Boolean);
  const provTxt=provs.length?provs.map(pv=>pv.nombre).join(', '):'<span style="color:var(--muted-2)">Sin asignar</span>';
  // Mostrar existencias según el tipo de empaque
  let stockCell;
  const _bajo=!esServicio(p)&&existenciaTotal(p)<=umbralStock(p); // stock bajo (los servicios no cuentan)
  if(p.tipoEmpaque==='caja_unidad'){
    stockCell=`<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">
      <span class="stk ${_bajo?'low':''} num" style="font-size:11px">${p.stockCajas||0} caja${(p.stockCajas||0)!==1?'s':''}</span>
      <span class="stk ${_bajo?'low':''} num" style="font-size:11px">${p.stock} und</span>
      <span class="num" style="font-size:10px;color:${_bajo?'var(--danger)':'var(--muted-2)'}">= ${existenciaTotal(p).toLocaleString('es-GT')} und en total</span></div>`;
  }else{
    stockCell=`<span class="stk ${_bajo?'low':''} num">${p.stock}</span>`;
  }
  let acts='';
  if(canEditInventario()){
    if(inactivo)acts=`<button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="verTrazabilidad(${p.id})">Historial</button> <button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="reactivarProducto(${p.id})">Reactivar</button>`;
    else{
      if(p.tipoEmpaque==='caja_unidad'&&canConvertir())acts+=`<button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="convertirCajas(${p.id})">Convertir a unidades</button> `;
      acts+=`<button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="verTrazabilidad(${p.id})">Historial</button> <button class="btn btn-ghost btn-sm" onclick="openProd(${p.id})">Editar</button> <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="desactivarProducto(${p.id})">Desactivar</button>`;
    }
  }
  const tipoBadge=p.tipoEmpaque==='caja'?' <span class="badge b-muted" style="font-size:9px">Caja</span>':(p.tipoEmpaque==='caja_unidad'?` <span class="badge b-info" style="font-size:9px">Caja×${p.unidadesPorCaja}</span>`:'');
  return `<tr style="${inactivo?'opacity:.5':''}"><td class="num">${p.codigo}<div style="font-size:10px;color:var(--muted-2)">${p.skuProveedor||''}</div></td><td style="font-weight:600">${p.nombre}${tipoBadge}${inactivo?' <span class="badge b-muted" style="font-size:9.5px">Inactivo</span>':''}</td><td style="font-size:12.5px;color:var(--muted)">${p.marca||'<span style="color:var(--muted-2)">—</span>'}</td><td style="font-size:12.5px;color:var(--muted)">${provTxt}</td><td class="num" style="color:var(--muted)">${money(costoActual(p))}</td><td class="num">${money(p.precio)}${p.tipoEmpaque==='caja_unidad'?`<div style="font-size:10px;color:var(--muted-2)">und: ${money((p.precioUnidad&&p.precioUnidad>0)?p.precioUnidad:(p.unidadesPorCaja?Number(p.precio)/Number(p.unidadesPorCaja):0))}</div>`:''}</td><td>${p.unidad}</td><td>${stockCell}</td><td style="white-space:nowrap">${acts}</td></tr>`;});
  renderPaginado('t-prod',filasProd,'Sin productos');enhanceTable('t-prod');}

let _verInactivos=false;
let _filtroMarca='';
// Genera el selector de marca para el inventario
