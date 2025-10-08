import { Routes } from '@angular/router';

export const CATALOGUES_ROUTES: Routes = [
  {
    path: 'product',
    loadComponent: () => import('./product/product.component').then(m => m.ProductComponent)
  },
  {
    path: 'currency',
    loadComponent: () => import('./currency/currency.component').then(m => m.CurrencyComponent)
  }
  // Agrega más rutas para otros componentes standalone de catalogues si es necesario
];
