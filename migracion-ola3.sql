-- ============================================================
-- MIGRACIÓN OLA 3  ·  Correr en AMBAS bases (Producción y Pruebas)
-- ============================================================

-- ------------------------------------------------------------
-- Cardex · registrar las conversiones de cajas a unidades
--   Cada vez que se abre una caja para vender unidades sueltas se
--   guarda {fecha, cajas, unidades, usuario} en este arreglo, para
--   que la conversión aparezca en el cardex (trazabilidad). No mueve
--   el saldo total en unidades — es una fila informativa.
-- ------------------------------------------------------------
alter table productos add column if not exists conversiones jsonb default '[]'::jsonb;


-- ------------------------------------------------------------
-- Whaticket · sub-vendedor FIJO por cliente
--   El sub-vendedor del canal ahora se define en la ficha del cliente
--   (no en cada pedido). El pedido lo hereda automáticamente.
-- ------------------------------------------------------------
alter table clientes add column if not exists sub_vendedor_nombre text;
