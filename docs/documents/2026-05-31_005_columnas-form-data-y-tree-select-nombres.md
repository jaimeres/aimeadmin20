# Columnas de form_data y nombres en relaciones tree-select/M2M no tipadas

- **Fecha:** 2026-05-31
- **Consecutivo:** 005
- **Tipo:** Cambio funcional

## Resumen de lo pedido

Que los campos provenientes de la configuración de `form_fields` / `child_form_fields`
(persistidos en `form_data` / `parent_form_data`) se muestren con su valor en las
columnas de la tabla, reutilizando los ciclos existentes de `DJAtoObject`
(`general.service`) en lugar de añadir más complejidad o latencia. Además, que los
campos relacionales tipo `tree-select` con nodo tree (ejemplo `responsible_persons`)
muestren los nombres separados por coma —igual que `requesters`— en vez de los UUID.

Ejemplos enfocados en `http://localhost:4201/assets/maintenance?pos=maintenance`.

## Alcance del cambio

- `src/app/utils/crud.class.ts` → `generateJSONColumns`.
- `src/app/utils/services/general.service.ts` → `DJAtoObject` + helper `_formatDynamicValue`.

## Diagnóstico previo (datos reales)

- En el OPTIONS, `responsible_persons`, `responsible_customers` y
  `responsible_suppliers` llegan como `type: 'GenericField'` con
  `relationship_type: 'ManyToMany'`. Por eso `generateJSONColumns` caía en el `else`
  por defecto y generaba la columna con el campo crudo (`responsible_persons`),
  mostrando el arreglo de UUID. En cambio `requesters` es `type: 'Relationship'` y ya
  generaba `requesters__name`.
- Las columnas `form_data.form_fields_data_*` ya se generaban (encabezado correcto),
  pero la celda quedaba vacía porque el valor real vive anidado en
  `form_data: { form_fields_data_region: { id, code, name }, ... }` y la tabla lee
  `rowData['form_data.form_fields_data_region']` (clave plana, sin resolución anidada).
- El `include` por defecto de maintenance era `asset,workshop,status,requesters`
  (sin `responsible_persons`), por lo que aunque se resolviera el nombre, el servidor
  no devolvía los objetos en `included`.

## Escenario 01: Columnas `__name` para relaciones M2M no tipadas como `Relationship`

En `generateJSONColumns`, antes del `else` por defecto, se agrega una rama para
`relationship_type` `ManyToMany` / `ManyToOne` / `OneToOne`. Estas columnas usan
`<field>__name`. Beneficio adicional: `iniParam` construye el `include` a partir de
las columnas terminadas en `__name`, por lo que la relación se agrega
automáticamente al `include` (igual que `requesters`) y el servidor devuelve los
objetos en `included`.

## Escenario 02: Nombres unidos por coma para `tree-select` en `DJAtoObject`

En el bloque M2M de `DJAtoObject`, la rama que concatena nombres antes solo se
activaba con `cols.multiple.active === true`. Ahora también se activa cuando el campo
es `tree-select` (`isTreeSel`), uniendo los nombres con el separador
(`cols.multiple.separator ?? ','`). Resultado: `responsible_persons` muestra
`"ADRIAN CABALLERO HERNANDEZ,ADAN LUIS PEREZ DOMINGUEZ,..."` en lugar de UUID.

## Escenario 03: Aplanado de `form_data` / `parent_form_data` en `DJAtoObject`

Reutilizando el mismo ciclo registro por registro de `DJAtoObject`, se aplanan
`form_data` y `parent_form_data` hacia claves planas `form_data.<campo>` /
`parent_form_data.<campo>` (el mismo `col.field` que genera `generateJSONColumns`).
El valor se formatea con el nuevo helper `_formatDynamicValue`, que usa el
`option_label` del campo (uniendo varias claves si vienen separadas por coma) y, si el
objeto persistido no expone esas claves, hace fallback a
`name/display_name/label/value/code/id`. Soporta objeto, primitivo y arreglo.

<a id="escenario-04"></a>
## Escenario 04: Solicitar `form_data` solo cuando hay columnas `form_fields_data_*`

