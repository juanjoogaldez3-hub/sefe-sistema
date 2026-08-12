-- ============================================================
-- SEFE · MIGRACIÓN: SEGURIDAD A NIVEL DE BASE (RLS)
-- ============================================================
-- ⚠️ CORRER PRIMERO EN PRUEBAS (imvoyzxdvtoktckazzsv).
--    Sólo pasar a Producción (krbyulpmfazntjwnpxnw) cuando hayas
--    verificado que TODOS los roles pueden entrar y trabajar.
--    Si algo sale mal: correr migracion-rls-revertir.sql.
--
-- ⚠️ ANTES DE CORRER ESTO hay que subir el arreglo del login
--    (el commit que acompaña este archivo). Sin él, nadie puede
--    entrar: la app busca tu usuario en una lista que se carga
--    ANTES de autenticarte, y con RLS esa lista viene vacía.
--
-- ------------------------------------------------------------
-- QUÉ PROBLEMA RESUELVE
-- ------------------------------------------------------------
-- Hoy los permisos de SEFE viven sólo en el navegador: el objeto
-- ROLES esconde botones y secciones. Eso ordena la pantalla, pero
-- no protege nada. La anon key está en el repo (como debe ser en
-- Supabase), así que hoy CUALQUIERA que la tenga puede leer y
-- escribir todas las tablas desde la consola del navegador, sin
-- siquiera iniciar sesión.
--
-- Después de esta migración:
--   · Sin sesión válida no se lee ni se escribe NADA.
--   · Un usuario inactivo queda fuera aunque su clave sirva.
--   · Un rol de sólo lectura (Auditoría) no puede escribir nada.
--   · Nadie puede subirse el rol a admin desde la consola.
--   · El registro de auditoría no se puede alterar ni borrar.
--
-- ------------------------------------------------------------
-- QUÉ *NO* RESUELVE TODAVÍA (a propósito)
-- ------------------------------------------------------------
-- Esta es la CAPA 1: separa "cualquiera en internet" de "tu gente".
-- Dentro de tu gente, cualquier usuario activo puede leer todas
-- las tablas y escribir en las operativas.
--
-- El ajuste fino por rol (que Ventas no lea los costos de compra,
-- por ejemplo) es la CAPA 2, y se hace después. Va aparte por una
-- razón concreta: si una política queda más estricta que la
-- pantalla, se rompen flujos que hoy funcionan y es muy difícil
-- darse cuenta (las filas simplemente no aparecen, sin error).
--
-- Ejemplo real de por qué hay que ir despacio: el rol Facturador
-- tiene editarInventario=false, pero al facturar el sistema
-- descuenta el stock. Si RLS exigiera editarInventario para tocar
-- 'productos', facturar dejaría de rebajar inventario en silencio.
--
-- Es seguro correr este archivo varias veces.
-- ============================================================


-- ============================================================
-- PARTE 1 · FUNCIONES DE APOYO
-- ============================================================
-- Van con SECURITY DEFINER a propósito: necesitan leer 'usuarios'
-- y 'roles' saltándose RLS. Si no, se armaría una recursión
-- infinita (para saber si podés leer usuarios hay que leer
-- usuarios). El search_path fijo es obligatorio en estas
-- funciones para que nadie pueda secuestrarlas.

-- ── ¿Qué rol tiene el que está conectado? ───────────────────
-- Devuelve NULL si no hay sesión, si el correo no está en la
-- tabla usuarios, o si el usuario está marcado como inactivo.
-- NULL = sin acceso a nada.
--
-- Busca igual que el backend (server.js): primero por auth_id, y
-- si no, por correo. El ::text es para que funcione sin importar
-- si auth_id quedó como uuid o como text.
create or replace function public.sefe_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.rol
  from usuarios u
  where (
          u.auth_id::text = auth.uid()::text
          or lower(u.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    and coalesce(u.activo, true) = true
  order by (u.auth_id::text = auth.uid()::text) desc nulls last
  limit 1
$$;

-- ── ¿Hay alguien válido conectado? ──────────────────────────
create or replace function public.sefe_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sefe_rol() is not null
$$;

-- ── ¿Es administrador? ──────────────────────────────────────
create or replace function public.sefe_es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sefe_rol() = 'admin'
$$;

-- ── ¿Su rol es de sólo lectura? ─────────────────────────────
-- Lee el flag de la tabla 'roles', que es la que edita el admin
-- desde la pantalla de Usuarios. Así, cambiar un permiso en la
-- pantalla cambia también lo que permite la base: una sola fuente
-- de verdad, sin tener que volver a tocar SQL.
create or replace function public.sefe_solo_lectura()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select coalesce(r.readonly, false) from roles r where r.rol = public.sefe_rol()),
    false
  )
$$;

