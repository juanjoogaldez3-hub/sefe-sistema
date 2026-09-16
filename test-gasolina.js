// ============================================================
//  SEFE · test-gasolina.js — RENDIMIENTO km/gal (por VEHÍCULO)
// ============================================================
//  Cómo se corre:   node test-gasolina.js
//
//  El rendimiento se calcula con el odómetro (kilometraje), que es del
//  VEHÍCULO, no del piloto. Antes comparaba por piloto: si un piloto
//  manejaba dos vehículos, restaba odómetros distintos y daba números
//  absurdos (ej. 25,000 km/gal). Ahora compara la carga anterior de la
//  MISMA placa.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Cableado (código) ═══');
ok('el rendimiento compara por VEHÍCULO (placa), no por piloto', /String\(x\.vehiculo\|\|''\)\.trim\(\)\.toUpperCase\(\)===veh/.test(src) && !/String\(x\.pilotoId\)===String\(g\.pilotoId\)&&x\.kilometraje/.test(src));
ok('sin placa no calcula rendimiento (evita mezclar odómetros)', /const veh=String\(g\.vehiculo\|\|''\)\.trim\(\)\.toUpperCase\(\);\s*if\(!veh\)return null;/.test(src));

console.log('\n═══ El cálculo (funcional) ═══');
(() => {
  const ctx = { Math, Number, String }; vm.createContext(ctx);
  const i = src.indexOf('function _gasRendimiento(g)');
  const j = src.indexOf('function renderGasolina(');
  // La función usa la global `gasolina`; la inyectamos en el contexto.
  const datos = [
    { id: 1, pilotoId: 'edwin', vehiculo: '804GYQ', kilometraje: 251726, galones: 10 }, // 10-09
    { id: 2, pilotoId: 'eduardo', vehiculo: '804GYQ', kilometraje: 251337, galones: 10.8 }, // 07-09
    { id: 3, pilotoId: 'edwin', vehiculo: '936LBB', kilometraje: 299, galones: 10.1 }, // 03-09
  ];
  vm.runInContext('var gasolina=' + JSON.stringify(datos) + ';' + src.slice(i, j) + ';globalThis.__r=_gasRendimiento;', ctx);
  const r = ctx.__r;
  // Antes daba ~25,000 (251726-299)/10. Ahora, mismo vehículo: (251726-251337)/10 = 38.9
  ok('804GYQ: usa la carga anterior de la MISMA placa → 38.9 km/gal', r(datos[0]) === 38.9, 'dio ' + r(datos[0]));
  ok('NO da el número absurdo (>1000 km/gal)', r(datos[0]) < 1000);
  ok('primera carga de una placa (936LBB) → sin rendimiento', r(datos[2]) === null);
  ok('carga sin placa → sin rendimiento (no mezcla odómetros)', r({ id: 9, pilotoId: 'edwin', vehiculo: '', kilometraje: 300000, galones: 10 }) === null);
})();

console.log('\n═══ Consumo por unidad ═══');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
ok('el resumen agrupa por UNIDAD (vehículo), no por piloto', /function _gasResumenUnidad\(/.test(src) && /const veh=String\(g\.vehiculo\|\|''\)\.trim\(\)/.test(src) && !/function _gasResumenPiloto\(/.test(src));
ok('hay tabla "Consumo por unidad" en la pestaña', /id="t-gas-uni"/.test(html) && /Consumo por unidad/.test(html));
ok('renderGasolina llena la tabla por unidad', /const uni=_gasResumenUnidad\(\)/.test(src) && /\$\('#t-gas-uni'\)/.test(src));
ok('el reporte por unidad existe (reemplaza al de piloto)', /window\._reporteGasUnidad=_reporteGasUnidad/.test(src) && !/_reporteGasPiloto/.test(src));

(() => {
  const ctx = { Math, Number, String, Set }; vm.createContext(ctx);
  const i = src.indexOf('function _gasResumenUnidad(');
  const j = src.indexOf('async function _reporteGasUnidad(');
  const datos = [
    { id: 1, pilotoId: 'edwin', vehiculo: '804GYQ', kilometraje: 251726, galones: 10, monto: 435.38 },
    { id: 2, pilotoId: 'eduardo', vehiculo: '804GYQ', kilometraje: 251337, galones: 10.8, monto: 465.03 },
    { id: 3, pilotoId: 'edwin', vehiculo: '936LBB', kilometraje: 299, galones: 10.1, monto: 426.34 },
  ];
  // Stubear _batNombrePiloto (nombres de piloto)
  vm.runInContext('function _batNombrePiloto(id){return ({edwin:"Edwin Tuez",eduardo:"Eduardo Ramirez"})[id]||id;}var gasolina=' + JSON.stringify(datos) + ';' + src.slice(i, j) + ';globalThis.__u=_gasResumenUnidad;', ctx);
  const filas = ctx.__u();
  const g804 = filas.find(f => f.unidad === '804GYQ');
  const g936 = filas.find(f => f.unidad === '936LBB');
  ok('804GYQ junta las 2 cargas de esa placa (aunque sean 2 pilotos)', g804 && g804.cargas === 2);
  ok('804GYQ suma galones (10 + 10.8 = 20.8) y gasto', g804 && Math.round(g804.galones * 10) / 10 === 20.8 && Math.round(g804.monto * 100) / 100 === 900.41);
  ok('804GYQ km recorridos = 251726 − 251337 = 389', g804 && g804.km === 389, 'dio ' + (g804 && g804.km));
  ok('804GYQ rendimiento = 389 / 10 = 38.9 km/gal', g804 && g804.rend === 38.9, 'dio ' + (g804 && g804.rend));
  ok('804GYQ lista los dos pilotos que la manejaron', g804 && /Eduardo Ramirez/.test(g804.pilotos) && /Edwin Tuez/.test(g804.pilotos));
  ok('936LBB con una sola carga → sin rendimiento', g936 && g936.rend === null);
})();

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
