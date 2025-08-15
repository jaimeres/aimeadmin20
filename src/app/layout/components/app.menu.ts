import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu, [app-menu]',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
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
      label: 'Compras',
      items: [
        {
          label: 'Compras',
          items: [
            { label: 'Solicitudes', routerLink: ['/purchases/request'] },
            { label: 'Pedidos', routerLink: ['/purchases/orders'] },
          ]
        },
      ]
    },

    {
      label: 'Activos',
      items: [
        {
          label: 'Activos',
          items: [
            { label: 'Equipos y activos', routerLink: ['/assets/asset'] },
            { label: 'Mantenimiento', routerLink: ['/assets/maintenance'] },
            { label: 'Herramientas y refacciones', routerLink: ['/assets/tool_spare'] },
          ]
        },
      ]
    },

    {
      label: 'Apps',
      icon: 'pi pi-th-large',
      items: [
        {
          label: 'Blog',
          icon: 'pi pi-fw pi-comment',
          items: [
            {
              label: 'List',
              icon: 'pi pi-fw pi-image',
              routerLink: ['/apps/blog/list']
            },
            {
              label: 'Detail',
              icon: 'pi pi-fw pi-list',
              routerLink: ['/apps/blog/detail']
            },
            {
              label: 'Edit',
              icon: 'pi pi-fw pi-pencil',
              routerLink: ['/apps/blog/edit']
            }
          ]
        },
        {
          label: 'Chat',
          icon: 'pi pi-fw pi-comments',
          routerLink: ['/apps/chat']
        },
        {
          label: 'Files',
          icon: 'pi pi-fw pi-folder',
          routerLink: ['/apps/files']
        },
        {
          label: 'Kanban',
          icon: 'pi pi-fw pi-sliders-v',
          routerLink: ['/apps/kanban']
        },
        {
          label: 'Mail',
          icon: 'pi pi-fw pi-envelope',
          items: [
            {
              label: 'Inbox',
              icon: 'pi pi-fw pi-inbox',
              routerLink: ['/apps/mail/inbox']
            },
            {
              label: 'Compose',
              icon: 'pi pi-fw pi-pencil',
              routerLink: ['/apps/mail/compose']
            },
            {
              label: 'Detail',
              icon: 'pi pi-fw pi-comment',
              routerLink: ['/apps/mail/detail/1000']
            }
          ]
        },
        {
          label: 'Task List',
          icon: 'pi pi-fw pi-check-square',
          routerLink: ['/apps/tasklist']
        }
      ]
    },




    {
      label: 'Apps',
      icon: 'pi pi-th-large',
      items: [
        {
          label: 'Blog',
          icon: 'pi pi-fw pi-comment',
          items: [
            {
              label: 'List',
              icon: 'pi pi-fw pi-image',
              routerLink: ['/apps/blog/list']
            },
            {
              label: 'Detail',
              icon: 'pi pi-fw pi-list',
              routerLink: ['/apps/blog/detail']
            },
            {
              label: 'Edit',
              icon: 'pi pi-fw pi-pencil',
              routerLink: ['/apps/blog/edit']
            }
          ]
        },
        {
          label: 'Chat',
          icon: 'pi pi-fw pi-comments',
          routerLink: ['/apps/chat']
        },
        {
          label: 'Files',
          icon: 'pi pi-fw pi-folder',
          routerLink: ['/apps/files']
        },
        {
          label: 'Kanban',
          icon: 'pi pi-fw pi-sliders-v',
          routerLink: ['/apps/kanban']
        },
        {
          label: 'Mail',
          icon: 'pi pi-fw pi-envelope',
          items: [
            {
              label: 'Inbox',
              icon: 'pi pi-fw pi-inbox',
              routerLink: ['/apps/mail/inbox']
            },
            {
              label: 'Compose',
              icon: 'pi pi-fw pi-pencil',
              routerLink: ['/apps/mail/compose']
            },
            {
              label: 'Detail',
              icon: 'pi pi-fw pi-comment',
              routerLink: ['/apps/mail/detail/1000']
            }
          ]
        },
        {
          label: 'Gestión de Tareas',
          icon: 'pi pi-fw pi-check-square',
          routerLink: ['/tasks/task']
        },
        // ...existing code...
      ]
    },
    /*{
      label: 'UI Kit',
      icon: 'pi pi-fw pi-star-fill',
      items: [
        {
          label: 'Form Layout',
          icon: 'pi pi-fw pi-id-card',
          routerLink: ['/uikit/formlayout']
        },
        {
          label: 'Input',
          icon: 'pi pi-fw pi-check-square',
          routerLink: ['/uikit/input']
        },
        {
          label: 'Button',
          icon: 'pi pi-fw pi-box',
          routerLink: ['/uikit/button']
        },
        {
          label: 'Table',
          icon: 'pi pi-fw pi-table',
          routerLink: ['/uikit/table']
        },
        {
          label: 'List',
          icon: 'pi pi-fw pi-list',
          routerLink: ['/uikit/list']
        },
        {
          label: 'Tree',
          icon: 'pi pi-fw pi-share-alt',
          routerLink: ['/uikit/tree']
        },
        {
          label: 'Panel',
          icon: 'pi pi-fw pi-tablet',
          routerLink: ['/uikit/panel']
        },
        {
          label: 'Overlay',
          icon: 'pi pi-fw pi-clone',
          routerLink: ['/uikit/overlay']
        },
        {
          label: 'Media',
          icon: 'pi pi-fw pi-image',
          routerLink: ['/uikit/media']
        },
        {
          label: 'Menu',
          icon: 'pi pi-fw pi-bars',
          routerLink: ['/uikit/menu'],
          routerLinkActiveOptions: { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }
        },
        {
          label: 'Message',
          icon: 'pi pi-fw pi-comment',
          routerLink: ['/uikit/message']
        },
        {
          label: 'File',
          icon: 'pi pi-fw pi-file',
          routerLink: ['/uikit/file']
        },
        {
          label: 'Chart',
          icon: 'pi pi-fw pi-chart-bar',
          routerLink: ['/uikit/charts']
        },
        {
          label: 'Timeline',
          icon: 'pi pi-fw pi-calendar',
          routerLink: ['/uikit/timeline']
        },
        {
          label: 'Misc',
          icon: 'pi pi-fw pi-circle-off',
          routerLink: ['/uikit/misc']
        }
      ]
    },
    {
      label: 'Prime Blocks',
      icon: 'pi pi-fw pi-prime',
      items: [
        {
          label: 'Free Blocks',
          icon: 'pi pi-fw pi-eye',
          routerLink: ['/blocks']
        },
        {
          label: 'All Blocks',
          icon: 'pi pi-fw pi-globe',
          url: 'https://primeblocks.org/',
          target: '_blank'
        }
      ]
    },
    {
      label: 'Utilities',
      icon: 'pi pi-fw pi-compass',
      items: [
        {
          label: 'Figma',
          icon: 'pi pi-fw pi-pencil',
          url: 'https://www.figma.com/file/ijQrxq13lxacgkb6XHlLxA/Preview-%7C-Ultima-2022?node-id=354%3A7715&t=4HWBlQ8kHvfpLU08-1',
          target: '_blank'
        }
      ]
    },*/
    /*{
      label: 'Pages',
      icon: 'pi pi-fw pi-briefcase',
      items: [
        {
          label: 'Landing',
          icon: 'pi pi-fw pi-globe',
          routerLink: ['/landing']
        },
        {
          label: 'Auth',
          icon: 'pi pi-fw pi-user',
          items: [
            {
              label: 'Login',
              icon: 'pi pi-fw pi-sign-in',
              routerLink: ['/auth/login']
            },
            {
              label: 'Login 2',
              icon: 'pi pi-fw pi-sign-in',
              routerLink: ['/auth/login2']
            },
            {
              label: 'Error',
              icon: 'pi pi-fw pi-times-circle',
              routerLink: ['/auth/error']
            },
            {
              label: 'Error 2',
              icon: 'pi pi-fw pi-times-circle',
              routerLink: ['/auth/error2']
            },
            {
              label: 'Access Denied',
              icon: 'pi pi-fw pi-lock',
              routerLink: ['/auth/access']
            },
            {
              label: 'Access Denied 2',
              icon: 'pi pi-fw pi-lock',
              routerLink: ['/auth/access2']
            },
            {
              label: 'Register',
              icon: 'pi pi-fw pi-user-plus',
              routerLink: ['/auth/register']
            },
            {
              label: 'Forgot Password',
              icon: 'pi pi-fw pi-question',
              routerLink: ['/auth/forgotpassword']
            },
            {
              label: 'New Password',
              icon: 'pi pi-fw pi-cog',
              routerLink: ['/auth/newpassword']
            },
            {
              label: 'Verification',
              icon: 'pi pi-fw pi-envelope',
              routerLink: ['/auth/verification']
            },
            {
              label: 'Lock Screen',
              icon: 'pi pi-fw pi-eye-slash',
              routerLink: ['/auth/lockscreen']
            }
          ]
        },
        {
          label: 'Crud',
          icon: 'pi pi-fw pi-pencil',
          routerLink: ['/pages/crud']
        },
        {
          label: 'Invoice',
          icon: 'pi pi-fw pi-dollar',
          routerLink: ['/pages/invoice']
        },
        {
          label: 'Help',
          icon: 'pi pi-fw pi-question-circle',
          routerLink: ['/pages/help']
        },
        {
          label: 'Not Found',
          icon: 'pi pi-fw pi-exclamation-circle',
          routerLink: ['/pages/notfound']
        },
        {
          label: 'Empty',
          icon: 'pi pi-fw pi-circle-off',
          routerLink: ['/pages/empty']
        },
        {
          label: 'Contact Us',
          icon: 'pi pi-fw pi-phone',
          routerLink: ['/pages/contact']
        }
      ]
    },*/
    {
      label: 'E-Commerce',
      icon: 'pi pi-fw pi-wallet',
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
    },
    /*{
      label: 'User Management',
      icon: 'pi pi-fw pi-user',
      items: [
        {
          label: 'List',
          icon: 'pi pi-fw pi-list',
          routerLink: ['profile/list']
        },
        {
          label: 'Create',
          icon: 'pi pi-fw pi-plus',
          routerLink: ['profile/create']
        }
      ]
    },*/
    /*{
      label: 'Hierarchy',
      icon: 'pi pi-fw pi-align-left',
      items: [
        {
          label: 'Submenu 1',
          icon: 'pi pi-fw pi-align-left',
          items: [
            {
              label: 'Submenu 1.1',
              icon: 'pi pi-fw pi-align-left',
              items: [
                {
                  label: 'Submenu 1.1.1',
                  icon: 'pi pi-fw pi-align-left'
                },
                {
                  label: 'Submenu 1.1.2',
                  icon: 'pi pi-fw pi-align-left'
                },
                {
                  label: 'Submenu 1.1.3',
                  icon: 'pi pi-fw pi-align-left'
                }
              ]
            },
            {
              label: 'Submenu 1.2',
              icon: 'pi pi-fw pi-align-left',
              items: [
                {
                  label: 'Submenu 1.2.1',
                  icon: 'pi pi-fw pi-align-left'
                }
              ]
            }
          ]
        },
        {
          label: 'Submenu 2',
          icon: 'pi pi-fw pi-align-left',
          items: [
            {
              label: 'Submenu 2.1',
              icon: 'pi pi-fw pi-align-left',
              items: [
                {
                  label: 'Submenu 2.1.1',
                  icon: 'pi pi-fw pi-align-left'
                },
                {
                  label: 'Submenu 2.1.2',
                  icon: 'pi pi-fw pi-align-left'
                }
              ]
            },
            {
              label: 'Submenu 2.2',
              icon: 'pi pi-fw pi-align-left',
              items: [
                {
                  label: 'Submenu 2.2.1',
                  icon: 'pi pi-fw pi-align-left'
                }
              ]
            }
          ]
        }
      ]
    }*/
  ];
}
