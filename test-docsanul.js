// ============================================================
//  SEFE · test-docsanul.js — OCULTAR DOCUMENTOS ANULADOS
// ============================================================
//  Cómo se corre:   node test-docsanul.js
//  No necesita instalar nada ni conectarse a internet.
//
//  En la lista de Documentos, los anulados no se muestran por defecto (hacen
//  bulto). El check "Ver anulados" los vuelve a mostrar. No se borran: sólo se
//  ocultan. Esta prueba carga la función real docsEnRango.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('function docsEnRango(d){');
const fin = src.indexOf('\n}', ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró docsEnRango'); process.exit(1); }
const fnSrc = src.slice(ini, fin + 2);

// Estado de los "controles" de la pantalla; $ devuelve el control por id.
const UI = { verAnulados: false, tipo: '', desde: '', hasta: '' };
const $ = sel => {
  if (sel === '#docs-ver-anulados') return { checked: UI.verAnulados };
  if (sel === '#docs-tipo') return { value: UI.tipo };
  if (sel === '#docs-desde') return { value: UI.desde };
  if (sel === '#docs-hasta') return { value: UI.hasta };
  return null;
};
const ctx = { $, Date, console };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=docsEnRango;', ctx);
const docsEnRango = ctx.__f;

const normal = { tipoDoc: 'pedido', estado: 'abierto', creada: '2026-08-10' };
const anulEstado = { tipoDoc: 'pedido', estado: 'anulada', creada: '2026-08-10' };
const anulFlag = { tipoDoc: 'cambiaria', estado: 'certificada', anulado: true, creada: '2026-08-10' };

console.log('\n═══ Por defecto (check apagado) ═══');
UI.verAnulados = false; UI.tipo = '';
ok('un pedido normal SÍ se muestra', docsEnRango(normal) === true);
ok('un pedido anulado (estado) se oculta', docsEnRango(anulEstado) === false);
ok('un documento con anulado=true se oculta', docsEnRango(anulFlag) === false);

console.log('\n═══ Con "Ver anulados" prendido ═══');
UI.verAnulados = true;
ok('ahora el anulado SÍ se muestra', docsEnRango(anulEstado) === true);
ok('el normal sigue mostrándose', docsEnRango(normal) === true);

console.log('\n═══ El filtro por tipo sigue funcionando ═══');
UI.verAnulados = true; UI.tipo = 'cambiaria';
ok('con tipo=cambiaria, el pedido no pasa', docsEnRango(anulEstado) === false);
ok('con tipo=cambiaria, la cambiaria sí', docsEnRango(anulFlag) === true);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
