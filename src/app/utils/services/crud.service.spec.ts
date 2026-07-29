import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { CRUDService } from './crud.service';
import { ConfigService } from '../../auth/services/config.service';
import { AuthService } from '../../auth/services/auth.service';
import { GeneralService } from './general.service';

describe('CRUDService', () => {
  let service: CRUDService;
  // [[[II ESC:031-05 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-05
  let httpMock: { options: jasmine.Spy };

  beforeEach(() => {
    httpMock = { options: jasmine.createSpy('options') };
    TestBed.configureTestingModule({
      providers: [
        CRUDService,
        { provide: HttpClient, useValue: httpMock },
        { provide: ConfigService, useValue: {} },
        { provide: GeneralService, useValue: {} },
        { provide: AuthService, useValue: { config: {}, userId: () => 'user-1', username: () => 'usuario' } },
      ],
    });
    service = TestBed.inject(CRUDService);
  });
  // ]]]FI

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  it('buildFilterString keeps simple cols.filter bound to the container field', () => {
    const filter = service.buildFilterString({
      is_active: {
        cols: {
          filter: {
            active: true,
            ops: ['exact', 'isnull'],
            default: 'exact',
            default_value: true,
          },
        },
      },
    });

    expect(filter).toBe('filter[is_active]=true');
  });

  it('buildFilterString supports explicit cols.filter targets for relation fields', () => {
    const filter = service.buildFilterString({
      status: {
        cols: {
          filter: {
            logic: 'and',
            code: {
              active: true,
              ops: ['exact', 'in'],
              default: 'in',
              default_value: ['P'],
            },
          },
        },
      },
    });

    expect(filter).toBe('filter[status__code.in]=P');
  });

  it('buildFilterString prefixes explicit cols.filter targets and normalizes nested _data_ paths', () => {
    const filter = service.buildFilterString({
      status: {
        cols: {
          filter: {
            code_data_titulo: {
              active: true,
              ops: ['exact'],
              default: 'exact',
              default_value: 'algo',
            },
          },
        },
      },
    });

    expect(filter).toBe('filter[status__code__titulo]=algo');
  });

  it('buildDropdownFilterString keeps data_type.filter explicit map behavior', () => {
    const filter = service.buildDropdownFilterString({
      logic: 'and',
      code: {
        active: true,
        ops: ['exact', 'in'],
        default: 'in',
        default_value: ['P'],
      },
    });

    expect(filter).toBe('filter[code.in]=P');
  });

  // [[[II ESC:030-17 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-17
  it('buildConfiguredSearchFilter binds the query to a declarative relation path', () => {
    const filter = service.buildConfiguredSearchFilter({
      logic: 'and',
      base_product_data_code: {
        active: true,
        ops: ['exact'],
        default: 'exact',
        default_value: null,
      },
    }, '6', 'filter[code.iexact]=6');

    expect(filter).toBe('filter[base_product__code]=6');
  });

  it('buildConfiguredSearchFilter preserves the control fallback without a query binding', () => {
    const filter = service.buildConfiguredSearchFilter({
      is_active: { active: true, default: 'exact', default_value: true },
    }, '6', 'filter[code.iexact]=6');

    expect(filter).toBe('filter[is_active]=true&filter[code.iexact]=6');
  });
  // ]]]FI
  // ]]]FI

  // [[[II ESC:031-05 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-05
  it('options() reutiliza la respuesta en memoria de sesión y entrega clones prístinos', (done) => {
    const resp = { data: { actions: { POST: { name: { type: 'string' } } } } };
    httpMock.options.and.returnValue(of(resp));

    service.options('assets/asset').subscribe((first: any) => {
      expect(httpMock.options).toHaveBeenCalledTimes(1);
      first.data.actions.POST.name.mutado = true;

      service.options('assets/asset').subscribe((second: any) => {
        expect(httpMock.options).toHaveBeenCalledTimes(1);
        expect(second.data.actions.POST.name.mutado).toBeUndefined();
        expect(second.data.actions.POST.name.type).toBe('string');
        done();
      });
    });
  });

  it('options() no comparte la memoria entre endpoints distintos', (done) => {
    httpMock.options.and.callFake((url: string) => of({ data: { url } }));

    service.options('assets/asset').subscribe(() => {
      service.options('assets/asset-type').subscribe(() => {
        expect(httpMock.options).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });
  // ]]]FI
});
