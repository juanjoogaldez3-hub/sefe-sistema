// ═══════════════════════════════════════════════════════════
//  URL del backend FEL (EcoFactura) en Render
//  ⚠️ PONÉ ACÁ TU URL DE RENDER (sin barra al final)
// ═══════════════════════════════════════════════════════════
const FEL_BACKEND_URL = 'https://sefe-backend.onrender.com';

// ============================================================
//  Funciones que se están probando
// ============================================================
//  El código de una función nueva viaja a los dos entornos, porque
//  se publica la misma rama. Lo que decide si se ve o no es la
//  bandera en config.js, que SÍ es distinto en cada uno.
//
//  Así se puede desarrollar algo grande a la vista de todos sin
//  que aparezca en producción hasta que esté probado.
function funcionActiva(nombre){
  try{ return !!(SEFE_CONFIG && SEFE_CONFIG.funciones && SEFE_CONFIG.funciones[nombre]); }
  catch(e){ return false; }
}
window.funcionActiva=funcionActiva;
// Dejar constancia en la consola de en qué entorno se está trabajando.
try{
  const _ent=(typeof SEFE_CONFIG!=='undefined'&&SEFE_CONFIG.entorno)||'(sin definir)';
  const _act=Object.entries((typeof SEFE_CONFIG!=='undefined'&&SEFE_CONFIG.funciones)||{})
    .filter(([,v])=>v).map(([k])=>k);
  console.log('SEFE · entorno: '+_ent+(_act.length?' · en prueba: '+_act.join(', '):''));
}catch(e){}

const $=s=>document.querySelector(s);
const money=n=>'Q '+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
// Formato de moneda según la cuenta (GTQ → "Q", USD → "$")
const simboloMoneda=mon=>mon==='USD'?'$':'Q';
const moneyC=(n,mon)=>simboloMoneda(mon)+' '+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
// Calcula las iniciales de un nombre: "Juan José Ogaldez" -> "JJO", "Oficina" -> "O"
// Vendedores que son CANALES (varias personas venden a través de ellos, ej. Whaticket/WhatsApp).
// Al facturar con uno de estos, se pide elegir quién vendió realmente.
const VENDEDORES_CANAL=['whaticket','whatsapp'];
// Vendedores que operan a través del canal Whaticket (lista fija, aparte del catálogo)
const SUBVENDEDORES_WHATICKET=['Luis Menocal','Christian Martinez','Rodolfo Salala','Enrique bixcul'];
function esVendedorCanal(nombre){
  return nombre && VENDEDORES_CANAL.includes(String(nombre).trim().toLowerCase());
}
function inicialesVendedor(nombre){
  if(!nombre)return '';
  return nombre.trim().split(/\s+/).map(p=>p.charAt(0).toUpperCase()).join('');
}
const padn=n=>String(n).padStart(4,'0');
// Referencia del documento según su tipo: NP- préstamo, NE- envío, serie-DTE facturas, PED- resto.
const refPed=f=>{if(!f)return '';if(f.serie&&f.numeroDte)return f.serie+'-'+f.numeroDte;return (f.tipoDoc==='prestamo'?'NP-':f.tipoDoc==='envio'?'NE-':'PED-')+padn(f.numero);};
// Normaliza un NIT quitando el guión y espacios (deja "CF" como CF).
// Así todos los NITs quedan uniformes y no hay problemas de comparación.
function normalizarNit(nit){
  if(!nit)return '';
  const limpio=String(nit).trim().replace(/[-\s]/g,'');
  return limpio.toUpperCase()==='CF'?'CF':limpio;
}
window.normalizarNit=normalizarNit;
// Fecha de HOY en hora de Guatemala (UTC-6), formato aaaa-mm-dd.
// Usamos esto en vez de new Date().toISOString() porque ese usa UTC
// y de noche podía guardar la fecha del día siguiente (o del anterior).
// Fecha (YYYY-MM-DD) de un timestamp guardado, en hora local. Se usa para comparar
// contra fechaHoyGT(): los timestamps se guardan en UTC y de noche cambian de día.
function fechaLocalDe(iso){
  if(!iso)return '';
  const d=new Date(iso);if(isNaN(d))return String(iso).slice(0,10);
  const z=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
}
function fechaHoyGT(){
  const ahora=new Date();
  const gt=new Date(ahora.getTime()-6*60*60*1000); // Guatemala es UTC-6 todo el año
  return gt.toISOString().slice(0,10);
}

// ---- Tablas: buscador rápido + orden por columna (tipo Excel) ----
// ── PAGINACIÓN PROGRESIVA (para no saturar la memoria en celulares) ──
// En vez de dibujar cientos de filas de golpe (lo que cierra navegadores
// con poca RAM como Samsung Internet), dibuja un bloque y carga más al
// hacer scroll o con un botón "Ver más".
const PAGINA_FILAS=60;// cuántas filas por bloque
let _paginadores={};// estado por tabla

function renderPaginado(tbodyId, htmlFilas, vacioMsg){
  const tbody=document.getElementById(tbodyId);if(!tbody)return;
  // htmlFilas es un ARRAY de strings (cada uno una fila <tr>)
  if(!htmlFilas.length){
    tbody.innerHTML=`<tr><td colspan="20" class="empty">${vacioMsg||'Sin datos'}</td></tr>`;
    _paginadores[tbodyId]=null;
    return;
  }
  _paginadores[tbodyId]={filas:htmlFilas,mostradas:0};
  tbody.innerHTML='';
  _pintarMasFilas(tbodyId);
}

