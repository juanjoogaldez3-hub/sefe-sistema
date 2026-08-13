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

console.log('\n═══ MOVIMIENTOS: CADA FACTURA CON SUS ABONOS ═══');
// La tabla de Movimientos de la ficha agrupa los abonos con SU factura,
// y ordena los grupos por fecha de emisión. Antes era una lista plana
// por fecha, y un abono de julio quedaba lejos de la factura de junio
// que estaba pagando.
function armarMovimientos(facts) {
  const movs = [];
  facts.forEach(f => {
    const desde = movs.length;
    movs.push({ fecha: f.creada, doc: f.doc, detalle: 'Factura', cargo: f.total, abono: 0 });
    (f.abonos || []).forEach(a => movs.push({ fecha: a.fecha, doc: f.doc, detalle: 'Abono', cargo: 0, abono: a.monto }));
    for (let i = desde; i < movs.length; i++) {
      movs[i].fFac = f.creada; movs[i].idFac = f.id; movs[i].esFac = (i === desde);
    }
  });
  movs.sort((a, b) =>
    (new Date(a.fFac || 0) - new Date(b.fFac || 0))
    || ((a.idFac || 0) - (b.idFac || 0))
    || ((b.esFac ? 1 : 0) - (a.esFac ? 1 : 0))
    || (new Date(a.fecha || 0) - new Date(b.fecha || 0)));
  let bal = 0; movs.forEach(m => { bal += m.cargo - m.abono; m.balance = bal; });
  return movs;
}

// Los abonos de la primera factura se pagaron DESPUÉS de emitida la
// segunda: es el caso donde el orden plano los separaba.
const movs = armarMovimientos([
  { id: 1, doc: 'A-1042', creada: '2026-06-01', total: 5000, abonos: [
    { fecha: '2026-07-05', monto: 2000 }, { fecha: '2026-07-20', monto: 1500 }] },
  { id: 2, doc: 'A-1067', creada: '2026-06-15', total: 3200, abonos: [
    { fecha: '2026-06-25', monto: 3200 }] },
]);

ok('los abonos quedan pegados a su factura',
  movs.map(m => m.doc).join(',') === 'A-1042,A-1042,A-1042,A-1067,A-1067',
  movs.map(m => m.doc).join(','));
ok('la factura encabeza su grupo',
  movs[0].detalle === 'Factura' && movs[3].detalle === 'Factura',
  movs.map(m => m.detalle).join(','));
ok('los grupos van por fecha de emisión de la factura',
  movs[0].fFac === '2026-06-01' && movs[3].fFac === '2026-06-15');
ok('dentro del grupo, los abonos por su propia fecha',
  movs[1].fecha === '2026-07-05' && movs[2].fecha === '2026-07-20');
ok('el saldo final es el correcto (8200 − 6700)',
  movs[movs.length - 1].balance === 1500, 'dio ' + movs[movs.length - 1].balance);

// Una factura sin abonos no debe romper el agrupado
const movs2 = armarMovimientos([
  { id: 1, doc: 'A-1', creada: '2026-06-01', total: 1000, abonos: [] },
  { id: 2, doc: 'A-2', creada: '2026-05-01', total: 500, abonos: [{ fecha: '2026-05-10', monto: 500 }] },
]);
ok('factura sin abonos no rompe el orden',
  movs2.map(m => m.doc).join(',') === 'A-2,A-2,A-1',
  movs2.map(m => m.doc).join(','));
ok('el saldo final sigue cuadrando', movs2[movs2.length - 1].balance === 1000,
  'dio ' + movs2[movs2.length - 1].balance);

console.log('\n═══ SIGLAS: RE recibo, RT retención, NC nota ═══');
// Una retención no es un tipo aparte en la base: es un abono cuyo
// método empieza con "Retenci". Misma regla que el reporte de
// Retenciones IVA/ISR.
const esRetencion = a => /^Retenci/i.test(String((a && a.metodo) || ''));
const refRecibo = a => {
  const sigla = esRetencion(a) ? 'RT' : 'RE';
  const num = (a && (a.noRecibo || a.referencia)) || '';
  return num ? (sigla + '-' + num) : sigla;
};

ok('abono con recibo → RE-1201', refRecibo({ noRecibo: '1201' }) === 'RE-1201', refRecibo({ noRecibo: '1201' }));
ok('retención IVA → RT', refRecibo({ metodo: 'Retención IVA', noRecibo: '77' }) === 'RT-77', refRecibo({ metodo: 'Retención IVA', noRecibo: '77' }));
ok('retención ISR → RT', refRecibo({ metodo: 'Retencion ISR', noRecibo: '88' }) === 'RT-88', refRecibo({ metodo: 'Retencion ISR', noRecibo: '88' }));
ok('sin recibo usa la referencia', refRecibo({ referencia: '5253' }) === 'RE-5253', refRecibo({ referencia: '5253' }));
ok('sin nada queda sólo la sigla', refRecibo({}) === 'RE', refRecibo({}));
ok('el método "Transferencia" NO es retención', refRecibo({ metodo: 'Transferencia', noRecibo: '9' }) === 'RE-9', refRecibo({ metodo: 'Transferencia', noRecibo: '9' }));

// En el Excel se pone negrita sólo a lo que NO es un documento.
const esDoc = d => /^(FA |RE|RT|NC)/.test(d);
ok('FA, RE, RT y NC NO van en negrita',
  ['FA A-1042', 'RE-1201', 'RT-77', 'NC-14'].every(esDoc));
ok('el nombre del cliente y los totales SÍ van en negrita',
  !esDoc('TIENDA LA BENDICIÓN') && !esDoc('TOTALES CLIENTE'));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
