-- ============================================================
-- SEFE · Multiempresa — Planilla SEPARADA por empresa
-- ============================================================
-- Juanjo pidió que empleados y planillas (y las prestaciones /
-- recibos especiales, que viven en el mismo módulo) vayan SEPARADOS
-- por empresa, no compartidos. Se les agrega la etiqueta `empresa`.
-- Todo lo existente queda como SEFE — no se mueve ni un dato.
--
-- Seguro de correr de más: 'if not exists' y default 'SEFE'.
-- ============================================================

do $$
declare
  t text;
  tablas text[] := array['empleados','planillas','recibos_especiales'];
begin
  foreach t in array tablas loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=t and c.relkind='r') then
      execute format('alter table public.%I add column if not exists empresa text not null default ''SEFE''', t);
      execute format('update public.%I set empresa=''SEFE'' where empresa is null', t);
    end if;
  end loop;
end $$;
