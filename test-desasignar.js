// ============================================================
//  SEFE · test-desasignar.js — DESASIGNAR ENTREGAS (fila + masivo)
// ============================================================
//  Cómo se corre:   node test-desasignar.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Desasignar una entrega (fila) ═══');
(() => {
  const ini = src.indexOf('function desasignarDespacho(id)');
  const fin = src.indexOf('window.desasignarDespacho=');
  const d = { id: 1, serie: 'A', numeroDte: '1', pilotoId: 5, estadoEntrega: 'ruta', ordenRuta: 3, etaEntrega: '09:00' };
  const ctx = { documentos: [d], canAsignarPiloto: () => true, guardarDocumento: () => {},
    logAudit: () => {}, toast: () => {}, renderDespachos: () => {}, padn: n => String(n) };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=desasignarDespacho;', ctx);
  ctx.__f(1);
  ok('quita piloto, estado a "sin", limpia ruta y ETA',
    d.pilotoId === null && d.estadoEntrega === 'sin' && d.ordenRuta === null && d.etaEntrega === null);
})();

console.log('\n═══ Desasignar masivo ═══');
(() => {
  const ini = src.indexOf('function desasignarMasivo()');
  const fin = src.indexOf('window.desasignarMasivo=');
  const docs = [
    { id: 1, pilotoId: 5, estadoEntrega: 'asignado', ordenRuta: 1, etaEntrega: '09:00' },
    { id: 2, pilotoId: null, estadoEntrega: 'sin' }, // no asignada
  ];
  const _sel = new Set([1, 2]);
  const ctx = { documentos: docs, _despSel: _sel, canAsignarPiloto: () => true, guardarDocumento: () => {},
    logAudit: () => {}, toast: () => {}, renderDespachos: () => {},
    confirmar: (t, m, b, fn) => fn(), Array };
  vm.createContext(ctx);
  vm.runInContext('var _despSel=globalThis.__sel;' + src.slice(ini, fin) + ';globalThis.__f=desasignarMasivo;', Object.assign(ctx, { __sel: _sel }));
  ctx.__f();
  ok('desasigna solo la que tenía piloto', docs[0].pilotoId === null && docs[0].estadoEntrega === 'sin');
  ok('limpia la selección', _sel.size === 0);
})();

console.log('\n═══ Cableado ═══');
ok('botón masivo "Quitar asignación"', /id="desp-bulk-desasig"/.test(html) && /onclick="desasignarMasivo\(\)"/.test(html));
ok('botón por fila "✕ Desasignar"', /onclick="desasignarDespacho\(\$\{d\.id\}\)"/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
