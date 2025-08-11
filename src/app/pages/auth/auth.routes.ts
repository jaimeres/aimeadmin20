import { Routes } from '@angular/router';

export default [
  { path: 'error', loadComponent: () => import('./error').then((c) => c.Error) },
  { path: 'access', loadComponent: () => import('./accessdenied').then((c) => c.AccessDenied) },
  { path: 'login', loadComponent: () => import('./login').then((c) => c.Login) },
  { path: 'forgotpassword', loadComponent: () => import('./forgotpassword').then((c) => c.ForgotPassword) },
  { path: 'register', loadComponent: () => import('./register').then((c) => c.Register) },
  { path: 'newpassword', loadComponent: () => import('./newpassword').then((c) => c.NewPassword) },
  { path: 'verification', loadComponent: () => import('./verification').then((c) => c.Verification) },
  { path: 'lockscreen', loadComponent: () => import('./lockscreen').then((c) => c.LockScreen) },
  { path: '**', redirectTo: '/notfound' }
] as Routes;
