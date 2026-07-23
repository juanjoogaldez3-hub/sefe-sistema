-- ============================================================
-- SEFE — Precio por presentación (caja / unidad)
-- Correr en el SQL Editor de Supabase en AMBAS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
-- ============================================================

-- Modelo: el precio PRINCIPAL (columna 'precio' que ya existe) es el de la CAJA.
-- 'precio_unidad' guarda el precio de la UNIDAD suelta (auto = precio/unidades, editable).
alter table productos add column if not exists precio_unidad numeric default 0;

-- Nota: la columna 'precio_caja' (agregada antes) queda sin uso; se puede
-- eliminar más adelante con:  alter table productos drop column if exists precio_caja;
