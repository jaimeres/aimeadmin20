import { CommonModule } from '@angular/common';
import {
  Component, EventEmitter, Input, OnChanges, OnDestroy,
  Output, computed, inject, signal, SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators, UntypedFormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DragDropModule } from 'primeng/dragdrop';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';

import { CRUDService } from '../../utils/services/crud.service';
import { GeneralService } from '../../utils/services/general.service';
import { SharedDynamicDataService } from '../../utils/services/shared-dynamic-data.service';
import {
  DEFAULT_LOCAL_SETTINGS_CONFIGURATION,
  LocalSettingsPlatformConfiguration,
  LocalSettingsSection,
} from '../../utils/local-settings-configuration';
import { MessageService } from '../services/message.service';

import {
  AdvancedFieldDef, AdvancedSection, getByPath, setByPath, schemaForType,
  WIDTH_PRESETS, HEIGHT_PRESETS,
} from './type-schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterFieldType = 'text' | 'numeric' | 'datetime' | 'boolean' | 'fk';

export interface FilterRow { active: boolean; op: string; }

interface OpOption { label: string; value: string; }

// [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
interface FilterableCol {
  field: string;
  filterField: string;
  filterKey: string;
  filterMode: 'simple' | 'explicit';
  header: string;
  type: string;
  data_type: any;
  filter_by: string;
  filter: any;
  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  /**
   * Recurso del servidor del que salen las opciones del filtro. Se resuelve del
   * `data_type.type` de la propia entrada y, si no lo declara, del campo contenedor
   * (misma autoridad que ya define la relacion real del filtro explicito: `status__code`).
   * Se guarda aparte de `data_type` para no alterar el autocomplete FK existente.
   */
  option_data_type: string;
  // ]]]FI
}
// ]]]FI

export interface ColsCfgData {
  label: string;
  sortable: boolean;
  locked: boolean;
  hideMobile: boolean;
}

export interface UnifiedFieldRow {
  field: string;
  header: string;
  hasFilter: boolean;
  inCols: boolean;
  colActive: boolean;
  inGrid: boolean;
  gridActive: boolean;
  gridSpan: number;
  gridSpanMd: number;
  colsCfg: ColsCfgData;
  fieldHide: boolean;
  fieldRequired: boolean;
  fieldReadonly: boolean;
  fieldPlaceholder: string;
  form: FormGroup;
}

interface UnifiedRowFormValue {
  label: string;
  colActive: boolean;
  sortable: boolean;
  locked: boolean;
  hideMobile: boolean;
  gridActive: boolean;
  gridSpan: number;
  gridSpanMd: number;
}

interface AdvancedFieldView extends AdvancedFieldDef {
  controlName: string;
  inputId: string;
  controlClass: string;
  optionsList: { label: string; value: any }[];
  booleanOnLabel: string;
  booleanOffLabel: string;
  disabled: boolean;
  isBoolean: boolean;
  isNumber: boolean;
  isSelect: boolean;
  isMultiselect: boolean;
  isTextarea: boolean;
  isJson: boolean;
}

interface AdvancedSectionView {
  title: string;
  icon?: string;
  defs: AdvancedFieldView[];
}

interface FilterEditorView {
  col: FilterableCol;
  state: FilterRow;
  type: FilterFieldType;
  operations: OpOption[];
  activeControl: FormControl<any>;
  operationControl: FormControl<any>;
  valueControl: FormControl<any>;
  secondValueControl: FormControl<any>;
  optionLabel: string;
  isNull: boolean;
  isRange: boolean;
  isIn: boolean;
  hasRelativePresets: boolean;
}

interface DialogCfg {
  width: string;
  height: string;
  plural: string;
  singular: string;
  pluralDefiniteArticle: string;
  singularIndefiniteArticle: string;
}

