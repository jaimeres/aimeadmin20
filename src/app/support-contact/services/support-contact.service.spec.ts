import { SupportContactService } from './support-contact.service';
import { configureCrudServiceTesting } from '../../../testing/crud-test.helpers';

describe('SupportContactService', () => {
  let service: SupportContactService;

  beforeEach(() => {
    service = configureCrudServiceTesting(SupportContactService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
