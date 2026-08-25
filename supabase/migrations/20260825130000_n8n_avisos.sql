-- ============================================================
-- SEFE · MIGRACIÓN: AVISOS AUTOMÁTICOS HACIA n8n
-- ============================================================
-- ⚠️ CORRER PRIMERO EN PRUEBAS (imvoyzxdvtoktckazzsv).
--    A Producción (krbyulpmfazntjwnpxnw) sólo después de probar.
--
-- ------------------------------------------------------------
-- QUÉ HACE
-- ------------------------------------------------------------
-- Deja que la base le avise a n8n en el momento en que pasa algo
-- en el ERP, para que n8n dispare el flujo que sea (WhatsApp,
-- correo, Telegram, Google Sheets, etc.).
--
-- Se hace del lado de la BASE a propósito: el navegador escribe
-- directo en Supabase, así que el único lugar donde el aviso sale
-- SÍ o SÍ —lo haga una persona, el backend o el tiempo real— es
-- un disparador en la tabla.
--
-- ------------------------------------------------------------
-- EL INTERRUPTOR
-- ------------------------------------------------------------
-- Esta migración deja el aviso DORMIDO. No manda nada hasta que
-- pegues la URL del webhook de n8n en la tabla `integraciones_n8n`
-- (ver supabase/herramientas/n8n-set-webhook.sql). Cada base tiene
-- su propia URL, así podés probar sólo en Pruebas y prender
-- Producción cuando estés listo.
-- ============================================================

-- ── 1. Extensión para que Postgres pueda hacer llamadas HTTP ──
-- pg_net manda las llamadas en segundo plano (no bloquea ni hace
-- fallar la operación del usuario si n8n está caído o lento).
create extension if not exists pg_net with schema extensions;

-- ── 2. Dónde se guarda la URL del webhook (el interruptor) ────
-- Tabla chiquita clave/valor. Empieza VACÍA = aviso dormido.
create table if not exists public.integraciones_n8n (
  clave        text primary key,
  valor        text not null default '',
  actualizado  timestamptz not null default now()
);

insert into public.integraciones_n8n (clave, valor)
values ('webhook_url', '')
on conflict (clave) do nothing;

-- Esta tabla guarda un secreto (la URL del webhook). Nadie la lee
-- ni la escribe desde el navegador: RLS prendido y sin políticas.
-- El disparador SÍ la lee porque corre como SECURITY DEFINER.
alter table public.integraciones_n8n enable row level security;
revoke all on public.integraciones_n8n from anon, authenticated;

-- ── 3. La función que arma el aviso y lo manda a n8n ──────────
create or replace function public.notificar_n8n()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url      text;
  v_registro jsonb;
  v_payload  jsonb;
begin
  -- ¿Está prendido? (hay URL configurada)
  select valor into v_url
    from public.integraciones_n8n
   where clave = 'webhook_url';

  if v_url is null or v_url = '' then
    return coalesce(NEW, OLD);   -- dormido: no hace nada
  end if;

  -- Payload COMPACTO por tabla. Nunca mandamos columnas pesadas
  -- (pdf_base64, xml_base64) hacia n8n Cloud.
  if TG_TABLE_NAME = 'documentos' then
    v_registro := jsonb_build_object(
      'id',              NEW.id,
      'numero',          NEW.numero,
      'tipo_doc',        NEW.tipo_doc,
      'cliente_id',      NEW.cliente_id,
      'cliente_nombre',  NEW.cliente_nombre,
      'cliente_comercial', NEW.cliente_comercial,
      'cliente_nit',     NEW.cliente_nit,
      'vendedor_nombre', NEW.vendedor_nombre,
      'estado',          NEW.estado,
      'estado_pago',     NEW.estado_pago,
      'totales',         NEW.totales,
      'autorizacion',    NEW.autorizacion,
      'serie',           NEW.serie,
      'numero_dte',      NEW.numero_dte,
      'anulado',         NEW.anulado,
      'vencimiento',     NEW.vencimiento,
      'creada',          NEW.creada
    );

  elsif TG_TABLE_NAME = 'abonos' then
    v_registro := jsonb_build_object(
      'id',             NEW.id,
      'documento_id',   NEW.documento_id,
      'fecha',          NEW.fecha,
      'monto',          NEW.monto,
      'metodo',         NEW.metodo,
      'no_recibo',      NEW.no_recibo,
      'registrado_por', NEW.registrado_por,
      'anulado',        NEW.anulado,
      'registrado_el',  NEW.registrado_el
    );

  else
    -- Cualquier otra tabla: la fila entera menos lo pesado.
    v_registro := to_jsonb(NEW) - 'pdf_base64' - 'xml_base64';
  end if;

  v_payload := jsonb_build_object(
    'evento',    TG_ARGV[0],        -- nombre lógico (ej. 'documento_creado')
    'tabla',     TG_TABLE_NAME,
    'operacion', TG_OP,             -- INSERT / UPDATE
    'ts',        now(),
    'registro',  v_registro
  );

  -- Manda el aviso. pg_net lo encola y lo dispara aparte.
  perform net.http_post(
    url     := v_url,
    body    := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  return coalesce(NEW, OLD);

exception when others then
  -- Un fallo del aviso NUNCA debe romper la operación del usuario.
  return coalesce(NEW, OLD);
end;
$$;

-- ── 4. Los disparadores (qué eventos avisan) ─────────────────
-- Documento nuevo (pedido / cotización / factura recién creada).
drop trigger if exists trg_n8n_documento_creado on public.documentos;
create trigger trg_n8n_documento_creado
  after insert on public.documentos
  for each row
  execute function public.notificar_n8n('documento_creado');

-- Documento que cambió de estado importante: se facturó (autorización
-- FEL), se pagó, o se anuló. Se filtra para no avisar en cada guardado.
drop trigger if exists trg_n8n_documento_actualizado on public.documentos;
create trigger trg_n8n_documento_actualizado
  after update on public.documentos
  for each row
  when (
    OLD.estado       is distinct from NEW.estado
    or OLD.estado_pago  is distinct from NEW.estado_pago
    or OLD.anulado      is distinct from NEW.anulado
    or OLD.autorizacion is distinct from NEW.autorizacion
  )
  execute function public.notificar_n8n('documento_actualizado');

-- Cobro registrado (abono nuevo).
drop trigger if exists trg_n8n_cobro_registrado on public.abonos;
create trigger trg_n8n_cobro_registrado
  after insert on public.abonos
  for each row
  execute function public.notificar_n8n('cobro_registrado');

-- Cobro anulado.
drop trigger if exists trg_n8n_cobro_anulado on public.abonos;
create trigger trg_n8n_cobro_anulado
  after update on public.abonos
  for each row
  when (OLD.anulado is distinct from NEW.anulado)
  execute function public.notificar_n8n('cobro_anulado');
