import { Routes } from '@angular/router';

export default [
  { path: '', redirectTo: 'analytics', pathMatch: 'full' },
  { path: 'analytics', data: { breadcrumb: 'Mis indicadores' }, loadComponent: () => import('./analytics/dashboardanalytics').then((c) => c.DashboardAnalytics) },
  //{ path: 'sales', data: { breadcrumb: 'Nentas' }, loadComponent: () => import('./sales/dashboardsales').then((c) => c.DashboardSales) },
  //{ path: 'saas', data: { breadcrumb: 'Mis SaaS' }, loadComponent: () => import('./saas/dashboardsaas').then((c) => c.DashboardSaas) }
] as Routes;
