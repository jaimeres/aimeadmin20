# Soporte runtime para `child_activate` y `child_requested`

- Fecha: 2026-07-14
- Consecutivo: 030
- Tipo: Cambio funcional

## Resumen

El cliente interpreta el overlay de los hijos declarados en
`children.fields.static`, `dynamic` y `derived`, sin modificar los contratos
existentes de datos, filtros o tipos.

## Escenario 01: Estado efectivo y dependencia entre campos

Se agregó un evaluador reutilizable para las fuentes `parent`, `form`, `node`,
`selected` y `literal`, y los operadores `equals`, `not_equals`, `in`,
`not_in`, `greater_than`, `less_than`, `range`, `isnull`, `not_null`,
`icontains` e `iexact`.

`getEffectiveChildConfig()` toma el control raíz como base y aplica el child
como overlay contextual. Recalcula visibilidad, modo editable/readonly y
obligatoriedad cuando cambia el padre o un hermano declarado en una condición.
Los estados `hidden` e `inactive` deshabilitan y limpian el control, por lo que
no bloquean la validación ni aparecen en el payload. `readonly` conserva el
valor resuelto, no exige nueva captura y bloquea la interacción visual.

La semántica quedó alineada con el servidor: un bloque `activate` inactivo o sin
condiciones concluyentes conserva el estado root; `default_state` solo aplica cuando
las condiciones existen y no coinciden. `requested` solo opina cuando su condición
coincide; de lo contrario conserva el `required` root. Las comparaciones numéricas
convierten operandos antes de evaluar y `literal` usa `condition.value`.

Cuando un autocomplete no tiene un objeto seleccionado (aunque conserve texto
libre), el child no sustituye datos ni estado: se restaura la configuración y las
opciones del campo root. En una tabla derivada solo se retira la vista previa.

Las tablas respetan el mismo estado: cuando un child es readonly no permiten
alta, edición ni eliminación de filas. Los controles locales `no_form_data_`
siguen con el comportamiento ya existente: no son columnas ni payload, pero
pueden interactuar mientras estén activos y editables.
Si una tabla local queda `hidden` o `inactive`, se deshabilita sin borrar filas
confirmadas; como todo `no_form_data_`, de todos modos queda fuera del payload.

## Escenario 02: Tabla derivada de `request-detail`

Una tabla derivada distingue una fila de vista previa de las filas de detalles ya
confirmados. Al cambiar el autocomplete se reemplaza únicamente la vista previa; al
guardar, `CRUD` elimina esa vista previa, transforma la respuesta con `DJAtoObject()`
y agrega la fila persistida sin borrar detalles anteriores. Al limpiar el
autocomplete se conserva la tabla acumulada.

Las columnas faltantes se completan desde el objeto seleccionado mediante el helper
común `GeneralService.mergeConfiguredTableRow()`. Para una relación cuyo valor crudo
es el id seleccionado se usa el `option_label` de la configuración, con los mismos
fallbacks que `DJAtoObject()`. Así `base_product_data_code` y la descripción no se
reemplazan por UUID ni dependen de nombres hardcodeados de `request-detail`.

Esto permite que la tabla local de `request-detail` use los headers declarados
en su configuración y muestre `base_product_data_code` y la descripción del
producto, en lugar de una clave UUID.

Para `derived.from="server"`, si el child no repite `data_type`, se usa el
`data_type` de la tabla root. La tabla carga todas las filas devueltas (o el
`limit` configurado) y sigue aplanándolas con `DJAtoObject()`; un campo derived
escalar conserva la consulta de un solo registro.

## Escenario 03: edición local o directa en `data_type`

Cada `FormGroup` de tabla conserva como metadato local el objeto fuente, incluido el
id del registro; ese metadato no forma parte de `getRawValue()` ni del payload del
formulario. Una columna con `scope_edition: "server"` hace PATCH al recurso declarado
por la tabla en `data_type.type`; una columna `local` solo modifica el `FormArray`.

