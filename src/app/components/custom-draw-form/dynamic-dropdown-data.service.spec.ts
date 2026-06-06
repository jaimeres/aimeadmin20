import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthService } from '@/auth/services/auth.service';
import { CRUDService } from '@/utils/services/crud.service';
import { FormCacheService } from '@/utils/services/form-cache.service';
import { GeneralService } from '@/utils/services/general.service';
import { SharedDynamicDataService } from '@/utils/services/shared-dynamic-data.service';

import { DynamicDropdownDataService } from './dynamic-dropdown-data.service';

describe('DynamicDropdownDataService', () => {
  let service: DynamicDropdownDataService;
  let sharedS: { data: { [key: string]: any }; drawDropdown: { [key: string]: any } };
  let crudS: jasmine.SpyObj<CRUDService>;
  let generalS: { DJAtoObject: () => any[]; isMobile: () => boolean; isDesktopApp: () => boolean };
  let currentPlatform: 'mobile' | 'desktop' | 'web';

  beforeEach(() => {
    sharedS = { data: {}, drawDropdown: {} };
    crudS = jasmine.createSpyObj<CRUDService>('CRUDService', [
      'buildDropdownFilterString',
      'getAppType',
      'getObject',
    ]);
    crudS.buildDropdownFilterString.and.returnValue('');
    crudS.getAppType.and.returnValue({});
    crudS.getObject.and.returnValue(of({}) as any);
    currentPlatform = 'web';
    generalS = {
      DJAtoObject: () => [],
      isMobile: () => currentPlatform === 'mobile',
      isDesktopApp: () => currentPlatform === 'desktop',
    };

    TestBed.configureTestingModule({
      providers: [
        DynamicDropdownDataService,
        { provide: CRUDService, useValue: crudS },
        { provide: SharedDynamicDataService, useValue: sharedS },
        {
          provide: GeneralService,
          useValue: generalS,
        },
        {
          provide: AuthService,
          useValue: {
            userId: () => null,
            username: () => null,
          },
        },
        {
          provide: FormCacheService,
          useValue: {
            getAppVersion: () => Promise.resolve('test'),
          },
        },
      ],
    });
    service = TestBed.inject(DynamicDropdownDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:016-03 DOC:docs/documents/2026-06-02_016_dynamic-dropdown-data-service.md#escenario-03
  it('should normalize local option label and value aliases', async () => {
    const element = {
      field: 'person',
      option_label: 'first_name,last_name',
      option_label_separator: ' ',
      option_value: 'value',
      data_type: {
        options: [
          { id: 1, first_name: 'Ada', last_name: 'Lovelace' },
        ],
      },
    };

    const options = await service.dataDropdownExists(element, { type: 'hr' });

    expect(options).not.toBeFalse();
    expect((options as any[])[0]).toEqual(jasmine.objectContaining({
      value: 1,
      first_namelast_name: 'Ada Lovelace',
    }));
    expect(crudS.getObject).not.toHaveBeenCalled();
  });

  it('should read namespaced shared cache before unprefixed cache', async () => {
    sharedS.data['sales:status'] = [{ value: 'A', label: 'Active' }];
    sharedS.data['status'] = [{ value: 'I', label: 'Inactive' }];

    const options = await service.dataDropdownExists({
      field: 'status',
      option_label: 'label',
      option_value: 'id',
    }, { type: 'sales' });

    expect((options as any[])[0]).toEqual(jasmine.objectContaining({
      id: 'A',
      label: 'Active',
    }));
  });
  // ]]]FI

  // [[[II ESC:019-02 DOC:docs/documents/2026-06-04_019_dropdown-cache-platform-read.md#escenario-02
  it('should prefer platform read config and require positive ttl', () => {
    currentPlatform = 'web';

    const element = {
      cache: {
        desktop: { read: true, time: 30 },
        web: { read: true, time: 0 },
      },
    };

    expect((service as any).isMobileCacheEnabled(element, { isCreate: true })).toBeFalse();

    element.cache.web.time = 15;
    expect((service as any).isMobileCacheEnabled(element, { isCreate: true })).toBeTrue();
  });

  it('should fallback between desktop and web cache configs', () => {
    const element = {
      cache: {
        desktop: { read: { creation: true, edition: false }, time: 60 },
      },
    };

    currentPlatform = 'web';
    expect((service as any).isMobileCacheEnabled(element, { isCreate: true })).toBeTrue();
    expect((service as any).isMobileCacheEnabled(element, { isCreate: false })).toBeFalse();

    currentPlatform = 'desktop';
    expect((service as any).isMobileCacheEnabled(element, { isCreate: true })).toBeTrue();
  });

  it('should keep legacy active config as fallback when read is missing', () => {
    currentPlatform = 'mobile';

    const element = {
      cache: {
        mobile: { active: true, edition: true, time: 10 },
      },
    };

    expect((service as any).isMobileCacheEnabled(element, { isCreate: false })).toBeTrue();
  });
  // ]]]FI

  // [[[II ESC:012-02 DOC:docs/documents/2026-06-02_012_custom-draw-form-dropdown-inflight-cache.md#escenario-02
  it('should reuse in-flight dropdown response without marking shared callers as stale', async () => {
    const response$ = new Subject<any>();
    crudS.getAppType.and.returnValue({ app: 'people/person', type: 'person' });
    crudS.getObject.and.returnValue(response$.asObservable() as any);
    generalS.DJAtoObject = () => [{ id: 1, name: 'Ada' }];

    const element = {
      field: 'responsible',
      type: 'listbox',
      option_label: 'name',
      option_value: 'id',
      data_type: { type: 'person' },
    };

    const first = service.loadServerOptions(element, { type: 'maintenance', isCreate: false });
    const second = service.loadServerOptions(element, { type: 'maintenance', isCreate: false });

    response$.next({});
    response$.complete();

    const [firstOptions, secondOptions] = await Promise.all([first, second]);

    expect(crudS.getObject).toHaveBeenCalledTimes(1);
    expect(firstOptions).not.toBeFalse();
    expect(secondOptions).not.toBeFalse();
    expect(firstOptions as any[]).toEqual(secondOptions as any[]);
    expect((firstOptions as any[])[0]).toEqual(jasmine.objectContaining({ id: 1, name: 'Ada' }));
  });
  // ]]]FI
});
