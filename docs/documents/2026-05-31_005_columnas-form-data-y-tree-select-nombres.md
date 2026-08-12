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

<a id="escenario-12"></a>
## Escenario 12: Aplicar filtros configurados al cargar la tabla

Se reactivo la aplicacion de filtros persistidos al cambiar/cargar la posicion del
CRUD. `changePos()` ahora reconstruye `this.filter` desde los `fields` de la
configuracion activa antes de llamar `iniParam()`, de modo que la primera llamada
de `getAll2()` use los filtros definidos en `cols.filter` sin esperar a guardar
desde `app-custom-local-settings`.

El camino de guardado conserva el mismo comportamiento visible, pero ahora reutiliza
el helper comun pasando los `fields` modificados por el formulario local. Si la
configuracion del modulo aun no esta disponible durante una llamada temprana desde
constructor o navegacion, el helper usa `{}` y evita romper la carga inicial.

<a id="escenario-13"></a>
## Escenario 13 (histórico): fallback distribuido de headers

Este escenario probó temporalmente fallbacks en `generateJSONColumns()` hacia
`fieldsForm`, OPTIONS y `drawForm`. Esa solución fue retirada y queda documentada
solo como antecedente: duplicaba la prioridad de labels en cada consumidor.

La regla vigente comienza en el escenario 14: `AuthService` completa
`customField[app].cols` y las tablas consumen exclusivamente `this.customField()`,
con la clave técnica como último respaldo de seguridad.

<a id="escenario-14"></a>
## Escenario 14: `customField` como fuente de verdad de headers

Se ajusto el procesamiento de configuracion en `AuthService` para que
`customField[app].cols` quede completo desde el inicio de sesion y no guarde labels
`undefined`.

La resolucion de labels queda centralizada en `customField` con esta prioridad:

- `fields[field].cols.label`.
- `cols[field].label` / `cols[field].header` cuando la columna trae texto directo.
- `fields[field].label` / `fields[field].header`.
- clave del campo como ultimo respaldo.

Ademas, `processDrawConfig()` registra en `customField[app].cols` los campos que
nacen desde `draw`, incluyendo `form_fields_data_*`, sin sobreescribir labels ya
definidos por `cols`. Esto cubre columnas dinamicas agregadas desde
`custom-draw-form` y mantiene el `draw` procesado con `fields[field].label` para el
formulario.

`generateJSONColumns()` vuelve a tomar el encabezado de `customField` y conserva solo
un respaldo final a la clave del campo para no romper la tabla si llega una
configuracion incompleta. No cambia columnas, payload, `include`, filtros,
validadores ni los labels internos del formulario.

<a id="escenario-15"></a>
## Escenario 15: invalidación de módulos procesados con labels antiguos

Los módulos guardados en cliente contienen el resultado ya procesado de
`getCustomField()`. Por ello, una corrección en la prioridad de labels no podía
reparar una entrada almacenada previamente y la tabla seguía mostrando claves como
`form_fields`, `name2`, `short_name` o `description` aunque el código nuevo fuese
correcto.

Se versionó la clave de caché de módulos. Tras recargar el cliente, el módulo antiguo
no se reutiliza y la configuración se procesa otra vez desde servidor. No se agregó
ningún fallback en `generateJSONColumns()`: `this.customField()` permanece como única
fuente de verdad del encabezado.

La versión se avanzó nuevamente a `bos_config_module_v3` al completar el contrato de
children de `request-detail`. Esto evita que una sesión que ya almacenó la versión
anterior siga publicando únicamente la tabla sin los hijos `code` y `price`.

<a id="escenario-16"></a>
## Escenario 16: Exportar columnas `form_data.*` con su `option_label`, no `[object Object]`

Reportado desde `Más opciones → Exportar`: en el archivo generado, las columnas de
combos dinámicos (`Tipo de falla`, `Componente`, `Cluster`, `Región`) salían como
`[object Object]`, mientras que las columnas `__name` / `__text` (`Plaza`, `Estado`,
`Prioridad`) salían correctas.

Causa: el punto de `form_data.<campo>` significa cosas distintas en cada capa.

- La celda visible lee la clave **plana literal** con corchetes
  (`rowData[col.field]` en `custom-table.component.html`), y esa clave la escribe
  `DJAtoObject` **ya formateada** con `formatDynamicValue` (escenario 03).
