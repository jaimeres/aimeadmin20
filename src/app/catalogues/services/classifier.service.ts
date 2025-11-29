import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClassifierService extends CRUDService {

  constructor() {
    super();

    console.log(this.authS.config);
    this.customField.set({
      'classifier': this.authS.config['classifier']['cols'],
      'classifier-level': this.authS.config['classifier-level']['cols'],

    });


  }


  /**
   * Consulta los clasificadores por mivel
   * @param id del nivel del clasificado
   * @returns Observable de los clasificadores por nivel
   */
  getClassifiersForLevel(filter: String) {
    // Tambien puedo armar la url manualmente `${this._classifiers}/classifier_levels/${id}/classifiers`
    return this.http.get(`${this._base_url}/classifiers/classifier?${filter}`).pipe(
      map((resp: any) => resp)//DJA
    );
  }

}
