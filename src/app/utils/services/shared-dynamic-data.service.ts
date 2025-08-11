import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedDynamicDataService {
  /**
   * Array que almacena la información de cada aplicación.
   * Este array guarda los resultados de las consultas para evitar realizar peticiones repetidas al servidor,
   * a menos que se fuerce una nueva llamada. Normalmente, este array se utiliza en el método `getObject` de
   * CRUD y en todos los métodos `get` que actualizan datos.
   */
  public data: any[] = [];

  /**
   * Array que almacena los datos de los dropdowns que van en los formularios.
   * Este array guarda los resultados de las consultas para evitar realizar peticiones repetidas al servidor,
   * no ocupa pasarse por DJAtoObject porque solo toma el id y el name y puede ser que otros valores que estas identidicados
   */
  public drawDropdown: any[] = [];
}
