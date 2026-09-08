// ============================================================
//  SEFE · test-editarmov.js — EDITAR UN MOVIMIENTO DE BANCO
// ============================================================
//  Cómo se corre:   node test-editarmov.js
//
//  Si se comete un error al subir un pago/movimiento manual, se puede EDITAR:
//  fecha, monto, CUENTA, categoría, No. de autorización, concepto y — en las
//  salidas — el BENEFICIARIO de la póliza. También los INGRESOS manuales
//  (que antes solo tenían Anular) ahora tienen botón Editar. Esta prueba fija
//  ese cableado.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ El botón Editar aparece donde debe ═══');
// En la fila del movimiento: Editar para pólizas Y para manuales (aunque no
// tengan póliza, p.ej. un ingreso/depósito manual).
ok('la fila muestra Editar para pólizas o movimientos manuales', /\(m\.poliza\|\|m\.origen==='manual'\)\?`<button[^`]*openEditarPoliza\(\$\{m\.id\}\)/.test(src));
ok('los manuales conservan el botón Anular', /m\.origen==='manual'\?`<button[^`]*anularMovimientoBancoUI\(\$\{m\.id\}\)/.test(src));

console.log('\n═══ El editor trae los campos correctos ═══');
const ed = src.slice(src.indexOf('window.openEditarPoliza='), src.indexOf('window.openEditarPoliza=') + 4200);
ok('sirve para entradas y salidas (título según haya póliza)', /titulo=m\.poliza\?\('Editar póliza '\+numPol\):'Editar movimiento'/.test(ed));
ok('permite editar la cuenta (solo en manuales)', /id="ep-cuenta"\$\{esManual\?''\:' disabled'\}/.test(ed));
ok('permite editar el beneficiario en salidas manuales', /mostrarBenef=esManual&&esSalida/.test(ed) && /id="ep-benef"/.test(ed));
ok('el monto solo se edita en manuales', /id="ep-monto"[^>]*\$\{esManual\?''\:' disabled'\}/.test(ed));

console.log('\n═══ Al guardar aplica los cambios ═══');
ok('guarda la cuenta nueva en manuales', /if\(esManual\)\{m\.monto=nuevoMonto;const cta=\$\('#ep-cuenta'\)\?\.value;if\(cta\)m\.cuentaId=Number\(cta\)/.test(ed));
ok('guarda el beneficiario en salidas manuales', /if\(mostrarBenef\)\{const b=\$\('#ep-benef'\);if\(b\)m\.beneficiario=b\.value\.trim\(\)\|\|null/.test(ed));
ok('persiste con guardarMovimientoBanco y registra en auditoría', /guardarMovimientoBanco\(m\)/.test(ed) && /logAudit\(m\.poliza\?'Póliza editada':'Movimiento editado'/.test(ed));
ok('solo reimprime la póliza si el movimiento tiene póliza', /if\(m\.poliza\)\{try\{polizaChequePDF\(m\)/.test(ed));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
