// [[[II ESC:006-01 DOC:docs/documents/2026-06-01_006_android-http-local-debug.md#escenario-01
import { environment } from '../../environments/environment';

const ANDROID_LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

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
    if (!ANDROID_LOOPBACK_HOSTS.has(parsed.hostname)) {
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