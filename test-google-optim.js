// ============================================================
//  SEFE · test-google-optim.js — OPTIMIZACIÓN CON MATRIZ DE TIEMPOS DE GOOGLE
// ============================================================
//  Cómo se corre:   node test-google-optim.js
//
//  Con Google disponible, el orden usa la matriz de TIEMPOS DE MANEJO reales
//  (Distance Matrix). Se simula un DistanceMatrixService con tiempos fijos.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _horaLimMinDoc(d)');
const fin = src.indexOf('// Paradas manuales pendientes de un piloto.');

// Matriz de tiempos (min) indexada por punto: 0=bodega, 1=s1, 2=s2, 3=s3.
const D = [
  [0, 30, 10, 50],
  [30, 0, 10, 10],
  [10, 10, 0, 40],
  [50, 10, 40, 0],
];
const li = o => Math.round(o.lat * 10); // lat 0→0, 0.1→1, 0.2→2, 0.3→3
const fakeGM = {
  TravelMode: { DRIVING: 'DRIVING' },
  DistanceMatrixService: function () {
    this.getDistanceMatrix = (req, cb) => {
      const rows = req.origins.map(o => ({
        elements: req.destinations.map(dd => ({ status: 'OK', duration: { value: D[li(o)][li(dd)] * 60 } }))
      }));
      cb({ rows }, 'OK');
    };
  }
};
const clientes = [
  { id: 1, lat: 0.10, lng: 0 }, // s1
  { id: 2, lat: 0.20, lng: 0 }, // s2
  { id: 3, lat: 0.30, lng: 0 }, // s3
];
const docs = [
  { id: 101, clienteId: 1, estadoEntrega: 'asignado' },
  { id: 102, clienteId: 2, estadoEntrega: 'asignado' },
  { id: 103, clienteId: 3, estadoEntrega: 'asignado' },
];
const ctx = { SEFE_BODEGA: { lat: 0, lng: 0 }, SEFE_REPARTO: { salida: '08:30', minPorEntrega: 20 },
  clientes, Math, Number, Infinity, isFinite, Promise, Array,
  estadoEntrega: d => d.estadoEntrega || 'sin', guardarDocumento: () => {}, toast: () => {},
  _cargarGoogleMaps: () => Promise.resolve(fakeGM) };
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) + ';globalThis.__ord=_ordenarPorCercania;', ctx);

(async () => {
  console.log('\n═══ Usa la matriz de tiempos de Google ═══');
  const r = await ctx.__ord(docs);
  ok('marca el motor como "google"', r.motor === 'google', JSON.stringify(r));
  const ord = id => docs.find(d => d.id === id).ordenRuta;
  // Con esos tiempos, el mejor orden es s2, s1, s3 → 102, 101, 103.
  ok('respeta la matriz de tiempos (s2, s1, s3)', ord(102) === 1 && ord(101) === 2 && ord(103) === 3,
    `102=${ord(102)} 101=${ord(101)} 103=${ord(103)}`);
  ok('calcula la ETA de cada parada', /^\d{2}:\d{2}$/.test(docs.find(d => d.id === 102).etaEntrega), docs.find(d => d.id === 102).etaEntrega);

  console.log('\n═══ Cableado del optimizador ═══');
  ok('usa Distance Matrix + heurística con horarios + 2-opt', /function _matrizTiemposGoogle\(/.test(src) && /getDistanceMatrix/.test(src) && /2-opt/.test(src) && /_tardiosRuta\(/.test(src));

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
