-- ============================================================
-- SEFE · RLS para las tablas nuevas (empleados, conciliaciones)
-- ============================================================
-- Las tablas 'empleados' y 'conciliaciones' se crearon sin políticas
-- de seguridad, y como el proyecto tiene RLS activo (ver
-- 20260812030419_rls.sql), la base bloqueaba leer/escribir desde el
-- navegador. Esto les pone las MISMAS políticas que las tablas
-- operativas, reusando las funciones sefe_* que ya existen.
--
-- Seguro de correr de más: usa 'if exists' / 'drop policy if exists'.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['empleados','conciliaciones'] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=t and c.relkind='r') then

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

      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end if;
  end loop;
  -- Que las secuencias (id bigserial) sean usables al insertar.
  grant usage, select on all sequences in schema public to authenticated;
end $$;
