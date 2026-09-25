// ============================================================
//  SEFE · test-baja-cliente.js — DAR DE BAJA / REACTIVAR CLIENTE
// ============================================================
//  Cómo se corre:   node test-baja-cliente.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Toggle de baja/reactivar ═══');
(() => {
  const ini = src.indexOf('function toggleBajaCliente(id)');
  const fin = src.indexOf('window.toggleBajaCliente=');
  const c = { id: 1, nombre: 'ACME', activo: true };
  const ctx = { clientes: [c], canCrearCliente: () => true, guardarCliente: () => {}, logAudit: () => {},
    toast: () => {}, renderCliDet: () => {}, confirmar: (t, m, b, fn) => fn() };
  vm.createContext(ctx);
  vm.runInContext(src.slice(ini, fin) + ';globalThis.__t=toggleBajaCliente;', ctx);
  ctx.__t(1);
  ok('dar de baja marca activo=false', c.activo === false);
  ctx.__t(1);
  ok('volver a togglear reactiva (activo=true)', c.activo === true);
})();

console.log('\n═══ El seguimiento ignora a los inactivos ═══');
ok('_seguimientoClientes salta los clientes con activo===false', /if\(c\.activo===false\)return;\s*\/\/ clientes dados de baja/.test(src));

console.log('\n═══ Cableado (db + UI) ═══');
const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
ok('db.js lee y guarda la columna "activo"', /activo:c\.activo!==false/.test(dbjs) && /activo:cli\.activo!==false/.test(dbjs));
ok('botón dar de baja/reactivar en la ficha del cliente', /onclick="toggleBajaCliente\(\$\{c\.id\}\)"/.test(src) && /Dar de baja/.test(src) && /Reactivar/.test(src));
ok('badge "Inactivo" en la ficha y en la lista', (src.match(/>Inactivo<\/span>/g) || []).length >= 2);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
