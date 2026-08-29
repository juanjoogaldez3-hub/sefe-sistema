-- ============================================================
-- SEFE · Historial de conciliaciones bancarias
-- ============================================================
-- Guarda el "cierre" de cada conciliación: cuenta, período, saldos,
-- diferencia y cuántos movimientos quedaron conciliados / pendientes.
-- Sirve de respaldo (para el contador / auditoría) y para no repetir
-- trabajo mes a mes.
--
-- Seguro de correr de más: 'if not exists' no duplica ni toca datos.
-- ============================================================

create table if not exists conciliaciones (
  id            bigserial primary key,
  cuenta_id     bigint,
  periodo_desde date,
  periodo_hasta date,
  saldo_banco   numeric,
  saldo_sefe    numeric,
  diferencia    numeric,
  n_conciliados integer,
  n_solo_banco  integer,
  n_solo_sefe   integer,
  archivo       text,
  notas         text,
  guardado_por  text,
  guardado_el   timestamptz default now()
);
