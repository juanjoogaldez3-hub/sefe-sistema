-- ============================================================
-- SEFE · Paradas de ruta: que las pueda borrar quien arma las rutas
-- ============================================================
-- Problema (27-11-2026): Christian (Facturador / Logística) borraba
-- paradas en Despachos y "volvían a aparecer". La regla de seguridad de
-- paradas_ruta sólo dejaba BORRAR al administrador; la base no daba error,
-- simplemente borraba 0 filas, y al recargar la parada seguía ahí.
--
-- Ahora pueden borrar paradas los mismos que las arman: el administrador
-- y los roles con el permiso "Asignar y conciliar despachos"
-- (roles.asignar_piloto), siempre que no sean de sólo lectura. Es el mismo
-- criterio que usa la pantalla (canAsignarPiloto en js/app-1.js).
--
-- Al borrar una parada, su firma/foto (paradas_evidencia) se borra sola
-- por la llave foránea con ON DELETE CASCADE.
--
-- Seguro de correr de más: 'create or replace' / 'drop policy if exists'.
-- ============================================================

create or replace function public.sefe_puede_asignar_ruta()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sefe_es_admin()
      or ( not public.sefe_solo_lectura()
           and coalesce((select r.asignar_piloto from public.roles r where r.rol = public.sefe_rol()), false) )
$$;

drop policy if exists sefe_borrar on public.paradas_ruta;
create policy sefe_borrar on public.paradas_ruta for delete to authenticated
  using ((select public.sefe_puede_asignar_ruta()));

-- VERIFICACIÓN:
--   select policyname, cmd, qual from pg_policies where tablename = 'paradas_ruta' and cmd = 'DELETE';
--   select rol, asignar_piloto from roles order by rol;
