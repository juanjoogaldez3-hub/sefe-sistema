// ============================================================
//  SEFE · test-multiempresa.js — FASE 0: cimientos multiempresa
// ============================================================
//  Cómo se corre:   node test-multiempresa.js
//
//  Qué cuida: que estén los cimientos para manejar DOS empresas
//  (SEFE y Luis A. Menocal) en la misma base — la etiqueta
//  `empresa` en las tablas separadas, el catálogo `empresas` con
//  sus políticas RLS, y el cableado en db.js / app-*.js. Todavía
//  no hay selector ni filtrado (eso es Fase 1): acá sólo la base.
// ============================================================
const fs  = require('fs');
const src = require('./test-fuente');                 // app-1..13.js concatenados
const dbjs = fs.readFileSync(__dirname + '/db.js', 'utf8');
const mig  = fs.readFileSync(__dirname + '/supabase/migrations/20260929190000_multiempresa_base.sql', 'utf8');
const migBat = fs.readFileSync(__dirname + '/supabase/migrations/20260929210000_baterias_compartidas.sql', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + (e || ''))); if (!c) fallos++; };

console.log('\n═══ Migración: catálogo de empresas ═══');
ok('crea la tabla empresas', /create table if not exists public\.empresas/.test(mig));
ok('inserta SEFE (Soluciones Efectivas, S.A.)', /'SEFE'.*'Soluciones Efectivas, S\.A\.'.*'10777860-2'/.test(mig));
ok('inserta LAML (Luis Alfonso Menocal Lezana)', /'LAML'.*'Luis Alfonso Menocal Lezana'/.test(mig));
ok('los insert no duplican (on conflict do nothing)', (mig.match(/on conflict \(codigo\) do nothing/g)||[]).length >= 2);

console.log('\n═══ Migración: RLS del catálogo ═══');
ok('activa RLS en empresas', /alter table public\.empresas enable row level security/.test(mig));
ok('política de lectura (sefe_activo)', /create policy sefe_leer on public\.empresas[\s\S]*?sefe_activo\(\)/.test(mig));
ok('sólo admin crea/edita/borra empresas', (mig.match(/sefe_es_admin\(\)/g)||[]).length >= 3);
ok('grant a authenticated', /grant select, insert, update, delete on public\.empresas to authenticated/.test(mig));

console.log('\n═══ Migración: etiqueta empresa en tablas separadas ═══');
const separadas = ['clientes','productos','documentos','abonos','cotizaciones','proveedores','compras','pagos_proveedor','cuentas_banco','movimientos_banco','creditos_cliente','cobros_ruta','ctrl_ambientales'];
ok('lista las 13 tablas separadas', separadas.every(t => new RegExp("'"+t+"'").test(mig)), 'falta alguna en el array');
ok('agrega la columna con DEFAULT SEFE (seguro de correr)', /add column if not exists empresa text not null default ''SEFE''/.test(mig));
ok('normaliza NULLs viejos a SEFE', /update public\.%I set empresa=''SEFE'' where empresa is null/.test(mig));

console.log('\n═══ Baterías es COMPARTIDO (corrección) ═══');
ok('la migración correctiva quita empresa de las 3 tablas de baterías',
   /ctrl_bat_tipos','ctrl_bat_cambios','ctrl_bat_entregas/.test(migBat) && /drop column if exists empresa/.test(migBat));
ok('baterías NO cuenta como separada', !separadas.some(t => t.startsWith('ctrl_bat_')));

console.log('\n═══ Migración: índices para el filtrado ═══');
ok('índice en documentos(empresa)', /create index if not exists idx_documentos_empresa\s+on public\.documentos\(empresa\)/.test(mig));
ok('índice en clientes(empresa)',  /idx_clientes_empresa/.test(mig));
ok('índice en productos(empresa)', /idx_productos_empresa/.test(mig));

console.log('\n═══ db.js: catálogo de empresas ═══');
ok('mapEmpresaFromDB existe', /function mapEmpresaFromDB\(e\)\{/.test(dbjs));
ok('carga el catálogo con su propio try/catch (tolera tabla ausente)', /sb\.from\('empresas'\)\.select\('\*'\)\.order\('orden'\)/.test(dbjs));
ok('marca _multiempresa cuando hay más de una activa', /window\._multiempresa = empresas\.filter\(e=>e\.activo\)\.length > 1/.test(dbjs));
ok('guardarEmpresa existe (para editar datos fiscales)', /async function guardarEmpresa\(emp\)\{/.test(dbjs));

console.log('\n═══ db.js: cada entidad separada lee su empresa ═══');
[
  ['cliente',      /function mapClienteFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['producto',     /function mapProductoFromDB[\s\S]*?empresa:p\.empresa\|\|'SEFE'/],
  ['proveedor',    /function mapProveedorFromDB[\s\S]*?empresa:p\.empresa\|\|'SEFE'/],
  ['abono',        /function mapAbonoFromDB[\s\S]*?empresa:a\.empresa\|\|'SEFE'/],
  ['documento',    /function mapDocumentoFromDB[\s\S]*?empresa:d\.empresa\|\|'SEFE'/],
  ['cobro de ruta',/function mapCobroRutaFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['compra',       /function mapCompraFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['cuenta banco', /function mapCuentaBancoFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['movimiento',   /function mapMovimientoBancoFromDB[\s\S]*?empresa:m\.empresa\|\|'SEFE'/],
  ['cotización',   /function mapCotizacionFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['crédito',      /function mapCreditoFromDB[\s\S]*?empresa:c\.empresa\|\|'SEFE'/],
  ['ambiental',    /function mapAmbServicioFromDB[\s\S]*?empresa:a\.empresa\|\|'SEFE'/],
].forEach(([n,re]) => ok('map'+n+' incluye empresa', re.test(dbjs)));

console.log('\n═══ app-*.js: globales multiempresa ═══');
ok('declara let empresas=[]', /let empresas=\[\];/.test(src));
ok('declara empresaActiva', /let empresaActiva=null;/.test(src));
ok('empresaActivaObj() busca la empresa activa', /function empresaActivaObj\(\)\{ return \(empresas\|\|\[\]\)\.find\(e=>e\.codigo===empresaActiva\)/.test(src));
ok('haymultiempresa() cuenta las activas', /function haymultiempresa\(\)\{ return \(empresas\|\|\[\]\)\.filter\(e=>e\.activo\)\.length>1; \}/.test(src));

console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
process.exit(fallos ? 1 : 0);
