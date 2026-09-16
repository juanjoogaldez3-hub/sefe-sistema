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

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
