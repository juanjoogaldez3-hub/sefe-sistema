-- ============================================================
-- SEFE · Planillas quincenales (módulo de Planilla, parte 2)
-- ============================================================
-- Guarda cada corrida de planilla. El detalle (una fila por
-- empleado: sueldo, bonificación, comisiones, IGSS, ISR, neto,
-- estado de pago, póliza) va en la columna JSONB 'lineas'. Las
-- columnas sueltas son el resumen para listar y reportar.
--
-- Incluye SUS POLÍTICAS RLS desde el inicio (el proyecto tiene RLS
-- activo — una tabla sin políticas queda cerrada al navegador).
-- Seguro de correr de más: usa 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.planillas (
  id             bigserial primary key,
  periodo_desde  date,
  periodo_hasta  date,
  etiqueta       text,
  estado         text not null default 'borrador',   -- borrador | parcial | pagada
  total_ingresos numeric not null default 0,
  total_descuentos numeric not null default 0,
  total_neto     numeric not null default 0,
  n_empleados    integer not null default 0,
  notas          text,
  lineas         jsonb not null default '[]'::jsonb,
  creado_por     text,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz
);

-- ── RLS: mismas políticas que las demás tablas operativas ──
alter table public.planillas enable row level security;

drop policy if exists sefe_leer   on public.planillas;
create policy sefe_leer   on public.planillas for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.planillas;
create policy sefe_crear  on public.planillas for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.planillas;
create policy sefe_editar on public.planillas for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.planillas;
create policy sefe_borrar on public.planillas for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.planillas to authenticated;
grant usage, select on sequence public.planillas_id_seq to authenticated;
