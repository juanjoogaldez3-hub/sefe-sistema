-- ============================================================
-- MIGRACIÓN OLA 2  ·  Correr en AMBAS bases (Producción y Pruebas)
-- ============================================================

-- ------------------------------------------------------------
-- I11 · Persistir el mes de la compra especial
--   Sin esta columna, al recargar la app la compra especial pierde
--   su 'mes' y aparece como "vencida" aunque sea del mes en curso.
-- ------------------------------------------------------------
ALTER TABLE compras ADD COLUMN IF NOT EXISTS mes text;


-- ------------------------------------------------------------
-- M7 · Unificar rol legacy 'cobros' -> 'contabilidad'
--   'cobros' y 'contabilidad' son idénticos. En el código 'cobros'
--   ya quedó como alias, así que NADIE se bloquea aunque no corras
--   esto. Esto solo limpia los datos para dejar un único rol.
-- ------------------------------------------------------------

-- 1) REVISAR primero cuántos usuarios hay por rol (opcional):
--    SELECT rol, count(*) FROM usuarios GROUP BY rol ORDER BY rol;

-- 2) Migrar (seguro de correr; no afecta si no hay ninguno):
UPDATE usuarios SET rol = 'contabilidad' WHERE rol = 'cobros';

-- 3) Verificar que ya no queda ninguno:
--    SELECT count(*) AS cobros_restantes FROM usuarios WHERE rol = 'cobros';
