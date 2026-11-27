# SEFE — Cómo se trabaja en este proyecto

## Reparto de tareas (IMPORTANTE)

**El código lo maneja Claude. La base la consulta Claude directo; los
cambios de datos chicos los hace Claude y avisa, los grandes los aprueba
Juanjo.**

- Los cambios de código (`index.html`, `db.js`, `realtime.js`, …) se
  commitean y publican sin pedirle a Juanjo que toque GitHub. Él no
  hace merges, ni pull requests, ni usa la terminal.
- **Claude tiene acceso directo a Producción** con el conector de
  Supabase (proyecto `krbyulpmfazntjwnpxnw`, desde el 19-11-2026).
  - **Consultas** (`select`, diagnósticos): Claude las corre solo, sin
    pedirle nada a Juanjo.
  - **Cambios de datos chicos** (`update` / `insert`): Claude los hace
    solo y **le avisa a Juanjo después**, mostrando qué cambió. Ej.:
    corregir un nombre, una nota, el vendedor de un documento, apuntar
    una línea al producto correcto con su ajuste de stock chico, o un
    dato que Juanjo ya confirmó en el chat. (Regla acordada con Juanjo
    el 25-11-2026: "a menos que sea un cambio muy grande o importante".)
  - **Cambios grandes o importantes**: Claude explica qué va a cambiar y
    **espera el OK de Juanjo en el chat** antes de correrlo. Cuenta como
    grande o importante:
    - lo que toca **dinero**: montos, saldos, abonos, pagos, notas de
      crédito, movimientos de banco, conciliaciones;
    - **anular o borrar** registros (`delete`), o lo que no se puede
      deshacer;
    - **muchos registros a la vez** (más de ~5) o un `where` que no es
      por id;
    - **pasar registros de una empresa a otra** (SEFE ↔ LAML);
    - lo que tiene que ver con **SAT / FEL** (facturas certificadas,
      NIT, serie, número);
    - cuando la respuesta depende de **una decisión del negocio** que
      solo Juanjo sabe (de qué empresa es, a qué vendedor le toca…);
    - cambios de estructura de la base (migraciones).
  - En todos los casos: `where` acotado por id, todo en una sola
    sentencia (si algo falla no cambia nada) y `returning` para mostrar
    qué cambió. Ante la duda, se pregunta.
  - Si el conector muestra otro proyecto (ej. "dropper-reporteria" de la
    organización Droppergtm), está conectado con la cuenta equivocada:
    Juanjo lo reconecta en claude.ai → Conectores → Supabase, entrando
    con la cuenta dueña del proyecto de SEFE.
- Si el conector no está disponible, se vuelve al modo anterior: el SQL
  se le entrega a Juanjo **pegado en el chat, listo para copiar, y
  partido en pasos numerados**, un paso a la vez. Nunca decirle "está en
  el repo" o "mirá el archivo X" para algo que tiene que ejecutar.
- La tabla `auditoria` es una cadena con hash que arma el navegador: **no
  insertar filas a mano** desde SQL (rompe la cadena). Lo que se corrija
  por SQL se anota en el campo de motivo del propio registro.

## Migraciones de base

Cada cambio de base se deja como archivo en `supabase/migrations/`
(nombrado `AAAAMMDDHHMMSS_descripcion.sql`) para que quede constancia.

**El robot de GitHub Actions que las aplicaría solo todavía NO está
activo** (faltan cargar las 3 claves — ver `supabase/LEEME.md`). Las
migraciones se aplican directo en Producción (Pruebas está fuera de uso):
Claude las aplica con el conector **después del OK de Juanjo**, o se las
pasa pegadas en el chat si el conector no está. Escribir las migraciones
con `if not exists` para que sea seguro correrlas de más.

- **Nunca editar una migración ya aplicada.** Si algo salió mal, va una
  migración nueva que lo corrija.
- Lo puntual de diagnóstico o emergencia (`supabase/herramientas/`): las
  consultas las corre Claude; los cambios, según la regla de arriba
  (chicos: se hacen y se avisa; grandes o importantes: con el OK de
  Juanjo).
- **Toda tabla nueva necesita sus políticas RLS.** Este proyecto tiene
  RLS activo (ver `20260812030419_rls.sql`): una tabla sin políticas
  queda *cerrada* y el navegador no puede leer ni escribir en ella —
  aunque la tabla exista. Al crear una tabla operativa, agregarle en la
  misma migración las políticas `sefe_leer` / `sefe_crear` / `sefe_editar`
  / `sefe_borrar` (reusando las funciones `sefe_activo()`,
  `sefe_puede_escribir()`, `sefe_es_admin()`) y el `grant` a
  `authenticated`. Modelo listo para copiar:
  `20260829170000_rls_tablas_nuevas.sql`.

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

