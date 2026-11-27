// ============================================================
//  SEFE · test-entregas-juntas.js — ENTREGAR JUNTAS (mismo cliente)
// ============================================================
//  Cómo se corre:   node test-entregas-juntas.js
//  Necesita Playwright + Chromium (ya vienen en el entorno de Claude).
//  No toca la base: levanta un servidor local y simula la base en memoria.
//
//  Cuando el repartidor lleva varios documentos del MISMO cliente (2 facturas,
//  factura + NP, 2 NP…), en Mis entregas salen juntos y se entregan en UNA
//  ventana: una firma, un "quién recibió", una foto; la prueba queda en
//  CADA documento. Cobro por documento con el mismo No. de recibo. Lo que no
//  se entrega se desmarca y queda en la ruta.
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = __dirname;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
let fallos = 0, pruebas = 0;
const { chromium } = require('playwright');
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/supabase\.co|googleapis|gstatic|openrouteservice|heigit|onrender/, r => r.abort());
  await p.goto('http://localhost:' + srv.address().port + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(10000); // la carga de arranque (sin base) vaciaría los datos de ejemplo
  const ok = (t, c, extra) => { pruebas++; if (!c) fallos++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + JSON.stringify(extra))); };
  const firmar = async () => { await (await p.$('#firma-canvas')).scrollIntoViewIfNeeded(); await p.waitForTimeout(100); const bx = await (await p.$('#firma-canvas')).boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 30); await p.mouse.down(); await p.mouse.move(bx.x + 150, bx.y + 100, { steps: 10 }); await p.mouse.up(); };
  await p.evaluate(() => {
    window.cargarTodo = async () => true;
    window.__db = { docs: 0, cobros: [], evid: {} };
    window.guardarDocumento = async () => { __db.docs++; return true; };
    window.guardarCobroRuta = async c => { __db.cobros.push(JSON.parse(JSON.stringify(c))); return true; };
    window.guardarEvidenciaEntrega = async (id, ev) => { __db.evid[id] = ev; return true; };
    usuarios.length = 0; usuarios.push({ id: 3, nombre: 'Ana Apoyo', rol: 'ventas', activo: true, pilotoId: 3, puedeRepartir: true });
    pilotos.length = 0; pilotos.push({ id: 3, nombre: 'Ana Apoyo', activo: true });
    clientes.length = 0; clientes.push({ id: 1, nombre: 'Ferretería El Sol', direccion: 'Zona 1', lat: 14.64, lng: -90.51 }, { id: 2, nombre: 'Agro Luna', direccion: 'Zona 11', lat: 14.6, lng: -90.55 });
    const mk = (id, cli, tipo, num, total, orden) => ({ id, numero: id, tipoDoc: tipo, estado: tipo === 'cambiaria' ? 'certificada' : 'pendiente', clienteId: cli, clienteComercial: cli === 1 ? 'Ferretería El Sol' : 'Agro Luna', clienteNombre: cli === 1 ? 'Ferretería El Sol' : 'Agro Luna', serie: tipo === 'cambiaria' ? 'F1' : undefined, numeroDte: tipo === 'cambiaria' ? num : undefined, creada: '2026-11-24T14:00:00Z', totales: { total }, items: [{ id: 9, nombre: 'Tornillo', cantidad: 2 }], empresa: 'SEFE', abonos: [], paraDespacho: true, estadoEntrega: 'ruta', pilotoId: 3, ordenRuta: orden });
    // El Sol: factura (orden 1), factura (orden 3) y NP (orden 4); Agro Luna en medio (orden 2)
    documentos.length = 0; documentos.push(mk(1, 1, 'cambiaria', '4410', 1115, 1), mk(2, 2, 'cambiaria', '4500', 870, 2), mk(3, 1, 'cambiaria', '4418', 640, 3), mk(4, 1, 'prestamo', '', 0, 4));
    cobrosRuta.length = 0;
    currentUser = 'Ana Apoyo'; currentRole = 'ventas';
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('app-layout').style.display = 'flex';
    aplicarPermisosUI(); go('misentregas');
  });
  await p.waitForTimeout(400);

  console.log('\n═══ 1. Mis entregas: los del mismo cliente salen juntos ═══');
  const orden = await p.evaluate(() => [...document.querySelectorAll('#pil-lista .ent-card .ent-nombre')].map(x => x.textContent.trim()));
  ok('El Sol ×3 seguidos, después Agro Luna', orden.join('|') === 'Ferretería El Sol|Ferretería El Sol|Ferretería El Sol|Agro Luna', orden);
  ok('cada tarjeta de El Sol dice "🔗 3 de este cliente"', await p.evaluate(() => (document.getElementById('pil-lista').innerHTML.match(/🔗 3 de este cliente/g) || []).length === 3));
  ok('botón "Entregar las 3 juntas" (y "Solo esta")', await p.evaluate(() => (document.getElementById('pil-lista').innerHTML.match(/Entregar las 3 juntas/g) || []).length === 3 && /Solo esta/.test(document.getElementById('pil-lista').innerHTML)));
  ok('Agro Luna (uno solo) sigue con "Marcar entregado"', await p.evaluate(() => /marcarEntregado\(2\)">✓ Marcar entregado/.test(document.getElementById('pil-lista').innerHTML)));

  console.log('\n═══ 2. La ventana de entregar juntas ═══');
  await p.click('#pil-lista button:has-text("Entregar las 3 juntas")'); await p.waitForTimeout(200);
  ok('lista los 3 documentos marcados', await p.evaluate(() => document.querySelectorAll('.grp-chk:checked').length === 3));
  ok('un monto por factura (la NP no se cobra) y total Q1,755.00', await p.evaluate(() => document.querySelectorAll('.grp-monto').length === 2 && /1,755\.00/.test(document.getElementById('grp-total').textContent)), await p.evaluate(() => document.getElementById('grp-total')?.textContent));
  await p.click('#m-save'); await p.waitForTimeout(100);
  ok('sin firma no deja confirmar', await p.evaluate(() => /firma/.test(document.getElementById('ent-err').textContent)));
  // La 2ª factura (4418) no se entrega hoy: se desmarca
  await p.uncheck('.grp-chk[data-id="3"]'); await p.waitForTimeout(100);
  ok('al desmarcar una, se recalcula: 1 monto, Q1,115.00 y "Confirmar entrega (2)"', await p.evaluate(() => document.querySelectorAll('.grp-monto').length === 1 && /1,115\.00/.test(document.getElementById('grp-total').textContent) && /\(2\)/.test(document.getElementById('m-save').textContent)));
  await firmar(); await p.fill('#ent-recibe', 'Carlos López'); await p.fill('#ent-recibo-num', '28100');
  await p.click('#m-save'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ est: documentos.map(d => d.estadoEntrega), ei1: documentos[0].entregaInfo, ei4: documentos[3].entregaInfo, ev: Object.keys(__db.evid).map(Number), cob: __db.cobros, modal: document.getElementById('ov').classList.contains('show') }));
  ok('la factura y la NP quedan entregadas; la desmarcada sigue en ruta', r.est.join() === 'entregado,ruta,ruta,entregado', r.est);
  ok('las dos con la MISMA firma y quién recibió', r.ev.sort().join() === '1,4' && await p.evaluate(() => __db.evid[1].firma === __db.evid[4].firma && __db.evid[1].firma.startsWith('data:image/png') && __db.evid[4].recibe === 'Carlos López'));
  ok('cada una dice con cuáles se entregó', JSON.stringify(r.ei1.grupo) === JSON.stringify(['F1-4410', 'NP-0004']), r.ei1.grupo);
  ok('un solo cobro: Q1,115 de la factura, recibo 28100 (la NP no se cobra)', r.cob.length === 1 && r.cob[0].docId === 1 && r.cob[0].monto === 1115 && r.cob[0].noRecibo === '28100' && r.ei4.modoPago === 'prestamo', r.cob);
  ok('se cerró la ventana', !r.modal);
  ok('la desmarcada queda sola: ya sin "juntas", con "Marcar entregado"', await p.evaluate(() => { const h = document.getElementById('pil-lista').innerHTML; return !/juntas/.test(h) && /marcarEntregado\(3\)">✓ Marcar entregado/.test(h); }));

  console.log('\n═══ 3. Dos facturas: una paga, otra a crédito (monto 0) · cheque ═══');
  await p.evaluate(() => { documentos[0].estadoEntrega = 'ruta'; documentos[0].entregaInfo = null; documentos[3].estadoEntrega = 'entregado'; __db.cobros = []; __db.evid = {}; renderMisEntregas(); });
  await p.click('#pil-lista button:has-text("Entregar las 2 juntas")'); await p.waitForTimeout(200);
  await p.click('#grp-pay-opt .pay-btn[data-pago="cheque"]'); await p.waitForTimeout(100);
  await p.fill('.grp-monto[data-id="3"]', '0'); await p.fill('#ent-recibo-num', '28101'); await p.fill('#ent-cheque', '000123'); await p.fill('#ent-banco', 'BI');
  await p.fill('.grp-monto[data-id="1"]', '2000'); await firmar(); await p.fill('#ent-recibe', 'Carlos');
  await p.click('#m-save'); await p.waitForTimeout(150);
  const _e3 = await p.evaluate(() => document.getElementById('ent-err')?.textContent + ' / ' + document.getElementById('m-title').textContent + ' / ' + [...document.querySelectorAll('.grp-chk')].map(c => c.dataset.id + c.checked).join());
  ok('no deja cobrar más que el saldo', /mayor que su saldo/.test(_e3), _e3);
  await p.fill('.grp-monto[data-id="1"]', '1115'); await p.click('#m-save'); await p.waitForTimeout(400);
  const r2 = await p.evaluate(() => ({ e1: documentos[0].entregaInfo, e3: documentos[2].entregaInfo, cob: __db.cobros }));
  ok('cheque de Q1,115 para la 4410; la 4418 queda a crédito', r2.cob.length === 1 && r2.cob[0].modo === 'cheque' && r2.cob[0].cheque === '000123' && r2.e1.modoPago === 'cheque' && r2.e3.modoPago === 'credito', r2);
  ok('las dos entregadas con la misma firma', await p.evaluate(() => documentos[0].estadoEntrega === 'entregado' && documentos[2].estadoEntrega === 'entregado' && __db.evid[1].firma === __db.evid[3].firma));
  ok('el corte del día muestra el cobro para su boleta', await p.evaluate(() => /28101|000123|1,115/.test(document.getElementById('pil-lista').innerHTML)));

  const errPag = errs.filter(e => !/supabase|\bsb\b/.test(e));
  ok('sin errores de página', !errPag.length, errPag);
  await b.close(); srv.close();
  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
