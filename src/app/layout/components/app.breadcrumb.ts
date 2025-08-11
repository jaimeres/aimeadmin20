import { Component } from '@angular/core';
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
  template: `

    <div *ngIf="isProductList()" class="app-config-mobile-button">
      <input pInputText class="w-full " type="text" placeholder="Buscar productos.." />
    </div>


    <nav class="layout-breadcrumb" *ngIf="!isProductList()">
      <ol>
        <li><i class="pi pi-home"></i></li>
        <ng-template ngFor let-item let-last="last" [ngForOf]="breadcrumbs$ | async">
          <li><i class="pi pi-angle-right"></i></li>
          <li>
            <span>{{ item.label }}</span>
          </li>
        </ng-template>
      </ol>
    </nav>
    <div class="layout-breadcrumb-buttons" *ngIf="!isProductList()">
      <button pButton pRipple type="button" icon="pi pi-cloud-upload" class="p-button-rounded p-button-text p-button-plain"></button>
      <button pButton pRipple type="button" icon="pi pi-bookmark" class="p-button-rounded p-button-text p-button-plain"></button>
      <button pButton pRipple type="button" icon="pi pi-power-off" class="p-button-rounded p-button-text p-button-plain"></button>
    </div>
  `,
  host: {
    class: 'layout-breadcrumb-container'
  }
})
export class AppBreadcrumb {
  private readonly _breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);

  readonly breadcrumbs$ = this._breadcrumbs$.asObservable();

  constructor(private router: Router) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const root = this.router.routerState.snapshot.root;
      const breadcrumbs: Breadcrumb[] = [];
      this.addBreadcrumb(root, [], breadcrumbs);

      this._breadcrumbs$.next(breadcrumbs);
    });
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
