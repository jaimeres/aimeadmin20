import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root',
})
export class SocialService extends CRUDService {

  private readonly placeholderModules = ['social-post'];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });
  }
}
