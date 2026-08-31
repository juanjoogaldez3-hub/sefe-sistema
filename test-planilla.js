// ============================================================
//  SEFE · test-planilla.js — MÓDULO PLANILLA (parte 1: empleados)
// ============================================================
//  Cómo se corre:   node test-planilla.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Verifica el CABLEADO del módulo nuevo: que la sección esté registrada
//  (botón del menú, sección, despacho en go(), título), que las funciones
//  existan, que la capa de datos cargue/guarde empleados, y que exista la
//  migración. Es el mismo tipo de chequeo que evitó el "no me sale" del
//  reporte y de la conciliación.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Registro de la sección Planilla ═══');
ok('index.html tiene el botón del menú (data-view="planilla")', /data-view="planilla"/.test(html));
ok('index.html tiene la sección v-planilla', /id="v-planilla"/.test(html));
ok('index.html tiene la tabla de empleados (#t-empleados)', /id="t-empleados"/.test(html));
ok('index.html carga js/app-12.js', /js\/app-12\.js/.test(html));
ok('go() despacha la vista planilla', /v==='planilla'.*renderPlanilla/.test(src));
ok('el título de la vista planilla está registrado', /planilla:\['Planilla'/.test(src));

console.log('\n═══ Funciones del módulo ═══');
ok('existe renderPlanilla (y en window)', /function renderPlanilla\(/.test(src) && /window\.renderPlanilla\s*=/.test(src));
ok('existe openEmpleado (y en window)', /function openEmpleado\(/.test(src) && /window\.openEmpleado\s*=/.test(src));

console.log('\n═══ Capa de datos (db.js) ═══');
ok('db.js mapea empleados (mapEmpleadoFromDB)', /function mapEmpleadoFromDB\(/.test(dbjs));
ok('db.js guarda empleados (guardarEmpleado)', /async function guardarEmpleado\(/.test(dbjs));
ok('db.js carga empleados en el arranque (rEmpleados)', /rEmpleados/.test(dbjs) && /from\('empleados'\)/.test(dbjs));
ok('la carga tolera tabla ausente (rEmpleados&&rEmpleados.data)', /\(rEmpleados&&rEmpleados\.data\)/.test(dbjs));

console.log('\n═══ Planilla mensual (parte 2) ═══');
ok('index.html tiene la tabla de planillas (#t-planillas)', /id="t-planillas"/.test(html));
ok('index.html tiene el botón Nueva planilla', /onclick="nuevaPlanilla\(\)"/.test(html));
ok('la planilla es MENSUAL (_rangoMes / mes)', /function _rangoMes\(/.test(src) && /function _mesesRecientes\(/.test(src));
ok('existe nuevaPlanilla (y en window)', /function nuevaPlanilla\(/.test(src) && /window\.nuevaPlanilla\s*=/.test(src));
ok('existe verPlanilla (y en window)', /function verPlanilla\(/.test(src) && /window\.verPlanilla\s*=/.test(src));
ok('calcula comisiones desde ventas (_comisionEmpleado)', /function _comisionEmpleado\(/.test(src));
ok('la comisión usa la misma regla que el reporte (5% sin IVA)', /PL_COMISION_PCT\s*=\s*0\.05/.test(src) && /PL_IVA\s*=\s*1\.12/.test(src));
ok('IGSS laboral automático (4.83%)', /IGSS_LABORAL_PCT\s*=\s*0\.0483/.test(src));
ok('el sueldo se paga en 2 quincenas (_montoQ1 / _montoQ2)', /function _montoQ1\(/.test(src) && /function _montoQ2\(/.test(src));
ok('el pago por parte genera movimiento de banco de planilla (_planPagarParte)', /function _planPagarParte\(/.test(src) && /_planRegistrarPago/.test(src) && /categoria:'planilla'/.test(src));
ok('el pago NO abre la póliza sola: al pagar se muestra la boleta de ese pago', /boletaPagoPDF\(pl,l,parte\);/.test(src) && !/registrarMovimientoBanco/.test(src.slice(src.indexOf('async function _planPagarParte'), src.indexOf('async function _planPagarParte')+1800)));
ok('las comisiones se pagan aparte (parte "com" con su póliza)', /comPagado/.test(src) && /comPoliza/.test(src));
ok('existe la boleta de pago (boletaPagoPDF, en window)', /function boletaPagoPDF\(/.test(src) && /window\.boletaPagoPDF\s*=/.test(src));
ok('la boleta usa el marco de la póliza (_pdfShell) y es media carta (compacto)', /_pdfShell\(\{titulo:'BOLETA DE PAGO'[^}]*compacto:true/.test(src));
ok('la boleta es POR PAGO (recibe la parte: quincena o comisiones)', /function boletaPagoPDF\(pl,l,parte\)/.test(src) && /function boletaPlanillaUI\(i,parte\)/.test(src));
ok('la boleta tiene el diseño de 2 columnas (Ingresos / Descuentos) y líquido a recibir', /colHead\('Ingresos'\)/.test(src) && /colHead\('Descuentos'\)/.test(src) && /Líquido a recibir/.test(src));
ok('la boleta muestra el chip con la póliza de cheque', /Ref\. Póliza de cheque/.test(src) && /_polRef\(/.test(src));
ok('la boleta de comisiones muestra Comisiones (ventas)', /Comisiones \(ventas\)/.test(src));
ok('la boleta NO trae acumulado del año', !/acumulado/i.test(src.slice(src.indexOf('function boletaPagoPDF'), src.indexOf('function boletaPagoPDF')+4000)));
ok('se puede eliminar una planilla (eliminarPlanilla + borrarPlanilla)', /function eliminarPlanilla\(/.test(src) && /window\.eliminarPlanilla\s*=/.test(src) && /async function borrarPlanilla\(/.test(dbjs));
ok('se puede desbloquear una fila pagada para corregir (_planDesbloquear)', /function _planDesbloquear\(/.test(src) && /window\._planDesbloquear\s*=/.test(src) && /_planEdit\.has\(i\)/.test(src));
ok('se puede anular UN pago individual (_planAnularParte, revierte el movimiento)', /function _planAnularParte\(/.test(src) && /window\._planAnularParte\s*=/.test(src) && /mov\.anulado=true/.test(src.slice(src.indexOf('function _planAnularParte'), src.indexOf('function _planAnularParte')+1400)));
ok('al eliminar se anulan los movimientos de banco (devuelve el saldo)', /m\.anulado=true/.test(src.slice(src.indexOf('function eliminarPlanilla'), src.indexOf('function eliminarPlanilla')+1600)));
ok('index.html tiene el botón Eliminar en la lista de planillas', /onclick="eliminarPlanilla\(/.test(src));
ok('db.js mapea planillas (mapPlanillaFromDB)', /function mapPlanillaFromDB\(/.test(dbjs));
ok('db.js guarda planillas (guardarPlanilla)', /async function guardarPlanilla\(/.test(dbjs));
ok('db.js carga planillas en el arranque (rPlanillas)', /rPlanillas/.test(dbjs) && /from\('planillas'\)/.test(dbjs));
ok('la carga tolera tabla planillas ausente', /\(rPlanillas&&rPlanillas\.data\)/.test(dbjs));

console.log('\n═══ Recibos especiales (prestaciones) ═══');
ok('index.html tiene la tabla de recibos especiales (#t-recesp)', /id="t-recesp"/.test(html));
ok('index.html tiene el botón Nuevo recibo especial', /onclick="nuevoReciboEspecial\(\)"/.test(html));
ok('renderPlanilla también pinta los recibos especiales', /renderRecibosEspeciales/.test(src));
ok('existen nuevoReciboEspecial / verReciboEspecial (en window)', /function nuevoReciboEspecial\(/.test(src) && /window\.verReciboEspecial\s*=/.test(src));
ok('los tipos incluyen aguinaldo, bono 14 e indemnización', /aguinaldo:'Aguinaldo'/.test(src) && /bono14:'Bono 14'/.test(src) && /indemnizacion:'Indemnización'/.test(src));
ok('sugiere el monto según el tiempo trabajado (_prestacionSugerida)', /function _prestacionSugerida\(/.test(src));
ok('el pago genera salida de banco (origen recibo_especial) y boleta', /origen:'recibo_especial'/.test(src) && /function boletaEspecialPDF\(/.test(src));
ok('se puede anular un pago y eliminar el recibo', /function _reAnular\(/.test(src) && /function eliminarReciboEspecial\(/.test(src));
ok('db.js maneja recibos especiales (map/guardar)', /function mapReciboEspecialFromDB\(/.test(dbjs) && /async function guardarReciboEspecial\(/.test(dbjs));
ok('db.js carga recibos especiales (rRecEsp / recibos_especiales)', /rRecEsp/.test(dbjs) && /from\('recibos_especiales'\)/.test(dbjs));

// Verificación REAL del monto sugerido
(() => {
  const vm = require('vm');
  const i = src.indexOf('function _prestacionSugerida(');
  const j = src.indexOf('\n}', i);
  const fn = src.slice(i, j + 2);
  const ctx = { Date, Number, String, Math };
  vm.createContext(ctx);
  vm.runInContext(fn + '\n;globalThis.__p=_prestacionSugerida;', ctx);
  const p = ctx.__p;
  const emp = { sueldoBase: 4000, fechaIngreso: '2020-01-01' }; // >1 año
  ok('aguinaldo con +1 año = sueldo completo (4000)', p('aguinaldo', emp, '2026-12-01') === 4000, p('aguinaldo', emp, '2026-12-01'));
  const nuevo = { sueldoBase: 4000, fechaIngreso: '2026-06-01' }; // ~medio año a dic
  const ag = p('aguinaldo', nuevo, '2026-12-01');
  ok('aguinaldo proporcional para ingreso reciente (< sueldo)', ag > 0 && ag < 4000, ag);
  ok('otro no sugiere monto (0)', p('otro', emp, '2026-12-01') === 0);
})();

console.log('\n═══ Migraciones ═══');
const migs = fs.readdirSync(__dirname + '/supabase/migrations');
ok('existe la migración de la tabla empleados', migs.some(n => /empleados/.test(n)));
ok('existe la migración de la tabla planillas', migs.some(n => /planillas/.test(n)));
const migPlan = migs.filter(n => /planillas/.test(n)).map(n => fs.readFileSync(__dirname + '/supabase/migrations/' + n, 'utf8')).join('\n');
ok('la migración de planillas trae RLS (enable row level security)', /enable row level security/.test(migPlan) && /sefe_leer/.test(migPlan));

console.log('\n═══ Solo admin ═══');
// No se agrega a MODULOS_PERMISOS: así ningún rol distinto de admin (views='ALL')
// puede tenerla. Confirmamos que NO aparece como permiso otorgable.
ok('la planilla NO es un permiso otorgable a otros roles (solo admin ALL)', !/key:'rep_planilla'|key:'planilla'/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
