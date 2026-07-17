import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from 'primeng/autofocus';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
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
    AutoFocusModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TagModule,
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
  }

  startCellEdit(tableField: string, rowIndex: number, colField: string): void {
    if (this.isTableReadonly(tableField)) return;
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    this.editingCells[cellKey] = true;
    this.clearTableRuntimeCaches();
    this.originalRowData[cellKey] = this.getTableCellValue(tableField, rowIndex, colField);
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
  // Teclado y busqueda en celda — ALCANCE: SOLO `type='table'` dentro de
  // app-custom-draw-form.
  //
  // Decision explicita: por ahora NO se implementa Insert/Delete/Supr global ni
  // para tablas CRUD generales/secundarias. Este handler escucha unicamente
  // dentro de las celdas de esta tabla dinamica. Si a futuro se amplia a algo
  // global (atajos a nivel pagina o de tablas CRUD), esta base debe REUTILIZARSE
  // o refactorizarse en un servicio compartido, NO duplicarse por componente.
  //
  // Rendimiento: no hay requests por keypress. La busqueda remota solo se dispara
  // en Enter (coincidencia exacta) o F3 (filter[search]); las peticiones en vuelo
  // se deduplican por (tabla:columna:modo:valor).
  // ============================================================================
  onCellKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, colField: string): void {
    const column = this._columnByField(colField);

    if (event.key === 'F3') {
      // F3: busqueda remota filter[search]. Solo en columnas buscables; si no lo
      // es, se ignora y el navegador conserva su comportamiento por defecto.
      if (this._isSearchableColumn(column)) {
        event.preventDefault();
        this._runCellSearch(tableField, rowIndex, colField, column, 'search');
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this._isSearchableColumn(column)) {
        // Enter en code/name: coincidencia exacta (case-insensitive) contra el
        // recurso resuelto por data_type (columna, con fallback al de la tabla).
        this._runCellSearch(tableField, rowIndex, colField, column, 'exact');
      } else {
        this.finishCellEdit(tableField, rowIndex, colField);
        // focus_after_select tambien aplica a la tabla; si no resuelve -> tabindex.
        this._focusAfterCell(tableField, rowIndex, column);
      }
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

  /**
   * Una columna es buscable si lo declara la config (`column.searchable`, o
   * `tableConfig.search_columns` incluye su field); por defecto `code` y `name`.
   * Hooks de servidor: `column.searchable`, `column.search_field`,
   * `column.data_type`, `column.include`, `column.focus_after_select`.
   */
  private _isSearchableColumn(column: any): boolean {
    const field = column?.field;
    if (!field) return false;
    if (column.searchable === true) return true;
    if (column.searchable === false) return false;
    const list = this.tableConfig?.search_columns;
    // Solo se respeta search_columns cuando trae elementos; una lista vacia deja
    // actuar el default (code/name) en vez de deshabilitar la busqueda por completo.
    if (Array.isArray(list) && list.length) return list.includes(field);
    return field === 'code' || field === 'name';
  }

  // Dedup de busquedas en vuelo por (tabla:columna:modo:valor).
  private _cellSearchInFlight = new Set<string>();

  /**
   * Dispara la busqueda de la celda. `mode='exact'` (Enter) filtra por el campo
   * exacto (`filter[<search_field>]`); `mode='search'` (F3) usa `filter[search]`.
   * Resuelve `data_type` de la columna con fallback al de la tabla. Sin recurso
   * remoto resoluble, conserva el valor escrito y solo mueve el foco.
   */
  private _runCellSearch(tableField: string, rowIndex: number, colField: string, column: any, mode: 'exact' | 'search'): void {
    const control = this.getTableCellControl(tableField, rowIndex, colField);
    const raw = (control?.value ?? '').toString().trim();
    if (!raw) {
      this._afterCellSearch(tableField, rowIndex, colField, column, null);
      return;
    }

    const dt = (column?.data_type && column.data_type.type) ? column.data_type : (this.tableConfig?.data_type || {});
    const appType = this.crudS.getAppType?.(dt?.type);
    const app = appType?.app;
    const type = appType?.type;
    if (!app) {
      // Columna sin recurso remoto: preservar valor escrito y mover foco.
      this._afterCellSearch(tableField, rowIndex, colField, column, null);
      return;
    }

    const searchField = column?.search_field || colField;
    const filter = mode === 'exact'
      ? `filter[${searchField}]=${encodeURIComponent(raw)}`
      : `filter[search]=${encodeURIComponent(raw)}`;
    const include = column?.include || dt?.include || '';

    const dedupKey = `${tableField}:${colField}:${mode}:${raw.toLowerCase()}`;
    if (this._cellSearchInFlight.has(dedupKey)) return;
    this._cellSearchInFlight.add(dedupKey);

    this.crudS.getObject({ app, type, filter, include }).subscribe({
      next: (resp: any) => {
        this._cellSearchInFlight.delete(dedupKey);
        const rows = this.generalS.DJAtoObject({ respDJA: resp, fields: { [colField]: column } }) || [];
        const match = mode === 'exact'
          ? (rows.find((r: any) => this._exactCellMatch(r, column, colField, raw)) ?? null)
          : (rows.length ? rows[0] : null);
        this._afterCellSearch(tableField, rowIndex, colField, column, match);
      },
      error: () => {
        this._cellSearchInFlight.delete(dedupKey);
        this._afterCellSearch(tableField, rowIndex, colField, column, null);
      }
    });
  }

  private _exactCellMatch(row: any, column: any, colField: string, raw: string): boolean {
    if (!row) return false;
    const field = column?.search_field || colField;
    const target = raw.toLowerCase();
    const candidates = [row[field], row[`${field}__name`], row.code, row.name, row.display_name];
    return candidates.some((v: any) => v != null && String(v).trim().toLowerCase() === target);
  }

  /**
   * Aplica el resultado (si lo hay) a la fila con la MISMA semantica de aplanado
   * que DJAtoObject (via mergeConfiguredTableRow), termina la edicion de la celda
   * actual y transfiere la edicion a la celda destino (`focus_after_select`).
   * Si no hay resultado, se conserva el valor escrito.
   */
  private _afterCellSearch(tableField: string, rowIndex: number, colField: string, column: any, match: any): void {
    if (match) {
      const rowGroup = this.getTableRowGroup(tableField, rowIndex);
      if (rowGroup) {
        const merged = this.generalS.mergeConfiguredTableRow(
          rowGroup.getRawValue(), this.normalizedColumns || [], match, column
        );
        rowGroup.patchValue(merged, { emitEvent: false });
        (rowGroup as any)[this.tableRowSourceFlag] = match;
        rowGroup.markAsDirty();
      }
    }
    // Sin match: el valor escrito ya vive en el control y se conserva.
    this.finishCellEdit(tableField, rowIndex, colField);
    this._focusAfterCell(tableField, rowIndex, column);
    this.clearTableRuntimeCaches();
    this.cdr.markForCheck();
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
  // ]]]FI

  private normalizeTableConfig(): void {
    if (!this.tableConfig) {
      this.normalizedColumns = [];
      this.controlColumnFields = [];
      return;
    }

    const columns = Array.isArray(this.tableConfig.columns) ? this.tableConfig.columns : [];
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

  private normalizeTableColumn(column: any): any {
    if (!column || typeof column !== 'object') return column;

    const meta = {
      type: column.type || 'input-text',
      editable: column.editable !== undefined ? column.editable : true,
      required: column.required !== undefined ? column.required : false,
      width: column.width || 'auto',
      tagSeverity: column.tag?.severity || 'info',
      tagType: column.tag?.type || 'none',
      tagActive: !!column.tag?.active
    };

    column._type = meta.type;
    column._editable = meta.editable;
    column._required = meta.required;
    column._width = meta.width;
    column._tagSeverity = meta.tagSeverity;
    column._tagType = meta.tagType;
    column._tagActive = meta.tagActive;

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
    if (column?.type === 'checkbox') {
      return false;
    }
    return '';
  }

  private createTableRowFormGroup(tableConfig: any, rowData: any = {}): FormGroup {
    const rowGroup: any = {};

    (tableConfig?.columns || []).forEach((col: any) => {
      const validators: any[] = [];
      const editable = col.editable !== false;

      if (col.required && editable) {
        validators.push(Validators.required);
      }
      if (col.validation?.max_length) {
        validators.push(Validators.maxLength(col.validation.max_length));
      }
      if (col.validation?.min_length) {
        validators.push(Validators.minLength(col.validation.min_length));
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
