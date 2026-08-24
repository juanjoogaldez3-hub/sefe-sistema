// ============================================================
//  SEFE · test-auditlazy.js — AUDITORÍA A PEDIDO (menos egress)
// ============================================================
//  Cómo se corre:   node test-auditlazy.js
//  No necesita instalar nada ni conectarse a internet.
//
//  En el login sólo se baja el ÚLTIMO registro de auditoría (para no gastar
//  egress con una tabla que crece sin fin). El historial completo se trae a
//  pedido al abrir el módulo, una sola vez, y NO pisa la cadena de hashes si
//  la carga fallara. Esta prueba carga la función real _cargarAuditoriaCompleta.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

const ini = src.indexOf('let _auditCargando=null;');
const finMarca = 'window._cargarAuditoriaCompleta=_cargarAuditoriaCompleta;';
const fin = src.indexOf(finMarca, ini);
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _cargarAuditoriaCompleta'); process.exit(1); }
const fnSrc = src.slice(ini, fin + finMarca.length);

function nuevoCtx(fetchAllImpl, auditLog, auditSeq) {
  const ctx = {
    Math, console, window: {},
    fetchAll: fetchAllImpl,
    mapAuditoriaFromDB: a => a,
    auditLog, auditSeq,
  };
  vm.createContext(ctx);
  vm.runInContext(fnSrc, ctx);
  return ctx;
}

(async () => {
  console.log('\n═══ Carga el historial completo al abrir el módulo ═══');
  // Login: sólo el último (seq 6). fetchAll devuelve TODO, ascendente por seq.
  let ctx = nuevoCtx(async () => ({ data: [1, 2, 3, 4, 5, 6].map(seq => ({ seq })) }), [{ seq: 6 }], 6);
  await ctx.window._cargarAuditoriaCompleta();
  ok('trae los 6 registros', ctx.auditLog.length === 6, 'quedaron ' + ctx.auditLog.length);
  ok('el más nuevo queda primero (seq 6)', ctx.auditLog[0].seq === 6);
  ok('marca que ya cargó todo', ctx.window._auditFullLoaded === true);

  console.log('\n═══ No vuelve a cargar si ya está completo ═══');
  let veces = 0;
  ctx = nuevoCtx(async () => { veces++; return { data: [{ seq: 1 }, { seq: 2 }] }; }, [{ seq: 2 }], 2);
  await ctx.window._cargarAuditoriaCompleta();
  await ctx.window._cargarAuditoriaCompleta();
  ok('la segunda llamada no vuelve a pedir a la base', veces === 1, 'pidió ' + veces + ' veces');

  console.log('\n═══ No pisa la cadena si la carga falla (viene vacío) ═══');
  ctx = nuevoCtx(async () => ({ data: [] }), [{ seq: 9, hash: 'ABC' }], 9);
  await ctx.window._cargarAuditoriaCompleta();
  ok('conserva el último registro (no lo borra)', ctx.auditLog.length === 1 && ctx.auditLog[0].seq === 9);
  ok('NO marca como cargado (reintentará)', !ctx.window._auditFullLoaded);

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
