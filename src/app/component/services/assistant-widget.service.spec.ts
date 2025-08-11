import { TestBed } from '@angular/core/testing';

import { AssistantWidgetService } from './assistant-widget.service';

describe('AssistantWidgetService', () => {
  let service: AssistantWidgetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssistantWidgetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
