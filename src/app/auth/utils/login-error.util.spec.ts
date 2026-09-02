import { HttpErrorResponse } from '@angular/common/http';

import { resolveLoginErrorMessage } from './login-error.util';

describe('resolveLoginErrorMessage', () => {
  // [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
  it('explica la falta de Internet aunque el equipo todavía muestre una red activa', () => {
    const error = new HttpErrorResponse({ status: 0 });

    expect(resolveLoginErrorMessage(error, false)).toContain('Sin conexión a Internet');
    expect(resolveLoginErrorMessage(error, true)).toContain('Sin acceso a Internet desde la aplicación');
    expect(resolveLoginErrorMessage(error, true)).toContain('restricciones de red de la aplicación');
  });

  it('muestra mensajes explícitos para estados HTTP conocidos', () => {
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 401 }), true)).toContain('Correo o contraseña incorrectos');
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 429 }), true)).toContain('demasiados intentos');
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 503 }), true)).toContain('temporalmente');
  });

  it('identifica un servidor local apagado sin atribuirlo a Internet', () => {
    const error = new HttpErrorResponse({
      status: 0,
      url: 'http://localhost:8000/v1/auth/login/',
      error: { transportFailure: true, localServerFailure: true },
    });

    expect(resolveLoginErrorMessage(error, true)).toContain('servidor local');
    expect(resolveLoginErrorMessage(error, true)).not.toContain('Sin conexión a Internet');
  });

  it('identifica un servidor remoto caído cuando la comprobación de Internet respondió', () => {
    const error = new HttpErrorResponse({
      status: 0,
      url: 'https://api.jukai.test/v1/auth/login/',
      error: { transportFailure: true, serverUnavailable: true },
    });

    expect(resolveLoginErrorMessage(error, true)).toContain('conexión a Internet está disponible');
    expect(resolveLoginErrorMessage(error, true)).toContain('servidor');
  });

  it('conserva el detalle JSON:API para errores no clasificados', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { errors: [{ detail: 'El tipo del recurso no coincide.' }] },
    });

    expect(resolveLoginErrorMessage(error, true)).toBe('El tipo del recurso no coincide.');
  });
  // ]]]FI
});
