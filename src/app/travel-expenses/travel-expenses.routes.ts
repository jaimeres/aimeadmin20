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
        path: 'hotels',
        loadComponent: () => import('./hotels/hotels.component').then(m => m.HotelsComponent),
        data: { breadcrumb: 'Hoteles' }
      },
      {
        path: 'transport',
        loadComponent: () => import('./transport/transport.component').then(m => m.TransportComponent),
        data: { breadcrumb: 'Transportes' }
      },
      {
        path: 'flights',
        loadComponent: () => import('./flights/flights.component').then(m => m.FlightsComponent),
        data: { breadcrumb: 'Vuelos' }
      },
      {
        path: '',
        redirectTo: 'expenses',
        pathMatch: 'full'
      }
    ]
  }
];