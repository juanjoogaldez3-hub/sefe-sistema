// ============================================================
//  SEFE · test-fechas.js — TODO EL SISTEMA MUESTRA dd-mm-yyyy
// ============================================================
//  Cómo se corre:   node test-fechas.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Toma fdate() y fdatehora() del index.html real y las prueba en la
//  zona horaria de Guatemala.
//
//  El caso que más importa: un texto "2026-08-01" JS lo interpreta
//  como medianoche UTC, y al mostrarlo en Guatemala (UTC-6) se corre
//  un día hacia atrás — mostraría 31-07-2026. En un sistema de
//  facturación una fecha corrida un día es un problema serio.
// ============================================================

process.env.TZ = 'America/Guatemala';

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// Extraer las tres funciones del index.html
const trozos = ['function _fechaDe(d){', 'function fdate(d){', 'function fdatehora(d){']
  .map(inicio => {
    const i = src.indexOf(inicio);
    if (i < 0) { console.log('✗ no se encontró: ' + inicio); process.exit(1); }
    // Cortar hasta la llave de cierre de la función (primera línea "}")
    const fin = src.indexOf('\n}', i);
    return src.slice(i, fin + 2);
  });

const ctx = { console, Date, String, Number, isNaN };
vm.createContext(ctx);
vm.runInContext(trozos.join('\n') + '\n;globalThis.__f=fdate;globalThis.__fh=fdatehora;', ctx);
const fdate = ctx.__f, fdatehora = ctx.__fh;

console.log('\n═══ fdate() — zona horaria de Guatemala ═══');
ok('"2026-08-01" NO se corre al día anterior', fdate('2026-08-01') === '01-08-2026', fdate('2026-08-01'));
ok('"2026-01-01" tampoco (cambio de año)', fdate('2026-01-01') === '01-01-2026', fdate('2026-01-01'));
ok('"2026-12-31" tampoco', fdate('2026-12-31') === '31-12-2026', fdate('2026-12-31'));

console.log('\n═══ fdate() — formatos de entrada ═══');
ok('día y mes con cero adelante', fdate('2026-03-05') === '05-03-2026', fdate('2026-03-05'));
ok('fecha con hora (ISO)', fdate('2026-08-12T14:35:00') === '12-08-2026', fdate('2026-08-12T14:35:00'));
ok('objeto Date', fdate(new Date(2026, 7, 12)) === '12-08-2026', fdate(new Date(2026, 7, 12)));

console.log('\n═══ fdate() — casos vacíos y basura ═══');
ok('null da guion', fdate(null) === '—', fdate(null));
ok('vacío da guion', fdate('') === '—', fdate(''));
ok('undefined da guion', fdate(undefined) === '—', fdate(undefined));
ok('texto inválido da guion, no "NaN-NaN-NaN"', fdate('cualquier cosa') === '—', fdate('cualquier cosa'));

console.log('\n═══ fdatehora() ═══');
ok('fecha con hora', fdatehora('2026-08-12T14:35:00') === '12-08-2026 14:35', fdatehora('2026-08-12T14:35:00'));
ok('hora con cero adelante', fdatehora('2026-08-12T09:05:00') === '12-08-2026 09:05', fdatehora('2026-08-12T09:05:00'));
ok('medianoche', fdatehora('2026-08-12T00:00:00') === '12-08-2026 00:00', fdatehora('2026-08-12T00:00:00'));
ok('sólo fecha queda a las 00:00', fdatehora('2026-08-12') === '12-08-2026 00:00', fdatehora('2026-08-12'));
ok('basura da guion', fdatehora('xx') === '—', fdatehora('xx'));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
