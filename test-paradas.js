// ============================================================
//  SEFE · test-paradas.js — PARADAS MANUALES DE RUTA
//  (banco, recolección, etc. que se suman a la ruta del piloto)
// ============================================================
//  Cómo se corre:   node test-paradas.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ 1 · Filtra las paradas pendientes de un piloto ═══');
(() => {
  const ini = src.indexOf('function _paradasPiloto(pid)');
  const fin = src.indexOf('window._paradasPiloto=') > -1 ? src.indexOf('window._paradasPiloto=') : src.indexOf('\n', ini + 60);
  const paradas = [
    { id: 1, pilotoId: 5, hecha: false },
    { id: 2, pilotoId: 5, hecha: true },   // ya hecha → fuera
    { id: 3, pilotoId: 9, hecha: false },  // otro piloto → fuera
  ];
  const ctx = { paradasRuta: paradas };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=_paradasPiloto;', ctx);
  const r = ctx.__f(5);
  ok('devuelve solo las pendientes del piloto 5', r.length === 1 && r[0].id === 1, JSON.stringify(r.map(x => x.id)));
  ok('acepta el id como texto (selector)', ctx.__f('5').length === 1);
})();

console.log('\n═══ 2 · Navegar mezcla entregas + paradas por orden de ruta ═══');
(() => {
  const ini = src.indexOf('function _abrirRutaPiloto(docs,paradas)');
  const fin = src.indexOf('window.abrirRutaMaps=');
  let abierto = null;
  const ctx = {
    _rutaParadaDe: d => 'DOC' + d.id,
    _locParadaManual: p => 'PAR' + p.id,
    _abrirMapsLocs: locs => { abierto = locs; },
  };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=_abrirRutaPiloto;', ctx);
  const docs = [{ id: 1, ordenRuta: 3 }, { id: 2, ordenRuta: 1 }];
  const paradas = [{ id: 7, ordenRuta: 2 }];
  ctx.__f(docs, paradas);
  ok('intercala la parada según su orden de ruta', JSON.stringify(abierto) === JSON.stringify(['DOC2', 'PAR7', 'DOC1']), JSON.stringify(abierto));
})();

console.log('\n═══ 3 · Marcar una parada como hecha ═══');
(() => {
  const ini = src.indexOf('function paradaHecha(id)');
  const fin = src.indexOf('window.paradaHecha=');
  const p = { id: 4, titulo: 'Ir al banco', hecha: false };
  let guardada = null;
  const ctx = {
    paradasRuta: [p], guardarParadaRuta: x => { guardada = x; }, logAudit: () => {}, toast: () => {},
    renderMisEntregas: () => {}, renderDespachos: () => {},
    document: { getElementById: () => ({ classList: { contains: () => false } }) },
    Date,
  };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=paradaHecha;', ctx);
  ctx.__f(4);
  ok('marca hecha=true y sella la fecha', p.hecha === true && !!p.hechaFecha);
  ok('persiste el cambio', guardada === p);
})();

console.log('\n═══ 4 · Optimizador numera y ubica también las paradas ═══');
ok('_ordenarPorCercania recibe (docs, paradas)', /async function _ordenarPorCercania\(docs,paradas\)/.test(src));
ok('la parada con pin entra a la matriz con su hora límite', /_parseMinHora\(p\.horaLimite\)/.test(src) && /aplicar:\(n,eta\)=>\{p\.ordenRuta=n;p\.eta=eta/.test(src));

console.log('\n═══ 5 · Cableado (UI + db + panel admin) ═══');
ok('botón "➕ Agregar parada" en Despachos', /Agregar parada/.test(html) && /openParadaRuta\(/.test(html));
ok('panel de paradas manuales en Despachos', /id="desp-paradas-panel"/.test(html) && /function renderParadasPanel\(/.test(src) && /renderParadasPanel\(\);/.test(src));
ok('formulario de parada (piloto, título, dirección, hora)', /id="pr-piloto"/.test(src) && /id="pr-tit"/.test(src) && /id="pr-dir"/.test(src) && /id="pr-hora"/.test(src));
ok('geocodifica la dirección con Google', /async function _geocodeGoogle\(dir\)/.test(src) && /new gm\.Geocoder\(\)/.test(src));
ok('db.js carga la tabla paradas_ruta', /from\('paradas_ruta'\)\.select/.test(dbjs) && /paradasRuta = \(rParadas/.test(dbjs));
ok('db.js mapea, guarda y borra paradas', /function mapParadaRutaFromDB\(p\)/.test(dbjs) && /async function guardarParadaRuta\(p\)/.test(dbjs) && /async function borrarParadaRuta\(id\)/.test(dbjs));
ok('Mis entregas (piloto) intercala paradas', /_abrirRutaPiloto\(mias,_paradasPiloto\(pid\)\)/.test(src) && /const paradaCard=/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
