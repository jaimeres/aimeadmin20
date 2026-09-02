// [[[II ESC:027-08 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-08 ESC:027-09 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-09 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Device } from '@capacitor/device';
import { NEVER, Subject, firstValueFrom, of, throwError } from 'rxjs';

import { MessageService } from '@/components/services/message.service';
import { GeneralService } from '@/utils/services/general.service';
import { NetworkStatusService } from '@/utils/services/network-status.service';
import { AuthService } from '../services/auth.service';
import { TokenAccessInterceptor } from './token-access.interceptor';

describe('TokenAccessInterceptor connectivity failures', () => {
  let authS: any;
  let networkS: any;
  let connectionChanges: Subject<boolean>;
  let messageS: jasmine.SpyObj<MessageService>;

  const runRequest = async (next: any): Promise<void> => {
    const request = new HttpRequest('GET', 'https://api.jukai.test/v1/assets/asset/');
    const response$ = TestBed.runInInjectionContext(() =>
      TokenAccessInterceptor(request, next)
    );

    try {
      await firstValueFrom(response$);
      fail('La petición debió terminar con error de transporte.');
    } catch (error) {
      expect((error as HttpErrorResponse).status).toBe(0);
    }
  };

  beforeAll(async () => {
    // Carga el adaptador web antes de usar el reloj virtual del caso timeout.
    await Device.getInfo();
  });

  beforeEach(() => {
    authS = {
      loggedin: () => true,
      getTimeUntilTokenExpiration: 0,
      tokenValidateInterceptor: jasmine.createSpy('tokenValidateInterceptor'),
    };
    connectionChanges = new Subject<boolean>();
    networkS = {
      connected: () => true,
      internetAvailable: () => true,
      connectionChanges: connectionChanges.asObservable(),
      probeInternetAccess: jasmine.createSpy('probeInternetAccess').and.resolveTo(false),
      reportTransportFailure: jasmine.createSpy('reportTransportFailure'),
      reportInternetAvailable: jasmine.createSpy('reportInternetAvailable'),
      reportServerResponse: jasmine.createSpy('reportServerResponse'),
    };
    messageS = jasmine.createSpyObj('MessageService', [
      'showBlocked',
      'changeMessage',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authS },
        {
          provide: GeneralService,
          useValue: {
            getClientPlatform: () => 'web',
            isMobile: () => false,
          },
        },
        { provide: NetworkStatusService, useValue: networkS },
        { provide: MessageService, useValue: messageS },
      ],
    });
  });

  it('no envía la petición, quita el bloqueo y avisa si el equipo ya está offline', async () => {
    networkS.connected = () => false;
    const next = jasmine.createSpy('next');

    await runRequest(next);

    expect(next).not.toHaveBeenCalled();
    expect(authS.tokenValidateInterceptor).not.toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(networkS.reportTransportFailure).toHaveBeenCalled();
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('Sin conexión a Internet'),
      null,
      {},
      'warn',
      'Sin conexión',
      false,
      20000,
    );
  });

  it('cubre el error offline ocurrido durante la renovación del token', async () => {
    let connected = true;
    networkS.connected = () => connected;
    authS.tokenValidateInterceptor.and.callFake(() => {
      connected = false;
      return throwError(() => new HttpErrorResponse({ status: 0 }));
    });

    await runRequest(jasmine.createSpy('next'));

    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(messageS.changeMessage).toHaveBeenCalled();
  });

  it('cancela una consulta pendiente cuando la red se pierde después de iniciarla', async () => {
    let connected = true;
    networkS.connected = () => connected;
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    spyOn(Device, 'getInfo').and.resolveTo({ platform: 'web' } as any);
    const requestStarted = new Subject<void>();
    const startedPromise = firstValueFrom(requestStarted);
    const next = jasmine.createSpy('next').and.callFake(() => {
      requestStarted.next();
      return NEVER;
    });
    const requestPromise = runRequest(next);

    await startedPromise;
    connected = false;
    connectionChanges.next(false);
    await requestPromise;

    expect(next).toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('Sin conexión a Internet'),
      null,
      {},
      'warn',
      'Sin conexión',
      false,
      20000,
    );
  });

  it('termina una consulta GET estancada aunque Android haya perdido el cambio de red', fakeAsync(() => {
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    spyOn(Device, 'getInfo').and.resolveTo({ platform: 'web' } as any);
    const next = jasmine.createSpy('next').and.returnValue(NEVER);
    let requestError: HttpErrorResponse | undefined;
    const request = new HttpRequest('GET', 'https://api.jukai.test/v1/assets/asset/');

    TestBed.runInInjectionContext(() =>
      TokenAccessInterceptor(request, next)
    ).subscribe({ error: (error) => requestError = error });

    flushMicrotasks();
    expect(next).toHaveBeenCalled();
    tick(14999);
    expect(requestError).toBeUndefined();
    tick(1);
    flushMicrotasks();

    expect(requestError?.status).toBe(0);
    expect(requestError?.error?.transportFailure).toBeTrue();
    expect(requestError?.error?.timeout).toBeTrue();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('Sin acceso a Internet desde la aplicación'),
      null,
      {},
      'warn',
      'Sin conexión',
      false,
      20000,
    );
  }));

  it('quita el bloqueo y explica el fallo de conexión si el monitor sigue conectado', async () => {
    authS.tokenValidateInterceptor.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    await runRequest(jasmine.createSpy('next'));

    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(networkS.reportTransportFailure).toHaveBeenCalled();
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('Sin acceso a Internet desde la aplicación'),
      null,
      {},
      'warn',
      'Sin conexión',
      false,
      20000,
    );
  });

  it('retira el estado sin Internet cuando recibe una respuesta HTTP válida', async () => {
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    const response = new HttpResponse({ status: 200, body: { data: [] } });

    const result = await firstValueFrom(TestBed.runInInjectionContext(() =>
      TokenAccessInterceptor(
        new HttpRequest('GET', 'https://api.jukai.test/v1/assets/asset/'),
        () => of(response),
      )
    ));

    expect(result).toBe(response);
    expect(networkS.reportServerResponse).toHaveBeenCalled();
  });

  it('retira el estado sin Internet ante un error HTTP con respuesta del servidor', async () => {
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    const responseError = new HttpErrorResponse({ status: 503 });
    let receivedError: HttpErrorResponse | undefined;

    try {
      await firstValueFrom(TestBed.runInInjectionContext(() =>
        TokenAccessInterceptor(
          new HttpRequest('GET', 'https://api.jukai.test/v1/assets/asset/'),
          () => throwError(() => responseError),
        )
      ));
    } catch (error) {
      receivedError = error as HttpErrorResponse;
    }

    expect(receivedError).toBe(responseError);
    expect(networkS.reportServerResponse).toHaveBeenCalled();
  });

  it('separa un servidor loopback apagado de una pérdida de Internet', async () => {
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    let receivedError: HttpErrorResponse | undefined;

    try {
      await firstValueFrom(TestBed.runInInjectionContext(() =>
        TokenAccessInterceptor(
          new HttpRequest('GET', 'http://127.0.0.1:8000/v1/assets/asset/'),
          () => throwError(() => new HttpErrorResponse({
            status: 0,
            url: 'http://127.0.0.1:8000/v1/assets/asset/',
          })),
        )
      ));
    } catch (error) {
      receivedError = error as HttpErrorResponse;
    }

    expect(networkS.reportTransportFailure).not.toHaveBeenCalled();
    expect(networkS.reportInternetAvailable).toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('servidor local'),
      null,
      {},
      'warn',
      'Servidor local no disponible',
      false,
      20000,
    );
    expect(receivedError?.error?.transportFailure).toBeTrue();
    expect(receivedError?.error?.localServerFailure).toBeTrue();
  });

  it('clasifica un API remoto caído como servidor no disponible si Internet responde', async () => {
    authS.getTimeUntilTokenExpiration = 60;
    authS.access = 'access-token';
    networkS.probeInternetAccess.and.resolveTo(true);
    let receivedError: HttpErrorResponse | undefined;

    try {
      await firstValueFrom(TestBed.runInInjectionContext(() =>
        TokenAccessInterceptor(
          new HttpRequest('GET', 'https://api.jukai.test/v1/assets/asset/'),
          () => throwError(() => new HttpErrorResponse({
            status: 0,
            url: 'https://api.jukai.test/v1/assets/asset/',
          })),
        )
      ));
    } catch (error) {
      receivedError = error as HttpErrorResponse;
    }

    expect(networkS.probeInternetAccess).toHaveBeenCalled();
    expect(networkS.reportTransportFailure).not.toHaveBeenCalled();
    expect(networkS.reportInternetAvailable).toHaveBeenCalled();
    expect(messageS.changeMessage).toHaveBeenCalledWith(
      jasmine.stringContaining('Tu conexión a Internet está disponible'),
      null,
      {},
      'warn',
      'Servidor no disponible',
      false,
      20000,
    );
    expect(receivedError?.error?.serverUnavailable).toBeTrue();
  });
});
// ]]]FI
