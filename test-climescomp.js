// ============================================================
//  SEFE · test-climescomp.js — COMPARATIVA CLIENTE/MES RESPETA EL RANGO
// ============================================================
//  Cómo se corre:   node test-climescomp.js
//  No necesita instalar nada ni conectarse a internet.
//
//  El reporte "Comparativa cliente/mes" ANTES forzaba el mes en curso y el
//  anterior sin importar el rango elegido: si elegías Jul–Ago, te metía una
//  columna Septiembre vacía y comparaba Ago→Sep (todos −100%). Ahora respeta
//  el rango: las columnas son los meses con ventas dentro del rango, y si el
//  rango es de un solo mes trae el anterior para poder comparar.
//
//  Esta prueba valida (1) el cableado (que ya no fuerza el mes en curso y que
//  usa el rango) y (2) la lógica de selección de meses con datos de ejemplo.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Cableado: respeta el rango, no fuerza el mes en curso ═══');
const rama = src.slice(src.indexOf('COMPARATIVA CLIENTE MES CON MES'), src.indexOf('COMPARATIVA PRODUCTO/MES POR CLIENTE'));
ok('ya NO fuerza el mes en curso como columna', !/mesesSet\.add\(_mkDate\(_ahora\)\)/.test(rama), 'sigue el add(_ahora)');
ok('ya NO arma un rango forzado _rComp hasta hoy', !/_rComp=\{start:/.test(rama));
ok('filtra las ventas por el rango (rCC) que incluye el mes en curso', /_filtrarVentas\(rCC\)/.test(rama));
ok('si el rango es de un mes, trae el mes anterior para comparar', /ventasC\.length&&mesesSet\.size<2/.test(rama) && /prevDate=new Date\(ba,bm-2,1\)/.test(rama));

console.log('\n═══ Los presets ("3 meses", "mes anterior") incluyen el mes en curso ═══');
ok('desliza la ventana para que TERMINE en el mes en curso', /if\(r\.end<_iniMesActual\)/.test(rama) && /_hoy\.getMonth\(\)-_span,1\)/.test(rama));
ok('respeta las fechas puestas a mano (no desliza)', /const _hayFechasManual=/.test(rama) && /if\(!_hayFechasManual\)/.test(rama));

console.log('\n═══ Lógica de selección de meses (con datos de ejemplo) ═══');
// Réplica exacta de la lógica del reporte, para fijar el comportamiento.
function enRango(iso, r) { const t = new Date(iso); return t >= r.start && t <= r.end; }
const mesKey = d => { const f = new Date(d.creada); return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0'); };
const _mkDate = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
function calcMeses(documentos, r) {
  const _filtrar = rr => documentos.filter(d => enRango(d.creada, rr));
  let ventasC = _filtrar(r);
  let mesesSet = new Set(); ventasC.forEach(d => mesesSet.add(mesKey(d)));
  if (ventasC.length && mesesSet.size < 2) {
    const base = [...mesesSet].sort()[0];
    const [ba, bm] = base.split('-').map(Number);
    const prevDate = new Date(ba, bm - 2, 1);
    const rExt = { start: (r.start < prevDate ? r.start : prevDate), end: r.end };
    ventasC = _filtrar(rExt);
    mesesSet = new Set(); ventasC.forEach(d => mesesSet.add(mesKey(d)));
    mesesSet.add(_mkDate(prevDate)); mesesSet.add(base);
  }
  return [...mesesSet].sort();
}
const docs = [
  { creada: '2026-06-15' }, { creada: '2026-07-10' }, { creada: '2026-07-20' },
  { creada: '2026-08-05' }, { creada: '2026-08-25' }, { creada: '2026-09-02' }
];
const D = s => new Date(s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const c1 = calcMeses(docs, { start: D('2026-07-01T00:00:00'), end: D('2026-08-31T23:59:59') });
ok('rango Jul–Ago → columnas [Jul, Ago] (NO mete Septiembre)', eq(c1, ['2026-07', '2026-08']), c1.join(','));
const c2 = calcMeses(docs, { start: D('2026-08-01T00:00:00'), end: D('2026-08-31T23:59:59') });
ok('rango de un solo mes (Ago) → trae Julio para comparar', eq(c2, ['2026-07', '2026-08']), c2.join(','));
const c3 = calcMeses(docs, { start: D('2026-09-01T00:00:00'), end: D('2999-01-01') });
ok('"Este mes" (Sep, abierto) → [Ago, Sep]', eq(c3, ['2026-08', '2026-09']), c3.join(','));
const c4 = calcMeses(docs, { start: D('2026-01-01T00:00:00'), end: D('2999-01-01') });
ok('"Este año" → todos los meses con ventas', eq(c4, ['2026-06', '2026-07', '2026-08', '2026-09']), c4.join(','));
const c5 = calcMeses(docs, { start: D('2026-12-01T00:00:00'), end: D('2026-12-31T23:59:59') });
ok('rango sin ventas → sin columnas (muestra "no hay ventas")', eq(c5, []), c5.join(','));

console.log('\n═══ Deslizamiento de presets: el mes en curso siempre entra ═══');
// Réplica de la lógica de deslizamiento (la ventana se corre para terminar hoy).
function deslizar(r, hoy, hayManual) {
  if (hayManual) return r;
  const iniMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  if (r.end < iniMesActual) {
    const span = (r.end.getFullYear() * 12 + r.end.getMonth()) - (r.start.getFullYear() * 12 + r.start.getMonth());
    return { start: new Date(hoy.getFullYear(), hoy.getMonth() - span, 1), end: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59) };
  }
  return r;
}
const HOY = new Date(2026, 8, 21); // 21-sep-2026
// "Últimos 3 meses" en septiembre daba Jun–Ago; ahora Jul–Sep (incluye el actual)
const p3 = deslizar({ start: new Date(2026, 5, 1), end: new Date(2026, 8, 0, 23, 59, 59) }, HOY, false);
ok('"Últimos 3 meses" → Jul, Ago, Sep (incluye septiembre)', eq(calcMeses(docs, p3), ['2026-07', '2026-08', '2026-09']), calcMeses(docs, p3).join(','));
// "Mes anterior" (Ago) → ahora incluye el actual: Ago, Sep
const pma = deslizar({ start: new Date(2026, 7, 1), end: new Date(2026, 8, 0, 23, 59, 59) }, HOY, false);
ok('"Mes anterior" → Ago, Sep (incluye septiembre)', eq(calcMeses(docs, pma), ['2026-08', '2026-09']), calcMeses(docs, pma).join(','));
// Con fechas a mano NO se desliza
const man = deslizar({ start: new Date(2026, 6, 1), end: new Date(2026, 7, 31, 23, 59, 59) }, HOY, true);
ok('con fechas a mano (Jul–Ago) NO mete septiembre', eq(calcMeses(docs, man), ['2026-07', '2026-08']), calcMeses(docs, man).join(','));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
