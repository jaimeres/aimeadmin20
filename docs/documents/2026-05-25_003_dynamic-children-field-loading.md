# 2026-05-25 · 003 · Dynamic children field loading en cascada de dropdowns

## Prompt original (resumen literal)
- "analiza y dime si esta configuración es suficiente para que el campo workshop se llene de forma automatica"
- "implementa el cambio"

## Escenarios

### Escenario 01: Implementar rama `dynamic` en `_processChildrenFields`

- **Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Método:** `_processChildrenFields`
- **Problema:** La rama `fieldType === 'dynamic'` era un no-op (`// dynamic: no-op de momento`). Los campos hijo definidos en `children.fields.dynamic` nunca se consultaban ni auto-seleccionaban al cambiar el padre.
- **Solución:**
  1. Resolver `app`/`type` desde `data_type.type` usando `crudS.getAppType`.
  2. Extraer el valor del padre con `filter_group` (default `'id'`). Si no hay opción seleccionada ni `currentValue`, limpiar opciones y valor del control.
  3. Construir el filtro JSON:API inyectando `parentValue` como `default_value` en cada entrada del `data_type.filter` que tenga `forced: true`. Entradas estáticas (`active: true`, sin `forced`) se pasan tal cual.
  4. Llamar a `crudS.getObject` con el filtro construido.
  5. Aplicar `result_position` (`first`|`last`|`all`) sobre los resultados.
  6. Actualizar `dropdownOptionsSignal` con los resultados filtrados.
  7. Si `selected: true`, auto-setear el `FormControl` con `rows[0][option_value]`; si no hay resultados, setear `null`.

- **Propiedades de configuración soportadas:**

| Propiedad | Nivel | Descripción |
|---|---|---|
| `filter_group` | campo hijo | Propiedad del padre usada como valor del filtro (default `'id'`) |
| `data_type.type` | campo hijo | Tipo de recurso del endpoint hijo |
| `data_type.filter[*].forced` | campo hijo | `true` → inyectar `parentValue` como `default_value` |
| `data_type.filter[*].active` | campo hijo | `true` → incluir como filtro estático |
| `result_position` | campo hijo | `'first'`, `'last'` o `'all'` |
| `selected` | campo hijo | `true` → auto-setear el control con el primer resultado |
| `option_value` | campo hijo | Campo del objeto resultado usado como valor del control (default `'id'`) |

- **Ejemplo de configuración (Python/backend):**
```python
"workshop": {
    **child_dynamic,
    "filter_group": "id",
    "data_type": {
        **data_type,
        "type": "workshop",
        "filter": {
            "subsidiaries__assetsubsidiary__asset": {
                "forced": True,
                "active": True,
                "ops": ["exact"],
                "default": "exact",
            }
        }
    },
    "result_position": "first",
    "selected": True,
}
```

### Escenario 02

