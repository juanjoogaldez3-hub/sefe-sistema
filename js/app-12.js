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

// Render de la sección Planilla — por ahora, la lista de empleados.
function renderPlanilla(){
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
window.renderPlanilla=renderPlanilla;

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
