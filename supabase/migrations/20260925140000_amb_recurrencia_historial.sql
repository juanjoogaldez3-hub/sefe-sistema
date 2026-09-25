-- ============================================================
-- SEFE · Controles — Ambientales: recurrencia + historial
-- ============================================================
-- Agrega a los servicios de ambientales:
--   · frecuencia_valor  + frecuencia_unidad ('mes'|'semana'|'dia') para
--     reprogramar solo el próximo servicio (fecha + frecuencia).
--   · historial (jsonb): lista de recargas ya hechas [{fecha, por}].
--
-- La tabla ctrl_ambientales ya tiene RLS y grants (ver
-- 20260830100000_ctrl_ambientales.sql); las políticas son a nivel de tabla,
-- así que las columnas nuevas quedan cubiertas sin cambios extra.
-- Seguro de correr de más: usa 'add column if not exists'.
-- ============================================================

alter table public.ctrl_ambientales
  add column if not exists frecuencia_valor  integer,
  add column if not exists frecuencia_unidad text,
  add column if not exists historial         jsonb not null default '[]'::jsonb;