- `exportCSV()` de PrimeNG resuelve el valor con `ObjectUtils.resolveFieldData`, que
  interpreta el punto como **ruta anidada** y baja a `record['form_data'][<campo>]`,
  es decir al objeto crudo sin formatear. Sin `exportFunction` declarada, PrimeNG hace
  `String(objeto)` → `[object Object]`.

Corrección: se declara `[exportFunction]` en el `p-table` compartido y se formatea la
celda con el helper existente `formatDynamicValue`, usando **la misma config**
(`fields[<campo>]` de `crudS.fieldsForm(pos)`) que usó el aplanado. Para que esa config
llegue al componente compartido se agrega `fields` a `fieldExport` en
`syncColumnsState()`, junto al `cols` que ya viajaba; el input `[field]="fieldExport()"`
ya estaba enlazado en los 19 módulos que usan `app-custom-table`, así que no se tocó
ningún template de módulo.

No se modificó la convención `form_data.<campo>` ni la generación de columnas: el punto
en el `field` se conserva porque también lo consumen el dedupe de columnas, el registro
de `timeZone` y la configuración local.

Alcance acotado: solo se reformatean las columnas cuyo `field` tiene punto (las
dinámicas). Las columnas sin punto conservan el `String(valor)` previo de PrimeNG. Se
replica el escape de comillas dobles porque PrimeNG solo lo aplica cuando **no** hay
`exportFunction`.

<a id="escenario-17"></a>
## Escenario 17: Filtros explícitos con lista de opciones del servidor (nombre, no clave)

Pedido: en `Configuración del módulo → Filtros`, el filtro de `Estado` mostraba las
claves crudas como chips escritos a mano (`P`, `PR`, `A`, `N`, `I`, `ER`, `LLR`, `SR`,
`EOR`, `FR`, `PA`, `R`, `RE`). Se pidió que muestre el **nombre** y que se elija desde
una lista desplegable con chips, sin hardcodear ningún nombre: todo debe salir de la
configuración, de OPTIONS o de otra fuente del servidor.

Causa: `status` declara un filtro explícito sobre `code`
(`base.py:1888-1911`, `cols.filter.code`). `_buildFilterableCols` resolvía el tipo de
esas entradas con `_resolveExplicitFilterType`, que sin `type` declarado devuelve
`input-text`; con el operador `in` eso caía en el `p-autoComplete` libre de chips, donde
el usuario escribe la clave.

Corrección: la entrada explícita hereda el **recurso** del campo contenedor. Se agrega
`option_data_type` a `FilterableCol`, resuelto como
`entry.data_type.type ?? entry.data_type ?? cfg.data_type.type` (para `status` →
`'status'`). Cuando ese recurso se resuelve en `getAppType`, la fila deja de ser texto
libre y se dibuja:

- operador `in` → `p-multiSelect` con `display="chip"`,
- operador simple → `p-select`,

en ambos casos con `optionLabel` y `optionValue` tomados de la configuración
(`option_label` / `option_value` de la entrada; por defecto `name` y el propio campo del
filtro, `code`). Las opciones se traen del servidor con el mismo patrón que ya usaba
`completeFkMethod`: `getAppType` resuelve `app`/`type` y `DJAtoObject` aplana la
respuesta. En el código no se escribe ningún nombre ni ninguna clave de estado.

Coherencia con el escenario 11: allí ya se decidió que en `cols.filter` el campo
contenedor participa porque representa la relación real de la columna
(`status` + `code` → `status__code`). Por eso el contenedor es también la autoridad de
dónde salen las opciones. `option_data_type` se guarda **aparte** de `data_type` para no
alterar el autocompletado FK que ya usaba esa propiedad.

Contrato guardado sin cambios: `_buildModifiedField` sigue escribiendo
`default_value` como el arreglo de claves (`['P','PR', ...]`), que es lo que
`buildFilterString` convierte en `filter[status__code.in]=...`. Cambia cómo se elige el
valor, no lo que se persiste ni lo que se consulta.

`hasOptionList()` decide por configuración y no por si las opciones ya llegaron, para
que la fila nunca alcance a mostrar las claves crudas mientras carga la lista.

### Caso especial `status`: opciones acotadas al módulo

Los estados no son un catálogo global: el modelo guarda `module`
(`apps/status/models/status.py:27`) y el resto del cliente ya lo respeta —
`dependentStatus` compara `status.module` contra el módulo del componente
(`crud.class.ts:7110`). Sin acotar, la configuración ofrecería estados de otros módulos.

