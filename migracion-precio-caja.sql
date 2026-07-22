-- ============================================================
-- SEFE — Precio por presentación (unidad / caja)
-- Correr en el SQL Editor de Supabase en AMBAS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
-- ============================================================

-- Precio de venta de la CAJA (la unidad usa la columna 'precio' que ya existe)
alter table productos add column if not exists precio_caja numeric default 0;
