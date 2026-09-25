// ============================================================
//  SEFE · test-prodmescomp.js — COMPARATIVA PRODUCTO/MES (filtros como cliente/mes)
// ============================================================
//  Cómo se corre:   node test-prodmescomp.js
//
//  El reporte producto/mes ahora se filtra igual que cliente/mes:
//   - Ordenar por Total / Más creció / Más cayó.
//   - Comparación pareja: mes en curso vs. los MISMOS DÍAS del mes anterior.
// ============================================================
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// Aislar el bloque del reporte producto/mes
const ini = src.indexOf("else if(repType==='prodmescomp')");
const fin = src.indexOf("else if(repType==='comision')");
const blk = src.slice(ini, fin);

console.log('\n═══ Ordenar por (filtro) ═══');
ok('el selector "Ordenar por" está en el filtro de producto/mes', /setRepFiltro\('prodmescompOrden',this\.value\)/.test(src) && /Más creció/.test(src) && /Más cayó/.test(src));
ok('ordena por total / creció / cayó', /const _ordPM=repFiltros\.prodmescompOrden\|\|'total'/.test(blk) && /_ordPM==='crecio'/.test(blk));

console.log('\n═══ Comparación pareja (mismos días) ═══');
ok('detecta si el mes está en curso (parcial)', /const esParcial = hayComp && ultM===_mkDate\(_ahora\)/.test(blk));
ok('acumula el mes anterior a los mismos días', /_cuentaPrev=esParcial&&mk===prevM&&_diaD<=_diaCortePM/.test(blk) && /_prevCmpGen\+=v/.test(blk));
ok('usa la base justa en cliente, producto y total', /_baseCli\(g\)/.test(blk) && /_baseProd\(p\)/.test(blk) && /const baseGen=esParcial\?_prevCmpGen/.test(blk));
ok('muestra "(al día X)" en el mes en curso y la nota', /\(al día \$\{_diaCortePM\}\)/.test(blk) && /los mismos días de/.test(blk));
ok('la variación muestra (al pasar el mouse) contra qué compara', /const _tipCmp=\(u,pv\)=>esParcial/.test(blk) && /a los mismos días: /.test(blk) && /varTd\(dif,pv,600,false,_tipCmp\(u,pv\)\)/.test(blk));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