- **Archivos:**
    - `src/app/utils/crud.class.ts`
    - `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Problema:** En campos hijos tipo dropdown/autocomplete/tree-select, `CRUD.addFieldsByPrefix()` renombra el control visible a `object_*`, pero la cascada podía seguir publicando opciones o resolviendo controles con una clave distinta (`key` del mapa o metadata `field` desincronizada). El síntoma en runtime fue: `dropdownOptionsSignal` contenía `form_fields_data_cluster`, mientras el template renderizaba `object_form_fields_data_cluster`, dejando el combo sin opciones visibles.
- **Solución:**
    1. Al renombrar children payload en `addFieldsByPrefix()`, sincronizar también `typedChildFieldValue.field` con la nueva clave `object_*`.
    2. En `_processChildrenFields()`, resolver un campo canónico (`targetField`) priorizando el control `object_*` cuando exista para tipos dropdown-like.
    3. Usar ese `targetField` para activar/desactivar controles, ajustar validators y publicar opciones en `dropdownOptionsSignal`.
- **Validación aplicada:** En navegador, al seleccionar Plaza = `MONTERREY`, el signal ya exponía el child bajo la misma clave consumida por el template, eliminando el desajuste `form_fields_data_cluster` vs `object_form_fields_data_cluster`.

### Escenario 03

- **Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Problema:** Una vez corregida la clave del signal, los children tipo `dropdown-choice` seguían mostrando `empty` porque el renderer esperaba `option_value = value` y `option_label = display_name`, mientras la cascada publicaba objetos crudos (`{ id, name, code }`).
- **Solución:** Normalizar opciones cascada antes de publicarlas, inyectando aliases compatibles (`value <- id`, `display_name <- name/label`) y aplicando `option_label` sobre la colección ya normalizada.
- **Validación aplicada:** En el caso Plaza = `MONTERREY`, el combo Cluster pasó de renderizar `empty` a contar con una opción visible compatible con `dropdown-choice`.

### Escenario 04 · Contrato unificado de `children.fields` (armonización de los 3 modos)

- **Prompt original (resumen literal):** "implementa la propuesta y modifica el código… debe ser más amplio de los 5 escenarios… no necesitas mantener compatibilidad… las lógicas deprecadas 'TEMPORAL: compatibilidad data_type como cadena'… quítalas… dame el diccionario completo con todos los nodos… si hay nodos excluyentes indícalo… agrega los valores posibles en cada campo."
- **Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Métodos:** `_processChildrenFields` y nuevos helpers `_loadChildOptions`, `_processDerivedChild`, `_buildChildServerFilter`, `_applyClientFilter`, `_applyResultPosition`, `_publishChildOptions`, `_syncMirroredField`, `_mapOperatorToServerOp`.
- **Problema:** Los 3 modos (`static`, `dynamic`, `derived`) usaban dialectos distintos e inconsistentes:
  - `static` solo leía opciones locales y nunca consultaba al servidor.
  - `dynamic` consultaba al servidor pero **se bloqueaba** si el padre no tenía valor (limitaba al padre) y usaba `selected` para auto-llenar.
  - `derived` solo copiaba un atributo del padre y nunca podía consultar al servidor.
  - `filter_group`, `result_position`, `selected` y las `conditions` significaban cosas distintas según el modo.
- **Solución (pipeline único):** Los 3 modos comparten el mismo flujo:
  1. **Fuente de datos automática:** si `data_type.type` resuelve `app/type` ⇒ se consulta al servidor; en caso contrario se usan `options` locales (`fieldConfig.options` o `data_type.options`). Aplica a `static`, `dynamic` y `derived` (este último con `from: 'server'`).
  2. **Filtro de servidor** (`_buildChildServerFilter`): combina `data_type.filter` (entradas `forced` reciben el valor del padre; `active` se respetan) con las `filter.conditions` de scope `server`/`auto` que sean mapeables a operador de servidor.
  3. **Filtro de cliente** (`_applyClientFilter`): aplica las `conditions` con scope `client`/`auto` no resueltas en servidor, más el filtro implícito por `filter_group` declarado (solo fuente local).
  4. **result_position** (`_applyResultPosition`): `'all'` (default), `'first'`, `'last'` o índice numérico. **Ya no se asume `'first'`** (arregla REGIÓN→PLAZA que requería mostrar todas las coincidencias).
  5. **Publicación + auto_select** (`_publishChildOptions`): normaliza, publica en `dropdownOptionsSignal` y, si `auto_select: true`, fija el control con el primer resultado, sincroniza el campo espejo y **dispara la cascada del propio hijo recursivamente** (resuelve asset→workshop→cluster sin clic intermedio; profundidad máx. `_MAX_CASCADE_DEPTH = 6`).
  6. Sin coincidencias se limpia el control. `default_field` se retiró porque
     ninguna configuración activa lo utilizaba al auditar el contrato.
- **Cambios deprecados eliminados:**
  - Se eliminó el helper `_normalizeDataType` y todos los bloques `// --- TEMPORAL: compatibilidad data_type como cadena ---`. `data_type` **siempre es un objeto**.
