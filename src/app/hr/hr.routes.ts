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
    path: 'employees',
    loadComponent: () => import('./employee/employee.component').then(m => m.EmployeeComponent)
  },
  {
    path: 'attendance',
    loadComponent: () => import('./attendance/attendance.component').then(m => m.AttendanceComponent)
  },
  {
    path: 'recruitment',
    loadComponent: () => import('./recruitment/recruitment.component').then(m => m.RecruitmentComponent)
  },
  {
    path: 'job-title',
    loadComponent: () => import('./job-title/job-title.component').then(m => m.JobTitleComponent)
  },
  {
    path: 'work-schedule',
    loadComponent: () => import('./work-schedule/work-schedule.component').then(m => m.WorkScheduleComponent)
  },
  {
    path: 'contract',
    loadComponent: () => import('./contract/contract.component').then(m => m.ContractComponent)
  }

];

