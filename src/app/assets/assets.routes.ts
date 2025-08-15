import { Routes } from '@angular/router';

export const ASSETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'asset',
    pathMatch: 'full'
  },
  {
    path: 'asset',
    loadComponent: () => import('./asset/asset.component').then(m => m.AssetComponent)
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./maintenance/maintenance.component').then(m => m.MaintenanceComponent)
  },
  {
    path: 'tool_spare',
    loadComponent: () => import('./tool-spare/tool-spare.component').then(m => m.ToolSpareComponent)
  }
];