interface BehaviorCfg {
  load_on_start: boolean;
  load_on_start_mobile: boolean;
  silent: boolean;
  rows: number;
  rows_mobile: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_TYPES = new Set(['table', 'button', 'document', 'signature', 'selfie', 'signature-pad']);
const FK_MIN_CHARS = 5;

// [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
/**
 * Recursos cuyas opciones pertenecen al modulo actual y no al catalogo completo.
 * `status` lo es por diseño: el modelo guarda `module` y el resto del cliente ya lo
 * respeta (`dependentStatus` compara `status.module` contra `this.module[pos]`), de modo
 * que sin este filtro la configuracion ofreceria estados de otros modulos.
 * La clave de modulo NO se escribe aqui: llega en `field.module` desde el componente.
 */
const MODULE_SCOPED_OPTION_TYPES = new Set(['status']);
// ]]]FI

function colTypeToFilterType(colType: string): FilterFieldType {
  switch (colType) {
    case 'input-text':
    case 'textarea':
    case 'input-password':
    case 'email':
    case 'code':
      return 'text';
    case 'input-number':
      return 'numeric';
    case 'date':
    case 'time':
      return 'datetime';
    case 'toggle-button':
      return 'boolean';
    case 'dropdown':
    case 'dropdown-choice':
    case 'multi-select':
    // [[[II ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
    case 'multi-choice':
    // ]]]FI
    case 'auto-complete':
    case 'tree-select':
    // [[[II ESC:007-03 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-03
    case 'listbox':
    // ]]]FI
    case 'select-button':
      return 'fk';
    default:
      return 'text';
  }
}

const OP_LABELS: Record<string, string> = {
  exact: 'Igual a', icontains: 'Contiene', iexact: 'Igual (sin distinción)',
  contains: 'Contiene (exacto)', in: 'Varios elementos', isnull: 'Es nulo / vacío',
  gt: 'Mayor que', lt: 'Menor que', gte: 'Mayor o igual', lte: 'Menor o igual',
  range: 'Rango', year: 'Por año', month: 'Por mes', day: 'Por día',
};

const DEFAULT_OPS: Record<FilterFieldType, string[]> = {
  text: ['icontains', 'exact', 'iexact', 'in'],
  numeric: ['exact', 'gt', 'lt', 'gte', 'lte', 'range', 'in', 'isnull'],
  datetime: ['exact', 'gt', 'lt', 'gte', 'lte', 'range', 'isnull'],
  boolean: ['exact', 'isnull'],
  fk: ['exact', 'in', 'isnull'],
};

const DEFAULT_DIALOG_CFG: DialogCfg = {
  width: 'width-1200px-custom',
  height: 'min-height-550px-custom',
  plural: '', singular: '',
  pluralDefiniteArticle: '', singularIndefiniteArticle: '',
};

const DEFAULT_BEHAVIOR_CFG: BehaviorCfg = {
  load_on_start: false, load_on_start_mobile: false, silent: true,
  rows: 20, rows_mobile: 10,
};

// ─── Component ────────────────────────────────────────────────────────────────

// [[[II ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07
@Component({
  selector: 'app-custom-local-settings-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    AccordionModule, AutoCompleteModule, ButtonModule,
    DatePickerModule, DialogModule, DragDropModule, FloatLabelModule,
    InputNumberModule, InputTextModule, MultiSelectModule, SelectModule, TabsModule,
    TagModule, TextareaModule, TooltipModule, ToggleButtonModule,
  ],
  templateUrl: './custom-local-settings.component.html',
  styleUrl: './custom-local-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// ]]]FI
export class CustomLocalSettingsComponent implements OnChanges, OnDestroy {

  private crudS = inject(CRUDService);
  private generalS = inject(GeneralService);
  private messageS = inject(MessageService);
  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  private sharedS = inject(SharedDynamicDataService);
  // ]]]FI

  // ─── Inputs / Outputs ─────────────────────────────────────────────────────

  @Input() visible = false;
  @Input() field: any = {};
  @Input() formGroup: FormGroup | undefined;
  // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
  @Input() sectionConfiguration: LocalSettingsPlatformConfiguration = {
    ...DEFAULT_LOCAL_SETTINGS_CONFIGURATION.web,
  };
  // ]]]FI
  @Output() visibleAction = new EventEmitter<boolean>();
  @Output() saveAction = new EventEmitter<void>();

  // ─── State signals ────────────────────────────────────────────────────────

  visibleSignal = signal<boolean>(false);
  fieldSignal = signal<any>(null);
  formGroupSignal = signal<FormGroup | undefined>(undefined);

  filterState = signal<Record<string, FilterRow>>({});
  dropdownOptionsSignal = signal<Record<string, any[]>>({});
  fkSuggestionsSignal = signal<Record<string, any[]>>({});
  fkSearchHintSignal = signal<Record<string, string>>({});

  unifiedRows = signal<UnifiedFieldRow[]>([]);
  previewVisible = signal<boolean>(false);

  /** Pestañas detectadas en `draw` (excluye `dialog`) */
  drawTabs = signal<string[]>(['general']);
  activeDrawTab = signal<string>('general');

  /** Pestaña activa en el TabView principal */
  activeMainTab = signal<string>('layout');

  // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
  readonly localSettingsSections = signal<LocalSettingsPlatformConfiguration>({
    ...DEFAULT_LOCAL_SETTINGS_CONFIGURATION.web,
  });
  readonly availableMainTabs = computed<LocalSettingsSection[]>(() => {
    const configuration = this.localSettingsSections();
    return (['dialog', 'layout', 'behavior', 'filters'] as LocalSettingsSection[])
      .filter(section => configuration[section]);
  });
  // ]]]FI

  dialogCfg = signal<DialogCfg>({ ...DEFAULT_DIALOG_CFG });
  behaviorCfg = signal<BehaviorCfg>({ ...DEFAULT_BEHAVIOR_CFG });

  /** Field actualmente en el editor avanzado, o null */
  advancedField = signal<string | null>(null);
  advancedSnapshot = signal<any>(null);

  /** Para drag/drop de PrimeNG */
  private _dragOriginIdx = signal<number | null>(null);
  private readonly _subscriptions = new Subscription();
  private readonly _rowFormSubscriptions = new Map<string, Subscription>();
  private _syncingForms = false;

  filterValuesFormGroup = new UntypedFormGroup({});
  readonly advancedForm = new FormGroup({});
  readonly dialogForm = new FormGroup({
    width: new FormControl(DEFAULT_DIALOG_CFG.width, { nonNullable: true }),
    height: new FormControl(DEFAULT_DIALOG_CFG.height, { nonNullable: true }),
    singular: new FormControl('', { nonNullable: true }),
    plural: new FormControl('', { nonNullable: true }),
    singularIndefiniteArticle: new FormControl('', { nonNullable: true }),
    pluralDefiniteArticle: new FormControl('', { nonNullable: true }),
  });
  readonly behaviorForm = new FormGroup({
    load_on_start: new FormControl(DEFAULT_BEHAVIOR_CFG.load_on_start, { nonNullable: true }),
    load_on_start_mobile: new FormControl(DEFAULT_BEHAVIOR_CFG.load_on_start_mobile, { nonNullable: true }),
    silent: new FormControl(DEFAULT_BEHAVIOR_CFG.silent, { nonNullable: true }),
    rows: new FormControl(DEFAULT_BEHAVIOR_CFG.rows, { nonNullable: true }),
    rows_mobile: new FormControl(DEFAULT_BEHAVIOR_CFG.rows_mobile, { nonNullable: true }),
  });

  readonly booleanOptions = [
    { id: 'true', name: 'Sí / Verdadero' },
    { id: 'false', name: 'No / Falso' },
  ];

  readonly widthOptions = WIDTH_PRESETS;
  readonly heightOptions = HEIGHT_PRESETS;
  readonly spanOptions = Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1} ${index === 0 ? 'columna' : 'columnas'}`,
    value: index + 1,
  }));

  // ─── Computed maps (evita funciones en HTML) ──────────────────────────────

  private _fieldTypeMap = computed<Record<string, string>>(() => {
    const rawFields = this.fieldSignal()?.fields;
    const map: Record<string, string> = {};
    if (!rawFields) return map;
    if (Array.isArray(rawFields)) {
      for (const f of rawFields) {
        const key = f?.field ?? f?.name;
        if (key && f?.type) map[key] = f.type;
      }
    } else {
      for (const [key, val] of Object.entries(rawFields as Record<string, any>)) {
        if ((val as any)?.type) map[key] = (val as any).type;
      }
    }
    return map;
  });

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  filterableCols = computed<FilterableCol[]>(() => {
    const rawFields = this.fieldSignal()?.fields;
    if (!rawFields) return [];
    const colsArr: any[] = this.fieldSignal()?.cols ?? [];
    const labelMap: Record<string, string> = {};
    for (const c of colsArr) if (c?.field && c?.header) labelMap[c.field] = c.header;
    const entries: [string, any][] = Array.isArray(rawFields)
      ? rawFields.map((f: any) => [f?.field ?? f?.name, f])
      : Object.entries(rawFields as Record<string, any>);
    return entries
      .flatMap(([fieldName, cfg]: [string, any]) =>
        this._buildFilterableCols(fieldName, cfg, labelMap[fieldName])
      )
      .filter((col: any) => {
        if (!col.field) return false;
        if (col.filter?.ui === false) return false;
        return !SKIP_TYPES.has(col.type);
      });
  });

  filterableColMap = computed<Record<string, FilterableCol>>(() =>
    Object.fromEntries(this.filterableCols().map(c => [c.filterKey, c]))
  );

  filterTypeByField = computed<Record<string, FilterFieldType>>(() => {
    const map: Record<string, FilterFieldType> = {};
    for (const c of this.filterableCols()) map[c.filterKey] = colTypeToFilterType(c.type ?? '');
    return map;
  });

  opsOptionsByField = computed<Record<string, OpOption[]>>(() => {
    const map: Record<string, OpOption[]> = {};
    for (const c of this.filterableCols()) {
      const rawOps = c?.filter?.ops;
      const ops: string[] = Array.isArray(rawOps)
        ? rawOps
        : (rawOps && typeof rawOps === 'object' ? Object.values(rawOps) : []) as string[];
      const eff = ops.length > 0 ? ops : (DEFAULT_OPS[colTypeToFilterType(c.type ?? '')] ?? ['exact']);
      map[c.filterKey] = eff.map(op => ({ label: OP_LABELS[op] ?? op, value: op }));
    }
    return map;
  });
  // ]]]FI

  activeFilterCount = computed<number>(() =>
    Object.values(this.filterState()).filter(r => r.active).length
  );

  /** Cuenta de filas visibles en formulario (para badge en pestaña Tabla/Form) */
  visibleFormCount = computed<number>(() =>
    this.unifiedRows().filter(r => r.inGrid && r.gridActive).length
  );

  /** Esquema de campos avanzados según el `type` del campo abierto */
  advancedSchema = computed<AdvancedSection[]>(() => {
    const f = this.advancedField();
    if (!f) return [];
    const fields = this.fieldSignal()?.fields ?? {};
    const cfg: any = Array.isArray(fields)
      ? (fields as any[]).find(x => (x?.field ?? x?.name) === f)
      : (fields as Record<string, any>)[f];
    return schemaForType(cfg?.type, cfg);
  });

  readonly advancedSectionViews = computed<AdvancedSectionView[]>(() => {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return [];
    return this.advancedSchema()
      .map(section => ({
        title: section.title,
        icon: section.icon,
        defs: section.defs
          .filter(def => !def.includeIf || def.includeIf(snapshot))
          .map(def => this._advancedFieldView(def, snapshot)),
      }))
      .filter(section => section.defs.length > 0);
  });

  readonly filterEditorRows = computed<FilterEditorView[]>(() => {
    const states = this.filterState();
    const types = this.filterTypeByField();
    const operations = this.opsOptionsByField();
    return this.filterableCols().map(col => {
      const state = states[col.filterKey] ?? { active: false, op: 'exact' };
      return {
        col,
        state,
        type: types[col.filterKey] ?? 'text',
        operations: operations[col.filterKey] ?? [],
        activeControl: this._filterControl(`fa_${col.filterKey}`),
        operationControl: this._filterControl(`fo_${col.filterKey}`),
        valueControl: this._filterControl(`fv_${col.filterKey}`),
        secondValueControl: this._filterControl(`fv_${col.filterKey}_2`),
        optionLabel: this.getOptionLabel(col),
        isNull: state.op === 'isnull',
        isRange: state.op === 'range',
        isIn: state.op === 'in',
        hasRelativePresets: state.active
          && types[col.filterKey] === 'datetime'
          && col.filter?.relative?.enabled !== false,
      };
    });
  });

  constructor() {
    this._subscriptions.add(this.dialogForm.valueChanges.subscribe(value => {
      if (this._syncingForms) return;
      this.dialogCfg.set({ ...DEFAULT_DIALOG_CFG, ...value } as DialogCfg);
    }));
    this._subscriptions.add(this.behaviorForm.valueChanges.subscribe(value => {
      if (this._syncingForms) return;
      this.behaviorCfg.set({ ...DEFAULT_BEHAVIOR_CFG, ...value } as BehaviorCfg);
    }));
    this._subscriptions.add(this.advancedForm.valueChanges.subscribe(() => this._applyAdvancedFormValue()));
  }

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  private _buildFilterableCols(fieldName: string, cfg: any, colHeader?: string): FilterableCol[] {
    const filter = cfg?.cols?.filter ?? {};
    const header = colHeader ?? cfg?.cols?.label ?? cfg?.label ?? fieldName;
    const explicitEntries = this._explicitFilterEntries(filter);
    const rows: FilterableCol[] = [];

    if (explicitEntries.length === 0 || this._isFilterEntry(filter)) {
      rows.push({
        field: fieldName,
        filterField: fieldName,
        filterKey: fieldName,
        filterMode: 'simple',
        header,
        type: cfg?.type ?? '',
        data_type: cfg?.data_type?.type ?? '',
        filter_by: cfg?.cols?.filter?.by ?? cfg?.filter_by ?? '',
        filter,
        option_data_type: '',
      });
    }

    for (const [filterField, entry] of explicitEntries) {
      rows.push({
        field: fieldName,
        filterField,
        filterKey: `${fieldName}::${filterField}`,
        filterMode: 'explicit',
        header: `${header} / ${entry?.label ?? entry?.header ?? filterField}`,
        type: this._resolveExplicitFilterType(entry),
        data_type: entry?.data_type?.type ?? entry?.data_type ?? '',
        filter_by: entry?.by ?? entry?.filter_by ?? '',
        filter: entry,
        // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
        option_data_type: entry?.data_type?.type ?? entry?.data_type ?? cfg?.data_type?.type ?? '',
        // ]]]FI
      });
    }

    return rows;
  }

  private _explicitFilterEntries(filter: any): [string, any][] {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [];
    const reserved = new Set(['active', 'default', 'default_value', 'ops', 'option_value', 'by', 'relative', 'ui', 'option_label']);
    return Object.entries(filter)
      .filter(([key, value]: [string, any]) => key !== 'logic' && !reserved.has(key) && this._isFilterEntry(value)) as [string, any][];
  }

  private _isFilterEntry(filter: any): boolean {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return false;
    return Object.prototype.hasOwnProperty.call(filter, 'active')
      || Object.prototype.hasOwnProperty.call(filter, 'default')
      || Object.prototype.hasOwnProperty.call(filter, 'default_value')
      || Object.prototype.hasOwnProperty.call(filter, 'ops')
      || Object.prototype.hasOwnProperty.call(filter, 'option_value');
  }

  private _resolveExplicitFilterType(filter: any): string {
    if (filter?.type) return filter.type;
    if (typeof filter?.default_value === 'boolean') return 'toggle-button';
    if (typeof filter?.default_value === 'number') return 'input-number';
    return 'input-text';
  }
  // ]]]FI

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) this.visibleSignal.set(changes['visible'].currentValue);
    // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
    if (changes['sectionConfiguration']) {
      this.localSettingsSections.set({
        ...DEFAULT_LOCAL_SETTINGS_CONFIGURATION.web,
        ...(changes['sectionConfiguration'].currentValue ?? {}),
      });
      const availableTabs = this.availableMainTabs();
      if (!availableTabs.includes(this.activeMainTab() as LocalSettingsSection)) {
        this.activeMainTab.set(availableTabs[0] ?? 'layout');
      }
    }
    // ]]]FI
    if (changes['field']) {
      this.fieldSignal.set(changes['field'].currentValue);
      this._initFromField();
    }
    if (changes['formGroup']) this.formGroupSignal.set(changes['formGroup'].currentValue);
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
    this._rowFormSubscriptions.forEach(subscription => subscription.unsubscribe());
    this._rowFormSubscriptions.clear();
  }

  // ─── FK / dropdowns ───────────────────────────────────────────────────────

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  completeFkMethod(event: { query: string }, col: any): void {
    const q = (event?.query ?? '').trim();
    const dataType = col?.data_type?.type ?? col?.data_type;
    const filterKey = col?.filterKey ?? col?.field;

    if (dataType) {
      if (q.length > 0 && q.length < FK_MIN_CHARS) {
        this.fkSuggestionsSignal.update(s => ({ ...s, [filterKey]: [] }));
        this.fkSearchHintSignal.update(s => ({
          ...s, [filterKey]: `Escriba al menos ${FK_MIN_CHARS} caracteres para buscar`
        }));
        return;
      }
      this.fkSearchHintSignal.update(s => ({ ...s, [filterKey]: '' }));
      if (q.length === 0) {
        this.fkSuggestionsSignal.update(s => ({ ...s, [filterKey]: [] }));
        return;
      }
      const appTypeEntry = this.crudS.getAppType(dataType);
      const app = appTypeEntry?.app;
      const type = appTypeEntry?.type;
      if (app && type) {
        const filterByRaw: string = col?.filter_by ?? '';
        let filter: string;
        if (filterByRaw) {
          const filterFields = filterByRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
          filter = filterFields.map((f: string) => `filter[${f}.icontains]=${encodeURIComponent(q)}`).join('&');
        } else {
          filter = `filter[search]=${encodeURIComponent(q)}`;
        }
        this.crudS.getObject({ app, type, filter }).subscribe((data: any) => {
          const options = this.generalS.DJAtoObject({
            respDJA: data,
            fields: { [col.field]: {} },
          });
          this.fkSuggestionsSignal.update(s => ({ ...s, [filterKey]: options }));
        });
        return;
      }
    }
    this.fkSearchHintSignal.update(s => ({ ...s, [filterKey]: '' }));
    const all = this.dropdownOptionsSignal()[filterKey] ?? [];
    const label = this.getOptionLabel(col);
    const filtered = q
      ? all.filter((o: any) => String(o[label] ?? '').toLowerCase().includes(q.toLowerCase()))
      : [...all];
    this.fkSuggestionsSignal.update(s => ({ ...s, [filterKey]: filtered }));
  }
  // ]]]FI

  hasRelativePresets(filterKey: string): boolean {
    const col = this.filterableColMap()[filterKey];
    if (!col) return false;
    if (this.filterTypeByField()[filterKey] !== 'datetime') return false;
    const row = this.getRow(filterKey);
    return row.active && (col.filter?.relative?.enabled !== false);
  }

  getRow(field: string): FilterRow {
    return this.filterState()[field] ?? { active: false, op: 'exact' };
  }

  getControl(name: string): FormControl<any> {
    return (this.filterValuesFormGroup.get(name) ?? new FormControl(null)) as FormControl<any>;
  }

  getOptionLabel(col: any): string {
    const ol = col?.filter?.option_label ?? col?.option_label ?? 'name';
    return Array.isArray(ol) ? ol[0] : ol;
  }

  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  /**
   * `true` cuando el filtro puede ofrecer una lista de opciones del servidor en vez de
   * que el usuario escriba la clave. Se decide por configuracion (`option_data_type`
   * resoluble en `getAppType`), no por si las opciones ya llegaron: asi la fila nunca
   * llega a mostrar las claves crudas mientras se carga.
   */
  hasOptionList(filterKey: string): boolean {
    const col = this.filterableColMap()[filterKey];
    if (!col || col.filterMode !== 'explicit') return false;
    return !!this.crudS.getAppType(col.option_data_type);
  }

  optionsFor(filterKey: string): any[] {
    return this.dropdownOptionsSignal()[filterKey] ?? [];
  }

  /**
   * Clave que se guarda en `default_value`. Por defecto el propio campo del filtro
   * (`status.filter.code` -> `code`), que es el que viaja en `filter[status__code.in]`.
   */
  getOptionValue(col: any): string {
    return col?.filter?.option_value ?? col?.filterField ?? 'id';
  }
  // ]]]FI

  isRangeOp(op: string): boolean { return op === 'range'; }
  isNullOp(op: string): boolean { return op === 'isnull'; }
  isInOp(op: string): boolean { return op === 'in'; }

  // ─── Drag & drop (PrimeNG primitives) ─────────────────────────────────────

  onRowDragStart(i: number): void { this._dragOriginIdx.set(i); }
  onRowDragEnd(): void { this._dragOriginIdx.set(null); }

  onRowDropAt(targetIdx: number): void {
    const from = this._dragOriginIdx();
    this._dragOriginIdx.set(null);
    if (from === null || from === targetIdx) return;
    const arr = [...this.unifiedRows()];
    const [item] = arr.splice(from, 1);
    arr.splice(targetIdx, 0, item);
    this.unifiedRows.set(arr);
  }

  // ─── Toggles & setters de fila unificada ──────────────────────────────────

  toggleUnifiedColActive(i: number, colActive: boolean): void {
    (this.unifiedRows()[i]?.form.get('colActive') as FormControl | null)?.setValue(colActive);
  }

  toggleUnifiedGridActive(i: number, gridActive: boolean): void {
    (this.unifiedRows()[i]?.form.get('gridActive') as FormControl | null)?.setValue(gridActive);
  }

  setUnifiedSpan(i: number, val: number, key: 'gridSpan' | 'gridSpanMd'): void {
    const clamped = Math.min(12, Math.max(1, Math.round(val ?? 1)));
    (this.unifiedRows()[i]?.form.get(key) as FormControl | null)?.setValue(clamped);
  }

  setColsCfg(i: number, key: keyof ColsCfgData, val: any): void {
    const controlName: Record<keyof ColsCfgData, keyof UnifiedRowFormValue> = {
      label: 'label', sortable: 'sortable', locked: 'locked', hideMobile: 'hideMobile',
    };
    (this.unifiedRows()[i]?.form.get(controlName[key]) as FormControl | null)?.setValue(val);
  }

  setFieldProp(
    i: number,
    key: 'fieldHide' | 'fieldRequired' | 'fieldReadonly' | 'fieldPlaceholder',
    val: any
  ): void {
    const arr = [...this.unifiedRows()];
    arr[i] = { ...arr[i], [key]: val };
    this.unifiedRows.set(arr);
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  toggleFilter(filterKey: string, active: boolean): void {
    const col = this.filterableColMap()[filterKey];
    const ops = this.opsOptionsByField()[filterKey]?.map(o => o.value) ?? ['exact'];
    const op = active ? (col?.filter?.default ?? ops[0] ?? 'exact') : this.getRow(filterKey).op;
    this.filterState.update(st => ({ ...st, [filterKey]: { active, op } }));
    this._filterControl(`fa_${filterKey}`).setValue(active, { emitEvent: false });
    this._filterControl(`fo_${filterKey}`).setValue(op, { emitEvent: false });
    this._syncFilterDisabledState(filterKey, active);
  }

  setOp(filterKey: string, op: string): void {
    this.filterState.update(st => ({ ...st, [filterKey]: { ...this.getRow(filterKey), op } }));
    this._filterControl(`fo_${filterKey}`).setValue(op, { emitEvent: false });
    this.filterValuesFormGroup.get(`fv_${filterKey}`)?.setValue(null, { emitEvent: false });
    this.filterValuesFormGroup.get(`fv_${filterKey}_2`)?.setValue(null, { emitEvent: false });
  }

  applyRelativePreset(filterKey: string, preset: string): void {
    const now = new Date();
    let v1: Date | null = null, v2: Date | null = null;
    switch (preset) {
      case 'day': v1 = this._startOf('day', now); v2 = this._endOf('day', now); break;
      case 'week': v1 = this._startOf('week', now); v2 = this._endOf('week', now); break;
      case 'month': v1 = this._startOf('month', now); v2 = this._endOf('month', now); break;
      case 'year': v1 = this._startOf('year', now); v2 = this._endOf('year', now); break;
    }
    this.filterState.update(st => ({ ...st, [filterKey]: { active: true, op: 'range' } }));
    this._filterControl(`fa_${filterKey}`).setValue(true, { emitEvent: false });
    this._filterControl(`fo_${filterKey}`).setValue('range', { emitEvent: false });
    this._syncFilterDisabledState(filterKey, true);
    this.filterValuesFormGroup.get(`fv_${filterKey}`)?.setValue(v1);
    this.filterValuesFormGroup.get(`fv_${filterKey}_2`)?.setValue(v2);
  }

  resetFilter(filterKey: string): void {
    const col = this.filterableColMap()[filterKey];
    const ops = this.opsOptionsByField()[filterKey]?.map(o => o.value) ?? ['exact'];
    this.filterState.update(st => ({
      ...st, [filterKey]: { active: false, op: col?.filter?.default ?? ops[0] ?? 'exact' },
    }));
    this._filterControl(`fa_${filterKey}`).setValue(false, { emitEvent: false });
    this._filterControl(`fo_${filterKey}`).setValue(col?.filter?.default ?? ops[0] ?? 'exact', { emitEvent: false });
    this._syncFilterDisabledState(filterKey, false);
    this.filterValuesFormGroup.get(`fv_${filterKey}`)?.setValue(null, { emitEvent: false });
    this.filterValuesFormGroup.get(`fv_${filterKey}_2`)?.setValue(null, { emitEvent: false });
  }
  // ]]]FI

  resetAllFilters(): void { this._initFilterState(); }

  // ─── Pestañas de `draw` ───────────────────────────────────────────────────

  setActiveDrawTab(tab: string): void {
    if (tab === this.activeDrawTab()) return;
    // Persistir filas actuales en la pestaña previa
    this._stashCurrentDrawTab();
    this.activeDrawTab.set(tab);
    this._loadDrawTabIntoRows(tab);
  }

  /** Mapa por pestaña: tab → grid (key→cfg) construido en runtime */
  private _drawTabsBuffer: Record<string, Record<string, any>> = {};

  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  /**
   * Modulo con el que se cargaron las opciones de cada filtro (`filterKey` -> modulo).
   * Es lo que garantiza una sola consulta por app: mientras la clave no cambie, reabrir
   * el dialogo o recibir otra vez la config no vuelve a consultar; si cambia la app, ese
   * filtro se recarga acotado a la nueva.
   */
  private _optionsLoadedFor: Record<string, any> = {};
  // ]]]FI

  // ─── Editor avanzado por tipo ─────────────────────────────────────────────

  openAdvanced(field: string): void {
    const fields = this.fieldSignal()?.fields ?? {};
    const cfg: any = Array.isArray(fields)
      ? (fields as any[]).find(x => (x?.field ?? x?.name) === field)
      : (fields as Record<string, any>)[field];
    this.advancedSnapshot.set(structuredClone(cfg ?? {}));
    this.advancedField.set(field);
    this._syncAdvancedForm();
  }

  closeAdvanced(): void {
    this.advancedField.set(null);
    this.advancedSnapshot.set(null);
    Object.keys(this.advancedForm.controls).forEach(controlName => {
      this.advancedForm.removeControl(controlName, { emitEvent: false });
    });
  }

  private _advancedFieldView(def: AdvancedFieldDef, snapshot: any): AdvancedFieldView {
    return {
      ...def,
      controlName: this._advancedControlName(def.path),
      inputId: `local-setting-${def.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      controlClass: def.kind === 'number' ? 'col-span-12 md:col-span-4' : 'col-span-12 md:col-span-6',
      optionsList: def.options ?? [],
      booleanOnLabel: def.booleanOnLabel ?? def.label,
      booleanOffLabel: def.booleanOffLabel ?? 'Deshabilitado',
      disabled: !!def.showIf && !def.showIf(snapshot),
      isBoolean: def.kind === 'boolean',
      isNumber: def.kind === 'number',
      isSelect: def.kind === 'select',
      isMultiselect: def.kind === 'multiselect',
      isTextarea: def.kind === 'textarea',
      isJson: def.kind === 'json',
    };
  }

