// [[[II ESC:006-01 DOC:docs/documents/2026-06-01_006_android-http-local-debug.md#escenario-01
import { HttpInterceptorFn } from '@angular/common/http';
import { resolveNativeLocalUrl } from '../../utils/native-local-url.util';

/**
 * Reescribe localhost/127.0.0.1 solo en Android nativo para que el APK de
 * prueba pueda alcanzar el servidor local del host durante desarrollo.
 */
export const NativeLocalhostInterceptor: HttpInterceptorFn = (req, next) => {
  const resolvedUrl = resolveNativeLocalUrl(req.url);

  if (resolvedUrl === req.url) {
    return next(req);
  }

  return next(req.clone({ url: resolvedUrl }));
};
// ]]]FI