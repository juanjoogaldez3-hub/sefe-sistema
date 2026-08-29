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

## Migraciones de base

Cada cambio de base se deja como archivo en `supabase/migrations/`
(nombrado `AAAAMMDDHHMMSS_descripcion.sql`) para que quede constancia.

**Pero el robot de GitHub Actions que las aplicaría solo todavía NO está
activo** (faltan cargar las 3 claves — ver `supabase/LEEME.md`). Mientras
tanto, el SQL de cada cambio va **pegado en el chat y Juanjo lo corre a
mano, directo en Producción** (Pruebas está fuera de uso). Escribir las
migraciones con `if not exists` para que sea seguro correrlas de más.

- **Nunca editar una migración ya aplicada.** Si algo salió mal, va una
  migración nueva que lo corrija.
- Lo mismo para cualquier cosa puntual de diagnóstico o emergencia
  (`supabase/herramientas/`): va pegado en el chat.

## Las bases

| Entorno | Proyecto Supabase | Dónde se ve |
|---|---|---|
| Producción | `krbyulpmfazntjwnpxnw` | `sistema.se-fe.com` |
| Pruebas | `imvoyzxdvtoktckazzsv` | (fuera de uso) |

**Pruebas ya no se usa** — quedó desactualizada. Los cambios de base se
corren **directo en Producción**, pegados en el chat. Lo de "probar
primero en Pruebas" y la carpeta `/Pruebas/` ya no aplica (esa carpeta
hoy es sólo un redireccionamiento).

## Cómo se publica

GitHub Pages sirve la rama `main` en `sistema.se-fe.com`. No hay build
step: es HTML/CSS/JS puro. Lo que se mergea a `main` queda en vivo en
1-2 minutos.

Truco útil: **el SQL es el interruptor**. El código puede estar publicado
y seguir dormido hasta que se corre la migración en la base. Por eso es
seguro publicar el código primero (leer una columna o tabla que todavía
no existe no rompe nada) y encender la función con el SQL después.

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

## Idioma

Todo en español (Guatemala): comentarios de código, mensajes de commit,
SQL y conversación.
