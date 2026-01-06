import { inject, Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})
export class AssetService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      'asset': this.authS.config['asset']['cols'],
      'maintenance': this.authS.config['maintenance']['cols'],
      //'other': this.authS.config['other']['cols'],
      'asset-type': this.authS.config['asset-type']['cols'],
      'capacity-type': this.authS.config['capacity-type']['cols'],
      //'asset-document': this.authS.config['asset-document']['cols'],
      //'asset-document-asset': this.authS.config['asset-document-asset']['cols']

    });


  }
}
