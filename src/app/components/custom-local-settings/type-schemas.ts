/**
 * Esquemas declarativos por `type` de campo.
 * El editor avanzado los usa para renderizar SOLO los controles aplicables
 * a cada tipo, sin tocar HTML por cada tipo.
 *
 * Cada esquema es un arreglo de `AdvancedFieldDef` agrupado por sección.
 * Las claves usan notación con punto, p.ej. `default.value`, `scanner.icon`.
 */

export type AdvKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'json'; // fallback para arrays/objetos complejos

export interface AdvancedFieldDef {
  /** path con punto: 'default.value', 'scanner.icon' */
  path: string;
  label: string;
  kind: AdvKind;
  options?: { label: string; value: any }[];
  placeholder?: string;
  min?: number;
  max?: number;
  /** Solo se muestra si esta función devuelve true (recibe el snapshot completo) */
  showIf?: (cfg: any) => boolean;
  /** El control solo pertenece al esquema cuando la configuración contiene este contrato. */
  includeIf?: (cfg: any) => boolean;
  hint?: string;
  booleanOnLabel?: string;
  booleanOffLabel?: string;
}

export interface AdvancedSection {
  title: string;
  icon?: string;
  defs: AdvancedFieldDef[];
}

// ─── Bloques reutilizables ────────────────────────────────────────────────────

export const GRID_SPAN_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1} ${index === 0 ? 'columna' : 'columnas'}`,
  value: `col-span-${index + 1}`,
}));

export const GRID_SPAN_MD_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1} ${index === 0 ? 'columna' : 'columnas'}`,
  value: `md:col-span-${index + 1}`,
}));

export const PRIME_ICON_OPTIONS = [
  { label: 'Agregar', value: 'pi pi-plus' },
  { label: 'Aceptar', value: 'pi pi-check' },
  { label: 'Buscar', value: 'pi pi-search' },
  { label: 'Cámara', value: 'pi pi-camera' },
  { label: 'Código QR', value: 'pi pi-qrcode' },
  { label: 'Editar', value: 'pi pi-pencil' },
  { label: 'Eliminar', value: 'pi pi-trash' },
  { label: 'Enviar', value: 'pi pi-send' },
  { label: 'Guardar', value: 'pi pi-save' },
  { label: 'Limpiar', value: 'pi pi-times' },
  { label: 'Pregunta', value: 'pi pi-question-circle' },
  { label: 'Recargar', value: 'pi pi-replay' },
  { label: 'Ver', value: 'pi pi-eye' },
  { label: 'YouTube', value: 'pi pi-youtube' },
];

export const CODE_SCOPE_OPTIONS = [
  { label: 'Global', value: 'global' },
  { label: 'Prefijo', value: 'prefix' },
  { label: 'Sufijo', value: 'suffix' },
  { label: 'Año fiscal', value: 'fiscal_year' },
  { label: 'Global + prefijo', value: 'global_prefix' },
  { label: 'Global + sufijo', value: 'global_suffix' },
  { label: 'Global + año fiscal', value: 'global_fiscal_year' },
  { label: 'Global + prefijo + sufijo', value: 'global_prefix_suffix' },
  { label: 'Global + prefijo + año fiscal', value: 'global_prefix_fiscal_year' },
  { label: 'Global + sufijo + año fiscal', value: 'global_suffix_fiscal_year' },
  { label: 'Prefijo + sufijo', value: 'prefix_suffix' },
  { label: 'Prefijo + año fiscal', value: 'prefix_fiscal_year' },
  { label: 'Sufijo + año fiscal', value: 'suffix_fiscal_year' },
  { label: 'Prefijo + sufijo + año fiscal', value: 'prefix_suffix_fiscal_year' },
  { label: 'Todos los segmentos', value: 'all' },
];

export const CHILD_FILTER_SCOPE_OPTIONS = [
  { label: 'Cliente', value: 'client' },
  { label: 'Servidor', value: 'server' },
  { label: 'Automático', value: 'auto' },
];

/**
 * El control pertenece al esquema cuando el contrato declara la clave, sin mirar
 * el valor que tenga hoy. Asi un campo nunca recibe claves que su tipo no declara.
 */
const hasKey = (path: string) => (cfg: any) => getByPath(cfg, path) !== undefined;

export const POSITION_OPTIONS = [
  { label: 'Prefijo', value: 'prefix' },
  { label: 'Sufijo', value: 'suffix' },
];

export const ICON_SIDE_OPTIONS = [
  { label: 'Izquierda', value: 'left' },
  { label: 'Derecha', value: 'right' },
];

export const CLIENT_OPTIONS = [
  { label: 'Web', value: 'web' },
  { label: 'Móvil', value: 'mobile' },
  { label: 'Escritorio', value: 'desktop' },
];

export const SEARCH_MODE_OPTIONS = [
  { label: 'Parcial', value: 'partial' },
  { label: 'Exacta', value: 'exact' },
];

export const SCOPE_EDITION_OPTIONS = [
  { label: 'Guardar en servidor', value: 'server' },
  { label: 'Solo edición local', value: 'local' },
];

export const FIELD_TYPE_OPTIONS = [
  { label: 'Texto', value: 'input-text' },
  { label: 'Contraseña', value: 'input-password' },
  { label: 'Correo', value: 'email' },
  { label: 'Texto largo', value: 'textarea' },
  { label: 'Número', value: 'input-number' },
  { label: 'Sí/No', value: 'toggle-button' },
  { label: 'Fecha', value: 'date' },
  { label: 'Hora', value: 'time' },
  { label: 'Lista remota', value: 'dropdown' },
  { label: 'Opciones locales', value: 'dropdown-choice' },
  { label: 'Botones de selección', value: 'select-button' },
  { label: 'Selección múltiple', value: 'multi-select' },
  { label: 'Selección múltiple local', value: 'multi-choice' },
  { label: 'Árbol', value: 'tree-select' },
  { label: 'Lista', value: 'listbox' },
  { label: 'Autocompletar', value: 'auto-complete' },
  { label: 'JSON', value: 'json' },
  { label: 'Archivos', value: 'files' },
  { label: 'Documento', value: 'document' },
  { label: 'Imagen', value: 'image-uploader' },
  { label: 'Botón', value: 'button' },
  { label: 'Correos', value: 'emails-chips' },
  { label: 'Tabla', value: 'table' },
  { label: 'Firma', value: 'signature' },
  { label: 'Firma manuscrita', value: 'signature-pad' },
  { label: 'Acceso', value: 'login' },
  { label: 'Selfie', value: 'selfie' },
];

// [[[II ESC:031-08 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-08
const COMMON_BASE: AdvancedFieldDef[] = [
  { path: 'label', label: 'Etiqueta', kind: 'text' },
  { path: 'field', label: 'Campo (API)', kind: 'text', hint: 'Nombre del campo enviado al servidor' },
  {
    path: 'class', label: 'Ancho móvil', kind: 'select', options: GRID_SPAN_OPTIONS,
    hint: 'Clase base existente en el grid de app-custom-draw-form.',
  },
  {
    path: 'class_md', label: 'Ancho escritorio', kind: 'select', options: GRID_SPAN_MD_OPTIONS,
    hint: 'Clase md existente en el grid de app-custom-draw-form.',
  },
  {
    path: 'type_mobile', label: 'Control en móvil', kind: 'select', options: FIELD_TYPE_OPTIONS,
    includeIf: c => Object.prototype.hasOwnProperty.call(c ?? {}, 'type_mobile'),
  },
  {
    path: 'scope_edition', label: 'Alcance de edición', kind: 'select', options: SCOPE_EDITION_OPTIONS,
    includeIf: c => Object.prototype.hasOwnProperty.call(c ?? {}, 'scope_edition'),
    hint: 'Servidor persiste el valor; local lo conserva únicamente en la fila editada.',
  },
  { path: 'required', label: 'Requerido', kind: 'boolean', booleanOnLabel: 'Requerido', booleanOffLabel: 'Opcional' },
  { path: 'hide', label: 'Visibilidad', kind: 'boolean', booleanOnLabel: 'Oculto', booleanOffLabel: 'Visible' },
  { path: 'readonly', label: 'Edición', kind: 'boolean', booleanOnLabel: 'Solo lectura', booleanOffLabel: 'Editable' },
  { path: 'autofocus', label: 'Enfoque inicial', kind: 'boolean', booleanOnLabel: 'Con auto-foco', booleanOffLabel: 'Sin auto-foco' },
];
// ]]]FI

