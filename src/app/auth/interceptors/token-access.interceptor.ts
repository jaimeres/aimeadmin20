import { inject } from '@angular/core';
import { HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { GeneralService } from '@/utils/services/general.service';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';

let cachedClientDeviceId: string | null = null;
let cachedAppInfo: { version?: string; build?: string } | null = null;
let cachedDeviceInfo: { platform?: string; osVersion?: string; model?: string } | null = null;

const CLIENT_DEVICE_KEY = 'client_device_id';

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

export const TokenAccessInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const generalService = inject(GeneralService);
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

    let deviceType = generalService.isMobile() ? 'mobile' : 'web';

    try {
      const [clientDevice, appInfo, deviceInfo] = await Promise.all([
        generalService.isMobile() ? getOrCreateClientDeviceId() : Promise.resolve(null),
        getCachedAppInfo(),
        getCachedDeviceInfo()
      ]);

      if (!generalService.isMobile() && deviceInfo?.platform && deviceInfo.platform !== 'web') {
        deviceType = 'desktop';
      }

      if (clientDevice) headers = headers.set('X-Device-Id', clientDevice);
      if (deviceInfo?.platform) headers = headers.set('X-Platform', String(deviceInfo.platform));
      if (appInfo?.version) headers = headers.set('X-App-Version', String(appInfo.version));
      if (appInfo?.build) headers = headers.set('X-App-Build', String(appInfo.build));
      if (deviceInfo?.osVersion) headers = headers.set('X-OS-Version', String(deviceInfo.osVersion));
      if (deviceInfo?.model) headers = headers.set('X-Device-Model', String(deviceInfo.model));
    } catch {
      // Evitar romper login por errores de headers opcionales
    }

    headers = headers.set('X-Device-Type', deviceType);

    return headers;
  };

  // Si AuthorizationCheck es true, no enviar el token en headers
  if (req?.body?.authorizationCheck) {
    return from(buildHeaders()).pipe(
      mergeMap((headers) => {
        request = req.clone({ headers });
        return next(request);
      })
    );
  }

  // Si el token de acceso tiene más de 20 segundos de vida, lo envía
  if (authService.getTimeUntilTokenExpiration > 20) {
    const access = authService.access;
    return from(buildHeaders(access)).pipe(
      mergeMap((headers) => {
        request = req.clone({ headers });
        return next(request);
      })
    );
  }

  // Si el token está por expirar, refresca antes de enviar la solicitud
  return authService.tokenValidateInterceptor().pipe(
    take(1),
    mergeMap(access => {
      return from(buildHeaders(access)).pipe(
        mergeMap((headers) => {
          request = req.clone({ headers });
          return next(request);
        })
      );
    })
  );
};
