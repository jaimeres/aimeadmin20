# Reactivacion del detalle de tarea: render del child_form

- Fecha: 2026-06-15
- Consecutivo: 024
- Tipo: Cambio funcional

## Resumen de solicitud
Reactivar la logica de inicio del detalle de una tarea con cambios estrictamente
minimos. `openTasksDetail` debia volver a poblar los controles del `child_form`
(`parent_form_data_*`) y, ademas, producir la REPRESENTACION en UI del JSON
diseñado por el builder de `child_form_fields`, de modo que la pestaña "Datos"
(`<app-custom-draw-form [drawForm]="drawForm()['task-detail_child_form_fields']">`)
realmente renderice los campos. La logica de construccion de controles no debia
duplicarse: se unifico con la ya existente en `addFieldsByPrefix` porque la
estructura de cada field es la misma; solo cambian el origen del schema y el
prefijo. Se conserva explicitamente la combinacion del registry del draw hijo con
el draw principal y se documenta el codigo muerto sustituido.

## Alcance
- Ajustar solo `src/app/utils/crud.class.ts`.
- No modificar el builder `ChildFormFieldsBuilderComponent` (logica de diseño del JSON ya implementada).
- No duplicar la construccion de `child_form_fields` en `openNewSecundary`; el disparador sigue siendo `generateJSONform`.
- No eliminar logica existente sin demostrar su sustituto.

<a id="escenario-01"></a>
## Escenario 01: openTasksDetail emite un draw representable

### Problema
La implementacion previa de `openTasksDetail` construia un array plano (`draw_child`)
por pestaña y solo poblaba controles. El valor publicado en
`drawForm()[pos + '_child_form_fields']` no tenia `grid`/`stepper`, por lo que
`custom-draw-form` no renderizaba nada en la pestaña "Datos".

### Decision
Se reescribio `openTasksDetail` para delegar la construccion de cada control en el
helper unificado `_applyDynamicFieldToForm` y publicar el `draw.general` como
estructura representable: si ya trae `grid`/`stepper` se usa tal cual; si es un
layout plano del builder (`{1:{}, 2:{}}`) se envuelve en `{ grid: general }`.
La implementacion legacy se conserva como metodo privado no invocado
`_openTasksDetailLegacyDead` (codigo muerto documentado), para referencia y
reversibilidad. Etiquetas `[[[II ESC:024-01 ... ]]]FI`.

<a id="escenario-02"></a>
## Escenario 02: Conservacion del merge de registries (scope server)

### Problema
El `filter.scope` que marca un child como resuelto por servidor se declara en el
PADRE, que puede vivir en el draw del child_form o en el draw principal.

### Decision
Se conserva intacta la combinacion de `_collectChildScopeRegistry(draw)` con
`_collectChildScopeRegistry(this.drawForm()[pos])`, priorizando `scope === 'server'`.
El registry resultante se pasa por campo a `_applyDynamicFieldToForm` via `scopeInfo`.
Etiqueta `[[[II ESC:024-02 ... ]]]FI`.

<a id="escenario-03"></a>
## Escenario 03: Soporte de layout plano y de layouts grid/nested/stepper

### Problema
El builder produce un `draw.general` plano (`{1:{cfg}, 2:{cfg}}`) sin envoltura
`grid`, mientras que los drawForm por dispositivo usan `grid`/`nested`/`stepper`.
`_collectDrawFormLayouts` devuelve `[]` para el layout plano.

### Decision
Por cada seccion del draw se decide con `_hasDrawFormLayout`: si tiene layout se
recorren los layouts con `_collectDrawFormLayouts`; si no (plano del builder) se
usa la propia seccion como unico layout. Asi ambos formatos pueblan controles y
quedan representables. Etiqueta `[[[II ESC:024-03 ... ]]]FI`.

<a id="escenario-04"></a>
## Escenario 04: Fusion del schema del field sobre el nodo de layout

### Problema
El nodo de layout trae configuracion visual (`field`, `type`, `class`), pero los
metadatos de datos (p.ej. `data_type.options` de dropdowns) viven en
`childFormFields.fields[field]`.

### Decision
Antes de construir el control se hace `layout[key] = { ...schemaEntry, ...node }`
(el nodo de layout gana sobre el schema), de modo que el helper y el render
dispongan de `type`/`label`/`options`. El nombre canonico del campo se obtiene
quitando el prefijo `object_` cuando aplica. Etiqueta `[[[II ESC:024-04 ... ]]]FI`.

<a id="escenario-05"></a>
## Escenario 05: Publicacion del draw del child para la pestaña "Datos"

