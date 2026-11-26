-- ============================================================
-- SEFE · Tienda en línea: diseño elegible
-- ============================================================
-- La tienda puede mostrarse con varios diseños (original / a / b / c).
-- El elegido se guarda en ajustes.tienda.tema y el catálogo lo devuelve
-- para que la página lo aplique. Sólo cambia tienda_catalogo: agrega
-- el campo `tema`. Seguro de correr de más ('create or replace').
-- ============================================================
create or replace function public.tienda_catalogo(p_token text default null)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg   jsonb := tienda__config();
  v_previa boolean := coalesce(sefe_activo(), false);  -- personal del sistema: vista previa
  v_cli   bigint;
  v_cliente jsonb;
  v_prods jsonb;
begin
  if not coalesce((v_cfg->>'activa')::boolean, false) and not v_previa then
    return jsonb_build_object('ok', true, 'activa', false);
  end if;

  v_cli := tienda__cliente_de(p_token);
  if v_cli is not null then
    select jsonb_build_object('nombre', c.nombre, 'nit', c.nit,
                              'direccion', coalesce(nullif(c.direccion_entrega, ''), c.direccion),
                              'email', c.email, 'credito', coalesce(c.tiempo_credito, 0))
      into v_cliente from clientes c where c.id = v_cli;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'c', t.codigo, 'n', t.nombre, 'm', t.marca, 'g', t.categoria, 'u', t.unidad,
           'i', t.imagen, 'd', t.descripcion, 'p', t.precio,
           'x', least(t.tope, 500)) order by t.nombre), '[]'::jsonb)
    into v_prods
    from tienda__productos(v_cli) t
   where t.tope > 0 or coalesce((v_cfg->>'mostrarAgotados')::boolean, false);

  return jsonb_build_object(
    'ok', true, 'activa', true,
    'previa', not coalesce((v_cfg->>'activa')::boolean, false),
    'tema', case when v_cfg->>'tema' in ('a', 'b', 'c') then v_cfg->>'tema' else 'original' end,
    'whatsapp', coalesce(v_cfg->>'whatsapp', ''),
    'pedidoMinimo', coalesce((v_cfg->>'pedidoMinimo')::numeric, 0),
    'aviso', coalesce(v_cfg->>'aviso', ''),
    'cliente', v_cliente,
    'productos', v_prods);
end $$;
