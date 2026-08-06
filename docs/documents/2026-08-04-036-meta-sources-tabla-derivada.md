<!-- [[[II ESC:036-01 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-01 -->
# La tabla derivada arma `data.meta.sources`

- Fecha: 2026-08-04
- Consecutivo: 036
- Tipo: Cambio funcional del cliente
- Alcance: **transversal a todo padre-hijo del BOS**, no exclusivo de compras

## Punto de partida

El servidor cerró el contrato de conversiones en
[050](../../../aimeServidor2/docs/documents/2026-08-03-050-meta-sources-y-fiscal.md):
**la conversión es el `POST` del documento destino** con `data.meta.sources`. Las
cuatro rutas planas `*-to-*` se retiraron y no vuelven. El cliente era el único
consumidor que faltaba.

Reglas del servidor que gobiernan lo que sigue, verificadas contra su código:

| Regla | Dónde |
|---|---|
| Sin `meta.sources` el `POST` es el CRUD de siempre | [conversion_sources.py:117-119](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L117-L119) |
| La transición se deduce del par (tipo destino, tipo fuentes) | [conversion_sources.py:64-85](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L64-L85) |
| Todas las fuentes deben ser del MISMO tipo | [conversion_sources.py:68-75](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L68-L75) |
| `idempotency_key` es obligatoria al convertir | [conversion_sources.py:123-130](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L123-L130) |
| Cada fuente aporta `source_version` y `quantity`/`amount` | [conversion_sources.py:101-111](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L101-L111) |
| Un replay devuelve `200`; una ejecución nueva `201` | [conversion_sources.py:145-157](../../../aimeServidor2/apps/purchases/views/conversion_sources.py#L145-L157) |

## Escenario 01: `data.meta` no existía en el cliente

[`baseDJA()`](../../src/app/utils/services/general.service.ts#L61) armaba
`{data:{type, attributes, relationships, id}}` y nada más. No había forma de
publicar el `meta` del **resource object**, que es justo donde viaja el contrato:
el parser del BOS lo conserva bajo `_data_meta`
([parsers.py](../../../aimeServidor2/apps/utils/parsers.py)) y el `meta` de la
raíz —lo único que conservaba la librería— el servidor no lo lee.

Se agrega como parámetro opcional
([general.service.ts:172](../../src/app/utils/services/general.service.ts#L172)) y se
propaga desde
[`saveObject()`](../../src/app/utils/services/crud.service.ts#L817). Un `meta`
ausente o vacío no se publica: sin él el payload queda byte por byte como estaba,
y un `meta` vacío convertiría el `POST` en una conversión sin fuentes.

No se saneia con `_stripNullsFromPayload`: `meta` no son atributos del modelo,
son instrucciones de la petición.

## Escenario 02: la fila retiene la versión del origen

El servidor rechaza con `source_version_conflict` una partida que cambió después
de haber sido seleccionada
([orders_to_delivery_notes_service.py:117-121](../../../aimeServidor2/apps/purchases/orders_to_delivery_notes_service.py#L117-L121)),
comparando contra `modified_at or created_at` del origen
([orders_to_delivery_notes_service.py:51-54](../../../aimeServidor2/apps/purchases/orders_to_delivery_notes_service.py#L51-L54)).

El buscador de celda ya existía y ya guardaba el UUID canónico, pero
[`_applyCellSelection()`](../../src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts#L1392)
**no hace spread del objeto seleccionado** a propósito: sus claves genéricas
(`id`, `name`) pisarían las del detalle. Así que la versión no sobrevivía.

Se copia SÓLO lo declarado, con
[`_retainSourceVersion()`](../../src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts#L1533),
y únicamente cuando la columna elegida ES la columna origen de la tabla: otra
columna buscadora de la misma fila (el producto, por ejemplo) queda intacta. La
clave sigue la convención de `<campo>__name`, y su sufijo vive en
[table-row-flags.const.ts:33](../../src/app/utils/table-row-flags.const.ts#L33) por
el mismo motivo que las banderas de fila: son tres archivos que deben coincidir
en la misma cadena y una copia divergente rompe el reconocimiento en silencio.

## Escenario 03: el contrato `sources` de la tabla

Una llave nueva en el nodo de la tabla derivada. Es lo único que distingue una
tabla de captura manual de una que además puede jalar partidas de un documento
origen; sin ella nada de este flujo corre:

```python
"no_form_data_table_derived": {
    ...
    "sources": {
        # Columna buscadora cuyo `data_type` es el recurso ORIGEN. De su celda
        # salen el `id` y el `type` de cada entrada de `data.meta.sources`.
        "column": "supplier_request_detail",
        # Columna cuya captura viaja como `meta.quantity`.
        "quantity": "requested",
        # Columna cuya captura viaja como `meta.amount` (conciliación por
        # importe: remisión → factura). Vacío cuando no aplica.
        "amount": "",
        # Atributos del origen que forman `source_version`; gana el primero con
        # valor, igual que el `modified_at or created_at` del servidor.
        "version": "modified_at,created_at",
    },
},
```

El `type` de cada fuente **no se declara aparte**: sale del `data_type` de la
columna origen, el mismo dato que ya gobierna su buscador. Una llave separada
podría divergir de él.

El motor lo lee en
[`_tableSourcesContract()`](../../src/app/utils/conversion-crud.class.ts#L75) y arma el bloque
en [`_collectConversionSources()`](../../src/app/utils/conversion-crud.class.ts#L166) y
[`_conversionMetaForCreate()`](../../src/app/utils/conversion-crud.class.ts#L214). Ningún recurso
se nombra dentro del cliente: `getAppType` sigue siendo el único punto que
resuelve `app`/`type`.

Las tablas se localizan con
[`_conversionSourceTables()`](../../src/app/utils/conversion-crud.class.ts#L150), que recorre
el draw por su cuenta en vez de apoyarse en `_parentChildTables()`: el papel
padre-hijo y la conversión son dos contratos independientes, y una tabla que
declarara `sources` sin `fields_prefixes` habría quedado sin efecto en silencio.

### Cantidad e importe viajan como texto

El servidor los lee con `Decimal(str(...))` y admite nueve decimales
([orders_to_delivery_notes_service.py:40-41](../../../aimeServidor2/apps/purchases/orders_to_delivery_notes_service.py#L40-L41)).
Un número de JavaScript perdería precisión antes de salir del cliente.

### Tres reglas que no son cosméticas

**1. No se pueden mezclar filas origen con filas manuales.** Con `meta.sources`
presente el `POST` entero se vuelve una conversión y los atributos capturados a
mano **no se materializan nunca**. Degradar a un `POST` normal crearía el
documento con las filas manuales y perdería las de origen sin avisar, así que
[`_conversionMetaForCreate()`](../../src/app/utils/conversion-crud.class.ts#L214) devuelve `abort`
y el guardado se corta.

**2. La llave de idempotencia se conserva entre reintentos.** Es lo único que
impide que un doble clic o un reenvío tras un error de red duplique el documento.
Se guarda por pos en
[`_conversionIdempotencyKey()`](../../src/app/utils/conversion-crud.class.ts#L49) y sólo se
renueva al terminar la conversión o al reabrir el formulario
([crud.class.ts:6834](../../src/app/utils/crud.class.ts#L6834)): una llave reusada
con otro payload el servidor la rechaza, y reusada con el mismo devolvería el
documento anterior en vez de crear uno.

**3. Una fila origen no se persiste sola.** Mientras se crea el documento, la
partida la materializa el servidor al ejecutar la conversión, junto con su
asignación y el control de saldo. Un `POST` suelto del detalle crearía una
partida sin asignación y sin tope, así que
[`handleTableRowSave()`](../../src/app/utils/crud.class.ts#L4337) corta antes de
guardar cuando
[`_isLocalConversionRow()`](../../src/app/utils/conversion-crud.class.ts#L71) reconoce la
fila, y publica el desenlace en positivo para que la tabla la cierre. Una fila
manual sigue delegando el guardado normal.

### El alta al crear

Hasta ahora `add_row` se apagaba mientras el padre no existiera, porque una
partida se cuelga de la ForeignKey al padre
([034 esc-02](2026-07-31-034-tabla-derivada-padre-hijo.md)). Con `sources`
declarado eso no aplica: las filas origen no se cuelgan de ninguna ForeignKey,
viajan en el mismo `POST` que crea el documento. La excepción está acotada a esa
condición en [crud.class.ts:4537](../../src/app/utils/crud.class.ts#L4537); sin
`sources` la regla anterior no cambia.

## Escenario 04: la respuesta de una conversión no es un recurso

Es `{meta:{conversion_run_id, replayed, result}}`, y el servidor **agrupa**: un
solo `POST` pudo crear varios documentos, ninguno de los cuales viaja como
resource object
([orders_to_delivery_notes_service.py:444-453](../../../aimeServidor2/apps/purchases/orders_to_delivery_notes_service.py#L444-L453)).

Aplanarla con `DJAtoObject` metería un item basura en el listado, así que
[`_finishConversionResponse()`](../../src/app/utils/conversion-crud.class.ts#L456) corta antes,
distingue el replay de la ejecución nueva y recarga el listado, que es la única
forma correcta de reflejar N documentos creados.

## Escenario 05: la fila se guarda contra el formulario ABIERTO

`handleTableRowSave()` mandaba la fila al `typeDefault` del componente. Un
componente puede alojar VARIOS formularios y conectarlos todos al mismo manejador
—`RequestComponent` lo hace con `request-detail` y `request`
([request.component.html:57](../../src/app/purchases/request/request.component.html#L57)
y [:146](../../src/app/purchases/request/request.component.html#L146))—, así que una
partida capturada en el formulario que no fuera el `typeDefault` se guardaba contra
el recurso equivocado.

Ahora el pos es el del formulario abierto, con `typeDefault` de respaldo
([crud.class.ts:4363](../../src/app/utils/crud.class.ts#L4363)). El flujo de
conversión nunca dependió de esto: ahí no sale petición.

## Escenario 06: jalar el documento origen completo

La otra mitad del buscador. En vez de resolver una partida por fila, se elige UN
documento y entran todas sus partidas con saldo. Produce filas **idénticas** a las
del buscador por partida —mismo `id`, misma versión, misma bandera de origen—, así
que de ahí en adelante corre el flujo ya probado.

No hay componente nuevo: el buscador del documento es un campo del formulario con
su `data_type`, que ya trae autocomplete, panel, `search_key` y umbral. Puede ser
autocomplete o valores fijos con un botón; eso lo decide la configuración del
campo, no el motor.

```python
"sources": {
    "column": "supplier_request_detail",
    "quantity": "requested",
    "version": "modified_at,created_at",
    # Campos del ENCABEZADO que el documento origen debe compartir.
    "match": "supplier,currency,subsidiary,warehouse",
    "document": {
        # Campo del formulario que trae el documento elegido.
        "field": "no_form_data_source_document",
        # ForeignKey de la partida hacia su documento.
        "filter": "supplier_request",
        # Saldo = primero - segundo. Con un solo campo se toma tal cual.
        "pending": "requested,delivered",
    },
},
```

El motor está en
[`pullSourceDocument()`](../../src/app/utils/conversion-crud.class.ts#L308) y
[`_appendSourceRows()`](../../src/app/utils/conversion-crud.class.ts#L353). Tres reglas:

- **Las filas se agregan, no reemplazan.** Una remisión puede recibir partidas de
  varios pedidos.
- **Una partida ya jalada no se duplica.** El servidor la rechazaría por saldo y
  el usuario no vería por qué.
- **La cantidad propuesta es el pendiente**, no lo pedido: 10 pedidas con 4 ya
  recibidas entran como 6, y una partida agotada no se ofrece.

`match` restringe el buscador del DOCUMENTO al encabezado ya capturado; ver el
escenario 09. La celda que busca una partida suelta todavía no lo hereda.

La acción se declara en la configuración como un botón `pull_sources`
([crud.class.ts:7765](../../src/app/utils/crud.class.ts#L7765)); también es un método
público que un componente puede llamar.

### `appType` no conocía los documentos de compra

Sólo tenía `request-detail`. Como `getAppType` es el único punto que resuelve
app/type y **abandona en silencio** cuando la clave no existe, ni la tabla derivada
de Pedido y Remisión cargaba sus partidas ni el buscador podía consultar nada. Se
agregaron `request`, `supplier-request`, `supplier-request-detail`, `delivery-note`
y `delivery-note-detail`
([crud.service.ts:290](../../src/app/utils/services/crud.service.ts#L290)).

## Escenario 07: la versión del origen debe viajar cruda

`DJAtoObject` formatea `created_at` y `modified_at` como texto local
(`02/08/2026 04:30:00`), que es correcto para la pantalla e **inservible** como
`source_version`: el servidor la lee con `parse_datetime()` y habría rechazado toda
conversión con `source_version_conflict`.

Afectaba a los dos caminos. Se corrige conservando el valor crudo de los atributos
declarados en `sources.version`, antes del aplanado:

- búsqueda por partida:
  [`_retainRawVersionAttributes()`](../../src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts#L1506);
- jalado del documento:
  [`_rawSourceVersion()`](../../src/app/utils/conversion-crud.class.ts#L366), que lo toma
  directamente de `resp.data[].attributes`.

El prefijo compartido vive en
[table-row-flags.const.ts](../../src/app/utils/table-row-flags.const.ts), por el mismo
motivo que las otras banderas.

## Escenario 08: el formulario emitía y nadie escuchaba

El botón «Jalar partidas» se dibujaba, registraba el clic y **no hacía nada**.
`custom-draw-form` emite `onButtonClickAction`, pero
`supplier-request.component.html` no conectaba esa salida —ni
`delegateTableSave`, ni `onTableRowSave`, ni `tableRowSaveOutcome`—, así que el
manejador de `CRUD` nunca corría.

No era un fallo del motor: era una conexión ausente en una sola plantilla. Lo
mismo impedía guardar una fila de la tabla derivada. Corregido en
[supplier-request.component.html:62](../../src/app/purchases/supplier-request/supplier-request.component.html#L62).

||| Cualquier formulario que quiera botones de configuración o captura por fila
tiene que conectar esas cuatro entradas/salidas. `request.component.html` ya lo
hacía; por eso ahí sí funcionaba.

## Escenario 09: el buscador se restringe con el encabezado

||| **Superado el 2026-08-05** por la
[055](../../../aimeServidor2/docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-01-from_field-en-el-filtro-declarativo).
La llave `sources.match` y los dos métodos que la resolvían en el formulario se
retiraron: restringir una búsqueda remota ya tenía su nodo, `data_type.filter`, y
lo único que le faltaba era tomar el valor de otro campo del formulario. Eso es
ahora `from_field`.

El razonamiento sigue vigente: una caja de búsqueda suelta abarca todos los
documentos del tenant, y ofrecer uno incompatible es ofrecer un rechazo del
servidor. Cambia dónde se declara, no por qué.

`sources` también se redujo a cinco llaves planas y los buscadores dejaron de
declararse —se reconocen por su `data_type`—, ver
[055 esc-02 y esc-03](../../../aimeServidor2/docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-02-sources-baja-de-siete-llaves-a-cinco-planas).

## Validaciones aplicadas

- `npx tsc --noEmit`: sin errores nuevos. Los cinco de
  `src/app/auth/components/biometric-setup.component.ts` son preexistentes y ese
  archivo no se tocó.
- `ng test --watch=false --browsers=ChromeHeadless`: **156 aprobadas**, con las
  mismas **55 fallas preexistentes** de scaffolding (`NG0201 ActivatedRoute`).
  Antes del cambio: 137 aprobadas y las mismas 55 fallas.
- Diecinueve pruebas nuevas: trece del flujo de conversión en
  [request.component.spec.ts](../../src/app/purchases/request/request.component.spec.ts)
  y tres de `baseDJA` en
  [general.service.spec.ts](../../src/app/utils/services/general.service.spec.ts).

## Archivos modificados

- [src/app/utils/services/general.service.ts](../../src/app/utils/services/general.service.ts#L61)
- [src/app/utils/services/crud.service.ts](../../src/app/utils/services/crud.service.ts#L817)
- [src/app/utils/table-row-flags.const.ts](../../src/app/utils/table-row-flags.const.ts#L33)
- [src/app/utils/conversion-crud.class.ts](../../src/app/utils/conversion-crud.class.ts#L23) — el motor vive aquí desde la [054](../../../aimeServidor2/docs/documents/2026-08-05-054-configuracion-por-documento.md#escenario-02-conversioncrud-descarga-a-crud)
- [src/app/utils/crud.class.ts](../../src/app/utils/crud.class.ts#L4337) — sólo los puntos de extensión
- [src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts](../../src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts#L1481)
- [src/app/purchases/request/request.component.spec.ts](../../src/app/purchases/request/request.component.spec.ts)
- [src/app/utils/services/general.service.spec.ts](../../src/app/utils/services/general.service.spec.ts)

## Pendientes

1. **Filtrar la búsqueda por partida** con el mismo `match`. El buscador de
   DOCUMENTO ya lo aplica (escenario 09); la celda que busca una partida suelta
   todavía no lo hereda.
2. ~~Convertir desde la selección del listado~~ → encolado como unidad
   transversal en
   [053](../../../aimeServidor2/docs/documents/2026-08-04-053-conversion-desde-seleccion-del-listado.md#escenario-01-qué-hace-el-botón).
3. **Pie de importes de la selección** (base imponible, impuestos, total), que en
   el sistema de referencia acompaña a la captura. Ahora es posible: la partida
   origen publica su desglose congelado en `applied_taxes`
   ([052](../../../aimeServidor2/docs/documents/2026-08-04-052-impuestos-congelados-en-json.md#escenario-01-la-foto-vive-en-un-jsonfield-no-en-una-tabla)).
   El cliente lo mostraría; el cálculo con autoridad lo sigue haciendo el servidor.
4. **`options.exchange_rates`**: el servidor lo usa como respaldo para moneda no
   local. Queda a la espera del endpoint de tipo de cambio que aún no existe.
5. **`sources` no está declarado en ninguna configuración todavía**: los
   diccionarios los escribe el usuario. Sin esa llave el comportamiento del
   cliente es idéntico al anterior.
6. Comprobación en pantalla contra datos reales.

||| El bloqueante del encabezado quedó **resuelto en el servidor** el 2026-08-04:
[051 esc-01](../../../aimeServidor2/docs/documents/2026-08-04-051-encabezado-del-documento-destino.md#escenario-01-el-encabezado-sale-del-formulario).
El `POST` de conversión ya pasa por el serializer del recurso destino, así que el
cliente NO debe neutralizar el encabezado: lo que se captura es lo que se guarda.

<!-- ]]]FI -->
