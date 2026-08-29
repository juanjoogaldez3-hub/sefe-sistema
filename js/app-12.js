// ============================================================
//  MÓDULO PLANILLA  (sección "Planilla" · solo admin)
// ============================================================
//  Se construye por partes:
//   · Parte 1 (esta): maestro de EMPLEADOS (alta / edición / lista).
//   · Parte 2 (luego): planilla quincenal (comisiones auto, IGSS/ISR,
//     totales) y el pago por empleado con póliza.
//   · Parte 3 (luego): la boleta de pago en PDF (media carta, igual a
//     la póliza de cheque) y el historial de planillas.
//
//  El acceso lo controla el sistema de permisos: sólo el rol con
//  views='ALL' (Administrador) ve la sección; el botón del menú se
//  oculta para los demás (js/app-11.js) y go() bloquea la entrada.
// ============================================================

// Nombre del vendedor ligado (para mostrar de dónde vienen las comisiones)
function _nombreVendedor(id){
  const v=(typeof vendedores!=='undefined'?vendedores:[]).find(x=>String(x.id)===String(id));
  return v?(v.nombre||('Vendedor '+id)):'—';
}

// Render de la sección Planilla — las planillas guardadas + la lista de empleados.
function renderPlanilla(){
  _renderPlanillasTabla();
  _renderEmpleadosTabla();
}
window.renderPlanilla=renderPlanilla;

function _renderEmpleadosTabla(){
  const tb=$('#t-empleados'); if(!tb)return;
  const lista=(typeof empleados!=='undefined'?empleados:[]).slice()
    .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)));
  const empty=$('#empleados-empty'); if(empty)empty.style.display=lista.length?'none':'block';
  tb.innerHTML=lista.map(e=>`<tr>
      <td style="font-weight:600">${escHtml(e.nombre)}${e.dpi?`<div style="font-size:11px;color:var(--muted-2)">DPI ${escHtml(e.dpi)}</div>`:''}</td>
      <td style="color:var(--muted)">${escHtml(e.puesto||'—')}</td>
      <td>${e.vendedorId?escHtml(_nombreVendedor(e.vendedorId)):'<span style="color:var(--muted-2)">—</span>'}</td>
      <td class="num">${money(e.sueldoBase)}</td>
      <td>${e.activo?'<span class="badge b-ok" style="font-size:10px">Activo</span>':'<span class="badge b-muted" style="font-size:10px">Inactivo</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openEmpleado(${e.id})">Editar</button></td>
    </tr>`).join('');
  if(typeof enhanceTable==='function')enhanceTable('t-empleados');
}

function _planEstadoBadge(e){
  if(e==='pagada')return '<span class="badge b-ok" style="font-size:10px">Pagada</span>';
  if(e==='parcial')return '<span class="badge b-warn" style="font-size:10px">Parcial</span>';
  return '<span class="badge b-muted" style="font-size:10px">Borrador</span>';
}
function _renderPlanillasTabla(){
  const tb=$('#t-planillas'); if(!tb)return;
  const lista=(typeof planillas!=='undefined'?planillas:[]).slice();
  const empty=$('#planillas-empty'); if(empty)empty.style.display=lista.length?'none':'block';
  tb.innerHTML=lista.map(p=>`<tr>
      <td style="font-weight:600">${escHtml(p.etiqueta||'')}</td>
      <td class="num">${p.nEmpleados||(p.lineas?p.lineas.length:0)}</td>
      <td class="num" style="font-weight:700">${money(p.totalNeto)}</td>
      <td>${_planEstadoBadge(p.estado)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="verPlanilla(${p.id})">Ver / pagar</button></td>
    </tr>`).join('');
  if(typeof enhanceTable==='function')enhanceTable('t-planillas');
}

