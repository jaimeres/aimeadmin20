import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { MessageService } from './message.service';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:027-09 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-09 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
  it('reemplaza el error genérico de Fetch por un aviso explícito de conexión', () => {
    let emitted: any;
    service.currentMessage.subscribe((message) => emitted = message);

    service.changeMessage(
      'Hay un error al cargar los detalles de inventario.',
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        error: { message: 'Failed to fetch', transportFailure: true },
      }) as any,
    );

    expect(emitted).toEqual(jasmine.objectContaining({
      msg: 'Sin acceso a Internet desde la aplicación. Revisa el Wi-Fi, los datos móviles o las restricciones de red de la aplicación.',
      err: null,
      severity: 'warn',
      summary: 'Sin conexión',
      life: 20000,
    }));
  });

  it('conserva separado el fallo del servidor local', () => {
    let emitted: any;
    service.currentMessage.subscribe((message) => emitted = message);

    service.changeMessage(
      'No fue posible ejecutar la solicitud.',
      new HttpErrorResponse({
        status: 0,
        error: { transportFailure: true, localServerFailure: true },
      }) as any,
    );

    expect(emitted).toEqual(jasmine.objectContaining({
      msg: jasmine.stringContaining('servidor local'),
      severity: 'warn',
      summary: 'Servidor local no disponible',
    }));
  });

  it('conserva separado el fallo de un servidor remoto con Internet disponible', () => {
    let emitted: any;
    service.currentMessage.subscribe((message) => emitted = message);

    service.changeMessage(
      'No fue posible ejecutar la solicitud.',
      new HttpErrorResponse({
        status: 0,
        error: { transportFailure: true, serverUnavailable: true },
      }) as any,
    );

    expect(emitted).toEqual(jasmine.objectContaining({
      msg: jasmine.stringContaining('conexión a Internet está disponible'),
      severity: 'warn',
      summary: 'Servidor no disponible',
    }));
  });
  // ]]]FI
});
