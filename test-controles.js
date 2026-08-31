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

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
