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

Para `from="server"`, un derived escalar hereda el `data_type` del root cuando
el child no lo repite y consulta un solo registro. Un derived no modifica
tablas: éstas se llenan únicamente al confirmar el guardado de una fila.

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

## Escenario 06: CRUD por celda en la tabla derivada (contrato de búsqueda)

La tabla derivada dejó de ser un widget aparte: es una segunda vista del MISMO
motor del formulario. Cada celda es un mini-campo dinámico (mismos tipos, misma
resolución `app/type`, mismo aplanado y las MISMAS validaciones, que no se
recalculan) y cada fila es un registro que se persiste con el `save` del detalle
vía pos transitorio.

### Ningún campo es especial por su nombre

Se eliminó todo trato particular para `code` y `name` (y el atajo previo
F3/`searchable`). Un campo se vuelve buscador por la COMBINACIÓN de estas claves
de configuración, idénticas en el formulario y en la columna equivalente:

| Clave | Efecto |
| --- | --- |
| `data_type.type` | Recurso a consultar. **Sin él no hay búsqueda**; no se hereda el `data_type` de la tabla. |
| `dropdown` | `true` muestra el botón para consultar todas las opciones. |
| `search_key` | Si falta, Enter; `''` busca al escribir; `enter`/`f3`/`tab`/`arrowup`/`arrowdown` (lista separada por comas) esperan esa tecla. |
| `force_selection` | `true` solo admite valores de la lista. **Cede ante `free_or_relationship: true`**, que declara que el campo admite ambas formas. No forma parte de los perfiles de búsqueda: es decisión del campo. |
| `free_or_relationship` | El buscador cumple DOS funciones: seleccionar una opción **inicializa la relación** (el UUID va a `relationship_field` y se envía como relationship); escribir **texto libre** conserva el texto y lo envía como atributo normal del propio campo (p.ej. `name="texto libre escrito"`). El texto libre **nunca** se descarta. |
| `min_search_length` | Mínimo de caracteres para buscar parcialmente; el motor aplica un piso de 5. No es una validación de `input-text`. |
| `smart_search` | En parcial, `true` usa `filter[search]`; `false` usa `filter[<field>.icontains]`. En exacto no se usa. |

El auto-select de coincidencia exacta única se dispara **solo** en `search_mode: 'exact'` o en búsqueda por tecla; durante la escritura parcial (descripción) no se auto-selecciona, para no cerrar el panel a medio escribir.

### Campos dinámicos (`form_fields_data_*`) en columnas

Un dropdown dinámico se valida en su espejo `object_<campo>` (ahí vive el
`required`). El motor transitorio mapea ese espejo a su columna (usa el `required`
por columna) y lo puebla con el objeto seleccionado guardado en la fila, así una
fila directa deja de exigir en falso Componente/Síntoma/Tipo de gasto. La celda
guarda el `id` (valor) y muestra su etiqueta con `cellDropdownLabel` (mapea el id
a `option_label` con las opciones de la fila). Al crear desde el formulario, un
puente `form_data.<X>` → `form_fields_data_<X>` asigna estos campos a sus columnas.
| `search_mode` | `partial` (coincidencias parciales) o `exact` (coincidencia completa). |
| `local_editable` | Marca el campo "descripción": puede buscar mientras no haya valor resuelto; ya resuelto, editarlo NO vuelve a consultar (frena la búsqueda, nunca la edición). |
| `default.active` | Preselecciona ese valor antes de cualquier búsqueda (`field_name`/`result_position`). |

Reglas transversales: una coincidencia exacta **única** se selecciona sin
desplegar el panel, y la comparación usa el `option_label` declarado (vía
`formatDynamicValue`, que soporta concatenación tipo `name,last_name`) más la
clave fuente de la columna — nunca nombres de campo hardcodeados.

Cuando la configuración exige tecla (`search_key`) o no se alcanzó `min_search_length`,
**no se consulta al servidor ni se despliega el panel** — tampoco el mensaje
"No hay resultados". Este contrato se implementa por igual en las celdas
(`dynamic-table-field`) y en el autocomplete del formulario
(`completeMethod` / `onKeydownEnter` de `custom-draw-form`), de modo que el mismo
campo se comporta idéntico en ambas vistas.

El servidor declara los perfiles una sola vez (`search_by_code()`,
`search_by_description()` en `purchases.py`) y los aplica al autocomplete del
formulario y a la columna de la tabla, garantizando comportamiento idéntico.

### Encabezados y campos dinámicos

El encabezado de una columna sale de `header` o, en su defecto, de `cols.label` /
`label`. Los campos dinámicos que amplían la tabla (`form_fields_data_*`
declarados en el root de la tabla derivada en `ceb.py`) declaran su etiqueta en
`label`, por lo que se muestran igual que en la tabla normal y en el formulario,
sin tratamiento aparte. Sus opciones inline (`options`) se usan tal cual: como
ninguna columna hereda ya el `data_type` de la tabla, un combo sin recurso propio
deja de consultar (antes heredaba el recurso de la tabla y mostraba productos
dentro de "Componente").

