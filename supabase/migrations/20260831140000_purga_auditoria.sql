-- ============================================================
-- SEFE · MIGRACIÓN: PURGA DE AUDITORÍA (retención 12 meses)
-- ============================================================
-- La tabla `auditoria` es un registro que sólo crece: cada acción
-- del sistema agrega una fila (encadenada por hash, a prueba de
-- alteración). Sin límite, con los años se vuelve enorme.
--
-- Esta migración deja una limpieza que se corre SOLA una vez al mes
-- y borra lo que tenga más de 12 meses. Así el historial reciente
-- queda completo y la tabla no engorda para siempre.
--
-- DECISIONES DE SEGURIDAD:
--   · La función corre con los permisos del dueño de la tabla, así
--     puede borrar aunque la capa 1 de RLS prohíba borrar auditoría
--     a todos (ni el admin puede desde la app).
--   · NO se le da permiso a los usuarios (`authenticated`): nadie
--     puede purgar el log desde la app o la consola. Sólo la corre la
--     tarea programada (o quien tenga acceso directo a la base).
--   · NUNCA borra la última fila: es el ancla del encadenado de
--     hashes. Aunque el sistema esté inactivo hace meses, la fila más
--     nueva siempre sobrevive.
--
-- NOTA: al purgar, el hash de la fila más vieja que queda apunta a una
-- fila ya borrada — es inevitable en cualquier purga. La verificación
-- del encadenado sigue valiendo dentro de la ventana que se conserva.
--
-- Es seguro correr este archivo varias veces.
-- ============================================================


-- ── La función de limpieza ──────────────────────────────────
create or replace function public.sefe_purgar_auditoria(retener_meses int default 12)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
  corte timestamptz := now() - make_interval(months => greatest(retener_meses, 1));
begin
  delete from public.auditoria
   where fecha < corte
     and seq  < (select max(seq) from public.auditoria);  -- nunca la última fila
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

-- Que NO la pueda ejecutar la app ni nadie con la anon key.
revoke all on function public.sefe_purgar_auditoria(int) from public, anon, authenticated;


-- ── Programarla: día 1 de cada mes, 03:00 ───────────────────
-- Usa pg_cron (la extensión de tareas programadas de Postgres).
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Reprogramar de cero para que sea idempotente.
    if exists (select 1 from cron.job where jobname = 'sefe_purga_auditoria') then
      perform cron.unschedule('sefe_purga_auditoria');
    end if;
    perform cron.schedule(
      'sefe_purga_auditoria',
      '0 3 1 * *',                                  -- min hora díaDelMes mes díaSemana
      'select public.sefe_purgar_auditoria(12);'
    );
    raise notice 'Purga de auditoría programada: día 1 de cada mes a las 03:00 (retención 12 meses).';
  else
    raise notice 'pg_cron no está disponible en este proyecto. Activá la extensión (Database → Extensions → pg_cron) y volvé a correr esta migración.';
  end if;
end $$;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- 1) La tarea quedó programada:
select jobname, schedule, command
from cron.job
where jobname = 'sefe_purga_auditoria';

-- 2) (Opcional) Limpiar YA lo viejo, sin esperar al día 1:
--    select public.sefe_purgar_auditoria(12);   -- devuelve cuántas borró
-- ============================================================
-- FIN
-- ============================================================
