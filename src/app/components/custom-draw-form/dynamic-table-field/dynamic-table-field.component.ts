import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AutoFocusModule } from 'primeng/autofocus';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, filter as rxFilter, map, Observable, of, Subscription } from 'rxjs';
import { CustomButtonCrudComponent } from '../../custom-button-crud/custom-button-crud.component';
import { JoinOrSelfPipe } from '../join-or-self.pipe';
import { DERIVED_TABLE_DRAFT_FLAG, TABLE_ROW_SOURCE_FLAG } from '../../../utils/table-row-flags.const';
import { CRUDService } from '../../../utils/services/crud.service';
import { GeneralService } from '../../../utils/services/general.service';

// [[[II ESC:015-01 DOC:docs/documents/2026-06-02_015_dynamic-table-field-component.md#escenario-01 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09 ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01 ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
@Component({
  selector: 'app-dynamic-table-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AutoCompleteModule,
    AutoFocusModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    ToggleButtonModule,
    TooltipModule,
    CustomButtonCrudComponent,
    JoinOrSelfPipe
  ],
  templateUrl: './dynamic-table-field.component.html',
  styleUrl: './dynamic-table-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicTableFieldComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  // [[[II ESC:030-06 Servicios reusados para la busqueda en celda (Enter/F3): el
  // mismo aplanado (DJAtoObject/mergeConfiguredTableRow) y resolucion app/type que
  // el resto del form; no se duplica logica de red. ]]]FI
  private readonly crudS = inject(CRUDService);
  private readonly generalS = inject(GeneralService);
  // [[[II ESC:030-01 Fuente única compartida en utils/table-row-flags.const.ts ]]]FI
  private readonly tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
  private readonly derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
  // Fila agregada desde la tabla y aún NO confirmada contra el servidor: si se
  // cancela la edición se elimina (no debe quedar una fila fantasma).
  private readonly pendingNewRowFlag = '__pendingNewRow';
  private tableValueSubscription?: Subscription;

  @Input() tableConfig: any;
  @Input() formGroup: FormGroup | null = null;
  @Input() editingRows: { [key: string]: boolean } = {};
  @Input() editingCells: { [key: string]: boolean } = {};
  @Input() tablesToValidate: { [key: string]: boolean } = {};
  @Input() originalRowData: { [key: string]: any } = {};
  @Input() tableOptions: { rows?: number } | null = null;
  @Input() validationVersion = 0;
  // Bloqueo externo cuando otra tabla del mismo formulario está en edición.
  @Input() externalEditingLocked = false;
  // [[[II ESC:030-06 Cuando el host delega el guardado por fila (delegateTableSave),
  // el recorrido de celdas NO persiste por celda: terminar una celda intermedia
  // sólo avanza el foco; sólo la ÚLTIMA celda editable (o la paloma verde) cierra
  // la fila y dispara el guardado. Cuando es false, se conserva el flujo previo. ]]]FI
  @Input() deferRowSave = false;
  // [[[II ESC:030-06 Opciones que el FORM ya cargó al abrir el diálogo
  // (dropdownOptionsSignal de custom-draw-form). Las celdas combo se alimentan de
  // aquí — misma fuente que los inputs del form — en vez de repetir la consulta
  // (evita además el "primer render muestra el id"). ]]]FI
  @Input() formDropdownOptions: { [field: string]: any[] } = {};
  // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
  // Canal de retorno del motor: desenlace del guardado de la fila delegada.
  // Sólo se consume cuando `deferRowSave` está activo — es el único caso en que
  // esta tabla no sabe por sí misma si la fila llegó al servidor. ]]]FI
  @Input() rowSaveOutcome: { field: string; row_index: any; ok: boolean; token: number } | null = null;

  @Output() rowSelect = new EventEmitter<any>();
  @Output() rowUnselect = new EventEmitter<any>();
  @Output() addRow = new EventEmitter<any>();
  @Output() editRow = new EventEmitter<any>();
  @Output() deleteRow = new EventEmitter<any>();
  @Output() cellEdit = new EventEmitter<any>();
  @Output() editingStateChange = new EventEmitter<{ field: string; active: boolean }>();

  normalizedColumns: any[] = [];
  controlColumnFields: string[] = [];
  // [[[II ESC:030-06 Campos relación declarados por columnas (relationship_field)
  // y targets con `edit:false` en el derived de columnas autocomplete: gobiernan
  // la editabilidad POR FILA (fila manual = sin relación resuelta => todo
  // editable; fila relacionada => derived edit:false bloquea la celda). ]]]FI
  private _relationshipColumnFields: string[] = [];
  private _derivedLockedFields = new Set<string>();
  // [[[II ESC:030-12 Fila que ya se emitió al motor y espera confirmación del
  // servidor. Mientras exista, esa fila permanece en edición. ]]]FI
  private _pendingRowSave: { tableField: string; rowIndex: number } | null = null;
  private _reportedEditingState: boolean | null = null;

  private tableColumnMetaCache = new WeakMap<any, any>();
  private formattedTagValueCache = new WeakMap<any, Map<string, any>>();
  private tableRowEditStateCache: {
    [rowKey: string]: {
      isRowEditing: boolean;
      isRowOrCellEditing: boolean;
      editingCells: { [colField: string]: boolean };
    };
  } = {};
  private tableCellClassCache: { [cacheKey: string]: string } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableConfig']) {
      this.normalizeTableConfig();
    }

    if (
      changes['tableConfig'] ||
      changes['formGroup'] ||
      changes['editingRows'] ||
      changes['editingCells'] ||
      changes['tablesToValidate'] ||
      changes['validationVersion']
    ) {
      this.clearTableRuntimeCaches();
    }

    if (changes['tableConfig'] || changes['formGroup']) {
      this.bindTableValueChanges();
    }

    // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
    if (changes['rowSaveOutcome']) {
      this._applyRowSaveOutcome();
    }
    // ]]]FI
  }

  // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
  /**
   * Desenlace del guardado delegado de una fila:
   *   - OK       -> recién ahora se cierra la fila (ya está persistida).
   *   - FALLIDO  -> la fila SIGUE en edición y el foco vuelve al campo inválido;
   *                 si falla un encabezado ajeno a la fila (p.ej. Sucursal),
   *                 vuelve a la ÚLTIMA celda editable.
   * Se ignoran los desenlaces de otra tabla o de otra fila.
   */
  private _applyRowSaveOutcome(): void {
    const pending = this._pendingRowSave;
    const outcome = this.rowSaveOutcome;
    if (!pending || !outcome) return;
    if (outcome.field !== pending.tableField) return;
    if (Number(outcome.row_index) !== Number(pending.rowIndex)) return;

    this._pendingRowSave = null;

    if (outcome.ok) {
      this._closeRowEditFlags(pending.tableField, pending.rowIndex);
    } else {
      this._focusPendingOrLastEditable(pending.tableField, pending.rowIndex);
    }

    this.clearTableRuntimeCaches();
    this.cdr.markForCheck();
  }
  // ]]]FI

  ngOnDestroy(): void {
    this.tableValueSubscription?.unsubscribe();
    if (this._reportedEditingState === true && this.tableConfig?.field) {
      this.editingStateChange.emit({ field: this.tableConfig.field, active: false });
    }
  }

  /** Mantiene visible una mutación externa del FormArray en este componente OnPush. */
  private bindTableValueChanges(): void {
    this.tableValueSubscription?.unsubscribe();
    const formArray = this.getTableFormArray(this.tableConfig?.field);
    this.tableValueSubscription = formArray?.valueChanges.subscribe(() => {
      this.clearTableRuntimeCaches();
      this.cdr.markForCheck();
    });
  }

  trackByColumnField(index: number, column: any): any {
    return column?.field ?? column?.id ?? index;
  }

  trackByKey(index: number, item: any): any {
    return item?.key ?? index;
  }

  /** Etiqueta de una opción según `option_label` (soporta concatenación). */
  optionLabelText(option: any, column: any): string {
    return this._optionLabelValue(option, column);
  }

  // [[[II ESC:030-14 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-14
  // Formato numérico de la celda y de las sugerencias: mismas claves
  // de config que el p-inputNumber del form (mode/currency/locale y
  // min/max_fraction_digits). Memoizado por (columna|valor) para no formatear en
  // cada ciclo de detección. ]]]FI
  private numberCellFormatCache = new Map<string, string>();

  formatNumberCell(value: any, column: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);

    const cacheKey = [
      column?.field, value, column?.mode, column?.currency, column?.locale,
      column?.min_fraction_digits, column?.max_fraction_digits,
      column?.prefix, column?.suffix,
    ].join('|');
    const cached = this.numberCellFormatCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: column?.min_fraction_digits ?? 0,
      maximumFractionDigits: column?.max_fraction_digits ?? Math.max(column?.min_fraction_digits ?? 0, 2),
    };
    if (column?.mode === 'currency' && column?.currency) {
      options.style = 'currency';
      options.currency = column.currency;
    }
    const formatted = new Intl.NumberFormat(column?.locale || undefined, options).format(numeric);
    const withAffixes = `${column?.prefix || ''}${formatted}${column?.suffix || ''}`;
    this.numberCellFormatCache.set(cacheKey, withAffixes);
    return withAffixes;
  }

  /** Formatea una columna del panel sólo cuando su propia config es numérica. */
  formatSuggestionValue(value: any, panelField: any): string {
    const numericConfig = panelField?.type === 'input-number'
      || panelField?.min_fraction_digits !== undefined
      || panelField?.max_fraction_digits !== undefined
      || panelField?.mode === 'currency';
    return numericConfig ? this.formatNumberCell(value, panelField) : String(value ?? '-');
  }

  /**
   * Cierra/avanza tras cambiar una celda no-textual (dropdown/dropdown-choice/
   * toggle): mismo recorrido de fila que las celdas de texto (deferRowSave decide
   * si sólo avanza el foco o cierra/guarda la fila en la última editable).
   */
  advanceAfterCell(tableField: string, rowIndex: number, colField: string): void {
    this._finishCellAndAdvance(tableField, rowIndex, colField, this._columnByField(colField));
  }

  getTableData(field: string): any[] {
    return this.getTableFormArray(field)?.controls || [];
  }

  onRowSelect(event: any, field: string): void {
    this.rowSelect.emit({ event: this.normalizeTableEvent(event), field, data: this.getTableValue(field) });
  }

  onRowUnselect(event: any, field: string): void {
    this.rowUnselect.emit({ event: this.normalizeTableEvent(event), field, data: this.getTableValue(field) });
  }

  addTableRow(field: string, tableConfig: any): void {
    // [[[II ESC:030-09 Solo la config decide si la tabla es de solo lectura. Si el
    // FormArray quedó deshabilitado por una ruta ajena (disableForm global, overlay
    // de children), se rehabilita: era la causa de que el "+" dejara de responder
    // de forma intermitente. ]]]FI
    if (this.isTableReadonly(field) || this.isAnyRowEditing(field)) return;
    const formArray = this.getTableFormArray(field);
    if (!formArray) return;
    if (formArray.disabled) formArray.enable({ emitEvent: false });

    const newRowFormGroup = this.createTableRowFormGroup(tableConfig);
    // [[[II ESC:030-06 Fila creada DESDE la tabla: se marca como pendiente para
    // que, si se cancela la edición sin completarla, se elimine (nunca llegó al
    // servidor). Además arranca en edición en su primera celda editable. ]]]FI
    (newRowFormGroup as any)[this.pendingNewRowFlag] = true;
    formArray.push(newRowFormGroup);
    formArray.markAsDirty();
    formArray.root?.markAsDirty();
    formArray.updateValueAndValidity();
    this.clearTableRuntimeCaches();

    const newRowIndex = formArray.length - 1;
    const firstEditable = (this.normalizedColumns || []).find((column: any) =>
      this._cellEditable(column, newRowFormGroup)
    );
    if (firstEditable) {
      requestAnimationFrame(() => {
        this.startCellEdit(field, newRowIndex, firstEditable.field);
        this.cdr.markForCheck();
      });
    }

    this.addRow.emit({
      field,
      newRow: newRowFormGroup.getRawValue(),
      data: this.getTableValue(field)
    });
  }

  editTableRow(rowData: any, field: string): void {
    const normalizedRowData = rowData instanceof FormGroup ? rowData.getRawValue() : rowData;
    const sourceRow = rowData instanceof FormGroup ? (rowData as any)[this.tableRowSourceFlag] : null;
    this.editRow.emit({ rowData: normalizedRowData, sourceRow, field, data: this.getTableValue(field) });
  }

  deleteTableRow(rowIndex: number, field: string): void {
    if (this.isTableReadonly(field)) return;
    const formArray = this.getTableFormArray(field);
    if (!formArray) return;

    const rowControl = this.getTableRowGroup(field, rowIndex);
    const rowToDelete = rowControl?.getRawValue();
    const sourceRow = (rowControl as any)?.[this.tableRowSourceFlag];
    const isDerivedDraft = (rowControl as any)?.[this.derivedTableDraftFlag] === true;

    formArray.removeAt(rowIndex);
    formArray.markAsDirty();
    formArray.root?.markAsDirty();
    formArray.markAsTouched();
    formArray.updateValueAndValidity();
    // [[[II ESC:030-06 Al quitar una fila los índices se corren: los flags de
    // edición por índice quedaban apuntando a filas equivocadas y bloqueaban
    // acciones (lápiz/+). Se limpian todos los de esta tabla. ]]]FI
    this._clearTableEditFlags(field);
    this.clearTableRuntimeCaches();

    this.deleteRow.emit({
      rowData: rowToDelete,
      sourceRow,
      isDerivedDraft,
      rowIndex,
      field,
      data: this.getTableValue(field)
    });
  }

  onCellEdit(event: any, field: string, rowIndex: number, colField: string): void {
    if (this.isTableReadonly(field)) return;
    const cellControl = this.getTableCellControl(field, rowIndex, colField);
    if (!cellControl) return;

    const value = event?.target?.value;
    cellControl.setValue(value);
    cellControl.markAsDirty();
    cellControl.updateValueAndValidity();
    this.clearTableRuntimeCaches();
    this.cellEdit.emit({
      event,
      field,
      rowIndex,
      colField,
      value,
      data: this.getTableValue(field)
    });
  }

  getColumnType(column: any): string {
    return this.getColumnMeta(column).type;
  }

  isColumnEditable(column: any): boolean {
    return this.getColumnMeta(column).editable;
  }

  isColumnRequired(column: any): boolean {
    return this.getColumnMeta(column).required;
  }

  getColumnWidth(column: any): string {
    return this.getColumnMeta(column).width;
  }

  getTagSeverity(column: any): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | null | undefined {
    return this.getColumnMeta(column).tagSeverity;
  }

  formatTagValue(value: any, column: any): string {
    const meta = this.getColumnMeta(column);
    if (!meta.tagActive) return value;

    let columnCache = this.formattedTagValueCache.get(column);
    if (!columnCache) {
      columnCache = new Map<string, any>();
      this.formattedTagValueCache.set(column, columnCache);
    }

    const cacheKey = `${meta.tagType}:${String(value)}`;
    if (columnCache.has(cacheKey)) {
      return columnCache.get(cacheKey);
    }

    let formattedValue: any;
    switch (meta.tagType) {
      case 'uppercase':
        formattedValue = String(value).toUpperCase();
        break;
      case 'lowercase':
        formattedValue = String(value).toLowerCase();
        break;
      case 'capitalize':
        formattedValue = String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
        break;
      case 'capitalize-words':
        formattedValue = String(value).replace(/\w\S*/g, (txt) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        break;
      default:
        formattedValue = value;
    }

    columnCache.set(cacheKey, formattedValue);
    return formattedValue;
  }

  validateCell(value: any, column: any, showErrors: boolean = false): boolean {
    if (this.isColumnRequired(column) && (!value || value.toString().trim() === '')) {
      return showErrors ? false : true;
    }

    if (column.validation) {
      const validation = column.validation;
      const strValue = value?.toString() || '';

      if (validation.min_length && strValue.length < validation.min_length) {
        return showErrors ? false : true;
      }

      if (validation.max_length && strValue.length > validation.max_length) {
        return showErrors ? false : true;
      }
    }

    return true;
  }

  getCellClass(value: any, column: any, tableField: string, rowIndex: number): string {
    const rowState = this.getTableRowState(tableField, rowIndex);
    const isRowEditing = rowState.isRowEditing;
    const isCellEditing = rowState.editingCells[column.field] || false;
    const tableValidationRequested = this.tablesToValidate[tableField] || false;
    const showErrors = isRowEditing || isCellEditing || tableValidationRequested;
    const cacheKey = [
      tableField,
      rowIndex,
      column?.field,
      String(value),
      isRowEditing ? 1 : 0,
      isCellEditing ? 1 : 0,
      tableValidationRequested ? 1 : 0
    ].join('|');

    if (this.tableCellClassCache[cacheKey] !== undefined) {
      return this.tableCellClassCache[cacheKey];
    }

    const isValid = this.validateCell(value, column, showErrors);
    const cellClass = isValid ? '' : 'p-invalid';
    this.tableCellClassCache[cacheKey] = cellClass;
    return cellClass;
  }

  isAnyRowEditing(tableField: string): boolean {
    const rowEditingKeys = Object.keys(this.editingRows).filter(key =>
      key.startsWith(tableField + '_') && this.editingRows[key]
    );
    const cellEditingKeys = Object.keys(this.editingCells).filter(key =>
      key.startsWith(tableField + '_') && this.editingCells[key]
    );
    return rowEditingKeys.length > 0 || cellEditingKeys.length > 0;
  }

  /** Una tabla readonly conserva sus datos resueltos, pero no acepta edición local. */
  isTableReadonly(field: string): boolean {
    return this.externalEditingLocked || this.tableConfig?.readonly === true || this.getTableFormArray(field)?.disabled === true;
  }

  isRowOrCellEditing(tableField: string, rowIndex: number): boolean {
    return this.getTableRowState(tableField, rowIndex).isRowOrCellEditing;
  }

  getTableRowState(tableField: string, rowIndex: number): {
    isRowEditing: boolean;
    isRowOrCellEditing: boolean;
    editingCells: { [colField: string]: boolean };
  } {
    const rowKey = `${tableField}_${rowIndex}`;
    const cached = this.tableRowEditStateCache[rowKey];
    if (cached) return cached;

    const isRowEditing = this.editingRows[rowKey] || false;
    const cellPrefix = `${rowKey}_`;
    const editingCells: { [colField: string]: boolean } = {};
    let hasEditingCell = false;

    Object.keys(this.editingCells).forEach(cellKey => {
      if (!cellKey.startsWith(cellPrefix) || !this.editingCells[cellKey]) return;

      const colField = cellKey.slice(cellPrefix.length);
      editingCells[colField] = true;
      hasEditingCell = true;
    });

    const state = {
      isRowEditing,
      isRowOrCellEditing: isRowEditing || hasEditingCell,
      editingCells
    };

    this.tableRowEditStateCache[rowKey] = state;
    return state;
  }

  /**
   * Descarta una fila agregada desde la tabla que nunca llegó a confirmarse
   * (no existe en el servidor). Devuelve true si la eliminó.
   */
  private _discardPendingNewRow(tableField: string, rowIndex: number): boolean {
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (!rowGroup || (rowGroup as any)[this.pendingNewRowFlag] !== true) return false;

    const formArray = this.getTableFormArray(tableField);
    if (!formArray) return false;

    formArray.removeAt(rowIndex, { emitEvent: false });
    formArray.updateValueAndValidity();
    this._clearTableEditFlags(tableField);
    this.clearTableRuntimeCaches();
    this.cdr.markForCheck();
    return true;
  }

  /** Limpia todos los flags de edición (fila y celda) de una tabla. */
  private _clearTableEditFlags(tableField: string): void {
    const prefix = `${tableField}_`;
    [this.editingRows, this.editingCells].forEach((flags) => {
      Object.keys(flags).forEach((key) => {
        if (key.startsWith(prefix)) {
          flags[key] = false;
          delete this.originalRowData[key];
        }
      });
    });
  }

  // [[[II ESC:030-06 Solo UNA edición activa a la vez: iniciar la edición de otra
  // celda/fila cierra en silencio la que estuviera abierta (conserva el valor
  // escrito, no valida ni emite guardado). ]]]FI
  private _closeOtherEdits(exceptKey: string | null = null): void {
    Object.keys(this.editingCells).forEach((cellKey) => {
      if (this.editingCells[cellKey] && cellKey !== exceptKey) {
        this.editingCells[cellKey] = false;
        delete this.originalRowData[cellKey];
      }
    });
    Object.keys(this.editingRows).forEach((rowKey) => {
      if (this.editingRows[rowKey] && rowKey !== exceptKey) {
        this.editingRows[rowKey] = false;
        delete this.originalRowData[rowKey];
      }
    });
  }

  startRowEdit(tableField: string, rowIndex: number): void {
    if (this.isTableReadonly(tableField)) return;
    const rowKey = `${tableField}_${rowIndex}`;
    this._closeOtherEdits(rowKey);
    this.editingRows[rowKey] = true;
    this.clearTableRuntimeCaches();
    this.originalRowData[rowKey] = { ...this.getTableRowGroup(tableField, rowIndex)?.getRawValue() };
    // [[[II ESC:030-06 Carga perezosa de opciones de los combos editables de la
    // fila (una vez por columna; sin peticiones por render). ]]]FI
    (this.normalizedColumns || []).forEach((column: any) => {
      if (this._isDropdownColumn(column) && this._isColumnEditable(column)) {
        this._loadCellDropdownOptions(column);
      }
    });
  }

  startCellEdit(tableField: string, rowIndex: number, colField: string): void {
    if (this.isTableReadonly(tableField)) return;
    const column = this._columnByField(colField);
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    // [[[II ESC:030-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-15
    // El inicio programático de edición usa el mismo candado readonly que la
    // plantilla; así no se reabre una celda bloqueada por focus o reintento. ]]]FI
    if (!column || !this.isCellEditableForRow(rowGroup, column)) return;
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    this._closeOtherEdits(cellKey);
    this.editingCells[cellKey] = true;
    this.clearTableRuntimeCaches();
    this.originalRowData[cellKey] = this.getTableCellValue(tableField, rowIndex, colField);
    // [[[II ESC:030-06 Combo de celda: sus opciones se cargan al entrar en
    // edición (perezoso + cacheado por columna). ]]]FI
    if (this._isDropdownColumn(column)) this._loadCellDropdownOptions(column);
  }

  /**
   * Cierra visualmente la fila y limpia sus banderas de edición. Se extrajo de
   * `finishRowEdit` para poder ejecutarlo en DOS momentos distintos según quién
   * persiste: de inmediato en el flujo local, o sólo tras la confirmación del
   * servidor cuando el guardado se delega (`deferRowSave`).
   */
  private _closeRowEditFlags(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;
    const rowFormGroup = this.getTableRowGroup(tableField, rowIndex);

    this.editingRows[rowKey] = false;
    this.clearTableRuntimeCaches();
    delete this.originalRowData[rowKey];

    const cellPrefix = `${tableField}_${rowIndex}_`;
    Object.keys(this.editingCells).forEach(cellKey => {
      if (cellKey.startsWith(cellPrefix)) {
        this.editingCells[cellKey] = false;
        this.clearTableRuntimeCaches();
        delete this.originalRowData[cellKey];
      }
    });

    // Confirmada: deja de ser una fila "pendiente".
    if (rowFormGroup) delete (rowFormGroup as any)[this.pendingNewRowFlag];
  }

  finishRowEdit(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;
    const rowFormGroup = this.getTableRowGroup(tableField, rowIndex);
    if (!rowFormGroup) return;

    Object.keys(rowFormGroup.controls).forEach(key => {
      const control = rowFormGroup.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    if (rowFormGroup.valid) {
      const previousRowData = this.originalRowData[rowKey];

      // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
      // Con `deferRowSave` la persistencia la hace el motor del host y puede
      // ABORTAR por un campo del ENCABEZADO que esta fila ni siquiera conoce
      // (p.ej. Sucursal). Cerrar aquí dejaba la fila con aspecto de guardada sin
      // que saliera petición alguna. Ahora la fila SIGUE EN EDICIÓN hasta que
      // `rowSaveOutcome` confirme; el cierre real lo hace `_applyRowSaveOutcome`.
      // El flujo NO delegado conserva el cierre inmediato de siempre. ]]]FI
      // Una fila de vista previa (`isDerivedDraft`) NUNCA se persiste: el host
      // corta antes de guardar, así que no habrá desenlace y esperarlo la dejaría
      // abierta para siempre. Sólo se difiere el cierre cuando la fila realmente
      // va a viajar al servidor.
      const isDerivedDraft = (rowFormGroup as any)[this.derivedTableDraftFlag] === true;
      if (this.deferRowSave && !isDerivedDraft) {
        this._pendingRowSave = { tableField, rowIndex };
      } else {
        this._closeRowEditFlags(tableField, rowIndex);
      }

      this.cellEdit.emit({
        field: tableField,
        rowIndex,
        rowData: rowFormGroup.getRawValue(),
        previousRowData,
        sourceRow: (rowFormGroup as any)[this.tableRowSourceFlag],
        isDerivedDraft: (rowFormGroup as any)[this.derivedTableDraftFlag] === true,
        data: this.getTableValue(tableField)
      });
    } else if (this.deferRowSave) {
      // [[[II D1: fila inválida al cerrar (última celda o paloma verde) -> se
      // conserva en edición y se enfoca el primer campo obligatorio pendiente
      // editable; NO se hace POST/PATCH. ]]]FI
      this._focusPendingOrLastEditable(tableField, rowIndex);
    }
  }

  finishCellEdit(tableField: string, rowIndex: number, colField: string): void {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    const cellControl = this.getTableCellControl(tableField, rowIndex, colField);
    if (!cellControl) return;

    cellControl.markAsTouched();
    cellControl.updateValueAndValidity();

    if (cellControl.valid) {
      const previousValue = this.originalRowData[cellKey];
      this.editingCells[cellKey] = false;
      this.clearTableRuntimeCaches();
      delete this.originalRowData[cellKey];

      this.cellEdit.emit({
        field: tableField,
        rowIndex,
        colField,
        value: cellControl.value,
        previousValue,
        rowData: this.getTableRowGroup(tableField, rowIndex)?.getRawValue(),
        sourceRow: (this.getTableRowGroup(tableField, rowIndex) as any)?.[this.tableRowSourceFlag],
        isDerivedDraft: (this.getTableRowGroup(tableField, rowIndex) as any)?.[this.derivedTableDraftFlag] === true,
        data: this.getTableValue(tableField)
      });
    }
  }

  cancelRowEdit(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;
    const rowFormGroup = this.getTableRowGroup(tableField, rowIndex);
    // Fila agregada desde la tabla y nunca confirmada: cancelar = descartarla.
    if (this._discardPendingNewRow(tableField, rowIndex)) return;
    if (this.originalRowData[rowKey] && rowFormGroup) {
      rowFormGroup.patchValue({ ...this.originalRowData[rowKey] }, { emitEvent: false });
      rowFormGroup.updateValueAndValidity();
      delete this.originalRowData[rowKey];
    }

    this.editingRows[rowKey] = false;
    this.clearTableRuntimeCaches();

    const cellPrefix = `${tableField}_${rowIndex}_`;
    Object.keys(this.editingCells).forEach(cellKey => {
      if (cellKey.startsWith(cellPrefix)) {
        this.editingCells[cellKey] = false;
        this.clearTableRuntimeCaches();
        delete this.originalRowData[cellKey];
      }
    });
  }

  cancelCellEdit(tableField: string, rowIndex: number, colField: string): void {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    // Fila agregada desde la tabla y nunca confirmada: cancelar = descartarla.
    if (this._discardPendingNewRow(tableField, rowIndex)) return;

    if (this.originalRowData[cellKey] !== undefined) {
      const cellControl = this.getTableCellControl(tableField, rowIndex, colField);
      cellControl?.setValue(this.originalRowData[cellKey], { emitEvent: false });
      cellControl?.updateValueAndValidity();
      delete this.originalRowData[cellKey];
    }

    this.editingCells[cellKey] = false;
    this.clearTableRuntimeCaches();
  }

  isRowEditing(tableField: string, rowIndex: number): boolean {
    return this.getTableRowState(tableField, rowIndex).isRowEditing;
  }

  isCellEditing(tableField: string, rowIndex: number, colField: string): boolean {
    return this.getTableRowState(tableField, rowIndex).editingCells[colField] || false;
  }

  // ============================================================================
  // [[[II ESC:030-06 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md
  // Teclado, recorrido de fila y autocomplete en celda — ALCANCE: SOLO
  // `type='table'` dentro de app-custom-draw-form.
  //
  // Recorrido de fila (D1): al terminar una celda VÁLIDA se avanza al siguiente
  // campo editable según prioridad focus_after_select (1) → tabindex numérico (2)
  // → siguiente editable por orden (3). Sólo cuando se termina la ÚLTIMA celda
  // editable (no queda siguiente) se cierra la fila y, si `deferRowSave`, se emite
  // el guardado de fila (finishRowEdit). Terminar celdas intermedias NO persiste.
  //
  // Autocomplete en celda (D3): las columnas `auto-complete` resuelven sugerencias
  // por escritura (completeMethod → filter[search]) y por Enter (coincidencia
  // exacta). No hay requests por tecla salvo las de búsqueda del propio p-autoComplete.
  // ============================================================================

  /** Sugerencias de la celda de autocomplete activa (sólo una edita a la vez). */
  cellSuggestions = signal<any[]>([]);
  // [[[II ESC:030-06 Cuando la columna exige tecla (`search_key`) y el usuario solo
  // está escribiendo, NO debe desplegarse el panel (ni el "No hay resultados").
  // Este flag apaga el mensaje vacío mientras no haya una búsqueda real. ]]]FI
  cellPanelSuppressed = signal<boolean>(false);
  // Marca temporal de la última selección de autocomplete para no duplicar la
  // búsqueda exacta cuando p-autoComplete ya resolvió Enter seleccionando.
  private _lastCellSelectAt = 0;

  onCellKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, colField: string): void {
    const column = this._columnByField(colField);

    if (event.key === 'Enter') {
      event.preventDefault();
      this._finishCellAndAdvance(tableField, rowIndex, colField, column);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit(tableField, rowIndex, colField);
    }
  }

  /** Columna normalizada por field (usa el cache de normalizedColumns). */
  private _columnByField(colField: string): any {
    return (this.normalizedColumns || []).find((c: any) => c?.field === colField) || null;
  }

  /** Editabilidad ya resuelta en normalización (`_editable`), con fallback. */
  private _isColumnEditable(column: any): boolean {
    if (!column) return false;
    return column._editable !== undefined ? column._editable : this.isColumnEditable(column);
  }

  // [[[II ESC:030-06 Fila MANUAL: ninguna relación declarada por las columnas
  // (relationship_field) está resuelta en su source_row — texto libre
  // free_or_relationship. En fila manual TODO es editable (independiente de
  // root/derived); en fila relacionada aplican las reglas de columna más el
  // bloqueo de los targets derived con edit:false. ]]]FI
  isManualRow(rowData: any): boolean {
    if (!this._relationshipColumnFields.length) return false;
    const source = (rowData instanceof FormGroup
      ? (rowData as any)[this.tableRowSourceFlag]
      : rowData) || {};
    // [[[II ESC:030-18 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-18
    // Una respuesta puede conservar el UUID relacional en el FormGroup antes de
    // que source_row se rehidrate. Ambos son estado canónico de la fila; si uno
    // declara la relación, la fila no es manual.
    const rowValue = rowData instanceof FormGroup ? rowData.getRawValue() : {};
    // ]]]FI
    return !this._relationshipColumnFields.some((field) => {
      const value = source[field] ?? rowValue[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /** Editabilidad de la celda considerando la FILA (manual vs relacionada). */
  isCellEditableForRow(rowData: any, column: any): boolean {
    // [[[II ESC:030-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-15
    // `readonly` es un candado absoluto: tampoco una fila manual puede abrir la
    // celda. La excepción manual conserva únicamente la libertad frente a
    // `edit`/`default.edit` para relaciones no seleccionadas. ]]]FI
    if (column?.readonly === true) return false;
    if (this.isManualRow(rowData)) return true;
    if (!this._isColumnEditable(column)) return false;
    return !this._derivedLockedFields.has(column?.field);
  }

  /** Editabilidad para el recorrido de fila: por fila si se conoce el grupo. */
  private _cellEditable(column: any, rowGroup: FormGroup | null): boolean {
    return rowGroup ? this.isCellEditableForRow(rowGroup, column) : this._isColumnEditable(column);
  }

  /**
   * Siguiente columna EDITABLE del recorrido de fila, por prioridad:
   *   1. `focus_after_select` (si apunta a una columna de la tabla). Si el destino
   *      NO es editable por config, se continúa desde el destino hacia el
   *      siguiente editable por orden (p.ej. code→name no editable→requested);
   *      si tras el destino no queda ninguno, el recorrido termina (null).
   *   2. menor `tabindex` numérico mayor al actual (entre editables)
   *   3. siguiente editable por orden de columnas
   * Devuelve null cuando la actual es la última editable (fin de recorrido).
   */
  private _resolveNextEditableColumn(column: any, rowGroup: FormGroup | null = null): any | null {
    const cols = this.normalizedColumns || [];

    const nextEditableAfter = (fromField: any): any | null => {
      const idx = cols.findIndex((c: any) => c?.field === fromField);
      for (let i = idx + 1; i < cols.length; i++) {
        if (this._cellEditable(cols[i], rowGroup)) return cols[i];
      }
      return null;
    };

    const target = column?.focus_after_select;
    if (typeof target === 'string' && target.trim() !== '') {
      const t = this._columnByField(target.trim());
      if (t) {
        if (this._cellEditable(t, rowGroup)) return t;
        // Destino declarado pero no editable: seguir el orden desde el destino.
        return nextEditableAfter(t.field);
      }
    }

    const currentTab = Number(column?.tabindex);
    if (Number.isFinite(currentTab)) {
      const candidates = cols
        .filter((c: any) => Number.isFinite(Number(c?.tabindex)) && Number(c.tabindex) > currentTab && this._cellEditable(c, rowGroup))
        .sort((a: any, b: any) => Number(a.tabindex) - Number(b.tabindex));
      if (candidates.length) return candidates[0];
    }

    return nextEditableAfter(column?.field);
  }

  /**
   * Cierra la celda actual (si válida) y avanza el recorrido. Con `deferRowSave`
   * el cierre intermedio NO persiste (sólo mueve el foco); la última editable
   * dispara el guardado de fila. Sin `deferRowSave` conserva el flujo previo
   * (persistencia por celda + focus_after_select).
   */
  private _finishCellAndAdvance(tableField: string, rowIndex: number, colField: string, column: any): void {
    if (this.deferRowSave) {
      this._finishCellDeferred(tableField, rowIndex, colField, column);
    } else {
      this.finishCellEdit(tableField, rowIndex, colField);
      this._focusAfterCell(tableField, rowIndex, column);
    }
  }

  /**
   * Recorrido diferido (delegateTableSave): valida la celda; si es inválida la
   * conserva en edición. Si es válida la cierra SIN emitir (no persiste) y avanza
   * al siguiente editable; si no hay siguiente, cierra la fila con finishRowEdit
   * (único punto que dispara el guardado de la fila completa).
   */
  private _finishCellDeferred(tableField: string, rowIndex: number, colField: string, column: any): void {
    const cellControl = this.getTableCellControl(tableField, rowIndex, colField);
    if (!cellControl) return;

    cellControl.markAsTouched();
    cellControl.updateValueAndValidity();
    if (!cellControl.valid) return; // celda inválida: se conserva en edición

    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    this.editingCells[cellKey] = false;
    delete this.originalRowData[cellKey];
    this.clearTableRuntimeCaches();

    const next = this._resolveNextEditableColumn(column, this.getTableRowGroup(tableField, rowIndex));
    if (next) {
      requestAnimationFrame(() => {
        this.startCellEdit(tableField, rowIndex, next.field);
        this.cdr.markForCheck();
      });
    } else {
      // Última celda editable: cierra la fila (valida el conjunto y, si es válida,
      // emite el guardado; si no, la conserva en edición y enfoca el pendiente).
      this.finishRowEdit(tableField, rowIndex);
    }
    this.cdr.markForCheck();
  }

  /**
   * Enfoca la primera celda editable inválida; si el error pertenece al
   * encabezado y la fila es válida, reactiva su última celda editable.
   */
  private _focusPendingOrLastEditable(tableField: string, rowIndex: number): void {
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (!rowGroup) return;
    const editableColumns = (this.normalizedColumns || []).filter((col: any) => this._cellEditable(col, rowGroup));
    const target = editableColumns.find((col: any) => {
      const ctrl = rowGroup.get(col.field);
      return !!ctrl && ctrl.invalid;
    }) ?? editableColumns.at(-1);
    if (!target) return;
    requestAnimationFrame(() => {
      this.startCellEdit(tableField, rowIndex, target.field);
      this.cdr.markForCheck();
    });
  }

  /**
   * Mueve la edicion a la celda destino declarada por `focus_after_select` de la
   * columna (dentro de la MISMA tabla). Si no esta configurada o el destino no es
   * una columna de la tabla, no se fuerza nada: actua la navegacion nativa por
   * tabindex.
   */
  private _focusAfterCell(tableField: string, rowIndex: number, column: any): void {
    const target = column?.focus_after_select;
    if (typeof target !== 'string' || target.trim() === '') return;
    const targetCol = this._columnByField(target.trim());
    if (!targetCol) return; // destino fuera de la tabla -> tabindex nativo
    // rAF: esperar a que la celda actual salga de edicion antes de editar destino.
    requestAnimationFrame(() => {
      this.startCellEdit(tableField, rowIndex, targetCol.field);
      this.cdr.markForCheck();
    });
  }

  // ==========================================================================
  // [[[II ESC:030-06 CONTRATO DE BÚSQUEDA EN CELDA — DIRIGIDO POR CONFIGURACIÓN
  //
  // NINGÚN campo es especial por su NOMBRE (no hay trato para `code`/`name`).
  // Un campo se vuelve buscador por la COMBINACIÓN de estas claves de config,
  // exactamente las mismas que usa el autocomplete del formulario:
  //
  //   data_type.type   Recurso remoto a consultar. SIN él no hay búsqueda
  //                    (igual que en el form: no se hereda el data_type de la
  //                    tabla; cada columna declara el suyo).
  //   dropdown         true = muestra el botón para consultar TODAS las opciones.
  //   search_key       Ausente = Enter; '' = busca automáticamente al escribir.
  //                    'f3'|'enter'|'tab'|'arrowup'|'arrowdown' (o lista separada
  //                    por comas) = espera esa tecla para buscar.
  //   force_selection  true = solo admite valores de la lista. CEDE ante
  //                    `free_or_relationship`, que admite texto libre (se envía
  //                    como atributo normal del campo) además de la relación.
  //   search_mode      'partial' = coincidencias parciales (panel).
  //                    'exact'   = tecla explícita, sin panel ni búsqueda automática.
  //   smart_search     true = filter[search]; false = field.icontains (parcial).
  //   min_search_length Umbral de consulta parcial (mínimo 5); no es validación.
  //   local_editable   Está temporalmente deshabilitado: se conserva visible en
  //                    config para auditarlo, pero NO altera búsqueda ni edición.
  //   default.active   true = se preselecciona ese valor ANTES de cualquier
  //                    búsqueda (respetando result_position/field_name).
  //
  // Coincidencia exacta ÚNICA => se selecciona sin desplegar el panel.
  // La comparación usa el `option_label` declarado (vía formatDynamicValue, que
  // soporta concatenación 'name,last_name') y el propio `field` de la columna.
  // ==========================================================================

  /** Recurso remoto declarado POR LA COLUMNA (sin heredar el de la tabla). */
  private _cellSearchResource(column: any): { app: string; type: string; include: string } | null {
    const dt = column?.data_type;
    if (!dt?.type) return null; // sin data_type no hay búsqueda (igual que el form)
    const appType = this.crudS.getAppType?.(dt.type);
    if (!appType?.app) return null;
    return { app: appType.app, type: appType.type, include: column?.include || dt?.include || '' };
  }

  /** 'exact' | 'partial' (default partial). */
  private _searchModeOf(column: any): 'exact' | 'partial' {
    return column?.search_mode === 'exact' ? 'exact' : 'partial';
  }

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  /** Falta de search_key usa Enter; vacío sólo busca al escribir en parcial. */
  private _searchKeysOf(column: any): Set<string> {
    if (!Object.prototype.hasOwnProperty.call(column || {}, 'search_key')) return new Set(['enter']);
    const raw = column?.search_key;
    if (typeof raw !== 'string') return new Set(['enter']);
    if (raw.trim() === '') return this._searchModeOf(column) === 'exact'
      ? new Set(['enter'])
      : new Set<string>();
    return new Set(raw.split(',').map((key: string) => key.trim().toLowerCase()).filter((key: string) => !!key));
  }

  private _searchesOnType(column: any): boolean {
    return this._searchKeysOf(column).size === 0;
  }

  // El servidor exige >= 5 caracteres en `filter[search]` (CustomSearchFilter).
  private readonly SEARCH_MIN_CHARS = 5;

  /** Umbral de búsqueda parcial, separado del `min_length` de validación. */
  cellMinLength(column: any): number {
    if (this._searchModeOf(column) === 'exact') return 0;
    return Math.max(this.SEARCH_MIN_CHARS, Number(column?.min_search_length) || 0);
  }

  /** Filtro genérico: smart_search usa global; false usa el nombre de columna. */
  private _cellSearchFilter(column: any, query: string): string {
    const q = encodeURIComponent(query);
    const field = typeof column?.field === 'string' ? column.field.trim() : '';
    let fallbackFilter = '';
    if (this._searchModeOf(column) === 'exact') {
      fallbackFilter = field ? `filter[${field}.iexact]=${q}` : '';
    } else if (column?.smart_search === true) {
      fallbackFilter = `filter[search]=${q}`;
    } else {
      fallbackFilter = field ? `filter[${field}.icontains]=${q}` : `filter[search]=${q}`;
    }
    // [[[II ESC:030-17 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-17
    // Misma resolución declarativa que el autocomplete del formulario.
    return this.crudS.buildConfiguredSearchFilter(column?.data_type?.filter, query, fallbackFilter);
    // ]]]FI
  }
  // ]]]FI

  private _isSearchKey(event: KeyboardEvent, column: any): boolean {
    const keys = this._searchKeysOf(column);
    if (!keys.size) return false;
    return keys.has(String(event.key || '').toLowerCase());
  }

  /** `local_editable` no tiene efecto temporalmente; ver Escenario 14. */
  private _shouldSkipSearch(_rowGroup: FormGroup | null, _column: any): boolean {
    return false;
  }

  /** Texto visible de una opción según `option_label` (soporta concatenación). */
  private _optionLabelValue(option: any, column: any): string {
    return this.generalS.formatDynamicValue(option, column);
  }

  // [[[II ESC:030-06 Combos de celda (dropdown/dropdown-choice): las opciones NO
  // se vuelven a pedir. Prioridad: (1) inline `column.options`; (2) las que el
  // FORM ya cargó al abrir el diálogo (`formDropdownOptions`, alimentadas por
  // dataDropdown del custom-draw-form — misma fuente que los inputs del form);
  // (3) solo si el form no las tiene, se consulta el recurso declarado. ]]]FI
  cellDropdownOptions = signal<{ [colField: string]: any[] }>({});
  private _cellOptionsRequested = new Set<string>();

  /** Opciones efectivas de una columna combo (config → form → carga propia). */
  cellOptionsFor(column: any): any[] {
    if (Array.isArray(column?.options) && column.options.length) return column.options;
    const field = column?.field;
    if (!field) return [];
    // [[[II ESC:030-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-15
    // Los children del formulario publican sus opciones bajo `object_<field>`:
    // la tabla recibe el mismo mapa y debe consultar ambas claves para
    // rehidratar etiqueta y objeto, no sólo el id guardado. ]]]FI
    const fromForm = this.formDropdownOptions?.[field] ?? this.formDropdownOptions?.[`object_${field}`];
    if (Array.isArray(fromForm) && fromForm.length) return fromForm;
    return this.cellDropdownOptions()[field] || [];
  }

  // [[[II ESC:030-10 Cascada de children POR FILA. En el formulario, cambiar un
  // padre (p.ej. COMPONENTE) filtra/activa a sus hijos declarados en
  // `children.fields` (SUBCOMPONENTE, SÍNTOMA, TIPO DE GASTO). En la tabla, esa
  // relación es POR FILA: cada fila tiene su propio padre y sus propias opciones
  // filtradas. Se guardan por (fila, campo). Mismos contratos que el form:
  // `filter` (filtra opciones contra el valor del padre) y `activate`
  // (inactiva/limpia el hijo). ]]]FI
  cellChildOptions = signal<{ [rowFieldKey: string]: any[] }>({});
  cellChildDisabled = signal<{ [rowFieldKey: string]: boolean }>({});

  private _rowFieldKey(rowIndex: number, field: string): string {
    return `${rowIndex}::${field}`;
  }

  /** Opciones de un combo de celda considerando la cascada por fila. */
  cellOptionsForRow(column: any, rowIndex: number): any[] {
    const perRow = this.cellChildOptions()[this._rowFieldKey(rowIndex, column?.field)];
    if (Array.isArray(perRow)) return perRow;
    return this.cellOptionsFor(column);
  }

  /** Un hijo inactivado por su padre en esa fila no se edita. */
  isChildCellDisabled(rowIndex: number, column: any): boolean {
    return this.cellChildDisabled()[this._rowFieldKey(rowIndex, column?.field)] === true;
  }

  /**
   * Etiqueta de lectura de un dropdown: el control guarda el VALUE (id); aquí se
   * mapea a su `option_label` con las opciones de la fila. Si no se encuentra
   * (valor ya legible o sin opciones), se muestra tal cual.
   */
  cellDropdownLabel(value: any, column: any, rowIndex: number): string {
    if (value === null || value === undefined || value === '') return '-';
    const rowGroup = this.getTableRowGroup(this.tableConfig?.field, rowIndex);
    const source = (rowGroup as any)?.[this.tableRowSourceFlag] || {};
    const storedLabel = source[`${column?.field}__name`];
    if (storedLabel !== undefined && storedLabel !== null && storedLabel !== '') return String(storedLabel);
    const storedOption = source[`object_${column?.field}`];
    if (storedOption && typeof storedOption === 'object') {
      return this._optionLabelValue(storedOption, column) || String(value);
    }
    const options = this.cellOptionsForRow(column, rowIndex);
    const valueKey = column?.option_value || ((column?._type || column?.type) === 'dropdown-choice' ? 'value' : 'id');
    const match = options.find((option: any) => option?.[valueKey] == value);
    if (match) return this._optionLabelValue(match, column) || String(value);
    return String(value);
  }

  private _loadCellDropdownOptions(column: any): void {
    const field = column?.field;
    if (!field) return;
    if (Array.isArray(column?.options) && column.options.length) return; // inline por config
    const fromForm = this.formDropdownOptions?.[field] ?? this.formDropdownOptions?.[`object_${field}`];
    if (Array.isArray(fromForm) && fromForm.length) return; // ya cargadas por el form
    if (this._cellOptionsRequested.has(field)) return;
    if (!this._cellSearchResource(column)) return;
    this._cellOptionsRequested.add(field);
    this._fetchCellOptions(column, '').subscribe((rows: any[]) => {
      if (!rows.length) {
        this._cellOptionsRequested.delete(field); // permitir reintento
        return;
      }
      this.cellDropdownOptions.set({ ...this.cellDropdownOptions(), [field]: rows });
      this.cdr.markForCheck();
    });
  }

  /** Columnas que editan con combo (necesitan opciones cargadas). */
  private _isDropdownColumn(column: any): boolean {
    const type = column?._type || column?.type;
    return type === 'dropdown' || type === 'dropdown-choice';
  }

  /**
   * onChange del combo de celda: localiza la opción por option_value y la aplica
   * con la MISMA semántica que el autocomplete (UUID canónico separado del texto
   * visible + derived declarados), luego avanza el recorrido de fila.
   */
  onCellDropdownChange(event: any, tableField: string, rowIndex: number, column: any): void {
    const options = this.cellOptionsFor(column);
    const optionValueKey = column?.option_value || ((column?._type || column?.type) === 'dropdown-choice' ? 'value' : 'id');
    const value = event?.value;
    const selected = options.find((option: any) => option?.[optionValueKey] == value) ?? null;
    if (selected && typeof selected === 'object') {
      // Cascada por fila ANTES de avanzar el foco (filtra/activa a los hijos de
      // esta fila con el padre recién elegido).
      this._cascadeRowChildren(tableField, rowIndex, column, selected);
      this._applyCellSelection(tableField, rowIndex, column, selected);
    } else {
      this.advanceAfterCell(tableField, rowIndex, column.field);
    }
  }

  // Token de la última búsqueda por columna: descarta respuestas obsoletas
  // (evita el "a veces encuentra, a veces no" por respuestas fuera de orden).
  private _cellSearchToken: { [field: string]: number } = {};

  /** Consulta el recurso de la columna y devuelve filas ya aplanadas/enriquecidas. */
  private _fetchCellOptions(column: any, query: string): Observable<any[]> {
    const resource = this._cellSearchResource(column);
    if (!resource) return of([]);
    const field = column?.field;
    const token = (this._cellSearchToken[field] = (this._cellSearchToken[field] || 0) + 1);
    const filterParam = query ? this._cellSearchFilter(column, query) : '';
    return this.crudS.getObject({ app: resource.app, type: resource.type, filter: filterParam, include: resource.include }).pipe(
      map((resp: any) => {
        // Respuesta obsoleta (llegó una búsqueda más nueva): se descarta.
        if (this._cellSearchToken[field] !== token) return null;
        const rows = this.generalS.DJAtoObject({ respDJA: resp, fields: { [column.field]: column } }) || [];
        // Mismo enriquecimiento `<rel>_data_<attr>` que el form dinámico.
        return this.generalS.enrichSuggestionRelationData(rows, resp, column);
      }),
      // Se ignora la emisión nula de una respuesta obsoleta.
      rxFilter((rows: any[] | null): rows is any[] => rows !== null),
      catchError(() => of([]))
    );
  }

  /**
   * completeMethod del p-autoComplete de celda. Exacto no busca al escribir ni
   * muestra panel; parcial sólo busca al escribir con search_key vacío.
   */
  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  onCellComplete(event: any, tableField: string, rowIndex: number, column: any): void {
    const query = (event?.query ?? '').toString().trim();
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (this._searchModeOf(column) === 'exact') {
      this.cellPanelSuppressed.set(true);
      this.cellSuggestions.set([]);
      return;
    }
    // `dropdown` (botón "ver todas") llega con query vacío: se permite consultar
    // todo aunque la config exija tecla para la búsqueda por escritura.
    const isDropdownRequest = query === '';
    if (!isDropdownRequest && (!this._searchesOnType(column) || this._shouldSkipSearch(rowGroup, column))) {
      // No hay búsqueda: se apaga el panel por completo (sin "No hay resultados").
      this.cellPanelSuppressed.set(true);
      this.cellSuggestions.set([]);
      return;
    }
    // Respeta min_search_length sólo en búsqueda parcial por escritura.
    const minLength = this.cellMinLength(column);
    if (!isDropdownRequest && minLength > 0 && query.length < minLength) {
      this.cellPanelSuppressed.set(true);
      this.cellSuggestions.set([]);
      return;
    }
    this.cellPanelSuppressed.set(false);
    this._runCellSearch(tableField, rowIndex, column, query);
  }

  /**
   * Ejecuta la búsqueda y decide entre aplicar una coincidencia exacta única o
   * desplegar el panel, según `search_mode`.
   */
  private _runCellSearch(
    tableField: string, rowIndex: number, column: any, query: string,
    options: { autoApplyUnique?: boolean; advanceWhenNoMatch?: boolean } = {}
  ): void {
    const { autoApplyUnique = true, advanceWhenNoMatch = false } = options;
    this._fetchCellOptions(column, query).subscribe((rows: any[]) => {
      const exactMatches = query
        ? rows.filter((row: any) => this._exactCellMatch(row, column, query))
        : [];

      // Coincidencia exacta ÚNICA: se selecciona sin mostrar el panel.
      if (autoApplyUnique && exactMatches.length === 1) {
        this.cellSuggestions.set([]);
        this._applyCellSelection(tableField, rowIndex, column, exactMatches[0]);
        return;
      }

      if (this._searchModeOf(column) === 'exact') {
        this.cellPanelSuppressed.set(true);
        this.cellSuggestions.set([]);
        if (advanceWhenNoMatch) this._finishFreeTextCell(tableField, rowIndex, column);
        return;
      }

      this.cellPanelSuppressed.set(false);
      const suggestions = rows;
      this.cellSuggestions.set(suggestions);
      this.cdr.markForCheck();

      if (advanceWhenNoMatch && !suggestions.length) {
        this._finishFreeTextCell(tableField, rowIndex, column);
      }
    });
  }

  /** onSelect del p-autoComplete de celda: aplica la opción seleccionada. */
  onCellAutoCompleteSelect(event: any, tableField: string, rowIndex: number, column: any): void {
    const selected = event?.value ?? event;
    this._lastCellSelectAt = Date.now();
    this._applyCellSelection(tableField, rowIndex, column, selected);
  }

  /**
   * Teclado en celda de autocomplete. La tecla declarada en `search_key` dispara
   * la búsqueda; Enter además cierra/avanza cuando no hay búsqueda pendiente.
   */
  onCellAutoCompleteKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, column: any): void {
    if (event.key === 'Escape') {
      this.cancelCellEdit(tableField, rowIndex, column.field);
      return;
    }

    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    const isConfiguredSearchKey = this._isSearchKey(event, column)
      && !!this._cellSearchResource(column)
      && !this._shouldSkipSearch(rowGroup, column);

    if (isConfiguredSearchKey) {
      const control = this.getTableCellControl(tableField, rowIndex, column.field);
      const raw = (control?.value ?? '').toString().trim();
      if (raw) {
        event.preventDefault();
        const exact = this._searchModeOf(column) === 'exact';
        if (!exact && raw.length < this.cellMinLength(column)) {
          this.cellPanelSuppressed.set(true);
          this.cellSuggestions.set([]);
          return;
        }
        this.cellPanelSuppressed.set(exact);
        // Diferido: si p-autoComplete resolvió Enter seleccionando, no se duplica.
        setTimeout(() => {
          if (Date.now() - this._lastCellSelectAt < 150) return;
          this._runCellSearch(tableField, rowIndex, column, raw, {
            autoApplyUnique: true,
            advanceWhenNoMatch: true,
          });
        }, 0);
        return;
      }
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();
    setTimeout(() => {
      if (Date.now() - this._lastCellSelectAt < 150) return; // onSelect ya resolvió
      this._finishFreeTextCell(tableField, rowIndex, column);
    }, 0);
  }
  // ]]]FI

  /**
   * Cierre de una celda buscadora sin selección resuelta.
   *
   * [[[II ESC:030-06 El buscador tiene DOS funciones y ambas son válidas:
   *   1. Inicializar la RELACIÓN: al seleccionar una opción se guarda el UUID en
   *      `relationship_field` y se envía como relationship.
   *   2. Enviar TEXTO LIBRE: si no se selecciona nada, el texto escrito se
   *      conserva y se envía como atributo normal del propio campo
   *      (p.ej. name="texto libre escrito").
   * El texto libre NUNCA se descarta. `free_or_relationship` es quien declara que
   * el campo admite ambas formas. ]]]FI
   */
  private _finishFreeTextCell(tableField: string, rowIndex: number, column: any): void {
    this._finishCellAndAdvance(tableField, rowIndex, column.field, column);
  }

  /**
   * Coincidencia exacta contra el texto declarado por `option_label` (soporta
   * concatenación) y contra la clave fuente de la columna. Sin nombres de campo
   * hardcodeados.
   */
  private _exactCellMatch(row: any, column: any, raw: string): boolean {
    if (!row) return false;
    const target = raw.trim().toLowerCase();
    if (!target) return false;
    const field = column?.field;
    const sourceKey = column?.field_name;
    const candidates = [
      this._optionLabelValue(row, column),
      sourceKey ? row[sourceKey] : undefined,
      field ? row[field] : undefined,
      field ? row[`${field}__name`] : undefined,
    ];
    return candidates.some((value: any) => value != null && String(value).trim().toLowerCase() === target);
  }

  /**
   * Aplica una opción seleccionada a la fila: conserva el objeto seleccionado en
   * el flag de fila, guarda el UUID canónico en `relationship_field`, deja el
   * texto visible (option_label) en la celda y proyecta los children/derived
   * declarados por la columna. Después cierra la celda y avanza el recorrido.
   */
  private _applyCellSelection(tableField: string, rowIndex: number, column: any, selected: any): void {
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (rowGroup && selected && typeof selected === 'object') {
      const cols = this.normalizedColumns || [];
      // source_row conserva SOLO los targets declarados (derived/proyección) más
      // el UUID canónico y la etiqueta. NO se hace spread del objeto seleccionado:
      // sus claves genéricas (id, name, ...) pisarían las del detalle — p.ej. el
      // `id` de la opción sustituiría el id del detalle y el PATCH iría al
      // registro equivocado.
      const source = { ...((rowGroup as any)[this.tableRowSourceFlag] || {}) };
      const uuid = selected.id ?? selected.value;
      // Sin relationship_field declarado, el propio campo es la relación (combos
      // de relación directa): el UUID canónico vive en source[field].
      const relTarget = column?.relationship_field || column?.field;
      if (relTarget && uuid != null && uuid !== '') source[relTarget] = uuid;

      // 1. children/derived declarados por la columna: relleno cross-column por
      //    config (p.ej. al elegir producto: name, price, currency, comprobantes).
      this._applyDerivedChildren(rowGroup, column, selected, source);

      // 2. proyección/merge genéricos (source→target por field/field_name/derived):
      //    conserva UUID canónico + etiqueta y rellena SÓLO huecos restantes.
      let filled = this.generalS.projectConfiguredTableRow(rowGroup.getRawValue(), cols, selected);
      filled = this.generalS.mergeConfiguredTableRow(filled, cols, selected, column);
      cols.forEach((c: any) => {
        const ctrl = rowGroup.get(c.field);
        if (!ctrl) return;
        const dispName = filled[`${c.field}__name`];
        if (dispName !== undefined && dispName !== null && dispName !== '') source[`${c.field}__name`] = dispName;
        const isEmpty = ctrl.value === '' || ctrl.value == null;
        if (!isEmpty) return;
        const val = (dispName !== undefined && dispName !== null && dispName !== '') ? dispName : filled[c.field];
        if (val !== undefined && val !== null && val !== '' && typeof val !== 'object') {
          ctrl.setValue(val, { emitEvent: false });
        }
      });

      // 3. celda seleccionada.
      const display = this.generalS.formatDynamicValue(selected, column);
      if (this._isDropdownColumn(column)) {
        // Dropdown: el control guarda el VALUE (id) que enlaza p-select; la
        // etiqueta se resuelve en lectura (cellDropdownLabel). Se conserva el id
        // y se guarda el objeto seleccionado para el espejo `object_<campo>` que
        // usa el guardado transitorio (payload de form_fields_data_*).
        const valueKey = column?.option_value || ((column?._type || column?.type) === 'dropdown-choice' ? 'value' : 'id');
        const value = selected?.[valueKey] ?? uuid;
        if (value !== undefined && value !== null && value !== '') {
          rowGroup.get(column.field)?.setValue(value, { emitEvent: false });
          source[column.field] = value;
        }
        if (display) source[`${column.field}__name`] = display;
        source[`object_${column.field}`] = selected;
      } else if (display) {
        // Autocomplete/texto: el control guarda el texto visible (option_label).
        rowGroup.get(column.field)?.setValue(display, { emitEvent: false });
        source[`${column.field}__name`] = display;
        if (column?.relationship_field) source[column.field] = display;
      }

      (rowGroup as any)[this.tableRowSourceFlag] = source;
      rowGroup.markAsDirty();
    }

    this.cellSuggestions.set([]);
    this.clearTableRuntimeCaches();
    this._finishCellAndAdvance(tableField, rowIndex, column.field, column);
    this.cdr.markForCheck();
  }

  /**
   * Rellena las columnas derivadas declaradas por `column.children.fields.derived`
   * (target-field → source key `field_name`) a partir del objeto seleccionado ya
   * enriquecido. Guarda el valor canónico + etiqueta en `source` (para el guardado
   * y la re-hidratación) y escribe el texto visible en la celda: la columna
   * seleccionada siempre; las demás sólo si están vacías (no pisa ediciones locales).
   */
  /**
   * Cascada de children por fila: al elegir un padre en una celda, filtra las
   * opciones y aplica el activate de cada hijo declarado en `children.fields`
   * (static/dynamic) para ESA fila. La derivación (`derived`) la resuelve
   * `_applyDerivedChildren`. No-op si la columna no declara children activos.
   */
  private _cascadeRowChildren(tableField: string, rowIndex: number, parentColumn: any, parentOption: any): void {
    const children = parentColumn?.children;
    if (children?.active !== true) return;
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (!rowGroup) return;

    const groups = children.fields || {};
    const nextOptions = { ...this.cellChildOptions() };
    const nextDisabled = { ...this.cellChildDisabled() };

    ['static', 'dynamic'].forEach((mode) => {
      this.generalS.configuredChildNodes(groups[mode]).forEach((child: any) => {
        const childField = child.field;
        const childCol = this._columnByField(childField);
        if (!childCol) return; // solo aplica a columnas de la tabla
        const key = this._rowFieldKey(rowIndex, childField);
        const ctrl = rowGroup.get(childField);

        // activate: si la condición se cumple, el hijo se inactiva (y se limpia).
        const inactive = this._childActivateInactive(child, parentOption);
        nextDisabled[key] = inactive;
        if (inactive && ctrl) {
          ctrl.setValue(this.getTableColumnDefaultValueOf(childCol), { emitEvent: false });
        }

        // filter: opciones filtradas contra el valor del padre en esta fila.
        if (child.filter?.active === true) {
          const base = (Array.isArray(childCol.options) && childCol.options.length)
            ? childCol.options
            : (Array.isArray(child.options) ? child.options : []);
          const filtered = base.filter((option: any) => this._childOptionPasses(option, child, parentOption));
          nextOptions[key] = filtered;

          // Si el valor actual ya no es válido con el nuevo padre, se limpia.
          if (ctrl && ctrl.value != null && ctrl.value !== '') {
            const valueKey = childCol.option_value || 'id';
            const stillValid = filtered.some((option: any) => option?.[valueKey] == ctrl.value);
            if (!stillValid) ctrl.setValue(this.getTableColumnDefaultValueOf(childCol), { emitEvent: false });
          }
        }
      });
    });

    this.cellChildOptions.set(nextOptions);
    this.cellChildDisabled.set(nextDisabled);
    this.clearTableRuntimeCaches();
    this.cdr.markForCheck();
  }

  /** Default de una columna (mismo contrato que createTableRowFormGroup). */
  private getTableColumnDefaultValueOf(column: any): any {
    return this.getTableColumnDefaultValue(column);
  }

  /** ¿El activate del hijo se cumple? (=> inactivar). */
  private _childActivateInactive(child: any, parentOption: any): boolean {
    const activate = child?.activate;
    if (activate?.active !== true) return false;
    const met = this._evalParentConditions(activate.conditions, activate.logic, parentOption);
    const action = activate.action || 'inactive';
    return action === 'inactive' ? met : !met;
  }

  /** ¿La opción del hijo pasa el filtro contra el valor del padre? */
  private _childOptionPasses(option: any, child: any, parentOption: any): boolean {
    const conditions = child?.filter?.conditions || [];
    if (!conditions.length) return true;
    const groupKey = child?.filter_group || 'group';
    const logic = String(child?.filter?.logic || 'AND').toUpperCase();
    const results = conditions.map((cond: any) => {
      const parentValue = parentOption?.[cond?.value_key];
      const optionValue = option?.[groupKey];
      return this._compareCondition(optionValue, cond?.operator, parentValue);
    });
    return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  /** Evalúa condiciones que comparan el valor del padre contra `values`. */
  private _evalParentConditions(conditions: any[], logic: any, parentOption: any): boolean {
    if (!conditions?.length) return false;
    const results = conditions.map((cond: any) => {
      const parentValue = parentOption?.[cond?.value_key];
      const values = cond?.values ?? (cond?.value !== undefined ? [cond.value] : []);
      return this._compareCondition(parentValue, cond?.operator, values);
    });
    return String(logic || 'AND').toUpperCase() === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  /** Operadores mínimos compartidos por filter y activate. */
  private _compareCondition(left: any, operator: string, right: any): boolean {
    const values = Array.isArray(right) ? right : [right];
    const has = values.some((value: any) => String(value) === String(left));
    switch (operator) {
      case 'not_equals':
      case 'not_in':
        return !has;
      case 'equals':
      case 'in':
      default:
        return has;
    }
  }

  private _applyDerivedChildren(rowGroup: FormGroup, column: any, selected: any, source: any): void {
    // Nodos derived por nombre o numerados ({0:...}): normalización única.
    const derivedNodes = this.generalS.configuredChildNodes(column?.children?.fields?.derived);

    derivedNodes.forEach((cfg: any) => {
      const targetField: string = cfg.field;
      const sourceKey = cfg.field_name || targetField;
      const ctrl = rowGroup.get(targetField);
      const targetCol = this._columnByField(targetField);
      if (!ctrl || !targetCol) return;

      const dispName = selected[`${sourceKey}__name`];
      // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
      // La clave fuente puede llegar plana (`base_product_data_code`), anidada
      // en `base_product_data: {code}` o dentro del objeto de la relación. Leer
      // sólo la plana dejaba la celda vacía cuando la respuesta no traía
      // `included`. Resolución compartida con el formulario. ]]]FI
      const raw = this.generalS.resolveRelationDataValue(selected, sourceKey);
      const hasValue = (dispName !== undefined && dispName !== null && dispName !== '')
        || (raw !== undefined && raw !== null && raw !== '');

      const effectiveDefault = {
        ...(targetCol?.default || {}),
        ...(cfg?.default || {}),
      };
      // El default del child sobrescribe por propiedad al root. `active`
      // gobierna el valor; `edit` gobierna el permiso por separado.
      const fallback = effectiveDefault.active === true ? effectiveDefault.value : undefined;
      const display = hasValue
        ? ((dispName !== undefined && dispName !== null && dispName !== '')
          ? dispName
          : (raw && typeof raw === 'object' ? this.generalS.formatDynamicValue(raw, targetCol) : raw))
        : fallback;

      if (raw !== undefined) source[targetField] = (raw && typeof raw === 'object') ? (raw.id ?? display) : raw;
      else if (!hasValue && display !== undefined) source[targetField] = display;
      if (dispName !== undefined && dispName !== null && dispName !== '') source[`${targetField}__name`] = dispName;

      // [[[II ESC:030-06 RECÁLCULO: esta función solo corre cuando se (re)elige el
      // PADRE, así que los targets `from: parent` se SOBRESCRIBEN — no se
      // "rellenan huecos". Antes se conservaba lo escrito antes de resolver el
      // padre (texto libre a medias) y el derivado nunca se recalculaba al
      // cambiar de producto. La columna elegida ya se escribe aparte. ]]]FI
      // [[[II ESC:030-11 Una columna dropdown-like guarda en su control el VALUE
      // canónico (el id que enlaza p-select) y resuelve la etiqueta EN LECTURA con
      // el `option_label` de ESA columna (cellDropdownLabel) — exactamente la misma
      // regla que aplica `_applyCellSelection` al elegir en la celda.
      //
      // Antes se escribía aquí el texto `<rel>__name`, que DJAtoObject calcula con
      // la convención genérica de la relación y NO con el `option_label` del
      // destino. Con Moneda (columna `option_label: short_name`, relación derivada
      // `purchase_currency`) la celda mostraba el `name` recién derivada y el
      // `short_name` tras recargar la fila: la misma columna alternaba etiqueta.
      // Cada vista respeta su propio `option_label`; el valor canónico ya quedó en
      // `source[targetField]` más arriba. Las columnas no dropdown conservan el
      // comportamiento previo (texto visible en el control). ]]]FI
      if (targetField !== column.field && display !== undefined && display !== null) {
        const canonical = source[targetField];
        const isCanonicalUsable = canonical !== undefined && canonical !== null && canonical !== '';
        const value = (this._isDropdownColumn(targetCol) && isCanonicalUsable) ? canonical : display;
        ctrl.setValue(value, { emitEvent: false });
      }
    });
  }
  // ]]]FI

  private normalizeTableConfig(): void {
    if (!this.tableConfig) {
      this.normalizedColumns = [];
      this.controlColumnFields = [];
      return;
    }

    // [[[II ESC:030-06 columns acepta lista o dict numerado {0:...} (misma forma
    // que panel.fields); el normalizador de GeneralService es la fuente única. ]]]FI
    const columns = this.generalS.configuredTableColumns(this.tableConfig.columns);
    this.normalizedColumns = columns.map((column: any) => this.normalizeTableColumn(column));

    // Relaciones declaradas y targets bloqueados por derived default.edit:false.
    this._relationshipColumnFields = this.generalS.configuredRelationshipFields(this.normalizedColumns);
    this._derivedLockedFields = new Set<string>();
    this.normalizedColumns.forEach((column: any) => {
      this.generalS.configuredChildNodes(column?.children?.fields?.derived).forEach((node: any) => {
        const targetColumn = this.normalizedColumns.find((candidate: any) => candidate?.field === node.field);
        const effectiveEdit = node?.default?.edit ?? targetColumn?.default?.edit ?? true;
        if (effectiveEdit === false && node.field) this._derivedLockedFields.add(node.field);
      });
    });
    this.controlColumnFields = this.normalizedColumns
      .map((column: any) => column?.field)
      .filter((field: any) => !!field)
      .map((field: string) => `value.${field}`);

    this.tableConfig._normalizedColumns = this.normalizedColumns;
    this.tableConfig._columnFields = this.normalizedColumns
      .map((column: any) => column?.field)
      .filter((field: any) => !!field);
    this.tableConfig._controlColumnFields = this.controlColumnFields;

    this.normalizedColumns.forEach((column: any) => {
      if (!column || typeof column !== 'object') return;
      column._tableField = this.tableConfig.field;
      column._columnFields = this.tableConfig._columnFields;
    });
  }

  /**
   * Editabilidad de la celda basada en `readonly`, `edit` de la columna y el
   * campo heredado `default.edit`.
   *
   * FALLO CONOCIDO #1: NO se usa `column.editable`. En `combo`/`auto_complete`
   * ese flag hereda `editable: false`, cuyo significado es "permitir crear valores
   * nuevos", NO "celda bloqueada". Interpretarlo como bloqueo dejaba `code`/`name`
   * sin poder editarse. Aquí se ignora por completo para la decisión de edición.
   *
   * `readonly: true` se conserva como candado explícito declarado por columna.
   * `edit: false` top-level también es un candado explícito; si no aparece, se
   * honra `default.edit` (true por defecto).
   *
   * IMPORTANTE — este motor NO debe adaptarse a los VALORES que la config tenga
   * hoy: cualquier combinación es válida y el usuario puede cambiarla. Que una
   * columna llegue con `default.edit: false` (p.ej. `code`) significa "celda
   * bloqueada" y es el comportamiento correcto, no un fallo a corregir; si mañana
   * llega `true`, la misma celda debe volverse editable sin tocar código. Lo que
   * se deriva es la ESTRUCTURA del contrato, nunca el valor puntual.
   *
   * [[[II ESC:030-14 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-14
   * `local_editable` está TEMPORALMENTE DESHABILITADO por decisión explícita del
   * usuario. Su valor se conserva para diagnóstico, pero no puede revocar
   * `edit:false` ni frenar una búsqueda. La excepción preexistente de fila manual
   * sigue fuera de este método (`isManualRow`/`isCellEditableForRow`). ]]]FI
   */
  private _resolveColumnEditable(column: any): boolean {
    if (column?.readonly === true) return false;
    if (column?.edit === false) return false;
    return column?.default?.edit !== false;
  }

  private normalizeTableColumn(column: any): any {
    if (!column || typeof column !== 'object') return column;

    const meta = {
      type: column.type || 'input-text',
      editable: this._resolveColumnEditable(column),
      required: column.required !== undefined ? column.required : false,
      width: column.width || 'auto',
      tagSeverity: column.tag?.severity || 'info',
      tagType: column.tag?.type || 'none',
      tagActive: !!column.tag?.active,
      // [[[II ESC:030-06 Etiquetas de booleano con la MISMA convención que
      // fieldsBool en DJAtoObject (label_true/label_false ?? 'true'/'false');
      // la config declara los textos reales. ]]]FI
      labelTrue: column.label_true ?? 'true',
      labelFalse: column.label_false ?? 'false'
    };

    column._type = meta.type;
    column._editable = meta.editable;
    column._required = meta.required;
    column._width = meta.width;
    column._tagSeverity = meta.tagSeverity;
    column._tagType = meta.tagType;
    column._tagActive = meta.tagActive;
    column._labelTrue = meta.labelTrue;
    column._labelFalse = meta.labelFalse;

    this.tableColumnMetaCache.set(column, meta);

    return column;
  }

  private getColumnMeta(column: any): any {
    if (!column || typeof column !== 'object') {
      return {
        type: 'input-text',
        editable: true,
        required: false,
        width: 'auto',
        tagSeverity: 'info',
        tagType: 'none',
        tagActive: false
      };
    }

    const cached = this.tableColumnMetaCache.get(column);
    if (cached) return cached;

    this.normalizeTableColumn(column);
    return this.tableColumnMetaCache.get(column);
  }

  private clearTableRuntimeCaches(): void {
    this.tableRowEditStateCache = {};
    this.tableCellClassCache = {};
    this._publishEditingState();
  }

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  // Publica una sola transición por tabla: el padre bloquea el resto del
  // formulario mientras exista una fila o celda activa y lo restaura al cerrar.
  private _publishEditingState(): void {
    const field = this.tableConfig?.field;
    if (!field) return;
    const active = this.isAnyRowEditing(field);
    if (this._reportedEditingState === active) return;
    this._reportedEditingState = active;
    this.editingStateChange.emit({ field, active });
  }
  // ]]]FI

  private getTableFormArray(field: string): FormArray | null {
    const control = this.formGroup?.get(field);
    return control instanceof FormArray ? control : null;
  }

  private getTableValue(field: string): any[] {
    return this.getTableFormArray(field)?.getRawValue() || [];
  }

  private getTableRowGroup(field: string, rowIndex: number): FormGroup | null {
    const rowControl = this.getTableFormArray(field)?.at(rowIndex);
    return rowControl instanceof FormGroup ? rowControl : null;
  }

  private getTableCellControl(field: string, rowIndex: number, colField: string): AbstractControl | null {
    return this.getTableRowGroup(field, rowIndex)?.get(colField) || null;
  }

  private getTableCellValue(field: string, rowIndex: number, colField: string): any {
    return this.getTableCellControl(field, rowIndex, colField)?.value;
  }

  private getTableColumnDefaultValue(column: any): any {
    // [[[II ESC:030-10 `default.value` de la columna manda cuando `default.active`
    // (mismo contrato que el formulario). Sin esto una fila nueva ignoraba, p.ej.,
    // el 1 por defecto de "Solicitar". `false`/`0` son valores válidos. ]]]FI
    const columnDefault = column?.default;
    if (columnDefault?.active === true && columnDefault.value !== undefined && columnDefault.value !== null) {
      return columnDefault.value;
    }
    if (column?.type === 'input-number' || column?.type === 'date') {
      return null;
    }
    if (column?.type === 'multi-select' || column?.type === 'multi-choice' || column?.type === 'listbox') {
      return [];
    }
    // [[[II ESC:030-06 toggle-button es el tipo bool de columnas (is_bool); sin
    // esta rama caía a '' y la celda booleana quedaba vacía. ]]]FI
    if (column?.type === 'checkbox' || column?.type === 'toggle-button') {
      return false;
    }
    return '';
  }

  private createTableRowFormGroup(tableConfig: any, rowData: any = {}): FormGroup {
    const rowGroup: any = {};

    this.generalS.configuredTableColumns(tableConfig?.columns).forEach((col: any) => {
      const validators: any[] = [];
      // [[[II ESC:030-06 Misma resolución de editabilidad que la celda (FALLO #1:
      // `col.editable` NO es "celda bloqueada"). ]]]FI
      const editable = this._resolveColumnEditable(col);

      if (col.required && editable) {
        validators.push(Validators.required);
      }
      // Longitudes: validation.* o los campos naturales de input_text; en
      // auto-complete usa min_search_length para buscar; min_length no valida
      // ni modifica este control transitorio.
      const isTextColumn = col.type === 'input-text' || col.type === 'textarea';
      const maxLength = col.validation?.max_length ?? (isTextColumn ? col.max_length : undefined);
      const minLength = col.validation?.min_length ?? (isTextColumn ? col.min_length : undefined);
      if (maxLength) {
        validators.push(Validators.maxLength(maxLength));
      }
      if (minLength) {
        validators.push(Validators.minLength(minLength));
      }

      rowGroup[col.field] = new FormControl(
        rowData?.[col.field] !== undefined ? rowData[col.field] : this.getTableColumnDefaultValue(col),
        validators
      );
    });

    // [[[II ESC:030-20 La relación declarada por las columnas es ESTADO DE LA
    // FILA, no un dato incidental de `source_row`: se crea como control real
    // para que sobreviva a todas las rutas de alta/edición/rehidratación. ]]]FI
    this.generalS.configuredRelationshipFields(tableConfig?.columns).forEach((field: string) => {
      if (rowGroup[field]) return;
      rowGroup[field] = new FormControl(rowData?.[field] ?? null);
    });

    const group = this.fb.group(rowGroup);
    (group as any)[this.tableRowSourceFlag] = rowData;
    return group;
  }

  private normalizeTableEvent(event: any): any {
    if (!event?.data || !(event.data instanceof FormGroup)) {
      return event;
    }

    return {
      ...event,
      data: event.data.getRawValue()
    };
  }
}
// ]]]FI
