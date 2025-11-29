import { Routes } from '@angular/router';

export const CATALOGUES_ROUTES: Routes = [
  {
    path: 'product',
    loadComponent: () => import('./product/product.component').then(m => m.ProductComponent)
  },
  {
    path: 'currency',
    loadComponent: () => import('./currency/currency.component').then(m => m.CurrencyComponent)
  },
  {
    path: 'classifier',
    loadComponent: () => import('./classifier/classifier.component').then(m => m.ClassifierComponent)
  }
  // Agrega más rutas para otros componentes standalone de catalogues si es necesario
];
