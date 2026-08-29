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
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="verPlanilla(${p.id})">Ver / pagar</button> <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarPlanilla(${p.id})" title="Eliminar planilla">✕</button></td>
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
     <div class="row"><div><label>Sueldo base (mensual)</label><input id="emp-sueldo" type="number" step="0.01" value="${e?e.sueldoBase:''}" placeholder="0.00"></div><div><label>Bonificación incentivo (mensual)</label><input id="emp-bonif" type="number" step="0.01" value="${e?e.bonifIncentivo:250}" placeholder="250.00"></div></div>
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
//  PLANILLA MENSUAL  (parte 2)
// ============================================================
//  Arma la planilla del MES con todos los empleados activos. Se ve
//  mensual, pero el sueldo se paga en 2 quincenas (cada una con su
//  póliza). Las COMISIONES de los vendedores van APARTE, en su propio
//  pago y su propia póliza (no entran en el neto del sueldo).
//   · Comisiones automáticas (igual que "Ventas por vendedor": 5% sin IVA).
//   · IGSS laboral automático (4.83% sobre el sueldo base), editable.
//   · ISR editable (esa cifra la pasa el contador).
//   Al pagar se muestra la BOLETA de pago; la póliza queda en su botón.
// ============================================================

const IGSS_LABORAL_PCT=0.0483;     // cuota laboral IGSS (editable por línea)
const PL_COMISION_PCT=0.05, PL_IVA=1.12;
const _MESES_PL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const _cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;

let _planActual=null;   // planilla en edición (en memoria)

