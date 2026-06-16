import { TestBed } from '@angular/core/testing';
import { GeneralService } from './general.service';
import { ClientCacheStorageService } from './client-cache-storage.service';

describe('ClientCacheStorageService', () => {
  let service: ClientCacheStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClientCacheStorageService,
        {
          provide: GeneralService,
          useValue: {
            isMobile: () => false,
          },
        },
      ],
    });

    service = TestBed.inject(ClientCacheStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