// Alta / edición de un empleado.
function openEmpleado(id){
  const e=id?empleados.find(x=>String(x.id)===String(id)):null;
  const vends=(typeof vendedores!=='undefined'?vendedores:[]);
  const optVend=`<option value="">— No es vendedor —</option>`+
    vends.map(v=>`<option value="${v.id}"${e&&String(e.vendedorId)===String(v.id)?' selected':''}>${escHtml(v.nombre||('Vendedor '+v.id))}</option>`).join('');
  const cuentas=(typeof cuentasActivasBanco==='function'?cuentasActivasBanco():[]);
  const optCta=`<option value="">— Cuenta por defecto de la planilla —</option>`+
    cuentas.map(c=>`<option value="${c.id}"${e&&String(e.cuentaBancoId)===String(c.id)?' selected':''}>${escHtml(c.nombre)}</option>`).join('');
  openMod(e?'Editar empleado':'Nuevo empleado',
    `<div class="row"><div><label>Nombre completo</label><input id="emp-nom" value="${e?e.nombre:''}" placeholder="Ej. María López"></div><div><label>Puesto</label><input id="emp-puesto" value="${e?e.puesto:''}" placeholder="Ej. Vendedora, Bodega"></div></div>
     <div class="row"><div><label>Sueldo base (quincenal)</label><input id="emp-sueldo" type="number" step="0.01" value="${e?e.sueldoBase:''}" placeholder="0.00"></div><div><label>Bonificación incentivo (quincenal)</label><input id="emp-bonif" type="number" step="0.01" value="${e?e.bonifIncentivo:125}" placeholder="125.00"></div></div>
     <div class="row"><div><label>Vendedor ligado <span style="font-weight:400;color:var(--muted-2)">(trae sus comisiones)</span></label><select id="emp-vend">${optVend}</select></div><div><label>Cuenta de pago</label><select id="emp-cta">${optCta}</select></div></div>
     <div class="row"><div><label>DPI</label><input id="emp-dpi" value="${e?e.dpi:''}"></div><div><label>No. afiliación IGSS</label><input id="emp-igss" value="${e?e.igss:''}"></div></div>
     <div class="row"><div><label>NIT</label><input id="emp-nit" value="${e?e.nit:''}"></div><div><label>Fecha de ingreso</label><input id="emp-ingreso" type="date" value="${e&&e.fechaIngreso?String(e.fechaIngreso).slice(0,10):''}"></div></div>
     ${e?`<div class="row"><div><label>Estado</label><select id="emp-activo"><option value="1"${e.activo?' selected':''}>Activo</option><option value="0"${!e.activo?' selected':''}>Inactivo</option></select></div><div></div></div>`:''}
     <div class="note n-danger" id="emp-err" style="display:none;margin-bottom:0"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><span></span></div>`,
    async ()=>{
      const err=m=>{$('#emp-err').style.display='flex';$('#emp-err').querySelector('span').textContent=m;};
      const nombre=$('#emp-nom').value.trim();
      if(!nombre){err('Escribí el nombre del empleado');return;}
      const emp=e||{_nuevo:true};
      emp.nombre=nombre;
      emp.puesto=$('#emp-puesto').value.trim();
      emp.sueldoBase=Number($('#emp-sueldo').value)||0;
      emp.bonifIncentivo=Number($('#emp-bonif').value)||0;
      emp.vendedorId=$('#emp-vend').value?Number($('#emp-vend').value):null;
      emp.cuentaBancoId=$('#emp-cta').value?Number($('#emp-cta').value):null;
      emp.dpi=$('#emp-dpi').value.trim();
      emp.igss=$('#emp-igss').value.trim();
      emp.nit=$('#emp-nit').value.trim();
      emp.fechaIngreso=$('#emp-ingreso').value||null;
      if(e)emp.activo=$('#emp-activo').value==='1';
      const ok=await (typeof guardarEmpleado==='function'?guardarEmpleado(emp):Promise.resolve(false));
      if(!ok){err('No se pudo guardar. ¿Ya corriste el SQL de empleados?');if(!e)emp._nuevo=true;return;}
      if(!e)empleados.push(emp);
      if(typeof logAudit==='function')logAudit(e?'Empleado editado':'Empleado creado',emp.nombre+' · sueldo '+money(emp.sueldoBase));
      closeMod();renderPlanilla();toast('✓ Empleado guardado',emp.nombre);
    });
}
window.openEmpleado=openEmpleado;

