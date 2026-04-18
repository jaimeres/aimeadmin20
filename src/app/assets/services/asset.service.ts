import { inject, Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root'
})
export class AssetService extends CRUDService {

  private readonly placeholderModules = [
    'asset-tools-and-spares',
    'asset-locations',
    'asset-responsibilities-custodies'
  ];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      'asset': this.authS.config['asset']['cols'],
      'maintenance': this.authS.config['maintenance']['cols'],
      //'other': this.authS.config['other']['cols'],
      'asset-type': this.authS.config['asset-type']['cols'],
      'capacity-type': this.authS.config['capacity-type']['cols'],
      //'asset-document': this.authS.config['asset-document']['cols'],
      //'asset-document-asset': this.authS.config['asset-document-asset']['cols']
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });


  }
}
