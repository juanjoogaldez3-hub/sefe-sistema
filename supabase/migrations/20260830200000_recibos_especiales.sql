-- ============================================================
-- SEFE · Planilla — Recibos especiales (prestaciones)
-- ============================================================
-- Pagos aparte de la planilla quincenal: aguinaldo, bono 14,
-- indemnización u otro. Un recibo agrupa a varios empleados; el detalle
-- (monto, ISR, otros descuentos, neto, estado de pago, póliza) va en la
-- columna JSONB 'lineas'. Las columnas sueltas son el resumen.
--
-- Con RLS desde el inicio. Seguro de correr de más.
-- ============================================================

create table if not exists public.recibos_especiales (
  id             bigserial primary key,
  tipo           text not null default 'otro',   -- aguinaldo | bono14 | indemnizacion | otro
  concepto       text,
  fecha          date,
  estado         text not null default 'borrador', -- borrador | parcial | pagada
  total_neto     numeric not null default 0,
  n_empleados    integer not null default 0,
  notas          text,
  lineas         jsonb not null default '[]'::jsonb,
  creado_por     text,
  creado         timestamptz not null default now(),
  actualizado_el timestamptz
);

alter table public.recibos_especiales enable row level security;

drop policy if exists sefe_leer   on public.recibos_especiales;
create policy sefe_leer   on public.recibos_especiales for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.recibos_especiales;
create policy sefe_crear  on public.recibos_especiales for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.recibos_especiales;
create policy sefe_editar on public.recibos_especiales for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.recibos_especiales;
create policy sefe_borrar on public.recibos_especiales for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.recibos_especiales to authenticated;
grant usage, select on sequence public.recibos_especiales_id_seq to authenticated;
