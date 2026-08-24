// ============================================================
//  SEFE · test-repsort.js — ORDENAR REPORTES SIN ROMPER GRUPOS
// ============================================================
//  Cómo se corre:   node test-repsort.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Al ordenar una tabla de reporte por clic en el encabezado, sólo se deben
//  reordenar las FILAS DE DATOS; las de estructura (encabezado de grupo,
//  subtotal, total y separador) tienen que quedar fijas para no romper la
//  jerarquía. Esa decisión la toma _esFilaEstructural. Esta prueba extrae la
//  función real de index.html y la corre contra filas simuladas.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function _esFilaEstructural(tr){');
const fin = src.indexOf('function enhanceTable(', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _esFilaEstructural'); process.exit(1); }
const fnSrc = src.slice(ini, fin);

const ctx = { Number, console };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=_esFilaEstructural;', ctx);
const esEstructural = ctx.__f;

// Fabricar un <tr> simulado con lo mínimo que usa la función.
function tr({ grupoKey = false, colspan = 1, cell0 = '', totalsRow = false, texto = null } = {}) {
  const t = texto != null ? texto : cell0;
  return {
    tagName: 'TR',
    dataset: totalsRow ? { totalsRow: '1' } : {},
    hasAttribute: a => a === 'data-grupo-key' ? grupoKey : false,
    children: [{ getAttribute: k => k === 'colspan' ? String(colspan) : null }],
    cells: [{ textContent: cell0 }],
    textContent: t,
  };
}

console.log('\n═══ Filas de DATOS (se reordenan) ═══');
ok('fila de cliente normal', esEstructural(tr({ cell0: 'BONANZA LA PONDEROSA' })) === false);
ok('fila de producto', esEstructural(tr({ cell0: 'TRK294331 TOALLA' })) === false);
ok('cliente que empieza con "Tot..." pero no es total', esEstructural(tr({ cell0: 'Tostaduría La Esperanza' })) === false, 'lo tomó como total');

console.log('\n═══ Filas de ESTRUCTURA (quedan fijas) ═══');
ok('banda de grupo (data-grupo-key)', esEstructural(tr({ grupoKey: true, cell0: 'JUAN PÉREZ' })) === true);
ok('fila con colspan (encabezado/separador)', esEstructural(tr({ colspan: 8, cell0: 'JUAN PÉREZ' })) === true);
ok('TOTAL GENERAL', esEstructural(tr({ cell0: 'TOTAL GENERAL' })) === true);
ok('Total <vendedor>', esEstructural(tr({ cell0: 'Total Juan Pérez:' })) === true);
ok('Subtotal <cliente>', esEstructural(tr({ cell0: 'Subtotal BONANZA:' })) === true);
ok('TOTALES', esEstructural(tr({ cell0: 'TOTALES' })) === true);
ok('fila de totales marcada (data-totals-row)', esEstructural(tr({ totalsRow: true, cell0: '' })) === true);
ok('separador vacío', esEstructural(tr({ cell0: '', texto: '   ' })) === true);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
