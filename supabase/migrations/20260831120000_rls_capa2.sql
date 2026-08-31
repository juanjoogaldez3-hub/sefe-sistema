-- ============================================================
-- SEFE · MIGRACIÓN: RLS CAPA 2 — LECTURA POR ROL (back office)
-- ============================================================
-- Complementa la capa 1 (20260812030419_rls.sql). La capa 1 separó
-- "cualquiera en internet" de "tu gente". Esta capa 2 separa, DENTRO
-- de tu gente, quién ve las tablas sensibles de COMPRAS y BANCOS.
--
-- Después de esta migración:
--   · Ventas, Facturador y Piloto NO pueden leer ni escribir
--     compras, pagos a proveedor, proveedores, cuentas de banco,
--     movimientos de banco ni conciliaciones — tampoco desde la
--     consola del navegador.
--   · Admin, Gerencia, Contabilidad, Bodega y Auditoría siguen igual
--     (ellos sí trabajan con compras/bancos).
--
-- QUÉ *NO* TOCA (a propósito, para no romper en silencio):
--   · La escritura que usa la facturación: 'productos' (stock) queda
--     ABIERTO para todos, así facturar sigue rebajando inventario
--     incluso para el Facturador. Ése es el caso-trampa que marcó la
--     capa 1.
--   · El "esqueleto compartido" (clientes, productos, documentos,
--     abonos, cotizaciones, cobros_ruta, talonarios, etc.) sigue como
--     en la capa 1: cualquier usuario activo lo lee.
--   · NO oculta la COLUMNA costo dentro de 'productos'. Eso es
--     seguridad por columna (otra técnica) y queda para más adelante.
--
-- Nota de mantenimiento: esta migración corre DESPUÉS de la capa 1.
-- Si algún día se vuelve a correr SÓLO la capa 1 a mano, hay que
-- volver a correr también ésta (la capa 1 reabre estas 6 tablas).
--
-- Es seguro correr este archivo varias veces.
-- Reverso: supabase/herramientas/rls-capa2-revertir.sql
-- ============================================================


-- ── ¿El rol conectado es de "back office"? ──────────────────
-- Ve compras y bancos si es admin, si es de sólo lectura (Auditoría),
-- o si su rol tiene en 'views' alguna sección de compras/finanzas.
-- Misma fuente de verdad que la pantalla (se maneja desde Usuarios),
-- así no hay que volver a tocar SQL para cambiar un permiso.
-- SECURITY DEFINER + search_path fijo, igual que las funciones de la
-- capa 1: necesita leer 'roles' saltándose RLS y no debe ser
-- secuestrable.
create or replace function public.sefe_ve_backoffice()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sefe_es_admin()
      or public.sefe_solo_lectura()
      or coalesce(
           (select r.views ?| array['compras','nuevacompra','porpagar','proveedores','bancos','cobros']
              from roles r where r.rol = public.sefe_rol()),
           false)
$$;

revoke all on function public.sefe_ve_backoffice() from public, anon;
grant execute on function public.sefe_ve_backoffice() to authenticated;


-- ── Políticas: compras + bancos sólo para back office ───────
-- Mismas 4 acciones que la capa 1, pero LEER/CREAR/EDITAR piden
-- además sefe_ve_backoffice(). BORRAR sigue siendo sólo admin.
-- Las funciones van envueltas en (select ...) para que Postgres las
-- evalúe una vez por consulta y no una vez por fila.
do $$
declare
  t text;
  sensibles text[] := array[
    'compras', 'pagos_proveedor', 'proveedores',
    'cuentas_banco', 'movimientos_banco', 'conciliaciones'
  ];
  existe boolean;
begin
  foreach t in array sensibles loop
    select exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relkind='r') into existe;
    if not existe then raise notice 'omitida (no existe): %', t; continue; end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists sefe_leer on public.%I', t);
    execute format($f$create policy sefe_leer on public.%I
                      for select to authenticated
                      using ((select public.sefe_activo()) and (select public.sefe_ve_backoffice()))$f$, t);

    execute format('drop policy if exists sefe_crear on public.%I', t);
    execute format($f$create policy sefe_crear on public.%I
                      for insert to authenticated
                      with check ((select public.sefe_puede_escribir()) and (select public.sefe_ve_backoffice()))$f$, t);

    execute format('drop policy if exists sefe_editar on public.%I', t);
    execute format($f$create policy sefe_editar on public.%I
                      for update to authenticated
                      using ((select public.sefe_puede_escribir()) and (select public.sefe_ve_backoffice()))
                      with check ((select public.sefe_puede_escribir()) and (select public.sefe_ve_backoffice()))$f$, t);

    execute format('drop policy if exists sefe_borrar on public.%I', t);
    execute format($f$create policy sefe_borrar on public.%I
                      for delete to authenticated
                      using ((select public.sefe_es_admin()))$f$, t);

    raise notice 'capa 2 (back office): %', t;
  end loop;
end $$;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Las 6 tablas deben decir RLS=true y tener 4 políticas cada una.
select c.relname as tabla,
       c.relrowsecurity as "RLS",
       count(p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname='public'
  and c.relname in ('compras','pagos_proveedor','proveedores',
                    'cuentas_banco','movimientos_banco','conciliaciones')
group by c.relname, c.relrowsecurity
order by c.relname;

-- Prueba real (desde la consola del navegador, ya logueado):
--   await sb.rpc('sefe_ve_backoffice')
--   → true  para admin/gerencia/contabilidad/bodega/auditoría
--   → false para ventas/facturador/piloto
-- ============================================================
-- FIN
-- ============================================================
