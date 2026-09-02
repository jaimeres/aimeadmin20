// [[[II ESC:006-01 DOC:docs/documents/2026-06-01_006_android-http-local-debug.md#escenario-01 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12
import { environment } from '../../environments/environment';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function isLoopbackUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;

  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    return LOOPBACK_HOSTS.has(new URL(rawUrl.trim(), baseUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isNativeAndroid(): boolean {
  const capacitor = (window as any)?.Capacitor;
  return !!capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === 'android';
}

/**
 * En Android nativo, localhost/127.0.0.1 apuntan al propio dispositivo.
 * Para desarrollo con emulador oficial reescribimos a 10.0.2.2 y dejamos un
 * host configurable para pruebas en teléfono físico.
 */
export function resolveNativeLocalUrl(rawUrl: string): string {
  if (!rawUrl || !isNativeAndroid()) {
    return rawUrl;
  }

  const trimmedUrl = rawUrl.trim();

  try {
    const parsed = new URL(trimmedUrl);
    if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
      return trimmedUrl;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'ws:') {
      return trimmedUrl;
    }

    const overrideHost = String((environment as any).android_native_loopback_host || '10.0.2.2').trim();
    if (!overrideHost) {
      return trimmedUrl;
    }

    parsed.hostname = overrideHost;
    return parsed.toString();
  } catch {
    return trimmedUrl;
  }
}
// ]]]FI
