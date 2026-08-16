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
  { path: 'default.value', label: 'Valor por defecto', kind: 'text', showIf: c => c?.default?.active },
  { path: 'default.edit', label: 'Edición del valor', kind: 'boolean', booleanOnLabel: 'Valor editable', booleanOffLabel: 'Valor bloqueado' },
];

const DEFAULT_JSON_BLOCK: AdvancedFieldDef[] = [
  { path: 'default.active', label: 'Valor por defecto', kind: 'boolean', booleanOnLabel: 'Aplicar valor', booleanOffLabel: 'Sin valor' },
  { path: 'default.value', label: 'Valor por defecto (JSON)', kind: 'json', showIf: c => c?.default?.active },
  { path: 'default.edit', label: 'Edición del valor', kind: 'boolean', booleanOnLabel: 'Valor editable', booleanOffLabel: 'Valor bloqueado' },
];

const DESCRIPTION_BLOCK: AdvancedFieldDef[] = [
  { path: 'description.active', label: 'Mostrar descripción', kind: 'boolean' },
  { path: 'description.name', label: 'Texto descripción', kind: 'text', showIf: c => c?.description?.active },
  { path: 'description.height', label: 'Alto', kind: 'text', /* placeholder: '60px' */ showIf: c => c?.description?.active },
  { path: 'description.slice', label: 'Cortar a (chars)', kind: 'text', showIf: c => c?.description?.active },
  { path: 'description.caracter_slice', label: 'Sufijo de corte', kind: 'text', /* placeholder: '' */ showIf: c => c?.description?.active },
];

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
    ],
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
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
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
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

const FK_LIKE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Origen de datos', icon: 'pi pi-database', defs: [
      { path: 'data_type.type', label: 'Fuente', kind: 'text', hint: 'Productos, clientes, etc' },
      { path: 'option_value', label: 'option_value', kind: 'text', /* placeholder: 'id' */ },
      { path: 'option_label', label: 'option_label', kind: 'text', /* placeholder: 'name' */ },
      { path: 'filter_local', label: 'Filtro local', kind: 'boolean' },
      { path: 'filter_by', label: 'Filtrar por (campos)', kind: 'text', /* placeholder: 'name' */ },
      { path: 'editable', label: 'Editable', kind: 'boolean' },
      { path: 'reload_icon', label: 'Icono recargar', kind: 'boolean' },
      { path: 'new_icon', label: 'Icono nuevo', kind: 'boolean' },
      { path: 'closable_icon', label: 'Icono limpiar', kind: 'boolean' },
    ],
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  { title: 'Resolución dependiente', icon: 'pi pi-sitemap', defs: CHILD_RUNTIME_BLOCK },
  ADDITIONAL_SEARCH_BLOCK,
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
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
      { path: 'selection_limit', label: 'Límite de selección', kind: 'number', min: 0 },
    ],
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];
// ]]]FI

const AUTOCOMPLETE_SCHEMA: AdvancedSection[] = [
  ...FK_LIKE_SCHEMA,
  {
    title: 'Auto-complete', icon: 'pi pi-search', defs: [
      { path: 'min_length', label: 'Largo mínimo', kind: 'number', min: 0 },
      { path: 'delay', label: 'Delay (ms)', kind: 'number', min: 0 },
      { path: 'multiple', label: 'Selección múltiple', kind: 'boolean' },
      { path: 'force_selection', label: 'Forzar selección', kind: 'boolean' },
      { path: 'auto_highlight', label: 'Resaltar primer item', kind: 'boolean' },
      { path: 'complete_on_focus', label: 'Buscar al enfocar', kind: 'boolean' },
      { path: 'select_on_focus', label: 'Seleccionar al enfocar', kind: 'boolean' },
      { path: 'scroll_height', label: 'Alto scroll', kind: 'text', /* placeholder: '200px' */ },
      { path: 'virtual_scroll', label: 'Scroll virtual', kind: 'boolean' },
      //{ path: 'placeholder', label: 'Placeholder', kind: 'text' },
    ],
  },
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
];

const FILES_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
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
    ],
  },
  {
    title: 'Subida servidor', icon: 'pi pi-cloud-upload', defs: [
      { path: 'server_upload.active', label: 'Activo', kind: 'boolean', includeIf: c => c?.server_upload != null },
      { path: 'server_upload.required', label: 'Requerido', kind: 'boolean', includeIf: c => c?.server_upload != null },
      { path: 'server_upload.max_files', label: 'Máx. archivos', kind: 'number', min: 1, includeIf: c => c?.server_upload != null },
      { path: 'server_upload.max_size', label: 'Tamaño máx (bytes)', kind: 'number', min: 0, includeIf: c => c?.server_upload != null },
    ],
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

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
  { title: 'Escáner', icon: 'pi pi-qrcode', defs: SCANNER_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
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
    ]
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
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
    ],
  },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

const JSON_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_JSON_BLOCK },
  { title: 'Descripción', icon: 'pi pi-info-circle', defs: DESCRIPTION_BLOCK },
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
  'table': FALLBACK_SCHEMA,
  'signature': FALLBACK_SCHEMA,
  'signature-pad': FALLBACK_SCHEMA,
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
