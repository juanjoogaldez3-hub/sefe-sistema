-- ============================================================
-- SEFE — Ola 1 de arreglos (nota de crédito y NIT facturado)
-- Correr en el SQL Editor de Supabase en AMBAS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
-- ============================================================

-- C1: vínculo de la Nota de Crédito con su factura de origen
alter table documentos add column if not exists factura_origen_id bigint;

-- C4: NIT y nombre al que realmente se facturó (NIT secundario)
alter table documentos add column if not exists nit_facturado text;
alter table documentos add column if not exists nombre_facturado text;