  private _advancedControlName(path: string): string {
    return `adv_${path.replace(/[^a-zA-Z0-9_]/g, '__')}`;
  }

  private _currentAdvancedDefs(): AdvancedFieldDef[] {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return [];
    return this.advancedSchema()
      .flatMap(section => section.defs)
      .filter(def => !def.includeIf || def.includeIf(snapshot));
  }

  private _syncAdvancedForm(): void {
    const snapshot = this.advancedSnapshot();
    const defs = snapshot ? this._currentAdvancedDefs() : [];
    const activeControls = new Set(defs.map(def => this._advancedControlName(def.path)));
    this._syncingForms = true;

    Object.keys(this.advancedForm.controls).forEach(controlName => {
      if (!activeControls.has(controlName)) {
        this.advancedForm.removeControl(controlName, { emitEvent: false });
      }
    });

    defs.forEach(def => {
      const controlName = this._advancedControlName(def.path);
      if (!this.advancedForm.contains(controlName)) {
        this.advancedForm.addControl(controlName, new FormControl(null, this._advancedValidators(def)), { emitEvent: false });
      }
      const control = (this.advancedForm.controls as Record<string, FormControl>)[controlName];
      control.setValidators(this._advancedValidators(def));
      const value = getByPath(snapshot, def.path);
      control.setValue(def.kind === 'json' ? this._stringifyJson(value) : (value ?? null), { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
      this._setControlDisabled(control, !!def.showIf && !def.showIf(snapshot));
    });

    this._syncingForms = false;
  }

  private _applyAdvancedFormValue(): void {
    if (this._syncingForms) return;
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return;
    const rawValue = this.advancedForm.getRawValue() as Record<string, any>;
    let nextSnapshot = structuredClone(snapshot);

    this._currentAdvancedDefs().forEach(def => {
      const controlName = this._advancedControlName(def.path);
      if (!Object.prototype.hasOwnProperty.call(rawValue, controlName)) return;
      const raw = rawValue[controlName];
      const previous = getByPath(snapshot, def.path);
      if (previous === undefined && (raw === null || raw === undefined || raw === '')) return;
      nextSnapshot = setByPath(nextSnapshot, def.path, def.kind === 'json' ? this._parseJson(raw) : raw);
    });

    this.advancedSnapshot.set(nextSnapshot);
    this._syncAdvancedDisabledStates();
  }

  private _syncAdvancedDisabledStates(): void {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return;
    this._syncingForms = true;
    this._currentAdvancedDefs().forEach(def => {
      const control = (this.advancedForm.controls as Record<string, FormControl>)[this._advancedControlName(def.path)];
      if (control) this._setControlDisabled(control, !!def.showIf && !def.showIf(snapshot));
    });
    this._syncingForms = false;
  }

  private _setControlDisabled(control: FormControl, disabled: boolean): void {
    if (disabled && control.enabled) control.disable({ emitEvent: false });
    if (!disabled && control.disabled) control.enable({ emitEvent: false });
  }

  private _advancedValidators(def: AdvancedFieldDef): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (def.min !== undefined) validators.push(Validators.min(def.min));
    if (def.max !== undefined) validators.push(Validators.max(def.max));
    if ((def.kind === 'select' || def.kind === 'multiselect') && def.options?.length) {
      const allowed = new Set(def.options.map(option => option.value));
      validators.push((control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (value === null || value === undefined || value === '') return null;
        const values = def.kind === 'multiselect' ? (Array.isArray(value) ? value : [value]) : [value];
        return values.every(item => allowed.has(item)) ? null : { closedOption: true };
      });
    }
    if (def.kind === 'json') {
      validators.push((control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (value === null || value === undefined || String(value).trim() === '') return null;
        try { JSON.parse(String(value)); return null; } catch { return { json: true }; }
      });
    }
    return validators;
  }

  private _stringifyJson(value: any): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  private _parseJson(raw: any): any {
    if (typeof raw !== 'string') return raw;
    try { return raw.trim() ? JSON.parse(raw) : null; } catch { return raw; }
  }

  /** Aplica el snapshot al fieldSignal (en memoria) */
  applyAdvanced(): void {
    if (this.advancedForm.invalid) {
      this.advancedForm.markAllAsTouched();
      this.messageS.changeMessage('Revisa los valores marcados: deben pertenecer al contrato permitido.');
      return;
    }
    const f = this.advancedField();
    const snap = this.advancedSnapshot();
    if (!f || !snap) { this.closeAdvanced(); return; }
    const root = { ...(this.fieldSignal() ?? {}) };
    const fields = { ...(root.fields ?? {}) };
    fields[f] = snap;
    root.fields = fields;
    this.fieldSignal.set(root);
    // Refrescar fila visible (label/hide/required/readonly pueden haber cambiado)
    this._refreshRowFromField(f);
    this.closeAdvanced();
  }

  private _refreshRowFromField(field: string): void {
    const fields = this.fieldSignal()?.fields ?? {};
    const cfg: any = Array.isArray(fields)
      ? (fields as any[]).find(x => (x?.field ?? x?.name) === field)
      : (fields as Record<string, any>)[field];
    if (!cfg) return;
    const arr = [...this.unifiedRows()];
    const idx = arr.findIndex(r => r.field === field);
    if (idx < 0) return;
    const baseSpan = this._spanFromClass(cfg?.class, arr[idx].gridSpan);
    const desktopSpan = this._spanFromClass(cfg?.class_md, arr[idx].gridSpanMd);
    arr[idx] = {
      ...arr[idx],
      header: cfg?.label ?? arr[idx].header,
      gridSpan: baseSpan,
      gridSpanMd: desktopSpan,
      colActive: cfg?.cols?.hide !== true,
      fieldHide: cfg?.hide === true,
      fieldRequired: cfg?.required === true,
      fieldReadonly: cfg?.readonly === true,
      fieldPlaceholder: cfg?.placeholder ?? arr[idx].fieldPlaceholder,
      colsCfg: {
        ...arr[idx].colsCfg,
        label: cfg?.cols?.label ?? arr[idx].colsCfg.label,
        hideMobile: cfg?.cols?.hide_mobile === true,
        sortable: cfg?.cols?.sortable !== false,
        locked: cfg?.cols?.locked === true,
      },
    };
    this.unifiedRows.set(arr);
    arr[idx].form.patchValue({
      label: arr[idx].colsCfg.label,
      colActive: arr[idx].colActive,
      sortable: arr[idx].colsCfg.sortable,
      locked: arr[idx].colsCfg.locked,
      hideMobile: arr[idx].colsCfg.hideMobile,
      gridSpan: baseSpan,
      gridSpanMd: desktopSpan,
    }, { emitEvent: false });
  }

  // ─── Diálogo principal ────────────────────────────────────────────────────

  onHide(_e: any): void { this.visibleAction.emit(false); }

  onSave(): void {
    const modifiedField = this._buildModifiedField();
    if (!this.formGroupSignal()?.contains('fields'))
      this.formGroupSignal()?.addControl('fields', new FormControl(null));
    this.formGroupSignal()?.get('fields')?.setValue(modifiedField.fields, { emitEvent: false });
    this.saveAction.emit();
  }

  onSavePersistent(): void {
    const modifiedField = this._buildModifiedField();
    if (!this.formGroupSignal()?.contains('fields'))
      this.formGroupSignal()?.addControl('fields', new FormControl(null));
    this.formGroupSignal()?.get('fields')?.setValue(modifiedField.fields, { emitEvent: false });

    const appKey = this.fieldSignal()?.app;
    const payload = appKey ? { [appKey]: modifiedField } : modifiedField;

    this.crudS.edit({ formData: payload, app: 'settings/settings/me', type: 'configuration' }).subscribe({
      next: () => this.messageS.changeMessage('Configuración guardada en el servidor', null, {}, 'success', 'Guardado'),
      error: () => this.messageS.changeMessage('No se pudo guardar la configuración en el servidor'),
    });
    this.saveAction.emit();
  }

  // ─── Vista previa ─────────────────────────────────────────────────────────

  openPreview(): void { this.previewVisible.set(true); }
  closePreview(): void { this.previewVisible.set(false); }

  // ─── Diálogo: setters de configuración ────────────────────────────────────

  setDialog<K extends keyof DialogCfg>(key: K, val: DialogCfg[K]): void {
    (this.dialogForm.controls[key] as FormControl<any>).setValue(val);
  }

  setBehavior<K extends keyof BehaviorCfg>(key: K, val: BehaviorCfg[K]): void {
    (this.behaviorForm.controls[key] as FormControl<any>).setValue(val);
  }

  // ─── Construcción del payload modificado ──────────────────────────────────

  private _buildModifiedField(): any {
    const rawFields = this.fieldSignal()?.fields ?? {};
    const rawEntries: [string, any][] = Array.isArray(rawFields)
      ? (rawFields as any[]).map((f: any) => [f?.field ?? f?.name, f])
      : Object.entries(rawFields as Record<string, any>);
    const fieldsOut: Record<string, any> = {};
    for (const [k, v] of rawEntries) fieldsOut[k] = { ...(v ?? {}) };

    // 1) Filtros activos
    // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
    for (const col of this.filterableCols()) {
      const row = this.getRow(col.filterKey);
      const val = this.filterValuesFormGroup.get(`fv_${col.filterKey}`)?.value;
      const currentFilter = (fieldsOut[col.field] ?? {})?.cols?.filter ?? {};
      const nextFilter = col.filterMode === 'explicit'
        ? {
          ...currentFilter,
          [col.filterField]: {
            ...(currentFilter?.[col.filterField] ?? {}),
            active: row.active,
            default: row.op,
            default_value: val ?? null,
          },
        }
        : {
          ...currentFilter,
          active: row.active,
          default: row.op,
          default_value: val ?? null,
        };
      fieldsOut[col.field] = {
        ...(fieldsOut[col.field] ?? {}),
        cols: {
          ...((fieldsOut[col.field] ?? {})?.cols ?? {}),
          filter: nextFilter,
        },
      };
    }
    // ]]]FI

    // 2) cols/fields visibles + props
    for (const urow of this.unifiedRows()) {
      if (!fieldsOut[urow.field]) continue;
      fieldsOut[urow.field] = {
        ...fieldsOut[urow.field],
        hide: urow.fieldHide,
        required: urow.fieldRequired,
        readonly: urow.fieldReadonly,
        placeholder: urow.fieldPlaceholder || undefined,
        cols: {
          ...(fieldsOut[urow.field]?.cols ?? {}),
          hide: !urow.colActive,
          hide_mobile: urow.colsCfg.hideMobile,
          label: urow.colsCfg.label,
          sortable: urow.colsCfg.sortable,
          locked: urow.colsCfg.locked,
        },
      };
    }

    // 3) Reconstruir cols[]
    const rawColsArr: any[] = this.fieldSignal()?.cols ?? [];
    const colsOrigMap: Record<string, any> = {};
    for (const c of rawColsArr) colsOrigMap[c?.field ?? ''] = c;
    const colsOut = this.unifiedRows()
      .filter(r => r.inCols && r.colActive)
      .map(r => ({
        ...(colsOrigMap[r.field] ?? { field: r.field }),
        header: r.colsCfg.label || r.header,
      }));

    // 4) Persistir la pestaña activa de draw en el buffer
    this._stashCurrentDrawTab();

    // 5) Reconstruir draw con todas las pestañas conocidas
    const drawOut: Record<string, any> = {
      ...(this.fieldSignal()?.draw ?? {}),
      dialog: { ...this.dialogCfg() },
    };
    for (const tab of this.drawTabs()) {
      drawOut[tab] = {
        ...(this.fieldSignal()?.draw?.[tab] ?? {}),
        grid: this._drawTabsBuffer[tab] ?? {},
      };
    }

    // 6) general (load + pagination)
    const b = this.behaviorCfg();
    const generalOut = {
      ...(this.fieldSignal()?.general ?? {}),
      load: {
        ...(this.fieldSignal()?.general?.load ?? {}),
        load_on_start: b.load_on_start,
        load_on_start_mobile: b.load_on_start_mobile,
        silent: b.silent,
      },
      pagination: {
        ...(this.fieldSignal()?.general?.pagination ?? {}),
        rows: b.rows,
        rows_mobile: b.rows_mobile,
      },
    };

    return {
      ...(this.fieldSignal() ?? {}),
      fields: fieldsOut,
      cols: colsOut,
      draw: drawOut,
      general: generalOut,
    };
  }

  // ─── Inicialización ───────────────────────────────────────────────────────

  private _initFromField(): void {
    const f = this.fieldSignal();

    // Pestañas de draw (excluye dialog)
    const draw = f?.draw ?? {};
    const tabs = Object.keys(draw).filter(k => k !== 'dialog');
    const finalTabs = tabs.length > 0 ? tabs : ['general'];
    this.drawTabs.set(finalTabs);
    this.activeDrawTab.set(finalTabs[0]);

    // Buffer por pestaña
    this._drawTabsBuffer = {};
    for (const t of finalTabs) {
      this._drawTabsBuffer[t] = { ...((draw[t]?.grid) ?? {}) };
    }

    // Cargar dialog cfg
    const dialogCfg = {
      ...DEFAULT_DIALOG_CFG,
      ...(draw?.dialog ?? {}),
    } as DialogCfg;
    this.dialogCfg.set(dialogCfg);
    this._syncingForms = true;
    this.dialogForm.patchValue(dialogCfg, { emitEvent: false });
    this._syncingForms = false;

    // Cargar behavior
    const g = f?.general ?? {};
    const behaviorCfg = {
      load_on_start: g?.load?.load_on_start ?? false,
      load_on_start_mobile: g?.load?.load_on_start_mobile ?? false,
      silent: g?.load?.silent ?? true,
      rows: g?.pagination?.rows ?? 20,
      rows_mobile: g?.pagination?.rows_mobile ?? 10,
    };
    this.behaviorCfg.set(behaviorCfg);
    this._syncingForms = true;
    this.behaviorForm.patchValue(behaviorCfg, { emitEvent: false });
    this._syncingForms = false;

    this._initFilterState();
    this._loadDrawTabIntoRows(this.activeDrawTab());
  }

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  private _initFilterState(): void {
    const cols: any[] = this.filterableCols();
    const state: Record<string, FilterRow> = {};
    for (const col of cols) {
      this._ensureControls(col.filterKey);
      const filter = col?.filter;
      const isActive = filter?.active === true;
      this._filterControl(`fa_${col.filterKey}`).setValue(isActive, { emitEvent: false });
      if (isActive && filter?.default_value !== undefined && filter?.default_value !== null) {
        let preloadValue = filter.default_value;
        const ft = colTypeToFilterType(col.type ?? '');
        if (ft === 'boolean' && typeof preloadValue === 'boolean') preloadValue = String(preloadValue);
        this.filterValuesFormGroup.get(`fv_${col.filterKey}`)?.setValue(preloadValue);
      } else {
        this.filterValuesFormGroup.get(`fv_${col.filterKey}`)?.setValue(null, { emitEvent: false });
        this.filterValuesFormGroup.get(`fv_${col.filterKey}_2`)?.setValue(null, { emitEvent: false });
      }
    }
    for (const col of cols) {
      const filter = col?.filter;
      const opsArr = this.opsOptionsByField()[col.filterKey]?.map(o => o.value) ?? ['exact'];
      state[col.filterKey] = {
        active: filter?.active === true,
        op: filter?.default ?? opsArr[0] ?? 'exact',
      };
      this._filterControl(`fo_${col.filterKey}`).setValue(state[col.filterKey].op, { emitEvent: false });
      this._syncFilterDisabledState(col.filterKey, state[col.filterKey].active);
    }
    this.filterState.set(state);
    this._loadAllDropdownOptions(cols);
  }
  // ]]]FI

  private _ensureControls(field: string): void {
    if (!this.filterValuesFormGroup.contains(`fa_${field}`)) {
      const activeControl = new FormControl<boolean>(false, { nonNullable: true });
      this.filterValuesFormGroup.addControl(`fa_${field}`, activeControl);
      this._subscriptions.add(activeControl.valueChanges.subscribe(active => this.toggleFilter(field, active)));
    }
    if (!this.filterValuesFormGroup.contains(`fo_${field}`)) {
      const operationControl = new FormControl<string>('exact', { nonNullable: true });
      this.filterValuesFormGroup.addControl(`fo_${field}`, operationControl);
      this._subscriptions.add(operationControl.valueChanges.subscribe(op => this.setOp(field, op)));
    }
    if (!this.filterValuesFormGroup.contains(`fv_${field}`))
      this.filterValuesFormGroup.addControl(`fv_${field}`, new FormControl<any>(null));
    if (!this.filterValuesFormGroup.contains(`fv_${field}_2`))
      this.filterValuesFormGroup.addControl(`fv_${field}_2`, new FormControl<any>(null));
  }

  private _filterControl(name: string): FormControl<any> {
    return this.filterValuesFormGroup.get(name) as FormControl<any>;
  }

  private _syncFilterDisabledState(field: string, active: boolean): void {
    [`fo_${field}`, `fv_${field}`, `fv_${field}_2`].forEach(name => {
      const control = this._filterControl(name);
      if (!control) return;
      this._setControlDisabled(control, !active);
    });
  }

  /** Persiste las filas actuales en el buffer de la pestaña activa */
  private _stashCurrentDrawTab(): void {
    const tab = this.activeDrawTab();
    const grid: Record<string, any> = {};
    let key = 1;
    const origGrid: Record<string, any> = this.fieldSignal()?.draw?.[tab]?.grid ?? {};
    const origByField: Record<string, any> = {};
    for (const cfg of Object.values(origGrid)) {
      if (cfg?.field) origByField[cfg.field] = cfg;
    }
    for (const r of this.unifiedRows()) {
      if (!r.inGrid) continue;
      grid[String(key++)] = {
        ...(origByField[r.field] ?? {}),
        field: r.field,
        hide: !r.gridActive,
        class: `col-span-${r.gridSpan}`,
        class_md: `md:col-span-${r.gridSpanMd}`,
      };
    }
    this._drawTabsBuffer[tab] = grid;
  }

  /** Carga el grid de la pestaña indicada en `unifiedRows` */
  private _loadDrawTabIntoRows(tab: string): void {
    const rawCols: any[] = this.fieldSignal()?.cols ?? [];
    const rawGrid: Record<string, any> = this._drawTabsBuffer[tab] ?? {};
    const gridIsEmpty = Object.keys(rawGrid).length === 0;

    const colsMap = new Map<string, any>();
    rawCols.forEach(c => { if (c?.field) colsMap.set(c.field, c); });

    const gridMap = new Map<string, any>();
    Object.entries(rawGrid)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([, cfg]: [string, any]) => { if (cfg?.field) gridMap.set(cfg.field, cfg); });

    const filterCols = this.filterableCols();
    const filterableSet = new Set(filterCols.map(c => c.field));

    const seen = new Set<string>();
    const ordered: Array<{ field: string; header: string }> = [];
    rawCols.forEach(c => {
      if (c?.field && !seen.has(c.field)) {
        seen.add(c.field);
        ordered.push({ field: c.field, header: c.header ?? c.field });
      }
    });
    gridMap.forEach((cfg, fName) => {
      if (!seen.has(fName)) {
        seen.add(fName);
        ordered.push({ field: fName, header: cfg?.label ?? fName });
      }
    });
    filterCols.forEach(col => {
      if (!seen.has(col.field)) {
        seen.add(col.field);
        ordered.push({ field: col.field, header: col.header });
      }
    });

    const rawFields = this.fieldSignal()?.fields ?? {};
    const rows: Array<Omit<UnifiedFieldRow, 'form'>> = ordered.map(({ field, header }) => {
      const gridCfg = gridMap.get(field);
      const spanMatch = (gridCfg?.class ?? 'col-span-6').match(/col-span-(\d+)/);
      const spanMdMatch = (gridCfg?.class_md ?? 'md:col-span-6').match(/col-span-(\d+)/);
      const rawFieldCfg: any = Array.isArray(rawFields)
        ? (rawFields as any[]).find((f: any) => (f?.field ?? f?.name) === field)
        : (rawFields as Record<string, any>)[field];
      const rawColsCfg = rawFieldCfg?.cols ?? {};
      return {
        field,
        header,
        hasFilter: filterableSet.has(field),
        inCols: colsMap.has(field),
        colActive: colsMap.has(field),
        inGrid: gridIsEmpty ? filterableSet.has(field) : gridMap.has(field),
        gridActive: gridCfg ? gridCfg.hide !== true : true,
        gridSpan: spanMatch ? Math.min(12, Math.max(1, Number(spanMatch[1]))) : 6,
        gridSpanMd: spanMdMatch ? Math.min(12, Math.max(1, Number(spanMdMatch[1]))) : 6,
        colsCfg: {
          label: rawColsCfg?.label ?? header,
          sortable: rawColsCfg?.sortable !== false,
          locked: rawColsCfg?.locked === true,
          hideMobile: rawColsCfg?.hide_mobile === true,
        },
        fieldHide: rawFieldCfg?.hide === true,
        fieldRequired: rawFieldCfg?.required === true,
        fieldReadonly: rawFieldCfg?.readonly === true,
        fieldPlaceholder: rawFieldCfg?.placeholder ?? '',
      };
    });
    this._setUnifiedRows(rows);
  }