Se corrigio `iniParam()` para que, cuando las columnas seleccionadas incluyen
`form_data.form_fields_data_*` o un campo `form_fields_data_*`, la consulta GET pida
el atributo raiz `form_data`.

La API no entrega automaticamente el diccionario `form_data` si no viene en `fields`.
Por eso las columnas dinamicas podian existir en la tabla, pero las celdas quedaban
vacias en recargas/listados aunque el detalle del registro en servidor si tuviera
`attributes.form_data`.

La regla queda limitada: `form_data` solo se agrega cuando alguna columna seleccionada
lo necesita. Si no hay columnas `form_fields_data_*`, no se pide `form_data`.

<a id="escenario-05"></a>
## Escenario 05: Evitar columnas duplicadas por label o campo

Se ajusto el bloque que agrega columnas `form_fields_data_*` desde `drawForm` para
no insertar una columna dinamica si ya existe una columna con el mismo `field` o con
el mismo encabezado visible.

Esto evita duplicados como "Tipo de falla", "Componente", "Cluster" o "Region"
cuando el schema principal ya genero una columna equivalente y el `drawForm` tambien
declara un campo dinamico con el mismo label.

<a id="escenario-06"></a>
## Escenario 06: Preservar contrato de relaciones no-M2M

Se agrego `relationship_type` al registro interno de relaciones construido desde
OPTIONS y se normaliza en `validateRelationships()`.

Si una relacion es `ManyToOne` u `OneToOne`, su `id` se fuerza a valor escalar/null
aunque el control del formulario llegue como arreglo. Esto evita que `baseDJA()`
interprete accidentalmente relaciones como `asset` como M2M y envie
`relationships.asset.data` como lista, cuando el backend espera un resource identifier
object.

<a id="escenario-07"></a>
## Escenario 07: Extraer id desde TreeNode en tree-select sin nodo tree

Los campos `tree-select` sin configuracion `tree` tambien usan `TreeNode` internamente
porque PrimeNG no expone `optionValue` como `listbox`. En ese caso el id seleccionado
queda en `node.data.id`, no en `node.id`.

Se ajusta `validateRelationships()` para que, cuando un `tree-select` entregue un
arreglo de nodos, la relacion envie una lista de ids extraidos de `data.id`, `id`,
`value` o `key`. Esto evita payloads JSON:API incompletos como `{ type: "person" }`
sin `id`.

<a id="escenario-08"></a>
## Escenario 08: Centralizar registro de campos con zona horaria

Se centralizo en `CRUD.initializeTimeZoneField()` la inicializacion de
`this.timeZone[pos]` y la insercion sin duplicados de campos de fecha/hora.

La funcion se reutiliza al generar columnas desde OPTIONS, al generar formularios
desde OPTIONS y al procesar campos dinamicos declarados en `drawForm`, incluyendo
columnas `form_fields_data_*`. El objetivo es conservar la misma regla previa de
deduplicacion con `searchByValue(..., false)` sin repetir el bloque manual en cada
generador.

<a id="escenario-09"></a>
## Escenario 09: Labels de booleanos en options y campos dinamicos

Se ajusto `DJAtoObject` para que los booleanos no queden vacios en tabla cuando no
existe etiqueta en `customField` o cuando el valor viene en formato no estricto.

Cobertura aplicada:

- Campos booleanos de OPTIONS (`fieldsBool`):
  - Se centraliza el registro en `CRUD.initializeBooleanField()` (mismo patron
    de inicializacion/deduplicacion que `initializeTimeZoneField`).
  - `generateJSONColumns` guarda en `fieldsBool[pos]` las etiquetas booleanas de
    configuracion (`label_true` / `label_false`) tomadas primero del `OPTIONS`
    del campo y, si faltan, de `fieldsForm(pos)[field]`.
  - Prioriza `label_true` / `label_false` en la definicion del campo.
  - Si no existen, usa fallback local `customField[<campo>_true]` /
    `customField[<campo>_false]`.
  - Si tampoco existen, usa fallback final `'true'` / `'false'`.
  - Normaliza valores booleanos en formatos `true/false`, `'true'/'false'`,
    `1/0`, `'1'/'0'`.

