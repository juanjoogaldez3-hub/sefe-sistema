# n8n en SEFE — guía para prenderlo

n8n es un armador de automatizaciones: recibe un disparo y hace pasos
(mandar WhatsApp, correo, Telegram, escribir en Google Sheets, etc.).
En SEFE lo usamos para dos cosas:

1. **Avisos automáticos** — la base le avisa a n8n en el momento en que
   pasa algo (se crea un pedido, se factura, se anula, entra un cobro).
2. **Reportes programados** — n8n le pregunta al backend cada mañana
   (ventas de hoy, cobros pendientes, stock bajo) y manda el resumen.

El código ya está publicado. Falta **tu parte**: crear la cuenta de n8n
y conectar los cables. Todo desde el navegador, sin terminal.

> Regla de oro: **hacé todo primero en Pruebas** y recién cuando
> funcione, repetilo en Producción. Cada base tiene su propia URL.

---

## PARTE 1 — Crear la cuenta de n8n Cloud (una vez)

1. Entrá a https://n8n.io y hacé **Sign up** (hay prueba gratis).
2. Elegí la opción **n8n Cloud** (la administrada, no la de instalar).
3. Cuando entres al panel vas a poder crear "Workflows" (flujos).

---

## PARTE 2 — Avisos automáticos (lo que pasa en el ERP → n8n)

### Paso 1 · Crear el flujo con un Webhook

1. En n8n: **Create Workflow**.
2. Agregá un nodo **Webhook** (es el primero, el que "escucha").
3. En el nodo, dejá el método en **POST**.
4. Copiá la **Production URL** que te muestra (algo como
   `https://TUCUENTA.app.n8n.cloud/webhook/xxxxxxxx`).
5. **Activá** el flujo (switch arriba a la derecha) para que la URL de
   producción quede viva.

### Paso 2 · Pegar esa URL en Supabase (el interruptor)

Esto prende los avisos en **Pruebas**. Abrí el proyecto de **Pruebas**
en Supabase → **SQL Editor** → pegá esto reemplazando la URL:

```sql
update public.integraciones_n8n
   set valor = 'PEGA_AQUI_LA_URL_DE_N8N',
       actualizado = now()
 where clave = 'webhook_url';

select clave, valor from public.integraciones_n8n;
```

(Está también en `supabase/herramientas/n8n-set-webhook.sql`.)

Desde ese momento, cada vez que en el ERP de Pruebas se cree un
documento, se facture, se anule o entre un cobro, n8n va a recibir un
aviso. Probalo: creá un pedido en `/Pruebas/` y mirá en n8n la pestaña
**Executions** — debería aparecer la ejecución con los datos.

### Paso 3 · Qué le llega a n8n

Cada aviso es un JSON así:

```json
{
  "evento": "documento_creado",
  "tabla": "documentos",
  "operacion": "INSERT",
  "ts": "2026-08-25T18:30:00Z",
  "registro": { "id": 123, "numero": 4567, "cliente_nombre": "...",
                "totales": { "total": 1500 }, "estado": "abierto" }
}
```

Los `evento` posibles son:

| evento                   | cuándo                                        |
|--------------------------|-----------------------------------------------|
| `documento_creado`       | se crea un pedido/cotización/factura           |
| `documento_actualizado`  | cambia estado, se factura, se paga o se anula  |
| `cobro_registrado`       | entra un abono                                 |
| `cobro_anulado`          | se anula un abono                              |

### Paso 4 · Decidir qué hacer con cada aviso

Después del Webhook, en n8n agregás:

- Un nodo **Switch** o **IF** para separar por `evento`
  (ej. `{{$json.body.evento}} == "documento_creado"`).
- El nodo de acción: **Send Email**, **Telegram**, **WhatsApp**
  (Twilio / WhatsApp Cloud API), **Google Sheets**, lo que quieras.

Decime qué aviso concreto querés primero (ej. "cuando se factura,
mandame un WhatsApp") y te armo el flujo con vos.

### Paso 5 · Prender en Producción

Cuando en Pruebas funcione: repetí el **Paso 2** pero en el proyecto de
**Producción** de Supabase, con la misma (o distinta) URL de n8n.

> Para **apagar** los avisos en una base: poné el valor en vacío
> (`set valor = ''`). El código sigue publicado pero queda dormido.

---

## PARTE 3 — Reportes programados (n8n pregunta por horario)

### Paso 1 · Poner la clave secreta en Render

1. Entrá al panel de Render, al servicio del backend de SEFE.
2. **Environment** → **Add Environment Variable**:
   - Key: `N8N_CLAVE`
   - Value: una clave larga inventada (guardala, la vas a usar en n8n).
3. Guardá. Render reinicia el backend solo.

### Paso 2 · Armar el flujo de reporte en n8n

1. **Create Workflow** nuevo.
2. Nodo **Schedule Trigger** → poné la hora (ej. todos los días 7:00 am).
3. Nodo **HTTP Request**:
   - Method: **GET**
   - URL: `https://TU-BACKEND.onrender.com/api/n8n/reporte/ventas-hoy`
     (la misma dirección del backend que ya usás para facturar;
     cambiá `ventas-hoy` por el reporte que quieras)
   - Headers: agregá uno → nombre `x-n8n-clave`, valor: la clave del
     Paso 1.
4. Nodo de acción (correo / WhatsApp / Sheets) usando los datos que
   devuelve.
5. Activá el flujo.

### Reportes disponibles

| URL                                        | qué devuelve                          |
|--------------------------------------------|---------------------------------------|
| `/api/n8n/reporte/ventas-hoy`              | facturas y monto vendido hoy          |
| `/api/n8n/reporte/cobros-pendientes`       | saldos por cobrar (vencidos primero)  |
| `/api/n8n/reporte/stock-bajo?umbral=10`    | productos con stock ≤ umbral (def. 10)|

Ejemplo de respuesta de `ventas-hoy`:

```json
{
  "ok": true, "tipo": "ventas-hoy",
  "fecha": "2026-08-25", "cantidad": 12, "monto": 18500,
  "facturas": [ { "numero": 4567, "cliente": "...", "total": 1500 } ]
}
```

---

## Resumen de lo que ya está en el código

- **Base (migración `20260825130000_n8n_avisos.sql`)**: extensión
  `pg_net`, tabla `integraciones_n8n` (el interruptor) y los
  disparadores que mandan los avisos. Se aplica sola a las dos bases.
- **Backend**: endpoint `GET /api/n8n/reporte/:tipo` protegido con
  `N8N_CLAVE`, y el módulo `reportes-n8n.js` con las consultas.
- **Falta tuyo**: crear la cuenta de n8n (Parte 1), pegar la URL en
  Supabase (Parte 2) y poner `N8N_CLAVE` en Render (Parte 3).
