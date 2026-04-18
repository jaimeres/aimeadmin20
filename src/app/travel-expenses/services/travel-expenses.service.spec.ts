import { TravelExpensesService } from './travel-expenses.service';
import { configureCrudServiceTesting } from '../../../testing/crud-test.helpers';

describe('TravelExpensesService', () => {
  let service: TravelExpensesService;

  beforeEach(() => {
    service = configureCrudServiceTesting(TravelExpensesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