// ============================================================
//  PLANILLA QUINCENAL  (parte 2)
// ============================================================
//  Arma la planilla de una quincena con todos los empleados activos:
//   · Vendedores: sueldo base + COMISIONES automáticas (igual que el
//     reporte "Ventas por vendedor": 5% sobre la venta sin IVA), editable.
//   · IGSS laboral automático (4.83% sobre sueldo + comisiones), editable.
//   · ISR editable (esa cifra la pasa el contador).
//   Se guarda como borrador; el pago de cada empleado sale de la cuenta
//   de banco y genera su póliza de cheque. La boleta de pago (parte 3)
//   tomará como referencia esa póliza.
// ============================================================

const IGSS_LABORAL_PCT=0.0483;     // cuota laboral IGSS (editable por línea)
const PL_COMISION_PCT=0.05, PL_IVA=1.12;
const _MESES_PL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let _planActual=null;   // planilla en edición (en memoria)

function _ultimoDiaMes(anio,mes){return new Date(anio,mes,0).getDate();} // mes 1-12
function _rangoQuincena(anio,mes,q){
  const mm=String(mes).padStart(2,'0');
  if(Number(q)===1)return {desde:`${anio}-${mm}-01`,hasta:`${anio}-${mm}-15`,
                   etiqueta:`1ª quincena de ${_MESES_PL[mes-1]} ${anio}`};
  const ld=String(_ultimoDiaMes(anio,mes)).padStart(2,'0');
  return {desde:`${anio}-${mm}-16`,hasta:`${anio}-${mm}-${ld}`,
          etiqueta:`2ª quincena de ${_MESES_PL[mes-1]} ${anio}`};
}
// Últimas N quincenas, la más reciente primero.
function _quincenasRecientes(n){
  const hoy=new Date(); let y=hoy.getFullYear(), m=hoy.getMonth()+1, q=hoy.getDate()<=15?1:2;
  const arr=[];
  for(let i=0;i<n;i++){
    arr.push(Object.assign({val:`${y}-${m}-${q}`},_rangoQuincena(y,m,q)));
    if(q===2){q=1;}else{q=2;m--;if(m===0){m=12;y--;}}
  }
  return arr;
}
// Comisión del empleado en el rango (misma regla que "Ventas por vendedor").
function _comisionEmpleado(emp,desde,hasta){
  if(!emp||!emp.vendedorId)return 0;
  const v=(typeof vendedores!=='undefined'?vendedores:[]).find(x=>String(x.id)===String(emp.vendedorId));
  if(!v)return 0;
  const total=(typeof documentos!=='undefined'?documentos:[]).filter(d=>
      ['certificada','facturado'].includes(d.estado)&&d.tipoDoc!=='notaCredito'&&
      d.vendedorNombre===v.nombre&&d.creada&&
      String(d.creada).slice(0,10)>=desde&&String(d.creada).slice(0,10)<=hasta
    ).reduce((s,d)=>s+((d.totales&&d.totales.total)||0),0);
  return Math.round(total/PL_IVA*PL_COMISION_PCT*100)/100;
}
// Una línea por empleado activo, con sus valores ya calculados.
function _construirLineas(desde,hasta){
  return (typeof empleados!=='undefined'?empleados:[]).filter(e=>e.activo!==false)
    .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(e=>{
      const com=_comisionEmpleado(e,desde,hasta);
      const sueldo=Number(e.sueldoBase)||0;
      const igss=Math.round((sueldo+com)*IGSS_LABORAL_PCT*100)/100;
      return {empleadoId:e.id,nombre:e.nombre,cuentaBancoId:e.cuentaBancoId||null,
        sueldoBase:sueldo,bonif:Number(e.bonifIncentivo)||0,comisiones:com,
        otrosIng:0,igss:igss,isr:0,otrosDesc:0,
        pagado:false,poliza:null,pagadoEl:null};
    });
}

