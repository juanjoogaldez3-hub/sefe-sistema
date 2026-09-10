// ============================================================
//  SEFE · test-cliubicacion.js — UBICACIÓN DEL CLIENTE (pin en el mapa)
// ============================================================
//  Cómo se corre:   node test-cliubicacion.js
//
//  Cada cliente puede tener su ubicación pineada (GPS o tocando el mapa) en su
//  ficha, con botones para abrir en Google Maps / Waze. Esta prueba fija el
//  cableado: persistencia (db.js), el tab y sus funciones (app), y la migración.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Persistencia (db.js) ═══');
ok('mapClienteFromDB lee lat/lng', /lat:\(c\.lat!=null\?Number\(c\.lat\):null\)/.test(dbjs) && /lng:\(c\.lng!=null\?Number\(c\.lng\):null\)/.test(dbjs));
ok('guardarCliente escribe lat/lng', /lat:\(cli\.lat!=null\?cli\.lat:null\), lng:\(cli\.lng!=null\?cli\.lng:null\)/.test(dbjs));

console.log('\n═══ Tab y funciones (app) ═══');
ok('la ficha tiene el tab de Ubicación', /tabBtn\('ubicacion','📍 Ubicación'\)/.test(src));
ok('hay una rama para el tab ubicacion', /cliTab==='ubicacion'/.test(src));
ok('carga Leaflet bajo demanda (_cargarLeaflet)', /function _cargarLeaflet\(/.test(src) && /leaflet\.min\.js/.test(src));
ok('inicializa el mapa del cliente (_initMapaCliente)', /async function _initMapaCliente\(/.test(src) && /L\.tileLayer\('https:\/\/\{s\}\.tile\.openstreetmap\.org/.test(src));
ok('tocar el mapa o arrastrar el pin actualiza la ubicación', /map\.on\('click'/.test(src) && /marker\.on\('dragend'/.test(src));
ok('botón GPS usa la geolocalización del dispositivo', /function _cliUbicGPS\(/.test(src) && /navigator\.geolocation\.getCurrentPosition/.test(src) && /window\._cliUbicGPS=/.test(src));
ok('guardar persiste con guardarCliente y refresca', /async function _cliUbicGuardar\(/.test(src) && /guardarCliente\(c\)/.test(src) && /window\._cliUbicGuardar=/.test(src));
ok('botones para abrir en Google Maps y Waze', /google\.com\/maps\?q=\$\{c\.lat\},\$\{c\.lng\}/.test(src) && /waze\.com\/ul\?ll=\$\{c\.lat\},\$\{c\.lng\}/.test(src));
ok('hay buscador de dirección/lugar (como Google Maps)', /id="cli-ubic-q"/.test(src) && /function _cliUbicBuscar\(/.test(src) && /nominatim\.openstreetmap\.org\/search/.test(src));
ok('elegir un resultado del buscador cae el pin', /function _cliUbicElegir\(/.test(src) && /_cliMapa\.setPin\(lat,lng\)/.test(src) && /window\._cliUbicElegir=/.test(src));
ok('solo quien puede editar clientes ve los botones de captura', /const puedeEditar=canCrearCliente\(\)/.test(src));

console.log('\n═══ Google Maps + Places (con respaldo OSM) ═══');
ok('existe la llave de Google (GOOGLE_MAPS_KEY) y el cargador', /const GOOGLE_MAPS_KEY\s*=/.test(src) && /function _cargarGoogleMaps\(/.test(src) && /maps\.googleapis\.com\/maps\/api\/js/.test(src));
ok('usa Google si hay llave, y cae a OSM si falla', /if\(typeof GOOGLE_MAPS_KEY!=='undefined' && GOOGLE_MAPS_KEY && !_gmapsAuthFail\)/.test(src) && /return _initMapaClienteOSM\(c\)/.test(src));
ok('mapa de Google con pin arrastrable + clic para poner el pin', /new gm\.Map\(/.test(src) && /new gm\.Marker\(/.test(src) && /map\.addListener\('click'/.test(src));
ok('buscador de Google Places (Autocomplete) sobre el input', /new gm\.places\.Autocomplete\(inp/.test(src) && /place_changed/.test(src));
ok('si la llave/dominio falla, cae a OSM solo (gm_authFailure)', /window\.gm_authFailure=function\(\)/.test(src) && /_gmapsAuthFail=true/.test(src));
ok('la interfaz del mapa es uniforme (setPin + center) para GPS y buscador', /_cliMapa=\{setPin,center:/.test(src) && /_cliMapa\.center\(latitude,longitude,17\)/.test(src));

console.log('\n═══ Migración ═══');
const migs = fs.readdirSync(__dirname + '/supabase/migrations');
ok('existe la migración de ubicación del cliente', migs.some(n => /cliente_ubicacion/.test(n)));
const mig = migs.filter(n => /cliente_ubicacion/.test(n)).map(n => fs.readFileSync(__dirname + '/supabase/migrations/' + n, 'utf8')).join('\n');
ok('la migración agrega lat/lng con if not exists', /add column if not exists lat double precision/.test(mig) && /add column if not exists lng double precision/.test(mig));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
