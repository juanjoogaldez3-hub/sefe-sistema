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
const ctx = { currentUser: 'Piloto', Date, isFinite, Number, Math,
  estadoEntrega: d => d.estadoEntrega || 'sin',
  guardarDocumento: () => {} };
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) +
  ';globalThis.__packed=_prepPacked;globalThis.__completa=_prepCompleta;globalThis.__guardar=_prepGuardar;globalThis.__de=_prepDe;globalThis.__cant=_prepCant;globalThis.__meta=_prepMeta;', ctx);

console.log('\n═══ Estado de la preparación (por líneas) ═══');
(() => {
  const d = { id: 1, estadoEntrega: 'asignado', items: [{ codigo: 'A', nombre: 'Jabón', cantidad: 1 }, { codigo: 'B', nombre: 'Papel', cantidad: 1 }] };
  ok('arranca sin nada empacado', ctx.__packed(d) === 0);
  const pr = ctx.__de(d); pr.packed[0] = 1; d.preparacion = pr; ctx.__guardar(d);
  ok('con 1 de 2 líneas, sigue "asignado" (no completa)', d.estadoEntrega === 'asignado' && !ctx.__completa(d));
  const pr2 = ctx.__de(d); pr2.packed[1] = 1; d.preparacion = pr2; ctx.__guardar(d);
  ok('con todo empacado pasa a "preparado"', d.estadoEntrega === 'preparado', d.estadoEntrega);
  ok('guarda quién y cuándo preparó', d.preparacion.por === 'Piloto' && !!d.preparacion.fecha);
  const pr3 = ctx.__de(d); pr3.packed[1] = 0; d.preparacion = pr3; ctx.__guardar(d);
  ok('si se destilda algo, vuelve a "asignado"', d.estadoEntrega === 'asignado', d.estadoEntrega);
  // Compatibilidad: datos viejos con true = línea completa
  const dv = { id: 5, estadoEntrega: 'asignado', items: [{ codigo: 'A', nombre: 'X', cantidad: 3 }], preparacion: { packed: { 0: true } } };
  ok('un "true" viejo cuenta como línea completa', ctx.__completa(dv));
})();

console.log('\n═══ Conteo por unidad (cantidad > 1) ═══');
(() => {
  const d = { id: 2, estadoEntrega: 'asignado', items: [{ codigo: 'A', nombre: 'Jabón', cantidad: 2 }] };
  ok('la meta de la línea es la cantidad (2)', ctx.__meta(d.items[0]) === 2);
  const pr = ctx.__de(d); pr.packed[0] = 1; d.preparacion = pr; ctx.__guardar(d);
  ok('con 1 de 2 unidades NO está completa', ctx.__cant(d, 0) === 1 && !ctx.__completa(d));
  const pr2 = ctx.__de(d); pr2.packed[0] = 2; d.preparacion = pr2; ctx.__guardar(d);
  ok('con 2 de 2 unidades queda "preparado"', ctx.__cant(d, 0) === 2 && d.estadoEntrega === 'preparado');
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
ok('confirma cada lectura dentro del escáner (color + bip + vibración)', /function _scanFeedback\(/.test(src) && /navigator\.vibrate/.test(src) && /_scanBeep\(/.test(src) && /✓ '\+nom/.test(src));
ok('cuenta unidad por unidad y muestra x/y al escanear', /const nuevo=cant\+1/.test(src) && /nuevo\+'\/'\+meta/.test(src));
ok('permite contar 2 unidades iguales (cuenta tras un "hueco")', /if\(txt===_scanUltimo\.code && !_scanGap\)return/.test(src) && /else\{_scanGap=true;\}/.test(src));
ok('avisa dentro del escáner si el producto no es de esa entrega', /_scanFeedback\('✗ No va en esta entrega','warn'\)/.test(src));
ok('campo "Código de barras" + botón escanear en la ficha del producto', /id="p-barras"/.test(src) && /escanearBarrasProducto\(\)/.test(src));
ok('el producto guarda su código de barras', /codigoBarras:\(\$\('#p-barras'\)\?\.value\|\|''\)\.trim\(\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
