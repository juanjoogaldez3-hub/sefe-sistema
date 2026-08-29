// ============================================================
//  SEFE · test-marca.js — BRANDING POR CLIENTE
// ============================================================
//  Cómo se corre:   node test-marca.js
//  No necesita internet ni instalar nada.
//
//  Qué cuida:
//   1. Para SEFE (sin bloque `marca`) TODO queda idéntico a como
//      estaba: mismo nombre, logo, membrete, NIT y colores. Un error
//      acá cambiaría la cara del sistema en producción.
//   2. Un cliente con su bloque `marca` pisa lo que puso y HEREDA de
//      SEFE lo que no puso.
//   3. aplicarMarca() escribe la identidad en la interfaz (pestaña,
//      barra lateral, colores, login) sin romperse.
// ============================================================

const fs=require('fs'), vm=require('vm');

// Saca del app-1.js real el bloque de MARCA (desde _MARCA_DEFAULT hasta
// justo antes de `let clientes=[`), para probar el código de verdad.
const src=fs.readFileSync(require.resolve('./js/app-1.js'),'utf8');
const m=src.match(/const _MARCA_DEFAULT[\s\S]*?try\{ aplicarMarca\(\); \}catch\(e\)\{\}/);
if(!m){ console.log('✗ no se encontró el bloque de marca en app-1.js'); process.exit(1); }
const BLOQUE=m[0];

