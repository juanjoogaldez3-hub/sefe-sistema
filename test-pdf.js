// ============================================================
//  SEFE · test-pdf.js — PRUEBAS DE LA ESPERA DE IMÁGENES
// ============================================================
//  Cómo se corre:   node test-pdf.js
//  No necesita instalar nada ni conectarse a internet.
//
//  Qué cuida: el logo va incrustado en el HTML como imagen en
//  base64. El navegador necesita un momento para decodificarla, y
//  si se llama a window.print() antes, el PDF sale SIN LOGO — y a
//  la segunda sale bien porque ya quedó en caché.
//
//  Estas pruebas toman la función esperarImagenes() del index.html
//  real y comprueban que espera lo que tiene que esperar, y sobre
//  todo que NUNCA deja la impresión colgada si una imagen falla.
// ============================================================

// Extrae esperarImagenes() del index.html real y la prueba con un DOM simulado.
const fs=require('fs'), vm=require('vm');
const src = require('./test-fuente');
const m=src.match(/function esperarImagenes\(contenedor\)\{[\s\S]*?\n\}/);
if(!m){ console.log('✗ no se encontró la función'); process.exit(1); }

let f=0,n=0;
const ok=(t,c,e)=>{n++;console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → '+e));if(!c)f++;};

const ctx={console,Promise,setTimeout,Array,document:null,
  requestAnimationFrame:cb=>setTimeout(cb,4)};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(m[0]+'\n;globalThis.__f=esperarImagenes;',ctx);
const esperar=ctx.__f;

const cont=(imgs)=>({querySelectorAll:()=>imgs});
const ahora=()=>Number(process.hrtime.bigint()/1000000n);

(async()=>{
console.log('\n═══ esperarImagenes() ═══');

// 1) Imagen ya lista
let t=ahora();
await esperar(cont([{complete:true,naturalWidth:100,decode:()=>Promise.resolve()}]));
ok('imagen ya decodificada: sigue de inmediato', ahora()-t<200, 'tardó '+(ahora()-t)+'ms');

// 2) Imagen que carga después (el caso del logo)
t=ahora();
const tardia={complete:false,naturalWidth:0};
const p=esperar(cont([tardia]));
setTimeout(()=>tardia.onload(),150);
await p;
const d=ahora()-t;
ok('imagen que carga después: espera a que cargue', d>=150 && d<600, 'tardó '+d+'ms');

// 3) Imagen que NUNCA carga → no debe colgarse
t=ahora();
await esperar(cont([{complete:false,naturalWidth:0}]));
const d3=ahora()-t;
ok('imagen que nunca carga: corta a los ~3s y sigue', d3>=2900 && d3<3600, 'tardó '+d3+'ms');

// 4) Sin imágenes
t=ahora();
await esperar(cont([]));
ok('sin imágenes: no se traba', ahora()-t<200);

// 5) decode() que falla
t=ahora();
await esperar(cont([{complete:true,naturalWidth:10,decode:()=>Promise.reject(new Error('x'))}]));
ok('si decode() falla, igual continúa', ahora()-t<300);

console.log('\n'+(f===0?`✓ TODO BIEN — ${n} pruebas pasaron`:`✗ ${f} de ${n} fallaron`)+'\n');
process.exit(f?1:0);
})();
