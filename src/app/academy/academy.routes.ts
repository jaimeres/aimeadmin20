import { Routes } from '@angular/router';

export const ACADEMY_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
        data: { breadcrumb: 'Inicio' }
      },
      {
        path: 'courses',
        loadComponent: () => import('./courses/courses.component').then(m => m.CoursesComponent),
        data: { breadcrumb: 'Cursos' }
      },
      {
        path: 'courses/:id',
        loadComponent: () => import('./course-detail/course-detail.component').then(m => m.CourseDetailComponent),
        data: { breadcrumb: 'Detalle del curso' }
      },
      {
        path: 'evaluations',
        loadComponent: () => import('./evaluations/evaluations.component').then(m => m.EvaluationsComponent),
        data: { breadcrumb: 'Evaluaciones' }
      },
      {
        path: 'evaluations/:id',
        loadComponent: () => import('./evaluation-detail/evaluation-detail.component').then(m => m.EvaluationDetailComponent),
        data: { breadcrumb: 'Evaluación' }
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  }
];
