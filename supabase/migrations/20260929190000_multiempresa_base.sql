-- ============================================================
-- SEFE · Fase 0 — Cimientos MULTIEMPRESA
-- ============================================================
-- El cliente maneja DOS contribuyentes (dos NIT) en una misma
-- operación:
--
--   · SEFE  → Soluciones Efectivas, S.A.        (la de siempre)
--   · LAML  → Luis Alfonso Menocal Lezana       (la segunda)
--
-- Cosas SEPARADAS por empresa: inventario, clientes, facturas,
-- cobros, cotizaciones, bancos, proveedores y compras.
-- Cosas COMPARTIDAS entre las dos: ruta/despachos, recibos
-- (numeración en una sola serie), usuarios/roles, vendedores y
-- pilotos.
--
-- Esta migración es SOLO los cimientos (Fase 0):
--   1) Catálogo de empresas (con sus políticas RLS).
--   2) Una etiqueta `empresa` (texto) en cada tabla que va
--      separada, con DEFAULT 'SEFE'. Todo lo que YA existe queda
--      marcado como SEFE automáticamente — no se mueve ni un dato.
--
-- El SELECTOR de empresa y el filtrado en pantalla vienen en la
-- Fase 1. Mientras tanto, con el DEFAULT 'SEFE' el sistema sigue
-- funcionando EXACTAMENTE igual que hoy.
--
-- Seguro de correr de más: todo con 'if not exists' /
-- 'on conflict do nothing'. No duplica ni pisa nada.
-- ============================================================

-- ── 1) Catálogo de empresas ─────────────────────────────────
create table if not exists public.empresas (
  id            bigserial primary key,
  codigo        text unique not null,   -- 'SEFE' / 'LAML' (la etiqueta que va en cada tabla)
  nombre        text not null,          -- nombre corto para el selector
  razon_social  text,                   -- razón social / nombre fiscal completo
  nit           text,                   -- NIT del contribuyente (para facturar)
  membrete      text,                   -- dirección / pie que va en los documentos
  color         text,                   -- color opcional para distinguirla en pantalla
  orden         int default 0,          -- orden en el selector
  activo        boolean default true,
  created_at    timestamptz default now()
);

-- SEFE (la de siempre) — datos tomados de la marca actual.
insert into public.empresas (codigo, nombre, razon_social, nit, membrete, color, orden, activo)
values ('SEFE', 'SEFE', 'Soluciones Efectivas, S.A.', '10777860-2', 'SEFE, S.A.', '#173916', 1, true)
on conflict (codigo) do nothing;

-- LAML (la segunda) — se deja creada para que el selector la vea.
-- El NIT y el membrete se completan cuando Juanjo pase los datos
-- fiscales (los pide la Fase 2, la de facturación).
insert into public.empresas (codigo, nombre, razon_social, nit, membrete, color, orden, activo)
values ('LAML', 'Luis A. Menocal', 'Luis Alfonso Menocal Lezana', null, null, '#1f4e79', 2, true)
on conflict (codigo) do nothing;

-- ── 2) Políticas RLS del catálogo (mismo modelo que el resto) ─
-- Este proyecto tiene RLS activo: una tabla sin políticas queda
-- cerrada y el navegador no puede leerla ni escribirla.
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='empresas' and c.relkind='r') then

    execute 'alter table public.empresas enable row level security';

    drop policy if exists sefe_leer on public.empresas;
    create policy sefe_leer on public.empresas
      for select to authenticated
      using ((select public.sefe_activo()));

    drop policy if exists sefe_crear on public.empresas;
    create policy sefe_crear on public.empresas
      for insert to authenticated
      with check ((select public.sefe_es_admin()));

    drop policy if exists sefe_editar on public.empresas;
    create policy sefe_editar on public.empresas
      for update to authenticated
      using ((select public.sefe_es_admin()))
      with check ((select public.sefe_es_admin()));

    drop policy if exists sefe_borrar on public.empresas;
    create policy sefe_borrar on public.empresas
      for delete to authenticated
      using ((select public.sefe_es_admin()));

    grant select, insert, update, delete on public.empresas to authenticated;
  end if;
  grant usage, select on all sequences in schema public to authenticated;
end $$;

-- ── 3) Etiqueta `empresa` en las tablas SEPARADAS ────────────
-- DEFAULT 'SEFE' → todas las filas existentes quedan como SEFE y
-- cualquier inserción vieja (código que todavía no manda empresa)
-- sigue cayendo en SEFE. Cero riesgo.
--
-- NOTA sobre los módulos de control (ambientales y baterías): se
-- separan por empresa siguiendo la corazonada acordada (van pegados
-- a clientes/inventario). Gasolina, empleados y planillas se dejan
-- COMPARTIDOS por ahora (son del grupo). Si hay que cambiarlo,
-- es una migración chiquita aparte.
do $$
declare
  t text;
  tablas text[] := array[
    'clientes','productos','documentos','abonos','cotizaciones',
    'proveedores','compras','pagos_proveedor',
    'cuentas_banco','movimientos_banco','creditos_cliente',
    'cobros_ruta',
    'ctrl_ambientales','ctrl_bat_tipos','ctrl_bat_cambios','ctrl_bat_entregas'
  ];
begin
  foreach t in array tablas loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=t and c.relkind='r') then
      execute format(
        'alter table public.%I add column if not exists empresa text not null default ''SEFE''', t);
      -- Por si la columna ya existía con NULLs sueltos, los normaliza a SEFE.
      execute format(
        'update public.%I set empresa=''SEFE'' where empresa is null', t);
    end if;
  end loop;
end $$;

-- ── 4) Índices para el filtrado por empresa (tablas grandes) ──
create index if not exists idx_documentos_empresa       on public.documentos(empresa);
create index if not exists idx_clientes_empresa          on public.clientes(empresa);
create index if not exists idx_productos_empresa         on public.productos(empresa);
create index if not exists idx_abonos_empresa            on public.abonos(empresa);
create index if not exists idx_movimientos_banco_empresa on public.movimientos_banco(empresa);
create index if not exists idx_cotizaciones_empresa      on public.cotizaciones(empresa);
