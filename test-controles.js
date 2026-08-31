// ============================================================
//  SEFE · test-controles.js — MÓDULO CONTROLES (parte 1: Ambientales)
// ============================================================
//  Cómo se corre:   node test-controles.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Verifica el CABLEADO del módulo nuevo: sección registrada (menú,
//  sección, pestañas, despacho, título, permiso), funciones existentes,
//  capa de datos y migración con RLS. Mismo tipo de chequeo que evitó
//  el "no me sale" de la planilla.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Registro de la sección Controles ═══');
ok('index.html tiene el botón del menú (data-view="controles")', /data-view="controles"/.test(html));
ok('index.html tiene la sección v-controles', /id="v-controles"/.test(html));
ok('index.html tiene las 3 pestañas (amb / bat / gas)', /data-tab="amb"/.test(html) && /data-tab="bat"/.test(html) && /data-tab="gas"/.test(html));
ok('index.html carga js/app-13.js', /js\/app-13\.js/.test(html));
ok('go() despacha la vista controles', /v==='controles'.*renderControles/.test(src));
ok('el título de la vista controles está registrado', /controles:\['Controles'/.test(src));

console.log('\n═══ Permiso otorgable ═══');
ok('controles es un permiso otorgable (MODULOS_PERMISOS)', /key:'controles'/.test(src));
ok('controles está en VISTAS_VALIDAS', /VISTAS_VALIDAS=\[[^\]]*'controles'/.test(src));

console.log('\n═══ Funciones del módulo ═══');
ok('existe renderControles (y en window)', /function renderControles\(/.test(src) && /window\.renderControles\s*=/.test(src));
ok('existe el switch de pestañas ctrlTab (y en window)', /function ctrlTab\(/.test(src) && /window\.ctrlTab\s*=/.test(src));
ok('existe renderAmbServicios', /function renderAmbServicios\(/.test(src));
ok('existe openAmbServicio (y en window)', /function openAmbServicio\(/.test(src) && /window\.openAmbServicio\s*=/.test(src));

console.log('\n═══ Capa de datos (db.js) ═══');
ok('db.js mapea ambientales (mapAmbServicioFromDB)', /function mapAmbServicioFromDB\(/.test(dbjs));
ok('db.js guarda ambientales (guardarAmbServicio)', /async function guardarAmbServicio\(/.test(dbjs));
ok('db.js borra ambientales (borrarAmbServicio)', /async function borrarAmbServicio\(/.test(dbjs));
ok('db.js carga ambientales en el arranque (rAmb)', /rAmb/.test(dbjs) && /from\('ctrl_ambientales'\)/.test(dbjs));
ok('la carga tolera tabla ausente (rAmb&&rAmb.data)', /\(rAmb&&rAmb\.data\)/.test(dbjs));

console.log('\n═══ Migración ═══');
const migs = fs.readdirSync(__dirname + '/supabase/migrations');
ok('existe la migración de ctrl_ambientales', migs.some(n => /ctrl_ambientales/.test(n)));
const mig = migs.filter(n => /ctrl_ambientales/.test(n)).map(n => fs.readFileSync(__dirname + '/supabase/migrations/' + n, 'utf8')).join('\n');
ok('la migración trae RLS (enable row level security + sefe_leer)', /enable row level security/.test(mig) && /sefe_leer/.test(mig));

console.log('\n═══ Vista calendario + día hábil ═══');
ok('index.html tiene el toggle Lista/Calendario', /data-vista="lista"/.test(html) && /data-vista="cal"/.test(html));
ok('index.html tiene el contenedor del calendario (#amb-cal)', /id="amb-cal"/.test(html));
ok('existe ambVista y renderAmbCalendario', /function ambVista\(/.test(src) && /function renderAmbCalendario\(/.test(src));
ok('existe la navegación del calendario (ambCalMover / ambCalHoy)', /function ambCalMover\(/.test(src) && /function ambCalHoy\(/.test(src));
ok('existe _siguienteHabil (y en window)', /function _siguienteHabil\(/.test(src) && /window\._siguienteHabil\s*=/.test(src));
ok('el próximo servicio se ajusta al guardar si cae fin de semana', /rec\.proximo=_?_?siguienteHabil|hab=_siguienteHabil\(rec\.proximo\)/.test(src));

// Verificación REAL de la lógica de día hábil
const vm = require('vm');
(() => {
  const i = src.indexOf('function _siguienteHabil(');
  const j = src.indexOf('\n}', i);
  const fn = src.slice(i, j + 2);
  const ctx = { Date, String };
  vm.createContext(ctx);
  vm.runInContext(fn + '\n;globalThis.__h=_siguienteHabil;', ctx);
  const h = ctx.__h;
  // 2026-08-29 es sábado → lunes 31 ; 2026-08-30 domingo → lunes 31
  ok('sábado (2026-08-29) → lunes 2026-08-31', h('2026-08-29') === '2026-08-31', h('2026-08-29'));
  ok('domingo (2026-08-30) → lunes 2026-08-31', h('2026-08-30') === '2026-08-31', h('2026-08-30'));
  ok('viernes (2026-08-28) NO se mueve', h('2026-08-28') === '2026-08-28', h('2026-08-28'));
  ok('lunes (2026-08-31) NO se mueve', h('2026-08-31') === '2026-08-31', h('2026-08-31'));
  ok('vacío se queda vacío', !h('') && !h(null));
})();

console.log('\n═══ Baterías (parte 2) ═══');
ok('index.html tiene la tabla de existencias (#t-bat-stock)', /id="t-bat-stock"/.test(html));
ok('index.html tiene la tabla de cambios (#t-bat-cambios)', /id="t-bat-cambios"/.test(html));
ok('el switch de pestañas despacha renderBaterias', /t==='bat'\)renderBaterias/.test(src));
ok('existe renderBaterias (y en window)', /function renderBaterias\(/.test(src) && /window\.renderBaterias\s*=/.test(src));
ok('existen tipos: openBatTipo + entrada de stock (_batEntrada)', /function openBatTipo\(/.test(src) && /function _batEntrada\(/.test(src));
ok('existen cambios: openBatCambio (y en window)', /function openBatCambio\(/.test(src) && /window\.openBatCambio\s*=/.test(src));
ok('el próximo cambio también se ajusta a día hábil', /id="bc-prox"[^>]*_siguienteHabil/.test(src));

console.log('\n═══ Baterías · entregas a pilotos + cuadre ═══');
ok('index.html tiene la tabla de entregas (#t-bat-entregas)', /id="t-bat-entregas"/.test(html));
ok('index.html tiene la tabla "en mano por piloto" (#t-bat-enmano)', /id="t-bat-enmano"/.test(html));
ok('la colocación (cambio) pide el PILOTO (bc-pil, requerido)', /id="bc-pil"/.test(src) && /Elegí de qué piloto sale/.test(src));
ok('existe openBatEntrega (entrega de bodega a piloto)', /function openBatEntrega\(/.test(src) && /window\.openBatEntrega\s*=/.test(src));
ok('la ENTREGA descuenta de bodega (_batAjustarStock negativo en openBatEntrega)', /function openBatEntrega\([\s\S]*?_batAjustarStock\(tipoId,-cantidad\)/.test(src));
ok('borrar una entrega DEVUELVE a bodega', /_batAjustarStock\(e\.tipoId, ?Number\(e\.cantidad\)/.test(src));
ok('la colocación YA NO toca bodega (sin _batAjustarStock en openBatCambio)', !/_batAjustarStock/.test(src.slice(src.indexOf('function openBatCambio('), src.indexOf('window.openBatCambio='))));
ok('el "en mano" se calcula entregado − colocado (_batEnMano / _batEnManoDe)', /function _batEnMano\(/.test(src) && /function _batEnManoDe\(/.test(src));
ok('db.js maneja entregas (mapBatEntregaFromDB / guardarBatEntrega)', /function mapBatEntregaFromDB\(/.test(dbjs) && /async function guardarBatEntrega\(/.test(dbjs));
ok('db.js carga entregas (rBatEntregas / ctrl_bat_entregas)', /rBatEntregas/.test(dbjs) && /from\('ctrl_bat_entregas'\)/.test(dbjs));
ok('el cambio guarda el piloto (piloto_id en guardarBatCambio)', /piloto_id:c\.pilotoId/.test(dbjs));
ok('existe la migración de entregas con la columna piloto_id en cambios', migs.some(n=>/ctrl_bat_entregas/.test(n)));

// Verificación REAL del cálculo "en mano"
(() => {
  const i = src.indexOf('function _batEnManoDe(');
  const j = src.indexOf('\n}', i);
  const fn = src.slice(i, j + 2);
  const ctx = { String, Number,
    batEntregas: [ {pilotoId:1,tipoId:9,cantidad:10}, {pilotoId:1,tipoId:9,cantidad:5} ],
    batCambios:  [ {id:100,pilotoId:1,tipoId:9,cantidad:4}, {id:101,pilotoId:1,tipoId:9,cantidad:3} ],
  };
  vm.createContext(ctx);
  vm.runInContext(fn + '\n;globalThis.__m=_batEnManoDe;', ctx);
  const m = ctx.__m;
  // entregado 15 − colocado 7 = 8
  ok('en mano = entregado − colocado (15 − 7 = 8)', m(1, 9) === 8, m(1, 9));
  // excluyendo el cambio 100 (cantidad 4): colocado 3 → 15 − 3 = 12
  ok('excluye el cambio en edición (15 − 3 = 12)', m(1, 9, 100) === 12, m(1, 9, 100));
})();

console.log('\n═══ Capa de datos · Baterías (db.js) ═══');
ok('db.js mapea/guarda tipos (mapBatTipoFromDB / guardarBatTipo)', /function mapBatTipoFromDB\(/.test(dbjs) && /async function guardarBatTipo\(/.test(dbjs));
ok('db.js mapea/guarda cambios (mapBatCambioFromDB / guardarBatCambio)', /function mapBatCambioFromDB\(/.test(dbjs) && /async function guardarBatCambio\(/.test(dbjs));
ok('db.js carga baterías en el arranque (rBatTipos / rBatCambios)', /rBatTipos/.test(dbjs) && /from\('ctrl_bat_tipos'\)/.test(dbjs) && /from\('ctrl_bat_cambios'\)/.test(dbjs));

console.log('\n═══ Migración · Baterías ═══');
ok('existe la migración de ctrl_baterias', migs.some(n => /ctrl_baterias/.test(n)));
const migB = migs.filter(n => /ctrl_baterias/.test(n)).map(n => fs.readFileSync(__dirname + '/supabase/migrations/' + n, 'utf8')).join('\n');
ok('crea las dos tablas con RLS', /ctrl_bat_tipos/.test(migB) && /ctrl_bat_cambios/.test(migB) && /enable row level security/.test(migB) && /sefe_leer/.test(migB));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
