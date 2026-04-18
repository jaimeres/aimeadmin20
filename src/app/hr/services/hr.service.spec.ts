import { HrService } from './hr.service';
import { configureCrudServiceTesting } from '../../../testing/crud-test.helpers';

describe('HrService', () => {
  let service: HrService;

  beforeEach(() => {
    service = configureCrudServiceTesting(HrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