function _lineaIngresos(l){return (+l.sueldoBase||0)+(+l.bonif||0)+(+l.comisiones||0)+(+l.otrosIng||0);}
function _lineaDesc(l){return (+l.igss||0)+(+l.isr||0)+(+l.otrosDesc||0);}
function _lineaNeto(l){return _lineaIngresos(l)-_lineaDesc(l);}
function _planSumas(){
  const L=_planActual?_planActual.lineas:[];
  const s={sueldoBase:0,bonif:0,comisiones:0,otrosIng:0,igss:0,isr:0,otrosDesc:0,neto:0,ingresos:0,desc:0};
  L.forEach(l=>{s.sueldoBase+=+l.sueldoBase||0;s.bonif+=+l.bonif||0;s.comisiones+=+l.comisiones||0;
    s.otrosIng+=+l.otrosIng||0;s.igss+=+l.igss||0;s.isr+=+l.isr||0;s.otrosDesc+=+l.otrosDesc||0;s.neto+=_lineaNeto(l);});
  s.ingresos=s.sueldoBase+s.bonif+s.comisiones+s.otrosIng; s.desc=s.igss+s.isr+s.otrosDesc;
  return s;
}
function _planSyncTotales(){
  const s=_planSumas(), pl=_planActual; if(!pl)return;
  pl.totalIngresos=s.ingresos; pl.totalDescuentos=s.desc; pl.totalNeto=s.neto; pl.nEmpleados=pl.lineas.length;
  const pag=pl.lineas.filter(l=>l.pagado).length;
  pl.estado=pag===0?'borrador':(pag===pl.lineas.length?'pagada':'parcial');
}

// Abrir una planilla nueva (quincena actual por defecto).
function nuevaPlanilla(){
  if(!(typeof empleados!=='undefined'&&empleados.filter(e=>e.activo!==false).length)){
    toast('Sin empleados activos','Agregá empleados antes de armar la planilla',true);return;
  }
  const qs=_quincenasRecientes(1)[0];
  _planActual={_nuevo:true,id:null,desde:qs.desde,hasta:qs.hasta,etiqueta:qs.etiqueta,
    estado:'borrador',notas:'',cuentaPagoId:_cuentaPlanillaDefault(),
    lineas:_construirLineas(qs.desde,qs.hasta),creadoPor:(typeof currentUser!=='undefined'?currentUser:'')};
  _abrirEditorPlanilla();
}
window.nuevaPlanilla=nuevaPlanilla;

// Ver / seguir pagando una planilla guardada.
function verPlanilla(id){
  const p=(typeof planillas!=='undefined'?planillas:[]).find(x=>String(x.id)===String(id));
  if(!p){toast('No encontrada','Esa planilla ya no está',true);return;}
  // Copia de trabajo (para no tocar el array global hasta guardar)
  _planActual=JSON.parse(JSON.stringify(p));
  _planActual._nuevo=false;
  if(!_planActual.cuentaPagoId)_planActual.cuentaPagoId=_cuentaPlanillaDefault();
  _abrirEditorPlanilla();
}
window.verPlanilla=verPlanilla;

// Cuenta sugerida para pagar (la monetaria, o la primera activa).
function _cuentaPlanillaDefault(){
  const cs=(typeof cuentasActivasBanco==='function'?cuentasActivasBanco():[]);
  const mon=cs.find(c=>c.tipo==='monetaria')||cs.find(c=>/monetaria/i.test(c.nombre||''));
  return (mon||cs[0]||{}).id||null;
}

