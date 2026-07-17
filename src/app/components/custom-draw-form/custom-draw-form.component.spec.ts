import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';

import { CustomDrawFormComponent } from './custom-draw-form.component';

describe('CustomDrawFormComponent', () => {
  let component: CustomDrawFormComponent;
  let fixture: ComponentFixture<CustomDrawFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDrawFormComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CustomDrawFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // [[[II ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01
  it('applies hidden, required and readonly child overlays without serializing inactive values', () => {
    const parentConfig: any = {
      field: 'parent',
      children: {
        active: true,
        fields: {
          static: {
            child: {
              type: 'input-text',
              field: 'child',
              edit: false,
              activate: {
                active: true,
                action: 'hidden',
                default_state: 'active',
                conditions: [{ source: 'parent', field: 'parent', value_key: 'mode', operator: 'equals', value: 'hide' }],
              },
              requested: {
                active: true,
                action: 'required',
                conditions: [{ source: 'parent', field: 'parent', value_key: 'mode', operator: 'equals', value: 'show' }],
              },
              options: [],
            },
          },
        },
      },
    };
    const childConfig: any = { field: 'child', type: 'input-text', required: false };
    const form = new FormGroup({ parent: new FormControl('parent'), child: new FormControl('stale') });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: parentConfig, 1: childConfig } });

    (component as any)._processChildrenFields('parent', 'parent', parentConfig, { id: 'p', mode: 'hide' });

    expect(childConfig.hide).toBeTrue();
    expect(form.get('child')?.disabled).toBeTrue();
    expect(form.value).not.toEqual(jasmine.objectContaining({ child: jasmine.anything() }));

    (component as any)._processChildrenFields('parent', 'parent', parentConfig, { id: 'p', mode: 'show' });

    expect(childConfig.hide).toBeFalse();
    expect(childConfig.readonly).toBeTrue();
    expect(form.get('child')?.enabled).toBeTrue();
    expect(form.get('child')?.hasValidator(Validators.required)).toBeFalse();
  });

  it('preserves the root state when conditional blocks are disabled or do not match', () => {
    component.formGroupSignal.set(new FormGroup({ child: new FormControl('') }));

    const disabledActivate = (component as any).getEffectiveChildConfig(
      { field: 'child', required: false },
      { field: 'parent' },
      'child',
      {
        activate: { active: false, default_state: 'hidden' },
        requested: { active: false },
      },
      { mode: 'hide' },
    );
    expect(disabledActivate).toEqual({ state: 'active', required: false, edit: true });

    const unmatchedNotRequired = (component as any).getEffectiveChildConfig(
      { field: 'child', required: true },
      { field: 'parent' },
      'child',
      {
        requested: {
          active: true,
          action: 'not_required',
          conditions: [{ source: 'parent', field: 'parent', value_key: 'mode', operator: 'equals', value: 'other' }],
        },
      },
      { mode: 'current' },
    );
    expect(unmatchedNotRequired.required).toBeTrue();
  });

  it('evaluates literal and numeric conditions with server-compatible semantics', () => {
    expect((component as any)._evaluateConditions(
      [{ source: 'literal', field: 'unused', operator: 'equals', value: 'configured' }],
      'AND', 'parent', null,
    )).toBeTrue();
    expect((component as any)._evaluateOperator('greater_than', '11', ['9'])).toBeTrue();
    expect((component as any)._evaluateOperator('range', '7', ['5', '10'])).toBeTrue();
  });

  it('resolves selected without field from the effective child target', () => {
    component.formGroupSignal.set(new FormGroup({
      child: new FormControl('Seleccionado'),
      __autocomplete_object_child: new FormControl({ id: 'child-id', mode: 'required' }),
    }));

    const effective = (component as any).getEffectiveChildConfig(
      { field: 'child', required: false },
      { field: 'parent' },
      'child',
      {
        field: 'child',
        requested: {
          active: true,
          action: 'required',
          conditions: [{ source: 'selected', value_key: 'mode', operator: 'equals', value: 'required' }],
        },
      },
      null,
    );

    expect(effective.required).toBeTrue();
  });

  it('filters child options by child filter_group and parent value_key', () => {
    const filtered = (component as any)._applyClientFilter({
      options: [{ id: 1, group: 'A' }, { id: 2, group: 'B' }],
      fieldConfig: {
        filter_group: 'group',
        filter: {
          active: true,
          logic: 'AND',
          conditions: [{ source: 'parent', field: 'parent', value_key: 'id', operator: 'equals' }],
        },
      },
      parentField: 'parent',
      parentOption: { id: 'A' },
      childFilterGroup: 'group',
      isServer: false,
    });

    expect(filtered).toEqual([{ id: 1, group: 'A' }]);
  });

  it('keeps the root child value and options when autocomplete has no selected object', () => {
    const parentConfig: any = {
      field: 'parent',
      type: 'auto-complete',
      children: {
        active: true,
        fields: {
          static: {
            child: { field: 'child', type: 'dropdown', options: [{ id: 'overlay' }] },
          },
        },
      },
    };
    const childConfig: any = {
      field: 'child', type: 'dropdown', options: [{ id: 'root' }], required: false,
    };
    const form = new FormGroup({ parent: new FormControl('texto libre'), child: new FormControl('root') });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: parentConfig, 1: childConfig } });
    const restoreRoot = spyOn(component, 'dataDropdown').and.returnValue(Promise.resolve());

    (component as any)._processChildrenFields('parent', 'texto libre', parentConfig, null);

    expect(form.get('child')?.value).toBe('root');
    expect(restoreRoot).toHaveBeenCalledWith(childConfig, false);
  });
  // ]]]FI

  // [[[II ESC:030-02 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-02
  it('hydrates a local derived table from parent option_label and configured column keys', () => {
    const table = new FormArray<any>([]);
    component.formGroupSignal.set(new FormGroup({ no_form_data_table_derived: table }));
    const tableConfig = {
      field: 'no_form_data_table_derived',
      type: 'table',
      columns: [
        { field: 'base_product_data_code', type: 'input-text' },
        { field: 'product', type: 'input-text' },
        { field: 'price', type: 'input-number' },
      ],
    };

    (component as any)._processDerivedChild({
      fieldConfig: {
        type: 'table', field_name: 'no_form_data_table_derived',
        derived: { from: 'parent', field_name: 'no_form_data_table_derived' },
      },
      targetField: 'no_form_data_table_derived',
      targetFieldConfig: tableConfig,
      formControl: table,
      parentField: 'name',
      parentOption: {
        id: 'product-id', base_product_data_code: 'PR-01', base_product_data_name: 'Producto configurado',
        price: 10,
      },
      parentValue: 'product-id',
      childFilterGroup: 'id',
      parentFieldConfig: { field: 'name', relationship_field: 'product', option_label: 'base_product_data_name' },
      isActive: true,
      depth: 0,
    });

    expect(table.getRawValue() as any[]).toEqual([
      { base_product_data_code: 'PR-01', product: 'Producto configurado', price: 10 },
    ]);

    // La fila confirmada permanece y solo se reemplaza la vista previa.
    (table.at(0) as any).__bosDerivedTableDraft = false;
    (component as any)._processDerivedChild({
      fieldConfig: {
        type: 'table', field_name: 'no_form_data_table_derived',
        derived: { from: 'parent', field_name: 'no_form_data_table_derived' },
      },
      targetField: 'no_form_data_table_derived',
      targetFieldConfig: tableConfig,
      formControl: table,
      parentField: 'name',
      parentOption: {
        id: 'product-id-2', base_product_data_code: 'PR-02', base_product_data_name: 'Segundo producto',
        price: 20,
      },
      parentValue: 'product-id-2',
      childFilterGroup: 'id',
      parentFieldConfig: { field: 'name', relationship_field: 'product', option_label: 'base_product_data_name' },
      isActive: true,
      depth: 0,
    });

    expect(table.getRawValue() as any[]).toEqual([
      { base_product_data_code: 'PR-02', product: 'Segundo producto', price: 20 },
      { base_product_data_code: 'PR-01', product: 'Producto configurado', price: 10 },
    ]);

    (component as any)._applyEffectiveChildState({
      formControl: table,
      mirroredField: null,
      state: 'hidden',
      required: false,
      preserveValue: true,
    });
    expect(table.disabled).toBeTrue();
    expect(table.getRawValue().length).toBe(2);
  });

  it('loads all derived table rows from the root data_type when the child omits it', () => {
    const getObject = jasmine.createSpy('getObject').and.returnValue(of({
      data: [
        { id: 'detail-1', type: 'request-detail', attributes: { code: '001', description: 'Uno' }, relationships: {} },
        { id: 'detail-2', type: 'request-detail', attributes: { code: '002', description: 'Dos' }, relationships: {} },
      ],
    }));
    (component as any).crudS = {
      getAppType: () => ({ app: 'purchases', type: 'request-detail' }),
      buildDropdownFilterString: () => '',
      getObject,
    };

    const table = new FormArray<any>([]);
    component.formGroupSignal.set(new FormGroup({ no_form_data_table_derived: table }));
    const tableConfig = {
      field: 'no_form_data_table_derived',
      type: 'table',
      data_type: { type: 'request-detail' },
      columns: [
        { field: 'code', type: 'input-text' },
        { field: 'description', type: 'input-text' },
      ],
    };

    (component as any)._processDerivedChild({
      fieldConfig: {
        type: 'table', field_name: 'details',
        derived: { from: 'server', field_name: 'details' },
      },
      targetField: 'no_form_data_table_derived',
      targetFieldConfig: tableConfig,
      formControl: table,
      parentField: 'request',
      parentOption: { id: 'request-id' },
      parentValue: 'request-id',
      childFilterGroup: 'request',
      parentFieldConfig: { field: 'request' },
      isActive: true,
      depth: 0,
    });

    expect(getObject).toHaveBeenCalledWith(jasmine.objectContaining({
      app: 'purchases', type: 'request-detail', limit: 0,
    }));
    expect(table.getRawValue() as any[]).toEqual([
      { code: '001', description: 'Uno' },
      { code: '002', description: 'Dos' },
    ]);
  });

  it('fills configured scalar siblings before publishing one derived table preview', () => {
    const columns = [
      { field: 'base_product_data_code', type: 'input-text' },
      { field: 'product', type: 'input-text' },
      { field: 'price', type: 'input-number' },
    ];
    const table = new FormArray<any>([
      new FormGroup({
        base_product_data_code: new FormControl(''),
        product: new FormControl(''),
        price: new FormControl(null),
      }),
      new FormGroup({
        base_product_data_code: new FormControl(''),
        product: new FormControl(''),
        price: new FormControl(null),
      }),
    ]);
    const rootConfig: any = {
      field: 'name', type: 'auto-complete', relationship_field: 'product',
      option_label: 'base_product_data_name',
      children: {
        active: true,
        fields: {
          derived: {
            code: {
              field: 'code', type: 'input-text', field_name: 'base_product_data_code',
              derived: { from: 'parent', field_name: 'base_product_data_code' }, edit: false,
            },
            price: {
              field: 'price', type: 'input-number', field_name: 'purchase_price',
              derived: { from: 'parent', field_name: 'purchase_price' }, edit: true,
            },
            no_form_data_table_derived: {
              field: 'no_form_data_table_derived', type: 'table', field_name: 'no_form_data_table_derived',
              derived: { from: 'parent', field_name: 'no_form_data_table_derived' }, edit: true,
            },
          },
        },
      },
    };
    const codeConfig: any = { field: 'code', type: 'input-text', required: true };
    const priceConfig: any = { field: 'price', type: 'input-number', required: false };
    const tableConfig: any = {
      field: 'no_form_data_table_derived', type: 'table', columns,
    };
    const form = new FormGroup({
      name: new FormControl('DIESEL'),
      product: new FormControl('product-id'),
      code: new FormControl('', Validators.required),
      price: new FormControl(0),
      no_form_data_table_derived: table,
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({
      grid: { 0: rootConfig, 1: codeConfig, 2: priceConfig, 3: tableConfig },
    });

    (component as any)._processChildrenFields('name', 'DIESEL', rootConfig, {
      id: 'product-id',
      base_product_data_code: '6',
      base_product_data_name: 'DIESEL',
      purchase_price: 12.5,
    });

    expect(form.get('code')?.value).toBe('6');
    expect(form.get('code')?.hasValidator(Validators.required)).toBeFalse();
    expect(form.get('price')?.value).toBe(12.5);
    expect(table.getRawValue()).toEqual([{
      base_product_data_code: '6', product: 'DIESEL', price: 12.5,
    }]);
  });
  // ]]]FI

  // [[[II ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
  it('persists only server-scoped table columns and leaves derived drafts local', () => {
    const edit = jasmine.createSpy('edit').and.returnValue(of({ data: {} }));
    (component as any).crudS = {
      getAppType: () => ({ app: 'purchases/request-detail', type: 'request-detail' }),
      edit,
    };
    const output = { emit: jasmine.createSpy('emit') } as any;
    const tableConfig = {
      data_type: { type: 'request-detail' },
      columns: [
        { field: 'price', scope_edition: 'server' },
        { field: 'description', scope_edition: 'local' },
      ],
    };

    component.handleTableEdit({
      field: 'details', rowIndex: 0, sourceRow: { id: 'detail-id' },
      rowData: { price: 20, description: 'local' },
    }, tableConfig, output);

    expect(edit).toHaveBeenCalledWith(jasmine.objectContaining({
      app: 'purchases/request-detail',
      type: 'request-detail',
      id: 'detail-id',
      formData: { price: 20 },
    }));

    component.handleTableEdit({
      isDerivedDraft: true, sourceRow: { id: 'product-id' }, rowData: { price: 30 },
    }, tableConfig, output);
    expect(edit).toHaveBeenCalledTimes(1);
  });
  // ]]]FI
});
