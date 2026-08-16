import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/auth/services/auth.service';
import { CRUDService } from '@/utils/services/crud.service';
import { ClientCacheStorageService } from '@/utils/services/client-cache-storage.service';
import { FormCacheService } from '@/utils/services/form-cache.service';
import { GeneralService } from '@/utils/services/general.service';
import { SharedDynamicDataService } from '@/utils/services/shared-dynamic-data.service';

export interface DynamicDropdownDataContext {
  type?: string | null;
  sourceApp?: string | null;
  isCreate?: boolean;
}

export interface AssetDropdownCacheDebug {
  source: 'local-options' | 'shared-data' | 'shared-dropdown' | 'persistent-cache'
    | 'persistent-cache-miss' | 'persistent-cache-invalid' | 'server-request' | 'server-response';
  cacheKey: string;
  cacheEnabled: boolean;
  requestVersion: number;
  cachedVersion: string | null;
  appVersion: string | null;
  savedAt: number | null;
  ttlMs: number | null;
  optionCount: number;
}

@Injectable({
  providedIn: 'root',
})
// [[[II ESC:016-01 DOC:docs/documents/2026-06-02_016_dynamic-dropdown-data-service.md#escenario-01 ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02 ESC:019-02 DOC:docs/documents/2026-06-04_019_dropdown-cache-platform-read.md#escenario-02 ESC:020-02 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-02 ESC:012-02 DOC:docs/documents/2026-06-02_012_custom-draw-form-dropdown-inflight-cache.md#escenario-02 ESC:013-03 DOC:docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md#escenario-03 ESC:013-04 DOC:docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md#escenario-04 ESC:013-05 DOC:docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md#escenario-05 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09 ESC:007-09 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-09
export class DynamicDropdownDataService {
  private readonly crudS = inject(CRUDService);
  private readonly sharedS = inject(SharedDynamicDataService);
  private readonly generalS = inject(GeneralService);
  private readonly authS = inject(AuthService);
  private readonly formCacheS = inject(FormCacheService);
  private readonly clientCacheS = inject(ClientCacheStorageService);

  private readonly dropdownInFlight = new Map<string, { request: Promise<any[]>; version: number }>();
  private readonly dropdownRequestVersion = new Map<string, number>();
  readonly assetCacheDebug = signal<AssetDropdownCacheDebug | null>(null);

  private perfNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private logPerf(label: string, start: number, extra: any = {}): void {
    const elapsed = this.perfNow() - start;
    //console.info(`[DynamicDropdownData][perf] ${label}: ${elapsed.toFixed(2)}ms`, extra);
  }

  logAssetSearch(element: any, event: any, options: any[]): void {
    if (element?.field !== 'asset') return;

    const safeOptions = Array.isArray(options) ? options : [];
    const optionValue = element?.option_value || 'id';
    console.info('[AssetComboDebug][search]', {
      field: element.field,
      search: event?.filter ?? '',
      filterBy: element?.filter_by || element?.option_label || null,
      optionValue,
      cache: this.assetCacheDebug(),
      optionCount: safeOptions.length,
      values: safeOptions.map((option: any) => option?.[optionValue]),
      options: safeOptions.map((option: any) => option && typeof option === 'object' ? { ...option } : option),
    });
  }

  buildDropdownKey(field: string, context: DynamicDropdownDataContext = {}): string {
    const prefix = context.type || '';
    return prefix ? `${prefix}:${field}` : field;
  }

  canRequestServer(element: any): boolean {
    if (element?.type === 'multi-choice') return false;

    const appType = this.getDropdownAppType(element);
    return !!(appType.app && appType.type);
  }

