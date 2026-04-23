import { Routes } from '@angular/router';

export const TRAVEL_EXPENSES_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'expenses',
        loadComponent: () => import('./expenses/expenses.component').then(m => m.ExpensesComponent),
        data: { breadcrumb: 'Gastos' }
      },
      {
        path: 'bank',
        loadComponent: () => import('./bank/bank.component').then(m => m.BankComponent),
        data: { breadcrumb: 'Banco' }
      },
      {
        path: 'verification',
        loadComponent: () => import('./verification/verification.component').then(m => m.VerificationComponent),
        data: { breadcrumb: 'Comprobar' }
      },
      {
        path: 'requests',
        loadComponent: () => import('./requests/requests.component').then(m => m.RequestsComponent),
        data: { breadcrumb: 'Solicitar' }
      },
      {
        path: 'reimbursements',
        loadComponent: () => import('./reimbursements/reimbursements.component').then(m => m.ReimbursementsComponent),
        data: { breadcrumb: 'Reembolsar' }
      },
      {
        path: 'trips',
        loadComponent: () => import('./trips/trips.component').then(m => m.TripsComponent),
        data: { breadcrumb: 'Viajes' }
      },
      {
        path: '',
        redirectTo: 'expenses',
        pathMatch: 'full'
      }
    ]
  }
];