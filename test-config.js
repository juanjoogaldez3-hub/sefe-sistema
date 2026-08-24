// ============================================================
//  SEFE · test-config.js — CADA URL CAE EN LA BASE CORRECTA
// ============================================================
//  Cómo se corre:   node test-config.js
//  No necesita internet ni instalar nada.
//
//  El config.js ahora es un SELECTOR: un solo archivo que decide,
//  según la URL, si está en Producción, Pruebas o un cliente. Un
//  error acá es gravísimo —el sitio real escribiendo en otra base—,
//  así que esto verifica que nunca se confunda.
// ============================================================

const { SEFE_ENTORNOS, _sefeDetectarEntorno } = require('./config.js');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const PROD = 'https://krbyulpmfazntjwnpxnw.supabase.co';
const PRUE = 'https://imvoyzxdvtoktckazzsv.supabase.co';

// loc de mentira, como el window.location del navegador
const L = (hostname, pathname, search) => ({ hostname, pathname: pathname || '/', search: search || '' });
const ent = loc => SEFE_ENTORNOS[_sefeDetectarEntorno(loc)];

console.log('\n═══ PRODUCCIÓN es el default seguro ═══');
ok('sitio real / → producción',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/')) === 'produccion',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/')));
ok('sitio real /index.html → producción',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/index.html')) === 'produccion',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/index.html')));
ok('la base de producción es la de krbyulpm...',
  ent(L('sistema.se-fe.com', '/')).url === PROD, ent(L('sistema.se-fe.com', '/')).url);
ok('dominio desconocido → producción (nunca a pruebas por error)',
  _sefeDetectarEntorno(L('lo-que-sea.com', '/')) === 'produccion',
  _sefeDetectarEntorno(L('lo-que-sea.com', '/')));
ok('localhost → producción',
  _sefeDetectarEntorno(L('localhost', '/')) === 'produccion',
  _sefeDetectarEntorno(L('localhost', '/')));

console.log('\n═══ PRUEBAS sólo con señal explícita ═══');
ok('/Pruebas/ → pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/')) === 'pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/')));
ok('/Pruebas/index.html → pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/index.html')) === 'pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/index.html')));
ok('la base de pruebas es la de imvoyzxd...',
  ent(L('sistema.se-fe.com', '/Pruebas/')).url === PRUE, ent(L('sistema.se-fe.com', '/Pruebas/')).url);
ok('?env=pruebas desde la raíz → pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/', '?env=pruebas')) === 'pruebas',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/', '?env=pruebas')));

console.log('\n═══ ?env explícito gana sobre la ruta ═══');
ok('?env=produccion dentro de /Pruebas/ → producción',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/', '?env=produccion')) === 'produccion',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/Pruebas/', '?env=produccion')));
ok('?env con un nombre inexistente se ignora → default producción',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/', '?env=noexiste')) === 'produccion',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/', '?env=noexiste')));

console.log('\n═══ Las funciones por entorno siguen bien ═══');
ok('WhatsApp APAGADO en producción',
  ent(L('sistema.se-fe.com', '/')).funciones.whatsapp === false, 'estaba encendido');
ok('WhatsApp ENCENDIDO en pruebas',
  ent(L('sistema.se-fe.com', '/Pruebas/')).funciones.whatsapp === true, 'estaba apagado');

console.log('\n═══ Simulacro de cliente nuevo (dominio propio) ═══');
// Se agrega un cliente al vuelo, como quedaría al copiar la plantilla,
// para probar que un dominio propio lo detecta sin tocar a los demás.
SEFE_ENTORNOS.demo = { entorno:'demo', url:'https://demo123.supabase.co', key:'x', dominios:['demo.se-fe.com'], funciones:{whatsapp:false} };
ok('demo.se-fe.com → cliente demo',
  _sefeDetectarEntorno(L('demo.se-fe.com', '/')) === 'demo',
  _sefeDetectarEntorno(L('demo.se-fe.com', '/')));
ok('agregar un cliente NO cambia producción',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/')) === 'produccion',
  _sefeDetectarEntorno(L('sistema.se-fe.com', '/')));
delete SEFE_ENTORNOS.demo;

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
