import { type PluginListenerHandle } from '@capacitor/core';
import { type AppState } from '@capacitor/app';
import { type ConnectionStatus } from '@capacitor/network';
import { TestBed } from '@angular/core/testing';

import { NetworkStatusService } from './network-status.service';

class TestNetworkStatusService extends NetworkStatusService {
  initialStatus: ConnectionStatus = { connected: false, connectionType: 'none' };
  failInitialization = false;
  statusListener: ((status: ConnectionStatus) => void) | undefined;
  appStateListener: ((state: AppState) => void) | undefined;
  readonly removeListener = jasmine.createSpy('removeListener').and.resolveTo();
  readonly removeAppStateListener = jasmine.createSpy('removeAppStateListener').and.resolveTo();

  protected override async getNetworkStatus(): Promise<ConnectionStatus> {
    if (this.failInitialization) throw new Error('plugin unavailable');
    return this.initialStatus;
  }

  protected override async addNetworkStatusListener(
    listener: (status: ConnectionStatus) => void,
  ): Promise<PluginListenerHandle> {
    this.statusListener = listener;
    return { remove: this.removeListener };
  }

  protected override async addAppStateListener(
    listener: (state: AppState) => void,
  ): Promise<PluginListenerHandle> {
    this.appStateListener = listener;
    return { remove: this.removeAppStateListener };
  }
}

describe('NetworkStatusService', () => {
  let service: TestNetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.runInInjectionContext(() => new TestNetworkStatusService());
  });

  afterEach(async () => {
    await service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06 ESC:027-08 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-08 ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
  it('publica los cambios informados por Capacitor Network', async () => {
    const changes: boolean[] = [];
    const subscription = service.connectionChanges.subscribe(
      (connected) => changes.push(connected),
    );

    await service.initialize();
    expect(service.connected()).toBeFalse();

    service.statusListener?.({ connected: true, connectionType: 'wifi' });
    expect(service.connected()).toBeTrue();
    expect(changes.at(-1)).toBeTrue();
    subscription.unsubscribe();
  });

  it('mantiene activos los eventos del navegador si el plugin no puede inicializarse', async () => {
    service.failInitialization = true;

    await service.initialize();
    window.dispatchEvent(new Event('offline'));

    expect(service.connected()).toBeFalse();
  });

  it('combina el evento offline del navegador con el monitor nativo activo', async () => {
    service.initialStatus = { connected: true, connectionType: 'wifi' };
    await service.initialize();

    window.dispatchEvent(new Event('offline'));

    expect(service.connected()).toBeFalse();
  });

  it('distingue una red activa de la disponibilidad real para la aplicación', async () => {
    service.initialStatus = { connected: true, connectionType: 'wifi' };
    await service.initialize();

    service.reportTransportFailure();
    expect(service.connected()).toBeTrue();
    expect(service.internetAvailable()).toBeFalse();

    service.reportServerResponse();
    expect(service.internetAvailable()).toBeTrue();
  });

  it('vuelve a consultar el plugin cuando la aplicación regresa a primer plano', async () => {
    service.initialStatus = { connected: true, connectionType: 'wifi' };
    await service.initialize();
    expect(service.connected()).toBeTrue();

    service.initialStatus = { connected: false, connectionType: 'none' };
    service.appStateListener?.({ isActive: true });
    await Promise.resolve();

    expect(service.connected()).toBeFalse();
    expect(service.internetAvailable()).toBeFalse();
  });

  it('confirma acceso a Internet contra el destino independiente configurado', async () => {
    service.initialStatus = { connected: true, connectionType: 'wifi' };
    await service.initialize();
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 204 }));

    expect(await service.probeInternetAccess()).toBeTrue();
    expect(fetchSpy).toHaveBeenCalledWith(
      jasmine.stringContaining('_connectivity_check='),
      jasmine.objectContaining({ method: 'HEAD', mode: 'no-cors', cache: 'no-store' }),
    );
  });

  it('informa que Internet no está disponible si el destino independiente falla', async () => {
    service.initialStatus = { connected: true, connectionType: 'wifi' };
    await service.initialize();
    spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

    expect(await service.probeInternetAccess()).toBeFalse();
  });
  // ]]]FI
});
