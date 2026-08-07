-- ============================================================
-- SEFE — Sincronizar esquema de PRUEBAS con producción
-- Correr en el SQL Editor de Supabase, base de Pruebas:
--   imvoyzxdvtoktckazzsv
-- ============================================================
-- Faltaban 2 columnas (funciones agregadas después de crear Pruebas):

-- 1) Correlativo de póliza en salidas de banco.
--    Sin esto, registrar un PAGO falla (no guarda la salida de banco).
alter table movimientos_banco add column if not exists poliza integer;

-- 2) Nombre del sub-vendedor en documentos.
--    Sin esto, crear/guardar cualquier DOCUMENTO o FACTURA falla.
alter table documentos add column if not exists sub_vendedor_nombre text;
