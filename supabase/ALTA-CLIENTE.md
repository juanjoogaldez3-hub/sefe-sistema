# Plantilla — dar de alta un cliente nuevo

Checklist para montar un cliente nuevo (un Supabase propio por cliente).
Copiá esta sección, llená los datos, y seguí los pasos en orden.

> **Atajo (recomendado): el Asistente de Alta.** En vez de llenar esto a
> mano, usá el asistente visual: llenás nombre, dominio, módulos y
> colores, y te arma solo el bloque de `config.js` y esta misma checklist.
> El bloque se lo pasás a Claude y lo publica. (El asistente es un
> artifact de Claude; pedíselo y te pasa el enlace.)

> Todo el proceso es sin terminal. Lo único que se toca a mano son unos
> pocos campos en Supabase y en GitHub; el resto se arma solo.

---

## Datos del cliente (rellenar)

| Dato | Valor |
|---|---|
| Nombre del cliente | `_______________` |
| Clave corta (a-z, sin espacios) | `_______________` (ej. `ferreteria_lopez`) |
| Project ref de Supabase | `_______________` (las 20 letras del proyecto) |
| Project URL | `https://_________.supabase.co` |
| anon key (pública) | `_______________` |
| Dominio | `_______________.se-fe.com` |

---

## Paso 1 · Crear el proyecto en Supabase
1. Crear un proyecto nuevo (base vacía) en Supabase.
2. Anotar arriba: **Project ref**, **Project URL** y **anon key**
   (Settings → API), y **resetear la Database password** (Settings →
   Database) — la vas a necesitar en el Paso 2.

## Paso 2 · Instalar la base (una sola pegada)

La forma simple: pegar el instalador completo en el SQL Editor del
proyecto nuevo.

1. En el proyecto nuevo → **SQL Editor → New query**.
2. Pegar TODO el archivo `supabase/INSTALAR-CLIENTE.sql` y **Run**.
3. Al final quedan creadas todas las tablas, la seguridad (RLS capa 1 y
   2), los índices, las secuencias y la limpieza mensual de auditoría.
   Sin errores = base lista.

> Si el instalador avisa que **pg_cron** no está disponible, activá la
> extensión (Database → Extensions → pg_cron) y volvé a correr el bloque
> de `20260831140000_purga_auditoria.sql`. Es lo que programa la limpieza
> automática de la auditoría.

> `INSTALAR-CLIENTE.sql` se genera solo juntando todas las migraciones
> (`node scripts/build-instalador.js`). No se edita a mano; la prueba
> `test-instalador.js` avisa si quedó viejo.

**Alternativa (con el robot de migraciones):** si algún día se activa el
robot de GitHub Actions, en vez del instalador se agrega la contraseña
de la base como secret `SUPABASE_DB_PASSWORD_<CLAVE_EN_MAYUSCULAS>` y un
job en `.github/workflows/migraciones.yml` (plantilla abajo), y las
migraciones se aplican solas.

## Paso 3 · Encender el cliente en `config.js`
Copiar el bloque plantilla del final de `config.js`, descomentarlo y
completar. Queda así (con los datos del cliente):

```js
  ,ferreteriaLopez: {
    entorno: 'ferreteriaLopez',
    url: 'https://XXXXXXXXXXXX.supabase.co',
    key: 'ANON_KEY_PUBLICA_DEL_CLIENTE',
    dominios: ['ferreteria-lopez.se-fe.com'],
    funciones: { whatsapp: false },
    modulos: {                 // opcional; lo que no se ponga queda encendido
      cotizaciones: true,
      cobros: true,
      compras: false,          // este cliente NO compró el módulo de compras
      bancos: true
    },
    marca: {
      nombre: 'Ferretería López',
      nombreLargo: 'Ferretería López, S.A.',
      monograma: 'FL',
      logo: 'data:image/png;base64,....',   // el logo del cliente
      razonSocial: 'Ferretería López, S.A.',
      membrete: 'Ferretería López, S.A.',
      nombreDoc: 'Ferretería López',
      nit: '1234567-8',
      prefijoArchivo: 'FLOPEZ',
      colorPrimario: '#0B5CAB',              // color principal
      colorAcento: '#F2A900'                 // color de acento
    }
  }
```

El selector detecta al cliente por su **dominio**, así que apenas entre
por su dirección, la app apunta sola a su base.