- Campos booleanos dinamicos (`form_data.*` / `parent_form_data.*`):
  - Antes de `_formatDynamicValue`, detecta booleanos y aplica la misma prioridad
    de labels (`fieldCfg.label_*` -> `customField` -> fallback literal).
  - Esto evita celdas vacias cuando la tabla evalua valores falsy en columnas
    dinamicas.

<a id="escenario-10"></a>
## Escenario 10: Defaults de fecha en alta y reset

Se ajusta la prioridad de fechas configuradas en formularios creados desde
OPTIONS y campos dinamicos. En campos de OPTIONS, OPTIONS solo aporta el `type`;
la regla de `default.value` sale de `fieldsForm(pos)`:

- `default.value: 'current'` deja el control en `null` y no acepta el `initial`
  entregado por OPTIONS.
- `default.value: 'device'` inicializa con `new Date()` y se recalcula en cada
  `resetFormDialog()` cuando el campo no venga explicitamente en `selected`.
- Si `default.value` trae una fecha definida por configuracion, se normaliza como
  fecha UTC (`new Date(<valor>Z)` cuando el string no trae zona horaria).
- Si la configuracion no trae default de fecha aplicable, se toma `initial` y se
  normaliza a `Date` con `new Date(...)`.
- `DJAtoObject` / `general.service` no participan en este escenario; el cambio se
  limita a la creacion y reset del formulario.

Decision de compatibilidad autorizada: antes un `DateTime` de OPTIONS podia
conservar `initial` aunque la configuracion declarara `default.value='current'`.
Con este cambio, `current` prevalece y fuerza `null`; `device` pasa a ser el
modo que usa la hora UTC actual del dispositivo en cada reset de alta.

<a id="escenario-11"></a>
## Escenario 11: Filtros de columnas con campos explicitos de relaciones

Se amplio el procesamiento de `cols.filter` para soportar dos formas coherentes:

- Forma simple: `{ active, default, default_value, ops }` sigue filtrando contra el
  campo contenedor. Ejemplo: `fields.is_active.cols.filter` genera
  `filter[is_active]=true`.
- Forma explicita: `{ <campo_relativo>: FilterEntry, logic? }` permite declarar
  campos internos de la relacion contenida por la columna. El campo contenedor se
  toma como la relacion real: `status.cols.filter.code` genera
  `filter[status__code.in]=P`. En el primer nivel no se usa `_data_`; si el campo
  interno salta a otra relacion, desde ahi si se usa `_data_`, por ejemplo
  `status.cols.filter.code_data_titulo` genera `filter[status__code__titulo]=algo`.

`data_type.filter` conserva su comportamiento de mapa explicito absoluto dentro
del recurso indicado por `data_type.type`; no antepone el nombre del campo
contenedor porque la fuente (`type: "status"`, por ejemplo) puede ser distinta al
nombre local del campo. `logic` se acepta en ambas formas como metadato y se ignora
en el serializador actual, manteniendo el comportamiento AND existente de los query
params enviados al backend.

El editor `app-custom-local-settings` ahora expande un `cols.filter` explicito en
filas independientes por campo remoto y guarda cada entrada sin pisar filtros
hermanos. El flujo `app-task-detail` monta tambien `app-custom-local-settings` y
abre la configuracion desde el icono del dialogo para que este soporte este
disponible en la tarea detalle.

## Decisiones tomadas

- No se agregan columnas para campos de `form_data` que no existan en la
  configuración (`form_fields`/`child_form_fields`); las columnas siguen siendo
  dirigidas por configuración. El aplanado solo rellena datos.
- Se mantiene el conteo (`{e} elemento(s)`) para `multi-select` sin
  `cols.multiple.active`; el cambio de unión por coma se limita a `tree-select` para
  no alterar el comportamiento existente de otros campos.
- No se modificó configuración ni `include` de forma manual: el `include` se ajusta
  solo por el cambio de campo de columna a `__name`.
- No se pide `form_data` siempre; `iniParam()` lo agrega a `fields` solo si alguna
  columna seleccionada usa `form_fields_data_*`.
- La deduplicacion se limita al momento de agregar columnas dinamicas
  `form_fields_data_*`; no cambia `DJAtoObject` ni la generacion base de columnas.
