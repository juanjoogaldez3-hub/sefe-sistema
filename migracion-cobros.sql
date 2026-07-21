-- ============================================================
-- SEFE — Columnas para pestañas "Cobros" y "Seguimiento" del cliente
-- Correr en el SQL Editor de Supabase en AMBAS bases:
--   Producción: krbyulpmfazntjwnpxnw
--   Pruebas:    imvoyzxdvtoktckazzsv
-- ============================================================

-- Configuración de cobro (días, horario, frecuencia, notas)
alter table clientes add column if not exists cobro_info jsonb default '{}'::jsonb;

-- Bitácora de seguimiento de cobro (arreglo de anotaciones)
alter table clientes add column if not exists seguimientos jsonb default '[]'::jsonb;
