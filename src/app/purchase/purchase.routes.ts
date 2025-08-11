import { Routes } from '@angular/router';

export default [
  {
    path: '',
    children: [
      {
        path: 'request',
        loadComponent: () => import('./request/request.component').then(m => m.RequestComponent),
        data: { breadcrumb: 'Solicitudes' }
      },
      {
        path: '',
        redirectTo: 'request',
        pathMatch: 'full'
      }
    ]
  }
] as Routes;