### Etiquetas, booleanos y números

`<campo>__name` NO significa "toma el `name` del servidor": el valor sale del
`option_label` declarado. Cuando la respuesta se inyecta en la tabla se re-aplana
con las COLUMNAS como config (`_flattenForLocalTable`), de modo que, por ejemplo,
moneda use su `short_name`. Los booleanos usan la convención de `fieldsBool`
(`label_true`/`label_false`) y los números se formatean con las mismas claves que
el `p-inputNumber` del formulario.

### Fila manual y derivación

Una fila es **manual** cuando ninguna relación declarada por sus columnas está
resuelta: se marca con un icono discreto al final de Acciones y **todo** es
editable, sin importar root/derived. En una fila relacionada mandan las reglas de
columna más el candado `default.edit: false` de los nodos
`children.fields.derived`. Al
(re)elegir el padre, los targets `from: parent` se **recalculan** (se
sobrescriben, no se rellenan huecos) aplicando el `default` efectivo cuando el
padre no aporta el dato.

### Ciclo de vida de la fila

Una fila agregada desde la tabla arranca en edición en su primera celda editable
y, si se cancela sin completarla, se elimina (nunca existió en el servidor). Solo
hay una edición activa a la vez. Los combos de celda se alimentan de las opciones
que el formulario ya cargó al abrir el diálogo; solo consultan si el formulario no
las tiene.

### Búsqueda robusta

Cada búsqueda lleva un token por campo: una respuesta que llega tarde (fuera de
orden) se descarta, evitando que una consulta vieja pise a la nueva (era el
"a veces encuentra, a veces no"). Un error del servidor (p.ej. 400) deja el panel
vacío sin borrar el texto escrito. Al presionar la tecla de búsqueda, una
coincidencia exacta única se aplica y avanza el foco; sin coincidencia, el texto
libre se conserva y el foco avanza igual.

### Cascada de children por fila

En el formulario, cambiar un padre (p.ej. Componente) filtra/activa a sus hijos
declarados en `children.fields` (Subcomponente, Síntoma, Tipo de gasto). En la
tabla esa relación es **por fila**: cada fila tiene su propio padre y sus propias
opciones filtradas. Al elegir el padre en una celda se aplican, para ESA fila, el
`filter` (filtra las opciones del hijo contra el valor del padre, por
`filter_group`) y el `activate` (inactiva y limpia el hijo). El estado se guarda
por `${rowIndex}::${field}` (`cellChildOptions` / `cellChildDisabled`) y el hijo
consume `cellOptionsForRow(col, rowIndex)`. Si el valor del hijo deja de ser
válido con el nuevo padre, se limpia. Pendiente: recalcular al reabrir una fila
ya guardada (hoy se recalcula al cambiar el padre).

## Escenario 07: `no_form_data_*` no bloquea el detalle padre

`formErrors` omite los subárboles `FormArray` con prefijo `no_form_data_`: son
borradores locales que no se envían y se validan al confirmar la fila. Además,
`resetFormDialog` devuelve esas tablas a su estado inicial, porque `reset()` de
Angular anula valores pero conserva las filas del `FormArray`.

## Escenario 08: `required` duplicado en campos con espejo (regresión)

Un campo dropdown-like vive como pareja: `object_<campo>` (renderizado) y
`<campo>` (canónico enviado). El overlay aplicaba `Validators.required` a **ambos**,
por lo que un mismo campo generaba dos entradas de error y el toast repetía la
etiqueta. Ahora el `required` lo porta solo el control primario; el espejo replica
habilitado/valor y se le retira siempre. La validación sigue bloqueando y el
campo se marca en rojo, pero se reporta una sola vez.

En la misma línea, un child con `filter.scope: 'server'` se relaja también cuando
no hay contexto de padre: lo resuelve el servidor, así que tras el reset del
guardado ("Guardar y nuevo") el segundo envío ya no exige los campos calculados.

## Escenario 11: auditoría del contrato efectivo (config vs. claves consumidas)

Varios fallos reportados en navegador no eran defectos de código sino
**contradicciones de configuración** que nunca se habían verificado contra la
config *efectiva*. Se volcó la configuración ya resuelta (con `ceb.py` aplicado,
que **reemplaza** las columnas de `D_REQUEST_DETAIL`) y se cruzó contra las claves
que el cliente realmente lee.

Método adoptado, a petición del usuario: derivar del contrato en vez de parchar
síntomas. El motor **no debe adaptarse a los VALORES que la config tenga hoy** —
sólo a la ESTRUCTURA de los diccionarios. Cualquier combinación de valores es
válida y el usuario puede cambiarla en cualquier momento.

### Dinámicos no persistidos: `scope_edition` heredado

