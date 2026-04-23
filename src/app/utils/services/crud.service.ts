import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, Subject } from 'rxjs';
import { ConfigService } from 'src/app/auth/services/config.service';
import { GeneralService } from 'src/app/utils/services/general.service';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CRUDService {

  protected _base_url: String = environment.base_url;
  public type: string = '';
  public app: string = '';
  public relationships: any[] = [];

  /** Notifica al breadcrumb que lastVisited cambió (desde changePos) */
  public lastVisitedChanged$ = new Subject<void>();

  /**
   * Indica si el recurso contiene archivos.
   */
  public file: boolean = false;
  protected configS: ConfigService = inject(ConfigService);
  protected http: HttpClient = inject(HttpClient);
  public generalS: GeneralService = inject(GeneralService);
  public authS = inject(AuthService);

  /**
   * Contiene el app y el type para consumir el servicio de la API, debe ser la misma que la posición de cada app
   * #por seguridad se crea este diccinario para que solo se ponga la clave en el servidor
   */
  public readonly appType = {
    "unit": {
      "app": "units/unit",
      "type": "unit",
      "name": "Unidades",
      "icon": "pi pi-box"
    },
    "currency": {
      "app": "currencies/currency",
      "type": "currency",
      "name": "Monedas",
      "icon": "pi pi-dollar"
    },
    "group": {
      "app": "companies/group",
      "type": "group",
      "name": "Grupos",
      "icon": "pi pi-sitemap"
    },
    "company": {
      "app": "companies/company",
      "type": "company",
      "name": "Empresas",
      "icon": "pi pi-building"
    },
    "subsidiary": {
      "app": "companies/subsidiary",
      "type": "subsidiary",
      "name": "Sucursales",
      "icon": "pi pi-home"
    },
    "warehouse": {
      "app": "companies/warehouse",
      "type": "warehouse",
      "name": "Almacenes",
      "icon": "pi pi-warehouse"
    },
    "rack": {
      "app": "companies/rack",
      "type": "rack",
      "name": "Anaqueles",
      "icon": "pi pi-th-large"
    },
    "section": {
      "app": "companies/section",
      "type": "section",
      "name": "Secciones",
      "icon": "pi pi-grid"
    },
    "slot": {
      "app": "companies/slot",
      "type": "slot",
      "name": "Ubicaciones",
      "icon": "pi pi-boxes"
    },
    "supplier": {
      "app": "suppliers/supplier",
      "type": "supplier",
      "name": "Proveedores",
      "icon": "pi pi-truck"
    },

    "product": {
      "app": "products/product",
      "type": "product",
      "name": "Productos",
      "icon": "pi pi-shopping-bag"
    },
    "base_product": {
      "app": "products/base-product",
      "type": "base-product",
      "name": "Productos Base",
      "icon": "pi pi-clone"
    },
    "purchase_unit": {
      "app": "products/unit",
      "type": "unit",
      "name": "Unidades de Compra",
      "icon": "pi pi-shopping-cart"
    },
    "status": {
      "app": "status/status",
      "type": "status",
      "name": "Estados",
      "icon": "pi pi-flag"
    },
    "file_type": {
      "app": "files/file-type",
      "type": "file-type",
      "name": "Tipos de Archivo",
      "icon": "pi pi-file"
    },
    "file": {
      "app": "files/file",
      "type": "file",
      "name": "Archivos",
      "icon": "pi pi-file"
    },
    "asset": {
      "app": "assets/asset",
      "type": "asset",
      "name": "Activos",
      "icon": "pi pi-desktop"
    },
    "maintenance": {
      "app": "assets/maintenance",
      "type": "maintenance",
      "name": "Mantenimiento",
      "icon": "pi pi-wrench"
    },
    "asset_type": {
      "app": "assets/asset-type",
      "type": "asset-type",
      "name": "Tipos de Activos",
      "icon": "pi pi-tags"
    },
    "capacity_type": {
      "app": "assets/capacity-type",
      "type": "capacity-type",
      "name": "Tipos de Capacidad",
      "icon": "pi pi-chart-bar"
    },
    "asset_other": {
      "app": "assets/asset-other",
      "type": "asset-other",
      "name": "Otros Activos",
      "icon": "pi pi-ellipsis-h"
    },
    "asset_document": {
      "app": "assets/asset-document",
      "type": "asset-document",
      "name": "Documentos de Activos",
      "icon": "pi pi-file-pdf"
    },
    "person": {
      "app": "persons/person",
      "type": "person",
      "name": "Personas",
      "icon": "pi pi-user"
    },
    "contact": {
      "app": "contacts/contact",
      "type": "contact",
      "name": "Contactos",
      "icon": "pi pi-address-book"
    },
    "user": {
      "app": "users/local-user",
      "type": "user",
      "name": "Usuarios",
      "icon": "pi pi-users"
    },
    "movement_type": {
      "app": "inventories/movement-type",
      "type": "movement-type",
      "name": "Tipos de Movimiento",
      "icon": "pi pi-arrows-alt"
    },
    "responsible": {
      "app": "responsibles/responsible",
      "type": "responsible",
      "name": "Responsables",
      "icon": "pi pi-user-check"
    },
    "inventory_movement_detail": {
      "app": "inventories/inventory-movement-detail",
      "type": "inventory-movement-detail",
      "name": "Movimientos de almacén",
      "icon": "pi pi-arrow-right-arrow-left"
    },
    "responsible_user_rule": {
      "app": "responsibles/responsible-user-rule",
      "type": "responsible-user-rule",
      "name": "Regla de responsable",
      "icon": "pi pi-user-check"
    },
    "alternate_equivalent": {
      "app": "products/alternate-equivalent",
      "type": "alternate-equivalent",
      "name": "Alternos/Equivalentes",
      "icon": "pi pi-sync"
    },
    "product_variation": {
      "app": "products/product-variation",
      "type": "product-variation",
      "name": "Variaciones de Producto",
      "icon": "pi pi-list"
    },
    "web_product": {
      "app": "products/web-product",
      "type": "web-product",
      "name": "Producto Web",
      "icon": "pi pi-globe"
    },
    "app_classifier_type": {
      "app": "classifiers/app-classifier-type",
      "type": "app-classifier-type",
      "name": "Tipo de Clasificador",
      "icon": "pi pi-tags"
    },
    "classifier_level": {
      "app": "classifiers/classifier-level",
      "type": "classifier-level",
      "name": "Niveles de Clasificador",
      "icon": "pi pi-sitemap"
    },
    "task": {
      "app": "tasks/task",
      "type": "task",
      "name": "Tareas",
      "icon": "pi pi-check-square"
    },
    "task_detail": {
      "app": "tasks/task-detail",
      "type": "task-detail",
      "name": "Detalle de Tarea",
      "icon": "pi pi-check-square"
    },
    "request_detail": {
      "app": "purchases/request-detail",
      "type": "request-detail",
      "name": "Detalle de Solicitud",
      "icon": "pi pi-file-edit"
    }
  };

  configCols(module: string) {
    console.log(module,);
    console.log(this.authS.config[module]);

    return this.authS.config[module]['config_cols'];
  }

  drawForm(module: string) {
    return this.authS.config[module]['draw'];
  }

  configGeneral(module: string) {
    return this.authS.config[module]['general'];
  }

  fieldsForm(module: string) {
    return this.authS.config[module]['fields'];
  }

  /**
   * Genera el string de parámetros de filtro a partir de un dict de fields.
   * Recibe el objeto fields (de fieldsForm(pos) en crud.class o fieldSignal()?.fields
   * en custom-local-settings) y devuelve una cadena tipo
   * "filter[field]=value&filter[other.icontains]=q".
   * Solo incluye campos con filter.active=true y default_value no nulo/vacío.
   * Para FK: extrae el id usando filter.option_value (default 'id').
   */
  buildFilterString(fields: Record<string, any>): string {
    const parts: string[] = [];
    for (const [fieldName, cfg] of Object.entries(fields)) {
      const filter = (cfg as any)?.cols?.filter ?? {};
      this._appendFilterParts(parts, fieldName, filter);
    }
    return parts.join('&');
  }

  /**
   * Genera el string de filtro desde data_type.filter (dropdowns).
   * Escenario 2: el filtro viene como { fieldName: { active, ops, default, default_value } }
   * directamente, sin el wrapper cols.
   * Ignora la clave especial 'logic'.
   */
  buildDropdownFilterString(filterConfig: Record<string, any>): string {
    if (!filterConfig || typeof filterConfig !== 'object') return '';
    const parts: string[] = [];
    for (const [fieldName, cfg] of Object.entries(filterConfig)) {
      if (fieldName === 'logic') continue;
      this._appendFilterParts(parts, fieldName, cfg);
    }
    return parts.join('&');
  }

  /**
   * Lógica compartida: dado un filter object {active, default, default_value, ops, option_value},
   * genera los fragmentos de query string correspondientes.
   * Si el fieldName contiene '_data_' (nomenclatura de relación, ej: provider_data_name),
   * se convierte a notación de punto para JSON:API (provider.name).
   */
  private _appendFilterParts(parts: string[], fieldName: string, filter: any): void {
    if (!filter?.active) return;
    const op: string = filter.default ?? 'exact';
    const rawValue = filter.default_value;
    if (rawValue === null || rawValue === undefined) return;
    const optVal: string = filter.option_value ?? 'id';

    // Convertir nomenclatura de relación: relacion_data_campo → relacion.campo
    const filterKey = fieldName.includes('_data_')
      ? fieldName.replace(/_data_/g, '__')
      : fieldName;

    if (op === 'isnull') {
      parts.push(`filter[${filterKey}.isnull]=true`);
      return;
    }
    if (op === 'in') {
      let list: string;
      if (Array.isArray(rawValue)) {
        list = rawValue
          .map((v: any) => (v !== null && typeof v === 'object' ? String(v[optVal] ?? '') : String(v)))
          .filter(Boolean).join(',');
      } else {
        list = String(rawValue);
      }
      if (list) parts.push(`filter[${filterKey}.in]=${encodeURIComponent(list)}`);
      return;
    }
    if (op === 'range') {
      // default_value es [v1, v2] para range
      if (Array.isArray(rawValue) && rawValue.length === 2) {
        if (rawValue[0]) parts.push(`filter[${filterKey}.after]=${encodeURIComponent(String(rawValue[0]))}`);
        if (rawValue[1]) parts.push(`filter[${filterKey}.before]=${encodeURIComponent(String(rawValue[1]))}`);
      }
      return;
    }
    // exact / icontains / etc.
    let val: string;
    if (rawValue !== null && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      val = String(rawValue[optVal] ?? '');
    } else {
      val = String(rawValue);
    }
    if (!val) return;
    parts.push(op === 'exact'
      ? `filter[${filterKey}]=${encodeURIComponent(val)}`
      : `filter[${filterKey}.${op}]=${encodeURIComponent(val)}`
    );
  }

  /**
   * Obtiene los nombres de los campos, se accede a ellos por el nombre de campo en ingles.
   */
  public customField = signal<any>({
    // la idea es que se puede obtner del servicio de configuracion, que a su vez se obtiene del servidor, 
    // la idea es que tome los valores por defecto o configurados por el usuario
    /*...this.configS.is_activeCF(this.type ?? ''),
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
    ...this.configS.dateCF(this.type),*/
  });

  baseUrl(app: string = '') {
    return `${this._base_url}/${app ? app : this.app}/`;
    //return `${this._base_url}/${this.app}/`;
  }

  /**
   * Convierte nomenclatura de relación en sort/ordering:
   * "-provider_data_name,created_at" → "-provider.name,created_at"
   * Respeta el prefijo '-' de orden descendente.
   */
  normalizeSortFields(sort: string): string {
    if (!sort) return sort;
    return sort.split(',').map(f => {
      f = f.trim();
      if (!f) return f;
      const desc = f.startsWith('-');
      const field = desc ? f.substring(1) : f;
      const normalized = field.includes('_data_') ? field.replace(/_data_/g, '__') : field;
      return desc ? `-${normalized}` : normalized;
    }).filter(Boolean).join(',');
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
    const normalizedSort = this.normalizeSortFields(sort);
    query += normalizedSort ? `&sort=${normalizedSort}` : '';
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
  get(include: string = '', filter: string = '', sort: string = '', fields: string = '', limit: number = 0,
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

    //console.log('-------++........', sort);

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
  edit({ formData = {}, id = '', include = '', fields = '', filter = '', type = '',
    app = '', url = null, relationships = null }: {
      formData?: any;
      id?: string;
      include?: string;
      fields?: string;
      filter?: string;
      type?: string;
      app?: string;
      url?: string | null;
      relationships?: any[] | null;
    }) {

    const query = this.query(include, filter, '', fields, 250, type);

    const final_slash = id ? '/' : ''; //practicamente es para settings/settings/me ya que lleva id
    const finalUrl = url ? url : `${this.baseUrl(app)}${id}${final_slash}${query}`;

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
   * Sube un archivo al endpoint de archivos (por defecto files/file) como
   * multipart/form-data. Reutilizable para cualquier campo type=file con
   * modo server_upload. La app se resuelve via appType[key].app.
   */
  uploadFile({ file, name = '', name_sent = '', time_zone = '', appKey = 'file', extraFields = {} }: {
    file: Blob;
    name?: string;
    name_sent?: string;
    time_zone?: string;
    appKey?: string;
    extraFields?: { [k: string]: string };
  }) {
    const app = (this.appType as any)[appKey]?.app || 'files/file';
    const fd = new FormData();
    fd.append('file', file, name || 'file');
    fd.append('name', name || 'file');
    fd.append('name_sent', name_sent || '');
    fd.append('time_zone', time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    fd.append('form_data', '{}');
    fd.append('form_fields', '{}');
    for (const k in extraFields) fd.append(k, extraFields[k]);
    return this.http.post(`${this._base_url}/${app}/`, fd);
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