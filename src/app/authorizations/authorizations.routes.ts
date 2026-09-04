import { Routes } from '@angular/router';

/**
 * Rutas del módulo transversal de autorizaciones.
 *
 * `levels` es el CATÁLOGO —la escalera y quién firma cada peldaño— y
 * `approvals` es la BANDEJA de trabajo. Se separan porque son dos oficios
 * distintos: configurar el flujo lo hace quien administra, y firmar lo hace
 * quien autoriza.
 */
export default [
  {
    path: '',
    children: [
      {
        path: 'levels',
        loadComponent: () => import('./levels/authorization-levels.component')
          .then(m => m.AuthorizationLevelsComponent),
        data: { breadcrumb: 'Niveles de autorización' }
      },
      {
        path: 'approvals',
        loadComponent: () => import('./approvals/approvals.component')
          .then(m => m.ApprovalsComponent),
        data: { breadcrumb: 'Autorizaciones' }
      },
      {
        path: '',
        redirectTo: 'approvals',
        pathMatch: 'full'
      },
    ]
  }
] as Routes;
