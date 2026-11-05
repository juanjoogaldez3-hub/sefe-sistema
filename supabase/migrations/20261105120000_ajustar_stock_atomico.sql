-- ============================================================
-- SEFE · Ajuste ATÓMICO de stock (evita descuadres por carrera)
-- ============================================================
-- Antes, al mover stock, el navegador leía el stock en memoria, le
-- sumaba/restaba y guardaba el VALOR ABSOLUTO del producto. Si dos
-- operaciones (dos usuarios / pestañas / la sincronización en vivo)
-- tocaban el mismo producto casi al mismo tiempo, una pisaba a la otra
-- (lost update) y el stock quedaba descuadrado por ±1 (o lo que fuera).
--
-- Esta función hace el ajuste DIRECTO en la base como una sola
-- sentencia atómica (stock = stock + delta), así nunca se pisan dos
-- cambios, sin importar cuántos usuarios haya. Devuelve el stock real
-- resultante para que el navegador reconcilie su copia local.
--
-- security invoker (default): corre con los permisos del usuario que la
-- llama, respetando las políticas RLS de `productos` (sefe_editar).
--
-- Seguro de correr de más: 'create or replace' no duplica.
-- ============================================================

create or replace function public.sefe_ajustar_stock(
  p_id    bigint,
  p_delta numeric,
  p_campo text default 'stock'
) returns numeric
language plpgsql
as $$
declare
  nuevo numeric;
begin
  if p_campo = 'stock_cajas' then
    update public.productos
       set stock_cajas = coalesce(stock_cajas, 0) + p_delta
     where id = p_id
     returning stock_cajas into nuevo;
  else
    update public.productos
       set stock = coalesce(stock, 0) + p_delta
     where id = p_id
     returning stock into nuevo;
  end if;
  return nuevo;
end;
$$;

grant execute on function public.sefe_ajustar_stock(bigint, numeric, text) to authenticated;