Las columnas `form_fields_data_*` (8–11) heredaban `scope_edition: 'local'` de
`table_columns_bombo_choice` sin redeclararlo. El motor omite del form transitorio
toda columna `'local'` **junto con su espejo `object_<campo>`** (el `mirroredField`
resuelve a la misma columna local), así que `_rebuildFormDataDicts` nunca podía
recomponer `form_data.<campo>`: los dinámicos se capturaban en la celda y se
perdían al guardar. Se declara `scope_edition: 'server'` explícitamente en las
cuatro columnas. `'local'` queda reservado a columnas que son sólo vista
(`discard_proof` / `installation_proof`, que se conservan `'local'`).

Observación no corregida: `SUBCOMPONENTE`, `SINTOMA_DE_FALLA` y `TIPO_DE_GASTO`
declaran `options: []` porque sus opciones sólo existen tras la cascada por fila.
Al rehidratar una fila guardada no hay cascada, así que `cellDropdownLabel` no
encuentra correspondencia y muestra el id crudo en vez de la etiqueta.

### Moneda alternaba `name` y `short_name`

`_applyDerivedChildren` escribía en el control el texto `<rel>__name`, que
`DJAtoObject` calcula con la convención genérica de la relación y **no** con el
`option_label` del destino. Como `_applyCellSelection` sí guarda el id canónico,
la misma columna mostraba `name` recién derivada y `short_name` tras recargar.
Ahora una columna dropdown-like recibe el VALUE canónico y resuelve su etiqueta en
lectura con el `option_label` de esa columna (`cellDropdownLabel`), igual que la
ruta de selección. Cada vista respeta su propio `option_label`; no se tocó el
fallback compartido de `formatDynamicValue`. Las columnas no dropdown conservan el
comportamiento previo.

### `code` bloqueada: comportamiento correcto, no defecto

La columna `code` llega con `default.edit: false` y por eso la celda está
bloqueada mientras la fila tenga una relación resuelta. Es la semántica pedida:
una vez que `code`/`name` resuelven a una relación, el dato lo manda el producto y
para cambiarlo se elimina y se vuelve a agregar la fila. Ese valor puede cambiar
por configuración y el motor debe honrarlo tal cual, sin adaptaciones. En fila
manual sigue aplicando `isManualRow`, que abre toda la fila.

Observación no corregida (planteada por el usuario, sin confirmar):
`no_form_data_agregar.fields_enable` lista `code`, y quizá debería listar
`base_product_data_code`.

### `local_editable`: semántica en revisión

Se documentó en extenso sin alterar su comportamiento, por indicación explícita
del usuario. Marca cuál columna juega el papel de "descripción/nombre" (el campo
puede llamarse de cualquier forma) y hoy tiene dos efectos: fuerza la edición y
frena la re-búsqueda cuando la relación ya está resuelta. La regla nueva del
usuario —todo valor que NO provenga de una relación debe poder editarse aunque la
config diga que no— ya está cubierta por `isManualRow`/`isCellEditableForRow`.
Queda pendiente confirmar si el efecto sobre la editabilidad sigue siendo
necesario o es redundante.

## Escenario 12: la fila se cerraba sin haberse guardado (pérdida silenciosa)

`finishRowEdit` cerraba la fila evaluando **sólo la validez del form de la fila**
y después emitía el guardado. El motor, en cambio, valida el contexto
TRANSITORIO completo —columnas **más los controles del encabezado**— y aborta en
`save()` (`if (this.formErrors(safePos, is_file)) return;`) cuando falla un campo
del encabezado, p.ej. Sucursal. Resultado: la fila quedaba cerrada, con aspecto de
guardada, sin que saliera ninguna petición. El usuario lo describió como "la fila
se cierra y queda guardada localmente pero no en el servidor y el usuario pensará
que sí está guardado".

Esto reordena el diagnóstico de los escenarios anteriores: mientras el encabezado
tuviera un requerido sin capturar, **ninguna** fila llegaba al servidor, así que
los dinámicos "desaparecidos" al guardar eran consecuencia de que el guardado
nunca ocurría, no de la composición del payload.

### Canal de retorno motor -> tabla

Se añade `CRUD.tableRowSaveOutcome` (signal), publicado por
`_publishTableRowSaveOutcome` sólo para guardados con `local_table.mode: 'row'`:

- **fallo** en el abort por `formErrors` y en los handlers de error de POST y PATCH;
- **éxito** tras `_applyCreatedItemToLocalTable` (alta) y tras el PATCH aceptado.

Lleva un `token` incremental para que dos desenlaces idénticos consecutivos sigan
disparando `ngOnChanges`. Viaja `request.component.html` ->
`custom-draw-form` (`tableRowSaveOutcome`, sólo transporte) -> `dynamic-table-field`
(`rowSaveOutcome`).

Con `deferRowSave` la fila **permanece en edición** al emitir y sólo se cierra
cuando llega un desenlace OK; ante fallo sigue abierta y el foco vuelve al primer
campo editable pendiente. El cierre se extrajo a `_closeRowEditFlags` para
compartirlo entre ambos momentos.

Casos preservados a propósito: el flujo **no delegado** conserva el cierre
inmediato de siempre, y una fila de vista previa (`isDerivedDraft`) también cierra
de inmediato, porque el host corta antes de guardarla y esperar un desenlace la
dejaría abierta para siempre.

