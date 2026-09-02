import { HttpErrorResponse } from '@angular/common/http';
import { isLoopbackUrl } from '@/utils/native-local-url.util';

// [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
export function resolveLoginErrorMessage(error: unknown, connected: boolean): string {
  const status = error instanceof HttpErrorResponse
    ? error.status
    : Number((error as { status?: unknown } | null)?.status ?? 0);

  if (status === 0) {
    const localServerFailure = Boolean((error as HttpErrorResponse)?.error?.localServerFailure)
      || isLoopbackUrl((error as HttpErrorResponse)?.url || '');

    if (connected && localServerFailure) {
      return 'No fue posible conectarse con el servidor local. Verifica que el servicio esté iniciado en el equipo de desarrollo.';
    }

    if (connected && (error as HttpErrorResponse)?.error?.serverUnavailable) {
      return 'No fue posible comunicarse con el servidor. Tu conexión a Internet está disponible, pero el servicio no responde o está bloqueando el acceso.';
    }

    return connected
      ? 'Sin acceso a Internet desde la aplicación. El equipo muestra una red activa, pero la aplicación no puede usarla. Revisa el Wi-Fi, los datos móviles o las restricciones de red de la aplicación.'
      : 'Sin conexión a Internet. Revisa tu Wi-Fi o datos móviles y vuelve a intentarlo.';
  }

  if (status === 401) {
    return 'Correo o contraseña incorrectos, o la cuenta está inactiva. Verifica tus datos e inténtalo nuevamente.';
  }

  if (status === 403) {
    return 'El servidor rechazó el inicio de sesión. Verifica que tu cuenta tenga acceso o contacta al administrador.';
  }

  if (status === 404) {
    return 'El servicio de inicio de sesión no está disponible en la dirección configurada. Contacta a soporte.';
  }

  if (status === 408 || status === 504) {
    return 'El servidor tardó demasiado en responder. Verifica tu conexión e inténtalo nuevamente.';
  }

  if (status === 429) {
    return 'Se realizaron demasiados intentos de inicio de sesión. Espera un momento antes de volver a intentarlo.';
  }

  if (status >= 500) {
    return 'El servicio de inicio de sesión no está disponible temporalmente. Intenta nuevamente en unos minutos.';
  }

  const apiDetail = extractApiDetail(error);
  return apiDetail || 'No fue posible iniciar sesión. Intenta nuevamente y, si el problema continúa, contacta a soporte.';
}

function extractApiDetail(error: unknown): string {
  const errors = (error as { error?: { errors?: unknown } } | null)?.error?.errors;
  if (!Array.isArray(errors)) return '';

  return errors
    .map((item) => typeof item === 'object' && item !== null ? String((item as { detail?: unknown }).detail ?? '') : '')
    .filter(Boolean)
    .join(' ');
}
// ]]]FI