-- ── ¿Puede escribir? ────────────────────────────────────────
-- Es el permiso base de escritura: sesión válida, usuario activo
-- y rol que no sea de sólo lectura.
create or replace function public.sefe_puede_escribir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sefe_rol() is not null and not public.sefe_solo_lectura()
$$;

-- Que sólo las pueda ejecutar quien tenga sesión.
revoke all on function public.sefe_rol()            from public, anon;
revoke all on function public.sefe_activo()         from public, anon;
revoke all on function public.sefe_es_admin()       from public, anon;
revoke all on function public.sefe_solo_lectura()   from public, anon;
revoke all on function public.sefe_puede_escribir() from public, anon;
grant execute on function public.sefe_rol()            to authenticated;
grant execute on function public.sefe_activo()         to authenticated;
grant execute on function public.sefe_es_admin()       to authenticated;
grant execute on function public.sefe_solo_lectura()   to authenticated;
grant execute on function public.sefe_puede_escribir() to authenticated;


-- ============================================================
-- PARTE 2 · POLÍTICAS
-- ============================================================
-- Nota de rendimiento: adentro de las políticas las funciones van
-- envueltas en (select ...). No es un capricho — así Postgres las
-- evalúa UNA vez por consulta en lugar de una vez por fila. Sin
-- eso, listar 5.000 documentos ejecutaría la función 5.000 veces.
--
-- Todas las políticas son 'to authenticated'. El rol 'anon' (el de
-- la anon key sin login) no tiene ninguna política, y en RLS lo que
-- no está permitido está prohibido. O sea: sin sesión, nada.

do $$
declare
  t text;

  -- GRUPO A · Tablas operativas del día a día.
  --   leer     → cualquier usuario activo
  --   escribir → cualquier usuario activo que no sea sólo lectura
  --   borrar   → sólo admin (en SEFE casi nada se borra: se anula,
  --              que es un UPDATE y deja rastro)
  operativas text[] := array[
    'clientes', 'productos', 'proveedores', 'categorias',
    'documentos', 'abonos',
    'compras', 'pagos_proveedor',
    'cobros_ruta',
    'cuentas_banco', 'movimientos_banco',
    'talonarios', 'recibos_anulados',
    'vendedores', 'pilotos'
  ];

  -- GRUPO B · Cosas que la gente crea y borra sola (tareas, cotizaciones).
  propias text[] := array['recordatorios', 'cotizaciones'];

  -- GRUPO C · Configuración sensible. Todos la leen (la app la
  -- necesita para armar la pantalla), pero SÓLO admin la escribe.
  -- Acá está la protección más importante de todo el archivo: sin
  -- esto, cualquiera puede abrir la consola y ponerse rol 'admin'.
  configuracion text[] := array['usuarios', 'roles', 'dashboard_config'];

  existe boolean;
