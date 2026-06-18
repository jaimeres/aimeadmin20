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
- `src/app/components/custom-local-settings/type-schemas.ts`
- `src/app/tasks/task/task.component.ts`
- `src/app/tasks/task/task.component.html`
- `docs/documents/2026-06-14_023_task-personalized-opennew.md`

### Pendientes
- Ampliar el schema avanzado para cubrir todo el catalogo BOS adjunto.
- Validar manualmente dropdown remoto, tree-select, firma y tablas antes de habilitarlos en el selector principal.

<a id="escenario-03"></a>
## Escenario 03: Limpieza visual y contrato JSON de child_form_fields

### Problema
La primera version del builder exponia nombres tecnicos al usuario, mostraba el JSON siempre, perdia foco al escribir la etiqueta por reconstruccion del input y generaba `draw.general` en lugar del contrato esperado con `draw.grid`.

### Decision
Se reorganiza el builder para trabajar visualmente con nombre de formulario, clave de campo sin prefijo, selects de ancho por celdas, booleanos principales con icono y tooltip, configuracion avanzada en linea y vista previa automatica con `app-custom-draw-form`. El JSON queda oculto en un boton y se muestra con la estructura envuelta `{ child_form_fields: ... }` para revision, mientras el control del formulario conserva el objeto interno que consume el detalle. La configuracion avanzada no duplica los controles principales de la fila y el editor de campos usa un grid plano tipo `custom-draw-form`, sin tarjetas anidadas.

### Alcance
- `draw.grid` guarda referencias `{ field }` en el JSON persistido.
- La vista previa reconstruye un `draw.grid` completo con la configuracion de `fields` para que `app-custom-draw-form` pueda renderizar todos los campos.
- `ngOnChanges` ignora el mismo objeto emitido por el builder para no reconstruir filas al escribir.
- El parser acepta tanto el objeto interno de `child_form_fields` como el JSON envuelto.
- Se agrega lista de tipos basada en el catalogo BOS adjunto y valores base para tipos comunes.
- El panel avanzado filtra `label`, `field`, `class`, `class_md`, `required`, `hide`, `readonly`, `autofocus` y `cols.*` porque esos campos ya se editan en la fila principal.
- Los controles del builder y del panel avanzado usan celdas `col-span-6 md:col-span-3`; los textos explicativos se movieron a tooltips de ayuda.
- Los booleanos principales usan toggles de solo icono con tooltip.
- La posicion se reordena con drag/drop usando el indicador sobrepuesto como asa de arrastre.
- Las opciones avanzadas quedan dentro de cada campo principal en un acordeon.
- Los campos numericos avanzados usan `col-span-2 md:col-span-2`; los campos de alto/ancho se capturan sin `px` en UI y se guardan con `px` cuando el contrato lo requiere.
- Los campos de icono avanzados se seleccionan desde una lista desplegable.
- Las dependencias `showIf` ya no ocultan controles: los mantienen visibles y deshabilitados hasta que aplique la condicion.
- El editor deja de usar `ngModel` y helpers invocados desde el HTML; la edicion se maneja con formularios reactivos y un modelo de vista ya calculado desde TypeScript.
- La vista previa se alimenta directamente desde las filas actuales con el contrato `drawForm.grid`; el formulario avanzado se ata al contenedor real de controles y la seleccion de una fila ya activa no vuelve a resetear los controles al hacer clic dentro de ella.
- Los controles reactivos de opciones avanzadas ya no usan el `path` con puntos como nombre de control. Se genera un nombre seguro para Angular y se conserva el `path` original solo para escribir el JSON, evitando que `default.active`, `scanner.active` y similares rompan el `FormGroup` en runtime.
- Los anchos por defecto se normalizan a movil `col-span-6` y escritorio `md:col-span-3`; la UI muestra "Escritorio" contra `class_md` y "Movil" contra `class` para no invertir el contrato responsive.
- Las etiquetas de booleanos avanzados quedan definidas por `path` en TypeScript, sin concatenar textos como `No ...`.
- Los estilos locales que afectan internals de PrimeNG usan `:host ::ng-deep`; el padding del acordeon se aplica sobre `.advanced-accordion` y sobre las clases internas del header, porque `:root` dentro del SCSS encapsulado no alcanza al componente renderizado.

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
- Validar manualmente el clic sobre campos complejos de la vista previa porque la capa de seleccion es transparente y no ejecuta acciones reales del formulario.
- Si se requiere editar absolutamente todas las propiedades del catalogo BOS desde controles dedicados, ampliar `type-schemas.ts`; por ahora el builder conserva claves existentes y expone las principales por tipo.

<a id="escenario-04"></a>
## Escenario 04: Evitar compilacion JIT del builder en desarrollo

### Problema
Al abrir `/tasks/task`, el dev server podia intentar compilar `ChildFormFieldsBuilderComponent` con JIT y fallar porque `@angular/compiler` no esta disponible en runtime. El build AOT si generaba `static ɵcmp`, por lo que el problema apuntaba al modo/carga de desarrollo.

### Decision
Se fuerza AOT en la configuracion de build para que `ng serve` y `ng build --configuration development` no dependan del compilador JIT. Tambien se cambia la ruta secundaria `/apps/task` para cargar `TaskComponent` con specifier relativo en lugar del alias `@/...`, evitando que Vite/HMR pueda mantener dos instancias del mismo componente en el grafo.

### Validaciones aplicadas
- Compilacion Angular con `npm run build -- --configuration development`.
- Compilacion Angular con `npm run build`.

### Archivos modificados
- `angular.json`
- `src/app/apps/apps.routes.ts`
- `docs/documents/2026-06-14_023_task-personalized-opennew.md`

### Pendientes
- Reiniciar `ng serve` para limpiar el cache/HMR del servidor que ya estaba levantado antes de este cambio.
