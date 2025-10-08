import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      'product': this.authS.config['product']['cols'],

    });

    console.log(this.authS.config['product']);


  }
}
