import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { take, map } from 'rxjs/operators';
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
    map(valid => {
      if (!valid) {
        authS.redirectMP();
        return false;
      }
      return true;
    })
  );
};
