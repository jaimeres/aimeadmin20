import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { App, type AppState } from '@capacitor/app';
import { type PluginListenerHandle } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NetworkStatusService {

  // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06 ESC:027-08 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-08 ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
  private readonly ngZone = inject(NgZone);
  private readonly _connected = signal(this.browserOnlineStatus());
  readonly connected = this._connected.asReadonly();
  private readonly _transportAvailable = signal(true);
  readonly internetAvailable = computed(
    () => this._connected() && this._transportAvailable(),
  );
  private readonly connectionChangesSource = new Subject<boolean>();
  readonly connectionChanges = this.connectionChangesSource.asObservable();

  private initialization: Promise<void> | null = null;
  private listenerHandle: PluginListenerHandle | null = null;
  private appStateListenerHandle: PluginListenerHandle | null = null;
  private readonly browserOnlineListener = () => this.updateConnected(true);
  private readonly browserOfflineListener = () => this.updateConnected(false);
  private browserMonitoringActive = false;
  private connectivityProbeInFlight: Promise<boolean> | null = null;

  initialize(): Promise<void> {
    this.initialization ??= this.setupMonitoring();
    return this.initialization;
  }

  // [[[II ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11
  reportTransportFailure(): void {
    this.ngZone.run(() => this._transportAvailable.set(false));
  }

  reportInternetAvailable(): void {
    this.ngZone.run(() => this._transportAvailable.set(true));
  }

  reportServerResponse(): void {
    this.reportInternetAvailable();
  }
  // ]]]FI

  // [[[II ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13 CONFIG
  probeInternetAccess(): Promise<boolean> {
    if (!this._connected()) return Promise.resolve(false);

    this.connectivityProbeInFlight ??= this.executeConnectivityProbe()
      .finally(() => this.connectivityProbeInFlight = null);
    return this.connectivityProbeInFlight;
  }

  private async executeConnectivityProbe(): Promise<boolean> {
    const configuredUrl = String(environment.connectivity_probe_url || '').trim();
    if (!configuredUrl || typeof fetch === 'undefined') return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const probeUrl = new URL(configuredUrl);
      probeUrl.searchParams.set('_connectivity_check', Date.now().toString());
      await fetch(probeUrl.toString(), {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  // ]]]FI

  async destroy(): Promise<void> {
    await this.listenerHandle?.remove();
    this.listenerHandle = null;
    await this.appStateListenerHandle?.remove();
    this.appStateListenerHandle = null;

    if (this.browserMonitoringActive && typeof window !== 'undefined') {
      window.removeEventListener('online', this.browserOnlineListener);
      window.removeEventListener('offline', this.browserOfflineListener);
      this.browserMonitoringActive = false;
    }

    this.initialization = null;
  }

  private async setupMonitoring(): Promise<void> {
    // WebView y navegador complementan al listener nativo. Esto cubre también
    // rutas públicas y eventos que Android entrega fuera del ciclo de Angular.
    this.setupBrowserMonitoring();

    try {
      this.applyStatus(await this.getNetworkStatus());
      this.listenerHandle = await this.addNetworkStatusListener((status) => {
        this.applyStatus(status);
      });
    } catch (error) {
      console.warn('No fue posible iniciar el monitor nativo de red; permanece activo el monitor del navegador.', error);
    }

    try {
      this.appStateListenerHandle = await this.addAppStateListener((state) => {
        if (state.isActive) void this.refreshNetworkStatus();
      });
    } catch (error) {
      console.warn('No fue posible activar la verificación de red al volver a la aplicación.', error);
    }
  }

  protected getNetworkStatus(): Promise<ConnectionStatus> {
    return Network.getStatus();
  }

  protected addNetworkStatusListener(listener: (status: ConnectionStatus) => void): Promise<PluginListenerHandle> {
    return Network.addListener('networkStatusChange', listener);
  }

  protected addAppStateListener(listener: (state: AppState) => void): Promise<PluginListenerHandle> {
    return App.addListener('appStateChange', listener);
  }

  private async refreshNetworkStatus(): Promise<void> {
    try {
      this.applyStatus(await this.getNetworkStatus());
    } catch (error) {
      console.warn('No fue posible verificar la red al volver a la aplicación.', error);
    }
  }

  private applyStatus(status: ConnectionStatus): void {
    this.updateConnected(status.connected);
  }

  private setupBrowserMonitoring(): void {
    this.updateConnected(this.browserOnlineStatus());
    if (this.browserMonitoringActive || typeof window === 'undefined') return;

    window.addEventListener('online', this.browserOnlineListener);
    window.addEventListener('offline', this.browserOfflineListener);
    this.browserMonitoringActive = true;
  }

  private browserOnlineStatus(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private updateConnected(connected: boolean): void {
    if (this._connected() === connected) return;
    this.ngZone.run(() => {
      if (this._connected() === connected) return;
      this._connected.set(connected);
      if (connected) this._transportAvailable.set(true);
      this.connectionChangesSource.next(connected);
    });
  }
  // ]]]FI
}
