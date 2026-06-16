import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CustomDrawFormComponent } from '../custom-draw-form/custom-draw-form.component';
import { AdvancedSection, getByPath, schemaForType, setByPath } from '../custom-local-settings/type-schemas';

interface ChildBuilderRow {
  id: number;
  suffix: string;
  field: string;
  label: string;
  type: string;
  required: boolean;
  hide: boolean;
  readonly: boolean;
  gridSpan: number;
  gridSpanMd: number;
  cfg: any;
}

@Component({
  selector: 'app-child-form-fields-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleButtonModule,
    CustomDrawFormComponent,
  ],
  templateUrl: './child-form-fields-builder.component.html',
  styleUrl: './child-form-fields-builder.component.scss',
})
export class ChildFormFieldsBuilderComponent implements OnChanges {
  @Input() value: any = null;
  @Output() valueChange = new EventEmitter<any>();

  private readonly fieldPrefix = 'parent_form_data_';
  private nextId = 1;
  private initializing = false;

  readonly fieldTypes = [
    { label: 'Texto', value: 'input-text' },
    { label: 'Texto largo', value: 'textarea' },
    { label: 'Número', value: 'input-number' },
    { label: 'Sí/No', value: 'toggle-button' },
    { label: 'Fecha', value: 'date' },
    { label: 'Hora', value: 'time' },
    { label: 'Opciones locales', value: 'dropdown-choice' },
    { label: 'Selección múltiple local', value: 'multi-choice' },
    { label: 'Archivos', value: 'files' },
  ];

  readonly rows = signal<ChildBuilderRow[]>([]);
  readonly previewVisible = signal(false);
  readonly advancedRowId = signal<number | null>(null);
  readonly advancedSnapshot = signal<any>(null);
  readonly generatedValue = signal<any>({ fields: {}, draw: { general: {} } });
  readonly previewForm = signal<FormGroup>(new FormGroup({}));

  readonly previewDraw = computed(() => ({
    grid: this.generatedValue()?.draw?.general ?? {},
  }));

  readonly generatedJson = computed(() => {
    try {
      return JSON.stringify(this.generatedValue(), null, 2);
    } catch {
      return '{}';
    }
  });

  readonly advancedSchema = computed<AdvancedSection[]>(() => {
    const row = this.rows().find((item) => item.id === this.advancedRowId());
    return schemaForType(row?.type);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.initializing = true;
      this.rows.set(this.rowsFromValue(changes['value'].currentValue));
      this.rebuild(false);
      this.initializing = false;
    }
  }

  addField(): void {
    const suffix = this.uniqueSuffix('campo');
    const field = this.fieldPrefix + suffix;
    const row = this.createRow({
      field,
      suffix,
      label: 'Nuevo campo',
      type: 'input-text',
      required: false,
      hide: false,
      readonly: false,
      gridSpan: 6,
      gridSpanMd: 12,
      cfg: {},
    });

    this.rows.update((rows) => [...rows, row]);
    this.rebuild();
  }

  removeField(rowId: number): void {
    this.rows.update((rows) => rows.filter((row) => row.id !== rowId));
    this.rebuild();
  }

  moveField(rowId: number, direction: -1 | 1): void {
    const rows = [...this.rows()];
    const index = rows.findIndex((row) => row.id === rowId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return;
    const [item] = rows.splice(index, 1);
    rows.splice(nextIndex, 0, item);
    this.rows.set(rows);
    this.rebuild();
  }

  updateRow(rowId: number, patch: Partial<ChildBuilderRow>): void {
    this.rows.update((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;

      const next: ChildBuilderRow = { ...row, ...patch };
      if (patch.suffix !== undefined) {
        next.suffix = this.normalizeSuffix(patch.suffix);
        next.field = this.fieldPrefix + next.suffix;
      }
      if (patch.label !== undefined && (!row.suffix || row.suffix.startsWith('campo'))) {
        next.suffix = this.normalizeSuffix(patch.label);
        next.field = this.fieldPrefix + next.suffix;
      }
      if (patch.type !== undefined) {
        next.cfg = this.defaultCfgForType(next);
      }
      return next;
    }));
    this.rebuild();
  }

