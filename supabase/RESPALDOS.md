# Respaldos de la base (por cliente)

Cada cliente tiene **su propio proyecto Supabase**, así que cada uno tiene
su propio respaldo. Esta guía es para asegurarse de que ninguno quede sin
red, y para saber qué hacer si hay que restaurar.

> Regla corta: **ningún cliente en producción en el plan gratis.** El plan
> gratis de Supabase **no** hace respaldos automáticos. Un cliente que
> factura de verdad va en **Pro** (o con PITR si su data es crítica).

---

## 1. Qué hace Supabase solo, según el plan

| Plan | Respaldo automático | Cada cuánto | Se guarda |
|---|---|---|---|
| **Free** | ❌ No | — | Nada. Sólo respaldo manual a mano. |
| **Pro** | ✅ Sí | Diario | ~7 días hacia atrás |
| **Team** | ✅ Sí | Diario | ~14 días hacia atrás |
| **PITR** (complemento) | ✅ Sí | Continuo | Restaurar a cualquier minuto (retención configurable) |

- **Diario** = una foto de la base por día. Si algo se rompe hoy, se puede
  volver a la foto de ayer (se pierde lo del día).
- **PITR** (Point-in-Time Recovery) = se puede volver a **cualquier
  momento** (al minuto), no sólo al corte diario. Es un complemento pago.
  Vale la pena para clientes con mucho movimiento o data muy sensible.

> Los números de retención (7/14 días) pueden cambiar según Supabase.
> Verificar siempre lo que dice el plan del proyecto en su tablero.

---

## 2. Verificar que el respaldo esté ENCENDIDO (por cliente)

Todo desde el navegador, sin terminal:

1. Entrar al proyecto del cliente en Supabase.
2. Menú lateral → **Database → Backups** (Respaldos).
3. Debe verse una **lista de respaldos diarios** con fecha. Si la lista
   está vacía o dice que el plan no incluye respaldos → **ese cliente está
   sin red**: subirlo a Pro.
4. Si el cliente tiene PITR, en esa misma pantalla aparece la opción de
   restaurar a una fecha y hora exactas.

Hacer esto **al dar de alta** cada cliente y revisarlo cada tanto.

---

## 3. Cómo RESTAURAR (si algo salió mal)

⚠️ Restaurar **sobrescribe** la base con la foto elegida: se pierde lo que
pasó después de esa foto. Es el botón de emergencia, no de todos los días.

1. Proyecto del cliente → **Database → Backups**.
2. Elegir el respaldo (o, con PITR, la fecha y hora) al que se quiere
   volver.
3. **Restore** y confirmar.
4. Avisar al cliente: lo cargado entre esa foto y ahora hay que volver a
   cargarlo.

Antes de restaurar, si se puede, **bajar primero un respaldo manual del
estado actual** (paso 4) para no perder la posibilidad de comparar.

---

## 4. Respaldo manual a demanda (cualquier plan)

Sirve para tener una copia extra antes de un cambio grande, o como copia
que uno guarda por su cuenta.

**Opción tablero (sin terminal):** Proyecto → **Database → Backups**. En
los planes con respaldo hay un botón para **descargar** el último respaldo.

**Opción técnica (la corre Claude, no Juanjo):** con la cadena de conexión
del proyecto (Settings → Database → Connection string):

```
supabase db dump --db-url "postgresql://postgres:CLAVE@HOST:5432/postgres" -f respaldo-CLIENTE-AAAA-MM-DD.sql
```

Eso baja un `.sql` con todo (estructura + datos) que se puede guardar o
volver a cargar en otra base.

---

## 5. En el alta de un cliente (agregar al checklist)

Al montar un cliente nuevo (ver `ALTA-CLIENTE.md`), sumar:

- [ ] El proyecto del cliente está en un plan con **respaldo diario**
      (Pro o superior). **Nunca dejar un cliente productivo en Free.**
- [ ] Verificado en **Database → Backups** que la lista de respaldos
      aparece.
- [ ] Si su data es crítica, evaluar el complemento **PITR**.

---

## 6. A futuro (con el hub)

Cuando exista el hub administrador, se puede sumar un **respaldo
automático fuera de Supabase**: un robot que, además del respaldo propio
de cada Supabase, copia todas las bases a un almacén aparte (doble red).
Necesita las llaves de todas las bases centralizadas, por eso va de la
mano del hub y no antes.
