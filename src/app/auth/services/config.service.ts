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
  getConfig() {
    return this.http.get(`${this._base_url}/configuration/general/`).pipe(
      map((resp: any) => resp.data),
      take(1)
    );
  }

  saveConfig(formData: any) {
    return this.http
      .patch(
        `${this._base_url}/configuration/general/`,
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

  // devuelve el elemento por default o null
  is_default(conf: any) {
    console.log(this.is_default.name);

    // let is_default = conf.find((type) => type.is_default);
    // if (is_default) {
    //   return is_default.id
    // }
    // return is_default
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos is_active
   */
  is_activeCF(service = '') {
    // Tengo pensado enviar el nombre del servicio para que sepa que campos debe retornar, ya que esta info viene ser servidor
    // por ejemplo, retorna el nombre de la configuración global o de la configuración particular, con esto, el nombre puede personalizarce
    // locall o globalmente
    return {
      is_active: 'Situación',
      is_active_false: 'Inactivo',
      is_active_true: 'Activo'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos is_required
   */
  is_requiredCF(service = '') {
    return {
      is_required: 'Requerido',
      is_required_true: 'Requerido',
      is_required_false: 'No requerido'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos name e id
   */
  nameCF(service = '') {
    return {
      id: 'Identificador',
      name: 'Nombre',
      short_name: 'Nombre corto',
      description: 'Descripción',
      name2: 'Nombre 2',
      last_name: 'Apellidos',
      external_code_number: 'Código externo',
      external_code_text: 'Código externo',
      code: 'Código',
      status: 'Estado'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos sys
   */
  sysCF(service = '') {
    return {
      // Dado que no va en el form, esta bien poner SI, NO
      sys: 'Sistema',
      sys_true: 'Si',
      sys_false: 'No'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos is_default
   */
  is_defaultCF(service = '') {
    return {
      //
      is_default: 'Prioridad',
      is_default_true: 'Por defecto', // predeterminado es mas largo
      is_default_false: 'Secundario'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos is_voidable
   */
  is_voidableCF(service = '') {
    return {
      is_voidable: 'Configurable',
      is_voidable_true: 'Configurable',
      is_voidable_false: 'No configurable',
      is_voidable_help: 'texto de ayuda para el campo configurable'
    };
  }

  /**
   * @param service Nombre del servicio que esta llamando
   * @returns Objecto con campos de creación, modificación e inactivación
   */
  CRUDCF(service = '') {
    return {
      utc_created_at: 'Creado',
      utc_modified_at: 'Modificado',
      utc_inactivated_at: 'Inactivado',
      created_by: 'Crea',
      //created_by_name: 'Creado por',
      modified_by: 'Modifica',
      //modified_by_name: 'Modificado por',
      inactivated_by: 'Inactiva'
      //inactivated_by_name: 'Inactivado por',
    };
  }

  //time_zone
  time_zoneCF(service = '') {
    return {
      time_zone: 'Zona horaria'
    };
  }

  //classifiers
  classifiersCF(service = '') {
    return {
      classifiers: 'Clasificador'
    };
  }

  configuracionCF(service = '') {
    return {
      configuracion: 'Configuración'
    };
  }

  taskCF(service = '') {
    return {
      task: 'Tarea',
      tasks: 'Tareas'
    };
  }

  contactCF(service = '') {
    return {
      email: 'Correo',
      website: 'Sitio web',
      contact_name: 'Nombre contacto',
      phone_number: 'Teléfono',
      job_title: 'Cargo'
    };
  }

  photoCF(service = '') {
    return {
      photo: 'Logo',
      file: 'Documento',
      files: 'Documentos',
      //esto no deberi mostrarse en las tablas de datos solo el los form
      document: 'Adjuntar documentos',
      documents: 'Documentos adjuntos'
    };
  }

  configurationCF(service = '') {
    return {
      configuration: 'Configuración'
    };
  }

  dateCF(service = '') {
    return {
      date: 'Fecha'
    };
  }
}
