import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from 'primeng/autofocus';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CustomButtonCrudComponent } from '../../custom-button-crud/custom-button-crud.component';

// [[[II ESC:015-01 DOC:docs/documents/2026-06-02_015_dynamic-table-field-component.md#escenario-01
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
export class DynamicTableFieldComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

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
    this.editRow.emit({ rowData: normalizedRowData, field, data: this.getTableValue(field) });
  }

  deleteTableRow(rowIndex: number, field: string): void {
    const formArray = this.getTableFormArray(field);
    if (!formArray) return;

    const rowToDelete = this.getTableRowGroup(field, rowIndex)?.getRawValue();

    formArray.removeAt(rowIndex);
    formArray.markAsDirty();
    formArray.root?.markAsDirty();
    formArray.markAsTouched();
    formArray.updateValueAndValidity();
    this.clearTableRuntimeCaches();

    this.deleteRow.emit({
      rowData: rowToDelete,
      rowIndex,
      field,
      data: this.getTableValue(field)
    });
  }

  onCellEdit(event: any, field: string, rowIndex: number, colField: string): void {
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
    const rowKey = `${tableField}_${rowIndex}`;
    this.editingRows[rowKey] = true;
    this.clearTableRuntimeCaches();
    this.originalRowData[rowKey] = { ...this.getTableRowGroup(tableField, rowIndex)?.getRawValue() };
  }

  startCellEdit(tableField: string, rowIndex: number, colField: string): void {
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
      this.editingCells[cellKey] = false;
      this.clearTableRuntimeCaches();
      delete this.originalRowData[cellKey];

      this.cellEdit.emit({
        field: tableField,
        rowIndex,
        colField,
        value: cellControl.value,
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

  onCellKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, colField: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.finishCellEdit(tableField, rowIndex, colField);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit(tableField, rowIndex, colField);
    }
  }

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
    if (column?.type === 'multi-select' || column?.type === 'listbox') {
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

    return this.fb.group(rowGroup);
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