### El bloque `modulos` (qué compró el cliente)

Es **opcional**: lo que no pongas queda **encendido**. Sirve para vender
un sistema base y activar módulos según lo que el cliente quiera.

- **Base (siempre encendido)**: pedidos, facturación, clientes,
  inventario, reportes y administración (usuarios/auditoría).
- **Opcionales** (poné `false` para apagar; se pueden encender después
  sin tocar nada más que este bloque):
  - `cotizaciones` — cotizaciones a clientes.
  - `cobros` — cuentas por cobrar + recordatorios.
  - `compras` — compras, proveedores y cuentas por pagar.
  - `bancos` — bancos, conciliación y talonarios.

Cuando un módulo está apagado, su botón desaparece del menú y su pantalla
queda bloqueada. Los **roles** siguen mandando por encima (el módulo dice
qué existe para el cliente; el rol, qué ve cada empleado).

> **Vender más después**: si el cliente quiere un módulo que tenía
> apagado, se cambia su `false` por `true` en este bloque, se publica, y
> en 1–2 minutos le aparece. Sin migraciones ni nada más.

### El bloque `marca` (branding del cliente)

Es **opcional**: lo que no pongas se hereda del producto (Pulso 360).
Con él, la
instalación se ve con la identidad del cliente **sin tocar código**:

- **En la interfaz**: nombre y monograma en la barra, título de la
  pestaña, ícono/nombre de la app instalada (PWA), pantalla de carga,
  logo del login y los **colores** (`colorPrimario` / `colorAcento`).
- **En los documentos**: el **logo**, la **razón social**, el **NIT** y
  el **membrete** de facturas, notas, órdenes de compra y Excel; y el
  prefijo de los archivos Excel descargados (`prefijoArchivo`).

Para el **logo** hay que pegar la imagen como *data URL* (base64). Lo
más fácil: abrir el PNG en https://www.base64-encode.org/ (o similar) y
copiar el texto `data:image/png;base64,...` completo dentro de `logo`.

> Pendiente conocido: los **colores** del cliente se aplican a la
> interfaz. Dentro de los **PDF/Excel impresos**, los acentos verdes/lima
> todavía son los de SEFE (queda para una segunda pasada de branding). El
> logo y los nombres en los documentos **sí** son ya los del cliente.

## Paso 4 · Apuntar el dominio
1. En el DNS del cliente (o subdominio de `se-fe.com`), apuntar a GitHub
   Pages.
2. Verificar que al entrar por ese dominio, la consola diga
   `SEFE · entorno: <clave del cliente>`.

## Paso 5 · Datos iniciales
1. Crear el/los usuarios del cliente (Supabase Auth + tabla `usuarios`).
2. Cargar sus productos, vendedores y roles.
3. Listo — vendido.

## Paso 6 · Respaldo (no saltear)
Confirmar que el proyecto del cliente tenga **respaldo diario automático**
— nunca dejar un cliente productivo en el plan gratis. Verificar en
**Database → Backups** que la lista de respaldos aparece. Detalle y cómo
restaurar: ver `RESPALDOS.md`.

---

## Plantilla del job de migraciones (para el Paso 2)

Pegar dentro de `.github/workflows/migraciones.yml`, como un job más.
Reemplazar `CLAVE`, el `PROJECT_REF` y el nombre del secret:

```yaml
  cliente_CLAVE:
    name: Aplicar en Cliente CLAVE
    needs: pruebas
    runs-on: ubuntu-latest
    # environment: cliente_CLAVE   # opcional: pedir aprobación como en producción
    env:
      PROJECT_REF: XXXXXXXXXXXX
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Conectar con la base del cliente
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD_CLAVE }}
        run: supabase link --project-ref "$PROJECT_REF"
      - name: Aplicar las migraciones
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD_CLAVE }}
        run: supabase db push --include-all
```

> El `SUPABASE_ACCESS_TOKEN` es el mismo para todos (tu cuenta de
> Supabase). Lo único distinto por cliente es su `PROJECT_REF` y su
> contraseña de base.

---

## Nota (a futuro)

Hoy cada cliente = un job en el workflow + un bloque en `config.js`.
Es repetible pero manual. En la **Fase 5** esto se automatiza en un solo
paso (crear proyecto → migrar → publicar), para dar de alta un cliente
sin editar archivos a mano.
