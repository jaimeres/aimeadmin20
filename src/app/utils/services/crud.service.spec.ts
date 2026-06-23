import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

import { CRUDService } from './crud.service';
import { ConfigService } from '../../auth/services/config.service';
import { AuthService } from '../../auth/services/auth.service';
import { GeneralService } from './general.service';

describe('CRUDService', () => {
  let service: CRUDService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CRUDService,
        { provide: HttpClient, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: GeneralService, useValue: {} },
        { provide: AuthService, useValue: { config: {} } },
      ],
    });
    service = TestBed.inject(CRUDService);
  });

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
  // ]]]FI
});
