-- ============================================================
-- HERRAMIENTA · Prender / apagar los avisos hacia n8n
-- ============================================================
-- Esto se corre A MANO en el SQL Editor de Supabase, una vez por
-- base (Pruebas y Producción tienen su propia URL de n8n).
--
-- CÓMO USARLO
--   1. En n8n creá un flujo con un nodo "Webhook".
--   2. Copiá la "Production URL" de ese webhook.
--   3. Pegala abajo en lugar de PEGA_AQUI_LA_URL y corré el bloque.
--
-- Mientras el valor esté vacío, los avisos quedan DORMIDOS.
-- ============================================================

-- ── PRENDER (poner la URL) ──────────────────────────────────
update public.integraciones_n8n
   set valor = 'PEGA_AQUI_LA_URL',
       actualizado = now()
 where clave = 'webhook_url';

-- ── VER cómo quedó ──────────────────────────────────────────
select clave, valor, actualizado from public.integraciones_n8n;

-- ── APAGAR (dejar de mandar avisos) ─────────────────────────
-- update public.integraciones_n8n
--    set valor = '', actualizado = now()
--  where clave = 'webhook_url';
