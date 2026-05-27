import { Injectable } from '@angular/core';
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
      'employee-asset-document': this.authS.config['employee-asset-document']['cols'],
      'maintenance-responsible-rule': this.authS.config['maintenance-responsible-rule']['cols'],
      'maintenance-responsible-rule-action': this.authS.config['maintenance-responsible-rule-action']['cols'],
      //'responsible-rule-catalog': this.authS.config['responsible-rule-catalog']['cols'],
      //asset-subsidiary
      'asset-subsidiary': this.authS.config['asset-subsidiary']['cols'],
    });
  }
}

