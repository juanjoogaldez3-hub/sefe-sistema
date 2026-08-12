-- ============================================================
-- SEFE · MIGRACIÓN: SINCRONIZACIÓN EN VIVO (Realtime)
-- ============================================================
-- Correr en el SQL Editor de Supabase.
--   Primero en Pruebas:  imvoyzxdvtoktckazzsv
--   Y sólo cuando esté probado, en Producción: krbyulpmfazntjwnpxnw
--
-- Qué hace: le dice a Postgres que publique los cambios de estas
-- tablas para que el navegador los reciba por websocket. Sin esto,
-- realtime.js se conecta bien pero NO le llega ningún evento.
--
-- Es seguro correrlo varias veces (revisa antes de agregar).
-- No modifica datos: sólo activa la publicación.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Agregar las tablas a la publicación de Realtime
-- ------------------------------------------------------------
-- Se hace en un bloque para poder repetirlo sin error si la tabla
-- ya estaba publicada, y para que no truene si alguna no existe
-- todavía en esta base (ej: categorias / cotizaciones en Pruebas).
do $$
declare
  t text;
  tablas text[] := array[
    'documentos', 'abonos',
    'clientes', 'productos', 'proveedores', 'categorias',
    'compras', 'pagos_proveedor',
    'cobros_ruta',
    'cuentas_banco', 'movimientos_banco',
    'talonarios', 'recibos_anulados',
    'recordatorios', 'cotizaciones',
    'usuarios',
    'auditoria'
  ];
begin
  foreach t in array tablas loop
    -- ¿existe la tabla en este proyecto?
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      raise notice 'omitida (no existe en esta base): %', t;
      continue;
    end if;

    -- ¿ya estaba publicada?
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      raise notice 'ya estaba publicada: %', t;
      continue;
    end if;

    execute format('alter publication supabase_realtime add table public.%I', t);
    raise notice 'publicada: %', t;
  end loop;
end $$;


-- ------------------------------------------------------------
-- 2) Verificar el resultado
-- ------------------------------------------------------------
-- Debe listar todas las tablas de arriba que existan en esta base.
select tablename as "tabla publicada en realtime"
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;


-- ============================================================
-- NOTAS
-- ============================================================
--
-- · SOBRE LOS DELETE
--   Por defecto Postgres sólo manda la llave primaria cuando se
--   borra una fila (REPLICA IDENTITY DEFAULT). realtime.js ya está
--   escrito contando con eso: cuando se borra un abono y el evento
--   no trae el documento_id, busca al documento padre que tenga ese
--   abono en su lista. Por eso NO hace falta REPLICA IDENTITY FULL,
--   que sería más pesado para la base.
--
-- · SOBRE RLS (lo siguiente que toca)
--   Realtime respeta las políticas RLS. Como todavía no hay RLS,
--   hoy cada usuario conectado recibe los cambios de todas estas
--   tablas. Eso NO empeora la exposición actual (con la anon key
--   ya se puede leer todo), pero es exactamente lo que RLS viene
--   a cerrar en el siguiente paso.
--
-- · PARA DESACTIVAR UNA TABLA
--   Si alguna resulta muy ruidosa (la candidata es 'auditoria',
--   porque cada acción del sistema escribe ahí):
--       alter publication supabase_realtime drop table public.auditoria;
--   y quitarla también del objeto TABLAS en realtime.js.
--
-- ============================================================
-- FIN
-- ============================================================
