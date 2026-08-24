function estadoCuentaGrupoPDF(cliId){
  const c=clientes.find(x=>x.id===cliId);if(!c)return;
  const g=grupoStats(c);
  const hoy=fdate(new Date());
  const vend=c.vendedorId?vendedores.find(v=>v.id===c.vendedorId)?.nombre:null;
  // Filas por sede con su saldo
  const filasSedes=g.porSede.map(x=>{
    const s=x.cliente,st=x.st;
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;font-weight:600">${s.nombre}${x.esPrincipal?' (principal)':''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right">Q ${st.totalFacturado.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;color:#2a7d2a">Q ${st.totalCobrado.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:700">Q ${st.saldoActual.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;color:${st.vencidos.length?'#c0392b':'#999'}">${st.vencidos.length||'—'}</td>
    </tr>`;
  }).join('');
  // Detalle de facturas pendientes de todas las sedes
  const pendientes=[];
  g.porSede.forEach(x=>{
    x.st.facturas.forEach(f=>{const ai=arInfo(f);if(ai.saldo>0.001)pendientes.push({sede:x.cliente.nombre,f,ai});});
  });
  pendientes.sort((a,b)=>new Date(a.f.creada)-new Date(b.f.creada));
  const filasPend=pendientes.length?pendientes.map(p=>`<tr>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px">${fdate(p.f.creada)}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;font-weight:600">${p.f.serie}-${p.f.numeroDte}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;color:#2563a8">${p.sede}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;color:${p.ai.vencido?'#c0392b':'#666'}">${fdate(p.f.vencimiento)}</td>
    <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;font-weight:700">Q ${p.ai.saldo.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
  </tr>`).join(''):'<tr><td colspan="5" style="padding:14px;text-align:center;color:#999">Sin facturas pendientes</td></tr>';

  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="flex:1;min-width:240px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Grupo</div>
        <div style="font-size:17px;font-weight:700;margin-top:3px;color:#173916">${c.nombre}</div>
        ${c.razonSocial?`<div style="font-size:12.5px;color:#555">${c.razonSocial}</div>`:''}
        <div style="font-size:12px;color:#666B5C;margin-top:4px">NIT: ${c.nit||'—'} · ${g.sedes.length} sede${g.sedes.length!==1?'s':''}</div>
        ${vend?`<div style="font-size:12px;color:#666B5C;margin-top:2px">Vendedor: ${vend}</div>`:''}
      </div>
      <div style="text-align:right;min-width:230px;background:#F4F7EF;border:1px solid #D6DCC9;border-radius:8px;padding:12px 16px">
        <div style="font-size:10px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.8px">Saldo total del grupo</div>
        <div style="font-size:28px;font-weight:800;color:${g.saldoActual>0?'#9A6B07':'#3B6D11'};margin-top:2px">Q ${g.saldoActual.toLocaleString('es-GT',{minimumFractionDigits:2})}</div>
        ${g.vencidosN?`<div style="font-size:11.5px;color:#BE4326;font-weight:700;margin-top:8px">${g.vencidosN} factura(s) vencida(s)</div>`:''}
      </div>
    </div>
    ${_pdfSec('Resumen por sede')}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${_pdfTH()}">Sede</th>
        <th style="${_pdfTH('text-align:right')}">Facturado</th>
        <th style="${_pdfTH('text-align:right')}">Pagado</th>
        <th style="${_pdfTH('text-align:right')}">Saldo</th>
        <th style="${_pdfTH('text-align:right')}">Vencidas</th>
      </tr></thead>
      <tbody>${filasSedes}</tbody>
    </table>
    ${_pdfSec('Facturas pendientes del grupo')}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${_pdfTH()}">Fecha</th>
        <th style="${_pdfTH()}">Factura</th>
        <th style="${_pdfTH()}">Sede</th>
        <th style="${_pdfTH()}">Vence</th>
        <th style="${_pdfTH('text-align:right')}">Saldo</th>
      </tr></thead>
      <tbody>${filasPend}</tbody>
    </table>
    <div style="margin-top:24px;font-size:11px;color:#666B5C">Estado de cuenta consolidado de todas las sedes del grupo.</div>`;
  _abrirPDF(_pdfShell({titulo:'ESTADO DE CUENTA · GRUPO',subtitulo:c.nombre,orientacion:'portrait',body}));
}
window.estadoCuentaGrupoPDF=estadoCuentaGrupoPDF;
// Promedio de descuento del cliente sobre el precio base, de todos los productos con precio registrado.
// Devuelve el % promedio (negativo = descuento, positivo = recargo) o null si no hay precios.
function _promDescCli(c){
  const ds=[];
  Object.keys(c.precios||{}).map(Number).forEach(pid=>{
    const p=productos.find(x=>x.id===pid);if(!p)return;
    const base=Number(p.precio)||0,pc=Number(c.precios[pid])||0;
    if(base>0)ds.push((pc-base)/base*100);
  });
  return ds.length?ds.reduce((s,v)=>s+v,0)/ds.length:null;
}
function _promDescLabel(prom){
  if(prom===null)return '';
  if(prom<-0.05)return `Descuento promedio: <b style="color:var(--ok)">${Math.abs(prom).toFixed(1)}%</b>`;
  if(prom>0.05)return `Recargo promedio: <b style="color:var(--warn)">${prom.toFixed(1)}%</b>`;
  return `Descuento promedio: <b style="color:var(--muted-2)">0%</b>`;
}
function _actualizarPromDescCli(){
  const c=clientes.find(x=>x.id===cliActual);if(!c)return;
  const el=document.getElementById('cli-prom-desc');if(el)el.innerHTML=_promDescLabel(_promDescCli(c));
}
function setPrecioCli(prodId,val){const c=clientes.find(x=>x.id===cliActual);if(!c)return;c.precios=c.precios||{};
  if(val===''||val==null)return;c.precios[prodId]=Number(val);
  // Marcar que hay cambios sin guardar (el botón "Guardar precios" los persiste)
  _preciosSinGuardar=true;
  const btn=document.getElementById('btn-guardar-precios-cli');
  if(btn){btn.classList.add('btn-primary');btn.classList.remove('btn-ghost');btn.textContent='● Guardar precios';}
  _actualizarPromDescCli();
}
window.setPrecioCli=setPrecioCli;
let _preciosSinGuardar=false;
function guardarPreciosCli(){
  const c=clientes.find(x=>x.id===cliActual);if(!c)return;
  if(typeof guardarCliente==='function')guardarCliente(c);
  _preciosSinGuardar=false;
  const btn=document.getElementById('btn-guardar-precios-cli');
  if(btn){btn.classList.remove('btn-primary');btn.classList.add('btn-ghost');btn.textContent='✓ Precios guardados';
    setTimeout(()=>{if(btn)btn.textContent='Guardar precios';},2000);}
  toast('✓ Precios guardados','Los precios de '+c.nombre+' se guardaron correctamente');
}
window.guardarPreciosCli=guardarPreciosCli;
function addPrecioProd(){const c=clientes.find(x=>x.id===cliActual);if(!c)return;c.precios=c.precios||{};
  const v=($('#cp-add').value||'').trim();if(!v)return;
  const p=productos.find(x=>`${x.codigo} — ${x.nombre}`===v||x.codigo.toLowerCase()===v.toLowerCase()||x.nombre.toLowerCase()===v.toLowerCase());
  if(!p){toast('✗ Producto no encontrado','Seleccioná uno de la lista',true);return;}
  if(c.precios[p.id]!=null){toast('Ese producto ya está en la lista');return;}
  c.precios[p.id]=p.precio;renderCliDet();toast('✓ Producto agregado','Ajustá el precio de '+p.nombre);if(typeof guardarCliente==='function')guardarCliente(c);}
window.addPrecioProd=addPrecioProd;
function quitarPrecio(pid){const c=clientes.find(x=>x.id===cliActual);if(!c)return;delete c.precios[pid];renderCliDet();if(typeof guardarCliente==='function')guardarCliente(c);}
window.quitarPrecio=quitarPrecio;
// ---- Eliminar cliente (SOLO ADMIN) ----
function eliminarCliente(id){
  if(currentRole!=="admin"){toast('Sin permiso','Solo un administrador puede eliminar clientes',true);return;}
  const c=clientes.find(x=>x.id===id);if(!c)return;
  // Verificar si tiene documentos asociados
  const docsCli=documentos.filter(d=>d.clienteId===id);
  const conSaldo=docsCli.filter(d=>d.tipoDoc==='cambiaria'&&['certificada','facturado'].includes(d.estado)&&arInfo(d).saldo>0.01);
  // Verificar si tiene sedes (cliente paraguas)
  const sedes=clientes.filter(x=>x.sedesDe===id);
  let advertencia='';
  if(sedes.length)advertencia+=`<div class="note n-danger" style="margin-bottom:10px"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>Este cliente tiene <b>${sedes.length} sede(s)</b> asociada(s). Al eliminarlo, las sedes quedarán sin cliente principal.</div>`;
  if(conSaldo.length)advertencia+=`<div class="note n-danger" style="margin-bottom:10px"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>⚠ Este cliente tiene <b>${conSaldo.length} factura(s) con saldo pendiente</b> por un total de <b>${money(conSaldo.reduce((s,d)=>s+arInfo(d).saldo,0))}</b>.</div>`;
  const infoDocs=docsCli.length?`<div style="font-size:13px;color:var(--muted);margin-bottom:12px">Este cliente tiene <b>${docsCli.length} documento(s)</b> en el historial. Eliminar el cliente <b>NO borra</b> sus facturas (quedan en el sistema para efectos fiscales), pero ya no aparecerá en la lista de clientes.</div>`:'<div style="font-size:13px;color:var(--muted);margin-bottom:12px">Este cliente no tiene documentos asociados.</div>';
  openMod('Eliminar cliente',
    `${advertencia}
    <p style="font-size:14px;margin-bottom:10px">¿Seguro que querés eliminar a <b>${c.nombre}</b>${c.nit?' (NIT '+c.nit+')':''}?</p>
    ${infoDocs}
    <p style="font-size:12.5px;color:var(--danger)">Esta acción no se puede deshacer.</p>`,
    ()=>confirmarEliminarCliente(id));
  // Cambiar el texto del botón Guardar por algo más claro
  const btnSave=$('#m-save');
  if(btnSave){btnSave.textContent='Sí, eliminar cliente';btnSave.style.background='var(--danger)';btnSave.style.color='#fff';}
}
window.eliminarCliente=eliminarCliente;
function confirmarEliminarCliente(id){
  if(currentRole!=="admin")return;
  const idx=clientes.findIndex(x=>x.id===id);if(idx<0)return;
  const c=clientes[idx];
  clientes.splice(idx,1);
  logAudit('Cliente eliminado',c.nombre+(c.nit?' · NIT '+c.nit:''));
  // Borrar de la base de datos
  if(typeof borrarCliente==='function')borrarCliente(id);
  closeMod();
  toast('✓ Cliente eliminado',c.nombre);
  go('clientes');
}
window.confirmarEliminarCliente=confirmarEliminarCliente;

// ---- Cuentas por cobrar ----
function notasDe(f){
  const cr=documentos.filter(d=>d.tipoDoc==='notaCredito'&&d.facturaOrigenId===f.id&&d.estado!=='anulada').reduce((s,d)=>s+d.totales.total,0);
  return {cr};
}
// Dirección fiscal para la factura: la del documento si se guardó, si no la del cliente actual, y por último 'Ciudad'.
function dirFiscalDoc(f){
  const c=clientes.find(x=>x.id===f.clienteId);
  const d1=(f.clienteDireccion||'').trim();
  const d2=(c&&c.direccion||'').trim();
  return d1||d2||'Ciudad';
}
// Aviso cuando la factura saldría con 'Ciudad' (cliente sin dirección fiscal cargada)
function dirCiudadAlertHTML(f){
  if(typeof dirFiscalDoc!=='function'||dirFiscalDoc(f)!=='Ciudad')return '';
  return `<div class="note" style="background:var(--warn-bg);border:1px solid #E8D08A;color:var(--warn);margin-bottom:14px"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>Este cliente no tiene <b>dirección fiscal</b> cargada — la factura saldrá con <b>"Ciudad"</b>. Podés cancelar y agregarla en <b>Editar datos → Dirección</b>.</span></div>`;
}
// ============================================================
//  Con qué sigla se identifica cada cosa en la columna Documento
// ============================================================
//   FA  factura
//   RE  recibo de un abono
//   RT  retención de IVA o ISR
//   NC  nota de crédito
//
//  Una retención NO es un tipo aparte en la base: se registra como un
//  abono cuyo método empieza con "Retenci" (Retención IVA / ISR). Es
//  la misma regla que usa el reporte de Retenciones.
//
//  Si el abono no trae número —los históricos, de antes de que se
//  usara recibo— queda sólo la sigla.
function esRetencion(a){return /^Retenci/i.test(String((a&&a.metodo)||''));}
function refRecibo(a){
  const sigla=esRetencion(a)?'RT':'RE';
  const num=(a&&(a.noRecibo||a.referencia))||'';
  return num?(sigla+'-'+num):sigla;
}

// ============================================================
//  Lo que se aplica CONTRA una factura y le baja el saldo
// ============================================================
//  Devuelve, en orden de fecha, los abonos y las notas de crédito de
//  una factura. Las notas van incluidas porque reducen la factura
//  igual que un abono — así lo calcula arInfo().
//
//  Vive en un solo lugar a propósito: lo usan la pestaña "Facturas y
//  abonos" de la ficha del cliente y el reporte del mismo nombre. Si
//  cada uno lo calculara por su cuenta, tarde o temprano dirían
//  números distintos sobre la misma factura.
function aplicacionesDeFactura(f){
  return [
    ...(f.abonos||[]).map(a=>({
      fecha:a.fecha, clase:esRetencion(a)?'retencion':'abono', monto:Number(a.monto)||0,
      anulado:!!a.anulado, noRecibo:a.noRecibo, referencia:a.referencia,
      metodo:a.metodo, ref:refRecibo(a), orden:a._id||0 })),
    ...documentos.filter(d=>d.tipoDoc==='notaCredito'&&d.facturaOrigenId===f.id&&d.estado!=='anulada')
      .map(d=>({
        fecha:d.creada, clase:'nc', monto:Number(d.totales.total)||0,
        anulado:false, doc:(d.serie?d.serie+'-':'')+(d.numeroDte||''),
        ref:(d.serie?d.serie+'-':'')+(d.numeroDte||'')||'NC', orden:d.id||0 })),
  ].sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||(a.orden-b.orden));
}
// El texto del renglón. En texto plano, para que sirva igual en
// pantalla y al exportar a Excel.
function detalleAplicacion(x){
  if(x.clase==='nc')return 'Nota de crédito '+(x.doc||'');
  const etiqueta=x.clase==='retencion'?'Retención':'Abono';
  const num=x.noRecibo||x.referencia||'';
  return num?(etiqueta+' '+x.ref):(etiqueta+' · sin recibo');
}
function arInfo(f){
  const {cr}=notasDe(f);
  const totalAjustado=Math.round((f.totales.total-cr)*100)/100;
  const abon=(f.abonos||[]).filter(a=>!a.anulado).reduce((s,a)=>s+Number(a.monto),0);
  const saldo=Math.round((totalAjustado-abon)*100)/100;
  const estado=saldo<=0.001?'pagado':(abon>0?'parcial':'pendiente');
  // Si no hay vencimiento (ej. factura al contado, 0 días), la fecha de vencimiento es la de emisión.
  const venc=f.vencimiento?new Date(f.vencimiento):((f.tipoDoc==='cambiaria'&&(f.fechaCertificacion||f.creada))?new Date(f.fechaCertificacion||f.creada):null);
  const vencido=estado!=='pagado'&&venc&&new Date()>venc;
  return {abon,saldo,estado,vencido,venc,cr,totalAjustado};
}
// ============================================================
//  FECHAS — todo el sistema muestra dd-mm-yyyy
// ============================================================
//  fdate()     → 12-08-2026
//  fdatehora() → 12-08-2026 14:35
//
//  Toda fecha que se MUESTRE tiene que pasar por acá. Las que se
//  guardan, se comparan o van en un campo de calendario siguen en
//  aaaa-mm-dd, que es lo que exige el navegador y lo único que se
//  ordena bien alfabéticamente. Son dos cosas distintas: el formato
//  de guardar y el de mostrar.
// ============================================================

// Interpreta la fecha respetando la zona de Guatemala.
function _fechaDe(d){
  // Un texto "AAAA-MM-DD" (sólo fecha) JS lo toma como medianoche UTC,
  // y al mostrarlo en GT (UTC-6) se corre un día hacia atrás. Por eso
  // se arma como fecha LOCAL a partir de sus partes.
  const m=(typeof d==='string')&&d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const fecha=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(d);
  return isNaN(fecha.getTime())?null:fecha;
}
function fdate(d){
  if(!d)return '—';
  const f=_fechaDe(d);
  if(!f)return '—';   // antes devolvía "NaN-NaN-NaN"
  const z=n=>String(n).padStart(2,'0');
  return `${z(f.getDate())}-${z(f.getMonth()+1)}-${f.getFullYear()}`;
}
// Igual, pero con la hora. Para auditoría y los "generado el" de los
// reportes, donde saber la hora sí importa.
function fdatehora(d){
  if(!d)return '—';
  const f=_fechaDe(d);
  if(!f)return '—';
  const z=n=>String(n).padStart(2,'0');
  return `${z(f.getDate())}-${z(f.getMonth()+1)}-${f.getFullYear()} ${z(f.getHours())}:${z(f.getMinutes())}`;
}
window.fdate=fdate;
window.fdatehora=fdatehora;
function cobrosEnFiltro(f,ai){
  const cli=$('#cb-cliente')?.value,est=$('#cb-estado')?.value,met=$('#cb-metodo')?.value,desde=$('#cb-desde')?.value,hasta=$('#cb-hasta')?.value;
  if(cli&&String(f.clienteId)!==cli)return false;
  if(est){if(est==='vencido'){if(!ai.vencido)return false;}else if(ai.estado!==est||ai.vencido)return false;}
  if(met&&!(f.abonos||[]).some(a=>!a.anulado&&a.metodo===met))return false;
  if(desde&&f.vencimiento&&new Date(f.vencimiento)<new Date(desde+'T00:00:00'))return false;
  if(hasta&&f.vencimiento&&new Date(f.vencimiento)>new Date(hasta+'T23:59:59'))return false;
  return true;
}
function limpiarFiltroCobros(){['cb-cliente','cb-estado','cb-metodo','cb-desde','cb-hasta'].forEach(id=>{const e=$('#'+id);if(e)e.value='';});renderCobros();}
window.limpiarFiltroCobros=limpiarFiltroCobros;
function renderLlamarHoy(ars){
  const box=$('#cobros-llamar');if(!box)return;
  // Agrupar facturas vencidas o que vencen pronto, por cliente
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const porCli={};
  ars.forEach(f=>{
    const ai=arInfo(f);if(ai.saldo<=0.001||!ai.venc)return;
    const dias=Math.floor((hoy-ai.venc)/86400000); // >0 = vencida hace N días (ai.venc usa la emisión si es contado sin fecha)
    if(dias< -3)return; // todavía falta más de 3 días, no urge llamar
    const cid=f.clienteId;
    if(!porCli[cid])porCli[cid]={cliente:f.clienteComercial||f.clienteNombre,clienteId:cid,saldo:0,facturas:0,maxDias:-999};
    porCli[cid].saldo+=ai.saldo;porCli[cid].facturas++;porCli[cid].maxDias=Math.max(porCli[cid].maxDias,dias);
  });
  const lista=Object.values(porCli).sort((a,b)=>b.maxDias-a.maxDias||b.saldo-a.saldo);
  if(!lista.length){box.style.display='none';return;}
  box.style.display='';
  const fila=c=>{
    const cli=clientes.find(x=>x.id===c.clienteId);
    const contacto=cli?.contactoPagos||{};
    const urg=c.maxDias>0;
    const etiqueta=c.maxDias>0?`Vencido hace ${c.maxDias}d`:c.maxDias===0?'Vence hoy':`Vence en ${Math.abs(c.maxDias)}d`;
    const tel=contacto.telefono||'';
    const telBtn=tel?`<a href="tel:${tel}" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()" style="text-decoration:none">☎ ${tel}</a>`:'<span style="font-size:11px;color:var(--muted-2)">Sin teléfono</span>';
    const waBtn=tel?`<a href="https://wa.me/502${tel.replace(/[^0-9]/g,'')}" target="_blank" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()" style="text-decoration:none;color:#25928a">WhatsApp</a>`:'';
    return `<tr style="cursor:pointer" onclick="abrirCliente(${c.clienteId})">
      <td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${urg?'var(--danger)':'var(--warn)'};margin-right:7px"></span><b>${c.cliente}</b>${contacto.nombre?`<div style="font-size:10.5px;color:var(--muted);margin-left:16px">${contacto.nombre}</div>`:''}</td>
      <td><span class="badge ${urg?'b-danger':'b-warn'}">${etiqueta}</span></td>
      <td class="num" style="font-weight:700;color:${urg?'var(--danger)':'var(--warn)'}">${money(c.saldo)}</td>
      <td style="color:var(--muted)">${c.facturas} factura${c.facturas!==1?'s':''}</td>
      <td style="white-space:nowrap">${telBtn} ${waBtn}</td>
    </tr>`;
  };
  const totalGestionar=lista.reduce((s,c)=>s+c.saldo,0);
  box.innerHTML=`<div class="panel-head"><h3>📞 A quién llamar hoy</h3><span style="font-size:12px;color:var(--muted)">${lista.length} cliente${lista.length!==1?'s':''} · ${money(totalGestionar)} por gestionar</span></div>
    <table><thead><tr><th>Cliente</th><th>Urgencia</th><th>Saldo</th><th>Detalle</th><th>Contacto</th></tr></thead><tbody>${lista.map(fila).join('')}</tbody></table>`;
}
window.renderLlamarHoy=renderLlamarHoy;
function renderCobros(){
  const btnPG=$('#btn-pago-global');
  if(btnPG)btnPG.style.display=canRegistrarAbono()?'':'none';
  const ars=documentos.filter(d=>d.tipoDoc==='cambiaria'&&d.estado!=='anulada');
  // ── Panel "A quién llamar hoy" ──
  renderLlamarHoy(ars);
  const selCli=$('#cb-cliente');
  if(selCli&&selCli.dataset.built!=='1'){
    const clisConFactura=clientes.filter(c=>ars.some(f=>f.clienteId===c.id));
    selCli.innerHTML='<option value="">Todos</option>'+clisConFactura.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
    selCli.dataset.built='1';
  }
  const todas=ars.map(f=>({f,...arInfo(f)}));
  const info=todas.filter(x=>cobrosEnFiltro(x.f,x));
  const porCobrar=info.reduce((s,x)=>s+Math.max(0,x.saldo),0);
  const vencidoM=info.filter(x=>x.vencido).reduce((s,x)=>s+x.saldo,0);
  const vencidasN=info.filter(x=>x.vencido).length;
  const pend=info.filter(x=>x.saldo>0.001).length;
  const clis=new Set(info.filter(x=>x.saldo>0.001).map(x=>x.f.clienteId)).size;
  const k=[
    {ic:'i-green',svg:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',lbl:'Total por cobrar',val:money(porCobrar),sub:pend+' facturas pendientes'},
    {ic:'i-warn',svg:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',lbl:'Vencido',val:money(vencidoM),sub:'requiere gestión de cobro'},
    {ic:'i-warn',svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',lbl:'Facturas vencidas',val:vencidasN,sub:vencidasN===1?'ya pasó su vencimiento':'ya pasaron su vencimiento'},
    {ic:'i-lime',svg:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',lbl:'Clientes con saldo',val:clis,sub:'con deuda pendiente'},
  ];
  $('#cobros-kpis').innerHTML=k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div>`).join('');

  // Cartera por antigüedad (sobre el filtro activo)
  const buckets={al30:0,c30:0,c60:0,c90:0,c90p:0};
  info.forEach(x=>{if(x.saldo<=0.001)return;
    if(!x.venc||!x.vencido){buckets.al30+=x.saldo;return;}
    const dias=Math.floor((new Date()-x.venc)/86400000);
    if(dias<=30)buckets.c30+=x.saldo;else if(dias<=60)buckets.c60+=x.saldo;else if(dias<=90)buckets.c90+=x.saldo;else buckets.c90p+=x.saldo;});
  const maxB=Math.max(1,buckets.al30,buckets.c30,buckets.c60,buckets.c90,buckets.c90p);
  const ageRow=(lbl,v,color)=>`<div class="hbar-row"><div class="hbar-name">${lbl}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v/maxB*100)}%;background:${color}"></div></div><div class="hbar-val num">${money(v)}</div></div>`;
  $('#cobros-aging').innerHTML=`<div class="panel-head"><h3>Cartera por antigüedad</h3><span style="font-size:12px;color:var(--muted)">Saldo pendiente por rango de mora</span></div>
    <div class="panel-body">
    ${ageRow('Al día / por vencer',buckets.al30,'var(--ok)')}
    ${ageRow('0–30 días vencido',buckets.c30,'var(--warn)')}
    ${ageRow('31–60 días',buckets.c60,'#D98A2B')}
    ${ageRow('61–90 días',buckets.c90,'#C45A2C')}
    ${ageRow('+90 días',buckets.c90p,'var(--danger)')}
    </div>`;

  $('#cobros-empty').style.display=info.length?'none':'block';
  const EST={pagado:['Pagado','b-ok'],parcial:['Parcial','b-info'],pendiente:['Pendiente','b-warn']};
  $('#t-cobros').innerHTML=info.sort((a,b)=>(b.vencido?1:0)-(a.vencido?1:0)).map(x=>{
    const f=x.f;const [en,ec]=x.vencido?['Vencido','b-danger']:EST[x.estado];
    const nAbonos=(f.abonos||[]).filter(a=>!a.anulado).length;
    let acts=`<button class="btn btn-ghost btn-sm" onclick="verDoc(${f.id})">Ver</button>`;
    acts+=`<button class="btn btn-ghost btn-sm" onclick="openHistorialAbonos(${f.id})">Abonos${nAbonos?' ('+nAbonos+')':''}</button>`;
    if(x.saldo>0.001&&canRegistrarAbono())acts=`<button class="btn btn-primary btn-sm" onclick="openAbono(${f.id})">Registrar abono</button> <button class="btn btn-ghost btn-sm" style="color:#7A4A9E" onclick="openRetencion(${f.id})" title="Registrar retención de IVA o ISR">Retención</button>`+acts;
    return `<tr>
      <td style="font-weight:600">${f.serie}-${f.numeroDte}</td>
      <td>${f.clienteComercial||f.clienteNombre}</td>
      <td style="color:var(--muted)">${fdate(f.creada)}</td>
      <td style="color:${x.vencido?'var(--danger)':'var(--muted)'};font-weight:${x.vencido?'600':'400'}">${fdate(f.vencimiento||x.venc)}</td>
      <td class="num">${money(f.totales.total)}</td>
      <td class="num" style="color:var(--ok)">${money(x.abon)}</td>
      <td class="num" style="font-weight:700">${money(x.saldo)}</td>
      <td><span class="badge ${ec}">${en}</span></td>
      <td><div class="acts">${acts}</div></td></tr>`;
  }).join('');
  enhanceTable('t-cobros');
}
$('#cb-cliente').onchange=renderCobros;
$('#cb-estado').onchange=renderCobros;
$('#cb-metodo').onchange=renderCobros;
$('#cb-desde').onchange=renderCobros;
$('#cb-hasta').onchange=renderCobros;
// ---- Widget de foto de comprobante (reutilizable) ----
let _compFoto=null; // dataURL temporal de la foto cargada
function compFotoHTML(){
  return `<div id="comp-foto-wrap" style="margin-bottom:13px">
    <label>Foto del comprobante <span style="font-weight:400;color:var(--muted-2)">(opcional)</span></label>
    <input type="file" id="comp-file" accept="image/*" capture="environment" style="display:none" onchange="cargarCompFoto(this)">
    <div id="comp-zone">
      <div class="comp-drop" onclick="document.getElementById('comp-file').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        <div class="comp-drop-txt">Tomar foto o subir imagen del recibo / boleta</div>
      </div>
    </div>
  </div>`;
}
function cargarCompFoto(input){
  const file=input.files&&input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    _compFoto=e.target.result;
    $('#comp-zone').innerHTML=`<div class="comp-preview"><img src="${_compFoto}" alt="Comprobante"><button class="comp-x" onclick="quitarCompFoto()" type="button">×</button></div>`;
  };
  reader.readAsDataURL(file);
}
window.cargarCompFoto=cargarCompFoto;
function quitarCompFoto(){
  _compFoto=null;
  const z=$('#comp-zone');
  if(z)z.innerHTML=`<div class="comp-drop" onclick="document.getElementById('comp-file').click()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
    <div class="comp-drop-txt">Tomar foto o subir imagen del recibo / boleta</div></div>`;
}
window.quitarCompFoto=quitarCompFoto;
function verComprobante(tipo,id,idx){
  let foto=null;
  if(tipo==='compra'){const c=compras.find(x=>x.id===id);foto=c?.abonos?.[idx]?.comprobante;}
  else{const f=documentos.find(x=>x.id===id);foto=f?.abonos?.[idx]?.comprobante;}
  if(!foto){toast('Sin comprobante adjunto',null,true);return;}
  openMod('Comprobante de pago',`<div style="text-align:center"><img src="${foto}" style="max-width:100%;border-radius:10px;border:1px solid var(--line)"></div>`,()=>closeMod());
  $('#m-save').textContent='Cerrar';$('#m-save').className='btn btn-ghost';
}
window.verComprobante=verComprobante;

function _abTalonarioChange(){
  const t=(talonarios||[]).find(x=>x.id===Number($('#ab-talonario')?.value));
  if(!t)return;
  const prox=proximoReciboLibre(t,recibosUsados());
  if(prox!=null&&$('#ab-recibo'))$('#ab-recibo').value=prox;
}
window._abTalonarioChange=_abTalonarioChange;
function openAbono(id){
  _compFoto=null;
  const f=documentos.find(d=>d.id===id);const ai=arInfo(f);const saldo=ai.saldo;
  const hoy=fechaHoyGT();
  const _tals=talonariosConLibres();
  const _hayTal=_tals.length>0;
  const _miTal=_tals.find(x=>x.t.asignadoA===currentUser)||_tals[0];
  const _recIni=_hayTal?_miTal.proximo:String(Date.now()).slice(-6);
  const _favor=saldoFavor(f.clienteId);
  openMod('Registrar abono · '+f.serie+'-'+f.numeroDte,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${f.clienteNombre} · Saldo pendiente: <b style="color:var(--ink)">${money(saldo)}</b></p>
     ${(_favor>0.001&&saldo>0.001)?`<div class="note n-ok" style="margin-bottom:12px"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Este cliente tiene <b>${money(_favor)}</b> de saldo a favor. <a href="#" onclick="aplicarSaldoFavor(${f.id});return false" style="color:var(--brand);font-weight:600">Aplicarlo a esta factura</a></span></div>`:''}
     ${_hayTal?`<div class="row"><div><label>Talonario</label><select id="ab-talonario" onchange="_abTalonarioChange()">${_tals.map(x=>`<option value="${x.t.id}" ${x.t.id===_miTal.t.id?'selected':''}>${(x.t.descripcion||('Talón '+x.t.numeroInicial))} · ${x.t.asignadoA||'sin asignar'} (${x.t.numeroInicial}–${x.t.numeroFinal})</option>`).join('')}</select></div></div>`:`<div class="note" style="margin-bottom:12px;background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>No hay talonarios con recibos libres. Cargá uno en <b>Talonarios</b>; por ahora el número queda libre.</span></div>`}
     <div class="row"><div><label>No. de recibo ${_hayTal?'<span style="color:var(--muted);font-weight:400">(del talonario)</span>':''}</label><input id="ab-recibo" value="${_recIni}"></div><div><label>Fecha</label><input id="ab-fecha" type="date" value="${hoy}"></div></div>
     <div class="row"><div><label>Monto del abono</label><input id="ab-monto" type="number" step="0.01" value="${saldo.toFixed(2)}" data-saldo="${saldo.toFixed(2)}" oninput="_abChkExceso()"></div><div><label>Método</label><select id="ab-met"><option>Efectivo</option><option>Transferencia</option><option>Cheque</option><option>Depósito</option><option>Tarjeta</option></select></div></div>
     <div id="ab-exceso" style="display:none;font-size:11.5px;color:#7A4A07;background:var(--warn-bg,#fff8e6);border:1px solid rgba(168,130,0,.2);border-radius:8px;padding:7px 10px;margin:-4px 0 10px"></div>
     <div class="row"><div><label>Referencia / No. boleta / cheque</label><input id="ab-ref" placeholder="Opcional"></div></div>
     <div class="row">${selectorCuentaBancoHTML('ab-cuenta','¿A qué cuenta entró el dinero?')}</div>
     ${compFotoHTML()}
     <div class="note n-danger" id="ab-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const monto=Number($('#ab-monto').value);
      if(!(monto>0)){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='El monto debe ser mayor a cero';return;}
      if(_hayTal){
        const _t=(talonarios||[]).find(x=>x.id===Number($('#ab-talonario')?.value));
        const _n=parseInt(($('#ab-recibo')?.value||'').replace(/\D/g,''),10);
        if(!_t||isNaN(_n)||_n<_t.numeroInicial||_n>_t.numeroFinal){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='El No. de recibo debe pertenecer al talonario seleccionado'+(_t?(' ('+_t.numeroInicial+'–'+_t.numeroFinal+')'):'');return;}
        if(recibosUsados().has(_n)){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='Ese recibo ('+_n+') ya fue usado. Elegí el siguiente libre.';return;}
      }
      // Interruptor: sin la tabla de saldo a favor (migración no aplicada aún),
      // se mantiene el bloqueo viejo para no crear créditos que no se guardan.
      if(!window._saldoFavorTabla && monto>saldo+0.001){$('#ab-err').style.display='flex';$('#ab-err').querySelector('span').textContent='El abono no puede superar el saldo de '+money(saldo);return;}
      // Sobrepago permitido: se aplica hasta el saldo y el resto queda como
      // SALDO A FAVOR del cliente. El banco registra lo que entró de verdad.
      const aplicado=Math.min(monto,Math.max(0,saldo));
      const exceso=Math.round((monto-aplicado)*100)/100;
      const _cta=($('#ab-cuenta')?.value||null), _fecha=$('#ab-fecha').value||hoy;
      const _rec=$('#ab-recibo').value.trim(), _met=$('#ab-met').value, _ref=$('#ab-ref').value;
      // 1) Abono a la factura (por lo que se aplica)
      if(aplicado>0.001){
        f.abonos=f.abonos||[];
        const _ab={fecha:_fecha,monto:aplicado,metodo:_met,referencia:_ref,
          noRecibo:_rec,comprobante:_compFoto,cuentaBancoId:_cta,
          registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
        f.abonos.push(_ab);
        f.estadoPago=arInfo(f).estado;
        if(typeof guardarAbono==='function')guardarAbono(f.id,_ab);
        if(typeof guardarDocumento==='function')guardarDocumento(f);
      }
      // 2) Excedente → saldo a favor del cliente
      if(exceso>0.001){
        const _cr={clienteId:f.clienteId,tipo:'ingreso',monto:exceso,fecha:_fecha,documentoId:f.id,
          noRecibo:_rec,metodo:_met,referencia:_ref,cuentaBancoId:_cta,
          concepto:'Sobrepago recibo '+(_rec||'—')+' · '+(f.clienteComercial||f.clienteNombre),
          registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
        creditosCliente=creditosCliente||[];creditosCliente.push(_cr);
        if(typeof guardarCredito==='function')guardarCredito(_cr);
      }
      // 3) Movimiento de banco por lo que REALMENTE entró (depósito completo)
      if(_cta){
        registrarMovimientoBanco({cuentaId:_cta,tipo:'entrada',monto,
          concepto:'Cobro '+(_rec||'')+' · '+(f.clienteComercial||f.clienteNombre)+(exceso>0.001?' (incluye saldo a favor '+money(exceso)+')':''),
          categoria:'cobro',origen:'cobro',origenId:f.id,referencia:_ref,fecha:_fecha});
      }
      closeMod();renderCobros();
      logAudit('Abono registrado','Recibo '+(_rec||'—')+' · '+f.serie+'-'+f.numeroDte+' · '+(f.clienteComercial||f.clienteNombre)+' · '+money(monto)+(exceso>0.001?' (saldo a favor '+money(exceso)+')':''));
      toast(exceso>0.001?'✓ Cobro con saldo a favor':'✓ Abono registrado',
        (aplicado>0.001?'Aplicado '+money(aplicado):'')+(exceso>0.001?(aplicado>0.001?' · ':'')+'Saldo a favor '+money(exceso):' · saldo '+money(arInfo(f).saldo)));
    });
}
window.openAbono=openAbono;
// Aviso en vivo del sobrepago dentro del modal de abono: si el monto supera
// el saldo, muestra cuánto se aplica y cuánto queda como saldo a favor.
function _abChkExceso(){
  const inp=document.getElementById('ab-monto'), box=document.getElementById('ab-exceso');
  if(!inp||!box)return;
  const saldo=Number(inp.dataset.saldo||0), monto=Number(inp.value||0);
  const exceso=Math.round((monto-saldo)*100)/100;
  if(exceso>0.001){box.style.display='block';
    box.innerHTML=`Se aplican <b>${money(Math.max(0,saldo))}</b> a esta factura y <b>${money(exceso)}</b> quedan como <b>saldo a favor</b> del cliente.`;}
  else box.style.display='none';
}
window._abChkExceso=_abChkExceso;
// Aplicar el saldo a favor del cliente a una factura pendiente. Crea un abono
// financiado por el crédito (método "Saldo a favor") y consume el crédito.
// NO genera movimiento de banco: ese dinero ya entró cuando se registró el
// sobrepago/anticipo.
function aplicarSaldoFavor(id){
  if(!canRegistrarAbono()){toast('Sin permiso','Tu rol no puede registrar cobros',true);return;}
  const f=documentos.find(d=>d.id===id);if(!f)return;
  const saldo=arInfo(f).saldo, disp=saldoFavor(f.clienteId);
  if(disp<=0.001){toast('Sin saldo a favor','Este cliente no tiene saldo a favor disponible',true);return;}
  if(saldo<=0.001){toast('Sin saldo pendiente','Esta factura ya está saldada',true);return;}
  const aplicar=Math.round(Math.min(saldo,disp)*100)/100;
  confirmar('Aplicar saldo a favor',`Se aplicarán <b>${money(aplicar)}</b> del saldo a favor del cliente a la factura <b>${f.serie}-${f.numeroDte}</b> (saldo ${money(saldo)}).<br><span style="font-size:11.5px;color:var(--muted)">No entra dinero a banco: ese saldo ya había ingresado.</span>`,'Aplicar',()=>{
    const hoy=fechaHoyGT(), ahora=new Date().toISOString();
    f.abonos=f.abonos||[];
    const _ab={fecha:hoy,monto:aplicar,metodo:'Saldo a favor',referencia:'Aplicación de saldo a favor',
      noRecibo:'',comprobante:null,cuentaBancoId:null,
      registradoPor:currentUser,registradoEl:ahora,anulado:false};
    f.abonos.push(_ab);
    f.estadoPago=arInfo(f).estado;
    if(typeof guardarAbono==='function')guardarAbono(f.id,_ab);
    if(typeof guardarDocumento==='function')guardarDocumento(f);
    const _cr={clienteId:f.clienteId,tipo:'aplicacion',monto:aplicar,fecha:hoy,documentoId:f.id,
      metodo:'Saldo a favor',concepto:'Aplicado a factura '+f.serie+'-'+f.numeroDte,
      registradoPor:currentUser,registradoEl:ahora,anulado:false};
    creditosCliente=creditosCliente||[];creditosCliente.push(_cr);
    if(typeof guardarCredito==='function')guardarCredito(_cr);
    closeMod();renderCobros();
    logAudit('Saldo a favor aplicado',f.serie+'-'+f.numeroDte+' · '+(f.clienteComercial||f.clienteNombre)+' · '+money(aplicar));
    toast('✓ Saldo a favor aplicado',money(aplicar)+' a '+f.serie+'-'+f.numeroDte+' · queda a favor '+money(saldoFavor(f.clienteId)));
  });
}
window.aplicarSaldoFavor=aplicarSaldoFavor;

// ---- Pago global (un recibo, varias facturas) ----
// Todas las casillas de este modal se buscan SÓLO dentro de #ov-pago.
// Motivo: closeMod() nunca vacía el #m-body, así que el HTML del último
// modal genérico se queda pegado en la página, y como #ov está antes que
// #ov-pago, un id repetido haría que leamos la casilla equivocada.
function $pg(sel){return document.querySelector('#ov-pago '+sel);}
function _pgTalonarioChange(){
  const t=(talonarios||[]).find(x=>x.id===Number($pg('#pg-talonario')?.value));
  if(!t)return;
  const prox=proximoReciboLibre(t,recibosUsados());
  if(prox!=null&&$pg('#pg-recibo'))$pg('#pg-recibo').value=prox;
}
window._pgTalonarioChange=_pgTalonarioChange;
function openPagoGlobal(){
  // Poblar datalist de clientes
  const list=$pg('#pg-cli-list');
  if(list)list.innerHTML=clientes.map(c=>`<option value="${c.nombre} · ${c.nit}">`).join('');
  $pg('#pg-cli-search').value='';$pg('#pg-cli-id').value='';
  // Talonarios: llenar el selector y sugerir el próximo recibo libre
  const _tals=talonariosConLibres();
  const _tsel=$pg('#pg-talonario');
  if(_tsel&&_tals.length){
    const _mi=_tals.find(x=>x.t.asignadoA===currentUser)||_tals[0];
    _tsel.innerHTML=_tals.map(x=>`<option value="${x.t.id}" ${x.t.id===_mi.t.id?'selected':''}>${(x.t.descripcion||('Talón '+x.t.numeroInicial))} · ${x.t.asignadoA||'sin asignar'} (${x.t.numeroInicial}–${x.t.numeroFinal})</option>`).join('');
    if(_tsel.parentElement)_tsel.parentElement.style.display='';
    $pg('#pg-recibo').value=_mi.proximo;
  }else{
    if(_tsel){_tsel.innerHTML='';if(_tsel.parentElement)_tsel.parentElement.style.display='none';}
    $pg('#pg-recibo').value='REC-'+String(Date.now()).slice(-6);
  }
  $pg('#pg-fecha').value=fechaHoyGT();
  $pg('#pg-met').value='Efectivo';$pg('#pg-ref').value='';
  const _cw=$pg('#pg-cuenta-wrap');if(_cw)_cw.innerHTML=selectorCuentaBancoHTML('pg-cuenta','¿A qué cuenta entró el dinero?');
  $pg('#pg-facturas-wrap').innerHTML='<div class="empty">Seleccioná un cliente para ver sus facturas pendientes.</div>';
  $pg('#pg-distribuido').textContent='Q 0.00';$pg('#pg-restante').textContent='—';
  $pg('#pg-err').style.display='none';
  $('#ov-pago').classList.add('show');
}
window.openPagoGlobal=openPagoGlobal;
function closePagoGlobal(){$('#ov-pago').classList.remove('show');}
window.closePagoGlobal=closePagoGlobal;
/* cierre por clic afuera desactivado en pago global */
function pgGetCliId(){
  const v=($pg('#pg-cli-search').value||'').trim();
  const c=clientes.find(x=>`${x.nombre} · ${x.nit}`===v||x.nit.toLowerCase()===v.toLowerCase()||x.nombre.toLowerCase()===v.toLowerCase());
  return c?c.id:null;
}
function pgCargaFacturas(){
  const cliId=pgGetCliId();if(!cliId){$pg('#pg-cli-id').value='';$pg('#pg-facturas-wrap').innerHTML='<div class="empty">Seleccioná un cliente para ver sus facturas pendientes.</div>';pgActualizaTotales();return;}
  $pg('#pg-cli-id').value=String(cliId);
  const cli=clientes.find(c=>c.id===cliId);
  // Reunir todos los IDs relacionados por NIT (el cliente + sus sedes o su matriz + hermanas)
  const nit=cli.nit;
  const todosConNit=clientes.filter(c=>c.nit===nit&&c.nit!=='CF').map(c=>c.id);
  const hayVarias=todosConNit.length>1;
  const pendientes=documentos.filter(d=>todosConNit.includes(d.clienteId)&&d.tipoDoc==='cambiaria'&&d.estado!=='anulada').map(d=>{
    const sede=clientes.find(c=>c.id===d.clienteId);return {d,sede,...arInfo(d)};
  }).filter(x=>x.saldo>0.001).sort((a,b)=>new Date(a.d.creada)-new Date(b.d.creada));
  if(!pendientes.length){$pg('#pg-facturas-wrap').innerHTML=`<div class="empty">${hayVarias?`Este NIT (${nit}) no tiene facturas pendientes en ninguna sede.`:'Este cliente no tiene facturas pendientes de pago.'}</div>`;pgActualizaTotales();return;}
  $pg('#pg-facturas-wrap').innerHTML=`
    <div style="font-size:11px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
      Facturas pendientes${hayVarias?` · NIT ${nit} (${todosConNit.length} sedes)`:''}
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;font-size:10.5px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.4px;padding:8px 0;border-bottom:1px solid var(--line)">Factura${hayVarias?' / Sede':''}</th>
        <th style="text-align:left;font-size:10.5px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.4px;padding:8px 0;border-bottom:1px solid var(--line)">Vence</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.4px;padding:8px 0;border-bottom:1px solid var(--line)">Total</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.4px;padding:8px 0;border-bottom:1px solid var(--line)">Saldo</th>
        <th style="text-align:right;font-size:10.5px;font-weight:600;color:var(--muted-2);text-transform:uppercase;letter-spacing:.4px;padding:8px 0;border-bottom:1px solid var(--line)">Aplicar</th>
        <th style="padding:8px 0;border-bottom:1px solid var(--line)"><button class="btn btn-ghost btn-sm" onclick="pgLimpiarTodo()" style="font-size:11px">Limpiar</button></th>
      </tr></thead>
      <tbody>${pendientes.map(x=>`<tr>
        <td style="padding:9px 0;border-bottom:1px solid var(--line)">
          <div style="font-weight:600;font-size:13px">${x.d.serie}-${x.d.numeroDte}</div>
          ${hayVarias?`<div style="font-size:10.5px;color:var(--blue)">${x.sede?.nombre||x.d.clienteNombre}</div>`:''}
          <div style="font-size:10.5px;color:var(--muted)">${fdate(x.d.creada)}</div>
        </td>
        <td style="padding:9px 0;border-bottom:1px solid var(--line);color:${x.vencido?'var(--danger)':'var(--muted)'};font-size:12.5px">${fdate(x.d.vencimiento)}</td>
        <td style="padding:9px 0;border-bottom:1px solid var(--line);text-align:right" class="num">${money(x.d.totales.total)}</td>
        <td style="padding:9px 0;border-bottom:1px solid var(--line);text-align:right;font-weight:700" class="num">${money(x.saldo)}</td>
        <td style="padding:9px 0;border-bottom:1px solid var(--line);text-align:right">
          <input type="number" step="0.01" min="0" max="${x.saldo.toFixed(2)}" class="pg-monto-input num" data-id="${x.d.id}" data-saldo="${x.saldo.toFixed(2)}" placeholder="0.00" style="width:110px;text-align:right;padding:6px 8px" oninput="pgActualizaTotales()">
        </td>
        <td style="padding:9px 0;border-bottom:1px solid var(--line);padding-left:8px">
          <button class="btn btn-ghost btn-sm" onclick="pgAplicarSaldo(${x.d.id},${x.saldo.toFixed(2)})" title="Aplicar saldo completo">Todo</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  pgActualizaTotales();
}
window.pgCargaFacturas=pgCargaFacturas;
function pgActualizaTotales(){
  const inputs=Array.from(document.querySelectorAll('#ov-pago .pg-monto-input'));
  const dist=inputs.reduce((s,i)=>s+(Number(i.value)||0),0);
  $pg('#pg-distribuido').textContent=money(dist);
  $pg('#pg-distribuido').style.color=dist>0?'var(--ok)':'var(--green)';
  $pg('#pg-restante').textContent='—';$pg('#pg-restante').style.color='var(--muted)';
}
window.pgActualizaTotales=pgActualizaTotales;
function pgAplicarSaldo(docId,saldo){
  const inp=document.querySelector(`#ov-pago .pg-monto-input[data-id="${docId}"]`);
  if(inp){inp.value=saldo.toFixed(2);pgActualizaTotales();}
}
window.pgAplicarSaldo=pgAplicarSaldo;
function pgLimpiarTodo(){
  document.querySelectorAll('#ov-pago .pg-monto-input').forEach(i=>i.value='');pgActualizaTotales();
}
window.pgLimpiarTodo=pgLimpiarTodo;
function pgDistribuirFIFO(){
  // Obtener inputs ordenados por fecha (ya vienen en orden FIFO)
  const inputs=Array.from(document.querySelectorAll('#ov-pago .pg-monto-input'));
  // Primero pedimos el monto total a distribuir
  const totalStr=prompt('Monto total del pago a distribuir (Q):');
  if(!totalStr)return;
  let restante=Number(totalStr.replace(/[^0-9.]/g,''));
  if(!(restante>0)){toast('Monto inválido',null,true);return;}
  inputs.forEach(inp=>{
    const saldo=Number(inp.dataset.saldo)||0;
    const aplicar=Math.min(restante,saldo);
    inp.value=aplicar>0?aplicar.toFixed(2):'';
    restante=Math.round((restante-aplicar)*100)/100;
  });
  pgActualizaTotales();
  if(restante>0.001)toast('Distribuido','Sobra '+money(restante)+' sin asignar');
  else toast('Distribuido','Todo el monto fue asignado a facturas');
}
window.pgDistribuirFIFO=pgDistribuirFIFO;
function guardarPagoGlobal(){
  const cliId=pgGetCliId();
  if(!cliId){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent='Seleccioná un cliente';return;}
  const recibo=$pg('#pg-recibo').value.trim();
  if(!recibo){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent='Ingresá el número de recibo';return;}
  const _tsel2=$pg('#pg-talonario');
  if(_tsel2&&_tsel2.value&&_tsel2.options.length){
    const _t=(talonarios||[]).find(x=>x.id===Number(_tsel2.value));
    const _n=parseInt(recibo.replace(/\D/g,''),10);
    if(!_t||isNaN(_n)||_n<_t.numeroInicial||_n>_t.numeroFinal){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent='El No. de recibo debe pertenecer al talonario seleccionado'+(_t?(' ('+_t.numeroInicial+'–'+_t.numeroFinal+')'):'');return;}
    if(recibosUsados().has(_n)){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent='Ese recibo ('+_n+') ya fue usado. Elegí el siguiente libre.';return;}
  }
  const inputs=Array.from(document.querySelectorAll('#ov-pago .pg-monto-input')).filter(i=>Number(i.value)>0);
  if(!inputs.length){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent='Asigná al menos un monto a una factura';return;}
  // Validar que ningún monto supere el saldo de su factura
  for(const inp of inputs){
    const monto=Number(inp.value);const saldo=Number(inp.dataset.saldo);
    if(monto>saldo+0.001){$pg('#pg-err').style.display='flex';$pg('#pg-err').querySelector('span').textContent=`El monto supera el saldo de la factura (máx. ${money(saldo)})`;return;}
  }
  const fecha=$pg('#pg-fecha').value||fechaHoyGT();
  const metodo=$pg('#pg-met').value;const referencia=$pg('#pg-ref').value;
  const cuentaBancoId=$pg('#pg-cuenta')?.value||null;
  const hoy=new Date().toISOString();
  let facturasAbonadas=0;
  inputs.forEach(inp=>{
    const docId=Number(inp.dataset.id);const monto=Number(inp.value);
    const f=documentos.find(d=>d.id===docId);if(!f)return;
    f.abonos=f.abonos||[];
    const _ab={fecha,monto,metodo,referencia,noRecibo:recibo,cuentaBancoId,
      registradoPor:currentUser,registradoEl:hoy,anulado:false};
    f.abonos.push(_ab);
    const nuevo=arInfo(f);f.estadoPago=nuevo.estado;
    facturasAbonadas++;
    if(typeof guardarAbono==='function')guardarAbono(f.id,_ab);
    if(typeof guardarDocumento==='function')guardarDocumento(f);
  });
  const totalDist=inputs.reduce((s,i)=>s+(Number(i.value)||0),0);
  // Movimiento de banco: una sola entrada por el total cobrado
  if(cuentaBancoId&&typeof registrarMovimientoBanco==='function'){
    const _cli=clientes.find(c=>String(c.id)===String(cliId));
    registrarMovimientoBanco({cuentaId:cuentaBancoId,tipo:'entrada',monto:totalDist,
      concepto:'Cobro '+recibo+' · '+((_cli&&_cli.nombre)||'Cliente'),
      categoria:'cobro',origen:'cobro',origenId:Number(cliId)||null,referencia,fecha});
  }
  closePagoGlobal();renderCobros();
  logAudit('Pago global','Recibo '+recibo+' · '+money(totalDist)+' en '+facturasAbonadas+' factura'+(facturasAbonadas!==1?'s':'')+(cuentaBancoId?'':' · SIN cuenta de banco'));
  const _detalle='Recibo '+recibo+' · '+money(totalDist)+' distribuidos en '+facturasAbonadas+' factura'+(facturasAbonadas!==1?'s':'');
  // Si no se eligió cuenta, el cobro NO entra a bancos. Antes esto pasaba en
  // silencio y el movimiento simplemente no aparecía; ahora se avisa.
  if(!cuentaBancoId&&cuentasActivasBanco().length)
    toast('✓ Pago registrado · sin cuenta',_detalle+'. No se registró movimiento en bancos porque no se eligió cuenta.');
  else toast('✓ Pago registrado',_detalle);
}
window.guardarPagoGlobal=guardarPagoGlobal;

// ---- Historial de abonos + anulación auditada ----
// Registrar una RETENCIÓN (IVA/ISR): baja el saldo como un abono especial, sin entrar a banco, con su constancia.
function openRetencion(id){
  if(!canRegistrarAbono()){toast('Sin permiso','Tu rol no puede registrar retenciones',true);return;}
  _compFoto=null;
  const f=documentos.find(d=>d.id===id);const ai=arInfo(f);const saldo=ai.saldo;
  const hoy=fechaHoyGT();
  openMod('Registrar retención · '+f.serie+'-'+f.numeroDte,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${f.clienteComercial||f.clienteNombre} · Saldo pendiente: <b style="color:var(--ink)">${money(saldo)}</b><br><span style="font-size:11.5px">La retención baja el saldo pero <b>no entra a banco</b> (el cliente la entera a SAT). Adjuntá la constancia.</span></p>
     <div class="row"><div><label>Tipo de retención</label><select id="ret-tipo"><option value="IVA">Retención de IVA</option><option value="ISR">Retención de ISR</option></select></div><div><label>Monto retenido</label><input id="ret-monto" type="number" step="0.01" placeholder="0.00"></div></div>
     <div class="row"><div><label>No. de constancia</label><input id="ret-const" placeholder="No. de la constancia de retención"></div><div><label>Fecha</label><input id="ret-fecha" type="date" value="${hoy}"></div></div>
     ${compFotoHTML()}
     <div class="note n-danger" id="ret-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const tipo=$('#ret-tipo')?.value||'IVA';
      const monto=Number($('#ret-monto')?.value);
      const nconst=($('#ret-const')?.value||'').trim();
      const fecha=$('#ret-fecha')?.value||hoy;
      const err=$('#ret-err'); const setErr=t=>{if(err){err.style.display='flex';err.querySelector('span').textContent=t;}};
      if(!(monto>0)){setErr('El monto de la retención debe ser mayor a cero');return;}
      if(monto>saldo+0.001){setErr('La retención no puede superar el saldo de '+money(saldo));return;}
      f.abonos=f.abonos||[];
      const _ab={fecha,monto,metodo:'Retención '+tipo,referencia:nconst?('Constancia '+nconst):('Retención '+tipo),noRecibo:'',comprobante:_compFoto,cuentaBancoId:null,registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
      f.abonos.push(_ab);
      const nuevo=arInfo(f);f.estadoPago=nuevo.estado;
      closeMod();renderCobros();
      logAudit('Retención registrada','Factura '+f.serie+'-'+f.numeroDte+' · Ret. '+tipo+' '+money(monto)+(nconst?(' · Const. '+nconst):''));
      toast('✓ Retención registrada','Ret. '+tipo+' '+money(monto)+' · saldo '+money(nuevo.saldo));
      if(typeof guardarAbono==='function')guardarAbono(f.id,_ab);
      if(typeof guardarDocumento==='function')guardarDocumento(f);
    });
  const _b=$('#m-save'); if(_b){_b.className='btn btn-primary';_b.textContent='Registrar retención';}
}
window.openRetencion=openRetencion;
function openHistorialAbonos(id){
  const f=documentos.find(d=>d.id===id);
  const rows=(f.abonos||[]).slice().reverse().map((a,ridx)=>{
    const idx=(f.abonos.length-1)-ridx;
    const tachado=a.anulado?'text-decoration:line-through;color:var(--muted-2)':'';
    let extra='';
    if(a.anulado)extra=`<div style="font-size:10.5px;color:var(--danger);margin-top:3px">Anulado por ${a.anuladoPor} el ${fdate(a.anuladoFecha)} · ${a.motivoAnulacion}</div>`;
    else extra=`<div style="font-size:10.5px;color:var(--muted-2);margin-top:3px">Registrado por ${a.registradoPor||'—'}</div>`;
    return `<tr>
      <td style="${tachado};font-weight:700;color:var(--green)">${a.noRecibo||'<span style="color:var(--muted-2);font-weight:400">—</span>'}</td>
      <td style="${tachado}">${fdate(a.fecha)}</td>
      <td style="${tachado}" class="num">${money(a.monto)}</td>
      <td style="${tachado}">${a.metodo||'—'}${a.referencia?`<div style="font-size:10.5px;color:var(--muted-2)">${a.referencia}</div>`:''}${extra}</td>
      <td>${a.comprobante?`<button class="btn btn-ghost btn-sm" onclick="verComprobante('doc',${f.id},${idx})">📷 Ver</button> `:''}${!a.anulado&&canRegistrarAbono()?`<button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="openEditarAbono(${f.id},${idx})">Editar</button> `:''}${a.anulado?`<span class="badge b-muted">Anulado</span>`:(canAnular()?`<button class="btn btn-ghost btn-sm" onclick="openAnularAbono(${f.id},${idx})">Anular</button>`:'<span style="font-size:11px;color:var(--muted-2)">Sin permiso</span>')}</td>
    </tr>`;
  }).join('');
  openMod('Historial de abonos · '+f.serie+'-'+f.numeroDte,
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">${f.clienteComercial||f.clienteNombre} · Saldo actual: <b style="color:var(--ink)">${money(arInfo(f).saldo)}</b></p>
     <table><thead><tr><th>No. Recibo</th><th>Fecha</th><th>Monto</th><th>Método / Ref.</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Sin abonos registrados</td></tr>'}</tbody></table>`,
    ()=>closeMod());
  $('#m-save').textContent='Cerrar';$('#m-save').className='btn btn-ghost';
}
window.openHistorialAbonos=openHistorialAbonos;
// Editar un abono (recibo, fecha, monto, método, referencia). Ajusta el saldo y el movimiento de banco si cambia el monto.
function openEditarAbono(facturaId,abonoIdx){
  if(!canRegistrarAbono()){toast('Sin permiso','Tu rol no puede editar abonos',true);return;}
  const f=documentos.find(d=>d.id===facturaId);const a=f&&f.abonos[abonoIdx];if(!a||a.anulado)return;
  const saldoSinEste=arInfo(f).saldo+Number(a.monto); // saldo si se quitara este abono (máximo permitido)
  const _mets=['Efectivo','Transferencia','Cheque','Depósito','Tarjeta','Cobro'];
  if(a.metodo&&_mets.indexOf(a.metodo)<0)_mets.unshift(a.metodo);
  const esc=s=>String(s||'').replace(/"/g,'&quot;');
  openMod('Editar abono · '+f.serie+'-'+f.numeroDte,
    `<div class="row"><div><label>No. de recibo</label><input id="ea-recibo" value="${esc(a.noRecibo)}"></div><div><label>Fecha</label><input id="ea-fecha" type="date" value="${(a.fecha||'').slice(0,10)}"></div></div>
     <div class="row"><div><label>Monto</label><input id="ea-monto" type="number" step="0.01" value="${Number(a.monto)}"></div><div><label>Método</label><select id="ea-met">${_mets.map(m=>`<option ${a.metodo===m?'selected':''}>${m}</option>`).join('')}</select></div></div>
     <div class="row"><div><label>Referencia / No. boleta / cheque</label><input id="ea-ref" value="${esc(a.referencia)}"></div></div>
     ${a.cuentaBancoId?`<div class="note" style="margin-bottom:0;font-size:11.5px;background:var(--warn-bg);color:#7A4A07;border-color:rgba(168,130,0,.2)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>Este cobro entró a una cuenta de banco. Si cambiás el monto o la fecha, se ajusta también el movimiento de banco.</span></div>`:''}
     <div class="note n-danger" id="ea-err" style="display:none;margin-top:10px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    ()=>{
      const nRec=($('#ea-recibo')?.value||'').trim(), nFecha=$('#ea-fecha')?.value||a.fecha;
      const nMonto=Number($('#ea-monto')?.value), nMet=$('#ea-met')?.value||a.metodo, nRef=($('#ea-ref')?.value||'').trim();
      const err=$('#ea-err'); const setErr=t=>{if(err){err.style.display='flex';err.querySelector('span').textContent=t;}};
      if(!(nMonto>0)){setErr('El monto debe ser mayor a cero');return;}
      if(nMonto>saldoSinEste+0.001){setErr('El monto no puede superar '+money(saldoSinEste)+' (saldo disponible de la factura)');return;}
      const montoViejo=Number(a.monto);
      const fechaVieja=a.fecha;
      a.noRecibo=nRec;a.fecha=nFecha;a.monto=nMonto;a.metodo=nMet;a.referencia=nRef;
      // Ajustar el movimiento de banco si cambió el monto O la fecha y el cobro estaba ligado
      // a una cuenta. Antes sólo se ajustaba por monto, así que editar sólo la fecha dejaba el
      // movimiento con la fecha vieja (y el cobro seguía apareciendo en el mes equivocado).
      const cambioMonto=Math.abs(nMonto-montoViejo)>0.001;
      const cambioFecha=String(fechaVieja||'')!==String(nFecha||'');
      if(a.cuentaBancoId&&(cambioMonto||cambioFecha)&&typeof movimientosBanco!=='undefined'){
        const mv=movimientosBanco.find(m=>!m.anulado&&m.origen==='cobro'&&m.origenId===f.id&&Number(m.cuentaId)===Number(a.cuentaBancoId)&&Math.abs(Number(m.monto)-montoViejo)<0.01);
        if(mv){mv.monto=nMonto;mv.fecha=nFecha;if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mv);}
      }
      const nuevo=arInfo(f);f.estadoPago=nuevo.estado;
      openHistorialAbonos(facturaId);renderCobros();
      logAudit('Abono editado','Factura '+f.serie+'-'+f.numeroDte+' · '+money(nMonto)+' · recibo '+(nRec||'—'));
      toast('✓ Abono actualizado','Saldo: '+money(nuevo.saldo));
      if(typeof actualizarAbonoDB==='function')actualizarAbonoDB(a);
      if(typeof guardarDocumento==='function')guardarDocumento(f);
    });
  const _b=$('#m-save'); if(_b){_b.className='btn btn-primary';_b.textContent='Guardar cambios';}
}
window.openEditarAbono=openEditarAbono;
function openAnularAbono(facturaId,abonoIdx){
  const f=documentos.find(d=>d.id===facturaId);const a=f.abonos[abonoIdx];if(!a||a.anulado)return;
  openMod('Anular abono',
    `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">Vas a anular el abono de <b style="color:var(--ink)">${money(a.monto)}</b> del ${fdate(a.fecha)}. El saldo de la factura aumentará. Esta acción queda registrada y no se puede deshacer.</p>
     <label>Motivo de la anulación</label><textarea id="an-motivo" rows="3" placeholder="Ej. error de digitación, pago duplicado, cheque rechazado…" style="resize:vertical"></textarea>
     <div class="note n-danger" id="an-err" style="display:none;margin-top:10px;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>El motivo es obligatorio.</span></div>`,
    ()=>{
      const motivo=$('#an-motivo').value.trim();
      if(!motivo){$('#an-err').style.display='flex';return;}
      a.anulado=true;a.motivoAnulacion=motivo;a.anuladoPor=currentUser;a.anuladoFecha=new Date().toISOString();
      // Si el cobro había entrado a una cuenta de banco, revertirlo con una salida compensatoria
      if(a.cuentaBancoId&&typeof registrarMovimientoBanco==='function'){
        registrarMovimientoBanco({cuentaId:a.cuentaBancoId,tipo:'salida',monto:a.monto,
          concepto:'Reversa de cobro anulado '+(a.noRecibo||'')+' · '+(f.clienteComercial||f.clienteNombre),
          categoria:'cobro',origen:'cobro_anulado',origenId:f.id,referencia:a.referencia,fecha:fechaHoyGT(),sinPoliza:true});
      }
      // Si el abono se pagó con saldo a favor, devolver ese crédito al cliente.
      if(a.metodo==='Saldo a favor'){
        const _cr={clienteId:f.clienteId,tipo:'ingreso',monto:a.monto,fecha:fechaHoyGT(),documentoId:f.id,
          metodo:'Saldo a favor',concepto:'Reverso por anulación de aplicación · '+f.serie+'-'+f.numeroDte,
          registradoPor:currentUser,registradoEl:new Date().toISOString(),anulado:false};
        creditosCliente=creditosCliente||[];creditosCliente.push(_cr);
        if(typeof guardarCredito==='function')guardarCredito(_cr);
      }
      const nuevo=arInfo(f);f.estadoPago=nuevo.estado;
      openHistorialAbonos(facturaId);renderCobros();
      logAudit('Abono anulado','Factura '+f.serie+'-'+f.numeroDte+' · '+money(a.monto)+' · Motivo: '+motivo);
      toast('✓ Abono anulado','Saldo actualizado: '+money(nuevo.saldo));
      if(typeof anularAbonoDB==='function')anularAbonoDB(a);
      if(typeof guardarDocumento==='function')guardarDocumento(f);
    });
  $('#m-save').className='btn btn-primary';$('#m-save').textContent='Anular abono';
}
window.openAnularAbono=openAnularAbono;

// ---- COMPRAS ----
function apInfo(c){
  const abon=(c.abonos||[]).filter(a=>!a.anulado).reduce((s,a)=>s+Number(a.monto),0);
  const saldo=Math.round((c.total-abon)*100)/100;
  const estado=saldo<=0.001?'pagado':(abon>0?'parcial':'pendiente');
  const venc=c.vencimiento?new Date(c.vencimiento):null;
  const vencido=estado!=='pagado'&&venc&&new Date()>venc;
  return {abon,saldo,estado,vencido,venc};
}
function recRecibido(c){return c.items.reduce((s,it)=>s+(it.recibido||0),0);}

// ===== Costo promedio móvil basado en compras reales =====
// Promedio ponderado del costo de un producto según compras (no anuladas, con detalle) en [desde,hasta]
function costoPromedioRango(pid,desde,hasta){
  let sumaCosto=0,sumaCant=0;
  (typeof compras!=='undefined'?compras:[]).forEach(c=>{
    if(c.anulado||!Array.isArray(c.items)||!c.items.length)return;
    const f=new Date(c.fecha);
    if((desde&&f<desde)||(hasta&&f>hasta))return;
    c.items.forEach(it=>{
      if(it.id!==pid)return;
      const cant=Number(it.cantidad)||0,cost=Number(it.costo)||0;
      if(cant>0){sumaCosto+=cost*cant;sumaCant+=cant;}
    });
  });
  return sumaCant>0?sumaCosto/sumaCant:null;
}
// Costo "actual" del catálogo: promedio de los últimos 3 meses; si no hay compras, el costo manual (respaldo)
function costoActual(p){
  const hasta=new Date();
  const desde=new Date(hasta.getFullYear(),hasta.getMonth()-3,hasta.getDate());
  const prom=costoPromedioRango(p.id,desde,hasta);
  return prom!=null?prom:(Number(p.costo)||0);
}
// Costo del producto durante un mes concreto (para reportes por mes)
function costoProductoMes(pid,anio,mes){
  const desde=new Date(anio,mes,1);
  const hasta=new Date(anio,mes+1,0,23,59,59);
  let prom=costoPromedioRango(pid,desde,hasta);
  if(prom==null)prom=costoPromedioRango(pid,new Date(anio,mes-2,1),hasta); // sin compras ese mes: 3 meses previos
  if(prom==null){const p=productos.find(x=>x.id===pid);prom=p?(Number(p.costo)||0):0;} // respaldo: costo manual
  return prom;
}
// Costo por UNIDAD DE VENTA del mes: en caja_unidad vendido por unidad, divide el costo-caja entre las unidades por caja.
function costoUnitVentaMes(it,anio,mes){
  const costoCaja=costoProductoMes(it.id,anio,mes);
  const p=productos.find(x=>x.id===it.id);
  if(p&&p.tipoEmpaque==='caja_unidad'&&it.modoVenta!=='caja'){
    const upc=Number(p.unidadesPorCaja)||1;
    return upc>0?costoCaja/upc:costoCaja;
  }
  return costoCaja;
}
// Costo total de una línea de venta (cantidad en su unidad de venta), ya ajustado caja/unidad.
function costoLineaMes(it,anio,mes){ return costoUnitVentaMes(it,anio,mes)*(Number(it.cantidad)||0); }
// Costo total de un documento de venta.
//  · Con líneas → suma el costo por línea (costo promedio móvil del mes).
//  · Sin líneas (facturas históricas importadas sólo con el total, sin detalle
//    de productos) → usa el costo histórico guardado en la factura (repartido
//    desde el Excel de ventas-vs-costos por vendedor/mes).
function costoDoc(d){
  const items=d.items||[];
  if(items.length){
    const dt=new Date(d.creada);
    return items.reduce((a,it)=>a+costoLineaMes(it,dt.getFullYear(),dt.getMonth()),0);
  }
  return Number(d.costoHistorico)||0;
}

function recTotal(c){return c.items.reduce((s,it)=>s+it.cantidad,0);}
function limpiarFiltroCompras(){['cmp-prov','cmp-rec','cmp-desde','cmp-hasta'].forEach(id=>{const e=$('#'+id);if(e)e.value='';});renderCompras();}
window.limpiarFiltroCompras=limpiarFiltroCompras;
function renderCompras(){
  // poblar selector de proveedores
  const selProv=$('#cmp-prov');
  if(selProv&&selProv.dataset.built!=='1'){
    selProv.innerHTML='<option value="">Todos</option>'+proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
    selProv.dataset.built='1';
    selProv.onchange=renderCompras;$('#cmp-rec').onchange=renderCompras;$('#cmp-desde').onchange=renderCompras;$('#cmp-hasta').onchange=renderCompras;
  }
  const fProv=$('#cmp-prov')?.value,fRec=$('#cmp-rec')?.value,fDesde=$('#cmp-desde')?.value,fHasta=$('#cmp-hasta')?.value;
  const filtradas=compras.filter(c=>{
    if(c.anulado)return false; // ocultar anuladas por defecto
    if(fProv&&String(c.proveedorId)!==fProv)return false;
    if(fRec&&c.estadoRecepcion!==fRec)return false;
    if(fDesde&&new Date(c.fecha)<new Date(fDesde+'T00:00:00'))return false;
    if(fHasta&&new Date(c.fecha)>new Date(fHasta+'T23:59:59'))return false;
    return true;
  });
  const totalComprado=filtradas.reduce((s,c)=>s+c.total,0);
  const porPagar=filtradas.filter(c=>c.facturada&&c.tipoPago==='credito').reduce((s,c)=>s+apInfo(c).saldo,0);
  const pendRec=filtradas.filter(c=>c.estadoRecepcion!=='recibida').length;
  const sinFact=filtradas.filter(c=>!c.facturada).length;
  const k=[
    {ic:'i-blue',svg:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',lbl:'Total comprado',val:money(totalComprado),sub:compras.length+' órdenes'},
    {ic:'i-warn',svg:'<path d="M16 3h5v5M21 3l-7 7M10 14 3 21M3 16v5h5"/>',lbl:'Pendientes de recibir',val:pendRec,sub:'órdenes en camino'},
    {ic:'i-lime',svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',lbl:'Sin factura',val:sinFact,sub:'por registrar factura'},
    {ic:'i-green',svg:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>',lbl:'Por pagar',val:money(porPagar),sub:'a proveedores'},
  ];
  $('#compras-kpis').innerHTML=k.map(x=>`<div class="kpi"><div class="ic ${x.ic}"><svg viewBox="0 0 24 24" stroke="currentColor">${x.svg}</svg></div><div class="k-lbl">${x.lbl}</div><div class="k-val num">${x.val}</div><div class="k-sub">${x.sub}</div></div>`).join('');
  $('#compras-empty').style.display=filtradas.length?'none':'block';
  const REC={pendiente:['Pendiente','b-warn'],parcial:['Parcial','b-info'],recibida:['Recibida','b-ok']};
  $('#t-compras').innerHTML=filtradas.slice().reverse().map(c=>{const ai=apInfo(c);
    const [rn,rc]=REC[c.estadoRecepcion];
    let fn,fc;
    if(!c.facturada){fn='Sin factura';fc='b-muted';}
    else if(c.tipoPago==='contado'){fn='Pagada (contado)';fc='b-ok';}
    else if(ai.vencido){fn='Vencido';fc='b-danger';}
    else if(ai.saldo<=0.001){fn='Pagada';fc='b-ok';}
    else if(ai.abon>0){fn='Abono parcial';fc='b-info';}
    else {fn='Por pagar';fc='b-warn';}
    let acts=`<button class="btn btn-ghost btn-sm" onclick="verCompra(${c.id})">Ver</button>`;
    if(c.especial&&!c.oficializada){
      const ahora=new Date();const mesActual=ahora.getFullYear()+'-'+(ahora.getMonth()+1);
      acts=`<button class="btn btn-primary btn-sm" onclick="editarCompraEspecial(${c.id})">Editar</button>`+acts;
      acts=`<button class="btn btn-ghost btn-sm" onclick="confirmar('Oficializar compra especial','CMP-${padn(c.id)} quedará como compra normal y no podrás editarla más.','Oficializar',()=>oficializarCompraEspecial(${c.id}))">Oficializar</button>`+acts;
    }
    if(!c.especial&&c.estadoRecepcion==='recibida'&&!c.facturada)acts=`<button class="btn btn-primary btn-sm" onclick="openFacturaProv(${c.id})">Registrar factura</button>`+acts;
    if(!c.especial&&c.estadoRecepcion!=='recibida')acts=`<button class="btn btn-primary btn-sm" onclick="openRecibir(${c.id})">Recibir</button>`+acts;
    // Eliminar (sin inventario afectado) solo si no se ha recibido nada
    if(canAnular()&&c.estadoRecepcion==='pendiente'&&!c.especial)
      acts+=`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmar('Eliminar compra','Se eliminará CMP-${padn(c.id)}. No hay inventario que revertir porque aún no se recibió mercadería.','Eliminar',()=>eliminarCompra(${c.id}))">Eliminar</button>`;
    // Anular (revierte inventario) si ya fue recibida
    if(canAnular()&&(c.estadoRecepcion==='recibida'||c.especial))
      acts+=`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="abrirAnularCompra(${c.id})">Anular</button>`;
    const espBadge=c.especial?`<span class="badge" style="background:var(--warn-bg);color:#7A4A07;font-size:10px">⚡ Especial</span>`:'';
    return `<tr><td style="font-weight:600">CMP-${padn(c.id)}${espBadge?'<br>'+espBadge:''}<div class="sub-origen">${recRecibido(c)}/${recTotal(c)} u.</div></td><td>${c.proveedorNombre}</td><td style="color:var(--muted)">${c.docProv||'—'}</td><td style="color:var(--muted)">${fdate(c.fecha)}</td><td class="num" style="font-weight:600">${money(c.total)}</td><td><span class="badge ${rc}">${rn}</span></td><td><span class="badge ${fc}">${fn}</span></td><td><div class="acts">${acts}</div></td></tr>`;
  }).join('');
  enhanceTable('t-compras');
}
