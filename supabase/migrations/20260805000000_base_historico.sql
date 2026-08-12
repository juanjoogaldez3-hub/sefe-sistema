-- ============================================================
-- BASE HISTÓRICA — todo lo que ya estaba aplicado antes de que
-- el proyecto empezara a usar migraciones versionadas.
-- ============================================================
-- Es la unión de las migraciones sueltas que se corrían a mano:
--   migracion-ola1.sql · migracion-ola2.sql · migracion-ola3.sql
--   migracion-cobros.sql · migracion-precio-caja.sql
--   migracion-completa.sql · sync-pruebas.sql
--
-- En las bases que YA existen (Producción y Pruebas) esta migración
-- no se ejecuta: baseline.sql la marca como aplicada, porque estos
-- cambios ya están ahí desde hace meses.
--
-- Existe para las bases NUEVAS — cada cliente que se sume arranca
-- corriendo esto primero y queda con el mismo esquema que SEFE.
--
-- Todo usa "if not exists", así que es seguro correrlo de más.
-- ============================================================


-- ── DOCUMENTOS ──────────────────────────────────────────────
-- Nota de crédito ligada a su factura de origen, y el NIT
-- secundario al que se facturó (puede no ser el del cliente).
alter table documentos add column if not exists factura_origen_id   bigint;
alter table documentos add column if not exists nit_facturado       text;
alter table documentos add column if not exists nombre_facturado    text;
-- Sub-vendedor (viene de Whaticket)
alter table documentos add column if not exists sub_vendedor_nombre text;


-- ── CLIENTES ────────────────────────────────────────────────
-- Pestañas "Cobros" y "Seguimiento" de la ficha del cliente
alter table clientes add column if not exists cobro_info          jsonb default '{}'::jsonb;
alter table clientes add column if not exists seguimientos        jsonb default '[]'::jsonb;
alter table clientes add column if not exists sub_vendedor_nombre text;


-- ── PRODUCTOS ───────────────────────────────────────────────
-- 'precio' es el precio de la CAJA; 'precio_unidad' el de la
-- unidad suelta (se calcula solo, pero se puede editar).
alter table productos add column if not exists precio_unidad numeric default 0;
-- Equivalencias entre presentaciones
alter table productos add column if not exists conversiones  jsonb default '[]'::jsonb;


-- ── COMPRAS ─────────────────────────────────────────────────
-- Sin esto, al recargar, una compra especial del mes en curso
-- aparecía como "vencida" y no dejaba editarla.
alter table compras add column if not exists mes text;


-- ── MOVIMIENTOS DE BANCO ────────────────────────────────────
-- Correlativo de póliza en las salidas de banco
alter table movimientos_banco add column if not exists poliza integer;


-- ── USUARIOS ────────────────────────────────────────────────
-- El rol 'cobros' quedó viejo: es idéntico a 'contabilidad'.
-- En el código 'cobros' es un alias, así que nadie se bloquea;
-- esto sólo limpia los datos.
update usuarios set rol = 'contabilidad' where rol = 'cobros';
