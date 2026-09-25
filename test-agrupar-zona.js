// ============================================================
//  SEFE · test-agrupar-zona.js — ARMAR RUTAS POR ZONA
//  (agrupar entregas sin asignar por cercanía, repartidas parejo)
// ============================================================
//  Cómo se corre:   node test-agrupar-zona.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// _distKm + _agruparPorZona (se extraen por separado y se pegan, porque en el
// archivo están lejos y en el medio hay funciones con `window.` que no corren en Node).
const distIni = src.indexOf('function _distKm(a,b)');
const distFin = src.indexOf('// Hora "HH:MM"', distIni);
const agIni = src.indexOf('function _agruparPorZona(docs,k)');
const agFin = src.indexOf('let _gruposZona=[];');
const codigo = src.slice(distIni, distFin) + '\n' + src.slice(agIni, agFin);
const clientes = [
  // Grupo A (cerca del 0,0)
  { id: 1, lat: 0.00, lng: 0.00 }, { id: 2, lat: 0.01, lng: 0.00 }, { id: 3, lat: 0.00, lng: 0.01 },
  // Grupo B (lejos, cerca del 1,1)
  { id: 4, lat: 1.00, lng: 1.00 }, { id: 5, lat: 1.01, lng: 1.00 }, { id: 6, lat: 1.00, lng: 1.01 },
  // Sin ubicación
  { id: 9, lat: null, lng: null },
];
const ctx = { clientes, Math, Number, Array, Infinity, isFinite };
vm.createContext(ctx);
vm.runInContext(codigo + ';globalThis.__f=_agruparPorZona;', ctx);

console.log('\n═══ Agrupa por zona (2 zonas claras) ═══');
(() => {
  const docs = [1, 2, 3, 4, 5, 6].map(id => ({ id: 100 + id, clienteId: id }));
  const { grupos, sinUbic } = ctx.__f(docs, 2);
  ok('arma 2 grupos', grupos.length === 2, grupos.length);
  ok('reparte parejo (3 y 3)', grupos[0].docs.length === 3 && grupos[1].docs.length === 3,
    JSON.stringify(grupos.map(g => g.docs.length)));
  // cada grupo debe ser homogéneo: todos del mismo racimo
  const ids = g => g.docs.map(d => d.clienteId).sort((a, b) => a - b);
  const g0 = ids(grupos[0]), g1 = ids(grupos[1]);
  const esA = a => a.every(x => x <= 3), esB = a => a.every(x => x >= 4);
  ok('cada grupo es una zona homogénea', (esA(g0) && esB(g1)) || (esB(g0) && esA(g1)),
    JSON.stringify([g0, g1]));
  ok('no hay entregas sin ubicación en este caso', sinUbic.length === 0);
})();

console.log('\n═══ Geografía pura: NO fuerza parejo ═══');
(() => {
  // 3 pegadas en una esquina + 1 sola lejos. Balanceado daría 2/2; geografía pura da 3/1.
  const docs = [1, 2, 3, 4].map(id => ({ id: 200 + id, clienteId: id }));
  const { grupos } = ctx.__f(docs, 2);
  const tam = grupos.map(g => g.docs.length).sort((a, b) => b - a);
  ok('respeta la geografía aunque quede disparejo (3 y 1)', tam[0] === 3 && tam[1] === 1, JSON.stringify(tam));
})();

console.log('\n═══ Separa las que no tienen ubicación ═══');
(() => {
  const docs = [1, 2, 4, 9].map(id => ({ id: 300 + id, clienteId: id }));
  const { grupos, sinUbic } = ctx.__f(docs, 2);
  ok('la entrega sin lat/lng va a "sin ubicación"', sinUbic.length === 1 && sinUbic[0].clienteId === 9);
  ok('las ubicadas sí se agrupan', grupos.reduce((s, g) => s + g.docs.length, 0) === 3);
})();

console.log('\n═══ Casos borde ═══');
(() => {
  const docs = [1, 2, 3, 4, 5, 6].map(id => ({ id: 400 + id, clienteId: id }));
  ok('k=1 → un solo grupo con todo', ctx.__f(docs, 1).grupos.length === 1 && ctx.__f(docs, 1).grupos[0].docs.length === 6);
  ok('k mayor que las entregas no rompe', ctx.__f(docs, 20).grupos.length <= 6);
  ok('sin entregas → sin grupos', ctx.__f([], 3).grupos.length === 0);
})();

console.log('\n═══ Cableado (UI + funciones) ═══');
ok('botón "Armar rutas por zona" en Despachos', /Armar rutas por zona/.test(html) && /openAgruparRutas\(\)/.test(html));
ok('modal pregunta cuántas rutas y reagrupa', /id="agr-n"/.test(src) && /onclick="_agruparPreview\(\)"/.test(src));
ok('asigna un grupo completo a un piloto', /function asignarGrupoZona\(idx\)/.test(src) && /d\.pilotoId=pid;if\(estadoEntrega\(d\)==='sin'\)d\.estadoEntrega='asignado'/.test(src));
ok('al asignar ordena la ruta por cercanía', /_ordenarCercaniaPura\(rutaPil,_paradasPiloto\(pid\)\)/.test(src));
ok('agrupa por geografía (k-means al centroide más cercano)', /cent\.forEach\(\(c,ci\)=>\{const d=_distKm\(p,c\);if\(d<bd\)/.test(src) && /sum\[g\]\.lat\+=p\.lat/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