  // [[[II ESC:001-18 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-18
  async searchAdditionalOptions(
    element: any,
    query: string,
    context: DynamicDropdownDataContext = {},
  ): Promise<any[]> {
    const config = element?.additional_search;
    const subsidiaries = config?.subsidiaries;
    const field = String(element?.field || '');
    const excludedPrefixes = [
      'form_fields_data_', 'parent_form_data_', 'child_form_fields',
      'no_form_data_', 'object_form_fields_data_',
    ];
    if (
      config?.active !== true
      || !subsidiaries
      || typeof subsidiaries !== 'object'
      || Array.isArray(subsidiaries)
      || !subsidiaries.filter
      || typeof subsidiaries.filter !== 'object'
      || Array.isArray(subsidiaries.filter)
      || ['dropdown-choice', 'multi-choice', 'select-button'].includes(String(element?.type || ''))
      || excludedPrefixes.some(prefix => field.startsWith(prefix))
      || !this.canRequestServer(element)
    ) return [];

    const dt = element?.data_type ?? {};
    const appType = this.getDropdownAppType(element);
    const searchConfig = config?.autocomplete ?? {};
    const filterParts: string[] = [];
    const baseFilter = this.buildDropdownFilter(dt?.filter);
    if (baseFilter) filterParts.push(baseFilter);

    const normalizedQuery = String(query ?? '').trim();
    if (normalizedQuery) {
      const encoded = encodeURIComponent(normalizedQuery);
      const by = String(searchConfig?.by || 'search').trim();
      const exact = searchConfig?.search_mode === 'exact';
      filterParts.push(by === 'search'
        ? `filter[search]=${encoded}`
        : `filter[${by}.${exact ? 'iexact' : 'icontains'}]=${encoded}`);
    }

    const sourceResource = String(context?.type || this.crudS.type || '').trim();
    const sourceRoute = this.crudS.getAppType(sourceResource)?.app
      || context?.sourceApp
      || this.crudS.app
      || '';
    const sourceApp = String(sourceRoute).split('/')[0].trim();
    if (!sourceApp || !sourceResource || !element?.field) return [];
    const referenceSearchApp = [
      appType.app,
      'reference-search',
      encodeURIComponent(sourceApp),
      encodeURIComponent(sourceResource),
      encodeURIComponent(String(element.field)),
    ].join('/');

    const data = await firstValueFrom(this.crudS.getObject({
      app: referenceSearchApp,
      type: appType.type,
      filter: filterParts.filter(Boolean).join('&'),
      sort: dt?.ordering || '',
      limit: Number(searchConfig?.limit) || 25,
    }));
    const rows = this.generalS.DJAtoObject({
      respDJA: data,
      fields: { [element.field]: element },
    }) || [];
    return this.normalizeOptionsForField(rows, element);
  }
  // ]]]FI

  async dataDropdownExists(
    element: any,
    context: DynamicDropdownDataContext = {},
    force = false
  ): Promise<any[] | false> {
    if (!element) return false;

    const localOptions = this.getLocalOptions(element);
    if (localOptions !== false) {
      this.publishAssetCacheDebug(element, context, 'local-options', localOptions.length);
      return localOptions;
    }

    if (force) return false;

    // Memoria primero: evita tocar persistencia si el dropdown ya fue resuelto
    // en esta sesión.
    const sharedData = this.getSharedOptions(this.sharedS.data, element, context);
    if (sharedData !== false) {
      this.publishAssetCacheDebug(element, context, 'shared-data', sharedData.length);
      return sharedData;
    }

    const sharedDropdown = this.getSharedDropdownOptions(element, context);
    if (sharedDropdown !== false) {
      this.publishAssetCacheDebug(element, context, 'shared-dropdown', sharedDropdown.length);
      return sharedDropdown;
    }

    if (this.isMobileCacheEnabled(element)) {
      const cached = await this.readMobileCache(element, context);
      if (cached) {
        this.setSharedDropdownOptions(element, context, cached);
        return cached;
      }
    }

    return false;
  }

