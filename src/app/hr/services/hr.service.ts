import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root',
})
export class HrService extends CRUDService {

  private readonly placeholderModules = [
    'hr-employees',
    'hr-recruitment',
    'hr-attendance',
    'hr-courses-evaluations',
    'hr-organization-chart'
  ];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });
  }
}
