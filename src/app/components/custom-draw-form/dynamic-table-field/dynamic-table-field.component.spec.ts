import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
// [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
// El componente inyecta CRUDService (búsqueda en celda) -> ConfigService ->
// HttpClient. Sin estos providers el TestBed no puede crearlo y las 15 pruebas
// del archivo fallaban con NG0201, dejando la tabla sin cobertura ejecutable. ]]]FI
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DynamicTableFieldComponent } from './dynamic-table-field.component';
import { DERIVED_TABLE_DRAFT_FLAG, TABLE_ROW_SOURCE_FLAG } from '../../../utils/table-row-flags.const';

describe('DynamicTableFieldComponent', () => {
  let component: DynamicTableFieldComponent;
  let fixture: ComponentFixture<DynamicTableFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicTableFieldComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicTableFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('keeps the declared relationship as a real row control and not as a manual row', () => {
    const tableConfig: any = {
      field: 'no_form_data_table_derived',
      columns: [
        { field: 'code', relationship_field: 'product', field_name: 'base_product_data_code' },
        { field: 'name', relationship_field: 'product' },
        { field: 'price' },
      ],
    };
    component.tableConfig = tableConfig;
    component.ngOnChanges({ tableConfig: new SimpleChange(null, tableConfig, true) } as any);

    // Fila que llega del servidor con su relación resuelta.
    const related = (component as any).createTableRowFormGroup(tableConfig, {
      id: 'detail-1', code: 'P-1', name: 'DIESEL', price: 12.5, product: 'product-id',
    });
    expect(related.get('product')).toBeTruthy();
    expect(related.getRawValue().product).toBe('product-id');
    expect(component.isManualRow(related)).toBeFalse();

    // El `source_row` puede perderse en alguna ruta: la fila sigue sin ser manual.
    (related as any)[TABLE_ROW_SOURCE_FLAG] = {};
    expect(component.isManualRow(related)).toBeFalse();

    // Fila realmente manual: sin relación resuelta.
    const manual = (component as any).createTableRowFormGroup(tableConfig, {
      code: 'LIBRE', name: 'texto libre', price: 3,
    });
    expect(manual.getRawValue().product).toBeNull();
    expect(component.isManualRow(manual)).toBeTrue();
  });
  // ]]]FI

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies a derived default with root inheritance when the source omits the field', () => {
    const parentColumn: any = {
      field: 'code',
      type: 'auto-complete',
      children: {
        fields: {
          derived: {
            price: {
              field: 'price',
              field_name: 'purchase_price',
              from: 'parent',
              default: { value: 1.5 },
            },
          },
        },
      },
    };
    const priceColumn: any = {
      field: 'price',
      type: 'input-number',
      default: { active: true, value: 1, edit: false },
    };
    const row = new FormGroup({
      code: new FormControl('X'),
      price: new FormControl(99),
    });
    const form = new FormGroup({ details: new FormArray([row]) });
    component.tableConfig = { field: 'details', columns: [parentColumn, priceColumn] };
    component.formGroup = form;
    component.ngOnChanges({
      tableConfig: new SimpleChange(null, component.tableConfig, true),
      formGroup: new SimpleChange(null, form, true),
    });

    (component as any)._applyDerivedChildren(row, parentColumn, {}, {});

    expect(row.get('price')?.value).toBe(1.5);
    expect((component as any)._derivedLockedFields.has('price')).toBeTrue();
  });

  // [[[II ESC:030-05 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-05
  it('marks the OnPush table for refresh when its FormArray changes externally', () => {
    const rows = new FormArray<any>([]);
    const form = new FormGroup({ details: rows });
    const markForCheck = spyOn((component as any).cdr, 'markForCheck');

    component.tableConfig = { field: 'details', columns: [] };
    component.formGroup = form;
    component.ngOnChanges({
      tableConfig: new SimpleChange(null, component.tableConfig, true),
      formGroup: new SimpleChange(null, form, true),
    });

    rows.push(new FormGroup({}));

    expect(markForCheck).toHaveBeenCalled();
    expect(component.getTableData('details').length).toBe(1);
  });
  // ]]]FI

  // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
  describe('cierre de fila condicionado al guardado (deferRowSave)', () => {
    const ROW_KEY = 'details_0';

    /** Tabla de una fila con una columna editable, lista para finishRowEdit. */
    function buildTable(options: { defer: boolean; draft?: boolean }, columns: any[] = [{ field: 'code', type: 'input-text' }]): FormGroup {
      const rowGroup = new FormGroup<any>({ code: new FormControl('ABC') });
      columns.filter((column) => column.field !== 'code').forEach((column) => {
        rowGroup.addControl(column.field, new FormControl(''));
      });
      if (options.draft) (rowGroup as any)[DERIVED_TABLE_DRAFT_FLAG] = true;
      const rows = new FormArray<any>([rowGroup]);
      const form = new FormGroup({ details: rows });

      component.tableConfig = { field: 'details', columns };
      component.formGroup = form;
      component.deferRowSave = options.defer;
      component.editingRows = { [ROW_KEY]: true };
      component.ngOnChanges({
        tableConfig: new SimpleChange(null, component.tableConfig, true),
        formGroup: new SimpleChange(null, form, true),
      });
      return form;
    }

    function emitOutcome(ok: boolean, rowIndex = 0): void {
      const outcome = { field: 'details', row_index: rowIndex, ok, token: 1 };
      component.rowSaveOutcome = outcome;
      component.ngOnChanges({ rowSaveOutcome: new SimpleChange(null, outcome, false) });
    }

    it('NO cierra la fila al emitir: espera la confirmación del servidor', () => {
      buildTable({ defer: true });

      component.finishRowEdit('details', 0);

      // Antes se cerraba aquí mismo y una fila no persistida parecía guardada.
      expect(component.editingRows[ROW_KEY]).toBeTrue();
    });

    it('cierra la fila sólo cuando el guardado se confirma', () => {
      buildTable({ defer: true });
      component.finishRowEdit('details', 0);

      emitOutcome(true);

      expect(component.editingRows[ROW_KEY]).toBeFalse();
    });

    it('mantiene la fila en edición cuando el guardado falla', () => {
      buildTable({ defer: true });
      component.finishRowEdit('details', 0);

      emitOutcome(false);

      expect(component.editingRows[ROW_KEY]).toBeTrue();
    });

    it('reactiva la última celda editable si falla un requerido del encabezado', () => {
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
        callback(0);
        return 0;
      });
      buildTable(
        { defer: true },
        [
          { field: 'code', type: 'input-text' },
          { field: 'requested', type: 'input-number' },
        ],
      );
      component.finishRowEdit('details', 0);

      emitOutcome(false);

      expect(component.editingCells['details_0_requested']).toBeTrue();
    });

    it('ignora el desenlace de otra fila', () => {
      buildTable({ defer: true });
      component.finishRowEdit('details', 0);

      emitOutcome(true, 5);

      expect(component.editingRows[ROW_KEY]).toBeTrue();
    });

    it('conserva el cierre inmediato cuando el guardado NO se delega', () => {
      buildTable({ defer: false });

      component.finishRowEdit('details', 0);

      expect(component.editingRows[ROW_KEY]).toBeFalse();
    });

    it('cierra de inmediato una fila de vista previa, que nunca se persiste', () => {
      buildTable({ defer: true, draft: true });

      component.finishRowEdit('details', 0);

      // Sin esto la fila quedaría esperando un desenlace que jamás llega.
      expect(component.editingRows[ROW_KEY]).toBeFalse();
    });
  });
  // ]]]FI

  // [[[II ESC:030-14 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-14
  it('honra edit:false y no deja que local_editable lo anule', () => {
    expect((component as any)._resolveColumnEditable({ local_editable: true, default: { edit: false } })).toBeFalse();
    expect((component as any)._resolveColumnEditable({ edit: false, default: { edit: true } })).toBeFalse();
    expect((component as any)._resolveColumnEditable({ default: { edit: true } })).toBeTrue();
  });
  // ]]]FI

  // [[[II ESC:030-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-15
  it('mantiene readonly como candado incluso en una fila manual', () => {
    const row = new FormGroup({ code: new FormControl('texto libre') });
    (row as any)[TABLE_ROW_SOURCE_FLAG] = {};
    (component as any)._relationshipColumnFields = ['product'];

    expect(component.isManualRow(row)).toBeTrue();
    expect(component.isCellEditableForRow(row, { field: 'code', readonly: true })).toBeFalse();
  });

  // [[[II ESC:030-18 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-18
  it('reconoce una relación canónica conservada en la fila aunque source_row aún no la tenga', () => {
    const row = new FormGroup({ product: new FormControl('product-id') });
    (row as any)[TABLE_ROW_SOURCE_FLAG] = {};
    (component as any)._relationshipColumnFields = ['product'];

    expect(component.isManualRow(row)).toBeFalse();
  });
  // ]]]FI

  it('resuelve la etiqueta dinámica desde la clave object_ publicada por el formulario', () => {
    const field = 'form_fields_data_SUBCOMPONENTE';
    const row = new FormGroup({ [field]: new FormControl('SC001') });
    (row as any)[TABLE_ROW_SOURCE_FLAG] = {};
    const form = new FormGroup({ details: new FormArray([row]) });
    const column = { field, type: 'dropdown', option_label: 'name' };

    component.tableConfig = { field: 'details', columns: [column] };
    component.formGroup = form;
    component.formDropdownOptions = { [`object_${field}`]: [{ id: 'SC001', name: 'Codo' }] };
    component.ngOnChanges({
      tableConfig: new SimpleChange(null, component.tableConfig, true),
      formGroup: new SimpleChange(null, form, true),
    });

    expect(component.cellDropdownLabel('SC001', component.normalizedColumns[0], 0)).toBe('Codo');
  });

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  it('aplica smart_search, min_search_length y Enter por defecto en la celda', () => {
    const partial = { field: 'codigo_producto', search_key: '', search_mode: 'partial', min_search_length: 2 };

    expect(component.cellMinLength(partial)).toBe(5);
    expect((component as any)._cellSearchFilter({ ...partial, smart_search: true }, 'AB C')).toBe(
      'filter[search]=AB%20C',
    );
    expect((component as any)._cellSearchFilter({ ...partial, smart_search: false }, 'AB C')).toBe(
      'filter[codigo_producto.icontains]=AB%20C',
    );
    expect((component as any)._cellSearchFilter({
      field: 'code', search_mode: 'exact',
      data_type: {
        filter: {
          base_product_data_code: { active: true, default: 'exact', default_value: null },
        },
      },
    }, '6')).toBe('filter[base_product__code]=6');
    expect((component as any)._searchKeysOf({ field: 'codigo_producto' })).toEqual(new Set(['enter']));
    expect((component as any)._searchKeysOf({ field: 'codigo_producto', search_mode: 'exact', search_key: 'f3' }))
      .toEqual(new Set(['f3']));
    expect(component.cellMinLength({ field: 'codigo_producto', search_mode: 'exact' })).toBe(0);
  });
  // ]]]FI
// ]]]FI
});
