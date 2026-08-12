-- ============================================================
-- SEFE · BANDEJA DE WHATSAPP — tablas
-- ============================================================
-- ⚠️ CORRER SÓLO EN LA BASE DE PRUEBAS: imvoyzxdvtoktckazzsv
--
-- NO va todavía en supabase/migrations/ a propósito. Todo lo que
-- está ahí termina aplicándose también en Producción, y esta
-- función se está probando. Cuando esté lista se mueve para allá
-- y entra por el camino normal.
--
-- Es seguro correrlo varias veces.
-- ============================================================


-- ------------------------------------------------------------
-- 1) CONVERSACIONES · una por número de teléfono
-- ------------------------------------------------------------
create table if not exists conversaciones (
  id                  bigserial primary key,

  -- El número tal como lo manda Meta: código de país + número,
  -- sin signos. Guatemala queda como '50212345678'.
  telefono            text not null unique,

  -- Nombre que la persona tiene puesto en su WhatsApp. Es lo único
  -- que se sabe de alguien que escribe por primera vez.
  nombre_wa           text,

  -- Cliente de SEFE, si se logra reconocer. Queda vacío cuando
  -- escribe un número desconocido, y se puede ligar a mano después.
  cliente_id          bigint,

  -- Para ordenar la lista y mostrar el adelanto, sin tener que
  -- leer todos los mensajes de cada conversación.
  ultimo_mensaje_texto text,
  ultimo_mensaje_el    timestamptz,

  -- Cuándo escribió el CLIENTE por última vez. De acá sale la
  -- ventana de 24 horas: pasado ese rato Meta ya no deja mandar
  -- texto libre, sólo plantillas aprobadas.
  ultimo_entrante_el   timestamptz,

  no_leidos           integer default 0,
  asignado_a          text,                    -- nombre del usuario que atiende
  estado              text default 'abierta',  -- abierta | cerrada
  creada              timestamptz default now()
);

-- La lista se muestra siempre por actividad reciente.
create index if not exists conversaciones_actividad_idx
  on conversaciones (ultimo_mensaje_el desc nulls last);
create index if not exists conversaciones_cliente_idx
  on conversaciones (cliente_id);


-- ------------------------------------------------------------
-- 2) MENSAJES
-- ------------------------------------------------------------
create table if not exists mensajes (
  id               bigserial primary key,
  conversacion_id  bigint not null references conversaciones(id) on delete cascade,

  -- El identificador que le pone Meta al mensaje.
  --
  -- ES LA PIEZA MÁS IMPORTANTE DE ESTA TABLA: Meta reintenta el
  -- aviso si el servidor no contesta a tiempo, así que el MISMO
  -- mensaje puede llegar varias veces. Sin esto, un mensaje del
  -- cliente aparecería repetido tres o cuatro veces.
  wa_id            text unique,

  direccion        text not null,            -- entrante | saliente
  tipo             text default 'texto',     -- texto | imagen | documento | audio | video | ubicacion
  texto            text,

  -- Para fotos y archivos: Meta guarda el archivo y da un id con
  -- el que se descarga después.
  media_id         text,
  media_tipo       text,
  media_nombre     text,

  -- Sólo para los que mandamos nosotros.
  estado           text,                     -- enviado | entregado | leido | fallido
  error            text,
  enviado_por      text,                     -- qué usuario de SEFE lo mandó

  creado_el        timestamptz default now()
);

-- El chat se lee siempre igual: los mensajes de una conversación,
-- en orden.
create index if not exists mensajes_conversacion_idx
  on mensajes (conversacion_id, creado_el);


-- ------------------------------------------------------------
-- 3) TIEMPO REAL
-- ------------------------------------------------------------
-- Sin esto los mensajes llegan a la base pero no aparecen solos en
-- la pantalla: habría que recargar, que es justo lo que no quiere
-- nadie en un chat.
do $$
declare t text;
begin
  foreach t in array array['conversaciones','mensajes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'publicada en tiempo real: %', t;
    else
      raise notice 'ya estaba publicada: %', t;
    end if;
  end loop;
end $$;


-- ------------------------------------------------------------
-- 4) SEGURIDAD
-- ------------------------------------------------------------
-- Acá van a quedar conversaciones con clientes reales, así que las
-- tablas nacen protegidas.
--
-- Si esta base ya tiene las funciones de permisos (sefe_rol), se
-- usan las mismas reglas que el resto del sistema. Si todavía no
-- —el caso de Pruebas hoy— se deja el mínimo: hay que tener sesión.
-- Al aplicar RLS en esta base, volver a correr este bloque.
do $$
declare tiene_sefe boolean;
begin
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='sefe_rol'
  ) into tiene_sefe;

  alter table conversaciones enable row level security;
  alter table mensajes       enable row level security;

  drop policy if exists wa_leer   on conversaciones;
  drop policy if exists wa_crear  on conversaciones;
  drop policy if exists wa_editar on conversaciones;
  drop policy if exists wa_leer   on mensajes;
  drop policy if exists wa_crear  on mensajes;
  drop policy if exists wa_editar on mensajes;

  if tiene_sefe then
    create policy wa_leer   on conversaciones for select to authenticated using ((select public.sefe_activo()));
    create policy wa_crear  on conversaciones for insert to authenticated with check ((select public.sefe_puede_escribir()));
    create policy wa_editar on conversaciones for update to authenticated using ((select public.sefe_puede_escribir())) with check ((select public.sefe_puede_escribir()));
    create policy wa_leer   on mensajes       for select to authenticated using ((select public.sefe_activo()));
    create policy wa_crear  on mensajes       for insert to authenticated with check ((select public.sefe_puede_escribir()));
    create policy wa_editar on mensajes       for update to authenticated using ((select public.sefe_puede_escribir())) with check ((select public.sefe_puede_escribir()));
    raise notice 'protegidas con las reglas de SEFE (sefe_rol)';
  else
    create policy wa_leer   on conversaciones for select to authenticated using (true);
    create policy wa_crear  on conversaciones for insert to authenticated with check (true);
    create policy wa_editar on conversaciones for update to authenticated using (true) with check (true);
    create policy wa_leer   on mensajes       for select to authenticated using (true);
    create policy wa_crear  on mensajes       for insert to authenticated with check (true);
    create policy wa_editar on mensajes       for update to authenticated using (true) with check (true);
    raise notice 'ATENCION: esta base no tiene RLS de SEFE todavia.';
    raise notice 'Quedan al minimo (hay que tener sesion). Volver a correr este bloque despues de aplicar RLS aca.';
  end if;
end $$;

-- Nota: el backend escribe con la llave de servicio, que se salta
-- RLS por diseño. Estas reglas son para el navegador.


-- ------------------------------------------------------------
-- 5) VERIFICACIÓN
-- ------------------------------------------------------------
select c.relname as tabla,
       c.relrowsecurity as "RLS activo",
       (select count(*) from pg_policy p where p.polrelid=c.oid) as politicas,
       (select count(*) from pg_publication_tables t
         where t.pubname='supabase_realtime' and t.schemaname='public'
           and t.tablename=c.relname) as "en tiempo real"
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('conversaciones','mensajes')
order by c.relname;