function _ultimoDiaMes(anio,mes){return new Date(anio,mes,0).getDate();} // mes 1-12
// Rango del MES completo.
function _rangoMes(anio,mes){
  const mm=String(mes).padStart(2,'0');
  const ld=String(_ultimoDiaMes(anio,mes)).padStart(2,'0');
  return {desde:`${anio}-${mm}-01`,hasta:`${anio}-${mm}-${ld}`,etiqueta:`${_cap(_MESES_PL[mes-1])} ${anio}`};
}
// Últimos N meses, el más reciente primero.
function _mesesRecientes(n){
  const hoy=new Date(); let y=hoy.getFullYear(), m=hoy.getMonth()+1;
  const arr=[];
  for(let i=0;i<n;i++){
    arr.push(Object.assign({val:`${y}-${m}`},_rangoMes(y,m)));
    m--; if(m===0){m=12;y--;}
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
// Una línea por empleado activo (valores MENSUALES ya calculados).
function _construirLineas(desde,hasta){
  return (typeof empleados!=='undefined'?empleados:[]).filter(e=>e.activo!==false)
    .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(e=>{
      const com=_comisionEmpleado(e,desde,hasta);
      const sueldo=Number(e.sueldoBase)||0;
      const igss=Math.round(sueldo*IGSS_LABORAL_PCT*100)/100; // IGSS sobre el sueldo base
      return {empleadoId:e.id,nombre:e.nombre,cuentaBancoId:e.cuentaBancoId||null,
        sueldoBase:sueldo,bonif:Number(e.bonifIncentivo)||0,otrosIng:0,
        igss:igss,isr:0,otrosDesc:0,comisiones:com,
        q1Pagado:false,q1Poliza:null,q1El:null,
        q2Pagado:false,q2Poliza:null,q2El:null,
        comPagado:false,comPoliza:null,comEl:null};
    });
}

// ── Cálculos de una línea ──
function _lineaIngFijos(l){return (+l.sueldoBase||0)+(+l.bonif||0)+(+l.otrosIng||0);}
function _lineaDesc(l){return (+l.igss||0)+(+l.isr||0)+(+l.otrosDesc||0);}
function _netoSueldo(l){return _lineaIngFijos(l)-_lineaDesc(l);}         // neto del sueldo (mensual)
function _montoQ1(l){return Math.round(_netoSueldo(l)/2*100)/100;}        // 1ª quincena
function _montoQ2(l){return Math.round((_netoSueldo(l)-_montoQ1(l))*100)/100;} // 2ª quincena (el resto)
function _comLinea(l){return +l.comisiones||0;}
function _lineaCompleta(l){return l.q1Pagado&&l.q2Pagado&&(_comLinea(l)<=0||l.comPagado);}

function _planSumas(){
  const L=_planActual?_planActual.lineas:[];
  const s={sueldoBase:0,bonif:0,otrosIng:0,igss:0,isr:0,otrosDesc:0,comisiones:0,netoSueldo:0};
  L.forEach(l=>{s.sueldoBase+=+l.sueldoBase||0;s.bonif+=+l.bonif||0;s.otrosIng+=+l.otrosIng||0;
    s.igss+=+l.igss||0;s.isr+=+l.isr||0;s.otrosDesc+=+l.otrosDesc||0;s.comisiones+=_comLinea(l);s.netoSueldo+=_netoSueldo(l);});
  s.totalMes=s.netoSueldo+s.comisiones;
  return s;
}
function _planSyncTotales(){
  const s=_planSumas(), pl=_planActual; if(!pl)return;
  pl.totalIngresos=s.sueldoBase+s.bonif+s.otrosIng+s.comisiones;
  pl.totalDescuentos=s.igss+s.isr+s.otrosDesc;
  pl.totalNeto=s.totalMes;   // lo que efectivamente se paga en el mes
  pl.nEmpleados=pl.lineas.length;
  const algunPago=pl.lineas.some(l=>l.q1Pagado||l.q2Pagado||l.comPagado);
  const todo=pl.lineas.length>0&&pl.lineas.every(_lineaCompleta);
  pl.estado=!algunPago?'borrador':(todo?'pagada':'parcial');
}

// Abrir una planilla nueva (mes actual por defecto).
function nuevaPlanilla(){
  if(!(typeof empleados!=='undefined'&&empleados.filter(e=>e.activo!==false).length)){
    toast('Sin empleados activos','Agregá empleados antes de armar la planilla',true);return;
  }
  const ms=_mesesRecientes(1)[0];
  _planActual={_nuevo:true,id:null,desde:ms.desde,hasta:ms.hasta,etiqueta:ms.etiqueta,
    estado:'borrador',notas:'',cuentaPagoId:_cuentaPlanillaDefault(),
    lineas:_construirLineas(ms.desde,ms.hasta),creadoPor:(typeof currentUser!=='undefined'?currentUser:'')};
  _abrirEditorPlanilla();
}
window.nuevaPlanilla=nuevaPlanilla;

// Ver / seguir pagando una planilla guardada.
function verPlanilla(id){
  const p=(typeof planillas!=='undefined'?planillas:[]).find(x=>String(x.id)===String(id));
  if(!p){toast('No encontrada','Esa planilla ya no está',true);return;}
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
  const valMesActual=`${(+pl.desde.slice(0,4))}-${(+pl.desde.slice(5,7))}`;
  const selMes=pl._nuevo
    ? `<select id="pl-mes" onchange="_planCambiarMes(this.value)">${_mesesRecientes(12).map(q=>`<option value="${q.val}"${q.val===valMesActual?' selected':''}>${q.etiqueta}</option>`).join('')}</select>`
    : `<div style="font-weight:700;font-size:15px;color:var(--ink)">${escHtml(pl.etiqueta)}</div>`;
  const body=`
    <div class="row" style="align-items:end;margin-bottom:4px">
      <div><label>Mes</label>${selMes}</div>
      <div><label>Pagar desde</label><select id="pl-cuenta" onchange="_planSetCuenta(this.value)">${optCta||'<option value="">— Sin cuentas —</option>'}</select></div>
    </div>
    <div class="kpis" style="margin:6px 0 10px">
      <div class="kpi"><div class="k-body"><div class="k-lbl">Neto sueldos (mes)</div><div class="k-val num" id="pl-kpi-sueldo">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Comisiones (mes)</div><div class="k-val num" id="pl-kpi-com">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Total del mes</div><div class="k-val num" id="pl-kpi-total" style="color:var(--green)">—</div></div></div>
    </div>
    <div style="overflow-x:auto"><div id="pl-tabla-wrap"></div></div>
    <div class="note" style="margin-top:10px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El sueldo se paga en <b>2 quincenas</b> (cada una con su póliza). Las <b>comisiones van aparte</b>, con su propio pago y su propia póliza. IGSS al ${(IGSS_LABORAL_PCT*100).toFixed(2)}% sobre el sueldo base y comisiones automáticas de las ventas del mes (5% sin IVA) — todo editable. El ISR lo escribís vos. Al pagar se abre la boleta.</span></div>`;
  openMod('Planilla mensual',body,_planGuardar);
  $('#m-save').textContent='Guardar planilla';
  $('#ov').classList.add('modal-wide');
  const _m=document.querySelector('#ov .modal'); if(_m)_m.style.maxWidth='min(98vw,1280px)';
  _planPintar();
}

function _planSetCuenta(v){ if(_planActual)_planActual.cuentaPagoId=v?Number(v):null; }
function _planCambiarMes(v){
  if(!_planActual||!_planActual._nuevo)return;
  const [y,m]=v.split('-').map(Number);
  const r=_rangoMes(y,m);
  _planActual.desde=r.desde;_planActual.hasta=r.hasta;_planActual.etiqueta=r.etiqueta;
  _planActual.lineas=_construirLineas(r.desde,r.hasta);
  _planPintar();
}
window._planSetCuenta=_planSetCuenta;
window._planCambiarMes=_planCambiarMes;

// Botón de pago de una parte (mini).
function _btnPago(i,parte,lbl,pagado,poliza){
  if(pagado)return `<button class="btn btn-ghost btn-sm" style="color:var(--green);padding:2px 8px" onclick="_planPolizaParte(${i},'${parte}')" title="Póliza ${poliza?('POL-'+String(poliza).padStart(6,'0')):''}">✓ ${lbl}</button>`;
  return `<button class="btn btn-primary btn-sm" style="padding:2px 8px" onclick="_planPagarParte(${i},'${parte}')">${lbl}</button>`;
}
// Dibuja la tabla de líneas + totales dentro del editor.
function _planPintar(){
  const wrap=document.getElementById('pl-tabla-wrap'); if(!wrap||!_planActual)return;
  const pl=_planActual;
  const filas=pl.lineas.map((l,i)=>{
    const bloqSueldo=l.q1Pagado||l.q2Pagado;   // sueldo tocado por un pago → bloquear campos fijos
    const bloqCom=l.comPagado;
    const inp=(campo,val,bloq)=>`<input type="number" step="0.01" value="${val}" ${bloq?'disabled':''} oninput="_planSet(${i},'${campo}',this.value)" style="width:82px" class="num">`;
    const pagos=`<div style="display:flex;flex-direction:column;gap:3px;align-items:stretch;min-width:118px">
        <div style="display:flex;gap:3px">${_btnPago(i,'q1','1ª Q',l.q1Pagado,l.q1Poliza)}${_btnPago(i,'q2','2ª Q',l.q2Pagado,l.q2Poliza)}</div>
        ${_comLinea(l)>0?`<div>${_btnPago(i,'com','Comisiones',l.comPagado,l.comPoliza)}</div>`:''}
        <button class="btn btn-ghost btn-sm" style="padding:2px 8px" onclick="boletaPlanillaUI(${i})">Boleta</button>
      </div>`;
    return `<tr>
      <td style="font-weight:600;min-width:140px">${escHtml(l.nombre)}${_lineaCompleta(l)?` <span class="badge b-ok" style="font-size:9px">Pagado</span>`:''}</td>
      <td>${inp('sueldoBase',l.sueldoBase,bloqSueldo)}</td>
      <td>${inp('bonif',l.bonif,bloqSueldo)}</td>
      <td>${inp('otrosIng',l.otrosIng,bloqSueldo)}</td>
      <td>${inp('igss',l.igss,bloqSueldo)}</td>
      <td>${inp('isr',l.isr,bloqSueldo)}</td>
      <td>${inp('otrosDesc',l.otrosDesc,bloqSueldo)}</td>
      <td class="num" style="font-weight:700" id="pl-neto-${i}">${money(_netoSueldo(l))}</td>
      <td>${inp('comisiones',l.comisiones,bloqCom)}</td>
      <td style="text-align:center">${pagos}</td>
    </tr>`;
  }).join('');
  const tc=id=>`<td class="num" style="font-weight:700" id="pl-t-${id}"></td>`;
  wrap.innerHTML=`<table style="min-width:1120px"><thead><tr>
      <th>Empleado</th><th class="num">Sueldo</th><th class="num">Bonif.</th><th class="num">Otros ing.</th>
      <th class="num">IGSS</th><th class="num">ISR</th><th class="num">Otros desc.</th>
      <th class="num">Neto sueldo</th><th class="num">Comisiones</th><th style="text-align:center">Pagos</th></tr></thead>
    <tbody>${filas||`<tr><td colspan="10" style="color:var(--muted-2);padding:14px">Sin empleados activos.</td></tr>`}</tbody>
    <tfoot><tr style="border-top:2px solid var(--line-strong);font-weight:700">
      <td>Total (${pl.lineas.length})</td>${tc('sueldoBase')}${tc('bonif')}${tc('otrosIng')}${tc('igss')}${tc('isr')}${tc('otrosDesc')}${tc('netoSueldo')}${tc('comisiones')}<td></td>
    </tr></tfoot></table>`;
  _planPintarTotales();
}
function _planSet(i,campo,val){
  if(!_planActual)return;
  _planActual.lineas[i][campo]=Number(val)||0;
  const nc=document.getElementById('pl-neto-'+i);
  if(nc)nc.textContent=money(_netoSueldo(_planActual.lineas[i]));
  _planPintarTotales();
}
function _planPintarTotales(){
  const s=_planSumas();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=money(v);};
  ['sueldoBase','bonif','otrosIng','igss','isr','otrosDesc','netoSueldo','comisiones'].forEach(k=>set('pl-t-'+k,s[k]));
  set('pl-kpi-sueldo',s.netoSueldo);set('pl-kpi-com',s.comisiones);set('pl-kpi-total',s.totalMes);
}
window._planSet=_planSet;

// Guardar la planilla (borrador o con pagos). Devuelve true/false.
async function _planGuardar(){
  const pl=_planActual; if(!pl)return false;
  _planSyncTotales();
  const btn=$('#m-save'); if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  const ok=await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve(false));
  if(btn){btn.disabled=false;btn.textContent='Guardar planilla';}
  if(!ok){toast('No se pudo guardar','¿Ya corriste el SQL de planillas?',true);return false;}
  const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
  const copia=JSON.parse(JSON.stringify(pl)); delete copia._nuevo;
  if(idx>=0)planillas[idx]=copia; else planillas.unshift(copia);
  if(typeof logAudit==='function')logAudit('Planilla guardada',pl.etiqueta+' · total '+money(pl.totalNeto));
  toast('✓ Planilla guardada',pl.etiqueta);
  renderPlanilla();
  return true;
}

