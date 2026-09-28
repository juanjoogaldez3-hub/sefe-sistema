-- ============================================================
-- SEFE · Usuarios — Acomodo personal del dashboard
-- ============================================================
-- Guarda por usuario el orden de los paneles del dashboard y cuáles ocultó,
-- así cada quien lo acomoda a su gusto y lo ve igual en cualquier dispositivo.
-- Formato: { "order": ["panel-bloque-docs", ...], "hidden": ["panel-bloque-stock", ...] }
--
-- La tabla usuarios ya tiene RLS; es una columna nueva, las políticas de la
-- tabla la cubren. Seguro de correr de más: usa 'add column if not exists'.
-- ============================================================

alter table public.usuarios
  add column if not exists dashboard_layout jsonb;
