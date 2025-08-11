import { AppLayout } from '@/layout/components/app.layout';
import { Routes } from '@angular/router';
import { appCanActivateGuardChild } from './app/auth/guards/app-can-activate-child.guard';


export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    //canActivate: [appCanActivateGuard],
    children: [
      { path: '', redirectTo: '/dashboards', pathMatch: 'full' },
      {
        path: 'dashboards',
        data: { breadcrumb: 'Indicadores' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('@/pages/dashboard/dashboard.routes')
      },
      {
        path: 'uikit',
        data: { breadcrumb: 'UI Kit' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('@/pages/uikit/uikit.routes')
      },
      {
        path: 'documentation',
        data: { breadcrumb: 'Documentation' },
        canActivate: [appCanActivateGuardChild],
        loadComponent: () => import('@/pages/documentation/documentation').then((c) => c.Documentation)
      },
      {
        path: 'pages',
        data: { breadcrumb: 'Pages' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('@/pages/pages.routes')
      },
      {
        path: 'apps',
        data: { breadcrumb: 'Apps' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('./app/apps/apps.routes')
      },
      {
        path: 'ecommerce',
        data: { breadcrumb: 'E-Commerce' },
        loadChildren: () => import('@/pages/ecommerce/ecommerce.routes')
      },
      {
        path: 'blocks',
        data: { breadcrumb: 'Prime Blocks' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('@/pages/blocks/blocks.routes')
      },
      {
        path: 'profile',
        data: { breadcrumb: 'User Management' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('@/pages/usermanagement/usermanagement.routes')
      },
      {
        path: 'tasks',
        data: { breadcrumb: 'Gestión de Tareas' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('./app/task/task.routes')
      }, {
        path: 'purchases',
        data: { breadcrumb: 'Compras' },
        canActivate: [appCanActivateGuardChild],
        loadChildren: () => import('./app/purchase/purchase.routes')
      }
    ]
  },
  { path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes') },
  {
    path: 'landing',
    loadComponent: () => import('@/pages/landing/landing').then((c) => c.Landing)
  },
  {
    path: 'notfound',
    loadComponent: () => import('@/pages/notfound/notfound').then((c) => c.Notfound)
  },
  { path: '**', redirectTo: '/notfound' }
];
