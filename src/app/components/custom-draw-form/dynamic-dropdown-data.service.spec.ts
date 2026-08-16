import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthService } from '@/auth/services/auth.service';
import { Preferences } from '@capacitor/preferences';
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

  it('should log cache metadata and every option only for the asset search', () => {
    const info = spyOn(console, 'info');
    (service as any).assetCacheDebug.set({ source: 'shared-data', requestVersion: 3, optionCount: 2 });
    const options = [
      { id: 1, name: 'BP0696' },
      { id: 2, name: 'BP0700' },
    ];

    service.logAssetSearch(
      { field: 'asset', filter_by: 'name', option_label: 'name', option_value: 'id' },
      { filter: 'BP0696' },
      options,
    );

    expect(info).toHaveBeenCalledWith('[AssetComboDebug][search]', jasmine.objectContaining({
      field: 'asset',
      search: 'BP0696',
      filterBy: 'name',
      cache: jasmine.objectContaining({ source: 'shared-data', requestVersion: 3 }),
      optionCount: 2,
      values: [1, 2],
      options,
    }));

    info.calls.reset();
    service.logAssetSearch({ field: 'responsible' }, { filter: 'Ada' }, options);
    expect(info).not.toHaveBeenCalled();
  });

  // [[[II ESC:001-18 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-18
  it('should keep real filters and place the validated reference context in the route', async () => {
    crudS.getAppType.and.callFake((type: any) => type === 'inventory-movement-detail'
      ? { app: 'inventories/inventory-movement-detail', type }
      : { app: 'assets/asset', type: 'asset' });
    (crudS as any).type = 'inventory-movement-detail';
    (crudS as any).app = 'inventories/inventory-movement-detail';
    crudS.buildDropdownFilterString.and.returnValue('filter[is_active.exact]=true');
    crudS.getObject.and.returnValue(of({ data: [] }) as any);
    generalS.DJAtoObject = () => [{ id: 'asset-2', name: 'BP0696' }];

    const rows = await service.searchAdditionalOptions({
      field: 'asset',
      type: 'dropdown',
      option_label: 'name',
      option_value: 'id',
      data_type: { type: 'asset', filter: { is_active: true } },
      additional_search: {
        active: true,
        subsidiaries: { filter: {} },
        autocomplete: { by: 'search', min_search_length: 5, limit: 25 },
      },
    }, 'BP0696');

    expect(rows).toEqual([jasmine.objectContaining({ id: 'asset-2', name: 'BP0696' })]);
    expect(crudS.getObject).toHaveBeenCalledWith(jasmine.objectContaining({
      app: 'assets/asset/reference-search/inventories/inventory-movement-detail/asset',
      type: 'asset',
      limit: 25,
      filter: 'filter[is_active.exact]=true&filter[search]=BP0696',
    }));
  });

  it('should not issue additional searches for choice or dynamic fields', async () => {
    crudS.getAppType.and.returnValue({ app: 'assets/asset', type: 'asset' });
    const config = {
      field: 'asset',
      type: 'dropdown-choice',
      data_type: { type: 'asset' },
      additional_search: { active: true },
    };

    expect(await service.searchAdditionalOptions(config, 'BP0696')).toEqual([]);
    expect(await service.searchAdditionalOptions({
      ...config,
      type: 'dropdown',
      field: 'parent_form_data_ASSET',
    }, 'BP0696')).toEqual([]);
    expect(await service.searchAdditionalOptions({
      ...config,
      type: 'dropdown',
      subsidiaries: undefined,
      additional_search: { active: true, subsidiaries: true },
    }, 'BP0696')).toEqual([]);
    expect(crudS.getObject).not.toHaveBeenCalled();
  });
  // ]]]FI

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

  // [[[II ESC:013-03 DOC:docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md#escenario-03
  it('should not reuse legacy drawDropdown memory for server fields without the current query scope', async () => {
    crudS.getAppType.and.returnValue({ app: 'assets', type: 'asset' });
    crudS.buildDropdownFilterString.and.returnValue('status=active');
    generalS.DJAtoObject = () => [{ id: 2, name: 'Current' }];
    sharedS.drawDropdown['maintenance:asset'] = [{ id: 1, name: 'Stale' }];

    const element = {
      field: 'asset',
      option_label: 'name',
      option_value: 'id',
      data_type: {
        type: 'asset',
        filter: { status: 'active' },
      },
    };

    const legacyMemory = await service.dataDropdownExists(element, { type: 'maintenance' });
    expect(legacyMemory).toBeFalse();

    const loaded = await service.loadServerOptions(element, { type: 'maintenance' });
    expect((loaded as any[])[0]).toEqual(jasmine.objectContaining({ id: 2, name: 'Current' }));

    const scopedMemory = await service.dataDropdownExists(element, { type: 'maintenance' });
    expect((scopedMemory as any[])[0]).toEqual(jasmine.objectContaining({ id: 2, name: 'Current' }));
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
    expect((service as any).isMobileCacheEnabled(element, { isCreate: false })).toBeTrue();

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

  // [[[II ESC:013-04 DOC:docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md#escenario-04
  it('should not use creation or edition flags to disable dropdown options cache', () => {
    currentPlatform = 'mobile';

    const element = {
      cache: {
        mobile: { read: true, creation: false, edition: false, time: 10 },
      },
    };

    expect((service as any).isMobileCacheEnabled(element, { isCreate: true })).toBeTrue();
    expect((service as any).isMobileCacheEnabled(element, { isCreate: false })).toBeTrue();
  });

  it('should read shared memory before persistent preferences cache', async () => {
    currentPlatform = 'mobile';
    sharedS.data['maintenance:asset'] = [{ id: 1, name: 'Memoria' }];
    const preferencesGet = spyOn(Preferences, 'get').and.returnValue(Promise.resolve({ value: null }));

    const options = await service.dataDropdownExists({
      field: 'asset',
      option_label: 'name',
      option_value: 'id',
      cache: {
        mobile: { read: true, time: 10 },
      },
    }, { type: 'maintenance' });

    expect((options as any[])[0]).toEqual(jasmine.objectContaining({ id: 1, name: 'Memoria' }));
    expect(preferencesGet).not.toHaveBeenCalled();
    expect(service.assetCacheDebug()).toEqual(jasmine.objectContaining({
      source: 'shared-data',
      requestVersion: 0,
      optionCount: 1,
    }));
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
