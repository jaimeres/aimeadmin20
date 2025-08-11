import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { MegaMenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '@/layout/service/layout.service';
import { Ripple } from 'primeng/ripple';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { MegaMenuModule } from 'primeng/megamenu';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadge } from 'primeng/overlaybadge';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: '[app-topbar]',
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, InputText, ButtonModule,
    MegaMenuModule, BadgeModule, OverlayBadge],
  templateUrl: './app.topbar.html',
  host: {
    class: 'layout-topbar'
  },
  styles: `
    :host ::ng-deep .p-overlaybadge .p-badge {
      outline-width: 0px;
    }

    /*@media screen and (max-width: 991px) {
      :host.layout-topbar {
        height: 7rem;
      }
    }*/
  `

})
export class AppTopbar {
  layoutService = inject(LayoutService);
  authS = inject(AuthService);

  isProductList = signal(false);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  @ViewChild('menuButton') menuButton!: ElementRef<HTMLButtonElement>;

  @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef<HTMLButtonElement>;

  onMenuButtonClick() {
    this.layoutService.onMenuToggle();
  }

  onRightMenuButtonClick() {
    this.layoutService.openRightMenu();
  }

  toggleConfigSidebar() {
    let layoutState = this.layoutService.layoutState();

    if (this.layoutService.isSidebarActive()) {
      layoutState.overlayMenuActive = false;
      layoutState.overlaySubmenuActive = false;
      layoutState.staticMenuMobileActive = false;
      layoutState.menuHoverActive = false;
      layoutState.configSidebarVisible = false;
    }
    layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
    this.layoutService.layoutState.set({ ...layoutState });
  }

  focusSearchInput() {
    setTimeout(() => {
      this.searchInput.nativeElement.focus();
    }, 150);
  }

  onTopbarMenuToggle() {
    this.layoutService.layoutState.update((val) => ({ ...val, topbarMenuActive: !val.topbarMenuActive }));
  }

  logout() {
    this.authS.logout().subscribe();
  }

  public userMenuVisible = false;

  constructor(private router: Router) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isProductList.set(this.router.url.includes('ecommerce/product-list'));
    });
  }

  hideMenuOnBlur() {
    // Retrasamos un poco para permitir click en los elementos del menú
    setTimeout(() => {
      this.userMenuVisible = false;
    }, 150);
  }

}
