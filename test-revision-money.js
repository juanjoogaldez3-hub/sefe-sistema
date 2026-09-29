// ============================================================
//  SEFE · test-revision-money.js — REVISIÓN: duplicados de dinero,
//  comisión de cotizaciones y guardado de facturas certificadas
// ============================================================
//  Cómo se corre:   node test-revision-money.js
// ============================================================
const src = require('./test-fuente');
const dbjs = require('fs').readFileSync(__dirname + '/db.js', 'utf8');
let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Pago global: sin doble cobro ═══');
ok('bandera _guardandoPago', /let _guardandoPago=false;/.test(src));
ok('ignora el 2º clic', /function guardarPagoGlobal\(\)\{\s*if\(_guardandoPago\)return;/.test(src));
ok('se traba y deshabilita el botón antes de mutar', /_guardandoPago=true; const _pgBtn=document\.getElementById\('pg-save'\); if\(_pgBtn\)_pgBtn\.disabled=true;/.test(src));
ok('se resetea al reabrir el modal', /function openPagoGlobal\(\)\{\s*_guardandoPago=false;/.test(src));

console.log('\n═══ Cotización: sin duplicar ═══');
ok('bandera _guardandoCot + guarda con try/finally', /let _guardandoCot=false;/.test(src) && /if\(_guardandoCot\)return;/.test(src) && /\}finally\{ _guardandoCot=false; \}/.test(src));

console.log('\n═══ Comisión: cotización→pedido con IVA correcto ═══');
ok('convertirCotizacionAPedido guarda base + IVA', /totales:\{total,baseSinIva:total\/1\.12,iva:total-total\/1\.12\},estado:'abierto'/.test(src));

console.log('\n═══ Factura certificada: se asegura el guardado ═══');
ok('guardarDocumento devuelve true/false', /return false;\}\s*\n\s*d\.id = data\.id;[\s\S]*?return true;/.test(dbjs) && /return false;\}\s*\n\s*return true;\s*\n\s*\}/.test(dbjs));
ok('la cambiaria espera el guardado y avisa si falla', /let _okGuardar=\(typeof guardarDocumento==='function'\)\?await guardarDocumento\(f\):true;/.test(src) && /Certificada en SAT pero NO guardada/.test(src));
ok('reintenta el guardado una vez', /if\(_okGuardar===false\)\{ await new Promise\(r=>setTimeout\(r,1500\)\); _okGuardar=await guardarDocumento\(f\); \}/.test(src));
ok('la exenta también asegura el guardado', /let _okGuardarEx=\(typeof guardarDocumento==='function'\)\?await guardarDocumento\(f\):true;/.test(src));

console.log('\n═══ Pagos de banco (recibo especial / planilla): sin duplicar ═══');
ok('_rePagar traba la línea antes del await', /if\(!l\|\|l\.pagado\|\|l\._pagando\)return;/.test(src) && /l\._pagando=true;[\s\S]*?\}finally\{ l\._pagando=false; \}/.test(src));
ok('_planPagarParte traba por parte antes del await', /l\._pagando=l\._pagando\|\|\{\}; if\(l\._pagando\[parte\]\)return;/.test(src) && /\}finally\{ l\._pagando\[parte\]=false; \}/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
