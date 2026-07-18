import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
// ***********************ADAPTADO PARA CAPACITOR*********************
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

/**
 * Servicio general que maneja operaciones comunes incluyendo geolocalización
 * 
 * GEOLOCALIZACIÓN ADAPTADA PARA CAPACITOR:
 * - Utiliza @capacitor/geolocation como método principal
 * - Incluye fallback a geolocalización nativa del navegador
 * - Maneja permisos de forma explícita
 * - Soporte para watch position continuo
 * 
 * USO:
 * 1. El servicio se inicializa automáticamente al instanciarse
 * 2. Llama a initialize() desde componentes que necesiten ubicación
 * 3. Usa getLocationSnapshot() para obtener coordenadas actuales
 * 4. Suscríbete a onLocationChange() para actualizaciones en tiempo real
 */

@Injectable({
  providedIn: 'root'
})
export class GeneralService {
  //public items: { [key: string]: MenuItem[] } = {};

  private latitude: number = 0;
  private longitude: number = 0;
  //
  private sysTimeZone: string = '';
  private initialized = false;
  private location$ = new BehaviorSubject<{ latitude: number; longitude: number; time_zone: string } | null>(null);
  private intervalId: any;

  constructor() {
    this.sysTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // ***********************ADAPTADO PARA CAPACITOR*********************
    // Inicializa solo una vez las coordenadas usando Capacitor Geolocation
    this.getCurrentPositionCapacitor()
      .then((coords) => {
        this.updateCoordsFromCapacitor(coords);
        this.location$.next(this.getCoords());
      })
      .catch((err) => {
        //console.error('Error al obtener ubicación inicial con Capacitor:', err);
        // Fallback a geolocation nativa si Capacitor falla
        this.tryNativeGeolocation();
      });
  }

  /**
   * Convierte el form al formato dja.
   * @param {object} attributes - Campos del form.
   * @param {string} type - Tipo de recurso.
   * @param {object} relationships - Arreglo de objectos, con los objetos relacionados,
   *                 ejemplo, id: formData.country, field: 'country', type: 'country'.
   * @param {string} id - Para editar.
   */
  baseDJA({ attributes, type, relationships = [], id }: { attributes: any; type: string; relationships?: any[]; id?: string }) {
    // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
    attributes = this._stripNullsFromPayload(attributes) || {};
    // ]]]FI
    let relationshipsResp = [];
    // genera el objeto relationships
    for (let relation of relationships) {
      //console.log('relationship', relation, relation.id, relation.field, relation.type);

      if (Array.isArray(relation.id)) {
        // si es un array de id, lo convierte en un array de objetos, para las relaciones m2m
        //los array vacios se deben enviar, esto significa que no fue seleccionado y se tiene que limmpiar los m2m
        /*if (relation.id.length == 0) {

            // elimina las relaciones nulas pero del objecto principal para que jsonapi no lo tome como un campo y no se queje
            console.log('55555555555',relation,relation.id, relation.field, relation.id);
            if (attributes.hasOwnProperty(relation.field)) {
                delete attributes[relation.field];
            }
            continue
        }; // si no hay elementos en el array, no lo agrega al objeto relationships
        */

        let data = [];
        // genera el array de objetos id y type
        for (let id of relation.id) {
          // si en las relaciones m2m hay un id vacío o nulo, no lo agrega al array
          if (!id) {
            // elimina las relaciones nulas pero del objecto principal para que jsonapi no lo tome como un campo y no se queje
            if (attributes.hasOwnProperty(relation.field)) {
              delete attributes[relation.field];
            }
            continue;
          }

          //si id es un objecto
          if (typeof id === 'object') {
            // Soporte JSON:API "rico": objetos pre-construidos por componentes
            // como <tree-select> con serialización (parent en `meta`, source, etc.).
            // Si el item viene marcado con __rich/__jsonapi se conservan TODAS sus
            // propiedades (type, id, meta, source, ...) en lugar de reducirlo a
            // {id, type}. type por defecto cae al de la relación si falta.
            if (id.__rich || id.__jsonapi) {
              const { __rich, __jsonapi, ...rest } = id as any;
              if (!rest.type) rest.type = relation.type;
              if (!rest.id) continue;
              data.push(rest);
              continue;
            }
            data.push({ id: id.id, type: relation.type });
            continue;
          }

          data.push({ id: id, type: relation.type });
        }
        // agrega el array de objetos al objeto relationships
        relationshipsResp[relation.field] = {
          data: data
        };
        // elimina el campo de attributes para evitar enviarlo dos veces y
        // prevenir errores de referencias circulares (PrimeNG objects)
        if (attributes.hasOwnProperty(relation.field)) {
          delete attributes[relation.field];
        }
      } else if (relation.id) {
        //los objectos con relaciobes one to many, no se pueden enviar como array, por eso se envía como objeto
        relationshipsResp[relation.field] = {
          data: { id: relation.id, type: relation.type }
        };
        // elimina el campo de attributes para evitar enviarlo dos veces
        if (attributes.hasOwnProperty(relation.field)) {
          delete attributes[relation.field];
        }
      } else {
        // elimina las relaciones nulas pero del objecto principal para que jsonapi no lo tome como un campo y no se queje
        if (attributes.hasOwnProperty(relation.field)) {
          delete attributes[relation.field];
        }
      }
    }

    // genera el objeto data, con type y attributes
    attributes = this._stripNullsFromPayload(attributes) || {};

    let dataResp: any = {
      data: {
        type: type,
        attributes: {
          ...attributes
        }
      }
    };

    // si hay relaciones, las agrega al objecto data
    if (Object.keys(relationshipsResp).length) {
      // si hay relaciones, las agrega
      dataResp['data']['relationships'] = { ...relationshipsResp };
    }

    // si hay id, lo agrega al objeto data, normalmente se envía cuando se va a editar
    if (id) {
      dataResp['data']['id'] = id;
    }

    return dataResp;
  }

