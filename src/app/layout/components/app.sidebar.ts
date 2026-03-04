import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AppMenu } from './app.menu';
import { AppMenuProfile } from '@/layout/components/app.menuprofile';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/layout/service/layout.service';
import { AuthService } from '../../auth/services/auth.service';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: '[app-sidebar]',
  standalone: true,
  imports: [AppMenuProfile, AppMenu, CommonModule],
  template: `<div *ngIf="authS.loggedin()" class="layout-sidebar" (mouseenter)="onMouseEnter()" (mouseleave)="onMouseLeave()">
    <div class="layout-sidebar-top">
      <a href="/">
        <img src="/images/logolargo.png" alt="Logo" class="layout-sidebar-logo" style="height: 32px; width: 140px;" />
        <img src="/images/logoslim.png" alt="Logo" class="layout-sidebar-logo-slim" style="height: 32px; width: 32px;" />
      </a>
      <button class="layout-sidebar-anchor" type="button" (click)="anchor()"></button>
    </div>
    <div style="padding: 0.5rem 1rem; text-align: center; font-size: 0.75rem; color: #64748b; font-weight: 500;">
      
    </div>
    <div app-menu-profile #menuProfileStart *ngIf="menuProfilePosition() === 'start'"></div>
    <div #menuContainer class="layout-menu-container">
      <div app-menu></div>
      <label class="pl-8"> <strong>Beta 1.0.4</strong></label>
      <div *ngIf="deviceIdSuffix()" class="pl-8" style="font-size: 0.7rem; color: #94a3b8;">
        ID: {{deviceIdSuffix()}}
      </div>
    </div>
    
    <div app-menu-profile #menuProfileEnd *ngIf="menuProfilePosition() === 'end'"></div>
  </div>`
})
export class AppSidebar implements OnDestroy, OnInit {
  el = inject(ElementRef);

  layoutService = inject(LayoutService);
  authS = inject(AuthService);

  /** Últimos 12 caracteres del client_device_id; null si aún no existe en Preferences */
  deviceIdSuffix = signal<string | null>(null);

  async ngOnInit() {
    const { value } = await Preferences.get({ key: 'client_device_id' });
    if (value) {
      this.deviceIdSuffix.set(value.slice(-12));
    }
  }

  @ViewChild(AppMenu) appMenu!: AppMenu;

  @ViewChild('menuProfileStart') menuProfileStart!: AppMenuProfile;

  @ViewChild('menuProfileEnd') menuProfileEnd!: AppMenuProfile;

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  overlayMenuActive = computed(() => this.layoutService.layoutState().overlayMenuActive);

  menuProfilePosition = computed(() => this.layoutService.layoutConfig().menuProfilePosition);

  anchored = computed(() => this.layoutService.layoutState().anchored);

  timeout: any;

  resetOverlay() {
    if (this.overlayMenuActive()) {
      this.layoutService.layoutState.update((val) => ({ ...val, overlayMenuActive: false }));
    }
  }

  onMouseEnter() {
    if (!this.anchored()) {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.layoutService.layoutState.update((val) => ({ ...val, sidebarActive: true }));
    }
  }

  onMouseLeave() {
    if (!this.anchored()) {
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.layoutService.layoutState.update((val) => ({ ...val, sidebarActive: false })), 300);
      }
    }
  }

  anchor() {
    this.layoutService.layoutState.update((val) => ({ ...val, anchored: !val.anchored }));
  }

  ngOnDestroy() {
    this.resetOverlay();
  }
}