## Tienda en línea (desde el 26-11-2026)

- **Página pública**: `tienda/index.html` → `sistema.se-fe.com/tienda/`. No
  usa login del sistema ni lee tablas: todo pasa por las funciones
  `tienda_*` de la base (`20261126120000_tienda_en_linea.sql`), que
  calculan precios y total en la base. Del navegador sólo salen códigos y
  cantidades.
- **Unificada**: una ficha por código aunque el producto esté en SEFE y en
  LAML. Precio público = el de lista más alto; cliente con acceso = su
  precio especial / el de su empresa.
- **Pedidos web** caen en `pedidos_web` SIN empresa. En el sistema, módulo
  "Tienda en línea" (`js/app-14.js`): se elige qué empresa vende cada
  línea y se crea un PED normal por empresa (reserva inventario).
- **Nace apagada**: `ajustes.tienda.activa`. Se enciende en Tienda en
  línea → Configuración (Admin/Gerencia).
- **Fotos**: cubeta pública `productos` de Storage; `productos.imagen_url`.
- **Diseños**: original / a / b / c (`ajustes.tienda.tema`, CSS en
  `html[data-tema=…]`). En la vista previa hay botones para compararlos.
- **Página por producto**: `tienda/#p=CODIGO`. La descripción vive en
  `productos.tienda_descripcion` y se pide al abrir con
  `tienda_producto(codigo)` (no viaja en el catálogo). Formato de texto:
  1ª línea = resumen; `## Título`; `• viñeta`; `@pdf Etiqueta|URL`.
- **Datos de la tienda anterior** (solucionesefectivasgt.com):
  `tienda/fichas-anteriores.json` (`[nombre, foto, descripción]`, lo arma
  `scripts/build-fichas-tienda.js`). Se importan desde Tienda en línea →
  Productos y fotos, emparejando por nombre; las fotos quedan enlazadas a
  esa web (no copiadas).
- **Falta (fase 2)**: cobro con tarjeta. Necesita que Juanjo contrate una
  pasarela (ej. Recurrente, Pagalo, Cubo Pay) y pase las llaves; el cobro
  y su confirmación (webhook) van en `sefe-backend`, no en el navegador.

## Pendientes conocidos

- **Correlativos en el cliente**: `corr`, `cliN`, `compN`… se calculan
  con `max(id)+1` al cargar. Dos personas creando un pedido a la vez
  pueden sacar el mismo número. Toca secuencias de Postgres.
- **RLS capa 2**: hoy cualquier usuario activo lee todas las tablas.
  Falta la restricción por rol. Ojo: el Facturador tiene
  `editarInventario=false` pero al facturar descuenta stock — una
  política mal puesta rompe la facturación en silencio.
- **Carga inicial**: `cargarTodo()` baja las tablas operativas en cada
  login. Ya está aliviado lo más pesado (la auditoría se trae sólo la
  última fila, y los documentos sin los PDF/XML). Lo que queda para más
  adelante es no bajar *todos* los documentos/abonos/movimientos cuando
  el negocio crezca mucho (paginar o cargar bajo demanda). No urge.
- **Rutas SIN Google de pago (decisión de Juanjo, 27-11-2026)**: el
  "Optimizar"/"Por cercanía" de Despachos usa OpenRouteService (gratis,
  calles reales) y, si falla, línea recta. **Nunca Google** (Distance Matrix,
  Geocoder ni el mapa JS de Google: cobran). OJO: ORS se mudó —
  `api.openrouteservice.org` da 410 desde el 24-11-2026; la URL buena es
  `https://api.heigit.org/openrouteservice/v2/matrix/driving-car` (misma
  `ORS_API_KEY`, en `js/app-1.js`). El buscador de direcciones gratis de ORS
  (`api.heigit.org/pelias/v1`) ubica mal en Guatemala, así que no se usa:
  las paradas toman el pin del cliente; el mapa de Mis entregas es
  OpenStreetMap. Navegar en Google Maps/Waze sí (son enlaces, no cobran).
  Todavía usan Google (fuera de rutas): el buscador de direcciones del
  formulario de cliente (Places) y los mapas de la ficha del cliente.

## Idioma

Todo en español (Guatemala): comentarios de código, mensajes de commit,
SQL y conversación.
