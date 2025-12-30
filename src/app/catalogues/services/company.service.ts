import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyService extends CRUDService {

  constructor() {
    super();
    this.customField.set({
      'group': this.authS.config['group']['cols'],
    });
  }

}
