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

/**
 * [[[II ESC:036-02 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-02
 * Sufijo bajo el que la fila retiene la VERSIÓN del registro origen dentro de
 * `TABLE_ROW_SOURCE_FLAG` (`<columna origen>__source_version`). Misma convención
 * que `<campo>__name` y, por el mismo motivo que las banderas de arriba, vive
 * aquí: lo escribe `dynamic-table-field.component.ts` al elegir el origen y lo
 * lee `crud.class.ts` al armar `data.meta.sources`. Si las dos copias
 * divergieran, la conversión viajaría sin `source_version` y el servidor la
 * rechazaría con `source_version_conflict`.
 * ]]]FI
 */
export const TABLE_ROW_SOURCE_VERSION_SUFFIX = '__source_version';

/**
 * [[[II ESC:036-07 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-07
 * Prefijo bajo el que se conserva el valor CRUDO de un atributo antes de que
 * `DJAtoObject` lo formatee para mostrar.
 *
 * `created_at` y `modified_at` salen del aplanado como texto local
 * (`02/08/2026 04:30:00`), que es correcto para la pantalla e inservible como
 * `source_version`: el servidor lo lee con `parse_datetime()` y rechazaría la
 * conversión con `source_version_conflict`. La versión tiene que viajar tal como
 * la emitió el servidor.
 * ]]]FI
 */
export const RAW_ATTRIBUTE_PREFIX = '__bosRaw_';