### Observación no corregida

La rama de **edición (PATCH)** de `submitForm` no procesa `local_table` en
absoluto: no llama a `_applyCreatedItemToLocalTable`, así que la respuesta de una
fila editada no se re-proyecta sobre la fila de la tabla. Sólo se le añadió la
publicación del desenlace.

## Escenario 13: diagnóstico en pantalla de la config efectiva

Se discutió si la configuración que consume el cliente venía de la caché
(IndexedDB `bos_config_module_v3:*`) o del servidor, y esa duda no se resuelve
leyendo la config del servidor. Se añadió un `<details>` en `tableTemplate` que
lista por columna `scope_edition`, `default.edit`, `local_editable`, `readonly`,
`option_label` y el `editable_efectivo` resuelto con la misma prioridad que aplica
la tabla, distinguiendo `—` (clave ausente) de `false` (declarada).

Nota sobre la caché, corregida tras leerla: `getConfigModulesToPersist` sólo
persiste módulos ya presentes en el mapa de visitas, así que en un navegador
limpio el login **no** escribe ningún `bos_config_module_v3:*`; al faltar la
clave, `ensureConfigModulesAsync` cae en `missingModules` y **refetchea** la
configuración. Es decir, la config sí se estaba renovando.

Es diagnóstico TEMPORAL (`table-config-audit.pipe.ts` + su bloque en el template):
retirar al cerrar estos escenarios.

## Escenario 14: rechazo externo, permisos explícitos y rehidratación de dinámicos

### La fila no se cierra cuando falla Sucursal

El canal `tableRowSaveOutcome` ya conservaba abierta la fila cuando el guardado
delegado fallaba. Faltaba el caso en que la fila era válida y el error pertenecía
al encabezado —por ejemplo, **Sucursal requerida**—: no había una celda inválida
que enfocar y el usuario quedaba sin un campo activo. Ahora se busca primero la
celda inválida de la fila y, si no existe, se reactiva la **última celda editable**.
La fila no se cierra ni se considera persistida hasta una respuesta OK.

### `edit`, `editable`, `local_editable` y `scope_edition`

La decisión de edición de una celda relacionada queda, en este orden:

1. `readonly: true` bloquea.
2. `edit: false` en la **columna root** bloquea.
3. `default.edit: false` bloquea si no hubo un candado anterior.
4. Si no hay ninguno, la celda es editable. Una fila totalmente manual conserva
   la excepción previa frente a `edit`/`default.edit`, pero **nunca** revoca
   `readonly: true`.

`local_editable` se conserva sólo para que pueda auditarse, pero queda
**temporalmente deshabilitado** por decisión expresa del usuario: no desbloquea
`name`, ni bloquea una nueva búsqueda. De este modo `name` y `price` honran su
`edit: false`/`default.edit: false` declarados.

`editable` no es permiso de celda. En el servidor sólo aparece en la configuración
del control dropdown/autocomplete para permitir escritura/creación de opciones y
`base.py` lo excluye de `table_columns_*`; el runtime de tabla no lo consume para
decidir edición.

`scope_edition` tampoco cambia la edición visual: define **dónde viaja el valor al
guardar**. Una columna `server` se copia al contexto transitorio y se envía al
detalle; una `local` queda sólo en el `FormArray` de la vista. Por eso los cuatro
`form_fields_data_*` requieren `scope_edition: 'server'`; los comprobantes locales
siguen en `local`. `client` no es un valor implementado para `scope_edition`:
en el flujo delegado cae como cualquier valor distinto de `local` (se envía), pero
en el PATCH directo sólo se persiste el literal `server`. No debe usarse como
sinónimo de `local` hasta definir un contrato único.

### Dinámicos: claves completas, etiquetas e ids

Al volver una respuesta, `form_data` puede usar `COMPONENTE` o
`form_fields_data_COMPONENTE`. El puente acepta ambas formas, toma el id canónico
para el control dropdown y conserva la etiqueta/objeto fuente. Si una respuesta de
guardado de fila sólo trae ids u omite un dinámico, conserva la etiqueta de la fila
que ya estaba seleccionada. Así los datos elegidos desde el formulario se agregan a
la fila y los elegidos desde la tabla no vuelven a mostrar claves crudas.

El panel de sugerencias formatea campos numéricos con las mismas claves que
`p-inputNumber` (`min_fraction_digits`, `max_fraction_digits`, `mode`, moneda,
locale, prefijo y sufijo), tanto en el formulario como en una celda de tabla.

## Escenario 15: contrato raíz de `code`, rehidratación y retirada de auditoría

La afirmación anterior sobre `code` era incorrecta: en `purchases.D_REQUEST_DETAIL`
el campo raíz ya es `auto-complete`, no el `input-text` heredado de `common_name`.
Su perfil base viene de `auto_complete` (`dropdown: false`, `panel.active: true`,
`search_key: ''`, `force_selection: false`, `search_mode: 'partial'`,
`smart_search: true`, `min_search_length: 5`) y el recurso,
relación, etiqueta y children se resuelven desde configuración. No se introduce
lógica especial para productos ni para el nombre `code` en Angular.

