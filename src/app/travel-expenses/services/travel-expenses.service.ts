import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root',
})
export class TravelExpensesService extends CRUDService {

  private readonly placeholderModules = [
    'travel-expenses-expenses',
    'travel-expenses-bank',
    'travel-expenses-verification',
    'travel-expenses-requests',
    'travel-expenses-reimbursements',
    'travel-expenses-hotels',
    'travel-expenses-transport',
    'travel-expenses-flights'
  ];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });
  }
}
