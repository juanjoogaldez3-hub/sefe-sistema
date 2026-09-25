// ============================================================
//  SEFE · test-realtime-resync.js — LA RESYNC NO BORRA EL TRABAJO
// ============================================================
//  Cómo se corre:   node test-realtime-resync.js
//
//  La resincronización (tras reconexión) recarga todo y redibuja. Si eso
//  pasa mientras alguien arma una cotización o escribe un seguimiento, le
//  borra el trabajo. Debe DIFERIRSE si hay un modal/editor abierto o foco.
// ============================================================
const rt = require('fs').readFileSync(__dirname + '/realtime.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Aislar el cuerpo de resincronizar()
const ini = rt.indexOf('async function resincronizar(');
const fin = rt.indexOf('function recalcularCorrelativos(');
const blk = rt.slice(ini, fin);

console.log('\n═══ Resync respeta el trabajo en curso ═══');
ok('resincronizar consulta motivoBloqueo antes de recargar', /const bloqueo = motivoBloqueo\(\);/.test(blk));
ok('difiere si hay modal/editor/foco (y reintenta)', /if \(bloqueo && bloqueo !== 'oculta'\)/.test(blk) && /resincronizar\('reintento'\)/.test(blk));
ok('el chequeo va ANTES de cargarTodo()', blk.indexOf('const bloqueo = motivoBloqueo()') < blk.indexOf('await cargarTodo()'));

console.log('\n═══ motivoBloqueo cubre los casos ═══');
ok('cubre modal, editor en vista y foco en campo', /\.overlay\.show, \.doc-overlay\.show/.test(rt) && /hayEditorAbierto\(\)/.test(rt) && /INPUT\|SELECT\|TEXTAREA/.test(rt));
ok('el editor de cotización está registrado', /EDITORES_EN_VISTA = \['cot-editor'\]/.test(rt));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
