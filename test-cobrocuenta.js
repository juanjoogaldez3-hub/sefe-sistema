// ============================================================
//  SEFE · test-cobrocuenta.js — TODO COBRO EXIGE UNA CUENTA
// ============================================================
//  Cómo se corre:   node test-cobrocuenta.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Un cobro sin cuenta de banco no genera movimiento y descuadra el saldo
//  (fue el caso de RE-30202). Ahora los tres puntos donde se registra un cobro
//  —abono por factura, pago global y cobro en ruta— OBLIGAN a elegir la cuenta
//  antes de guardar. Esta prueba verifica que la validación esté en los tres.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const MSG = 'Elegí la cuenta de banco a la que entró el dinero';
const veces = src.split(MSG).length - 1;

console.log('\n═══ La validación existe en los tres puntos de cobro ═══');
ok('el mensaje de "elegí la cuenta" aparece 3 veces (factura, pago global, ruta)', veces === 3, 'apareció ' + veces + ' vez/veces');

// Guard del abono por factura: chequea el valor de #ab-cuenta y corta.
ok('cobro por factura corta si #ab-cuenta está vacío',
  /if\(!\(\$\('#ab-cuenta'\)\?\.value\)\)\{[^}]*Eleg[íi] la cuenta/.test(src));
// Guard del pago global: chequea cuentaBancoId y corta.
ok('pago global corta si no hay cuentaBancoId',
  /if\(!cuentaBancoId\)\{[^}]*Eleg[íi] la cuenta/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
