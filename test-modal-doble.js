// ============================================================
//  SEFE · test-modal-doble.js — GUARDADO DE MODALES SIN DUPLICAR
//  (openMod deshabilita el botón mientras corre el handler, aun async)
// ============================================================
//  Cómo se corre:   node test-modal-doble.js
// ============================================================
const src = require('./test-fuente');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ openMod: traba anti doble-clic global ═══');
const om = src.slice(src.indexOf('function openMod(title,html,fn)'), src.indexOf('function closeMod('));
ok('el botón guardar arranca con _busy=false', /_sv\._busy=false;/.test(om));
ok('ignora el 2º clic mientras está ocupado', /if\(!saveFn\|\|\(b&&b\._busy\)\)return;/.test(om));
ok('deshabilita el botón al empezar a guardar', /b\._busy=true;b\.disabled=true;/.test(om));
ok('espera al handler (await saveFn), aunque sea async', /await saveFn\(\)/.test(om));
ok('libera el botón en finally', /finally\{if\(b\)\{b\._busy=false;b\.disabled=false;\}\}/.test(om));

console.log('\n═══ Alcance: los formularios que guardaban duplicado ═══');
ok('la colocación de baterías usa openMod (queda protegida)', /function openBatCambio\([\s\S]*?openMod\(/.test(src));
ok('el tipo de batería usa openMod', /function openBatTipo\([\s\S]*?openMod\(/.test(src));
ok('el servicio de ambiental usa openMod', /function openAmbServicio\([\s\S]*?openMod\(/.test(src));

console.log('\n═══ El pedido conserva su propia traba (no es modal) ═══');
ok('sigue la bandera _guardandoPedido del botón #f-go', /let _guardandoPedido=false;/.test(src) && /if\(_guardandoPedido\)return;/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
