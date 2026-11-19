// ============================================================
//  SEFE · test-pagoglobal-anular.js — ANULAR ABONOS DE UN PAGO GLOBAL
// ============================================================
//  Cómo se corre:   node test-pagoglobal-anular.js
//
//  Caso real (recibo 33252, 19-11-2026): un "Pago global" cobró 2 facturas
//  (Q285 + Q830) con UN depósito de Q1,115. La entrada del banco quedó ligada
//  al CLIENTE, no a cada factura; al anular los abonos el sistema no la
//  encontraba y quedaba viva → Q1,115 de más en la cuenta. Esta prueba
//  EJECUTA la lógica real de js/app-5.js (en vivo, no test-fuente.js).
// ============================================================
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/js/app-5.js', 'utf8');
const desde = src.indexOf('function _movBancoDeAbono(f,a){');
const hasta = src.indexOf('window._anularEntradaBancoDeAbono=');
if (desde < 0 || hasta < 0) { console.log('✗ no encontré las funciones en js/app-5.js'); process.exit(1); }
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };
const S = { documentos: [], movimientosBanco: [], clientes: [{ id: 5009, nit: '1234567' }, { id: 5010, nit: '1234567' }, { id: 9, nit: '999' }] };
const F = new Function('S', 'let documentos=S.documentos, movimientosBanco=S.movimientosBanco, clientes=S.clientes; const window={}; function guardarMovimientoBanco(){}\n' +
  src.slice(desde, hasta) + '\nreturn {_movBancoDeAbono,_abonosMismoDeposito,_anularEntradaBancoDeAbono};')(S);
const ab = (monto, extra) => Object.assign({ monto, referencia: '21744205', noRecibo: '33252', cuentaBancoId: 6, anulado: false }, extra || {});
const fac = (id, cli, abono) => ({ id, clienteId: cli, abonos: [abono] });
const reset = (mvExtra) => {
  S.documentos.length = 0; S.movimientosBanco.length = 0;
  S.documentos.push(fac(5104, 5009, ab(285)), fac(5142, 5010, ab(830)));   // 5010 = sede (mismo NIT)
  S.movimientosBanco.push(Object.assign({ id: 1278, cuentaId: 6, tipo: 'entrada', monto: 1115, concepto: 'Cobro 33252 · OPCIONES', origen: 'cobro', origenId: 5009, referencia: '21744205', anulado: false }, mvExtra || {}));
};
const mv = () => S.movimientosBanco[0];

console.log('\n═══ Encontrar la entrada de un pago global ═══');
reset();
ok('la encuentra desde la factura de la sede (mismo NIT, origenId = cliente)', F._movBancoDeAbono(S.documentos[1], S.documentos[1].abonos[0]) === mv());
ok('los dos abonos son del mismo depósito', F._abonosMismoDeposito(S.documentos[0].abonos[0]).length === 1);
reset({ referencia: 'OTRA' });
ok('no la toma si la referencia es otra', F._movBancoDeAbono(S.documentos[0], S.documentos[0].abonos[0]) === null);
reset({ origenId: 9 });
ok('no la toma si es de otro cliente (otro NIT)', F._movBancoDeAbono(S.documentos[0], S.documentos[0].abonos[0]) === null);
reset({ cuentaId: 7 });
ok('no la toma si es de otra cuenta', F._movBancoDeAbono(S.documentos[0], S.documentos[0].abonos[0]) === null);

console.log('\n═══ Anular de a uno ═══');
reset();
let a = S.documentos[0].abonos[0]; a.anulado = true; let r = F._anularEntradaBancoDeAbono(S.documentos[0], a);
ok('anular el de Q285 descuenta solo Q285 (queda Q830 vivo)', r && r._parcial && mv().monto === 830 && !mv().anulado, JSON.stringify(mv()));
a = S.documentos[1].abonos[0]; a.anulado = true; r = F._anularEntradaBancoDeAbono(S.documentos[1], a);
ok('anular el último anula el depósito completo', r && mv().anulado === true);

console.log('\n═══ Lo de siempre sigue igual ═══');
S.documentos.length = 0; S.movimientosBanco.length = 0;
S.documentos.push(fac(7001, 9, ab(500, { referencia: 'R1', noRecibo: '40000' })));
S.movimientosBanco.push({ id: 1, cuentaId: 6, monto: 500, origen: 'cobro', origenId: 7001, referencia: 'R1', anulado: false });
a = S.documentos[0].abonos[0]; a.anulado = true; F._anularEntradaBancoDeAbono(S.documentos[0], a);
ok('cobro de una sola factura: se anula entero', mv().anulado === true && mv().monto === 500);
S.documentos.length = 0; S.movimientosBanco.length = 0;
S.documentos.push(fac(7002, 9, ab(900, { referencia: 'BOL9', noRecibo: '40001' })));
S.movimientosBanco.push({ id: 2, cuentaId: 6, monto: 1000, origen: 'cobro', origenId: 7002, referencia: 'BOL9', anulado: false });
a = S.documentos[0].abonos[0]; a.anulado = true; F._anularEntradaBancoDeAbono(S.documentos[0], a);
ok('cobro en ruta con sobrepago (depósito 1000, abono 900): se anula entero', mv().anulado === true && mv().monto === 1000);

console.log('\n═══ Editar la cuenta de un solo abono (app-5.js) ═══');
ok('cuenta los otros abonos del depósito ANTES de modificar el abono', /const mvViejo=_movBancoDeAbono\(f,a\);\s*\/\/[^\n]*\n\s*const _hermanos=mvViejo\?_abonosMismoDeposito\(a\)\.length:0;/.test(src));
ok('si el depósito es compartido, descuenta su parte y registra la entrada en la cuenta nueva', /if\(_compartido\)\{[\s\S]{0,400}mvViejo\.monto=Math\.round\(\(Number\(mvViejo\.monto\)-montoViejo\)[\s\S]{0,300}registrarMovimientoBanco\(\{cuentaId:nCta/.test(src));

console.log(fallos ? `\n✗ ${fallos} de ${pruebas} pruebas fallaron` : `\n✓ TODO BIEN — ${pruebas} pruebas pasaron`);
process.exit(fallos ? 1 : 0);