La clave de módulo la declara cada componente como `this.module[typeDefault]`
(`maintenance.component.ts:91` → `'MA'`) y ahora viaja en `fieldConfig`
(`crud.class.ts:175`), junto a `cols`, `fields` y `app` que ya viajaban. El cargador
añade `filter[module]=<clave>` cuando el recurso está en `MODULE_SCOPED_OPTION_TYPES`;
si el componente no declara módulo, no se acota y la consulta queda como antes.

El endpoint lo soporta: `module: ('exact',)` en `filterset_fields`
(`apps/status/views/status.py:27`).

Reglas de consulta (corregidas tras la primera prueba en pantalla):

- **Una consulta por app.** La caché se lleva por `filterKey` + módulo con el que se cargó
  (`_optionsLoadedFor`). Reabrir el diálogo o recibir otra vez la config no repite la
  petición; cambiar de app sí la rehace, acotada a la nueva clave.
- **Nunca el catálogo completo.** Si el recurso se acota por módulo y todavía no hay clave,
  no se consulta. `status` supera los 1000 registros y el servidor corta ahí, así que la
  consulta sin acotar llegaría truncada y mezclada entre módulos; se prefiere no ofrecer
  opciones antes que ofrecer una lista incorrecta. Los recursos que no se acotan por módulo
  conservan su consulta completa.
- **La clave se reresuelve al abrir el diálogo** (`localSettings`). `syncColumnsState` solo
  corre cuando cambia la posición (`crud.class.ts:610`, guardia `posBefore != pos`), así que
  si el componente declara `this.module[pos]` después de esa sincronización el diálogo se
  quedaría sin clave. Solo se actualiza cuando difiere, para no reiniciar el estado del
  diálogo cuando ya era correcta.

### Mismo criterio para el menú de estados dependientes

El menú del botón de estados (`getStatus` → `dependentStatus`) traía el catálogo completo
con `getObject({ app: 'status/status' })`, sin acotar. Con más de 1000 estados ese listado
llega truncado por el tope del servidor, así que un módulo podía quedarse sin sus estados
por un recorte que no se ve en pantalla.

Ahora `getStatus` (`crud.class.ts:7154`) pide `filter[module]=<clave>` con el mismo
`this.module[pos]` que ya recibía por parámetro, y guarda el resultado en su propia clave
compartida `status_<MÓDULO>`, construida por `sharedModuleScopedKey`
(`crud.service.ts:359`). El filtro de la configuración lee y escribe **esa misma clave**
(`custom-local-settings.component.ts:1113`), así que los dos consumidores comparten una
sola carga por app: el segundo en abrirse ya no consulta.

El cribado por `depends_on` se conserva sin cambios: del módulo solo se ofrecen los estados
que dependen del estado actual del registro. Lo único que cambió en `dependentStatus`
(`crud.class.ts:7122`) es que lee el elemento del arreglo recibido (`data[i]`) en vez de
indexar por posición el bag compartido con clave fija; con el catálogo ya separado por
módulo, indexar otro arreglo con el mismo `i` apuntaría a un estado distinto.

Sin módulo, `sharedModuleScopedKey` devuelve la clave genérica `status` y la consulta sin
filtro: el comportamiento previo queda intacto en cualquier llamada que no traiga módulo.

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
- Los filtros configurados conservan menor prioridad que un `filter` enviado
  explicitamente a `getAll()` / `getAll2()`: el flujo existente sigue usando
  `filter || this.filter`.
- No se usa `SharedDynamicDataService` para el filtro principal de tabla; ese
  servicio sigue limitado a datos dinamicos/dropdowns, mientras que el filtro de
  listado vive en `CRUD.filter`.
- El fallback de headers no habilita columnas nuevas: solo resuelve el texto de las
  columnas que ya fueron generadas por OPTIONS/draw/cols.
- `customField` queda como fuente de verdad de labels visibles para columnas. Los
  consumidores no deben reimplementar la prioridad de `fields.cols.label` localmente.
- La versión de caché invalida automáticamente módulos procesados con la prioridad
  anterior de labels. Un cambio futuro del contrato de procesamiento debe incrementar
  de nuevo esa versión; no debe resolverse agregando fuentes alternativas en las tablas.
- El export no reimplementa un escritor propio de xlsx/CSV: se extiende el
  `exportCSV()` de PrimeNG por su punto de extensión declarado (`exportFunction`).
