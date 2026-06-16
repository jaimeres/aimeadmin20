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

    /*{
      items: [
        {
          label: 'Social',
          routerLink: ['/social/post']
        }
      ]
    },*/
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
            // [[[II ESC:001-05 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-05
            { label: 'Cargar consumo', routerLink: ['/warehouses/fuel-consumption'], queryParams: { pos: 'inventory-movement-detail' } },
            // ]]]FI
          ]
        }
      ]
    },
    /*
        {
          label: 'Compras',
          items: [
            {
              label: 'Compras',
              items: [
                { label: 'Solicitudes', routerLink: ['/purchases/requests'] },
                { label: 'Pedidos', routerLink: ['/purchases/supplier-request'] },
    
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
                { label: 'Organigrama', routerLink: ['/hr/organization-chart'] },
                { label: 'Departamentos', routerLink: ['/hr/job-title'] },
                { label: 'Horarios de trabajo', routerLink: ['/hr/work-schedule'] },
                { label: 'Contratos', routerLink: ['/hr/contract'] },
    
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
                { label: 'Viajes', routerLink: ['/travel-expenses/trips'] },
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
                    { label: 'Grupos', routerLink: ['/catalogues/company'], queryParams: { pos: 'group' } },
                    { label: 'Empresas', routerLink: ['/catalogues/company'], queryParams: { pos: 'company' } },
                    { label: 'Sucursales', routerLink: ['/catalogues/company'], queryParams: { pos: 'subsidiary' } },
                    { label: 'Almacenes', routerLink: ['/catalogues/company'], queryParams: { pos: 'warehouse' } },
                    { label: 'Secciones', routerLink: ['/catalogues/company'], queryParams: { pos: 'section' } },
                    { label: 'Anaqueles', routerLink: ['/catalogues/company'], queryParams: { pos: 'rack' } },
                    { label: 'Ubicaciones', routerLink: ['/catalogues/company'], queryParams: { pos: 'slot' } },
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
    */
    {
      label: 'Automatizaciones',
      items: [

        {
          label: 'Automatizaciones',
          items: [
            {
              label: 'Tareas/formularios', routerLink: ['/tasks/task']
            },
            {
              label: 'Formularios', routerLink: ['/tasks/workflow']
            }
          ]
        }]
    },
    /*
        {
          label: 'Academia',
          items: [
            {
              label: 'Academia',
              items: [
                { label: 'Inicio', routerLink: ['/academy/home'] },
                { label: 'Cursos', routerLink: ['/academy/courses'] },
                { label: 'Evaluaciones', routerLink: ['/academy/evaluations'] },
              ]
            }
          ]
        },
    
        {
          label: 'Comunicaciones',
          items: [
    
            {
              label: 'Comunicaciones',
              items: [
                { label: 'Comunicaciones', routerLink: ['/communications/communication'], queryParams: { pos: 'communication' } },
                { label: 'Destinatarios', routerLink: ['/communications/communication'], queryParams: { pos: 'communication-recipient' } },
                { label: 'Mensajes', routerLink: ['/communications/communication'], queryParams: { pos: 'communication-message' } },
                { label: 'Adjuntos', routerLink: ['/communications/communication'], queryParams: { pos: 'communication-attachment' } },
                { label: 'Plantillas', routerLink: ['/communications/communication'], queryParams: { pos: 'communication-template' } },
                { label: 'Canales', routerLink: ['/communications/communication'], queryParams: { pos: 'communication-channel' } },
              ]
            }
    
          ]
        },
        */



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
