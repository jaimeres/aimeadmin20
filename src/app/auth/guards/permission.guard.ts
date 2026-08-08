import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { PermissionsService, PermissionSpec } from '../services/permissions.service';
import { MessageService } from '../../components/services/message.service';
import { Observable, map } from 'rxjs';

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

// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
function evaluateAfterLoad(route: any, permsS: PermissionsService): boolean | Observable<boolean> {
  if (evaluate(route, permsS)) return true;
  const data = route?.data ?? {};
  const declaredSpec = data.permission ?? data.permissions ?? null;
  if (declaredSpec == null || permsS.hasTreeData()) return false;
  return permsS.refresh().pipe(map(() => evaluate(route, permsS)));
}

function deny(router: Router, messageS: MessageService): false {
  messageS.changeMessage('Sin permiso para acceder a esta sección', null, {}, 'warn', 'Acceso denegado');
  router.navigate(['/auth/access']);
  return false;
}
// ]]]FI

export const permissionGuard: CanActivateFn = (route) => {
  const permsS = inject(PermissionsService);
  const router = inject(Router);
  const messageS = inject(MessageService);

  const result = evaluateAfterLoad(route, permsS);
  return typeof result === 'boolean'
    ? (result || deny(router, messageS))
    : result.pipe(map((allowed) => allowed || deny(router, messageS)));
};

export const permissionChildGuard: CanActivateChildFn = (childRoute) => {
  const permsS = inject(PermissionsService);
  const router = inject(Router);
  const messageS = inject(MessageService);

  const result = evaluateAfterLoad(childRoute, permsS);
  return typeof result === 'boolean'
    ? (result || deny(router, messageS))
    : result.pipe(map((allowed) => allowed || deny(router, messageS)));
};
