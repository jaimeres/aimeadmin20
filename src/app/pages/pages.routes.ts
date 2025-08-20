import { Routes } from '@angular/router';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { AboutUs } from './aboutus/aboutus';
import { ContactUs } from './contactus/contactus';
import { Help } from './help/help';
import { Invoice } from './invoice/invoice';

export default [
  { path: 'aboutus', data: { breadcrumb: 'About' }, component: AboutUs },
  { path: 'contact', data: { breadcrumb: 'Contact' }, component: ContactUs },
  { path: 'crud', data: { breadcrumb: 'Crud' }, component: Crud },
  { path: 'empty', data: { breadcrumb: 'Empty' }, component: Empty },
  { path: 'help', data: { breadcrumb: 'Help' }, component: Help },
  { path: 'invoice', data: { breadcrumb: 'Invoice' }, component: Invoice },
  { path: '**', redirectTo: '/notfound' }
] as Routes;
