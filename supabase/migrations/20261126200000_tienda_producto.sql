-- ============================================================
-- SEFE · Tienda en línea: página por producto
-- ============================================================
-- La tienda muestra una página por producto con su descripción
-- (productos.tienda_descripcion). La descripción puede ser larga, así
-- que NO viaja en el catálogo: se pide recién al abrir el producto.
--
--   tienda_producto(codigo) → {ok, d}   d = texto de la ficha (o null)
--
-- Respeta lo mismo que el catálogo: sólo productos visibles en la
-- tienda (activos, no ocultos, con precio) y sólo si la tienda está
-- abierta (o si quien pregunta es personal del sistema: vista previa).
-- No devuelve precios ni existencias (eso ya lo trae el catálogo).
-- Seguro de correr de más ('create or replace').
-- ============================================================
create or replace function public.tienda_producto(p_codigo text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_cod text := upper(trim(coalesce(p_codigo, '')));
  v_d   text;
begin
  if not coalesce((tienda__config()->>'activa')::boolean, false) and not coalesce(sefe_activo(), false) then
    return jsonb_build_object('ok', false);
  end if;
  if v_cod = '' or length(v_cod) > 60 then
    return jsonb_build_object('ok', true, 'd', null);
  end if;
  select t.descripcion into v_d from tienda__productos(null) t where t.codigo = v_cod;
  return jsonb_build_object('ok', true, 'd', v_d);
end $$;

revoke all on function public.tienda_producto(text) from public;
grant execute on function public.tienda_producto(text) to anon, authenticated;

-- El catálogo deja de mandar la descripción de cada producto (campo `d`):
-- ahora se pide por producto con tienda_producto(). Así el catálogo baja
-- liviano aunque las descripciones sean largas.
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
           'i', t.imagen, 'p', t.precio,
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
