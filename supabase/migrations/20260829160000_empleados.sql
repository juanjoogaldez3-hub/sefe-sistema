-- ============================================================
-- SEFE · Empleados (base del módulo de Planilla)
-- ============================================================
-- Maestro de empleados para la planilla quincenal. El sueldo base es
-- quincenal. 'vendedor_id' liga al vendedor para traer las comisiones
-- automáticamente desde las ventas.
--
-- Seguro de correr de más: 'if not exists' no duplica ni toca datos.
-- ============================================================

create table if not exists empleados (
  id                bigserial primary key,
  nombre            text not null,
  puesto            text,
  dpi               text,
  nit               text,
  igss_afiliacion   text,
  vendedor_id       bigint,
  sueldo_base       numeric not null default 0,   -- quincenal
  bonif_incentivo   numeric not null default 0,
  cuenta_banco_id   bigint,
  activo            boolean not null default true,
  fecha_ingreso     date,
  creado            timestamptz default now()
);
