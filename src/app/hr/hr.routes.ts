import { Routes } from '@angular/router';

export const HR_ROUTES: Routes = [

  {
    path: '',
    redirectTo: 'employees',
    pathMatch: 'full'
  },
  {
    path: 'organization-chart',
    loadComponent: () => import('./organization-chart/organization-chart.component').then(m => m.OrganizationChartComponent)
  },
  {
    path: 'employee',
    redirectTo: 'employees',
    pathMatch: 'full'
  },
  {
    path: 'employees',
    loadComponent: () => import('./employee/employee.component').then(m => m.EmployeeComponent)
  },
  {
    path: 'academy',
    redirectTo: 'courses-evaluations',
    pathMatch: 'full'
  },
  {
    path: 'courses-evaluations',
    loadComponent: () => import('./academy/academy.component').then(m => m.AcademyComponent)
  },
  {
    path: 'attendance',
    loadComponent: () => import('./attendance/attendance.component').then(m => m.AttendanceComponent)
  },
  {
    path: 'recruitment',
    loadComponent: () => import('./recruitment/recruitment.component').then(m => m.RecruitmentComponent)
  }

];

