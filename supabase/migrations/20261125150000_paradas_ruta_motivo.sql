-- ============================================================
-- SEFE · Motivo de las paradas manuales de ruta (Despachos)
-- ============================================================
-- Cada parada que se agrega a la ruta del piloto lleva un motivo:
-- Recolecta, Entrega, Instalación u Otro. Lo elige el navegador
-- (PARADA_MOTIVOS en js/app-10.js). Las paradas viejas quedan sin
-- motivo (null) y se siguen viendo igual.
-- Seguro de correr de más: 'if not exists'.
-- ============================================================

alter table public.paradas_ruta add column if not exists motivo text;
