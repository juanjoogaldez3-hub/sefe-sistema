// ============================================================
//  SEFE · test-modulos.js — MÓDULOS (base + opcionales)
// ============================================================
//  Cómo se corre:   node test-modulos.js
//  No necesita internet ni instalar nada.
//
//  Qué cuida:
//   1. El sistema BASE (pedidos, facturación, clientes, inventario,
//      reportes, administración) está SIEMPRE disponible.
//   2. Los módulos opcionales quedan ENCENDIDOS si el cliente no dice
//      nada (así SEFE y lo actual no cambian). Sólo un `false` explícito
//      los apaga.
//   3. tienePermiso() respeta el módulo apagado además del rol.
// ============================================================

const fs=require('fs'), vm=require('vm');

// Saca del app-1.js real el bloque de módulos + tienePermiso().
const src=fs.readFileSync(require.resolve('./js/app-1.js'),'utf8');
const m=src.match(/const MODULOS_DESACTIVADOS[\s\S]*?\nfunction tienePermiso\(v\)\{[\s\S]*?\n\}/);
if(!m){ console.log('✗ no se encontró el bloque de módulos en app-1.js'); process.exit(1); }
const BLOQUE=m[0];

let f=0,n=0;
const ok=(t,c,e)=>{n++;console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → '+JSON.stringify(e)));if(!c)f++;};

// Corre el bloque con un config y un rol dados; devuelve las funciones.
function correr(modulos, rol){
  const ROLES={admin:{views:'ALL',label:'Admin'}, ventas:{views:['panel','pedido','documentos','clientes','cobros'],label:'Ventas'}};
  const ctx={console,Object,Array,
    ROLES, currentRole:rol||'admin',
    SEFE_CONFIG: modulos? {entorno:'x',modulos}: {entorno:'x'} };
  ctx.window=ctx; vm.createContext(ctx);
  vm.runInContext(BLOQUE+'\n;globalThis.__mod=moduloActivo;globalThis.__vis=vistaDisponible;globalThis.__perm=tienePermiso;',ctx);
  return {mod:ctx.__mod,vis:ctx.__vis,perm:ctx.__perm};
}

// ── 1) SEFE / cliente sin bloque `modulos`: TODO encendido ──
console.log('\n═══ Sin bloque `modulos` → todo encendido (SEFE) ═══');
const S=correr(null,'admin');
['cotizaciones','cobros','compras','bancos'].forEach(x=>
  ok('módulo '+x+' encendido', S.mod(x)===true, S.mod(x)));
['documentos','pedido','clientes','inventario','reportes','cobros','bancos','porpagar','talonarios','recordatorios']
  .forEach(v=>ok('vista '+v+' disponible', S.vis(v)===true, S.vis(v)));

// ── 2) Base siempre, aunque el cliente traiga modulos ──────
console.log('\n═══ El BASE nunca se apaga ═══');
const B=correr({cotizaciones:false,cobros:false,compras:false,bancos:false},'admin');
['documentos','pedido','clientes','inventario','reportes','panel','usuarios','auditoria']
  .forEach(v=>ok('base '+v+' sigue disponible', B.vis(v)===true, B.vis(v)));

// ── 3) Apagar Cobros ───────────────────────────────────────
console.log('\n═══ Cliente sin módulo Cobros ═══');
const C=correr({cobros:false},'admin');
ok('vista cobros NO disponible', C.vis('cobros')===false, C.vis('cobros'));
ok('vista recordatorios NO disponible (mismo módulo)', C.vis('recordatorios')===false, C.vis('recordatorios'));
ok('tienePermiso(cobros) = false aun siendo admin', C.perm('cobros')===false, C.perm('cobros'));
ok('documentos sigue disponible', C.vis('documentos')===true, C.vis('documentos'));
ok('compras NO se ve afectado', C.vis('porpagar')===true, C.vis('porpagar'));

// ── 4) Apagar Compras (compras+proveedores+porpagar+nuevacompra) ──
console.log('\n═══ Cliente sin módulo Compras ═══');
const K=correr({compras:false},'admin');
['compras','nuevacompra','porpagar','proveedores'].forEach(v=>
  ok('vista '+v+' NO disponible', K.vis(v)===false, K.vis(v)));
ok('cobros sigue disponible', K.vis('cobros')===true, K.vis('cobros'));
ok('bancos sigue disponible', K.vis('bancos')===true, K.vis('bancos'));

// ── 5) Apagar Bancos (bancos+talonarios) ───────────────────
console.log('\n═══ Cliente sin módulo Bancos ═══');
const N=correr({bancos:false},'admin');
ok('vista bancos NO disponible', N.vis('bancos')===false, N.vis('bancos'));
ok('vista talonarios NO disponible', N.vis('talonarios')===false, N.vis('talonarios'));

// ── 6) Módulo + rol se combinan ────────────────────────────
console.log('\n═══ Módulo y rol se combinan ═══');
const V=correr(null,'ventas');   // rol ventas: sólo panel/pedido/documentos/clientes/cobros
ok('ventas ve cobros (rol lo permite y módulo encendido)', V.perm('cobros')===true, V.perm('cobros'));
ok('ventas NO ve bancos (rol no lo permite)', V.perm('bancos')===false, V.perm('bancos'));
const V2=correr({cobros:false},'ventas');
ok('ventas NO ve cobros si el módulo está apagado', V2.perm('cobros')===false, V2.perm('cobros'));

// ── 7) sólo `false` apaga (undefined/true no) ──────────────
console.log('\n═══ Sólo `false` apaga; lo demás queda encendido ═══');
ok('cobros:true → encendido', correr({cobros:true}).mod('cobros')===true, true);
ok('cobros ausente → encendido', correr({bancos:false}).mod('cobros')===true, true);
ok('cobros:false → apagado', correr({cobros:false}).mod('cobros')===false, false);

console.log('\n'+(f===0?`✓ TODO BIEN — ${n} pruebas pasaron`:`✗ ${f} de ${n} fallaron`)+'\n');
process.exit(f?1:0);
