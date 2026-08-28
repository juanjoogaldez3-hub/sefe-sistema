-- ============================================================
-- Correlativos con secuencias de Postgres
-- ============================================================
-- Los números de negocio (documentos.numero y cotizaciones.numero)
-- se calculaban con max+1 EN EL NAVEGADOR: dos personas creando a la
-- vez podían sacar el mismo número.
--
-- Acá se crea una secuencia por cada uno y se pone como DEFAULT de la
-- columna. Cuando el código deje de mandar el número al insertar
-- (cambio que va APARTE, en un segundo paso), la base lo asigna sola,
-- sin posibilidad de colisión.
--
-- IMPORTANTE — esto es SEGURO de publicar solo: mientras el código
-- siga mandando el número, este DEFAULT queda DORMIDO (el valor que
-- manda el cliente le gana al default). No cambia nada todavía.
--
-- La secuencia arranca en el máximo actual, para seguir la numeración
-- sin repetir. Puede dejar huecos si un pedido se cancela — es lo
-- correcto para un correlativo interno: mejor un hueco que un choque.
-- (El número fiscal de la factura FEL no se toca; lo da la SAT.)
--
-- Seguro de correr varias veces.
-- ============================================================

-- ── documentos.numero ───────────────────────────────────────
do $$
declare mx bigint;
begin
  select coalesce(max(numero),0) into mx from public.documentos;
  if not exists (select 1 from pg_class where relname = 'documentos_numero_seq') then
    create sequence public.documentos_numero_seq;
  end if;
  -- arranca en el máximo actual (si hay filas) o en 1 (base nueva)
  perform setval('public.documentos_numero_seq', greatest(mx, 1), mx > 0);
  alter table public.documentos
    alter column numero set default nextval('public.documentos_numero_seq');
end $$;

-- ── cotizaciones.numero ─────────────────────────────────────
do $$
declare mx bigint;
begin
  select coalesce(max(numero),0) into mx from public.cotizaciones;
  if not exists (select 1 from pg_class where relname = 'cotizaciones_numero_seq') then
    create sequence public.cotizaciones_numero_seq;
  end if;
  perform setval('public.cotizaciones_numero_seq', greatest(mx, 1), mx > 0);
  alter table public.cotizaciones
    alter column numero set default nextval('public.cotizaciones_numero_seq');
end $$;
