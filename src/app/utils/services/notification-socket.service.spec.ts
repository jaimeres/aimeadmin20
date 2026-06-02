import { TestBed } from '@angular/core/testing';

import { NotificationSocketService } from './notification-socket.service';

describe('NotificationSocketService', () => {
  let service: NotificationSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('debe iniciar desconectado', () => {
    expect(service.connected()).toBeFalse();
  });

  it('emitLoginNotice no debe lanzar error sin conexión', () => {
    expect(() => service.emitLoginNotice({ id: 1, username: 'demo' })).not.toThrow();
  });

  it('disconnect debe dejar el estado en desconectado', () => {
    service.disconnect();
    expect(service.connected()).toBeFalse();
  });
});
