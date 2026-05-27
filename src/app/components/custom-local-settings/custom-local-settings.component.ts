import { CommonModule } from '@angular/common';
import {
  Component, EventEmitter, Input, OnChanges, OnDestroy,
  Output, computed, inject, signal, SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  FormControl, FormGroup, UntypedFormGroup,
  FormsModule, ReactiveFormsModule
} from '@angular/forms';

import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DragDropModule } from 'primeng/dragdrop';
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
import { MessageService } from '../services/message.service';

import {
  AdvancedSection, getByPath, setByPath, schemaForType,
  WIDTH_PRESETS, HEIGHT_PRESETS,
} from './type-schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterFieldType = 'text' | 'numeric' | 'datetime' | 'boolean' | 'fk';

export interface FilterRow { active: boolean; op: string; }

interface OpOption { label: string; value: string; }

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
    case 'auto-complete':
    case 'tree-select':
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

@Component({
  selector: 'app-custom-local-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    AccordionModule, AutoCompleteModule, ButtonModule, CheckboxModule, ChipModule,
    DatePickerModule, DialogModule, DividerModule, DragDropModule,
    InputNumberModule, InputTextModule, MultiSelectModule, SelectModule, TabsModule,
    TagModule, TextareaModule, TooltipModule, ToggleButtonModule,
  ],
  templateUrl: './custom-local-settings.component.html',
  styleUrl: './custom-local-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomLocalSettingsComponent implements OnChanges, OnDestroy {

  private crudS = inject(CRUDService);
  private generalS = inject(GeneralService);
  private messageS = inject(MessageService);

  // ─── Inputs / Outputs ─────────────────────────────────────────────────────

  @Input() visible = false;
  @Input() field: any = {};
  @Input() formGroup: FormGroup | undefined;
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

  dialogCfg = signal<DialogCfg>({ ...DEFAULT_DIALOG_CFG });
  behaviorCfg = signal<BehaviorCfg>({ ...DEFAULT_BEHAVIOR_CFG });

  /** Field actualmente en el editor avanzado, o null */
  advancedField = signal<string | null>(null);
  advancedSnapshot = signal<any>(null);

  /** Para drag/drop de PrimeNG */
  private _dragOriginIdx = signal<number | null>(null);

  filterValuesFormGroup = new UntypedFormGroup({});

  readonly booleanOptions = [
    { id: 'true', name: 'Sí / Verdadero' },
    { id: 'false', name: 'No / Falso' },
  ];

  readonly widthOptions = WIDTH_PRESETS;
  readonly heightOptions = HEIGHT_PRESETS;

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

  filterableCols = computed<any[]>(() => {
    const rawFields = this.fieldSignal()?.fields;
    if (!rawFields) return [];
    const colsArr: any[] = this.fieldSignal()?.cols ?? [];
    const labelMap: Record<string, string> = {};
    for (const c of colsArr) if (c?.field && c?.header) labelMap[c.field] = c.header;
    const entries: [string, any][] = Array.isArray(rawFields)
      ? rawFields.map((f: any) => [f?.field ?? f?.name, f])
      : Object.entries(rawFields as Record<string, any>);
    return entries
      .map(([fieldName, cfg]: [string, any]) => ({
        field: fieldName,
        header: labelMap[fieldName] ?? cfg?.cols?.label ?? cfg?.label ?? fieldName,
        type: cfg?.type ?? '',
        data_type: cfg?.data_type?.type ?? '',
        filter_by: cfg?.cols?.filter?.by ?? cfg?.filter_by ?? '',
        filter: cfg?.cols?.filter ?? {},
      }))
      .filter((col: any) => {
        if (!col.field) return false;
        if (col.filter?.ui === false) return false;
        return !SKIP_TYPES.has(col.type);
      });
  });

  filterableColMap = computed<Record<string, any>>(() =>
    Object.fromEntries(this.filterableCols().map(c => [c.field, c]))
  );

  filterTypeByField = computed<Record<string, FilterFieldType>>(() => {
    const map: Record<string, FilterFieldType> = {};
    for (const c of this.filterableCols()) map[c.field] = colTypeToFilterType(c.type ?? '');
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
      map[c.field] = eff.map(op => ({ label: OP_LABELS[op] ?? op, value: op }));
    }
    return map;
  });

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
    return schemaForType(cfg?.type);
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) this.visibleSignal.set(changes['visible'].currentValue);
    if (changes['field']) {
      this.fieldSignal.set(changes['field'].currentValue);
      this._initFromField();
    }
    if (changes['formGroup']) this.formGroupSignal.set(changes['formGroup'].currentValue);
  }

  ngOnDestroy(): void { /* noop */ }

  // ─── FK / dropdowns ───────────────────────────────────────────────────────

  completeFkMethod(event: { query: string }, col: any): void {
    const q = (event?.query ?? '').trim();
    const dataType = col?.data_type?.type ?? col?.data_type;

    if (dataType) {
      if (q.length > 0 && q.length < FK_MIN_CHARS) {
        this.fkSuggestionsSignal.update(s => ({ ...s, [col.field]: [] }));
        this.fkSearchHintSignal.update(s => ({
          ...s, [col.field]: `Escriba al menos ${FK_MIN_CHARS} caracteres para buscar`
        }));
        return;
      }
      this.fkSearchHintSignal.update(s => ({ ...s, [col.field]: '' }));
      if (q.length === 0) {
        this.fkSuggestionsSignal.update(s => ({ ...s, [col.field]: [] }));
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
          this.fkSuggestionsSignal.update(s => ({ ...s, [col.field]: options }));
        });
        return;
      }
    }
    this.fkSearchHintSignal.update(s => ({ ...s, [col.field]: '' }));
    const all = this.dropdownOptionsSignal()[col.field] ?? [];
    const label = this.getOptionLabel(col);
    const filtered = q
      ? all.filter((o: any) => String(o[label] ?? '').toLowerCase().includes(q.toLowerCase()))
      : [...all];
    this.fkSuggestionsSignal.update(s => ({ ...s, [col.field]: filtered }));
  }

  hasRelativePresets(field: string): boolean {
    const col = this.filterableColMap()[field];
    if (!col) return false;
    if (this.filterTypeByField()[field] !== 'datetime') return false;
    const row = this.getRow(field);
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
    const arr = [...this.unifiedRows()];
    arr[i] = { ...arr[i], colActive, inCols: colActive ? true : arr[i].inCols };
    this.unifiedRows.set(arr);
  }

  toggleUnifiedGridActive(i: number, gridActive: boolean): void {
    const arr = [...this.unifiedRows()];
    arr[i] = { ...arr[i], gridActive, inGrid: gridActive ? true : arr[i].inGrid };
    this.unifiedRows.set(arr);
  }

  setUnifiedSpan(i: number, val: number, key: 'gridSpan' | 'gridSpanMd'): void {
    const clamped = Math.min(12, Math.max(1, Math.round(val ?? 1)));
    const arr = [...this.unifiedRows()];
    arr[i] = { ...arr[i], [key]: clamped };
    this.unifiedRows.set(arr);
  }

  setColsCfg(i: number, key: keyof ColsCfgData, val: any): void {
    const arr = [...this.unifiedRows()];
    arr[i] = { ...arr[i], colsCfg: { ...arr[i].colsCfg, [key]: val } };
    this.unifiedRows.set(arr);
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

  toggleFilter(field: string, active: boolean): void {
    const col = this.filterableColMap()[field];
    const ops = this.opsOptionsByField()[field]?.map(o => o.value) ?? ['exact'];
    const op = active ? (col?.filter?.default ?? ops[0] ?? 'exact') : this.getRow(field).op;
    this.filterState.update(st => ({ ...st, [field]: { active, op } }));
  }

  setOp(field: string, op: string): void {
    this.filterState.update(st => ({ ...st, [field]: { ...this.getRow(field), op } }));
    this.filterValuesFormGroup.get(`fv_${field}`)?.setValue(null, { emitEvent: false });
    this.filterValuesFormGroup.get(`fv_${field}_2`)?.setValue(null, { emitEvent: false });
  }

  applyRelativePreset(field: string, preset: string): void {
    const now = new Date();
    let v1: Date | null = null, v2: Date | null = null;
    switch (preset) {
      case 'day': v1 = this._startOf('day', now); v2 = this._endOf('day', now); break;
      case 'week': v1 = this._startOf('week', now); v2 = this._endOf('week', now); break;
      case 'month': v1 = this._startOf('month', now); v2 = this._endOf('month', now); break;
      case 'year': v1 = this._startOf('year', now); v2 = this._endOf('year', now); break;
    }
    this.filterState.update(st => ({ ...st, [field]: { active: true, op: 'range' } }));
    this.filterValuesFormGroup.get(`fv_${field}`)?.setValue(v1);
    this.filterValuesFormGroup.get(`fv_${field}_2`)?.setValue(v2);
  }

  resetFilter(field: string): void {
    const col = this.filterableColMap()[field];
    const ops = this.opsOptionsByField()[field]?.map(o => o.value) ?? ['exact'];
    this.filterState.update(st => ({
      ...st, [field]: { active: false, op: col?.filter?.default ?? ops[0] ?? 'exact' },
    }));
    this.filterValuesFormGroup.get(`fv_${field}`)?.setValue(null, { emitEvent: false });
    this.filterValuesFormGroup.get(`fv_${field}_2`)?.setValue(null, { emitEvent: false });
  }

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

  // ─── Editor avanzado por tipo ─────────────────────────────────────────────

  openAdvanced(field: string): void {
    const fields = this.fieldSignal()?.fields ?? {};
    const cfg: any = Array.isArray(fields)
      ? (fields as any[]).find(x => (x?.field ?? x?.name) === field)
      : (fields as Record<string, any>)[field];
    this.advancedSnapshot.set(structuredClone(cfg ?? {}));
    this.advancedField.set(field);
  }

  closeAdvanced(): void {
    this.advancedField.set(null);
    this.advancedSnapshot.set(null);
  }

  /** Lee un valor del snapshot por path */
  advValue(path: string): any { return getByPath(this.advancedSnapshot(), path); }

  /** Setea un valor en el snapshot por path */
  advSet(path: string, value: any): void {
    const snap = this.advancedSnapshot();
    if (!snap) return;
    this.advancedSnapshot.set(setByPath(snap, path, value));
  }

  advSetJson(path: string, raw: string): void {
    try {
      const parsed = raw?.trim() ? JSON.parse(raw) : null;
      this.advSet(path, parsed);
    } catch {
      // mantener el string crudo como fallback (visible al usuario)
      this.advSet(path, raw);
    }
  }

  advValueAsJson(path: string): string {
    const v = this.advValue(path);
    if (v == null) return '';
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  advShouldShow(def: { showIf?: (cfg: any) => boolean }): boolean {
    return !def.showIf || def.showIf(this.advancedSnapshot() ?? {});
  }

  /** Aplica el snapshot al fieldSignal (en memoria) */
  applyAdvanced(): void {
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
    arr[idx] = {
      ...arr[idx],
      header: cfg?.label ?? arr[idx].header,
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
    this.dialogCfg.update(c => ({ ...c, [key]: val }));
  }

  setBehavior<K extends keyof BehaviorCfg>(key: K, val: BehaviorCfg[K]): void {
    this.behaviorCfg.update(c => ({ ...c, [key]: val }));
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
    for (const col of this.filterableCols()) {
      const row = this.getRow(col.field);
      const val = this.filterValuesFormGroup.get(`fv_${col.field}`)?.value;
      fieldsOut[col.field] = {
        ...(fieldsOut[col.field] ?? {}),
        cols: {
          ...((fieldsOut[col.field] ?? {})?.cols ?? {}),
          filter: {
            ...((fieldsOut[col.field] ?? {})?.cols?.filter ?? {}),
            active: row.active,
            default: row.op,
            default_value: val ?? null,
          },
        },
      };
    }

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
    this.dialogCfg.set({
      ...DEFAULT_DIALOG_CFG,
      ...(draw?.dialog ?? {}),
    } as DialogCfg);

    // Cargar behavior
    const g = f?.general ?? {};
    this.behaviorCfg.set({
      load_on_start: g?.load?.load_on_start ?? false,
      load_on_start_mobile: g?.load?.load_on_start_mobile ?? false,
      silent: g?.load?.silent ?? true,
      rows: g?.pagination?.rows ?? 20,
      rows_mobile: g?.pagination?.rows_mobile ?? 10,
    });

    this._initFilterState();
    this._loadDrawTabIntoRows(this.activeDrawTab());
  }

  private _initFilterState(): void {
    const cols: any[] = this.filterableCols();
    const state: Record<string, FilterRow> = {};
    for (const col of cols) {
      this._ensureControls(col.field);
      const filter = col?.filter;
      const isActive = filter?.active === true;
      if (isActive && filter?.default_value !== undefined && filter?.default_value !== null) {
        let preloadValue = filter.default_value;
        const ft = colTypeToFilterType(col.type ?? '');
        if (ft === 'boolean' && typeof preloadValue === 'boolean') preloadValue = String(preloadValue);
        this.filterValuesFormGroup.get(`fv_${col.field}`)?.setValue(preloadValue);
      } else {
        this.filterValuesFormGroup.get(`fv_${col.field}`)?.setValue(null, { emitEvent: false });
        this.filterValuesFormGroup.get(`fv_${col.field}_2`)?.setValue(null, { emitEvent: false });
      }
    }
    for (const col of cols) {
      const filter = col?.filter;
      const opsArr = this.opsOptionsByField()[col.field]?.map(o => o.value) ?? ['exact'];
      state[col.field] = {
        active: filter?.active === true,
        op: filter?.default ?? opsArr[0] ?? 'exact',
      };
    }
    this.filterState.set(state);
    this._loadAllDropdownOptions(cols);
  }

  private _ensureControls(field: string): void {
    if (!this.filterValuesFormGroup.contains(`fv_${field}`))
      this.filterValuesFormGroup.addControl(`fv_${field}`, new FormControl<any>(null));
    if (!this.filterValuesFormGroup.contains(`fv_${field}_2`))
      this.filterValuesFormGroup.addControl(`fv_${field}_2`, new FormControl<any>(null));
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
    const rows: UnifiedFieldRow[] = ordered.map(({ field, header }) => {
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
    this.unifiedRows.set(rows);
  }

  private _loadAllDropdownOptions(cols: any[]): void {
    for (const col of cols) {
      const ft = colTypeToFilterType(col.type ?? '');
      if (ft !== 'fk') continue;
      if (col.type === 'dropdown-choice' && !col.data_type?.type) {
        const localOpts = col?.data_type?.options ?? [];
        if (localOpts.length > 0) {
          this.dropdownOptionsSignal.update(s => ({ ...s, [col.field]: localOpts }));
          this.fkSuggestionsSignal.update(s => ({ ...s, [col.field]: [...localOpts] }));
        }
      }
    }
  }

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
