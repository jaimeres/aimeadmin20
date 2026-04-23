import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      'communication': this.authS.config['communication']?.cols ?? {},
      'communication-recipient': this.authS.config['communication-recipient']?.cols ?? {},
      'communication-message': this.authS.config['communication-message']?.cols ?? {},
      'communication-attachment': this.authS.config['communication-attachment']?.cols ?? {},
      'communication-template': this.authS.config['communication-template']?.cols ?? {},
      'communication-channel': this.authS.config['communication-channel']?.cols ?? {},
    });
  }
}