// Registra una salida de banco de planilla (asigna póliza pero NO la abre).
function _planRegistrarPago(o){
  if(!o.cuentaId||!(o.monto>0))return null;
  const fecha=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  const mov={cuentaId:Number(o.cuentaId),fecha,tipo:'salida',monto:Number(o.monto),
    concepto:o.concepto||'',categoria:'planilla',origen:'planilla',origenId:o.origenId||null,
    referencia:null,registradoPor:(typeof currentUser!=='undefined'?currentUser:''),
    registradoEl:new Date().toISOString(),anulado:false,_nuevo:true};
  const maxPol=(movimientosBanco.reduce((m,x)=>Math.max(m,x.poliza||0),0)||0);
  mov.poliza=maxPol+1;
  if(o.beneficiario)mov.beneficiario=o.beneficiario;
  movimientosBanco.push(mov);
  if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mov);
  return mov;
}
// Pagar una parte del empleado: 'q1' / 'q2' (sueldo) o 'com' (comisiones).
async function _planPagarParte(i,parte){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(!l)return;
  const yaPagado={q1:l.q1Pagado,q2:l.q2Pagado,com:l.comPagado}[parte];
  if(yaPagado)return;
  const monto={q1:_montoQ1(l),q2:_montoQ2(l),com:_comLinea(l)}[parte];
  const etq={q1:'1ª quincena',q2:'2ª quincena',com:'comisiones'}[parte];
  if(!(monto>0)){toast('Nada que pagar','El monto de '+etq+' para '+l.nombre+' es cero',true);return;}
  const cuentaId=l.cuentaBancoId||pl.cuentaPagoId;
  if(!cuentaId){toast('Elegí la cuenta','Seleccioná desde qué cuenta se paga',true);return;}
  if(pl._nuevo){const ok=await _planGuardar(); if(!ok)return;}
  const mov=_planRegistrarPago({cuentaId,monto,origenId:pl.id,beneficiario:l.nombre,
    concepto:'Planilla '+pl.etiqueta+' · '+l.nombre+' · '+etq});
  if(!mov){toast('No se registró el pago','Revisá la cuenta seleccionada',true);return;}
  const ahora=new Date().toISOString();
  if(parte==='q1'){l.q1Pagado=true;l.q1Poliza=mov.poliza;l.q1El=ahora;}
  else if(parte==='q2'){l.q2Pagado=true;l.q2Poliza=mov.poliza;l.q2El=ahora;}
  else{l.comPagado=true;l.comPoliza=mov.poliza;l.comEl=ahora;}
  l.cuentaBancoId=cuentaId;
  _planSyncTotales();
  await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve());
  const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
  if(idx>=0){const c=JSON.parse(JSON.stringify(pl));delete c._nuevo;planillas[idx]=c;}
  if(typeof logAudit==='function')logAudit('Pago de planilla',l.nombre+' · '+etq+' · '+money(monto)+' · '+pl.etiqueta);
  _planPintar(); renderPlanilla();
  // Mostrar la BOLETA (lo del empleado); la póliza queda en su botón ✓.
  boletaPagoPDF(pl,l);
  toast('✓ Pago registrado',l.nombre+' · '+etq);
}
// Reabrir la póliza de cheque de una parte pagada.
function _planPolizaParte(i,parte){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(!l)return;
  const num={q1:l.q1Poliza,q2:l.q2Poliza,com:l.comPoliza}[parte];
  if(!num)return;
  const mov=(typeof movimientosBanco!=='undefined'?movimientosBanco:[])
    .find(m=>m.poliza===num&&m.origen==='planilla');
  if(mov&&typeof polizaChequePDF==='function')polizaChequePDF(mov,l.nombre);
  else toast('Póliza no encontrada','El movimiento no está cargado',true);
}
window._planPagarParte=_planPagarParte;
window._planPolizaParte=_planPolizaParte;