  baseDJAFormData({ attributes, type, relationships = [], id, files = null }: { attributes: any; type: string; relationships?: any[]; id?: string; files?: any }) {
    // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
    attributes = this._stripNullsFromPayload(attributes) || {};
    // ]]]FI
    let relationshipsResp = [];
    // genera el objeto relationships
    for (let relation of relationships) {
      if (Array.isArray(relation.id)) {
        // si es un array de id, lo convierte en un array de objetos, para las relaciones m2m
        if (relation.id.length == 0) continue; // si no hay elementos en el array, no lo agrega al objeto relationships

        let data = [];
        // genera el array de objetos id y type
        for (let id of relation.id) {
          // si en las relaciones m2m hay un id vacío o nulo, no lo agrega al array
          if (!id) continue;

          data.push({ id: id, type: relation.type });
        }
        // agrega el array de objetos al objeto relationships
        relationshipsResp[relation.field] = data; //JSON.stringify(data) ;
      } else if (relation.id) {
        //los objectos con relaciobes one to many, no se pueden enviar como array, por eso se envía como objeto
        relationshipsResp[relation.field] = { id: relation.id, type: relation.type };
      }
    }

    let dataResp: any;
    if (files) {
      dataResp = new FormData();

      for (let i = 0; i < files.length; i++) {
        //console.log('files', files[i]);
        dataResp.append(`documents`, files[i], files[i].name);
      }

      for (const key in attributes) {
        dataResp.append(key, attributes[key]);
      }

      //reemplaza en dataResp los valores de relationshipsResp
      for (const key in relationshipsResp) {
        if (Array.isArray(relationshipsResp[key])) {
          for (let i = 0; i < relationshipsResp[key].length; i++) {
            dataResp.append(key, JSON.stringify(relationshipsResp[key][i]));
          }
        } else {
          // para form data hay que enviarlo como string pero en forma json
          dataResp.append(key, JSON.stringify(relationshipsResp[key]));
        }
      }
    } else {
      // genera el objeto data, con type y attributes
      let dataResp: any = {
        data: {
          type: type,
          attributes: {
            ...attributes
          }
        }
      };

      // si hay relaciones, las agrega al objecto data
      if (Object.keys(relationshipsResp).length) {
        // si hay relaciones, las agrega
        dataResp['data']['relationships'] = { ...relationshipsResp };
      }

      // si hay id, lo agrega al objeto data, normalmente se envía cuando se va a editar
      if (id) {
        dataResp['data']['id'] = id;
      }
    }

    return dataResp;
  }

  /*baseDJAFormData({ attributes, type, relationships = [], id }: { attributes: any, type: string, relationships?: any[], id?: string }) {
 
    let relationshipsResp = [];
    // genera el objeto relationships
    for (let relation of relationships) {
 
      if (Array.isArray(relation.id)) {
        // si es un array de id, lo convierte en un array de objetos, para las relaciones m2m
        if (relation.id.length == 0) continue; // si no hay elementos en el array, no lo agrega al objeto relationships
 
        let data = [];
        // genera el array de objetos id y type
        for (let id of relation.id) {
          // si en las relaciones m2m hay un id vacío o nulo, no lo agrega al array
          if (!id) continue;
          
          data.push({ id: id, type: relation.type });
        }
        // agrega el array de objetos al objeto relationships
        attributes[relation.field] =  data;
      } else if (relation.id) {
        //los objectos con relaciobes one to many, no se pueden enviar como array, por eso se envía como objeto
        attributes[relation.field] = { id: relation.id, type: relation.type };
      }
    }
    console.log(' 3333333333333333', relationshipsResp);
    
    return attributes
    
  }*/

  /**
   * Busca un ID en el include de jsonapi y retorna el nombre
   * @param included - Objecto include de jsonapi
   * @param id id a buscar
   * @param relationshipName Nombre de la relación, se utiliza para buscar el nombre del campo relacionado
   * @param additionalFieldsIncluded Campos adicionales que se deben agregar de la relacion incluida, si no se envia,
   * @returns El nombre si encuentra el id, si no, retorna un string vacio
   */
  /*search_include(included: any[], id: string, relationshipName: string, additionalFieldsIncluded: any, return_attributes = false, fields: any = []) {
    const relationship_name: any = [];

    for (const item of included) {
      if (item.id == id) {
        if (return_attributes) {
          return item.attributes;
        }
        let value: string;
        // Usar option_label de fields si existe y no es el default (name/display_name)
        const _fieldDef = fields[relationshipName];
        const _optLabel = _fieldDef?.option_label ? String(_fieldDef.option_label).trim() : null;

        if (_optLabel && _optLabel !== 'name' && _optLabel !== 'display_name') {
          const _join = _optLabel.split(',').map((v: string) => v.trim()).filter((v: string) => v);
          value = _join.map((f: string) => {
            const v = item.attributes[f];
            return v != null ? String(v).trim() : '';
          }).filter((s: string) => s).join(' ');
        } else {
          // Fallback: username o name
          value = item.attributes?.username || item.attributes?.name || '';
        }

        relationship_name[relationshipName + '__name'] = value;
        if (additionalFieldsIncluded) {
          for (const field of additionalFieldsIncluded[relationshipName]) {
            const renamed_fields = field.renamed_fields || field.field || field.original_field;
            const original_field = field.original_field || field.field;
            relationship_name[relationshipName + '_' + renamed_fields] = item.attributes[original_field];
          }
        }
        break;
      }
    }
    return relationship_name;
  }*/


  // genera ua función llamada timeZone que reciba un paramtero y los convierta a la zona horaria local
  // para que se pueda utilizar en el formulario

