import { Routes } from '@angular/router';

export const COMMUNICATIONS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'communication',
    pathMatch: 'full'
  },
  {
    path: 'communication',
    loadComponent: () => import('./communication/communication.component').then(m => m.CommunicationComponent)
  }
];