  openAdvanced(rowId: number): void {
    const row = this.rows().find((item) => item.id === rowId);
    if (!row) return;
    this.advancedRowId.set(rowId);
    this.advancedSnapshot.set(structuredClone(this.rowToConfig(row)));
  }

  closeAdvanced(): void {
    this.advancedRowId.set(null);
    this.advancedSnapshot.set(null);
  }

  advValue(path: string): any {
    return getByPath(this.advancedSnapshot(), path);
  }

  advSet(path: string, value: any): void {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return;
    this.advancedSnapshot.set(setByPath(snapshot, path, value));
  }

  advSetJson(path: string, raw: string): void {
    try {
      this.advSet(path, raw?.trim() ? JSON.parse(raw) : null);
    } catch {
      this.advSet(path, raw);
    }
  }

  advValueAsJson(path: string): string {
    const value = this.advValue(path);
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  advShouldShow(def: { showIf?: (cfg: any) => boolean }): boolean {
    return !def.showIf || def.showIf(this.advancedSnapshot() ?? {});
  }

  applyAdvanced(): void {
    const rowId = this.advancedRowId();
    const snapshot = this.advancedSnapshot();
    if (rowId === null || !snapshot) {
      this.closeAdvanced();
      return;
    }

    this.rows.update((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      const field = this.canonicalField(snapshot.field || row.field);
      return {
        ...row,
        field,
        suffix: field.slice(this.fieldPrefix.length),
        label: snapshot.label ?? row.label,
        type: snapshot.type ?? row.type,
        required: snapshot.required === true,
        hide: snapshot.hide === true,
        readonly: snapshot.readonly === true,
        gridSpan: this.spanFromClass(snapshot.class, row.gridSpan),
        gridSpanMd: this.spanFromClass(snapshot.class_md, row.gridSpanMd),
        cfg: { ...snapshot, field },
      };
    }));
    this.closeAdvanced();
    this.rebuild();
  }

  openPreview(): void {
    this.rebuild(false);
    this.previewVisible.set(true);
  }