const DEFAULT_BLOCK: AdvancedFieldDef[] = [
  { path: 'default.active', label: 'Valor por defecto', kind: 'boolean', booleanOnLabel: 'Aplicar valor', booleanOffLabel: 'Sin valor' },
  { path: 'default.value', label: 'Valor por defecto', kind: 'text', includeIf: hasKey('default.value'), showIf: c => c?.default?.active },
  { path: 'default.edit', label: 'Edición del valor', kind: 'boolean', booleanOnLabel: 'Valor editable', booleanOffLabel: 'Valor bloqueado' },
];

/**
 * Consulta con la que una relación preselecciona su registro por defecto. Es el
 * bloque `default` de los tipos relacionales del servidor, que no usa `value`.
 */
const RELATION_DEFAULT_BLOCK: AdvancedFieldDef[] = (() => {
  const active = (c: any) => c?.default?.active === true;
  const text = (key: string, label: string, hint?: string): AdvancedFieldDef => ({
    path: `default.${key}`, label, kind: 'text', includeIf: hasKey(`default.${key}`), showIf: active, hint,
  });
  return [
    {
      path: 'default.result_position', label: 'Coincidencia a tomar', kind: 'text',
      includeIf: hasKey('default.result_position'), showIf: active,
      hint: 'first, last o la posición 1-n dentro del resultado de la consulta.',
    },
    text('id', 'Identificador exacto', 'Tiene prioridad sobre el resto de los criterios.'),
    text('field_name', 'Campo de búsqueda', 'Atributo del recurso contra el que se compara, p.ej. name.'),
    text('name', 'Nombre buscado'),
    text('code', 'Código buscado'),
    text('status', 'Estado buscado'),
    text('created_at', 'Fecha de creación'),
    text('created_by', 'Creado por'),
    text('modified_by', 'Modificado por'),
    {
      path: 'default.modules', label: 'Módulos (JSON)', kind: 'json',
      includeIf: hasKey('default.modules'), showIf: active,
      hint: 'Lista de claves de módulo que acotan la consulta.',
    },
  ];
})();

const DEFAULT_JSON_BLOCK: AdvancedFieldDef[] = [
  { path: 'default.active', label: 'Valor por defecto', kind: 'boolean', booleanOnLabel: 'Aplicar valor', booleanOffLabel: 'Sin valor' },
  { path: 'default.value', label: 'Valor por defecto (JSON)', kind: 'json', showIf: c => c?.default?.active },
  { path: 'default.edit', label: 'Edición del valor', kind: 'boolean', booleanOnLabel: 'Valor editable', booleanOffLabel: 'Valor bloqueado' },
];

const makeDescriptionBlock = (prefix = ''): AdvancedFieldDef[] => {
  const root = prefix ? `${prefix}.description` : 'description';
  const active = (c: any) => getByPath(c, `${root}.active`) === true;
  return [
    { path: `${root}.active`, label: 'Mostrar descripción', kind: 'boolean', includeIf: hasKey(`${root}.active`) },
    { path: `${root}.name`, label: 'Texto descripción', kind: 'text', includeIf: hasKey(`${root}.name`), showIf: active },
    { path: `${root}.height`, label: 'Alto', kind: 'text', includeIf: hasKey(`${root}.height`), showIf: active },
    { path: `${root}.slice`, label: 'Cortar a (chars)', kind: 'text', includeIf: hasKey(`${root}.slice`), showIf: active },
    { path: `${root}.caracter_slice`, label: 'Sufijo de corte', kind: 'text', includeIf: hasKey(`${root}.caracter_slice`), showIf: active },
    {
      path: `${root}.border`, label: 'Borde (CSS)', kind: 'text',
      includeIf: hasKey(`${root}.border`), showIf: active,
      hint: 'Valor CSS de borde, p.ej. 2px solid #ccc. Vacío = sin borde.',
    },
  ];
};

const DESCRIPTION_BLOCK: AdvancedFieldDef[] = makeDescriptionBlock();

const SCANNER_BLOCK: AdvancedFieldDef[] = [
  { path: 'scanner.active', label: 'Escáner', kind: 'boolean', booleanOnLabel: 'Escáner habilitado', booleanOffLabel: 'Escáner deshabilitado' },
  { path: 'scanner.icon', label: 'Icono', kind: 'select', options: PRIME_ICON_OPTIONS, showIf: c => c?.scanner?.active },
  { path: 'scanner.tooltip', label: 'Tooltip', kind: 'text', showIf: c => c?.scanner?.active },
  {
    path: 'scanner.hint', label: 'Máscara de formatos', kind: 'number', min: 1, max: 8191,
    showIf: c => c?.scanner?.active,
    hint: 'Suma de formatos habilitados: QR=1, AZTEC=2, DATA_MATRIX=4 … CODABAR=4096.',
  },
];

const COLS_BLOCK: AdvancedFieldDef[] = [
  { path: 'cols.label', label: 'Encabezado columna', kind: 'text' },
  { path: 'cols.hide', label: 'Visibilidad en tabla', kind: 'boolean', booleanOnLabel: 'Oculta en tabla', booleanOffLabel: 'Visible en tabla' },
  { path: 'cols.hide_mobile', label: 'Visibilidad móvil', kind: 'boolean', booleanOnLabel: 'Oculta en móvil', booleanOffLabel: 'Visible en móvil' },
  { path: 'cols.sortable', label: 'Orden de columna', kind: 'boolean', booleanOnLabel: 'Ordenable', booleanOffLabel: 'No ordenable' },
  { path: 'cols.locked', label: 'Bloqueo de columna', kind: 'boolean', booleanOnLabel: 'Bloqueada', booleanOffLabel: 'Libre' },
  {
    path: 'cols.multiple.active', label: 'Valores múltiples', kind: 'boolean',
    booleanOnLabel: 'Listar todos', booleanOffLabel: 'Resumir conteo',
    includeIf: hasKey('cols.multiple.active'),
    hint: 'Cuando la relación trae varios valores, decide si se listan o se resumen.',
  },
  {
    path: 'cols.multiple.separator', label: 'Separador', kind: 'text',
    includeIf: hasKey('cols.multiple.separator'), showIf: c => c?.cols?.multiple?.active,
  },
  {
    path: 'cols.multiple.msg_more', label: 'Mensaje de resumen', kind: 'text',
    includeIf: hasKey('cols.multiple.msg_more'), showIf: c => c?.cols?.multiple?.active !== true,
    hint: 'Usa {e} como marcador del conteo, p.ej. {e} elemento(s)...',
  },
];

// ─── Bloques compartidos derivados del contrato del servidor ─────────────────

const CACHE_PLATFORMS: { key: string; label: string }[] = [
  { key: 'web', label: 'Web' },
  { key: 'mobile', label: 'Móvil' },
  { key: 'desktop', label: 'Escritorio' },
];

const CACHE_BLOCK: AdvancedFieldDef[] = CACHE_PLATFORMS.flatMap(({ key, label }): AdvancedFieldDef[] => [
  {
    path: `cache.${key}.read`, label: `${label} · Lectura`, kind: 'boolean',
    booleanOnLabel: 'Lee del caché', booleanOffLabel: 'Siempre al servidor',
    includeIf: hasKey(`cache.${key}.read`),
  },
  {
    path: `cache.${key}.time`, label: `${label} · Vigencia (s)`, kind: 'number', min: 0,
    includeIf: hasKey(`cache.${key}.time`), showIf: c => getByPath(c, `cache.${key}.read`) === true,
  },
  {
    path: `cache.${key}.encrypted`, label: `${label} · Cifrado`, kind: 'boolean',
    booleanOnLabel: 'Cifrado', booleanOffLabel: 'Sin cifrar',
    includeIf: hasKey(`cache.${key}.encrypted`),
  },
  {
    path: `cache.${key}.creation`, label: `${label} · En alta`, kind: 'boolean',
    booleanOnLabel: 'Conserva al crear', booleanOffLabel: 'Sin conservar al crear',
    includeIf: hasKey(`cache.${key}.creation`),
  },
  {
    path: `cache.${key}.edition`, label: `${label} · En edición`, kind: 'boolean',
    booleanOnLabel: 'Conserva al editar', booleanOffLabel: 'Sin conservar al editar',
    includeIf: hasKey(`cache.${key}.edition`),
  },
]);

const CACHE_SECTION: AdvancedSection = { title: 'Caché', icon: 'pi pi-database', defs: CACHE_BLOCK };

