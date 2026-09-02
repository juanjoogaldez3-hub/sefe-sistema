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
  if(typeof renderRecibosEspeciales==='function')renderRecibosEspeciales();
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
let _planEdit=new Set(); // filas desbloqueadas a mano para corregir valores ya pagados

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
// ── Modelo de quincena ──
// Cada línea de empleado tiene DOS quincenas INDEPENDIENTES (q1, q2), cada una
// con sus propios ingresos y descuentos EDITABLES. Ya no se parte 50/50
// automático: vos ponés cuánto va en cada quincena y en cuál caen el IGSS/ISR.
// Las comisiones van APARTE (una sola vez al mes, no entran en las quincenas).
function _qVacia(){return {sueldo:0,bonif:0,otrosIng:0,igss:0,isr:0,otrosDesc:0,pagado:false,poliza:null,el:null};}
// Partición sugerida al armar: 1ª = mitad redondeada, 2ª = el resto (así las
// dos suman EXACTO el mensual). Es sólo el valor de arranque; después editable.
function _mitad(x,q){const h=Math.round((+x||0)/2*100)/100;return q===1?h:Math.round(((+x||0)-h)*100)/100;}
// Redondeo a 2 decimales para mostrar en los campos (evita "96.6000000001").
function _n2(v){return Math.round((+v||0)*100)/100;}

// Compatibilidad: una planilla vieja guardó los montos MENSUALES sueltos en la
// línea (l.sueldoBase, l.igss, …) y los partía 50/50 al mostrar. Al abrirla la
// convertimos al modelo nuevo replicando EXACTO esa partición vieja, para no
// cambiar lo ya visto ni lo ya pagado.
function _migrarLinea(l){
  if(!l||(l.q1&&typeof l.q1==='object'&&l.q2&&typeof l.q2==='object'))return l; // ya es modelo nuevo
  const q1=_qVacia(), q2=_qVacia();
  const map={sueldo:'sueldoBase',bonif:'bonif',otrosIng:'otrosIng',igss:'igss',isr:'isr',otrosDesc:'otrosDesc'};
  Object.keys(map).forEach(k=>{const v=l[map[k]];q1[k]=_mitad(v,1);q2[k]=_mitad(v,2);});
  q1.pagado=!!l.q1Pagado; q1.poliza=l.q1Poliza||null; q1.el=l.q1El||null;
  q2.pagado=!!l.q2Pagado; q2.poliza=l.q2Poliza||null; q2.el=l.q2El||null;
  return {empleadoId:l.empleadoId,nombre:l.nombre,cuentaBancoId:l.cuentaBancoId||null,
    comisiones:+l.comisiones||0,comPagado:!!l.comPagado,comPoliza:l.comPoliza||null,comEl:l.comEl||null,
    q1,q2};
}
function _migrarLineas(arr){return (Array.isArray(arr)?arr:[]).map(_migrarLinea);}
// Las pólizas de una línea (tolera modelo viejo y nuevo).
function _polizasLinea(l){
  if(l&&l.q1&&typeof l.q1==='object')return [l.q1.poliza,l.q2.poliza,l.comPoliza];
  return [l.q1Poliza,l.q2Poliza,l.comPoliza];
}

// Una línea por empleado activo. Sueldo/bonificación se reparten mitad y mitad
// entre las dos quincenas; los DESCUENTOS (IGSS) caen por defecto en la 2ª
// quincena (cierre de mes) — todo editable después.
function _construirLineas(desde,hasta){
  return (typeof empleados!=='undefined'?empleados:[]).filter(e=>e.activo!==false)
    .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(e=>{
      const com=_comisionEmpleado(e,desde,hasta);
      const sueldo=Number(e.sueldoBase)||0;
      const bonif=Number(e.bonifIncentivo)||0;
      const igss=Math.round(sueldo*IGSS_LABORAL_PCT*100)/100; // IGSS sobre el sueldo base
      const q1=_qVacia(), q2=_qVacia();
      q1.sueldo=_mitad(sueldo,1); q2.sueldo=_mitad(sueldo,2);
      q1.bonif=_mitad(bonif,1);   q2.bonif=_mitad(bonif,2);
      q2.igss=igss;               // el IGSS del mes cae en la 2ª quincena (editable)
      return {empleadoId:e.id,nombre:e.nombre,cuentaBancoId:e.cuentaBancoId||null,
        comisiones:com,comPagado:false,comPoliza:null,comEl:null,q1,q2};
    });
}

// ── Cálculos de una quincena y de la línea ──
function _qIng(qo){return (+qo.sueldo||0)+(+qo.bonif||0)+(+qo.otrosIng||0);}
function _qDesc(qo){return (+qo.igss||0)+(+qo.isr||0)+(+qo.otrosDesc||0);}
function _qNeto(qo){return Math.round((_qIng(qo)-_qDesc(qo))*100)/100;}
function _montoQ1(l){return _qNeto(l.q1);}  // líquido de la 1ª quincena
function _montoQ2(l){return _qNeto(l.q2);}  // líquido de la 2ª quincena
// Suma de un mismo concepto en las dos quincenas (para los totales del mes).
function _mesConcepto(l,campo){return (+l.q1[campo]||0)+(+l.q2[campo]||0);}
function _lineaIngFijos(l){return _qIng(l.q1)+_qIng(l.q2);}
function _lineaDesc(l){return _qDesc(l.q1)+_qDesc(l.q2);}
function _netoSueldo(l){return Math.round((_qNeto(l.q1)+_qNeto(l.q2))*100)/100;} // neto del sueldo (mes)
function _comLinea(l){return +l.comisiones||0;}
function _lineaCompleta(l){return l.q1.pagado&&l.q2.pagado&&(_comLinea(l)<=0||l.comPagado);}

