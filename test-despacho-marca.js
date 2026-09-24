// ============================================================
//  SEFE · test-despacho-marca.js — "MARCA AL FACTURAR" (para_despacho)
// ============================================================
//  Cómo se corre:   node test-despacho-marca.js
//
//  El módulo de Despachos ya NO agarra todo el historial: sólo entran las
//  facturas/notas marcadas "para despacho" (entrega a domicilio). Además,
//  al mandar una a despacho entra limpia como "Por asignar".
// ============================================================
const vm = require('vm');
const fs = require('fs');
const src = require('./test-fuente');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ 1 · Sólo entran las marcadas ═══');
// Extraer docsDespachables y correrla con documentos de prueba
(() => {
  const ini = src.indexOf('function docsDespachables()');
  const fin = src.indexOf('function estadoEntrega(d)');
  const ctx = { documentos: [
    { id: 1, tipoDoc: 'cambiaria', estado: 'certificada', paraDespacho: true },   // sí
    { id: 2, tipoDoc: 'cambiaria', estado: 'certificada', paraDespacho: false },  // no (no marcada)
    { id: 3, tipoDoc: 'cambiaria', estado: 'certificada' },                       // no (histórico, sin marca)
    { id: 4, tipoDoc: 'envio', estado: 'pendiente', paraDespacho: true },         // sí
    { id: 5, tipoDoc: 'cambiaria', estado: 'anulada', paraDespacho: true },       // no (anulada)
    { id: 6, tipoDoc: 'notaCredito', estado: 'certificada', paraDespacho: true }, // no (tipo no entregable)
  ] };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__f=docsDespachables;', ctx);
  const res = ctx.__f().map(d => d.id).sort();
  ok('sólo las marcadas, no anuladas y de tipo entregable', JSON.stringify(res) === JSON.stringify([1, 4]), JSON.stringify(res));
  ok('el historial viejo sin marca NO aparece (adiós a las 2021)', !res.includes(3) && !res.includes(2));
})();

console.log('\n═══ 2 · Mandar a despacho la deja limpia ("Por asignar") ═══');
(() => {
  const ini = src.indexOf('function toggleDespacho(id)');
  const fin = src.indexOf('window.toggleDespacho=');
  const doc = { id: 9, serie: 'ABC', numeroDte: '123', paraDespacho: false, estadoEntrega: 'entregado', pilotoId: 7, ordenRuta: 3, entregaInfo: { recibe: 'Juan' } };
  let guardado = null;
  const ctx = { documentos: [doc], refPed: () => 'PED-0009',
    toast: () => {}, logAudit: () => {},
    guardarDocumento: d => { guardado = d; }, renderDespachos: undefined,
    document: { getElementById: () => null }, Number };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__t=toggleDespacho;', ctx);
  ctx.__t(9);
  ok('la marca queda en true', doc.paraDespacho === true);
  ok('resetea estado de entrega a "sin"', doc.estadoEntrega === 'sin', doc.estadoEntrega);
  ok('borra piloto, orden y datos de entrega viejos', doc.pilotoId === null && doc.ordenRuta === null && doc.entregaInfo === null);
  ok('guarda el documento', guardado === doc);
  // Segundo toggle: la saca
  ctx.__t(9);
  ok('vuelto a togglear la saca de despacho', doc.paraDespacho === false);
})();

console.log('\n═══ 3 · Cableado (casilla + botón) ═══');
ok('casilla "Entregar a domicilio" al facturar (normal y exenta)', (src.match(/id="fac-despacho"/g) || []).length >= 2);
ok('facturarPedido lee la casilla', /f\.paraDespacho=_facDesp\?_facDesp\.checked:false/.test(src));
ok('botón "A despacho" en la barra del documento', /id="doc-despacho-btn"/.test(html) && /toggleDespacho\(Number\(this\.dataset\.id\)\)/.test(html));
ok('verDoc prende el botón sólo para tipos entregables', /_despBtn\.textContent=f\.paraDespacho\?'✓ En despacho':'🚚 A despacho'/.test(src));

console.log('\n═══ 4 · El piloto sin ligar no ve todo ═══');
ok('si el piloto no está ligado, no se le muestran entregas ajenas', /esPiloto\(\)&&pid==null/.test(src) && /todavía no está ligado a un piloto/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
