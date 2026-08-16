# 2026-05-16 · 001 · Consolidación dropdown_types y fix Escenarios 1/2

## Prompt original (resumen literal)
- "quita la logica duplicada crud.class genera el formulario y custom-draw-form.component inicializa los campos especiales"
- "para escenario 2 ... el id de files lo debes enviar como una relacion valida [{id, type}]"
- "para el escenario 2 en la actualizacióin siempre debe enviar id, por ejemplo maintenance_document_data_id"
- "con la nueva logica, tambien falla la creación, esta mandando base64 (imagen) en files y debe ser docuemnts"
- "document lanza error porque en if (fieldData.type === 'files') quitaste el valor por defecto"

## Escenarios
1. **Consolidar `DROPDOWN_TYPES`** en `src/app/utils/dropdown-types.const.ts`. Eliminar las 3 copias locales (1 en `custom-draw-form.component.ts`, 2 en `crud.class.ts`).
2. **Registrar `*_files` (Escenario 2) como relationship JSON:API** en `addFieldsByPrefix` para que `validateRelationships` + `baseDJA` formatee a `[{id, type}]`. Tipo resuelto vía `crudS.getAppType('file').type` o sobrescribible por `fieldData.relationship_resource`.
3. **`_loadChildPrefixData`**: leer `resp.data[i].relationships.files.data` directamente (ya viene como `{id, type}` JSON:API). Setear bare IDs en `*_files`. Capturar también el `id` del hijo en `selected[0][prefix + 'id']` para PATCH.
4. **`submitForm` PATCH**: incluir `formData[prefix + 'id']` desde `selected()[0][prefix + 'id']` para cada prefijo `kind:'child'`.
5. **`appendFile` (custom-draw-form)**: invertir ruteo. Si `payload.fieldConfig?.key` existe y es distinto de `payload.field`, el base64 va al control `key` (= `{prefix}documents`); NO se toca el control `field` (= `{prefix}files`).

## Escenario 06: Parche temporal en save/saveObject para omitir nulls en creación

- **Objetivo:** evitar que atributos `null` lleguen al POST mientras se identifica la causa raíz del flujo que nulifica controles ya inicializados.
- **Alcance temporal:** solo borde de alta en `CRUDService.save()` y `CRUDService.saveObject()`.
- **Implementación:** saneamiento recursivo de `formData` antes de llamar a `baseDJA`, eliminando claves con `null` o `undefined` y filtrando elementos nulos dentro de arrays.
- **Decisión:** no tocar `edit()` en este parche temporal para mantener el cambio acotado al síntoma reportado en creación.
- **Refuerzo posterior:** se añadió el mismo saneamiento en `GeneralService.baseDJA()` / `baseDJAFormData()` como barrera final de serialización y se neutralizó la conversión `[] -> null` de `*_documents` en `submitForm`.
- **Corrección posterior:** se agregó detección de referencias circulares en los saneadores recursivos para evitar `InternalError: too much recursion` cuando el payload contiene grafos con ciclos.

## Escenario 07: Fix mínimo para `tree-select` lazy en hidratación de edición y serialización

- **Objetivo:** corregir el bug del campo dinámico `type: "tree-select"` con `tree.lazy = true` sin refactorización amplia, manteniendo intactos otros dropdowns, multiselects y campos no relacionados.
- **Causa raíz exacta:** el control de PrimeNG en `checkbox` trabaja con un array de nodos seleccionados comparados por `key` y mostrados por `label`, pero `resetFormDialog()` estaba rehidratando edición como objetos planos `{ key, id, label }`, perdiendo `data`, `parent` y la relación rica original (`meta`, `source`). Luego `validateRelationships()` y `_serializeTreeSelection()` sólo sabían serializar nodos vivos de PrimeNG, por lo que la edición sin tocar reenviaba vacío y la edición visual no restauraba correctamente el contrato del componente.
- **Confirmación de contrato PrimeNG 20.3.0:** `TreeSelect.writeControlValue(value)` guarda el valor tal cual; el render de chips usa `value.map((node) => node.label)` y la restauración visual compara por `selectedNode.key === node.key`. Por tanto, el `FormControl` en `checkbox` debe contener un array de nodos/objetos con `key` y `label`.
- **Shape real actual antes del fix:**
	- **Creación:** el `FormControl` recibe el array vivo emitido por `p-treeSelect`.
	- **Edición:** `resetFormDialog()` lo convertía manualmente a `{ key, id, label }` usando `selected[field]` + `included`, ignorando `field__array` y la `meta` real.