  async loadServerOptions(
    element: any,
    context: DynamicDropdownDataContext = {},
    force = false
  ): Promise<any[] | false> {
    const perfStart = this.perfNow();


    if (!this.canRequestServer(element)) return false;

    const requestKey = this.getDropdownRequestKey(element);
    const inFlight = force ? undefined : this.dropdownInFlight.get(requestKey);
    let request = inFlight?.request;
    let requestVersion = inFlight?.version;
    const reusedInFlight = !!request;

    if (!request) {
      requestVersion = this.nextDropdownRequestVersion(element.field);
      this.publishAssetCacheDebug(element, context, 'server-request', 0, {
        requestVersion,
      });
      request = this.fetchDropdownRows(element);
      if (!force) {
        this.dropdownInFlight.set(requestKey, { request, version: requestVersion });
        const activeRequest = request;
        activeRequest.then(
          () => this.clearInFlightRequest(requestKey, activeRequest),
          () => this.clearInFlightRequest(requestKey, activeRequest)
        );
      }
    }

    const rows = await request;
    this.logPerf('loadServerOptions.fetchRows', perfStart, {
      field: element?.field,
      type: element?.type,
      rows: rows.length,
      force,
      reusedInFlight
    });
    if (!this.isCurrentDropdownRequest(element.field, requestVersion ?? 0)) {
      return false;
    }

    const normalizeStart = this.perfNow();
    const normalized = this.normalizeOptionsForField(rows, element);

    this.logPerf('loadServerOptions.normalize', normalizeStart, {
      field: element?.field,
      type: element?.type,
      rows: normalized.length
    });
    this.setSharedDropdownOptions(element, context, normalized);
    this.publishAssetCacheDebug(element, context, 'server-response', normalized.length, {
      requestVersion: requestVersion ?? 0,
    });

    if (this.isMobileCacheEnabled(element)) {
      const cacheStart = this.perfNow();
      await this.writeMobileCache(element, context, normalized);
      this.logPerf('loadServerOptions.writeMobileCache', cacheStart, {
        field: element?.field,
        rows: normalized.length
      });
    }

    this.logPerf('loadServerOptions.total', perfStart, {
      field: element?.field,
      type: element?.type,
      rows: normalized.length,
      force
    });
    return normalized;
  }

  normalizeOptionsForField(options: any[], fieldConfig: any): any[] {
    if (!Array.isArray(options) || options.length === 0) return options || [];

    const optionValue = fieldConfig?.option_value || 'id';
    const labelFields = this.getPrimeOptionLabelFields(fieldConfig);
    const aliases: Record<string, string[]> = {
      value: ['id'],
      id: ['value'],
      display_name: ['name', 'label'],
      name: ['display_name', 'label'],
      label: ['display_name', 'name'],
    };

    const normalized = options.map((option: any) => {
      if (!option || typeof option !== 'object') return option;

      const next = { ...option };

      if (optionValue && next[optionValue] === undefined) {
        const aliasKey = (aliases[optionValue] || []).find((alias) => next[alias] !== undefined);
        if (aliasKey !== undefined) {
          next[optionValue] = next[aliasKey];
        }
      }

      for (const labelField of labelFields) {
        if (next[labelField] !== undefined) continue;
        const aliasKey = (aliases[labelField] || []).find((alias) => next[alias] !== undefined);
        if (aliasKey !== undefined) {
          next[labelField] = next[aliasKey];
        }
      }

      return next;
    });

    const labelField = this.getOptionLabelField(fieldConfig);
    if (labelField) {
      this.applyOptionLabelToOptions(normalized, fieldConfig, labelField);
    }

    return normalized;
  }

  private getLocalOptions(element: any): any[] | false {
    const dt = element?.data_type ?? {};
    if (Array.isArray(dt.options) && dt.options.length > 0) {
      return this.normalizeOptionsForField(dt.options, element);
    }

    if (Array.isArray(element?.options) && element.options.length > 0) {
      return this.normalizeOptionsForField(element.options, element);
    }

    return false;
  }

  private getSharedOptions(
    bag: Record<string, any>,
    element: any,
    context: DynamicDropdownDataContext
  ): any[] | false {
    const dataKey = this.buildDropdownKey(element.field, context);
    const data = bag?.[dataKey]
      ?? bag?.[element.field]
      ?? this.lookupBySuffix(bag, element.field);

    if (!data) return false;

    return this.prepareCachedOptions(data, element);
  }

  private getSharedDropdownOptions(
    element: any,
    context: DynamicDropdownDataContext
  ): any[] | false {
    const scopedData = this.sharedS.drawDropdown?.[this.buildDropdownScopedKey(element, context)];
    if (scopedData) {
      return this.prepareCachedOptions(scopedData, element);
    }

    if (this.canRequestServer(element)) return false;

    return this.getSharedOptions(this.sharedS.drawDropdown, element, context);
  }

