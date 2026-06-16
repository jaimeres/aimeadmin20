# Listbox embebido para custom-draw-form

- Fecha: 2026-06-01
- Consecutivo: 007
- Tipo: Cambio funcional

## Resumen

Se implementa un nuevo tipo `listbox` en `custom-draw-form` para reutilizar la lógica de campos tipo selección múltiple sin depender de un panel desplegable.

El nuevo control soporta dos modos:

1. Listbox plano con filtro local para catálogos sin `tree`.
2. Listbox agrupado para configuraciones que sí declaran `tree`, usando cada nodo padre como grupo visible.

## Alcance

- Renderizar `type: 'listbox'` en `custom-draw-form.component`.
- Reutilizar la precarga de opciones y el contrato de payload de los dropdown-like fields.
- Convertir árboles cargados para `tree-select` a grupos compatibles con `p-listbox`.
- Mantener hidratación y serialización en edición cuando el campo `listbox` usa `tree.serialization`.
- Exponer el tipo en esquemas locales para configuración del draw form.

<a id="escenario-01"></a>
## Escenario 01: Listbox plano con filtro local

- Objetivo: cuando el campo `listbox` no declara `tree`, el control debe renderizarse como una lista visible con checkboxes y filtro local, similar al ejemplo de `requesters/solicitantes`.
- Decisión: el `Listbox` usa `multiple`, `checkbox`, `metaKeySelection=false` y `optionValue` por `id` para conservar un flujo simple de edición y selección.
- Filtro: por defecto queda activado en este modo, salvo que `filter_local` lo desactive explícitamente.

<a id="escenario-02"></a>
## Escenario 02: Listbox agrupado desde tree

- Objetivo: cuando el campo `listbox` sí declara `tree`, el control debe renderizarse agrupado como en el caso de `responsible_persons`, usando el nodo padre como encabezado de grupo y los hijos seleccionables como items.
- Decisión: los nodos raíz se transforman a grupos `items[]` compatibles con PrimeNG Listbox.
- Lazy load: si el árbol usa `tree.lazy`, se reutiliza la resolución de hijos para precargar ramas visibles antes de construir los grupos.
- Serialización: cada item agrupado conserva un `__serialized` con la metadata necesaria para `tree.serialization`.

<a id="escenario-03"></a>
## Escenario 03: Contrato de form, payload e hidratación

- Objetivo: que `listbox` se comporte como un dropdown-like field completo, no solo como template visual.
- Decisión:
  - `listbox` entra en `DROPDOWN_TYPES_PAYLOAD` y `DROPDOWN_TYPES_PRELOAD`.
  - `generateJSONform` crea `object_<field>` para `listbox`, igual que en `dropdown`, `multi-select` y `tree-select`.
  - En modo `tree`, la hidratación de edición reconstruye items enriquecidos con `id`, `label`, `parent`, `raw` y `__serialized`.
  - `validateRelationships()` reutiliza la serialización rica cuando `listbox` trae `tree.serialization`.

<a id="escenario-04"></a>
## Escenario 04: Selección en listbox agrupado sin recarga dinámica

- Objetivo: cuando el `listbox` declara `tree`, seleccionar un item no debe volver a ejecutar la cascada de `children.fields`.
- Decisión: `onChangeDropdown()` conserva la emisión del cambio y la sincronización de campos espejo, pero retorna antes de `_processChildrenFields(...)` para `listbox` con `tree`.
- Motivo: en este modo los `children.fields.dynamic` forman parte de la carga/precarga del árbol agrupado; reutilizarlos en cada selección provoca consultas adicionales al servidor.

<a id="escenario-06"></a>
## Escenario 06: Normalizar valor multiple antes de renderizar

- Objetivo: evitar que PrimeNG `p-listbox` reciba un valor escalar u objeto cuando el template lo configura con `multiple=true` y `checkbox=true`.
- Problema observado: en edición, algunos campos `listbox` podían restaurarse desde el backend como objeto o id suelto; PrimeNG espera array y ejecuta `.some()` internamente, provocando `TypeError: ... some is not a function`.
- Decisión: `custom-draw-form` normaliza los controles `type: 'listbox'` a array en tres momentos: cambio de `FormGroup`, cambio de `drawForm` y cambios de valor del formulario. La corrección usa `emitEvent:false` para no disparar cascadas ni autoguardado innecesario.
- Alcance: no se cambia `CRUD`, no se cambia el payload final y no se modifica la estructura del formulario; solo se garantiza el contrato esperado por el componente visual de PrimeNG.

<a id="escenario-07"></a>
## Escenario 07: Límite de selección por configuración

- Objetivo: respetar `selection_limit` en campos de selección múltiple del formulario dinámico sin modificar `crud.class.ts`.
- Regla: `selection_limit` `0`, `null`, vacío o inválido significa sin límite. `dropdown` y `dropdown-choice` ignoran esta propiedad porque su template es de selección única.
- Listbox: cuando `selection_limit` es `1`, el template usa `[multiple]="false"` y `[checkbox]="false"` para que PrimeNG aplique la restricción nativa; si el valor restaurado venía como array, se conserva el primer elemento. Cuando el límite es mayor que `1`, el componente recorta selecciones excedentes y avisa que se alcanzó el límite.
- Multi-select: mantiene el control múltiple y aplica el recorte en `onChangeDropdown()` para mostrar aviso cuando el usuario intenta superar el límite.
- Tree-select con `tree`: el límite se aplica por nivel (`data.__level`/`__level`), de modo que puede seleccionar hasta `selection_limit` nodos en cada nivel del árbol.
- Estado de UI: `selectionMultipleSignal` publica el modo de selección por campo para evitar llamadas de métodos desde el template y mantener el render estable.

## Validaciones aplicadas

- Revisión de la API de PrimeNG Listbox para `group`, `checkbox`, `filter`, `dataKey` y `optionValue`.
- Compilación Angular con `npm run build` correcta; solo quedan warnings existentes de presupuesto, CommonJS y stylesheet no localizado.
- `git diff --check` sin errores para la corrección de selección en `listbox` agrupado.
- `npx tsc --noEmit` no completo por fallas preexistentes fuera del cambio: specs que importan `../../../testing/crud-test.helpers` inexistente y errores previos en `src/app/auth/components/biometric-setup.component.ts` por acceso a `username` sobre un `Signal`.
- Corrección de valor no-array en edición: pendiente validar manualmente en navegador; debe eliminar el error `some is not a function` de `primeng-listbox`.
- Límite `selection_limit`: pendiente validar manualmente en navegador con listbox `1`, listbox `2`, multi-select `2` y tree-select con límite por nivel.

## Archivos modificados

- `docs/documents/2026-06-01_007_custom-draw-form-listbox.md`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.scss`
- `src/app/utils/dropdown-types.const.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/components/custom-local-settings/custom-local-settings.component.ts`
- `src/app/components/custom-local-settings/type-schemas.ts`

## Pruebas sugeridas

1. Campo `type: 'listbox'` sin `tree` con filtro local y selección múltiple.
2. Campo `type: 'listbox'` con `tree` y grupos visibles por nivel raíz.
3. Edición de un registro existente con items ya seleccionados en `listbox` agrupado.
4. Guardado de un campo `listbox` con `tree.serialization` y verificación del payload JSON:API resultante.
5. Selección de items en `listbox` con `tree` sin requests adicionales por cada click.
