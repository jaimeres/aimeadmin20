import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
// ***********************ADAPTADO PARA CAPACITOR*********************
import { Geolocation } from '@capacitor/geolocation';

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
    let relationshipsResp = [];
    // genera el objeto relationships
    for (let relation of relationships) {
      console.log('relationship', relation, relation.id, relation.field, relation.type);

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
            data.push({ id: id.id, type: relation.type });
            continue;
          }

          data.push({ id: id, type: relation.type });
        }
        // agrega el array de objetos al objeto relationships
        relationshipsResp[relation.field] = {
          data: data
        };
      } else if (relation.id) {
        //los objectos con relaciobes one to many, no se pueden enviar como array, por eso se envía como objeto
        relationshipsResp[relation.field] = {
          data: { id: relation.id, type: relation.type }
        };
      } else {
        // elimina las relaciones nulas pero del objecto principal para que jsonapi no lo tome como un campo y no se queje
        if (attributes.hasOwnProperty(relation.field)) {
          delete attributes[relation.field];
        }
      }
    }

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

    return dataResp;
  }

  baseDJAFormData({ attributes, type, relationships = [], id, files = null }: { attributes: any; type: string; relationships?: any[]; id?: string; files?: any }) {
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
  search_include(included: any[], id: string, relationshipName: string, additionalFieldsIncluded: any, return_attributes = false) {
    const relationship_name: any = [];
    for (const item of included) {
      if (item.id == id) {
        if (return_attributes) {
          return item.attributes;
        }
        relationship_name[relationshipName + '__name'] = item.attributes.username || item.attributes.name;
        if (additionalFieldsIncluded) {
          for (const field of additionalFieldsIncluded[relationshipName]) {
            relationship_name[relationshipName + '_' + field.renamed_fields] = item.attributes[field.original_field];
          }
        }
        break;
      }
    }
    //console.log(relationship_name);

    return relationship_name;
  }
  /*search_include(included, id, relationshipName, additionalFieldsIncluded): string {
    for (const item of included) {
 
      if (item.id == id) {
        return item.attributes.username || item.attributes.name;
      }
    }
    return '';
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

  /*timeZone(dateTime, time_zone) {  
   
     if (!dateTime) {
       return '';
     }
    const date = new Date(dateTime);
 
    return date.toLocaleString('default', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }*/

  /**
   * Agrega campos en texto a las claves o bool agregandoles de subfijo text, tambien duplica en id agregandolo al nodo attributes
   * @param respDJA Respuesta del servidor en formato dja
   * @param additionalFieldsIncluded Campos adicionales que se deben agregar de la relacion incluida, si no se envia,
   *   solo retorna nombre_de_campo_incluido__name, si quiero que regrese otro valor, por ejeplo, level, tengo que enviar
   *   [{ original_field: 'level', renamed_fields: 'level'}], notese que en valo lo regresara en level, por, renamed_fields: 'level',
   *   original_field debe existir en el included que retorna el servidor
   * @param customField nombre de campos personalizados, la clave es el campo en ingles que envía el servidor
   * @param fieldsBool Campos con valor booleano que convierte a texto en base al valor bool
   * @param moreFields Toma el id y agrega un campo nombre del campo __text, y lo convierte en texto
   * Debe ser un array que contienes arrays donde debe venir el nombre del campo y el array de valores [[nombre_del_campo,{id:1, name:'Nombre'}],[]]
   * @returns
   */
  DJAtoObject({
    respDJA,
    additionalFieldsIncluded = null,
    customField = [],
    fieldsBool = [],
    moreFields = [],
    timeZone = [],
    node = false,
    additionalFieldsAppCols = []
  }: {
    respDJA: any;
    additionalFieldsIncluded?: any;
    customField?: any;
    fieldsBool?: any[];
    moreFields?: any[];
    timeZone?: any[];
    node?: boolean;
    additionalFieldsAppCols?: any[];
  }) {
    let included = respDJA?.included;
    let dataDJA = respDJA?.data;
    let is_object = false;

    if (!dataDJA) {
      return [];
    }

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
    /*
    // typeof identifica a un array y un objecto como un objecto, por eso si typeof dice que es un objeto y isArray dice que no es array, 
    //entonces es un objeto
   if (typeof dataDJA === 'object' && !Array.isArray(dataDJA)) {
 
      //lo hago para que el id de los campos relacionados esté dentro del array general, principalmente para que cuando se resetee a un form, 
      //se pueda asignar directamente, aquí hay un tema dja se queja si el id de los campos relacionados no está dentro del array relationships,
      //y se envía directamente dentro del objeto attributes, PERO, si tambien lo envío dentro del objeto relationships lo toma como el bueno y ya no se queja,
      //por lo tanto, lo envío en ambos lados
      let relationship = [];
      let relationship_name = [];
      for (const relationshipName in dataDJA.relationships) {
        const id = dataDJA.relationships[relationshipName].data?.id;
        relationship[relationshipName] = dataDJA.relationships[relationshipName].data?.id;
        //relationship.push({relationshipName:dja.relationships[relationshipName].data?.id});
 
        //Asigna el nombre del campo relacionado
        if (id && included) {
          relationship_name[relationshipName + '_name'] = this.search_include(included, id);
        }
      }
 
      let data = {
        id: dataDJA.id,
        type_type: dataDJA.type, // para que esté dentro del array, repito el nombre para que no vaya a chocar con el nombre de un campos
        ...dataDJA.attributes,
        ...relationship,
        ...relationship_name,
        relationships: dataDJA.relationships
      }
 
      fieldsBool.forEach((field) => {
        // Dependioendo de valor de campo carga el valor para el verdadero o falso, en los datos mostrados al usuario se llama __text
        data[field + '__text'] = dataDJA.attributes[field] ? customField[field + '_true'] : customField[field + '_false'];
      });
 
      moreFields.forEach((field) => {
 
        const id = dataDJA.attributes[field[0]]
        for (const item of field[1]) {
          // Itera el array donde buscara la clave que se envía en la respuesta del servidor
          if (item.id == id) {
            //compara el Id del array vs el id del servidor
            data[field[0] + '__text'] = item.name;
            //al campo enviado le agrego __text para indicar que es el valor en texto y le asigno el nombre
            break;
            // Detiene la iteración cuando se encuentra la coincidencia
          }
        }
      });
 
      return data;
 
    } else if (Array.isArray(dataDJA)) {*/
    const resp = dataDJA.map((dja: any) => {
      /*lo hago para que el id de los campos relacionados esté dentro del array general, principalmente para que cuando se resetee a un form, 
      se pueda asignar directamente, aquí hay un tema dja se queja si el id de los campos relacionados no está dentro del array relationships,
      y se envía directamente dentro del objeto attributes, PERO, si tambien lo envío dentro del objeto relationships lo toma como el bueno y ya no se queja,
      por lo tanto, lo envío en ambos lados*/
      let relationship: any = [];
      let relationship_name: any = [];
      for (const relationshipName in dja.relationships) {
        const item = dja.relationships[relationshipName].data;
        const IsArray = Array.isArray(dja.relationships[relationshipName].data);

        if (IsArray) {
          //para los m2m
          relationship_name[relationshipName + '__array'] = item;
          relationship_name[relationshipName + '__name'] = item.length > 0 ? item.length + ' elemento(s)' : '';
          relationship[relationshipName] = item.map((item: any) => item.id);
          /*relationship[relationshipName] = item.map((element: any) => ({
              id: element.id,
              label: '123123123'//element.attributes?.name || ''
            }));*/

          // no estor seguri si debe ir
          /*for (const field of additionalFieldsIncluded) {
            console.log(field);            
          }*/
        } else {
          const id = item?.id;
          relationship[relationshipName] = id;
          const additional: any = relationshipName + '_data';

          if (additionalFieldsAppCols[additional]) {
            const additional_fields = this.search_include(included, id, relationshipName, null, true);

            //cocatenarle a los campos del objecto additional_fields la variabnle additional + '_'
            for (const field in additional_fields) {
              dja.attributes[additional + '_' + field] = additional_fields[field];
            }

            // relaciona los id con los nombres, por default solo relaciona con el nombre, si se envia additionalFieldsIncluded,
            // se agregan con los campos enviados
          } else if (id && included) {
            const r = this.search_include(included, id, relationshipName, additionalFieldsIncluded);
            relationship_name = { ...relationship_name, ...r };
            //relationship_name[relationshipName + '__name'] = this.search_include(included, id, relationshipName, additionalFieldsIncluded);
          }
        }
      }

      let data = {
        id: dja.id,
        type_type: dja.type, // para que esté dentro del array, repito el nombre para que no vaya a chocar con el nombre de un campos
        ...dja.attributes,
        ...relationship,
        ...relationship_name,
        relationships: dja.relationships
      };

      data.utc_created_at = this.timeZone(dja.attributes?.utc_created_at);
      data.utc_modified_at = this.timeZone(dja.attributes?.utc_modified_at);
      data.utc_inactivated_at = this.timeZone(dja.attributes?.utc_inactivated_at);

      timeZone.forEach((field) => {
        data[field + '__text'] = this.timeZone(dja.attributes[field]);
        //solo si dja.attributes[field] no es nulo
        data[field] = dja.attributes[field] ? new Date(dja.attributes[field]) : null;
      });

      /*fieldsBool.forEach((field) => {

          if(!dja.attributes[field.field]) continue

          // Dependioendo de valor de campo carga el valor para el verdadero o falso, en los datos mostrados al usuario se llama __text        
          data[field.field + '__text'] = dja.attributes[field.field] ? customField[field.field + '_true'] : customField[field.field + '_false'];
      });*/
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

        // Dependiendo del valor del campo se carga el valor para el verdadero o falso
        data[field.field + '__text'] = dja.attributes[field.field] ? customField[field.field + '_true'] : customField[field.field + '_false'];
      }

      // Es muy parecido fieldsBool, pero en lugar de buscar entre 2 valores posibles busca en un array
      // no uso filter porque recorre todo el arreglo sin detenerse cuando encuentre la coincidencia

      moreFields.forEach((field) => {
        // Obtiene el id del de respuesta del servidor en base al nombre del campo
        const id = dja.attributes[field[0]];
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
      });
      //console.log({ data: data, leaf: false, parent: null });

      if (node) {
        return { data: data, leaf: false, parent: null }; //
      }

      return data;
    });
    /* } else {
       return []
     }*/

    if (is_object) {
      resp[0].included = included;
      return resp[0];
    }

    //resp.included = included;
    return resp;
  }

  //°°° ELIMINAR CUANDO YA QUE ESTA EN LA CLASE PADRE CRUD
  /**
   * Genero el objeto para el menú de más opciones, lo hago muy completo porque quiero que la llamada sea sencilla ya que lo utilizarán todos los componentes
   * @param component --component-- Es una clave de array, sola para separar el menú, preferentemente poner el nombre del componente
   * @param ref this del componrnte
   * @param concat Si requiere agregar texto a la leyenda Importar y Exportar repectivamente, sólo para las 2 primeras opciones
   * @param additionalElements agrega elementos adicionales al menú, si no envía nada, retornará
   * @returns un array para tipo MenuItem para crear el menú de más opciones
   */
  /*commonSettings(component: string = 'component', ref, concat: string[] = [], additionalElements: string[] = []): MenuItem[] {
 
    //°°°HCER PRUEBAS SI ES NECESARIO SEPARAR EN ARRAY component YA QUE CADA CADA VEZ QUE SE CARGUE UN NUEVO COMPONENTE EL ANTERIOR SE DESTRUYE Y TENDRIA LA VENTAJA DE NO 
    //ELIMINIMAR EXPLICITAMENTE EN LA CLAVE DEL ARRAY CADA VEZ QUE SALGO DEL COMPONENTE
    this.items[component] = [
      {
        label: 0 in concat ? 'Importar ' + concat[0] : 'Importar',
        command: () => ref.import()
      },
      {
        label: 1 in concat ? 'Exportar ' + concat[1] : 'Exportar',
        command: () => ref.export()
      }
    ];
 
    for (let element of additionalElements) {
      this.items[component].push({ label: element })
    }
    this.items[component].push(
      { separator: true },
      {
        label: 'Configuración del módulo',
        command: () => ref.localSettings()
      },
      { label: 'Ir a configuración', routerLink: ['/setup'] }
    );
 
    return this.items[component];
  }*/

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
        console.error('Error al obtener ubicación con Capacitor:', err);
        // Fallback a geolocation nativa si Capacitor falla
        this.tryNativeGeolocation();
      });
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para obtener ubicación usando Capacitor Geolocation
  private async getCurrentPositionCapacitor(): Promise<any> {
    try {
      // Solicitar permisos primero
      const permissions = await Geolocation.requestPermissions();

      if (permissions.location !== 'granted') {
        throw new Error('Permisos de geolocalización denegados');
      }

      // Obtener la posición actual
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return position;
    } catch (error) {
      //console.error('Error con Capacitor Geolocation:', error);
      throw error;
    }
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para actualizar coordenadas desde respuesta de Capacitor
  private updateCoordsFromCapacitor(position: any): void {
    this.latitude = position.coords.latitude;
    this.longitude = position.coords.longitude;
    this.sysTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Ubicación actualizada con Capacitor:', this.latitude, this.longitude, this.sysTimeZone);
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
    console.log('Ubicación actualizada:', this.latitude, this.longitude, this.sysTimeZone);
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
          console.error('Error al refrescar ubicación con Capacitor:', err);
          // Fallback a navegador nativo en caso de error
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.updateCoords(pos);
              this.location$.next(this.getCoords());
            },
            (fallbackErr) => console.error('Error al refrescar ubicación con navegador nativo:', fallbackErr)
          );
        });
    }, 30000);
  }

  // Para obtener las coordenadas actuales desde otro componente
  public getLocationSnapshot(): { latitude: number; longitude: number; time_zone: string } | null {
    return this.location$.getValue();
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
    return await Geolocation.checkPermissions();
  }

  // ***********************ADAPTADO PARA CAPACITOR*********************
  // Método para solicitar permisos de geolocalización
  public async requestPermissions(): Promise<any> {
    return await Geolocation.requestPermissions();
  }
}