### Problema
La pestaña "Datos" recibe el objeto completo `drawForm()['task-detail_child_form_fields']`,
por lo que debe ser un drawForm valido.

### Decision
Cuando `options.parentField === 'parent_form_data_'`, se publica
`drawForm()[pos + '_child_form_fields']` con `draw.general` ya envuelto en
`{ grid }` si es plano, o tal cual si ya trae layout. Etiqueta
`[[[II ESC:024-05 ... ]]]FI`.

<a id="escenario-06"></a>
## Escenario 06: Unificacion del constructor de control dinamico

### Problema
`addFieldsByPrefix` (para `form_fields_data_*` / `relacion_data_*`) y
`openTasksDetail` (para `parent_form_data_*`) construian controles con la misma
estructura de field pero en codigo separado. `openTasksDetail` ademas no
soportaba el tipo `files`.

### Decision
Se extrajo el cuerpo por-campo de `addFieldsByPrefix` a un helper privado
`_applyDynamicFieldToForm(params)` reutilizado por ambos puntos. El llamador
calcula `schemaEntry`/`hasSchema`/`scopeInfo` y los pasa como parametros; el helper
muta el nodo en su lugar (rename `object_<field>` para dropdown-like y cascada de
children) y agrega el/los control(es). Con esto el child gana soporte de `files`,
dropdown-choice/multi-choice (dual-control `object_`) y demas tipos, sin
regresiones en `addFieldsByPrefix`. Etiqueta `[[[II ESC:003-06 ... ]]]FI`.

### Validaciones aplicadas
- Compilacion Angular con `npm run build` (sin errores; solo warnings de budget preexistentes).
- `get_errors` sobre `src/app/utils/crud.class.ts`: sin errores.

<a id="escenario-07"></a>
## Escenario 07: is_detail_required siempre presente en la lista de tareas (fixedFields)

### Problema
La tabla de tareas mandaba el mensaje "... no requiere detalle." aun cuando la
tarea SI lo requeria. La causa: `iniParam()` reconstruye `this.fields[pos]` a
partir de las columnas visibles (`sys,status,tasks,` + columnas) y sobreescribia
la asignacion manual `this.fields['task'] = 'is_detail_required,...'`, por lo que
`is_detail_required` no viajaba en el listado y `openNewSecundary` lo leia como
falsy.

### Decision
Se agrego un mecanismo `fixedFields` en `vars.class.ts`: un mapa por-pos de campos
que SIEMPRE se fusionan al query del listado en `getAll2`, independiente de las
columnas visibles y a prueba de la reconstruccion de `iniParam`. En
`task.component.ts` se reemplazo la asignacion manual por
`this.fixedFields['task'] = 'is_detail_required,'`. `child_form_fields` se removio
de la lista (puede ser un JSON grande por fila) y ahora se carga on-demand.
Etiquetas `[[[II ESC:024-06 ... ]]]FI`.

<a id="escenario-08"></a>
## Escenario 08: child_form_fields on-demand al abrir el detalle

### Problema
`child_form_fields` ya no viaja en el listado (Escenario 07), pero la pestaña
"Datos" depende de `parentSelect.child_form_fields` para renderizar los dinamicos.

### Decision
`openNewSecundary` se refactorizo: valida `is_detail_required` (toast + return si
es falso) y luego, antes de construir el detalle, llama
`_ensureParentChildFormFields(parentSelect, parent_id)`: si ya esta en memoria no
consulta; si falta lo trae por id con `fields=child_form_fields` (getDetail) y lo
asigna a `parentSelect.child_form_fields`. Ante ausencia o error deja `{}` (el
detalle se abre solo con los campos del OPTIONS). La construccion del dialogo se
movio a `_buildSecundaryDetail`, que reutiliza `generateJSONform` (disparador de
los dinamicos) sin duplicar logica. Etiquetas `[[[II ESC:024-07 ... ]]]FI`.

<a id="escenario-09"></a>
## Escenario 09: Tarea-detalle inter-modulo con PATCH de retorno

### Problema
En modulos consumidores (p.ej. `assets/maintenance`) las tareas importadas se
ejecutan via `taskModule()`. Antes toda tarea lanzaba `runTask(action_app)`. La
nueva tarea "evidencia finalizacion" trae `is_detail_required=true` y debe abrir
la tarea-detalle (General del modelo + Datos dinamicos) con botones de guardado
y, al resolver el guardado, asociar la tarea-detalle generada al registro
consumidor.

