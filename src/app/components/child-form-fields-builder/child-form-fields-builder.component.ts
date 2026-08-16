import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TooltipModule } from 'primeng/tooltip';
import { CustomDrawFormComponent } from '../custom-draw-form/custom-draw-form.component';
import { AdvancedFieldDef, AdvancedSection, getByPath, schemaForType, setByPath } from '../custom-local-settings/type-schemas';

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

interface RowFormValue {
  label: string;
  type: string;
  suffix: string;
  colsLabel: string;
  gridSpan: number;
  gridSpanMd: number;
  required: boolean;
  readonly: boolean;
  hide: boolean;
  autofocus: boolean;
  colsHide: boolean;
  colsHideMobile: boolean;
  colsSortable: boolean;
  colsLocked: boolean;
}

interface ChildBuilderRowView {
  id: number;
  label: string;
  gridSpan: number;
  gridSpanMd: number;
  form: FormGroup;
  selected: boolean;
  order: number;
  ariaLabel: string;
  labelInputId: string;
  typeInputId: string;
  suffixInputId: string;
  colsLabelInputId: string;
  desktopSpanInputId: string;
  mobileSpanInputId: string;
  requiredTooltip: string;
  readonlyTooltip: string;
  hideTooltip: string;
  autofocusTooltip: string;
  colsHideTooltip: string;
  colsHideMobileTooltip: string;
  colsSortableTooltip: string;
  colsLockedTooltip: string;
}

interface AdvancedFieldView extends AdvancedFieldDef {
  controlName: string;
  inputId: string;
  labelText: string;
  hintText: string;
  controlClass: string;
  optionsList: { label: string; value: any }[];
  booleanOnLabel: string;
  booleanOffLabel: string;
  isIcon: boolean;
  isNumeric: boolean;
  isBoolean: boolean;
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

interface BuilderViewModel {
  rows: ChildBuilderRowView[];
  hasRows: boolean;
  showJson: boolean;
  showJsonLabel: string;
  showJsonOutlined: boolean;
  advancedTitle: string;
  advancedSections: AdvancedSectionView[];
  previewDraw: any;
  previewForm: FormGroup;
  generatedJson: string;
}

// [[[II ESC:023-03 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-03
@Component({
  selector: 'app-child-form-fields-builder',
  standalone: true,
  imports: [
    CommonModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    DividerModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleButtonModule,
    TooltipModule,
    CustomDrawFormComponent,
  ],
  templateUrl: './child-form-fields-builder.component.html',
  styleUrl: './child-form-fields-builder.component.scss',
})
export class ChildFormFieldsBuilderComponent implements OnChanges, OnDestroy {
  @Input() value: any = null;
  @Output() valueChange = new EventEmitter<any>();

