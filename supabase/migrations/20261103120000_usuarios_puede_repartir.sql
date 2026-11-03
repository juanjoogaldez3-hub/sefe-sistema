-- ============================================================
-- SEFE · Usuarios: bandera "puede repartir"
-- ============================================================
-- Nuevo modelo de entregas: cualquier USUARIO marcado "puede repartir"
-- (o de rol Piloto, que siempre puede) aparece en Despachos para
-- asignarle entregas, y cuando tiene al menos una entrega asignada se
-- le habilita el módulo "Mis entregas".
--
-- Por detrás se le sigue creando/vinculando su ficha de piloto
-- (usuarios.piloto_id), así el documento sigue guardando pilotoId y el
-- historial de entregas no se toca.
--
-- Seguro de correr de más: 'if not exists' + default false.
-- `usuarios` ya tiene RLS: agregar una columna no necesita políticas.
-- ============================================================

alter table public.usuarios
  add column if not exists puede_repartir boolean not null default false;

-- Los usuarios de rol Piloto que ya existen quedan como "puede repartir"
-- (es coherente: siempre pudieron). No es obligatorio — el código ya los
-- trata como repartidores por su rol — pero deja la bandera consistente.
update public.usuarios set puede_repartir = true
where rol = 'piloto' and puede_repartir is not true;
