import { inject, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { GeneralService } from '@/utils/services/general.service';
import { UpdateManagerService } from '@/utils/services/update-manager.service';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { environment } from 'src/environments/environment';

let cachedClientDeviceId: string | null = null;
let cachedAppInfo: { version?: string; build?: string } | null = null;
let cachedDeviceInfo: { platform?: string; osVersion?: string; model?: string } | null = null;
let mandatoryUpdateCheckInFlight = false;

const CLIENT_DEVICE_KEY = 'client_device_id';
const UPDATE_POLICY_PATH = '/app/update-policy';

const createRequestId = (): string => {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getOrCreateClientDeviceId = async (): Promise<string> => {
  if (cachedClientDeviceId) return cachedClientDeviceId;

  const stored = await Preferences.get({ key: CLIENT_DEVICE_KEY });
  if (stored.value) {
    cachedClientDeviceId = stored.value;
    return stored.value;
  }

  const newId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  await Preferences.set({ key: CLIENT_DEVICE_KEY, value: newId });
  cachedClientDeviceId = newId;
  return newId;
};

const getCachedAppInfo = async (): Promise<{ version?: string; build?: string }> => {
  if (cachedAppInfo) return cachedAppInfo;
  const info = await App.getInfo();
  cachedAppInfo = { version: info.version, build: info.build };
  return cachedAppInfo;
};

const getCachedDeviceInfo = async (): Promise<{ platform?: string; osVersion?: string; model?: string }> => {
  if (cachedDeviceInfo) return cachedDeviceInfo;
  const info = await Device.getInfo();
  cachedDeviceInfo = { platform: info.platform, osVersion: info.osVersion, model: info.model };
  return cachedDeviceInfo;
};

// [[[II ESC:028-02 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-02
type ClientDeviceType = 'mobile' | 'desktop' | 'web';

const resolveClientDeviceType = (generalService: GeneralService): ClientDeviceType => {
  try {
    return generalService.getClientPlatform?.() ?? (generalService.isMobile() ? 'mobile' : 'web');
  } catch {
    return 'web';
  }
};

const getCapacitorRuntimePlatform = (): string => {
  if (typeof window === 'undefined') return '';
  const capacitor = (window as any).Capacitor;
  if (!capacitor?.getPlatform) return '';
  return String(capacitor.getPlatform() || '').toLowerCase();
};

const resolveHeaderPlatform = (deviceType: ClientDeviceType, deviceInfoPlatform?: string): 'android' | 'ios' | 'web' | 'desktop' => {
  if (deviceType !== 'mobile') return deviceType;

  const platform = String(deviceInfoPlatform || getCapacitorRuntimePlatform()).toLowerCase();
  return platform === 'ios' ? 'ios' : 'android';
};

const getEnvironmentAppInfo = (): { version?: string; build?: string } => {
  const build = environment.appBuild === null || environment.appBuild === undefined
    ? undefined
    : String(environment.appBuild);

  return {
    version: environment.appVersion,
    build
  };
};
// ]]]FI

// [[[II ESC:028-03 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-03
const normalizeErrorText = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => normalizeErrorText(item, seen)).join(' ');

  if (typeof value === 'object') {
    if (seen.has(value)) return '';
    seen.add(value);
    return Object.values(value as Record<string, unknown>)
      .map((item) => normalizeErrorText(item, seen))
      .join(' ');
  }

  return '';
};

const normalizeMandatoryUpdateMessage = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const isMandatoryUpdateError = (error: unknown): boolean => {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) return false;

  const text = normalizeMandatoryUpdateMessage(normalizeErrorText(error.error || error.message));
  return text.includes('actualizacion obligatoria')
    || text.includes('actualizar la aplicacion')
    || text.includes('version de la aplicacion')
    || text.includes('aplicacion esta bloqueada');
};

const isUpdatePolicyRequest = (url: string): boolean => url.includes(UPDATE_POLICY_PATH);

