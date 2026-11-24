// ============================================================
//  SEFE · test-entregas-navegador.js — FLUJO COMPLETO DE ENTREGAS
// ============================================================
//  Cómo se corre:   node test-entregas-navegador.js
//  Necesita Playwright + Chromium (ya vienen en el entorno de Claude).
//  No toca la base: levanta un servidor local con el sistema, simula la
//  base en memoria y recorre el flujo como la oficina, el repartidor y
//  contabilidad:
//    asignar (a personal de apoyo con rol Ventas) → preparar → en ruta →
//    entregar con firma/foto (obligatorias firma y quién recibió) → corte
//    del día con una boleta para varios cobros → logística confirma →
//    contabilidad aplica el abono → estado y comprobante visibles en Cobros
//    → y qué pasa si la tabla entregas_evidencia todavía no existe.
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const RAIZ = __dirname;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
function pngGrande(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { const o = y * (w * 3 + 1); for (let x = 0; x < w; x++) { raw[o + 1 + x * 3] = 200; raw[o + 2 + x * 3] = 120; raw[o + 3 + x * 3] = (x * 7 + y * 3) & 255; } }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (tipo, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tipo), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ihdr), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
let fallos = 0, pruebas = 0;
const { chromium } = require('playwright');
(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sefe-entregas-'));
  fs.writeFileSync(path.join(out, 'foto-grande.png'), pngGrande(3000, 2000));
  const srv = http.createServer((q, r) => { const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const URL_SIS = 'http://localhost:' + srv.address().port + '/index.html';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/supabase\.co|googleapis|gstatic|openrouteservice|onrender/, r => r.abort());
  await p.goto(URL_SIS, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(10000); // la carga de arranque (sin base) termina a los ~8 s y vaciaría los datos de ejemplo
  const ok = (t, c, extra) => { pruebas++; if (!c) fallos++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + JSON.stringify(extra))); };
  await p.evaluate(() => {
    // "Base" simulada: guardar = anotar en memoria
    window.cargarTodo = async () => true; window.arrancarApp = async () => {}; window.verificarSesion = async () => {};
    window.__db = { docs: 0, cobros: [], evid: {}, abonos: [], movs: [] };
    window.guardarDocumento = async () => { __db.docs++; return true; };
    window.guardarCobroRuta = async c => { __db.cobros.push(JSON.parse(JSON.stringify(c))); return true; };
    window.guardarEvidenciaEntrega = async (id, ev) => { if (window.__falloEvid) return false; __db.evid[id] = ev; return true; };
    window.traerEvidenciaEntrega = async f => { f._evid = __db.evid[f.id] || null; return f._evid; };
    window.guardarAbono = async (id, a) => { __db.abonos.push(a); };
    window.guardarMovimientoBanco = m => __db.movs.push(m);
    window.polizaChequePDF = () => {};
    currentUser = 'Juanjo'; currentRole = 'admin';
    usuarios.length = 0;
    usuarios.push({ id: 1, nombre: 'Juanjo', rol: 'admin', activo: true },
                  { id: 2, nombre: 'Edwin Tuez', rol: 'piloto', activo: true, pilotoId: 1, puedeRepartir: true },
                  { id: 3, nombre: 'Ana Apoyo', rol: 'ventas', activo: true, pilotoId: 3, puedeRepartir: true });
    pilotos.length = 0; pilotos.push({ id: 1, nombre: 'Edwin Tuez', activo: true }, { id: 3, nombre: 'Ana Apoyo', activo: true });
    cuentasBanco.length = 0; cuentasBanco.push({ id: 4, nombre: 'Bi Monetaria', numero: '2880062118', activa: true, estado: 'activa', empresa: 'SEFE' });
    clientes.length = 0; clientes.push({ id: 1, nombre: 'Ferretería El Sol', direccion: 'Zona 1', lat: 14.64, lng: -90.51, diasCredito: 30 }, { id: 2, nombre: 'Agro Luna', direccion: 'Zona 11', lat: 14.6, lng: -90.55, diasCredito: 30 });
    const mk = (id, cli, num, total) => ({ id, tipoDoc: 'cambiaria', estado: 'certificada', clienteId: cli, clienteComercial: cli === 1 ? 'Ferretería El Sol' : 'Agro Luna', clienteNombre: cli === 1 ? 'Ferretería El Sol' : 'Agro Luna', serie: 'F1', numeroDte: num, creada: '2026-11-24T14:00:00Z', vencimiento: '2026-12-24', totales: { total }, items: [{ id: 9, nombre: 'Tornillo 1/4', cantidad: 2 }, { id: 8, nombre: 'Clavo 2"', cantidad: 1 }], empresa: 'SEFE', abonos: [], paraDespacho: true, estadoEntrega: 'sin' });
    documentos.length = 0; documentos.push(mk(1, 1, '4410', 1115), mk(2, 1, '4418', 640), mk(3, 2, '4500', 870));
    cobrosRuta.length = 0;
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('app-layout').style.display = 'flex';
  });

  console.log('\n═══ 1. Oficina asigna las 3 entregas a Ana (personal de apoyo, rol Ventas) ═══');
  await p.evaluate(() => go('despachos')); await p.waitForTimeout(300);
  for (const id of [1, 2, 3]) {
    await p.evaluate(id => asignarDespacho(id), id);
    const opciones = await p.evaluate(() => [...document.querySelectorAll('#dsp-piloto option')].map(o => o.textContent));
    if (id === 1) ok('Ana aparece en el menú "Repartidor"', opciones.includes('Ana Apoyo'), opciones);
    await p.selectOption('#dsp-piloto', '3'); await p.fill('#dsp-orden', String(id)); await p.click('#m-save'); await p.waitForTimeout(150);
  }
  ok('las 3 quedan "Asignado" a Ana', await p.evaluate(() => documentos.every(d => d.estadoEntrega === 'asignado' && d.pilotoId === 3)));
  await p.evaluate(() => go('cobros')); await p.waitForTimeout(250);
  ok('Cobros muestra "🚚 Asignado · Ana Apoyo"', await p.evaluate(() => /Asignado · Ana Apoyo/.test(document.getElementById('t-cobros').innerHTML)));

  console.log('\n═══ 2. Ana entra al sistema (rol Ventas, "Puede repartir") ═══');
  await p.evaluate(() => { currentUser = 'Ana Apoyo'; currentRole = 'ventas'; aplicarPermisosUI(); go('misentregas'); }); await p.waitForTimeout(400);
  ok('le aparece "Mis entregas" en el menú', await p.evaluate(() => { const bt = document.querySelector('.nav button[data-view="misentregas"]'); return !!bt && getComputedStyle(bt).display !== 'none'; }));
  ok('ve SU ruta directo (sin selector de piloto)', await p.evaluate(() => document.getElementById('pil-selector').innerHTML.trim() === '' && document.querySelectorAll('#pil-lista [onclick^="abrirPreparacion"]').length === 3));

  console.log('\n═══ 3. Prepara, sale en ruta y entrega (efectivo + firma + foto) ═══');
  const entregar = async (id, modo, monto, recibo, recibe, conFoto) => {
    await p.evaluate(id => { abrirPreparacion(id); prepTogglear(id, 0, true); prepTogglear(id, 1, true); closeMod(); marcarEnRuta(id); }, id);
    await p.evaluate(id => marcarEntregado(id), id); await p.waitForTimeout(200);
    if (modo !== 'efectivo') await p.evaluate(m => selPago(m), modo);
    if (monto) { await p.fill('#ent-monto', String(monto)); await p.fill('#ent-recibo-num', recibo); }
    if (modo === 'contrasena') await p.fill('#ent-contra', 'CP-77');
    return async (firmar) => {
      if (firmar) { const bx = await (await p.$('#firma-canvas')).boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 30); await p.mouse.down(); await p.mouse.move(bx.x + 120, bx.y + 90, { steps: 8 }); await p.mouse.move(bx.x + 200, bx.y + 40, { steps: 8 }); await p.mouse.up(); }
      if (recibe) await p.fill('#ent-recibe', recibe);
      if (conFoto) { await p.setInputFiles('#ent-foto-file', path.join(out, 'foto-grande.png')); await p.waitForSelector('#ent-foto-zone img', { timeout: 5000 }); }
      await p.click('#m-save'); await p.waitForTimeout(300);
    };
  };
  let fin = await entregar(1, 'efectivo', 1115, 'R-501', '', false);
  await fin(false);
  ok('SIN firma no deja confirmar', await p.evaluate(() => /Falta la firma/.test(document.getElementById('ent-err').textContent) && documentos[0].estadoEntrega === 'ruta'));
  { const bx = await (await p.$('#firma-canvas')).boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 30); await p.mouse.down(); await p.mouse.move(bx.x + 150, bx.y + 100, { steps: 10 }); await p.mouse.up(); }
  await p.click('#m-save'); await p.waitForTimeout(200);
  ok('SIN nombre de quien recibe no deja confirmar', await p.evaluate(() => document.getElementById('ent-err').textContent.includes('recibió')));
  await p.fill('#ent-recibe', 'Juan Pérez');
  await p.setInputFiles('#ent-foto-file', path.join(out, 'foto-grande.png')); await p.waitForSelector('#ent-foto-zone img', { timeout: 5000 });
  await p.click('#m-save'); await p.waitForTimeout(400);
  const r1 = await p.evaluate(() => ({ est: documentos[0].estadoEntrega, ei: documentos[0].entregaInfo, ev: __db.evid[1] ? { firma: __db.evid[1].firma.slice(0, 22), fotoKB: Math.round((__db.evid[1].foto || '').length / 1024), recibe: __db.evid[1].recibe } : null, cobros: cobrosRuta.length }));
  ok('queda "Entregado", con el cobro en ruta creado', r1.est === 'entregado' && r1.cobros === 1, r1);
  ok('firma y foto van a la tabla aparte (NO dentro de la factura)', r1.ev && r1.ev.firma.startsWith('data:image/png') && !r1.ei.firma && r1.ei.evidencia === true && r1.ei.conFoto === true, r1);
  ok('la foto de 3000×2000 se achicó (' + (r1.ev && r1.ev.fotoKB) + ' KB)', r1.ev && r1.ev.fotoKB > 0 && r1.ev.fotoKB < 400, r1.ev);
  fin = await entregar(2, 'efectivo', 640, 'R-502', 'Juan Pérez', false); await fin(true);
  fin = await entregar(3, 'contrasena', 0, '', 'María López', false); await fin(true);
  ok('entrega con contraseña de pago también lleva firma', await p.evaluate(() => documentos[2].estadoEntrega === 'entregado' && !!__db.evid[3] && documentos[2].entregaInfo.recibe === 'María López'));

  console.log('\n═══ 4. Cierre del día de Ana: una boleta para los 2 cobros ═══');
  await p.evaluate(() => go('misentregas')); await p.waitForTimeout(300);
  ok('la ruta muestra las 3 entregadas de hoy', await p.evaluate(() => (document.getElementById('pil-lista').innerHTML.match(/Entregado a/g) || []).length === 3));
  ok('aparece el botón "Deposité varios con una sola boleta"', await p.evaluate(() => !!document.querySelector('[onclick="agregarBoletaVarios()"]')));
  await p.click('[onclick="agregarBoletaVarios()"]'); await p.waitForTimeout(200);
  ok('el total del depósito es Q1,755.00', await p.evaluate(() => /1,755\.00/.test(document.getElementById('bolv-total').textContent)));
  await p.fill('#bolv-num', 'BOL-9001'); await p.click('#m-save'); await p.waitForTimeout(300);
  ok('los 2 cobros quedan "Depositado" con la misma boleta', await p.evaluate(() => cobrosRuta.every(c => c.estado === 'depositado' && c.noBoleta === 'BOL-9001')));
  await p.evaluate(() => { const d = documentos.find(x => x.id === 2); d.estadoEntrega = 'entregado'; d.entregaInfo.fecha = '2026-11-20T15:00:00Z'; renderMisEntregas(); });
  ok('una entregada de OTRO día ya no sale en "Mi ruta de hoy"', await p.evaluate(() => (document.getElementById('pil-lista').innerHTML.match(/Entregado a/g) || []).length === 2));
  await p.evaluate(() => { documentos.find(x => x.id === 2).entregaInfo.fecha = new Date().toISOString(); });

  console.log('\n═══ 5. Logística confirma y contabilidad aplica el abono ═══');
  await p.evaluate(() => { currentUser = 'Juanjo'; currentRole = 'admin'; aplicarPermisosUI(); go('despachos'); }); await p.waitForTimeout(300);
  for (const c of await p.evaluate(() => cobrosRuta.map(c => c.id))) {
    await p.evaluate(id => recibirCobro(id), c);
    await p.evaluate(id => procesarCobro(id), c); await p.waitForTimeout(150);
    await p.selectOption('#ab-cuenta', '4'); await p.click('#m-save'); await p.waitForTimeout(200);
  }
  const r5 = await p.evaluate(() => ({ est: cobrosRuta.map(c => c.estado), saldos: documentos.map(d => arInfo(d).saldo), movs: __db.movs.length }));
  ok('cobros "Procesado", facturas 4410 y 4418 en saldo 0, depósitos en Bancos', r5.est.every(e => e === 'procesado') && r5.saldos[0] === 0 && r5.saldos[1] === 0 && r5.saldos[2] === 870 && r5.movs === 2, r5);

  console.log('\n═══ 6. Cualquiera ve dónde va cada factura y su comprobante ═══');
  await p.evaluate(() => go('cobros')); await p.waitForTimeout(250);
  ok('Cobros/Documentos muestran "✓ Entregado … · Juan Pérez"', await p.evaluate(() => /✓ Entregado [^<]*· Juan Pérez/.test(document.getElementById('t-cobros').innerHTML)));
  await p.evaluate(() => { documentos[0]._evid = undefined; verComprobanteEntrega(1); }); await p.waitForTimeout(400);
  ok('el comprobante trae y muestra firma + foto', await p.evaluate(() => { const h = document.getElementById('m-body').innerHTML; return /Firma de recepción/.test(h) && /Foto de la entrega/.test(h) && /Juan Pérez/.test(h); }));
  await p.evaluate(() => closeMod());

  console.log('\n═══ 7. Si la tabla nueva todavía no existe (antes del OK) ═══');
  await p.evaluate(() => { window.__falloEvid = true; const d = documentos[2]; d.estadoEntrega = 'ruta'; d.entregaInfo = null; d._evid = undefined; currentUser = 'Ana Apoyo'; currentRole = 'ventas'; });
  fin = await entregar(3, 'credito', 0, '', 'María López', false);
  await p.evaluate(() => { const d = documentos[2]; d.estadoEntrega = 'ruta'; marcarEntregado(3); selPago('credito'); }); await p.waitForTimeout(150);
  { const bx = await (await p.$('#firma-canvas')).boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 30); await p.mouse.down(); await p.mouse.move(bx.x + 150, bx.y + 100, { steps: 10 }); await p.mouse.up(); }
  await p.fill('#ent-recibe', 'María López'); await p.click('#m-save'); await p.waitForTimeout(300);
  ok('la entrega se registra igual y la firma queda guardada a la antigua', await p.evaluate(() => documentos[2].estadoEntrega === 'entregado' && (documentos[2].entregaInfo.firma || '').startsWith('data:image/png') && !documentos[2].entregaInfo.evidencia));

  const errPag = errs.filter(e => !/supabase|\bsb\b/.test(e));
  ok('sin errores de página', !errPag.length, errPag);
  await b.close(); srv.close();
  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
