-- ============================================================
-- SEFE · Marca de conciliación en los movimientos de banco
-- ============================================================
-- Agrega a 'movimientos_banco' la marca de que un movimiento ya se
-- cuadró contra el estado de cuenta del banco (pantalla de Conciliación
-- bancaria). 'conciliado' = verificado con el banco; 'conciliado_el' =
-- cuándo se marcó.
--
-- Seguro de correr de más: 'if not exists' no duplica ni toca datos, y
-- el default 'false' deja todo lo viejo como "sin conciliar" (que es lo
-- correcto).
-- ============================================================

alter table movimientos_banco
  add column if not exists conciliado boolean not null default false;

alter table movimientos_banco
  add column if not exists conciliado_el timestamptz;
