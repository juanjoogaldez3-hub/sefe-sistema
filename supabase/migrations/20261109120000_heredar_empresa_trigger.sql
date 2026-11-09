-- ============================================================
-- SEFE · Candado de empresa en la BASE (que no se vuelva a cruzar)
-- ============================================================
-- Problema recurrente: un registro de una empresa (ej. LAML) terminaba
-- guardado en la otra (SEFE). Ya se blindó el navegador (db.js deriva la
-- empresa del "padre") y los desplegables, pero hay caminos que NO pasan
-- por ese código:
--   · el backend FEL (Render) usa service_role y se salta el JS y la RLS;
--   · un SQL corrido a mano;
--   · cualquier función/feature nueva que inserte directo.
--
-- Este trigger pone el candado en la PROPIA base: cada vez que se inserta
-- o actualiza uno de estos registros, su columna `empresa` se fija SOLA a
-- la del padre, buscándolo por id. Así la empresa de un hijo SIEMPRE es la
-- de su padre, sin importar quién ni cómo lo escriba.
--
--   documento      ← cliente        (cliente_id)
--   cotización     ← cliente        (cliente_id)
--   saldo a favor  ← cliente        (cliente_id)
--   compra         ← proveedor      (proveedor_id)
--   pago proveedor ← compra         (compra_id)
--   abono          ← documento      (documento_id)
--   cobro en ruta  ← documento      (documento_id)
--   movimiento     ← cuenta         (cuenta_id)
--
-- Reglas:
--   · Si el padre se resuelve y tiene empresa, ESA manda (pisa lo que vino).
--   · Si el padre no se encuentra, o es "compartido" (una cuenta de banco
--     sin empresa, que sirve a las dos), se respeta la empresa que traía.
--   · Si aun así no hay empresa, cae en 'SEFE' (como fue siempre).
--
-- Consecuencia práctica (buena): para mover un registro de empresa NO se
-- cambia `empresa` a mano (el trigger lo revierte), se cambia el PADRE
-- (ej. repuntar una compra al proveedor de la otra empresa). Es justo lo
-- que evita cruces.
--
-- security definer: el trigger lee las tablas padre saltando la RLS, así
-- siempre resuelve el padre aunque la RLS lo ocultara al usuario. No corre
-- SQL dinámico ni usa datos del usuario, solo lee una columna por id.
--
-- Seguro de correr de más: 'create or replace' y 'drop trigger if exists'
-- no duplican nada.
-- ============================================================

create or replace function public.sefe_heredar_empresa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_emp text;
begin
  if TG_TABLE_NAME = 'documentos' then
    select c.empresa into v_emp from clientes c where c.id = NEW.cliente_id;
  elsif TG_TABLE_NAME = 'cotizaciones' then
    select c.empresa into v_emp from clientes c where c.id = NEW.cliente_id;
  elsif TG_TABLE_NAME = 'creditos_cliente' then
    select c.empresa into v_emp from clientes c where c.id = NEW.cliente_id;
  elsif TG_TABLE_NAME = 'compras' then
    select p.empresa into v_emp from proveedores p where p.id = NEW.proveedor_id;
  elsif TG_TABLE_NAME = 'pagos_proveedor' then
    select co.empresa into v_emp from compras co where co.id = NEW.compra_id;
  elsif TG_TABLE_NAME = 'abonos' then
    select d.empresa into v_emp from documentos d where d.id = NEW.documento_id;
  elsif TG_TABLE_NAME = 'cobros_ruta' then
    select d.empresa into v_emp from documentos d where d.id = NEW.documento_id;
  elsif TG_TABLE_NAME = 'movimientos_banco' then
    select cu.empresa into v_emp from cuentas_banco cu where cu.id = NEW.cuenta_id;
  end if;

  if v_emp is not null then
    NEW.empresa := v_emp;                 -- la del padre manda
  elsif NEW.empresa is null then
    NEW.empresa := 'SEFE';                -- último recurso
  end if;                                 -- si no, se respeta lo que vino
  return NEW;
end;
$$;

-- Enganchar el candado en cada tabla hija (antes de insertar o actualizar)
drop trigger if exists trg_heredar_empresa on public.documentos;
create trigger trg_heredar_empresa before insert or update on public.documentos
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.cotizaciones;
create trigger trg_heredar_empresa before insert or update on public.cotizaciones
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.creditos_cliente;
create trigger trg_heredar_empresa before insert or update on public.creditos_cliente
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.compras;
create trigger trg_heredar_empresa before insert or update on public.compras
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.pagos_proveedor;
create trigger trg_heredar_empresa before insert or update on public.pagos_proveedor
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.abonos;
create trigger trg_heredar_empresa before insert or update on public.abonos
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.cobros_ruta;
create trigger trg_heredar_empresa before insert or update on public.cobros_ruta
  for each row execute function public.sefe_heredar_empresa();

drop trigger if exists trg_heredar_empresa on public.movimientos_banco;
create trigger trg_heredar_empresa before insert or update on public.movimientos_banco
  for each row execute function public.sefe_heredar_empresa();
