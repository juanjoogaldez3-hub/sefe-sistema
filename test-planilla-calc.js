// ============================================================
//  SEFE · test-planilla-calc.js — CÁLCULOS DE LA PLANILLA MENSUAL
// ============================================================
//  Cómo se corre:   node test-planilla-calc.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Carga las funciones REALES del motor y verifica la aritmética:
//  el rango del mes, la comisión (5% sobre la venta sin IVA), el IGSS
//  laboral automático, el neto del sueldo y su partición en 2 quincenas,
//  y que las comisiones queden APARTE del neto del sueldo.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Extraer el bloque de funciones puras (de las constantes al _planSumas).
const i = src.indexOf('const IGSS_LABORAL_PCT');
const j = src.indexOf('function _planSumas(');
if (i < 0 || j < 0) { console.log('✗ no se encontró el motor de planilla'); process.exit(1); }
const block = src.slice(i, j);

// Datos de prueba: ANA (vendedora) con 2 facturas en agosto.
const ctx = {
  console, Number, String, Math, Date, Object,
  vendedores: [{ id: 7, nombre: 'ANA' }],
  documentos: [
    { estado: 'certificada', tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-08-05', totales: { total: 1120 } },
    { estado: 'facturado',   tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-08-20', totales: { total: 2240 } },
    { estado: 'notaCredito', tipoDoc: 'notaCredito', vendedorNombre: 'ANA', creada: '2026-08-21', totales: { total: 500 } }, // nota → NO cuenta
    { estado: 'certificada', tipoDoc: 'factura', vendedorNombre: 'ANA', creada: '2026-07-30', totales: { total: 9999 } }, // otro mes → NO cuenta
  ],
  empleados: [
    { id: 1, nombre: 'ANA',  activo: true, vendedorId: 7, sueldoBase: 2000, bonifIncentivo: 250, cuentaBancoId: null },
    { id: 2, nombre: 'BETO', activo: true, vendedorId: null, sueldoBase: 3000, bonifIncentivo: 250 },
    { id: 3, nombre: 'CARO', activo: false, vendedorId: null, sueldoBase: 1000, bonifIncentivo: 250 }, // inactivo → NO entra
  ],
};
vm.createContext(ctx);
vm.runInContext(block + '\nglobalThis.__api={_rangoMes,_comisionEmpleado,_construirLineas,_netoSueldo,_lineaIngFijos,_lineaDesc,_montoQ1,_montoQ2,_comLinea};', ctx);
const A = ctx.__api;

console.log('\n═══ Rango del mes ═══');
const r = A._rangoMes(2026, 8);
ok('agosto: del 01 al 31', r.desde === '2026-08-01' && r.hasta === '2026-08-31', JSON.stringify(r));
ok('la etiqueta es "Agosto 2026"', r.etiqueta === 'Agosto 2026', r.etiqueta);
ok('febrero 2026 (no bisiesto) termina el 28', A._rangoMes(2026, 2).hasta === '2026-02-28');

console.log('\n═══ Comisión del mes (5% sobre venta sin IVA) ═══');
// (1120+2240)/1.12*0.05 = 3360/1.12=3000 *0.05 = 150
const com = A._comisionEmpleado(ctx.empleados[0], r.desde, r.hasta);
ok('suma las facturas del mes, sin nota de crédito ni otros meses', com === 150, 'dio ' + com);
ok('empleado sin vendedor no tiene comisión', A._comisionEmpleado(ctx.empleados[1], r.desde, r.hasta) === 0);

console.log('\n═══ Líneas de la planilla (mensual) ═══');
const L = A._construirLineas(r.desde, r.hasta);
ok('sólo entran los empleados activos (2 de 3)', L.length === 2, 'dieron ' + L.length);
const ana = L.find(x => x.nombre === 'ANA');
ok('ANA trae su comisión automática (150)', ana && A._comLinea(ana) === 150);
// IGSS = 4.83% del sueldo base 2000 = 96.6  (NO sobre comisiones)
ok('IGSS 4.83% sobre el sueldo base (no sobre comisiones)', ana && ana.igss === 96.6, ana && ('dio ' + ana.igss));

console.log('\n═══ Neto del sueldo y quincenas ═══');
// Ingresos fijos: 2000+250 = 2250 ; deducc: 96.6 ; neto sueldo = 2153.4
ok('neto del sueldo = ingresos fijos − deducciones (sin comisiones)', Math.round(A._netoSueldo(ana) * 100) / 100 === 2153.4, 'dio ' + A._netoSueldo(ana));
// Las quincenas suman el neto del sueldo
ok('las 2 quincenas suman el neto del sueldo', Math.round((A._montoQ1(ana) + A._montoQ2(ana)) * 100) / 100 === 2153.4, A._montoQ1(ana) + '+' + A._montoQ2(ana));
ok('cada quincena es la mitad (1076.70)', A._montoQ1(ana) === 1076.70 && A._montoQ2(ana) === 1076.70, A._montoQ1(ana) + ' / ' + A._montoQ2(ana));

console.log('\n═══ Comisiones aparte ═══');
ok('la comisión NO está dentro del neto del sueldo', A._netoSueldo(ana) === 2153.4 && A._comLinea(ana) === 150);
// El ISR editable resta al neto del sueldo
ana.isr = 200;
ok('el ISR resta al neto del sueldo', Math.round(A._netoSueldo(ana) * 100) / 100 === 1953.4, 'dio ' + A._netoSueldo(ana));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
