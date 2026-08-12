import { HttpErrorResponse } from '@angular/common/http';

import { resolveLoginErrorMessage } from './login-error.util';

describe('resolveLoginErrorMessage', () => {
  // [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07
  it('distingue un equipo sin conexión de un servidor inaccesible', () => {
    const error = new HttpErrorResponse({ status: 0 });

    expect(resolveLoginErrorMessage(error, false)).toContain('Sin conexión a Internet');
    expect(resolveLoginErrorMessage(error, true)).toContain('no pudo comunicarse con el servidor');
  });

  it('muestra mensajes explícitos para estados HTTP conocidos', () => {
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 401 }), true)).toContain('Correo o contraseña incorrectos');
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 429 }), true)).toContain('demasiados intentos');
    expect(resolveLoginErrorMessage(new HttpErrorResponse({ status: 503 }), true)).toContain('temporalmente');
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
