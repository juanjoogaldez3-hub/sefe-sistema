-- ============================================================
-- SEFE · Despachos — Paradas manuales de ruta
-- ============================================================
-- Paradas que NO son entregas de documentos (ir al banco, recolectar
-- producto en un proveedor, cargar combustible, etc.) y que se suman a
-- la ruta de un piloto. Si llevan dirección, se ubican en el mapa y
-- entran al orden por cercanía/horarios junto con las entregas.
--
-- Incluye SUS políticas RLS desde el inicio (el proyecto tiene RLS
-- activo: una tabla sin políticas queda cerrada al navegador).
-- Seguro de correr de más: usa 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.paradas_ruta (
  id           bigserial primary key,
  piloto_id    bigint,
  titulo       text not null,
  nota         text,
  direccion    text,
  lat          double precision,
  lng          double precision,
  hora_limite  text,
  orden_ruta   integer,
  hecha        boolean not null default false,
  hecha_fecha  timestamptz,
  creada       timestamptz not null default now(),
  creada_por   text
);

alter table public.paradas_ruta enable row level security;

drop policy if exists sefe_leer   on public.paradas_ruta;
create policy sefe_leer   on public.paradas_ruta for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.paradas_ruta;
create policy sefe_crear  on public.paradas_ruta for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.paradas_ruta;
create policy sefe_editar on public.paradas_ruta for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.paradas_ruta;
create policy sefe_borrar on public.paradas_ruta for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.paradas_ruta to authenticated;
grant usage, select on sequence public.paradas_ruta_id_seq to authenticated;
