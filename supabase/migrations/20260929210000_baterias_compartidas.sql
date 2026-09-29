-- ============================================================
-- SEFE · Multiempresa — Baterías es COMPARTIDO (corrección)
-- ============================================================
-- En la Fase 0 (20260929190000) se separó baterías por empresa por
-- corazonada. Se corrige: el control de baterías va MEZCLADO entre
-- las dos empresas (stock, cambios y entregas se comparten), igual
-- que la ruta. Se le quita la etiqueta `empresa` que no va a usar.
--
-- No se edita la migración anterior (ya aplicada): esta la corrige.
-- Seguro de correr de más: 'if exists' / 'drop column if exists'.
-- ============================================================

do $$
declare
  t text;
  tablas text[] := array['ctrl_bat_tipos','ctrl_bat_cambios','ctrl_bat_entregas'];
begin
  foreach t in array tablas loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=t and c.relkind='r') then
      execute format('alter table public.%I drop column if exists empresa', t);
    end if;
  end loop;
end $$;
