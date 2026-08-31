-- ============================================================
-- SEFE · Controles — Ambientales (parte 1)
-- ============================================================
-- Servicios de recarga de ambientales (aromatizadores) por cliente:
-- cliente, ubicación, aroma, fecha del servicio y próximo servicio.
--
-- Incluye SUS políticas RLS desde el inicio (el proyecto tiene RLS
-- activo: una tabla sin políticas queda cerrada al navegador).
-- Seguro de correr de más: usa 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.ctrl_ambientales (
  id          bigserial primary key,
  cliente_id  bigint,
  ubicacion   text,
  aroma       text,
  fecha       date,
  proximo     date,
  nota        text,
  creado      timestamptz not null default now(),
  creado_por  text
);

alter table public.ctrl_ambientales enable row level security;

drop policy if exists sefe_leer   on public.ctrl_ambientales;
create policy sefe_leer   on public.ctrl_ambientales for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.ctrl_ambientales;
create policy sefe_crear  on public.ctrl_ambientales for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.ctrl_ambientales;
create policy sefe_editar on public.ctrl_ambientales for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.ctrl_ambientales;
create policy sefe_borrar on public.ctrl_ambientales for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.ctrl_ambientales to authenticated;
grant usage, select on sequence public.ctrl_ambientales_id_seq to authenticated;
