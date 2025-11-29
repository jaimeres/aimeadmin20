import { Component, computed, effect, ElementRef, inject, OnDestroy, Renderer2 } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { LayoutService } from '@/layout/service/layout.service';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: '[app-menu-profile]',
  standalone: true,
  imports: [CommonModule, TooltipModule, ButtonModule, RouterModule],
  template: `<button *ngIf="authS.loggedin" (click)="toggleMenu()" pTooltip="Profile" [tooltipDisabled]="isTooltipDisabled()">
      <img *ngIf="authS.user?.image" [src]="authS.user.image" alt="avatar" style="width: 32px; height: 32px;" />
      <i *ngIf="!authS.user?.image" class="pi pi-user" style="font-size: 1.5rem;"></i>
      <span class="text-start">
        <strong>{{authS.user.username}}</strong>
      </span>
      <i class="layout-menu-profile-toggler pi pi-fw" [ngClass]="{ 'pi-angle-down': menuProfilePosition() === 'start' || isHorizontal(), 'pi-angle-up': menuProfilePosition() === 'end' && !isHorizontal() }"></i>
    </button>

    <ul *ngIf="menuProfileActive()" [@menu]="isHorizontal() ? 'overlay' : 'inline'">
      <li pTooltip="Settings" [tooltipDisabled]="isTooltipDisabled()" [routerLink]="['/profile/create']">
        <button [routerLink]="['/documentation']">
          <i class="pi pi-cog pi-fw"></i>
          <span>Settings</span>
        </button>
      </li>
      <li pTooltip="Profile" [tooltipDisabled]="isTooltipDisabled()">
        <button [routerLink]="['/documentation']">
          <i class="pi pi-file-o pi-fw"></i>
          <span>Profile</span>
        </button>
      </li>
      <li pTooltip="Support" [tooltipDisabled]="isTooltipDisabled()">
        <button [routerLink]="['/documentation']">
          <i class="pi pi-compass pi-fw"></i>
          <span>Support</span>
        </button>
      </li>
      <li pTooltip="Logout" [tooltipDisabled]="isTooltipDisabled()" [routerLink]="['/auth/login2']">
        <button class="p-link">
          <i class="pi pi-power-off pi-fw"></i>
          <span>Logout</span>
        </button>
      </li>
    </ul>`,
  animations: [
    trigger('menu', [
      transition('void => inline', [style({ height: 0 }), animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 1, height: '*' }))]),
      transition('inline => void', [animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 0, height: '0' }))]),
      transition('void => overlay', [style({ opacity: 0, transform: 'scaleY(0.8)' }), animate('.12s cubic-bezier(0, 0, 0.2, 1)')]),
      transition('overlay => void', [animate('.1s linear', style({ opacity: 0 }))])
    ])
  ],
  host: {
    class: 'layout-menu-profile'
  }
})
export class AppMenuProfile implements OnDestroy {
  layoutService = inject(LayoutService);

  renderer = inject(Renderer2);

  el = inject(ElementRef);
  authS = inject(AuthService);

  isHorizontal = computed(() => this.layoutService.isHorizontal() && this.layoutService.isDesktop());

  menuProfileActive = computed(() => this.layoutService.layoutState().menuProfileActive);

  menuProfilePosition = computed(() => this.layoutService.layoutConfig().menuProfilePosition);

  isTooltipDisabled = computed(() => !this.layoutService.isSlim());

  subscription!: Subscription;

  outsideClickListener: any;

  constructor() {
    this.subscription = this.layoutService.overlayOpen$.subscribe(() => {
      if (this.isHorizontal() && this.menuProfileActive()) {
        this.layoutService.layoutState.update((value) => ({ ...value, menuProfileActive: false }));
      }
    });

    effect(() => {
      if (this.isHorizontal() && this.menuProfileActive() && !this.outsideClickListener) {
        this.bindOutsideClickListener();
      }

      if (!this.menuProfileActive() && this.isHorizontal()) {
        this.unbindOutsideClickListener();
      }
    });
  }

  bindOutsideClickListener() {
    if (this.isHorizontal()) {
      this.outsideClickListener = this.renderer.listen(document, 'click', (event: MouseEvent) => {
        if (this.menuProfileActive()) {
          const isOutsideClicked = !(this.el.nativeElement.isSameNode(event.target) || this.el.nativeElement.contains(event.target));
          if (isOutsideClicked) {
            this.layoutService.layoutState.update((value) => ({ ...value, menuProfileActive: false }));
          }
        }
      });
    }
  }

  unbindOutsideClickListener() {
    if (this.outsideClickListener) {
      this.outsideClickListener();
      this.outsideClickListener = null;
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.unbindOutsideClickListener();
  }

  toggleMenu() {
    this.layoutService.onMenuProfileToggle();
  }
}
