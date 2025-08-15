import { Component, computed, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { LayoutService } from '@/layout/service/layout.service';
import { AppConfigurator } from './app.configurator';
import { AppBreadcrumb } from './app.breadcrumb';
import { AppSidebar } from './app.sidebar';
import { AppRightMenu } from '@/layout/components/app.rightmenu';
import { Toast } from 'primeng/toast';
import { MessageService as MessageServiceP } from 'primeng/api';
import { MessageComponent } from '../../components/message/message.component';
import { LoginComponent } from '../../components/login/login.component';
import { MessageService } from '../../components/services/message.service';


// import { provideLottieOptions } from 'ngx-lottie';
import { AssistantWidgetComponent } from '../../components/assistant-widget/assistant-widget.component';
import { BlockedComponent } from '../../components/blocked/blocked.component';
import { CookieService } from 'ngx-cookie-service';
export function playerFactory() { return import('lottie-web'); }


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppConfigurator, AppBreadcrumb, AppRightMenu,
    Toast, MessageComponent, BlockedComponent, LoginComponent, AssistantWidgetComponent,],
  template: `
    <div class="layout-container " [ngClass]="containerClass()">
      <div app-topbar></div>
      <div app-right-menu></div>
      <div app-sidebar></div>
      <div class="layout-content-wrapper">
        <div app-breadcrumb></div>

        <div class="layout-content" style="padding: 0px; margin: 0px;"  >
          <router-outlet></router-outlet>
        </div>
      </div>

      <!--<app-config [configActive]="configActive"></app-config>-->
      <app-message></app-message>
      <app-login></app-login>
    </div>
    <app-configurator />
    <p-toast />
    <app-blocked />

        <app-assistant-widget
        [welcomeTips]="['¿Necesitas ayuda?', 'Puedo guiarte en este módulo', 'Pregunta lo que quieras']"
        animationPath="/assets/assistant/lottie_logo.json"
        apiUrl="/api/assistant/chat"
      ></app-assistant-widget>
   

  `,
  providers: [MessageServiceP],
})
export class AppLayout implements OnDestroy {
  overlayMenuOpenSubscription: Subscription;

  menuOutsideClickListener: any;

  menuScrollListener: any;

  @ViewChild(AppSidebar) appSidebar!: AppSidebar;

  @ViewChild(AppTopbar) appTopbar!: AppTopbar;

  constructor(
    public layoutService: LayoutService,
    public renderer: Renderer2,
    public router: Router,
    private messageS: MessageService,
    private cookieS: CookieService
  ) {
    this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
      if (!this.menuOutsideClickListener) {
        this.menuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
          const isOutsideClicked = !(
            this.appSidebar.appMenu.el.nativeElement.isSameNode(event.target) ||
            this.appSidebar.appMenu.el.nativeElement.contains(event.target) ||
            this.appTopbar.menuButton.nativeElement.isSameNode(event.target) ||
            this.appTopbar.menuButton.nativeElement.contains(event.target)
          );
          if (isOutsideClicked) {
            this.hideMenu();
          }
        });
      }

      if ((this.layoutService.isSlim() || this.layoutService.isSlimPlus()) && !this.menuScrollListener) {
        this.menuScrollListener = this.renderer.listen(this.appSidebar.appMenu.menuContainer.nativeElement, 'scroll', (event) => {
          if (this.layoutService.isDesktop()) {
            this.hideMenu();
          }
        });
      }

      if (this.layoutService.layoutState().staticMenuMobileActive) {
        this.blockBodyScroll();
      }
    });

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.hideMenu();
    });
  }

  blockBodyScroll(): void {
    if (document.body.classList) {
      document.body.classList.add('blocked-scroll');
    } else {
      document.body.className += ' blocked-scroll';
    }
  }

  unblockBodyScroll(): void {
    if (document.body.classList) {
      document.body.classList.remove('blocked-scroll');
    } else {
      document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

  hideMenu() {
    this.layoutService.layoutState.update((prev) => ({ ...prev, overlayMenuActive: false, staticMenuMobileActive: false, menuHoverActive: false }));
    this.layoutService.reset();
    if (this.menuOutsideClickListener) {
      this.menuOutsideClickListener();
      this.menuOutsideClickListener = null;
    }

    if (this.menuScrollListener) {
      this.menuScrollListener();
      this.menuScrollListener = null;
    }

    this.unblockBodyScroll();
  }

  containerClass = computed(() => {
    const layoutConfig = this.layoutService.layoutConfig();
    const layoutState = this.layoutService.layoutState();

    return {
      'layout-overlay': layoutConfig.menuMode === 'overlay',
      'layout-static': layoutConfig.menuMode === 'static',
      'layout-slim': layoutConfig.menuMode === 'slim',
      'layout-slim-plus': layoutConfig.menuMode === 'slim-plus',
      'layout-horizontal': layoutConfig.menuMode === 'horizontal',
      'layout-reveal': layoutConfig.menuMode === 'reveal',
      'layout-drawer': layoutConfig.menuMode === 'drawer',
      'layout-sidebar-dark': layoutConfig.darkTheme,
      'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
      'layout-overlay-active': layoutState.overlayMenuActive,
      'layout-mobile-active': layoutState.staticMenuMobileActive,
      'layout-topbar-menu-active': layoutState.topbarMenuActive,
      'layout-menu-profile-active': layoutState.rightMenuActive,
      'layout-sidebar-active': layoutState.sidebarActive,
      'layout-sidebar-anchored': layoutState.anchored,
      [`layout-topbar-${layoutConfig.topbarTheme}`]: true,
      [`layout-menu-${layoutConfig.menuTheme}`]: true,
      [`layout-menu-profile-${layoutConfig.menuProfilePosition}`]: true
    };
  });

  ngOnDestroy() {
    if (this.overlayMenuOpenSubscription) {
      this.overlayMenuOpenSubscription.unsubscribe();
    }

    if (this.menuOutsideClickListener) {
      this.menuOutsideClickListener();
    }
  }


  ngOnInit() {
    this.messageS.showBlocked(false);
    this.cookieS.delete('refresh');
  }
}