begin
  ------------------------------------------------------------
  -- GRUPO A
  ------------------------------------------------------------
  foreach t in array operativas loop
    select exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') into existe;
    if not existe then raise notice 'omitida (no existe): %', t; continue; end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists sefe_leer on public.%I', t);
    execute format($f$create policy sefe_leer on public.%I
                      for select to authenticated
                      using ((select public.sefe_activo()))$f$, t);

    execute format('drop policy if exists sefe_crear on public.%I', t);
    execute format($f$create policy sefe_crear on public.%I
                      for insert to authenticated
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format($f$create policy sefe_editar on public.%I
                      for update to authenticated
                      using ((select public.sefe_puede_escribir()))
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format($f$create policy sefe_borrar on public.%I
                      for delete to authenticated
                      using ((select public.sefe_es_admin()))$f$, t);

    raise notice 'protegida (operativa): %', t;
  end loop;

  ------------------------------------------------------------
  -- GRUPO B
  ------------------------------------------------------------
  foreach t in array propias loop
    select exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') into existe;
    if not existe then raise notice 'omitida (no existe): %', t; continue; end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists sefe_leer on public.%I', t);
    execute format($f$create policy sefe_leer on public.%I
                      for select to authenticated
                      using ((select public.sefe_activo()))$f$, t);

    execute format('drop policy if exists sefe_crear on public.%I', t);
    execute format($f$create policy sefe_crear on public.%I
                      for insert to authenticated
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format($f$create policy sefe_editar on public.%I
                      for update to authenticated
                      using ((select public.sefe_puede_escribir()))
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format($f$create policy sefe_borrar on public.%I
                      for delete to authenticated
                      using ((select public.sefe_puede_escribir()))$f$, t);

    raise notice 'protegida (propia): %', t;
  end loop;

  ------------------------------------------------------------
  -- GRUPO C
  ------------------------------------------------------------
  foreach t in array configuracion loop
    select exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') into existe;
    if not existe then raise notice 'omitida (no existe): %', t; continue; end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists sefe_leer on public.%I', t);
    execute format($f$create policy sefe_leer on public.%I
                      for select to authenticated
                      using ((select public.sefe_activo()))$f$, t);

    execute format('drop policy if exists sefe_crear on public.%I', t);
    execute format($f$create policy sefe_crear on public.%I
                      for insert to authenticated
                      with check ((select public.sefe_es_admin()))$f$, t);

    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format($f$create policy sefe_editar on public.%I
                      for update to authenticated
                      using ((select public.sefe_es_admin()))
                      with check ((select public.sefe_es_admin()))$f$, t);

    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format($f$create policy sefe_borrar on public.%I
                      for delete to authenticated
                      using ((select public.sefe_es_admin()))$f$, t);

    raise notice 'protegida (configuración, sólo admin escribe): %', t;
  end loop;
end $$;


-- ------------------------------------------------------------
-- AUDITORÍA · caso aparte: sólo se agrega, nunca se toca
-- ------------------------------------------------------------
-- El log encadena hashes (prev_hash → hash) justamente para que
-- no se pueda alterar sin que se note. Sería incoherente dejar
-- que alguien lo edite o lo borre. Acá NO hay política de UPDATE
-- ni de DELETE: eso significa que nadie puede hacerlo — tampoco
-- el admin. Para tocarlo hay que entrar al panel de Supabase, que
-- es exactamente la fricción que se busca.
--
-- El INSERT no depende de sefe_puede_escribir(): un usuario de
-- sólo lectura casi no genera acciones, pero si el sistema decide
-- registrar algo, nunca debe quedar sin registrar.
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='auditoria' and c.relkind='r') then
    alter table public.auditoria enable row level security;

    drop policy if exists sefe_leer   on public.auditoria;
    drop policy if exists sefe_crear  on public.auditoria;
    drop policy if exists sefe_editar on public.auditoria;
    drop policy if exists sefe_borrar on public.auditoria;

    create policy sefe_leer on public.auditoria
      for select to authenticated
      using ((select public.sefe_activo()));

    create policy sefe_crear on public.auditoria
      for insert to authenticated
      with check ((select public.sefe_activo()));

    raise notice 'protegida (sólo se agrega, nadie edita ni borra): auditoria';
  end if;
end $$;


-- ============================================================
-- PARTE 3 · VERIFICACIÓN
-- ============================================================

-- 1) Todas las tablas deben decir RLS = true.
--    Si alguna dice false, quedó desprotegida.
select c.relname as tabla,
       c.relrowsecurity as "RLS activo",
       count(p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;

-- 2) Comprobar que TU usuario quedó bien reconocido.
--    Corriendo esto desde el SQL Editor da NULL (ahí no hay sesión
--    de usuario, es normal). La prueba de verdad es desde la app:
--    abrí la consola del navegador ya logueado y corré:
--        await sb.rpc('sefe_rol')
--    Tiene que devolver tu rol ('admin', 'ventas', …).

-- 3) Que no haya usuarios huérfanos.
--    Un usuario cuyo correo no coincida con ninguno de Supabase Auth
--    va a poder poner su contraseña pero NO va a poder trabajar.
select u.id, u.nombre, u.correo, u.rol, u.activo,
       case when a.id is null then '⚠️ SIN CUENTA DE ACCESO' else 'ok' end as estado
from usuarios u
left join auth.users a
  on a.id::text = u.auth_id::text
  or lower(a.email) = lower(u.correo)
order by estado, u.nombre;


-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================
--
-- · EL BACKEND NO SE VE AFECTADO
--   sefe-backend usa la service_role key, que se salta RLS por
--   diseño. El resumen diario por correo y el cambio de contraseña
--   siguen funcionando igual.
--
-- · EL TIEMPO REAL SÍ RESPETA RLS
--   A partir de ahora el websocket sólo manda cambios de filas que
--   el usuario puede leer. Como en la capa 1 todo usuario activo
--   lee todo, no cambia nada en la práctica — pero cuando llegue la
--   capa 2, los filtros se aplican solos también al tiempo real,
--   sin tocar realtime.js.
--
-- · SI ALGUIEN NO PUEDE ENTRAR
--   Casi siempre es una de estas tres:
--     1. Su correo en 'usuarios' no coincide con el de Supabase Auth
--        (la consulta 3 de arriba los encuentra).
--     2. Está marcado activo = false.
--     3. Su 'rol' no existe en la tabla 'roles'.
--   Para salir del apuro rápido: correr migracion-rls-revertir.sql,
--   arreglar el dato, y volver a aplicar esta migración.
--
-- · PRÓXIMO PASO (CAPA 2)
--   Restricción de lectura por rol usando roles.views. Antes de
--   hacerla hay que recorrer los flujos que escriben en tablas que
--   el rol "no debería" tocar — como el Facturador rebajando stock.
--   Esos casos son los que rompen en silencio.
--
-- ============================================================
-- FIN
-- ============================================================
