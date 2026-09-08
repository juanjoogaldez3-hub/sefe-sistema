-- ============================================================
-- SEFE · Movimientos de banco: guardar el beneficiario de la póliza
-- ============================================================
-- El "Páguese a la orden de" de la póliza de cheque se escribía al
-- registrar el movimiento, pero NO se guardaba en la base: al recargar
-- o reimprimir la póliza se perdía y salía el concepto en su lugar.
-- Esta columna lo persiste.
--
-- La tabla movimientos_banco ya existe y ya tiene sus políticas RLS;
-- una columna nueva queda cubierta por las mismas políticas.
-- Seguro de correr de más: usa 'if not exists'.
-- ============================================================

alter table public.movimientos_banco
  add column if not exists beneficiario text;
