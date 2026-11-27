// ============================================================
//  SEFE · test-cuadre-pendientes.js — LO PENDIENTE NO SE PIERDE
// ============================================================
//  Cómo se corre:   node test-cuadre-pendientes.js
//  Necesita Playwright + Chromium. No toca la base (todo simulado).
//
//  1. Cuadre: lo que el repartidor no entregó en bodega (efectivo, cheques,
//     contraseñas, firmados…) se arrastra a los días siguientes, en rojo y
//     con sus días de atraso, hasta que logística lo marque recibido.
//  2. Avisos: Dashboard (logística/admin), panel del repartidor y Mis entregas.
//  3. Entregas / paradas que no se hicieron el día que tocaban salen en ROJO.
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
  await p.waitForTimeout(10000);
  const ok = (t, c, extra) => { pruebas++; if (!c) fallos++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + JSON.stringify(extra))); };
  await p.evaluate(() => {
    const hoy = fechaHoyGT(), menos = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const ayer = menos(1) < CUADRE_ARRASTRE_DESDE ? CUADRE_ARRASTRE_DESDE : menos(1), antier = menos(2);
    window.__f = { hoy, ayer, antier };
    const ts = (dia, h = '16') => dia + 'T' + h + ':00:00Z';
    const q = () => { const o = { select: () => o, eq: () => o, maybeSingle: () => Promise.resolve({ data: null, error: null }), then: r => Promise.resolve({ data: [], error: null }).then(r) }; return o; };
    window.sb = { from: q };
    window.guardarDocumento = async () => true; window.guardarCobroRuta = async () => true; window.guardarParadaRuta = async () => true;
    usuarios.length = 0; usuarios.push({ id: 2, nombre: 'Edwin Tuez', rol: 'piloto', activo: true, pilotoId: 1, puedeRepartir: true });
    pilotos.length = 0; pilotos.push({ id: 1, nombre: 'Edwin Tuez', activo: true });
    clientes.length = 0; clientes.push({ id: 1, nombre: 'ECOVIS', direccion: 'Zona 10', lat: 14.6, lng: -90.5 }, { id: 2, nombre: 'El Sol', direccion: 'Zona 1', lat: 14.64, lng: -90.51 });
    const ent = (id, dia, modo, extra) => ({ id, numero: id, tipoDoc: 'cambiaria', estado: 'certificada', serie: 'F1', numeroDte: String(4400 + id), clienteId: 1, clienteComercial: 'ECOVIS', clienteNombre: 'ECOVIS', creada: ts(dia, '14'), fechaCertificacion: ts(dia, '14'), totales: { total: 500 }, items: [], abonos: [], empresa: 'SEFE', paraDespacho: true, pilotoId: 1, estadoEntrega: 'entregado', entregaInfo: Object.assign({ fecha: ts(dia), piloto: 'Edwin Tuez', modoPago: modo, recibe: 'Ana', contrasena: modo === 'contrasena' ? 'C-77' : undefined }, extra || {}) });
    documentos.length = 0;
    documentos.push(
      ent(1, ayer, 'contrasena'),                                   // NO entregada a bodega → se arrastra
      ent(2, ayer, 'credito', { cuadreRec: { por: 'Christian', fecha: ts(ayer, '23') } }), // ya recibida → no
      ent(3, '2026-11-20', 'contrasena'),                           // antes del arranque → no
      ent(4, hoy, 'credito'),                                       // de hoy → normal, sin atraso
      // Entregas pendientes: una de hace 2 días sin fecha (atrasada), una programada para hoy, una para mañana
      Object.assign(ent(5, antier, null), { estadoEntrega: 'ruta', entregaInfo: null, clienteId: 2, clienteComercial: 'El Sol', clienteNombre: 'El Sol' }),
      Object.assign(ent(6, antier, null), { estadoEntrega: 'ruta', entregaInfo: null, fechaEntrega: hoy }),
      Object.assign(ent(7, hoy, null), { estadoEntrega: 'sin', entregaInfo: null, pilotoId: null }));
    cobrosRuta.length = 0;
    cobrosRuta.push({ id: 1, docId: 1, docNum: 'F1-4401', cliente: 'ECOVIS', monto: 620, modo: 'efectivo', noBoleta: '', noRecibo: '28005', piloto: 'Edwin Tuez', fecha: ts(ayer), estado: 'cobrado' });
    paradasRuta.length = 0; paradasRuta.push({ id: 9, titulo: 'Recoger cheque', motivo: 'Cobro', pilotoId: 1, hecha: false, creada: ts(antier), direccion: 'Zona 4' });
    currentUser = 'Christian Martinez'; currentRole = 'admin';
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('app-layout').style.display = 'flex';
    aplicarPermisosUI();
  });

  console.log('\n═══ 1. Cuadre de hoy: lo de ayer no recibido se arrastra ═══');
  const its = await p.evaluate(() => _cuadreItems(1, __f.hoy).map(x => ({ k: x.key, at: x.atraso, rec: x.recibido })));
  const k = its.map(x => x.k).sort().join();
  ok('aparecen: cobro de ayer (Q620), contraseña de ayer y lo de hoy', k === 'c1,d1,d4', its);
  ok('lo ya recibido y lo de antes del 26-11 NO aparecen', !/d2|d3/.test(k));
  ok('lo de ayer trae sus días de atraso; lo de hoy no', its.find(x => x.k === 'd1').at >= 1 && its.find(x => x.k === 'c1').at >= 1 && its.find(x => x.k === 'd4').at === 0);
  const dd = await p.evaluate(() => cuadreDeuda(1));
  ok('deuda: Q620 en efectivo + 1 documento, desde ayer', dd && dd.dinero === 620 && dd.docs === 1 && dd.desde === await p.evaluate(() => __f.ayer), dd);
  await p.evaluate(() => go('cuadre')); await p.waitForTimeout(400);
  let h = await p.evaluate(() => document.getElementById('cuadre-body').innerHTML);
  ok('Cuadre: la tarjeta del repartidor dice "⚠ 2 atrasados"', /⚠ 2 atrasados/.test(h));
  ok('Cuadre: los atrasados salen en rojo con "atrasado, hace…"', (h.match(/cq-atras/g) || []).length === 2 && /atrasado, hace 1 día|atrasado, hace \d+ días/.test(h));
  // logística lo recibe hoy → deja de deber, y sigue viéndose en el cuadre de hoy como recibido
  await p.evaluate(() => { _cuadreMarcar('d1', true); _cuadreMarcar('c1', true); }); await p.waitForTimeout(200);
  ok('al marcarlo recibido hoy: ya no debe nada', await p.evaluate(() => cuadreDeuda(1) === null));
  ok('…y sigue en el cuadre de hoy (como recibido)', await p.evaluate(() => _cuadreItems(1, __f.hoy).filter(x => x.recibido).map(x => x.key).sort().join() === 'c1,d1'));
  await p.evaluate(() => { _cuadreMarcar('d1', false); _cuadreMarcar('c1', false); });

  console.log('\n═══ 2. Avisos ═══');
  await p.evaluate(() => go('panel')); await p.waitForTimeout(400);
  h = await p.evaluate(() => document.getElementById('panel-alertas').innerHTML);
  ok('Dashboard (admin): "Edwin Tuez debe entregar en bodega: Q620…" en rojo y lleva a Cuadre', /alert-danger[^]*Edwin Tuez debe entregar en bodega: Q\s?620\.00 en efectivo/.test(h) && /go\('cuadre'\)/.test(h), h.slice(0, 300));
  await p.evaluate(() => { currentUser = 'Edwin Tuez'; currentRole = 'piloto'; aplicarPermisosUI(); go('misentregas'); }); await p.waitForTimeout(400);
  h = await p.evaluate(() => document.getElementById('pil-lista').innerHTML);
  ok('Mis entregas: "Tenés pendiente de entregar en bodega" con el detalle', /Tenés pendiente de entregar en bodega/.test(h) && /Contraseña C-77/.test(h) && /620/.test(h));
  await p.evaluate(() => { if (typeof renderPanelPiloto === 'function') renderPanelPiloto(); }); await p.waitForTimeout(200);
  ok('Panel del repartidor: aviso 💰 pendiente de entregar', await p.evaluate(() => /Pendiente de entregar en bodega/.test(document.getElementById('panel-piloto')?.innerHTML || '')));

  console.log('\n═══ 3. Entregas que no se hicieron el día que tocaba: en rojo ═══');
  ok('Mis entregas: la de hace 2 días (sin fecha) sale en rojo "Atrasada · 2 días"', /ent-atrasada[^]*?El Sol/.test(h) && /Atrasada · 2 días/.test(h));
  ok('Mis entregas: la programada para hoy NO (aunque se creó antes)', (h.match(/class="ent-card[^"]*ent-atrasada/g) || []).length === 2); // la de El Sol + la parada
  ok('Mis entregas: la parada creada hace 2 días también', /ent-atrasada[^]*Recoger cheque/.test(h));
  await p.evaluate(() => { currentUser = 'Christian Martinez'; currentRole = 'admin'; aplicarPermisosUI(); go('despachos'); }); await p.waitForTimeout(400);
  const filas = await p.evaluate(() => [...document.querySelectorAll('#t-despachos tr.fila-atrasada')].map(tr => tr.textContent.replace(/\s+/g, ' ').slice(0, 60)));
  ok('Despachos: la de hace 2 días y la parada resaltadas; la de hoy no', filas.length === 2 && filas.some(t => /El Sol/.test(t)) && filas.some(t => /Recoger cheque/.test(t)), filas);

  const errPag = errs.filter(e => !/supabase|\bsb\b/.test(e));
  ok('sin errores de página', !errPag.length, errPag);
  await b.close(); srv.close();
  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