  private _setUnifiedRows(rows: Array<Omit<UnifiedFieldRow, 'form'>>): void {
    this._rowFormSubscriptions.forEach(subscription => subscription.unsubscribe());
    this._rowFormSubscriptions.clear();

    const rowsWithForms = rows.map(row => {
      const form = new FormGroup({
        label: new FormControl(row.colsCfg.label, { nonNullable: true }),
        colActive: new FormControl(row.colActive, { nonNullable: true }),
        sortable: new FormControl(row.colsCfg.sortable, { nonNullable: true }),
        locked: new FormControl(row.colsCfg.locked, { nonNullable: true }),
        hideMobile: new FormControl(row.colsCfg.hideMobile, { nonNullable: true }),
        gridActive: new FormControl(row.gridActive, { nonNullable: true }),
        gridSpan: new FormControl(row.gridSpan, { nonNullable: true }),
        gridSpanMd: new FormControl(row.gridSpanMd, { nonNullable: true }),
      });
      const rowWithForm: UnifiedFieldRow = { ...row, form };
      this._rowFormSubscriptions.set(
        row.field,
        form.valueChanges.subscribe(value => this._applyUnifiedRowFormValue(row.field, value)),
      );
      return rowWithForm;
    });
    this.unifiedRows.set(rowsWithForms);
  }