function _abrirEditorPlanilla(){
  const pl=_planActual;
  const cuentas=(typeof cuentasActivasBanco==='function'?cuentasActivasBanco():[]);
  const optCta=cuentas.map(c=>`<option value="${c.id}"${String(pl.cuentaPagoId)===String(c.id)?' selected':''}>${escHtml(c.nombre)}</option>`).join('');
  const selQuincena=pl._nuevo
    ? `<select id="pl-quincena" onchange="_planCambiarQuincena(this.value)">${_quincenasRecientes(10).map(q=>`<option value="${q.val}"${q.val===`${(+pl.desde.slice(0,4))}-${(+pl.desde.slice(5,7))}-${pl.desde.slice(8,10)==='01'?1:2}`?' selected':''}>${q.etiqueta}</option>`).join('')}</select>`
    : `<div style="font-weight:700;font-size:15px;color:var(--ink)">${escHtml(pl.etiqueta)}</div>`;
  const body=`
    <div class="row" style="align-items:end;margin-bottom:4px">
      <div><label>Quincena</label>${selQuincena}</div>
      <div><label>Pagar desde</label><select id="pl-cuenta" onchange="_planSetCuenta(this.value)">${optCta||'<option value="">— Sin cuentas —</option>'}</select></div>
    </div>
    <div class="kpis" style="margin:6px 0 10px">
      <div class="kpi"><div class="k-body"><div class="k-lbl">Ingresos</div><div class="k-val num" id="pl-kpi-ing">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Descuentos</div><div class="k-val num" id="pl-kpi-desc">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Neto a pagar</div><div class="k-val num" id="pl-kpi-neto" style="color:var(--green)">—</div></div></div>
    </div>
    <div style="overflow-x:auto"><div id="pl-tabla-wrap"></div></div>
    <div class="note" style="margin-top:10px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>Las comisiones vienen automáticas de las ventas de la quincena (5% sin IVA) y el IGSS al ${(IGSS_LABORAL_PCT*100).toFixed(2)}% — todo se puede modificar. El ISR lo escribís vos con la cifra del contador. Al pagar se genera la póliza de cheque.</span></div>`;
  openMod('Planilla quincenal',body,_planGuardar);
  $('#m-save').textContent='Guardar planilla';
  $('#ov').classList.add('modal-wide');
  const _m=document.querySelector('#ov .modal'); if(_m)_m.style.maxWidth='min(98vw,1240px)';
  _planPintar();
}

function _planSetCuenta(v){ if(_planActual)_planActual.cuentaPagoId=v?Number(v):null; }
function _planCambiarQuincena(v){
  if(!_planActual||!_planActual._nuevo)return;
  const [y,m,q]=v.split('-').map(Number);
  const r=_rangoQuincena(y,m,q);
  _planActual.desde=r.desde;_planActual.hasta=r.hasta;_planActual.etiqueta=r.etiqueta;
  _planActual.lineas=_construirLineas(r.desde,r.hasta);
  _planPintar();
}

