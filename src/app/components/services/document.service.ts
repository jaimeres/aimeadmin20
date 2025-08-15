import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentService extends CRUDService {

  constructor() {
    super();
    this.customField.update(current => {
      return {
        ...current,
      }
    });
  };

}
