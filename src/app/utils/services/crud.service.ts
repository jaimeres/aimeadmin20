import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, Subject, tap } from 'rxjs';
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
    "base-product": {
      "app": "products/base-product",
      "type": "base-product",
      "name": "Productos Base",
      "icon": "pi pi-clone"
    },
    "status": {
      "app": "status/status",
      "type": "status",
      "name": "Estados",
      "icon": "pi pi-flag"
    },
    "file-type": {
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
    "workshop": {
      "app": "assets/workshop",
      "type": "workshop",
      "name": "Talleres",
      "icon": "pi pi-cog"
    },
    "asset-type": {
      "app": "assets/asset-type",
      "type": "asset-type",
      "name": "Tipos de Activos",
      "icon": "pi pi-tags"
    },
    "capacity-type": {
      "app": "assets/capacity-type",
      "type": "capacity-type",
      "name": "Tipos de Capacidad",
      "icon": "pi pi-chart-bar"
    },
    "asset-other": {
      "app": "assets/asset-other",
      "type": "asset-other",
      "name": "Otros Activos",
      "icon": "pi pi-ellipsis-h"
    },
    "asset-document": {
      "app": "assets/asset-document",
      "type": "asset-document",
      "name": "Documentos de Activos",
      "icon": "pi pi-file-pdf"
    },
    "maintenance-document": {
      "app": "assets/maintenance-document",
      "type": "maintenance-document",
      "name": "Documentos de Mantenimiento",
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
    "movement-type": {
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
    "inventory-movement-detail": {
      "app": "inventories/inventory-movement-detail",
      "type": "inventory-movement-detail",
      "name": "Movimientos de almacén",
      "icon": "pi pi-arrow-right-arrow-left"
    },

    "maintenance-responsible-rule": {
      "app": "assets/maintenance-responsible-rule",
      "type": "maintenance-responsible-rule",
      "name": "Regla (responsable)",
      "icon": "pi pi-cog"
    },
    "maintenance-responsible-rule-action": {
      "app": "assets/maintenance-responsible-rule-action",
      "type": "maintenance-responsible-rule-action",
      "name": "Acción de regla (responsable)",
      "icon": "pi pi-bolt"
    },

    "alternate-equivalent": {
      "app": "products/alternate-equivalent",
      "type": "alternate-equivalent",
      "name": "Alternos/Equivalentes",
      "icon": "pi pi-sync"
    },
    "product-variation": {
      "app": "products/product-variation",
      "type": "product-variation",
      "name": "Variaciones de Producto",
      "icon": "pi pi-list"
    },
    "web-product": {
      "app": "products/web-product",
      "type": "web-product",
      "name": "Producto Web",
      "icon": "pi pi-globe"
    },
    "app-classifier-type": {
      "app": "classifiers/app-classifier-type",
      "type": "app-classifier-type",
      "name": "Tipo de Clasificador",
      "icon": "pi pi-tags"
    },
    "classifier-level": {
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
    "task-detail": {
      "app": "tasks/task-detail",
      "type": "task-detail",
      "name": "Detalle de Tarea",
      "icon": "pi pi-check-square"
    },
    "request-detail": {
      "app": "purchases/request-detail",
      "type": "request-detail",
      "name": "Detalle de Solicitud",
      "icon": "pi pi-file-edit"
    },
    // [[[II ESC:036-06 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-06
    // Faltaban los demás documentos de compra. `getAppType` es el ÚNICO punto que
    // resuelve app/type, así que sin estas entradas la tabla derivada de Pedido y
    // Remisión no cargaba sus partidas y el buscador de documento origen no podía
    // consultar nada: ambos abandonan en silencio cuando la clave no resuelve.
    "request": {
      "app": "purchases/request",
      "type": "request",
      "name": "Solicitud",
      "icon": "pi pi-file-edit"
    },
    "supplier-request": {
      "app": "purchases/supplier-request",
      "type": "supplier-request",
      "name": "Pedido a Proveedor",
      "icon": "pi pi-shopping-cart"
    },
    "supplier-request-detail": {
      "app": "purchases/supplier-request-detail",
      "type": "supplier-request-detail",
      "name": "Detalle de Pedido a Proveedor",
      "icon": "pi pi-shopping-cart"
    },
    "delivery-note": {
      "app": "purchases/delivery-note",
      "type": "delivery-note",
      "name": "Nota de Remisión",
      "icon": "pi pi-truck"
    },
    "delivery-note-detail": {
      "app": "purchases/delivery-note-detail",
      "type": "delivery-note-detail",
      "name": "Detalle de Nota de Remisión",
      "icon": "pi pi-truck"
    },
    // ]]]FI
    "maintenance-responsible-person": {
      "app": "assets/maintenance-responsible-person",
      "type": "maintenance-responsible-person",
      "name": "Responsable de Mantenimiento",
      "icon": "pi pi-user-gear"
    },
    "maintenance-responsible-customer": {
      "app": "assets/maintenance-responsible-customer",
      "type": "maintenance-responsible-customer",
      "name": "Responsable de Mantenimiento (cliente)",
      "icon": "pi pi-user-gear"
    },
    "maintenance-responsible-supplier": {
      "app": "assets/maintenance-responsible-supplier",
      "type": "maintenance-responsible-supplier",
      "name": "Responsable de Mantenimiento (proveedor)",
      "icon": "pi pi-user-gear"
    }
  };

  /**
   * Resuelve una entrada de `appType` tolerando guiones bajos vs guiones medios.
   *
   * El backend usa convenciones distintas según el contexto:
   *  - URLs / JSON:API resource type para tablas nuevas → kebab-case (`responsible-rule`).
   *  - `data_type.type` de FK del config → nombre Django de la relación, en
   *    snake_case (`capacity_type`, `asset_type`, `classifier_level`, ...).
   *
   * Para evitar dispersar transformaciones por todo el código, este es el ÚNICO
   * punto que normaliza. Los consumidores siempre llaman `getAppType(_dt?.type)`.
   */
  public getAppType(key?: string | null): any | undefined {
    if (!key) return undefined;
    const dict = this.appType as any;
    return dict[key]
      ?? dict[key.replace(/_/g, '-')]
      ?? dict[key.replace(/-/g, '_')];
  }

  // [[[II ESC:005-17 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-17
  /**
   * Clave de `SharedDynamicDataService.data` para un recurso acotado por modulo.
   * Punto unico para que los dos consumidores del catalogo de estados —el menu de
   * estados dependientes (`getStatus`) y el filtro de la configuracion del modulo—
   * compartan la MISMA carga y solo se consulte una vez por app.
   *
   * Sin modulo devuelve el `type` tal cual, que es la clave generica previa
   * (`data['status']`) y la que leen los dropdowns de formulario: asi el
   * comportamiento anterior queda intacto cuando no hay modulo.
   */
  public sharedModuleScopedKey(type: string, module?: any): string {
    return module ? `${type}_${module}` : type;
  }
  // ]]]FI

  configCols(module: string) {
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

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  /**
   * Genera el string de parámetros de filtro a partir de un dict de fields.
   * Recibe el objeto fields (de fieldsForm(pos) en crud.class o fieldSignal()?.fields
   * en custom-local-settings) y devuelve una cadena tipo
   * "filter[field]=value&filter[other.icontains]=q".
   * Soporta `cols.filter` simple contra el campo contenedor y mapa explícito
   * `{ <campo_remoto>: FilterEntry }` relativo al campo contenedor cuando este
   * es una relación.
   * Solo incluye campos con filter.active=true y default_value no nulo/vacío.
   * Para FK: extrae el id usando filter.option_value (default 'id').
   */
  buildFilterString(fields: Record<string, any>): string {
    const parts: string[] = [];
    for (const [fieldName, cfg] of Object.entries(fields)) {
      const filter = (cfg as any)?.cols?.filter ?? {};
      this._appendColumnFilterParts(parts, fieldName, filter);
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
    this._appendExplicitFilterMapParts(parts, filterConfig);
    return parts.join('&');
  }

  // [[[II ESC:030-17 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-17
  /**
   * Resuelve el filtro de una búsqueda declarada por `data_type.filter`.
   *
   * Una entrada activa, no `forced`, cuyo `default_value` es null/undefined
   * enlaza el texto que el usuario está buscando. Las entradas con valor
   * declarado se conservan como restricciones estáticas. Si ninguna entrada
   * declara ese enlace dinámico, se preserva el filtro de respaldo del control.
   */
  buildConfiguredSearchFilter(
    filterConfig: Record<string, any> | undefined,
    query: string,
    fallbackFilter = '',
    // [[[II ESC:055-01 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-01
    // Formulario vivo, para resolver las entradas que declaran `from_field`.
    // Opcional: sin él, el comportamiento es exactamente el anterior.
    formValues?: Record<string, any> | null,
    // ]]]FI
  ): string {
    if (!filterConfig || typeof filterConfig !== 'object') return fallbackFilter;

    let bindsQuery = false;
    const resolvedConfig: Record<string, any> = {};
    for (const [fieldName, entry] of Object.entries(filterConfig)) {
      if (fieldName === 'logic') {
        resolvedConfig[fieldName] = entry;
        continue;
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

      // [[[II ESC:055-01 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-01
      // `from_field`: el valor de la restricción se toma de OTRO campo del
      // formulario, no de una constante. Es lo que permite que un buscador se
      // acote solo con lo que el encabezado ya capturó —proveedor, moneda—, en
      // vez de listar todo el tenant.
      //
      // El nodo existente sólo sabía de valor estático (`default_value`) o del
      // texto tecleado; un valor tomado de otro control no tenía forma de
      // declararse. Una entrada con `from_field` cuyo campo aún está vacío se
      // OMITE: al empezar la captura no hay nada que restringir.
      if (typeof entry.from_field === 'string' && entry.from_field.trim() !== '') {
        const raw = formValues?.[entry.from_field.trim()];
        const value = (raw && typeof raw === 'object') ? (raw.id ?? raw.value) : raw;
        if (value === undefined || value === null || value === '') continue;
        resolvedConfig[fieldName] = { ...entry, default_value: value };
        continue;
      }
      // ]]]FI

      const isQueryBinding = entry.active === true
        && entry.forced !== true
        && (entry.default_value === null || entry.default_value === undefined);
      resolvedConfig[fieldName] = isQueryBinding
        ? { ...entry, default_value: query }
        : { ...entry };
      bindsQuery = bindsQuery || isQueryBinding;
    }

    const configuredFilter = this.buildDropdownFilterString(resolvedConfig);
    if (bindsQuery) return configuredFilter;
    return [configuredFilter, fallbackFilter].filter(Boolean).join('&');
  }
  // ]]]FI

  private _appendColumnFilterParts(parts: string[], fieldName: string, filter: any): void {
    if (!filter || typeof filter !== 'object') return;

    if (this._isFilterEntry(filter)) {
      this._appendFilterParts(parts, fieldName, filter);
    }

    this._appendExplicitFilterMapParts(parts, filter, true, fieldName);
  }

  private _appendExplicitFilterMapParts(
    parts: string[],
    filterConfig: Record<string, any>,
    skipColumnFilterKeys = false,
    fieldPrefix = ''
  ): void {
    const reserved = new Set(['active', 'default', 'default_value', 'ops', 'option_value', 'by', 'relative', 'ui', 'option_label']);
    for (const [fieldName, cfg] of Object.entries(filterConfig)) {
      if (fieldName === 'logic') continue;
      if (skipColumnFilterKeys && reserved.has(fieldName)) continue;
      if (!this._isFilterEntry(cfg)) continue;
      const filterFieldName = fieldPrefix ? `${fieldPrefix}__${fieldName}` : fieldName;
      this._appendFilterParts(parts, filterFieldName, cfg);
    }
  }

  private _isFilterEntry(filter: any): boolean {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return false;
    return Object.prototype.hasOwnProperty.call(filter, 'active')
      || Object.prototype.hasOwnProperty.call(filter, 'default')
      || Object.prototype.hasOwnProperty.call(filter, 'default_value')
      || Object.prototype.hasOwnProperty.call(filter, 'ops')
      || Object.prototype.hasOwnProperty.call(filter, 'option_value');
  }
  // ]]]FI

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

  // [[[II ESC:031-05 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-05
  /**
   * Memoria de sesión de respuestas OPTIONS por usuario y endpoint. Los CRUD
   * guardaban optionsFields/formTempo en la instancia del componente, que se
   * destruye al cambiar de ruta: volver a un endpoint ya visitado repetía el
   * OPTIONS y reconstruía todo desde cero. Se entrega un clon por lectura para
   * que las mutaciones de un componente no contaminen otras instancias.
   */
  private readonly optionsMemory = new Map<string, any>();
  // ]]]FI

  /**
   *
   * @param app Opcional, aplicacion a consultar, si no se envia se toma la de this.app
   * @returns retorna los datos
   */
  options(app = '') {

    //const query = this.query('', '', '', '', '', type);
    // [[[II ESC:031-05 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-05
    // La clave incluye el usuario: un cambio de sesión no reutiliza permisos
    // (actions.POST) de otro usuario. Sin TTL: vive lo que la sesión de página.
    const url = `${this.baseUrl(app)}`;
    const memoryKey = `${this.authS.userId() ?? this.authS.username() ?? 'anonymous'}:${url}`;
    const cached = this.optionsMemory.get(memoryKey);
    if (cached) {
      return of(structuredClone(cached));
    }

    return this.http.options(url).pipe(
      //IMPRIMIR RESPUESTA
      map((resp: any) => {
        return resp
      }),
      tap((resp: any) => {
        try {
          this.optionsMemory.set(memoryKey, structuredClone(resp));
        } catch { /* Memoria opcional: si no se puede clonar, no se cachea. */ }
      })
    )
    // ]]]FI
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
    // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
    const sanitizedFormData = this._stripNullsForSave(formData) || {};
    // ]]]FI

    return this.http.post(`${this.baseUrl()}${query}`, this.generalS.baseDJA({
      attributes: sanitizedFormData,
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
  saveObject({ formData, include = '', fields = '', filter = '', meta = null }: {
    formData: any;
    include?: string;
    fields?: string;
    filter?: string;
    // [[[II ESC:036-01 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-01
    // `data.meta` del contrato de conversiones. Opcional: sin él el POST es el
    // CRUD de siempre. ]]]FI
    meta?: any;
  }) {
    //°°°DEL FILTER NO ESTOY SEGURO
    const query = this.query(include, filter, '', fields);
    // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
    const sanitizedFormData = this._stripNullsForSave(formData) || {};
    // ]]]FI


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
      attributes: sanitizedFormData,
      type: this.type,
      relationships: this.relationships,
      meta
    });

    return this.http.post(`${this.baseUrl()}${query}`, r).pipe(
      map((resp: any) => resp)
    );
  }

  // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
  private _stripNullsForSave(value: any, stack: WeakSet<object> = new WeakSet<object>()): any {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date || value instanceof Blob || value instanceof File) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (stack.has(value)) {
      return undefined;
    }

    stack.add(value);

    try {
      if (Array.isArray(value)) {
        return value
          .map((item) => this._stripNullsForSave(item, stack))
          .filter((item) => item !== undefined);
      }

      const sanitized: any = {};

      for (const [key, childValue] of Object.entries(value)) {
        const normalizedValue = this._stripNullsForSave(childValue, stack);
        if (normalizedValue !== undefined) {
          sanitized[key] = normalizedValue;
        }
      }

      return sanitized;
    } finally {
      stack.delete(value);
    }
  }
  // ]]]FI

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

    // [[[II ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
    return this.http.patch(finalUrl, this.generalS.baseDJA({ //`${this.baseUrl()}${id}/${query}`
      attributes: formData,
      type: type || this.type,
      relationships: relationships || this.relationships,
      id: id
    })).pipe(
      map((resp: any) => resp)
    );
    // ]]]FI
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
    const app = this.getAppType(appKey)?.app || 'files/file';
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
  // [[[II ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
  delete(id: string, app = '') {
    return this.http.delete(`${this.baseUrl(app)}${id}`);
  }
  // ]]]FI

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