  private readonly fallbackDetailLabel = 'Formulario del detalle';
  private readonly fieldPrefix = 'parent_form_data_';
  private readonly inlineEditorPaths = new Set([
    'label',
    'field',
    'class',
    'class_md',
    'required',
    'hide',
    'readonly',
    'autofocus',
    'cols.label',
    'cols.hide',
    'cols.hide_mobile',
    'cols.sortable',
    'cols.locked',
  ]);
  private readonly advancedBooleanLabels: Record<string, { on: string; off: string }> = {
    'auto_resize': { on: 'Auto resize activo', off: 'Auto resize inactivo' },
    'auto_highlight': { on: 'Resaltar primer item', off: 'Sin resaltado automatico' },
    'autofocus': { on: 'Con auto-foco', off: 'Sin auto-foco' },
    'closable_icon': { on: 'Mostrar limpiar', off: 'Ocultar limpiar' },
    'cols.hide': { on: 'Oculto en tabla', off: 'Visible en tabla' },
    'cols.hide_mobile': { on: 'Oculto en movil', off: 'Visible en movil' },
    'cols.locked': { on: 'Bloqueada', off: 'Libre' },
    'cols.sortable': { on: 'Ordenable', off: 'No ordenable' },
    'complete_on_focus': { on: 'Buscar al enfocar', off: 'No buscar al enfocar' },
    'default.active': { on: 'Valor por defecto', off: 'Sin valor' },
    'default.date.active': { on: 'Incluir fecha', off: 'Sin fecha' },
    'default.edit': { on: 'Default editable', off: 'Default bloqueado' },
    'default.fill.active': { on: 'Relleno activo', off: 'Sin relleno' },
    'default.fixed.active': { on: 'Prefijo fijo activo', off: 'Sin prefijo fijo' },
    'default.value': { on: 'Valor verdadero', off: 'Valor falso' },
    'description.active': { on: 'Mostrar descripcion', off: 'Ocultar descripcion' },
    'disabled': { on: 'Deshabilitado', off: 'Habilitado' },
    'editable': { on: 'Editable', off: 'No editable' },
    'filter_local': { on: 'Filtro local activo', off: 'Filtro local inactivo' },
    'force_selection': { on: 'Forzar seleccion', off: 'Permitir texto libre' },
    'hide': { on: 'Oculto', off: 'Visible' },
    'multiple': { on: 'Seleccion multiple', off: 'Seleccion unica' },
    'new_icon': { on: 'Mostrar nuevo', off: 'Ocultar nuevo' },
    'readonly': { on: 'Solo lectura', off: 'Editable' },
    'reload_icon': { on: 'Mostrar recargar', off: 'Ocultar recargar' },
    'required': { on: 'Requerido', off: 'No requerido' },
    'rounded': { on: 'Redondeado', off: 'Sin redondear' },
    'scanner.active': { on: 'Habilitar escaner', off: 'Deshabilitar escaner' },
    'select_on_focus': { on: 'Seleccionar al enfocar', off: 'No seleccionar al enfocar' },
    'server_upload.active': { on: 'Subida servidor activa', off: 'Subida servidor inactiva' },
    'server_upload.required': { on: 'Servidor requerido', off: 'Servidor opcional' },
    'show_buttons': { on: 'Mostrar botones +/-', off: 'Ocultar botones +/-' },
    'show_icon': { on: 'Mostrar icono', off: 'Ocultar icono' },
    'upload.active': { on: 'Subida activa', off: 'Subida inactiva' },
    'upload.allow_camera': { on: 'Permitir camara', off: 'Bloquear camara' },
    'upload.allow_gallery': { on: 'Permitir galeria', off: 'Bloquear galeria' },
    'upload.required': { on: 'Subida requerida', off: 'Subida opcional' },
    'virtual_scroll': { on: 'Scroll virtual activo', off: 'Scroll virtual inactivo' },
  };
  private readonly rowForms = new Map<number, FormGroup>();
  private readonly rowFormSubscriptions = new Map<number, Subscription>();
  private readonly subscriptions = new Subscription();
  private dropListSubscription: Subscription | null = null;
  private nextId = 1;
  private initializing = false;
  private syncingForms = false;

  readonly detailLabelControl = new FormControl(this.fallbackDetailLabel, { nonNullable: true });
  readonly advancedForm = new FormGroup({});

  readonly fieldTypes = [
    { label: 'Texto', value: 'input-text' },
    { label: 'Contraseña', value: 'input-password' },
    { label: 'Correo', value: 'email' },
    { label: 'Texto largo', value: 'textarea' },
    { label: 'Número', value: 'input-number' },
    { label: 'Sí/No', value: 'toggle-button' },
    { label: 'Fecha', value: 'date' },
    { label: 'Hora', value: 'time' },
    { label: 'Dropdown remoto', value: 'dropdown' },
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
    { label: 'Correos chips', value: 'emails-chips' },
    { label: 'Tabla', value: 'table' },
    { label: 'Firma', value: 'signature' },
    { label: 'Firma pad', value: 'signature-pad' },
    { label: 'Login', value: 'login' },
    { label: 'Selfie', value: 'selfie' },
  ];