  private setSharedDropdownOptions(
    element: any,
    context: DynamicDropdownDataContext,
    options: any[]
  ): void {
    const scopedKey = this.buildDropdownScopedKey(element, context);
    const legacyKey = this.buildDropdownKey(element?.field || 'field', context);

    this.sharedS.drawDropdown[scopedKey] = options;
    this.sharedS.drawDropdown[legacyKey] = options;
  }

  private buildDropdownScopedKey(element: any, context: DynamicDropdownDataContext): string {
    const baseKey = this.buildDropdownKey(element?.field || 'field', context);
    const dt = element?.data_type ?? {};
    const appType = this.getDropdownAppType(element);
    const scope = encodeURIComponent(JSON.stringify({
      user: this.getCacheUserKey(),
      app: appType.app || '',
      type: appType.type || '',
      filter: this.buildDropdownFilter(dt?.filter),
      ordering: dt?.ordering || '',
      limit: dt?.limit || 0,
      optionLabel: this.parseOptionLabel(element?.option_label).join(','),
      optionLabelSeparator: element?.option_label_separator ?? ' ',
      optionValue: element?.option_value ?? 'id',
    }));

    return `${baseKey}:${scope}`;
  }

  private prepareCachedOptions(options: any[], element: any): any[] | false {
    const normalized = this.normalizeOptionsForField(options, element);
    const labelField = this.getOptionLabelField(element);

    if (labelField && !this.hasOptionLabelField(normalized, labelField)) {
      return false;
    }

    return normalized;
  }

  private lookupBySuffix(bag: Record<string, any>, field: string): any {
    if (!bag || typeof bag !== 'object') return null;
    const suffix = `:${field}`;
    for (const key of Object.keys(bag)) {
      if (key.endsWith(suffix) && bag[key]) return bag[key];
    }
    return null;
  }

  private getDropdownRequestKey(element: any): string {
    const dt = element?.data_type ?? {};
    const appType = this.getDropdownAppType(element);
    const filter = this.buildDropdownFilter(dt?.filter);
    const ordering = dt?.ordering || '';
    const limit = dt?.limit || 0;

    return JSON.stringify({
      app: appType.app || '',
      type: appType.type || '',
      filter,
      ordering,
      limit,
    });
  }

  private async fetchDropdownRows(element: any): Promise<any[]> {
    const perfStart = this.perfNow();
    const dt = element?.data_type ?? {};
    const appType = this.getDropdownAppType(element);
    const app = appType.app;
    const type = appType.type;

    if (!app || !type) {
      return [];
    }

    const filter = this.buildDropdownFilter(dt?.filter);
    const sort = dt?.ordering || '';
    const limit = dt?.limit || 0;
    const httpStart = this.perfNow();
    const data = await firstValueFrom(this.crudS.getObject({ app, type, filter, sort, limit }));
    this.logPerf('fetchDropdownRows.http', httpStart, {
      field: element?.field,
      type: element?.type,
      app,
      resourceType: type,
      filter,
      limit
    });

    const parseStart = this.perfNow();
    let dataDropdown = this.generalS.DJAtoObject({
      respDJA: data,
      fields: { [element.field]: element },
    }) || [];
    this.logPerf('fetchDropdownRows.parseDJA', parseStart, {
      field: element?.field,
      type: element?.type,
      rows: dataDropdown.length
    });

    const hasNonNullModule = dataDropdown.some((item: any) => item.module !== undefined);
    if (hasNonNullModule) {
      dataDropdown = dataDropdown.filter((item: any) => item.module === 'MA');
    }

    this.logPerf('fetchDropdownRows.total', perfStart, {
      field: element?.field,
      type: element?.type,
      rows: dataDropdown.length
    });
    return dataDropdown;
  }

  private clearInFlightRequest(requestKey: string, request: Promise<any[]>): void {
    if (this.dropdownInFlight.get(requestKey)?.request === request) {
      this.dropdownInFlight.delete(requestKey);
    }
  }

  private nextDropdownRequestVersion(field: string): number {
    const version = (this.dropdownRequestVersion.get(field) ?? 0) + 1;
    this.dropdownRequestVersion.set(field, version);
    return version;
  }

