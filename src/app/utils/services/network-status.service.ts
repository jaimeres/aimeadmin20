import { Injectable, signal } from '@angular/core';
import { type PluginListenerHandle } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';

@Injectable({
  providedIn: 'root',
})
export class NetworkStatusService {

  // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
  private readonly _connected = signal(this.browserOnlineStatus());
  readonly connected = this._connected.asReadonly();

  private initialization: Promise<void> | null = null;
  private listenerHandle: PluginListenerHandle | null = null;
  private readonly browserOnlineListener = () => this._connected.set(true);
  private readonly browserOfflineListener = () => this._connected.set(false);
  private browserFallbackActive = false;

  initialize(): Promise<void> {
    this.initialization ??= this.setupMonitoring();
    return this.initialization;
  }

  async destroy(): Promise<void> {
    await this.listenerHandle?.remove();
    this.listenerHandle = null;

    if (this.browserFallbackActive && typeof window !== 'undefined') {
      window.removeEventListener('online', this.browserOnlineListener);
      window.removeEventListener('offline', this.browserOfflineListener);
      this.browserFallbackActive = false;
    }

    this.initialization = null;
  }

  private async setupMonitoring(): Promise<void> {
    try {
      this.applyStatus(await this.getNetworkStatus());
      this.listenerHandle = await this.addNetworkStatusListener((status) => {
        this.applyStatus(status);
      });
    } catch (error) {
      console.warn('No fue posible iniciar el monitor nativo de red; se usará el estado del navegador.', error);
      this.setupBrowserFallback();
    }
  }

  protected getNetworkStatus(): Promise<ConnectionStatus> {
    return Network.getStatus();
  }

  protected addNetworkStatusListener(listener: (status: ConnectionStatus) => void): Promise<PluginListenerHandle> {
    return Network.addListener('networkStatusChange', listener);
  }

  private applyStatus(status: ConnectionStatus): void {
    this._connected.set(status.connected);
  }

  private setupBrowserFallback(): void {
    this._connected.set(this.browserOnlineStatus());
    if (this.browserFallbackActive || typeof window === 'undefined') return;

    window.addEventListener('online', this.browserOnlineListener);
    window.addEventListener('offline', this.browserOfflineListener);
    this.browserFallbackActive = true;
  }

  private browserOnlineStatus(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }
  // ]]]FI
}
