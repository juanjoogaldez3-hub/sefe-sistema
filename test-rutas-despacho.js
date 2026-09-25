// ============================================================
//  SEFE · test-rutas-despacho.js — MÓDULO DE RUTAS (despachos)
// ============================================================
//  Cómo se corre:   node test-rutas-despacho.js
//
//  Tres cosas nuevas sobre el módulo de despachos que ya existía:
//   1) Navegar la ruta en Google Maps (paradas ordenadas por nº de ruta).
//   2) Asignación masiva (marcar varias entregas y asignarlas de una).
//   3) Mapa de la ruta para el piloto (colapsable).
// ============================================================
const vm = require('vm');
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ 1 · Navegación en Google Maps ═══');
ok('existen los ayudantes de ruta (parada + abrir)', /function _rutaParadaDe\(d\)/.test(src) && /function abrirRutaMaps\(docs\)/.test(src) && /google\.com\/maps\/dir\//.test(src));
ok('botón "Navegar ruta del piloto" en Despachos', /onclick="abrirRutaDespachos\(\)"/.test(html) && /function abrirRutaDespachos\(/.test(src));
ok('botón "Navegar mi ruta" para el piloto', /onclick="abrirRutaMisEntregas\(\)"/.test(src) && /function abrirRutaMisEntregas\(/.test(src));
ok('sale desde la ubicación actual (origen vacío) y deja 22 paradas', /slice\(0,22\)/.test(src.slice(src.indexOf('function abrirRutaMaps'))) && /\['',\.\.\.stops\]/.test(src));

// Funcional: la parada usa el pin, si no la dirección, y ordena por nº de ruta.
(() => {
  const ini = src.indexOf('function _rutaParadaDe(d)');
  const fin = src.indexOf('window.abrirRutaMaps=abrirRutaMaps;');
  let captured = null;
  const ctx = { Number, String, Math, encodeURIComponent,
    clientes: [
      { id: 1, lat: 14.6, lng: -90.5 },
      { id: 2, lat: null, lng: null, direccion: '5a avenida' },
      { id: 3, direccion: 'ciudad' } // sin pin y dir genérica → se salta
    ],
    toast: () => {}, window: { open: u => { captured = u; } } };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__abrir=abrirRutaMaps;', ctx);
  ctx.__abrir([{ clienteId: 2, ordenRuta: 2 }, { clienteId: 1, ordenRuta: 1 }, { clienteId: 3, ordenRuta: 3 }]);
  ok('abre la ruta desde la ubicación actual (origen vacío), ordenada por nº de ruta', captured === 'https://www.google.com/maps/dir//14.6%2C-90.5/5a%20avenida%2C%20Guatemala', captured);
  // Ninguna con ubicación → no abre nada
  captured = null;
  ctx.__abrir([{ clienteId: 3, ordenRuta: 1 }]);
  ok('si ninguna tiene ubicación, no abre Maps', captured === null);
})();

console.log('\n═══ 2 · Asignación masiva ═══');
ok('casillas de selección + "seleccionar todo"', /class="desp-chk"/.test(src) && /id="desp-selall"/.test(html) && /window\.despSelAll=/.test(src));
ok('botón "Asignar seleccionadas" y su contador', /id="desp-bulk-btn"/.test(html) && /function _despActualizarBulk\(/.test(src) && /Asignar '\+n\+' seleccionada/.test(src));
ok('asignarMasivo asigna al piloto y ordena la ruta por cercanía', /function asignarMasivo\(/.test(src) && /docs\.forEach\(d=>\{d\.pilotoId=pid;/.test(src) && /_ordenarPorCercania\(rutaPiloto\)/.test(src) && /Entregas asignadas \(masivo\)/.test(src));
ok('limpia la selección de entregas ya entregadas', /const _asignables=new Set\(todos\.filter\(d=>estadoEntrega\(d\)!=='entregado'\)/.test(src));

console.log('\n═══ 3 · Mapa para el piloto ═══');
ok('contenedor del mapa en Mis entregas', /id="pil-mapa-wrap"/.test(html));
ok('render + toggle del mapa del piloto', /function _pilRenderMapa\(mias\)/.test(src) && /function _pilToggleMapa\(/.test(src) && /id="pil-mapa"/.test(src));
ok('pinta paradas numeradas por ruta y la línea (Google + OSM)', /function _pilInitMapa\(docs\)/.test(src) && /new gm\.Polyline\(/.test(src) && /L\.polyline\(/.test(src) && /label:p\.n!=null/.test(src));
ok('solo muestra el mapa si hay entregas con ubicación', /c\.lat!=null&&c\.lng!=null&&estadoEntrega\(d\)!=='entregado'/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
