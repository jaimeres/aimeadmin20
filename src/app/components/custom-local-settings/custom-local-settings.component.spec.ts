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
  let crudMock: { getAppType: jasmine.Spy; getObject: jasmine.Spy; sharedModuleScopedKey: (t: string, m?: any) => string };
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
});
