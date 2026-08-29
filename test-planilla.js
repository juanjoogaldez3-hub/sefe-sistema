// ============================================================
//  SEFE · test-planilla.js — MÓDULO PLANILLA (parte 1: empleados)
// ============================================================
//  Cómo se corre:   node test-planilla.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Verifica el CABLEADO del módulo nuevo: que la sección esté registrada
//  (botón del menú, sección, despacho en go(), título), que las funciones
//  existan, que la capa de datos cargue/guarde empleados, y que exista la
//  migración. Es el mismo tipo de chequeo que evitó el "no me sale" del
//  reporte y de la conciliación.
// ============================================================
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Registro de la sección Planilla ═══');
ok('index.html tiene el botón del menú (data-view="planilla")', /data-view="planilla"/.test(html));
ok('index.html tiene la sección v-planilla', /id="v-planilla"/.test(html));
ok('index.html tiene la tabla de empleados (#t-empleados)', /id="t-empleados"/.test(html));
ok('index.html carga js/app-12.js', /js\/app-12\.js/.test(html));
ok('go() despacha la vista planilla', /v==='planilla'.*renderPlanilla/.test(src));
ok('el título de la vista planilla está registrado', /planilla:\['Planilla'/.test(src));

console.log('\n═══ Funciones del módulo ═══');
ok('existe renderPlanilla (y en window)', /function renderPlanilla\(/.test(src) && /window\.renderPlanilla\s*=/.test(src));
ok('existe openEmpleado (y en window)', /function openEmpleado\(/.test(src) && /window\.openEmpleado\s*=/.test(src));

console.log('\n═══ Capa de datos (db.js) ═══');
ok('db.js mapea empleados (mapEmpleadoFromDB)', /function mapEmpleadoFromDB\(/.test(dbjs));
ok('db.js guarda empleados (guardarEmpleado)', /async function guardarEmpleado\(/.test(dbjs));
ok('db.js carga empleados en el arranque (rEmpleados)', /rEmpleados/.test(dbjs) && /from\('empleados'\)/.test(dbjs));
ok('la carga tolera tabla ausente (rEmpleados&&rEmpleados.data)', /\(rEmpleados&&rEmpleados\.data\)/.test(dbjs));

console.log('\n═══ Migración ═══');
ok('existe la migración de la tabla empleados', fs.readdirSync(__dirname + '/supabase/migrations').some(n => /empleados/.test(n)));

console.log('\n═══ Solo admin ═══');
// No se agrega a MODULOS_PERMISOS: así ningún rol distinto de admin (views='ALL')
// puede tenerla. Confirmamos que NO aparece como permiso otorgable.
ok('la planilla NO es un permiso otorgable a otros roles (solo admin ALL)', !/key:'rep_planilla'|key:'planilla'/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
