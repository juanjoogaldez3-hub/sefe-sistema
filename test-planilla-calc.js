// ============================================================
//  SEFE · test-planilla-calc.js — CÁLCULOS DE LA PLANILLA
// ============================================================
//  Cómo se corre:   node test-planilla-calc.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Carga las funciones REALES del motor de planilla y verifica la
//  aritmética: el rango de la quincena, la comisión (misma regla que
//  "Ventas por vendedor": 5% sobre la venta sin IVA), el IGSS laboral
//  automático y el neto de cada línea.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Extraer el bloque de funciones puras (de las constantes al _planSyncTotales).
const i = src.indexOf('const IGSS_LABORAL_PCT');
const j = src.indexOf('function _planSumas(');
if (i < 0 || j < 0) { console.log('✗ no se encontró el motor de planilla'); process.exit(1); }
const block = src.slice(i, j);

// Datos de prueba: un vendedor con dos facturas en la 2ª quincena de agosto.
const ctx = {
  console, Number, String, Math, Date, Object,
  vendedores: [{ id: 7, nombre: 'ANA' }],
  documentos: [
    { estado: 'certificada', tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-08-20', totales: { total: 1120 } },
    { estado: 'facturado',   tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-08-31', totales: { total: 2240 } },
    { estado: 'certificada', tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-08-10', totales: { total: 9999 } }, // 1ª quincena → NO cuenta
    { estado: 'notaCredito', tipoDoc: 'notaCredito', vendedorNombre: 'ANA', creada: '2026-08-21', totales: { total: 500 } }, // nota → NO cuenta
  ],
  empleados: [
    { id: 1, nombre: 'ANA',  activo: true, vendedorId: 7, sueldoBase: 2000, bonifIncentivo: 125, cuentaBancoId: null },
    { id: 2, nombre: 'BETO', activo: true, vendedorId: null, sueldoBase: 3000, bonifIncentivo: 125 },
    { id: 3, nombre: 'CARO', activo: false, vendedorId: null, sueldoBase: 1000, bonifIncentivo: 125 }, // inactivo → NO entra
  ],
};
vm.createContext(ctx);
vm.runInContext(block + '\nglobalThis.__api={_rangoQuincena,_comisionEmpleado,_construirLineas,_lineaNeto,_lineaIngresos,_lineaDesc};', ctx);
const A = ctx.__api;

console.log('\n═══ Rango de la quincena ═══');
let q1 = A._rangoQuincena(2026, 8, 1), q2 = A._rangoQuincena(2026, 8, 2);
ok('1ª quincena: 01 al 15', q1.desde === '2026-08-01' && q1.hasta === '2026-08-15', JSON.stringify(q1));
ok('2ª quincena: 16 al último día (agosto→31)', q2.desde === '2026-08-16' && q2.hasta === '2026-08-31', JSON.stringify(q2));
ok('2ª quincena de febrero termina el 28 (2026 no bisiesto)', A._rangoQuincena(2026, 2, 2).hasta === '2026-02-28');

console.log('\n═══ Comisión (5% sobre venta sin IVA) ═══');
// Sólo las 2 facturas de la 2ª quincena: (1120+2240)/1.12*0.05 = 3000/1.12... no: 3360/1.12=3000, *0.05=150
const com = A._comisionEmpleado(ctx.empleados[0], q2.desde, q2.hasta);
ok('suma sólo las facturas de la quincena, sin nota de crédito', com === 150, 'dio ' + com);
ok('empleado sin vendedor no tiene comisión', A._comisionEmpleado(ctx.empleados[1], q2.desde, q2.hasta) === 0);

console.log('\n═══ Líneas de la planilla ═══');
const L = A._construirLineas(q2.desde, q2.hasta);
ok('sólo entran los empleados activos (2 de 3)', L.length === 2, 'dieron ' + L.length);
const ana = L.find(x => x.nombre === 'ANA');
ok('ANA trae su comisión automática (150)', ana && ana.comisiones === 150);
// IGSS = 4.83% de (sueldo 2000 + comisión 150) = 2150 * 0.0483 = 103.845 → 103.85
ok('IGSS laboral automático 4.83% sobre sueldo+comisión', ana && ana.igss === 103.85, ana && ('dio ' + ana.igss));

console.log('\n═══ Neto de la línea ═══');
// Ingresos: 2000+125+150 = 2275 ; Descuentos: IGSS 103.85 ; Neto = 2171.15
ok('ingresos = sueldo+bonif+comisión+otros', A._lineaIngresos(ana) === 2275, 'dio ' + A._lineaIngresos(ana));
ok('neto = ingresos − descuentos', Math.round(A._lineaNeto(ana) * 100) / 100 === 2171.15, 'dio ' + A._lineaNeto(ana));
// Con ISR editable
ana.isr = 200;
ok('el ISR resta al neto', Math.round(A._lineaNeto(ana) * 100) / 100 === 1971.15, 'dio ' + A._lineaNeto(ana));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