- El export no reimplementa la resolución del texto visible: reutiliza
  `formatDynamicValue` con la misma config que el aplanado, de modo que "lo exportado"
  y "lo que se ve en la tabla" no puedan divergir por dos criterios paralelos.
- La config viaja por `fieldExport` (canal ya existente hacia `app-custom-table`), no
  colgando `option_label` de cada columna: así no se engorda el objeto de columnas, que
  además es el que edita y persiste la configuración local del módulo.
- La lista de opciones de un filtro explícito se resuelve por el `data_type` del campo
  contenedor y no por un mapa de campos conocidos: cualquier filtro explícito sobre una
  relación queda cubierto sin tocar el código.
- `option_data_type` se agrega como propiedad nueva en vez de reutilizar `data_type`,
  porque `completeFkMethod` ya decide con esa propiedad si busca contra el servidor;
  reutilizarla habría cambiado el comportamiento del autocompletado FK existente.
- El nuevo control cambia solo la captura del valor. El contrato persistido
  (`default_value` como arreglo de claves) y la query resultante quedan idénticos.
- El acotamiento por módulo se declara por recurso (`MODULE_SCOPED_OPTION_TYPES`) y no
  por campo: `status` es el único recurso del que el cliente ya sabe que es por módulo.
  La clave nunca se escribe en el componente; llega desde `this.module[pos]`.
- Ante la falta de clave se decidió **no consultar** en vez de consultar sin acotar. Con
  más de 1000 estados y el tope de 1000 del servidor, la lista completa llega truncada:
  ofrecerla sería peor que no ofrecer nada, porque el usuario no puede notar el recorte.
- El catálogo acotado se comparte por `SharedDynamicDataService` bajo `status_<MÓDULO>`,
  no bajo la clave genérica `status`. Esa clave genérica la leen los dropdowns de
  formulario (`getSharedOptions` en `dynamic-dropdown-data.service.ts:216-219`), así que
  escribir ahí una lista de un solo módulo habría dejado a otros módulos leyendo estados
  ajenos. Con sufijo no hay colisión: `lookupBySuffix` solo empata claves terminadas en
  `:<campo>` (`dynamic-dropdown-data.service.ts:282-289`).
- `sharedModuleScopedKey` vive en `CRUDService` para que la convención de clave tenga un
  solo dueño y los dos consumidores no puedan divergir.
- Si en el futuro otro recurso necesita acotarse por algo que sí conoce el servidor, la
  vía existente es `data_type.filter` (`buildDropdownFilterString`), no ampliar esta
  constante.

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
- Para el escenario 12 se reviso por codigo que `initCRUD()` llama `getAll()`,
  `getAll2()` ejecuta `changePos()` antes de resolver `filter = filter ||
  this.filter`, y que guardar desde `app-custom-local-settings` usa el mismo helper
  con los `fields` editados.
- El escenario 13 queda reemplazado por el 14; sus fallbacks distribuidos ya no
  forman parte del código vigente.
- Para el escenario 14 se agregaron specs de `AuthService.getCustomField()` que
  validan:
  - `request_data_request_type` toma label desde `fields[field].cols.label`.
  - una columna con label directo en `cols` mantiene ese texto.
  - un campo sin configuracion cae a la clave sin inventar `sortable/hide/order`.
  - `form_fields_data_*` declarado solo en `draw` queda registrado en
    `customField[app].cols` sin pisar labels ya configurados en columnas.
- Para el escenario 16 se agregaron specs de `CustomTableComponent.exportCellFormatter`
  que validan:
  - una columna dinámica con `option_label` exporta el label (`'USD'`), no
    `[object Object]`.
  - `option_label` con varias claves separadas por coma se une igual que en la celda.
  - sin configuración del campo se aplica el mismo fallback (`name`) de la celda.
  - una columna sin punto conserva el `String(valor)` previo.
  - el escape de comillas dobles se aplica en ambas ramas.
- `npm run build` (configuración development) compila sin errores tras el cambio.
- Para el escenario 17 se agregaron specs de `CustomLocalSettingsComponent` que validan:
  - el recurso de opciones se resuelve desde el `data_type` del campo contenedor.
  - el servidor se consulta una sola vez por filtro y las opciones quedan expuestas.
  - `option_label` / `option_value` salen de la configuración, con defaults `name` y el
    propio campo del filtro.
  - lo guardado sigue siendo el arreglo de claves (`['P','PR']`) con su `default` y
    `active`.
  - un filtro sin recurso resoluble no adopta la lista de opciones.
  - los estados se consultan con `filter[module]=MA` y con `filter[module]=AC` al cambiar
    el módulo declarado por el componente.
  - recibir la config varias veces no repite la consulta (una por app).
  - el catálogo acotado se publica en la fuente compartida (`status_MA`).
  - si esa fuente ya tiene el catálogo de la app, no se consulta al servidor.
  - sin `module` declarado no se consulta, en lugar de traer el catálogo completo.