function _pintarMasFilas(tbodyId){
  const st=_paginadores[tbodyId];if(!st)return;
  const tbody=document.getElementById(tbodyId);if(!tbody)return;
  // Quitar la fila "Ver más" anterior si existe
  const btnRow=tbody.querySelector('.fila-vermas');if(btnRow)btnRow.remove();
  const desde=st.mostradas, hasta=Math.min(desde+PAGINA_FILAS, st.filas.length);
  const frag=st.filas.slice(desde,hasta).join('');
  tbody.insertAdjacentHTML('beforeend',frag);
  st.mostradas=hasta;
  // Si quedan más, agregar botón "Ver más"
  if(st.mostradas<st.filas.length){
    const restantes=st.filas.length-st.mostradas;
    const cols=tbody.closest('table')?.querySelectorAll('thead th').length||10;
    tbody.insertAdjacentHTML('beforeend',
      `<tr class="fila-vermas"><td colspan="${cols}" style="text-align:center;padding:14px">
        <button class="btn btn-ghost btn-sm" onclick="_pintarMasFilas('${tbodyId}')">Ver más (${restantes} restantes)</button>
      </td></tr>`);
  }
}
window._pintarMasFilas=_pintarMasFilas;

// ¿Esta fila es "de estructura" (encabezado de grupo, subtotal, total o
// separador) y por lo tanto NO se debe reordenar al ordenar la tabla?
// Se usa para ordenar tablas agrupadas sin romper la jerarquía: sólo se
// reordenan las corridas de filas de datos entre dos filas de estructura.
function _esFilaEstructural(tr){
  if(!tr||tr.tagName!=='TR')return true;
  if(tr.dataset&&tr.dataset.totalsRow==='1')return true;
  if(tr.hasAttribute&&tr.hasAttribute('data-grupo-key'))return true;
  if([...tr.children].some(td=>Number(td.getAttribute('colspan')||1)>1))return true;
  const t0=(tr.cells&&tr.cells[0]?tr.cells[0].textContent:'').trim();
  if(/^(sub)?total(es)?\b/i.test(t0))return true;
  if(!tr.textContent.trim())return true; // separador vacío
  return false;
}
function enhanceTable(tbodyId,opts){
  const _doSort=!opts||opts.sort!==false;
  const _noSearch=!!(opts&&opts.noSearch);
  const tbody=document.getElementById(tbodyId);if(!tbody)return;
  const table=tbody.closest('table');if(!table)return;
  if(!table.dataset.enhanced){
    table.dataset.enhanced='1';
    if(!_noSearch){
      const wrap=document.createElement('div');
      wrap.className='tbl-toolbar';
      wrap.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input class="tbl-search" placeholder="Buscar en la tabla…"><span class="tbl-count"></span>';
      table.parentNode.insertBefore(wrap,table);
      wrap.querySelector('.tbl-search').oninput=()=>applyTableFilter(table);
    }
    if(_doSort)Array.from(table.querySelectorAll('thead th')).forEach((th,idx)=>{
      const txt=th.textContent.trim();if(!txt)return;
      th.classList.add('sortable');th.dataset.dir='0';
      th.innerHTML=txt+' <span class="sort-arrow">⇕</span>';
      th.onclick=()=>{
        const dir=th.dataset.dir==='1'?-1:1;
        Array.from(table.querySelectorAll('thead th')).forEach(x=>{x.dataset.dir='0';x.classList.remove('sort-active');const a=x.querySelector('.sort-arrow');if(a)a.textContent='⇕';});
        th.dataset.dir=String(dir);th.classList.add('sort-active');
        th.querySelector('.sort-arrow').textContent=dir===1?'▲':'▼';
        const tb=table.querySelector('tbody');
        const tbId=tb?tb.id:null;
        const stP=tbId?_paginadores[tbId]:null;
        // Comparador que extrae el texto de la celta [idx] de un <tr> en string
        const valDe=(htmlTr)=>{
          const tmp=document.createElement('tbody');tmp.innerHTML=htmlTr;
          const cell=tmp.querySelector('tr')?.cells[idx];
          return cell?cell.textContent.trim():'';
        };
        const cmpFn=(av,bv)=>{
          // Fechas: DD-MM-YYYY (o ISO YYYY-MM-DD) → comparar cronológicamente (no como número suelto)
          const _fd=s=>{const t=String(s).trim();let m=t.match(/(\d{2})-(\d{2})-(\d{4})/);if(m)return +(m[3]+m[2]+m[1]);m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return +(m[1]+m[2]+m[3]);return null;};
          const da=_fd(av),db=_fd(bv);
          if(da!==null&&db!==null)return (da-db)*dir;
          // Números (moneda, cantidades): solo si la celda es esencialmente numérica
          const _esNum=s=>/[0-9]/.test(s)&&/^[\sQ$.,()%\-0-9]+$/.test(String(s).trim());
          if(_esNum(av)&&_esNum(bv)){const an=parseFloat(av.replace(/[^0-9.\-]/g,'')),bn=parseFloat(bv.replace(/[^0-9.\-]/g,''));if(!isNaN(an)&&!isNaN(bn))return (an-bn)*dir;}
          // Texto con orden natural ("Ruta 2" antes que "Ruta 10")
          return av.localeCompare(bv,'es',{numeric:true,sensitivity:'base'})*dir;
        };
        if(stP){
          // Tabla paginada: ordenar el ARRAY completo y volver a renderizar
          stP.filas.sort((a,b)=>cmpFn(valDe(a),valDe(b)));
          stP.mostradas=0;tb.innerHTML='';_pintarMasFilas(tbId);
        }else{
          // Tabla normal: ordenar el DOM, pero SÓLO las corridas de filas de
          // datos, dejando fijas las de estructura (encabezados de grupo,
          // subtotales, totales y separadores). Así funciona igual en tablas
          // planas y en las agrupadas, sin romper la jerarquía.
          const cmpRow=(a,b)=>{const ca=a.cells[idx],cb=b.cells[idx];if(!ca||!cb)return 0;return cmpFn(ca.textContent.trim(),cb.textContent.trim());};
          const rows=Array.from(tb.children).filter(n=>n.tagName==='TR');
          let p=0;
          while(p<rows.length){
            if(_esFilaEstructural(rows[p])){p++;continue;}
            let q=p;while(q<rows.length&&!_esFilaEstructural(rows[q]))q++;
            const corrida=rows.slice(p,q).sort(cmpRow);
            const antes=rows[q]||null;
            corrida.forEach(r=>tb.insertBefore(r,antes));
            p=q;
          }
        }
        if(opts&&typeof opts.onSort==='function')opts.onSort(idx,dir);
      };
    });
  }
  if(!_noSearch)applyTableFilter(table);
}
function applyTableFilter(table){
  const wrap=table.previousElementSibling;if(!wrap||!wrap.classList.contains('tbl-toolbar'))return;
  const q=(wrap.querySelector('.tbl-search').value||'').toLowerCase().trim();
  const tbody=table.querySelector('tbody');
  const tbodyId=tbody?tbody.id:null;
  const st=tbodyId?_paginadores[tbodyId]:null;
  // Si la tabla está paginada y hay una búsqueda, mostrar TODAS las coincidencias
  // (no solo las filas del bloque visible). Si se borra la búsqueda, volver a paginar.
  if(st){
    const btnRow=tbody.querySelector('.fila-vermas');if(btnRow)btnRow.remove();
    if(q){
      // Renderizar todas las filas que coincidan
      const coinciden=st.filas.filter(f=>f.toLowerCase().includes(q));
      tbody.innerHTML=coinciden.length?coinciden.join(''):`<tr><td colspan="20" class="empty">Sin coincidencias</td></tr>`;
      wrap.querySelector('.tbl-count').textContent=`${coinciden.length} de ${st.filas.length}`;
      return;
    }else{
      // Sin búsqueda: volver a la vista paginada
      st.mostradas=0;tbody.innerHTML='';_pintarMasFilas(tbodyId);
      wrap.querySelector('.tbl-count').textContent='';
      return;
    }
  }
  // Tabla no paginada: filtrado normal sobre el DOM
  let visible=0;
  Array.from(tbody.querySelectorAll('tr')).forEach(r=>{
    const show=!q||r.textContent.toLowerCase().includes(q);
    r.style.display=show?'':'none';if(show)visible++;
  });
  const total=tbody.querySelectorAll('tr').length;
  wrap.querySelector('.tbl-count').textContent=q?`${visible} de ${total}`:'';
}

