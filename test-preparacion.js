// ============================================================
//  SEFE · test-preparacion.js — CHECKLIST DE PREPARACIÓN + ESCANEO
// ============================================================
//  Cómo se corre:   node test-preparacion.js
//
//  El piloto prepara su carga marcando cada producto (a mano o escaneando
//  el código de barras). Cuando está todo, la entrega pasa a "Preparado".
// ============================================================
const vm = require('vm');
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Extraer la lógica pura de preparación
const ini = src.indexOf('function _prepDe(d)');
const fin = src.indexOf('let _prepModalId=null;');
const ctx = { currentUser: 'Piloto', Date,
  estadoEntrega: d => d.estadoEntrega || 'sin',
  guardarDocumento: () => {} };
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) +
  ';globalThis.__packed=_prepPacked;globalThis.__completa=_prepCompleta;globalThis.__guardar=_prepGuardar;globalThis.__de=_prepDe;', ctx);

console.log('\n═══ Estado de la preparación ═══');
(() => {
  const d = { id: 1, estadoEntrega: 'asignado', items: [{ codigo: 'A', nombre: 'Jabón' }, { codigo: 'B', nombre: 'Papel' }] };
  ok('arranca sin nada empacado', ctx.__packed(d) === 0);
  // Empacar el primero
  const pr = ctx.__de(d); pr.packed[0] = true; d.preparacion = pr; ctx.__guardar(d);
  ok('con 1 de 2, sigue "asignado" (no completa)', d.estadoEntrega === 'asignado' && !ctx.__completa(d));
  // Empacar el segundo → completa
  const pr2 = ctx.__de(d); pr2.packed[1] = true; d.preparacion = pr2; ctx.__guardar(d);
  ok('con todo empacado pasa a "preparado"', d.estadoEntrega === 'preparado', d.estadoEntrega);
  ok('guarda quién y cuándo preparó', d.preparacion.por === 'Piloto' && !!d.preparacion.fecha);
  // Destildar uno → vuelve a asignado
  const pr3 = ctx.__de(d); pr3.packed[1] = false; d.preparacion = pr3; ctx.__guardar(d);
  ok('si se destilda algo, vuelve a "asignado"', d.estadoEntrega === 'asignado', d.estadoEntrega);
})();

(() => {
  // Una entrega ya en ruta NO se rebaja de estado por tocar el checklist
  const d = { id: 2, estadoEntrega: 'ruta', items: [{ codigo: 'A', nombre: 'X' }] };
  const pr = ctx.__de(d); pr.packed[0] = true; d.preparacion = pr; ctx.__guardar(d);
  ok('una entrega en ruta no cambia de estado al preparar', d.estadoEntrega === 'ruta');
})();

console.log('\n═══ Estado nuevo "Preparado" ═══');
ok('existe el estado preparado en ESTADO_ENTREGA', /preparado:\['Preparado','b-prep'\]/.test(src));
ok('el filtro de Despachos incluye "Preparado"', /value="preparado">Preparado/.test(html));
ok('badge b-prep en el CSS', /\.b-prep\{/.test(require('fs').readFileSync(__dirname + '/css/estilos.css', 'utf8')));

console.log('\n═══ Botones del piloto (Preparar → Cargado → Entregado) ═══');
ok('en "asignado" el piloto ve "Preparar" con el avance', /est==='asignado'\).*abrirPreparacion\(\$\{d\.id\}\)/.test(src) && /📦 Preparar\$\{_tt\?/.test(src));
ok('recién en "preparado" aparece "Cargado, voy en ruta"', /est==='preparado'\)btn=.*marcarEnRuta\(\$\{d\.id\}\)/.test(src));

console.log('\n═══ Escáner de código de barras ═══');
ok('usa el lector nativo (BarcodeDetector) y html5-qrcode de respaldo', /'BarcodeDetector' in window/.test(src) && /new BarcodeDetector\(/.test(src) && /html5-qrcode\/2\.3\.8\/html5-qrcode\.min\.js/.test(src) && /function _scanCam\(/.test(src));
ok('limpia la cámara al cerrar (stream + timer)', /_scanStream\.getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/.test(src) && /clearInterval\(_scanTimer\)/.test(src));
ok('botón de linterna (torch) y botón Volver', /function _scanTorch\(/.test(src) && /advanced:\[\{torch:_scanTorchOn\}\]/.test(src) && /‹ Volver/.test(src) && /id="scan-torch"/.test(src));
ok('escaneo continuo en la preparación (marca por barras del producto)', /function prepEscanear\(id\)/.test(src) && /p\.codigoBarras&&String\(p\.codigoBarras\)\.trim\(\)===code/.test(src) && /continuo:true/.test(src));
ok('confirma cada lectura dentro del escáner (color + bip + vibración)', /function _scanFeedback\(/.test(src) && /navigator\.vibrate/.test(src) && /_scanBeep\(/.test(src) && /_scanFeedback\('✓ '\+/.test(src));
ok('avisa dentro del escáner si el producto no es de esa entrega', /_scanFeedback\('✗ No va en esta entrega','warn'\)/.test(src));
ok('campo "Código de barras" + botón escanear en la ficha del producto', /id="p-barras"/.test(src) && /escanearBarrasProducto\(\)/.test(src));
ok('el producto guarda su código de barras', /codigoBarras:\(\$\('#p-barras'\)\?\.value\|\|''\)\.trim\(\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
