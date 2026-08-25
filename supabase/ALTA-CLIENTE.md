# Plantilla — dar de alta un cliente nuevo

Checklist para montar un cliente nuevo (un Supabase propio por cliente).
Copiá esta sección, llená los datos, y seguí los pasos en orden.

> Todo el proceso es sin terminal. Lo único que se toca a mano son unos
> pocos campos en Supabase y en GitHub; el resto lo aplican solas las
> migraciones.

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

## Paso 2 · Migraciones (crea todas las tablas solas)
1. En GitHub → Settings → Secrets and variables → Actions, agregar la
   contraseña de la base del cliente como un secret nuevo:
   `SUPABASE_DB_PASSWORD_<CLAVE_EN_MAYUSCULAS>`
   (ej. `SUPABASE_DB_PASSWORD_FERRETERIA_LOPEZ`).
2. Agregar un job para ese cliente en `.github/workflows/migraciones.yml`
   (ver plantilla abajo).
3. Publicar. Las migraciones se aplican **desde la primera**
   (`baseline_esquema`, que crea las tablas) y la base queda con el
   mismo esquema que SEFE. **No** se corre `baseline.sql`: es una base
   nueva, así que todo se aplica de verdad.

## Paso 3 · Encender el cliente en `config.js`
Copiar el bloque plantilla del final de `config.js`, descomentarlo y
completar. Queda así (con los datos del cliente):

```js
  ,ferreteriaLopez: {
    entorno: 'ferreteriaLopez',
    url: 'https://XXXXXXXXXXXX.supabase.co',
    key: 'ANON_KEY_PUBLICA_DEL_CLIENTE',
    dominios: ['ferreteria-lopez.se-fe.com'],
    funciones: { whatsapp: false }
  }
```

El selector detecta al cliente por su **dominio**, así que apenas entre
por su dirección, la app apunta sola a su base.

## Paso 4 · Apuntar el dominio
1. En el DNS del cliente (o subdominio de `se-fe.com`), apuntar a GitHub
   Pages.
2. Verificar que al entrar por ese dominio, la consola diga
   `SEFE · entorno: <clave del cliente>`.

## Paso 5 · Datos iniciales
1. Crear el/los usuarios del cliente (Supabase Auth + tabla `usuarios`).
2. Cargar sus productos, vendedores y roles.
3. Listo — vendido.

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
