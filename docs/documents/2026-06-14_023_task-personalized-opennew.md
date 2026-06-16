# Task personalizedTask en openNew

- Fecha: 2026-06-14
- Consecutivo: 023
- Tipo: Cambio funcional

## Resumen de solicitud
Modificar `override openNew(e: any)` en tareas para que, una vez cargada la configuracion/formulario, inicialice `personalizedTask` o consulte directamente el formulario para detectar el cambio.

## Alcance
- Ajustar solo `TaskComponent`.
- Mantener el flujo base de `CRUD.openNew`.
- No modificar templates ni la clase base CRUD.

<a id="escenario-01"></a>
## Escenario 01: Sincronizar personalizedTask desde el formulario

### Problema
`TaskComponent.openNew()` llamaba `super.openNew(e)` y luego fijaba `personalizedTask` en `false`. Si la configuracion o el OPTIONS terminaban de cargar despues, el estado local podia quedar desalineado con el control `is_detail_required` del formulario.

### Decision
Despues de `super.openNew(e)`, `openNew` llama a `syncPersonalizedTaskFromForm()` para leer el valor real del control `is_detail_required`. Si el formulario aun no existe, el helper reintenta de forma acotada mientras termina la carga asincrona.

### Validaciones aplicadas
- Compilacion Angular con `npm run build`.

### Archivos modificados
- `src/app/tasks/task/task.component.ts`
- `docs/documents/2026-06-14_023_task-personalized-opennew.md`

### Pendientes
- Validar manualmente alta de tarea cuando OPTIONS no esta cacheado y cuando ya esta cacheado.

### Pruebas sugeridas
1. Abrir alta de tarea desde cero y confirmar que la pestaña Personalizar refleja `is_detail_required`.
2. Cambiar el toggle y confirmar que `personalizedTask` cambia por `onChangeToggle`.
3. Cerrar y volver a abrir alta para confirmar que se reinicializa desde el formulario nuevo.

<a id="escenario-02"></a>
## Escenario 02: Builder de child_form_fields con vista previa

### Problema
`child_form_fields` ya era consumido para representar campos en `task-detail`, pero no existia una UI para diseñar esos campos desde la tarea padre antes de guardar.

### Decision
Se agrega un componente standalone `ChildFormFieldsBuilderComponent` para diseñar campos `parent_form_data_*`, generar el JSON `{ fields, draw }` esperado por `openTasksDetail()` y previsualizarlo con `app-custom-draw-form` antes de enviarlo al servidor.

### Alcance
- La primera version soporta campos comunes: texto, textarea, numero, toggle, fecha, hora, opciones locales, multi-choice y files.
- El builder fuerza el prefijo canonico `parent_form_data_`.
- La vista previa adapta el `draw.general` generado al formato `{ grid: ... }` que consume `app-custom-draw-form`.
- `TaskComponent.save()` sincroniza el draft con el control `child_form_fields` antes de guardar.

### Validaciones aplicadas
- Compilacion Angular con `npm run build`.

### Archivos modificados
- `src/app/components/child-form-fields-builder/child-form-fields-builder.component.ts`
- `src/app/components/child-form-fields-builder/child-form-fields-builder.component.html`
- `src/app/components/child-form-fields-builder/child-form-fields-builder.component.scss`
- `src/app/tasks/task/task.component.ts`
- `src/app/tasks/task/task.component.html`
- `docs/documents/2026-06-14_023_task-personalized-opennew.md`

### Pendientes
- Ampliar el schema avanzado para cubrir todo el catalogo BOS adjunto.
- Validar manualmente dropdown remoto, tree-select, firma y tablas antes de habilitarlos en el selector principal.
