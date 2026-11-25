-- ============================================================
-- SEFE · Evidencia de las paradas manuales de ruta
-- ============================================================
-- Antes, una parada (recolecta, entrega, instalación, banco…) se cerraba
-- con "Marcar hecha" sin pedir nada. Ahora el repartidor deja:
--   · resultado / comentario y quién lo atendió  → paradas_ruta.hecha_info
--   · firma y foto (opcional)                     → paradas_evidencia
-- También "No se pudo hacer" (motivo + comentario) queda en hecha_info.
--
-- La firma y la foto van en una tabla APARTE (igual que entregas_evidencia)
-- para no bajarlas en cada login. Las FOTOS se borran solas al mes con la
-- misma purga diaria de las entregas (se amplía para incluir paradas).
-- Seguro de correr de más: 'if not exists' / 'create or replace'.
-- ============================================================

alter table public.paradas_ruta add column if not exists hecha_info jsonb;

create table if not exists public.paradas_evidencia (
  parada_id      bigint primary key references public.paradas_ruta(id) on delete cascade,
  firma          text,        -- PNG (data URL) de la firma de quien atendió
  foto           text,        -- JPG (data URL), opcional; el navegador ya la achica
  atendio        text,        -- nombre de quien atendió
  registrado_por text,
  registrado_el  timestamptz not null default now()
);

alter table public.paradas_evidencia enable row level security;

drop policy if exists sefe_leer   on public.paradas_evidencia;
create policy sefe_leer   on public.paradas_evidencia for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.paradas_evidencia;
create policy sefe_crear  on public.paradas_evidencia for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.paradas_evidencia;
create policy sefe_editar on public.paradas_evidencia for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.paradas_evidencia;
create policy sefe_borrar on public.paradas_evidencia for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.paradas_evidencia to authenticated;

-- ── Fotos: la purga diaria (ya programada a las 03:30 Guatemala) ahora
-- también vacía las fotos de paradas de más de 1 mes. Firma, nombre y
-- fecha se quedan. Devuelve cuántas fotos borró en total.
create or replace function public.sefe_purgar_fotos_entrega(retener_dias int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas  integer;
  borradas2 integer := 0;
begin
  update public.entregas_evidencia
     set foto = null
   where foto is not null
     and registrado_el < now() - make_interval(days => greatest(retener_dias, 1));
  get diagnostics borradas = row_count;

  if to_regclass('public.paradas_evidencia') is not null then
    update public.paradas_evidencia
       set foto = null
     where foto is not null
       and registrado_el < now() - make_interval(days => greatest(retener_dias, 1));
    get diagnostics borradas2 = row_count;
  end if;

  return borradas + borradas2;
end;
$$;

revoke all on function public.sefe_purgar_fotos_entrega(int) from public, anon, authenticated;