function _planSumas(){
  const L=_planActual?_planActual.lineas:[];
  const s={sueldoBase:0,bonif:0,otrosIng:0,igss:0,isr:0,otrosDesc:0,comisiones:0,netoSueldo:0};
  L.forEach(l=>{s.sueldoBase+=_mesConcepto(l,'sueldo');s.bonif+=_mesConcepto(l,'bonif');s.otrosIng+=_mesConcepto(l,'otrosIng');
    s.igss+=_mesConcepto(l,'igss');s.isr+=_mesConcepto(l,'isr');s.otrosDesc+=_mesConcepto(l,'otrosDesc');
    s.comisiones+=_comLinea(l);s.netoSueldo+=_netoSueldo(l);});
  s.totalMes=s.netoSueldo+s.comisiones;
  return s;
}
function _planSyncTotales(){
  const s=_planSumas(), pl=_planActual; if(!pl)return;
  pl.totalIngresos=s.sueldoBase+s.bonif+s.otrosIng+s.comisiones;
  pl.totalDescuentos=s.igss+s.isr+s.otrosDesc;
  pl.totalNeto=s.totalMes;   // lo que efectivamente se paga en el mes
  pl.nEmpleados=pl.lineas.length;
  const algunPago=pl.lineas.some(l=>l.q1.pagado||l.q2.pagado||l.comPagado);
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
  _planActual.lineas=_migrarLineas(_planActual.lineas);  // planillas viejas → modelo por quincena
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
  _planEdit=new Set();   // arrancar con todo en su estado normal (bloqueado si está pagado)
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
    <div class="note" style="margin-top:10px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El mes se paga en <b>2 quincenas independientes</b> — cada una con sus propios ingresos y descuentos, <b>editables por separado</b> (no se parte 50/50 automático). El IGSS del mes ${(IGSS_LABORAL_PCT*100).toFixed(2)}% arranca en la <b>2ª quincena</b> (movelo si querés). Las <b>comisiones van aparte</b> (5% sin IVA, automáticas). El ISR lo escribís vos. Cada pago genera su <b>boleta</b> y registra la salida en <b>Bancos</b> con su póliza de cheque.</span></div>`;
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

// Renglón de una parte a pagar: sin pagar → [Pagar]; pagada → [Boleta][✕ anular].
// Cada pago (1ª quincena, 2ª quincena, comisiones) es independiente.
function _pagoLinea(i,parte,lbl,pagado){
  // En la planilla solo se generan BOLETAS. La póliza de cheque se crea con
  // el movimiento de banco y se reimprime desde Bancos.
  if(pagado)return `<div style="display:flex;gap:4px;align-items:center;justify-content:flex-end">
      <span style="font-size:10px;color:var(--green);font-weight:700;min-width:38px;text-align:right">✓ ${lbl}</span>
      <button class="btn btn-ghost btn-sm" style="padding:2px 9px" onclick="boletaPlanillaUI(${i},'${parte}')">Boleta</button>
      <button class="btn btn-ghost btn-sm" style="padding:2px 7px;color:var(--danger)" title="Anular solo este pago (devuelve el saldo)" onclick="_planAnularParte(${i},'${parte}')">✕</button></div>`;
  return `<div style="display:flex;gap:5px;align-items:center;justify-content:flex-end">
      <span style="font-size:10px;color:var(--muted-2);min-width:38px;text-align:right">${lbl}</span>
      <button class="btn btn-primary btn-sm" style="padding:2px 12px" onclick="_planPagarParte(${i},'${parte}')">Pagar</button></div>`;
}
// Dibuja la tabla de líneas + totales dentro del editor. Cada empleado es un
// GRUPO: un renglón con su nombre, y debajo la 1ª quincena y la 2ª quincena
// como renglones separados y editables; las comisiones van en su propio
// renglón (aparte del sueldo).
function _planPintar(){
  const wrap=document.getElementById('pl-tabla-wrap'); if(!wrap||!_planActual)return;
  const pl=_planActual;
  const filas=pl.lineas.map((l,i)=>{
    const tienePago=l.q1.pagado||l.q2.pagado||l.comPagado;
    const desbloq=_planEdit.has(i);   // desbloqueada a mano para corregir
    // Cada quincena se bloquea sola cuando ya se pagó (salvo desbloqueo).
    const inpQ=(qk,campo,val,bloq)=>`<input type="number" step="0.01" value="${_n2(val)}" ${bloq?'disabled':''} oninput="_planSetQ(${i},'${qk}','${campo}',this.value)" class="num pl-in">`;
    // Renglón de una quincena: sus 6 inputs + neto + botón de pago.
    const filaQ=(qk,lbl)=>{
      const qo=l[qk], bloq=qo.pagado&&!desbloq;
      return `<tr class="pl-q">
        <td class="pl-qlbl">${lbl}</td>
        <td>${inpQ(qk,'sueldo',qo.sueldo,bloq)}</td>
        <td>${inpQ(qk,'bonif',qo.bonif,bloq)}</td>
        <td>${inpQ(qk,'otrosIng',qo.otrosIng,bloq)}</td>
        <td>${inpQ(qk,'igss',qo.igss,bloq)}</td>
        <td>${inpQ(qk,'isr',qo.isr,bloq)}</td>
        <td>${inpQ(qk,'otrosDesc',qo.otrosDesc,bloq)}</td>
        <td class="num" style="font-weight:700" id="pl-neto-${i}-${qk}">${money(_qNeto(qo))}</td>
        <td style="text-align:center">${_pagoLinea(i,qk,lbl,qo.pagado)}</td>
      </tr>`;
    };
    // Botón para corregir un grupo ya pagado (desbloquea sin tocar el dinero/póliza)
    const btnEdit=tienePago?(desbloq
      ? `<span style="font-size:9.5px;color:#B45309;margin-left:8px;font-weight:600">✎ editando (el pago no cambia)</span>`
      : `<button class="btn btn-ghost btn-sm" style="padding:1px 7px;font-size:10px;margin-left:8px" onclick="_planDesbloquear(${i})" title="Corregir valores (no cambia el pago ya hecho)">🔓 Editar</button>`):'';
    const nombreRow=`<tr class="pl-emp"><td colspan="9" style="padding-top:9px">
        <span style="font-weight:700;font-size:12.5px">${escHtml(l.nombre)}</span>${_lineaCompleta(l)?` <span class="badge b-ok" style="font-size:9px">Pagado</span>`:''}${btnEdit}
      </td></tr>`;
    // Renglón de comisiones (aparte; sólo si tiene comisiones del mes).
    const bloqCom=l.comPagado&&!desbloq;
    const comRow=_comLinea(l)>0?`<tr class="pl-com">
        <td class="pl-qlbl">Comis.</td>
        <td colspan="6"><input type="number" step="0.01" value="${_n2(l.comisiones)}" ${bloqCom?'disabled':''} oninput="_planSetCom(${i},this.value)" class="num pl-in" style="width:120px"></td>
        <td class="num" style="font-weight:700" id="pl-com-${i}">${money(_comLinea(l))}</td>
        <td style="text-align:center">${_pagoLinea(i,'com','Comis.',l.comPagado)}</td>
      </tr>`:'';
    return nombreRow+filaQ('q1','1ª Q')+filaQ('q2','2ª Q')+comRow;
  }).join('');
  const tc=id=>`<td class="num" style="font-weight:700" id="pl-t-${id}"></td>`;
  wrap.innerHTML=`<style>
      #pl-tabla-wrap table{width:100%;font-size:12px}
      #pl-tabla-wrap th,#pl-tabla-wrap td{padding:5px 6px;white-space:nowrap}
      #pl-tabla-wrap tr.pl-emp td{border-top:2px solid var(--line-strong)}
      #pl-tabla-wrap tr.pl-q td,#pl-tabla-wrap tr.pl-com td{background:var(--panel,#fff)}
      #pl-tabla-wrap td.pl-qlbl{font-weight:600;color:var(--muted);padding-left:16px;min-width:56px}
      #pl-tabla-wrap tr.pl-com td.pl-qlbl{color:#7a5c00}
      #pl-tabla-wrap input.pl-in{width:96px;text-align:right;padding:6px 8px;font-size:12px}
      #pl-tabla-wrap input.pl-in::-webkit-outer-spin-button,
      #pl-tabla-wrap input.pl-in::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #pl-tabla-wrap input.pl-in{-moz-appearance:textfield;appearance:textfield}
      #pl-tabla-wrap .btn-sm{white-space:nowrap}
    </style>
    <table style="min-width:900px"><thead><tr>
      <th></th><th class="num">Sueldo</th><th class="num">Bonif.</th><th class="num">Otros ing.</th>
      <th class="num">IGSS</th><th class="num">ISR</th><th class="num">Otros desc.</th>
      <th class="num">Neto</th><th style="text-align:center">Pago</th></tr></thead>
    <tbody>${filas||`<tr><td colspan="9" style="color:var(--muted-2);padding:14px">Sin empleados activos.</td></tr>`}</tbody>
    <tfoot><tr style="border-top:2px solid var(--line-strong);font-weight:700">
      <td>Total mes (${pl.lineas.length})</td>${tc('sueldoBase')}${tc('bonif')}${tc('otrosIng')}${tc('igss')}${tc('isr')}${tc('otrosDesc')}${tc('netoSueldo')}<td></td>
    </tr></tfoot></table>`;
  _planPintarTotales();
}
// Editar un valor de una quincena (sueldo, bonif, igss, isr, …).
function _planSetQ(i,qk,campo,val){
  if(!_planActual)return;
  const l=_planActual.lineas[i]; if(!l||!l[qk])return;
  l[qk][campo]=Number(val)||0;
  const nc=document.getElementById('pl-neto-'+i+'-'+qk);
  if(nc)nc.textContent=money(_qNeto(l[qk]));
  _planPintarTotales();
}
// Editar la comisión del mes (aparte del sueldo).
function _planSetCom(i,val){
  if(!_planActual)return;
  const l=_planActual.lineas[i]; if(!l)return;
  l.comisiones=Number(val)||0;
  const cc=document.getElementById('pl-com-'+i);
  if(cc)cc.textContent=money(_comLinea(l));
  _planPintarTotales();
}
function _planPintarTotales(){
  const s=_planSumas();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=money(v);};
  ['sueldoBase','bonif','otrosIng','igss','isr','otrosDesc','netoSueldo','comisiones'].forEach(k=>set('pl-t-'+k,s[k]));
  set('pl-kpi-sueldo',s.netoSueldo);set('pl-kpi-com',s.comisiones);set('pl-kpi-total',s.totalMes);
}
window._planSetQ=_planSetQ;
window._planSetCom=_planSetCom;

