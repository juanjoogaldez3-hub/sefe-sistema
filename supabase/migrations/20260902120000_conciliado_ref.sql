-- ============================================================
-- SEFE · Conciliación: recordar el emparejamiento a mano
-- ============================================================
-- Cuando se empareja a mano una línea del banco con un movimiento de
-- SEFE (montos/fechas que el automático no cruza), se guarda en el
-- movimiento la "llave" de la línea del banco (fecha|tipo|monto|noDoc)
-- para poder restaurar ese cruce la próxima vez que se suba el mismo
-- estado de cuenta. Así el emparejamiento tiene memoria.
--
-- La tabla movimientos_banco ya existe y ya tiene sus políticas RLS;
-- una columna nueva queda cubierta por las mismas políticas.
-- Seguro de correr de más: usa 'if not exists'.
-- ============================================================

alter table public.movimientos_banco
  add column if not exists conciliado_ref text;
