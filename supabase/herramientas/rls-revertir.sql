-- ============================================================
-- SEFE · REVERTIR LA SEGURIDAD A NIVEL DE BASE (RLS)
-- ============================================================
-- BOTÓN DE PÁNICO. Correr esto si después de aplicar
-- migracion-rls.sql alguien no puede entrar o no puede trabajar,
-- y necesitás que el sistema vuelva a funcionar YA.
--
-- Deja la base exactamente como estaba antes: sin RLS.
-- Tarda menos de un segundo y no toca ningún dato.
--
-- ⚠️ Ojo: al correr esto volvés al estado en que cualquiera con la
--    anon key puede leer y escribir todo. Es un parche temporal
--    para no dejar parada la operación, no un lugar donde quedarse.
--    Arreglá lo que falló y volvé a aplicar migracion-rls.sql.
--
-- Lo más común que falla, en orden:
--   1. El correo en la tabla 'usuarios' no es idéntico al de
--      Supabase Auth (una mayúscula, un espacio, un dominio
--      distinto). La consulta 3 de migracion-rls.sql los lista.
--   2. El usuario está con activo = false.
--   3. El 'rol' del usuario no existe en la tabla 'roles'.
--   4. No se subió el arreglo del login antes de aplicar RLS.
-- ============================================================

do $$
declare
  t text;
  tablas text[] := array[
    'clientes', 'productos', 'proveedores', 'categorias',
    'documentos', 'abonos',
    'compras', 'pagos_proveedor',
    'cobros_ruta',
    'cuentas_banco', 'movimientos_banco',
    'talonarios', 'recibos_anulados',
    'vendedores', 'pilotos',
    'recordatorios', 'cotizaciones',
    'usuarios', 'roles', 'dashboard_config',
    'auditoria'
  ];
begin
  foreach t in array tablas loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') then
      continue;
    end if;

    execute format('drop policy if exists sefe_leer   on public.%I', t);
    execute format('drop policy if exists sefe_crear  on public.%I', t);
    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format('alter table public.%I disable row level security', t);

    raise notice 'RLS desactivado: %', t;
  end loop;
end $$;

-- Las funciones de apoyo se pueden dejar: solas no hacen nada.
-- Si igual las querés fuera, descomentá:
-- drop function if exists public.sefe_puede_escribir();
-- drop function if exists public.sefe_solo_lectura();
-- drop function if exists public.sefe_es_admin();
-- drop function if exists public.sefe_activo();
-- drop function if exists public.sefe_rol();

-- Verificar: la columna "RLS activo" debe decir false en todas.
select c.relname as tabla, c.relrowsecurity as "RLS activo"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
