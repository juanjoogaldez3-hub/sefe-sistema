// ============================================================
//  SEFE · test-tienda.js — TIENDA EN LÍNEA
// ============================================================
//  Cómo se corre:   node test-tienda.js
//  Cuida la lógica del módulo "Tienda en línea" (js/app-14.js):
//   1. A qué empresa se sugiere mandar cada línea de un pedido web.
//   2. Qué cliente se usa en cada empresa (o si hay que crearlo).
//   3. La ficha unificada por código (foto y "oculto" por código).
//   4. Que el módulo esté cableado (menú, permisos, vista, migración).
// ============================================================
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(__dirname+'/js/app-14.js','utf8');
let f=0,n=0;
const ok=(t,c,e)=>{n++;console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → '+JSON.stringify(e)));if(!c)f++;};

const ctx={console,setTimeout:()=>0,setInterval:()=>0,URL,Object,Array,Math,Number,String,Date,
  location:{href:'https://sistema.se-fe.com/#tiendaweb'},
  productos:[
    {id:1,codigo:'tk1',nombre:'Toalla SEFE',precio:100,stock:5,empresa:'SEFE',tipoEmpaque:'unidad'},
    {id:2,codigo:'TK1 ',nombre:'Toalla LAML',precio:120,stock:50,empresa:'LAML',tipoEmpaque:'unidad'},
    {id:3,codigo:'CJ1',nombre:'Caja',precio:300,stock:99,stockCajas:4,empresa:'SEFE',tipoEmpaque:'caja_unidad'},
    {id:4,codigo:'SV1',nombre:'Servicio',precio:50,stock:0,empresa:'SEFE',categoria:'Servicios'},
    {id:5,codigo:'OFF',nombre:'Inactivo',precio:50,stock:9,empresa:'SEFE',activo:false},
  ],
  clientes:[
    {id:10,nombre:'Hotel Uno',nit:'123456-7',empresa:'SEFE'},
    {id:11,nombre:'Hotel Uno sede',nit:'1234567',empresa:'SEFE',sedesDe:10},
    {id:12,nombre:'Hotel Uno LAML',nit:'123456-7',empresa:'LAML'},
    {id:13,nombre:'Baja',nit:'999',empresa:'SEFE',activo:false},
  ],
  ajustes:{},
};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(src+'\n;globalThis.T={_twSugerida,_twClienteEn,_twFichas,_twDisp,_twModo,_twCfg,_twUrl,_twClaveNueva:_twClaveNueva.toString(),setExtra:x=>{_twExtra=x}};',ctx);
const T=ctx.T;

console.log('\n═══ Empresa sugerida por línea ═══');
ok('la preferida si le alcanza',T._twSugerida({codigo:'TK1',cantidad:3},'SEFE')==='SEFE');
ok('la otra si a la preferida no le alcanza',T._twSugerida({codigo:'TK1',cantidad:20},'SEFE')==='LAML');
ok('la preferida si a ninguna le alcanza',T._twSugerida({codigo:'TK1',cantidad:500},'SEFE')==='SEFE');
ok('si sólo existe en una, esa',T._twSugerida({codigo:'CJ1',cantidad:1},'LAML')==='SEFE');
ok('código que ya no existe → vacío',T._twSugerida({codigo:'NOPE',cantidad:1},'SEFE')==='');
ok('producto inactivo no cuenta',T._twSugerida({codigo:'OFF',cantidad:1},'SEFE')==='');
ok('caja_unidad cuenta las cajas, no las unidades',T._twDisp(ctx.productos[2])===4&&T._twModo(ctx.productos[2])==='caja');

console.log('\n═══ Cliente por empresa ═══');
ok('cliente con acceso, en su empresa: el mismo',T._twClienteEn({cliente_id:11,nit:'123456-7'},'SEFE').id===11);
ok('en la otra empresa: se busca por NIT',T._twClienteEn({cliente_id:11,nit:'123456-7'},'LAML').id===12);
ok('por NIT prefiere la casa matriz, no la sede',T._twClienteEn({nit:'1234567'},'SEFE').id===10);
ok('CF no se empata con nadie (se crea)',T._twClienteEn({nit:'CF'},'SEFE')===null);
ok('cliente dado de baja no se usa',T._twClienteEn({nit:'999'},'SEFE')===null);

console.log('\n═══ Ficha unificada por código ═══');
T.setExtra({2:{img:'https://x/y.jpg',oculto:false},3:{img:'',oculto:true}});
const fichas=T._twFichas();
const tk=fichas.find(x=>x.cod==='TK1');
ok('una ficha por código (2 empresas → 1 ficha)',fichas.filter(x=>x.cod==='TK1').length===1&&tk.ids.length===2);
ok('precio público = el más alto',tk.precio===120);
ok('existencias = la empresa que más tiene',tk.disp===50);
ok('la foto de cualquiera de los dos vale para la ficha',tk.img==='https://x/y.jpg');
ok('servicios e inactivos no salen',!fichas.some(x=>x.cod==='SV1'||x.cod==='OFF'));
ok('oculto se respeta',fichas.find(x=>x.cod==='CJ1').oculto===true);

console.log('\n═══ Configuración y enlace ═══');
ok('sin ajuste guardado, la tienda está apagada',T._twCfg().activa===false);
ok('el enlace apunta a /tienda/',T._twUrl()==='https://sistema.se-fe.com/tienda/');
ok('la clave usa el generador seguro del navegador',/crypto\.getRandomValues/.test(T._twClaveNueva));

console.log('\n═══ Cableado ═══');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const a1=fs.readFileSync(__dirname+'/js/app-1.js','utf8');
const mig=fs.readFileSync(__dirname+'/supabase/migrations/20261126120000_tienda_en_linea.sql','utf8');
const tienda=fs.readFileSync(__dirname+'/tienda/index.html','utf8');
ok('botón en el menú y sección de la vista',/data-view="tiendaweb"/.test(html)&&/id="tiendaweb-body"/.test(html)&&/js\/app-14\.js\?v=/.test(html));
ok('go() despacha la vista',/v==='tiendaweb'&&typeof renderTiendaWeb==='function'/.test(a1));
ok('la vista es válida para el #hash',/'tiendaweb'/.test(fs.readFileSync(__dirname+'/js/app-11.js','utf8')));
ok('aparece en Permisos',/key:'tiendaweb'/.test(fs.readFileSync(__dirname+'/js/app-7.js','utf8')));
ok('el pedido web sólo se crea por la función (sin política de insert)',!/for insert[^;]*pedidos_web/i.test(mig)&&/revoke all on public\.pedidos_web from anon/.test(mig));
ok('las funciones internas no las puede llamar el público',/revoke all on function public\.tienda__productos\(bigint\)\s+from public, anon, authenticated/.test(mig));
ok('la página pública no lee tablas directo, sólo funciones tienda_*',!/rest\/v1\/(?!rpc\/)/.test(tienda)&&/rpc\('tienda_catalogo'/.test(tienda));
ok('la página pública manda sólo códigos y cantidades (no precios)',/items:lineas\(\)\.map\(function\(l\)\{return \{c:l\.p\.c,q:l\.n\};\}\)/.test(tienda));

console.log(f?`\n✗ ${f} de ${n} fallaron`:`\n✓ TODO BIEN — ${n} pruebas pasaron`);
process.exit(f?1:0);