- **Decisiones de nomenclatura (confirmadas con el usuario):**
  - Se conservan las llaves actuales (`options`, `data_type`, `filter`, `filter_group`, `result_position`, `option_value`, `option_label`).
  - Fuente decidida por presencia de `data_type.type` (no se introduce `data_source.kind`).
  - `result_position` default = `'all'`; el autollenado se controla aparte con `auto_select`.

#### Tabla de equivalencias (deprecado → nuevo)

| Deprecado / inconsistente | Nuevo contrato | Notas |
|---|---|---|
| `data_type` como cadena (`"workshop"`) | `data_type: { type: "workshop", ... }` | `data_type` siempre objeto. Eliminado `_normalizeDataType`. |
| `selected: true` (solo dynamic) | `auto_select: true` (los 3 modos) | `selected` se mantiene como **alias legado** temporal; el servidor debe emitir `auto_select`. |
| `result_position` asumido `'first'` | `result_position: 'all'` por default | `'first'`/`'last'`/N siguen disponibles de forma explícita. |
| `conditions[*].ops: [...]` | `conditions[*].operator` + `conditions[*].scope` | `ops` ya no se usa; el operador es escalar. |
| `filter_group` declarado sin extracción/filtro | Omitirlo y usarlo sólo al extraer una propiedad del padre | No depende del tipo visual; en `derived from: 'parent'` directo normalmente sobra. |
| `static` sin acceso a servidor | `static` usa servidor si trae `data_type.type` | Unificado con `dynamic`. |
| `derived` solo copia del padre | `from: 'parent' | 'server'` | `'server'` consulta y copia `field_name` del primer registro. |
| `dynamic` se bloquea sin valor del padre | Consulta igualmente; `forced` se omite si no hay valor | "no debe limitar a sus padres". |

#### Diccionario completo de nodos de `children.fields.<modo>.<key>`

`<modo>` ∈ `static` | `dynamic` | `derived`. `<key>` es el nombre del campo hijo (se renombra a `object_<key>` para tipos dropdown-like).

