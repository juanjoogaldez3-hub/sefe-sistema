// ============================================================
//  SEFE · test-version.js — AVISO DE VERSIÓN NUEVA
// ============================================================
//  Cómo se corre:   node test-version.js
//
//  Para que nadie se quede con una versión vieja abierta, la app trae su
//  versión embebida (window.APP_VERSION) y cada tanto baja index.html fresco;
//  si la versión del servidor cambió, muestra un aviso fijo "Actualizar ahora".
//  Esta prueba fija ese cableado y que la versión embebida quede en sync con
//  los ?v= (los sube el mismo sed de publicación).
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Versión embebida en index.html ═══');
const mVer = html.match(/window\.APP_VERSION\s*=\s*'([^']+)'/);
ok('index.html define window.APP_VERSION', !!mVer, 'no está');
// Debe coincidir con el token ?v= que usan los includes (mismo sed los sube)
const mCss = html.match(/estilos\.css\?(v=\d+[a-z])/);
ok('la versión embebida coincide con el ?v= de los includes', !!(mVer && mCss && mVer[1] === mCss[1]), mVer && mCss ? (mVer[1] + ' vs ' + mCss[1]) : 'no se pudo comparar');

console.log('\n═══ Chequeo y aviso (app) ═══');
ok('existe el chequeo de versión (_chequearVersion)', /async function _chequearVersion\(/.test(src));
ok('baja index.html fresco (no-store) y compara la versión', /fetch\('index\.html\?_v='\+Date\.now\(\),\{cache:'no-store'\}\)/.test(src) && /m\[1\]!==window\.APP_VERSION/.test(src));
ok('muestra un aviso fijo con botón Actualizar', /function _mostrarBannerVersion\(/.test(src) && /Actualizar ahora/.test(src) && /location\.reload\(\)/.test(src));
ok('arranca el chequeo (30s, cada 5 min y al enfocar la pestaña)', /setTimeout\(_chequearVersion,30000\)/.test(src) && /setInterval\(_chequearVersion,5\*60\*1000\)/.test(src) && /addEventListener\('focus',_chequearVersion\)/.test(src));
ok('se dispara después del login', /_iniciarChequeoVersion\(\)/.test(src));
ok('no arranca dos veces (guard _verChequeoOn)', /if\(_verChequeoOn\)return;\s*_verChequeoOn=true/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