- **Cambio aplicado:**
	- `resetFormDialog()` ahora rehidrata tree-selects usando `field__array` + `included` para reconstruir el shape esperado por PrimeNG y conservar una copia serializada genérica para reenvío.
	- `_serializeTreeSelection()` ahora acepta tanto nodos vivos del árbol como valores rehidratados/preservados de edición, normalizando `meta` aunque el backend la entregue como array y promoviendo `tree.serialization.extra` (ej. `source`) al formato de salida esperado.
	- Ajuste visual complementario: la rehidratación ahora resuelve el label visible con la misma prioridad del árbol vivo (`tree.root.label_field` / `tree.levels[].label_field` antes de `option_label`) para evitar chips de edición con `nombre + id` cuando `option_label` es compuesto.
- **Efecto esperado por caso:**
	- **Creación:** guarda relaciones ricas según `tree.serialization`.
	- **Edición visual:** el control colapsado muestra labels y, al cargar/expandir nodos lazy, la comparación por `key` permite marcar las hojas correctas.
	- **Edición guardado:** si no se toca el campo, se reenvía la relación ya serializada con `meta`; si se modifica, se serializa a partir de los nodos vivos seleccionados.

<a id="escenario-08"></a>
## Escenario 08: Normalizar valores de `tree-select` y FormArray de clasificadores

- **Objetivo:** corregir los errores de consola `Cannot find control with name: 'classifiers'` y `value.map is not a function` en `p-treeSelect`.
- **Causa raíz:** el tab de clasificadores usa `formArrayName="classifiers"`, pero algunos formularios no garantizaban ese `FormArray`. Además, `p-treeSelect` en `selectionMode="checkbox"` ejecuta `value.map(...)`; si el control llega como `null`, string, id suelto u objeto, PrimeNG falla al renderizar chips.
- **Cambio aplicado:**
	- `CRUD.generateJSONform()` garantiza que `classifiers` exista como `FormArray`, preservando valores iniciales si el servidor entregó una relación previa.
	- `CRUD.addFieldsByPrefix()` inicializa `tree-select` y `multi-select` dinámicos con arreglo (`[]` o `[valor]`) en lugar de valores escalares.
	- `CustomDrawFormComponent` normaliza controles `tree-select` y `multi-select` a arreglo cuando cambia el `FormGroup`, el `drawForm` o se restaura caché.
	- `CrudPageShellComponent` evita renderizar el panel de clasificadores si el formulario parcial aún no tiene el control.
- **Validación esperada:** abrir formularios con campos `tree-select` vacíos o restaurados no debe disparar `value.map is not a function`; abrir el tab de clasificadores no debe disparar `Cannot find control with name: 'classifiers'`.

<a id="escenario-09"></a>
## Escenario 09: Nuevo tipo `multi-choice` con opciones locales del formulario

- **Fecha de ajuste:** 2026-06-13.
- **Objetivo:** agregar un tipo `multi-choice` visualmente equivalente a `multi-select`, pero alimentado por opciones locales declaradas en el formulario (`options` o `data_type.options`) y por las opciones que `generateJSONform()` guarda en `sharedS.data` para campos `Choice`/`List`.
- **Decisión de carga:** `multi-choice` entra en `DROPDOWN_TYPES_PAYLOAD` y `DROPDOWN_TYPES_PRELOAD` para reutilizar `object_<field>`, normalización, espejo de valores y precarga; sin embargo, `DynamicDropdownDataService.canRequestServer()` devuelve `false` para este tipo, de modo que nunca consulta catálogo remoto aunque exista `data_type.type`.
- **Render:** `custom-draw-form` usa el template existente de `multi-select` y agrega fallback directo a `data_type.options`/`options` mientras se llena `dropdownOptionsSignal`.
- **Valores:** se normaliza como arreglo igual que `multi-select` en `CRUD.addFieldsByPrefix()`, `CustomDrawFormComponent` y defaults de columnas/tablas.
- **Inicialización de `List`:** cuando OPTIONS devuelve `initial: "<class 'list'>"`, `CRUD.generateJSONform()` lo trata como lista vacía (`[]`) para evitar chips vacíos; si un `List` con `child.type: "Choice"` llega como valor simple real, por ejemplo `"LU"`, se conserva como arreglo de una selección (`["LU"]`).
- **Recarga manual:** si se fuerza recarga en `multi-choice`, el componente vuelve a leer opciones locales/shared sin vaciar el control por no tener servidor.
- **Editor local:** se agrega schema avanzado propio para configurar opciones locales JSON, `option_value`, `option_label`, filtro local y `selection_limit`, evitando sugerir un recurso remoto.