| Nodo | Tipo | Valores posibles / formato | Default | Aplica a | Notas / exclusiones |
|---|---|---|---|---|---|
| `type` | string | `dropdown` `dropdown-choice` `autocomplete` `tree-select` `input` `date` … | — | 3 modos | Tipo de control. Define si es dropdown-like (se renombra a `object_*`). |
| `field` | string | nombre del campo | `<key>` | 3 modos | Se sincroniza con `object_<key>` en `addFieldsByPrefix`. |
| `option_value` | string | nombre de propiedad | `'id'` | static, dynamic | Valor que se guarda en el control. |
| `option_label` | string | propiedad o lista separada por comas | `'name'` | static, dynamic | Etiqueta visible. |
| `filter_group` | string | propiedad del padre/opción | `'id'` cuando se requiere | 3 modos | Sólo cuando hay que extraer una propiedad para filtrar/consultar; no depende del tipo visual. |
| `result_position` | string \| number | `'all'` `'first'` `'last'` \| índice ≥ 0 | `'all'` | static, dynamic | También aceptado en `filter.result_position`. |
| `auto_select` | boolean | `true` \| `false` | `false` | static, dynamic | Autollena con el primer resultado y dispara cascada recursiva. Reemplaza `selected`. |
| `options` | array | `[{ id, name, ... }]` | `[]` | static (local) | Opciones locales. **Excluyente** con `data_type.type` (si hay `type`, se ignora `options`). |
| **`data_type`** | object | ver sub-nodos | `{}` | 3 modos | Configuración de fuente de servidor. |
| `data_type.type` | string | clave de recurso (ej. `workshop`) | — | 3 modos | Si resuelve `app/type` ⇒ fuente = servidor. **Excluyente** con `options` locales. |
| `data_type.ordering` | string | campo de orden (ej. `name`, `-created`) | `''` | 3 modos | Sort del endpoint. |
| `data_type.limit` | number | entero ≥ 0 | `0` | 3 modos | Límite de registros (0 = sin límite). |
| `data_type.options` | array | `[{ id, name, ... }]` | — | static (local) | Alternativa a `options` top-level. |
| `data_type.filter` | object | `{ <campo>: <FilterEntry>, logic? }` | `{}` | dynamic, derived(server) | Filtros de servidor. La clave `logic` se ignora aquí. |
| `data_type.filter.<campo>.forced` | boolean | `true` \| `false` | `false` | server | `true` ⇒ recibe el valor del padre como `default_value`. |
| `data_type.filter.<campo>.active` | boolean | `true` \| `false` | `false` | server | `true` (sin `forced`) ⇒ filtro estático tal cual. |
| `data_type.filter.<campo>.default` | string | `exact` `in` `range` `isnull` `icontains` … | `'exact'` | server | Operador del filtro JSON:API. |
| `data_type.filter.<campo>.default_value` | any | valor / array (in/range) | — | server | Valor del filtro estático. |
| `data_type.filter.<campo>.option_value` | string | propiedad | `'id'` | server | Para extraer id de FK. |
| **`filter`** | object | ver sub-nodos | — | 3 modos | Cascada, condiciones y `scope`; no describe el filtro HTTP del recurso. |
| `filter.active` | boolean | `true` \| `false` | `false` | static, dynamic | Si `false`, aplica filtro implícito por `filter_group`. |
| `filter.logic` | string | `'AND'` \| `'OR'` | `'AND'` | static, dynamic | Combinación de condiciones. |
| `filter.result_position` | string \| number | igual que `result_position` | `'all'` | static, dynamic | Tiene prioridad sobre `result_position` top-level. |
| `filter.conditions` | array | `[<Condition>]` | `[]` | static, dynamic | Reglas de filtrado. |
| `filter.conditions[*].source` | string | `'parent'` `'form'` `'node'` `'selected'` `'literal'` | `'parent'` | — | Origen del valor a comparar. |
| `filter.conditions[*].field` | string | nombre de campo origen | — | — | Requerido. |
| `filter.conditions[*].value_key` | string | propiedad del valor | `filter_group` | — | Propiedad a leer del valor resuelto. |
| `filter.conditions[*].filter_group` | string | propiedad (alias de `value_key`) | `filter_group` | — | Alternativa histórica a `value_key`. |
| `filter.conditions[*].operator` | string | `equals` `not_equals` `in` `not_in` `greater_than` `less_than` `range` `isnull` `not_null` `icontains` `iexact` | `'equals'` | — | `equals/in/range/isnull/icontains` son mapeables a servidor; el resto se resuelve en cliente. |
| `filter.conditions[*].scope` | string | `'auto'` `'client'` `'server'` | `'auto'` | — | `auto` ⇒ servidor si la fuente es servidor y el operador es mapeable; si no, cliente. |
| `filter.conditions[*].value` | any | valor único | — | — | Para operadores escalares. **Excluyente** en uso con `values`. |
| `filter.conditions[*].values` | array | lista de valores | `[]` | — | Para `in`/`not_in`/`range`. **Excluyente** en uso con `value`. |
| **`activate`** | object | ver sub-nodos | — | 3 modos | Habilita/oculta el campo según condiciones. |
| `activate.active` | boolean | `true` \| `false` | `false` | 3 modos | Si `false`, no se evalúa. |
| `activate.logic` | string | `'AND'` \| `'OR'` | `'AND'` | 3 modos | — |
| `activate.action` | string | `'inactive'` \| `'active'` | `'inactive'` | 3 modos | Qué hacer al cumplirse las condiciones. |
| `activate.default_state` | string | `'active'` `'inactive'` `'hidden'` `'readonly'` | `'active'` | 3 modos | Estado inicial antes de datos. |
| `activate.conditions` | array | `[<Condition>]` | `[]` | 3 modos | Misma forma que `filter.conditions`. |
| **`requested`** | object | ver sub-nodos | — | 3 modos | Marca el campo como requerido/no requerido. |
| `requested.active` | boolean | `true` \| `false` | `false` | 3 modos | — |
| `requested.logic` | string | `'AND'` \| `'OR'` | `'AND'` | 3 modos | — |
| `requested.action` | string | `'required'` \| `'not_required'` | — | 3 modos | — |
| `requested.conditions` | array | `[<Condition>]` | `[]` | 3 modos | Misma forma que `filter.conditions`. |
| `field_name` | string | propiedad del padre / registro servidor | — | **solo derived** | Único atributo fuente a copiar al control. |
| `from` | string | `'parent'` \| `'server'` | `'parent'` | derived | `'server'` consulta (limit 1) y copia `field_name`. |
| `default` | object | `{active, value, edit}` | root | 3 modos | Mezcla por propiedad root→child. `active/value` controlan el fallback; `edit` el permiso. |