let f=0,n=0;
const ok=(t,c,e)=>{n++;console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → '+JSON.stringify(e)));if(!c)f++;};

const LOGO_SEFE='data:image/png;base64,SEFELOGOAAA';

// DOM de mentira: guarda todo lo que aplicarMarca() escribe para poder
// revisarlo después.
function E(){return {textContent:'',src:'',_a:{},setAttribute(k,v){this._a[k]=v;},getAttribute(k){return this._a[k];},style:{_p:{},setProperty(k,v){this._p[k]=v;}},_c:{},querySelector(s){return this._c[s]||E();}};}

function correr(marca){
  const metaApp=E(),metaTheme=E(),brand=E(),mk=E(),h2=E(),span=E(),loader=E(),loaderBar=E(),loaderNom=E(),loginImg=E();
  brand._c={'.mk':mk,'h2':h2,'span':span};
  loader._c={'div[style*="font-weight:600"]':loaderNom};
  const rootStyle={_p:{},setProperty(k,v){this._p[k]=v;}};
  const document={
    title:'',
    documentElement:{style:rootStyle},
    querySelector(sel){
      if(sel==='meta[name="apple-mobile-web-app-title"]')return metaApp;
      if(sel==='meta[name="theme-color"]')return metaTheme;
      if(sel==='.brand')return brand;
      if(sel==='.login-brand img')return loginImg;
      return null;
    },
    getElementById(id){ if(id==='sefe-loader')return loader; if(id==='sefe-loader-bar')return loaderBar; return null; }
  };
  const ctx={console,Object,Math,parseInt,String,Array,Number,document,
    SEFE_LOGO:LOGO_SEFE,
    SEFE_CONFIG: marca? {entorno:'x',marca}: {entorno:'x'} };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(BLOQUE+'\n;globalThis.__marca=SEFE_MARCA;globalThis.__mezcla=_mezclarColor;',ctx);
  return {marca:ctx.__marca,mezcla:ctx.__mezcla,dom:{document,metaApp,metaTheme,mk,h2,span,loader,loaderBar,loaderNom,loginImg,rootStyle}};
}

// ── 1) SEFE: todo idéntico ─────────────────────────────────
console.log('\n═══ SEFE sin bloque `marca` → idéntico a hoy ═══');
const S=correr(null);
ok('nombre = SEFE', S.marca.nombre==='SEFE', S.marca.nombre);
ok('nombreLargo = Soluciones Efectivas', S.marca.nombreLargo==='Soluciones Efectivas', S.marca.nombreLargo);
ok('razonSocial = Soluciones Efectivas, S.A.', S.marca.razonSocial==='Soluciones Efectivas, S.A.', S.marca.razonSocial);
ok('membrete = SEFE, S.A.', S.marca.membrete==='SEFE, S.A.', S.marca.membrete);
ok('nombreDoc = Soluciones Efectivas GT', S.marca.nombreDoc==='Soluciones Efectivas GT', S.marca.nombreDoc);
ok('nit = 10777860-2', S.marca.nit==='10777860-2', S.marca.nit);
ok('monograma = SE', S.marca.monograma==='SE', S.marca.monograma);
ok('prefijoArchivo = SEFE', S.marca.prefijoArchivo==='SEFE', S.marca.prefijoArchivo);
ok('logo = el SEFE_LOGO', S.marca.logo===LOGO_SEFE, S.marca.logo);
ok('colorPrimario = #173916', S.marca.colorPrimario==='#173916', S.marca.colorPrimario);
ok('colorAcento = #A8C038', S.marca.colorAcento==='#A8C038', S.marca.colorAcento);

console.log('\n═══ SEFE: aplicarMarca() escribe lo mismo de siempre ═══');
ok('pestaña = "SEFE · Pedidos y Facturación"', S.dom.document.title==='SEFE · Pedidos y Facturación', S.dom.document.title);
ok('barra: monograma = SE', S.dom.mk.textContent==='SE', S.dom.mk.textContent);
ok('barra: nombre = SEFE', S.dom.h2.textContent==='SEFE', S.dom.h2.textContent);
ok('barra: bajada = PEDIDOS & FACTURACIÓN', S.dom.span.textContent==='PEDIDOS & FACTURACIÓN', S.dom.span.textContent);
ok('theme-color = #173916', S.dom.metaTheme.getAttribute('content')==='#173916', S.dom.metaTheme._a);
ok('app title (PWA) = SEFE', S.dom.metaApp.getAttribute('content')==='SEFE', S.dom.metaApp._a);
ok('logo del login = SEFE_LOGO', S.dom.loginImg.src===LOGO_SEFE, S.dom.loginImg.src);
ok('--green = #173916', S.dom.rootStyle._p['--green']==='#173916', S.dom.rootStyle._p);
ok('--green-700 = #234d20 (tono exacto de SEFE)', S.dom.rootStyle._p['--green-700']==='#234d20', S.dom.rootStyle._p['--green-700']);
ok('--lime = #A8C038', S.dom.rootStyle._p['--lime']==='#A8C038', S.dom.rootStyle._p['--lime']);
ok('--lime-dk = #7f9a26 (tono exacto de SEFE)', S.dom.rootStyle._p['--lime-dk']==='#7f9a26', S.dom.rootStyle._p['--lime-dk']);

// ── 2) Cliente nuevo: pisa e hereda ────────────────────────
console.log('\n═══ Cliente nuevo: pisa lo suyo, hereda el resto ═══');
const C=correr({nombre:'ACME',monograma:'AC',membrete:'ACME, S.A.',logo:'data:image/png;base64,ACMEXYZ',colorPrimario:'#0055aa',colorAcento:'#ffaa00'});
ok('nombre pisado = ACME', C.marca.nombre==='ACME', C.marca.nombre);
ok('monograma pisado = AC', C.marca.monograma==='AC', C.marca.monograma);
ok('membrete pisado = ACME, S.A.', C.marca.membrete==='ACME, S.A.', C.marca.membrete);
ok('logo pisado = el de ACME', C.marca.logo==='data:image/png;base64,ACMEXYZ', C.marca.logo);
ok('razonSocial HEREDADA de SEFE', C.marca.razonSocial==='Soluciones Efectivas, S.A.', C.marca.razonSocial);
ok('tagline HEREDADO de SEFE', C.marca.tagline==='PEDIDOS & FACTURACIÓN', C.marca.tagline);

console.log('\n═══ Cliente: aplicarMarca() repinta la interfaz ═══');
ok('pestaña = "ACME · Pedidos y Facturación"', C.dom.document.title==='ACME · Pedidos y Facturación', C.dom.document.title);
ok('barra: nombre = ACME', C.dom.h2.textContent==='ACME', C.dom.h2.textContent);
ok('theme-color = #0055aa', C.dom.metaTheme.getAttribute('content')==='#0055aa', C.dom.metaTheme._a);
ok('--green = #0055aa (color del cliente)', C.dom.rootStyle._p['--green']==='#0055aa', C.dom.rootStyle._p['--green']);
ok('--lime = #ffaa00 (acento del cliente)', C.dom.rootStyle._p['--lime']==='#ffaa00', C.dom.rootStyle._p['--lime']);
const g7=C.dom.rootStyle._p['--green-700'];
ok('--green-700 se derivó (hex válido de 7)', /^#[0-9a-f]{6}$/.test(g7), g7);

// ── 3) _mezclarColor ───────────────────────────────────────
console.log('\n═══ _mezclarColor: mezcla hacia blanco/negro ═══');
const mz=S.mezcla;
ok('negro→blanco al 100% = #ffffff', mz('#000000','blanco',1)==='#ffffff', mz('#000000','blanco',1));
ok('blanco→negro al 100% = #000000', mz('#ffffff','negro',1)==='#000000', mz('#ffffff','negro',1));
ok('al 0% no cambia', mz('#173916','blanco',0)==='#173916', mz('#173916','blanco',0));
ok('acepta hex de 3 (#abc)', /^#[0-9a-f]{6}$/.test(mz('#abc','negro',.2)), mz('#abc','negro',.2));

console.log('\n'+(f===0?`✓ TODO BIEN — ${n} pruebas pasaron`:`✗ ${f} de ${n} fallaron`)+'\n');
process.exit(f?1:0);
