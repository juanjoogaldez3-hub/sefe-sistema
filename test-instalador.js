// ============================================================
//  SEFE · test-instalador.js — EL INSTALADOR ESTÁ AL DÍA
// ============================================================
//  Cómo se corre:   node test-instalador.js
//  No necesita internet ni instalar nada.
//
//  Qué cuida: supabase/INSTALAR-CLIENTE.sql se genera juntando todas
//  las migraciones. Si alguien agrega una migración y se olvida de
//  regenerarlo, la base de un cliente nuevo quedaría incompleta. Esta
//  prueba falla justo en ese caso.
//
//  Para arreglar una falla:  node scripts/build-instalador.js
// ============================================================

const fs = require('fs');
const { construirInstalador, SALIDA, DIR_MIG } = require('./scripts/build-instalador.js');

let f = 0, n = 0;
const ok = (t, c, e) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) f++; };

console.log('\n═══ El instalador está generado y al día ═══');

ok('existe supabase/INSTALAR-CLIENTE.sql', fs.existsSync(SALIDA), 'falta el archivo');

const esperado = construirInstalador();
const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
ok('el instalador coincide con las migraciones actuales',
   actual === esperado,
   'está desactualizado — corré: node scripts/build-instalador.js');

// Cada migración tiene que aparecer nombrada dentro del instalador.
const migraciones = fs.readdirSync(DIR_MIG).filter(x => x.endsWith('.sql')).sort();
migraciones.forEach(m => ok('incluye ' + m, actual.indexOf(m) !== -1, 'no aparece'));

// La baseline (las tablas) tiene que ir ANTES que la capa 2 (que las usa).
const iBase = actual.indexOf('baseline_esquema');
const iCapa2 = actual.indexOf('rls_capa2');
ok('la baseline va antes que la capa 2', iBase > -1 && iCapa2 > -1 && iBase < iCapa2,
   'orden incorrecto');

console.log('\n' + (f === 0 ? `✓ TODO BIEN — ${n} pruebas pasaron` : `✗ ${f} de ${n} fallaron`) + '\n');
process.exit(f ? 1 : 0);
