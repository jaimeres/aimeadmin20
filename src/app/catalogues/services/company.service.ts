import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyService extends CRUDService {

  constructor() {
    super();
    this.customField.set({
      'group': this.authS.config['group']?.['cols'],
      'company': this.authS.config['company']?.['cols'],
      'subsidiary': this.authS.config['subsidiary']?.['cols'],
      'warehouse': this.authS.config['warehouse']?.['cols'],
      'section': this.authS.config['section']?.['cols'],
      'rack': this.authS.config['rack']?.['cols'],
      'slot': this.authS.config['slot']?.['cols'],
    });
  }

}
