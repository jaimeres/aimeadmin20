import { TestBed } from '@angular/core/testing';

import { SharedDynamicDataService } from './shared-dynamic-data.service';

describe('SharedDynamicDataService', () => {
  let service: SharedDynamicDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharedDynamicDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
