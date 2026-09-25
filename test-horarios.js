// ============================================================
//  SEFE · test-horarios.js — HORA LÍMITE DE ENTREGA (mostrar/priorizar/avisar)
// ============================================================
//  Cómo se corre:   node test-horarios.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

const ini = src.indexOf('function _horaLimMinDoc(d)');
const fin = src.indexOf('// Paradas manuales pendientes de un piloto.');
let clientes = [];
const ctx = { SEFE_BODEGA: { lat: 0, lng: 0 }, SEFE_REPARTO: { salida: '08:30', minPorEntrega: 20 },
  Math, Number, Infinity, isFinite, Promise, Array,
  estadoEntrega: d => d.estadoEntrega || 'sin', guardarDocumento: () => {}, toast: () => {} };
Object.defineProperty(ctx, 'clientes', { get: () => clientes, set: v => { clientes = v; } });
vm.createContext(ctx);
vm.runInContext(src.slice(ini, fin) +
  ';globalThis.__min=_horaLimMinDoc;globalThis.__risk=_riesgosHora;globalThis.__ord=_ordenarPorCercania;', ctx);

(async () => {
  console.log('\n═══ Parseo de la hora límite ═══');
  clientes = [{ id: 1, horaLimiteEntrega: '12:00' }, { id: 2, horaLimiteEntrega: '' }];
  ok('"12:00" → 720 minutos', ctx.__min({ clienteId: 1 }) === 720, ctx.__min({ clienteId: 1 }));
  ok('sin hora → Infinity', ctx.__min({ clienteId: 2 }) === Infinity);

  console.log('\n═══ La urgencia (hora ajustada) vence a la cercanía ═══');
  // Salida 8:30. A tiene hora 9:10 (ajustada). B está MÁS CERCA pero sin hora.
  // Debe ir A primero (urgente), aunque B esté más cerca.
  clientes = [
    { id: 1, lat: 0.10, lng: 0, horaLimiteEntrega: '09:10' }, // ~30 min, hora ajustada
    { id: 2, lat: 0.05, lng: 0 },                              // ~15 min, sin hora (más cerca)
    { id: 3, lat: 0.30, lng: 0 },                              // lejos, sin hora
  ];
  const docs = [
    { id: 101, clienteId: 1, estadoEntrega: 'asignado' },
    { id: 102, clienteId: 2, estadoEntrega: 'asignado' },
    { id: 103, clienteId: 3, estadoEntrega: 'asignado' },
  ];
  await ctx.__ord(docs);
  const ord = id => docs.find(d => d.id === id).ordenRuta;
  ok('el de hora ajustada (9:10) va #1 aunque no sea el más cercano', ord(101) === 1, ord(101));
  ok('los sin hora van después, por cercanía (2 antes que 3)', ord(102) === 2 && ord(103) === 3, `102=${ord(102)} 103=${ord(103)}`);
  ok('calcula la ETA de la parada urgente', /^\d{2}:\d{2}$/.test(docs.find(d => d.id === 101).etaEntrega), docs.find(d => d.id === 101).etaEntrega);

  console.log('\n═══ Avisa si una hora ajustada quedó tarde ═══');
  clientes = [{ id: 1, horaLimiteEntrega: '15:00' }, { id: 2, horaLimiteEntrega: '10:00' }];
  const ruta = [
    { id: 201, clienteId: 1, ordenRuta: 1 }, // 15:00 primero
    { id: 202, clienteId: 2, ordenRuta: 2 }, // 10:00 después → en riesgo
  ];
  const risk = ctx.__risk(ruta);
  ok('la de 10:00 puesta después de la de 15:00 queda en riesgo', risk.has(202) && !risk.has(201));

  console.log('\n═══ Cableado (campo + db + display) ═══');
  ok('campo "Hora límite de entrega" en la ficha del cliente', /id="c-horalim"/.test(src) && /horaLimiteEntrega:\(\$\('#c-horalim'\)/.test(src));
  const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
  ok('db.js mapea hora_limite_entrega', /horaLimiteEntrega:c\.hora_limite_entrega/.test(dbjs) && /hora_limite_entrega:cli\.horaLimiteEntrega/.test(dbjs));
  ok('se muestra "⏰ antes de" en Despachos y Mis entregas', /⏰ antes de \$\{t\}/.test(src) && /_horaBadge\(d,_riskDesp\)/.test(src) && /_horaBadge\(d,_riskPil\)/.test(src));

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