const DATA_SOURCE_QUERY_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'data_type.ordering', label: 'Orden del servidor', kind: 'text',
    includeIf: hasKey('data_type.ordering'), hint: 'Campos separados por coma, p.ej. -created_at,name.',
  },
  {
    path: 'data_type.limit', label: 'Máximo a cargar', kind: 'number', min: 1, max: 1000,
    includeIf: hasKey('data_type.limit'), hint: 'Vacío = sin límite. El servidor pagina a mil elementos.',
  },
  {
    path: 'data_type.filter', label: 'Filtro del recurso (JSON)', kind: 'json',
    includeIf: hasKey('data_type.filter'),
    hint: 'Contrato BOS de filtros: {"campo":{"active":true,"ops":["exact"],"default":"exact","default_value":null}}.',
  },
  {
    path: 'options', label: 'Opciones locales (JSON)', kind: 'json',
    includeIf: hasKey('options'),
    hint: 'Excluyente con data_type.type. Array de objetos, p.ej. [{"id":1,"name":"Opción 1"}].',
  },
  {
    path: 'filter_group', label: 'Campo de agrupación', kind: 'text',
    includeIf: hasKey('filter_group'),
    hint: 'Campo del padre por el que se acotan los datos cuando el combo depende de otro.',
  },
  {
    path: 'input_editable', label: 'Escritura en el input', kind: 'boolean',
    booleanOnLabel: 'Permitir escribir', booleanOffLabel: 'Solo selección',
    includeIf: hasKey('input_editable'),
  },
  {
    path: 'scroll_height', label: 'Alto del panel', kind: 'text',
    includeIf: hasKey('scroll_height'), /* placeholder: '150px' */
  },
  {
    path: 'selection_limit', label: 'Límite de selección', kind: 'number', min: 0,
    includeIf: hasKey('selection_limit'), hint: 'Vacío = sin límite. Solo aplica con selección múltiple.',
  },
  {
    path: 'cols_values', label: 'Campos guardados (JSON)', kind: 'json',
    includeIf: hasKey('cols_values'),
    hint: 'Solo para combos personalizados: qué campos del elegido se guardan.',
  },
];

const VIRTUAL_SCROLL_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'virtual_scrolling.active', label: 'Scroll virtual', kind: 'boolean',
    booleanOnLabel: 'Scroll virtual activo', booleanOffLabel: 'Lista completa',
    includeIf: hasKey('virtual_scrolling.active'),
  },
  {
    path: 'virtual_scrolling.item_size', label: 'Alto del elemento (px)', kind: 'number', min: 1,
    includeIf: hasKey('virtual_scrolling.item_size'), showIf: c => c?.virtual_scrolling?.active === true,
  },
];

const CHILDREN_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'children.active', label: 'Campos dependientes', kind: 'boolean',
    booleanOnLabel: 'Cascada activa', booleanOffLabel: 'Sin cascada',
    includeIf: hasKey('children.active'),
  },
  {
    path: 'children.fields', label: 'Campos dependientes (JSON)', kind: 'json',
    includeIf: hasKey('children.fields'), showIf: c => c?.children?.active === true,
    hint: 'Mapa de hijos static / dynamic / derived tal como lo declara la configuración.',
  },
];

const CHILD_RUNTIME_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'filter.scope', label: 'Resolución del hijo', kind: 'select', options: CHILD_FILTER_SCOPE_OPTIONS,
    includeIf: c => Object.prototype.hasOwnProperty.call(c?.filter ?? {}, 'scope'),
    hint: 'Única fuente de verdad para decidir si la cascada se resuelve en cliente o servidor.',
  },
  {
    path: 'filter.logic', label: 'Lógica del filtro', kind: 'select',
    options: [{ label: 'Todas (AND)', value: 'AND' }, { label: 'Cualquiera (OR)', value: 'OR' }],
    includeIf: c => Object.prototype.hasOwnProperty.call(c?.filter ?? {}, 'logic'),
  },
  {
    path: 'activate.action', label: 'Acción al cumplir', kind: 'select',
    options: [{ label: 'Desactivar', value: 'inactive' }, { label: 'Activar', value: 'active' }],
    includeIf: c => Object.prototype.hasOwnProperty.call(c?.activate ?? {}, 'action'),
  },
  {
    path: 'activate.default_state', label: 'Estado inicial', kind: 'select',
    options: [
      { label: 'Activo', value: 'active' },
      { label: 'Inactivo', value: 'inactive' },
      { label: 'Oculto', value: 'hidden' },
      { label: 'Solo lectura', value: 'readonly' },
    ],
    includeIf: c => Object.prototype.hasOwnProperty.call(c?.activate ?? {}, 'default_state'),
  },
  {
    path: 'requested.action', label: 'Obligatoriedad al cumplir', kind: 'select',
    options: [{ label: 'Requerido', value: 'required' }, { label: 'No requerido', value: 'not_required' }],
    includeIf: c => Object.prototype.hasOwnProperty.call(c?.requested ?? {}, 'action'),
  },
];

// ─── Schemas por type ─────────────────────────────────────────────────────────

