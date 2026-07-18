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
import { Subscription } from 'rxjs';
import { CustomButtonCrudComponent } from '../../custom-button-crud/custom-button-crud.component';
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
    CustomButtonCrudComponent
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
  private tableValueSubscription?: Subscription;

  @Input() tableConfig: any;
  @Input() formGroup: FormGroup | null = null;
  @Input() editingRows: { [key: string]: boolean } = {};
  @Input() editingCells: { [key: string]: boolean } = {};
  @Input() tablesToValidate: { [key: string]: boolean } = {};
  @Input() originalRowData: { [key: string]: any } = {};
  @Input() tableOptions: { rows?: number } | null = null;
  @Input() validationVersion = 0;
  // [[[II ESC:030-06 Cuando el host delega el guardado por fila (delegateTableSave),
  // el recorrido de celdas NO persiste por celda: terminar una celda intermedia
  // sólo avanza el foco; sólo la ÚLTIMA celda editable (o la paloma verde) cierra
  // la fila y dispara el guardado. Cuando es false, se conserva el flujo previo. ]]]FI
  @Input() deferRowSave = false;

  @Output() rowSelect = new EventEmitter<any>();
  @Output() rowUnselect = new EventEmitter<any>();
  @Output() addRow = new EventEmitter<any>();
  @Output() editRow = new EventEmitter<any>();
  @Output() deleteRow = new EventEmitter<any>();
  @Output() cellEdit = new EventEmitter<any>();

  normalizedColumns: any[] = [];
  controlColumnFields: string[] = [];

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
  }

  ngOnDestroy(): void {
    this.tableValueSubscription?.unsubscribe();
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
    if (this.isTableReadonly(field)) return;
    const formArray = this.getTableFormArray(field);
    if (!formArray) return;

    const newRowFormGroup = this.createTableRowFormGroup(tableConfig);
    formArray.push(newRowFormGroup);
    formArray.markAsDirty();
    formArray.root?.markAsDirty();
    formArray.updateValueAndValidity();
    this.clearTableRuntimeCaches();

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
    return this.tableConfig?.readonly === true || this.getTableFormArray(field)?.disabled === true;
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

  startRowEdit(tableField: string, rowIndex: number): void {
    if (this.isTableReadonly(tableField)) return;
    const rowKey = `${tableField}_${rowIndex}`;
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
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    this.editingCells[cellKey] = true;
    this.clearTableRuntimeCaches();
    this.originalRowData[cellKey] = this.getTableCellValue(tableField, rowIndex, colField);
    // [[[II ESC:030-06 Combo de celda: sus opciones se cargan al entrar en
    // edición (perezoso + cacheado por columna). ]]]FI
    const column = this._columnByField(colField);
    if (this._isDropdownColumn(column)) this._loadCellDropdownOptions(column);
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
      this._focusFirstPendingEditable(tableField, rowIndex);
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
  private _resolveNextEditableColumn(column: any): any | null {
    const cols = this.normalizedColumns || [];

    const nextEditableAfter = (fromField: any): any | null => {
      const idx = cols.findIndex((c: any) => c?.field === fromField);
      for (let i = idx + 1; i < cols.length; i++) {
        if (this._isColumnEditable(cols[i])) return cols[i];
      }
      return null;
    };

    const target = column?.focus_after_select;
    if (typeof target === 'string' && target.trim() !== '') {
      const t = this._columnByField(target.trim());
      if (t) {
        if (this._isColumnEditable(t)) return t;
        // Destino declarado pero no editable: seguir el orden desde el destino.
        return nextEditableAfter(t.field);
      }
    }

    const currentTab = Number(column?.tabindex);
    if (Number.isFinite(currentTab)) {
      const candidates = cols
        .filter((c: any) => Number.isFinite(Number(c?.tabindex)) && Number(c.tabindex) > currentTab && this._isColumnEditable(c))
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

    const next = this._resolveNextEditableColumn(column);
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

  /** Enfoca la primera celda editable con error pendiente de la fila. */
  private _focusFirstPendingEditable(tableField: string, rowIndex: number): void {
    const rowGroup = this.getTableRowGroup(tableField, rowIndex);
    if (!rowGroup) return;
    const target = (this.normalizedColumns || []).find((col: any) => {
      if (!this._isColumnEditable(col)) return false;
      const ctrl = rowGroup.get(col.field);
      return !!ctrl && ctrl.invalid;
    });
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

  // --------------------------------------------------------------------------
  // Autocomplete en celda (D3): reutiliza la misma resolución app/type, carga
  // (crudS.getObject), aplanado (generalS.DJAtoObject) y proyección
  // (project/mergeConfiguredTableRow) que el formulario dinámico. No hay atajo
  // F3/searchable: `code`/`name` son autocomplete normales por config.
  // --------------------------------------------------------------------------

  /** Recurso remoto (app/type/include) de una columna, con fallback a la tabla. */
  private _cellSearchResource(column: any): { app: string; type: string; include: string } | null {
    const dt = (column?.data_type && column.data_type.type) ? column.data_type : (this.tableConfig?.data_type || {});
    const appType = this.crudS.getAppType?.(dt?.type);
    if (!appType?.app) return null;
    return { app: appType.app, type: appType.type, include: column?.include || dt?.include || '' };
  }

  // [[[II ESC:030-06 Combos de celda (dropdown/dropdown-choice): las opciones
  // vienen inline (column.options) o del recurso remoto declarado (data_type),
  // con la MISMA resolución que el form (getAppType/getObject/DJAtoObject). La
  // carga es perezosa (al entrar en edición) y se cachea por columna: sin
  // peticiones por render ni por tecla. ]]]FI
  cellDropdownOptions = signal<{ [colField: string]: any[] }>({});
  private _cellOptionsRequested = new Set<string>();

  private _loadCellDropdownOptions(column: any): void {
    const field = column?.field;
    if (!field) return;
    if (Array.isArray(column?.options) && column.options.length) return; // inline por config
    if (this._cellOptionsRequested.has(field)) return;
    const resource = this._cellSearchResource(column);
    if (!resource) return;
    this._cellOptionsRequested.add(field);
    this.crudS.getObject({ app: resource.app, type: resource.type, include: resource.include }).subscribe({
      next: (resp: any) => {
        let rows = this.generalS.DJAtoObject({ respDJA: resp, fields: { [field]: column } }) || [];
        rows = this.generalS.enrichSuggestionRelationData(rows, resp, column);
        this.cellDropdownOptions.set({ ...this.cellDropdownOptions(), [field]: rows });
        this.cdr.markForCheck();
      },
      // Ante error se permite reintentar en la siguiente edición.
      error: () => this._cellOptionsRequested.delete(field)
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
    const options = (Array.isArray(column?.options) && column.options.length)
      ? column.options
      : (this.cellDropdownOptions()[column.field] || []);
    const optionValueKey = column?.option_value || ((column?._type || column?.type) === 'dropdown-choice' ? 'value' : 'id');
    const value = event?.value;
    const selected = options.find((option: any) => option?.[optionValueKey] == value) ?? null;
    if (selected && typeof selected === 'object') {
      this._applyCellSelection(tableField, rowIndex, column, selected);
    } else {
      this.advanceAfterCell(tableField, rowIndex, column.field);
    }
  }

  /** completeMethod del p-autoComplete de celda: búsqueda parcial por escritura. */
  onCellComplete(event: any, column: any): void {
    const query = (event?.query ?? '').toString().trim();
    const resource = this._cellSearchResource(column);
    if (!resource || !query) {
      this.cellSuggestions.set([]);
      return;
    }
    const filter = `filter[search]=${encodeURIComponent(query)}`;
    this.crudS.getObject({ app: resource.app, type: resource.type, filter, include: resource.include }).subscribe({
      next: (resp: any) => {
        let rows = this.generalS.DJAtoObject({ respDJA: resp, fields: { [column.field]: column } }) || [];
        // Mismo enriquecimiento `<rel>_data_<attr>` que el form dinámico (fuente
        // única en GeneralService): habilita option_label/panel/children.derived.
        rows = this.generalS.enrichSuggestionRelationData(rows, resp, column);
        this.cellSuggestions.set(rows);
        this.cdr.markForCheck();
      },
      error: () => this.cellSuggestions.set([])
    });
  }

  /** onSelect del p-autoComplete de celda: aplica la opción seleccionada. */
  onCellAutoCompleteSelect(event: any, tableField: string, rowIndex: number, column: any): void {
    const selected = event?.value ?? event;
    this._lastCellSelectAt = Date.now();
    this._applyCellSelection(tableField, rowIndex, column, selected);
  }

  /**
   * Enter en celda de autocomplete: si p-autoComplete ya resolvió una selección
   * (onSelect reciente) no se duplica; en otro caso busca coincidencia exacta del
   * texto escrito. Con o sin match, cierra la celda y avanza el recorrido.
   */
  onCellAutoCompleteKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, column: any): void {
    if (event.key === 'Escape') {
      this.cancelCellEdit(tableField, rowIndex, column.field);
      return;
    }
    if (event.key !== 'Enter') return;
    setTimeout(() => {
      if (Date.now() - this._lastCellSelectAt < 150) return; // onSelect ya resolvió
      this._cellExactSearch(tableField, rowIndex, column);
    }, 0);
  }

  private _cellExactSearch(tableField: string, rowIndex: number, column: any): void {
    const control = this.getTableCellControl(tableField, rowIndex, column.field);
    const raw = (control?.value ?? '').toString().trim();
    const resource = this._cellSearchResource(column);
    if (!raw || !resource) {
      this._finishCellAndAdvance(tableField, rowIndex, column.field, column);
      return;
    }
    const filter = `filter[search]=${encodeURIComponent(raw)}`;
    this.crudS.getObject({ app: resource.app, type: resource.type, filter, include: resource.include }).subscribe({
      next: (resp: any) => {
        let rows = this.generalS.DJAtoObject({ respDJA: resp, fields: { [column.field]: column } }) || [];
        rows = this.generalS.enrichSuggestionRelationData(rows, resp, column);
        const match = rows.find((r: any) => this._exactCellMatch(r, column.field, raw)) ?? null;
        if (match) {
          this._applyCellSelection(tableField, rowIndex, column, match);
        } else {
          // Texto libre: se conserva y se avanza (free_or_relationship).
          this._finishCellAndAdvance(tableField, rowIndex, column.field, column);
        }
      },
      error: () => this._finishCellAndAdvance(tableField, rowIndex, column.field, column)
    });
  }

  private _exactCellMatch(row: any, colField: string, raw: string): boolean {
    if (!row) return false;
    const target = raw.toLowerCase();
    const candidates = [row[colField], row[`${colField}__name`], row.code, row.name, row.display_name];
    return candidates.some((v: any) => v != null && String(v).trim().toLowerCase() === target);
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

      // 3. celda seleccionada: siempre el texto visible (option_label), nunca el
      //    UUID. En source_row el display sólo sustituye al campo cuando el UUID
      //    vive en un relationship_field separado (autocomplete); si el campo ES
      //    la relación (combo directo), conserva el UUID canónico y el display
      //    queda en `<campo>__name`.
      const display = this.generalS.formatDynamicValue(selected, column);
      if (display) {
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
  private _applyDerivedChildren(rowGroup: FormGroup, column: any, selected: any, source: any): void {
    const derived = column?.children?.fields?.derived;
    if (!derived || typeof derived !== 'object') return;

    Object.keys(derived).forEach((targetField: string) => {
      const cfg = derived[targetField] || {};
      const sourceKey = cfg.field_name || cfg?.derived?.field_name || targetField;
      const ctrl = rowGroup.get(targetField);
      const targetCol = this._columnByField(targetField);
      if (!ctrl || !targetCol) return;

      const dispName = selected[`${sourceKey}__name`];
      const raw = selected[sourceKey];
      const display = (dispName !== undefined && dispName !== null && dispName !== '')
        ? dispName
        : (raw && typeof raw === 'object' ? this.generalS.formatDynamicValue(raw, targetCol) : raw);

      if (raw !== undefined) source[targetField] = (raw && typeof raw === 'object') ? (raw.id ?? display) : raw;
      if (dispName !== undefined && dispName !== null && dispName !== '') source[`${targetField}__name`] = dispName;

      const isEmpty = ctrl.value === '' || ctrl.value == null;
      // Un bool derivado nunca está "vacío" (default false): se rellena mientras
      // el usuario no lo haya tocado (pristine), sin pisar ediciones locales.
      const boolFillable = typeof display === 'boolean' && !ctrl.dirty;
      if ((targetField === column.field || isEmpty || boolFillable)
        && display !== undefined && display !== null && display !== '') {
        ctrl.setValue(display, { emitEvent: false });
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
   * Editabilidad de la celda basada en el campo natural `default.edit` que envía
   * el servidor, más el override explícito `local_editable`.
   *
   * FALLO CONOCIDO #1: NO se usa `column.editable`. En `combo`/`auto_complete`
   * ese flag hereda `editable: false`, cuyo significado es "permitir crear valores
   * nuevos", NO "celda bloqueada". Interpretarlo como bloqueo dejaba `code`/`name`
   * sin poder editarse. Aquí se ignora por completo para la decisión de edición.
   *
   * `local_editable: true` fuerza edición local (caso `name` local). `readonly:
   * true` se conserva como candado explícito declarado por columna (currency /
   * comprobantes) para no introducir regresiones. En ausencia de ambos se usa el
   * campo natural `default.edit` (true por defecto).
   */
  private _resolveColumnEditable(column: any): boolean {
    if (column?.local_editable === true) return true;
    if (column?.readonly === true) return false;
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
  }

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
      // auto-complete min_length = chars de búsqueda, no validación.
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