const SEFE_LOGO='data:image/png;base64,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';
// ============================================================
//  MARCA (branding por cliente)
// ============================================================
// Toda la identidad del sistema —nombre, logo, monograma, NIT y
// colores— sale de acá. Por defecto es SEFE. Un cliente nuevo sólo
// agrega su bloque `marca` en config.js y pisa lo que quiera; lo que
// no ponga lo hereda de SEFE. Así una instalación se ve a medida sin
// tocar el código.
const _MARCA_DEFAULT = {
  nombre:        'SEFE',                        // nombre corto (barra lateral, título, ícono)
  tagline:       'PEDIDOS & FACTURACIÓN',       // bajada bajo el nombre en la barra
  tituloPestana: 'Pedidos y Facturación',       // lo que va tras el nombre en la pestaña
  nombreLargo:   'Soluciones Efectivas',        // pantalla de carga
  monograma:     'SE',                          // el cuadrito de 2 letras
  logo:          (typeof SEFE_LOGO!=='undefined')?SEFE_LOGO:'', // imagen (data URL) de los documentos
  // ── Datos que aparecen en los documentos (facturas, notas, órdenes, Excel) ──
  razonSocial:   'Soluciones Efectivas, S.A.',  // razón social en notas de préstamo/envío
  membrete:      'SEFE, S.A.',                   // membrete de Excel y pie de PDF
  nombreDoc:     'Soluciones Efectivas GT',      // encabezado de órdenes de compra y de Excel de inventario
  nit:           '10777860-2',
  ciudadPais:    'Guatemala, C.A.',              // "· Guatemala, C.A." bajo el logo
  ciudadDoc:     'Guatemala, Guatemala',         // ciudad en el encabezado de facturas
  prefijoArchivo:'SEFE',                         // prefijo de los archivos Excel descargados
  // ── Colores de la marca (se aplican a la interfaz) ──
  colorPrimario: '#173916',                      // verde principal
  colorPrimario700:'#234d20', colorPrimario600:'#2c5e28', // tonos derivados (opcionales)
  colorAcento:   '#A8C038',                      // lima de acento
  colorAcentoOsc:'#7f9a26'                        // lima oscuro (opcional)
};
const SEFE_MARCA = Object.assign({}, _MARCA_DEFAULT,
  (typeof SEFE_CONFIG!=='undefined' && SEFE_CONFIG.marca) || {});
window.SEFE_MARCA = SEFE_MARCA;

// Mezcla un color hex hacia otro (blanco o negro) en proporción t (0..1).
// Sirve para derivar los tonos claros/oscuros cuando el cliente sólo da
// el color base y no los tonos.
function _mezclarColor(hex, hacia, t){
  try{
    hex=String(hex).replace('#','');
    if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
    const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
    const w=hacia==='blanco'?255:0;
    const m=v=>Math.round(v+(w-v)*t).toString(16).padStart(2,'0');
    return '#'+m(r)+m(g)+m(b);
  }catch(e){ return hex; }
}