##### Nodos excluyentes (resumen)

- `options` (local) **vs** `data_type.type` (servidor): si `data_type.type` resuelve un recurso, la fuente es el servidor y `options`/`data_type.options` se ignoran.
- `data_type.filter.<campo>.forced` **vs** `active`: `forced` toma prioridad (inyecta valor del padre); `active` sin `forced` es filtro estático.
- `filter.conditions[*].value` **vs** `values`: usar uno u otro según el operador (escalar vs lista/rango).
- `field_name` / `from` solo tienen efecto en modo **derived**; `options`/`data_type`/`filter`/`result_position`/`auto_select` no aplican a `derived` con `from: 'parent'`.

##### `<Condition>` (forma compartida por `filter`, `activate`, `requested`)

```jsonc
{
  "source": "parent",        // parent | form | node | selected | literal
  "field": "region",         // campo/propiedad origen (requerido)
  "value_key": "id",         // propiedad a leer (default = filter_group del hijo)
  "operator": "equals",      // equals | not_equals | in | not_in | greater_than |
                             // less_than | range | isnull | not_null | icontains | iexact
  "scope": "auto",           // auto | client | server  (solo relevante en filter)
  "value": "abc",            // valor único  (excluyente con values)
  "values": ["a", "b"]       // lista        (excluyente con value)
}
```

- **Cobertura de escenarios (más allá de los 5 ejemplos):**
  1. `derived` que precarga atributos del padre (PLACA_DELANTERA/TRASERA) ⇒ `from: 'parent'`, `field_name`.
  2. `static` REGIÓN→PLAZA que muestra **todas** las coincidencias ⇒ `result_position: 'all'` (default) + filtro implícito por `filter_group`.
  3. `static`/`dynamic` que necesita **una** coincidencia y autollenar ⇒ `result_position: 'first'` + `auto_select: true`.
  4. `dynamic` con filtro forzado por el padre ⇒ `data_type.filter.<campo>.forced: true`.
  5. `dynamic`/`derived` sin filtro que trae todos los valores del recurso ⇒ omitir `forced`/`conditions`.
  6. **Generalización:** cualquier combinación de N condiciones (AND/OR), mezcla cliente/servidor (`scope`), cascada multinivel por `auto_select`, y `derived` desde servidor.

- **Validación:** `get_errors` sin errores de compilación tras el refactor. Pendiente validación funcional en navegador (maintenance + tasks/task).

### Escenario 05 · Resolución de children en servidor (`filter.scope`)

- **Prompt original (resumen):** el servidor también puede hacerse cargo de la
  cascada para evitar viajes del cliente. En el contrato vigente,
  `filter.scope: server` delega la resolución y `default.edit` decide el permiso.
