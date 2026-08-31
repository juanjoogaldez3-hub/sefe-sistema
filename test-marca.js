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

// Bloque `marca` de SEFE tal cual va en config.js (produccion).
const MARCA_SEFE={
  nombre:'SEFE', tagline:'PEDIDOS & FACTURACIÓN', tituloPestana:'Pedidos y Facturación',
  nombreLargo:'Soluciones Efectivas', monograma:'SE',
  razonSocial:'Soluciones Efectivas, S.A.', membrete:'SEFE, S.A.',
  nombreDoc:'Soluciones Efectivas GT', nit:'10777860-2',
  ciudadPais:'Guatemala, C.A.', ciudadDoc:'Guatemala, Guatemala', prefijoArchivo:'SEFE',
  colorPrimario:'#173916', colorPrimario700:'#234d20', colorPrimario600:'#2c5e28',
  colorAcento:'#A8C038', colorAcentoOsc:'#7f9a26'
};

// ── 1) El PRODUCTO por defecto es Pulso 360 ────────────────
console.log('\n═══ Sin bloque `marca` → el producto: Pulso 360 ═══');
const P=correr(null);
ok('nombre = Pulso 360', P.marca.nombre==='Pulso 360', P.marca.nombre);
ok('nombreLargo = Pulso 360', P.marca.nombreLargo==='Pulso 360', P.marca.nombreLargo);
ok('monograma = P3', P.marca.monograma==='P3', P.marca.monograma);
ok('prefijoArchivo = PULSO', P.marca.prefijoArchivo==='PULSO', P.marca.prefijoArchivo);
ok('pestaña = "Pulso 360 · Sistema de gestión"', P.dom.document.title==='Pulso 360 · Sistema de gestión', P.dom.document.title);
ok('barra: nombre = Pulso 360', P.dom.h2.textContent==='Pulso 360', P.dom.h2.textContent);

// ── 2) SEFE es un CLIENTE: queda idéntico a como estaba ────
console.log('\n═══ SEFE (cliente) → idéntico a hoy ═══');
const S=correr(MARCA_SEFE);
ok('nombre = SEFE', S.marca.nombre==='SEFE', S.marca.nombre);
ok('razonSocial = Soluciones Efectivas, S.A.', S.marca.razonSocial==='Soluciones Efectivas, S.A.', S.marca.razonSocial);
ok('membrete = SEFE, S.A.', S.marca.membrete==='SEFE, S.A.', S.marca.membrete);
ok('nombreDoc = Soluciones Efectivas GT', S.marca.nombreDoc==='Soluciones Efectivas GT', S.marca.nombreDoc);
ok('nit = 10777860-2', S.marca.nit==='10777860-2', S.marca.nit);
ok('logo = el SEFE_LOGO (heredado del default)', S.marca.logo===LOGO_SEFE, S.marca.logo);
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

// ── 3) Cliente nuevo: pisa e hereda ────────────────────────
console.log('\n═══ Cliente nuevo: pisa lo suyo, hereda el resto ═══');
const C=correr({nombre:'ACME',monograma:'AC',membrete:'ACME, S.A.',logo:'data:image/png;base64,ACMEXYZ',colorPrimario:'#0055aa',colorAcento:'#ffaa00'});
ok('nombre pisado = ACME', C.marca.nombre==='ACME', C.marca.nombre);
ok('monograma pisado = AC', C.marca.monograma==='AC', C.marca.monograma);
ok('membrete pisado = ACME, S.A.', C.marca.membrete==='ACME, S.A.', C.marca.membrete);
ok('logo pisado = el de ACME', C.marca.logo==='data:image/png;base64,ACMEXYZ', C.marca.logo);
ok('razonSocial HEREDADA del default (Pulso 360)', C.marca.razonSocial==='Pulso 360', C.marca.razonSocial);
ok('tagline HEREDADO del default (GESTIÓN 360°)', C.marca.tagline==='GESTIÓN 360°', C.marca.tagline);

console.log('\n═══ Cliente: aplicarMarca() repinta la interfaz ═══');
ok('pestaña = "ACME · Sistema de gestión" (tituloPestana heredado)', C.dom.document.title==='ACME · Sistema de gestión', C.dom.document.title);
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
