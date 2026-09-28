// ============================================================
//  SEFE · test-ors.js — MATRIZ DE TIEMPOS CON OPENROUTESERVICE
// ============================================================
//  Cómo se corre:   node test-ors.js
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Extraer _matrizTiemposORS (+ _distKm y _VEL_CIUDAD_KMH que usa como respaldo).
const distIni = src.indexOf('function _distKm(a,b)');
const distFin = src.indexOf('// Hora "HH:MM"', distIni);
const velIni = src.indexOf('const _VEL_CIUDAD_KMH');
const velFin = src.indexOf('\n', velIni) + 1;
const orsIni = src.indexOf('async function _matrizTiemposORS(');
const orsFin = src.indexOf('\n}', orsIni) + 2;
const codigo = src.slice(distIni, distFin) + '\n' + src.slice(velIni, velFin) + '\n' + src.slice(orsIni, orsFin);

function ctxCon(fetchImpl, key) {
  const ctx = { Array, Number, Math, JSON, Promise, fetch: fetchImpl, ORS_API_KEY: key };
  vm.createContext(ctx);
  vm.runInContext(codigo + ';globalThis.__f=_matrizTiemposORS;', ctx);
  return ctx;
}

console.log('\n═══ Convierte segundos → minutos y arma la matriz ═══');
(async () => {
  const puntos = [{ lat: 0, lng: 0 }, { lat: 0.1, lng: 0 }, { lat: 0.2, lng: 0 }];
  let enviado = null;
  const fake = async (url, opts) => { enviado = { url, opts }; return {
    ok: true,
    json: async () => ({ durations: [[0, 600, 1200], [600, 0, 600], [1200, 600, 0]] }) // segundos
  }; };
  const ctx = ctxCon(fake, 'clave-de-prueba');
  const M = await ctx.__f(puntos);
  ok('devuelve NxN en minutos (600s → 10min)', M && M[0][1] === 10 && M[1][2] === 10 && M[0][2] === 20, JSON.stringify(M));
  ok('la diagonal es 0', M[0][0] === 0 && M[1][1] === 0);
  ok('pega al endpoint de ORS driving-car', /v2\/matrix\/driving-car/.test(enviado.url));
  ok('manda la API key en Authorization', enviado.opts.headers.Authorization === 'clave-de-prueba');
  ok('manda locations en [lng,lat] y metrics duration', (() => {
    const b = JSON.parse(enviado.opts.body);
    return b.metrics[0] === 'duration' && b.locations[1][0] === 0 && b.locations[1][1] === 0.1;
  })());
})();

console.log('\n═══ Respaldo y errores ═══');
(async () => {
  const puntos = [{ lat: 0, lng: 0 }, { lat: 0.1, lng: 0 }];
  // Sin key → null (no llama a la red), para que caiga a Google / línea recta.
  const ctxSinKey = ctxCon(async () => { throw new Error('no debería llamarse'); }, '');
  ok('sin API key → null (no llama a la red)', (await ctxSinKey.__f(puntos)) === null);
  // Error HTTP → null
  const ctxErr = ctxCon(async () => ({ ok: false }), 'k');
  ok('respuesta no OK → null', (await ctxErr.__f(puntos)) === null);
  // Respuesta inválida → null
  const ctxBad = ctxCon(async () => ({ ok: true, json: async () => ({}) }), 'k');
  ok('respuesta sin durations → null', (await ctxBad.__f(puntos)) === null);
  // Celda nula → usa el respaldo de línea recta (no queda null)
  const ctxNull = ctxCon(async () => ({ ok: true, json: async () => ({ durations: [[0, null], [null, 0]] }) }), 'k');
  const M = await ctxNull.__f(puntos);
  ok('celda nula → cae al respaldo (línea recta), no queda null', M && M[0][1] != null && M[0][1] > 0, JSON.stringify(M));
})();

console.log('\n═══ Cableado ═══');
ok('_ordenarPorCercania usa ORS primero, Google y recta de respaldo',
  /_matrizTiemposORS\(puntos\), motor='ors'/.test(src) && /_matrizTiemposGoogle\(puntos\); motor='google'/.test(src) && /_matrizTiemposRecta\(puntos\); motor='recta'/.test(src));
ok('existe la llave ORS_API_KEY en la config', /const ORS_API_KEY\s*=/.test(src));

setTimeout(() => {
  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
}, 100);