La ruta de búsqueda no se deriva de `option_label`: si `data_type.filter`
declara un binding de consulta, éste define la ruta remota; de otro modo la
declaración general `smart_search` controla el filtro. En parcial, `true`
envía `filter[search]` y `false` envía `filter[<field>.icontains]`; el nombre es
el `field` que declara el control. Por eso `code` continúa siendo un
`auto-complete` genérico y no se conserva un `search_field` especial para
productos.

Al seleccionar por código faltaba el nodo derived para `name`; se añadió al mismo
contrato declarativo que ya llenaba `price` y `currency`. Por lo tanto `name` queda
bloqueado mientras provenga del producto (`default.edit: false`), pero no por
`local_editable`, que sigue temporalmente deshabilitado.

`panel.active` gobierna si se dibuja el panel compuesto de sugerencias; cuando es
`false` se conserva la etiqueta configurada por `option_label`. `dropdown` mantiene
su significado propio de botón PrimeNG para solicitar todas las opciones; no es un
permiso de edición.

### Dinámicos de formulario y tabla

Los children de dropdown se publican en el mapa compartido bajo
`object_<field>`, no bajo `<field>`. La tabla sólo consultaba la segunda clave,
por eso Subcomponente, Síntoma y Tipo de gasto volvían a mostrar ids como `SC001`.
Ahora resuelve ambas y reutiliza las opciones ya cargadas por el formulario.

Al crear desde el formulario, si la respuesta aún no devuelve el `form_data`
dinámico, la proyección a la tabla completa únicamente esos huecos con los controles
del formulario y sus objetos espejo. La respuesta del servidor conserva prioridad.
Así se preservan id, etiqueta y objeto tanto al crear desde formulario como al
reeditar una fila guardada.

Si un derived no aporta un valor, usa el `default` efectivo: primero el root y
después el overlay del child. `default.active/default.value` controlan el
fallback; `default.edit` controla el permiso de forma independiente. Si el
default efectivo no está activo, conserva el valor actual.

### API y tipos de celda

El API quedó autorizado para cambios. Se documentó sobre las columnas CEB que la
tabla no dispone todavía de renderer propio para `date`, `tree-select`, `listbox`,
`multi-select` ni `files`; esos tipos caen a texto plano hasta implementar dicha
celda.

`editable` no se añadió ni se usa como permiso de celda: está excluido de
`table_columns_*` y conserva su semántica de control dropdown/autocomplete. La
editabilidad efectiva de tabla se deriva de `readonly`, `edit` y `default.edit`;
para el root, `default.edit` pertenece al contrato de defaults y no hace falta
duplicarlo en `editable`.

Se retiró la auditoría temporal de configuración en pantalla, su pipe, spec,
template e indicador de procedencia.

<!-- [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16 -->
## Escenario 16: búsqueda explícita, mínimo separado y bloqueo durante edición

`min_search_length` es ahora el único umbral de consulta de un autocomplete.
Nunca se lee `min_length` para buscar. Toda búsqueda parcial, sea global o por
nombre de campo, exige al menos cinco caracteres y puede declarar un valor mayor.
Así `min_length` queda reservado para validar datos de `input-text` en el
serializador y ya no convierte una longitud de búsqueda en un error de guardado.

Las reglas del cliente, idénticas en formulario y celda, son:

| Configuración | Consulta y panel |
| --- | --- |
| `search_mode: 'partial', smart_search: true` | `filter[search]`; panel normal tras el mínimo. |
| `search_mode: 'partial', smart_search: false` | `filter[<field>.icontains]`; mismo mínimo de cinco. |
| `search_mode: 'exact'` | Nunca busca al escribir ni abre panel, aunque `panel.active` o `dropdown` estén activos. Consulta por la tecla declarada (Enter si falta o está vacía); usa su binding `data_type.filter` si existe y, si no, `filter[<field>.iexact]`. Una coincidencia única se aplica directamente. |
| `search_key` ausente | Equivale a `enter`; `search_key: ''` habilita búsqueda al escribir sólo en parcial. |

El error mostrado como “Código producto… al menos 2 caracteres” se originaba en
un `min_length: 2` efectivo: el serializador instala `MinLengthValidator` antes de
que `RequestDetailSerializer.create()` copie el código del producto relacionado.
La configuración de autocomplete usa ahora `min_search_length`; además,
`RequestDetailSerializer.to_internal_value()` normaliza `code` a un valor temporal
válido en altas que ya traen `product`, de modo que la validación no bloquea la derivación que
`create()` siempre ha realizado. Si el 400 persiste, la relación `product` no está
llegando en ese payload y debe revisarse como problema de envío, no de longitud.

Mientras exista una fila o celda de tabla en edición, el `CustomDrawForm`
deshabilita los `FormControl` exteriores y los botones configurados —incluido
Agregar— sin deshabilitar el `FormArray` de la tabla activa. Muestra una banda
discreta de “Edición de fila activa”; al confirmar o cancelar, restaura cada
control exactamente a su estado disabled previo. Otras tablas reciben un bloqueo
externo y tampoco pueden agregar, editar o eliminar durante esa edición.
<!-- ]]]FI -->

