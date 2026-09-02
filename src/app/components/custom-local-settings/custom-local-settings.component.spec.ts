import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';

import { CustomLocalSettingsComponent } from './custom-local-settings.component';
import {
  CHILD_FILTER_SCOPE_OPTIONS,
  CODE_SCOPE_OPTIONS,
  GRID_SPAN_MD_OPTIONS,
  GRID_SPAN_OPTIONS,
  SCOPE_EDITION_OPTIONS,
  schemaForType,
} from './type-schemas';
import { CRUDService } from '../../utils/services/crud.service';
import { GeneralService } from '../../utils/services/general.service';
import { SharedDynamicDataService } from '../../utils/services/shared-dynamic-data.service';
import { MessageService } from '../services/message.service';

describe('CustomLocalSettingsComponent', () => {
  let component: CustomLocalSettingsComponent;
  let fixture: ComponentFixture<CustomLocalSettingsComponent>;
  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  let crudMock: { getAppType: jasmine.Spy; getObject: jasmine.Spy; sharedModuleScopedKey: (t: string, m?: any) => string; authS: { config: Record<string, any> } };
  let generalMock: { DJAtoObject: jasmine.Spy };
  let sharedMock: { data: Record<string, any>; drawDropdown: Record<string, any> };

  const STATUS_OPTIONS = [
    { id: '1', code: 'P', name: 'Pendiente' },
    { id: '2', code: 'PR', name: 'Programado' },
  ];

  /** Config real de `status` en el servidor: filtro explicito sobre `code`. */
  const statusField = () => ({
    module: 'MA',
    cols: [{ field: 'status__name', header: 'Estado' }],
    fields: {
      status: {
        type: 'dropdown',
        label: 'Estado',
        data_type: { type: 'status' },
        cols: {
          label: 'Estado',
          filter: {
            code: {
              active: true,
              ops: ['exact', 'in'],
              default: 'in',
              default_value: ['P', 'PR'],
            },
          },
        },
      },
    },
  });

  beforeEach(async () => {
    crudMock = {
      getAppType: jasmine.createSpy('getAppType').and.callFake((key: string) =>
        key === 'status' ? { app: 'status/status', type: 'status' } : undefined
      ),
      getObject: jasmine.createSpy('getObject').and.returnValue(of({ data: [] })),
      sharedModuleScopedKey: (type: string, module?: any) => (module ? `${type}_${module}` : type),
      // El editor lee los campos del recurso destino de la config ya cargada.
      authS: {
        config: {
          asset: {
            fields: {
              year: { type: 'input-number', label: 'Año', readonly: false, cols: { label: 'Año' } },
              serial: { type: 'input-text', label: 'Serie', cols: { label: 'Serie' } },
              tabla: { type: 'table', label: 'Partidas' },
            },
          },
        },
      },
    };
    generalMock = {
      DJAtoObject: jasmine.createSpy('DJAtoObject').and.returnValue(STATUS_OPTIONS),
    };
    sharedMock = { data: {}, drawDropdown: {} };

    await TestBed.configureTestingModule({
      imports: [CustomLocalSettingsComponent],
      providers: [
        { provide: CRUDService, useValue: crudMock },
        { provide: GeneralService, useValue: generalMock },
        { provide: SharedDynamicDataService, useValue: sharedMock },
        { provide: MessageService, useValue: { changeMessage: () => { } } },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(CustomLocalSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  // ]]]FI

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps default.edit visible independently from default.active', () => {
    for (const type of ['input-text', 'date', 'toggle-button']) {
      const editDef = schemaForType(type)
        .flatMap(section => section.defs)
        .find(def => def.path === 'default.edit');
      expect(editDef).toBeDefined();
      expect(editDef?.showIf).toBeUndefined();
    }
  });

  // [[[II ESC:031-08 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-08
  describe('contratos cerrados del editor orientado a custom-draw-form', () => {
    it('solo ofrece clases existentes de la cuadricula de 12 columnas', () => {
      expect(GRID_SPAN_OPTIONS.map(option => option.value)).toEqual(
        Array.from({ length: 12 }, (_, index) => `col-span-${index + 1}`)
      );
      expect(GRID_SPAN_MD_OPTIONS.map(option => option.value)).toEqual(
        Array.from({ length: 12 }, (_, index) => `md:col-span-${index + 1}`)
      );
    });

    it('mantiene separados los tres contratos de scope', () => {
      expect(CHILD_FILTER_SCOPE_OPTIONS.map(option => option.value)).toEqual(['client', 'server', 'auto']);
      expect(SCOPE_EDITION_OPTIONS.map(option => option.value)).toEqual(['server', 'local']);
      expect(CODE_SCOPE_OPTIONS.map(option => option.value)).toEqual([
        'global', 'prefix', 'suffix', 'fiscal_year',
        'global_prefix', 'global_suffix', 'global_fiscal_year',
        'global_prefix_suffix', 'global_prefix_fiscal_year', 'global_suffix_fiscal_year',
        'prefix_suffix', 'prefix_fiscal_year', 'suffix_fiscal_year',
        'prefix_suffix_fiscal_year', 'all',
      ]);
    });

    it('expone las clases como selectores y respeta móvil/escritorio', () => {
      const defs = schemaForType('input-text').flatMap(section => section.defs);
      const mobile = defs.find(def => def.path === 'class');
      const desktop = defs.find(def => def.path === 'class_md');

      expect(mobile?.kind).toBe('select');
      expect(mobile?.label).toBe('Ancho móvil');
      expect(desktop?.kind).toBe('select');
      expect(desktop?.label).toBe('Ancho escritorio');
    });

    it('impide aplicar un valor cerrado ajeno al schema', () => {
      component.ngOnChanges({
        field: {
          currentValue: {
            fields: {
              code: {
                type: 'input-text', field: 'code', label: 'Código',
                class: 'col-span-6', class_md: 'md:col-span-3',
                default: { active: true, edit: false, scope: 'all' },
                cols: { label: 'Código' },
              },
            },
            cols: [{ field: 'code', header: 'Código' }],
            draw: { general: { grid: { 1: { field: 'code' } } } },
          },
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      } as any);
      component.openAdvanced('code');
      const scopeControl = component.advancedForm.get('adv_default__scope') as FormControl<any> | null;

      scopeControl?.setValue('create');

      expect(scopeControl?.hasError('closedOption')).toBeTrue();
      expect(component.advancedForm.invalid).toBeTrue();
    });

    it('reconstruye el mismo contrato desde los formularios reactivos de cada fila', () => {
      component.ngOnChanges({
        field: {
          currentValue: {
            fields: {
              name: {
                type: 'input-text', field: 'name', label: 'Nombre',
                cols: { label: 'Nombre', hide: false, hide_mobile: true, sortable: true, locked: false },
              },
            },
            cols: [{ field: 'name', header: 'Nombre' }],
            draw: {
              general: { grid: { 1: { field: 'name', class: 'col-span-6', class_md: 'md:col-span-3' } } },
            },
          },
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      } as any);
      const row = component.unifiedRows()[0];

      row.form.patchValue({
        label: 'Nombre completo',
        sortable: false,
        hideMobile: false,
        gridSpan: 12,
        gridSpanMd: 6,
      });
      const saved = component['_buildModifiedField']();

      expect(saved.fields.name.cols.label).toBe('Nombre completo');
      expect(saved.fields.name.cols.sortable).toBeFalse();
      expect(saved.fields.name.cols.hide_mobile).toBeFalse();
      expect(saved.draw.general.grid['1'].class).toBe('col-span-12');
      expect(saved.draw.general.grid['1'].class_md).toBe('md:col-span-6');
    });
  });
  // ]]]FI

  // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
  describe('secciones habilitadas por plataforma', () => {
    it('leaves only filters available and selects it for the mobile contract', () => {
      component.activeMainTab.set('layout');

      component.ngOnChanges({
        sectionConfiguration: {
          currentValue: {
            active: true,
            dialog: false,
            layout: false,
            behavior: false,
            filters: true,
          },
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      } as any);

      expect(component.availableMainTabs()).toEqual(['filters']);
      expect(component.activeMainTab()).toBe('filters');
    });

    it('keeps all editor sections available for the web contract', () => {
      component.ngOnChanges({
        sectionConfiguration: {
          currentValue: {
            active: true,
            dialog: true,
            layout: true,
            behavior: true,
            filters: true,
          },
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      } as any);

      expect(component.availableMainTabs()).toEqual([
        'dialog', 'layout', 'behavior', 'filters',
      ]);
    });

    it('preserves the platform configuration when rebuilding the persistent payload', () => {
      const configuration = {
        mobile: { active: true, dialog: false, layout: false, behavior: false, filters: true },
        web: { active: true, dialog: true, layout: true, behavior: true, filters: true },
        desktop: { active: true, dialog: true, layout: true, behavior: true, filters: true },
      };
      component.ngOnChanges({
        field: {
          currentValue: { general: { configuration }, fields: {}, cols: [], draw: {} },
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      } as any);

      expect(component['_buildModifiedField']().general.configuration).toBe(configuration);
    });
  });
  // ]]]FI

  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  describe('filtro explicito con lista de opciones del servidor', () => {

    beforeEach(() => {
      component.ngOnChanges({
        field: { currentValue: statusField(), previousValue: null, firstChange: true, isFirstChange: () => true },
      } as any);
    });

    it('resuelve el recurso de opciones desde el data_type del campo contenedor', () => {
      const col = component.filterableColMap()['status::code'];
      expect(col).toBeDefined();
      expect(col.option_data_type).toBe('status');
      expect(component.hasOptionList('status::code')).toBeTrue();
    });

    it('acota la consulta al modulo declarado por el componente', () => {
      expect(crudMock.getObject).toHaveBeenCalledWith({
        app: 'status/status', type: 'status', filter: 'filter[module]=MA',
      });
      expect(component.optionsFor('status::code')).toEqual(STATUS_OPTIONS);
    });

    it('consulta una sola vez por app aunque se reciba la config varias veces', () => {
      crudMock.getObject.calls.reset();
      component.ngOnChanges({
        field: { currentValue: statusField(), previousValue: null, firstChange: false, isFirstChange: () => false },
      } as any);
      component.ngOnChanges({
        field: { currentValue: statusField(), previousValue: null, firstChange: false, isFirstChange: () => false },
      } as any);

      expect(crudMock.getObject).not.toHaveBeenCalled();
    });

    it('vuelve a consultar acotado cuando cambia el modulo de la app', () => {
      crudMock.getObject.calls.reset();
      component.ngOnChanges({
        field: {
          currentValue: { ...statusField(), module: 'AC' },
          previousValue: null, firstChange: false, isFirstChange: () => false,
        },
      } as any);

      expect(crudMock.getObject).toHaveBeenCalledTimes(1);
      expect(crudMock.getObject).toHaveBeenCalledWith({
        app: 'status/status', type: 'status', filter: 'filter[module]=AC',
      });
    });

    it('publica el catalogo acotado en la fuente compartida por app', () => {
      expect(sharedMock.data['status_MA']).toEqual(STATUS_OPTIONS);
    });

    it('reutiliza la fuente compartida sin volver a consultar al servidor', () => {
      crudMock.getObject.calls.reset();
      const yaCargado = [{ id: '9', code: 'X', name: 'Ya cargado' }];
      sharedMock.data['status_AC'] = yaCargado;

      component.ngOnChanges({
        field: {
          currentValue: { ...statusField(), module: 'AC' },
          previousValue: null, firstChange: false, isFirstChange: () => false,
        },
      } as any);

      expect(crudMock.getObject).not.toHaveBeenCalled();
      expect(component.optionsFor('status::code')).toEqual(yaCargado);
    });

    it('no consulta el catalogo completo cuando aun no hay modulo declarado', () => {
      crudMock.getObject.calls.reset();
      const noModule: any = statusField();
      delete noModule.module;
      component.ngOnChanges({
        field: { currentValue: noModule, previousValue: null, firstChange: false, isFirstChange: () => false },
      } as any);

      expect(crudMock.getObject).not.toHaveBeenCalled();
    });

    it('toma etiqueta y clave de la configuracion, sin nombres fijos en el codigo', () => {
      const col = component.filterableColMap()['status::code'];
      expect(component.getOptionLabel(col)).toBe('name');
      expect(component.getOptionValue(col)).toBe('code');

      const withConfig = { ...col, filter: { ...col.filter, option_label: 'display_name', option_value: 'id' } };
      expect(component.getOptionLabel(withConfig)).toBe('display_name');
      expect(component.getOptionValue(withConfig)).toBe('id');
    });

    it('conserva el contrato guardado: default_value sigue siendo el arreglo de claves', () => {
      expect(component.getControl('fv_status::code').value).toEqual(['P', 'PR']);

      const saved = component['_buildModifiedField']();
      expect(saved.fields.status.cols.filter.code.default_value).toEqual(['P', 'PR']);
      expect(saved.fields.status.cols.filter.code.default).toBe('in');
      expect(saved.fields.status.cols.filter.code.active).toBeTrue();
    });

    it('no aplica la lista de opciones a filtros sin recurso resoluble', () => {
      component.ngOnChanges({
        field: {
          currentValue: {
            cols: [{ field: 'code', header: 'Código' }],
            fields: {
              code: {
                type: 'input-text',
                cols: { label: 'Código', filter: { active: true, ops: ['in'], default: 'in' } },
              },
            },
          },
          previousValue: null, firstChange: false, isFirstChange: () => false,
        },
      } as any);

      expect(component.hasOptionList('code')).toBeFalse();
    });
  });
  // ]]]FI

  describe('alta de campos', () => {

    /** Modulo con una relacion a `asset` etiquetada «Bomba». */
    const moduloConRelacion = () => ({
      app: 'maintenance',
      config_app: 'assets',
      general: {},
      draw: { dialog: {}, general: { grid: {} } },
      cols: [{ field: 'asset__name', header: 'Bomba' }],
      fields: {
        asset: { type: 'dropdown', label: 'Bomba', data_type: { type: 'asset' }, cols: { label: 'Bomba' } },
      },
    });

    beforeEach(() => {
      component.ngOnChanges({
        field: {
          currentValue: moduloConRelacion(),
          previousValue: null, firstChange: true, isFirstChange: () => true,
        },
      } as any);
    });

    it('ofrece las relaciones por su etiqueta, no por la clave', () => {
      expect(component.relationOptions()).toEqual([
        { label: 'Bomba', value: 'asset', dataType: 'asset' },
      ]);
    });

    it('ofrece los datos del recurso destino y descarta los no listables', () => {
      component.addFieldForm.controls.relation.setValue('asset');
      const etiquetas = component.relatedFieldOptions().map(o => o.label);
      expect(etiquetas).toEqual(['Año', 'Serie']);      // `tabla` es SKIP_TYPE
      expect(component.relatedFieldOptions()).toContain({ label: 'Año', value: 'year' });
    });

    it('pide la configuración del recurso destino cuando no está en memoria', () => {
      // La config de un módulo NO visitado no está cargada: hay que pedirla.
      const cargado: Record<string, boolean> = { asset: false };
      crudMock.authS = {
        ...crudMock.authS,
        isConfigModuleLoaded: (m: string) => !!cargado[m],
        ensureConfigModules: jasmine.createSpy('ensureConfigModules').and.callFake((mods: string[]) => {
          mods.forEach(m => (cargado[m] = true));
          return of(true);
        }),
      } as any;

      component.openAddField('relation');
      component.addFieldForm.controls.relation.setValue('asset');

      expect((crudMock.authS as any).ensureConfigModules).toHaveBeenCalledWith(['asset']);
      expect(component.relatedFieldOptions().map(o => o.label)).toEqual(['Año', 'Serie']);
      expect(component.loadingRelated()).toBeFalse();
    });

    it('no vuelve a pedirla si el módulo ya está cargado', () => {
      crudMock.authS = {
        ...crudMock.authS,
        isConfigModuleLoaded: () => true,
        ensureConfigModules: jasmine.createSpy('ensureConfigModules'),
      } as any;

      component.openAddField('relation');
      component.addFieldForm.controls.relation.setValue('asset');

      expect((crudMock.authS as any).ensureConfigModules).not.toHaveBeenCalled();
      expect(component.relatedFieldOptions().length).toBe(2);
    });

    it('limpia el dato elegido al cambiar de relación', () => {
      component.openAddField('relation');
      component.addFieldForm.controls.relation.setValue('asset');
      component.addFieldForm.controls.relatedField.setValue('year');

      component.addFieldForm.controls.relation.setValue('');
      expect(component.addFieldForm.controls.relatedField.value).toBe('');
      expect(component.relatedFieldOptions()).toEqual([]);
    });

    it('expande la relación como solo lectura y registra el prefijo', () => {
      component.openAddField('relation');
      component.addFieldForm.controls.relation.setValue('asset');
      component.addFieldForm.controls.relatedField.setValue('year');
      component.applyAddField();

      const campo = component.fieldSignal().fields['asset_data_year'];
      expect(campo).toBeDefined();
      expect(campo.readonly).toBeTrue();
      expect(campo.required).toBeFalse();
      expect(campo.label).toBe('Bomba · Año');
      expect(campo.type).toBe('input-number');       // heredado del recurso destino

      expect(component.fieldSignal().draw.fields_prefixes).toEqual([
        { asset_data_: { data_type: 'asset', kind: 'parent', filter: 'asset' } },
      ]);
      expect(component.addFieldMode()).toBeNull();
    });

    it('no duplica el campo ni el prefijo', () => {
      for (let i = 0; i < 2; i++) {
        component.openAddField('relation');
        component.addFieldForm.controls.relation.setValue('asset');
        component.addFieldForm.controls.relatedField.setValue('year');
        component.applyAddField();
      }
      expect(component.fieldSignal().draw.fields_prefixes.length).toBe(1);
    });

    it('crea el campo libre con el prefijo del destino, sin exponerlo', () => {
      component.openAddField('free');
      component.addFieldForm.patchValue({
        label: 'Número de serie', target: 'parent_form_data_', type: 'input-text',
      });
      component.applyAddField();

      const campo = component.fieldSignal().fields['parent_form_data_NUMERO_DE_SERIE'];
      expect(campo).toBeDefined();
      expect(campo.label).toBe('Número de serie');    // el usuario solo ve esto
      expect(campo.type).toBe('input-text');
      expect(campo.cols.label).toBe('Número de serie');
    });

    it('guarda la lista de valores cuando el tipo la usa', () => {
      component.openAddField('free');
      component.addFieldForm.patchValue({
        label: 'Prioridad', type: 'dropdown-choice',
        options: '[{"id":"A","name":"Alta"}]',
      });
      expect(component.freeFieldUsesOptions()).toBeTrue();
      component.applyAddField();

      const campo = component.fieldSignal().fields['form_fields_data_PRIORIDAD'];
      expect(campo.data_type.options).toEqual([{ id: 'A', name: 'Alta' }]);
    });

    it('rechaza una lista de valores mal formada', () => {
      component.openAddField('free');
      component.addFieldForm.patchValue({ label: 'Prioridad', type: 'dropdown-choice', options: '{no json' });
      component.applyAddField();

      expect(component.fieldSignal().fields['form_fields_data_PRIORIDAD']).toBeUndefined();
      expect(component.addFieldMode()).toBe('free');   // el diálogo sigue abierto
    });

    it('el campo agregado aparece como fila del editor', () => {
      component.openAddField('relation');
      component.addFieldForm.controls.relation.setValue('asset');
      component.addFieldForm.controls.relatedField.setValue('serial');
      component.applyAddField();

      const fila = component.unifiedRows().find(r => r.field === 'asset_data_serial');
      expect(fila).toBeDefined();
      expect(fila!.header).toBe('Bomba · Serie');
    });
  });

  describe('payload para el servidor', () => {

    /** Igual que la config real: la columna llega como `status__name`. */
    const campoConRelacion = () => ({
      ...statusField(),
      app: 'maintenance',
      config_app: 'assets',
      draw: { dialog: {}, general: { grid: {} } },
      general: {},
    });

    beforeEach(() => {
      component.ngOnChanges({
        field: {
          currentValue: campoConRelacion(),
          previousValue: null, firstChange: true, isFirstChange: () => true,
        },
      } as any);
    });

    it('agrupa la columna `__name` y el campo en UNA sola fila', () => {
      const filas = component.unifiedRows().filter(r => r.field === 'status');
      expect(filas.length).toBe(1);
      expect(filas[0].colField).toBe('status__name');
      expect(component.unifiedRows().some(r => r.field === 'status__name')).toBeFalse();
    });

    it('envía al servidor el campo sin sufijo y anidado bajo la app', () => {
      const payload = component['_buildServerPayload'](component['_buildModifiedField']());

      expect(Object.keys(payload!)).toEqual(['assets']);
      expect(Object.keys(payload!['assets'])).toEqual(['maintenance']);

      const recurso = payload!['assets']['maintenance'];
      expect(recurso.cols).toEqual({ 0: { field: 'status' } });
      expect(recurso.fields.status).toBeDefined();
      expect(recurso.app).toBeUndefined();
      expect(recurso.module).toBeUndefined();
      expect(recurso.config_app).toBeUndefined();
    });

    it('escribe los metadatos de la columna en el campo del servidor', () => {
      const fila = component.unifiedRows().find(r => r.field === 'status')!;
      fila.form.get('label')!.setValue('Situación');
      fila.form.get('sortable')!.setValue(false);

      const recurso = component['_buildServerPayload'](component['_buildModifiedField']())!['assets']['maintenance'];
      expect(recurso.fields.status.cols.label).toBe('Situación');
      expect(recurso.fields.status.cols.sortable).toBeFalse();
    });

    it('la tabla del cliente conserva la clave con sufijo', () => {
      const local = component['_buildModifiedField']();
      expect(local.cols.map((c: any) => c.field)).toEqual(['status__name']);
    });

    it('reconstruye el grid con solo la colocación, no la config del campo', () => {
      // Forma REAL que deja el aplanado del cliente: la entrada del grid es la
      // configuración completa del campo más `key`, y su `field` puede no ser
      // el del grid (o faltar).
      component.ngOnChanges({
        field: {
          currentValue: {
            ...campoConRelacion(),
            draw: {
              dialog: {},
              fields_prefixes: [{ status_data_: { kind: 'child' } }],
              general: {
                grid: {
                  62: { key: 'status', type: 'dropdown', label: 'Estado', cache: {}, class: 'col-span-6' },
                  63: { key: 'code', field: '', type: 'input-text', hide: true },
                },
              },
            },
          },
          previousValue: null, firstChange: false, isFirstChange: () => false,
        },
      } as any);

      const recurso = component['_buildServerPayload'](component['_buildModifiedField']())!['assets']['maintenance'];
      const entradas = Object.values(recurso.draw.general.grid) as any[];

      expect(entradas.every(e => typeof e.field === 'string' && e.field.length > 0)).toBeTrue();
      expect(entradas.every(e => e.type === undefined && e.cache === undefined && e.key === undefined)).toBeTrue();
      expect(recurso.draw.fields_prefixes).toBeUndefined();
      expect(recurso.fields_prefixes).toEqual([{ status_data_: { kind: 'child' } }]);
    });

    it('sin app resoluble no envía nada', () => {
      component.ngOnChanges({
        field: {
          currentValue: { ...campoConRelacion(), config_app: undefined },
          previousValue: null, firstChange: false, isFirstChange: () => false,
        },
      } as any);
      expect(component['_buildServerPayload'](component['_buildModifiedField']())).toBeNull();
    });
  });
});
