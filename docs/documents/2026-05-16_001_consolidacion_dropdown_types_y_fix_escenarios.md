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

## Pendientes

- °°° Revisar por qué varios campos del formulario se vuelven `null` después de inicializarse con `default.value` distinto de `null`.
- °°° Revisar específicamente rutas de `reset()` reutilizando `formTempo[pos]`, activación condicional en `custom-draw-form.component.ts` y limpieza de multimedia al remover el último archivo.

## Archivos modificados

- `src/app/utils/services/crud.service.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/crud.class.ts`
