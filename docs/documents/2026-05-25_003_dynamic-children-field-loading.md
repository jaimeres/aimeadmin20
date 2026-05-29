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
  1. **Fuente de datos automática:** si `data_type.type` resuelve `app/type` ⇒ se consulta al servidor; en caso contrario se usan `options` locales (`fieldConfig.options` o `data_type.options`). Aplica a `static`, `dynamic` y `derived` (este último con `derived.from: 'server'`).
  2. **Filtro de servidor** (`_buildChildServerFilter`): combina `data_type.filter` (entradas `forced` reciben el valor del padre; `active` se respetan) con las `filter.conditions` de scope `server`/`auto` que sean mapeables a operador de servidor.
  3. **Filtro de cliente** (`_applyClientFilter`): aplica las `conditions` con scope `client`/`auto` no resueltas en servidor, más el filtro implícito por `filter_group` declarado (solo fuente local).
  4. **result_position** (`_applyResultPosition`): `'all'` (default), `'first'`, `'last'` o índice numérico. **Ya no se asume `'first'`** (arregla REGIÓN→PLAZA que requería mostrar todas las coincidencias).
  5. **Publicación + auto_select** (`_publishChildOptions`): normaliza, publica en `dropdownOptionsSignal` y, si `auto_select: true`, fija el control con el primer resultado, sincroniza el campo espejo y **dispara la cascada del propio hijo recursivamente** (resuelve asset→workshop→cluster sin clic intermedio; profundidad máx. `_MAX_CASCADE_DEPTH = 6`).
  6. `default_field`: valor por defecto cuando no hay coincidencias.
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
| `filter_group` ausente ⇒ comportamiento variable | `filter_group` default `'id'` en los 3 modos | También es el default de `conditions[*].value_key`. |
| `static` sin acceso a servidor | `static` usa servidor si trae `data_type.type` | Unificado con `dynamic`. |
| `derived` solo copia del padre | `derived.from: 'parent' | 'server'` | `'server'` consulta y copia `field_name` del primer registro. |
| `dynamic` se bloquea sin valor del padre | Consulta igualmente; `forced` se omite si no hay valor | "no debe limitar a sus padres". |

#### Diccionario completo de nodos de `children.fields.<modo>.<key>`

`<modo>` ∈ `static` | `dynamic` | `derived`. `<key>` es el nombre del campo hijo (se renombra a `object_<key>` para tipos dropdown-like).

| Nodo | Tipo | Valores posibles / formato | Default | Aplica a | Notas / exclusiones |
|---|---|---|---|---|---|
| `type` | string | `dropdown` `dropdown-choice` `autocomplete` `tree-select` `input` `date` … | — | 3 modos | Tipo de control. Define si es dropdown-like (se renombra a `object_*`). |
| `field` | string | nombre del campo | `<key>` | 3 modos | Se sincroniza con `object_<key>` en `addFieldsByPrefix`. |
| `option_value` | string | nombre de propiedad | `'id'` | static, dynamic | Valor que se guarda en el control. |
| `option_label` | string | propiedad o lista separada por comas | `'name'` | static, dynamic | Etiqueta visible. |
| `filter_group` | string | propiedad del padre/opción | `'id'` | 3 modos | Valor del padre para filtrar y default de `conditions[*].value_key`. |
| `result_position` | string \| number | `'all'` `'first'` `'last'` \| índice ≥ 0 | `'all'` | static, dynamic | También aceptado en `filter.result_position`. |
| `auto_select` | boolean | `true` \| `false` | `false` | static, dynamic | Autollena con el primer resultado y dispara cascada recursiva. Reemplaza `selected`. |
| `default_field` | any | valor literal | — | static, dynamic | Valor a fijar si no hay coincidencias. |
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
| **`filter`** | object | ver sub-nodos | — | static, dynamic | Filtro declarativo por condiciones. |
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
| `field_name` | string | propiedad del padre / registro servidor | — | **solo derived** | Atributo a copiar al control. |
| **`derived`** | object | ver sub-nodos | — | **solo derived** | Configuración de copia. |
| `derived.from` | string | `'parent'` \| `'server'` | `'parent'` | derived | `'server'` consulta (limit 1) y copia `field_name`. |
| `derived.field_name` | string | propiedad | (usa `field_name` top-level) | derived | Alternativa a `field_name` top-level. |
| `derived.fallback` | any | valor literal | — | derived | Valor si no hay dato. |

##### Nodos excluyentes (resumen)

- `options` (local) **vs** `data_type.type` (servidor): si `data_type.type` resuelve un recurso, la fuente es el servidor y `options`/`data_type.options` se ignoran.
- `data_type.filter.<campo>.forced` **vs** `active`: `forced` toma prioridad (inyecta valor del padre); `active` sin `forced` es filtro estático.
- `filter.conditions[*].value` **vs** `values`: usar uno u otro según el operador (escalar vs lista/rango).
- `field_name` / `derived.*` solo tienen efecto en modo **derived**; `options`/`data_type`/`filter`/`result_position`/`auto_select` no aplican a `derived` con `from: 'parent'`.

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
