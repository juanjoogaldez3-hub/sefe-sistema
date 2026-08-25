// ============================================================
//  SEFE · test-excelestandar.js — FORMATO ESTÁNDAR DE EXCEL
// ============================================================
//  Cómo se corre:   node test-excelestandar.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Las cinco descargas de Excel (Reportes, Cuentas por pagar, Estado de
//  cuenta de banco, Auditoría y Cotización) usan un mismo ayudante,
//  _estiloExcelHoja, para verse parejas: membrete, encabezado verde,
//  montos en Q, filas alternadas y fila de totales resaltada. Esta prueba
//  carga el ayudante real y verifica que aplique cada cosa donde va,
//  usando un "XLSX" de mentira (no toca la librería de verdad).
// ============================================================
const vm = require('vm');
const src = require('./test-fuente');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

// --- Recorto el código del ayudante (consts + _anchosExcel + _estiloExcelHoja) ---
const ini = src.indexOf('const _XLS_VERDE=');
const fin = src.indexOf('window._estiloExcelHoja=_estiloExcelHoja;');
if (ini < 0 || fin < 0) { console.log('✗ no se encontró _estiloExcelHoja'); process.exit(1); }
const code = src.slice(ini, fin);

// --- XLSX de mentira: sólo las utilidades A1 que usa el ayudante ---
function colName(c){let s='';c++;while(c>0){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=Math.floor((c-1)/26);}return s;}
function colIdx(s){let c=0;for(const ch of s)c=c*26+(ch.charCodeAt(0)-64);return c-1;}
const XLSX={utils:{
  encode_cell:({c,r})=>colName(c)+(r+1),
  decode_range:(ref)=>{const [a,b]=ref.split(':');const m=x=>{const g=x.match(/([A-Z]+)(\d+)/);return {c:colIdx(g[1]),r:Number(g[2])-1};};return {s:m(a),e:m(b)};},
  encode_range:({s,e})=>colName(s.c)+(s.r+1)+':'+colName(e.c)+(e.r+1),
}};

const ctx = { Number, String, Math, Object, Set, console, window:{}, XLSX };
vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.__estilo=_estiloExcelHoja;globalThis.__anchos=_anchosExcel;', ctx);
const estilo = ctx.__estilo, anchos = ctx.__anchos;

// --- Armo una hoja de mentira: membrete(0-5) + encabezado(6) + 3 datos + total ---
//  Columnas: Código(0) Producto(1) Marca(2) Cantidad(3) Precio(4) Total(5)
const HR = 6, nData = 3, totalRow = HR + 1 + nData; // 6,7,8,9,10
const ws = {};
const set = (c, r, v) => { ws[XLSX.utils.encode_cell({c,r})] = { t: typeof v==='number'?'n':'s', v }; };
set(0,0,'SEFE, S.A.');
set(0,1,'Reporte:'); set(1,1,'VENTAS POR PRODUCTO');
['Código','Producto','Marca','Cantidad','Precio venta','Total'].forEach((h,c)=>set(c,HR,h));
const datos = [['ET0884','Aceite','La Patrona',240,18.5,4440],['HG1102','Detergente muy largo nombre','Xedex',86,62,5332],['BE0455','Gaseosa','Salvavidas',312,14.75,4602]];
datos.forEach((row,i)=>row.forEach((v,c)=>set(c,HR+1+i,v)));
['TOTALES','','',638,'',14374].forEach((v,c)=>{ if(v!=='') set(c,totalRow,v); });
ws['!ref'] = XLSX.utils.encode_range({s:{c:0,r:0},e:{c:5,r:totalRow}});

estilo(XLSX, ws, { styled:true, headerRow:HR, nCols:6, dataRows:nData, moneyCols:[4,5], totalRow, brandRow:0, metaRows:[1] });

const cell = (c,r)=>ws[XLSX.utils.encode_cell({c,r})];

