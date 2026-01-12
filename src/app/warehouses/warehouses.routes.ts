import { Routes } from '@angular/router';

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: 'warehouse-movement',
    loadComponent: () => import('./warehouse-movement/warehouse-movement.component').then(m => m.WarehouseMovementComponent)
  }
  // Agrega más rutas para otros componentes standalone de warehouses si es necesario
];
