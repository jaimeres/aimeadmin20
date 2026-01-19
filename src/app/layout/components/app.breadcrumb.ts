import { Component } from '@angular/core';
import { CRUDService } from 'src/app/utils/services/crud.service';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

interface Breadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: '[app-breadcrumb]',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, RippleModule, InputTextModule],
  styles: [`
    .layout-breadcrumb-container {
      min-height: 2rem !important;
      height: 2rem !important;
      padding: 0 !important;
    }
    
    .layout-breadcrumb {
      height: 2rem !important;
      display: flex;
      align-items: center;
    }
    
    .layout-breadcrumb ol {
      margin: 0 !important;
      padding: 0 !important;
      display: flex;
      align-items: center;
      height: 100%;
    }
    
    .layout-breadcrumb ol li {
      display: flex;
      align-items: center;
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 0.875rem;
    }
    
    .layout-breadcrumb-buttons {
      height: 2rem !important;
      display: flex;
      align-items: center;
    }
    
    .layout-breadcrumb-buttons button {
      width: 2rem !important;
      height: 2rem !important;
      min-width: 2rem !important;
    }

    ::ng-deep.layout-breadcrumb-buttons button .p-button-icon {
      font-size: 1.8rem !important;
    }

    .app-config-mobile-button {
      height: 2rem !important;
      display: flex;
      align-items: center;
    }
    
    .app-config-mobile-button input {
      height: 2rem !important;
      padding: 0 0.5rem !important;
      font-size: 0.875rem !important;
    }
    
    /* Ocultar buscador de productos en breadcrumb en desktop */
    .breadcrumb-product-search {
      display: none;
      width: 100%;
    }
    
    .breadcrumb-product-search input {
      height: 2rem !important;
      width: 100%;
    }
    
    /* En móvil se muestra via styles.scss */
  `],
  template: `

    <div *ngIf="isProductList()" class="breadcrumb-product-search">
      <input pInputText class="w-full" type="text" placeholder="Buscar productos...." style="height: 3rem !important;" />
    </div>


    <nav class="layout-breadcrumb" *ngIf="!isProductList()" >
      <ol>
        <!--<li><i class="pi pi-home"></i></li>-->
        <ng-template ngFor let-item let-last="last" [ngForOf]="breadcrumbs$ | async">
          <li><i class="pi pi-angle-right"></i></li>
          <li>
            <span>{{ item.label }}</span>
          </li>
        </ng-template>
      </ol>
    </nav>
    <div class="layout-breadcrumb-buttons" *ngIf="!isProductList()">
      <ng-container *ngFor="let item of lastVisited">
        <button pButton pRipple type="button" [icon]="item.icon" class="p-button-rounded p-button-text p-button-plain" 
        [title]="item.name" (click)="router.navigateByUrl(item.url)"></button>
      </ng-container>
    </div>
  `,
  host: {
    class: 'layout-breadcrumb-container'
  }
})
export class AppBreadcrumb {
  private readonly _breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);

  readonly breadcrumbs$ = this._breadcrumbs$.asObservable();

  public lastVisited: Array<{ icon: string; url: string; name: string }> = [];
  constructor(public router: Router, private crudService: CRUDService) {
    this.loadLastVisited();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: any) => {
      const root = this.router.routerState.snapshot.root;
      const breadcrumbs: Breadcrumb[] = [];
      this.addBreadcrumb(root, [], breadcrumbs);

      // Extraer el parámetro 'pos' del query string
      const urlSearchParams = new URLSearchParams(event.url.split('?')[1] || '');
      let posParam = urlSearchParams.get('pos');
      if (posParam) {
        const key = posParam.replace(/-/g, '_');
        const appTypeObj = this.crudService.appType[key as keyof typeof this.crudService.appType];
        if (appTypeObj && breadcrumbs.length > 0) {
          breadcrumbs[breadcrumbs.length - 1].label += ` / ${appTypeObj.name}`;
          this.saveLastVisited({
            icon: appTypeObj.icon,
            url: event.url,
            name: appTypeObj.name
          });
        }
      }

      this._breadcrumbs$.next(breadcrumbs);
    });
  }

  private saveLastVisited(item: { icon: string; url: string; name: string }) {
    let history = JSON.parse(localStorage.getItem('lastVisited') || '[]');
    history = history.filter((h: any) => h.url !== item.url);
    history.unshift(item);
    if (history.length > 5) history = history.slice(0, 5);
    localStorage.setItem('lastVisited', JSON.stringify(history));
    this.lastVisited = history;
  }

  private loadLastVisited() {
    this.lastVisited = JSON.parse(localStorage.getItem('lastVisited') || '[]');
  }

  isProductList(): boolean {
    return this.router.url.includes('product-list');
  }

  private addBreadcrumb(route: ActivatedRouteSnapshot, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
    const routeUrl = parentUrl.concat(route.url.map((url) => url.path));
    const breadcrumb = route.data['breadcrumb'];
    const parentBreadcrumb = route.parent && route.parent.data ? route.parent.data['breadcrumb'] : null;

    if (breadcrumb && breadcrumb !== parentBreadcrumb) {
      breadcrumbs.push({
        label: route.data['breadcrumb'],
        url: '/' + routeUrl.join('/')
      });
    }

    if (route.firstChild) {
      this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
    }
  }
}