- Solo `ManyToMany` conserva arreglos en `relationships`; `ManyToOne` y `OneToOne`
  se normalizan a valor escalar antes de construir JSON:API.
- En `tree-select` sin `tree`, el valor visual puede seguir siendo `TreeNode`, pero
  la relacion enviada se reduce a ids antes de pasar por `baseDJA`.
- La centralizacion de `timeZone` no cambia el `field` de columnas dinamicas
  existentes; solo reutiliza el registro de campos para evitar duplicados.
- Para booleanos, cuando no hay etiquetas configuradas, el sistema ahora usa
  fallback explicito `'true'` / `'false'` para evitar celdas vacias.
- En fechas, `selected` conserva prioridad sobre `device`: si un registro editado
  trae el campo en `selected`, `resetFormDialog(selected)` no lo pisa con la hora
  actual.
- En `cols.filter`, el campo contenedor si participa en el path porque representa
  la relacion real de la columna. Por eso `status + code` se serializa como
  `status__code`, no como `code`.
- En `data_type.filter`, el campo contenedor no participa en el path porque la
  fuente real sale de `data_type.type` y puede no coincidir con el nombre local del
  campo.
- El formato simple de `cols.filter` no se considera obsoleto: se mantiene como la
  forma correcta para campos directos. Si el campo no es relacional, basta el filtro
  simple. Si el campo es relacional, puede agregar campos dentro de `filter`; esos
  campos se serializan despues del contenedor con `__`.
- No se implementa semantica OR para `logic`; queda preservado como metadato hasta
  que exista contrato de backend para combinar filtros de otra forma.

## Validaciones aplicadas

- En `/assets/maintenance?pos=maintenance` (261 registros):
  - `form_data.form_fields_data_region` → `"NORESTE"`, `_cluster` → `"N1"`,
    `_componente` → `"Cabina"` (antes vacío).
  - `responsible_persons__name` → nombres unidos por coma (antes UUID).
  - `include` resultante incluye `responsible_persons`.
  - Columnas visibles incluyen `responsible_persons__name` y las 4
    `form_data.form_fields_data_*`.
- Para el escenario 08 se reviso por busqueda que el bloque manual de
  inicializacion de `timeZone` quedara reemplazado por el helper centralizado en
  `crud.class.ts`.
- Para el escenario 09 se valido que booleanos en OPTIONS y en `form_data.*`
  muestren texto aun cuando no exista `customField[<campo>_true/_false]`.
- Para el escenario 10 se reviso por codigo que OPTIONS y campos dinamicos usen
  la configuracion para `default.value`, que valores de fecha definidos se
  conviertan como UTC, que `device` se registre para refrescarse en reset y que
  `selected` preserve campos enviados explicitamente.
- Para el escenario 11 se agregaron specs de `CRUDService` para confirmar que:
  - `cols.filter` simple sigue generando `filter[is_active]=true`.
  - `cols.filter` explicito antepone el campo contenedor:
    `status.filter.code` genera `filter[status__code.in]=P`.
  - `cols.filter` explicito normaliza saltos anidados con `_data_`:
    `status.filter.code_data_titulo` genera `filter[status__code__titulo]=algo`.
  - `data_type.filter` conserva el contrato de mapa explicito.

## Archivos modificados

- `src/app/utils/crud.class.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/crud.service.ts`
- `src/app/utils/services/crud.service.spec.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.html`
- `src/app/tasks/task-detail/task-detail.component.ts`
- `src/app/tasks/task-detail/task-detail.component.html`
- `docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md`

## Pruebas sugeridas

- Verificar registros con `parent_form_data` (flujo hijo) para confirmar el aplanado
  `parent_form_data.<campo>`.
- Verificar campos `form_data` con valor primitivo o arreglo de objetos.
- Verificar un campo `DateTime` de OPTIONS y un campo dinamico `date` para confirmar
  que no se duplican entradas en `timeZone[pos]`.
- Verificar alta con `default.value='current'`, alta con `device`, reset sin
  `selected` y edicion con `selected` que ya trae fecha.
- Verificar desde la UI de configuracion local una columna con `cols.filter`
  explicito y confirmar que guardar no elimina filtros hermanos ni cambia filtros
  simples existentes.