- **Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Métodos:** `_processChildrenFields` (rama nueva por `filter.scope`) y nuevo helper `_applyServerScopedChild`.
- **Problema:** Todos los children se resolvían en cliente: cada selección del padre disparaba una consulta al servidor (`_loadChildOptions` / `_processDerivedChild`) y el resultado se reenviaba en el create. En cascadas como CEB (`asset → workshop → cluster/region`) esto generaba viajes cliente⇆servidor innecesarios y duplicaba la lógica de resolución.
- **Solución:**
  1. En `_processChildrenFields`, antes de los bloques de activación/required/carga, se lee `childScope = fieldConfig.filter.scope` (default `'client'`).
  2. Si `scope === 'server'` se delega en `_applyServerScopedChild` y se hace `continue` (NO se consulta al servidor ni se evalúan activate/requested/carga para ese hijo).
  3. `_applyServerScopedChild`:
     - Limpia las opciones del `targetField` (`_updateDropdownOptions(targetField, [])`).
     - Limpia el valor previo (queda obsoleto al cambiar el padre) → valor sugerido vacío.
     - `default.edit: false` ⇒ `formControl.disable()` (solo-lectura).
     - `default.edit: true` ⇒ `formControl.enable()` (editable con valor vacío).
     - Relaja el `required` en cliente (`clearValidators()` + `updateValueAndValidity()`) para poder **enviar el create sin el campo**; la obligatoriedad real la reimpone el servidor en `resolve_children`.
     - Aplica lo mismo al campo espejo (`object_*` ↔ sin prefijo) cuando existe.
- **Decisiones de diseño:**
  - `filter.scope` es la única fuente de verdad de DÓNDE se resuelve el hijo (alineado con el contrato del servidor `2026-05-29-007`). `scope` en `conditions[*]` sigue rigiendo solo el filtrado cliente/servidor cuando `scope='client'`.
  - Los controles `default.edit:false` quedan deshabilitados, por lo que Angular los excluye de `formGroup.value` y no disparan validación required. Para `default.edit:true` se relaja el required explícitamente.
  - `required` se sigue declarando en el campo raíz (form builder); en cliente solo se relaja para los hijos resueltos por servidor.
- **Caso CEB:** marcar `workshop`, `form_fields_data_cluster` y `form_fields_data_region` con `filter.scope: 'server'` y `default.edit: false`. Al elegir `asset` el cliente ya no consulta esos recursos; el create se envía sin esos campos y el servidor los completa.

#### Nodos nuevos en el diccionario

| Nodo | Tipo | Valores posibles | Default | Aplica a | Notas |
|---|---|---|---|---|---|
| `filter.scope` | string | `'client'` \| `'server'` | `'client'` | 3 modos | `server` ⇒ el cliente no consulta; el servidor resuelve y llena en create. |
| `default.edit` | boolean | `true` \| `false` | root | 3 modos (solo con `filter.scope='server'`) | `false` ⇒ control solo-lectura; `true` ⇒ editable. Es independiente de `default.active`. |

- **Validación:** `get_errors` sin errores de compilación. Pendiente validación funcional en navegador (CEB: alta de tarea con `asset` y verificación de que el create se envía sin `workshop`/`cluster`/`region`).

### Escenario 06 · Obligatoriedad de children por schema efectivo + `filter.scope`

- **Fecha:** 2026-05-30 · **Consecutivo:** 003-06
- **Prompt original (resumen literal):** "Implementen la obligatoriedad de children solo para los children cuyo `child_key` empiece con `form_fields_data_` o `parent_form_data_`. No apliquen estas reglas a campos de modelo ni a `relacion_data_*`. La obligatoriedad real sale del campo raíz `fields[child_key].required` dentro del schema efectivo. `requested` y `activate` no cambian la obligatoriedad del backend; hoy deben tratarse como UX, no como validación dura del servidor. Si `requested` contradice al root, prevalece el root. Si `filter.scope='client'` y root `required=true` ⇒ el cliente garantiza valor antes de enviar. Si `filter.scope='server'` (edit false o true) ⇒ el cliente no exige captura ni bloquea submit; el servidor completa. Si no existe schema efectivo para ese prefijo, no impongan obligatoriedad local. No permitan que `activate` o `requested.action='not_required'` relajen un `required=true` del campo raíz cuando el child sea `scope=client`."
- **Archivos:**
  - `src/app/utils/crud.class.ts` (form builder: `addFieldsByPrefix`, `openTasksDetail` y nuevo helper `_childRequiredPolicy`).
  - `src/app/components/custom-draw-form/custom-draw-form.component.ts` (guard de runtime en `_processChildrenFields`).
