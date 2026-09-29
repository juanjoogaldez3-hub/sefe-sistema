// ============================================================
//  SEFE · test-seguimiento-venta.js — REGISTRAR SEGUIMIENTO DE VENTA
//  (anotar qué dijo el cliente, como en cobros, en el historial)
// ============================================================
//  Cómo se corre:   node test-seguimiento-venta.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Resultados de venta + helper ═══');
ok('existe RESULT_SEG_VENTA con opciones de venta', /const RESULT_SEG_VENTA=\{comprara:/.test(src));
ok('helper _resultSeg elige venta o cobro según el tipo', /function _resultSeg\(s\)\{return \(\(\(s&&s\.tipo\)==='venta'\)\?RESULT_SEG_VENTA:RESULT_SEG\)/.test(src));
(() => {
  const i = src.indexOf('const RESULT_SEG={');
  const j = src.indexOf('window._resultSeg=');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(i, j) + ';globalThis.__f=_resultSeg;', ctx);
  const f = ctx.__f;
  ok('venta → usa RESULT_SEG_VENTA', f({ tipo: 'venta', resultado: 'comprara' })[0] === 'Va a comprar', JSON.stringify(f({ tipo: 'venta', resultado: 'comprara' })));
  ok('cobro (sin tipo) → usa RESULT_SEG', f({ resultado: 'pago' })[0] === 'Pagó', JSON.stringify(f({ resultado: 'pago' })));
  ok('resultado desconocido → guion', f({ tipo: 'venta', resultado: 'xx' })[0] === '—');
})();

console.log('\n═══ Registrar seguimiento de venta ═══');
ok('openSegVenta existe y en window', /function openSegVenta\(cliId, ?recId\)/.test(src) && /window\.openSegVenta=/.test(src));
ok('guarda en el historial del cliente con tipo venta', /c\.seguimientos\.push\(\{id:nid,tipo:'venta',fecha:fechaHoyGT\(\),resultado,nota,usuario:currentUser/.test(src));
ok('marca la tarea de origen como hecha', /if\(rec\)\{rec\.hecho=true;rec\.hechoPor=currentUser/.test(src));
ok('agenda el próximo contacto como nueva tarea "Seguimiento: X"', /if\(prox\)\{[\s\S]*?titulo:'Seguimiento: '\+c\.nombre[\s\S]*?fechaVencimiento:prox/.test(src));
ok('pide resultado, nota y próximo contacto', /id="sv-result"/.test(src) && /id="sv-nota"/.test(src) && /id="sv-prox"/.test(src) && /¿Qué te dijo el cliente\?/.test(src));

console.log('\n═══ Botones "📝 Registrar" ═══');
ok('en el popup para tareas de cliente', /r\.tipo==='cliente'&&r\.refId\?`<div style="margin-top:6px"><button[^>]*onclick="openSegVenta\(\$\{r\.refId\},\$\{r\.id\}\)"/.test(src));
ok('en la lista del módulo para tareas de cliente', /r\.tipo==='cliente'&&r\.refId\?`<button[^>]*onclick="openSegVenta\(\$\{r\.refId\},\$\{r\.id\}\)"[^>]*>📝 Registrar/.test(src));

console.log('\n═══ Historial del cliente (cobros + ventas) ═══');
ok('la ficha usa _resultSeg y etiqueta Venta/Cobro', /const r=\(typeof _resultSeg==='function'\)\?_resultSeg\(s\)/.test(src) && /s\.tipo==='venta'\?'<span class="badge b-info"[^>]*>Venta/.test(src));
ok('el panel se llama "Seguimiento del cliente"', /<h3>Seguimiento del cliente<\/h3>/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
