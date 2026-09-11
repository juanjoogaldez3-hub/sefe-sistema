// ============================================================
//  SEFE · test-mapadatos.js — MAPA DE CLIENTES CON DATOS (colores)
// ============================================================
//  Cómo se corre:   node test-mapadatos.js
//
//  El mapa de todos los clientes se puede colorear por saldo pendiente,
//  última compra o ventas totales, con leyenda y el dato en el globo de
//  cada pin (saldo, días sin comprar, pedidos abiertos).
// ============================================================
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
ok('última compra: verde reciente → rojo olvidado, gris = nunca', /if\(d==null\)return '#9e9e9e'/.test(src) && /if\(d<=15\)return '#2e7d32'/.test(src));
ok('ventas: degradado por monto', /function _mapaColor/.test(src) && /_cliVentasTotal\(c\)/.test(src) && /'#1b5e20'/.test(src));

// El asistente de RUTA ya no existe (se rehará de otra forma)
ok('la Ruta del día quedó retirada del código', !/function openRutaDia\(/.test(src) && !/onclick="openRutaDia\(\)"/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
