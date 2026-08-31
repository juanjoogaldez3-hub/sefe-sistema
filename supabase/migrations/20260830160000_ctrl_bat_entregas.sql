-- ============================================================
-- SEFE · Controles — Baterías: entregas a pilotos (parte 2.5)
-- ============================================================
-- Nivel intermedio: la batería sale de BODEGA a un PILOTO (entrega) y
-- luego el piloto la COLOCA en un cliente (cambio). Así se cuadra a cada
-- piloto: entregado − colocado = lo que le queda en mano.
--   · ctrl_bat_entregas: entregas de bodega a un piloto (descuentan de
--     la existencia en bodega).
--   · ctrl_bat_cambios: se le agrega piloto_id (de quién salió la que se
--     colocó). Ya NO descuenta de bodega (eso pasó en la entrega); baja
--     del inventario del piloto (que se calcula: entregado − colocado).
--
-- Con RLS desde el inicio. Seguro de correr de más.
-- ============================================================

create table if not exists public.ctrl_bat_entregas (
  id          bigserial primary key,
  piloto_id   bigint,
  tipo_id     bigint,
  cantidad    numeric not null default 1,
  fecha       date,
  nota        text,
  creado      timestamptz not null default now(),
  creado_por  text
);

-- A los cambios (colocaciones) les agregamos de qué piloto salieron.
alter table public.ctrl_bat_cambios add column if not exists piloto_id bigint;

-- ── RLS para la tabla nueva ──
alter table public.ctrl_bat_entregas enable row level security;

drop policy if exists sefe_leer   on public.ctrl_bat_entregas;
create policy sefe_leer   on public.ctrl_bat_entregas for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.ctrl_bat_entregas;
create policy sefe_crear  on public.ctrl_bat_entregas for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.ctrl_bat_entregas;
create policy sefe_editar on public.ctrl_bat_entregas for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.ctrl_bat_entregas;
create policy sefe_borrar on public.ctrl_bat_entregas for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.ctrl_bat_entregas to authenticated;
grant usage, select on sequence public.ctrl_bat_entregas_id_seq to authenticated;
