-- ============================================================
-- SEFE · Controles — Baterías (parte 2)
-- ============================================================
-- Dos tablas:
--   · ctrl_bat_tipos: tipos de batería y su existencia (stock).
--   · ctrl_bat_cambios: cambios de batería por cliente/equipo (son las
--     salidas: descuentan del stock del tipo).
--
-- Incluyen SUS políticas RLS desde el inicio (el proyecto tiene RLS
-- activo). Seguro de correr de más: 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.ctrl_bat_tipos (
  id      bigserial primary key,
  nombre  text not null,
  stock   numeric not null default 0,
  creado  timestamptz not null default now()
);

create table if not exists public.ctrl_bat_cambios (
  id          bigserial primary key,
  cliente_id  bigint,
  equipo      text,
  tipo_id     bigint,
  cantidad    numeric not null default 1,
  fecha       date,
  proximo     date,
  nota        text,
  creado      timestamptz not null default now(),
  creado_por  text
);

-- ── RLS: mismas políticas que las demás tablas operativas ──
do $$
declare t text;
begin
  foreach t in array array['ctrl_bat_tipos','ctrl_bat_cambios'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists sefe_leer on public.%I', t);
    execute format($f$create policy sefe_leer on public.%I for select to authenticated
                      using ((select public.sefe_activo()))$f$, t);

    execute format('drop policy if exists sefe_crear on public.%I', t);
    execute format($f$create policy sefe_crear on public.%I for insert to authenticated
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format($f$create policy sefe_editar on public.%I for update to authenticated
                      using ((select public.sefe_puede_escribir()))
                      with check ((select public.sefe_puede_escribir()))$f$, t);

    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format($f$create policy sefe_borrar on public.%I for delete to authenticated
                      using ((select public.sefe_es_admin()))$f$, t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  grant usage, select on all sequences in schema public to authenticated;
end $$;
