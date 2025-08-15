import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, shareReplay, take } from 'rxjs';
import { ConfigService } from 'src/app/auth/services/config.service';
import { GeneralService } from 'src/app/utils/services/general.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CRUDService {

  protected _base_url: String = environment.base_url;
  public type: string = '';
  public app: string = '';
  public relationships: any[] = [];

  // Cache estático compartido para todas las instancias
  private static configCache$: Observable<any> | null = null;
  private static instanceCount = 0;

  /**
   * Indica si el recurso contiene archivos.
   */
  public file: boolean = false;

  protected configS: ConfigService = inject(ConfigService);
  protected http: HttpClient = inject(HttpClient);
  //protected messageS: MessageService = inject(MessageService);
  public generalS: GeneralService = inject(GeneralService);

  /**
   * Contiene el app y el type para consumir el servicio de la API, debe ser la misma que la posición de cada app
   * #por seguridad se crea este diccinario para que solo se ponga la clave en el servidor
   */
  appType = {
    "unit": {
      "app": "units/unit",
      "type": "unit",
    },
    "currency": {
      "app": "currencies/currency",
      "type": "currency",
    },
    "group": {
      "app": "companies/group",
      "type": "group",
    },
    "company": {
      "app": "companies/company",
      "type": "company",
    },
    "subsidiary": {
      "app": "companies/subsidiary",
      "type": "subsidiary",
    },
    "warehouse": {
      "app": "companies/warehouse",
      "type": "warehouse",
    },
    "rack": {
      "app": "companies/rack",
      "type": "rack",
    },
    "section": {
      "app": "companies/section",
      "type": "section",
    },
    "asset": {
      "app": "assets/asset",
      "type": "asset",
    },
    "supplier": {
      "app": "suppliers/supplier",
      "type": "supplier",
    },
    "product": {
      "app": "products/product",
      "type": "product",
    },
    "base_product": {
      "app": "products/base-product",
      "type": "base-product",
    },

    "purchase_unit": {
      "app": "products/unit",
      "type": "unit",
    },
    "status": {
      "app": "status/status",
      "type": "status",
    },
    "file_type": {
      "app": "files/file-type",
      "type": "file-type",
    },
    "asset_type": {
      "app": "assets/asset-type",
      "type": "asset-type",
    },
    "capacity_type": {
      "app": "assets/capacity-type",
      "type": "capacity-type",
    },
    "asset_other": {
      "app": "assets/asset-other",
      "type": "asset-other",
    },
    "asset_document": {
      "app": "assets/asset-document",
      "type": "asset-document",
    },
    "person": {
      "app": "persons/person",
      "type": "person"
    },
    "contact": {
      "app": "contacts/contact",
      "type": "contact"
    },
    "user": {
      "app": "users/local-user",
      "type": "user"
    },
    "movement_type": {
      "app": "inventories/movement-type",
      "type": "movement-type",
    }

  }

  //public customField = signal<any>({});
  /*constructor() {
    this.configS.getConfig().subscribe((config: any) => {
      console.log('config+++++++++++++++++', config)
      this.customField.set({
        ...this.configS.is_activeCF(this.type ?? ''),
        ...this.configS.nameCF(this.type),
        ...this.configS.is_defaultCF(this.type),
        ...this.configS.is_requiredCF(this.type),
        ...this.configS.is_voidableCF(this.type),
        ...this.configS.sysCF(this.type),
        ...this.configS.CRUDCF(this.type),
        ...this.configS.time_zoneCF(this.type),
        ...this.configS.classifiersCF(this.type),
        ...this.configS.configuracionCF(this.type),
        ...this.configS.taskCF(this.type),
        ...this.configS.contactCF(this.type),
        ...this.configS.photoCF(this.type),
        ...this.configS.configurationCF(this.type),
        ...this.configS.dateCF(this.type),
        ...this.customField(),
        ...config
      });
    });
  }*/

  /**
   * Obtiene los nombres de los campos, se accede a ellos por el nombre de campo en ingles.
   */
  public customField = signal<any>({
    // la idea es que se puede obtner del servicio de configuracion, que a su vez se obtiene del servidor, 
    // la idea es que tome los valores por defecto o configurados por el usuario
    ...this.configS.is_activeCF(this.type ?? ''),
    ...this.configS.nameCF(this.type),
    ...this.configS.is_defaultCF(this.type),
    ...this.configS.is_requiredCF(this.type),
    ...this.configS.is_voidableCF(this.type),
    ...this.configS.sysCF(this.type),
    ...this.configS.CRUDCF(this.type),
    ...this.configS.time_zoneCF(this.type),
    ...this.configS.classifiersCF(this.type),
    ...this.configS.configuracionCF(this.type),
    ...this.configS.taskCF(this.type),
    ...this.configS.contactCF(this.type),
    ...this.configS.photoCF(this.type),
    ...this.configS.configurationCF(this.type),
    ...this.configS.dateCF(this.type),

  });

  baseUrl(app: string = '') {
    return `${this._base_url}/${app ? app : this.app}/`;
    //return `${this._base_url}/${this.app}/`;
  }

  /**
   * Prepara la cadena de parametros para la consulta.
   * @param include Opcional, incluir relaciones, los valores se separan por coma
   * @param filter Optional, filtro para regresar datos, los valores en envias en crudo, por ejemplo, filter[country]=MX
   * @param sort Optional, orden de los datos, los valores se separan por coma
   * @param fields Optional, campos a regresar, los valores se separan por coma
   * @param limit Optional, pagina a consultar,
   * @param type Optional, tipo de recurso a consultar
   * @returns retorna la cadena de parametros
   */
  query(include: string = '', filter: string = '', sort: string = '', fields: string = '', limit: number = 0,
    type: string = '', offset: number = 0): string {
    // crear cadena de parametros con formato json api solo si el parametro no esta vacio    
    let query = '';

    query += include ? `&include=${include}` : '';
    // pudiera enviarse el valor de un filtro y se representaria asi `&filter[${this.app}]=${filter}`, PERO,
    // como puede haber varios filtros de diferentes tablas, se envia el paramtro en crudi por ejempo, 
    // filter[classifier_level.classifier_type]=9
    query += filter ? `&${filter}` : '';
    query += sort ? `&sort=${sort}` : '';
    query += fields ? `&fields[${type ? type : this.type}]=${fields}` : '';
    query += limit ? `&page[limit]=${limit}` : '';
    query += offset ? `&page[offset]=${offset}` : '';

    // type lo tengo que poner en la clase para que lo pueda reutilizar o no porque en ocasiones
    // las consultas van a ocupar mas de un tupo

    // quitar el primer & de la cadena solo si inicia con &
    if (query.startsWith('&')) {
      query = query.substring(1);
    }

    // si la cadena no esta vacia, agregar ? al inicio
    if (query) {
      query = `?${query}`;
    }
    return query;
  }

  /**
   * 
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @returns retorna los datos
   */
  options(app = '') {

    //const query = this.query('', '', '', '', '', type);
    return this.http.options(`${this.baseUrl(app)}`).pipe(
      //IMPRIMIR RESPUESTA
      map((resp: any) => {
        return resp
      })
    )
  }

  /** °°°SE TIENE QUE ELIMINAR Y CAMBIAR POR GETOBJECT
   * Consulta al servidor los datos.
   * @param include Opcional, incluir relaciones
   * @param filter Opcional, filtro para regresar datos
   * @param sort Opcional, orden de datos
   * @param fields Opcional, campos a regresar
   * @param limit Opcional, pagina a consultar
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @param type Opcional, tipo de recurso a consultar, si no se envia se toma la de this.type
   * @returns retorna los datos
  */
  get(include: string = '', filter: string = '', sort: string = '', fields: string = '', limit: number = 250,
    app: string = '', type: string = '') {

    const query = this.query(include, filter, sort, fields, limit, type);
    return this.http.get(`${this.baseUrl(app)}${query}`).pipe(
      map((resp: any) => resp)
    );
  }

  /**
   * Consulta al servidor los datos.
   * @param include Opcional, incluir relaciones
   * @param filter Opcional, filtro para regresar datos
   * @param sort Opcional, orden de datos
   * @param fields Opcional, campos a regresar
   * @param limit Opcional, pagina a consultar
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @param type Opcional, tipo de recurso a consultar, si no se envia se toma la de this.type
   * @returns retorna los datos
  */
  getObject({
    include: include = '', filter: filter = '', sort: sort = '', fields: fields = '',
    limit: limit = 0, app: app = '', type: type = '', url: url = '', offset = 0
  }) {
    const query = this.query(include, filter, sort, fields, limit, type, offset);
    url = url ? url : `${this.baseUrl(app)}${query}`;
    return this.http.get(url);
  }

  /**
   * Consulta al servidor los datos.
   * @param id id del objeto a consultar
   * @param include Opcional, incluir relaciones
   * @param filter Opcional, filtro para regresar datos
   * @param sort Opcional, orden de datos
   * @param fields Opcional, campos a regresar
   * @param limit Opcional, pagina a consultar
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @param type Opcional, tipo de recurso a consultar, si no se envia se toma la de this.type
   * @param url Opcional, url a consultar, si no se envia se toma la de this.baseUrl
   * @returns retorna los datos
  */
  getDetail({
    id: id = '', include: include = '', filter: filter = '', sort: sort = '', fields: fields = '', limit = 0,
    app: app = '', type: type = '', url: url = ''
  }) {

    const query = this.query(include, filter, sort, fields, limit, type);

    url = url ? url : `${this.baseUrl(app)}${id}${query}`;
    return this.http.get(url).pipe(
      map((resp: any) => resp)
    );
  }


  /**
   * Consulta al servidor los datos.
   * @param id id del objeto a consultar
   * @param include Opcional, incluir relaciones
   * @param filter Opcional, filtro para regresar datos
   * @param sort Opcional, orden de datos
   * @param fields Opcional, campos a regresar
   * @param limit Opcional, pagina a consultar
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @param type Opcional, tipo de recurso a consultar, si no se envia se toma la de this.type
   * @returns retorna los datos
  */
  getRelated({
    id, related, include = '', filter = '', sort = '',
    fields = '', limit = 250, app = '', type = ''
  }: {
    id: string;
    related: string;
    include?: string;
    filter?: string;
    sort?: string;
    fields?: string;
    limit?: number;
    app?: string;
    type?: string;
  }) {

    const query = this.query(include, filter, sort, fields, limit, type);
    return this.http.get(`${this.baseUrl(app)}${id}/${related}${query}`).pipe(
      map((resp: any) => resp)
    );
  }

  /**
   * @param formData campos del formulario
   * @param include Opcional, incluir relaciones
   * @param fields Opcional, campos a regresar
   * @param filter Opcional, filtro para regresar datos,
   * @returns retorna el objeto creado
   */
  save(formData: any, include: string = '', fields: string = '', filter: string = '') {
    //°°°DEL FILTER NO ESTOY SEGURO
    const query = this.query(include, filter, '', fields);

    return this.http.post(`${this.baseUrl()}${query}`, this.generalS.baseDJA({
      attributes: formData,
      type: this.type,
      relationships: this.relationships
    })).pipe(
      map((resp: any) => resp)
    );
  }

  /**
   * @param formData campos del formulario
   * @param include Opcional, incluir relaciones
   * @param fields Opcional, campos a regresar
   * @param filter Opcional, filtro para regresar datos,
   * @param files Opcional, archivos a subir, si viene un archivo se envia como multipart/form-data
   * @returns retorna el objeto creado
   */
  saveObject({ formData, include = '', fields = '', filter = '' }: {
    formData: any;
    include?: string;
    fields?: string;
    filter?: string;
  }) {
    //°°°DEL FILTER NO ESTOY SEGURO
    const query = this.query(include, filter, '', fields);


    /* if (files) {
       const headers = new HttpHeaders({ 'Content-Type': 'multipart/form-data' });
       return this.http.post(`${this.baseUrl()}${query}`, this.generalS.baseDJAFormData({
         attributes: formData,
         type: this.type,
         relationships: this.relationships,
         files: files
       }), { headers }).pipe(
         map((resp: any) => resp));
     }*/
    const r = this.generalS.baseDJA({
      attributes: formData,
      type: this.type,
      relationships: this.relationships
    });

    return this.http.post(`${this.baseUrl()}${query}`, r).pipe(
      map((resp: any) => resp)
    );
  }

  /**
   * @param formData campos del formulario
   * @param id id del objeto a editar
   * @param include Opcional, incluir relaciones
   * @param fields Opcional, campos a regresar
   * @param filter Opcional, filtro para regresar datos,
   * @returns retorna el objeto editado
   */
  edit({ formData = {}, id, include = '', fields = '', filter = '', type = '',
    app = '', url = null, relationships = null }: {
      formData?: any;
      id: string;
      include?: string;
      fields?: string;
      filter?: string;
      type?: string;
      app?: string;
      url?: string | null;
      relationships?: any[] | null;
    }) {

    const query = this.query(include, filter, '', fields, 250, type);
    const finalUrl = url ? url : `${this.baseUrl(app)}${id}/${query}`;

    /*if (files) {
      const headers = new HttpHeaders({ 'Content-Type': 'multipart/form-data' });
      return this.http.patch(url, this.generalS.baseDJAFormData({
        attributes: formData,
        type: this.type,
        relationships: relationships || this.relationships,
        files: files,
        id: id
      }), { headers }).pipe(
        map((resp: any) => resp));
    }*/

    return this.http.patch(finalUrl, this.generalS.baseDJA({ //`${this.baseUrl()}${id}/${query}`
      attributes: formData,
      type: this.type,
      relationships: relationships || this.relationships,
      id: id
    })).pipe(
      map((resp: any) => resp)
    );
  }

  /**
   * @param id id del objeto a eliminar
   * @returns retorna el objeto eliminado
   */
  delete(id: string) {
    return this.http.delete(`${this.baseUrl()}${id}`);
  }

  /**
   * Contiene los nombres personalizados de los campos comunes. _cf de custom field
     * @returns objecto con los campos personalizados.
   */
  /*get customField() {
    // customFieldData contiene los campos personalizados de cada servicio,
    // se agrupan en customFieldData para que sea facil sobreescribir la funcion en la
    // clase que hereda, ya que typescript no soporta llamar a super().customField()
    return this.customFieldData;
  }*/



  getFile({
    id = null, include = '', filter = '', sort = '', fields = '', limit = 0,
    app = '', type = '', url = null
  }: {
    id?: string | null;
    include?: string;
    filter?: string;
    sort?: string;
    fields?: string;
    limit?: number;
    app?: string;
    type?: string;
    url?: string | null;
  }): Observable<Blob> {

    const query = this.query(include, filter, sort, fields, limit, type);
    const finalUrl = url ? url : `${this.baseUrl(app)}${id}${query}`;
    return this.http.get(finalUrl, { responseType: 'blob' }).pipe(
      map((resp: any) => resp)
    );
  }


}
