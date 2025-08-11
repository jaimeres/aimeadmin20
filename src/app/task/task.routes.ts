import { Routes } from '@angular/router';

export default [
  {
    path: '',
    // canActivateChild: [catalogueGuard], // Agregar cuando tengas los guards
    // canDeactivate: [appCanDeactivateGuard], // Agregar cuando tengas los guards
    children: [
      {
        path: 'task',
        loadComponent: () => import('./task/task.component').then(m => m.TaskComponent),
        data: { breadcrumb: 'Tareas' }
      },
      // Redirección por defecto
      {
        path: '',
        redirectTo: 'task',
        pathMatch: 'full'
      }
    ]
  }
] as Routes;
