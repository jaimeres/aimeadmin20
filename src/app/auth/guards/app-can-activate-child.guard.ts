import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { take, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../../components/services/message.service';

/**
 * Guard hijo: solo retorna true si está autenticado, false si no lo está. No redirige.
 */
export const appCanActivateGuardChild: CanActivateFn = (route, state) => {
  const authS = inject(AuthService);
  const messageS: MessageService = inject(MessageService); // para mostrar mensajes
  messageS.showBlocked(true);

  return authS.tokenValidate().pipe(
    take(1),
    // [[[II ESC:001-02 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-02
    switchMap(valid => {
      if (!valid) {
        authS.redirectMP();
        return of(false);
      }
      return authS.ensureConfigForUrl(state.url, route.data?.['configModules'] || []).pipe(take(1));
    }),
    // ]]]FI
    map(valid => {
      if (!valid) {
        authS.redirectMP();
        return false;
      }
      return true;
    })
  );
};
