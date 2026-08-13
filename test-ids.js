// ============================================================
//  SEFE · test-ids.js — NINGÚN ID PUEDE ESTAR REPETIDO
// ============================================================
//  Cómo se corre:   node test-ids.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE ESTA PRUEBA
//
//  closeMod() sólo le quita la clase "show" al modal genérico
//  (#ov): NUNCA le vacía el #m-body. O sea que el HTML del último
//  modal que se abrió se queda pegado en la página para siempre.
//
//  Y #ov está ANTES que los modales fijos (#ov-pago) en la página.
//  Como $('#loquesea') devuelve el PRIMERO que encuentra, un id
//  repetido hace que el código lea la casilla del modal viejo,
//  invisible, en vez de la que el usuario tiene enfrente.
//
//  Así se rompió el pago global: abrir una sola vez "Registrar
//  pago" de proveedor dejaba un #pg-cuenta escondido, y de ahí en
//  adelante el pago global leía ESE — vacío — así que nunca
//  registraba el movimiento en bancos.
//
//  Regla: un id de un modal fijo no puede volver a aparecer en
//  ningún texto de JavaScript.
// ============================================================

const fs = require('fs');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const idsDe = txt => {
  const out = new Map();
  const re = /id="([a-zA-Z0-9_-]+)"/g;
  let m;
  while ((m = re.exec(txt))) out.set(m[1], (out.get(m[1]) || 0) + 1);
  return out;
};

function revisar(ruta) {
  console.log('\n══════ ' + ruta + ' ══════');
  const lineas = fs.readFileSync(__dirname + '/' + ruta, 'utf8').split('\n');

  // El HTML fijo termina donde arranca el <script> de la aplicación
  const iScript = lineas.findIndex(l => l.trim() === '<script>');
  if (iScript < 0) { console.log('✗ no se encontró el <script> de la aplicación'); process.exit(1); }

  const htmlFijo = lineas.slice(0, iScript).join('\n');
  const js = lineas.slice(iScript).join('\n');

  const fijos = idsDe(htmlFijo);
  const repetidosEnHtml = [...fijos].filter(([, n]) => n > 1).map(([id]) => id);
  ok('ningún id se repite dentro del HTML fijo', repetidosEnHtml.length === 0, repetidosEnHtml.join(', '));

  const enJs = idsDe(js);
  const choques = [...fijos.keys()].filter(id => enJs.has(id));
  ok('ningún id del HTML fijo se vuelve a crear desde JavaScript',
    choques.length === 0,
    choques.length + ' repetidos: ' + choques.join(', '));

  // selectorCuentaBancoHTML('id', …) genera el <select id="…">, así que
  // el id no sale en un id="…" literal y hay que revisarlo aparte.
  const destinos = [...js.matchAll(/selectorCuentaBancoHTML\(\s*'([^']+)'/g)].map(m => m[1]);
  const cuenta = destinos.reduce((a, d) => (a[d] = (a[d] || 0) + 1, a), {});
  // Repetir un id entre dos modales de openMod es inofensivo (nunca coexisten),
  // pero repetirlo entre un modal fijo y uno de openMod sí rompe.
  const enModalFijo = new Set();
  [...js.matchAll(/\$p?g?\('#([a-zA-Z0-9_-]+-wrap)'\)[^\n]*selectorCuentaBancoHTML\(\s*'([^']+)'/g)]
    .forEach(m => enModalFijo.add(m[2]));
  const choqueCuenta = [...enModalFijo].filter(id => cuenta[id] > 1);
  ok('el selector de cuenta de un modal fijo no se repite en otro modal',
    choqueCuenta.length === 0,
    choqueCuenta.join(', ') + ' (usado ' + choqueCuenta.map(id => cuenta[id]).join(', ') + ' veces)');

  // El pago global vive en #ov-pago: sus casillas se buscan sólo ahí dentro.
  const sueltos = [...js.matchAll(/\$\('#pg-[a-zA-Z0-9_-]+'\)/g)].map(m => m[0]);
  ok('el pago global no busca sus casillas en toda la página',
    sueltos.length === 0, sueltos.join(', '));
}

revisar('index.html');
revisar('Pruebas/index.html');

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