const TEXT_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  {
    title: 'Texto', icon: 'pi pi-pencil', defs: [
      { path: 'max_length', label: 'Largo máximo', kind: 'number', min: 0 },
      { path: 'min_length', label: 'Largo mínimo', kind: 'number', min: 0 },
      //{ path: 'placeholder', label: 'Placeholder', kind: 'text' },
    ],
  },
  { title: 'Escáner', icon: 'pi pi-qrcode', defs: SCANNER_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const TEXTAREA_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  {
    title: 'Texto largo', icon: 'pi pi-align-left', defs: [
      { path: 'max_length', label: 'Largo máximo', kind: 'number', min: 0 },
      { path: 'min_length', label: 'Largo mínimo', kind: 'number', min: 0 },
      { path: 'rows', label: 'Filas', kind: 'number', min: 1, max: 30 },
      { path: 'auto_resize', label: 'Auto resize', kind: 'boolean' },
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const NUMBER_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  {
    title: 'Numérico', icon: 'pi pi-hashtag', defs: [
      {
        path: 'mode', label: 'Modo', kind: 'select',
        options: [
          { label: 'Decimal', value: 'decimal' },
          { label: 'Moneda', value: 'currency' },
        ],
      },
      { path: 'min', label: 'Mínimo', kind: 'number' },
      { path: 'max', label: 'Máximo', kind: 'number' },
      { path: 'min_fraction_digits', label: 'Decimales mín.', kind: 'number', min: 0, max: 10 },
      { path: 'max_fraction_digits', label: 'Decimales máx.', kind: 'number', min: 0, max: 10 },
      { path: 'prefix', label: 'Prefijo', kind: 'text' },
      { path: 'suffix', label: 'Sufijo', kind: 'text' },
      { path: 'show_buttons', label: 'Botones +/-', kind: 'boolean' },
      {
        path: 'button_layout', label: 'Layout botones', kind: 'select',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
          { label: 'Apilado', value: 'stacked' },
        ],
        showIf: c => c?.show_buttons === true,
      },
      {
        path: 'spinner_mode', label: 'Modo del spinner', kind: 'select',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
        ],
        includeIf: hasKey('spinner_mode'), showIf: c => c?.show_buttons === true,
      },
      {
        path: 'increment_button_icon', label: 'Icono de aumentar', kind: 'select', options: PRIME_ICON_OPTIONS,
        includeIf: hasKey('increment_button_icon'), showIf: c => c?.show_buttons === true,
      },
      {
        path: 'decrement_button_icon', label: 'Icono de disminuir', kind: 'select', options: PRIME_ICON_OPTIONS,
        includeIf: hasKey('decrement_button_icon'), showIf: c => c?.show_buttons === true,
      },
      {
        path: 'increment_button_class', label: 'Clase de aumentar', kind: 'text',
        includeIf: hasKey('increment_button_class'), showIf: c => c?.show_buttons === true,
      },
      {
        path: 'decrement_button_class', label: 'Clase de disminuir', kind: 'text',
        includeIf: hasKey('decrement_button_class'), showIf: c => c?.show_buttons === true,
      },
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const TOGGLE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [
      { path: 'default.active', label: 'Aplicar default', kind: 'boolean' },
      { path: 'default.value', label: 'Valor (Si/No)', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.edit', label: 'Editable', kind: 'boolean' },
    ]
  },
  {
    title: 'Etiquetas', icon: 'pi pi-tag', defs: [
      { path: 'label_true', label: 'Etiqueta verdadero', kind: 'text', /* placeholder: 'Activo' */ },
      { path: 'label_false', label: 'Etiqueta falso', kind: 'text', /* placeholder: 'Inactivo' */ },
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const DATE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [
      { path: 'default.active', label: 'Aplicar default', kind: 'boolean' },
      {
        path: 'default.value', label: 'Valor', kind: 'select',
        options: [
          { label: '(vacío)', value: '' },
          { label: 'Fecha actual', value: 'current' },
        ],
        showIf: c => c?.default?.active,
      },
      { path: 'default.edit', label: 'Editable', kind: 'boolean' },
    ]
  },
  {
    title: 'Visual', icon: 'pi pi-calendar', defs: [
      { path: 'show_icon', label: 'Mostrar icono', kind: 'boolean' },
    ]
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

// [[[II ESC:001-18 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-18
const ADDITIONAL_SEARCH_SUPPORTED = (cfg: any): boolean => {
  const field = String(cfg?.field || '');
  const excludedPrefixes = [
    'form_fields_data_', 'parent_form_data_', 'child_form_fields',
    'no_form_data_', 'object_form_fields_data_',
  ];
  return !['dropdown-choice', 'multi-choice', 'select-button'].includes(String(cfg?.type || ''))
    && !excludedPrefixes.some(prefix => field.startsWith(prefix));
};

const ADDITIONAL_SEARCH_BLOCK: AdvancedSection = {
  title: 'Búsqueda adicional', icon: 'pi pi-search', defs: [
    {
      path: 'additional_search.active', label: 'Buscar en el servidor', kind: 'boolean',
      includeIf: ADDITIONAL_SEARCH_SUPPORTED,
      hint: 'Agrega un buscador independiente sin cambiar la precarga normal del combo.',
    },
    {
      path: 'additional_search.filter', label: 'Filtro del recurso (JSON)', kind: 'json',
      includeIf: c => ADDITIONAL_SEARCH_SUPPORTED(c) && hasKey('additional_search.filter')(c),
      showIf: c => c?.additional_search?.active === true,
      hint: 'Contrato BOS de filtros aplicado al recurso destino. Vacío = sin acotar.',
    },
    {
      path: 'additional_search.subsidiaries', label: 'Sucursales permitidas (JSON)', kind: 'json',
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
      hint: 'Formato BOS: {"filter":{}}. Vacío significa todas; use entradas active/default/default_value para limitar.',
    },
    {
      path: 'additional_search.autocomplete.by', label: 'Campo remoto / search', kind: 'text',
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
      hint: 'Use search para el buscador global o el nombre del atributo remoto.',
    },
    {
      path: 'additional_search.autocomplete.search_mode', label: 'Coincidencia', kind: 'select',
      options: [
        { label: 'Parcial', value: 'partial' },
        { label: 'Exacta', value: 'exact' },
      ],
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
    },
    {
      path: 'additional_search.autocomplete.min_search_length', label: 'Largo mínimo', kind: 'number', min: 1,
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
    },
    {
      path: 'additional_search.autocomplete.limit', label: 'Máximo de resultados', kind: 'number', min: 1,
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
    },
    {
      path: 'additional_search.autocomplete.placeholder', label: 'Placeholder', kind: 'text',
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
    },
    {
      path: 'additional_search.autocomplete.empty_message', label: 'Mensaje sin resultados', kind: 'text',
      includeIf: ADDITIONAL_SEARCH_SUPPORTED, showIf: c => c?.additional_search?.active === true,
    },
  ],
};
// ]]]FI

const DATA_SOURCE_BLOCK: AdvancedFieldDef[] = [
  { path: 'data_type.type', label: 'Fuente', kind: 'text', includeIf: hasKey('data_type.type'), hint: 'Productos, clientes, etc' },
  { path: 'option_value', label: 'option_value', kind: 'text', includeIf: hasKey('option_value') },
  { path: 'option_label', label: 'option_label', kind: 'text', includeIf: hasKey('option_label') },
  { path: 'filter_local', label: 'Filtro local', kind: 'boolean', includeIf: hasKey('filter_local') },
  { path: 'filter_by', label: 'Filtrar por (campos)', kind: 'text', includeIf: hasKey('filter_by') },
  { path: 'editable', label: 'Editable', kind: 'boolean', includeIf: hasKey('editable') },
  { path: 'reload_icon', label: 'Icono recargar', kind: 'boolean', includeIf: hasKey('reload_icon') },
  { path: 'new_icon', label: 'Icono nuevo', kind: 'boolean', includeIf: hasKey('new_icon') },
  { path: 'closable_icon', label: 'Icono limpiar', kind: 'boolean', includeIf: hasKey('closable_icon') },
  ...DATA_SOURCE_QUERY_BLOCK,
];

const DATA_SOURCE_SECTION: AdvancedSection = { title: 'Origen de datos', icon: 'pi pi-database', defs: DATA_SOURCE_BLOCK };

const FK_LIKE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  DATA_SOURCE_SECTION,
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [...DEFAULT_BLOCK, ...RELATION_DEFAULT_BLOCK] },
  { title: 'Resolución dependiente', icon: 'pi pi-sitemap', defs: [...CHILD_RUNTIME_BLOCK, ...CHILDREN_BLOCK] },
  ADDITIONAL_SEARCH_BLOCK,
  { title: 'Rendimiento de la lista', icon: 'pi pi-bolt', defs: VIRTUAL_SCROLL_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

// [[[II ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
const MULTI_CHOICE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Opciones locales', icon: 'pi pi-list', defs: [
      {
        path: 'data_type.options', label: 'Opciones (JSON)', kind: 'json',
        hint: 'Array de objetos. P.ej. [{"id":"A","name":"Activo"},{"id":"I","name":"Inactivo"}]'
      },
      { path: 'option_value', label: 'option_value', kind: 'text', /* placeholder: 'id' */ },
      { path: 'option_label', label: 'option_label', kind: 'text', /* placeholder: 'name' */ },
      { path: 'filter_local', label: 'Filtro local', kind: 'boolean' },
      { path: 'filter_by', label: 'Filtrar por (campos)', kind: 'text', /* placeholder: 'name' */ },
      ...DATA_SOURCE_QUERY_BLOCK,
    ],
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [...DEFAULT_BLOCK, ...RELATION_DEFAULT_BLOCK] },
  { title: 'Resolución dependiente', icon: 'pi pi-sitemap', defs: [...CHILD_RUNTIME_BLOCK, ...CHILDREN_BLOCK] },
  { title: 'Rendimiento de la lista', icon: 'pi pi-bolt', defs: VIRTUAL_SCROLL_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];
// ]]]FI

const AUTOCOMPLETE_BLOCK: AdvancedFieldDef[] = [
  { path: 'min_length', label: 'Largo mínimo', kind: 'number', min: 0 },
  { path: 'delay', label: 'Delay (ms)', kind: 'number', min: 0 },
  { path: 'multiple', label: 'Selección múltiple', kind: 'boolean' },
  {
    path: 'unique', label: 'Valores repetidos', kind: 'boolean',
    booleanOnLabel: 'Sin duplicados', booleanOffLabel: 'Permite duplicados',
    includeIf: hasKey('unique'), showIf: c => c?.multiple === true,
  },
  { path: 'force_selection', label: 'Forzar selección', kind: 'boolean' },
  { path: 'auto_highlight', label: 'Resaltar primer item', kind: 'boolean' },
  { path: 'complete_on_focus', label: 'Buscar al enfocar', kind: 'boolean' },
  { path: 'select_on_focus', label: 'Seleccionar al enfocar', kind: 'boolean' },
  { path: 'scroll_height', label: 'Alto scroll', kind: 'text', /* placeholder: '200px' */ },
  { path: 'virtual_scroll', label: 'Scroll virtual', kind: 'boolean' },
  {
    path: 'lazy', label: 'Carga bajo demanda', kind: 'boolean',
    booleanOnLabel: 'Carga diferida', booleanOffLabel: 'Carga completa',
    includeIf: hasKey('lazy'),
  },
  {
    path: 'dropdown', label: 'Botón desplegable', kind: 'boolean',
    booleanOnLabel: 'Con botón de lista', booleanOffLabel: 'Solo escritura',
    includeIf: hasKey('dropdown'),
  },
  {
    path: 'focus_after_select', label: 'Foco tras elegir', kind: 'text',
    includeIf: hasKey('focus_after_select'),
    hint: 'Nombre del campo que toma el foco al seleccionar; vacío = comportamiento normal.',
  },
];

const AUTOCOMPLETE_SEARCH_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'smart_search', label: 'Búsqueda inteligente', kind: 'boolean',
    booleanOnLabel: 'filter[search]', booleanOffLabel: 'campo.icontains',
    includeIf: hasKey('smart_search'),
  },
  {
    path: 'search_mode', label: 'Coincidencia', kind: 'select', options: SEARCH_MODE_OPTIONS,
    includeIf: hasKey('search_mode'),
  },
  {
    path: 'min_search_length', label: 'Caracteres para buscar', kind: 'number', min: 0,
    includeIf: hasKey('min_search_length'),
    hint: 'Umbral de la consulta parcial. No aplica con coincidencia exacta.',
  },
  {
    path: 'search_key', label: 'Tecla de búsqueda', kind: 'text',
    includeIf: hasKey('search_key'), hint: 'Vacío, f3, enter, tab o flechas arriba/abajo.',
  },
  {
    path: 'search_locale', label: 'Locale de búsqueda', kind: 'text',
    includeIf: hasKey('search_locale'), hint: 'Afecta el tratamiento de acentos, p.ej. es.',
  },
  {
    path: 'include', label: 'Campos incluidos', kind: 'text',
    includeIf: hasKey('include'),
  },
  {
    path: 'show_empty_message', label: 'Aviso sin resultados', kind: 'boolean',
    booleanOnLabel: 'Mostrar aviso', booleanOffLabel: 'Sin aviso',
    includeIf: hasKey('show_empty_message'),
  },
  {
    path: 'empty_message', label: 'Mensaje sin resultados', kind: 'text',
    includeIf: hasKey('empty_message'), showIf: c => c?.show_empty_message === true,
  },
];

const AUTOCOMPLETE_PANEL_BLOCK: AdvancedFieldDef[] = [
  {
    path: 'panel.active', label: 'Panel de sugerencias', kind: 'boolean',
    booleanOnLabel: 'Panel con columnas', booleanOffLabel: 'Lista simple',
    includeIf: hasKey('panel.active'),
  },
  {
    path: 'panel.fields', label: 'Columnas del panel (JSON)', kind: 'json',
    includeIf: hasKey('panel.fields'), showIf: c => c?.panel?.active === true,
    hint: 'Mapa por posición con field, header, type, class y class_md.',
  },
  {
    path: 'icon.active', label: 'Icono principal', kind: 'boolean',
    booleanOnLabel: 'Visible', booleanOffLabel: 'Oculto', includeIf: hasKey('icon.active'),
  },
  {
    path: 'icon.icon', label: 'Icono principal', kind: 'select', options: PRIME_ICON_OPTIONS,
    includeIf: hasKey('icon.icon'), showIf: c => c?.icon?.active === true,
  },
  {
    path: 'icon.position', label: 'Posición del icono', kind: 'select', options: ICON_SIDE_OPTIONS,
    includeIf: hasKey('icon.position'), showIf: c => c?.icon?.active === true,
  },
  {
    path: 'icon2.active', label: 'Icono secundario', kind: 'boolean',
    booleanOnLabel: 'Visible', booleanOffLabel: 'Oculto', includeIf: hasKey('icon2.active'),
  },
  {
    path: 'icon2.icon', label: 'Icono secundario', kind: 'select', options: PRIME_ICON_OPTIONS,
    includeIf: hasKey('icon2.icon'), showIf: c => c?.icon2?.active === true,
  },
  {
    path: 'icon2.position', label: 'Posición del secundario', kind: 'select', options: ICON_SIDE_OPTIONS,
    includeIf: hasKey('icon2.position'), showIf: c => c?.icon2?.active === true,
  },
];

const AUTOCOMPLETE_SCHEMA: AdvancedSection[] = [
  ...FK_LIKE_SCHEMA.slice(0, 2),
  { title: 'Auto-complete', icon: 'pi pi-search', defs: AUTOCOMPLETE_BLOCK },
  { title: 'Búsqueda', icon: 'pi pi-filter', defs: AUTOCOMPLETE_SEARCH_BLOCK },
  { title: 'Panel e iconos', icon: 'pi pi-list', defs: AUTOCOMPLETE_PANEL_BLOCK },
  ...FK_LIKE_SCHEMA.slice(2),
];

const BUTTON_SCHEMA: AdvancedSection[] = [
  {
    title: 'General', icon: 'pi pi-cog', defs: [
      ...COMMON_BASE.filter(d => d.path !== 'required' && d.path !== 'readonly'),
      { path: 'icon', label: 'Icono', kind: 'select', options: PRIME_ICON_OPTIONS },
      {
        path: 'icon_position', label: 'Posición icono', kind: 'select',
        options: [
          { label: 'Izquierda', value: 'left' },
          { label: 'Derecha', value: 'right' },
          { label: 'Arriba', value: 'top' },
          { label: 'Abajo', value: 'bottom' },
        ],
      },
      {
        path: 'severity', label: 'Severidad', kind: 'select',
        options: [
          { label: 'Principal', value: 'primary' },
          { label: 'Secundario', value: 'secondary' },
          { label: 'Éxito', value: 'success' },
          { label: 'Información', value: 'info' },
          { label: 'Advertencia', value: 'warning' },
          { label: 'Peligro', value: 'danger' },
          { label: 'Ayuda', value: 'help' },
          { label: 'Contraste', value: 'contrast' },
        ],
      },
      { path: 'rounded', label: 'Redondeado', kind: 'boolean' },
      { path: 'disabled', label: 'Deshabilitado', kind: 'boolean' },
      { path: 'action', label: 'Acción', kind: 'text', hint: 'identificador del handler en el componente padre' },
    ],
  },
  {
    title: 'Efecto de la acción', icon: 'pi pi-bolt', defs: [
      {
        path: 'sent_data', label: 'Datos que devuelve', kind: 'text',
        includeIf: hasKey('sent_data'),
        hint: 'Campo o expresión cuyo valor copia la acción hacia el formulario.',
      },
      {
        path: 'send_additional_data', label: 'Datos adicionales (JSON)', kind: 'json',
        includeIf: hasKey('send_additional_data'),
      },
      {
        path: 'fields_reset_form', label: 'Campos que reinicia (JSON)', kind: 'json',
        includeIf: hasKey('fields_reset_form'),
      },
      {
        path: 'fields_disable', label: 'Campos que deshabilita (JSON)', kind: 'json',
        includeIf: hasKey('fields_disable'),
      },
    ],
  },
];

const FILES_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [...DEFAULT_JSON_BLOCK, ...RELATION_DEFAULT_BLOCK] },
  {
    title: 'Subida (móvil/desktop)', icon: 'pi pi-upload', defs: [
      { path: 'upload.active', label: 'Activo', kind: 'boolean' },
      { path: 'upload.required', label: 'Requerido', kind: 'boolean' },
      { path: 'upload.max_files', label: 'Máx. archivos', kind: 'number', min: 1 },
      { path: 'upload.max_size', label: 'Tamaño máx (bytes)', kind: 'number', min: 0 },
      { path: 'upload.allow_gallery', label: 'Permitir galería', kind: 'boolean' },
      { path: 'upload.allow_camera', label: 'Permitir cámara', kind: 'boolean' },
      { path: 'upload.label', label: 'Etiqueta subida', kind: 'text' },
      { path: 'upload.quality', label: 'Calidad imagen (%)', kind: 'number', min: 1, max: 100 },
      { path: 'upload.max_width', label: 'Ancho máx (px)', kind: 'number', min: 0 },
      { path: 'upload.max_height', label: 'Alto máx (px)', kind: 'number', min: 0 },
      {
        path: 'upload.accept', label: 'Extensiones aceptadas (JSON)', kind: 'json',
        includeIf: hasKey('upload.accept'), hint: 'Array de extensiones, p.ej. [".pdf",".jpg",".png"].',
      },
      {
        path: 'upload.select_system', label: 'Documentos del sistema', kind: 'boolean',
        booleanOnLabel: 'Permitir elegirlos', booleanOffLabel: 'Acotar por recurso',
        includeIf: hasKey('upload.select_system'),
      },
      {
        path: 'upload.name_file_user', label: 'Nombre enviado por usuario', kind: 'text',
        includeIf: hasKey('upload.name_file_user'),
      },
      {
        path: 'upload.size_rule', label: 'Reglas por tamaño (JSON)', kind: 'json',
        includeIf: hasKey('upload.size_rule'),
        hint: 'Array de {over_kb, quality, max_width, max_height} evaluado de mayor a menor.',
      },
      {
        path: 'upload.cache', label: 'Caché de la subida (JSON)', kind: 'json',
        includeIf: hasKey('upload.cache'),
        hint: 'Mismo contrato de caché por plataforma: web, mobile y desktop.',
      },
    ],
  },
  {
    title: 'Subida servidor', icon: 'pi pi-cloud-upload', defs: [
      { path: 'server_upload.active', label: 'Activo', kind: 'boolean', includeIf: hasKey('server_upload.active') },
      { path: 'server_upload.required', label: 'Requerido', kind: 'boolean', includeIf: hasKey('server_upload.required') },
      { path: 'server_upload.max_files', label: 'Máx. archivos', kind: 'number', min: 1, includeIf: hasKey('server_upload.max_files') },
      { path: 'server_upload.max_size', label: 'Tamaño máx (bytes)', kind: 'number', min: 0, includeIf: hasKey('server_upload.max_size') },
      {
        path: 'server_upload.accept', label: 'Extensiones aceptadas (JSON)', kind: 'json',
        includeIf: hasKey('server_upload.accept'),
      },
      { path: 'server_upload.allow_gallery', label: 'Permitir galería', kind: 'boolean', includeIf: hasKey('server_upload.allow_gallery') },
      { path: 'server_upload.allow_camera', label: 'Permitir cámara', kind: 'boolean', includeIf: hasKey('server_upload.allow_camera') },
      { path: 'server_upload.label', label: 'Etiqueta subida', kind: 'text', includeIf: hasKey('server_upload.label') },
      { path: 'server_upload.quality', label: 'Calidad imagen (%)', kind: 'number', min: 1, max: 100, includeIf: hasKey('server_upload.quality') },
      { path: 'server_upload.max_width', label: 'Ancho máx (px)', kind: 'number', min: 0, includeIf: hasKey('server_upload.max_width') },
      { path: 'server_upload.max_height', label: 'Alto máx (px)', kind: 'number', min: 0, includeIf: hasKey('server_upload.max_height') },
      {
        path: 'server_upload.select_system', label: 'Documentos del sistema', kind: 'boolean',
        booleanOnLabel: 'Permitir elegirlos', booleanOffLabel: 'Acotar por recurso',
        includeIf: hasKey('server_upload.select_system'),
      },
      { path: 'server_upload.name_file_user', label: 'Nombre enviado por usuario', kind: 'text', includeIf: hasKey('server_upload.name_file_user') },
      {
        path: 'server_upload.size_rule', label: 'Reglas por tamaño (JSON)', kind: 'json',
        includeIf: hasKey('server_upload.size_rule'),
      },
    ],
  },
  DATA_SOURCE_SECTION,
  { title: 'Resolución dependiente', icon: 'pi pi-sitemap', defs: [...CHILD_RUNTIME_BLOCK, ...CHILDREN_BLOCK] },
  { title: 'Rendimiento de la lista', icon: 'pi pi-bolt', defs: VIRTUAL_SCROLL_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

/**
 * Segmentos opcionales que el servidor concatena al consecutivo. Cada uno declara
 * el mismo contrato `{order, active, position, separator}` en `code.default`.
 */
const CODE_SEGMENTS: { key: string; label: string }[] = [
  { key: 'created_by', label: 'Usuario' },
  { key: 'company', label: 'Empresa' },
  { key: 'subsidiary', label: 'Sucursal' },
  { key: 'warehouse', label: 'Almacén' },
  { key: 'section', label: 'Sección' },
  { key: 'rack', label: 'Rack' },
  { key: 'slots', label: 'Ubicación' },
  { key: 'workshop', label: 'Taller' },
];

const CODE_SEGMENT_DEFS: AdvancedFieldDef[] = CODE_SEGMENTS.flatMap(({ key, label }): AdvancedFieldDef[] => {
  const segmentActive = (c: any) => getByPath(c, `default.${key}.active`) === true;
  return [
    {
      path: `default.${key}.active`, label: `${label} · Incluir`, kind: 'boolean',
      booleanOnLabel: 'Incluido', booleanOffLabel: 'Excluido',
      includeIf: hasKey(`default.${key}.active`), showIf: c => c?.default?.active,
    },
    {
      path: `default.${key}.order`, label: `${label} · Orden`, kind: 'number', min: 1,
      includeIf: hasKey(`default.${key}.order`), showIf: segmentActive,
    },
    {
      path: `default.${key}.position`, label: `${label} · Posición`, kind: 'select', options: POSITION_OPTIONS,
      includeIf: hasKey(`default.${key}.position`), showIf: segmentActive,
    },
    {
      path: `default.${key}.separator`, label: `${label} · Separador`, kind: 'text',
      includeIf: hasKey(`default.${key}.separator`), showIf: segmentActive,
    },
  ];
});

const CODE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Generación', icon: 'pi pi-cog', defs: [
      { path: 'initial', label: 'Inicial', kind: 'number', min: 0 },
      { path: 'default.active', label: 'Numeración automática', kind: 'boolean', booleanOnLabel: 'Numeración activa', booleanOffLabel: 'Numeración inactiva' },
      { path: 'default.edit', label: 'Edición del código', kind: 'boolean', booleanOnLabel: 'Código editable', booleanOffLabel: 'Código bloqueado' },
      {
        path: 'default.scope', label: 'Alcance de la numeración', kind: 'select',
        options: CODE_SCOPE_OPTIONS, showIf: c => c?.default?.active,
        hint: 'Segmentos que separan los consecutivos del código en el servidor.',
      },
      { path: 'default.fixed.active', label: 'Prefijo fijo', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.fixed.order', label: 'Orden del valor fijo', kind: 'number', min: 1, showIf: c => c?.default?.fixed?.active },
      { path: 'default.fixed.value', label: 'Valor fijo', kind: 'text', showIf: c => c?.default?.fixed?.active },
      {
        path: 'default.fixed.position', label: 'Posición del valor fijo', kind: 'select',
        options: [{ label: 'Prefijo', value: 'prefix' }, { label: 'Sufijo', value: 'suffix' }],
        showIf: c => c?.default?.fixed?.active,
      },
      { path: 'default.fixed.separator', label: 'Separador del valor fijo', kind: 'text', showIf: c => c?.default?.fixed?.active },
      { path: 'default.date.active', label: 'Incluir fecha', kind: 'boolean', showIf: c => c?.default?.active },
      {
        path: 'default.date.date_type', label: 'Origen de fecha', kind: 'select',
        options: [
          { label: 'Fecha actual', value: 'current' },
          { label: 'Fecha de caducidad', value: 'expiration_date' },
          { label: 'Fecha de lote', value: 'batch_date' },
          { label: 'Capturada por usuario', value: 'user_input' },
          { label: 'Fecha del documento', value: 'document_date' },
        ],
        showIf: c => c?.default?.date?.active,
      },
      {
        path: 'default.date.format', label: 'Formato de fecha', kind: 'select',
        options: [
          'YY', 'YYYY', 'MM', 'DD', 'HH', 'MI', 'SS',
          'YYMMDD', 'YYYYMMDD', 'DDMMYY', 'DDMMYYYY', 'MMDD', 'DDMM',
          'HHMI', 'HHMISS', 'YY-MM-DD', 'YYYY-MM-DD', 'DD-MM-YY',
          'DD-MM-YYYY', 'MM-DD', 'DD-MM', 'HH:MI', 'HH:MI:SS',
          'YYMMDDHHMMSSmicro', 'YYMMDDHHMMSS', 'YYMMDDHHMM', 'YYMMDDHH',
        ].map(value => ({ label: value, value })),
        showIf: c => c?.default?.date?.active,
      },
      {
        path: 'default.date.position', label: 'Posición de fecha', kind: 'select',
        options: [{ label: 'Prefijo', value: 'prefix' }, { label: 'Sufijo', value: 'suffix' }],
        showIf: c => c?.default?.date?.active,
      },
      { path: 'default.date.separator', label: 'Separador de fecha', kind: 'text', showIf: c => c?.default?.date?.active },
      { path: 'default.date.time_zone', label: 'Zona horaria IANA', kind: 'text', showIf: c => c?.default?.date?.active, hint: 'Ejemplo: America/Mexico_City o UTC.' },
      { path: 'default.fill.active', label: 'Relleno', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.fill.length', label: 'Largo total', kind: 'number', min: 1, showIf: c => c?.default?.fill?.active },
      {
        path: 'default.fill.char', label: 'Carácter de relleno', kind: 'text',
        showIf: c => c?.default?.fill?.active,
        hint: 'Acepta un carácter ASCII o random-numeric, random-alphanumeric y random-alpha.',
      },
      {
        path: 'default.fill.position', label: 'Posición del relleno', kind: 'select',
        options: [{ label: 'Prefijo', value: 'prefix' }, { label: 'Sufijo', value: 'suffix' }],
        showIf: c => c?.default?.fill?.active,
      },
      { path: 'default.fill.separator', label: 'Separador del relleno', kind: 'text', showIf: c => c?.default?.fill?.active },
    ]
  },
  { title: 'Segmentos del código', icon: 'pi pi-sitemap', defs: CODE_SEGMENT_DEFS },
  { title: 'Descripción del código', icon: 'pi pi-info-circle', defs: makeDescriptionBlock('default') },
  { title: 'Escáner', icon: 'pi pi-qrcode', defs: SCANNER_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const SELECT_BUTTON_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Selección', icon: 'pi pi-list', defs: [
      { path: 'multiple', label: 'Selección múltiple', kind: 'boolean' },
      { path: 'option_value', label: 'option_value', kind: 'text', /* placeholder: 'id' */ },
      { path: 'option_label', label: 'option_label', kind: 'text', /* placeholder: 'name' */ },
      {
        path: 'data_type.options', label: 'Opciones (JSON)', kind: 'json',
        hint: 'Array de objetos. P.ej. [{"id":"SI","name":"SI"},{"id":"NO","name":"NO"}]'
      },
      ...DATA_SOURCE_QUERY_BLOCK,
    ]
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: [...DEFAULT_BLOCK, ...RELATION_DEFAULT_BLOCK] },
  { title: 'Resolución dependiente', icon: 'pi pi-sitemap', defs: [...CHILD_RUNTIME_BLOCK, ...CHILDREN_BLOCK] },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const DOCUMENT_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Captura del documento', icon: 'pi pi-camera', defs: [
      {
        path: 'content_type', label: 'Tratamiento del archivo', kind: 'select',
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Ruta', value: 'path' },
          { label: 'Formulario multipart', value: 'form-data' },
        ],
      },
      {
        path: 'source', label: 'Origen permitido', kind: 'select',
        options: [
          { label: 'Cámara', value: 'camera' },
          { label: 'Galería', value: 'gallery' },
          { label: 'Cámara y galería', value: 'both' },
        ],
      },
      { path: 'quality', label: 'Calidad de imagen (%)', kind: 'number', min: 1, max: 100 },
      { path: 'max_width', label: 'Ancho máximo (px)', kind: 'number', min: 1 },
      { path: 'max_height', label: 'Alto máximo (px)', kind: 'number', min: 1 },
      { path: 'name_file_user', label: 'Nombre enviado por usuario', kind: 'text' },
    ],
  },
  ...FILES_SCHEMA.slice(1),
];