- Se agregaron specs de `CRUDService.sharedModuleScopedKey` que validan que dos apps no
  comparten carga (`status_MA` / `status_AC`) y que sin módulo se conserva la clave
  genérica previa.
- El `TestBed` de ese spec pasó a inyectar mocks de `CRUDService`, `GeneralService` y
  `MessageService`. Antes fallaba por proveedores faltantes (`ConfigService`/`HttpClient`)
  y sus 2 pruebas no llegaban a ejecutarse.

## Archivos modificados

- `src/app/auth/services/auth.service.ts`
- `src/app/auth/services/auth.service.spec.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/crud.service.ts`
- `src/app/utils/services/crud.service.spec.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.html`
- `src/app/components/custom-local-settings/custom-local-settings.component.spec.ts`
- `src/app/components/custom-table/custom-table.component.ts`
- `src/app/components/custom-table/custom-table.component.html`
- `src/app/components/custom-table/custom-table.component.spec.ts`
- `src/app/tasks/task-detail/task-detail.component.ts`
- `src/app/tasks/task-detail/task-detail.component.html`
- `docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md`

`SharedDynamicDataService` se reutiliza como fuente compartida pero no se modificó: solo
se guarda en él una clave nueva (`status_<MÓDULO>`).

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
- Verificar una carga inicial con `load_on_start` activo y un `cols.filter`
  persistido para confirmar que la primera peticion ya incluye el query param
  `filter[...]`.
- Exportar desde `/assets/maintenance?pos=maintenance` y confirmar que las columnas
  de combos dinámicos traen el mismo texto que la tabla en pantalla.
- Exportar un módulo con columnas `parent_form_data.*` (flujo hijo).
- Exportar un campo dinámico `multiple` para confirmar que se une con su separador.
- Abrir `Configuración del módulo → Filtros` en un módulo con `status` y confirmar que
  `Estado / code` ofrece los nombres de estado y que al guardar la consulta sigue
  llevando las claves.
- Confirmar en un módulo con otro filtro explícito sobre relación (no `status`) que
  también recibe su lista sin tocar código.
- Abrir la configuración en dos módulos distintos (p.ej. `maintenance` y otro con
  estados propios) y confirmar que cada uno ofrece solo los estados de su módulo.
- Confirmar en un componente que aún no declare `this.module[pos]` que el filtro no
  consulta el catálogo completo.
- Abrir el menú de estados (botón de estados) y confirmar que sigue ofreciendo solo los
  estados que dependen del estado actual del registro (`depends_on`), ahora sobre el
  catálogo acotado.
- Confirmar en la pestaña Red que `status/status` se consulta **una sola vez por app**
  aunque se abra el menú de estados y la configuración del módulo en la misma sesión.

## Pendientes / observaciones

- El encabezado de la fila sigue siendo `Estado / code`: `_buildFilterableCols` ya lee
  `entry.label ?? entry.header` para ese texto, pero la configuración del servidor no
  declara `label` en `cols.filter.code` (`base.py:1901-1908`). Nombrarlo es un cambio de
  configuración del servidor, no de este cliente; no se tocó porque el repositorio de la
  API es de solo lectura en esta tarea.

## Nota verificada sobre booleanos y fechas en el export (escenario 16)

Se revisó si el escenario 16 dejaba fuera booleanos y fechas: **no los deja fuera y no
había nada que corregir**. Los campos `Boolean`, `Choice` y `DateTime` del OPTIONS no
generan columna con punto, sino columna `<campo>__text`
(`crud.class.ts:3067`, `crud.class.ts:3080`, `crud.class.ts:3090`), es decir una clave
plana sin punto: `resolveFieldData` la lee directo y el export ya coincide con la
pantalla. Comprobado en el archivo exportado: `Situación` sale `Activo` y
`Fecha programada` sale `30/07/2026 10:38:56 a.m.`, el mismo texto de la tabla.

El único caso con punto es el de los combos dinámicos `form_data.*`, que es exactamente
lo que corrige el escenario 16.
