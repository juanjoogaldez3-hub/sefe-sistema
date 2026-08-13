// ============================================================
//  SEFE · test-saldo.js — LA COLUMNA DE SALDO TIENE QUE CERRAR
// ============================================================
//  Cómo se corre:   node test-saldo.js
//  No necesita instalar nada ni conectarse a internet.
//
//  La pestaña "Facturas y abonos" muestra un saldo que va bajando
//  renglón por renglón. Ese saldo TIENE que terminar en el mismo
//  número que calcula arInfo(), que es el que usa todo el resto del
//  sistema (cobros, dashboard, estados de cuenta, reportes).
//
//  Si los dos no coinciden, el sistema muestra dos verdades sobre
//  cuánto debe un cliente — y en cobranza eso es inaceptable.
// ============================================================

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };
const r2 = n => Math.round(n * 100) / 100;

// ── Cómo lo calcula el resto del sistema (copia de arInfo) ──
function saldoDeArInfo(f, notas) {
  const cr = notas.filter(d => d.facturaOrigenId === f.id && d.estado !== 'anulada')
                  .reduce((s, d) => s + d.totales.total, 0);
  const totalAjustado = r2(f.totales.total - cr);
  const abon = (f.abonos || []).filter(a => !a.anulado).reduce((s, a) => s + Number(a.monto), 0);
  return r2(totalAjustado - abon);
}

// ── Cómo lo calcula la columna nueva, renglón por renglón ───
function saldoDeLaColumna(f, notas) {
  const aplicaciones = [
    ...(f.abonos || []).map(a => ({ fecha: a.fecha, monto: Number(a.monto) || 0, anulado: !!a.anulado, orden: a._id || 0 })),
    ...notas.filter(d => d.facturaOrigenId === f.id && d.estado !== 'anulada')
            .map(d => ({ fecha: d.creada, monto: Number(d.totales.total) || 0, anulado: false, orden: d.id || 0 })),
  ].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')) || (a.orden - b.orden));

  let saldo = Number(f.totales.total) || 0;
  aplicaciones.forEach(x => { if (!x.anulado) saldo = r2(saldo - x.monto); });
  return saldo;
}

function comparar(nombre, f, notas, esperado) {
  const a = saldoDeArInfo(f, notas);
  const b = saldoDeLaColumna(f, notas);
  ok(nombre + ' — la columna cierra igual que el sistema', a === b, `sistema ${a} vs columna ${b}`);
  if (esperado !== undefined) ok(nombre + ' — el saldo es el esperado', b === esperado, `dio ${b}, esperado ${esperado}`);
}

console.log('\n═══ CASOS DE UNA FACTURA ═══');

comparar('factura sin abonos',
  { id: 1, totales: { total: 4800 }, abonos: [] }, [], 4800);

comparar('factura con dos abonos parciales',
  { id: 2, totales: { total: 5000 }, abonos: [
    { fecha: '2026-06-20', monto: 2000 }, { fecha: '2026-06-28', monto: 1500 } ] }, [], 1500);

comparar('factura pagada completa',
  { id: 3, totales: { total: 3200 }, abonos: [{ fecha: '2026-07-10', monto: 3200 }] }, [], 0);

comparar('abono anulado no baja el saldo',
  { id: 4, totales: { total: 1000 }, abonos: [
    { fecha: '2026-07-02', monto: 800, anulado: true },
    { fecha: '2026-07-05', monto: 300 } ] }, [], 700);

comparar('con nota de crédito',
  { id: 5, totales: { total: 3200 }, abonos: [{ fecha: '2026-07-10', monto: 3000 }] },
  [{ id: 90, facturaOrigenId: 5, creada: '2026-06-15', totales: { total: 200 }, estado: 'certificada' }], 0);

comparar('nota de crédito ANULADA no cuenta',
  { id: 6, totales: { total: 1000 }, abonos: [] },
  [{ id: 91, facturaOrigenId: 6, creada: '2026-06-15', totales: { total: 400 }, estado: 'anulada' }], 1000);

comparar('nota de crédito de otra factura no se mezcla',
  { id: 7, totales: { total: 1000 }, abonos: [] },
  [{ id: 92, facturaOrigenId: 999, creada: '2026-06-15', totales: { total: 400 }, estado: 'certificada' }], 1000);

console.log('\n═══ CENTAVOS (donde se rompen estas cosas) ═══');

comparar('montos con decimales',
  { id: 8, totales: { total: 1000.05 }, abonos: [
    { fecha: '2026-06-01', monto: 333.35 }, { fecha: '2026-06-02', monto: 333.35 },
    { fecha: '2026-06-03', monto: 333.35 } ] }, [], 0);

comparar('muchos abonos chicos',
  { id: 9, totales: { total: 100 }, abonos: Array.from({ length: 10 }, (_, i) =>
    ({ fecha: '2026-06-' + String(i + 1).padStart(2, '0'), monto: 3.33 })) }, [], 66.7);

comparar('nota de crédito con decimales',
  { id: 10, totales: { total: 999.99 }, abonos: [{ fecha: '2026-07-01', monto: 500.01 }] },
  [{ id: 93, facturaOrigenId: 10, creada: '2026-06-20', totales: { total: 99.98 }, estado: 'certificada' }], 400);

console.log('\n═══ ORDEN DE LOS RENGLONES ═══');
const f = { id: 11, totales: { total: 5000 }, abonos: [
  { fecha: '2026-06-28', monto: 1500, _id: 2 }, { fecha: '2026-06-20', monto: 2000, _id: 1 } ] };
const orden = [
  ...(f.abonos || []).map(a => ({ fecha: a.fecha, orden: a._id || 0 })),
].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || (a.orden - b.orden));
ok('los abonos salen del más viejo al más nuevo',
  orden[0].fecha === '2026-06-20' && orden[1].fecha === '2026-06-28',
  orden.map(x => x.fecha).join(' , '));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
