// ============================================================
//  SEFE · test-climescomp.js — LA COMPARATIVA CLIENTE/MES
// ============================================================
//  Cómo se corre:   node test-climescomp.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Cubre dos cosas del reporte "Comparativa cliente/mes":
//
//  1) NO PARTIR AL CLIENTE. Las facturas viejas traían el nombre comercial
//     vacío (se agrupaban por el nombre legal) y las nuevas lo traen lleno
//     (por el comercial). Se agrupa por cliente_id: el mismo cliente queda
//     en UNA fila con todos sus meses.
//
//  2) SIEMPRE MOSTRAR EL MES EN CURSO Y EL ANTERIOR. Es una comparativa:
//     aunque se filtre "Este mes", tiene que salir este mes y el anterior
//     para poder comparar; y el mes en curso es columna aunque no tenga
//     ventas todavía.
//
//  La prueba extrae el bloque REAL del reporte de index.html y lo corre con
//  una fecha fija (19-ago-2026) para que sea determinística.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

// Extraer el bloque real: de la definición de mesKey hasta armar 'filas'.
// Ojo: hay dos reportes con mesKey; anclamos al de la comparativa (climescomp).
const anclaComp = src.indexOf("else if(repType==='climescomp'){");
const ini = src.indexOf('const mesKey=d=>{const f=new Date(d.creada);', anclaComp);
// El orden de 'filas' ahora es un bloque de varias líneas (Total / Más creció /
// Más cayó); tomamos hasta el cierre de ese .sort(...).
const finAncla = 'return b[1].total-a[1].total;';
const finIdx = src.indexOf(finAncla, ini);
const fin = finIdx >= 0 ? src.indexOf('});', finIdx) : -1;
if (ini < 0 || finIdx < 0 || fin < 0) { console.log('✗ no se encontró el bloque de la comparativa'); process.exit(1); }
const bloque = src.slice(ini, fin + 2);

// Fecha fija: 19 de agosto de 2026 (así "mes en curso" = agosto, anterior = julio).
const NOW = '2026-08-19T12:00:00';
class FakeDate extends Date { constructor(...a) { if (a.length === 0) super(NOW); else super(...a); } }
const enRango = (iso, r) => { const t = new FakeDate(iso); return t >= r.start && t <= r.end; };

function correr(documentos, r, repFiltros) {
  const ctx = { Number, String, Set, Object, Date: FakeDate, enRango,
    documentos, r, repFiltros: repFiltros || { cliente: '', vendedor_simple: '' } };
  vm.createContext(ctx);
  vm.runInContext(bloque + '\n;globalThis.__out={porCli,filas,meses};', ctx);
  return ctx.__out;
}

// Una factura certificada. mesNum = mes (1-12) del año 2026.
function doc(id, com, nom, mesNum, monto) {
  return { clienteId: id, clienteComercial: com, clienteNombre: nom,
    estado: 'certificada', tipoDoc: 'cambiaria',
    creada: '2026-' + String(mesNum).padStart(2, '0') + '-15T12:00:00', totales: { total: monto } };
}

// "Este mes": rango que arranca el 1 de agosto (como lo arma la app).
const rEsteMes = { start: new FakeDate('2026-08-01T00:00:00'), end: new FakeDate('2999-01-01') };

// ── Caso 1: BONANZA con dos nombres pero mismo id, filtrando "Este mes" ──
const ventas1 = [
  doc(1900, null, 'CLIENTE VIEJO JUNIO', 6, 7777),                      // JUNIO: NO debe salir en "Este mes"
  doc(1822, null, 'BONANZA LA PONDEROSA, S.A.', 7, 18180.20),           // julio (nombre viejo)
  doc(1822, 'BONANZA LA PONDEROSA', 'BONANZA ...S.A.', 8, 13210),        // agosto (nombre comercial)
  doc(1821, null, 'ALFONSO MARROQUIN', 7, 4265),                        // otro cliente, sólo julio
  doc(null, null, 'CLIENTE SIN ID', 8, 500),                           // sin id: agrupa por nombre
];
const r1 = correr(ventas1, rEsteMes);

console.log('\n═══ "Este mes" trae EXACTAMENTE este mes y el anterior ═══');
ok('aparece agosto (mes en curso)', r1.meses.includes('2026-08'));
ok('aparece julio (mes anterior), aunque el filtro era "este mes"', r1.meses.includes('2026-07'), 'meses: ' + r1.meses.join(','));
ok('junio (más viejo) NO aparece', !r1.meses.includes('2026-06'), 'meses: ' + r1.meses.join(','));
ok('son exactamente dos columnas', r1.meses.length === 2, 'meses: ' + r1.meses.join(','));

console.log('\n═══ El cliente con dos nombres queda en UNA fila ═══');
ok('BONANZA (id 1822) es una sola entrada', !!r1.porCli['#1822'], 'no se agrupó por id');
ok('esa fila tiene julio', (r1.porCli['#1822'].meses['2026-07'] || 0) === 18180.20);
ok('esa fila TIENE agosto', (r1.porCli['#1822'].meses['2026-08'] || 0) === 13210);
ok('su total junta los dos meses', Math.abs(r1.porCli['#1822'].total - (18180.20 + 13210)) < 0.01, 'total ' + r1.porCli['#1822'].total);
ok('la etiqueta usa el nombre comercial', r1.porCli['#1822'].nombre === 'BONANZA LA PONDEROSA', 'quedó ' + r1.porCli['#1822'].nombre);
ok('no mezcla con otro id (1821)', !!r1.porCli['#1821'] && r1.porCli['#1821'].total === 4265);
ok('cliente sin id agrupa por nombre', !!r1.porCli['CLIENTE SIN ID']);

// ── Caso 2: sin ventas en agosto → igual debe salir la columna de agosto ──
const ventas2 = [ doc(1822, null, 'BONANZA LA PONDEROSA, S.A.', 7, 9000) ]; // sólo julio
const r2 = correr(ventas2, rEsteMes);

console.log('\n═══ El mes en curso es columna aunque no tenga ventas ═══');
ok('agosto aparece igual (sin ventas)', r2.meses.includes('2026-08'), 'meses: ' + r2.meses.join(','));
ok('julio también', r2.meses.includes('2026-07'));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
