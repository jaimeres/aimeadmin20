import { inject } from '@angular/core';
import { HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const TokenAccessInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  let request = req;
  const contentType = req.headers.get('Content-Type');

  // Si AuthorizationCheck es true, no enviar el token en headers
  if (req?.body?.authorizationCheck) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/vnd.api+json'
    });
    request = req.clone({ headers });
    return next(request);
  }

  // Si el token de acceso tiene más de 20 segundos de vida, lo envía
  if (authService.getTimeUntilTokenExpiration > 20) {
    const access = authService.access;
    let headers;
    if (contentType) {
      headers = new HttpHeaders({
        authorization: `JWT ${access}`,
      });
    } else {
      headers = new HttpHeaders({
        authorization: `JWT ${access}`,
        'Content-Type': 'application/vnd.api+json',
      });
    }
    request = req.clone({ headers });
    return next(request);
  }

  // Si el token está por expirar, refresca antes de enviar la solicitud
  return authService.tokenValidateInterceptor().pipe(
    take(1),
    mergeMap(access => {
      let headers;
      if (contentType) {
        headers = new HttpHeaders({
          authorization: `JWT ${access}`,
        });
      } else {
        headers = new HttpHeaders({
          authorization: `JWT ${access}`,
          'Content-Type': 'application/vnd.api+json',
        });
      }
      request = req.clone({ headers });
      return next(request);
    })
  );
};
