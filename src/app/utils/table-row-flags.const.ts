/**
 * [[[II ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01
 * Fuente única de las banderas de metadato local que se adjuntan a los
 * `FormGroup` de fila de tabla dinámica. Se comparten entre tres consumidores
 * que deben coincidir en la MISMA cadena para reconocer las filas:
 *   - `dynamic-table-field.component.ts`: lee la fila fuente y la marca draft.
 *   - `custom-draw-form.component.ts`: crea/reemplaza la vista previa derivada.
 *   - `crud.class.ts`: elimina drafts y agrega filas persistidas tras el POST.
 *
 * Antes vivían como string literal duplicado en los tres archivos; si una copia
 * divergía, el reconocimiento de filas draft/source se rompía en silencio.
 *
 * - `TABLE_ROW_SOURCE_FLAG`: guarda el objeto fuente original de la fila
 *   (incluye el id del registro) fuera de `getRawValue()` / payload.
 * - `DERIVED_TABLE_DRAFT_FLAG`: marca una fila de vista previa derivada del
 *   autocomplete (nunca persistida; se retira antes de agregar la real).
 * ]]]FI
 */
export const TABLE_ROW_SOURCE_FLAG = '__bosTableRowSource';
export const DERIVED_TABLE_DRAFT_FLAG = '__bosDerivedTableDraft';
