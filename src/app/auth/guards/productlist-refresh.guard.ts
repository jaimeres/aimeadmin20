import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const productListRefreshGuard: CanActivateFn = () => {
  const authS = inject(AuthService);
  // Si está logueado, refresca y permite acceso
  //authS.tokenValidate();
  // Si no está logueado, permite acceso público
  authS.tokenValidate().subscribe();
  return true;
};
