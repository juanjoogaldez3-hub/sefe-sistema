// ============================================================
//  SEFE · test-rutamapa.js — RUTA DEL DÍA + MAPA CON DATOS
// ============================================================
//  Cómo se corre:   node test-rutamapa.js
//
//  Con las ubicaciones ya cargadas, dos usos nuevos:
//   1) "Mapa con datos": el mapa de clientes se puede colorear por saldo,
//      última compra o ventas (con leyenda y datos en el globo).
//   2) "Ruta del día": ordena los clientes por cercanía (vecino más
//      cercano), los muestra numerados en un mapa y abre la ruta en
//      Google Maps. Puede arrancar desde la ubicación GPS del vendedor.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Mapa con datos (colorear) ═══');
ok('el mapa tiene selector "Ver por" (saldo/última/ventas)', /id="mt-color"/.test(src) && /value="saldo"/.test(src) && /value="ultima"/.test(src) && /value="ventas"/.test(src));
ok('hay leyenda de colores', /id="mt-leyenda"/.test(src) && /function _mapaLeyenda\(/.test(src));
ok('pinta pines de color según el modo (Google + OSM)', /function _mapaColor\(c,modo\)/.test(src) && /gm\.SymbolPath\.CIRCLE/.test(src) && /L\.circleMarker\(/.test(src));
ok('el globo muestra el dato del modo (_mapaInfoHTML)', /function _mapaInfoHTML\(c,modo\)/.test(src) && /Debe /.test(src) && /Última compra: hace/.test(src));
ok('métricas por cliente: días sin comprar, ventas, pedidos abiertos', /function _cliDiasSinComprar\(/.test(src) && /function _cliVentasTotal\(/.test(src) && /function _cliPedidosAbiertos\(/.test(src));
ok('saldo con deuda = rojo, al día = gris', /return s>0\.5\?'#c62828':'#9e9e9e'/.test(src));

console.log('\n═══ Ruta del día ═══');
ok('hay botón "Ruta del día" en la lista de clientes', /onclick="openRutaDia\(\)"/.test(src) && /Ruta del día/.test(src));
ok('existe el asistente de ruta (openRutaDia)', /function openRutaDia\(/.test(src) && /window\.openRutaDia=openRutaDia/.test(src));
ok('filtra por vendedor, ruta e incluir (saldo/pedido)', /id="rd-vend"/.test(src) && /id="rd-ruta"/.test(src) && /id="rd-filtro"/.test(src) && /function _rutaClientesFiltrados\(/.test(src));
ok('ordena por cercanía (vecino más cercano)', /function _ordenarPorCercania\(/.test(src) && /function _distKm\(/.test(src));
ok('puede salir desde la ubicación GPS', /function _rutaGPS\(/.test(src) && /navigator\.geolocation\.getCurrentPosition/.test(src) && /window\._rutaGPS=/.test(src));
ok('muestra la lista numerada y el mapa con línea', /function _rutaPintarLista\(/.test(src) && /function _rutaPintarMapa\(/.test(src) && /Polyline|polyline/.test(src));
ok('abre la ruta en Google Maps (dir con paradas)', /function _rutaAbrir\(/.test(src) && /google\.com\/maps\/dir\//.test(src) && /window\.open\(url,'_blank'\)/.test(src));
ok('limita a 23 paradas (tope de Google Maps)', /slice\(0,23\)/.test(src));
ok('para ventas hace bien el filtro por defecto del vendedor', /esVentas\(\)&&v\.id===miVendedorId\(\)/.test(src));

// Funcional: distancia y orden por cercanía
(() => {
  const vm = require('vm');
  const i = src.indexOf('function _distKm(');
  const j = src.indexOf('function openRutaDia(');
  const ctx = { Math, Infinity }; vm.createContext(ctx);
  vm.runInContext(src.slice(i, j) + ';globalThis.__d=_distKm;globalThis.__o=_ordenarPorCercania;', ctx);
  const d = ctx.__d, orden = ctx.__o;
  // Guatemala ~ 1 grado lat ≈ 111 km
  const dd = d({ lat: 14.0, lng: -90.0 }, { lat: 15.0, lng: -90.0 });
  ok('_distKm ≈ 111 km por grado de latitud', Math.abs(dd - 111) < 3, 'dio ' + dd.toFixed(1));
  // Orden por cercanía desde un punto de partida
  const cli = [
    { id: 1, nombre: 'lejos', lat: 14.9, lng: -90 },
    { id: 2, nombre: 'cerca', lat: 14.1, lng: -90 },
    { id: 3, nombre: 'medio', lat: 14.5, lng: -90 },
  ];
  const res = orden(cli, { lat: 14.0, lng: -90.0 });
  ok('_ordenarPorCercania arranca por el más cercano al inicio', res[0].nombre === 'cerca' && res[1].nombre === 'medio' && res[2].nombre === 'lejos');
  // Sin punto de partida: arranca por el primero de la lista
  const res2 = orden(cli, null);
  ok('_ordenarPorCercania sin inicio arranca por el primero de la lista', res2[0].nombre === 'lejos');
  ok('_ordenarPorCercania no pierde ni duplica clientes', res.length === 3 && new Set(res.map(c => c.id)).size === 3);
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
