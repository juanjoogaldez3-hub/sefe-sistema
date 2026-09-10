// ============================================================
//  SEFE · test-felbloqueo.js — BLOQUEO + PANTALLA DE CARGA EN FEL
// ============================================================
//  Cómo se corre:   node test-felbloqueo.js
//
//  EcoFactura tarda; sin bloqueo, el doble clic duplicaba facturas/anulaciones.
//  Ahora, mientras corre una operación FEL (facturar, facturar exento, anular),
//  se muestra un overlay que bloquea la pantalla y un candado (_felEnCurso) que
//  ignora clics repetidos, liberándose siempre al terminar (finally). Esta
//  prueba fija ese cableado.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const css = fs.readFileSync(__dirname + '/css/estilos.css', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Candado + overlay ═══');
ok('existe el candado y el overlay (_felLock / _felUnlock / overlay)', /function _felLock\(/.test(src) && /function _felUnlock\(/.test(src) && /id=.fel-overlay./.test(src));
ok('_felLock avisa y bloquea si ya hay una operación en curso', /if\(_felEnCurso\)\{toast\(/.test(src) && /_felEnCurso=true;_felOverlayShow/.test(src));
ok('el overlay bloquea la pantalla (position:fixed, z-index alto)', /position:fixed;inset:0;z-index:100000/.test(src));
ok('la animación del spinner está en el CSS (felspin)', /@keyframes felspin/.test(css));

console.log('\n═══ Envuelve las 3 operaciones lentas ═══');
// facturar normal
const fp = src.slice(src.indexOf('async function facturarPedido('), src.indexOf('window.facturarPedido='));
ok('facturar: toma el candado antes de la red y lo libera en finally', /_felLock\('Emitiendo factura…'/.test(fp) && /\}finally\{_felUnlock\(\);\}/.test(fp));
// facturar exento
const fe = src.slice(src.indexOf('async function facturarPedidoExento('), src.indexOf('window.facturarPedidoExento='));
ok('facturar exento: toma el candado y lo libera en finally', /_felLock\('Emitiendo factura exenta…'/.test(fe) && /\}finally\{_felUnlock\(\);\}/.test(fe));
// anular
const an = src.slice(src.indexOf('async function anularFacturaReal('), src.indexOf('async function anularFacturaReal(') + 2600);
ok('anular: toma el candado y lo libera en finally', /_felLock\('Anulando factura…'/.test(an) && /\}finally\{_felUnlock\(\);\}/.test(an));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
