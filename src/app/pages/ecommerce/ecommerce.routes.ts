import { Routes } from '@angular/router';

import { appCanActivateGuardChild } from '../../auth/guards/app-can-activate-child.guard';
import { productListRefreshGuard } from '../../auth/guards/productlist-refresh.guard';

export default [
  {
    path: 'product-overview',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'Product Overview' },
    loadComponent: () => import('./productoverview').then((c) => c.ProductOverview)
  },
  {
    path: 'product-list',
    canActivate: [productListRefreshGuard],
    data: { breadcrumb: 'Product List' },
    loadComponent: () => import('./productlist').then((c) => c.ProductList)
  },
  {
    path: 'new-product',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'New Product' },
    loadComponent: () => import('./newproduct').then((c) => c.NewProduct)
  },
  {
    path: 'shopping-cart',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'Shopping Cart' },
    loadComponent: () => import('./shoppingcart').then((c) => c.ShoppingCart)
  },
  {
    path: 'checkout-form',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'Checkout Form' },
    loadComponent: () => import('./checkoutform').then((c) => c.CheckoutForm)
  },
  {
    path: 'order-history',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'Order History' },
    loadComponent: () => import('./orderhistory').then((c) => c.OrderHistory)
  },
  {
    path: 'order-summary',
    canActivate: [appCanActivateGuardChild],
    data: { breadcrumb: 'Order Summary' },
    loadComponent: () => import('./ordersummary').then((c) => c.OrderSummary)
  }
] as Routes;
