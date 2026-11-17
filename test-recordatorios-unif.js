// ============================================================
//  SEFE · test-recordatorios-unif.js — RECORDATORIOS UNIFICADOS
//  (una sola campana/popup con tareas + cobros; pestaña "Cobros")
// ============================================================
//  Cómo se corre:   node test-recordatorios-unif.js
// ============================================================
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Una sola campana / popup ═══');
ok('queda el popup único #recmod y su campana #bell-recmod', /id="recmod"/.test(html) && /id="bell-recmod"/.test(html));
ok('se eliminó la campana vieja #bell-rec', !/id="bell-rec"/.test(html));
ok('se eliminó el popup viejo #ov-rec / #rec-body', !/id="ov-rec"/.test(html) && !/id="rec-body"/.test(html));
// La campana tiene UNA posición fija en el HTML y ningún JS la mueve. Ya no
// está en bottom:22px: ese lugar es del botón del Asistente (#ia-fab, 52px de
// alto), así que la campana va encima de él, sin taparse.
{
  const px = (id) => { const m = new RegExp('id="' + id + '"[^>]*position:fixed;bottom:(\\d+)px;right:(\\d+)px').exec(html); return m ? { b: +m[1], r: +m[2] } : null; };
  const bell = px('bell-recmod'), ia = px('ia-fab');
  ok('la campana quedó en una sola posición fija (position:fixed + bottom en el HTML)', !!bell, 'no se encontró su posición');
  ok('ningún JS le cambia la posición a la campana', !/bell-recmod[^\n]*style\.(bottom|top)\s*=/.test(src));
  ok('la campana no se tapa con el botón del Asistente (#ia-fab)', bell && (!ia || bell.r !== ia.r || bell.b >= ia.b + 52), JSON.stringify({ bell, ia }));
}

console.log('\n═══ La campana junta tareas + cobros ═══');
ok('actualizarBellRec suma tareas y cobros del día', /recordatoriosPendientesHoy\(\)\.length\+\(\(typeof puedeVerRecordatorios==='function'&&puedeVerRecordatorios\(\)\)\?recordatoriosDeHoy\(\)\.length:0\)/.test(src));
ok('el popup lista cobros y tareas juntos', /const cobros=\(typeof puedeVerRecordatorios[^\n]*recordatoriosDeHoy\(\):\[\]/.test(src) && /body\.innerHTML=fCobros\+fTareas/.test(src));
ok('hay tarjeta de cobro para el popup (_cobroCardPopup)', /function _cobroCardPopup\(cliente,seg\)/.test(src));

console.log('\n═══ Pestaña "Cobros" en el módulo ═══');
ok('la pestaña existe (oculta por defecto, data-f="cobros")', /id="rec-tab-cobros"[^>]*data-f="cobros"|data-f="cobros"[^>]*id="rec-tab-cobros"/.test(html));
ok('se muestra solo si puedeVerRecordatorios', /_tc\.style\.display=_puedeCobros\?'':'none'/.test(src) && /if\(recFiltro==='cobros'&&!_puedeCobros\)recFiltro='pendientes'/.test(src));
ok('renderRecordatorios pinta los seguimientos en la pestaña cobros', /if\(recFiltro==='cobros'\)\{/.test(src) && /_seguimientosPendientes\(\)/.test(src));
ok('helper _seguimientosPendientes junta todos los seguimientos pendientes', /function _seguimientosPendientes\(\)/.test(src) && /!s\.hecho&&s\.proximaFecha/.test(src));

console.log('\n═══ Compatibilidad (funciones viejas delegan) ═══');
ok('actualizarBellRecordatorios → actualizarBellRec', /function actualizarBellRecordatorios\(\)\{ actualizarBellRec\(\); \}/.test(src));
ok('mostrarRecordatoriosHoy → mostrarRecordatoriosPopup', /function mostrarRecordatoriosHoy\(forzar\)\{ mostrarRecordatoriosPopup\(forzar\); \}/.test(src));
ok('_refrescarRec refresca la campana/popup unificado', /function _refrescarRec\(\)\{[\s\S]*?actualizarBellRec\(\)/.test(src) && /recFiltro==='cobros'\)renderRecordatorios\(\)/.test(src));
ok('el arranque ya no dispara dos popups distintos', !/mostrarRecordatoriosHoy\(\);\}catch/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
