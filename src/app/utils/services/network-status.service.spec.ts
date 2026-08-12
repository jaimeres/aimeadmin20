import { type PluginListenerHandle } from '@capacitor/core';
import { type ConnectionStatus } from '@capacitor/network';

import { NetworkStatusService } from './network-status.service';

class TestNetworkStatusService extends NetworkStatusService {
  initialStatus: ConnectionStatus = { connected: false, connectionType: 'none' };
  failInitialization = false;
  statusListener: ((status: ConnectionStatus) => void) | undefined;
  readonly removeListener = jasmine.createSpy('removeListener').and.resolveTo();

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
}

describe('NetworkStatusService', () => {
  let service: TestNetworkStatusService;

  beforeEach(() => {
    service = new TestNetworkStatusService();
  });

  afterEach(async () => {
    await service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06
  it('publica los cambios informados por Capacitor Network', async () => {
    await service.initialize();
    expect(service.connected()).toBeFalse();

    service.statusListener?.({ connected: true, connectionType: 'wifi' });
    expect(service.connected()).toBeTrue();
  });

  it('usa los eventos del navegador si el plugin no puede inicializarse', async () => {
    service.failInitialization = true;

    await service.initialize();
    window.dispatchEvent(new Event('offline'));

    expect(service.connected()).toBeFalse();
  });
  // ]]]FI
});