- **Problema:** La obligatoriedad de los children dinámicos se tomaba directamente del nodo de layout (`fieldData.required`) o de `requested`/`activate`, lo que permitía que la UX relajara un `required=true` real del backend (riesgo de enviar create inválido) y, a la vez, exigía captura local para children que el servidor resuelve (`scope=server`), bloqueando el submit innecesariamente.
- **Alcance (solo estos prefijos):**
  - `form_fields_data_*` ⇒ schema efectivo = `form_fields` (`crudS.fieldsForm(pos)[child_key]`).
  - `parent_form_data_*` ⇒ schema efectivo = `child_form_fields.fields[child_key]` del padre (ya resuelto en `openTasksDetail`).
  - Campos de modelo y `relacion_data_*` ⇒ **sin cambios** (su `required` sigue saliendo del nodo/schema como antes).
- **Fuente de verdad:** `rootRequired = schemaEntry.required` (o `layoutNode.required` como respaldo) **gobierna la obligatoriedad lógica**, pero la decisión de DÓNDE se resuelve el child (cliente vs servidor) la dicta el **PADRE** vía `<padre>.children.fields.(static|dynamic|derived).<child_key>.filter.scope`. `requested`/`activate` son UX; el root prevalece.
- **Corrección clave (ajuste tras pruebas):** `form_fields_data_*` / `parent_form_data_*` **NO portan `filter.scope` en su propio nodo**; el scope vive en la declaración del padre (p.e. `workshop.children.fields.static.form_fields_data_cluster.filter.scope = 'server'`). Por eso se añadió `_collectChildScopeRegistry(draw)` que escanea TODO el layout y construye `Map<child_key_normalizada → { scope, edit }>` (normaliza quitando `object_`; `server` prevalece sobre `client` si el target aparece bajo varios padres).
- **Solución — `_childRequiredPolicy({ childKey, schemaEntry, layoutNode, hasSchema, scopeInfo })` ⇒ `{ applyRequired, readOnly }`:**
  1. Children **no objetivo** (no empiezan con los prefijos): `applyRequired = (schemaEntry?.required ?? layoutNode?.required) === true`, `readOnly = false` (comportamiento previo).
  2. Children **objetivo sin schema efectivo** (`hasSchema=false`): `{ applyRequired:false, readOnly:false }` (no se impone obligatoriedad local).
  3. Children **objetivo con schema**: usa `scopeInfo` del registro del padre:
     - `scopeInfo.scope==='server'` ⇒ no exige captura y calcula `readOnly`
       con `child.default.edit → root.default.edit → true`. El servidor
       inicializa el valor en el create.
     - sin declaración server (cliente o no es child de nadie) ⇒ `{ applyRequired: rootRequired, readOnly:false }`.
- **Algoritmo de detección (cliente):** para cada `form_fields_data_X`/`parent_form_data_X`, buscar si aparece como key en algún `<padre>.children.fields.(static|dynamic|derived)`; si ese nodo tiene `filter.scope==='server'`, marcarlo como "resuelto por servidor" (no exigir, no bloquear submit, respetar `edit` para readonly/editable). Si el backend no logra resolverlo, devolverá el error required y la lógica existente lo mapea al control.
- **Integración en el form builder:**
  - `addFieldsByPrefix` (`form_fields_data_*`): construye `_childScopeRegistry = _collectChildScopeRegistry(draw)` una vez; calcula `_childPolicy` con `schemaEntry = fieldsForm(pos)[fieldName]`, `hasSchema = startsWith('form_fields_data_') ? !!schemaEntry : true` y `scopeInfo = _childScopeRegistry.get(fieldName)`; usa `_childPolicy.applyRequired` para `Validators.required` y `_childPolicy.readOnly` en el `disabled`.
  - `openTasksDetail` (`parent_form_data_*`): construye el registro desde `childFormFields.draw` + `drawForm()[pos]` (por si el padre vive en cualquiera); calcula `_childPolicy` con `schemaEntry = fields[fieldData.field]`, `hasSchema = !!field`, `scopeInfo = registro.get(fieldData.field)`.
  - La validación efectiva del submit la realiza la lógica existente (`formErrors`/`Validators.required`); no se añadió mapeo de errores de servidor (ya cubierto por el manejo existente en `submitForm`).
