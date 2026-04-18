import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu, [app-menu]',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  styles: `
    @media (max-width: 991px) {
      /* El item clickeable (más alto y con más padding) */    
      /* Texto más grande */
      :host ::ng-deep .layout-menu .layout-menuitem-text {
        font-size: 1.5rem !important;
        line-height: 1.5 !important;
      }
    }
  `,
  template: ` <ul class="layout-menu" #menuContainer>
    <ng-container *ngFor="let item of model; let i = index">
      <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
      <li *ngIf="item.separator" class="menu-separator"></li>
    </ng-container>
  </ul>`
})
export class AppMenu {
  el: ElementRef = inject(ElementRef);

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  model: MenuItem[] = [
    {
      items: [
        {
          label: 'Indicadores',
          routerLink: ['/dashboards/analytics']
        }
      ]
    },

    {
      items: [
        {
          label: 'Social',
          routerLink: ['/social/post']
        }
      ]
    },
    /* 
      {
        items: [
          {
            label: 'huella',
            routerLink: ['biometric-test']
          }
        ]
      },    
    */

    {
      label: 'Bombas/utilitarios',
      items: [
        {
          label: 'Bombas/utilitarios',
          items: [
            { label: 'Bombas/utilitarios', routerLink: ['/assets/pumps-utilities'] },
            { label: 'Mantenimiento', routerLink: ['/assets/maintenance'] },

            { label: 'Herramientas y refacciones', routerLink: ['/assets/tools-and-spares'] },
            { label: 'Ubicaciones', routerLink: ['/assets/locations'] },
            { label: 'Reponsivas y resguardos', routerLink: ['/assets/responsibilities-custodies'] },
          ]
        },
      ]
    },

    {
      label: 'Diesel',
      items: [
        {
          label: 'Diesel',
          items: [
            { label: 'Cargar consumo', routerLink: ['/warehouses/fuel-consumption'] },
          ]
        }
      ]
    },

    {
      label: 'Compras',
      items: [
        {
          label: 'Compras',
          items: [
            { label: 'Solicitudes', routerLink: ['/purchases/requests'] },
            { label: 'Pedidos', routerLink: ['/purchases/orders'] },

            { label: 'Ofertas y precios', routerLink: ['/purchases/offers-prices'] },
            { label: 'Subastas', routerLink: ['/purchases/auctions'] },
            { label: 'Remisiones', routerLink: ['/purchases/delivery-notes'] },
            { label: 'Facturas', routerLink: ['/purchases/bills'] },
            { label: 'Facturas factura directa', routerLink: ['/purchases/direct-invoices'] },
            { label: 'Pagar', routerLink: ['/purchases/payments'] },

          ]
        },
      ]
    },

    {
      label: 'RRHH',
      items: [
        {
          label: 'RRHH',
          items: [
            { label: 'Trabajadores', routerLink: ['/hr/employees'] },
            { label: 'Reclutamiento', routerLink: ['/hr/recruitment'] },
            { label: 'Asistencia', routerLink: ['/hr/attendance'] },
            { label: 'Cursos y evaluaciones', routerLink: ['/hr/courses-evaluations'] },
            { label: 'Organigrama', routerLink: ['/hr/organization-chart'] },
          ]
        },
      ]
    },
    {
      label: 'Viáticos',
      items: [

        {
          label: 'Viáticos',
          items: [
            { label: 'Gastos', routerLink: ['/travel-expenses/expenses'] },
            { label: 'Banco', routerLink: ['/travel-expenses/bank'] },
            { label: 'Comprobar', routerLink: ['/travel-expenses/verification'] },
            { label: 'Solicitar', routerLink: ['/travel-expenses/requests'] },
            { label: 'Reembolsar', routerLink: ['/travel-expenses/reimbursements'] },
            { label: 'Hoteles', routerLink: ['/travel-expenses/hotels'] },
            { label: 'Transportes', routerLink: ['/travel-expenses/transport'] },
            { label: 'Vuelos', routerLink: ['/travel-expenses/flights'] },
          ]
        }
      ]
    },
    {
      label: 'Catálogos',
      items: [
        {
          label: 'Catálogos',
          items: [
            { label: 'Productos', routerLink: ['/catalogues/product'] },
            { label: 'Monedas', routerLink: ['/catalogues/currency'] },
            { label: 'Clasificadores', routerLink: ['/catalogues/classifier'] },
            { label: 'Impuestos', routerLink: ['/catalogues/tax'] },
            {
              label: 'Empresas',
              items: [
                { label: 'Grupos', routerLink: ['/catalogues/company?pos=group'] },
                { label: 'Empresas', routerLink: ['/catalogues/company'] },
                { label: 'Sucursales', routerLink: ['/catalogues/company?pos=subsidiary'] },
                { label: 'Almacenes', routerLink: ['/catalogues/company?pos=warehouse'] },
                { label: 'Secciones', routerLink: ['/catalogues/company?pos=section'] },
                { label: 'Anaqueles', routerLink: ['/catalogues/company?pos=rack'] },
                { label: 'Ubicaciones', routerLink: ['/catalogues/company?pos=slots'] },

              ]
            },
          ]
        }
      ]
    },


    {
      label: 'Marketplace',
      items: [
        {
          label: 'Marketplace',
          items: [
            { label: 'Productos', routerLink: ['/ecommerce/product-list'] },
            { label: 'Carrito', routerLink: ['/ecommerce/shopping-cart'] },
            { label: 'Historial', routerLink: ['/ecommerce/order-history'] },
          ]
        }
      ]
    },

    {
      label: 'Tareas y automatizaciones',
      items: [

        {
          label: 'Tareas y automatizaciones',
          items: [
            {
              label: 'Tareas', routerLink: ['/tasks/task']
            },
            {
              label: 'Formularios', routerLink: ['/tasks/workflow']
            }
          ]
        }]
    },

    {
      label: 'Soporte y contacto',
      items: [

        {
          label: 'Soporte y contacto', routerLink: ['/support-contact'],
          items: [
            { label: 'Internos', routerLink: ['/support-contact/internal'] },
            { label: 'Clientes', routerLink: ['/support-contact/clients'] },
            { label: 'Proveedores', routerLink: ['/support-contact/suppliers'] },
            { label: 'Avisos', routerLink: ['/support-contact/notices'] },
            { label: 'Alertas', routerLink: ['/support-contact/alerts'] },
          ]
        }

      ]
    },




    /*{
      label: 'E-Commerce',
      items: [
        {
          label: 'Product Overview',
          icon: 'pi pi-fw pi-image',
          routerLink: ['ecommerce/product-overview']
        },
        {
          label: 'Product List',
          icon: 'pi pi-fw pi-list',
          routerLink: ['ecommerce/product-list']
        },
        {
          label: 'New Product',
          icon: 'pi pi-fw pi-plus',
          routerLink: ['ecommerce/new-product']
        },
        {
          label: 'Shopping Cart',
          icon: 'pi pi-fw pi-shopping-cart',
          routerLink: ['ecommerce/shopping-cart']
        },
        {
          label: 'Checkout Form',
          icon: 'pi pi-fw pi-check-square',
          routerLink: ['ecommerce/checkout-form']
        },
        {
          label: 'Order History',
          icon: 'pi pi-fw pi-history',
          routerLink: ['ecommerce/order-history']
        },
        {
          label: 'Order Summary',
          icon: 'pi pi-fw pi-file',
          routerLink: ['ecommerce/order-summary']
        }
      ]
    },*/


  ];
}
