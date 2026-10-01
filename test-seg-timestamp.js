// ============================================================
//  SEFE · test-seg-timestamp.js — el seguimiento guarda y MUESTRA
//  la fecha y hora en que se hizo.
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Se guarda el timestamp al crear ═══');
ok('seguimiento de cobro guarda registrado', /c\.seguimientos\.push\(\{id:nid,fecha,resultado,nota,proximaFecha,usuario:currentUser,registrado:new Date\(\)\.toISOString\(\)\}\)/.test(src));
ok('seguimiento de venta guarda registrado', (src.match(/registrado:new Date\(\)\.toISOString\(\)\}\)/g)||[]).length>=2);

console.log('\n═══ Se MUESTRA la fecha y hora en el historial ═══');
ok('la columna muestra fecha+hora (fdatehora del registrado)', /\$\{s\.registrado\?fdatehora\(s\.registrado\):\(s\.fecha\?fdate\(s\.fecha\):'—'\)\}/.test(src));
ok('el encabezado dice "Fecha y hora"', /<th>Fecha y hora<\/th>/.test(src));
ok('ordena por el timestamp exacto', /\(b\.registrado\|\|b\.fecha\|\|''\)\.localeCompare\(a\.registrado\|\|a\.fecha\|\|''\)/.test(src));
ok('existe el formateador fdatehora', /function fdatehora\(d\)\{/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
