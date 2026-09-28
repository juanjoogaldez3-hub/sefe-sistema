// ============================================================
//  SEFE · test-pedido-duplicado.js — DOBLE CLIC EN "INGRESAR PEDIDO"
// ============================================================
//  Verifica que el botón de ingresar pedido no pueda dispararse dos veces
//  (traba anti doble-clic + botón deshabilitado durante el guardado), que
//  era lo que generaba pedidos duplicados con números consecutivos.
//  Cómo se corre:   node test-pedido-duplicado.js
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Aislar el handler del botón #f-go
const ini = src.indexOf("$('#f-go').onclick=async()=>{");
const fin = src.indexOf('\n};', ini);
const h = src.slice(ini, fin);

console.log('\n═══ Traba anti doble-clic en "Ingresar pedido" ═══');
ok('existe la bandera _guardandoPedido', /let _guardandoPedido=false;/.test(src));
ok('el handler sale temprano si ya se está guardando', /if\(_guardandoPedido\)return;/.test(h));
ok('marca _guardandoPedido=true antes de crear el pedido', /_guardandoPedido=true;/.test(h));
ok('deshabilita el botón #f-go durante el guardado', /getElementById\('f-go'\); if\(_btnGo\)_btnGo\.disabled=true;/.test(h));
ok('libera la traba y reactiva el botón en finally', /\}finally\{ _guardandoPedido=false; if\(_btnGo\)_btnGo\.disabled=false; \}/.test(h));

console.log('\n═══ Orden correcto (la traba va antes de mutar) ═══');
const idxGuard = h.indexOf('_guardandoPedido=true;');
const idxPush = h.indexOf('documentos.push(doc)');
const idxCorr = h.indexOf('corr++');
ok('la traba se activa antes de push del documento', idxGuard > -1 && idxPush > -1 && idxGuard < idxPush, idxGuard + '/' + idxPush);
ok('la traba se activa antes de incrementar el correlativo (corr++)', idxGuard > -1 && idxCorr > -1 && idxGuard < idxCorr, idxGuard + '/' + idxCorr);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
