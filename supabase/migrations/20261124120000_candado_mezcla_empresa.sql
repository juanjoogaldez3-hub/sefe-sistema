-- ============================================================
-- SEFE · Candado 2: NO mezclar empresas dentro de un registro
-- ============================================================
-- El candado 1 (20261109120000_heredar_empresa_trigger.sql) hace que cada
-- registro tome la empresa de su "padre" (documento ← cliente, compra ←
-- proveedor, abono ← documento…). Eso no alcanza cuando el padre quedó mal
-- elegido: PED-2781 se creó en LAML pero con el cliente "SEFE, S.A." de
-- SEFE y un producto de LAML → un pedido de SEFE con inventario de LAML.
--
-- Este candado RECHAZA (no corrige) cualquier registro que mezcle empresas,
-- venga de donde venga (navegador, backend FEL con service_role, SQL a mano):
--
--   documentos / cotizaciones / compras:
--     todos los productos de `items` tienen que ser de la MISMA empresa
--     que el registro.
--   abonos / pagos_proveedor / creditos_cliente:
--     la cuenta de banco (cuenta_banco_id) tiene que ser de la MISMA
--     empresa que el registro.
--
-- Solo revisa cuando se crea el registro o cuando cambian los productos,
-- la empresa o la cuenta. Editar otras cosas (estado, certificación FEL,
-- anulación, entrega…) de un registro viejo NUNCA se bloquea, aunque ese
-- registro ya estuviera mezclado de antes.
--
-- Corre DESPUÉS del candado 1 (los triggers BEFORE corren por orden
-- alfabético: trg_heredar_empresa < trg_validar_mezcla_empresa), así ve la
-- empresa ya heredada del padre.
--
-- El mensaje empieza con "Cruce de empresa:" — el navegador lo reconoce
-- (_avisoCandadoEmpresa en db.js) y lo muestra en pantalla.
--
-- security definer: lee productos y cuentas_banco saltando la RLS para
-- poder validar siempre. No usa SQL dinámico.
-- Seguro de correr de más: 'create or replace' y 'drop trigger if exists'.
-- ============================================================

create or replace function public.sefe_validar_mezcla_empresa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_revisar  boolean;
  v_cod      text;
  v_emp_prod text;
  v_emp_cta  text;
begin
  if TG_TABLE_NAME in ('documentos', 'cotizaciones', 'compras') then
    if TG_OP = 'INSERT' then
      v_revisar := true;
    else
      v_revisar := (to_jsonb(NEW.items) is distinct from to_jsonb(OLD.items))
                or (NEW.empresa is distinct from OLD.empresa);
    end if;

    if v_revisar and NEW.items is not null
       and jsonb_typeof(to_jsonb(NEW.items)) = 'array' then
      select p.codigo, p.empresa
        into v_cod, v_emp_prod
        from jsonb_array_elements(to_jsonb(NEW.items)) it
        join productos p on p.id::text = it->>'id'
       where p.empresa is distinct from NEW.empresa
       limit 1;

      if v_cod is not null then
        raise exception 'Cruce de empresa: el producto % es de % y este registro es de %. No se guardó.',
          v_cod, v_emp_prod, NEW.empresa
          using errcode = 'check_violation';
      end if;
    end if;

  elsif TG_TABLE_NAME in ('abonos', 'pagos_proveedor', 'creditos_cliente') then
    if NEW.cuenta_banco_id is not null
       and (TG_OP = 'INSERT'
            or NEW.cuenta_banco_id is distinct from OLD.cuenta_banco_id
            or NEW.empresa is distinct from OLD.empresa) then
      select cb.empresa into v_emp_cta
        from cuentas_banco cb
       where cb.id = NEW.cuenta_banco_id;

      if v_emp_cta is not null and v_emp_cta <> NEW.empresa then
        raise exception 'Cruce de empresa: la cuenta de banco es de % y este registro es de %. No se guardó.',
          v_emp_cta, NEW.empresa
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validar_mezcla_empresa on public.documentos;
create trigger trg_validar_mezcla_empresa before insert or update on public.documentos
  for each row execute function public.sefe_validar_mezcla_empresa();

drop trigger if exists trg_validar_mezcla_empresa on public.cotizaciones;
create trigger trg_validar_mezcla_empresa before insert or update on public.cotizaciones
  for each row execute function public.sefe_validar_mezcla_empresa();

drop trigger if exists trg_validar_mezcla_empresa on public.compras;
create trigger trg_validar_mezcla_empresa before insert or update on public.compras
  for each row execute function public.sefe_validar_mezcla_empresa();

drop trigger if exists trg_validar_mezcla_empresa on public.abonos;
create trigger trg_validar_mezcla_empresa before insert or update on public.abonos
  for each row execute function public.sefe_validar_mezcla_empresa();

drop trigger if exists trg_validar_mezcla_empresa on public.pagos_proveedor;
create trigger trg_validar_mezcla_empresa before insert or update on public.pagos_proveedor
  for each row execute function public.sefe_validar_mezcla_empresa();

drop trigger if exists trg_validar_mezcla_empresa on public.creditos_cliente;
create trigger trg_validar_mezcla_empresa before insert or update on public.creditos_cliente
  for each row execute function public.sefe_validar_mezcla_empresa();
