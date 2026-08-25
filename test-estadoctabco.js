// ============================================================
//  SEFE · test-estadoctabco.js — ESTADO DE CUENTA BANCARIO (Excel)
// ============================================================
//  Cómo se corre:   node test-estadoctabco.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Dos cosas: (1) que _estadoCuentaBancoData calcule bien el saldo inicial,
//  los totales de entradas/salidas, el saldo corriente y el final; (2) que la
//  fila de TOTALES del Excel (ahora en formato contable) ponga los totales en
//  Debe(salidas) y Haber(entradas), en ese orden.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// ---- (1) Datos: _estadoCuentaBancoData ----
const ini = src.indexOf('function _estadoCuentaBancoData(');
const fin = src.indexOf('\n}', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _estadoCuentaBancoData'); process.exit(1); }
const fnSrc = src.slice(ini, fin + 2);

const ctx = {
  Number, String, console,
  fdate: x => x, CAT_MOV_LBL: {},
  cuentasBanco: [{ id: 1, nombre: 'Bi Monetaria', saldoInicial: 100, tipo: 'monetaria' }],
  movimientosBanco: [
    { cuentaId: 1, fecha: '2026-07-15', tipo: 'entrada', monto: 1000, anulado: false }, // antes del rango
    { cuentaId: 1, fecha: '2026-08-01', tipo: 'entrada', monto: 50, anulado: false },
    { cuentaId: 1, fecha: '2026-08-02', tipo: 'salida', monto: 30, anulado: false },
    { cuentaId: 1, fecha: '2026-08-03', tipo: 'entrada', monto: 20, anulado: false },
    { cuentaId: 1, fecha: '2026-08-04', tipo: 'entrada', monto: 999, anulado: true }, // anulado: no cuenta
  ],
};
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=_estadoCuentaBancoData;', ctx);
const f = ctx.__f;

console.log('\n═══ Totales y saldos del período (agosto) ═══');
const d = f(1, '2026-08-01', '2026-08-31');
ok('saldo inicial = apertura + lo de antes del rango (100 + 1000)', d.saldoAntes === 1100, 'dio ' + d.saldoAntes);
ok('total entradas del rango = 70 (50 + 20; el anulado no cuenta)', d.totEnt === 70, 'dio ' + d.totEnt);
ok('total salidas del rango = 30', d.totSal === 30);
ok('saldo final = 1100 + 70 − 30 = 1140', d.saldoFinal === 1140, 'dio ' + d.saldoFinal);
ok('3 movimientos en el rango (el anulado se excluye)', d.filas.length === 3);
ok('el saldo corriente acumula (1150, 1120, 1140)',
  d.filas.map(x => x.saldo).join(',') === '1150,1120,1140', d.filas.map(x => x.saldo).join(','));

// ---- (2) Fila TOTALES en el Excel: formato contable Debe/Haber ----
console.log('\n═══ Fila TOTALES del Excel: Debe(salidas)/Haber(entradas) ═══');
const idxT = src.indexOf("filas.push(['','TOTALES'");
const lineaT = idxT >= 0 ? src.slice(idxT, src.indexOf('\n', idxT)).replace(/\s/g, '') : '';
// Cabecera: Fecha,Concepto,Categoría,Referencia,Origen,Debe,Haber,Saldo
// Debe(5)=salidas=d.totSal, Haber(6)=entradas=d.totEnt, Saldo(7) vacío.
ok('los totales quedan en Debe(salidas) y Haber(entradas)', /d\.totSal,d\.totEnt,''\]/.test(lineaT), lineaT);
ok('NO quedó el orden viejo (Entrada/Salida)', !/d\.totEnt,d\.totSal,''\]/.test(lineaT));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