<a id="escenario-10"></a>
## Escenario 10: Evitar carga de clasificadores con módulo indefinido

- **Fecha de ajuste:** 2026-06-13.
- **Objetivo:** corregir la request móvil a `classifiers/classifier` que salía con `filter[classifier_level.classifier_type]=undefined` y provocaba `400 invalid_choice`.
- **Causa raíz:** después de garantizar el `FormArray` `classifiers`, algunos formularios sin módulo de clasificadores entraban a `classifierLevelsDropdown()` y armaban el filtro con `this.module[pos]` indefinido.
- **Cambio aplicado:** `classifierLevelsDropdown()` resuelve el módulo desde `this.module[pos]` con respaldo a `this.module[this.typeDefault]`; si el resultado sigue vacío, `undefined` o `null`, restaura el formulario y no consulta el endpoint.
- **Compatibilidad:** los módulos que sí declaran `this.module[...]` conservan la carga normal de clasificadores; la corrección solo evita enviar filtros inválidos al backend.
- **Referencia:** en el commit `706972f372c422d292d56bc5f3b88f28f40eae43` no fallaba porque el flujo no forzaba la carga de clasificadores en estos formularios sin módulo.

<a id="escenario-11"></a>
## Escenario 11: Respetar `read_only` en Boolean/toggle-button del OPTIONS

- **Fecha de ajuste:** 2026-06-14.
- **Objetivo:** asegurar que campos booleanos como `sys` lleguen solo lectura cuando el OPTIONS del servidor entrega `read_only: true`.
- **Causa raíz:** `CRUD.generateJSONform()` agregaba el campo a `initialDisabledForm`, pero creaba el `FormControl` con `disabled: false`. En componentes como `p-toggleButton`, el control nacía interactivo y podía ignorar el estado de solo lectura inicial.
- **Cambio aplicado:** se calcula `disabled` desde `fieldObj.read_only === true`, se registra en `initialDisabledForm` usando el nombre real del control (`field_prefix + field`) y el `FormControl` se crea ya deshabilitado.
- **Validación esperada:** un schema como `sys: { type: "Boolean", read_only: true, initial: false }` debe renderizarse como toggle deshabilitado y mantenerse deshabilitado al reactivar el formulario.

<a id="escenario-12"></a>
## Escenario 12: Estado inválido visual para `p-splitbutton` de archivos

- **Fecha de ajuste:** 2026-06-22.
- **Objetivo:** hacer que el `p-splitbutton` de campos `type: "files"` simule un control de formulario y pinte borde rojo cuando el archivo requerido queda inválido.
- **Alcance:** solo feedback visual; no cambia validadores, routing de `appendFile`, carga servidor, serialización JSON:API ni valores guardados.
- **Implementación:** `custom-draw-form` prepara un `signal` de estado visual por configuración de archivo. La plantilla solo consulta ese estado por clave; no llama funciones nuevas desde el HTML. La clave visual prioriza el control específico (`key` cuando es distinto o el `field` separado) y solo cae al sibling `*_documents` cuando no existe un control específico, evitando que dos evidencias que comparten `documents` se marquen entre sí.
- **Errores cubiertos:** se refleja el estado local `invalid && (dirty || touched)` y, de forma visual sin mutar controles ni validadores, los errores de servidor que llegan con `source.pointer`/`source.parameter` hacia `files`, `documents` o sus campos prefijados.
- **Compatibilidad:** se preserva la reconciliación previa entre cámara, servidor y `key`; el botón solo refleja el estado que el formulario ya calculó.

<a id="escenario-13"></a>
## Escenario 13: Acotar espejo `object_` a campos dinamicos

- **Fecha de ajuste:** 2026-07-09.
- **Objetivo:** evitar que dropdowns de prefijos anidados de modelo, por ejemplo `request_data_request_type`, envien un objeto `{id, name}` en el campo real y el valor simple en `object_*`.
- **Cambio aplicado:** `CRUD._applyDynamicFieldToForm()` solo crea la dualidad `object_<field>` / `<field>` para `form_fields_data_*` y `parent_form_data_*`. Los prefijos anidados como `request_data_*` o relaciones `*_data_*` conservan el campo canonico y envian el valor simple.
- **Compatibilidad:** se conserva el payload rico de campos dinamicos; no se cambia el comportamiento de campos del modelo principal como `priority`.

<a id="escenario-14"></a>
## Escenario 14: Conservar `type` en relaciones prefijadas `_data_`