// Eliminar una planilla: anula sus movimientos de banco (devuelve el saldo)
// y borra el registro. Solo admin (toda la sección lo es).
function eliminarPlanilla(id){
  const p=(typeof planillas!=='undefined'?planillas:[]).find(x=>String(x.id)===String(id));
  if(!p)return;
  const pols=[];
  (p.lineas||[]).forEach(l=>{[l.q1Poliza,l.q2Poliza,l.comPoliza].forEach(n=>{if(n)pols.push(n);});});
  const msg=pols.length
    ? `Se anularán ${pols.length} movimiento(s) de banco (devuelve el saldo) y se borrará la planilla.`
    : 'Se borrará la planilla (no tiene pagos registrados).';
  const _do=async()=>{
    // Anular los movimientos de banco ligados (por póliza + origen planilla)
    let anulados=0;
    pols.forEach(n=>{
      const m=(typeof movimientosBanco!=='undefined'?movimientosBanco:[]).find(x=>x.poliza===n&&x.origen==='planilla'&&!x.anulado);
      if(m){m.anulado=true;if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(m);anulados++;}
    });
    const ok=await (typeof borrarPlanilla==='function'?borrarPlanilla(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=planillas.findIndex(x=>String(x.id)===String(id));
    if(idx>=0)planillas.splice(idx,1);
    if(typeof logAudit==='function')logAudit('Planilla eliminada',p.etiqueta+(anulados?(' · '+anulados+' movimiento(s) anulado(s)'):''));
    if(typeof closeMod==='function')closeMod();
    renderPlanilla();
    if(typeof renderBancos==='function'){try{renderBancos();}catch(e){}}
    toast('✓ Planilla eliminada',p.etiqueta);
  };
  if(typeof confirmar==='function')confirmar('¿Eliminar la planilla?',msg,'Eliminar',_do);
  else if(confirm(msg))_do();
}
window.eliminarPlanilla=eliminarPlanilla;

// ============================================================
//  BOLETA DE PAGO  (parte 3) — media carta, igual a la póliza
// ============================================================
//  Una boleta por empleado con el desglose del MES. El sueldo se paga
//  en 2 quincenas (con sus pólizas) y las comisiones aparte (con la
//  suya). En español, sin acumulado del año.
function _boletaFila(lbl,val,fuerte){
  return `<tr>
    <td style="padding:3px 0;font-size:12px;color:#333">${lbl}</td>
    <td style="padding:3px 0;font-size:12px;text-align:right;${fuerte?'font-weight:700;color:#173916':'font-weight:600'}">${money(val)}</td></tr>`;
}
function _polRef(num){return num?('POL-'+String(num).padStart(6,'0')):null;}
function boletaPagoPDF(pl,l){
  if(!pl||!l)return;
  const emp=(typeof empleados!=='undefined'?empleados:[]).find(e=>String(e.id)===String(l.empleadoId))||{};
  const cuenta=(typeof cuentasBanco!=='undefined'?cuentasBanco:[]).find(c=>String(c.id)===String(l.cuentaBancoId||pl.cuentaPagoId))||{};
  const ingFijos=_lineaIngFijos(l), desc=_lineaDesc(l), netoSueldo=_netoSueldo(l), com=_comLinea(l);
  const totalMes=netoSueldo+com;
  const sec=t=>`<div style="font-size:10px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.7px;margin:11px 0 3px;display:flex;align-items:center;gap:8px"><span>${t}</span><span style="flex:1;height:1px;background:#D6DCC9"></span></div>`;
  const dato=(lbl,val)=>`<div style="min-width:0"><div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">${lbl}</div><div style="font-size:13px;font-weight:600;color:#173916;margin-top:1px">${val||'—'}</div></div>`;
  const refPol=(lbl,pagado,num)=>`<span style="font-size:10.5px;color:#666B5C">${lbl}: ${pagado?('<b>'+_polRef(num)+'</b>'):'<span style="color:#B45309">pendiente</span>'}</span>`;
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px;align-items:flex-start">
      <div style="flex:1;min-width:230px">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">Empleado</div>
        <div style="font-size:17px;font-weight:800;color:#173916;margin-top:1px">${escHtml(l.nombre)}</div>
        <div style="font-size:12px;color:#666B5C;margin-top:1px">${escHtml(emp.puesto||'')}</div>
      </div>
      <div style="text-align:right;min-width:170px">
        <div style="font-size:9.5px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.6px">Período</div>
        <div style="font-size:14px;font-weight:700;color:#173916;margin-top:1px">${escHtml(pl.etiqueta||'')}</div>
      </div>
    </div>

    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:8px">
      ${dato('DPI',emp.dpi)} ${dato('NIT',emp.nit)} ${dato('No. IGSS',emp.igss)}
    </div>

    <div style="display:flex;gap:22px;align-items:flex-start;margin-top:4px">
      <div style="flex:1;min-width:0">
        ${sec('Sueldo del mes')}
        <table style="width:100%;border-collapse:collapse">
          ${_boletaFila('Sueldo base',l.sueldoBase)}
          ${_boletaFila('Bonificación incentivo',l.bonif)}
          ${(+l.otrosIng)?_boletaFila('Otros ingresos',l.otrosIng):''}
          ${_boletaFila('(–) IGSS laboral',l.igss)}
          ${(+l.isr)?_boletaFila('(–) ISR',l.isr):''}
          ${(+l.otrosDesc)?_boletaFila('(–) Otras deducciones',l.otrosDesc):''}
          <tr><td colspan="2" style="border-top:1px solid #D6DCC9"></td></tr>
          ${_boletaFila('Neto del sueldo',netoSueldo,true)}
        </table>
        <div style="margin-top:5px;display:flex;flex-direction:column;gap:2px">
          <span style="font-size:10.5px;color:#666B5C">Se paga en 2 quincenas de ${money(_montoQ1(l))} y ${money(_montoQ2(l))}:</span>
          <div style="display:flex;gap:14px">${refPol('1ª quincena',l.q1Pagado,l.q1Poliza)} ${refPol('2ª quincena',l.q2Pagado,l.q2Poliza)}</div>
        </div>
      </div>
      <div style="flex:1;min-width:0">
        ${sec('Comisiones del mes')}
        ${com>0?`<table style="width:100%;border-collapse:collapse">
          ${_boletaFila('Comisiones sobre ventas',com,true)}
        </table>
        <div style="margin-top:5px">${refPol('Pago de comisiones',l.comPagado,l.comPoliza)}</div>
        <div style="font-size:10.5px;color:#909584;margin-top:2px">Se pagan aparte del sueldo.</div>`
        :`<div style="font-size:12px;color:#909584;padding:4px 0">Sin comisiones este mes.</div>`}
      </div>
    </div>

    <div style="margin-top:12px;border:1.5px solid #173916;border-radius:8px;display:flex;justify-content:space-between;align-items:center;padding:8px 16px">
      <div style="font-size:12px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.6px">Total del mes${com>0?' (sueldo + comisiones)':''}</div>
      <div style="font-size:22px;font-weight:800;color:#173916">${money(totalMes)}</div>
    </div>

    <div style="display:flex;gap:22px;align-items:flex-start;margin-top:6px">
      <div style="flex:1;min-width:0">
        ${sec('Forma de pago')}
        <div style="font-size:12.5px;font-weight:700;color:#173916">${cuenta.banco?escHtml(cuenta.banco):escHtml(cuenta.nombre||'—')}</div>
        ${cuenta.nombre&&cuenta.banco?`<div style="font-size:11px;color:#666B5C">${escHtml(cuenta.nombre)}</div>`:''}
      </div>
      <div style="flex:1;min-width:0;text-align:center;align-self:flex-end">
        <div style="border-top:1px solid #555;margin-top:26px;padding-top:5px;font-size:10px;color:#555">Recibí conforme</div>
      </div>
    </div>`;
  _abrirPDF(_pdfShell({titulo:'BOLETA DE PAGO',subtitulo:'Planilla mensual',sinEmitido:true,orientacion:'portrait',margen:'6mm 12mm',sinPie:true,compacto:true,body}));
}
window.boletaPagoPDF=boletaPagoPDF;
function boletaPlanillaUI(i){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(l)boletaPagoPDF(pl,l);
}
window.boletaPlanillaUI=boletaPlanillaUI;
