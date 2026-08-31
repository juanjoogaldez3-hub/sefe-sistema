-- ============================================================
-- SEFE · Controles — Gasolina (parte 3)
-- ============================================================
-- Consumo de combustible por vehículo/piloto: galones, monto,
-- kilometraje (para el rendimiento km/gal). Si se elige una cuenta de
-- banco, la carga registra su salida en Bancos (categoría combustible),
-- y acá se guarda el número de póliza de ese movimiento.
--
-- Con RLS desde el inicio. Seguro de correr de más.
-- ============================================================

create table if not exists public.ctrl_gasolina (
  id           bigserial primary key,
  piloto_id    bigint,
  vehiculo     text,
  fecha        date,
  galones      numeric not null default 0,
  monto        numeric not null default 0,
  kilometraje  numeric,
  cuenta_id    bigint,
  mov_poliza   integer,
  nota         text,
  creado       timestamptz not null default now(),
  creado_por   text
);

alter table public.ctrl_gasolina enable row level security;

drop policy if exists sefe_leer   on public.ctrl_gasolina;
create policy sefe_leer   on public.ctrl_gasolina for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.ctrl_gasolina;
create policy sefe_crear  on public.ctrl_gasolina for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.ctrl_gasolina;
create policy sefe_editar on public.ctrl_gasolina for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.ctrl_gasolina;
create policy sefe_borrar on public.ctrl_gasolina for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.ctrl_gasolina to authenticated;
grant usage, select on sequence public.ctrl_gasolina_id_seq to authenticated;
