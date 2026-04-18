import { Routes } from '@angular/router';

export const ASSETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'pumps-utilities',
    pathMatch: 'full'
  },
  {
    path: 'asset',
    redirectTo: 'pumps-utilities',
    pathMatch: 'full'
  },
  {
    path: 'pumps-utilities',
    loadComponent: () => import('./asset/asset.component').then(m => m.AssetComponent)
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./maintenance/maintenance.component').then(m => m.MaintenanceComponent)
  },
  {
    path: 'tool_spare',
    redirectTo: 'tools-and-spares',
    pathMatch: 'full'
  },
  {
    path: 'tools-and-spares',
    loadComponent: () => import('./tool-spare/tool-spare.component').then(m => m.ToolSpareComponent)
  },
  {
    path: 'locations',
    loadComponent: () => import('./locations/locations.component').then(m => m.LocationsComponent)
  },
  {
    path: 'responsibilities-custodies',
    loadComponent: () => import('./responsibilities-custodies/responsibilities-custodies.component').then(m => m.ResponsibilitiesCustodiesComponent)
  }
];