// Desbloquear una fila ya pagada para corregir sus valores. NO toca el
// dinero ni la póliza ya emitidos: solo permite editar los datos de la
// planilla (y de la boleta). Hay que Guardar para que quede.
function _planDesbloquear(i){
  if(!_planActual)return;
  _planEdit.add(i);
  _planPintar();
  toast('Fila desbloqueada','Podés corregir los valores. El pago y la póliza ya hechos no cambian — acordate de Guardar.');
}
window._planDesbloquear=_planDesbloquear;

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
  const yaPagado={q1:l.q1.pagado,q2:l.q2.pagado,com:l.comPagado}[parte];
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
  if(parte==='q1'){l.q1.pagado=true;l.q1.poliza=mov.poliza;l.q1.el=ahora;}
  else if(parte==='q2'){l.q2.pagado=true;l.q2.poliza=mov.poliza;l.q2.el=ahora;}
  else{l.comPagado=true;l.comPoliza=mov.poliza;l.comEl=ahora;}
  l.cuentaBancoId=cuentaId;
  _planSyncTotales();
  await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve());
  const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
  if(idx>=0){const c=JSON.parse(JSON.stringify(pl));delete c._nuevo;planillas[idx]=c;}
  if(typeof logAudit==='function')logAudit('Pago de planilla',l.nombre+' · '+etq+' · '+money(monto)+' · '+pl.etiqueta);
  _planPintar(); renderPlanilla();
  // Mostrar la BOLETA de ESTE pago (lo del empleado); la póliza queda en su botón.
  boletaPagoPDF(pl,l,parte);
  toast('✓ Pago registrado',l.nombre+' · '+etq);
}
window._planPagarParte=_planPagarParte;

// Anular UN pago (una quincena o las comisiones): revierte su movimiento de
// banco (devuelve el saldo) y deja esa parte como no pagada, para corregir y
// volver a pagar — sin tocar los otros pagos ni el resto de la planilla.
function _planAnularParte(i,parte){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(!l)return;
  const pagado={q1:l.q1.pagado,q2:l.q2.pagado,com:l.comPagado}[parte];
  if(!pagado)return;
  const num={q1:l.q1.poliza,q2:l.q2.poliza,com:l.comPoliza}[parte];
  const etq={q1:'1ª quincena',q2:'2ª quincena',com:'comisiones'}[parte];
  const _do=async()=>{
    // Anular el movimiento de banco ligado (por póliza + origen planilla)
    if(num){
      const mov=(typeof movimientosBanco!=='undefined'?movimientosBanco:[])
        .find(m=>m.poliza===num&&m.origen==='planilla'&&!m.anulado);
      if(mov){mov.anulado=true;if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mov);}
    }
    if(parte==='q1'){l.q1.pagado=false;l.q1.poliza=null;l.q1.el=null;}
    else if(parte==='q2'){l.q2.pagado=false;l.q2.poliza=null;l.q2.el=null;}
    else{l.comPagado=false;l.comPoliza=null;l.comEl=null;}
    _planSyncTotales();
    await (typeof guardarPlanilla==='function'?guardarPlanilla(pl):Promise.resolve());
    const idx=planillas.findIndex(p=>String(p.id)===String(pl.id));
    if(idx>=0){const c=JSON.parse(JSON.stringify(pl));delete c._nuevo;planillas[idx]=c;}
    if(typeof logAudit==='function')logAudit('Pago de planilla anulado',l.nombre+' · '+etq+' · '+pl.etiqueta);
    _planPintar(); renderPlanilla();
    if(typeof renderBancos==='function'){try{renderBancos();}catch(e){}}
    toast('✓ Pago anulado',l.nombre+' · '+etq+' — se devolvió el saldo. Corregí y volvé a pagar.');
  };
  if(typeof confirmar==='function')confirmar('¿Anular este pago?','Se revierte el movimiento de banco de la '+etq+' de '+l.nombre+' (devuelve el saldo). Vas a poder corregir y volver a pagar. Los demás pagos no se tocan.','Anular',_do);
  else if(confirm('¿Anular el pago de '+etq+'?'))_do();
}
window._planAnularParte=_planAnularParte;

