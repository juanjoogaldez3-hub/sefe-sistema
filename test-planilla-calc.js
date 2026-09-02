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
// Cada empleado tiene 2 quincenas independientes (q1, q2)
ok('la línea trae las 2 quincenas (q1, q2)', ana && ana.q1 && ana.q2, JSON.stringify(ana && Object.keys(ana)));
// IGSS = 4.83% del sueldo base 2000 = 96.6, y por defecto cae en la 2ª quincena
ok('IGSS 4.83% del sueldo base, arranca en la 2ª quincena', ana && ana.q2.igss === 96.6 && ana.q1.igss === 0, ana && ('q1=' + ana.q1.igss + ' q2=' + ana.q2.igss));

console.log('\n═══ Neto del sueldo y quincenas ═══');
// q1: sueldo 1000 + bonif 125 = 1125 (sin descuentos) ; q2: 1000+125−96.6 = 1028.4
ok('1ª quincena = 1125 (sin descuentos)', A._montoQ1(ana) === 1125, 'dio ' + A._montoQ1(ana));
ok('2ª quincena = 1028.40 (con el IGSS)', A._montoQ2(ana) === 1028.40, 'dio ' + A._montoQ2(ana));
// Neto del sueldo del mes = las dos quincenas
ok('neto del sueldo del mes = q1 + q2 = 2153.40', Math.round(A._netoSueldo(ana) * 100) / 100 === 2153.4, 'dio ' + A._netoSueldo(ana));

console.log('\n═══ Comisiones aparte ═══');
ok('la comisión NO está dentro del neto del sueldo', A._netoSueldo(ana) === 2153.4 && A._comLinea(ana) === 150);
// El ISR editable de una quincena resta sólo a esa quincena
ana.q2.isr = 200;
ok('el ISR de la 2ª quincena resta a esa quincena', A._montoQ2(ana) === 828.40, 'dio ' + A._montoQ2(ana));
ok('el ISR baja el neto del mes a 1953.40', Math.round(A._netoSueldo(ana) * 100) / 100 === 1953.4, 'dio ' + A._netoSueldo(ana));
// Las quincenas son independientes: mover un valor en q1 no toca q2
ana.q1.otrosDesc = 100;
ok('editar la 1ª quincena no cambia la 2ª', A._montoQ1(ana) === 1025 && A._montoQ2(ana) === 828.40, A._montoQ1(ana) + ' / ' + A._montoQ2(ana));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
