import { Component, OnInit, OnDestroy } from '@angular/core';
// [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
import {
  ActivationEnd,
  ActivationStart,
  GuardsCheckEnd,
  GuardsCheckStart,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  RouteConfigLoadEnd,
  RouteConfigLoadStart,
  Router,
  RouterModule
} from '@angular/router';
import { perfLog, perfMark, perfNow, perfTraceEnabled } from './app/utils/perf-trace';
// ]]]FI
import { BlockUIModule } from 'primeng/blockui';
import { SkeletonModule } from 'primeng/skeleton';
import { CommonModule } from '@angular/common';
import { UpdateDialogComponent } from './app/components/update-dialog/update-dialog.component';
import { UpdateManagerService } from './app/utils/services/update-manager.service';
import { UpdateCheckResult } from './app/utils/services/update.service';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
// [[[II ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10
import { OfflineBannerComponent } from './app/components/offline-banner/offline-banner.component';
// ]]]FI
// [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
import { NetworkStatusService } from './app/utils/services/network-status.service';
// ]]]FI

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    BlockUIModule,
    SkeletonModule,
    CommonModule,
    UpdateDialogComponent,
    // [[[II ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10
    OfflineBannerComponent,
    // ]]]FI
  ],
  template: `
    <!-- [[[II ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10 -->
    <app-offline-banner />
    <!-- ]]]FI -->
    <router-outlet></router-outlet>
    
    <!-- Diálogo de actualización -->
    <app-update-dialog
      [(visible)]="showUpdateDialog"
      [updateResult]="currentUpdateResult"
      [currentVersion]="currentVersion"
      [isOffline]="isOffline"
      [downloadProgress]="downloadProgress"
      [isDownloading]="isDownloading"
      (updateClicked)="handleUpdateClick()"
      (laterClicked)="handleLaterClick()"
      (skipOfflineClicked)="handleSkipOfflineClick()">
    </app-update-dialog>
  `
})
export class AppComponent implements OnInit, OnDestroy {

  showUpdateDialog = false;
  currentUpdateResult: UpdateCheckResult | null = null;
  currentVersion = '';
  isOffline = false;
  downloadProgress = 0;
  isDownloading = false;

  constructor(
    private updateManager: UpdateManagerService,
    private router: Router,
    // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
    private networkStatus: NetworkStatusService,
    // ]]]FI
  ) {
    // [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
    this._setupNavigationPerfTrace();
    // ]]]FI
  }

  // [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
  /**
   * Traza de navegación activable con el flag local `bos_perf_trace`.
   * Loguea el delta desde NavigationStart de cada hito del router y deja la
   * marca `bos:nav-start` para medir hasta el primer render del componente.
   * Desactivada por defecto: sin flag no se suscribe ni loguea nada.
   */
  private _setupNavigationPerfTrace(): void {
    if (!perfTraceEnabled()) return;

    let navStartedAt = 0;
    this.router.events.subscribe((event) => {
      const now = perfNow();

      if (event instanceof NavigationStart) {
        navStartedAt = now;
        perfMark('bos:nav-start');
        perfLog(`nav NavigationStart ${event.url}`, 0);
        return;
      }
      if (!navStartedAt) return;

      const label =
        event instanceof RouteConfigLoadStart ? 'RouteConfigLoadStart' :
        event instanceof RouteConfigLoadEnd ? 'RouteConfigLoadEnd' :
        event instanceof GuardsCheckStart ? 'GuardsCheckStart' :
        event instanceof GuardsCheckEnd ? 'GuardsCheckEnd' :
        event instanceof ActivationStart ? 'ActivationStart' :
        event instanceof ActivationEnd ? 'ActivationEnd' :
        event instanceof NavigationEnd ? 'NavigationEnd' :
        event instanceof NavigationCancel ? 'NavigationCancel' :
        event instanceof NavigationError ? 'NavigationError' : '';

      if (label) perfLog(`nav ${label}`, now - navStartedAt);
    });
  }
  // ]]]FI

  async ngOnInit() {
    // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
    await this.networkStatus.initialize();
    // ]]]FI

    // Inicializar el sistema de actualizaciones
    await this.updateManager.initialize();

    // ─── Detectar reinicio del WebView por Android (OOM kill) ───
    this._setupWebViewRestoreDetection();

    // Suscribirse a los observables del UpdateManager
    this.updateManager.updateDialogVisible.subscribe(visible => {
      this.showUpdateDialog = visible;
    });

    this.updateManager.currentUpdateResult.subscribe(result => {
      this.currentUpdateResult = result;
    });

    this.updateManager.currentVersion.subscribe(version => {
      this.currentVersion = version;
    });

    this.updateManager.isOffline.subscribe(offline => {
      this.isOffline = offline;
    });
  }

