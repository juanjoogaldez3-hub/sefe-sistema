// ============================================================
//  SEFE · test-cobrosrecibidos.js — ENCONTRAR ABONOS POR RECIBO EN COBROS
// ============================================================
//  Cómo se corre:   node test-cobrosrecibidos.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE
//
//  Cuando un cliente pagaba varias facturas con UN recibo (pago global), en
//  Cobros costaba encontrar esos abonos: la tabla sólo lista facturas, hay que
//  abrir los "Abonos" de cada una, y el buscador no conocía los recibos.
//  Ahora:
//   - pestaña "Cobros recibidos": un renglón por recibo, con sus facturas,
//     y buscador por recibo, factura, cliente o referencia;
//   - el buscador de "Por cobrar" encuentra la factura por su No. de recibo;
//   - el historial de abonos de una factura avisa si el recibo pagó otras.
//
//  OJO: esta prueba lee el código ACTUAL de js/app-*.js (no test-fuente.js).
// ============================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
let src = '';
for (let i = 1; i <= 13; i++) src += fs.readFileSync(path.join(__dirname, 'js', 'app-' + i + '.js'), 'utf8') + '\n';

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };
const trozo = (ini, fin) => {
  const i = src.indexOf(ini), j = src.indexOf(fin, i);
  if (i < 0 || j < 0) { console.log('✗ no se encontró: ' + ini); process.exit(1); }
  return src.slice(i, j + fin.length);
};
const codigo = [
  trozo('// ══════════ COBROS RECIBIDOS', 'window.verCobroGrupo=verCobroGrupo;'),
  trozo('function _cuentaAbonoHTML(a){', '\n}\n'),
  trozo('function openHistorialAbonos(id){', '\n}\n'),
].join('\n') + '\n;globalThis.__set=(k,v)=>{ if(k==="buscar")_cbrBuscar=v; if(k==="cli")_cbrCli=v; };';

