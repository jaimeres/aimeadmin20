// [[[II ESC:025-01 DOC:docs/documents/2026-06-28-025-push-notifications-fcm-capacitor.md#escenario-01 TEST
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { PushDeviceService } from './push-device.service';
import { GeneralService } from 'src/app/utils/services/general.service';
import { MessageService } from 'src/app/components/services/message.service';

describe('PushDeviceService', () => {
  let service: PushDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: MessageService,
          useValue: {
            changeMessage: () => undefined,
          },
        },
        {
          provide: GeneralService,
          useValue: {
            getDeviceId: () => Promise.resolve(null),
            baseDJA: ({ attributes, type, id }: { attributes: any; type: string; id?: string }) => ({
              data: {
                type,
                ...(id ? { id } : {}),
                attributes,
              },
            }),
          },
        },
      ],
    });
    service = TestBed.inject(PushDeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('no registra push en plataforma web', async () => {
    await expectAsync(service.registerCurrentDevice()).toBeResolvedTo(null);
  });

  it('no inicializa listeners push en plataforma web', async () => {
    await expectAsync(service.initializePushHandlers()).toBeResolved();
    expect(service.lastPushMessage()).toBeNull();
    expect(service.foregroundPushCount()).toBe(0);
  });
});
// ]]]FI