  readonly spanOptions = Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1} ${index === 0 ? 'celda' : 'celdas'}`,
    value: index + 1,
  }));

  readonly iconOptions = [
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
    { label: 'Recargar', value: 'pi pi-replay' },
    { label: 'Ver', value: 'pi pi-eye' },
  ];

  readonly rows = signal<ChildBuilderRow[]>([]);
  readonly selectedRowId = signal<number | null>(null);
  readonly advancedSnapshot = signal<any>(null);
  readonly showJson = signal(false);
  readonly detailLabel = signal(this.fallbackDetailLabel);
  readonly generatedValue = signal<any>(this.emptyChildFormFields());
  readonly previewForm = signal<FormGroup>(new FormGroup({}));

  readonly selectedRow = computed(() => this.rows().find((item) => item.id === this.selectedRowId()) ?? null);
  readonly advancedTitle = computed(() => this.selectedRow()?.label || 'Campo seleccionado');

  readonly previewDraw = computed(() => {
    const grid: Record<string, any> = {};

    this.rows().forEach((row, index) => {
      grid[String(index + 1)] = this.rowToConfig(row);
    });

    return { grid };
  });

  readonly generatedJson = computed(() => {
    try {
      return JSON.stringify({ child_form_fields: this.generatedValue() }, null, 2);
    } catch {
      return '{}';
    }
  });

  readonly advancedSectionViews = computed<AdvancedSectionView[]>(() => this.buildAdvancedSectionViews());

  readonly builderVm = computed<BuilderViewModel>(() => {
    const rows = this.rows();
    const selectedId = this.selectedRowId();
    const showJson = this.showJson();

    return {
      rows: rows.map((row, index) => this.toRowView(row, index, selectedId)),
      hasRows: rows.length > 0,
      showJson,
      showJsonLabel: showJson ? 'Ocultar JSON' : 'Ver JSON',
      showJsonOutlined: !showJson,
      advancedTitle: this.advancedTitle(),
      advancedSections: this.advancedSectionViews(),
      previewDraw: this.previewDraw(),
      previewForm: this.previewForm(),
      generatedJson: this.generatedJson(),
    };
  });

  readonly builderVm$ = toObservable(this.builderVm);

  @ViewChild(CdkDropList)
  set builderDropList(dropList: CdkDropList<ChildBuilderRowView[]> | undefined) {
    this.dropListSubscription?.unsubscribe();
    this.dropListSubscription = dropList?.dropped.subscribe((event) => this.dropField(event)) ?? null;
  }

  constructor() {
    this.subscriptions.add(
      this.detailLabelControl.valueChanges.subscribe((value) => {
        if (this.syncingForms) return;
        this.detailLabel.set(value || this.fallbackDetailLabel);
        this.rebuild();
      })
    );

    this.subscriptions.add(
      this.advancedForm.valueChanges.subscribe(() => this.applyAdvancedFormValue())
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value']) return;

    const incoming = changes['value'].currentValue;
    if (incoming === this.generatedValue() || incoming?.child_form_fields === this.generatedValue()) {
      return;
    }

    const parsed = this.parseValue(incoming);
    const detailLabel = parsed?.label || this.fallbackDetailLabel;

    this.initializing = true;
    this.detailLabel.set(detailLabel);
    this.patchDetailLabelControl(detailLabel);
    this.setRows(this.rowsFromParsedValue(parsed));
    this.selectedRowId.set(this.rows()[0]?.id ?? null);
    this.refreshAdvancedSnapshot();
    this.rebuild(false);
    this.initializing = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.dropListSubscription?.unsubscribe();
    this.rowFormSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.rowFormSubscriptions.clear();
  }

  @HostListener('click', ['$event'])
  onBuilderClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest<HTMLElement>('[data-builder-action]');
    if (!actionElement) return;

    const action = actionElement.dataset['builderAction'];
    const rowId = Number(actionElement.dataset['rowId']);

    if (action === 'add-field') {
      this.addField();
      return;
    }

    if (action === 'toggle-json') {
      this.showJson.update((value) => !value);
      return;
    }

    if (Number.isFinite(rowId) && action === 'remove-field') {
      this.removeField(rowId);
      return;
    }

    if (Number.isFinite(rowId) && action === 'select-row') {
      this.selectRow(rowId);
    }
  }

  private dropField(event: CdkDragDrop<ChildBuilderRowView[]>): void {
    const rows = [...this.rows()];
    moveItemInArray(rows, event.previousIndex, event.currentIndex);
    this.setRows(rows);
    this.rebuild();
  }

  private addField(): void {
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
      gridSpanMd: 3,
      cfg: {},
    });

    this.setRows([...this.rows(), row]);
    this.selectedRowId.set(row.id);
    this.refreshAdvancedSnapshot(row);
    this.rebuild();
  }

  private removeField(rowId: number): void {
    this.setRows(this.rows().filter((row) => row.id !== rowId));
    if (this.selectedRowId() === rowId) {
      this.selectedRowId.set(this.rows()[0]?.id ?? null);
      this.refreshAdvancedSnapshot();
    }
    this.rebuild();
  }

  private selectRow(rowId: number): void {
    if (this.selectedRowId() === rowId) return;
    const row = this.rows().find((item) => item.id === rowId);
    if (!row) return;
    this.selectedRowId.set(rowId);
    this.refreshAdvancedSnapshot(row);
  }

  private applyRowFormValue(rowId: number, formValue: Partial<RowFormValue>): void {
    if (this.syncingForms) return;

    let updatedRow: ChildBuilderRow | null = null;
    const rows = this.rows().map((row) => {
      if (row.id !== rowId) return row;

      const label = String(formValue.label ?? row.label);
      const type = String(formValue.type ?? row.type);
      const suffix = this.uniqueSuffix(String(formValue.suffix ?? row.suffix), rowId);
      const field = this.fieldPrefix + suffix;
      const gridSpan = this.normalizeSpan(formValue.gridSpan, row.gridSpan);
      const gridSpanMd = this.normalizeSpan(formValue.gridSpanMd, row.gridSpanMd);
      const required = formValue.required === true;
      const readonly = formValue.readonly === true;
      const hide = formValue.hide === true;
      let colsLabel = String(formValue.colsLabel ?? '');

      if (label !== row.label && (!colsLabel || colsLabel === row.label)) {
        colsLabel = label;
      }

      let cfg = type !== row.type
        ? this.defaultCfgForType({ field, label, type })
        : { ...(row.cfg ?? {}) };

      cfg = {
        ...cfg,
        field,
        type,
        label,
        required,
        readonly,
        hide,
        class: `col-span-${gridSpan}`,
        class_md: `md:col-span-${gridSpanMd}`,
      };
      cfg = setByPath(cfg, 'autofocus', formValue.autofocus === true);
      cfg = setByPath(cfg, 'cols.label', colsLabel || label);
      cfg = setByPath(cfg, 'cols.hide', formValue.colsHide === true);
      cfg = setByPath(cfg, 'cols.hide_mobile', formValue.colsHideMobile === true);
      cfg = setByPath(cfg, 'cols.sortable', formValue.colsSortable === true);
      cfg = setByPath(cfg, 'cols.locked', formValue.colsLocked === true);

      updatedRow = {
        ...row,
        field,
        suffix,
        label,
        type,
        required,
        readonly,
        hide,
        gridSpan,
        gridSpanMd,
        cfg,
      };

      return updatedRow;
    });

    if (!updatedRow) return;

    this.setRows(rows);
    if (this.selectedRowId() === rowId) {
      this.refreshAdvancedSnapshot(updatedRow);
    }
    this.rebuild();
  }

  private applyAdvancedFormValue(): void {
    if (this.syncingForms) return;
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return;

    const rawValue = this.advancedForm.getRawValue() as Record<string, any>;
    let nextSnapshot = this.clone(snapshot);

    this.currentAdvancedDefs().forEach((def) => {
      const controlName = this.advancedControlName(def.path);
      if (!Object.prototype.hasOwnProperty.call(rawValue, controlName)) return;
      nextSnapshot = setByPath(nextSnapshot, def.path, this.advancedValueFromControl(def, rawValue[controlName]));
    });

    this.advancedSnapshot.set(nextSnapshot);
    this.syncAdvancedSnapshotToRow();
    this.syncAdvancedFormDisabledStates();
  }

  private buildAdvancedSectionViews(): AdvancedSectionView[] {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return [];

    return this.currentAdvancedSections().map((section) => ({
      title: section.title,
      icon: section.icon,
      defs: section.defs.map((def) => this.toAdvancedFieldView(def, snapshot)),
    }));
  }

  private toAdvancedFieldView(def: AdvancedFieldDef, snapshot: any): AdvancedFieldView {
    const isIcon = this.isIconField(def.path) && def.kind !== 'boolean';
    const isNumeric = this.isNumericControl(def);
    const labelText = this.advancedLabel(def);

    return {
      ...def,
      controlName: this.advancedControlName(def.path),
      inputId: `adv-${def.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      labelText,
      hintText: this.advancedHint(def),
      controlClass: isNumeric ? 'col-span-2 md:col-span-2' : 'col-span-6 md:col-span-3',
      optionsList: isIcon ? this.iconOptions : (def.options ?? []),
      booleanOnLabel: this.advancedBooleanOnLabel(def),
      booleanOffLabel: this.advancedBooleanOffLabel(def),
      isIcon,
      isNumeric,
      isBoolean: def.kind === 'boolean',
      isSelect: def.kind === 'select',
      isMultiselect: def.kind === 'multiselect',
      isTextarea: def.kind === 'textarea',
      isJson: def.kind === 'json',
    };
  }

  private toRowView(row: ChildBuilderRow, index: number, selectedId: number | null): ChildBuilderRowView {
    const cfg = this.rowToConfig(row);
    const autofocus = getByPath(cfg, 'autofocus') === true;
    const colsHide = getByPath(cfg, 'cols.hide') === true;
    const colsHideMobile = getByPath(cfg, 'cols.hide_mobile') === true;
    const colsSortable = getByPath(cfg, 'cols.sortable') === true;
    const colsLocked = getByPath(cfg, 'cols.locked') === true;

    return {
      id: row.id,
      label: row.label,
      gridSpan: row.gridSpan,
      gridSpanMd: row.gridSpanMd,
      form: this.rowForms.get(row.id) ?? this.createRowForm(row),
      selected: row.id === selectedId,
      order: index + 1,
      ariaLabel: `Editar ${row.label}`,
      labelInputId: `label-${row.id}`,
      typeInputId: `type-${row.id}`,
      suffixInputId: `suffix-${row.id}`,
      colsLabelInputId: `cols-label-${row.id}`,
      desktopSpanInputId: `desktop-span-${row.id}`,
      mobileSpanInputId: `mobile-span-${row.id}`,
      requiredTooltip: row.required ? 'Requerido' : 'No requerido',
      readonlyTooltip: row.readonly ? 'Solo lectura' : 'Editable',
      hideTooltip: row.hide ? 'Oculto' : 'Visible',
      autofocusTooltip: autofocus ? 'Con auto-foco' : 'Sin auto-foco',
      colsHideTooltip: colsHide ? 'Oculto en tabla' : 'Visible en tabla',
      colsHideMobileTooltip: colsHideMobile ? 'Oculto en móvil' : 'Visible en móvil',
      colsSortableTooltip: colsSortable ? 'Ordenable' : 'No ordenable',
      colsLockedTooltip: colsLocked ? 'Columna bloqueada' : 'Columna libre',
    };
  }

  private setRows(rows: ChildBuilderRow[]): void {
    this.syncRowForms(rows);
    this.rows.set(rows);
  }

  private createRowForm(row: ChildBuilderRow): FormGroup {
    const form = new FormGroup({
      label: new FormControl(row.label, { nonNullable: true }),
      type: new FormControl(row.type, { nonNullable: true }),
      suffix: new FormControl(row.suffix, { nonNullable: true }),
      colsLabel: new FormControl(row.label, { nonNullable: true }),
      gridSpan: new FormControl(row.gridSpan, { nonNullable: true }),
      gridSpanMd: new FormControl(row.gridSpanMd, { nonNullable: true }),
      required: new FormControl(row.required, { nonNullable: true }),
      readonly: new FormControl(row.readonly, { nonNullable: true }),
      hide: new FormControl(row.hide, { nonNullable: true }),
      autofocus: new FormControl(false, { nonNullable: true }),
      colsHide: new FormControl(true, { nonNullable: true }),
      colsHideMobile: new FormControl(false, { nonNullable: true }),
      colsSortable: new FormControl(true, { nonNullable: true }),
      colsLocked: new FormControl(false, { nonNullable: true }),
    });

    this.rowForms.set(row.id, form);
    this.rowFormSubscriptions.set(
      row.id,
      form.valueChanges.subscribe((value) => this.applyRowFormValue(row.id, value as Partial<RowFormValue>))
    );
    return form;
  }

  private syncRowForms(rows: ChildBuilderRow[]): void {
    const previousSyncing = this.syncingForms;
    this.syncingForms = true;
    const activeIds = new Set(rows.map((row) => row.id));

    rows.forEach((row) => {
      const form = this.rowForms.get(row.id) ?? this.createRowForm(row);
      this.patchRowForm(form, row);
    });

    Array.from(this.rowForms.keys()).forEach((rowId) => {
      if (activeIds.has(rowId)) return;
      this.rowFormSubscriptions.get(rowId)?.unsubscribe();
      this.rowFormSubscriptions.delete(rowId);
      this.rowForms.delete(rowId);
    });

    this.syncingForms = previousSyncing;
  }

  private patchRowForm(form: FormGroup, row: ChildBuilderRow): void {
    const cfg = this.rowToConfig(row);
    form.patchValue({
      label: row.label,
      type: row.type,
      suffix: row.suffix,
      colsLabel: getByPath(cfg, 'cols.label') ?? row.label,
      gridSpan: row.gridSpan,
      gridSpanMd: row.gridSpanMd,
      required: row.required,
      readonly: row.readonly,
      hide: row.hide,
      autofocus: getByPath(cfg, 'autofocus') === true,
      colsHide: getByPath(cfg, 'cols.hide') === true,
      colsHideMobile: getByPath(cfg, 'cols.hide_mobile') === true,
      colsSortable: getByPath(cfg, 'cols.sortable') === true,
      colsLocked: getByPath(cfg, 'cols.locked') === true,
    }, { emitEvent: false });
  }

  private patchDetailLabelControl(value: string): void {
    const previousSyncing = this.syncingForms;
    this.syncingForms = true;
    this.detailLabelControl.setValue(value || this.fallbackDetailLabel, { emitEvent: false });
    this.syncingForms = previousSyncing;
  }

  private syncAdvancedForm(): void {
    const snapshot = this.advancedSnapshot();
    const defs = snapshot ? this.currentAdvancedDefs() : [];
    const activeControls = new Set(defs.map((def) => this.advancedControlName(def.path)));
    const previousSyncing = this.syncingForms;
    this.syncingForms = true;

    Object.keys(this.advancedForm.controls).forEach((controlName) => {
      if (!activeControls.has(controlName)) {
        this.advancedForm.removeControl(controlName, { emitEvent: false });
      }
    });

    defs.forEach((def) => {
      const controlName = this.advancedControlName(def.path);
      if (!this.advancedForm.contains(controlName)) {
        this.advancedForm.addControl(controlName, new FormControl(null), { emitEvent: false });
      }

      const control = (this.advancedForm.controls as Record<string, FormControl>)[controlName];
      control.setValue(this.advancedControlValue(def, snapshot), { emitEvent: false });
      this.setAdvancedControlDisabled(control, this.isAdvancedDisabled(def, snapshot));
    });

    this.syncingForms = previousSyncing;
  }

  private syncAdvancedFormDisabledStates(): void {
    const snapshot = this.advancedSnapshot();
    if (!snapshot) return;

    const previousSyncing = this.syncingForms;
    this.syncingForms = true;
    this.currentAdvancedDefs().forEach((def) => {
      const control = (this.advancedForm.controls as Record<string, FormControl>)[this.advancedControlName(def.path)];
      if (!control) return;
      this.setAdvancedControlDisabled(control as FormControl, this.isAdvancedDisabled(def, snapshot));
    });
    this.syncingForms = previousSyncing;
  }

  private setAdvancedControlDisabled(control: FormControl, disabled: boolean): void {
    if (disabled && control.enabled) {
      control.disable({ emitEvent: false });
      return;
    }

    if (!disabled && control.disabled) {
      control.enable({ emitEvent: false });
    }
  }

  private currentAdvancedSections(): AdvancedSection[] {
    const snapshot = this.advancedSnapshot();
    return schemaForType(this.selectedRow()?.type, snapshot)
      .map((section) => ({
        ...section,
        defs: section.defs.filter((def) =>
          !this.inlineEditorPaths.has(def.path)
          && (!def.includeIf || def.includeIf(snapshot ?? {}))
        ),
      }))
      .filter((section) => section.defs.length > 0);
  }

  private currentAdvancedDefs(): AdvancedFieldDef[] {
    return this.currentAdvancedSections().flatMap((section) => section.defs);
  }

  private advancedControlName(path: string): string {
    return `adv_${path.replace(/[^a-zA-Z0-9_]/g, '__')}`;
  }

  private advancedControlValue(def: AdvancedFieldDef, snapshot: any): any {
    const value = getByPath(snapshot, def.path);
    if (def.kind === 'json') return this.stringifyJsonValue(value);
    if (this.isNumericControl(def)) return this.numericValueFromConfig(value);
    return value ?? null;
  }

  private advancedValueFromControl(def: AdvancedFieldDef, value: any): any {
    if (def.kind === 'json') return this.parseJsonValue(value);
    if (this.isNumericControl(def)) {
      return this.isPixelControl(def) && value !== null && value !== undefined && value !== ''
        ? `${value}px`
        : value;
    }
    return value;
  }

  private stringifyJsonValue(value: any): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private parseJsonValue(raw: any): any {
    if (typeof raw !== 'string') return raw;
    try {
      return raw.trim() ? JSON.parse(raw) : null;
    } catch {
      return raw;
    }
  }

  private numericValueFromConfig(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private advancedLabel(def: AdvancedFieldDef): string {
    if (def.path === 'field') return 'Clave campo';
    if (def.path === 'class') return 'Ancho escritorio';
    if (def.path === 'class_md') return 'Ancho móvil';
    return def.label;
  }

  private advancedHint(def: AdvancedFieldDef): string {
    if (def.path === 'field') return 'Clave limpia del dato; el prefijo técnico se agrega al guardar.';
    if (def.path === 'class' || def.path === 'class_md') return 'Selecciona cuántas celdas ocupará dentro del formulario.';
    return def.hint ?? '';
  }

  private advancedBooleanOnLabel(def: AdvancedFieldDef): string {
    return def.booleanOnLabel ?? this.advancedBooleanLabels[def.path]?.on ?? def.label;
  }

  private advancedBooleanOffLabel(def: AdvancedFieldDef): string {
    return def.booleanOffLabel ?? this.advancedBooleanLabels[def.path]?.off ?? 'Desactivado';
  }

  private isAdvancedDisabled(def: { showIf?: (cfg: any) => boolean }, snapshot: any): boolean {
    return !!def.showIf && !def.showIf(snapshot ?? {});
  }

  private isIconField(path: string): boolean {
    return path === 'icon' || path.endsWith('.icon');
  }

  private isNumericControl(def: AdvancedFieldDef): boolean {
    return def.kind === 'number' || this.isPixelControl(def);
  }

  private isPixelControl(def: AdvancedFieldDef): boolean {
    if (def.kind === 'number') return false;
    const path = def.path.toLowerCase();
    const label = def.label.toLowerCase();
    return path.endsWith('height')
      || path.endsWith('width')
      || path.endsWith('scroll_height')
      || label === 'alto'
      || label === 'ancho'
      || label.includes('(px)');
  }

  private rowsFromParsedValue(parsed: any): ChildBuilderRow[] {
    const fields = parsed?.fields ?? {};
    const draw = parsed?.draw ?? {};
    const layout = draw.grid ?? draw.general ?? this.firstLayout(draw);
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
    const grid: Record<string, any> = {};
    const controls: Record<string, FormControl<any>> = {};

    this.rows().forEach((row, index) => {
      const cfg = this.rowToConfig(row);
      fields[cfg.field] = { ...cfg };
      grid[String(index + 1)] = { field: cfg.field };
      controls[cfg.field] = this.previewControl(cfg);
    });

    const nextValue = {
      draw: {
        grid,
        dialog: this.dialogConfig(),
      },
      field: 'child_form_fields',
      label: this.detailLabel(),
      fields,
    };

    this.generatedValue.set(nextValue);
    this.previewForm.set(new FormGroup(controls));

    if (emit && !this.initializing) {
      this.valueChange.emit(nextValue);
    }
  }

  private previewControl(cfg: any): FormControl<any> {
    const validators = cfg.required ? [Validators.required] : [];
    const value = this.initialPreviewValue(cfg);
    return new FormControl({ value, disabled: cfg.readonly === true }, validators);
  }

  private initialPreviewValue(cfg: any): any {
    if (cfg?.default?.active === true && cfg.default.value !== undefined) {
      return cfg.default.value === 'current' ? null : cfg.default.value;
    }

    if (cfg.type === 'toggle-button') return false;
    if (cfg.type === 'multi-select' || cfg.type === 'multi-choice' || cfg.type === 'listbox') return [];
    if (cfg.type === 'input-number' || cfg.type === 'date' || cfg.type === 'time') return null;
    return '';
  }

  private rowToConfig(row: ChildBuilderRow): any {
    const field = this.canonicalField(row.field);
    const defaults = this.defaultCfgForType({ ...row, field });
    const cfg = {
      ...defaults,
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

    return {
      ...cfg,
      cols: {
        ...(defaults.cols ?? {}),
        ...(cfg.cols ?? {}),
        label: cfg.cols?.label ?? row.label,
      },
      description: {
        ...(defaults.description ?? {}),
        ...(cfg.description ?? {}),
      },
      default: {
        ...(defaults.default ?? {}),
        ...(cfg.default ?? {}),
      },
    };
  }

  private createRowFromConfig(cfg: any): ChildBuilderRow {
    const field = this.canonicalField(cfg?.field);
    const suffix = this.fieldSuffix(field);
    return this.createRow({
      field,
      suffix,
      label: cfg?.label ?? suffix,
      type: cfg?.type ?? 'input-text',
      required: cfg?.required === true,
      hide: cfg?.hide === true,
      readonly: cfg?.readonly === true,
      gridSpan: this.spanFromClass(cfg?.class, 6),
      gridSpanMd: this.spanFromClass(cfg?.class_md, 3),
      cfg: { ...(cfg ?? {}), field },
    });
  }

  private createRow(row: Omit<ChildBuilderRow, 'id'>): ChildBuilderRow {
    return { ...row, id: this.nextId++ };
  }

  private defaultCfgForType(row: Pick<ChildBuilderRow, 'field' | 'label' | 'type'>): any {
    const base = {
      cols: {
        hide: true,
        label: row.label,
        locked: false,
        sortable: true,
      },
      hide: false,
      type: row.type,
      field: row.field,
      label: row.label,
      default: { edit: true, value: this.defaultValueForType(row.type), active: true },
      readonly: false,
      required: false,
      autofocus: false,
      description: {
        name: '',
        slice: '100',
        active: false,
        border: '',
        height: '60px',
        caracter_slice: '...',
      },
    };

    if (row.type === 'toggle-button') {
      return { ...base, label_true: 'Sí', label_false: 'No', default: { active: true, value: false, edit: true } };
    }

    if (['dropdown', 'dropdown-choice', 'multi-select', 'multi-choice', 'tree-select', 'listbox', 'auto-complete', 'select-button'].includes(row.type)) {
      return {
        ...base,
        option_value: 'id',
        option_label: 'name',
        filter_local: true,
        filter_by: 'name',
        scroll_height: '120px',
        data_type: { options: [] },
        options: [],
      };
    }

    if (row.type === 'textarea') {
      return { ...base, rows: 1, auto_resize: false, max_length: 500, min_length: 0 };
    }

    if (row.type === 'input-text' || row.type === 'input-password' || row.type === 'email') {
      return { ...base, max_length: 250, min_length: 0 };
    }

    if (row.type === 'input-number') {
      return {
        ...base,
        mode: 'decimal',
        min_fraction_digits: 0,
        max_fraction_digits: 2,
        show_buttons: false,
      };
    }

    if (row.type === 'date' || row.type === 'time') {
      return { ...base, show_icon: true, default: { active: false, value: '', edit: true } };
    }

    if (row.type === 'files' || row.type === 'document' || row.type === 'image-uploader') {
      return {
        ...base,
        upload: { active: true, required: false, allow_camera: true, allow_gallery: true },
        server_upload: { active: false, required: false },
        name_file_user: '',
      };
    }

    if (row.type === 'button') {
      return { ...base, icon: 'pi pi-check', icon_position: 'left', severity: 'primary', rounded: false, disabled: false };
    }

    if (row.type === 'json' || row.type === 'table') {
      return { ...base, fields: {}, draw: {}, schema: {}, default: { active: true, value: {}, edit: true } };
    }

    return base;
  }

  private defaultValueForType(type: string): any {
    if (type === 'toggle-button') return false;
    if (type === 'multi-select' || type === 'multi-choice' || type === 'listbox') return [];
    if (type === 'json' || type === 'table') return {};
    return '';
  }

  private parseValue(value: any): any {
    if (!value) return this.emptyChildFormFields();
    if (typeof value === 'string') {
      try { return this.parseValue(JSON.parse(value)); } catch { return this.emptyChildFormFields(); }
    }
    if (value?.child_form_fields) return value.child_form_fields;
    return {
      ...this.emptyChildFormFields(value?.label),
      ...(value ?? {}),
      draw: {
        ...this.emptyChildFormFields(value?.label).draw,
        ...(value?.draw ?? {}),
      },
      fields: value?.fields ?? {},
    };
  }

  private emptyChildFormFields(label = this.fallbackDetailLabel): any {
    return {
      draw: {
        grid: {},
        dialog: this.dialogConfig(),
      },
      field: 'child_form_fields',
      label,
      fields: {},
    };
  }

  private dialogConfig(): any {
    const label = this.detailLabel() || this.fallbackDetailLabel;
    const normalized = label.toUpperCase();
    return {
      tab: 2,
      width: 'width-900px-custom',
      height: 'height-700px-custom',
      plural: normalized,
      singular: normalized,
      pluralDefiniteArticle: normalized,
      singularIndefiniteArticle: normalized,
    };
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

  private fieldSuffix(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const withoutObject = raw.startsWith('object_') ? raw.slice('object_'.length) : raw;
    return withoutObject.startsWith(this.fieldPrefix) ? withoutObject.slice(this.fieldPrefix.length) : withoutObject;
  }

  private normalizeSuffix(value: any): string {
    const normalized = String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'campo';
  }

  private uniqueSuffix(base: string, ignoreRowId?: number): string {
    const existing = new Set(
      this.rows()
        .filter((row) => row.id !== ignoreRowId)
        .map((row) => row.suffix)
    );
    let suffix = this.normalizeSuffix(base || 'campo');
    if (!existing.has(suffix)) return suffix;
    let i = 1;
    while (existing.has(`${suffix}_${i}`)) i++;
    return `${suffix}_${i}`;
  }

  private normalizeSpan(value: any, fallback: number): number {
    const parsed = Number(value);
    return Math.min(12, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
  }

  private spanFromClass(value: any, fallback: number): number {
    const match = String(value ?? '').match(/(?:md:)?col-span-(\d+)/);
    const parsed = match ? Number(match[1]) : fallback;
    return this.normalizeSpan(parsed, fallback);
  }

  private refreshAdvancedSnapshot(row: ChildBuilderRow | null = this.selectedRow()): void {
    this.advancedSnapshot.set(row ? this.clone(this.rowToConfig(row)) : null);
    this.syncAdvancedForm();
  }

  private syncAdvancedSnapshotToRow(): void {
    const rowId = this.selectedRowId();
    const snapshot = this.advancedSnapshot();
    if (rowId === null || !snapshot) return;

    const rows = this.rows().map((row) => {
      if (row.id !== rowId) return row;
      const field = this.canonicalField(snapshot.field || row.field);
      return {
        ...row,
        field,
        suffix: this.fieldSuffix(field),
        label: snapshot.label ?? row.label,
        type: snapshot.type ?? row.type,
        required: snapshot.required === true,
        hide: snapshot.hide === true,
        readonly: snapshot.readonly === true,
        gridSpan: this.spanFromClass(snapshot.class, row.gridSpan),
        gridSpanMd: this.spanFromClass(snapshot.class_md, row.gridSpanMd),
        cfg: { ...snapshot, field },
      };
    });

    this.setRows(rows);
    this.rebuild();
  }

  private clone<T>(value: T): T {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
}
// ]]]FI