  private _applyUnifiedRowFormValue(field: string, value: Partial<UnifiedRowFormValue>): void {
    if (this._syncingForms) return;
    const rows = [...this.unifiedRows()];
    const index = rows.findIndex(row => row.field === field);
    if (index < 0) return;
    const row = rows[index];
    const colActive = value.colActive === true;
    const gridActive = value.gridActive === true;
    rows[index] = {
      ...row,
      colActive,
      inCols: colActive ? true : row.inCols,
      gridActive,
      inGrid: gridActive ? true : row.inGrid,
      gridSpan: this._normalizeSpan(value.gridSpan, row.gridSpan),
      gridSpanMd: this._normalizeSpan(value.gridSpanMd, row.gridSpanMd),
      colsCfg: {
        label: String(value.label ?? row.colsCfg.label),
        sortable: value.sortable === true,
        locked: value.locked === true,
        hideMobile: value.hideMobile === true,
      },
    };
    this.unifiedRows.set(rows);
  }

  private _normalizeSpan(value: any, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(12, Math.max(1, Math.round(parsed))) : fallback;
  }

  private _spanFromClass(value: any, fallback: number): number {
    const match = String(value ?? '').match(/(?:^|:)col-span-(\d+)$/);
    return match ? this._normalizeSpan(match[1], fallback) : fallback;
  }

