// ============================================================
//  SEFE · test-reprango.js — EL RANGO DE FECHAS SALE EN LOS REPORTES
// ============================================================
//  Cómo se corre:   node test-reprango.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Al generar un reporte (PDF o Excel) tiene que salir el RANGO DE FECHAS
//  seleccionado. Esta prueba verifica (1) que la función repRangoLabel arme
//  bien la etiqueta —fechas manuales o el rango del período elegido— y
//  (2) que el PDF y el Excel de reportes la usen.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// ── Extraer las funciones puras necesarias ──
function corta(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return '';
  // hasta el cierre de función en columna 0 (formato del proyecto)
  const j = src.indexOf('\n}', i);
  return src.slice(i, j + 2);
}
const bloque = [corta('_fechaDe'), corta('fdate'), corta('repRange'), corta('repRangoLabel')].join('\n');

// Contexto con un reloj fijo (para que "mes anterior" sea predecible) y un $
// que devuelve los valores de los inputs desde/hasta que le pongamos.
let inputs = { '#rep-desde': '', '#rep-hasta': '' };
let repPeriodVal = 'mesant';
const ctx = {
  Number, String, Math, Date, parseInt, isNaN, console,
  $: (sel) => ({ value: inputs[sel] || '' }),
  get repPeriod() { return repPeriodVal; },
};
vm.createContext(ctx);
vm.runInContext(bloque + '\n;globalThis.__lbl=repRangoLabel;', ctx);
const lbl = ctx.__lbl;

console.log('\n═══ Fechas manuales (desde / hasta) ═══');
inputs = { '#rep-desde': '2026-08-01', '#rep-hasta': '2026-08-31' };
ok('rango completo → "Del 01-08-2026 al 31-08-2026"', lbl() === 'Del 01-08-2026 al 31-08-2026', lbl());
inputs = { '#rep-desde': '2026-08-10', '#rep-hasta': '' };
ok('solo desde → "Desde 10-08-2026"', lbl() === 'Desde 10-08-2026', lbl());
inputs = { '#rep-desde': '', '#rep-hasta': '2026-08-20' };
ok('solo hasta → "Hasta 20-08-2026"', lbl() === 'Hasta 20-08-2026', lbl());

console.log('\n═══ Períodos prearmados (sin fechas manuales) ═══');
inputs = { '#rep-desde': '', '#rep-hasta': '' };
// Con el reloj real, "mes anterior" siempre es del día 1 al último día del mes pasado.
repPeriodVal = 'mesant';
const lblMesAnt = lbl();
ok('mes anterior arma un rango "Del … al …"', /^Del \d{2}-\d{2}-\d{4} al \d{2}-\d{2}-\d{4}$/.test(lblMesAnt), lblMesAnt);
repPeriodVal = 'todo';
ok('período "todo" → "Todo el historial"', lbl() === 'Todo el historial', lbl());
repPeriodVal = 'anio';
// "Este año" en repRange no pone tope final (end=2999) → queda "Desde 01-01…"
ok('período "año" arma una etiqueta con la fecha de inicio', /^(Del|Desde) \d{2}-\d{2}-\d{4}/.test(lbl()), lbl());

console.log('\n═══ Cableado: el PDF y el Excel usan el rango ═══');
ok('existe repRangoLabel (y en window)', /function repRangoLabel\(/.test(src) && /window\.repRangoLabel\s*=/.test(src));
ok('el Excel de reportes usa repRangoLabel en el "Período:"', /'Período:'/.test(src) && /'Hoy'\):repRangoLabel\(\)/.test(src));
ok('el PDF de reportes estampa el rango (subtítulo y encabezado)', /_rangoLbl=_esInvCorte\?''\:repRangoLabel\(\)/.test(src) && /_rangoLbl\?' · '\+_rangoLbl/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
