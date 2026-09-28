-- ============================================================
-- SEFE · Ajustes generales (clave/valor)
-- ============================================================
-- Tabla genérica de configuración editable desde la app (empieza con la
-- meta de ventas del mes: clave 'meta_ventas_mes'). Reutilizable a futuro
-- para otros ajustes globales.
--
-- Incluye SUS políticas RLS desde el inicio (el proyecto tiene RLS activo).
-- Seguro de correr de más: usa 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.ajustes (
  clave           text primary key,
  valor           jsonb,
  actualizado     timestamptz not null default now(),
  actualizado_por text
);

alter table public.ajustes enable row level security;

drop policy if exists sefe_leer   on public.ajustes;
create policy sefe_leer   on public.ajustes for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.ajustes;
create policy sefe_crear  on public.ajustes for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.ajustes;
create policy sefe_editar on public.ajustes for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.ajustes;
create policy sefe_borrar on public.ajustes for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.ajustes to authenticated;