- **Caso concreto (Alta de tipo de mantenimiento):** `form_fields_data_cluster` y `form_fields_data_region` son children de `workshop` con `filter.scope='server'` y `default.edit=false` ⇒ NO se muestran obligatorios ni bloquean el guardado aunque su root tenga `required=true`; el usuario solo elige `workshop` y el servidor llena Cluster/Región. `workshop` mantiene su obligatoriedad normal (campo de modelo, padre que dispara la resolución).

### Escenario 07 · Herencia root y gramática derived sin duplicados

- El child es un overlay: toda propiedad común omitida conserva el contrato del
  root destino. `default` y `data_type` se mezclan por propiedad y el child
  explícito prevalece.
- En `derived`, `field_name` existe una sola vez y `from` es un nodo hermano.
  El antiguo `derived.{from,field_name,fallback}` se eliminó.
- El fallback usa `default.active/default.value`; el permiso usa
  `default.edit`. Activar o desactivar el valor por defecto no cambia permisos.
- `child.filter` controla cascada/condiciones/scope. `data_type.filter` controla
  la consulta remota. No se pisan ni son alias.
- `filter_group` sólo se declara cuando debe extraerse una propiedad del padre
  para filtrar o consultar; no depende del tipo visual.
- `default_field` se eliminó del runtime y de la configuración del cliente
  porque no existía ningún uso activo al momento de la auditoría.
- **Guard de runtime (`_processChildrenFields`):** Para un child objetivo (prefijos), `scope` cliente (`fieldConfig.filter.scope !== 'server'`) y `targetFieldConfig.required === true` se calcula `lockRequired = true`:
  - `activate` NO puede desactivar/nulificar el control (`isActive` se fuerza a `true`).
  - `requested` NO puede relajar el required (`isRequired = true` siempre); el root prevalece sobre `requested.action='not_required'`.
- **Reglas de valor presente (referencia de contrato):** dropdown/dropdown-choice/select-button ⇒ objeto con `id`/`value` no vacío; input-text/textarea/date/time/input-number ⇒ valor ≠ null y ≠ ''; multi-select/tree-select ⇒ arreglo con ≥ 1 elemento. En esta iteración se delega en `Validators.required` (cubre null/''/arreglo vacío) y en el control `object_*` para dropdowns.
- **UX:** `scope=server + edit=false` ⇒ child automático/solo-lectura; `scope=server + edit=true` ⇒ editable pero no obligatorio antes del submit.

#### Nodos nuevos / helper

| Elemento | Ubicación | Notas |
|---|---|---|
| `_collectChildScopeRegistry(root)` | `crud.class.ts` | Escanea el layout y mapea `child_key → { scope, edit }` desde `<padre>.children.fields.*`. |
| `_childRequiredPolicy(...)` | `crud.class.ts` | Decide `applyRequired`/`readOnly` por prefijo + root + `scopeInfo` (declaración del padre). |
| `lockRequired` (runtime) | `custom-draw-form.component.ts` (`_processChildrenFields`) | Impide que `activate`/`requested` relajen un root `required=true` en `scope=client`. |

- **Validación:** `get_errors` sin errores en `crud.class.ts` ni `custom-draw-form.component.ts`. Pendiente validación funcional en navegador (children `form_fields_data_*`/`parent_form_data_*` con `scope=client` required y `scope=server`).
