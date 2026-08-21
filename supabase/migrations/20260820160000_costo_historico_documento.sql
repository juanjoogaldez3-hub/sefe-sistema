-- ============================================================
-- SEFE · Costo histórico por factura (costo_historico)
-- ============================================================
-- Las ventas de ene–jul 2026 se importaron sólo con el TOTAL, sin el
-- detalle de productos. Sin líneas, el sistema no puede calcular el costo
-- de lo vendido de ese período (da Q0 y margen 100%).
--
-- Como no existe el detalle por producto, se guarda un COSTO por factura,
-- repartido desde el Excel oficial "ventas vs costos" (que trae el costo
-- por vendedor y mes) proporcional a la venta de cada factura. El reporte
-- usa este campo SÓLO cuando la factura no tiene líneas; para las facturas
-- normales (con detalle) sigue calculando el costo real por producto.
--
-- Seguro de correr de más: 'if not exists' no duplica ni toca datos.
-- El relleno de valores va aparte (herramienta puntual), no en esta
-- migración de esquema.
-- ============================================================

alter table documentos add column if not exists costo_historico numeric;