const EMAILS_CHIPS_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_JSON_BLOCK },
  {
    title: 'Validación de correos', icon: 'pi pi-envelope', defs: [
      { path: 'validation.max_emails', label: 'Máximo de correos', kind: 'number', min: 1, max: 100 },
      { path: 'validation.min_emails', label: 'Mínimo de correos', kind: 'number', min: 0, max: 100 },
      { path: 'validation.allow_duplicates', label: 'Correos duplicados', kind: 'boolean', booleanOnLabel: 'Permitir duplicados', booleanOffLabel: 'Sin duplicados' },
      { path: 'validation.domain_whitelist', label: 'Dominios permitidos (JSON)', kind: 'json' },
      { path: 'validation.domain_blacklist', label: 'Dominios bloqueados (JSON)', kind: 'json' },
      { path: 'validation.max_length_per_email', label: 'Longitud máxima por correo', kind: 'number', min: 1, max: 254 },
    ],
  },
  {
    title: 'Sugerencias', icon: 'pi pi-search', defs: [
      { path: 'suggestions.enabled', label: 'Autocompletado', kind: 'boolean', booleanOnLabel: 'Sugerencias habilitadas', booleanOffLabel: 'Sin sugerencias' },
      {
        path: 'suggestions.data_source', label: 'Origen de sugerencias', kind: 'select',
        options: [
          { label: 'Ninguno', value: 'none' },
          { label: 'API', value: 'api' },
          { label: 'Lista local', value: 'local' },
          { label: 'Usuarios', value: 'users' },
        ],
        showIf: c => c?.suggestions?.enabled,
      },
      { path: 'suggestions.min_chars', label: 'Caracteres mínimos', kind: 'number', min: 0, showIf: c => c?.suggestions?.enabled },
      { path: 'suggestions.max_suggestions', label: 'Máximo de sugerencias', kind: 'number', min: 1, showIf: c => c?.suggestions?.enabled },
      {
        path: 'suggestions.api_endpoint', label: 'Endpoint de sugerencias', kind: 'text',
        includeIf: hasKey('suggestions.api_endpoint'),
        showIf: c => c?.suggestions?.enabled && c?.suggestions?.data_source === 'api',
      },
      {
        path: 'suggestions.local_list', label: 'Lista local (JSON)', kind: 'json',
        includeIf: hasKey('suggestions.local_list'),
        showIf: c => c?.suggestions?.enabled && c?.suggestions?.data_source === 'local',
      },
      {
        path: 'suggestions.show_on_focus', label: 'Mostrar al enfocar', kind: 'boolean',
        includeIf: hasKey('suggestions.show_on_focus'), showIf: c => c?.suggestions?.enabled,
      },
    ],
  },
  {
    title: 'Separadores', icon: 'pi pi-ellipsis-h', defs: [
      { path: 'separator.comma', label: 'Coma', kind: 'boolean', includeIf: hasKey('separator.comma') },
      { path: 'separator.semicolon', label: 'Punto y coma', kind: 'boolean', includeIf: hasKey('separator.semicolon') },
      { path: 'separator.space', label: 'Espacio', kind: 'boolean', includeIf: hasKey('separator.space') },
      { path: 'separator.tab', label: 'Tabulador', kind: 'boolean', includeIf: hasKey('separator.tab') },
      { path: 'separator.blur', label: 'Al perder el foco', kind: 'boolean', includeIf: hasKey('separator.blur') },
      { path: 'separator.paste', label: 'Al pegar', kind: 'boolean', includeIf: hasKey('separator.paste') },
    ],
  },
  {
    title: 'Envío', icon: 'pi pi-send', defs: [
      { path: 'email_sending.enabled', label: 'Uso para envíos', kind: 'boolean', booleanOnLabel: 'Envío habilitado', booleanOffLabel: 'Solo captura' },
      {
        path: 'email_sending.send_mode', label: 'Modo de envío', kind: 'select',
        options: [
          { label: 'Individual', value: 'individual' },
          { label: 'Múltiple', value: 'multiple' },
          { label: 'Copia (CC)', value: 'cc' },
          { label: 'Copia oculta (BCC)', value: 'bcc' },
        ],
        showIf: c => c?.email_sending?.enabled,
      },
      {
        path: 'email_sending.priority', label: 'Prioridad', kind: 'select',
        options: [
          { label: 'Baja', value: 'low' },
          { label: 'Normal', value: 'normal' },
          { label: 'Alta', value: 'high' },
        ],
        showIf: c => c?.email_sending?.enabled,
      },
      {
        path: 'email_sending.max_recipients_per_email', label: 'Destinatarios por correo', kind: 'number', min: 1,
        includeIf: hasKey('email_sending.max_recipients_per_email'),
        showIf: c => c?.email_sending?.enabled && c?.email_sending?.send_mode === 'multiple',
      },
      {
        path: 'email_sending.batch_size', label: 'Tamaño del lote', kind: 'number', min: 1,
        includeIf: hasKey('email_sending.batch_size'), showIf: c => c?.email_sending?.enabled,
      },
      {
        path: 'email_sending.require_confirmation', label: 'Confirmación previa', kind: 'boolean',
        booleanOnLabel: 'Pedir confirmación', booleanOffLabel: 'Enviar directo',
        includeIf: hasKey('email_sending.require_confirmation'), showIf: c => c?.email_sending?.enabled,
      },
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const JSON_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_JSON_BLOCK },
  {
    title: 'Estructura', icon: 'pi pi-code', defs: [
      {
        path: 'fields', label: 'Campos dinámicos (JSON)', kind: 'json', includeIf: hasKey('fields'),
        hint: 'Definición de los campos que el formulario dibuja dentro de este JSON.',
      },
      { path: 'draw.dialog', label: 'Diálogo (JSON)', kind: 'json', includeIf: hasKey('draw.dialog') },
      { path: 'draw.grid', label: 'Cuadrícula (JSON)', kind: 'json', includeIf: hasKey('draw.grid') },
      {
        path: 'schema', label: 'Esquema de validación (JSON)', kind: 'json', includeIf: hasKey('schema'),
      },
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const TABLE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_JSON_BLOCK },
  {
    title: 'Columnas', icon: 'pi pi-table', defs: [
      {
        path: 'columns', label: 'Columnas (JSON)', kind: 'json', includeIf: hasKey('columns'),
        hint: 'Array de columnas; cada una declara field, header y su tipo de celda.',
      },
      { path: 'column_groups', label: 'Grupos de columnas (JSON)', kind: 'json', includeIf: hasKey('column_groups') },
      { path: 'frozen_columns', label: 'Columnas fijas (JSON)', kind: 'json', includeIf: hasKey('frozen_columns') },
      { path: 'frozen_rows', label: 'Filas fijas (JSON)', kind: 'json', includeIf: hasKey('frozen_rows') },
      { path: 'row_group', label: 'Agrupación de filas (JSON)', kind: 'json', includeIf: hasKey('row_group') },
      { path: 'row_span', label: 'Combinación de filas (JSON)', kind: 'json', includeIf: hasKey('row_span') },
    ],
  },
  {
    title: 'Edición de filas', icon: 'pi pi-pencil', defs: [
      { path: 'initial_rows', label: 'Filas iniciales', kind: 'number', min: 0, includeIf: hasKey('initial_rows') },
      {
        path: 'add_row', label: 'Agregar filas', kind: 'boolean',
        booleanOnLabel: 'Permitido', booleanOffLabel: 'Bloqueado', includeIf: hasKey('add_row'),
      },
      {
        path: 'delete_row', label: 'Eliminar filas', kind: 'boolean',
        booleanOnLabel: 'Permitido', booleanOffLabel: 'Bloqueado', includeIf: hasKey('delete_row'),
      },
      {
        path: 'selection_mode', label: 'Selección', kind: 'select',
        options: [
          { label: 'Una fila', value: 'single' },
          { label: 'Varias filas', value: 'multiple' },
        ],
        includeIf: hasKey('selection_mode'),
      },
    ],
  },
  {
    title: 'Presentación', icon: 'pi pi-eye', defs: [
      { path: 'sort', label: 'Ordenamiento', kind: 'boolean', includeIf: hasKey('sort') },
      { path: 'paginator', label: 'Paginador', kind: 'boolean', includeIf: hasKey('paginator') },
      { path: 'row_number', label: 'Número de fila', kind: 'boolean', includeIf: hasKey('row_number') },
      { path: 'show_grid_lines', label: 'Líneas de cuadrícula', kind: 'boolean', includeIf: hasKey('show_grid_lines') },
      { path: 'striped_rows', label: 'Filas alternadas', kind: 'boolean', includeIf: hasKey('striped_rows') },
      { path: 'column_resizing', label: 'Ancho ajustable', kind: 'boolean', includeIf: hasKey('column_resizing') },
      { path: 'export', label: 'Exportación', kind: 'boolean', includeIf: hasKey('export') },
      {
        path: 'responsive_layout', label: 'Comportamiento responsivo', kind: 'select',
        options: [
          { label: 'Desplazamiento', value: 'scroll' },
          { label: 'Apilado', value: 'stack' },
        ],
        includeIf: hasKey('responsive_layout'),
      },
    ],
  },
  DATA_SOURCE_SECTION,
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
  CACHE_SECTION,
];

const SIGNATURE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Firma', icon: 'pi pi-pencil', defs: [
      {
        path: 'add_signature', label: 'Captura de firma', kind: 'boolean',
        booleanOnLabel: 'Habilitada', booleanOffLabel: 'Deshabilitada', includeIf: hasKey('add_signature'),
      },
      { path: 'signature_width', label: 'Ancho del lienzo (px)', kind: 'number', min: 1, includeIf: hasKey('signature_width') },
      { path: 'signature_height', label: 'Alto del lienzo (px)', kind: 'number', min: 1, includeIf: hasKey('signature_height') },
      { path: 'pen_color', label: 'Color del trazo', kind: 'text', includeIf: hasKey('pen_color') },
      { path: 'background_color', label: 'Color de fondo', kind: 'text', includeIf: hasKey('background_color') },
      { path: 'border_color', label: 'Color del borde', kind: 'text', includeIf: hasKey('border_color') },
      { path: 'border_width', label: 'Grosor del borde (px)', kind: 'number', min: 0, includeIf: hasKey('border_width') },
    ],
  },
  {
    title: 'Alcance', icon: 'pi pi-shield', defs: [
      {
        path: 'client', label: 'Dispositivos permitidos', kind: 'multiselect', options: CLIENT_OPTIONS,
        includeIf: hasKey('client'),
      },
      {
        path: 'fields_accept_signature', label: 'Campos que confirman la firma (JSON)', kind: 'json',
        includeIf: hasKey('fields_accept_signature'),
      },
      {
        path: 'fields', label: 'Campos del bloque de firma (JSON)', kind: 'json', includeIf: hasKey('fields'),
        hint: 'Cada entrada declara field, label, type y sus validaciones.',
      },
    ],
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

const FALLBACK_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

export const TYPE_SCHEMAS: Record<string, AdvancedSection[]> = {
  'input-text': TEXT_SCHEMA,
  'input-password': TEXT_SCHEMA,
  'email': TEXT_SCHEMA,
  'textarea': TEXTAREA_SCHEMA,
  'input-number': NUMBER_SCHEMA,
  'toggle-button': TOGGLE_SCHEMA,
  'date': DATE_SCHEMA,
  'time': DATE_SCHEMA,
  'dropdown': FK_LIKE_SCHEMA,
  'dropdown-choice': FK_LIKE_SCHEMA,
  'multi-select': FK_LIKE_SCHEMA,
  // [[[II ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
  'multi-choice': MULTI_CHOICE_SCHEMA,
  // ]]]FI
  'tree-select': FK_LIKE_SCHEMA,
  'listbox': FK_LIKE_SCHEMA,
  'auto-complete': AUTOCOMPLETE_SCHEMA,
  'button': BUTTON_SCHEMA,
  'files': FILES_SCHEMA,
  'document': DOCUMENT_SCHEMA,
  'image-uploader': FILES_SCHEMA,
  'code': CODE_SCHEMA,
  'select-button': SELECT_BUTTON_SCHEMA,
  'json': JSON_SCHEMA,
  'emails-chips': EMAILS_CHIPS_SCHEMA,
  'table': TABLE_SCHEMA,
  'signature': SIGNATURE_SCHEMA,
  'signature-pad': SIGNATURE_SCHEMA,
  'login': FALLBACK_SCHEMA,
  'selfie': FALLBACK_SCHEMA,
};

export function schemaForType(type: string | undefined | null, config?: any): AdvancedSection[] {
  if (
    config?.field === 'code'
    && Object.prototype.hasOwnProperty.call(config?.default ?? {}, 'scope')
  ) {
    return CODE_SCHEMA;
  }
  if (!type) return FALLBACK_SCHEMA;
  return TYPE_SCHEMAS[type] ?? FALLBACK_SCHEMA;
}

// ─── Helpers de ruta con punto ────────────────────────────────────────────────

export function getByPath(obj: any, path: string): any {
  if (obj == null) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

export function setByPath<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const out: any = { ...(obj as any) };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] != null && typeof cur[k] === 'object' ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out as T;
}

