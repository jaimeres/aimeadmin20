import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root',
})
export class SupportContactService extends CRUDService {

  private readonly placeholderModules = [
    'support-contact-internal',
    'support-contact-clients',
    'support-contact-suppliers',
    'support-contact-notices',
    'support-contact-alerts'
  ];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });
  }
}