  timeZone(dateTime: any, time_zone = null) {
    if (!dateTime) return '';

    const date = new Date(dateTime);

    if (time_zone) {
      return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: time_zone
      }).format(date);
    } else {
      // Combina manualmente la fecha y la hora para evitar la coma
      const fecha = date.toLocaleDateString('default', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const hora = date.toLocaleTimeString('default', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return `${fecha} ${hora}`;
    }
  }

  // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
  private _stripNullsFromPayload(value: any, stack: WeakSet<object> = new WeakSet<object>()): any {
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
          .map((item) => this._stripNullsFromPayload(item, stack))
          .filter((item) => item !== undefined);
      }

      const sanitized: any = {};

      for (const [key, childValue] of Object.entries(value)) {
        const normalizedValue = this._stripNullsFromPayload(childValue, stack);
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
   * Convierte la respuesta JSON:API (DJA) a un array de objetos planos listos para
   * usar en tabla y formulario.
   *
   * ## Lógica de claves para relaciones (dja.relationships)
   * Por cada relación se escribe:
   *   - `data[rel]`            -> id (FK) o array de ids (M2M)
   *   - `data[rel + '__name']` -> texto de visualización para la tabla (todos los tipos)
   *   - `data['label']`        -> solo para tree-select (clave nativa de PrimeNG treeSelect)
   *
   * ## Clave de display según tipo de campo
   * - FK (no array): `rel__name` = valor compuesto de `included` según `option_label`.
   *   Sin regla -> `username || name`.
   * - M2M (array):
   *   - `cols.multiple.active === true` (explícito) -> nombres concatenados con
   *     `cols.multiple.separator` (default `,`).
   *   - Caso contrario -> `cols.multiple.msg_more` con `{e}` como placeholder de conteo
   *     (default `"{e} elemento(s)"`); si solo hay uno muestra su nombre.
   * - tree-select: escribe también `data['label']` para los chips de PrimeNG.
   *
   * ## Clave combinada (option_label con varios campos)
   * `option_label: "name,id"` -> clave `"nameid"` (join sin separador).
   * Equivalente al pipe `joinOrSelf` del formulario: ambas capas quedan armonizadas.
   *
   * ## Campos NO relación (loop final)
   * Los tipos FK (`dropdown`, `multi-select`, `multi-choice`, `tree-select`, `auto-complete`) se saltan
   * para no contaminar data si el campo no vino en `dja.relationships`.
   *
   * @param respDJA    Respuesta JSON:API del servidor
   * @param fields     Config de campos del módulo (fieldsForm)
   * @param customField  Mapa nombre->texto para campos personalizados
   * @param fieldsBool   Campos booleanos que se convierten a texto
   * @param moreFields   Campos con choices: [[nombre, [{value, display_name}]]]
   * @returns Array de objetos planos (o el primer elemento si la respuesta era un objeto)
   */
  DJAtoObject(
    {
      respDJA,
      additionalFieldsIncluded = null,
      customField = [],
      fieldsBool = [],
      moreFields = [],
      timeZone = [],
      node = false,
      additionalFieldsAppCols = [],
      fields = {}
    }: {
      respDJA: any;
      additionalFieldsIncluded?: any;
      customField?: any;
      fieldsBool?: any[];
      moreFields?: any[];
      timeZone?: any[];
      node?: boolean;
      additionalFieldsAppCols?: any[];
      fields?: any;
    }) {
    let included = respDJA?.included;
    let dataDJA = respDJA?.data;
    let is_object = false;

    if (!dataDJA) {
      return [];
    }
    console.log('-................', fieldsBool)

    // typeof identifica a un array y un objecto como un objecto, por eso si typeof dice que es un objeto y isArray dice que no es array,
    //entonces es un objeto
    if (typeof dataDJA === 'object' && !Array.isArray(dataDJA)) {
      // si es objecto lo convierto en arrau de un elemento que contiene un objecto,
      // para solo tener un codigo para convertirlo en array
      dataDJA = [dataDJA];
      // parece que include siempre viene en array, no tengo necesidad de convertirlo en array
      //included = included ? [included] : included;

      is_object = true; // lo utilizo para retornar un objeto en lugar de un array
    }

    const labelFields: any = [];
    //console.log('[DJA] fields recibidos:', fields);
    for (const key in fields) {
      const field = fields[key];
      if (!field || !field.option_label) continue;

      const optionLabel = String(field.option_label).trim();
      // [[[II ESC:007-03 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-03 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
      const isTreeSelect = field.type === 'tree-select' || field.type === 'listbox';
      const isMultiSelect = field.type === 'multi-select' || field.type === 'multi-choice';
      // ]]]FI

      // Para tree-select, 'label' se maneja nativamente; para campos simples (no multi),
      // 'name'/'display_name' usan el fallback directo sin necesidad de regla
      if (isTreeSelect && optionLabel === 'label') continue;
      if (!isTreeSelect && !isMultiSelect && (optionLabel === 'name' || optionLabel === 'display_name')) continue;

      const optionLabelJoin = optionLabel.split(',').map(v => v.trim()).filter(v => v.length > 0);
      if (!optionLabelJoin.length) continue;

      labelFields.push({
        field: key,
        option_label: optionLabel,
        type: field.type,
        option_label_join: optionLabelJoin,
        label_field_key: isTreeSelect ? 'label' : optionLabelJoin.join('')
      });
    }
    //console.log('[DJA] labelFields construidos:', labelFields);

    const resp = dataDJA.map((dja: any) => {
      /*lo hago para que el id de los campos relacionados esté dentro del array general, principalmente para que cuando se resetee a un form, 
      se pueda asignar directamente, aquí hay un tema dja se queja si el id de los campos relacionados no está dentro del array relationships,
      y se envía directamente dentro del objeto attributes, PERO, si tambien lo envío dentro del objeto relationships lo toma como el bueno y ya no se queja,
      por lo tanto, lo envío en ambos lados*/

      // Copia mutable por iteración: los campos de relaciones se eliminan para no procesarse dos veces
      const localLabelFields = [...labelFields];

      // Construye data con atributos base; las relaciones se agregan incrementalmente en el loop
      let data: any = {
        id: dja.id,
        type_type: dja.type, // para que esté dentro del array, repito el nombre para que no vaya a chocar con el nombre de un campos
        ...dja.attributes,
        relationships: dja.relationships
      };

      for (const relationshipName in dja.relationships) {
        const item = dja.relationships[relationshipName].data;
        const IsArray = Array.isArray(item);

        // Busca y elimina la regla por nombre de campo (sin distinción de isArray)
        const lfIdx = localLabelFields.findIndex((r: any) => r.field === relationshipName);
        const lfRule = lfIdx !== -1 ? localLabelFields.splice(lfIdx, 1)[0] : null;

        if (IsArray) {
          // M2M: guarda array de ids y array completo
          data[relationshipName] = item.map((itm: any) => itm.id);
          data[relationshipName + '__array'] = item;

          if (relationshipName === 'depends_on') continue;
          //console.log('-----------------------', relationshipName, data[relationshipName]);


          if (included && item.length > 0) {
            const multipleConfig = fields[relationshipName]?.cols?.multiple;
            const isTreeSel = lfRule?.type === 'tree-select' || lfRule?.type === 'listbox' || fields[relationshipName]?.type === 'tree-select' || fields[relationshipName]?.type === 'listbox';
            //console.log(`[DJA] M2M "${relationshipName}": items=${item.length} | active=`, multipleConfig?.active, '| lfRule=', lfRule?.label_field_key, '| cols.multiple=', multipleConfig);

            let displayValue: string;
            // [[[II ESC:005-02 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-02
            if (lfRule && (multipleConfig?.active === true || isTreeSel)) {
              // cols.multiple.active explicitamente true -> mostrar nombres concatenados.
              // Para tree-select (con nodo tree, p.ej. responsible_persons) SIEMPRE se
              // muestran los nombres unidos por el separador (mismo comportamiento que
              // requesters), en lugar del conteo, aunque no declare cols.multiple.active.
              const separator: string = multipleConfig?.separator ?? ',';
              const displays: string[] = item.map((itm: any) => {
                const inc = (included as any[]).find((i: any) => i.id == itm.id);
                if (!inc) return '';
                const temp: any = {};
                this._applyLabelField(temp, lfRule, { id: inc.id, ...inc.attributes });
                return temp[lfRule.label_field_key] ?? '';
              }).filter((s: string) => s);
              displayValue = displays.join(separator);
            } else {
              // Sin active=true -> conteo usando msg_more o nombre si es uno
              const msgTemplate: string = multipleConfig?.msg_more ?? '{e} elemento(s)';
              if (item.length === 1) {
                const inc = (included as any[]).find((i: any) => i.id == item[0].id);
                displayValue = inc?.attributes?.username || inc?.attributes?.name || '1 elemento';
              } else {
                displayValue = msgTemplate.replace('{e}', String(item.length));
              }
            }
            // ]]]FI

            // tree-select usa 'label' como clave nativa; los demas usan rel__name
            data[relationshipName + '__name'] = displayValue;
            if (isTreeSel) data['label'] = displayValue;
          }

        } else {
          // FK: guarda el id plano
          const id = item?.id;
          data[relationshipName] = id;

          if (id && included) {
            const inc = (included as any[]).find((i: any) => i.id == id);
            if (inc?.attributes) {
              const isTreeSel = lfRule?.type === 'tree-select' || lfRule?.type === 'listbox' || fields[relationshipName]?.type === 'tree-select' || fields[relationshipName]?.type === 'listbox';
              let displayValue: string;
              if (lfRule) {
                const temp: any = {};
                this._applyLabelField(temp, lfRule, { id: inc.id, ...inc.attributes });
                displayValue = temp[lfRule.label_field_key] ?? '';
              } else {
                displayValue = inc.attributes.username || inc.attributes.name || '';
              }
              // tree-select usa 'label' como clave nativa; los demas usan rel__name
              data[relationshipName + '__name'] = displayValue;
              if (isTreeSel) data['label'] = displayValue;
            }
          }
        }
      }

      // Aplica las reglas de label que quedaron sin consumir del loop de relaciones.
      // Esto ocurre cuando el objeto que se procesa ES el objeto de opciones de un
      // dropdown/tree-select: sus campos no son relaciones de sí mismo, por lo que
      // el splice del loop de arriba no los eliminó. _applyLabelField lee los atributos
      // propios del objeto (data) y construye la clave combinada (ej. "namelast_name").
      // Nota: no hay riesgo de doble procesado porque las relaciones reales del objeto
      // principal ya fueron extraídas con splice y no están en localLabelFields.
      for (const rule of localLabelFields) {
        this._applyLabelField(data, rule);
      }


      data.created_at = this.timeZone(dja.attributes?.created_at);
      data.modified_at = this.timeZone(dja.attributes?.modified_at);
      data.inactivated_at = this.timeZone(dja.attributes?.inactivated_at);

      timeZone.forEach((field) => {
        data[field + '__text'] = this.timeZone(dja.attributes[field]);
        //solo si dja.attributes[field] no es nulo
        data[field] = dja.attributes[field] ? new Date(dja.attributes[field]) : null;
      });


      // Cambiamos fieldsBool.forEach(...) por un bucle for para poder usar 'continue'
      if (!dja || !dja.attributes) {
        // Si 'dja' o 'dja.attributes' no existe, salimos temprano
        return data;
      }

      // Cambiamos fieldsBool.forEach(...) por un bucle for para poder usar 'continue'
      for (let i = 0; i < fieldsBool.length; i++) {
        const field = fieldsBool[i];
        // Verificamos que 'field.field' exista y que 'dja.attributes[field.field]' no sea undefined
        if (!field || !field.field || dja.attributes[field.field] === undefined) {
          continue;
        }

        // [[[II ESC:005-09 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-09
        // Dependiendo del valor del campo se carga el valor para el verdadero o falso
        const trueLabel = field.label_true ?? customField?.[field.field + '_true'] ?? 'true';
        const falseLabel = field.label_false ?? customField?.[field.field + '_false'] ?? 'false';
        const rawBoolValue = dja.attributes[field.field];
        const isTrueValue = rawBoolValue === true || rawBoolValue === 'true' || rawBoolValue === 1 || rawBoolValue === '1';
        data[field.field + '__text'] = isTrueValue ? trueLabel : falseLabel;
        // ]]]FI
      }

      // Es muy parecido fieldsBool, pero en lugar de buscar entre 2 valores posibles busca en un array
      // no uso filter porque recorre todo el arreglo sin detenerse cuando encuentre la coincidencia

      moreFields.forEach((field) => {
        // Obtiene el id del de respuesta del servidor en base al nombre del campo
        const id = dja.attributes[field[0]];
        if (Array.isArray(field[1])) {
          for (const item of field[1]) {
            // Itera el array donde buscara la clave que se envía en la respuesta del servidor
            //|||id y name se cambian por value y display_name porque asi reponde el servidor los tipo choice, en lugar de ponerse manualmente,
            // se toma de las consulta options que se hace en el servidor
            if (item.value == id) {
              //compara el Id del array vs el id del servidor
              data[field[0] + '__text'] = item.display_name;
              break; // Detiene la iteración cuando se encuentra la coincidencia
            }
          }
        }
      });

      // [[[II ESC:005-03 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-03
      // Aplana los formularios dinámicos (`form_data` propio del registro y
      // `parent_form_data` que el hijo captura contra el padre) hacia claves planas
      // `form_data.<campo>` / `parent_form_data.<campo>`, que es exactamente el
      // `col.field` que generateJSONColumns crea para estos campos.
      //
      // El valor persistido puede venir como objeto (p.ej. una opción/relación:
      // { id, code, name }), como primitivo o como arreglo. Se formatea usando el
      // `option_label` declarado en la configuración del campo (uniendo los valores
      // si trae varias claves separadas por coma, igual que los demás campos); si el
      // objeto no expone esas claves se hace fallback a name/display_name/label/code/id.
      // Se reutiliza este mismo ciclo (registro por registro) para evitar más latencia.
      for (const formDataKey of ['form_data', 'parent_form_data']) {
        const formDataValue = dja.attributes?.[formDataKey];
        if (formDataValue && typeof formDataValue === 'object' && !Array.isArray(formDataValue)) {
          for (const childKey in formDataValue) {
            if (!Object.prototype.hasOwnProperty.call(formDataValue, childKey)) continue;
            const fieldCfg = fields?.[childKey];
            // [[[II ESC:005-09 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-09
            const rawDynamicValue = formDataValue[childKey];
            if (typeof rawDynamicValue === 'boolean' || rawDynamicValue === 'true' || rawDynamicValue === 'false' || rawDynamicValue === 1 || rawDynamicValue === 0 || rawDynamicValue === '1' || rawDynamicValue === '0') {
              const trueLabel = fieldCfg?.label_true ?? customField?.[childKey + '_true'] ?? 'true';
              const falseLabel = fieldCfg?.label_false ?? customField?.[childKey + '_false'] ?? 'false';
              const isTrueValue = rawDynamicValue === true || rawDynamicValue === 'true' || rawDynamicValue === 1 || rawDynamicValue === '1';
              data[formDataKey + '.' + childKey] = isTrueValue ? trueLabel : falseLabel;
              continue;
            }
            // ]]]FI
            data[formDataKey + '.' + childKey] = this.formatDynamicValue(rawDynamicValue, fieldCfg);
          }
        }
      }
      // ]]]FI

      if (node) {
        return { data: data, leaf: false, parent: null }; //
      }

      return data;
    });

    if (is_object) {
      resp[0].included = included;
      return resp[0];
    }

    //resp.included = included;
    return resp;
  }


  /**
   * Construye el texto de visualización compuesto según `option_label_join` y lo escribe en `data[label_field_key]`.
   *
   * - `source` (opcional): objeto del que se leen los valores.
   *   - Para FK/M2M: pasar `{ id: inc.id, ...inc.attributes }` para leer atributos del objeto relacionado.
   *     Esto permite que `option_label` pueda incluir `'id'` (nivel raiz de JSON:API) ademas de atributos.
   *   - Para campos propios del objeto: omitir `source`; los valores se leen de `data`.
   *
   * - `label_field_key`:
   *   - tree-select -> `'label'` (clave que hardcodea PrimeNG treeSelect; NUNCA concatenar campos)
   *   - otros        -> `optionLabelJoin.join('')` p.ej. `"nameid"` para `option_label: "name,id"`.
   *     Esto es equivalente al resultado del pipe `joinOrSelf` en los templates,
   *     por lo que ambas capas quedan armonizadas.
   *
   * - Para tree-select, ademas de escribir en `label_field_key` (`'label'`),
   *   garantiza que `data['label']` contenga el primer campo de `option_label_join`.
   */
  private _applyLabelField(data: any, rule: any, source?: any): void {
    if (!rule || !rule.option_label_join || !rule.option_label_join.length) return;

    const src = source ?? data;  // lee del relacionado si se pasa, si no del objeto principal
    const keys: string[] = rule.option_label_join;
    const labelFieldKey: string = rule.label_field_key;


    if (rule.type === 'tree-select' || rule.type === 'listbox') {
      const baseVal = src[keys[0]];
      data['label'] = baseVal == null ? '' : String(baseVal).trim();
    }

    const parts: string[] = [];
    for (const key of keys) {
      let val = src[key];
      if (val === undefined || val === null) val = '';
      parts.push(String(val).trim());
    }

    if (parts.length) {
      data[labelFieldKey] = parts.join(' ');
    }
    //console.log('--------------------', keys, labelFieldKey, parts.length, data[labelFieldKey], data,);
  }

  // [[[II ESC:005-03 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-03 ESC:030-02 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-02
  /**
   * Formatea un valor persistido de un formulario dinámico (`form_data` /
   * `parent_form_data`) para mostrarlo en la celda de la tabla.
   *
   * - `null`/`undefined` → `''`.
   * - Arreglo → formatea cada elemento y los une con el separador de
   *   `cols.multiple.separator` (por defecto `','`).
   * - Objeto → usa `option_label` (clave o claves separadas por coma) para leer y
   *   unir los valores del objeto (mismo criterio que el resto de campos). Si ninguna
   *   clave de `option_label` resuelve, hace fallback a
   *   name/display_name/label/value/code/id.
   * - Primitivo → se devuelve como string.
   *
   * @param value Valor crudo almacenado en `form_data[childKey]`.
   * @param fieldCfg Configuración del campo (de `fieldsForm(pos)[childKey]`), opcional.
   */
  formatDynamicValue(value: any, fieldCfg: any): string {
    if (value === null || value === undefined) return '';

    if (Array.isArray(value)) {
      const separator: string = fieldCfg?.cols?.multiple?.separator ?? ',';
      return value
        .map((v: any) => this.formatDynamicValue(v, fieldCfg))
        .filter((s: string) => s !== '')
        .join(separator);
    }

    if (typeof value === 'object') {
      const optionLabel = fieldCfg?.option_label;
      let parts: string[] = [];
      if (optionLabel) {
        const keys = (Array.isArray(optionLabel) ? optionLabel : String(optionLabel).split(','))
          .map((key: any) => String(key).trim())
          .filter((key: string) => key.length > 0);
        parts = keys
          .map((k: string) => value[k])
          .filter((v: any) => v !== null && v !== undefined && v !== '')
          .map((v: any) => String(v).trim());
      }
      if (parts.length) return parts.join(' ');

      // Fallback: el objeto persistido no expone las claves de option_label
      // (p.ej. una opción guardada como { id, code, name } y option_label 'display_name').
      const fallback = value.name ?? value.display_name ?? value.label ?? value.value ?? value.code ?? value.id;
      return fallback === null || fallback === undefined ? '' : String(fallback).trim();
    }

    return String(value);
  }

  /**
   * Completa una fila de tabla usando únicamente sus columnas declaradas y un
   * objeto fuente ya aplanado. Una relación conserva el id como dato base, pero
   * para la celda visible usa el `option_label` de la configuración fuente.
   */
  mergeConfiguredTableRow(row: any, columns: any[], source: any, sourceConfig: any = {}): any {
    const result = row && typeof row === 'object' && !Array.isArray(row) ? { ...row } : {};
    if (!source || typeof source !== 'object' || Array.isArray(source)) return result;

    const isEmpty = (value: any) => value === null || value === undefined || value === '';
    const relationshipField = sourceConfig?.relationship_field;
    const sourceId = source?.id ?? source?.value;
    const displayValue = this.formatDynamicValue(source, sourceConfig);

    for (const column of this.configuredTableColumns(columns)) {
      const field = column?.field;
      if (!field) continue;

      if (isEmpty(result[field]) && source[field] !== undefined) {
        result[field] = source[field];
      }

      const rawRelationship = result[field];
      const isSourceRelationship = field === relationshipField;
      const pointsToSource = sourceId !== null && sourceId !== undefined
        && String(rawRelationship) === String(sourceId);
      if (isSourceRelationship && displayValue && (isEmpty(rawRelationship) || pointsToSource)) {
        result[field] = displayValue;
      }
    }

    return result;
  }

  /**
   * Proyecta un objeto fuente YA aplanado por DJAtoObject (p.ej. la respuesta de
   * un detalle recién creado/editado) hacia las columnas declaradas de una tabla
   * derivada, respetando el contrato source→target por configuración y SIN
   * hardcodear nombres de campo. Resuelve la clave fuente de cada columna en este
   * orden contractual:
   *   1. `column.field`
   *   2. `column.field_name`
   *   3. `column.derived.field_name`
   *   4. `column.children.fields.derived[column.field].field_name`
   *
   * Para columnas de relación (tienen `data_type.type` o `relationship_field`)
   * conserva el UUID canónico en `result[field]` (y en `relationship_field`) y
   * expone la etiqueta visible en `result[field + '__name']`. Nunca sustituye el
   * UUID por la etiqueta ni muestra el UUID cuando existe etiqueta: la celda lee
   * primero `field__name` y el `tableRowSourceFlag` conserva el UUID para PATCH.
   *
   * No sobrescribe valores locales ya presentes en `row` (p.ej. campos
   * `scope_edition: 'local'` capturados en la fila); solo rellena huecos.
   */
  projectConfiguredTableRow(row: any, columns: any[], source: any): any {
    const result = row && typeof row === 'object' && !Array.isArray(row) ? { ...row } : {};
    if (!source || typeof source !== 'object' || Array.isArray(source)) return result;

    const isEmpty = (value: any) => value === null || value === undefined || value === '';

    for (const column of this.configuredTableColumns(columns)) {
      const field = column?.field;
      if (!field) continue;

      // Clave fuente segun el contrato declarado (no se asume que target === source).
      const derivedFromChildren = column?.children?.fields?.derived?.[field]?.field_name;
      const sourceKey = column?.field_name
        || column?.derived?.field_name
        || derivedFromChildren
        || field;

      const hasDirect = source[sourceKey] !== undefined;
      const displayValue = source[`${sourceKey}__name`];
      const hasDisplay = displayValue !== undefined && displayValue !== null && displayValue !== '';
      if (!hasDirect && !hasDisplay) continue;

      const isRelationship = !!(column?.data_type?.type) || !!column?.relationship_field;

      // Valor canonico (UUID para relaciones; valor plano en otro caso). Solo se
      // rellena si la fila no trae ya un valor local para ese target.
      if (isEmpty(result[field]) && hasDirect) {
        const rawValue = source[sourceKey];
        result[field] = (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue))
          ? this.formatDynamicValue(rawValue, column)
          : rawValue;
      }

      // Etiqueta de presentacion separada del UUID (para relaciones).
      if (isRelationship && hasDisplay && isEmpty(result[`${field}__name`])) {
        result[`${field}__name`] = displayValue;
      }

      // Conserva el UUID de la relacion en su campo canonico declarado.
      const relationshipField = column?.relationship_field;
      if (relationshipField && isEmpty(result[relationshipField]) && source[relationshipField] !== undefined) {
        result[relationshipField] = source[relationshipField];
      }
    }

    return result;
  }
  // ]]]FI

  // [[[II ESC:030-06 Normalizador de columnas de tabla derivada: la config puede
  // declararlas como LISTA (legado) o como DICT numerado {0:{...}, 1:{...}} — la
  // misma forma que panel.fields — para que la misma función "planche" ambas
  // anidaciones. Devuelve SIEMPRE un array ordenado por clave numérica.
  // Fuente única: todo consumidor de columns debe pasar por aquí. ]]]FI
  configuredTableColumns(columns: any): any[] {
    if (Array.isArray(columns)) return columns;
    if (!columns || typeof columns !== 'object') return [];
    return Object.keys(columns)
      .sort((a, b) => {
        const na = Number(a); const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      })
      .map((key) => columns[key])
      .filter((column) => column && typeof column === 'object');
  }

  // ==========================================================================
  // [[[II ESC:001-16 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-16 ESC:030-06 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-06
  // Enriquecimiento de sugerencias de autocomplete: rellena los campos anidados
  // `<relacion>_data_<atributo>` (p.ej. `base_product_data_name`) que declara la
  // config (option_label / panel / children.derived), leyéndolos de `included`
  // del JSON:API. Compartido por el form dinámico (completeMethod) y las celdas
  // de tabla derivada (autocomplete por celda). Reúso: fuente única, sin duplicar. ]]]FI
  // ==========================================================================
  enrichSuggestionRelationData(rows: any[], resp: any, config: any): any[] {
    const requestedFields = this._collectRelationDataFields(config);
    if (!requestedFields.length || !Array.isArray(rows)) return rows;

    const included = resp?.included || [];
    if (!Array.isArray(included) || included.length === 0) return rows;

    return rows.map((row: any) => {
      if (!row || typeof row !== 'object') return row;
      const next = { ...row };
      this._applyRelationDataFields(next, included, requestedFields);
      return next;
    });
  }

  private _relationDataFieldParts(fieldName: any): { relationship: string; attribute: string } | null {
    if (typeof fieldName !== 'string') return null;
    const marker = '_data_';
    const index = fieldName.indexOf(marker);
    if (index <= 0) return null;

    const relationship = fieldName.slice(0, index).trim();
    const attribute = fieldName.slice(index + marker.length).trim();
    if (!relationship || !attribute) return null;

    return { relationship, attribute };
  }

  private _labelKeysOf(optionLabel: any): string[] {
    if (Array.isArray(optionLabel)) {
      return optionLabel.map((key: any) => String(key).trim()).filter((key: string) => key.length > 0);
    }
    if (typeof optionLabel !== 'string') return [];
    return optionLabel.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0);
  }

  private _collectRelationDataFields(config: any): string[] {
    const fields = new Set<string>();
    const addField = (value: any): void => {
      const parts = this._relationDataFieldParts(value);
      if (parts) fields.add(String(value).trim());
    };

    const collectNode = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      addField(node.field);
      addField(node.field_name);
      addField(node?.derived?.field_name);

      if (node.columns && typeof node.columns === 'object') {
        Object.values(node.columns).forEach(collectNode);
      }
      if (node.fields && typeof node.fields === 'object') {
        Object.values(node.fields).forEach(collectNode);
      }
    };

    this._labelKeysOf(config?.option_label).forEach(addField);

    const panelFields = config?.panel?.fields;
    if (panelFields && typeof panelFields === 'object') {
      Object.values(panelFields).forEach(collectNode);
    }

    const childGroups = config?.children?.fields;
    if (childGroups && typeof childGroups === 'object') {
      ['static', 'dynamic', 'derived'].forEach(groupKey => {
        const group = childGroups[groupKey];
        if (group && typeof group === 'object') {
          Object.values(group).forEach(collectNode);
        }
      });
    }

    return Array.from(fields);
  }

  private _findIncludedItem(included: any[], relationData: any): any | null {
    if (!relationData || !Array.isArray(included)) return null;
    return included.find((item: any) => item?.id == relationData.id && (!relationData.type || item?.type === relationData.type))
      ?? included.find((item: any) => item?.id == relationData.id)
      ?? null;
  }

  private _includedRelationValue(includedItem: any, relationData: any, attribute: string): any {
    if (attribute === 'id') return includedItem?.id ?? relationData?.id ?? '';
    if (attribute === 'type') return includedItem?.type ?? relationData?.type ?? '';
    return includedItem?.attributes?.[attribute];
  }

  private _applyRelationDataFields(row: any, included: any[], requestedFields: string[]): void {
    if (!row || typeof row !== 'object' || !Array.isArray(included) || included.length === 0) return;
    const relationships = row.relationships || {};

    requestedFields.forEach(fieldName => {
      if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') return;

      const parts = this._relationDataFieldParts(fieldName);
      if (!parts) return;

      const relationData = relationships?.[parts.relationship]?.data;
      if (!relationData) return;

      if (Array.isArray(relationData)) {
        const values = relationData
          .map((item: any) => this._findIncludedItem(included, item))
          .map((includedItem: any, index: number) => this._includedRelationValue(includedItem, relationData[index], parts.attribute))
          .filter((value: any) => value !== undefined && value !== null && value !== '');
        if (values.length) row[fieldName] = values.join(', ');
        return;
      }

      const includedItem = this._findIncludedItem(included, relationData);
      if (!includedItem) return;

      const value = this._includedRelationValue(includedItem, relationData, parts.attribute);
      if (value !== undefined && value !== null) {
        row[fieldName] = value;
      }
    });
  }

  // Llama esto una vez desde cualquier componente (por ejemplo, al hacer submit)
  // ***********************ADAPTADO PARA CAPACITOR*********************
  initialize(): void {
    if (this.initialized) return;

    this.getCurrentPositionCapacitor()
      .then((coords) => {
        this.updateCoordsFromCapacitor(coords);
        this.location$.next(this.getCoords());
        this.startInterval();
        this.initialized = true;
      })
      .catch((err) => {
        //console.error('Error al obtener ubicación con Capacitor:', err);
        // Fallback a geolocation nativa si Capacitor falla
        this.tryNativeGeolocation();
      });
  }


  /**
 * Indica si el viewport actual cumple con el breakpoint
 * definido para pantalla móvil usando media query.
 *
 * Hace referencia únicamente al tamaño de pantalla.
 * No detecta tipo de dispositivo.
 * No detecta sistema operativo.
 * No detecta entorno nativo.
 */
  isMobileScreen() {
    return window.matchMedia('(max-width: 991px)').matches;
  }


  // ***********************ADAPTADO PARA CAPACITOR*********************
  /**
 * Estricto. Indica si la aplicación se está ejecutando en plataforma nativa
 * mediante Capacitor.
 *
  * No hace referencia al tamaño de pantalla.
  * No detecta navegador móvil ni PWA.
  * Solo detecta entorno nativo (APK/IPA).
 */
  // [[[II ESC:019-01 DOC:docs/documents/2026-06-04_019_dropdown-cache-platform-read.md#escenario-01
  public isMobile(): boolean {
    const platform = this.getCapacitorPlatform();
    return this.isNativePlatform() && (platform === 'android' || platform === 'ios');
  }

  public isDesktop(): boolean {
    // Se conserva como alias amplio para no romper consumidores existentes.
    return !this.isMobile();
  }

  public isDesktopApp(): boolean {
    const platform = this.getCapacitorPlatform();
    return this.isNativePlatform() && platform !== 'android' && platform !== 'ios';
  }

  public isWeb(): boolean {
    return !this.isNativePlatform();
  }

  public getClientPlatform(): 'mobile' | 'desktop' | 'web' {
    if (this.isMobile()) return 'mobile';
    if (this.isDesktopApp()) return 'desktop';
    return 'web';
  }

  private isNativePlatform(): boolean {
    return !!(typeof window !== 'undefined'
      && (window as any).Capacitor
      && (window as any).Capacitor.isNativePlatform?.());
  }

  private getCapacitorPlatform(): string {
    if (typeof window === 'undefined' || !(window as any).Capacitor?.getPlatform) {
      return 'web';
    }

    return String((window as any).Capacitor.getPlatform() || 'web').toLowerCase();
  }
  // ]]]FI

  /**
   * 
   * @returns Verifica el estado de la red, en web usa navigator.onLine, en móvil usaría Capacitor Network plugin
   */
  public networkStatus(): string {
    if (this.isDesktop()) {
      return navigator.onLine ? 'online' : 'offline';
    }
    if (this.isMobile()) {
      // Aquí podrías usar Capacitor Network plugin para obtener el estado de la red en móviles
      return 'mobile network status not implemented'; // Placeholder
    } else {
      return navigator.onLine ? 'online' : 'offline';
    }
  }

  // ***********************NUEVO MÉTODO*********************
  // Método público para obtener device_id solo en móviles
  private _deviceId: string | null = null; // Cache para device_id
  public async getDeviceId(): Promise<string | null> {
    if (this.isMobile()) {
      if (this._deviceId) {
        return this._deviceId;
      }
      try {
        const info = await Device.getId();
        this._deviceId = info.identifier || null;
        return this._deviceId;

      } catch (error) {
        //console.error('Error obteniendo device_id:', error);
        return null;
      }
    }
    return null; // No devolvemos device_id en web
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para obtener ubicación usando Capacitor Geolocation
  private async getCurrentPositionCapacitor(): Promise<any> {
    try {
      // Solicitar permisos primero
      const permissions = await Geolocation.requestPermissions();

      if (permissions.location !== 'granted') {
        throw new Error(`Permisos denegados: ${permissions.location}`);
      }

      // Obtener la posición actual
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return position;
    } catch (error: any) {
      // Retornar el error exacto tal como viene
      throw new Error(error.message || error.toString());
    }
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para actualizar coordenadas desde respuesta de Capacitor
  private updateCoordsFromCapacitor(position: any): void {
    this.latitude = position.coords.latitude;
    this.longitude = position.coords.longitude;
    this.sysTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    //console.log('Ubicación actualizada con Capacitor:', this.latitude, this.longitude, this.sysTimeZone);
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Fallback a geolocalización nativa del navegador
  private tryNativeGeolocation(): void {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocalización no soportada.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.updateCoords(pos);
        this.location$.next(this.getCoords());
        this.startInterval();
        this.initialized = true;
      },
      (err) => {
        console.error('Error al obtener ubicación con navegador nativo:', err);
      }
    );
  }

  // Actualiza coordenadas
  private updateCoords(pos: GeolocationPosition): void {
    this.latitude = pos.coords.latitude;
    this.longitude = pos.coords.longitude;
    this.sysTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    //console.log('Ubicación actualizada:', this.latitude, this.longitude, this.sysTimeZone);
  }

  // Devuelve el objeto con coordenadas y zona horaria
  private getCoords(): { latitude: number; longitude: number; time_zone: string } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      time_zone: this.sysTimeZone
    };
  }

  // Refresca cada 30s
  // ***********************ADAPTADO PARA CAPACITOR*********************
  private startInterval(): void {
    this.intervalId = setInterval(() => {
      this.getCurrentPositionCapacitor()
        .then((position) => {
          this.updateCoordsFromCapacitor(position);
          this.location$.next(this.getCoords());
        })
        .catch((err) => {
          //console.error('Error al refrescar ubicación con Capacitor:', err);
          // Fallback a navegador nativo en caso de error
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.updateCoords(pos);
              this.location$.next(this.getCoords());
            },
            (fallbackErr) => 1 //console.error('Error al refrescar ubicación con navegador nativo:', fallbackErr)
          );
        });
    }, 30000);
  }

  // Para obtener las coordenadas actuales desde otro componente
  public getLocationSnapshot(): { latitude: number; longitude: number; time_zone: string; msg: string } {
    const currentValue = this.location$.getValue();
    const defaultCoords = this.getCoords();

    if (!currentValue) {
      return {
        ...defaultCoords,
        msg: defaultCoords.latitude !== 0 && defaultCoords.longitude !== 0 ? 'ok' : 'Sin coordenadas iniciales'
      };
    }

    return {
      ...currentValue,
      msg: currentValue.latitude !== 0 && currentValue.longitude !== 0 ? 'ok' : 'Coordenadas en 0,0'
    };
  }

  // ***********************NUEVO MÉTODO*********************
  // Método mejorado para obtener ubicación con manejo de errores reales
  public async getCurrentLocation(): Promise<{ latitude: number; longitude: number; time_zone: string; msg: string }> {
    const defaultCoords = this.getCoords();

    if (this.isMobile()) {
      // Lógica para móvil usando Capacitor
      try {
        const position = await this.getCurrentPositionCapacitor();
        this.updateCoordsFromCapacitor(position);
        const coords = this.getCoords();
        this.location$.next(coords);
        return {
          ...coords,
          msg: 'ok'
        };
      } catch (error: any) {
        return {
          ...defaultCoords,
          msg: `Error móvil: ${error.message}`
        };
      }
    } else {
      // Lógica para web usando navigator.geolocation
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({
            ...defaultCoords,
            msg: 'Geolocalización no soportada en este navegador'
          });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.updateCoords(pos);
            const coords = this.getCoords();
            this.location$.next(coords);
            resolve({
              ...coords,
              msg: 'ok'
            });
          },
          (error) => {
            let errorMsg = '';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg = `Permisos denegados: ${error.message}`;
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = `Posición no disponible: ${error.message}`;
                break;
              case error.TIMEOUT:
                errorMsg = `Timeout: ${error.message}`;
                break;
              default:
                errorMsg = `Error web: ${error.message}`;
                break;
            }
            resolve({
              ...defaultCoords,
              msg: errorMsg
            });
          }
        );
      });
    }
  }

  // ***********************NUEVO MÉTODO*********************
  // Método para forzar actualización de ubicación
  public async forceLocationUpdate(): Promise<{ latitude: number; longitude: number; time_zone: string; msg: string }> {
    return await this.getCurrentLocation();
  }

  // Para suscribirse a actualizaciones (si lo necesitas)
  public onLocationChange() {
    return this.location$.asObservable();
  }

  // Limpieza si quieres hacerlo manualmente
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.initialized = false;
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para iniciar el seguimiento continuo de ubicación (opcional)
  public startWatching(): Promise<string> {
    return Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 30000
      },
      (position, err) => {
        if (position) {
          this.updateCoordsFromCapacitor(position);
          this.location$.next(this.getCoords());
        }
        if (err) {
          console.error('Error en watch position:', err);
        }
      }
    );
  }

  // Método para detener el seguimiento continuo
  public async stopWatching(watchId: string): Promise<void> {
    await Geolocation.clearWatch({ id: watchId });
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para verificar permisos de geolocalización
  public async checkPermissions(): Promise<any> {
    if (this.isMobile()) {
      return await Geolocation.checkPermissions();
    } else {
      // Para web, simular estructura de permisos
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ location: 'denied' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => resolve({ location: 'granted' }),
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                resolve({ location: 'denied' });
                break;
              default:
                resolve({ location: 'prompt' });
                break;
            }
          },
          { timeout: 1000 }
        );
      });
    }
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para solicitar permisos de geolocalización
  public async requestPermissions(): Promise<any> {
    if (this.isMobile()) {
      return await Geolocation.requestPermissions();
    } else {
      // Para web, intentar obtener ubicación (esto solicita permisos automáticamente)
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ location: 'denied' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => resolve({ location: 'granted' }),
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                resolve({ location: 'denied' });
                break;
              default:
                resolve({ location: 'prompt' });
                break;
            }
          }
        );
      });
    }
  }

  // ***********************NUEVO MÉTODO*********************
  // Método para probar permisos y obtener ubicación con mensajes reales
  public async testAndRequestLocationPermissions(): Promise<{
    permissionsGranted: boolean;
    coordinates: { latitude: number; longitude: number; time_zone: string } | null;
    msg: string;
    error?: string;
  }> {
    try {
      // Verificar permisos actuales
      const currentPermissions = await this.checkPermissions();
      let permissionsGranted = currentPermissions.location === 'granted';
      let msg = `Permisos actuales: ${currentPermissions.location}`;

      // Si no están concedidos, solicitarlos
      if (!permissionsGranted) {
        const requestResult = await this.requestPermissions();
        permissionsGranted = requestResult.location === 'granted';
        msg = `Resultado solicitud: ${requestResult.location}`;

        if (!permissionsGranted) {
          return {
            permissionsGranted: false,
            coordinates: null,
            msg: `Permisos no concedidos: ${requestResult.location}`,
            error: `Estado final: ${requestResult.location}`
          };
        }
      }

      // Si los permisos están concedidos, obtener coordenadas
      let coordinates = null;
      if (permissionsGranted) {
        try {
          const locationResult = await this.getCurrentLocation();

          if (locationResult.msg === 'ok') {
            coordinates = {
              latitude: locationResult.latitude,
              longitude: locationResult.longitude,
              time_zone: locationResult.time_zone
            };
            msg = `Ubicación obtenida: ${locationResult.latitude}, ${locationResult.longitude}`;
          } else {
            msg = `Error ubicación: ${locationResult.msg}`;
            return {
              permissionsGranted: true,
              coordinates: null,
              msg,
              error: locationResult.msg
            };
          }
        } catch (locationError: any) {
          const errorMsg = `Error al obtener coordenadas: ${locationError.message}`;
          return {
            permissionsGranted: true,
            coordinates: null,
            msg: errorMsg,
            error: locationError.message
          };
        }
      }

      return {
        permissionsGranted,
        coordinates,
        msg
      };

    } catch (error: any) {
      const errorMsg = `Error en test permisos: ${error.message}`;
      return {
        permissionsGranted: false,
        coordinates: null,
        msg: errorMsg,
        error: error.message
      };
    }
  }
}
