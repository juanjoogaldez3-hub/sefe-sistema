-- ============================================================
-- SEFE · Programar entregas y paradas para una FECHA + nota de entrega
-- ============================================================
-- Pedido de logística (27-11-2026):
--   · poder programar una entrega (factura/nota) o una parada para un día;
--     el repartidor ve en "Mis entregas" sólo lo de hoy (y lo atrasado);
--   · una nota para el repartidor al asignar una entrega (como la que ya
--     tienen las paradas), que se muestra en ROJO.
--
-- Sólo AGREGA columnas (vacías). No cambia ni borra datos. Sin fecha =
-- "para hoy / ya", como funciona ahora. Las tablas ya tienen RLS: agregar
-- columnas no necesita políticas nuevas.
--
-- OJO: el código que lee estas columnas se publica DESPUÉS de correr esto
-- (documentos se carga pidiendo columnas por nombre: si faltan, no carga).
-- Seguro de correr de más: 'if not exists'.
-- ============================================================

alter table public.documentos   add column if not exists fecha_entrega date;  -- día programado de la entrega
alter table public.documentos   add column if not exists nota_entrega  text;  -- nota para el repartidor
alter table public.paradas_ruta add column if not exists fecha         date;  -- día programado de la parada

-- VERIFICACIÓN:
--   select table_name, column_name, data_type from information_schema.columns
--    where table_schema='public'
--      and ((table_name='documentos' and column_name in ('fecha_entrega','nota_entrega'))
--        or (table_name='paradas_ruta' and column_name='fecha'));