  private _loadAllDropdownOptions(cols: any[]): void {
    for (const col of cols) {
      // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
      if (this.hasOptionList(col.filterKey)) {
        this._loadExplicitFilterOptions(col);
        continue;
      }
      // ]]]FI
      const ft = colTypeToFilterType(col.type ?? '');
      if (ft !== 'fk') continue;
      if (col.type === 'dropdown-choice' && !col.data_type?.type) {
        const localOpts = col?.data_type?.options ?? [];
        if (localOpts.length > 0) {
          this.dropdownOptionsSignal.update(s => ({ ...s, [col.filterKey]: localOpts }));
          this.fkSuggestionsSignal.update(s => ({ ...s, [col.filterKey]: [...localOpts] }));
        }
      }
    }
  }

  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  /**
   * Trae del servidor la lista de opciones de un filtro explicito, con el mismo patron
   * que ya usa `completeFkMethod`: `getAppType` resuelve app/type y `DJAtoObject` aplana
   * la respuesta. Ni la etiqueta ni la clave se escriben aqui: salen de
   * `option_label` / `option_value` de la configuracion.
   *
   * Una consulta por app: la cache se lleva por `filterKey` + modulo con el que se cargo
   * (`_optionsLoadedFor`), asi reabrir el dialogo o recibir otra vez la config no repite
   * la peticion, y cambiar de app si la rehace acotada a la nueva.
   */
  private _loadExplicitFilterOptions(col: FilterableCol): void {
    const moduleKey = this._moduleKeyFor(col);

    // Un recurso acotado por modulo sin clave traeria el catalogo completo, que en
    // `status` supera el tope de 1000 del servidor y llegaria truncado y mezclado entre
    // modulos. Se prefiere no ofrecer opciones a ofrecer una lista incorrecta.
    if (moduleKey === null) return;

    if (this._optionsLoadedFor[col.filterKey] === moduleKey) return;

    const appTypeEntry = this.crudS.getAppType(col.option_data_type);
    const app = appTypeEntry?.app;
    const type = appTypeEntry?.type;
    if (!app || !type) return;

    // Misma fuente que el menu de estados dependientes: si esa app ya cargo el catalogo
    // acotado, se reutiliza y no se vuelve a consultar.
    const sharedKey = this.crudS.sharedModuleScopedKey(col.option_data_type, moduleKey);
    const shared = moduleKey ? this.sharedS.data[sharedKey] : null;
    if (Array.isArray(shared)) {
      this._optionsLoadedFor[col.filterKey] = moduleKey;
      this.dropdownOptionsSignal.update(s => ({ ...s, [col.filterKey]: shared }));
      return;
    }

    this._optionsLoadedFor[col.filterKey] = moduleKey;
    const filter = moduleKey ? `filter[module]=${encodeURIComponent(moduleKey)}` : '';

    this.crudS.getObject({ app, type, filter }).subscribe({
      next: (data: any) => {
        const options = this.generalS.DJAtoObject({
          respDJA: data,
          fields: { [col.field]: {} },
        });
        if (moduleKey) this.sharedS.data[sharedKey] = options;
        this.dropdownOptionsSignal.update(s => ({ ...s, [col.filterKey]: options }));
      },
      error: () => {
        delete this._optionsLoadedFor[col.filterKey];
        this.dropdownOptionsSignal.update(s => ({ ...s, [col.filterKey]: [] }));
      },
    });
  }

