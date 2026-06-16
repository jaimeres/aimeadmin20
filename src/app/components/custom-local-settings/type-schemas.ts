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
  hint?: string;
}

export interface AdvancedSection {
  title: string;
  icon?: string;
  defs: AdvancedFieldDef[];
}

// ─── Bloques reutilizables ────────────────────────────────────────────────────

const COMMON_BASE: AdvancedFieldDef[] = [
  { path: 'label', label: 'Etiqueta', kind: 'text' },
  { path: 'field', label: 'Campo (API)', kind: 'text', hint: 'Nombre del campo enviado al servidor' },
  { path: 'class', label: 'Clase escritorio (col-span)', kind: 'text', placeholder: 'col-span-6' },
  { path: 'class_md', label: 'Clase móvil (md:col-span)', kind: 'text', placeholder: 'md:col-span-3' },
  { path: 'required', label: 'Requerido', kind: 'boolean' },
  { path: 'hide', label: 'Oculto', kind: 'boolean' },
  { path: 'readonly', label: 'Solo lectura', kind: 'boolean' },
  { path: 'autofocus', label: 'Auto-foco', kind: 'boolean' },
];

const DEFAULT_BLOCK: AdvancedFieldDef[] = [
  { path: 'default.active', label: 'Aplicar valor por defecto', kind: 'boolean' },
  { path: 'default.value', label: 'Valor por defecto', kind: 'text', showIf: c => c?.default?.active },
  { path: 'default.edit', label: 'Permitir editar el default', kind: 'boolean', showIf: c => c?.default?.active },
];

const DESCRIPTION_BLOCK: AdvancedFieldDef[] = [
  { path: 'description.active', label: 'Mostrar descripción', kind: 'boolean' },
  { path: 'description.name', label: 'Texto descripción', kind: 'textarea', showIf: c => c?.description?.active },
  { path: 'description.height', label: 'Alto', kind: 'text', placeholder: '60px', showIf: c => c?.description?.active },
  { path: 'description.slice', label: 'Cortar a (chars)', kind: 'text', showIf: c => c?.description?.active },
  { path: 'description.caracter_slice', label: 'Sufijo de corte', kind: 'text', placeholder: '...', showIf: c => c?.description?.active },
];

const SCANNER_BLOCK: AdvancedFieldDef[] = [
  { path: 'scanner.active', label: 'Habilitar escáner', kind: 'boolean' },
  { path: 'scanner.icon', label: 'Icono', kind: 'text', placeholder: 'pi pi-qrcode', showIf: c => c?.scanner?.active },
  { path: 'scanner.tooltip', label: 'Tooltip', kind: 'text', showIf: c => c?.scanner?.active },
  { path: 'scanner.hint', label: 'Hint (chars mínimos)', kind: 'number', min: 0, max: 99, showIf: c => c?.scanner?.active },
];

const COLS_BLOCK: AdvancedFieldDef[] = [
  { path: 'cols.label', label: 'Encabezado columna', kind: 'text' },
  { path: 'cols.hide', label: 'Ocultar en tabla', kind: 'boolean' },
  { path: 'cols.hide_mobile', label: 'Ocultar en móvil', kind: 'boolean' },
  { path: 'cols.sortable', label: 'Ordenable', kind: 'boolean' },
  { path: 'cols.locked', label: 'Bloqueada', kind: 'boolean' },
];

// ─── Schemas por type ─────────────────────────────────────────────────────────

