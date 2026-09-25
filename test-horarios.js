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
const fin = src.indexOf('// Desde Despachos: ordena por cercan');
let clientes = [];
const ctx = { SEFE_BODEGA: { lat: 0, lng: 0 }, Math, Number, Infinity, Promise,
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

  console.log('\n═══ Prioriza la hora temprana al ordenar ═══');
  clientes = [
    { id: 1, lat: 0.30, lng: 0, horaLimiteEntrega: '10:00' }, // lejos pero urgente
    { id: 2, lat: 0.10, lng: 0 },                              // cerca, sin hora
    { id: 3, lat: 0.20, lng: 0, horaLimiteEntrega: '12:00' }, // medio, hora más floja
  ];
  const docs = [
    { id: 101, clienteId: 1, estadoEntrega: 'asignado' },
    { id: 102, clienteId: 2, estadoEntrega: 'asignado' },
    { id: 103, clienteId: 3, estadoEntrega: 'asignado' },
  ];
  await ctx.__ord(docs);
  const ord = id => docs.find(d => d.id === id).ordenRuta;
  ok('el de 10:00 (lejos) va #1 igual', ord(101) === 1, ord(101));
  ok('el de 12:00 va #2', ord(103) === 2, ord(103));
  ok('el sin hora va al final (#3)', ord(102) === 3, ord(102));

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