- **Fecha de ajuste:** 2026-07-09.
- **Objetivo:** evitar que relaciones prefijadas como `request_data_subsidiary` se serialicen como `{ id }` sin `type`.
- **Cambio aplicado:** `CRUD.validateRelationships()` completa `element.type` cuando falta usando `relationship_resource` o `data_type.type` resuelto via `crudS.getAppType(...)`, igual que la carga de dropdowns.
- **Compatibilidad:** no cambia ids, campos, payload de atributos, validadores ni el comportamiento object/scalar de dropdowns; solo rellena el `type` ausente antes de `baseDJA()`.

<a id="escenario-15"></a>
## Escenario 15: Auto-complete libre o relacion por configuracion

- **Fecha de ajuste:** 2026-07-10.
- **Objetivo:** permitir que `auto-complete` sea generico y pueda guardar texto libre o llenar una relacion por configuracion.
- **Contrato:** el campo usa `free_or_relationship: true` o `save_mode: "free_or_relationship"` y declara `relationship_field`, por ejemplo `"product"`. El `id` sale del objeto seleccionado y el `type` lo resuelve la relacion configurada en `fields.product.data_type`.
- **Cambio aplicado:** `custom-draw-form` sincroniza `relationship_field` al seleccionar una sugerencia y procesa `children.*` con el objeto seleccionado. `CRUD` sincroniza la relacion antes de validar y convierte el atributo visible a texto antes de `baseDJA()`.
- **Compatibilidad:** `RequestComponent` conserva el respaldo especifico que llena `product` al seleccionar producto, para no romper solicitudes mientras el diccionario del servidor publica `relationship_field`. No se aplica a `form_fields_data_*`, `parent_form_data_*`, `child_form_fields*` ni `form_fields*`; esos campos conservan su payload rico. No se agrega fallback temporal de configuracion vieja: `option_label` debe apuntar al campo principal de la sugerencia (`name`, `code`, etc.) y los extras de relaciones incluidas se declaran como `relacion_data_campo`.

<a id="escenario-16"></a>
## Escenario 16: Panel autocomplete desde `include` sin aplanar `GeneralService`

- **Fecha de ajuste:** 2026-07-12.
- **Objetivo:** hacer que el panel de `auto-complete` pueda pintar relaciones incluidas desde `include`, sin depender de `fields_included_relationships` y sin cambiar el contrato general de `GeneralService.DJAtoObject()`.
- **Cambio aplicado:** `GeneralService.DJAtoObject()` conserva el comportamiento estandar: relacion plana como id y display en `relacion__name`. `custom-draw-form` prepara solo las sugerencias de autocomplete: si el panel pide una relacion como `base_product`, la pinta con `base_product__name`; si pide un campo adicional como `base_product_data_code`, lo toma del `included` solicitado por `include`. El texto visible y el objeto seleccionado siguen separados con `__autocomplete_object_<field>`, y `CRUD` usa ese objeto interno para serializar la relacion sin enviar el objeto al payload.
- **Decisión:** `fields_included_relationships` queda fuera del flujo nuevo. `option_label` debe apuntar al campo principal de la sugerencia (`name`, `code`, etc.); los campos `relacion_data_campo` quedan reservados para extras declarados por panel/children.

<a id="escenario-17"></a>
## Escenario 17: `no_form_data_` como estado local de formulario

- **Fecha de ajuste:** 2026-07-13.
- **Objetivo:** permitir campos locales del drawForm, especialmente tablas, que se pintan y se actualizan en cliente pero no viajan al payload JSON:API.
- **Contrato:** los campos cuyo nombre canonico inicia con `no_form_data_` u `object_no_form_data_` se agregan al formulario cuando el renderer los necesita, se excluyen de columnas/parametros de listado y se eliminan antes de `saveObject()`/`edit()`. Una tabla `no_form_data_*` usa `FormArray` solo como estado visual de `dynamic-table-field`.
- **Cambio aplicado:** `CRUD` hidrata nodos `no_form_data_*` del draw desde `fields` cuando el draw trae solo `{field}`, para que `app-custom-draw-form` vea `type`, `class` y `columns`. `handleButtonClick(action="save")` guarda el detalle en backend, transforma la respuesta con `DJAtoObject()`, completa exclusivamente las columnas configuradas desde el objeto seleccionado del autocomplete y actualiza la tabla local antes de ejecutar `fields_reset_form`. La fila derivada se considera vista previa; al confirmar el POST se reemplaza por la fila persistida y las filas confirmadas anteriores se conservan. El encabezado del formulario queda intacto porque el guardado usa `hide:false` y `reset:false`.
- **Compatibilidad:** no cambia el contrato de `form_fields_data_*`, `parent_form_data_*`, `child_form_fields*` ni relaciones normales. Se elimina el hook temporal `RequestComponent.afterCreateSuccess`; la tabla queda gobernada por `app-custom-draw-form`.

