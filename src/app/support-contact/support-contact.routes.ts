import { Routes } from '@angular/router';

export const SUPPORT_CONTACT_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'internal',
        loadComponent: () => import('./internal/internal.component').then(m => m.InternalComponent),
        data: { breadcrumb: 'Internos' }
      },
      {
        path: 'clients',
        loadComponent: () => import('./clients/clients.component').then(m => m.ClientsComponent),
        data: { breadcrumb: 'Clientes' }
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./suppliers/suppliers.component').then(m => m.SuppliersComponent),
        data: { breadcrumb: 'Proveedores' }
      },
      {
        path: 'notices',
        loadComponent: () => import('./notices/notices.component').then(m => m.NoticesComponent),
        data: { breadcrumb: 'Avisos' }
      },
      {
        path: 'alerts',
        loadComponent: () => import('./alerts/alerts.component').then(m => m.AlertsComponent),
        data: { breadcrumb: 'Alertas' }
      },
      {
        path: '',
        redirectTo: 'internal',
        pathMatch: 'full'
      }
    ]
  }
];