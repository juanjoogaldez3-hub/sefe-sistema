-- ============================================================
-- Sede en los documentos (para las Notas de préstamo)
-- ============================================================
-- Grupo Gecko (y otros) se manejan centralizados, sin sedes creadas
-- como clientes aparte. Para llevar control de las Notas de préstamo se
-- guarda una "sede" de texto libre en el documento, que sale al lado del
-- nombre del cliente en la NP.
--
-- Seguro de correr de más: 'if not exists' no duplica ni toca datos.
-- ============================================================

alter table documentos add column if not exists sede text;