const TEXT_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
  {
    title: 'Texto', icon: 'pi pi-pencil', defs: [
      { path: 'max_length', label: 'Largo máximo', kind: 'number', min: 0 },
      { path: 'min_length', label: 'Largo mínimo', kind: 'number', min: 0 },
      { path: 'placeholder', label: 'Placeholder', kind: 'text' },
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
      { path: 'default.value', label: 'Valor (true/false)', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.edit', label: 'Editable', kind: 'boolean', showIf: c => c?.default?.active },
    ]
  },
  {
    title: 'Etiquetas', icon: 'pi pi-tag', defs: [
      { path: 'label_true', label: 'Etiqueta verdadero', kind: 'text', placeholder: 'Activo' },
      { path: 'label_false', label: 'Etiqueta falso', kind: 'text', placeholder: 'Inactivo' },
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
      { path: 'default.edit', label: 'Editable', kind: 'boolean', showIf: c => c?.default?.active },
    ]
  },
  {
    title: 'Visual', icon: 'pi pi-calendar', defs: [
      { path: 'show_icon', label: 'Mostrar icono', kind: 'boolean' },
    ]
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

const FK_LIKE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Origen de datos', icon: 'pi pi-database', defs: [
      { path: 'data_type.type', label: 'Recurso (appType)', kind: 'text', hint: 'p.ej. asset, currency, slot' },
      { path: 'option_value', label: 'option_value', kind: 'text', placeholder: 'id' },
      { path: 'option_label', label: 'option_label', kind: 'text', placeholder: 'name' },
      { path: 'filter_local', label: 'Filtro local', kind: 'boolean' },
      { path: 'filter_by', label: 'Filtrar por (campos)', kind: 'text', placeholder: 'name' },
      { path: 'editable', label: 'Editable', kind: 'boolean' },
      { path: 'reload_icon', label: 'Icono recargar', kind: 'boolean' },
      { path: 'new_icon', label: 'Icono nuevo', kind: 'boolean' },
      { path: 'closable_icon', label: 'Icono limpiar', kind: 'boolean' },
    ],
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
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
      { path: 'option_value', label: 'option_value', kind: 'text', placeholder: 'id' },
      { path: 'option_label', label: 'option_label', kind: 'text', placeholder: 'name' },
      { path: 'filter_local', label: 'Filtro local', kind: 'boolean' },
      { path: 'filter_by', label: 'Filtrar por (campos)', kind: 'text', placeholder: 'name' },
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
      { path: 'scroll_height', label: 'Alto scroll', kind: 'text', placeholder: '200px' },
      { path: 'virtual_scroll', label: 'Scroll virtual', kind: 'boolean' },
      { path: 'placeholder', label: 'Placeholder', kind: 'text' },
    ],
  },
];

const BUTTON_SCHEMA: AdvancedSection[] = [
  {
    title: 'General', icon: 'pi pi-cog', defs: [
      ...COMMON_BASE.filter(d => d.path !== 'required' && d.path !== 'readonly'),
      { path: 'icon', label: 'Icono', kind: 'text', placeholder: 'pi pi-plus' },
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
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Success', value: 'success' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Danger', value: 'danger' },
          { label: 'Help', value: 'help' },
          { label: 'Contrast', value: 'contrast' },
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
      { path: 'server_upload.active', label: 'Activo', kind: 'boolean' },
      { path: 'server_upload.required', label: 'Requerido', kind: 'boolean' },
      { path: 'server_upload.max_files', label: 'Máx. archivos', kind: 'number', min: 1 },
      { path: 'server_upload.max_size', label: 'Tamaño máx (bytes)', kind: 'number', min: 0 },
    ],
  },
  { title: 'Columna en tabla', icon: 'pi pi-table', defs: COLS_BLOCK },
];

const CODE_SCHEMA: AdvancedSection[] = [
  { title: 'General', icon: 'pi pi-cog', defs: COMMON_BASE },
  {
    title: 'Generación', icon: 'pi pi-cog', defs: [
      { path: 'initial', label: 'Inicial', kind: 'number', min: 0 },
      { path: 'default.active', label: 'Aplicar default', kind: 'boolean' },
      {
        path: 'default.scope', label: 'Scope', kind: 'select',
        options: [
          { label: 'Todo', value: 'all' },
          { label: 'Crear', value: 'create' },
        ], showIf: c => c?.default?.active
      },
      { path: 'default.fixed.active', label: 'Prefijo fijo', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.fixed.value', label: 'Valor fijo', kind: 'text', showIf: c => c?.default?.fixed?.active },
      { path: 'default.date.active', label: 'Incluir fecha', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.date.format', label: 'Formato fecha', kind: 'text', placeholder: 'DDMMYY', showIf: c => c?.default?.date?.active },
      { path: 'default.fill.active', label: 'Relleno', kind: 'boolean', showIf: c => c?.default?.active },
      { path: 'default.fill.length', label: 'Largo total', kind: 'number', min: 1, showIf: c => c?.default?.fill?.active },
      { path: 'default.fill.char', label: 'Carácter de relleno', kind: 'text', showIf: c => c?.default?.fill?.active },
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
      { path: 'option_value', label: 'option_value', kind: 'text', placeholder: 'id' },
      { path: 'option_label', label: 'option_label', kind: 'text', placeholder: 'name' },
      {
        path: 'data_type.options', label: 'Opciones (JSON)', kind: 'json',
        hint: 'Array de objetos. P.ej. [{"id":"SI","name":"SI"},{"id":"NO","name":"NO"}]'
      },
    ]
  },
  { title: 'Valor por defecto', icon: 'pi pi-bolt', defs: DEFAULT_BLOCK },
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
  'image-uploader': FILES_SCHEMA,
  'code': CODE_SCHEMA,
  'select-button': SELECT_BUTTON_SCHEMA,
};

export function schemaForType(type: string | undefined | null): AdvancedSection[] {
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
