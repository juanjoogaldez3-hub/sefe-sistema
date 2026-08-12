# SEFE — Cómo se trabaja en este proyecto

## Reparto de tareas (IMPORTANTE)

**El código lo maneja Claude. El SQL lo corre Juanjo.**

- Los cambios de código (`index.html`, `db.js`, `realtime.js`, …) se
  commitean y publican sin pedirle a Juanjo que toque GitHub. Él no
  hace merges, ni pull requests, ni usa la terminal.
- Todo lo que haya que correr en Supabase se le entrega **pegado en el
  chat, listo para copiar, y partido en pasos numerados**. Un paso a la
  vez: él lo corre, pega el resultado, y recién ahí viene el siguiente.
- Nunca decirle "está en el repo" o "mirá el archivo X" para algo que
  tiene que ejecutar. Si lo tiene que correr él, va pegado en el chat.

El repo ya venía con esa costumbre: `migracion-ola1.sql`,
`migracion-ola2.sql`, `migracion-completa.sql` — todos con el
encabezado "Correr en el SQL Editor de Supabase".

Los archivos `.sql` igual se guardan en el repo, pero como registro de
lo que se hizo, no como forma de entrega.

## Las dos bases

| Entorno | Proyecto Supabase | Dónde se ve |
|---|---|---|
| Producción | `krbyulpmfazntjwnpxnw` | `sistema.se-fe.com` |
| Pruebas | `imvoyzxdvtoktckazzsv` | carpeta `/Pruebas/` |

Toda migración se corre **primero en Pruebas**. `/Pruebas/` es una copia
completa del sistema apuntando a la otra base; hay que aplicarle los
mismos cambios que a la raíz.

## Cómo se publica

GitHub Pages sirve la rama `main` en `sistema.se-fe.com`. No hay build
step: es HTML/CSS/JS puro. Lo que se mergea a `main` queda en vivo en
1-2 minutos, para producción y para `/Pruebas/` a la vez.

Truco útil: en cambios que dependen de una migración (como el tiempo
real), **el SQL es el interruptor**. El código puede estar publicado y
seguir dormido en la base donde no se corrió la migración. Eso permite
publicar el código y probar sólo en Pruebas.

## Arquitectura, en corto

- **Frontend**: `index.html` (un solo archivo, ~9.900 líneas) + `db.js`
  (capa de datos) + `config.js` (credenciales, no se toca) +
  `realtime.js` (sincronización en vivo).
- **Datos**: el navegador habla directo con Supabase. `cargarTodo()`
  baja todas las tablas a arrays globales al entrar.
- **Render**: cada vista es una función pura de `arrays → innerHTML`
  (`renderDocs()`, `renderCobros()`, …). `go(vista)` las despacha.
- **Backend** (`sefe-backend`, en Render): sólo existe para lo que no
  puede vivir en el navegador — las credenciales de EcoFactura (FEL) y
  la `service_role` de Supabase. Usa `service_role`, así que **se salta
  RLS**.

## Pendientes conocidos

- **Correlativos en el cliente**: `corr`, `cliN`, `compN`… se calculan
  con `max(id)+1` al cargar. Dos personas creando un pedido a la vez
  pueden sacar el mismo número. Toca secuencias de Postgres.
- **RLS capa 2**: hoy cualquier usuario activo lee todas las tablas.
  Falta la restricción por rol. Ojo: el Facturador tiene
  `editarInventario=false` pero al facturar descuenta stock — una
  política mal puesta rompe la facturación en silencio.
- **Carga inicial**: `cargarTodo()` baja todo en cada login, incluida
  `auditoria`, que crece para siempre.
- **`/Pruebas/` duplicado**: 827 KB de copia manual que tarde o
  temprano diverge.

## Idioma

Todo en español (Guatemala): comentarios de código, mensajes de commit,
SQL y conversación.
