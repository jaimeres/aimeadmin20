import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AppMenu } from './app.menu';
import { AppMenuProfile } from '@/layout/components/app.menuprofile';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/layout/service/layout.service';
import { AuthService } from '../../auth/services/auth.service';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { GeneralService } from '../../utils/services/general.service';

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
      <label class="pl-8"> <strong>Beta 1.0.7</strong></label>
      <div *ngIf="deviceIdSuffix()" class="pl-8" style="font-size: 0.7rem; color: #94a3b8;">
        ID: {{deviceIdSuffix()}}
      </div>
      <div *ngIf="showShareLogBtn()" class="pl-8 pt-2">
        <button type="button"
          (click)="shareRestartLog()"
          [disabled]="sharingLog()"
          style="font-size: 0.7rem; background: none; border: 1px solid #94a3b8; border-radius: 4px; color: #64748b; padding: 2px 8px; cursor: pointer;">
          <i class="pi pi-share-alt" style="font-size: 0.7rem; margin-right: 4px;"></i>
          {{ sharingLog() ? 'Enviando...' : 'Compartir Log' }}
        </button>
      </div>
    </div>
    
    <div app-menu-profile #menuProfileEnd *ngIf="menuProfilePosition() === 'end'"></div>
  </div>`
})
export class AppSidebar implements OnDestroy, OnInit {
  el = inject(ElementRef);

  layoutService = inject(LayoutService);
  authS = inject(AuthService);
  private generalS = inject(GeneralService);

  /** Últimos 12 caracteres del client_device_id; null si aún no existe en Preferences */
  deviceIdSuffix = signal<string | null>(null);

  /** Solo mostrar el botón en móvil nativo */
  showShareLogBtn = signal(false);

  /** Indicador de que se está compartiendo */
  sharingLog = signal(false);

  async ngOnInit() {
    const { value } = await Preferences.get({ key: 'client_device_id' });
    if (value) {
      this.deviceIdSuffix.set(value.slice(-12));
    }
    this.showShareLogBtn.set(this.generalS.isMobile());
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

  /** Recupera el log de reinicios del WebView y lo comparte vía Share nativo */
  async shareRestartLog(): Promise<void> {
    this.sharingLog.set(true);
    try {
      const LOG_KEY = 'webview_restart_log';
      const { value } = await Preferences.get({ key: LOG_KEY });
      const logs: any[] = value ? JSON.parse(value) : [];

      if (logs.length === 0) {
        // Sin log, compartir mensaje vacío
        await Share.share({
          title: 'WebView Restart Log',
          text: 'No hay registros de reinicio del WebView.',
          dialogTitle: 'Compartir Log'
        });
        return;
      }

      // Formatear legiblemente
      const deviceId = this.deviceIdSuffix() || 'unknown';
      const header = `=== WebView Restart Log ===\nDevice: ...${deviceId}\nFecha: ${new Date().toISOString()}\nEntradas: ${logs.length}\n${'='.repeat(30)}\n\n`;

      const body = logs.map((entry: any, i: number) => {
        const lines = [`#${i + 1} [${entry.type}] ${entry.timestamp}`];
        if (entry.type === 'webview_probable_restart') {
          lines.push(`  Boot anterior: ${entry.previousBoot}`);
          lines.push(`  Tiempo desde último boot: ${entry.elapsedMs}ms`);
        } else if (entry.type === 'app_restored_result') {
          lines.push(`  Plugin: ${entry.pluginId}.${entry.methodName}`);
          lines.push(`  Success: ${entry.success}`);
          if (entry.error) lines.push(`  Error: ${entry.error}`);
          lines.push(`  Data: ${entry.hasData}`);
        } else if (entry.type === 'webview_boot') {
          lines.push(`  URL: ${entry.url}`);
        }
        return lines.join('\n');
      }).join('\n\n');

      await Share.share({
        title: 'WebView Restart Log',
        text: header + body,
        dialogTitle: 'Compartir Log de Reinicios'
      });
    } finally {
      this.sharingLog.set(false);
    }
  }

  ngOnDestroy() {
    this.resetOverlay();
  }
}