// ─── Constantes UI auxiliares ─────────────────────────────────────────────────

export const WIDTH_PRESETS: { label: string; value: string }[] = [
  { label: 'Estrecho (300 px)', value: 'width-300px-custom' },
  { label: 'Pequeño (400 px)', value: 'width-400px-custom' },
  { label: 'Mediano (500 px)', value: 'width-500px-custom' },
  { label: 'Mediano (550 px)', value: 'width-550px-custom' },
  { label: 'Mediano (600 px)', value: 'width-600px-custom' },
  { label: 'Mediano (650 px)', value: 'width-650px-custom' },
  { label: 'Grande (700 px)', value: 'width-700px-custom' },
  { label: 'Grande (750 px)', value: 'width-750px-custom' },
  { label: 'Grande (800 px)', value: 'width-800px-custom' },
  { label: 'Grande (850 px)', value: 'width-850px-custom' },
  { label: 'Grande (900 px)', value: 'width-900px-custom' },
  { label: 'Extra (1000 px)', value: 'width-1000px-custom' },
  { label: 'Extra (1200 px)', value: 'width-1200px-custom' },
];

export const HEIGHT_PRESETS: { label: string; value: string }[] = [
  { label: 'Mínimo (550 px)', value: 'min-height-550px-custom' },
  { label: '100 px', value: 'height-100px-custom' },
  { label: '200 px', value: 'height-200px-custom' },
  { label: '250 px', value: 'height-250px-custom' },
  { label: '300 px', value: 'height-300px-custom' },
  { label: '350 px', value: 'height-350px-custom' },
  { label: '400 px', value: 'height-400px-custom' },
  { label: '450 px', value: 'height-450px-custom' },
  { label: '500 px', value: 'height-500px-custom' },
  { label: '550 px', value: 'height-550px-custom' },
  { label: '600 px', value: 'height-600px-custom' },
  { label: '650 px', value: 'height-650px-custom' },
  { label: '700 px', value: 'height-700px-custom' },
];
