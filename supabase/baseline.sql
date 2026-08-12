-- ============================================================
-- BASELINE — sólo se corre UNA VEZ por base, y sólo en las que
-- YA EXISTÍAN antes de pasar a migraciones versionadas.
-- ============================================================
-- Correr en el SQL Editor de Supabase, en las DOS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
--
-- ¿Para qué sirve?
-- Supabase lleva una lista de qué migraciones ya se aplicaron.
-- Tus dos bases tienen meses de cambios hechos a mano, así que esa
-- lista está vacía: si publicáramos así, intentaría aplicar todo de
-- nuevo desde cero.
--
-- Este archivo le dice "esto ya está hecho, no lo repitas", mirando
-- el estado REAL de cada base. Por eso funciona igual en la base
-- donde ya corrimos realtime y RLS, y en la que todavía no.
--
-- NO se corre en bases nuevas (las de clientes que se sumen). Ahí
-- las migraciones se aplican de verdad, en orden, desde la primera.
--
-- No toca ningún dato. Es seguro correrlo más de una vez.
-- ============================================================


-- 1) La tabla donde Supabase anota las migraciones aplicadas.
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);


-- 2) Registrar lo que ya está aplicado, según lo que haya en la base.
do $$
declare
  tiene_base     boolean;
  tiene_realtime boolean;
  tiene_rls      boolean;
begin
  ----------------------------------------------------------
  -- BASE HISTÓRICA
  -- Se comprueba mirando si las columnas de esos meses ya están.
  -- No se da por sentado: si esto se corriera por error en una
  -- base nueva y vacía, marcarla como aplicada sin haberla
  -- aplicado dejaría a ese cliente con columnas faltantes y
  -- errores raros meses después.
  ----------------------------------------------------------
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'documentos'
      and column_name  = 'nit_facturado'
  ) into tiene_base;

  if tiene_base then
    insert into supabase_migrations.schema_migrations (version, name)
    values ('20260805000000', 'base_historico')
    on conflict (version) do nothing;
    raise notice 'registrada: base_historico (ya estaba aplicada)';
  else
    raise notice 'PENDIENTE: base_historico — esta base parece nueva, se va a aplicar de verdad';
  end if;

  ----------------------------------------------------------
  -- REALTIME — sólo si las tablas ya están publicadas.
  ----------------------------------------------------------
  select exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'documentos'
  ) into tiene_realtime;

  if tiene_realtime then
    insert into supabase_migrations.schema_migrations (version, name)
    values ('20260812024415', 'realtime')
    on conflict (version) do nothing;
    raise notice 'registrada: realtime (ya estaba aplicado)';
  else
    raise notice 'PENDIENTE: realtime — se va a aplicar solo en la próxima publicación';
  end if;

  ----------------------------------------------------------
  -- RLS — sólo si las funciones de permisos ya existen.
  ----------------------------------------------------------
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'sefe_rol'
  ) into tiene_rls;

  if tiene_rls then
    insert into supabase_migrations.schema_migrations (version, name)
    values ('20260812030419', 'rls')
    on conflict (version) do nothing;
    raise notice 'registrada: rls (ya estaba aplicado)';
  else
    raise notice 'PENDIENTE: rls — se va a aplicar solo en la próxima publicación';
  end if;
end $$;


-- 3) Verificación: qué quedó registrado en esta base.
select version, name, 'ya aplicada' as estado
from supabase_migrations.schema_migrations
order by version;
