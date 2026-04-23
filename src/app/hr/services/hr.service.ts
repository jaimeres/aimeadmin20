import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root',
})
export class HrService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      'employee': this.authS.config['employee']['cols'],
      'recruitment': this.authS.config['recruitment']['cols'],
      'attendance': this.authS.config['attendance']['cols'],
      'department': this.authS.config['department']['cols'],
      'organizational-chart': this.authS.config['organizational-chart']['cols'],
      'work-schedule': this.authS.config['work-schedule']['cols'],
      'contract': this.authS.config['contract']['cols'],
    });


  }
}

