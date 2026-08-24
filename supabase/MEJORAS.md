# Memoria de mejoras — base de datos SEFE

Ideas detectadas revisando el esquema real (agosto 2026), para retomar
cuando toque. **No son urgentes ni bloquean vender.** Van ordenadas por
impacto. Cada una se hace como una **migración nueva**, probada primero
en Pruebas.

> Regla: el baseline (`migrations/…_baseline_esquema.sql`) refleja el
> esquema tal como está hoy. Toda mejora es un cambio *encima*, en su
> propia migración — así Producción y los clientes nuevos avanzan juntos.

---

## 1. Sacar los PDF/XML de `documentos`  ·  impacto ALTO

`documentos` guarda `pdf_base64` y `xml_base64`: los archivos de la
factura electrónica, enteros, en base64, dentro de la tabla más
consultada del sistema.

- Infla la tabla y hace lentos los respaldos.
- Cualquier consulta que olvide excluirlos arrastra megas. Hoy se evita
  con `DOC_COLS_SIN_BLOBS` en `db.js`, pero es un campo minado.

**Mejora:** mover esos dos campos a una tabla aparte
(`documentos_archivos`, misma `id`) o a Supabase Storage. Va de la mano
de la Fase 2 (velocidad).

## 2. Índices que faltan para los reportes  ·  impacto ALTO, costo bajo

El sistema filtra y agrupa mucho por fecha y vendedor, pero no hay
índice en:

- `documentos(creada)` — las comparativas por mes hacen barrido completo.
- `documentos(vendedor_id)` — reportes por vendedor.
- `abonos(fecha)` — cobranza por período.

Índices baratos de agregar; se sienten con datos de años.

## 3. Llaves foráneas que faltan  ·  integridad

A diferencia del resto, no tienen FK:

- `cotizaciones.cliente_id`
- `creditos_cliente.cliente_id` y `creditos_cliente.documento_id`

Pueden quedar apuntando a un cliente/documento que ya no existe. Agregar
las FK cierra esa fuga — **antes hay que verificar que no haya
huérfanos** y decidir el `on delete` (probablemente `set null`).

## 4. Borrar las tablas de respaldo  ·  limpieza

`_bkp_stock_20260730` y `_bkp_stock_pre31jul` quedaron de una limpieza de
julio. No molestan, pero ensucian la base y aparecen en cualquier
revisión. Borrarlas (con un respaldo antes, por las dudas).

## 5. Menores

- **Montos:** mezcla de `numeric(12,2)` y `numeric` sin escala
  (`monto` en `creditos_cliente`/`movimientos_banco`, `precio_caja`,
  `precio_unidad`). Estandarizar a 2 decimales evita centavos raros.
- **`modificado`:** las tablas sólo tienen `creado`, no fecha de última
  modificación. Útil para sync/auditoría; la bitácora encadenada
  (`auditoria`) ya cubre parte.
- **Correlativos de negocio** (`numero`, series): hoy `max+1` en el
  cliente → dos personas a la vez pueden chocar. Secuencias de Postgres.
  (Ya está en la Fase 3 del plan; los `id` NO son el problema — esos ya
  son identity.)