// Dibuja la tabla de líneas + totales dentro del editor.
function _planPintar(){
  const wrap=document.getElementById('pl-tabla-wrap'); if(!wrap||!_planActual)return;
  const pl=_planActual;
  const filas=pl.lineas.map((l,i)=>{
    const bloq=l.pagado;
    const inp=(campo,val)=>`<input type="number" step="0.01" value="${val}" ${bloq?'disabled':''} oninput="_planSet(${i},'${campo}',this.value)" style="width:86px" class="num">`;
    return `<tr>
      <td style="font-weight:600;min-width:150px">${escHtml(l.nombre)}${l.pagado?` <span class="badge b-ok" style="font-size:9px">Pagado</span>`:''}</td>
      <td>${inp('sueldoBase',l.sueldoBase)}</td>
      <td>${inp('bonif',l.bonif)}</td>
      <td>${inp('comisiones',l.comisiones)}</td>
      <td>${inp('otrosIng',l.otrosIng)}</td>
      <td>${inp('igss',l.igss)}</td>
      <td>${inp('isr',l.isr)}</td>
      <td>${inp('otrosDesc',l.otrosDesc)}</td>
      <td class="num" style="font-weight:700" id="pl-neto-${i}">${money(_lineaNeto(l))}</td>
      <td style="text-align:center;white-space:nowrap">${l.pagado
          ? `<button class="btn btn-ghost btn-sm" onclick="boletaPlanillaUI(${i})">Boleta</button> <button class="btn btn-ghost btn-sm" onclick="_planPoliza(${i})">Póliza</button>`
          : `<button class="btn btn-primary btn-sm" onclick="_planPagar(${i})">Pagar</button>`}</td>
    </tr>`;
  }).join('');
  const tc=id=>`<td class="num" style="font-weight:700" id="pl-t-${id}"></td>`;
  wrap.innerHTML=`<table style="min-width:1040px"><thead><tr>
      <th>Empleado</th><th class="num">Sueldo</th><th class="num">Bonif.</th><th class="num">Comis.</th>
      <th class="num">Otros ing.</th><th class="num">IGSS</th><th class="num">ISR</th><th class="num">Otros desc.</th>
      <th class="num">Neto</th><th style="text-align:center">Pago</th></tr></thead>
    <tbody>${filas||`<tr><td colspan="10" style="color:var(--muted-2);padding:14px">Sin empleados activos.</td></tr>`}</tbody>
    <tfoot><tr style="border-top:2px solid var(--line-strong);font-weight:700">
      <td>Total (${pl.lineas.length})</td>${tc('sueldoBase')}${tc('bonif')}${tc('comisiones')}${tc('otrosIng')}${tc('igss')}${tc('isr')}${tc('otrosDesc')}${tc('neto')}<td></td>
    </tr></tfoot></table>`;
  _planPintarTotales();
}
function _planSet(i,campo,val){
  if(!_planActual)return;
  _planActual.lineas[i][campo]=Number(val)||0;
  const nc=document.getElementById('pl-neto-'+i);
  if(nc)nc.textContent=money(_lineaNeto(_planActual.lineas[i]));
  _planPintarTotales();
}
function _planPintarTotales(){
  const s=_planSumas();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=money(v);};
  ['sueldoBase','bonif','comisiones','otrosIng','igss','isr','otrosDesc','neto'].forEach(k=>set('pl-t-'+k,s[k]));
  set('pl-kpi-ing',s.ingresos);set('pl-kpi-desc',s.desc);set('pl-kpi-neto',s.neto);
}
window._planSet=_planSet;
window._planSetCuenta=_planSetCuenta;
window._planCambiarQuincena=_planCambiarQuincena;

// Guardar la planilla (borrador o con pagos). Devuelve true/false.
async function _planGuardar(){
  const pl=_planActual; if(!pl)return false;
  _planSyncTotales();
  const btn=$('#m-save'); if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  const ok=await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve(false));
  if(btn){btn.disabled=false;btn.textContent='Guardar planilla';}
  if(!ok){toast('No se pudo guardar','¿Ya corriste el SQL de planillas?',true);return false;}
  // Reflejar en el array global (nuevo → al frente; existente → reemplazar)
  const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
  const copia=JSON.parse(JSON.stringify(pl)); delete copia._nuevo;
  if(idx>=0)planillas[idx]=copia; else planillas.unshift(copia);
  if(typeof logAudit==='function')logAudit('Planilla guardada',pl.etiqueta+' · neto '+money(pl.totalNeto));
  toast('✓ Planilla guardada',pl.etiqueta);
  renderPlanilla();
  return true;
}

