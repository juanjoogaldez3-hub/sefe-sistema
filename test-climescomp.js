// ============================================================
//  SEFE · test-climescomp.js — LA COMPARATIVA NO PARTE AL CLIENTE
// ============================================================
//  Cómo se corre:   node test-climescomp.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Problema real (agosto 2026): las facturas viejas traían el nombre
//  comercial vacío (se agrupaban por el nombre legal) y las nuevas lo
//  traen lleno (se agrupaban por el comercial). El reporte "Comparativa
//  cliente/mes" agrupaba por nombre, así que el MISMO cliente (mismo
//  cliente_id) se partía en dos filas y agosto caía en la otra → salía "—".
//
//  Esta prueba extrae el bloque REAL de agrupación de index.html (desde
//  'const mesKey=' hasta 'const filas=...') y verifica que un cliente con
//  dos nombres, pero mismo id, quede en UNA sola fila con sus 8 meses.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// Extraer el bloque real: de la definición de mesKey hasta armar 'filas'.
// Ojo: hay dos reportes con mesKey; anclamos al de la comparativa (climescomp).
const anclaComp = src.indexOf("else if(repType==='climescomp'){");
const ini = src.indexOf('const mesKey=d=>{const f=new Date(d.creada);', anclaComp);
const finMarca = 'const filas=Object.entries(porCli).sort((a,b)=>b[1].total-a[1].total);';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró el bloque de la comparativa'); process.exit(1); }
const bloque = src.slice(ini, fin + finMarca.length);

function correr(ventas) {
  const ctx = { Number, String, Set, Object, Date, ventas };
  vm.createContext(ctx);
  vm.runInContext(bloque + '\n;globalThis.__out={porCli,filas,meses};', ctx);
  return ctx.__out;
}

// Fabricar el caso BONANZA: mismo cliente_id 1822, dos nombres.
function doc(id, com, nom, mesNum, monto) {
  return { clienteId: id, clienteComercial: com, clienteNombre: nom,
    creada: '2026-' + String(mesNum).padStart(2, '0') + '-15T12:00:00', totales: { total: monto } };
}

const ventas = [
  // BONANZA (id 1822): ene–jul con comercial vacío, agosto con comercial lleno
  doc(1822, null, 'BONANZA LA PONDEROSA, S.A.', 1, 11084),
  doc(1822, null, 'BONANZA LA PONDEROSA, S.A.', 7, 18180.20),
  doc(1822, 'BONANZA LA PONDEROSA', 'BONANZA LA PONDEROSA, SOCIEDAD ANÓNIMA', 8, 13210),
  // Otro cliente distinto (id 1821) que NO se debe mezclar con el anterior
  doc(1821, null, 'ALFONSO MARROQUIN (BONANZA PONDEROSA)', 7, 4265),
  // Cliente sin id: debe agrupar por nombre (sin romperse)
  doc(null, null, 'CLIENTE SIN ID', 8, 500),
];

const { porCli, filas, meses } = correr(ventas);

console.log('\n═══ El cliente con dos nombres queda en UNA fila ═══');
ok('BONANZA (id 1822) es una sola entrada', !!porCli['#1822'], 'no se agrupó por id');
ok('esa fila tiene enero', (porCli['#1822'].meses['2026-01'] || 0) === 11084);
ok('esa fila tiene julio', (porCli['#1822'].meses['2026-07'] || 0) === 18180.20);
ok('esa fila TIENE agosto (antes salía —)', (porCli['#1822'].meses['2026-08'] || 0) === 13210, 'agosto no se sumó a la fila');
ok('su total junta los 3 meses', Math.abs(porCli['#1822'].total - (11084 + 18180.20 + 13210)) < 0.01, 'total ' + porCli['#1822'].total);
ok('la etiqueta usa el nombre comercial', porCli['#1822'].nombre === 'BONANZA LA PONDEROSA', 'quedó ' + porCli['#1822'].nombre);

console.log('\n═══ No se mezcla con otro cliente distinto ═══');
ok('el id 1821 es fila aparte', !!porCli['#1821'] && porCli['#1821'].total === 4265);

console.log('\n═══ Cliente sin id: sigue funcionando por nombre ═══');
ok('agrupa por nombre cuando no hay id', !!porCli['CLIENTE SIN ID'] && porCli['CLIENTE SIN ID'].meses['2026-08'] === 500);

console.log('\n═══ Agosto aparece como columna ═══');
ok('el eje de meses incluye 2026-08', meses.includes('2026-08'));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
