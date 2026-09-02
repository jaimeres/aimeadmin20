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

/**
 * [[[II ESC:057-52 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-52
 * Marca la fila que NO existe en el servidor como partida de ESTA tabla: entró
 * porque se jaló de un documento INFERIOR y sólo se materializa cuando el
 * servidor ejecuta la conversión.
 *
 * Quitarla es un acto LOCAL: el registro que se ve pertenece al documento de
 * abajo, que debe quedar intacto. Sin esta marca, el borrado de fila mandaba un
 * DELETE con el id de la partida ORIGEN contra el recurso de la tabla destino —
 * la petición no correspondía a ningún registro de ese recurso, fallaba, y el
 * manejador de error volvía a insertar la fila: la partida no había forma de
 * quitarla.
 *
 * Una fila capturada A MANO no lleva la marca y conserva su comportamiento: si
 * ya está guardada, borrarla sí es un DELETE al servidor.
 *
 * PRESENCIA = es fila de origen. Lo que guarda dentro NO lo interpreta la tabla,
 * que sigue sin saber qué es una conversión; sólo obedece:
 *
 *   document  id del documento INFERIOR del que salió la fila. Sirve para
 *             agrupar y para poder retirar el documento completo.
 *   label     cómo se llama ese documento en pantalla, resuelto con el
 *             `option_label` del buscador que lo trajo.
 *   editable  ÚNICA columna que la fila admite editar. Es la declarada en
 *             `sources.quantity`, porque al servidor sólo le viaja
 *             `{id, source_version, quantity}`: cualquier otra edición sería un
 *             no-op silencioso.
 *   max       tope de esa columna en ESTA fila: el saldo del origen, calculado
 *             con `sources.pending`. Es por fila, no por columna, así que no
 *             puede vivir en la configuración de la columna.
 *
 * Los cuatro salen del contrato `sources` de la tabla; la tabla dinámica no
 * nombra ninguno de ellos.
 * ]]]FI
 */
export const TABLE_ROW_LOCAL_SOURCE_FLAG = '__bosTableRowLocalSource';

/**
 * [[[II ESC:057-72 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-72
 * Columna PADRE que derivó los valores de una fila, guardada dentro de
 * `TABLE_ROW_SOURCE_FLAG`.
 *
 * Existe porque **el mismo campo puede comportarse distinto según quién lo
 * derivó**: en la solicitud el usuario carga la partida por `code` o por
 * `name`, y es la derivación de ESE buscador la que gobierna la fila, no la
 * unión de las derivaciones de todas las columnas de la tabla.
 *
 * Una fila leída del servidor no lo trae —nadie registró quién la derivó— y en
 * ese caso se cae a la unión, que es el comportamiento previo.
 * ]]]FI
 */
export const ROW_DERIVED_BY_KEY = '__bosRowDerivedBy';

/**
 * [[[II ESC:057-105 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-105
 * Atributos con los que viaja la VERSIÓN del registro origen, en orden: gana el
 * primero con valor.
 *
 * NO es configuración y no debe volver a serlo. No hay nada que el usuario
 * pueda decidir aquí: el servidor compara SIEMPRE contra `modified_at or
 * created_at`, así que cualquier otra lista produciría un `source_version` que
 * el servidor no sabe leer — y el rechazo llegaría al guardar, sin que nadie
 * pudiera relacionarlo con la llave que se cambió.
 *
 * Vive aquí, como las banderas de arriba, porque lo leen DOS caminos que deben
 * coincidir: la selección por celda y la jalada del documento completo. Cuando
 * uno leía la configuración y el otro tenía la lista escrita en el código,
 * coincidían por casualidad.
 * ]]]FI
 */
export const SOURCE_VERSION_KEYS: readonly string[] = ['modified_at', 'created_at'];