// Eliminar una planilla: anula sus movimientos de banco (devuelve el saldo)
// y borra el registro. Solo admin (toda la sección lo es).
function eliminarPlanilla(id){
  const p=(typeof planillas!=='undefined'?planillas:[]).find(x=>String(x.id)===String(id));
  if(!p)return;
  const pols=[];
  (p.lineas||[]).forEach(l=>{_polizasLinea(l).forEach(n=>{if(n)pols.push(n);});});
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
//  Una boleta POR PAGO: la de la 1ª quincena, la de la 2ª quincena y la
//  de comisiones son boletas distintas, cada una con SU póliza. La
//  planilla se ve mensual, pero la boleta va por quincena (que es lo que
//  el empleado recibe cada 15). En español, sin acumulado del año.
function _boletaFila(lbl,val,fuerte){
  return `<tr>
    <td style="padding:3px 0;font-size:12px;color:#333">${lbl}</td>
    <td style="padding:3px 0;font-size:12px;text-align:right;${fuerte?'font-weight:700;color:#173916':'font-weight:600'}">${money(val)}</td></tr>`;
}
function _polRef(num){return num?('POL-'+String(num).padStart(6,'0')):null;}
// parte: 'q1' (1ª quincena) · 'q2' (2ª quincena) · 'com' (comisiones)
function boletaPagoPDF(pl,l,parte){
  if(!pl||!l)return;
  parte=parte||'q1';
  const esCom=(parte==='com'), q=(parte==='q2')?2:1;
  const emp=(typeof empleados!=='undefined'?empleados:[]).find(e=>String(e.id)===String(l.empleadoId))||{};
  const cuenta=(typeof cuentasBanco!=='undefined'?cuentasBanco:[]).find(c=>String(c.id)===String(l.cuentaBancoId||pl.cuentaPagoId))||{};
  const pagado=esCom?l.comPagado:(q===1?l.q1.pagado:l.q2.pagado);
  const poliza=esCom?l.comPoliza:(q===1?l.q1.poliza:l.q2.poliza);
  const fechaEl=esCom?l.comEl:(q===1?l.q1.el:l.q2.el);
  const fechaPago=fechaEl?fdate(fechaEl):(pl.hasta?fdate(pl.hasta):'—');
  const subt=esCom?('Comisiones · '+(pl.etiqueta||'')):((q===1?'1ª':'2ª')+' quincena · '+(pl.etiqueta||''));
  // Etiqueta de período tipo "16 – 31 ago 2026 · quincena"
  const mesN=(+pl.desde.slice(5,7)), anio=pl.desde.slice(0,4);
  const mesAbrev=_MESES_PL[mesN-1].slice(0,3), ld=_ultimoDiaMes(+anio,mesN);
  const periodo=esCom?(_cap(_MESES_PL[mesN-1])+' '+anio+' · comisiones')
                     :((q===1?'1 – 15':'16 – '+ld)+' '+mesAbrev+' '+anio+' · quincena');
  const n2=v=>Number(v||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fila=(lbl,val,o)=>{o=o||{};return `<tr>
      <td style="padding:2.5px 0;font-size:11.5px;color:${o.fuerte?'#173916':'#3a3f31'};${o.fuerte?'font-weight:700':''}">${lbl}</td>
      <td style="padding:2.5px 0;font-size:11.5px;text-align:right;color:${o.color||(o.fuerte?'#173916':'#222')};font-weight:${o.fuerte?'800':'600'}">${n2(val)}</td></tr>`;};
  const totalFila=(lbl,val,color)=>`<tr><td colspan="2" style="border-top:1px solid #C9D2B6;padding:3px 0 0"></td></tr>`+fila(lbl,val,{fuerte:true,color});
  const infoRow=(lbl,val,big)=>`<div style="display:flex;gap:10px;align-items:baseline;margin-top:${big?0:3}px">
      <span style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;min-width:118px">${lbl}</span>
      <span style="font-size:${big?15:12.5}px;font-weight:700;color:#173916">${val||'—'}</span></div>`;
  const colHead=t=>`<div style="font-size:10px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.7px;padding-bottom:3px;border-bottom:1px solid #D6DCC9;margin-bottom:4px">${t}</div>`;
  const igssLbl='IGSS ('+(IGSS_LABORAL_PCT*100).toFixed(2)+'%)';

  let ingRows, totIng, descRows, totDesc, neto;
  if(esCom){
    const com=_comLinea(l);
    ingRows=fila('Comisiones (ventas)',com);
    totIng=com;
    descRows=fila(igssLbl,0)+fila('ISR',0)+fila('Anticipos',0);
    totDesc=0; neto=com;
  }else{
    const qo=(q===1?l.q1:l.q2);
    const sB=+qo.sueldo||0,bo=+qo.bonif||0,oi=+qo.otrosIng||0;
    const ig=+qo.igss||0,is=+qo.isr||0,od=+qo.otrosDesc||0;
    ingRows=fila('Sueldo base',sB)+fila('Bonificación incentivo',bo)+(oi?fila('Otros ingresos',oi):'');
    totIng=sB+bo+oi;
    descRows=fila(igssLbl,ig)+fila('ISR',is)+fila('Anticipos',od);
    totDesc=ig+is+od; neto=_qNeto(qo);
  }
  const chip=pagado
    ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#EDF3DD;border:1px solid #C9D2B6;border-radius:20px;padding:5px 13px;font-size:11px;color:#3a4a1e">📄 Ref. Póliza de cheque <b style="color:#173916">${_polRef(poliza)}</b>${(cuenta.nombre||cuenta.banco)?' · '+escHtml(cuenta.nombre||cuenta.banco):''}</span>`
    : `<span style="font-size:11px;color:#B45309;font-weight:600">Pendiente de pago</span>`;
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:18px;align-items:flex-start">
      <div style="flex:1;min-width:250px">
        ${infoRow('Empleado',escHtml(l.nombre),true)}
        ${infoRow('Puesto',escHtml(emp.puesto||''))}
        ${infoRow('DPI',escHtml(emp.dpi||''))}
        ${infoRow('No. afiliación IGSS',escHtml(emp.igss||''))}
      </div>
      <div style="text-align:right;min-width:200px">
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px">Período</div>
        <div style="font-size:12.5px;font-weight:700;color:#173916;margin-top:1px">${periodo}</div>
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;margin-top:7px">Fecha de pago</div>
        <div style="font-size:12.5px;font-weight:700;color:#173916;margin-top:1px">${fechaPago}</div>
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;margin-top:9px">Líquido a recibir</div>
        <div style="font-size:23px;font-weight:800;color:#2e7d32;margin-top:1px">${money(neto)}</div>
      </div>
    </div>

    <div style="display:flex;gap:26px;margin-top:14px">
      <div style="flex:1;min-width:0">
        ${colHead('Ingresos')}
        <table style="width:100%;border-collapse:collapse">${ingRows}${totalFila('Total ingresos',totIng)}</table>
      </div>
      <div style="flex:1;min-width:0">
        ${colHead('Descuentos')}
        <table style="width:100%;border-collapse:collapse">${descRows}${totalFila('Total descuentos',totDesc,'#b03535')}</table>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:22px">
      <div>${chip}</div>
      <div style="flex:1;max-width:230px;text-align:center">
        <div style="border-top:1px solid #555;padding-top:5px;font-size:10px;color:#555">Recibí conforme</div>
      </div>
    </div>`;
  _abrirPDF(_pdfShell({titulo:'BOLETA DE PAGO',subtitulo:subt,sinEmitido:true,orientacion:'portrait',margen:'6mm 12mm',sinPie:true,compacto:true,body}));
}
window.boletaPagoPDF=boletaPagoPDF;
function boletaPlanillaUI(i,parte){
  const pl=_planActual; if(!pl)return;
  const l=pl.lineas[i]; if(l)boletaPagoPDF(pl,l,parte);
}
window.boletaPlanillaUI=boletaPlanillaUI;

// ============================================================
//  RECIBOS ESPECIALES (prestaciones) — parte 4
// ============================================================
//  Pagos aparte de la planilla quincenal: aguinaldo, bono 14,
//  indemnización u otro. Sugiere el monto (proporcional al tiempo
//  trabajado), editable. Se paga por empleado con su boleta; la póliza
//  queda en Bancos.
const _RE_TIPOS={aguinaldo:'Aguinaldo',bono14:'Bono 14',indemnizacion:'Indemnización',otro:'Otro'};
let _reActual=null;      // recibo en edición
let _reEdit=new Set();   // filas desbloqueadas para corregir

function renderRecibosEspeciales(){
  const tb=$('#t-recesp'); if(!tb)return;
  const lista=(typeof recibosEspeciales!=='undefined'?recibosEspeciales:[]).slice();
  const empty=$('#recesp-empty'); if(empty)empty.style.display=lista.length?'none':'block';
  tb.innerHTML=lista.map(r=>`<tr>
      <td style="font-weight:600">${escHtml(r.concepto||_RE_TIPOS[r.tipo]||'Recibo')}</td>
      <td>${escHtml(_RE_TIPOS[r.tipo]||r.tipo)}</td>
      <td>${r.fecha?fdate(r.fecha):'—'}</td>
      <td class="num">${r.nEmpleados||(r.lineas?r.lineas.length:0)}</td>
      <td class="num" style="font-weight:700">${money(r.totalNeto)}</td>
      <td>${_planEstadoBadge(r.estado)}</td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="verReciboEspecial(${r.id})">Ver / pagar</button> <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarReciboEspecial(${r.id})" title="Eliminar">✕</button></td>
    </tr>`).join('');
  if(typeof enhanceTable==='function')enhanceTable('t-recesp');
}
window.renderRecibosEspeciales=renderRecibosEspeciales;

// Monto sugerido de la prestación (editable). Aguinaldo/Bono 14 =
// proporcional al año trabajado; indemnización ≈ 1 sueldo por año.
function _prestacionSugerida(tipo,emp,fechaRef){
  const sueldo=Number(emp.sueldoBase)||0;
  if(tipo==='otro')return 0;
  if(!emp.fechaIngreso)return tipo==='indemnizacion'?0:sueldo;
  const ing=new Date(String(emp.fechaIngreso).slice(0,10)+'T00:00:00Z');
  const ref=new Date(String(fechaRef||'').slice(0,10)+'T00:00:00Z');
  if(isNaN(ing)||isNaN(ref)||ref<=ing)return tipo==='indemnizacion'?0:sueldo;
  const anios=((ref-ing)/86400000)/365;
  if(tipo==='indemnizacion')return Math.round(sueldo*anios*100)/100;
  return Math.round(sueldo*Math.min(1,anios)*100)/100;
}
function _reConcepto(tipo,fecha){
  const anio=String(fecha||'').slice(0,4)||'';
  if(tipo==='aguinaldo')return 'Aguinaldo '+anio;
  if(tipo==='bono14')return 'Bono 14 '+anio;
  if(tipo==='indemnizacion')return 'Indemnización';
  return '';
}
function _reConstruirLineas(tipo,fecha){
  return (typeof empleados!=='undefined'?empleados:[]).filter(e=>e.activo!==false)
    .sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre)))
    .map(e=>({empleadoId:e.id,nombre:e.nombre,cuentaBancoId:e.cuentaBancoId||null,
      monto:_prestacionSugerida(tipo,e,fecha),isr:0,otrosDesc:0,
      pagado:false,poliza:null,pagadoEl:null}));
}
function _reNeto(l){return (Number(l.monto)||0)-(Number(l.isr)||0)-(Number(l.otrosDesc)||0);}
function _reSumas(){
  const L=_reActual?_reActual.lineas:[]; const s={monto:0,isr:0,otrosDesc:0,neto:0};
  L.forEach(l=>{s.monto+=+l.monto||0;s.isr+=+l.isr||0;s.otrosDesc+=+l.otrosDesc||0;s.neto+=_reNeto(l);});
  return s;
}
function _reSync(){
  const s=_reSumas(), r=_reActual; if(!r)return;
  r.totalNeto=s.neto; r.nEmpleados=r.lineas.filter(l=>(Number(l.monto)||0)>0).length;
  const conMonto=r.lineas.filter(l=>(Number(l.monto)||0)>0);
  const pag=conMonto.filter(l=>l.pagado).length;
  r.estado=pag===0?'borrador':(pag===conMonto.length?'pagada':'parcial');
}

function nuevoReciboEspecial(){
  if(!(typeof empleados!=='undefined'&&empleados.filter(e=>e.activo!==false).length)){
    toast('Sin empleados activos','Agregá empleados antes de armar el recibo',true);return;
  }
  const hoy=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  _reActual={_nuevo:true,id:null,tipo:'aguinaldo',concepto:_reConcepto('aguinaldo',hoy),fecha:hoy,
    estado:'borrador',notas:'',cuentaPagoId:_cuentaPlanillaDefault(),
    lineas:_reConstruirLineas('aguinaldo',hoy),creadoPor:(typeof currentUser!=='undefined'?currentUser:'')};
  _reAbrirEditor();
}
window.nuevoReciboEspecial=nuevoReciboEspecial;
function verReciboEspecial(id){
  const r=(typeof recibosEspeciales!=='undefined'?recibosEspeciales:[]).find(x=>String(x.id)===String(id));
  if(!r){toast('No encontrado','Ese recibo ya no está',true);return;}
  _reActual=JSON.parse(JSON.stringify(r)); _reActual._nuevo=false;
  if(!_reActual.cuentaPagoId)_reActual.cuentaPagoId=_cuentaPlanillaDefault();
  _reAbrirEditor();
}
window.verReciboEspecial=verReciboEspecial;

function _reAbrirEditor(){
  const r=_reActual; _reEdit=new Set();
  const cuentas=(typeof cuentasActivasBanco==='function'?cuentasActivasBanco():[]);
  const optCta=cuentas.map(c=>`<option value="${c.id}"${String(r.cuentaPagoId)===String(c.id)?' selected':''}>${escHtml(c.nombre)}</option>`).join('');
  const selTipo=r._nuevo
    ? `<select id="re-tipo" onchange="_reCambiarTipo(this.value)">${Object.keys(_RE_TIPOS).map(k=>`<option value="${k}"${r.tipo===k?' selected':''}>${_RE_TIPOS[k]}</option>`).join('')}</select>`
    : `<div style="font-weight:700;font-size:15px;color:var(--ink)">${escHtml(_RE_TIPOS[r.tipo]||r.tipo)}</div>`;
  const body=`
    <div class="row" style="align-items:end;margin-bottom:4px">
      <div><label>Tipo</label>${selTipo}</div>
      <div><label>Concepto</label><input id="re-concepto" value="${escHtml(r.concepto||'')}" oninput="if(_reActual)_reActual.concepto=this.value"></div>
    </div>
    <div class="row" style="align-items:end;margin-bottom:4px">
      <div><label>Fecha</label><input id="re-fecha" type="date" value="${r.fecha?String(r.fecha).slice(0,10):''}" onchange="_reSetFecha(this.value)"></div>
      <div><label>Pagar desde</label><select id="re-cuenta" onchange="if(_reActual)_reActual.cuentaPagoId=this.value?Number(this.value):null">${optCta||'<option value="">— Sin cuentas —</option>'}</select></div>
    </div>
    <div class="kpis" style="margin:6px 0 10px">
      <div class="kpi"><div class="k-body"><div class="k-lbl">Monto</div><div class="k-val num" id="re-kpi-monto">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Descuentos</div><div class="k-val num" id="re-kpi-desc">—</div></div></div>
      <div class="kpi"><div class="k-body"><div class="k-lbl">Neto a pagar</div><div class="k-val num" id="re-kpi-neto" style="color:var(--green)">—</div></div></div>
    </div>
    <div style="overflow-x:auto"><div id="re-tabla-wrap"></div></div>
    <div class="note" style="margin-top:10px"><svg viewBox="0 0 24 24"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg><span>El monto se sugiere según el tiempo trabajado (aguinaldo y bono 14 son proporcionales; la indemnización ≈ 1 sueldo por año) — <b>todo editable</b>. El ISR lo escribís vos. Poné el monto en 0 para dejar a alguien fuera. Al pagar se abre la boleta; la póliza queda en Bancos.</span></div>`;
  openMod('Recibo especial',body,_reGuardar);
  $('#m-save').textContent='Guardar recibo';
  $('#ov').classList.add('modal-wide');
  const _m=document.querySelector('#ov .modal'); if(_m)_m.style.maxWidth='min(96vw,1040px)';
  _rePintar();
}
function _reSetFecha(v){ if(!_reActual)return; _reActual.fecha=v||null;
  if(_reActual._nuevo){_reActual.concepto=_reConcepto(_reActual.tipo,v); const ci=$('#re-concepto'); if(ci)ci.value=_reActual.concepto;
    _reActual.lineas=_reConstruirLineas(_reActual.tipo,v); _rePintar();} }
function _reCambiarTipo(t){ if(!_reActual||!_reActual._nuevo)return;
  _reActual.tipo=t; _reActual.concepto=_reConcepto(t,_reActual.fecha);
  const ci=$('#re-concepto'); if(ci)ci.value=_reActual.concepto;
  _reActual.lineas=_reConstruirLineas(t,_reActual.fecha); _rePintar(); }
window._reSetFecha=_reSetFecha; window._reCambiarTipo=_reCambiarTipo;

function _rePintar(){
  const wrap=document.getElementById('re-tabla-wrap'); if(!wrap||!_reActual)return;
  const r=_reActual;
  const filas=r.lineas.map((l,i)=>{
    const desbloq=_reEdit.has(i), bloq=l.pagado&&!desbloq;
    const inp=(campo,val)=>`<input type="number" step="0.01" value="${val}" ${bloq?'disabled':''} oninput="_reSet(${i},'${campo}',this.value)" class="num pl-in">`;
    const btnEdit=l.pagado?(desbloq?'<div style="font-size:9.5px;color:#B45309;margin-top:3px;font-weight:600">✎ editando</div>':`<button class="btn btn-ghost btn-sm" style="padding:1px 7px;font-size:10px;margin-top:3px" onclick="_reDesbloquear(${i})">🔓 Editar</button>`):'';
    const pago=l.pagado
      ? `<div style="display:flex;gap:4px;justify-content:flex-end"><button class="btn btn-ghost btn-sm" style="padding:2px 9px" onclick="_reBoleta(${i})">Boleta</button><button class="btn btn-ghost btn-sm" style="padding:2px 7px;color:var(--danger)" title="Anular este pago" onclick="_reAnular(${i})">✕</button></div>`
      : ((Number(l.monto)||0)>0?`<button class="btn btn-primary btn-sm" style="padding:2px 12px" onclick="_rePagar(${i})">Pagar</button>`:'<span style="font-size:10px;color:var(--muted-2)">—</span>');
    return `<tr>
      <td style="font-weight:600;min-width:140px">${escHtml(l.nombre)}${l.pagado?' <span class="badge b-ok" style="font-size:9px">Pagado</span>':''}${btnEdit}</td>
      <td>${inp('monto',l.monto)}</td>
      <td>${inp('isr',l.isr)}</td>
      <td>${inp('otrosDesc',l.otrosDesc)}</td>
      <td class="num" style="font-weight:700" id="re-neto-${i}">${money(_reNeto(l))}</td>
      <td style="text-align:right">${pago}</td>
    </tr>`;
  }).join('');
  const tc=id=>`<td class="num" style="font-weight:700" id="re-t-${id}"></td>`;
  wrap.innerHTML=`<style>
      #re-tabla-wrap table{width:100%;font-size:12px}
      #re-tabla-wrap th,#re-tabla-wrap td{padding:6px 7px;white-space:nowrap}
      #re-tabla-wrap input.pl-in{width:92px;text-align:right}
      #re-tabla-wrap input.pl-in::-webkit-outer-spin-button,#re-tabla-wrap input.pl-in::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #re-tabla-wrap input.pl-in{-moz-appearance:textfield;appearance:textfield}
    </style>
    <table><thead><tr><th>Empleado</th><th class="num">Monto</th><th class="num">ISR</th><th class="num">Otros desc.</th><th class="num">Neto</th><th style="text-align:right">Pago</th></tr></thead>
    <tbody>${filas||'<tr><td colspan="6" style="color:var(--muted-2);padding:14px">Sin empleados activos.</td></tr>'}</tbody>
    <tfoot><tr style="border-top:2px solid var(--line-strong);font-weight:700"><td>Total</td>${tc('monto')}${tc('isr')}${tc('otrosDesc')}${tc('neto')}<td></td></tr></tfoot></table>`;
  _rePintarTotales();
}
function _reSet(i,campo,val){ if(!_reActual)return;
  _reActual.lineas[i][campo]=Number(val)||0;
  const nc=document.getElementById('re-neto-'+i); if(nc)nc.textContent=money(_reNeto(_reActual.lineas[i]));
  _rePintarTotales(); }
function _rePintarTotales(){
  const s=_reSumas(); const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=money(v);};
  set('re-t-monto',s.monto);set('re-t-isr',s.isr);set('re-t-otrosDesc',s.otrosDesc);set('re-t-neto',s.neto);
  set('re-kpi-monto',s.monto);set('re-kpi-desc',s.isr+s.otrosDesc);set('re-kpi-neto',s.neto);
}
window._reSet=_reSet;
function _reDesbloquear(i){ if(!_reActual)return; _reEdit.add(i); _rePintar(); toast('Fila desbloqueada','Corregí y acordate de Guardar. El pago ya hecho no cambia.'); }
window._reDesbloquear=_reDesbloquear;

async function _reGuardar(){
  const r=_reActual; if(!r)return false;
  if(!r.concepto){r.concepto=_reConcepto(r.tipo,r.fecha)||_RE_TIPOS[r.tipo];}
  _reSync();
  const btn=$('#m-save'); if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  const ok=await (typeof guardarReciboEspecial==='function'?guardarReciboEspecial(r):Promise.resolve(false));
  if(btn){btn.disabled=false;btn.textContent='Guardar recibo';}
  if(!ok){toast('No se pudo guardar','¿Ya corriste el SQL de recibos especiales?',true);return false;}
  const idx=recibosEspeciales.findIndex(x=>String(x.id)===String(r.id));
  const copia=JSON.parse(JSON.stringify(r)); delete copia._nuevo;
  if(idx>=0)recibosEspeciales[idx]=copia; else recibosEspeciales.unshift(copia);
  if(typeof logAudit==='function')logAudit('Recibo especial guardado',(r.concepto||'')+' · neto '+money(r.totalNeto));
  toast('✓ Recibo guardado',r.concepto||''); renderPlanilla(); return true;
}

// Registra la salida de banco del recibo (no abre póliza).
function _reRegistrarPago(o){
  if(!o.cuentaId||!(o.monto>0))return null;
  const fecha=(typeof fechaHoyGT==='function')?fechaHoyGT():new Date().toISOString().slice(0,10);
  const mov={cuentaId:Number(o.cuentaId),fecha,tipo:'salida',monto:Number(o.monto),
    concepto:o.concepto||'',categoria:'planilla',origen:'recibo_especial',origenId:o.origenId||null,
    referencia:null,registradoPor:(typeof currentUser!=='undefined'?currentUser:''),
    registradoEl:new Date().toISOString(),anulado:false,_nuevo:true};
  const maxPol=(movimientosBanco.reduce((m,x)=>Math.max(m,x.poliza||0),0)||0);
  mov.poliza=maxPol+1; if(o.beneficiario)mov.beneficiario=o.beneficiario;
  movimientosBanco.push(mov); if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mov);
  return mov;
}
async function _rePagar(i){
  const r=_reActual; if(!r)return; const l=r.lineas[i]; if(!l||l.pagado)return;
  const neto=_reNeto(l);
  if(neto<=0){toast('Neto en cero','No hay monto que pagar para '+l.nombre,true);return;}
  const cuentaId=l.cuentaBancoId||r.cuentaPagoId;
  if(!cuentaId){toast('Elegí la cuenta','Seleccioná desde qué cuenta se paga',true);return;}
  if(r._nuevo){const ok=await _reGuardar(); if(!ok)return;}
  const mov=_reRegistrarPago({cuentaId,monto:neto,origenId:r.id,beneficiario:l.nombre,
    concepto:(r.concepto||'Recibo especial')+' · '+l.nombre});
  if(!mov){toast('No se registró el pago','Revisá la cuenta',true);return;}
  l.pagado=true; l.poliza=mov.poliza||null; l.pagadoEl=new Date().toISOString(); l.cuentaBancoId=cuentaId;
  _reSync(); await (typeof guardarReciboEspecial==='function'?guardarReciboEspecial(r):Promise.resolve());
  const idx=recibosEspeciales.findIndex(x=>String(x.id)===String(r.id));
  if(idx>=0){const c=JSON.parse(JSON.stringify(r));delete c._nuevo;recibosEspeciales[idx]=c;}
  if(typeof logAudit==='function')logAudit('Recibo especial · pago',l.nombre+' · '+money(neto)+' · '+(r.concepto||''));
  _rePintar(); renderPlanilla(); boletaEspecialPDF(r,l);
  toast('✓ Pago registrado',l.nombre);
}
window._rePagar=_rePagar;
async function _reAnular(i){
  const r=_reActual; if(!r)return; const l=r.lineas[i]; if(!l||!l.pagado)return;
  const _do=async()=>{
    if(l.poliza){const mov=(typeof movimientosBanco!=='undefined'?movimientosBanco:[]).find(m=>m.poliza===l.poliza&&m.origen==='recibo_especial'&&!m.anulado);
      if(mov){mov.anulado=true;if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(mov);}}
    l.pagado=false; l.poliza=null; l.pagadoEl=null;
    _reSync(); await (typeof guardarReciboEspecial==='function'?guardarReciboEspecial(r):Promise.resolve());
    const idx=recibosEspeciales.findIndex(x=>String(x.id)===String(r.id));
    if(idx>=0){const c=JSON.parse(JSON.stringify(r));delete c._nuevo;recibosEspeciales[idx]=c;}
    if(typeof logAudit==='function')logAudit('Recibo especial · pago anulado',l.nombre+' · '+(r.concepto||''));
    _rePintar(); renderPlanilla(); if(typeof renderBancos==='function'){try{renderBancos();}catch(e){}}
    toast('✓ Pago anulado',l.nombre+' — se devolvió el saldo');
  };
  if(typeof confirmar==='function')confirmar('¿Anular este pago?','Se revierte el movimiento de banco de '+l.nombre+' (devuelve el saldo). Podés corregir y volver a pagar.','Anular',_do);
  else if(confirm('¿Anular el pago de '+l.nombre+'?'))_do();
}
window._reAnular=_reAnular;
function _reBoleta(i){ const r=_reActual; if(!r)return; const l=r.lineas[i]; if(l)boletaEspecialPDF(r,l); }
window._reBoleta=_reBoleta;

function eliminarReciboEspecial(id){
  const r=(typeof recibosEspeciales!=='undefined'?recibosEspeciales:[]).find(x=>String(x.id)===String(id)); if(!r)return;
  const pols=(r.lineas||[]).filter(l=>l.poliza).map(l=>l.poliza);
  const _do=async()=>{
    pols.forEach(n=>{const m=(typeof movimientosBanco!=='undefined'?movimientosBanco:[]).find(x=>x.poliza===n&&x.origen==='recibo_especial'&&!x.anulado);
      if(m){m.anulado=true;if(typeof guardarMovimientoBanco==='function')guardarMovimientoBanco(m);}});
    const ok=await (typeof borrarReciboEspecial==='function'?borrarReciboEspecial(id):Promise.resolve(false));
    if(!ok){toast('No se pudo borrar','Intentá de nuevo',true);return;}
    const idx=recibosEspeciales.findIndex(x=>String(x.id)===String(id)); if(idx>=0)recibosEspeciales.splice(idx,1);
    if(typeof logAudit==='function')logAudit('Recibo especial eliminado',r.concepto||'');
    if(typeof closeMod==='function')closeMod(); renderPlanilla();
    if(typeof renderBancos==='function'){try{renderBancos();}catch(e){}}
    toast('✓ Recibo eliminado',r.concepto||'');
  };
  const msg=pols.length?('Se anulan '+pols.length+' pago(s) en Bancos (devuelve el saldo) y se borra el recibo.'):'Se borra el recibo.';
  if(typeof confirmar==='function')confirmar('¿Eliminar el recibo?',msg,'Eliminar',_do);
  else if(confirm(msg))_do();
}
window.eliminarReciboEspecial=eliminarReciboEspecial;

// Boleta del recibo especial (media carta, mismo estilo que la de planilla).
function boletaEspecialPDF(r,l){
  if(!r||!l)return;
  const emp=(typeof empleados!=='undefined'?empleados:[]).find(e=>String(e.id)===String(l.empleadoId))||{};
  const cuenta=(typeof cuentasBanco!=='undefined'?cuentasBanco:[]).find(c=>String(c.id)===String(l.cuentaBancoId||r.cuentaPagoId))||{};
  const neto=_reNeto(l);
  const fechaPago=l.pagadoEl?fdate(l.pagadoEl):(r.fecha?fdate(r.fecha):'—');
  const n2=v=>Number(v||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fila=(lbl,val,o)=>{o=o||{};return `<tr><td style="padding:2.5px 0;font-size:11.5px;color:${o.fuerte?'#173916':'#3a3f31'};${o.fuerte?'font-weight:700':''}">${lbl}</td><td style="padding:2.5px 0;font-size:11.5px;text-align:right;color:${o.color||(o.fuerte?'#173916':'#222')};font-weight:${o.fuerte?'800':'600'}">${n2(val)}</td></tr>`;};
  const totalFila=(lbl,val,color)=>`<tr><td colspan="2" style="border-top:1px solid #C9D2B6;padding:3px 0 0"></td></tr>`+fila(lbl,val,{fuerte:true,color});
  const infoRow=(lbl,val,big)=>`<div style="display:flex;gap:10px;align-items:baseline;margin-top:${big?0:3}px"><span style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;min-width:118px">${lbl}</span><span style="font-size:${big?15:12.5}px;font-weight:700;color:#173916">${val||'—'}</span></div>`;
  const colHead=t=>`<div style="font-size:10px;font-weight:700;color:#173916;text-transform:uppercase;letter-spacing:.7px;padding-bottom:3px;border-bottom:1px solid #D6DCC9;margin-bottom:4px">${t}</div>`;
  const chip=l.poliza
    ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#EDF3DD;border:1px solid #C9D2B6;border-radius:20px;padding:5px 13px;font-size:11px;color:#3a4a1e">📄 Ref. Póliza de cheque <b style="color:#173916">POL-${String(l.poliza).padStart(6,'0')}</b>${(cuenta.nombre||cuenta.banco)?' · '+escHtml(cuenta.nombre||cuenta.banco):''}</span>`
    : `<span style="font-size:11px;color:#B45309;font-weight:600">Pendiente de pago</span>`;
  const body=`
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:18px;align-items:flex-start">
      <div style="flex:1;min-width:250px">
        ${infoRow('Empleado',escHtml(l.nombre),true)}${infoRow('Puesto',escHtml(emp.puesto||''))}${infoRow('DPI',escHtml(emp.dpi||''))}${infoRow('No. afiliación IGSS',escHtml(emp.igss||''))}
      </div>
      <div style="text-align:right;min-width:200px">
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px">Concepto</div>
        <div style="font-size:13px;font-weight:700;color:#173916;margin-top:1px">${escHtml(r.concepto||_RE_TIPOS[r.tipo]||'')}</div>
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;margin-top:7px">Fecha de pago</div>
        <div style="font-size:12.5px;font-weight:700;color:#173916;margin-top:1px">${fechaPago}</div>
        <div style="font-size:9px;font-weight:700;color:#909584;text-transform:uppercase;letter-spacing:.5px;margin-top:9px">Líquido a recibir</div>
        <div style="font-size:23px;font-weight:800;color:#2e7d32;margin-top:1px">${money(neto)}</div>
      </div>
    </div>
    <div style="display:flex;gap:26px;margin-top:14px">
      <div style="flex:1;min-width:0">${colHead('Ingreso')}
        <table style="width:100%;border-collapse:collapse">${fila(escHtml(r.concepto||_RE_TIPOS[r.tipo]||'Prestación'),l.monto)}${totalFila('Total ingreso',Number(l.monto)||0)}</table></div>
      <div style="flex:1;min-width:0">${colHead('Descuentos')}
        <table style="width:100%;border-collapse:collapse">${fila('ISR',l.isr)}${fila('Otros',l.otrosDesc)}${totalFila('Total descuentos',(Number(l.isr)||0)+(Number(l.otrosDesc)||0),'#b03535')}</table></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:22px">
      <div>${chip}</div>
      <div style="flex:1;max-width:230px;text-align:center"><div style="border-top:1px solid #555;padding-top:5px;font-size:10px;color:#555">Recibí conforme</div></div>
    </div>`;
  _abrirPDF(_pdfShell({titulo:'RECIBO DE PAGO',subtitulo:escHtml(r.concepto||_RE_TIPOS[r.tipo]||''),sinEmitido:true,orientacion:'portrait',margen:'6mm 12mm',sinPie:true,compacto:true,body}));
}
window.boletaEspecialPDF=boletaEspecialPDF;