<!-- [[[II ESC:030-17 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-17 -->
## Escenario 17: búsqueda exacta declarada sobre relaciones

`data_type.filter` también define el atributo remoto de un autocomplete. En el
contexto de búsqueda, una entrada `active: true`, no `forced`, con
`default_value: null` enlaza el texto introducido por el usuario; las entradas
con valor conservan su función de restricción estática. El normalizador común
convierte la convención de respuesta `relacion_data_atributo` a la ruta de filtro
ORM `relacion__atributo`.

Por tanto, la configuración `base_product_data_code` con operación `exact` y la
consulta `6` genera `filter[base_product__code]=6`. El mismo método se usa para
el formulario y la celda de tabla. Si ningún filtro declara ese enlace dinámico,
se conserva el perfil anterior (`filter[<field>.iexact]` en exacto y el perfil
parcial configurado), sin nombres especiales de producto o código.

Los nodos `children.fields.derived.*` no reciben ese bloque: son destinos de
copiado y no hacen peticiones. `app-custom-local-settings` y
`app-child-form-fields-builder` ya conservan objetos `data_type` completos al
editar y reconstruir configuración; no fue necesario introducir una segunda
normalización ni una clave específica.
<!-- ]]]FI -->

<!-- [[[II ESC:030-18 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-18 -->
## Escenario 18: selección y rehidratación fiel de filas relacionadas

Seleccionar un autocomplete exacto puede dejar el mismo texto visible que ya se
había escrito. El formulario procesa ahora de inmediato los
`children.fields.derived` de la opción seleccionada, sin esperar un `valueChanges`
que no existe en ese caso. La relación y los campos derivados siguen saliendo de
la configuración del padre; no se trata `code`, `name`, precio ni moneda como
campos especiales.

La rehidratación de una fila creada o actualizada conserva una clave dinámica
devuelta por el servidor y, sólo si coincide con el valor que el usuario ya había
seleccionado, recupera su `object_<campo>` y etiqueta `campo__name`. El PATCH de
fila pasa por el mismo aplanado y reemplazo que el POST. De esta forma editar
`asset` no degrada Componente, Subcomponente, Síntoma ni Tipo de gasto a sus
claves internas.

La relación declarada por `relationship_field` se conserva cuando la respuesta
omite esa relación pero mantiene la misma columna visible. Esto evita marcar como
manual una fila que sí proviene de una selección. `isManualRow` también reconoce
el valor canónico si aún está en el `FormGroup` durante la rehidratación.

Se agrega el opt-in `inherit_from_form: false`: una columna que lo declare limpia
su valor homónimo en el formulario transitorio cuando la celda está vacía. La
configuración CEB lo aplica a `asset`, por lo que una fila no toma el Activo del
encabezado de manera implícita. El resto de columnas conserva la herencia previa.
<!-- ]]]FI -->

<!-- [[[II ESC:030-19 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-19 -->
## Escenario 19: contrato derived alineado con el root

`children.fields.derived` dejó de portar un segundo diccionario `derived`.
`field_name` es la única clave fuente, `from` es hermano y el fallback usa
`default.active/default.value`. El permiso se declara en `default.edit` y no
depende de `default.active`.

El child funciona como overlay del campo root: las propiedades comunes omitidas
se conservan; `default` y `data_type` se mezclan por propiedad con prioridad del
child. El `filter` del child no se hereda del root porque sus responsabilidades
son distintas: el primero controla cascada/condiciones/scope y
`data_type.filter` describe la consulta remota.

Se retiró `default_field` del runtime y de las configuraciones locales: la
auditoría no encontró consumidores activos. En compras también se retiraron los
nodos de tabla y `requested` colocados dentro de `derived`, porque el runtime de
derived nunca procesa tablas y `requested` ya tiene su propio campo root.
La misma auditoría confirmó que ninguna configuración efectiva emitía
`column.derived.field_name`; se retiraron sus lectores legacy y la única clave
fuente vigente queda en `field_name`.

En `RequestDetailSerializer`, la autoridad de `default.edit` se aplica en create
y update cuando la fila conserva una relación `product`. En filas manuales el
child no bloquea: se conserva el permiso root y los valores libres. La regla
previa de `product → code` permanece intacta.

`app-custom-local-settings` muestra ahora `default.edit` aunque
`default.active=false`; antes el editor ocultaba el permiso junto con los
controles del valor por defecto y contradecía la independencia del contrato.
`app-child-form-fields-builder` ya conserva `default` como objeto completo al
reconstruir cada campo, por lo que no requirió normalización adicional.

Una configuración persistida con la gramática anterior debe volver a guardarse
desde el servidor actualizado; el cliente ya no interpreta el diccionario
`derived` interno ni `child.edit`.
<!-- ]]]FI -->