const triggerMandatoryUpdateCheck = (error: unknown, failedRequest: HttpRequest<any>, injector: Injector): void => {
  if (!isMandatoryUpdateError(error) || isUpdatePolicyRequest(failedRequest.url) || mandatoryUpdateCheckInFlight) {
    return;
  }

  mandatoryUpdateCheckInFlight = true;
  const updateManager = injector.get(UpdateManagerService);
  updateManager.checkForUpdatesAndShow(true)
    .catch((checkError) => {
      console.warn('No fue posible consultar la política de actualización obligatoria:', checkError);
    })
    .finally(() => {
      mandatoryUpdateCheckInFlight = false;
    });
};
// ]]]FI

export const TokenAccessInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const generalService = inject(GeneralService);
  const injector = inject(Injector);
  let request = req;
  const contentType = req.headers.get('Content-Type');

  const buildHeaders = async (access?: string): Promise<HttpHeaders> => {
    let headers = req.headers;

    // Content-Type por defecto si no viene
    if (!headers.has('Content-Type')) {
      headers = headers.set('Content-Type', 'application/vnd.api+json');
    }

    if (access) {
      headers = headers.set('authorization', `JWT ${access}`);
    }

    const requestId = createRequestId();
    headers = headers.set('X-Request-Id', requestId);

    // [[[II ESC:028-02 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-02
    const deviceType = resolveClientDeviceType(generalService);
    const [clientDevice, appInfo, deviceInfo] = await Promise.all([
      deviceType === 'mobile'
        ? getOrCreateClientDeviceId().catch(() => null)
        : Promise.resolve(null),
      deviceType === 'mobile'
        ? getCachedAppInfo().catch((error) => {
          console.warn('No fue posible leer la versión nativa de la app:', error);
          return {} as { version?: string; build?: string };
        })
        : Promise.resolve(getEnvironmentAppInfo()),
      getCachedDeviceInfo().catch((error) => {
        console.warn('No fue posible leer información del dispositivo:', error);
        return {} as { platform?: string; osVersion?: string; model?: string };
      })
    ]);

    const platform = resolveHeaderPlatform(deviceType, deviceInfo?.platform);

    if (clientDevice) headers = headers.set('X-Device-Id', clientDevice);
    headers = headers.set('X-Platform', platform);
    if (appInfo?.version) headers = headers.set('X-App-Version', String(appInfo.version));
    if (appInfo?.build) headers = headers.set('X-App-Build', String(appInfo.build));
    if (deviceInfo?.osVersion) headers = headers.set('X-OS-Version', String(deviceInfo.osVersion));
    if (deviceInfo?.model) headers = headers.set('X-Device-Model', String(deviceInfo.model));
    // ]]]FI
    headers = headers.set('X-Device-Type', deviceType);

    return headers;
  };

  // [[[II ESC:028-03 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-03
  const sendRequest = (headers: HttpHeaders): Observable<HttpEvent<any>> => {
    request = req.clone({ headers });
    return next(request).pipe(
      catchError((error) => {
        triggerMandatoryUpdateCheck(error, request, injector);
        return throwError(() => error);
      })
    );
  };
  // ]]]FI

  // Si AuthorizationCheck es true, no enviar el token en headers
  if (req?.body?.authorizationCheck) {
    return from(buildHeaders()).pipe(
      mergeMap((headers) => sendRequest(headers))
    );
  }

  // Si el token de acceso tiene más de 20 segundos de vida, lo envía
  if (authService.getTimeUntilTokenExpiration > 20) {
    const access = authService.access;
    return from(buildHeaders(access)).pipe(
      mergeMap((headers) => sendRequest(headers))
    );
  }

  // Si el token está por expirar, refresca antes de enviar la solicitud
  return authService.tokenValidateInterceptor().pipe(
    take(1),
    mergeMap(access => {
      return from(buildHeaders(access)).pipe(
        mergeMap((headers) => sendRequest(headers))
      );
    })
  );
};
