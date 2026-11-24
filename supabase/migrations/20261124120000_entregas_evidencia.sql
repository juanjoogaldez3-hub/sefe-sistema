-- ============================================================
-- SEFE · Prueba de entrega: firma y foto APARTE de la factura
-- ============================================================
-- Desde ahora, en TODA entrega (efectivo, cheque, contraseña o crédito)
-- el piloto pide la firma de quien recibe, su nombre y, si quiere, una
-- foto. La firma (PNG) y la foto (JPG) pesan: si se guardaran dentro de
-- documentos.entrega_info, se bajarían en CADA login junto con todas las
-- facturas (el mismo problema que ya tuvieron los PDF). Por eso van en
-- esta tabla aparte, una fila por documento, y se leen sólo al abrir el
-- comprobante de entrega de esa factura.
--
-- No lleva columna `empresa`: cuelga de su documento (documento_id) y
-- sólo se lee por ese id, así que la empresa es la del documento.
--
-- Incluye SUS POLÍTICAS RLS (el proyecto tiene RLS activo: una tabla sin
-- políticas queda cerrada al navegador). Mismo modelo que las demás.
-- Seguro de correr de más: 'if not exists' / 'drop policy if exists'.
-- ============================================================

create table if not exists public.entregas_evidencia (
  documento_id   bigint primary key references public.documentos(id) on delete cascade,
  firma          text,        -- PNG (data URL) de la firma de quien recibe
  foto           text,        -- JPG (data URL), opcional; el navegador ya la achica
  recibe         text,        -- nombre de quien recibió
  registrado_por text,
  registrado_el  timestamptz not null default now()
);

alter table public.entregas_evidencia enable row level security;

drop policy if exists sefe_leer   on public.entregas_evidencia;
create policy sefe_leer   on public.entregas_evidencia for select to authenticated
  using ((select public.sefe_activo()));

drop policy if exists sefe_crear  on public.entregas_evidencia;
create policy sefe_crear  on public.entregas_evidencia for insert to authenticated
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_editar on public.entregas_evidencia;
create policy sefe_editar on public.entregas_evidencia for update to authenticated
  using ((select public.sefe_puede_escribir()))
  with check ((select public.sefe_puede_escribir()));

drop policy if exists sefe_borrar on public.entregas_evidencia;
create policy sefe_borrar on public.entregas_evidencia for delete to authenticated
  using ((select public.sefe_es_admin()));

grant select, insert, update, delete on public.entregas_evidencia to authenticated;