## Escenario 20: la derivación respeta `default.edit` y no se pisa a sí misma
<!-- [[[II ESC:030-20 -->

El Escenario 19 alineó la GRAMÁTICA, pero el runtime seguía tratando `default.edit`
como si sólo afectara al permiso visual. Tres defectos observados en vídeo sobre
`request-detail`:

1. **El código se rellenaba solo.** `_refreshDependentChildren` reprocesa las
   cascadas ante cualquier cambio del formulario y reutiliza el objeto padre
   cacheado. Cada reevaluación reescribía el control con el valor derivado, así
   que el usuario tenía que teclear su código 2-3 veces para que quedara.
2. **El fallback vaciaba el control.** `applyValue` aplicaba `default.value`
   (`''` en el código) cuando la fuente no traía dato, borrando lo escrito.
3. **El buscador quedaba en solo lectura.** Un derived con `default.edit:false`
   sobre `name` convertía el propio buscador en `readonly`, dejando al usuario
   sin forma de cambiar de producto antes de agregar la fila.

### Reglas
- `_processChildrenFields` recibe `origin`: `'selection'` (el usuario eligió una
  opción del padre) o `'refresh'` (reevaluación). Sólo `_refreshDependentChildren`
  pasa `'refresh'`.
- Con `default.edit:true` el usuario es dueño del valor: una SELECCIÓN nueva sí
  refresca, una reevaluación **no** puede pisar un control con contenido.
- Con `default.edit:false` la relación sigue siendo la autoridad en ambos casos.
- El fallback `default.value` sólo rellena huecos cuando hay permiso de edición;
  nunca borra lo escrito. Sin permiso, se impone (comportamiento previo intacto).
- Un campo que INICIALIZA la relación (`free_or_relationship` +
  `relationship_field`) nunca se bloquea por un derived de esa misma relación;
  bloquearlo es una trampa. `readonly` del root sigue mandando por encima.

### Clave fuente en tres formas
`GeneralService.resolveRelationDataValue` es la fuente ÚNICA (formulario y celdas
de tabla) para leer `field_name`. Una clave `<relacion>_data_<atributo>` puede
llegar plana ya enriquecida (`base_product_data_code`), anidada por el serializer
(`base_product_data: {code}`) o dentro del objeto de la relación
(`base_product: {code}`). Leyendo sólo la plana, una respuesta sin `included` —o
con un `include` que no cubra esa relación— dejaba el valor en `undefined` y el
control terminaba vacío. Es exactamente lo que ocurría al buscar por descripción.

### Servidor
El contrato es simétrico: `RequestDetailSerializer._apply_product_derivations`
deriva un campo porque está declarado como nodo derived, y aplica sin relación →
valor manual; `edit:false` → producto; `edit:true` → cliente, rellenando sólo el
hueco. Ver `docs/documents/2026-05-29-007-children-fields-contrato-unificado.md`
escenario 13 en el repositorio del servidor.

### Dueño de la relación (corrección de regresión)
Un formulario puede tener VARIOS buscadores del mismo `relationship_field`
(`code` y `name` → `product`). Cualquier cambio reevalúa a los dos. El buscador
que NO tiene objeto seleccionado llegaba a la rama "sin contexto de padre" y
aplicaba su `default.value` (`''`), borrando lo que acababa de derivar el otro.
Al quedar el texto vacío, `_clearAutoCompleteSelectionIfManual` detectaba que ya
no coincidía con la opción y anulaba `product`: la fila pasaba a MANUAL y volvía
a mostrarse el icono naranja `pi-user-edit` pese a venir del servidor.

Regla: **sin selección propia un buscador no es dueño de la relación**. Si la
relación ya está resuelta, ese buscador no deriva ni aplica su default. Si no
hay relación alguna, se conserva el comportamiento previo (el default del child
sí se aplica), que es lo que valida el escenario del default efectivo sin fuente.

No se puede discriminar por "el padre tiene valor": en ambos casos lo tiene. El
único discriminador válido es si `relationship_field` está resuelto.

### La relación es ESTADO DE LA FILA (fila manual marcada por error)

`isManualRow()` decide si una fila es manual comprobando si alguna relación
declarada por las columnas (`relationship_field`) está resuelta. Esa relación
vivía sólo en `source_row`, un objeto que se reconstruye en varias rutas (alta
desde el formulario, confirmación por fila, respuesta del servidor,
rehidratación) y que en algunas se perdía. Además `projectConfiguredTableRow`
conservaba el UUID DENTRO del bucle de columnas, después del `continue` que salta
una columna cuya clave fuente no está en la respuesta: como `code`/`name`
declaran su fuente en el PADRE (`base_product_data_code`) y la respuesta del
detalle trae `code`, ese `continue` se ejecutaba SIEMPRE y el UUID nunca se
copiaba. Resultado: toda fila guardada aparecía como MANUAL (icono naranja
`pi-user-edit`) aunque viniera del servidor con su producto.

Corrección estructural, no un parche por ruta:

1. `GeneralService.configuredRelationshipFields(columns)` es la fuente ÚNICA de
   los campos de relación declarados.
2. Los TRES constructores de fila (`dynamic-table-field`, `custom-draw-form` y
   `crud.class`) crean un **control real** por cada relación declarada. Así la
   relación viaja con el FormGroup y sobrevive a cualquier ruta, en vez de
   depender de un metadato lateral.
3. `projectConfiguredTableRow` conserva la relación en una pasada propia, antes
   de proyectar columnas, y su `sourceKey` cae a `field` cuando la clave
   declarada no viene en la respuesta (`field_name` describe la clave en el
   PADRE, no en el propio recurso al rehidratar).

### Aviso de divergencia
El nodo derived del código publica `show_changed: true`. Es un ÚNICO booleano: el
cliente debe señalar que el valor dejó de coincidir con el derivado del producto
actual (borde, icono o tooltip — lo decide el cliente). No viajan textos en la
configuración para no desplazar el formulario, y no bloquea el guardado: para
impedir el cambio existe `default.edit:false`. **Pendiente de implementar la
señal visual.**
<!-- ]]]FI -->