  private rowsFromValue(value: any): ChildBuilderRow[] {
    const parsed = this.parseValue(value);
    const fields = parsed?.fields ?? {};
    const draw = parsed?.draw ?? {};
    const layout = draw.general ?? this.firstLayout(draw);
    const rows: ChildBuilderRow[] = [];
    const seen = new Set<string>();

    Object.entries(layout ?? {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([, drawCfg]: [string, any]) => {
        const field = this.canonicalField(drawCfg?.field);
        if (!field || seen.has(field)) return;
        seen.add(field);
        const fieldCfg = fields[field] ?? {};
        rows.push(this.createRowFromConfig({ ...fieldCfg, ...drawCfg, field }));
      });

    Object.entries(fields).forEach(([key, cfg]: [string, any]) => {
      const field = this.canonicalField(key);
      if (!field || seen.has(field)) return;
      seen.add(field);
      rows.push(this.createRowFromConfig({ ...cfg, field }));
    });

    return rows;
  }

  private rebuild(emit = true): void {
    const fields: Record<string, any> = {};
    const general: Record<string, any> = {};
    const controls: Record<string, FormControl<any>> = {};

    this.rows().forEach((row, index) => {
      const cfg = this.rowToConfig(row);
      fields[cfg.field] = { ...cfg };
      general[String(index + 1)] = {
        ...cfg,
        class: `col-span-${row.gridSpan}`,
        class_md: `md:col-span-${row.gridSpanMd}`,
      };
      controls[cfg.field] = this.previewControl(cfg);
    });

    const nextValue = {
      fields,
      draw: {
        dialog: {
          width: 'width-650px-custom',
          height: 'min-height-550px-custom',
        },
        general,
      },
    };

    this.generatedValue.set(nextValue);
    this.previewForm.set(new FormGroup(controls));

    if (emit && !this.initializing) {
      this.valueChange.emit(nextValue);
    }
  }

  private previewControl(cfg: any): FormControl<any> {
    const validators = cfg.required ? [Validators.required] : [];
    const value = cfg.type === 'toggle-button' ? false : (cfg.type === 'input-number' || cfg.type === 'date' || cfg.type === 'time' ? null : '');
    return new FormControl({ value, disabled: cfg.readonly === true }, validators);
  }

  private rowToConfig(row: ChildBuilderRow): any {
    const field = this.canonicalField(row.field);
    return {
      ...this.defaultCfgForType(row),
      ...(row.cfg ?? {}),
      field,
      type: row.type,
      label: row.label,
      required: row.required,
      hide: row.hide,
      readonly: row.readonly,
      class: `col-span-${row.gridSpan}`,
      class_md: `md:col-span-${row.gridSpanMd}`,
    };
  }

  private createRowFromConfig(cfg: any): ChildBuilderRow {
    const field = this.canonicalField(cfg?.field);
    const suffix = field.slice(this.fieldPrefix.length);
    return this.createRow({
      field,
      suffix,
      label: cfg?.label ?? suffix,
      type: cfg?.type ?? 'input-text',
      required: cfg?.required === true,
      hide: cfg?.hide === true,
      readonly: cfg?.readonly === true,
      gridSpan: this.spanFromClass(cfg?.class, 6),
      gridSpanMd: this.spanFromClass(cfg?.class_md, 12),
      cfg: { ...(cfg ?? {}), field },
    });
  }

  private createRow(row: Omit<ChildBuilderRow, 'id'>): ChildBuilderRow {
    return { ...row, id: this.nextId++ };
  }

  private defaultCfgForType(row: Pick<ChildBuilderRow, 'field' | 'label' | 'type'>): any {
    const base = {
      field: row.field,
      label: row.label,
      type: row.type,
      hide: false,
      required: false,
      readonly: false,
      autofocus: false,
    };

    if (row.type === 'toggle-button') {
      return { ...base, label_true: 'Sí', label_false: 'No', default: { active: true, value: false, edit: true } };
    }

    if (row.type === 'dropdown-choice' || row.type === 'multi-choice') {
      return {
        ...base,
        option_value: 'id',
        option_label: 'name',
        filter_local: true,
        data_type: { options: [] },
      };
    }

    if (row.type === 'textarea') {
      return { ...base, rows: 3, auto_resize: true };
    }

    if (row.type === 'files') {
      return {
        ...base,
        upload: { active: true, required: false, allow_camera: true, allow_gallery: true },
        server_upload: { active: false, required: false },
      };
    }

    return base;
  }

  private parseValue(value: any): any {
    if (!value) return { fields: {}, draw: { general: {} } };
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return { fields: {}, draw: { general: {} } }; }
    }
    return value;
  }

  private firstLayout(draw: any): any {
    if (!draw || typeof draw !== 'object') return {};
    const key = Object.keys(draw).find((item) => item !== 'dialog');
    return key ? draw[key] : {};
  }

  private canonicalField(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return this.fieldPrefix + this.uniqueSuffix('campo');
    const withoutObject = raw.startsWith('object_') ? raw.slice('object_'.length) : raw;
    return withoutObject.startsWith(this.fieldPrefix)
      ? withoutObject
      : this.fieldPrefix + this.normalizeSuffix(withoutObject);
  }

  private normalizeSuffix(value: any): string {
    const normalized = String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'campo';
  }

  private uniqueSuffix(base: string): string {
    const existing = new Set(this.rows().map((row) => row.suffix));
    let suffix = this.normalizeSuffix(base || 'campo');
    if (!existing.has(suffix)) return suffix;
    let i = 1;
    while (existing.has(`${suffix}_${i}`)) i++;
    return `${suffix}_${i}`;
  }

  private spanFromClass(value: any, fallback: number): number {
    const match = String(value ?? '').match(/col-span-(\d+)/);
    const parsed = match ? Number(match[1]) : fallback;
    return Math.min(12, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
  }
}
