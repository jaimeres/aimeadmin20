import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { take, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard hijo: solo retorna true si está autenticado, false si no lo está. No redirige.
 */
export const appCanActivateGuardChild: CanActivateFn = (route, state) => {
  const authS = inject(AuthService);
  return authS.tokenValidate().pipe(
    take(1),
    map(valid => {
      console.log('appCanActivateGuardChild::::::::::::::::::::::::::::', valid);

      if (!valid) {
        authS.redirectMP();
        return false;
      }
      return true;
    })
  );
};
