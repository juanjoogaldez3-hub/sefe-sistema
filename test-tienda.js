// ============================================================
//  SEFE · test-tienda.js — TIENDA EN LÍNEA
// ============================================================
//  Cómo se corre:   node test-tienda.js
//  Cuida la lógica del módulo "Tienda en línea" (js/app-14.js):
//   1. A qué empresa se sugiere mandar cada línea de un pedido web.
//   2. Qué cliente se usa en cada empresa (o si hay que crearlo).
//   3. La ficha unificada por código (foto, descripción y "oculto" por código).
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
vm.runInContext(src+'\n;globalThis.T={_twEmparejar,_twLimpiarDesc,_twSugerida,_twClienteEn,_twFichas,_twDisp,_twModo,_twCfg,_twUrl,_twClaveNueva:_twClaveNueva.toString(),setExtra:x=>{_twExtra=x}};',ctx);
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
T.setExtra({1:{img:'',oculto:false,desc:''},2:{img:'https://x/y.jpg',oculto:false,desc:' Toalla de manos. '},3:{img:'',oculto:true}});
const fichas=T._twFichas();
const tk=fichas.find(x=>x.cod==='TK1');
ok('una ficha por código (2 empresas → 1 ficha)',fichas.filter(x=>x.cod==='TK1').length===1&&tk.ids.length===2);
ok('precio público = el más alto',tk.precio===120);
ok('existencias = la empresa que más tiene',tk.disp===50);
ok('la foto de cualquiera de los dos vale para la ficha',tk.img==='https://x/y.jpg');
ok('la ficha expone desc (la primera no vacía entre sus ids)',tk.desc==='Toalla de manos.');
ok('sin descripción → desc vacío',fichas.find(x=>x.cod==='CJ1').desc==='');
ok('servicios e inactivos no salen',!fichas.some(x=>x.cod==='SV1'||x.cod==='OFF'));
ok('oculto se respeta',fichas.find(x=>x.cod==='CJ1').oculto===true);

console.log('\n═══ Fotos y descripciones de la tienda anterior ═══');
const pares=T._twEmparejar([
    {nombre:'Tork, Toalla de manos universal 6x240mts',img:'',desc:'',ids:[1]},
    {nombre:'ELITE PAPEL HIGIENICO JUMBO ROLL 400 MTS',img:'',desc:'',ids:[2]},
    {nombre:'YA TIENE',img:'https://x',desc:'Ya escrita',ids:[3]},
    {nombre:'JABON AZUL',img:'',desc:'',ids:[4]},
    {nombre:'Con foto sin texto',img:'https://propia/5.jpg',desc:'',ids:[5]},
    {nombre:'Con texto sin foto',img:'',desc:'Texto propio',ids:[6]},
    {nombre:'Solo foto disponible',img:'',desc:'',ids:[7]},
    {nombre:'Tiene foto y afuera no hay texto',img:'https://propia/8.jpg',desc:'',ids:[8]},
  ],
  [['TORK, TOALLA DE MANOS UNIVERSAL 6X240MTS','https://a/1.png','Toalla en rollo.\n- 6 rollos'],
   ['ELITE, PAPEL HIGIÉNICO JUMBO ROLL 400 MTS HS','https://a/2.png','Papel jumbo'],
   ['YA TIENE','https://a/3.png','Otra descripción'],
   ['JABON VERDE','https://a/4.png','Jabón'],
   ['CON FOTO SIN TEXTO','https://a/5.png','Descripción nueva'],
   ['CON TEXTO SIN FOTO','https://a/6.png','Descripción de afuera'],
   ['SOLO FOTO DISPONIBLE','https://a/7.png',''],
   ['TIENE FOTO Y AFUERA NO HAY TEXTO','https://a/8.png','']]);
const par=i=>pares.find(x=>x.f.ids[0]===i);
ok('mismo nombre (sin importar mayúsculas ni comas) → seguro, con foto y descripción',par(1)&&par(1).seguro&&par(1).img==='https://a/1.png'&&par(1).desc==='Toalla en rollo.\n• 6 rollos',par(1));
ok('nombre parecido → se ofrece como dudoso',par(2)&&!par(2).seguro&&par(2).desc==='Papel jumbo',par(2));
ok('la ficha con foto y descripción no aparece',!par(3));
ok('nombres cortos distintos no se empatan',!par(4));
ok('completa la descripción aunque ya tenga foto (y no pisa la foto)',par(5)&&par(5).desc==='Descripción nueva'&&par(5).img==='',par(5));
ok('completa la foto sin pisar la descripción que ya tiene',par(6)&&par(6).img==='https://a/6.png'&&par(6).desc==='',par(6));
ok('si afuera sólo hay foto, trae sólo la foto',par(7)&&par(7).img==='https://a/7.png'&&par(7).desc==='',par(7));
ok('si lo único que falta no existe afuera, no aparece',!par(8));
ok('el formato viejo de 2 campos no rompe',T._twEmparejar([{nombre:'A B',img:'',desc:'',ids:[1]}],[['a b','https://a/9.png']])[0].img==='https://a/9.png');

console.log('\n═══ Descripción: limpieza al guardar ═══');
ok('"- " y "* " al inicio de línea pasan a "• "',T._twLimpiarDesc('Resumen\n- uno\n* dos\n• tres')==='Resumen\n• uno\n• dos\n• tres');
ok('un guion en medio del texto no se toca',T._twLimpiarDesc('Rollo 6x240 - doble hoja')==='Rollo 6x240 - doble hoja');
ok('respeta subtítulos y enlaces @pdf',T._twLimpiarDesc('## Usos\n@pdf Hoja técnica|https://x/h.pdf')==='## Usos\n@pdf Hoja técnica|https://x/h.pdf');
ok('recorta espacios, saltos de Windows y renglones vacíos de más',T._twLimpiarDesc('  Hola  \r\n\r\n\r\n\r\n  -   mundo  \r\n')==='Hola\n\n• mundo');
ok('vacío o sólo espacios → cadena vacía (se guarda null)',T._twLimpiarDesc('  \n \n')===''&&T._twLimpiarDesc(null)==='');
ok('tope de 4000 caracteres',T._twLimpiarDesc('x'.repeat(5000)).length===4000);

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
