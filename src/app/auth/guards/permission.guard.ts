import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { PermissionsService, PermissionSpec } from '../services/permissions.service';
import { MessageService } from '../../components/services/message.service';

/**
 * Guard que valida `route.data['permission']`.
 *  - Si la ruta declara `data.public: true` → siempre permite.
 *  - Si declara `data.permission` (string | number | array) → evalúa con `PermissionsService.has`.
 *  - Si NO declara `data.permission` → permite (compatibilidad: rutas sin migrar).
 *  - Soporta `data.permissionMode: 'any' | 'all'` (default: 'any').
 */
function evaluate(route: any, permsS: PermissionsService): boolean {
  const data = route?.data ?? {};
  if (data.public === true) return true;
  const spec = data.permission ?? data.permissions ?? null;
  if (spec == null) return true;

  const list: PermissionSpec[] = Array.isArray(spec) ? spec : [spec];
  if (list.length === 0) return true;

  const mode: 'any' | 'all' = data.permissionMode === 'all' ? 'all' : 'any';
  return mode === 'all' ? permsS.hasAll(list) : permsS.hasAny(list);
}

export const permissionGuard: CanActivateFn = (route) => {
  const permsS = inject(PermissionsService);
  const router = inject(Router);
  const messageS = inject(MessageService);

  if (evaluate(route, permsS)) return true;
  messageS.changeMessage('Sin permiso para acceder a esta sección', null, {}, 'warn', 'Acceso denegado');
  router.navigate(['/auth/access']);
  return false;
};

export const permissionChildGuard: CanActivateChildFn = (childRoute) => {
  const permsS = inject(PermissionsService);
  const router = inject(Router);
  const messageS = inject(MessageService);

  if (evaluate(childRoute, permsS)) return true;
  messageS.changeMessage('Sin permiso para acceder a esta sección', null, {}, 'warn', 'Acceso denegado');
  router.navigate(['/auth/access']);
  return false;
};