La eliminación de una fila confirmada usa el mismo `data_type`; una fila derivada de
vista previa nunca llama al servidor. Si PATCH o DELETE falla, el valor o la fila se
restaura localmente. `CRUDService.edit()` respeta el `type` recibido y `delete()`
acepta el `app` resuelto, sin cambiar sus llamadas existentes.

## Escenario 04: una sola ruta dinámica en `request-detail`

Se retiraron la tabla PrimeNG comentada y la asignación específica de `product` en
`RequestComponent`. La relación se llena desde `relationship_field` y la tabla se
renderiza exclusivamente por `app-custom-draw-form`; `request-detail` solo conserva
su ajuste propio de autofocus. También se eliminaron los bloques históricos
comentados de children en `onChangeDropdown()` y `onSelectAutoComplete()`.

Con ello no quedan dos implementaciones activas o comentadas compitiendo por el
autocomplete, el overlay de hijos o la tabla de detalles.

## Escenario 05: actualización visual inmediata de la tabla

La grabación de validación mostró que el `FormArray` sí recibía el producto
seleccionado, pero la tabla permanecía vacía hasta el siguiente clic. La causa era
que `dynamic-table-field` usa `ChangeDetectionStrategy.OnPush` y la tabla derivada
terminaba su mutación con `emitEvent: false`.

El componente de tabla ahora observa el `valueChanges` de su propio `FormArray` y
se marca para revisión cuando una fuente externa cambia sus filas. El reemplazo de
la vista previa emite una sola vez al terminar, evitando eventos por cada operación
intermedia y mostrando el producto inmediatamente después del `onSelect`.

Al preparar esa vista previa también se combinan el objeto seleccionado y los
valores actuales del formulario. Así una columna puede usar el valor de un hermano
derivado previamente —por ejemplo `price` obtenido desde `purchase_price`— sin
aliases específicos de producto dentro del cliente.

La caché de módulos se avanzó a `bos_config_module_v3` para que la siguiente carga
descarte el contrato anterior de `request-detail` y solicite al servidor los nuevos
hijos configurados.

## Decisiones

- Se preservan `children.fields.*`, `filter.scope`, `edit` y `data_type`.
- `filter.scope` es la única fuente que decide dónde se resuelve el child; el
  `scope` legado dentro de condiciones no se usa.
- No se reimplementó la exclusión existente de `no_form_data_` en columnas y
  payload; el cambio solo consume ese control local en el runtime.
- Un child con `edit: false` queda en modo readonly aunque la fuente sea local.
- No se hardcodearon campos de producto ni de `request-detail`: columnas,
  `relationship_field`, `option_label`, `scope_edition` y recurso salen de la
  configuración.

## Validaciones aplicadas

- `npx tsc --noEmit -p tsconfig.app.json`.
- `npm run build`: completado; conserva advertencias preexistentes de presupuesto,
  dependencias CommonJS y `/layout/styles/preloading.css`.
- Contrato del servidor: `28 passed` en
  `apps/utils/tests/test_child_runtime_overlay.py` usando el entorno compartido.
- Specs agregados para condiciones, estados, tabla derivada acumulativa, merge
  configurable de filas y `scope_edition`.
- Los tres archivos de spec modificados compilan de forma aislada con TypeScript.
- El runner de Karma no alcanzó a ejecutar esos specs porque la compilación global
  falla antes: faltan seis archivos Roboto referidos por `src/assets/styles.scss` y
  `testing/crud-test.helpers` importado por specs ajenos a este cambio.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.spec.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/general.service.spec.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/services/crud.service.ts`
- `src/app/purchases/request/request.component.ts`
- `src/app/purchases/request/request.component.html`

## Pendientes

- Validar visualmente en navegador el flujo de alta de `request-detail` contra
  una respuesta real de producto.
