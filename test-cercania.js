// ============================================================
//  SEFE · test-cercania.js — ORDEN DE RUTA POR CERCANÍA
// ============================================================
//  Cómo se corre:   node test-cercania.js
//
//  Vecino más cercano (línea recta) como respaldo cuando Google no está.
//  Desde la bodega, numera de la más cercana a la más lejana. Sin pin → al final.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _horaLimMinDoc(d)');
const fin = src.indexOf('// Paradas manuales pendientes de un piloto.');
const clientes = [
  { id: 1, lat: 0.30, lng: 0 },   // lejos
  { id: 2, lat: 0.10, lng: 0 },   // cerca
  { id: 3, lat: 0.20, lng: 0 },   // medio
  { id: 9, lat: null, lng: null } // sin pin
];
const docs = [
  { id: 101, clienteId: 1, estadoEntrega: 'asignado' },
  { id: 102, clienteId: 2, estadoEntrega: 'asignado' },
  { id: 103, clienteId: 3, estadoEntrega: 'asignado' },
  { id: 104, clienteId: 9, estadoEntrega: 'asignado' },
];
// Sin _cargarGoogleMaps → cae al método de línea recta (respaldo).
const ctx = { SEFE_BODEGA: { lat: 0, lng: 0 }, SEFE_REPARTO: { salida: '08:30', minPorEntrega: 20 },
  clientes, Math, Number, Infinity, isFinite, Promise, Array,
  estadoEntrega: d => d.estadoEntrega || 'sin', guardarDocumento: () => {}, toast: () => {} };
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) + ';globalThis.__ord=_ordenarCercaniaPura;globalThis.__dist=_distKm;', ctx);

(async () => {
  console.log('\n═══ Cercanía pura: vecino más cercano desde la bodega ═══');
  const r = await ctx.__ord(docs);
  ok('numera 3 paradas con pin (motor cercanía)', r.n === 3 && r.motor === 'cercania', JSON.stringify(r));
  const byId = id => docs.find(d => d.id === id).ordenRuta;
  ok('el más cercano (cliente 2) queda #1', byId(102) === 1, byId(102));
  ok('el del medio (cliente 3) queda #2', byId(103) === 2, byId(103));
  ok('el más lejano (cliente 1) queda #3', byId(101) === 3, byId(101));
  ok('el sin pin queda al final', byId(104) === 4, byId(104));

  console.log('\n═══ Distancia (Haversine) ═══');
  ok('distancia crece con la separación', ctx.__dist({lat:0,lng:0},{lat:0.1,lng:0}) < ctx.__dist({lat:0,lng:0},{lat:0.3,lng:0}));

  console.log('\n═══ Cableado ═══');
  ok('botón "Ordenar por cercanía" en Despachos', /onclick="ordenarCercaniaDespachos\(\)"/.test(require('fs').readFileSync(__dirname + '/index.html','utf8')));
  ok('avisa si no hay bodega configurada', /Falta la bodega/.test(src) && /const SEFE_BODEGA/.test(src));

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
