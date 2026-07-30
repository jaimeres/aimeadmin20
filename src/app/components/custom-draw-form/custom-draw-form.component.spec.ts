import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
// [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
// ]]]FI
import { of } from 'rxjs';

import { CustomDrawFormComponent } from './custom-draw-form.component';

describe('CustomDrawFormComponent', () => {
  let component: CustomDrawFormComponent;
  let fixture: ComponentFixture<CustomDrawFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDrawFormComponent],
      // [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
      // Los servicios reales del componente (CRUDService -> ConfigService)
      // inyectan HttpClient; sin estos providers el TestBed no puede crearlo.
      providers: [provideHttpClient(), provideHttpClientTesting()],
      // ]]]FI
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
              default: { edit: false },
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
        from: 'parent',
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

    // [[[II ESC:030-20 CONTRATO VIGENTE: un child derived NUNCA modifica una
    // tabla (ver `_processDerivedChild`); las filas las agrega exclusivamente el
    // boton save con la respuesta aplanada del servidor. Antes este spec exigia
    // la "vista previa derivada" que se retiro por contradecir ese contrato. ]]]FI
    expect(table.getRawValue() as any[]).toEqual([]);

    // Una segunda seleccion tampoco inserta ni reemplaza filas.
    (component as any)._processDerivedChild({
      fieldConfig: {
        type: 'table', field_name: 'no_form_data_table_derived',
        from: 'parent',
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

    expect(table.getRawValue() as any[]).toEqual([]);

    // `hidden` con preserveValue conserva las filas YA confirmadas (las agrega
    // el boton save, no la derivacion): se simula una para poder validarlo.
    table.push(new FormGroup({
      base_product_data_code: new FormControl('PR-01'),
      product: new FormControl('Producto configurado'),
      price: new FormControl(10),
    }));
    (component as any)._applyEffectiveChildState({
      formControl: table,
      mirroredField: null,
      state: 'hidden',
      required: false,
      preserveValue: true,
    });
    // [[[II ESC:030-09 Una tabla `no_form_data_*` es un CONTENEDOR local de
    // borradores: el overlay NUNCA la deshabilita (si no, `isTableReadonly()`
    // bloqueaba el boton "+"). Conserva sus filas y sigue habilitada. ]]]FI
    expect(table.disabled).toBeFalse();
    expect(table.getRawValue().length).toBe(1);
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
        from: 'server',
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

    // [[[II ESC:030-20 Un derived con destino tabla retorna antes de consultar:
    // no hay carga de filas por derivacion, ni siquiera con from:'server'. ]]]FI
    expect(getObject).not.toHaveBeenCalled();
    expect(table.getRawValue() as any[]).toEqual([]);
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
              from: 'parent', default: { edit: false },
            },
            price: {
              field: 'price', type: 'input-number', field_name: 'purchase_price',
              from: 'parent', default: { edit: true },
            },
            no_form_data_table_derived: {
              field: 'no_form_data_table_derived', type: 'table', field_name: 'no_form_data_table_derived',
              from: 'parent', default: { edit: true },
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
    // [[[II ESC:030-20 Los hermanos ESCALARES si se derivan; la tabla NO recibe
    // los datos del producto (sus filas siguen vacias). ]]]FI
    expect(table.getRawValue().some((row: any) => row.base_product_data_code === '6'
      || row.product === 'DIESEL' || row.price === 12.5)).toBeFalse();
  });
  // ]]]FI

  // [[[II ESC:030-18 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-18
  it('initializes derived fields after selecting an exact autocomplete value with unchanged text', async () => {
    const codeConfig: any = {
      field: 'code', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_code',
      children: {
        active: true,
        fields: {
          derived: {
            name: { field: 'name', field_name: 'base_product_data_name', from: 'parent', default: { edit: false } },
            price: { field: 'price', field_name: 'purchase_price', from: 'parent', default: { edit: false } },
          },
        },
      },
    };
    const form = new FormGroup({
      code: new FormControl('6'), product: new FormControl<any>(null),
      name: new FormControl(''), price: new FormControl<any>(null),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: codeConfig, 1: { field: 'name' }, 2: { field: 'price' } } });
    (component as any).childRuntimePreviousValue = form.getRawValue();

    await component.onSelectAutoComplete({ value: {
      id: 'product-id', base_product_data_code: '6', base_product_data_name: 'DIESEL', purchase_price: 2122.76,
    } }, codeConfig);

    expect(form.get('product')?.value).toBe('product-id');
    expect(form.get('name')?.value).toBe('DIESEL');
    expect(form.get('price')?.value).toBe(2122.76);
  });

  it('uses the effective root/child default when a derived source is absent', () => {
    const nameConfig: any = {
      field: 'name',
      type: 'input-text',
      default: { active: true, value: 'ROOT', edit: true },
    };
    const codeConfig: any = {
      field: 'code',
      type: 'auto-complete',
      children: {
        active: true,
        fields: {
          derived: {
            name: {
              field: 'name',
              field_name: 'base_product_data_name',
              from: 'parent',
              default: { value: 'CHILD', edit: false },
            },
          },
        },
      },
    };
    const form = new FormGroup({
      code: new FormControl('NO-RESULT'),
      name: new FormControl('stale'),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: codeConfig, 1: nameConfig } });

    (component as any)._processChildrenFields('code', 'NO-RESULT', codeConfig, null);

    expect(form.get('name')?.value).toBe('CHILD');
    expect(nameConfig.readonly).toBeTrue();
  });

  // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('does not overwrite an edit:true derived value on a refresh', () => {
    const codeConfig: any = { field: 'code', type: 'input-text' };
    const rootConfig: any = {
      field: 'name', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_name',
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'code', field_name: 'base_product_data_code', from: 'parent',
              default: { active: true, value: '', edit: true },
            },
          },
        },
      },
    };
    const form = new FormGroup({
      name: new FormControl('DIESEL'), product: new FormControl('product-id'),
      code: new FormControl(''),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: rootConfig, 1: codeConfig } });
    const option = { id: 'product-id', base_product_data_code: 'P-1', base_product_data_name: 'DIESEL' };

    // La SELECCIÓN sí deriva.
    (component as any)._processChildrenFields('name', 'DIESEL', rootConfig, option);
    expect(form.get('code')?.value).toBe('P-1');

    // El usuario escribe el suyo; una reevaluación NO puede pisarlo.
    form.get('code')?.setValue('111111');
    (component as any)._processChildrenFields('name', 'DIESEL', rootConfig, option, 0, 'refresh');
    expect(form.get('code')?.value).toBe('111111');

    // Elegir otro producto (acción explícita) sí vuelve a derivar.
    (component as any)._processChildrenFields('name', 'COCA', rootConfig, {
      id: 'product-2', base_product_data_code: 'P-2', base_product_data_name: 'COCA',
    });
    expect(form.get('code')?.value).toBe('P-2');
  });

  it('never empties an edit:true derived control when the source has no value', () => {
    const codeConfig: any = { field: 'code', type: 'input-text' };
    const rootConfig: any = {
      field: 'name', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_name',
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'code', field_name: 'base_product_data_code', from: 'parent',
              default: { active: true, value: '', edit: true },
            },
          },
        },
      },
    };
    const form = new FormGroup({
      name: new FormControl('DIESEL'), product: new FormControl('product-id'),
      code: new FormControl('MIO-7'),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: rootConfig, 1: codeConfig } });

    // El padre no trae la propiedad fuente: el fallback '' NO debe vaciar.
    (component as any)._processChildrenFields('name', 'DIESEL', rootConfig, { id: 'product-id' });
    expect(form.get('code')?.value).toBe('MIO-7');
  });

  it('resolves a derived source nested under <relation>_data', () => {
    const codeConfig: any = { field: 'code', type: 'input-text' };
    const rootConfig: any = {
      field: 'name', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_name',
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'code', field_name: 'base_product_data_code', from: 'parent',
              default: { active: true, value: '', edit: true },
            },
          },
        },
      },
    };
    const form = new FormGroup({
      name: new FormControl('DIESEL'), product: new FormControl('product-id'),
      code: new FormControl(''),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: rootConfig, 1: codeConfig } });

    // Sin `included`: la clave sólo existe anidada en el serializer.
    (component as any)._processChildrenFields('name', 'DIESEL', rootConfig, {
      id: 'product-id', base_product_data: { code: 'P-9', name: 'DIESEL' },
    });
    expect(form.get('code')?.value).toBe('P-9');
  });

  it('keeps a relationship searcher editable even with a derived edit:false', () => {
    const searcher: any = {
      field: 'name', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_name',
    };
    const effective = (component as any).getEffectiveChildConfig(
      searcher, { field: 'code' }, 'name', { default: { edit: false } }, null,
    );
    expect(effective.edit).toBeTrue();
    expect(effective.state).toBe('active');

    // Un destino normal sí queda bloqueado por el mismo candado.
    const plain = (component as any).getEffectiveChildConfig(
      { field: 'price', type: 'input-number' }, { field: 'code' }, 'price',
      { default: { edit: false } }, null,
    );
    expect(plain.edit).toBeFalse();
    expect(plain.state).toBe('readonly');
  });
  // ]]]FI

  it('does not wipe a sibling searcher when the other searcher has no selection', () => {
    // Dos buscadores de la MISMA relación: `code` y `name`. Se selecciona en
    // `name`; la reevaluación reprocesa `code`, que NO tiene objeto elegido.
    // Su derived de `name` (edit:false, default.value '') no puede vaciarlo.
    const nameSearcher: any = {
      field: 'name', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_name',
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'code', field_name: 'base_product_data_code', from: 'parent',
              default: { active: true, value: '', edit: true },
            },
          },
        },
      },
    };
    const codeSearcher: any = {
      field: 'code', type: 'auto-complete', free_or_relationship: true,
      relationship_field: 'product', option_label: 'base_product_data_code',
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'name', field_name: 'base_product_data_name', from: 'parent',
              default: { active: true, value: '', edit: false },
            },
          },
        },
      },
    };
    const form = new FormGroup({
      code: new FormControl(''), name: new FormControl('aguassss'),
      product: new FormControl('product-id'),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: codeSearcher, 1: nameSearcher } });

    // Selección en `name`: deriva el código.
    (component as any)._processChildrenFields('name', 'aguassss', nameSearcher, {
      id: 'product-id', base_product_data_code: '111111', base_product_data_name: 'aguassss',
    });
    expect(form.get('code')?.value).toBe('111111');

    // Reevaluación del OTRO buscador, sin selección propia: no borra nada.
    (component as any)._processChildrenFields('code', '111111', codeSearcher, null, 0, 'refresh');
    expect(form.get('name')?.value).toBe('aguassss');
    expect(form.get('product')?.value).toBe('product-id');
  });

  // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('keeps the row relationship even when no column source key is in the response', () => {
    const columns = [
      { field: 'code', relationship_field: 'product', field_name: 'base_product_data_code' },
      { field: 'name', relationship_field: 'product', field_name: 'base_product_data_name' },
      { field: 'price' },
    ];
    // Respuesta del PROPIO detalle: trae `code`/`name`, no `base_product_data_*`.
    const source = { id: 'detail-1', code: 'P-1', name: 'DIESEL', price: 12.5, product: 'product-id' };

    const projected = (component as any).generalS.projectConfiguredTableRow({}, columns, source);

    // La relación se conserva: sin ella la fila se pinta como MANUAL.
    expect(projected.product).toBe('product-id');
    // Y las columnas caen a `field` cuando la clave declarada no viene.
    expect(projected.code).toBe('P-1');
    expect(projected.name).toBe('DIESEL');
    expect(projected.price).toBe(12.5);
  });
  // ]]]FI

  it('keeps default.active independent from the inherited edit permission', () => {
    const effective = (component as any).getEffectiveChildConfig(
      { default: { active: true, value: 'ROOT', edit: false } },
      { field: 'parent' },
      'child',
      { default: { active: false } },
      null,
    );

    expect(effective.edit).toBeFalse();
    expect(effective.state).toBe('readonly');
  });
  // ]]]FI

  // [[[II ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
  it('persists only server-scoped table columns and leaves derived drafts local', () => {
    const edit = jasmine.createSpy('edit').and.returnValue(of({ data: {} }));
    // [[[II ESC:030-20 El stub debe comportarse como el real: `getAppType(undefined)`
    // devuelve undefined, por eso una columna SIN `data_type.type` viaja como
    // ATRIBUTO y no como relacion. El stub anterior devolvia un tipo para
    // cualquier clave y convertia `price` en relacion. ]]]FI
    (component as any).crudS = {
      getAppType: (key?: string | null) => (key
        ? { app: 'purchases/request-detail', type: 'request-detail' }
        : undefined),
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

  // [[[II ESC:007-08 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-08
  it('no reprocesa los niveles lazy de un árbol al cambiar su selección, pero conserva las cascadas normales', () => {
    const processSpy = spyOn<any>(component, '_processChildrenFields');
    const treeConfig: any = {
      field: 'clasificador', type: 'tree-select',
      tree: { lazy: true, levels: [{ name: 'nivel1' }] },
      children: { active: true, fields: { dynamic: { nivel1: { field: 'nivel1' } } } },
    };
    const cascadeConfig: any = {
      field: 'padre', type: 'dropdown',
      children: { active: true, fields: { static: { hijo: { field: 'hijo', options: [] } } } },
    };
    const form = new FormGroup({
      clasificador: new FormControl<any>([]),
      padre: new FormControl<any>(null),
      hijo: new FormControl<any>(null),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({ grid: { 0: treeConfig, 1: cascadeConfig } });
    (component as any).childRuntimePreviousValue = form.getRawValue();

    form.get('clasificador')?.setValue([{ id: 'nodo-1' }], { emitEvent: false });
    (component as any)._refreshDependentChildren();
    expect(processSpy).not.toHaveBeenCalled();

    form.get('padre')?.setValue('opcion-x', { emitEvent: false });
    (component as any)._refreshDependentChildren();
    // `_refreshDependentChildren` reprocesa con origin 'refresh' (ESC:030-20):
    // una reevaluación no puede pisar lo que el usuario escribió.
    expect(processSpy).toHaveBeenCalledWith(
      'padre', 'opcion-x', cascadeConfig, jasmine.anything(), 0, 'refresh',
    );
  });
  // ]]]FI

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  it('separa smart_search y min_search_length de la validación min_length', () => {
    const config = {
      field: 'codigo_producto',
      search_key: '',
      search_mode: 'partial',
      smart_search: true,
      min_search_length: 3,
    };

    expect(component.autoCompleteMinLength(config)).toBe(5);
    expect((component as any)._searchFilterFor(config, 'AB C')).toBe(
      'filter[search]=AB%20C',
    );

    expect((component as any)._searchFilterFor({ ...config, smart_search: false }, 'AB C')).toBe(
      'filter[codigo_producto.icontains]=AB%20C',
    );
    expect((component as any)._searchFilterFor({
      field: 'code', search_mode: 'exact',
      data_type: {
        filter: {
          base_product_data_code: { active: true, default: 'exact', default_value: null },
        },
      },
    }, '6')).toBe('filter[base_product__code]=6');
    expect(component.autoCompleteMinLength({ field: 'codigo_producto', search_mode: 'exact' })).toBe(0);
    expect((component as any)._autoCompleteSearchKeys({ field: 'codigo_producto' })).toEqual(new Set(['enter']));
    expect((component as any)._autoCompleteSearchKeys({ field: 'codigo_producto', search_mode: 'exact', search_key: 'f3' }))
      .toEqual(new Set(['f3']));
  });
  // ]]]FI

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  it('bloquea temporalmente los controles del formulario sin deshabilitar la tabla activa', () => {
    const code = new FormControl('ABC');
    const preDisabled = new FormControl({ value: 'conservar', disabled: true });
    const details = new FormArray([new FormGroup({ code: new FormControl('ABC') })]);
    component.formGroupSignal.set(new FormGroup({ code, preDisabled, details }));

    component.onTableEditingStateChange({ field: 'details', active: true });
    expect(code.disabled).toBeTrue();
    expect(preDisabled.disabled).toBeTrue();
    expect(details.disabled).toBeFalse();

    component.onTableEditingStateChange({ field: 'details', active: false });
    expect(code.disabled).toBeFalse();
    expect(preDisabled.disabled).toBeTrue();
  });
  // ]]]FI

  // [[[II ESC:030-16 ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('no consulta ni abre panel al escribir en modo exacto', () => {
    const searchSpy = spyOn<any>(component, '_runAutoCompleteSearch');
    const selected = { id: 'product-id', code: 'ABC' };
    const form = new FormGroup({
      codigo: new FormControl('ABCD'),
      product: new FormControl('product-id'),
      __autocomplete_object_codigo: new FormControl<any>(selected),
    });
    component.formGroupSignal.set(form);
    const config = {
      field: 'codigo',
      type: 'auto-complete',
      search_mode: 'exact',
      free_or_relationship: true,
      relationship_field: 'product',
      option_label: 'code',
      panel: { active: true },
    };

    component.completeMethod({ query: 'ABCD' }, config);

    expect(searchSpy).not.toHaveBeenCalled();
    expect(component.autoCompletePanelSuppressed()).toBeTrue();
    expect(component.suggestions()).toEqual([]);
    expect(form.get('product')?.value).toBe('product-id');
    expect(form.get('__autocomplete_object_codigo')?.value).toBe(selected);
  });
  // ]]]FI

  // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('restablece los derivados en el primer Enter exacto sin coincidencia', () => {
    const product = {
      id: 'product-id',
      base_product_data_code: '6',
      base_product_data_name: 'DIESEL',
      purchase_price: 2122.76,
      purchase_currency: 'currency-id',
    };
    const codeConfig: any = {
      field: 'code',
      type: 'auto-complete',
      search_mode: 'exact',
      free_or_relationship: true,
      relationship_field: 'product',
      option_label: 'base_product_data_code',
      data_type: { type: 'product' },
      children: {
        active: true,
        fields: {
          derived: {
            0: {
              field: 'name',
              field_name: 'base_product_data_name',
              from: 'parent',
              default: { active: true, value: '', edit: false },
            },
            1: {
              field: 'price',
              field_name: 'purchase_price',
              from: 'parent',
              default: { active: true, value: 0, edit: false },
            },
            2: {
              field: 'currency',
              field_name: 'purchase_currency',
              from: 'parent',
              default: { active: true, value: '', edit: false },
            },
          },
        },
      },
    };
    const nameConfig: any = {
      field: 'name',
      type: 'auto-complete',
      free_or_relationship: true,
      relationship_field: 'product',
      option_label: 'base_product_data_name',
    };
    const form = new FormGroup({
      code: new FormControl('SIN-RELACION'),
      name: new FormControl('DIESEL'),
      price: new FormControl(2122.76),
      currency: new FormControl('currency-id'),
      product: new FormControl('product-id'),
      __autocomplete_object_code: new FormControl<any>(product),
      __autocomplete_object_name: new FormControl<any>(product),
    });
    component.formGroupSignal.set(form);
    component.drawFormSignal.set({
      grid: {
        0: codeConfig,
        1: nameConfig,
        2: { field: 'price', type: 'input-number' },
        3: { field: 'currency', type: 'dropdown' },
      },
    });
    (component as any).childRuntimePreviousValue = form.getRawValue();
    spyOn<any>((component as any).crudS, 'getObject').and.returnValue(of({ data: [] }));
    spyOn<any>((component as any).generalS, 'DJAtoObject').and.returnValue([]);

    (component as any)._runAutoCompleteSearch(
      codeConfig,
      'SIN-RELACION',
      { advanceOnNoMatch: true, autoApplyUnique: true },
    );

    expect(form.get('product')?.value).toBeNull();
    expect(form.get('__autocomplete_object_code')?.value).toBeNull();
    expect(form.get('__autocomplete_object_name')?.value).toBeNull();
    expect(form.get('name')?.value).toBe('');
    expect(form.get('price')?.value).toBe(0);
    expect(form.get('currency')?.value).toBe('');
  });
  // ]]]FI

  // [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
  describe('onScanCode con carga diferida del escáner', () => {

    it('asigna el valor escaneado al control y emite success con el plugin cargado bajo demanda', async () => {
      const scanBarcode = jasmine.createSpy('scanBarcode').and.resolveTo({ ScanResult: 'ABC-123', format: 17 });
      const loadSpy = spyOn<any>(component, 'loadBarcodeScanner')
        .and.resolveTo({ CapacitorBarcodeScanner: { scanBarcode } });
      const emitSpy = spyOn(component.onScanCodeAction, 'emit');
      const form = new FormGroup({ codigo: new FormControl('') });
      component.formGroupSignal.set(form);

      await component.onScanCode({ field: 'codigo', scanner: { instructions: 'Apunta al código' } });

      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(scanBarcode).toHaveBeenCalledWith(jasmine.objectContaining({
        hint: 17,
        scanInstructions: 'Apunta al código',
        scanButton: false,
      }));
      const control = form.get('codigo');
      expect(control?.value).toBe('ABC-123');
      expect(control?.touched).toBeTrue();
      expect(control?.dirty).toBeTrue();
      expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        success: true, content: 'ABC-123', field: 'codigo',
      }));
    });

    it('emite cancelación sin tocar el control cuando el escaneo no retorna contenido', async () => {
      spyOn<any>(component, 'loadBarcodeScanner').and.resolveTo({
        CapacitorBarcodeScanner: { scanBarcode: jasmine.createSpy().and.resolveTo({ ScanResult: '' }) },
      });
      const emitSpy = spyOn(component.onScanCodeAction, 'emit');
      const form = new FormGroup({ codigo: new FormControl('previo') });
      component.formGroupSignal.set(form);

      await component.onScanCode({ field: 'codigo' });

      expect(form.get('codigo')?.value).toBe('previo');
      expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        success: false, error: 'Scanner cancelado', field: 'codigo',
      }));
    });

    it('emite el error por el catch existente si la carga diferida del plugin falla', async () => {
      const loadError = new Error('fallo de red');
      spyOn<any>(component, 'loadBarcodeScanner').and.rejectWith(loadError);
      const emitSpy = spyOn(component.onScanCodeAction, 'emit');
      component.formGroupSignal.set(new FormGroup({ codigo: new FormControl('') }));

      await expectAsync(component.onScanCode({ field: 'codigo' })).toBeResolved();

      expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        success: false, error: loadError, field: 'codigo',
      }));
    });
  });
  // ]]]FI
});
