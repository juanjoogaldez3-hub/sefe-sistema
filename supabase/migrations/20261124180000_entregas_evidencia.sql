-- ============================================================
-- SEFE · Prueba de entrega: firma y foto APARTE de la factura
-- ============================================================
-- Desde ahora, en TODA entrega (efectivo, cheque, contraseña o crédito)
-- el piloto pide la firma de quien recibe, su nombre y, si quiere, una
-- foto. La firma (PNG) y la foto (JPG) pesan: si se guardaran dentro de
-- documentos.entrega_info, se bajarían en CADA login junto con todas las
-- facturas (el mismo problema que ya tuvieron los PDF). Por eso van en
-- esta tabla aparte, una fila por documento, y se leen sólo al abrir el
-- comprobante de entrega de esa factura.
--
-- No lleva columna `empresa`: cuelga de su documento (documento_id) y
-- sólo se lee por ese id, así que la empresa es la del documento.
--
-- Incluye SUS POLÍTICAS RLS (el proyecto tiene RLS activo: una tabla sin
-- políticas queda cerrada al navegador). Mismo modelo que las demás.
-- Las FOTOS se borran solas al mes (ver abajo, purga diaria): pesan ~150 KB
-- cada una y la base se llenaría de fotos. La firma y el nombre de quien
-- recibió se quedan para siempre (pesan poco y son la prueba de entrega).
--
-- Seguro de correr de más: 'if not exists' / 'drop policy if exists' /
-- reprogramar la tarea de cero.
-- ============================================================

create table if not exists public.entregas_evidencia (
  documento_id   bigint primary key references public.documentos(id) on delete cascade,
  firma          text,        -- PNG (data URL) de la firma de quien recibe
  foto           text,        -- JPG (data URL), opcional; el navegador ya la achica
  recibe         text,        -- nombre de quien recibió
  registrado_por text,
  registrado_el  timestamptz not null default now()
);

alter table public.entregas_evidencia enable row level security;

drop policy if exists sefe_leer   on public.entregas_evidencia;
create policy sefe_leer   on public.entregas_evidencia for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.entregas_evidencia;
create policy sefe_crear  on public.entregas_evidencia for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.entregas_evidencia;
create policy sefe_editar on public.entregas_evidencia for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.entregas_evidencia;
create policy sefe_borrar on public.entregas_evidencia for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.entregas_evidencia to authenticated;


-- ── Fotos: se borran solas después de 1 mes ──────────────────
-- Sólo vacía la columna `foto`; la firma, el nombre de quien recibió y la
-- fecha se quedan. Devuelve cuántas fotos borró.
create or replace function public.sefe_purgar_fotos_entrega(retener_dias int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
begin
  update public.entregas_evidencia
     set foto = null
   where foto is not null
     and registrado_el < now() - make_interval(days => greatest(retener_dias, 1));
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

-- Que NO la pueda ejecutar la app ni nadie con la anon key.
revoke all on function public.sefe_purgar_fotos_entrega(int) from public, anon, authenticated;

-- Programarla todos los días a las 03:30 de Guatemala (09:30 UTC: pg_cron
-- usa hora UTC). Diaria, para que cada foto dure su mes y no hasta fin de mes.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'sefe_purga_fotos_entrega') then
      perform cron.unschedule('sefe_purga_fotos_entrega');
    end if;
    perform cron.schedule(
      'sefe_purga_fotos_entrega',
      '30 9 * * *',                                 -- 09:30 UTC = 03:30 Guatemala
      'select public.sefe_purgar_fotos_entrega(30);'
    );
    raise notice 'Purga de fotos de entrega programada: diaria 03:30 Guatemala (retención 30 días).';
  else
    raise notice 'pg_cron no está disponible: activá la extensión y volvé a correr esta migración.';
  end if;
end $$;

-- VERIFICACIÓN:
--   select jobname, schedule, command from cron.job where jobname = 'sefe_purga_fotos_entrega';
