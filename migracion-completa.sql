-- ============================================================
-- SEFE · MIGRACIÓN COMPLETA (toda la sesión de arreglos)
-- Correr en el SQL Editor de Supabase en AMBAS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
-- Es seguro correrlo completo y varias veces (todo usa IF NOT EXISTS).
-- ============================================================


-- ------------------------------------------------------------
-- 1) CLIENTES · pestañas "Cobros" y "Seguimiento"
-- ------------------------------------------------------------
alter table clientes add column if not exists cobro_info   jsonb default '{}'::jsonb;   -- días/horario/frecuencia/notas
alter table clientes add column if not exists seguimientos jsonb default '[]'::jsonb;   -- bitácora / recordatorios


-- ------------------------------------------------------------
-- 2) SYNC PRUEBAS · columnas que faltaban en Pruebas
--    (en Producción ya existían; el IF NOT EXISTS las ignora)
-- ------------------------------------------------------------
alter table movimientos_banco add column if not exists poliza integer;          -- correlativo de póliza en salidas de banco
alter table documentos       add column if not exists sub_vendedor_nombre text; -- sub-vendedor en documentos/facturas


-- ------------------------------------------------------------
-- 3) PRODUCTOS · precio por presentación (caja / unidad)
--    'precio' (ya existente) = precio de la CAJA (principal)
--    'precio_unidad'         = precio de la UNIDAD suelta (auto=precio/uds, editable)
-- ------------------------------------------------------------
alter table productos add column if not exists precio_unidad numeric default 0;
-- Nota: 'precio_caja' (de un intento anterior) quedó sin uso. Opcional limpiar:
-- alter table productos drop column if exists precio_caja;


-- ------------------------------------------------------------
-- 4) DOCUMENTOS · Ola 1 (nota de crédito y NIT facturado)
-- ------------------------------------------------------------
alter table documentos add column if not exists factura_origen_id bigint; -- NC -> su factura de origen
alter table documentos add column if not exists nit_facturado     text;   -- NIT secundario al que se facturó
alter table documentos add column if not exists nombre_facturado  text;   -- nombre al que se facturó


-- ------------------------------------------------------------
-- 5) COMPRAS · Ola 2 (persistir el mes de la compra especial)
--    Sin esto, al recargar, una compra especial del mes en curso
--    aparecía como "vencida" y no dejaba editarla.
-- ------------------------------------------------------------
alter table compras add column if not exists mes text;


-- ------------------------------------------------------------
-- 6) USUARIOS · unificar rol legacy 'cobros' -> 'contabilidad'
--    Son idénticos. En el código 'cobros' ya quedó como alias,
--    así que NADIE se bloquea aunque no corras esto; solo limpia datos.
-- ------------------------------------------------------------
-- Revisar antes (opcional):  SELECT rol, count(*) FROM usuarios GROUP BY rol ORDER BY rol;
update usuarios set rol = 'contabilidad' where rol = 'cobros';
-- Verificar después (opcional): SELECT count(*) FROM usuarios WHERE rol = 'cobros';  -- debe dar 0

-- ============================================================
-- FIN
-- ============================================================