  ngOnDestroy() {
    // Limpiar recursos
    this.updateManager.destroy();
    // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
    void this.networkStatus.destroy();
    // ]]]FI
  }

  // ─── DETECCIÓN DE REINICIO DEL WEBVIEW POR ANDROID ───
  // Cuando Android mata la Activity por falta de memoria (ej. al abrir la cámara)
  // y la restaura, Capacitor emite 'appRestoredResult' con el resultado del plugin
  // que estaba pendiente. Además, marcamos el timestamp de arranque para detectar
  // cold-starts inesperados.
  //
  // ── BANDERA ──
  // Para activar/desactivar desde cualquier parte de la app o desde la consola:
  //   await Capacitor.Plugins.Preferences.set({ key: 'webview_restart_log_enabled', value: 'true' });
  //   await Capacitor.Plugins.Preferences.set({ key: 'webview_restart_log_enabled', value: 'false' });
  // Por defecto está ACTIVADO.

  private static readonly LOG_KEY = 'webview_restart_log';
  private static readonly FLAG_KEY = 'webview_restart_log_enabled';
  private static readonly MAX_ENTRIES = 50;

  private async _setupWebViewRestoreDetection(): Promise<void> {
    const isMobile = !!(window && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform());
    if (!isMobile) return;

    // Verificar bandera — si está explícitamente en 'false', no registrar nada
    const { value: flagValue } = await Preferences.get({ key: AppComponent.FLAG_KEY });
    if (flagValue === 'false') return;

    // 1. Registrar el timestamp de arranque del WebView
    const bootEntry = {
      type: 'webview_boot',
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    await this._appendLog(bootEntry);

    // 2. Verificar si el arranque anterior fue un kill (comparar con último boot)
    const { value } = await Preferences.get({ key: 'webview_last_boot' });
    if (value) {
      const lastBoot = JSON.parse(value);
      const elapsed = Date.now() - new Date(lastBoot.timestamp).getTime();
      // Si el último boot fue hace menos de 2 minutos, probablemente fue un restart por OOM
      if (elapsed < 120_000) {
        const restartEntry = {
          type: 'webview_probable_restart',
          timestamp: new Date().toISOString(),
          previousBoot: lastBoot.timestamp,
          elapsedMs: elapsed
        };
        await this._appendLog(restartEntry);
      }
    }
    await Preferences.set({ key: 'webview_last_boot', value: JSON.stringify(bootEntry) });

    // 3. Escuchar appRestoredResult — se dispara cuando Android restaura la Activity
    //    y entrega el resultado pendiente del plugin (ej. Camera.getPhoto)
    App.addListener('appRestoredResult', async (event) => {
      // Re-verificar la bandera en cada evento (pudo cambiar en runtime)
      const { value: flag } = await Preferences.get({ key: AppComponent.FLAG_KEY });
      if (flag === 'false') return;

      const logEntry = {
        type: 'app_restored_result',
        timestamp: new Date().toISOString(),
        pluginId: event.pluginId,
        methodName: event.methodName,
        success: event.success,
        error: event.error?.message || null,
        hasData: !!event.data
      };
      await this._appendLog(logEntry);
    });
  }

  /** Persiste una entrada de log en Preferences (sobrevive a reinicios del WebView). */
  private async _appendLog(entry: any): Promise<void> {
    const { value } = await Preferences.get({ key: AppComponent.LOG_KEY });
    const logs: any[] = value ? JSON.parse(value) : [];
    logs.push(entry);

    if (logs.length > AppComponent.MAX_ENTRIES) {
      logs.splice(0, logs.length - AppComponent.MAX_ENTRIES);
    }

    await Preferences.set({ key: AppComponent.LOG_KEY, value: JSON.stringify(logs) });
  }

  // ─── Métodos estáticos para consultar/gestionar el log desde cualquier parte ───

  /** Lee todo el log persistido. */
  static async getRestartLog(): Promise<any[]> {
    const { value } = await Preferences.get({ key: AppComponent.LOG_KEY });
    return value ? JSON.parse(value) : [];
  }

  /** Limpia el log persistido. */
  static async clearRestartLog(): Promise<void> {
    await Preferences.remove({ key: AppComponent.LOG_KEY });
  }

  /** Activa o desactiva el registro de eventos de reinicio. */
  static async setRestartLogEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({ key: AppComponent.FLAG_KEY, value: String(enabled) });
  }

  /** Consulta si el log está habilitado (true por defecto). */
  static async isRestartLogEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: AppComponent.FLAG_KEY });
    return value !== 'false';
  }

  async handleUpdateClick() {
    this.isDownloading = true;
    try {
      await this.updateManager.handleUpdateClick();
    } finally {
      this.isDownloading = false;
    }
  }

  async handleLaterClick() {
    await this.updateManager.handleLaterClick();
  }

  handleSkipOfflineClick() {
    this.updateManager.handleSkipOfflineClick();
  }
}
