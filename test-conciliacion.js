// ============================================================
//  SEFE · test-conciliacion.js — CONCILIACIÓN BANCARIA (motor)
// ============================================================
//  Cómo se corre:   node test-conciliacion.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El motor tiene dos partes: (1) parseCSVBanco lee el CSV de Bi en Línea
//  —que viene con líneas de cabecera, líneas en blanco y descripciones con
//  COMAS sin comillas— y saca fecha/tipo/monto de cada movimiento;
//  (2) conciliarBanco cruza esas filas contra los movimientos de SEFE y
//  arma tres grupos: conciliados, sólo-banco y sólo-SEFE. Esta prueba
//  carga las funciones reales y valida ambas.
// ============================================================
const vm = require('vm');
const fs = require('fs');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _fechaBI(');
const fin = src.indexOf('window.conciliarBanco=conciliarBanco;');
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el motor de conciliación'); process.exit(1); }
const code = src.slice(ini, fin);
const ctx = { Number, String, Math, Date, parseFloat, isNaN, console, window: {} };
vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.__p=parseCSVBanco;globalThis.__c=conciliarBanco;', ctx);
const parse = ctx.__p, conciliar = ctx.__c;

// CSV de ejemplo (mismo formato que Bi en Línea): cabecera con comas y
// acentos, línea en blanco en medio, y descripción con coma.
const CSV = [
  'Tipo de Transacciones,',
  ',DE = Deposito,,,CQ = Pago de Cheque,',
  '',
  'Cuenta: 2880062118 - SEFE, SOCIEDAD ANONIMA',
  'Saldo inicial (GTQ): 51380.06',
  'Del 01/08/2026 al 31/08/2026',
  '',
  'Fecha,TT,Descripcion,No. Doc,Debe (GTQ),Haber (GTQ),Saldo (GTQ)',
  '01-08-2026,ND,PAGO DE PRESTAMO/11019633920010,86455677,7308.18,,44071.88',
  '03-08-2026,DE,AGENCIA ROOSEVELT,2123611,,525.00,44596.88',
  '04-08-2026,NC,ACH EL VIEJO CAFE, S.A. PAGO PROV.,97460,,2180.00,46776.88',
  '',
  '04-08-2026,ND,PLANILLA,229001,116.00,,46660.88',
  '05-08-2026,DE,AGENCIA EL ENCINAL,29531383,,300.00,46960.88',
].join('\n');

console.log('\n═══ Parseo del CSV ═══');
const r = parse(CSV);
ok('lee la cuenta (con la coma del nombre)', r.cuenta === '2880062118 - SEFE, SOCIEDAD ANONIMA', r.cuenta);
ok('lee el saldo inicial', r.saldoInicial === 51380.06, r.saldoInicial);
ok('lee el período (fechas a YYYY-MM-DD)', r.desde === '2026-08-01' && r.hasta === '2026-08-31', r.desde + '/' + r.hasta);
ok('parsea 5 filas (ignora cabecera y líneas en blanco)', r.filas.length === 5, 'dio ' + r.filas.length);

const f0 = r.filas[0], f2 = r.filas[2];
ok('Debe → salida (préstamo Q7308.18)', f0.tipo === 'salida' && f0.monto === 7308.18, JSON.stringify(f0));
ok('Haber → entrada (depósito Q525)', r.filas[1].tipo === 'entrada' && r.filas[1].monto === 525, JSON.stringify(r.filas[1]));
ok('descripción con coma queda entera', f2.descripcion === 'ACH EL VIEJO CAFE, S.A. PAGO PROV.', JSON.stringify(f2.descripcion));
ok('esa fila es entrada de Q2180 con su No.Doc', f2.tipo === 'entrada' && f2.monto === 2180 && f2.noDoc === '97460');
ok('fecha DD-MM-YYYY → YYYY-MM-DD', f0.fecha === '2026-08-01', f0.fecha);

console.log('\n═══ Cruce contra movimientos de SEFE ═══');
// SEFE: depósito 525 (mismo día), El Viejo Cafe 2180 (1 día después → dentro de tolerancia),
// y un cobro de 999 que el banco no tiene. NO tiene el préstamo, la planilla ni el depósito de 300.
const movsSEFE = [
  { id: 1, fecha: '2026-08-03', tipo: 'entrada', monto: 525, anulado: false },
  { id: 2, fecha: '2026-08-05', tipo: 'entrada', monto: 2180, anulado: false },
  { id: 3, fecha: '2026-08-10', tipo: 'entrada', monto: 999, anulado: false },
  { id: 9, fecha: '2026-08-03', tipo: 'entrada', monto: 525, anulado: true }, // anulado: no debe usarse
];
const c = conciliar(r.filas, movsSEFE, { toleranciaDias: 5 });
ok('2 conciliados (525 y 2180)', c.conciliados.length === 2, 'dio ' + c.conciliados.length);
ok('el 2180 casó aunque la fecha difiere 1 día', c.conciliados.some(x => x.banco.monto === 2180 && x.sefe.id === 2));
ok('3 sólo en el banco (préstamo, planilla, depósito 300)', c.soloBanco.length === 3, 'dio ' + c.soloBanco.length);
ok('1 sólo en SEFE (el cobro de 999)', c.soloSEFE.length === 1 && c.soloSEFE[0].id === 3, JSON.stringify(c.soloSEFE));
ok('el movimiento ANULADO no se usó para conciliar', !c.conciliados.some(x => x.sefe.id === 9));
ok('resumen: saldo final del banco = última fila', c.resumen.saldoFinalBanco === 46960.88, c.resumen.saldoFinalBanco);
ok('resumen cuenta salidas sólo-banco (7308.18+116=7424.18)', Math.abs(c.resumen.soloBancoSalidas - 7424.18) < 0.01, c.resumen.soloBancoSalidas);

console.log('\n═══ Emparejamiento 1 a 1 (no reusar el mismo movimiento) ═══');
// Dos entradas de 640 el mismo día en el banco; SEFE tiene sólo una → 1 casa, 1 queda sólo-banco.
const dos640 = parse([
  'Cuenta: X',
  'Fecha,TT,Descripcion,No. Doc,Debe (GTQ),Haber (GTQ),Saldo (GTQ)',
  '15-08-2026,NC,TRANSFERENCIA,15114849,,640.00,1000.00',
  '15-08-2026,NC,TRANSFERENCIA,15150228,,640.00,1640.00',
].join('\n'));
const c2 = conciliar(dos640.filas, [{ id: 7, fecha: '2026-08-15', tipo: 'entrada', monto: 640, anulado: false }]);
ok('sólo 1 de las dos de Q640 concilia', c2.conciliados.length === 1 && c2.soloBanco.length === 1);

console.log('\n═══ Cableado de la pantalla (que el botón exista y llame a la función) ═══');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
ok('index.html tiene el botón de conciliación', /onclick="openConciliacion\(\)"/.test(html));
ok('existe la función openConciliacion', /function openConciliacion\(/.test(src) && /window\.openConciliacion\s*=/.test(src));
ok('existe el manejador para registrar faltantes (_concRegistrar)', /window\._concRegistrar\s*=/.test(src));
ok('el formulario de movimiento acepta pre-llenado (openMovimientoBanco(pre,onDone))', /function openMovimientoBanco\(pre,onDone\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