<a id="escenario-18"></a>
## Escenario 18: Búsqueda complementaria de relaciones fuera del combo precargado

- **Fecha de ajuste:** 2026-08-14.
- **Objetivo:** permitir que un campo remoto busque en el servidor un registro que no llegó en la precarga normal del combo, sin eliminar ni ampliar por defecto los filtros de esa precarga.
- **Contrato corregido:** los campos remotos heredan `additional_search`, inactivo por defecto. `active` muestra el botón; `autocomplete` define el atributo remoto (`by`), coincidencia, mínimo, límite y textos. `subsidiaries` usa el estándar BOS `{ "filter": { <campo>: { active, forced, ops, default, default_value, option_value } } }`: un `filter` vacío busca en todas las sucursales del tenant y las entradas activas limitan las asignaciones con semántica AND. `by: "search"` usa la búsqueda global; otro valor genera `iexact`/`icontains` sobre ese atributo. Los tipos `dropdown-choice`, `multi-choice`, `select-button` y campos con prefijos dinámicos no pueden activar esta capacidad.
- **Flujo:** el botón abre un `p-autoComplete` independiente. La consulta conserva `data_type.filter`, no usa ni contamina la caché de la precarga y llama la ruta dedicada `reference-search/<app>/<recurso>/<campo>/`; el query contiene únicamente filtros JSON:API reales (`filter[...]`), orden y paginación. El contexto se resuelve también desde `CRUDService.type/getAppType`, evitando que la búsqueda termine localmente sin petición cuando el componente no recibe `sourceApp`. Al elegir un resultado, éste se incorpora a las opciones vivas y se asigna al mismo `FormControl`, por lo que el formulario lo ve como una selección ordinaria del combo.
- **Seguridad:** `active: true` con `subsidiaries.filter` vacío equivale a conceder visibilidad de lectura sobre todo el tenant para esa relación y buscador. Con entradas activas, la visibilidad adicional queda restringida por el filtro. El cliente no envía sus valores: el servidor obtiene el filtro de la configuración efectiva después de validar los tres segmentos de la ruta. No existe un parámetro de consulta `additional_search`; un filtro activo sin `default_value` vuelve al alcance normal porque el buscador raíz no tiene padre que resuelva `forced`.
- **Configuración inicial:** el campo `asset` (Bomba) de mantenimiento CEB habilita `active` y deja `subsidiaries.filter` vacío para buscar en todo el tenant; su precarga ordinaria continúa limitada por las sucursales del usuario.
- **Despliegue de configuraciones persistidas:** el editor avanzado muestra el bloque aunque una configuración antigua todavía no lo contenga. En producción se debe guardar esos valores para el campo o refrescar la configuración CEB por el mecanismo operativo vigente; desplegar sólo el código no muta los JSON de configuración ya almacenados.
- **Contratos legados rechazados:** `subsidiaries: true` y el contrato transitorio `{ "ids": [], "names": [] }` ya no consultan ni conceden alcance alternativo. El cliente muestra el formato `{ "filter": {} }` esperado.
- **Compatibilidad:** no se agregan reintentos ni se reduce la cantidad de opciones cargadas; tampoco cambian los `choice`, campos dinámicos, escrituras ni el valor serializado de las relaciones.

## Pendientes

- °°° Revisar por qué varios campos del formulario se vuelven `null` después de inicializarse con `default.value` distinto de `null`. SOLUCIONADO parcialmente para `tree-select`, `multi-select` y `classifiers` en el escenario 08.
- °°° Revisar específicamente rutas de `reset()` reutilizando `formTempo[pos]`, activación condicional en `custom-draw-form.component.ts` y limpieza de multimedia al remover el último archivo.
- Validar manualmente `multi-choice` en navegador con opciones desde `data_type.options`, desde `options` y desde `sharedS.data` proveniente de un campo `List`/`Choice`.

## Archivos modificados

- `src/app/utils/services/crud.service.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/types/crud.types.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.ts`
- `src/app/components/custom-local-settings/type-schemas.ts`
- `src/app/tasks/task/task.component.ts`
- `src/app/utils/dropdown-types.const.ts`
- `src/app/shared/crud-page-shell.component.ts`
- `src/app/purchases/request/request.component.ts`