  private isCurrentDropdownRequest(field: string, version: number): boolean {
    return this.dropdownRequestVersion.get(field) === version;
  }

  private getDropdownAppType(element: any): any {
    const dt = element?.data_type ?? {};
    return this.crudS.getAppType(dt?.type) ?? {};
  }

  private buildDropdownFilter(filterConfig: { [key: string]: any } | undefined): string {
    return this.crudS.buildDropdownFilterString(filterConfig ?? {});
  }

  private getMobileCacheConfig(element: any): any | null {
    const cache = element?.cache ?? {};

    if (this.generalS.isMobile()) {
      return cache.mobile ?? element?.mobile?.cache ?? null;
    }

    if (this.generalS.isDesktopApp()) {
      return cache.desktop ?? cache.web ?? element?.desktop?.cache ?? element?.web?.cache ?? null;
    }

    return cache.web ?? cache.desktop ?? element?.web?.cache ?? element?.desktop?.cache ?? null;
  }

  private isMobileCacheEnabled(element: any, _context: DynamicDropdownDataContext = {}): boolean {
    const cacheConfig = this.getMobileCacheConfig(element);
    if (!cacheConfig || !this.isCacheReadEnabled(cacheConfig)) return false;

    const ttlMs = this.getMobileCacheTtlMs(element);
    return ttlMs !== null && ttlMs > 0;
  }

  private isCacheReadEnabled(cacheConfig: any): boolean {
    const readConfig = cacheConfig?.load ?? cacheConfig?.read ?? cacheConfig?.active;
    if (readConfig === false || readConfig === undefined || readConfig === null) return false;

    if (typeof readConfig === 'object') {
      if (readConfig.active === false || readConfig.enabled === false || readConfig.load === false || readConfig.read === false) return false;
      if (readConfig.active === true || readConfig.enabled === true || readConfig.load === true || readConfig.read === true) return true;
      return true;
    }

    return readConfig === true;
  }

  private getMobileCacheTtlMs(element: any): number | null {
    const ttlSeconds = Number(this.getMobileCacheConfig(element)?.time ?? 0);
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return null;
    return ttlSeconds * 1000;
  }

  private getCacheUserKey(): string {
    const userId = this.authS.userId();
    const username = this.authS.username();
    return String(userId ?? username ?? 'anonymous');
  }

  private getMobileCacheKey(element: any, context: DynamicDropdownDataContext): string {
    const dt = element?.data_type ?? {};
    const appType = this.getDropdownAppType(element);
    const app = appType.app || 'app';
    const type = appType.type || 'type';
    const field = element?.field || 'field';
    const userKey = this.getCacheUserKey();
    const queryScope = encodeURIComponent(JSON.stringify({
      filter: this.buildDropdownFilter(dt?.filter),
      ordering: dt?.ordering || '',
      limit: dt?.limit || 0,
      optionLabel: this.parseOptionLabel(element?.option_label).join(','),
      optionLabelSeparator: element?.option_label_separator ?? ' ',
      optionValue: element?.option_value ?? 'id',
    }));

    return `dropdownCache:${userKey}:${app}:${type}:${field}:${queryScope}`;
  }

  private publishAssetCacheDebug(
    element: any,
    context: DynamicDropdownDataContext,
    source: AssetDropdownCacheDebug['source'],
    optionCount: number,
    detail: Partial<AssetDropdownCacheDebug> = {},
  ): void {
    if (element?.field !== 'asset') return;

    this.assetCacheDebug.set({
      source,
      cacheKey: this.getMobileCacheKey(element, context),
      cacheEnabled: this.isMobileCacheEnabled(element),
      requestVersion: this.dropdownRequestVersion.get('asset') ?? 0,
      cachedVersion: null,
      appVersion: null,
      savedAt: null,
      ttlMs: this.getMobileCacheTtlMs(element),
      optionCount,
      ...detail,
    });
  }

