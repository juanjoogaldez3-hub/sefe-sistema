-- ============================================================
-- SEFE · Clientes: ubicación pineada (lat / lng)
-- ============================================================
-- Para marcar dónde está cada cliente (GPS o a mano en el mapa) y poder
-- abrirlo en Google Maps / Waze desde su ficha.
--
-- La tabla clientes ya existe y ya tiene sus políticas RLS; columnas
-- nuevas quedan cubiertas por las mismas políticas.
-- Seguro de correr de más: usa 'if not exists'.
-- ============================================================

alter table public.clientes
  add column if not exists lat double precision,
  add column if not exists lng double precision;
