// ============================================================
//  SEFE · test-google-optim.js — OPTIMIZACIÓN DE RUTA CON GOOGLE
// ============================================================
//  Cómo se corre:   node test-google-optim.js
//
//  Cuando Google está disponible, el orden usa su waypoint_order (calles).
//  Se simula un DirectionsService que devuelve un orden fijo.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _horaLimMinDoc(d)');
const fin = src.indexOf('// Desde Despachos: ordena por cercan');

// Simulamos Google: DirectionsService que devuelve waypoint_order = [2,0,1]
// (o sea, invierte el orden "natural" para probar que se respeta a Google).
const fakeGM = {
  TravelMode: { DRIVING: 'DRIVING' },
  DirectionsService: function(){
    this.route = (req, cb) => cb({ routes: [{ waypoint_order: [2, 0, 1] }] }, 'OK');
  }
};
const clientes = [
  { id: 1, lat: 0.10, lng: 0 },
  { id: 2, lat: 0.20, lng: 0 },
  { id: 3, lat: 0.30, lng: 0 },
];
const docs = [
  { id: 101, clienteId: 1, estadoEntrega: 'asignado' },
  { id: 102, clienteId: 2, estadoEntrega: 'asignado' },
  { id: 103, clienteId: 3, estadoEntrega: 'asignado' },
];
const ctx = { SEFE_BODEGA: { lat: 0, lng: 0 }, clientes, Math, Number, Infinity, Promise,
  estadoEntrega: d => d.estadoEntrega || 'sin', guardarDocumento: () => {}, toast: () => {},
  _cargarGoogleMaps: () => Promise.resolve(fakeGM) };
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) + ';globalThis.__ord=_ordenarPorCercania;', ctx);

(async () => {
  console.log('\n═══ Usa el orden de Google (waypoint_order) ═══');
  const r = await ctx.__ord(docs);
  ok('marca el motor como "google"', r.motor === 'google', JSON.stringify(r));
  const ord = id => docs.find(d => d.id === id).ordenRuta;
  // waypoint_order [2,0,1] → docs[2], docs[0], docs[1] → 103,101,102
  ok('respeta el orden que devolvió Google', ord(103) === 1 && ord(101) === 2 && ord(102) === 3,
    `103=${ord(103)} 101=${ord(101)} 102=${ord(102)}`);

  console.log('\n═══ Cableado del optimizador ═══');
  ok('existe _googleOptimOrden con optimizeWaypoints', /function _googleOptimOrden\(/.test(src) && /optimizeWaypoints:true/.test(src) && /waypoint_order/.test(src));

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
