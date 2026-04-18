import { Routes } from '@angular/router';

export const SOCIAL_ROUTES: Routes = [

  {
    path: '',
    redirectTo: 'post',
    pathMatch: 'full'
  },

  {
    path: 'post',
    loadComponent: () => import('./post/post.component').then(m => m.PostComponent)
  },

];