// Pagar el neto de un empleado: registra la salida de banco y abre la póliza.
async function _planPagar(i){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(!l||l.pagado)return;
  const neto=_lineaNeto(l);
  if(neto<=0){toast('Neto en cero','No hay monto que pagar para '+l.nombre,true);return;}
  const cuentaId=l.cuentaBancoId||pl.cuentaPagoId;
  if(!cuentaId){toast('Elegí la cuenta','Seleccioná desde qué cuenta se paga',true);return;}
  // La planilla debe estar guardada para que el pago quede ligado a su id.
  if(pl._nuevo){const ok=await _planGuardar(); if(!ok)return;}
  const mov=(typeof registrarMovimientoBanco==='function')?registrarMovimientoBanco({
    cuentaId, tipo:'salida', monto:neto,
    concepto:'Planilla '+pl.etiqueta+' · '+l.nombre,
    categoria:'planilla', origen:'planilla', origenId:pl.id, beneficiario:l.nombre
  }):null;
  if(!mov){toast('No se registró el pago','Revisá la cuenta seleccionada',true);return;}
  l.pagado=true; l.poliza=mov.poliza||null; l.pagadoEl=new Date().toISOString(); l.cuentaBancoId=cuentaId;
  _planSyncTotales();
  await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve());
  const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
  if(idx>=0)planillas[idx]=Object.assign(JSON.parse(JSON.stringify(pl)),{_nuevo:undefined});
  if(typeof logAudit==='function')logAudit('Pago de planilla',l.nombre+' · '+money(neto)+' · '+pl.etiqueta);
  _planPintar(); renderPlanilla();
  toast('✓ Pago registrado',l.nombre+' — se abrió la póliza');
}
// Reabrir la póliza de cheque de una línea ya pagada.
function _planPoliza(i){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(!l||!l.poliza)return;
  const mov=(typeof movimientosBanco!=='undefined'?movimientosBanco:[])
    .find(m=>m.poliza===l.poliza&&m.origen==='planilla');
  if(mov&&typeof polizaChequePDF==='function')polizaChequePDF(mov,l.nombre);
  else toast('Póliza no encontrada','El movimiento no está cargado',true);
}
window._planPagar=_planPagar;
window._planPoliza=_planPoliza;

