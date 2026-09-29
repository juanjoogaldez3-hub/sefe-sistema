-- ============================================================
-- SEFE · Multiempresa — nombre corto de LAML
-- ============================================================
-- Mostrar "Luis Menocal" (sin la "A.") en el selector, el cuadrito de
-- la barra lateral y las etiquetas. La razón social completa para
-- facturar sigue siendo "Luis Alfonso Menocal Lezana".
-- Seguro de correr de más: solo actualiza esa fila.
-- ============================================================

update public.empresas set nombre = 'Luis Menocal' where codigo = 'LAML';