// Aplica la marca a la interfaz: pestaña, barra lateral, pantalla de
// carga, login, ícono y colores. Se llama una sola vez al arrancar.
// Para SEFE (sin bloque `marca`) todo queda idéntico a como estaba.
function aplicarMarca(){
  const m=SEFE_MARCA;
  try{
    // Pestaña del navegador y nombre de la app instalada (PWA)
    if(m.nombre)document.title=m.nombre+(m.tituloPestana?' · '+m.tituloPestana:'');
    const metaApp=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(metaApp&&m.nombre)metaApp.setAttribute('content',m.nombre);
    // Color de la barra del navegador (móvil / PWA)
    const metaTheme=document.querySelector('meta[name="theme-color"]');
    if(metaTheme&&m.colorPrimario)metaTheme.setAttribute('content',m.colorPrimario);

    // Barra lateral: monograma, nombre y bajada
    const brand=document.querySelector('.brand');
    if(brand){
      const mk=brand.querySelector('.mk'); if(mk&&m.monograma)mk.textContent=m.monograma;
      const h2=brand.querySelector('h2'); if(h2&&m.nombre)h2.textContent=m.nombre;
      const sp=brand.querySelector('span'); if(sp&&m.tagline)sp.textContent=m.tagline;
    }

    // Pantalla de carga: nombre largo y colores
    const loader=document.getElementById('sefe-loader');
    if(loader&&m.colorPrimario){
      loader.style.background='linear-gradient(135deg,'+m.colorPrimario+','+_mezclarColor(m.colorPrimario,'negro',.35)+')';
    }
    const loaderNom=loader&&loader.querySelector('div[style*="font-weight:600"]');
    if(loaderNom&&m.nombreLargo)loaderNom.textContent=m.nombreLargo;
    const loaderBar=document.getElementById('sefe-loader-bar');
    if(loaderBar&&m.colorAcento)loaderBar.style.background='linear-gradient(90deg,transparent,'+m.colorAcento+')';

    // Logo del login
    const loginImg=document.querySelector('.login-brand img');
    if(loginImg&&m.logo)loginImg.src=m.logo;

    // Colores del sistema (variables CSS). Para SEFE son los mismos de
    // siempre; un cliente con colores propios repinta toda la interfaz.
    const root=document.documentElement && document.documentElement.style;
    if(root&&m.colorPrimario){
      root.setProperty('--green',     m.colorPrimario);
      root.setProperty('--green-700', m.colorPrimario700||_mezclarColor(m.colorPrimario,'blanco',.09));
      root.setProperty('--green-600', m.colorPrimario600||_mezclarColor(m.colorPrimario,'blanco',.17));
    }
    if(root&&m.colorAcento){
      root.setProperty('--lime',    m.colorAcento);
      root.setProperty('--lime-dk', m.colorAcentoOsc||_mezclarColor(m.colorAcento,'negro',.24));
    }
  }catch(e){ console.error('aplicarMarca:',e); }
}
window.aplicarMarca=aplicarMarca;
try{ aplicarMarca(); }catch(e){}

let clientes=[
  {id:3,nit:'CF',nombre:'Consumidor Final',razonSocial:'Consumidor Final',direccion:'Ciudad',email:'',tiempoCredito:0,vendedorId:null,sedesDe:null,
   contactoPagos:{nombre:'',telefono:'',correo:''},contactoCompras:{nombre:'',telefono:'',correo:''},precios:{}},
];
let productos=[];
let vendedores=[];
let pilotos=[];
let pilN=3;
let vendN=1;
// Cobros en ruta — ciclo: depositado(piloto) → recibido(logística) → procesado(contabilidad)
// {id, docId, monto, modo:'efectivo'|'cheque', noBoleta, noRecibo, cheque, banco, piloto, fecha,
//  estado:'depositado'|'recibido'|'procesado', recibidoPor, recibidoFecha, procesadoPor, procesadoFecha}
let cobrosRuta=[];
let cobroRutaN=1;

