import { Routes } from '@angular/router';
import { UserList } from './userlist';
import { PermissionCatalogPage } from './permission-catalog';

export default [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    data: {
      breadcrumb: 'Usuarios',
      // [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
      permissions: ['users.user.list'],
      // ]]]FI
    },
    component: UserList,
  },
  // [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
  {
    path: 'user/:userId/permission-catalog',
    data: {
      breadcrumb: 'Catálogo de permisos',
      permissions: ['users.user.list', 'users.user-permissions.list'],
      permissionMode: 'all',
    },
    component: PermissionCatalogPage,
  },
  // ]]]FI
  // [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
  // El alta vive en el diálogo del CRUD estándar de usuarios.
  { path: 'create', redirectTo: 'list', pathMatch: 'full' }
  // ]]]FI
] as Routes;
