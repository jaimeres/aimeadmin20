import { Routes } from '@angular/router';

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'fuel-consumption',
    pathMatch: 'full'
  },
  {
    path: 'warehouse-movement',
    redirectTo: 'fuel-consumption',
    pathMatch: 'full'
  },
  {
    path: 'fuel-consumption',
    loadComponent: () => import('./warehouse-movement/warehouse-movement.component').then(m => m.WarehouseMovementComponent)
  }
  // Agrega más rutas para otros componentes standalone de warehouses si es necesario
];
