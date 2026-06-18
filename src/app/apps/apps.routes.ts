import { Routes } from '@angular/router';

export default [
  {
    path: 'blog',
    loadChildren: () => import('./blog/blog.routes'),
    data: { breadcrumb: 'Blog' }
  },
  {
    path: 'chat',
    loadComponent: () => import('./chat').then((c) => c.Chat),
    data: { breadcrumb: 'Chat' }
  },
  {
    path: 'files',
    loadComponent: () => import('./files').then((c) => c.Files),
    data: { breadcrumb: 'Files' }
  },
  {
    path: 'mail',
    loadChildren: () => import('./mail/mail.routes'),
    data: { breadcrumb: 'Mail' }
  },
  {
    path: 'tasklist',
    loadComponent: () => import('./tasklist').then((c) => c.TaskList),
    data: { breadcrumb: 'Tasklist' }
  },
  {
    path: 'kanban',
    loadComponent: () => import('./kanban').then((c) => c.Kanban),
    data: { breadcrumb: 'Kanban' }
  }
  ,
  {
    path: 'task',
    // [[[II ESC:023-04 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-04
    loadComponent: () => import('../tasks/task/task.component').then((c) => c.TaskComponent),
    // ]]]FI
    data: { breadcrumb: 'Task' }
  }
] as Routes;