function nuevoCtx(documentos) {
  const els = {};
  const el = id => (els[id] = els[id] || { id, style: {}, innerHTML: '', textContent: '', set className(v) {} });
  const ctx = {
    console, Number, String, Date, Math, Set, Map, Array, Object, isNaN, parseInt,
    window: {}, documentos, clientes: [{ id: 1, nombre: 'Ferretería El Sol' }, { id: 2, nombre: 'Agroservicio Luna' }], cuentasBanco: [],
    deEmpresa: a => a, fechaHoyGT: () => '2026-11-17', money: n => 'Q' + Number(n).toFixed(2), fdate: f => String(f || '').slice(0, 10),
    refPed: d => 'PED-' + d.id, canRegistrarAbono: () => true, canAnular: () => true,
    arInfo: d => { const ab = (d.abonos || []).filter(a => !a.anulado).reduce((s, a) => s + a.monto, 0); return { saldo: Math.round((d.total - ab) * 100) / 100 }; },
    enhanceTable: () => {}, openMod: (t, h) => { ctx._modal = { t, h }; }, closeMod: () => {},
    $: sel => el(sel.replace('#', '')), _els: els,
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  return ctx;
}
const ab = o => ({ fecha: '2026-11-15', monto: 100, metodo: 'Efectivo', referencia: '', noRecibo: '28005', registradoPor: 'Ana', anulado: false, ...o });
const docs = () => [
  { id: 1, tipoDoc: 'cambiaria', clienteId: 1, clienteComercial: 'Ferretería El Sol', serie: 'F1', numeroDte: '4410', total: 1500, abonos: [ab({ monto: 1200 })] },
  { id: 2, tipoDoc: 'cambiaria', clienteId: 1, clienteComercial: 'Ferretería El Sol', serie: 'F1', numeroDte: '4418', total: 900, abonos: [ab({ monto: 850.75 })] },
  { id: 3, tipoDoc: 'cambiaria', clienteId: 2, clienteComercial: 'Agroservicio Luna', serie: 'F1', numeroDte: '4500', total: 500, abonos: [ab({ noRecibo: '28005', monto: 75, fecha: '2026-11-01' })] }, // mismo número, OTRO cliente
  { id: 4, tipoDoc: 'cambiaria', clienteId: 1, clienteComercial: 'Ferretería El Sol', serie: 'F1', numeroDte: '4420', total: 300, abonos: [ab({ noRecibo: '28005', anulado: true })] }, // anulado
  { id: 5, tipoDoc: 'cambiaria', clienteId: 2, clienteComercial: 'Agroservicio Luna', serie: 'F1', numeroDte: '4501', total: 400, abonos: [ab({ noRecibo: '', metodo: 'Retención IVA', monto: 12, fecha: '2026-11-10' })] }, // sin recibo
  { id: 6, tipoDoc: 'cambiaria', clienteId: 1, estado: 'anulada', serie: 'F1', numeroDte: '4430', total: 300, abonos: [ab({})] }, // factura anulada
];

console.log('\n═══ 1. Qué abonos van en el mismo recibo ═══');
{
  const ctx = nuevoCtx(docs());
  const d = ctx.documentos;
  const g = ctx._grupoReciboCobro(d[0], d[0].abonos[0]);
  ok('junta las 2 facturas del recibo 28005 de El Sol', g.length === 2 && g.map(x => x.d.id).join() === '1,2', JSON.stringify(g.map(x => x.d.id)));
  ok('no mezcla el mismo número de otro cliente, anulados ni facturas anuladas', !g.some(x => [3, 4, 6].includes(x.d.id)));
  ok('un abono sin recibo (retención) queda suelto', ctx._grupoReciboCobro(d[4], d[4].abonos[0]).length === 1);
}

console.log('\n═══ 2. Pestaña "Cobros recibidos" ═══');
{
  const ctx = nuevoCtx(docs());
  ctx.renderCobrosRecibidos();
  const filas = ctx._els['t-cb-recibidos'].innerHTML.split('<tr').length - 1;
  ok('3 renglones: recibo de El Sol (2 facturas), recibo de Luna y la retención', filas === 3, filas);
  const html = ctx._els['t-cb-recibidos'].innerHTML;
  ok('el recibo conjunto dice "2 facturas" y las nombra', /2 facturas/.test(html) && /F1-4410, F1-4418/.test(html));
  ok('su monto es el total del recibo (Q2050.75)', /Q2050\.75/.test(html));
  ok('el más reciente va primero', html.indexOf('F1-4410') < html.indexOf('F1-4500'));
  ok('no aparecen abonos anulados ni facturas anuladas', !/F1-4420/.test(html) && !/F1-4430/.test(html));
  const kpis = ctx._els['cobros-kpis'].innerHTML;
  ok('KPIs: total abonado y "1 con varias facturas"', /Q2137\.75/.test(kpis) && /1 con varias facturas/.test(kpis), kpis.slice(0, 200));
}

console.log('\n═══ 3. Buscador ═══');
{
  const ctx = nuevoCtx(docs());
  ctx.renderCobrosRecibidos();
  const buscar = q => { ctx.__set('buscar', q); ctx._cbrTabla(); return ctx._els['t-cb-recibidos'].innerHTML; };
  let h = buscar('4418');
  ok('buscando la 2ª factura (4418) aparece su recibo (1 renglón, con las dos)', /F1-4410, F1-4418/.test(h) && (h.split('<tr').length - 1) === 1, h.split('<tr').length - 1);
  h = buscar('28005');
  ok('buscando el No. de recibo salen los dos recibos 28005 (cada cliente el suyo)', (h.split('<tr').length - 1) === 2);
  h = buscar('luna');
  ok('busca por cliente', /Agroservicio Luna/.test(h) && !/El Sol/.test(h));
  h = buscar('zzz');
  ok('sin coincidencias: tabla vacía y aviso', h === '' && /coincide/.test(ctx._els['cbr-empty'].textContent));
  buscar('');
  ctx.__set('cli', '2'); ctx.renderCobrosRecibidos();
  h = ctx._els['t-cb-recibidos'].innerHTML;
  ok('filtro por cliente', /Luna/.test(h) && !/El Sol/.test(h));
}

console.log('\n═══ 4. Detalle del recibo ═══');
{
  const ctx = nuevoCtx(docs());
  ctx.renderCobrosRecibidos();
  ctx.verCobroGrupo(0);
  const h = ctx._modal.h;
  ok('muestra las 2 facturas con su abono', /F1-4410/.test(h) && /F1-4418/.test(h) && /Q1200\.00/.test(h) && /Q850\.75/.test(h));
  ok('muestra el total y el saldo que le queda a cada una', /Q2050\.75/.test(h) && /Q300\.00/.test(h) && /Q49\.25/.test(h));
  ok('el título es el No. de recibo', ctx._modal.t === 'Recibo 28005');
}

console.log('\n═══ 5. Historial de abonos de una factura ═══');
{
  const ctx = nuevoCtx(docs());
  ctx.openHistorialAbonos(1);
  ok('avisa que el recibo también pagó la otra factura', /Recibo conjunto/.test(ctx._modal.h) && /también F1-4418/.test(ctx._modal.h));
  ctx.openHistorialAbonos(3);
  ok('no lo dice si el recibo pagó sólo esa factura', !/Recibo conjunto/.test(ctx._modal.h));
}

console.log('\n═══ 6. "Por cobrar": el buscador encuentra la factura por No. de recibo ═══');
{
  const r = trozo('function renderCobros(){', "\n  enhanceTable('t-cobros');");
  ok('cada fila lleva sus Nos. de recibo (ocultos) para el buscador', /'recibo '\+String\(a\.noRecibo\)/.test(r) && /display:none"> \$\{_recs\}/.test(r));
  ok('la pestaña "Cobros recibidos" se dibuja desde renderCobros', /if\(_rec\)\{renderCobrosRecibidos\(\);return;\}/.test(r));
}

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
