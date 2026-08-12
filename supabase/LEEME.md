# Migraciones de base de datos

## Qué cambió

Antes: cada cambio de base se pegaba a mano en el SQL Editor de
Supabase, en cada base, una por una. Con dos bases ya era tedioso;
con cinco clientes es imposible sin equivocarse.

Ahora: los cambios de base viven en `supabase/migrations/` como
archivos numerados. Cuando se publica un cambio, **GitHub los aplica
solo** — primero en Pruebas, y en Producción sólo después de una
aprobación.

Supabase lleva la cuenta de qué migración se aplicó en cada base, así
que es imposible que una quede desincronizada o que algo se corra dos
veces.

---

## PARTE 1 — Preparación (una sola vez)

Son tres claves y un ajuste. Todo desde el navegador, sin terminal.
Unos 10 minutos.

### Paso 1 · Sacar el token de Supabase

1. Entrá a https://supabase.com/dashboard/account/tokens
2. **Generate new token**
3. Nombre: `github-migraciones`
4. Copiá el token que aparece — **sólo se muestra una vez**

### Paso 2 · Sacar las contraseñas de las dos bases

Es la contraseña de la base (no la de tu cuenta de Supabase).

Para **cada** proyecto:

1. Entrá al proyecto en Supabase
2. **Settings → Database**
3. En **Database password**, si no la tenés guardada, dale
   **Reset database password** y copiá la nueva

Hacelo en los dos:

| Proyecto | Para qué |
|---|---|
| `imvoyzxdvtoktckazzsv` | Pruebas |
| `krbyulpmfazntjwnpxnw` | Producción |

> ⚠️ Si reseteás la contraseña de Producción, cualquier otro servicio
> que se conecte con ella deja de funcionar. Revisá antes que el
> backend de Render no la esté usando: él usa la `service_role`, que
> es otra cosa, así que normalmente no hay problema.

### Paso 3 · Guardar las tres claves en GitHub

1. Entrá a https://github.com/juanjoogaldez3-hub/sefe-sistema
2. **Settings** (arriba a la derecha del repo, no el de tu perfil)
3. Menú izquierdo: **Secrets and variables → Actions**
4. Botón **New repository secret**, y cargá una por una:

| Name | Secret |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | el token del paso 1 |
| `SUPABASE_DB_PASSWORD_PRUEBAS` | la contraseña de Pruebas |
| `SUPABASE_DB_PASSWORD_PROD` | la contraseña de Producción |

Los nombres tienen que ser **idénticos**, en mayúsculas.

Una vez guardadas, ni vos ni nadie las vuelve a ver — GitHub las
muestra sólo como puntitos. Se pueden reemplazar, no leer.

### Paso 4 · Que Producción pida permiso antes de tocarse

Sin esto, un cambio publicado entraría directo a la base real.

1. En el mismo **Settings** del repo
2. Menú izquierdo: **Environments**
3. **New environment**, nombre exacto: `produccion` (sin acento)
4. Marcá **Required reviewers** y agregate a vos mismo
5. **Save protection rules**

Desde ahí, cada vez que haya que tocar Producción, GitHub avisa y
espera un clic de aprobación.

---

## PARTE 2 — El baseline (una sola vez, por base)

Tus dos bases tienen meses de cambios hechos a mano, así que Supabase
todavía no sabe qué está aplicado. Si publicáramos así, intentaría
correr todo desde cero.

**Correr `supabase/baseline.sql` en el SQL Editor, en las dos bases.**

Ese archivo mira el estado real de cada base y anota qué ya está
hecho. Por eso sirve igual en la base donde ya corrimos realtime y
RLS, y en la que todavía no.

No toca ningún dato.

---

## Cómo se trabaja a partir de acá

**Un cambio de base normal:**

1. Claude agrega un archivo en `supabase/migrations/`
2. Lo publica
3. GitHub lo aplica en Pruebas solo
4. Se prueba
5. GitHub pide el OK para Producción, se aprueba, y listo

Ya no hay que pegar SQL en el chat.

**Un cliente nuevo:**

1. Crear su proyecto en Supabase
2. Agregar su contraseña como una clave más
3. Agregar unas líneas al flujo de GitHub

Sus migraciones se aplican todas en orden, desde la primera, y queda
con exactamente el mismo esquema que SEFE. Sin baseline: esa base es
nueva, así que todo se aplica de verdad.

---

## Los archivos

```
supabase/
  config.toml                          nombre local del proyecto
  baseline.sql                         marca lo ya aplicado (una vez por base)
  migrations/
    20260805000000_base_historico.sql  todo lo de antes, junto
    20260812024415_realtime.sql        publicar tablas para el tiempo real
    20260812030419_rls.sql             seguridad a nivel de base
  herramientas/
    rls-revertir.sql                   botón de pánico: apaga RLS
```

El nombre de cada migración empieza con la fecha y hora, y ese orden
es el que manda: se aplican de la más vieja a la más nueva.

**Nunca se edita una migración ya aplicada.** Si algo salió mal, se
agrega una nueva que lo corrija. Así todas las bases pasan por la
misma secuencia y terminan iguales.

---

## Si algo falla

- El error sale en la pestaña **Actions** del repo, con el detalle
- Si falla en Pruebas, Producción **no se toca**: está encadenada
- `herramientas/rls-revertir.sql` apaga RLS en un segundo si el
  problema es de permisos
