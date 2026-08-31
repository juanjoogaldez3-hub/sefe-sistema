-- ============================================================
-- SEFE · REVERTIR LA RLS CAPA 2 (volver a capa 1)
-- ============================================================
-- BOTÓN DE PÁNICO de la capa 2. Correr esto si después de aplicar
-- 20260831120000_rls_capa2.sql algún rol de back office (Gerencia,
-- Contabilidad, Bodega…) dejó de ver compras o bancos, o algo se
-- rompió.
--
-- NO reabre el hueco de internet: deja las 6 tablas con la seguridad
-- de la CAPA 1 (cualquier usuario ACTIVO las lee; sin sesión, nada).
-- O sea, quita sólo el filtro por rol de la capa 2 y vuelve al estado
-- anterior. Tarda menos de un segundo y no toca ningún dato.
--
-- Después: revisar por qué falló (lo más común, que la columna
-- 'views' de un rol de back office no traiga 'compras'/'cobros'/…)
-- y volver a aplicar la capa 2.
-- ============================================================

do $$
declare
  t text;
  sensibles text[] := array[
    'compras', 'pagos_proveedor', 'proveedores',
    'cuentas_banco', 'movimientos_banco', 'conciliaciones'
  ];
  existe boolean;
begin
  foreach t in array sensibles loop
    select exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') into existe;
    if not existe then continue; end if;

    execute format('alter table public.%I enable row level security', t);

    -- Vuelta a CAPA 1: leer = cualquier usuario activo.
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

    raise notice 'capa 2 revertida (vuelve a capa 1): %', t;
  end loop;
end $$;

-- La función sefe_ve_backoffice() se puede dejar: sola no hace nada.
-- Si igual la querés fuera:
-- drop function if exists public.sefe_ve_backoffice();

-- Verificar: las 6 tablas siguen con RLS=true y 4 políticas.
select c.relname as tabla, c.relrowsecurity as "RLS", count(p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname='public'
  and c.relname in ('compras','pagos_proveedor','proveedores',
                    'cuentas_banco','movimientos_banco','conciliaciones')
group by c.relname, c.relrowsecurity
order by c.relname;
