-- ============================================================
-- SEFE · Vendedores POR EMPRESA (separar el catálogo compartido)
-- ============================================================
-- Hasta ahora los vendedores estaban COMPARTIDOS entre SEFE y LAML
-- (ver 20260929190000_multiempresa_base.sql). Este cambio les agrega
-- la etiqueta `empresa` para que cada empresa vea solo los suyos en
-- los menús.
--
-- Convención:
--   · empresa = 'SEFE'  → se ve solo en SEFE
--   · empresa = 'LAML'  → se ve solo en LAML
--   · empresa = NULL    → COMPARTIDO: se ve en las dos (ej. Luis
--                         Menocal, WHATICKET, Julio Cruz, OFI2)
--
-- Ojo: la columna es NULLABLE a propósito (NULL = compartido). No se
-- pone DEFAULT: un vendedor sin etiqueta queda compartido, que es el
-- comportamiento de hoy (cero riesgo).
--
-- Las búsquedas por id en el sistema siguen usando la lista completa,
-- así que ningún documento histórico se rompe: todos siguen mostrando
-- el nombre del vendedor aunque sea de la otra empresa.
--
-- `vendedores` ya tiene RLS (ver 20260812030419_rls.sql): agregar una
-- columna no necesita políticas nuevas.
--
-- Seguro de correr de más: 'if not exists' + updates por id puntuales.
-- ============================================================

alter table public.vendedores add column if not exists empresa text;

-- Solo SEFE
update public.vendedores set empresa='SEFE' where id in (9, 10, 13);

-- Solo LAML
update public.vendedores set empresa='LAML' where id in (15, 16, 17);

-- Compartidos (se ven en las dos): se dejan en NULL.
update public.vendedores set empresa=null where id in (8, 11, 12, 14);
