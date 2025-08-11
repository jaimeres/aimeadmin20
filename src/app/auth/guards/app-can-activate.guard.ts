import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { take, map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Retorna true o redirige a marketPlace si no está logueado
 * @param route 
 * @param state 
 * @returns Observable<boolean>
 */
export const appCanActivateGuard: CanActivateFn = (route, state) => {
  const authS = inject(AuthService);

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