## Decisiones

- La tabla no cierra una fila hasta que el servidor confirma. Decisión explícita
  del usuario frente a "cerrar y reabrir si falla": nada cerrado puede quedar sin
  persistir.
- Los dinámicos de la tabla derivada **sí se persisten por fila**: regresión
  autorizada explícitamente por el usuario sobre el `scope_edition: 'local'`
  heredado, que los dejaba como sólo vista.
- No se modificó `default.edit` de ninguna columna: los valores de configuración
  son del usuario y el motor los honra.
- `local_editable` quedó temporalmente deshabilitado por autorización explícita
  del usuario; se conserva en la configuración, sin efecto de edición o búsqueda.
- Se preservan `children.fields.*`, `filter.scope`, `default.edit` y `data_type`.
- `filter.scope` es la única fuente que decide dónde se resuelve el child; el
  `scope` legado dentro de condiciones no se usa.
- No se reimplementó la exclusión existente de `no_form_data_` en columnas y
  payload; el cambio solo consume ese control local en el runtime.
- Un child con `default.edit: false` queda en modo readonly aunque la fuente sea local.
- No se hardcodearon campos de producto ni de `request-detail`: columnas,
  `relationship_field`, `option_label`, `scope_edition` y recurso salen de la
  configuración.
- `readonly` tiene prioridad absoluta, incluida una fila manual.
- `smart_search` se interpreta sólo en búsqueda parcial; exacto mantiene una
  interacción explícita por Enter y sin panel.
- El bloqueo visual y funcional del formulario durante la edición de fila no
  altera sus valores ni el estado disabled que ya tenían los controles.
- La derivación existente `product → code` del servidor se preserva; el ajuste
  sólo evita que un valor transitorio sea validado antes de que esa derivación se
  ejecute y toma su longitud máxima del modelo, no de un literal.

## Validaciones aplicadas

- Escenario 14: `npx tsc --noEmit -p tsconfig.app.json` completó sin errores.
- Se agregaron specs para el fallback a última celda al rechazar un encabezado y
  para que `local_editable` no anule `edit:false`.
- `npm run build`: completado; conserva advertencias preexistentes de presupuesto,
  dependencias CommonJS y `/layout/styles/preloading.css`.
- Contrato del servidor: `28 passed` en
  `apps/utils/tests/test_child_runtime_overlay.py` usando el entorno compartido.
- Specs agregados para condiciones, estados, tabla derivada acumulativa, merge
  configurable de filas y `scope_edition`.
- Los tres archivos de spec modificados compilan de forma aislada con TypeScript.
- Escenario 16: `npx tsc --noEmit -p tsconfig.app.json` completó sin errores tras
  cubrir `smart_search`, `min_search_length`, Enter por defecto y restauración de
  controles del formulario.
- Se compiló sintácticamente `base.py`, `purchases.py` y
  `purchases/serializers/requests.py` con `compile()` sin generar artefactos.
- El runner de Karma no alcanzó a ejecutar esos specs porque la compilación global
  falla antes: faltan seis archivos Roboto referidos por `src/assets/styles.scss` y
  `testing/crud-test.helpers` importado por specs ajenos a este cambio.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.spec.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.spec.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/general.service.spec.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/services/crud.service.ts`
- `src/app/purchases/request/request.component.ts`
- `src/app/purchases/request/request.component.html`
- `/home/jaime/Escritorio/d/aimeServidor2/apps/utils/configurations/purchases.py`
- `/home/jaime/Escritorio/d/aimeServidor2/apps/utils/configurations/base.py`
- `/home/jaime/Escritorio/d/aimeServidor2/apps/purchases/serializers/requests.py`

## Pendientes

- Validar visualmente en navegador el flujo de alta de `request-detail` contra
  una respuesta real de producto.
