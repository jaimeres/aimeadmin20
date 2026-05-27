# 2026-05-19 002 — UI de Línea de Tiempo para `asset-subsidiary`

## Prompt

> Construye la interfaz de usuario para gestionar la ubicación administrativa
> temporal de activos en sucursales. Vista tabular diaria por sucursal/activo
> con rango (default = mes actual), agrupación opcional (día / runs iguales),
> edición por celda mediante popup, y reconstrucción cliente (diff) que envía
> al servidor el mínimo de POST/PATCH/DELETE consolidando días contiguos con
> los mismos atributos.

## Decisiones de diseño

- **Orientación**: filas = sucursales, columnas = días (Opción A acordada).
  Refleja directamente la continuidad temporal del activo y permite ver huecos
  recorriendo verticalmente cualquier columna (suma de % por día).
- **Activo**: se toma de `selected()` del CRUD padre. Soporta tanto un
  `asset` directo como un `asset-subsidiary` (extrae `asset` de
  `relationships`).
- **Rango**: `p-datepicker` con `selectionMode='range'`, default = mes actual
  (UTC).
- **Agrupación**: `day` (sin agrupar, default visual) y `auto` (run-length:
  colapsa días contiguos con mismo `(percentage, is_default)` en bloques).
- **Edición**: click en celda abre `p-dialog` con `subsidiary`, `percentage`,
  `is_default`, y opcionalmente "Aplicar hasta" para aplicar a un rango.
- **Diff cliente → servidor**:
  - Por cada sucursal se calculan los runs deseados (consecutivos con mismos
    atributos) y se emparejan con los registros originales del mismo
    `subsidiary` ordenados por `start_date`.
  - Coincidencia: PATCH sólo de los atributos que cambian (`start_date`,
    `end_date`, `percentage`, `is_default`).
  - Sobrante deseado → POST.
  - Sobrante original → DELETE.
  - Orden de ejecución: **PATCH → DELETE → POST** para no chocar con la
    restricción de no solapamiento del mismo par `(asset, subsidiary)`.
- **Validaciones locales** (no bloquean envío, son visuales):
  - **Hueco**: día sin ninguna asignación → celda roja + banner `error`.
  - **Suma ≠ 100 %**: banner `warn` con conteo de días afectados.
  - **Predeterminada única**: al marcar `is_default = true` en el popup se
    desmarca el resto del mismo día.
- **Fechas**: todo se normaliza a UTC con precisión a día (`YYYY-MM-DDT00:00:00Z`).
  La regla `[start, end)` se respeta: `end_date` del run = día siguiente al
  último día ocupado.

## Endpoints consumidos

- `GET  /v1/assets/asset-subsidiary/?filter[asset]=<id>&filter[end_date.gte]=<rango_ini>&filter[start_date.lte]=<rango_fin>&include=asset,subsidiary&page[size]=500`
- `GET  /v1/companies/subsidiary/?page[size]=500&sort=name`
- `POST /v1/assets/asset-subsidiary/`
- `PATCH /v1/assets/asset-subsidiary/<id>/`
- `DELETE /v1/assets/asset-subsidiary/<id>/`

## Archivos creados / modificados

- `src/app/components/asset-subsidiary-timeline/asset-subsidiary-timeline.service.ts` — nuevo.
- `src/app/components/asset-subsidiary-timeline/asset-subsidiary-timeline.component.ts` — nuevo.
- `src/app/components/asset-subsidiary-timeline/asset-subsidiary-timeline.component.html` — nuevo.
- `src/app/components/asset-subsidiary-timeline/asset-subsidiary-timeline.component.scss` — nuevo.
- `src/app/assets/asset/asset.component.ts` — import del componente.
- `src/app/assets/asset/asset.component.html` — nuevo tab "Línea de tiempo"
  dentro del `p-dialog` `asset-subsidiary`.

## Escenarios

### Escenario 01 — Cargar y editar el timeline de un activo

Referenciado en código con `[[[II ESC:002-01 ]]]FI`.

**Precondición**: el usuario tiene un activo seleccionado en la tabla del CRUD
(pos `asset` o `asset-subsidiary`) y abre el diálogo `asset-subsidiary`.

**Flujo**:

1. El usuario cambia a la pestaña "Línea de tiempo".
2. El componente carga registros con
   `GET /v1/assets/asset-subsidiary/?filter[asset]=<id>&...` para el mes actual
   y sucursales con `GET /v1/companies/subsidiary/`.
3. Se construye el heatmap día×sucursal a partir del intervalo `[start, end)`
   de cada registro.
4. El usuario hace click en una celda vacía → popup → escoge sucursal, %,
   marca `is_default` y opcionalmente "Aplicar hasta".
5. Al aplicar, el mapa diario se actualiza en memoria (no se envía nada todavía).
6. El usuario pulsa "Guardar cambios". El componente:
   - Reconstruye runs contiguos por sucursal con mismos `(% , is_default)`.
   - Diff por pares contra el snapshot original.
   - Ejecuta PATCH → DELETE → POST en serie.
   - Recarga al terminar.

**Casos límite cubiertos**:
- Si el usuario agrega días sueltos del mismo `(asset, subsidiary, %, is_default)`
  contiguos a un registro existente, el diff sólo emite un **PATCH** ampliando
  `end_date` (o `start_date`) — no crea otro registro.
- Si el usuario cambia el porcentaje de un par a partir de cierto día, el run
  original se acorta (PATCH `end_date`) y se crea uno nuevo (POST).
- Mover de SubsA a SubsB un día concreto: PATCH cierra SubsA en ese día y POST
  abre SubsB con `start_date` = ese día.

### Escenario 02 — Validaciones visuales

- Días sin asignación: celda roja en la columna del día, banner `error`.
- Suma de % distinta de 100: banner `warn` con conteo.
- Solapamientos por mismo par `(asset, subsidiary)`: no son posibles desde la
  UI (el mapa por día sólo guarda una entrada por sucursal por día). Si el
  backend devolviera dos registros del mismo par solapados, se renderizarían
  superpuestos y el último prevalecería visualmente — se considera estado
  inconsistente del servidor.

## Trade-offs conocidos

- El emparejamiento de diff es por orden de `start_date` dentro de cada
  sucursal. En escenarios complejos (varios registros del mismo par con cambios
  cruzados) podría producir PATCH+DELETE+POST en lugar de un PATCH minimal,
  pero el resultado funcional final es correcto.
- La paginación de `list()` está fija a `page[size]=500`: suficiente para un
  activo en un rango razonable; si se llega al límite, agregar paginado.
- El selector de fecha del rango y del popup usa hora local del navegador y se
  normaliza a UTC a día → si el usuario está en una zona muy desplazada, el
  "día" mostrado podría diferir del día UTC. Aceptable para v1.
