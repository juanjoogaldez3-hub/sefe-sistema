-- ============================================================
-- ÍNDICES para acelerar los reportes
-- ============================================================
-- Los reportes filtran y agrupan mucho por fecha y por vendedor,
-- pero esas columnas no tenían índice, así que con datos de años
-- Postgres barría toda la tabla. Estos índices lo evitan.
--
-- Sólo agrega índices: NO toca datos ni estructura. Con
-- "if not exists" es seguro correrlo de más (no-op si ya están).
-- ============================================================

-- Comparativas por mes / rangos de fecha
create index if not exists idx_documentos_creada
  on public.documentos (creada);

-- Reportes por vendedor
create index if not exists idx_documentos_vendedor
  on public.documentos (vendedor_id);

-- Cobranza por período (fecha de los abonos)
create index if not exists idx_abonos_fecha
  on public.abonos (fecha);