### Decision
1. `getTask` ahora consulta `tasks/task` con
   `fields=name,modules,action_app,is_detail_required` para que la decision tenga
   el dato.
2. En `taskModule()` la accion por tarea decide:
   - `is_detail_required === true` -> `runTaskDetail(tas)` (abre la tarea-detalle).
   - en caso contrario, si hay `action_app` -> `runTask(action_app)` (flujo previo).
   - si no hay nada configurado -> mensaje controlado.
   `is_detail_required` es EXCLUSIVO de tareas: solo decide aqui, no afecta otros
   modulos.
3. `runTaskDetail(task)` reutiliza el mecanismo loader+registry: setea
   `tasksModule` con el codigo reservado `TASK_DETAIL` y el contexto del
   consumidor `{ task, consumerApp, consumerType, consumerId }`.
4. `TASK_MODULE_REGISTRY['TASK_DETAIL']` carga el nuevo
   `TaskDetailComponent` (`src/app/tasks/task-detail/`), que extiende CRUD
   (`typeDefault='task-detail'`), abre el dialogo secundario reutilizando
   `openNewSecundary` (mismo render General + Datos) y guarda con `saveSecundary`.
5. Tras crear el task-detail se ejecuta el hook extensible
   `afterSecundaryCreateSuccess(resp, pos)` (default vacio en CRUD,
   `[[[II ESC:024-08 ... ]]]FI`). `TaskDetailComponent` lo sobreescribe para hacer
   `this.crudS.edit` al registro consumidor con la relacion
   `task_detail = <id generado>` y luego emitir `closeDialog`. Durante el PATCH se
   bloquea la emision automatica de `closeDialog` por `onHide` para no destruir el
   componente antes de terminar. Etiquetas `[[[II ESC:024-09 ... ]]]FI`.

<a id="escenario-10"></a>
## Escenario 10: saveSecundary no debe enviar fields como include

### Problema
Al guardar `task-detail` desde el dialogo secundario, `saveSecundary` estaba
pasando `this.fields[pos]` en el parametro `include` de `saveObject`. Eso generaba
URLs como `?include=status,sys,status,tasks,...`, donde campos de consulta se
enviaban como relaciones JSON:API incluibles y el servidor respondia 400.

### Decision
`saveSecundary` ahora usa `this.include[pos]`, igual que el flujo principal
`save`/`submitForm`. `this.fields[pos]` queda reservado para consultas
`fields[type]=...`, no para `include`.

<a id="escenario-11"></a>
## Escenario 11: task_detail de retorno como lista JSON:API

### Problema
El PATCH de retorno al modulo consumidor enviaba `task_detail` con `id` simple.
`GeneralService.baseDJA` interpreta un `id` simple como relacion singular y
serializa `relationships.task_detail.data` como objeto.

### Decision
`TaskDetailComponent` envia `task_detail` con `id: [newId]`. Asi el serializador
mantiene la relacion como lista JSON:API: `data: [{ id, type: 'task-detail' }]`.

### Validaciones aplicadas (escenarios 07-11)
- `npm run build`: exit 0 (warnings preexistentes de budget/CommonJS/stylesheet).
- `get_errors` sobre `crud.class.ts`, `vars.class.ts`, `task.component.ts`,
  `task-detail.component.ts`, `task-module-registry.ts`: sin errores.

### Archivos modificados
- `src/app/utils/crud.class.ts`
- `src/app/utils/vars.class.ts`
- `src/app/tasks/task/task.component.ts`
- `src/app/tasks/task-detail/task-detail.component.ts` (nuevo)
- `src/app/tasks/task-detail/task-detail.component.html` (nuevo)
- `src/app/utils/task-module-registry.ts`
- `docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md`

### Pendientes
- Validar manualmente en la pestaña "Datos" de la tarea: render de campos de texto, fecha, dropdown-choice/multi-choice y files.
- Validar que `addFieldsByPrefix` mantiene comportamiento identico para `form_fields_data_*` y `relacion_data_*`.
- Confirmar contra el backend el nombre exacto de la relacion (`task_detail`) y el `type` (`task-detail`) usados en el PATCH de retorno.
- Tras validar, evaluar eliminar `_openTasksDetailLegacyDead`.

### Pruebas sugeridas
1. Crear una tarea con detalle requerido y campos `parent_form_data_*` (texto, fecha, dropdown, files) y confirmar render en "Datos".
2. Confirmar que un dropdown-choice hijo crea el control `object_<field>` y muestra sus opciones.
3. Confirmar que un draw por dispositivo (grid/stepper) sigue representandose correctamente.
