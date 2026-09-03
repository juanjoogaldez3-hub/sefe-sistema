// ============================================================
//  SEFE · test-pedborrador.js — BORRADOR DEL PEDIDO (cableado)
// ============================================================
//  Cómo se corre:   node test-pedborrador.js
//
//  El pedido ya guardaba borrador cuando cambiaba el CARRITO (render llama a
//  guardarBorrador). Faltaba guardarlo cuando cambiaban los CAMPOS (OC,
//  observaciones, nota interna) sin tocar productos — ahí se perdían. Ahora un
//  listener del formulario autoguarda ante cualquier cambio. Esta prueba fija
//  ese cableado y el ciclo completo (guardar / recuperar / limpiar).
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Autosave del carrito y de los campos ═══');
ok('render() autoguarda el borrador', /function render\(\)\{\s*guardarBorrador\(\);/.test(src));
ok('initForm engancha un listener en #v-pedido', /getElementById\('v-pedido'\)[\s\S]{0,260}dataset\.borrWired/.test(src));
ok('el listener guarda ante input y change', /cont\.addEventListener\('input',_g\);cont\.addEventListener\('change',_g\)/.test(src));

console.log('\n═══ Reglas del borrador ═══');
const gb = src.slice(src.indexOf('function guardarBorrador('), src.indexOf('function recuperarBorrador('));
ok('no guarda borrador si se edita un pedido existente (editId)', /if\(editId\)return;/.test(gb));
ok('con el carrito vacío borra el borrador', /if\(!cart\.length\)\{localStorage\.removeItem\(BORRADOR_KEY\)/.test(gb));
ok('guarda cliente, OC, observaciones, nota y subvendedor', /cart,cliSel,cliSearch,oc,obs,nota,subvend/.test(gb));

console.log('\n═══ Recuperar y limpiar ═══');
ok('al entrar se recupera el borrador (recuperarBorrador en el arranque)', /setTimeout\(recuperarBorrador,\s*\d+\)/.test(src));
ok('recuperarBorrador restaura el carrito y avisa', /function recuperarBorrador\(/.test(src) && /Borrador recuperado/.test(src));
ok('al finalizar el pedido se limpia el borrador (limpiarBorrador)', /limpiarBorrador\(\);initForm\(\);render\(\);go\('documentos'\)/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
