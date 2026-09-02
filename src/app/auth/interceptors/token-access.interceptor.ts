import { inject, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, Subscription, from, of, throwError } from 'rxjs';
import { catchError, filter, mergeMap, take, tap, timeout } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { GeneralService } from '@/utils/services/general.service';
import { NetworkStatusService } from '@/utils/services/network-status.service';
import { MessageService } from '@/components/services/message.service';
import { UpdateManagerService } from '@/utils/services/update-manager.service';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { environment } from 'src/environments/environment';
import { isLoopbackUrl } from '@/utils/native-local-url.util';

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
  const networkStatusService = inject(NetworkStatusService);
  const messageService = inject(MessageService);
  const injector = inject(Injector);
  let request = req;
  const contentType = req.headers.get('Content-Type');

  // [[[II ESC:027-08 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-08 ESC:027-09 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-09 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
  const requestInactivityTimeout = ['GET', 'HEAD'].includes(req.method) ? 15000 : 60000;

  const handleRequestFailure = (error: unknown): Observable<never> => {
    const status = error instanceof HttpErrorResponse
      ? error.status
      : Number((error as { status?: unknown } | null)?.status ?? 0);
    if (status !== 0) {
      // Cualquier estado HTTP demuestra que hubo respuesta del servidor.
      networkStatusService.reportServerResponse();
      return throwError(() => error);
    }

    // El bloqueo se libera antes de comprobar un destino independiente.
    messageService.showBlocked(false);

    const connected = networkStatusService.connected();
    const errorUrl = error instanceof HttpErrorResponse && error.url
      ? error.url
      : req.urlWithParams;
    const localServerFailure = connected && isLoopbackUrl(errorUrl);
    const internetProbe = !connected
      ? of(false)
      : localServerFailure
        ? of(true)
        : from(networkStatusService.probeInternetAccess());

    return internetProbe.pipe(
      mergeMap((internetReachable) => {
        const serverUnavailable = connected && internetReachable;

        if (serverUnavailable) {
          networkStatusService.reportInternetAvailable();
        } else {
          networkStatusService.reportTransportFailure();
        }

        if (authService.loggedin()) {
          const message = localServerFailure
            ? 'No fue posible conectarse con el servidor local. Verifica que el servicio esté iniciado en el equipo de desarrollo.'
            : serverUnavailable
              ? 'No fue posible comunicarse con el servidor. Tu conexión a Internet está disponible, pero el servicio no responde o está bloqueando el acceso.'
              : connected
                ? 'Sin acceso a Internet desde la aplicación. Revisa el Wi-Fi, los datos móviles o las restricciones de red de la aplicación.'
                : 'Sin conexión a Internet. Revisa tu Wi-Fi o datos móviles y vuelve a intentarlo.';
          const summary = localServerFailure
            ? 'Servidor local no disponible'
            : serverUnavailable
              ? 'Servidor no disponible'
              : 'Sin conexión';

          messageService.changeMessage(message, null, {}, 'warn', summary, false, 20000);
        }

        if (error instanceof HttpErrorResponse && error.error?.transportFailure && !serverUnavailable) {
          return throwError(() => error);
        }

        return throwError(() => new HttpErrorResponse({
          error: {
            ...(typeof (error as HttpErrorResponse).error === 'object' && (error as HttpErrorResponse).error
              ? (error as HttpErrorResponse).error
              : {}),
            message: (error as HttpErrorResponse).error?.message || 'No fue posible conectar con el servidor.',
            transportFailure: true,
            ...(serverUnavailable ? { serverUnavailable: true } : {}),
            ...(localServerFailure ? { localServerFailure: true } : {}),
          },
          headers: (error as HttpErrorResponse).headers,
          status: 0,
          statusText: (error as HttpErrorResponse).statusText || 'Connection Error',
          url: (error as HttpErrorResponse).url || req.urlWithParams,
        }));
      }),
    );
  };

  const withRequestFailureHandling = (
    source: Observable<HttpEvent<any>>,
  ): Observable<HttpEvent<any>> => new Observable<HttpEvent<any>>((subscriber) => {
    let requestSubscription = Subscription.EMPTY;
    const networkSubscription = networkStatusService.connectionChanges.pipe(
      filter((connected) => !connected),
      take(1),
    ).subscribe(() => {
      subscriber.error(new HttpErrorResponse({
        status: 0,
        statusText: 'Offline',
        url: req.urlWithParams,
        error: { message: 'El equipo perdió la conexión a Internet.' },
      }));
    });

    // Cierra la carrera entre la verificación previa y la suscripción al
    // monitor. Si la red cayó en ese intervalo, la petición no se inicia.
    if (!networkStatusService.connected()) {
      subscriber.error(new HttpErrorResponse({
        status: 0,
        statusText: 'Offline',
        url: req.urlWithParams,
        error: { message: 'El equipo no tiene conexión a Internet.' },
      }));
    } else {
      requestSubscription = source.pipe(
        timeout({
          each: requestInactivityTimeout,
          with: () => throwError(() => new HttpErrorResponse({
            status: 0,
            statusText: 'Connection Timeout',
            url: req.urlWithParams,
            error: {
              message: 'El servidor no respondió después de perder la conexión.',
              transportFailure: true,
              timeout: true,
            },
          })),
        }),
        tap((event) => {
          if (event instanceof HttpResponse) {
            networkStatusService.reportServerResponse();
          }
        }),
      ).subscribe(subscriber);
    }

    return () => {
      networkSubscription.unsubscribe();
      requestSubscription.unsubscribe();
    };
  }).pipe(
    catchError((error) => handleRequestFailure(error)),
  );

  if (!networkStatusService.connected()) {
    return handleRequestFailure(new HttpErrorResponse({
      status: 0,
      statusText: 'Offline',
      url: req.urlWithParams,
      error: { message: 'El equipo no tiene conexión a Internet.' },
    }));
  }
  // ]]]FI

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
    return withRequestFailureHandling(
      from(buildHeaders()).pipe(
        mergeMap((headers) => sendRequest(headers))
      )
    );
  }

  // Si el token de acceso tiene más de 20 segundos de vida, lo envía
  if (authService.getTimeUntilTokenExpiration > 20) {
    const access = authService.access;
    return withRequestFailureHandling(
      from(buildHeaders(access)).pipe(
        mergeMap((headers) => sendRequest(headers))
      )
    );
  }

  // Si el token está por expirar, refresca antes de enviar la solicitud
  return withRequestFailureHandling(
    authService.tokenValidateInterceptor().pipe(
      take(1),
      mergeMap(access => {
        return from(buildHeaders(access)).pipe(
          mergeMap((headers) => sendRequest(headers))
        );
      })
    )
  );
};