// ============================================================
//  BOLETA DE PAGO  (parte 3) — media carta, igual a la póliza
// ============================================================
//  Una boleta por empleado con el desglose de la quincena. Toma como
//  referencia la póliza de cheque que se generó al pagar. En español,
//  sin acumulado del año.
function _boletaFila(lbl,val,fuerte){
  return `<tr>
    <td style="padding:3px 0;font-size:12px;color:#333">${lbl}</td>
    <td style="padding:3px 0;font-size:12px;text-align:right;${fuerte?'font-weight:700;color:#173916':'font-weight:600'}">${money(val)}</td></tr>`;
}
function boletaPagoPDF(pl,l){
  if(!pl||!l)return;
  const emp=(typeof empleados!=='undefined'?empleados:[]).find(e=>String(e.id)===String(l.empleadoId))||{};
  const cuenta=(typeof cuentasBanco!=='undefined'?cuentasBanco:[]).find(c=>String(c.id)===String(l.cuentaBancoId||pl.cuentaPagoId))||{};
  const ingresos=_lineaIngresos(l), desc=_lineaDesc(l), neto=_lineaNeto(l);
  const numPol=l.poliza?('POL-'+String(l.poliza).padStart(6,'0')):null;
  const fechaPago=l.pagadoEl?fdate(l.pagadoEl):(pl.hasta?fdate(pl.hasta):'—');
  const sec=t=>`<div style="font-size:10px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.7px;margin:11px 0 3px;display:flex;align-items:center;gap:8px"><span>${t}</span><span style="flex:1;height:1px;background:#D6DCC9"></span></div>`;
  const dato=(lbl,val)=>`<div style="min-width:0"><div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">${lbl}</div><div style="font-size:13px;font-weight:600;color:#173916;margin-top:1px">${val||'—'}</div></div>`;
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px;align-items:flex-start">
      <div style="flex:1;min-width:230px">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">Empleado</div>
        <div style="font-size:17px;font-weight:800;color:#173916;margin-top:1px">${escHtml(l.nombre)}</div>
        <div style="font-size:12px;color:#666B5C;margin-top:1px">${escHtml(emp.puesto||'')}</div>
      </div>
      <div style="text-align:right;min-width:180px">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">Período</div>
        <div style="font-size:13.5px;font-weight:700;color:#173916;margin-top:1px">${escHtml(pl.etiqueta||'')}</div>
        <div style="font-size:11px;color:#666B5C;margin-top:2px">Pago: ${fechaPago}</div>
      </div>
    </div>

    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:8px">
      ${dato('DPI',emp.dpi)} ${dato('NIT',emp.nit)} ${dato('No. IGSS',emp.igss)}
    </div>

    <div style="display:flex;gap:22px;align-items:flex-start;margin-top:4px">
      <div style="flex:1;min-width:0">
        ${sec('Ingresos')}
        <table style="width:100%;border-collapse:collapse">
          ${_boletaFila('Sueldo base',l.sueldoBase)}
          ${_boletaFila('Bonificación incentivo',l.bonif)}
          ${(+l.comisiones)?_boletaFila('Comisiones',l.comisiones):''}
          ${(+l.otrosIng)?_boletaFila('Otros ingresos',l.otrosIng):''}
          <tr><td colspan="2" style="border-top:1px solid #D6DCC9"></td></tr>
          ${_boletaFila('Total ingresos',ingresos,true)}
        </table>
      </div>
      <div style="flex:1;min-width:0">
        ${sec('Deducciones')}
        <table style="width:100%;border-collapse:collapse">
          ${_boletaFila('IGSS (laboral)',l.igss)}
          ${(+l.isr)?_boletaFila('ISR',l.isr):''}
          ${(+l.otrosDesc)?_boletaFila('Otras deducciones',l.otrosDesc):''}
          ${!(+l.isr)&&!(+l.otrosDesc)?'<tr><td style="padding:3px 0;font-size:12px;color:#909584">—</td><td></td></tr>':''}
          <tr><td colspan="2" style="border-top:1px solid #D6DCC9"></td></tr>
          ${_boletaFila('Total deducciones',desc,true)}
        </table>
      </div>
    </div>

    <div style="margin-top:12px;border:1.5px solid #173916;border-radius:8px;display:flex;justify-content:space-between;align-items:center;padding:8px 16px">
      <div style="font-size:12px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.6px">Neto a recibir</div>
      <div style="font-size:22px;font-weight:800;color:#173916">${money(neto)}</div>
    </div>

    <div style="display:flex;gap:22px;align-items:flex-start;margin-top:6px">
      <div style="flex:1;min-width:0">
        ${sec('Forma de pago')}
        <div style="font-size:12.5px;font-weight:700;color:#173916">${cuenta.banco?escHtml(cuenta.banco):escHtml(cuenta.nombre||'—')}</div>
        ${cuenta.nombre&&cuenta.banco?`<div style="font-size:11px;color:#666B5C">${escHtml(cuenta.nombre)}</div>`:''}
        ${numPol?`<div style="font-size:11px;color:#666B5C;margin-top:2px">Póliza de cheque: <b>${numPol}</b></div>`:'<div style="font-size:11px;color:#B45309;margin-top:2px">Pendiente de pago</div>'}
      </div>
      <div style="flex:1;min-width:0;text-align:center;align-self:flex-end">
        <div style="border-top:1px solid #555;margin-top:26px;padding-top:5px;font-size:10px;color:#555">Recibí conforme</div>
      </div>
    </div>`;
  _abrirPDF(_pdfShell({titulo:'BOLETA DE PAGO',subtitulo:'Planilla quincenal',sinEmitido:true,orientacion:'portrait',margen:'6mm 12mm',sinPie:true,compacto:true,body}));
}
window.boletaPagoPDF=boletaPagoPDF;
function boletaPlanillaUI(i){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(l)boletaPagoPDF(pl,l);
}
window.boletaPlanillaUI=boletaPlanillaUI;