  /**
   * Clave de módulo con la que se debe consultar el recurso:
   * - `''` → el recurso no se acota por modulo, se consulta completo (comportamiento previo).
   * - `null` → se acota por modulo pero el componente aun no declaro `this.module[pos]`;
   *   no se consulta para no traer el catalogo completo.
   * - cualquier otro valor → se consulta con `filter[module]=<clave>`.
   */
  private _moduleKeyFor(col: FilterableCol): string | null {
    if (!MODULE_SCOPED_OPTION_TYPES.has(col.option_data_type)) return '';
    const module = this.fieldSignal()?.module;
    return module ? String(module) : null;
  }
  // ]]]FI

  private _startOf(unit: 'day' | 'week' | 'month' | 'year', d: Date): Date {
    const r = new Date(d);
    if (unit === 'day') { r.setHours(0, 0, 0, 0); }
    if (unit === 'week') { r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); }
    if (unit === 'month') { r.setDate(1); r.setHours(0, 0, 0, 0); }
    if (unit === 'year') { r.setMonth(0, 1); r.setHours(0, 0, 0, 0); }
    return r;
  }

  private _endOf(unit: 'day' | 'week' | 'month' | 'year', d: Date): Date {
    const r = new Date(d);
    if (unit === 'day') { r.setHours(23, 59, 59, 999); }
    if (unit === 'week') { r.setDate(r.getDate() + (6 - r.getDay())); r.setHours(23, 59, 59, 999); }
    if (unit === 'month') { r.setMonth(r.getMonth() + 1, 0); r.setHours(23, 59, 59, 999); }
    if (unit === 'year') { r.setMonth(11, 31); r.setHours(23, 59, 59, 999); }
    return r;
  }
}
