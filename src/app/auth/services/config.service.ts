import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, take } from 'rxjs';

//import { MessageService } from 'src/app/component/services/message.service';
import { GeneralService } from 'src/app/utils/services/general.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private _base_url: String = environment.base_url;
  CONFIG: any;

  // °°° no deberia de herader de GeneralService para evitar redundancia ya que estos servicos (GeneralService y ConfigService)
  // son llamados en el en servicio crud.service.ts
  constructor(
    private http: HttpClient,
    /*private messageS: MessageService,*/ private generalS: GeneralService
  ) { }

  //Solo es llamado una vez, ya que tiene .pipe(take(1))
  /*getConfig() {
    return this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
      map((resp: any) => resp.data),
      take(1)
    );
  }*/

  saveConfig(formData: any) {
    return this.http
      .patch(
        `${this._base_url}/settings/settings/me/`,
        this.generalS.baseDJA({
          attributes: formData,
          type: 'configuration',
          id: formData.id
        })
      )
      .pipe(map((resp: any) => resp.data));
  }

  // °°° DEBIDO A LO PESADO QUE ES LLAMAR A LA FUNCIÓN POR CADA LINEA DEBE SER POR CONFIGURACIÓN POR DEFECTO ESHABILITADO
  colorSelectedRow(elemento_seleccionado: any, todos_elementos_seleccionado: any[]): boolean {
    if (!todos_elementos_seleccionado) {
      return false;
    }
    return todos_elementos_seleccionado.includes(elemento_seleccionado);
  }

}
