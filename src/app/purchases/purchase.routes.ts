import { Routes } from '@angular/router';

export default [
  {
    path: '',
    children: [
      {
        path: 'request',
        redirectTo: 'requests',
        pathMatch: 'full'
      },
      {
        path: 'requests',
        loadComponent: () => import('./request/request.component').then(m => m.RequestComponent),
        data: { breadcrumb: 'Solicitudes' }
      },
      {
        path: 'supplier-request',
        loadComponent: () => import('./supplier-request/supplier-request.component').then(m => m.SupplierRequestComponent),
        data: { breadcrumb: 'Pedidos' }
      },
      {
        path: 'purchase',
        redirectTo: 'offers-prices',
        pathMatch: 'full'
      },
      {
        path: 'offers-prices',
        loadComponent: () => import('./offers-prices/offers-prices.component').then(m => m.OffersPricesComponent),
        data: { breadcrumb: 'Ofertas y precios' }
      },
      {
        path: 'auction',
        redirectTo: 'auctions',
        pathMatch: 'full'
      },
      {
        path: 'auctions',
        loadComponent: () => import('./auctions/auctions.component').then(m => m.AuctionsComponent),
        data: { breadcrumb: 'Subastas' }
      },
      {
        path: 'delivery-note',
        redirectTo: 'delivery-notes',
        pathMatch: 'full'
      },
      {
        path: 'delivery-notes',
        loadComponent: () => import('./delivery-notes/delivery-notes.component').then(m => m.DeliveryNotesComponent),
        data: { breadcrumb: 'Remisiones' }
      },
      {
        path: 'bill',
        redirectTo: 'bills',
        pathMatch: 'full'
      },
      {
        path: 'bills',
        loadComponent: () => import('./bills/bills.component').then(m => m.BillsComponent),
        data: { breadcrumb: 'Facturas' }
      },
      {
        path: 'direct-invoice',
        redirectTo: 'direct-invoices',
        pathMatch: 'full'
      },
      {
        path: 'direct-invoices',
        loadComponent: () => import('./direct-invoices/direct-invoices.component').then(m => m.DirectInvoicesComponent),
        data: { breadcrumb: 'Facturas factura directa' }
      },
      {
        path: 'pay',
        redirectTo: 'payments',
        pathMatch: 'full'
      },
      {
        path: 'payments',
        loadComponent: () => import('./payments/payments.component').then(m => m.PaymentsComponent),
        data: { breadcrumb: 'Pagar' }
      },
      {
        path: '',
        redirectTo: 'requests',
        pathMatch: 'full'
      }
    ]
  }
] as Routes;
