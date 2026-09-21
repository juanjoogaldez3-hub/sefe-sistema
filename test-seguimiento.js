// ============================================================
//  SEFE · test-seguimiento.js — SEMÁFORO DE SEGUIMIENTO DE CLIENTES
// ============================================================
//  Cómo se corre:   node test-seguimiento.js
//
//  _segEstadoVentas(ventas, hoy) mira el historial de compras de un cliente
//  y decide su estado: dejo / reponer / cayendo / creciendo / ok / nunca,
//  con su razón y una prioridad (a quién llamar primero). Función pura.
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _segEstadoVentas(');
const fin = src.indexOf('window._segEstadoVentas=');
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _segEstadoVentas'); process.exit(1); }
const ctx = { Date, Math, Number, isNaN }; vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=_segEstadoVentas;', ctx);
const seg = ctx.__f;

const HOY = new Date(2026, 8, 21); // 21-sep-2026
// Helpers para generar compras
const cada = (desde, hasta, dias, monto) => { const out = []; for (let t = new Date(desde); t <= new Date(hasta); t = new Date(t.getTime() + dias * 86400000)) out.push({ fecha: t.toISOString().slice(0, 10), monto }); return out; };

console.log('\n═══ Estados ═══');
ok('nunca compró → estado "nunca"', seg([], HOY).estado === 'nunca');

// Regular cada ~15 días hasta mediados de julio → hace >2 meses que no compra
const dejo = seg(cada('2026-04-01', '2026-07-15', 15, 800), HOY);
ok('regular que se calló hace 68 días → "dejo"', dejo.estado === 'dejo', dejo.estado + ' diasSin=' + dejo.diasSinComprar + ' cad=' + dejo.cadencia);
ok('"dejo" trae razón con los días', /Dej[oó] de comprar/.test(dejo.razon));

// Regular cada ~15, última compra hace 25 días (se pasó del ciclo, pero no tanto)
const rep = seg([...cada('2026-05-01', '2026-08-12', 15, 500), { fecha: '2026-08-27', monto: 500 }], HOY);
ok('se pasó de su ciclo (25 días, cadencia ~15) → "reponer"', rep.estado === 'reponer', rep.estado + ' diasSin=' + rep.diasSinComprar + ' cad=' + rep.cadencia);

// Comprador frecuente pero este mes gasta mucho menos que los mismos días del mes pasado
const cae = seg([
  ...cada('2026-08-01', '2026-08-20', 4, 300), // agosto fuerte
  { fecha: '2026-09-05', monto: 150 }, { fecha: '2026-09-18', monto: 100 } // sept flojo, compra reciente
], HOY);
ok('compra reciente pero va muy abajo del ritmo → "cayendo"', cae.estado === 'cayendo', cae.estado + ' var=' + cae.varPct);

// Este mes va MUCHO más que los mismos días del mes pasado
const crece = seg([
  { fecha: '2026-08-10', monto: 200 },
  ...cada('2026-09-02', '2026-09-20', 5, 500) // sept fuerte y reciente
], HOY);
ok('va por arriba de su ritmo → "creciendo"', crece.estado === 'creciendo', crece.estado + ' var=' + crece.varPct);

// Comprador reciente y parejo mes a mes → sin señal
const alDia = seg([
  ...cada('2026-08-01', '2026-08-20', 5, 300),
  ...cada('2026-09-01', '2026-09-20', 5, 300)
], HOY);
ok('reciente y parejo → "ok" (al día)', alDia.estado === 'ok', alDia.estado + ' var=' + alDia.varPct);

console.log('\n═══ Prioridad: el grande pesa más ═══');
const grande = seg(cada('2026-04-01', '2026-07-15', 15, 5000), HOY); // dejó, grande
const chico = seg(cada('2026-05-01', '2026-08-27', 15, 200), HOY);   // reponer, chico
ok('un cliente grande que se fue prioriza sobre uno chico atrasado', grande.prioridad > chico.prioridad, grande.prioridad + ' vs ' + chico.prioridad);
ok('la cadencia se calcula (≈15)', dejo.cadencia >= 13 && dejo.cadencia <= 17, dejo.cadencia);

console.log('\n═══ Cableado (app) ═══');
ok('existe _seguimientoClientes y la lista "para llamar"', /function _seguimientoClientes\(/.test(src) && /function _seguimientoParaLlamar\(/.test(src) && /const SEG_ATENCION=\['dejo','cayendo','reponer'\]/.test(src));
ok('el botón de seguimiento crea un recordatorio prellenado', /function crearSeguimiento\(clienteId\)/.test(src) && /openRecordatorio\(null,\{tipo:'cliente'/.test(src) && /titulo:'Seguimiento: '/.test(src));
ok('openRecordatorio acepta título/nota/asignado prellenados', /preset\.titulo\?_escRec\(preset\.titulo\)/.test(src) && /preset\.asignadoA\|\|currentUser/.test(src));

console.log('\n═══ Cableado: pestaña de reporte + panel del inicio ═══');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
ok('existe la pestaña "Seguimiento de clientes" en Reportes', /data-r="seguimiento"/.test(html) && /'seguimiento'/.test(src));
ok('el reporte está registrado (REP_TIPOS + título)', /'comision','seguimiento'/.test(src) && /seguimiento:'SEGUIMIENTO DE CLIENTES'/.test(src));
ok('el reporte se renderiza (rama repType===seguimiento) con el botón', /repType==='seguimiento'/.test(src) && /crearSeguimiento\(\$\{c\.clienteId\}\)/.test(src));
ok('el seguimiento no usa el rango de fechas (barra oculta)', /repType==='seguimiento'/.test(src) && /_sinFecha=_esFoto\|\|repType==='seguimiento'/.test(src));
ok('el panel del inicio usa el semáforo y ofrece ver el reporte', /function renderSeguimiento\(/.test(src) && /_seguimientoClientes\(\)/.test(src) && /abrirReporte\('seguimiento'\)/.test(src));
ok('existe abrirReporte para saltar al reporte desde el inicio', /window\.abrirReporte=function\(tipo\)/.test(src));
ok('el reporte se puede ordenar por estado del semáforo', /setRepFiltro\('segOrden',this\.value\)/.test(src) && /Estado \(sem[aá]foro\)/.test(src) && /const _porEstado=\(repFiltros\.segOrden\|\|'prioridad'\)==='estado'/.test(src));
ok('al ordenar por estado usa el rango dejo<cayendo<reponer y agrupa', /const _rankSeg=\{dejo:0,cayendo:1,reponer:2/.test(src) && /if\(_porEstado\)filtrada\.sort/.test(src) && /_porEstado&&c\.estado!==_grupoAnt/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