  private async readMobileCache(
    element: any,
    context: DynamicDropdownDataContext
  ): Promise<any[] | null> {
    const key = this.getMobileCacheKey(element, context);

    try {
      const ttlMs = this.getMobileCacheTtlMs(element);
      if (ttlMs === null) {
        await this.clientCacheS.removeItem(key);
        return null;
      }

      const value = await this.clientCacheS.getItem(key);
      if (!value) {
        this.publishAssetCacheDebug(element, context, 'persistent-cache-miss', 0);
        return null;
      }

      const parsed = JSON.parse(value);
      const data = parsed?.data;
      const savedAt = Number(parsed?.savedAt);

      if (!Array.isArray(data) || !Number.isFinite(savedAt) || savedAt <= 0) {
        this.publishAssetCacheDebug(element, context, 'persistent-cache-invalid', Array.isArray(data) ? data.length : 0, {
          cachedVersion: parsed?.version ?? null,
          savedAt: Number.isFinite(savedAt) ? savedAt : null,
        });
        await this.clientCacheS.removeItem(key);
        return null;
      }

      const appVersion = await this.formCacheS.getAppVersion();
      if (!parsed?.version || parsed.version !== appVersion) {
        this.publishAssetCacheDebug(element, context, 'persistent-cache-invalid', data.length, {
          cachedVersion: parsed?.version ?? null,
          appVersion,
          savedAt,
        });
        await this.clientCacheS.removeItem(key);
        return null;
      }

      if (Date.now() - savedAt > ttlMs) {
        this.publishAssetCacheDebug(element, context, 'persistent-cache-invalid', data.length, {
          cachedVersion: parsed.version,
          appVersion,
          savedAt,
        });
        await this.clientCacheS.removeItem(key);
        return null;
      }

      const normalized = this.prepareCachedOptions(data, element);
      if (normalized === false) {
        this.publishAssetCacheDebug(element, context, 'persistent-cache-invalid', data.length, {
          cachedVersion: parsed.version,
          appVersion,
          savedAt,
        });
        await this.clientCacheS.removeItem(key);
        return null;
      }

      this.publishAssetCacheDebug(element, context, 'persistent-cache', normalized.length, {
        cachedVersion: parsed.version,
        appVersion,
        savedAt,
      });
      return normalized;
    } catch {
      this.publishAssetCacheDebug(element, context, 'persistent-cache-invalid', 0);
      try {
        await this.clientCacheS.removeItem(key);
      } catch { /* Cache opcional. */ }
      return null;
    }
  }

  private async writeMobileCache(
    element: any,
    context: DynamicDropdownDataContext,
    data: any[]
  ): Promise<void> {
    try {
      if (!Array.isArray(data) || !this.isMobileCacheEnabled(element) || this.getMobileCacheTtlMs(element) === null) {
        return;
      }

      const key = this.getMobileCacheKey(element, context);
      await this.clientCacheS.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          version: await this.formCacheS.getAppVersion(),
          data,
        })
      );
    } catch {
      // Cache opcional.
    }
  }

  private parseOptionLabel(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }

    return [];
  }

  private getPrimeOptionLabelFields(fieldConfig: any): string[] {
    const configured = this.parseOptionLabel(fieldConfig?.option_label);
    return configured.length > 0 ? configured : ['name'];
  }

  private getOptionLabelField(element: any): string | null {
    const labels = this.getPrimeOptionLabelFields(element);
    return labels.length > 0 ? labels.join('') : null;
  }

  private hasOptionLabelField(options: any[], labelField: string): boolean {
    if (!Array.isArray(options) || options.length === 0) return true;
    return options[0]?.hasOwnProperty(labelField);
  }

  private applyOptionLabelToOptions(options: any[], element: any, labelField: string): void {
    if (!Array.isArray(options) || options.length === 0) return;
    if (options[0]?.hasOwnProperty(labelField)) return;

    const separator = element?.option_label_separator ?? ' ';
    const labelFields = this.getPrimeOptionLabelFields(element);
    if (labelFields.length === 0) return;

    for (const opt of options) {
      if (!opt || typeof opt !== 'object') continue;
      const label = labelFields
        .map((key: string) => opt?.[key])
        .filter((val: any) => val !== undefined && val !== null && String(val).trim() !== '')
        .map((val: any) => String(val))
        .join(separator);
      opt[labelField] = label;
    }
  }
}
// ]]]FI
