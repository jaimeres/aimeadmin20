import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root',
})
export class WarehouseMovementService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      'inventory-movement-detail': this.authS.config['inventory-movement-detail']['cols'],

    });




  }

}