console.log('\n═══ Encabezado verde con letra blanca ═══');
const h0 = cell(0,HR);
ok('encabezado con fondo verde 173916', h0.s && h0.s.fill && h0.s.fill.fgColor.rgb==='173916', JSON.stringify(h0.s&&h0.s.fill));
ok('encabezado en negrita y letra blanca', h0.s.font.bold===true && h0.s.font.color.rgb==='FFFFFF');
ok('columna de dinero se alinea a la derecha en el encabezado', cell(5,HR).s.alignment.horizontal==='right');
ok('columna de texto se alinea a la izquierda', cell(1,HR).s.alignment.horizontal==='left');

console.log('\n═══ Montos en formato quetzales ═══');
ok('Precio (col dinero) lleva formato Q', cell(4,HR+1).z==='"Q"#,##0.00', cell(4,HR+1).z);
ok('Total (col dinero) lleva formato Q', cell(5,HR+1).z==='"Q"#,##0.00', cell(5,HR+1).z);
ok('Cantidad (no dinero) NO lleva formato Q', cell(3,HR+1).z===undefined);
ok('Código (texto) NO lleva formato Q', cell(0,HR+1).z===undefined);

console.log('\n═══ Filas alternadas (cebra) ═══');
ok('fila de datos par (i=0) sin relleno cebra', !(cell(0,HR+1).s && cell(0,HR+1).s.fill));
ok('fila de datos impar (i=1) con relleno cebra F4F6EF', cell(0,HR+2).s.fill && cell(0,HR+2).s.fill.fgColor.rgb==='F4F6EF');
ok('las filas de datos llevan bordes', !!cell(0,HR+1).s.border);

console.log('\n═══ Fila de totales resaltada ═══');
const t0 = cell(0,totalRow), t5 = cell(5,totalRow);
ok('total en negrita verde', t0.s.font.bold===true && t0.s.font.color.rgb==='173916');
ok('total con fondo lima E7ECDB', t0.s.fill.fgColor.rgb==='E7ECDB');
ok('total con línea verde arriba (medium)', t0.s.border.top.style==='medium' && t0.s.border.top.color.rgb==='173916');
ok('total de columna dinero también en Q', t5.z==='"Q"#,##0.00', t5.z);

console.log('\n═══ Membrete ═══');
ok('nombre de empresa (brandRow) grande y verde', cell(0,0).s.font.sz===16 && cell(0,0).s.font.color.rgb==='173916');
ok('etiqueta de meta (Reporte:) en negrita verde', cell(0,1).s.font.bold===true && cell(0,1).s.font.color.rgb==='173916');

console.log('\n═══ Anchos automáticos ═══');
ok('se calcularon anchos para las 6 columnas', Array.isArray(ws['!cols']) && ws['!cols'].length===6);
ok('la columna Producto (nombre largo) se ensancha', ws['!cols'][1].wch > ws['!cols'][0].wch);
ok('ningún ancho pasa de 60', ws['!cols'].every(c=>c.wch<=60));

console.log('\n═══ Sin librería de estilos: igual deja Q y anchos, sin colores ═══');
const ws2 = {};
const set2=(c,r,v)=>{ws2[XLSX.utils.encode_cell({c,r})]={t:typeof v==='number'?'n':'s',v};};
['Código','Total'].forEach((h,c)=>set2(c,0,h));
set2(0,1,'ET0884'); set2(1,1,4440);
ws2['!ref']=XLSX.utils.encode_range({s:{c:0,r:0},e:{c:1,r:1}});
estilo(XLSX, ws2, { styled:false, headerRow:0, nCols:2, dataRows:1, moneyCols:[1], totalRow:null, brandRow:0 });
ok('sin estilos: el dinero igual sale en Q', ws2[XLSX.utils.encode_cell({c:1,r:1})].z==='"Q"#,##0.00');
ok('sin estilos: NO se pintan colores (sin .s en encabezado)', !ws2[XLSX.utils.encode_cell({c:0,r:0})].s);
ok('sin estilos: igual calcula anchos', Array.isArray(ws2['!cols']) && ws2['!cols'].length===2);

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