// ---- Usuarios y roles ----
const ROLES={
  admin:{label:'Administrador',views:'ALL',anular:true,facturar:true,crearCliente:true,editarInventario:true,registrarAbono:true,readonly:false,compraEspecial:true},
  gerencia:{label:'Gerencia',views:['panel','pedido','documentos','cobros','clientes','inventario','reportes','compras','nuevacompra','proveedores','despachos'],anular:false,facturar:true,crearCliente:true,editarInventario:true,registrarAbono:false,readonly:false,compraEspecial:true,asignarPiloto:true},
  ventas:{label:'Ventas',views:['panel','pedido','documentos','clientes','inventario'],anular:false,facturar:false,crearCliente:false,editarInventario:false,registrarAbono:false,readonly:false,compraEspecial:false},
  bodega:{label:'Bodega',views:['panel','inventario','compras','nuevacompra','porpagar','proveedores'],anular:false,facturar:true,crearCliente:false,editarInventario:true,registrarAbono:false,readonly:false,compraEspecial:false},
  contabilidad:{label:'Contabilidad',views:['panel','documentos','cobros','compras','reportes','despachos'],anular:true,facturar:true,crearCliente:false,editarInventario:false,registrarAbono:true,readonly:false,compraEspecial:false},
  auditoria:{label:'Auditoría',views:'ALL',anular:false,facturar:false,crearCliente:false,editarInventario:false,registrarAbono:false,readonly:true,compraEspecial:false},
  facturador:{label:'Facturador / Logística',views:['panel','pedido','documentos','clientes','despachos'],anular:false,facturar:true,crearCliente:false,editarInventario:false,registrarAbono:false,readonly:false,compraEspecial:false,asignarPiloto:true},
  piloto:{label:'Piloto / Despachador',views:['panel','misentregas'],anular:false,facturar:false,crearCliente:false,editarInventario:false,registrarAbono:false,readonly:false,compraEspecial:false,asignarPiloto:false},
};
// M7: 'cobros' es un rol legacy idéntico a 'contabilidad'. Se mantiene como ALIAS del mismo
// objeto para que cualquier usuario existente con rol='cobros' siga funcionando y para que
// ambos nunca puedan divergir. Migrar usuarios a 'contabilidad' con el SQL y luego se puede quitar.
ROLES.cobros=ROLES.contabilidad;
// Los usuarios SIEMPRE vienen de la base (tabla 'usuarios').
//
// Antes acá había 10 usuarios de ejemplo de la época del prototipo
// (Sofía Castillo, Ana Ramírez, José Coc…). Si la carga de Supabase
// fallaba o llegaba tarde, el sistema mostraba esos nombres inventados
// como si fueran el personal real — y la red de seguridad del arranque
// no lo detectaba, porque preguntaba "¿la lista está vacía?" y con los
// ejemplos adentro nunca lo estaba.
//
// Vacío es lo correcto: si no hay datos, que no se vea nada, en lugar
// de mostrar gente que no existe.
let usuarios=[];
let usrN=11;
let currentUser='Juanjo',currentRole='admin';
function iniciales(n){return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');}
function canAnular(){return (currentRole==="admin"||ROLES[currentRole]?.anular===true)&&!soloLectura();}
function canFacturar(){return (currentRole==="admin"||ROLES[currentRole]?.facturar===true)&&!soloLectura();}
function canEditInventario(){return (currentRole==="admin"||ROLES[currentRole]?.editarInventario===true)&&!soloLectura();}
function canRegistrarAbono(){return (currentRole==="admin"||ROLES[currentRole]?.registrarAbono===true)&&!soloLectura();}
function canCrearCliente(){return (currentRole==="admin"||ROLES[currentRole]?.crearCliente===true)&&!soloLectura();}
function canCompraEspecial(){return (currentRole==="admin"||ROLES[currentRole]?.compraEspecial===true)&&!soloLectura();}
function soloLectura(){return ROLES[currentRole]?.readonly===true;}
function esVentas(){return currentRole==='ventas';}
function miVendedorId(){
  const u=usuarios.find(x=>x.nombre===currentUser);
  return u?.vendedorId||null;
}
function miPilotoId(){
  const u=usuarios.find(x=>x.nombre===currentUser);
  return u?.pilotoId||null;
}
function esPiloto(){return currentRole==='piloto';}
function canAsignarPiloto(){return (currentRole==='admin'||ROLES[currentRole]?.asignarPiloto===true)&&!soloLectura();}
function canConvertir(){return (currentRole==='admin'||ROLES[currentRole]?.convertirCajas===true)&&!soloLectura();}
let proveedores=[];
let compras=[];
let categorias=[]; // categorías de inventario con su umbral de stock bajo: {nombre, umbralStock}
let recordatorios=[]; // módulo de recordatorios/tareas: {id,titulo,nota,tipo,refId,refLabel,fechaVencimiento,asignadoA,creadoPor,prioridad,hecho,...}
let cotizaciones=[]; // módulo de cotizaciones: {id,numero,clienteId,items,totales,estado,validezDias,fechaVence,...}
let cotN=1; // correlativo de cotizaciones
let documentos=[];
let talonarios=[];
let recibosAnulados=[];
let cuentasBanco=[];
let movimientosBanco=[];
let creditosCliente=[]; // saldo a favor de clientes (sobrepagos / anticipos)
let conciliaciones=[]; // conciliaciones bancarias guardadas (historial)
let cart=[],corr=4,cliN=4,prodN=6;

// ===== Borrador automático del pedido (se guarda en el navegador) =====
const BORRADOR_KEY='sefe_borrador_pedido';
function guardarBorrador(){
  try{
    // No guardar borrador si estamos editando un pedido existente
    if(editId)return;
    if(!cart.length){localStorage.removeItem(BORRADOR_KEY);return;}
    const cliSel=$('#f-cli')?.value||'';
    const cliSearch=$('#f-cli-search')?.value||'';
    const oc=$('#f-oc')?.value||'';
    const obs=$('#f-obs')?.value||'';
    const nota=$('#f-nota')?.value||'';
    const subvend=$('#f-subvend')?.value||'';
    localStorage.setItem(BORRADOR_KEY,JSON.stringify({cart,cliSel,cliSearch,oc,obs,nota,subvend,ts:Date.now()}));
  }catch(e){/* si el navegador no permite, no pasa nada */}
}
function recuperarBorrador(){
  try{
    const raw=localStorage.getItem(BORRADOR_KEY);
    if(!raw)return false;
    const b=JSON.parse(raw);
    if(!b.cart||!b.cart.length)return false;
    cart=b.cart;
    initForm();
    if(b.cliSel&&$('#f-cli')){$('#f-cli').value=b.cliSel;}
    if(b.cliSearch&&$('#f-cli-search')){$('#f-cli-search').value=b.cliSearch;}
    if(b.oc&&$('#f-oc'))$('#f-oc').value=b.oc;
    if(b.obs&&$('#f-obs'))$('#f-obs').value=b.obs;
    if(b.nota&&$('#f-nota'))$('#f-nota').value=b.nota;
    const cli=clientes.find(c=>String(c.id)===String(b.cliSel));
    if(cli)actualizarVendedorInfo(cli);
    if(b.subvend&&$('#f-subvend'))$('#f-subvend').value=b.subvend;
    render();
    toast('📝 Borrador recuperado','Tenías un pedido sin guardar');
    return true;
  }catch(e){return false;}
}
function limpiarBorrador(){try{localStorage.removeItem(BORRADOR_KEY);}catch(e){}}
window.limpiarBorrador=limpiarBorrador;
// (Datos de ejemplo eliminados — sistema en producción)
let compN=11,provN=4;
let editId=null,editOldMap={};

const TIPO_LBL={pedido:['Pedido','p-ped'],cambiaria:['Factura Cambiaria','p-cam'],envio:['Nota de envío','p-env'],prestamo:['Nota de préstamo','p-pre'],notaCredito:['Nota de Crédito','p-ncr']};
const TIPO_TIT={pedido:'PEDIDO',cambiaria:'FACTURA CAMBIARIA',envio:'NOTA DE ENVÍO',prestamo:'NOTA DE PRÉSTAMO',notaCredito:'NOTA DE CRÉDITO'};
const FISCAL={cambiaria:1};

// Módulos desactivados temporalmente (no pulidos para producción). Reactivar = quitar de esta lista.
const MODULOS_DESACTIVADOS=['despachos','misentregas'];

// ============================================================
//  MÓDULOS (paquete base + opcionales por cliente)
// ============================================================
// El sistema BASE está siempre encendido: pedidos, facturación,
// clientes, inventario, reportes y administración (usuarios/auditoría).
// Los módulos OPCIONALES se activan por cliente desde `modulos` en
// config.js. Si un cliente no trae bloque `modulos`, o no menciona un
// módulo, ese módulo queda ENCENDIDO — así SEFE y lo ya instalado no
// cambian en nada. Un módulo sólo se apaga con `false` explícito.
//
// Cada vista pertenece a un módulo; las que no figuran acá son base.
const MODULO_DE_VISTA = {
  cotizaciones:'cotizaciones',
  cobros:'cobros', recordatorios:'cobros',
  compras:'compras', nuevacompra:'compras', porpagar:'compras', proveedores:'compras',
  bancos:'bancos', talonarios:'bancos'
};
// Módulos opcionales que hoy se pueden vender/activar.
const MODULOS_OPCIONALES = ['cotizaciones','cobros','compras','bancos'];
function moduloActivo(mod){
  if(!mod) return true;                 // base: siempre encendido
  try{
    const m = (typeof SEFE_CONFIG!=='undefined') && SEFE_CONFIG.modulos;
    if(!m) return true;                 // sin bloque `modulos` → todo encendido
    return m[mod] !== false;            // sólo se apaga con false explícito
  }catch(e){ return true; }
}
// ¿La vista está disponible para este cliente? (según su módulo)
function vistaDisponible(v){ return moduloActivo(MODULO_DE_VISTA[v]); }
window.moduloActivo=moduloActivo; window.vistaDisponible=vistaDisponible;

function tienePermiso(v){
  if(MODULOS_DESACTIVADOS.includes(v))return false;
  if(!vistaDisponible(v))return false;   // módulo apagado para este cliente
  const r=ROLES[currentRole];if(!r)return true;
  return r.views==='ALL'||r.views.includes(v);
}
function go(v,desdeHash){
  // Vista de un módulo apagado (o inexistente): al panel, sin ruido.
  if(v!=='panel' && !vistaDisponible(v)){ v='panel'; desdeHash=false; }
  if(!tienePermiso(v)){toast('No tenés permiso para esta sección','Tu rol es '+(ROLES[currentRole]?.label||currentRole),true);return;}
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.querySelectorAll('.view').forEach(s=>s.classList.remove('active'));
  const _sec=$('#v-'+v); if(!_sec)return; _sec.classList.add('active');
  const t={panel:['Dashboard','Resumen de operación'],pedido:['Nuevo pedido','Generá el pedido; después lo facturás o convertís'],cotizaciones:['Cotizaciones','Cotizaciones a clientes — se pueden convertir en pedido'],documentos:['Documentos','Pedidos, notas y facturas'],cobros:['Cobros','Cuentas por cobrar de las facturas a crédito'],clientes:['Clientes','Catálogo de clientes'],recordatorios:['Recordatorios','Tareas, seguimientos y notas — tuyas y asignadas'],inventario:['Inventario','Existencias de productos'],reportes:['Reportes','Análisis de ventas'],compras:['Compras','Registro de compras a proveedores'],nuevacompra:['Nueva compra','Registrá la entrada de mercadería'],porpagar:['Por pagar','Cuentas por pagar a proveedores'],bancos:['Bancos','Control de cuentas, entradas y salidas de dinero'],talonarios:['Talonarios','Control de talonarios de recibos y su cuadre'],proveedores:['Proveedores','Catálogo de proveedores'],usuarios:['Usuarios','Usuarios y roles del sistema'],auditoria:['Auditoría','Registro de todas las acciones del sistema'],despachos:['Despachos','Asignación de entregas y rutas'],misentregas:['Mis entregas','Documentos asignados para entregar']};
  if(t[v]){$('#ttl').textContent=t[v][0];$('#sub').textContent=t[v][1];}
  if(v==='panel')renderPanel();if(v==='cotizaciones')renderCotizaciones();if(v==='documentos')renderDocs();if(v==='cobros')renderCobros();if(v==='clientes')renderCli();if(v==='recordatorios')renderRecordatorios();if(v==='inventario')renderProd();if(v==='reportes')renderReportes();if(v==='compras')renderCompras();if(v==='nuevacompra')renderCompraForm();if(v==='porpagar')renderPorPagar();if(v==='bancos')renderBancos();if(v==='proveedores')renderProveedores();if(v==='talonarios')renderTalonarios();if(v==='usuarios')renderUsuarios();if(v==='auditoria')renderAuditoria();if(v==='despachos')renderDespachos();if(v==='misentregas')renderMisEntregas();
  // Actualizar la dirección (hash) para que el botón atrás y el recargar funcionen.
  // Si el cambio vino del propio hash, no lo reescribimos para evitar bucles.
  if(!desdeHash && ('#'+v)!==location.hash){ try{ location.hash=v; }catch(e){} }
  // Fijar resumen + filtros + buscador + encabezados (tras renderizar el contenido)
  requestAnimationFrame(()=>setTimeout(aplicarStickyTop,60));
}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
window.go=go;

// ===== Fijar resumen (KPIs) + filtros + buscador + encabezados al hacer scroll =====
function aplicarStickyTop(){
  const view=document.querySelector('.view.active');
  if(!view)return;
  const esMovil=window.innerWidth<=600;
  const topbarH=esMovil?56:64;
  // Limpiar cualquier sticky previo de esta vista
  view.querySelectorAll('.sticky-top').forEach(el=>{el.classList.remove('sticky-top');el.style.top='';});
  view.querySelectorAll('thead th').forEach(th=>{th.style.position='';th.style.top='';th.style.zIndex='';});
  // 1) Resumen (KPIs) — hijo directo de la vista
  let baseOffset=topbarH;
  const kpis=view.querySelector(':scope > .kpis');
  if(kpis){
    kpis.classList.add('sticky-top');
    kpis.style.top=baseOffset+'px';
    baseOffset+=Math.round(kpis.getBoundingClientRect().height);
  }
  // 2) Por cada panel: solo si tiene barra(s) de filtros/buscador, fijamos toolbar(s) + su encabezado
  view.querySelectorAll(':scope > .panel').forEach(panel=>{
    const toolbars=panel.querySelectorAll(':scope > .tbl-toolbar');
    if(!toolbars.length)return; // panel sin filtros (ej. "A quién llamar hoy"): no fijamos su encabezado
    let off=baseOffset;
    toolbars.forEach(tb=>{
      tb.classList.add('sticky-top');
      tb.style.top=off+'px';
      off+=Math.round(tb.getBoundingClientRect().height);
    });
    panel.querySelectorAll('table thead th').forEach(th=>{
      th.style.position='sticky';
      th.style.top=off+'px';
      th.style.zIndex='11';
    });
  });
}
window.aplicarStickyTop=aplicarStickyTop;
// Recalcular al cambiar tamaño/orientación
window.addEventListener('resize',()=>{clearTimeout(window._stkT);window._stkT=setTimeout(aplicarStickyTop,150);});

// ---- Login / sesión ----
function renderUserGrid(){
  const grid=$('#user-grid');
  if(!grid)return; // Ya no usamos lista de usuarios (login con contraseña)
  grid.innerHTML=usuarios.filter(u=>u.activo).map(u=>`<button class="user-card" onclick="doLogin(${u.id})">
    <div class="av">${iniciales(u.nombre)}</div>
    <div><div class="nm">${u.nombre}</div><div class="rl">${ROLES[u.rol]?.label||u.rol}</div></div>
  </button>`).join('');
}
function doLogin(id){
  // Login sin contraseña DESACTIVADO por seguridad.
  // La única forma de entrar es con correo y contraseña (doLoginAuth).
  return;
}
window.doLogin=doLogin;

// Login real con Supabase Auth (correo + contraseña)
async function doLoginAuth(){
  const email=($('#login-email').value||'').trim().toLowerCase();
  const pass=$('#login-pass').value||'';
  const errBox=$('#login-error');
  const btn=$('#login-btn');
  errBox.textContent='';
  if(!email||!pass){errBox.textContent='Escribí tu correo y contraseña';return;}
  // Verificar que tengamos conexión a Supabase Auth
  if(typeof sb==='undefined'||!sb.auth){errBox.textContent='No hay conexión con el servidor. Revisá la conexión.';return;}
  btn.disabled=true;btn.textContent='Ingresando...';
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){
      errBox.textContent='Correo o contraseña incorrectos';
      btn.disabled=false;btn.textContent='Ingresar';
      return;
    }
    // Login correcto: buscar el rol del usuario en la tabla usuarios.
    //
    // OJO — hay que preguntárselo a la base AHORA, ya autenticados.
    // El array `usuarios` se llenó en arrancarApp(), que corre ANTES
    // del login: con RLS activo esa carga anónima viene vacía y el
    // login fallaría siempre con "usuario no habilitado".
    // Se busca igual que el backend: primero por auth_id, luego por correo.
    let u=await buscarMiUsuario(data.user, email);
    if(!u){
      errBox.textContent='Tu usuario no está habilitado en el sistema';
      await sb.auth.signOut();
      btn.disabled=false;btn.textContent='Ingresar';
      return;
    }
    currentUser=u.nombre;currentRole=u.rol;
    $('#login-pass').value='';
    // Mostrar pantalla de carga mientras preparamos los datos frescos
    mostrarLoader();
    $('#login-screen').style.display='none';
    // Recargar datos frescos desde la base antes de entrar, para que el
    // sistema no aparezca vacío. Reintenta si hace falta.
    if(typeof cargarTodo==='function'){
      for(let intento=0; intento<3; intento++){
        try{
          const ok=await cargarTodo();
          if(ok){
            cliN=(clientes.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
            prodN=(productos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
            corr=(documentos.reduce((m,d)=>Math.max(m,d.numero||0),0)||0)+1;cotN=(cotizaciones.reduce((m,c)=>Math.max(m,c.numero||0),0)||0)+1;
            compN=(compras.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
            usrN=(usuarios.reduce((m,u)=>Math.max(m,u.id),0)||0)+1;
            pilN=(pilotos.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
            vendN=(vendedores.reduce((m,v)=>Math.max(m,v.id),0)||0)+1;
            cobroRutaN=(cobrosRuta.reduce((m,c)=>Math.max(m,c.id),0)||0)+1;
            provN=(proveedores.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
            initForm();initCompra();
            break;
          }
        }catch(e3){ /* reintentar */ }
        await new Promise(r=>setTimeout(r,500));
      }
    }
    $('#app-layout').style.display='flex';
    aplicarPermisosUI();
    entrarVistaInicial();
    // Sincronización en vivo: a partir de acá los cambios de los demás
    // llegan solos, sin necesidad de recargar la página.
    if(typeof iniciarRealtime==='function')iniciarRealtime();
    setTimeout(recuperarBorrador,300);
    _recDismissed=false;setTimeout(()=>{try{mostrarRecordatoriosHoy();}catch(e){console.error(e);}},700);
    setTimeout(()=>{try{actualizarBellRec();mostrarRecordatoriosPopup();}catch(e){console.error(e);}},1100);
    ocultarLoader();
    btn.disabled=false;btn.textContent='Ingresar';
  }catch(e){
    errBox.textContent='Error al ingresar: '+e.message;
    btn.disabled=false;btn.textContent='Ingresar';
  }
}
window.doLoginAuth=doLoginAuth;

// ============================================================
//  ¿Quién soy? — se consulta a la base YA autenticado
// ============================================================
//  Necesario para que el sistema funcione con RLS activo. La carga
//  general (cargarTodo) ocurre antes de iniciar sesión, así que la
//  lista de usuarios que hay en memoria en ese momento puede venir
//  vacía. Acá se pregunta directo, con la sesión ya abierta.
//
//  Busca igual que el backend (server.js): primero por auth_id, y
//  si no aparece, por correo.
//
//  Si la consulta falla por lo que sea, cae de vuelta a la lista en
//  memoria — que es como funcionaba antes. Así este cambio se puede
//  subir con o sin RLS, sin romper nada.
async function buscarMiUsuario(authUser, email){
  const correo=(email||(authUser&&authUser.email)||'').toLowerCase();
  try{
    if(typeof sb!=='undefined'&&sb.from){
      if(authUser&&authUser.id){
        const q1=await sb.from('usuarios').select('*').eq('auth_id',authUser.id).limit(1);
        if(q1.data&&q1.data[0]){
          const u=mapUsuarioFromDB(q1.data[0]);
          return u.activo===false?null:u;
        }
      }
      if(correo){
        const q2=await sb.from('usuarios').select('*').ilike('correo',correo).limit(1);
        if(q2.data&&q2.data[0]){
          const u=mapUsuarioFromDB(q2.data[0]);
          return u.activo===false?null:u;
        }
      }
    }
  }catch(e){ console.warn('No se pudo consultar el usuario, usando la lista en memoria',e); }
  // Respaldo: como funcionaba antes de RLS
  return usuarios.find(x=>(x.correo||'').toLowerCase()===correo && x.activo)||null;
}
window.buscarMiUsuario=buscarMiUsuario;

async function logoutAuth(){
  // Cortar la sincronización en vivo ANTES de cerrar sesión, para no
  // dejar el websocket abierto ni seguir recibiendo datos sin usuario.
  if(typeof detenerRealtime==='function')detenerRealtime();
  try{ if(typeof sb!=='undefined'&&sb.auth)await sb.auth.signOut(); }catch(e){}
  currentUser=null;currentRole=null;
  const _b=document.getElementById('bell-rec');if(_b)_b.style.display='none';
  const _o=document.getElementById('ov-rec');if(_o)_o.classList.remove('show');
  $('#app-layout').style.display='none';$('#login-screen').style.display='flex';
  const e=$('#login-email'),p=$('#login-pass');if(e)e.value='';if(p)p.value='';
}
window.logoutAuth=logoutAuth;
function logout(){
  logoutAuth();
}
window.logout=logout;

// ===== Recuperación de contraseña (Supabase Auth) =====
// _modoRecovery: true si la app se abrió desde el enlace del correo de recuperación.
let _modoRecovery = /type=recovery/.test((typeof location!=='undefined'&&location.hash)||'');
// 1) Pedir el correo de recuperación desde el login
async function pedirResetPass(){
  const email=(($('#login-email')||{}).value||'').trim().toLowerCase();
  const info=$('#login-info'), err=$('#login-error');
  if(err)err.textContent='';
  const set=(c,t)=>{ if(info){info.style.color=c;info.textContent=t;} };
  if(!email){ set('#c0392b','Escribí tu correo arriba y volvé a tocar el enlace.'); return; }
  if(typeof sb==='undefined'||!sb.auth){ set('#c0392b','Sin conexión con el servidor.'); return; }
  try{
    await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    set('#2e7d32','Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisá tu bandeja (y la carpeta de spam).');
  }catch(e){ set('#c0392b','No se pudo enviar el correo: '+(e&&e.message||e)); }
}
window.pedirResetPass=pedirResetPass;
// 2) Mostrar el formulario de nueva contraseña (al volver del enlace)
function mostrarResetPass(){
  _modoRecovery=true;
  try{ ocultarLoader(); }catch(e){}
  const l=$('#login-screen'); if(l)l.style.display='none';
  const a=$('#app-layout'); if(a)a.style.display='none';
  const r=$('#reset-screen'); if(r)r.style.display='flex';
}
window.mostrarResetPass=mostrarResetPass;
// 3) Guardar la nueva contraseña
