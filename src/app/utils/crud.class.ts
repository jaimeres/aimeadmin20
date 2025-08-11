import { computed, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MenuItem, TreeNode } from 'primeng/api';
import { CRUDService } from './services/crud.service';
import {
  classifierOptions, getAllOptions, getAllSecundaryOptions, getDJAtoObject, getStatusOptions, getTaskOptions,
  levelsOptions, resetFormOptions, saveOptions
} from './types/crud.types';
import { Vars } from './vars.class';

/**
 * clase base para la operaciones crud y otros datos
 */
/*@Injectable({
  providedIn: 'root'
})*/
export class CRUD extends Vars /*implements OnInit*/ {
  // cada vez que cambian los customField se actuakliza
  customField = computed(() => this.crudS.customField());
  // calcula el estilo del dialogo, cada vez que hay un cambio de aplicacion
  styleClassDialog = computed(() => {
    const dialog = this.drawForm()[this.pos() ?? 0]['dialog'];
    let width = dialog['height'] ? dialog['height'] : 'width-650px-custom';
    let height = dialog['width'] ? dialog['width'] : 'min-height-550px-custom';
    return `${width} ${height}`;
  });

  // convierte pos de string a number para usar como índice de array
  posNumber = computed(() => {
    const pos = this.pos();
    return pos ? parseInt(pos, 10) : 0;
  });

  // No usar inject() en clases base no decoradas. Usar DI por constructor en componentes decorados.

  constructor(protected override crudS: CRUDService) {
    super(crudS);
    this.commonSettings();
    // va en el constructor para que se ejecute antes que el ngOnInit, para que no
    //afecte si es llamado nuevamente en la clase hija
  }
  // en español las palabras "los" y "el" son artículos definidos, "un" y "una" son artículos
  //indefinidos

  initCRUD(options?: { node?: boolean; filter?: string }): void {
    if (!options) {
      options = {};
    }

    const node = options.node ?? false;
    const filter = options.filter ?? '';

    this.getAll({ pos: this.typeDefault, node, filter }); // carga los elementos al inicio
    this.configForm = this.fb.group({
      columns: [this.selectedColumns().map((column: any) => column.field), [Validators.required]]
    });
    this.getClassifierLevelsGlogal();
    this.getClassifierGlobal();
    this.searchRemote = undefined;
  }

  /**
     * Inicializa los parametros del get
     * @param arr array que contiene los elementos que se van utilizar para inicializar los 
     * paramteros del get, 
        si no se envia se utilizan las colunas visibles en la tabla
     */
  iniParam(arr: any[] = []): void {
    let include: string = '';
    // siempre debe incluir sys, para que en la edición se pueda saber si es un elemento del sistema
    let fields: string = 'sys,';

    // si no envia nada, toma los seleccionados
    const selectedColumns = arr.length > 0 ? arr : this.selectedColumns();
    //quita __name de los campos que no son relaciones, ya que el servidor no existe el campo __name

    selectedColumns.forEach((obj) => {
      //estrategicamente va al inicio
      if (obj.field.includes('_data__name')) {
        const dividedField = obj.field.split('_data__name')[0]; // Obtenemos la primera parte dividida
        include += dividedField + ',';
      } else if (obj.field.includes('__name')) {
        const dividedField = obj.field.split('__name')[0]; // Obtenemos la primera parte dividida
        include += dividedField + ',';
      } else if (obj.field.includes('__text')) {
        const dividedField = obj.field.split('__text')[0]; // Obtenemos la primera parte dividida
        fields += dividedField + ',';
      } else {
        fields += obj.field + ',';
      }
    });

    this.include = include.slice(0, -1);

    //.update(cont => include.slice(0, -1) ); //porngo update en lugar de set porque es una
    //actualización, pero supongo que da lo mismo
    this.fields = include + fields.slice(0, -1);
    //.update( cont => include + fields.slice(0, -1)); //porngo update en lugar de set porque es una
    //actualización, pero supongo que da lo mismo
  }

  /**
   * Identifica si se campio de app e inicializa los valores correnpondientes
   * @param pos nombre de la app/posición
   */
  changePos(pos: any): void {
    //||| pos this.pos() se debe inicializar aqui

    this.pos.set(pos);
    const safePos = pos ?? 0; // Crear una variable segura para usar como índice
    this.crudS.type = this.type[safePos];
    this.crudS.app = this.app[safePos];

    if (this.posBefore != pos) {
      this.removeColumns.set(this.itemsRemove[safePos] || this.itemsRemove[0]);
      this.cols.set((this.columns[safePos] || []) as any);

      // no utilizo directamente this.cols() al enviar la columna porque this.fieldConfig() es un objecto de varios valores,
      // y en este caso solo estoy inicializando la propiedad cols de objecto this.fieldConfig()
      this.fieldConfig().cols = this.cols();
      //°°°mismo caso de arriba pero creo que este si puede utlizar this.cols() ya que no se requieres muchos campos o
      //por lo tanto podria no utilizar el objecto
      this.fieldExport().cols = this.cols();
      this.iniParam();
    } /*else{
            //verifica si on lñas mismas columnas this.cols() == this.columns[pos]
            //si no son las mismas columnas, se debe inicializar this.cols() con this.columns[pos]
            
            //en algunos casos cuando se llama changePos
            if (this.cols() != this.columns[pos]){
                
                this.cols.set(this.columns[pos]);
                this.fieldConfig().cols = this.cols();
                this.fieldExport().cols = this.cols();
                this.iniParam();
            }
        }*/
    if (this.columns[safePos]) {
      //aveces cuanso se llama a changePos todavia no hay this.columns[pos], si ese es el caso
      //no actualiza tthis.posBefore para que en la nueva llamada que ya aya columnas, se actualice
      this.posBefore = pos;
    }
  }

  /**
   * Busca un objeto en un array de objetos por un campo específico y opcionalmente lo elimina.
   *
   * @param {any} value - El valor a buscar en el campo especificado de los objetos.
   * @param {Object[]} cols - El array de objetos en el que buscar.
   * @param {string} [field='field'] - El campo del objeto en el que buscar el valor. Por defecto es 'field'.
   * @param {boolean} [deleteCol=true] - Si se debe eliminar el objeto si se encuentra. Por defecto es true.
   * @returns {[Object|null, number]} - Una tupla con el objeto encontrado (o null si no se encuentra) y el índice del objeto en el array (o -1 si no se encuentra).
   */
  searchByValueObject(value: string, cols: any = [], field: string = 'field', deleteCol = true) {
    if (cols.length === 0) return [null, -1];

    const index = cols.findIndex((item: any) => item[field] === value);
    if (index === -1) return [null, -1];

    const col = cols[index];
    if (deleteCol) {
      cols.splice(index, 1);
    }

    return [col, index];
  }

  /**
   * Busca un objeto en un array de objetos por una clave específica y opcionalmente lo elimina.
   *
   * @param {string} field - La clave del objeto que se va a buscar.
   * @param {Object} objs - El array de objetos en el que buscar.
   * @param {boolean} [deleteFlag] - Si se debe eliminar el objeto si se encuentra. Por defecto es false.
   * @returns {Object|null} - El objeto encontrado (o null si no se encuentra).
   */
  searchByKeyObject(field: string, objs: any = {}, deleteFlag?: boolean) {
    if (objs.hasOwnProperty(field)) {
      const foundObject = objs[field];
      //alert(field)
      if (deleteFlag) {
        delete objs[field];
      }

      return foundObject;
    }

    return null; // Si no se encuentra el campo
  }

  /**
 * Reemplaza los valores en un formulario dinámico (`drawForm`) basándose en los campos de origen y destino.
 * 
 * Esta función permite copiar valores de un campo de origen a un campo de destino dentro de una estructura de formulario
 * dinámica. También soporta la asignación de valores directos (hardcoded) y la búsqueda recursiva en estructuras anidadas
 * como `card`. Es útil para sincronizar valores entre diferentes campos del formulario o para inicializar valores
 * predeterminados en campos relacionados.
 * 
 * ### Parámetros:
 * 
 * @param {string[] | [string, string, string?][]} source_field 
 *   - **Descripción:** Array que contiene los campos de coincidencia, los campos de origen y opcionalmente un valor directo.
 *   - **Formato:**
 *     - Para un solo reemplazo: `['sourceMatchField', 'sourceValueField', 'directValue?']`
 *     - Para múltiples reemplazos: `[['sourceMatchField1', 'sourceValueField1', 'directValue1?'], ...]`
 *   - **Detalles:**
 *     - `sourceMatchField`: Nombre del campo en el formulario que se usará para buscar el valor de origen.
 *     - `sourceValueField`: Nombre del campo dentro del objeto encontrado que contiene el valor a copiar.
 *     - `directValue` (opcional): Valor fijo que se asignará directamente al campo de destino, ignorando la búsqueda en el formulario.
 * 
 * @param {string[] | [string, string][]} dest_field 
 *   - **Descripción:** Array que contiene los campos de coincidencia y los campos de destino.
 *   - **Formato:**
 *     - Para un solo reemplazo: `['destMatchField', 'destValueField']`
 *     - Para múltiples reemplazos: `[['destMatchField1', 'destValueField1'], ...]`
 *   - **Detalles:**
 *     - `destMatchField`: Nombre del campo en el formulario que se usará para identificar el campo de destino.
 *     - `destValueField`: Nombre del campo dentro del objeto de destino donde se asignará el valor.
 * 
 * @param {any} drawForm 
 *   - **Descripción:** Objeto que representa el formulario dinámico donde se realizarán los reemplazos.
 *   - **Detalles:** 
 *     - Este objeto debe tener una estructura en la que cada clave representa un campo del formulario.
 *     - Cada campo debe contener al menos las propiedades `field` (nombre del campo) y otras propiedades relacionadas con los valores.
 *     - Puede contener estructuras anidadas, como `card`, que también serán procesadas recursivamente.
 * 
 * ### Comportamiento:
 * 
 * 1. **Reemplazo múltiple:**
 *    - Si `source_field` y `dest_field` son arrays de arrays, se procesan múltiples reemplazos en un solo llamado.
 *    - Para cada par de campos de origen y destino:
 *      - Busca el valor en el campo de origen (`sourceMatchField` y `sourceValueField`).
 *      - Asigna el valor encontrado al campo de destino (`destMatchField` y `destValueField`).
 * 
 * 2. **Reemplazo único:**
 *    - Si `source_field` y `dest_field` son arrays simples, se realiza un único reemplazo.
 *    - Busca el valor en el campo de origen y lo asigna al campo de destino.
 * 
 * 3. **Valor directo (`directValue`):**
 *    - Si se proporciona `directValue`, este valor se asigna directamente al campo de destino, ignorando la búsqueda en el formulario.
 * 
 * 4. **Recursividad:**
 *    - Si un campo contiene una estructura anidada (`card`), la función se llama recursivamente para procesar los campos dentro de esa estructura.
 * 
 * ### Ejemplo de uso:
 * 
 * #### Caso 1: Reemplazo único
 * ```typescript
 * replaceValDrawForm(
 *   ['sourceField', 'valueField'], 
 *   ['destField', 'valueField'], 
 *   drawForm
 * );
 * ```
 * - Busca el valor en `drawForm` donde `field === 'sourceField'` y copia el valor de `valueField` al campo donde `field === 'destField'`.
 * 
 * #### Caso 2: Reemplazo múltiple
 * ```typescript
 * replaceValDrawForm(
 *   [['sourceField1', 'valueField1'], ['sourceField2', 'valueField2']],
 *   [['destField1', 'valueField1'], ['destField2', 'valueField2']],
 *   drawForm
 * );
 * ```
 * - Realiza múltiples reemplazos en un solo llamado.
 * 
 * #### Caso 3: Uso de `directValue`
 * ```typescript
 * replaceValDrawForm(
 *   ['sourceField', 'valueField', 'fixedValue'], 
 *   ['destField', 'valueField'], 
 *   drawForm
 * );
 * ```
 * - Asigna el valor `'fixedValue'` directamente al campo de destino, ignorando la búsqueda en el formulario.
 * 
 * ### Validaciones:
 * 
 * - Si `source_field` y `dest_field` no son del mismo tipo (ambos arrays simples o ambos arrays de arrays de strings), lanza un error.
 * - Si `drawForm` no contiene las claves esperadas, la función no realiza ninguna acción.
 * 
 * ### Errores:
 * 
 * - Si `source_field` y `dest_field` no son arrays de strings o arrays de arrays de strings, lanza un error:
 *   ```typescript
 *   throw new Error('source_field y dest_field deben ser ambos arrays de strings o arrays de arrays de strings.');
 *   ```

 */
  replaceValDrawForm(source_field: [string, string, any?] | [string, string, any?][], dest_field: [string, string] | [string, string][], drawForm: any) {
    if (Array.isArray(source_field[0]) && Array.isArray(dest_field[0])) {
      // Caso de múltiples reemplazos
      (source_field as [string, string, any?][]).forEach((sourceTriple, index) => {
        const [sourceMatchField, sourceValueField, directValue] = sourceTriple;
        const [destMatchField, destValueField] = (dest_field as [string, string][])[index];
        let source = directValue !== undefined ? directValue : '-1';
        let key_dest = '-1';

        for (const key in drawForm) {
          if (!drawForm.hasOwnProperty(key)) continue;

          const field = drawForm[key]['field'];
          if (directValue === undefined && field === sourceMatchField) {
            source = drawForm[key][sourceValueField];
          } else if (field === destMatchField) {
            key_dest = key;
          }

          // Llamada recursiva en caso de detectar 'card' en la estructura
          if (typeof drawForm[key]?.card === 'object') {
            this.replaceValDrawForm(source_field, dest_field, drawForm[key].card);
          }

          // Llamada recursiva en caso de detectar 'fieldset' en la estructura
          if (typeof drawForm[key]?.fieldset === 'object') {
            this.replaceValDrawForm(source_field, dest_field, drawForm[key].fieldset);
          }

          if (source !== '-1' && key_dest !== '-1') {
            drawForm[key_dest][destValueField] = source;
            break;
          }
        }
      });
    } else if (typeof source_field[0] === 'string' && typeof dest_field[0] === 'string') {
      // Caso de un solo reemplazo
      const [sourceMatchField, sourceValueField, directValue] = source_field as [string, string, string?];
      const [destMatchField, destValueField] = dest_field as [string, string];
      let source = directValue !== undefined ? directValue : '-1';
      let key_dest = '-1';

      for (const key in drawForm) {
        const field = drawForm[key]['field'];

        if (directValue === undefined && field === sourceMatchField) {
          source = drawForm[key][sourceValueField];
        } else if (field === destMatchField) {
          key_dest = key;
        }

        // Llamada recursiva en caso de detectar 'card' en la estructura
        if (typeof drawForm[key]?.card === 'object') {
          this.replaceValDrawForm(source_field, dest_field, drawForm[key].card);
        }

        // Llamada recursiva en caso de detectar 'fieldset' en la estructura
        if (typeof drawForm[key]?.fieldset === 'object') {
          this.replaceValDrawForm(source_field, dest_field, drawForm[key].fieldset);
        }

        if (source !== '-1' && key_dest !== '-1') {
          drawForm[key_dest][destValueField] = source;
          break;
        }
      }
    } else {
      throw new Error('source_field y dest_field deben ser ambos arrays de strings o arrays de arrays de strings.');
    }
  }

  /**
   * Busca un valor en un array y opcionalmente lo elimina.
   * @param {any} value - El valor a buscar en el array.
   * @param {any[]} values - El array en el que buscar.
   * @param {boolean} [deleteVal=true] - Si se debe eliminar el valor si se encuentra. Por defecto es true.
   * @returns {number} - El índice del valor en el array, o -1 si no se encuentra.
   */
  searchByValue(value: any, values: any[], deleteVal = true) {
    const index = values.indexOf(value);
    if (index !== -1 && deleteVal) {
      values.splice(index, 1);
    }
    return index;
  }

  /**
   * Genera un form dinamicamente en base a un JSON
   * @param jsonFields Consulta al servidor de tipo OPTIONS
   * @param main_field Campos del formulario
   * @returns el form
   */
  generateJSONform(jsonFields: any, formFields: any = {}, relationOptions: any[] = [], field_prefix = '') {
    const pos = this.pos() ?? 0; // Asegurar que pos no sea null
    const posIndex = pos as string; // Cast explícito a string

    // se desestructura el array para para poder eliminar los campos afectados y optimizar la busqueda
    const boolLocal = this.fieldsBool[0][posIndex] ? [...this.fieldsBool][0][posIndex] : [];
    const relationshipsLocal = this.relationships[posIndex] ? [...this.relationships[posIndex]] : [];

    for (const field in jsonFields) {
      if (jsonFields.hasOwnProperty(field)) {
        const fieldObj = jsonFields[field];
        const validators = [];

        // si el modelo del servidor tiene modelos anidadas, se llama recursivamente,
        // fieldObj.relationship_type !== 'ManyToMany' es para excluir las relaciones
        // de muchos a muchos
        if (fieldObj.children && fieldObj.relationship_type !== 'ManyToMany') {
          this.generateJSONform(fieldObj.children, formFields, relationOptions, field + '_');
        }

        // los componentes de solo lectura no se incluyen en el formulario
        if (fieldObj.read_only) {
          //para el caso de los campos solo lectura deben ser deshabilitados
          this.initialDisabledForm[field] = true;
          //°°°PROBANDO
          //continue;
        }

        // carga las relaciones antes de los excludeFieldsForm ya que esto no afecta al formulario, afecta al standar json api
        if (fieldObj.relationship_type == 'ManyToMany' || fieldObj.relationship_type == 'ManyToOne' || fieldObj.relationship_type == 'OneToOne') {
          //si tiene valores relationship personbalizados, se prioriza el vslor local
          const val_local: any = this.searchByValueObject(field, relationshipsLocal)[0];
          if (val_local) {
            relationOptions.push(val_local);
          } else {
            relationOptions.push({ id: field, field: field, type: fieldObj.relationship_resource });
          }
        }

        if (this.excludeFieldsForm[posIndex]) {
          const excludeField = this.excludeFieldsForm[posIndex].find((item) => item.field == field_prefix + field);

          if (excludeField) {
            // true para indicar que el campo se debe reemplazar en lugar de la validación del formulario
            if (excludeField.reemplace) {
              formFields[field_prefix + field] = excludeField.default;
            }
            continue;
          }
        }

        // se agrega los validadores si en el servidor es requerido
        if (fieldObj.required) {
          validators.push(Validators.required);
        }

        // se agrega los validadores de max_length del servidor
        if (fieldObj.max_length) {
          validators.push(Validators.maxLength(fieldObj.max_length));
        }

        // los strin y optros diferentes a boolean se inicializan con un string vacio
        let val: string | boolean | any[] = '';

        if (fieldObj.type == 'Boolean') {
          // si el campo está en el Local, se toma el valor del Local,
          const val_local = this.searchByValueObject(field, boolLocal)[0];
          // en caso de que no se haya encontrado el campo en el fieldsBool[0], se agrega formulario
          val = val_local ? val_local.default : fieldObj.initial;
        } else if (fieldObj.type == 'Integer' || fieldObj.type == 'Decimal' || fieldObj.type == 'DateTime') {
          //para que los ceros no se muestren como null
          val = fieldObj.initial !== undefined && fieldObj.initial !== null ? fieldObj.initial : null;
        } else if (fieldObj.type == 'Choice') {
          (this.sharedS as any).data[field_prefix + field] = fieldObj?.choices || null;
          val = fieldObj.initial || '';
        } else if (fieldObj.type == 'GenericField') {
          val = fieldObj.initial || null;
        } else if (fieldObj.type == 'Image') {
          val = fieldObj.initial || null;
        } else if (fieldObj.relationship_type == 'ManyToMany') {
          const initial = fieldObj.initial ? JSON.parse(fieldObj.initial) : [];
          val = initial || null;
        } else if (fieldObj.type == 'List') {
          //si initian es un array, ub objecto o un json

          if (fieldObj?.choices) {
            (this.sharedS as any).data[field_prefix + field] = fieldObj?.choices;
          } else if (fieldObj?.child) {
            if (fieldObj.child?.type == 'Choice') {
              (this.sharedS as any).data[field_prefix + field] = fieldObj?.child?.choices;
            }
          }
          if (fieldObj.initial && typeof fieldObj.initial == 'object') {
            val = JSON.parse(fieldObj.initial);
          } else {
            val = [];
          }
          //val = fieldObj.initial ? JSON.parse(fieldObj.initial) : [];
        }

        // se agrega nonNullable para que se restablezca al valor por defecto
        formFields[field_prefix + field] = this.fb.control({ value: val, disabled: false }, { nonNullable: true, validators: validators });
      }
    }

    // Si todavia relationshipsLocal tiene valores porque no vengan de la consulta OPTIONS, se asignan a relationOptions,
    // ya que son valores locales adicionales a los que vienen del servidor
    if (relationshipsLocal.length > 0) {
      // Si hay valores en relationshipsLocal, se asignan a relationOptions
      relationshipsLocal.forEach((val_local) => {
        relationOptions.push(val_local);
      });
    }

    if (this.includeFieldsForm[posIndex]) {
      const includeField = this.includeFieldsForm[posIndex];

      includeField.forEach((item) => {
        const validators = [];
        //const  disabled = item.disabled ? true : false;
        // se agrega los validadores si en el servidor es requerido
        if (item.required) {
          validators.push(Validators.required);
        }

        // se agrega los validadores de max_length del servidor
        if (item.max_length) {
          validators.push(Validators.maxLength(item.max_length));
        }

        //tambien los campos iniciales pueden ser deshabilitados
        if (item.disabled) {
          this.initialDisabledForm[item.field] = true;
        }

        //no tiene caso disabled ya que al restablecer el formulario se deshabilita porque llama a enableForm
        formFields[field_prefix + item.field] = this.fb.control({ value: item.default, disabled: true }, { nonNullable: true, validators: validators });
      });
    }

    this.relationships[posIndex] = relationOptions;
    console.log('formmmmmmmmmmmmmmmmmm', formFields);

    return this.fb.group(formFields);
  }

  generateJSONColumns(jsonFields: any, pos: any = null, cols: any = [], field_prefix = '', header_prefix = '', field_relationship = '') {
    pos = pos || this.pos();
    console.log('cols--------------', cols, typeof cols);

    if (pos === null) return cols; // Retornar cols vacío si pos es null
    this.customField()[pos];
    for (const field in jsonFields) {
      if (jsonFields.hasOwnProperty(field)) {
        const fieldObj = jsonFields[field];

        if (this.excludeFieldsCols[pos]) {
          const excludeField = this.excludeFieldsCols[pos].find((item) => item.field == field);
          if (excludeField) {
            // true para indicar que el campo se debe reemplazar en lugar de la validación del formulario
            if (excludeField.reemplace) {
              cols[field_prefix + field] = excludeField.default;
            }
            continue;
          }
        }

        // llama recursivamente si el campo tiene hijos
        const joinModelFields = field; //+ '__name'
        if ((fieldObj.children && fieldObj.relationship_type != 'ManyToMany') || this.searchByKeyObject(joinModelFields, this.additionalFieldsAppCols[pos])) {
          /*if(fieldObj.relationship_type=='ManyToMany'){
                        
                        continue;
                    }*/

          // si se definieron prefijos y sufijos para los campos, se agregan
          if (this.additionalFieldsAppCols[pos][joinModelFields]) {
            //en la relación se agrega el campo del nombre,
            /* cols.push({
                             field: field_prefix + field + '__name',
                             header: this.customField()[pos][field + '_name'] + ' ' + header_prefix, sortable: true
                         });*/
            //elimino name porque se reemplaza por la relación, por ejemplo en lugar de
            //mostra el id de la relacion, muestro el nombre
            //°°°aqui deberia implementar 'default_field': 'name', hay un ejemplo en
            //additionalFieldsAppCols de producto
            //delete fieldObj.children?.name;
            const chil = this.additionalFieldsAppCols[pos][joinModelFields];
            // el campo del prefijo es el campo que trae el children
            const column_field_prefix = field + '_';
            const column_header_prefix = chil.column_header_prefix ? chil.column_header_prefix + ' ' : '';

            this.generateJSONColumns(fieldObj.children, pos, cols, column_field_prefix, column_header_prefix, field + '_');
          }
          //el campo que trae el children se ignora
          continue;
        }

        if (fieldObj.type == 'Relationship' || fieldObj.type == 'Serializer') {
          cols.push({
            field: field_prefix + field + '__name',
            header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix,
            sortable: true
          });
        } else if (fieldObj.type == 'Boolean') {
          cols.push({
            field: field_prefix + field + '__text',
            header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix,
            sortable: true
          });
          if (!this.fieldsBool[pos]) {
            this.fieldsBool[pos] = [];
          }
          // no tiene caso validar si existe en fieldsBool[0] porque esto es para el form ya se validó en generateJSON
          this.fieldsBool[pos].push({ field: field_relationship + field /*, default: fieldObj.initial */ });
          //this.fieldsBool[pos].push({ field: field_prefix + '__' + field/*, default: fieldObj.initial */ });
        } else if (fieldObj.type == 'Choice') {
          cols.push({ field: field_prefix + field + '__text', header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix, sortable: true });
          if (!this.moreFields[pos]) {
            this.moreFields[pos] = [];
          }
          // se alimenta el array con los campos que tienen choices, anterioemente se ponia namualmente y
          // la clave valor eran id y nombre, se cambian  por value y display_name
          this.moreFields[pos].push([field, fieldObj.choices]);

          //agregar __text a los fieldObj.type == 'DateTime' para que se muestre la fecha en la tabla siempre y cuando existan en this.timeZone
          // usando la funcion searchByValue
        } else if (fieldObj.type == 'DateTime' && this.searchByValue(field, this.timeZone, false) !== -1) {
          cols.push({ field: field_prefix + field + '__text', header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix, sortable: true });
        } else {
          cols.push({ field: field_prefix + field, header: this.customField()[pos][field_relationship + field] + header_prefix, sortable: true });
        }
      }
    }
    console.log('colssssssss', cols);

    return cols;
  }

  currentForm(pos: any = null): FormGroup {
    pos = pos || this.pos();
    if (pos === null) return this.fb.group({}); // Retornar FormGroup vacío si pos es null
    //if (!this.form()[pos]) return[];
    return this.form()[pos];
  }

  p3(field: any) {
    return this.currentForm().get(field) as FormArray;
  }

  /**
   * Habilita el formulario
   */
  enableForm() {
    //Claramente no es necesario pero como hay un disableForm también lo pongo
    this.currentForm().enable();

    for (const [key, isDisabled] of Object.entries(this.initialDisabledForm)) {
      if (isDisabled) {
        this.currentForm().get(key)?.disable();
      }
    }
  }

  /**
   * Deshabilita el formulario
   * @param disable_sys true para deshabilitar los campos del sistema, false para deshabilitar todo el formulario
   */
  disableForm(disable_sys = true) {
    if (disable_sys) {
      const controls = this.currentForm().controls;
      Object.keys(controls).forEach((key) => {
        if (!this.activate_sys.includes(key)) {
          controls[key].disable();
        }
      });
    } else {
      this.currentForm().disable();
    }
  }

  /**
   * Realizar la consulta OPTIONS al servidor, llama generateJSON para crear el formulario y los inicializa solo
   * con los valores iniciales,
   * habilita o deshabilita según sea necesario
   * @param pos Posición de la app en el array
   */
  createForm(pos: any = null) {
    pos = pos || this.pos();
    if (pos === null) return; // Salir si pos es null
    this.changePos(pos);

    if (!this.formTempo[pos]) {
      // si ya se consulto al servidor, no se vuelve a consultar
      if (this.optionsFields[pos]) {
        this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
        this.form.set(this.formTempo);

        if (this.isCreate) {
          this.classifierLevelsDropdown();
        }
      } else {
        this.showBlocked();
        // se crear el formulario, se envia la app secundaria para que se consulte el formulario correspondiente, en lugar de this.app
        this.crudS.options(this.app[pos]).subscribe({
          next: (resp: any) => {
            this.optionsFields[pos] = resp.data.actions.POST;
            this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
            this.form.set(this.formTempo);
            this.showFormDialog(pos);
            this.showBlocked(false);
          }
        });
      }
    } else {
      this.form.set(this.formTempo);
      if (this.isCreate) {
        this.classifierLevelsDropdown();
      }
    }
  }

  /**
   * @param pos Posición de la app en el array, si no se envia valor se asume que es para la app principal
   * @param node true para que se muestre en el arbol, false para que no se muestre en el arbol
   * @param filter filtro para la consulta
   * @param force true para forzar la consulta al servidor, false para no forzar la consulta
   *
   */
  getAll(options: getAllOptions = {}) {
    // para que las apps principales no tengan que poner la tipo en cada llamada
    let { pos = this.typeDefault, node = false, filter = '', force = false } = options;
    //console.log('inicio getAll----------------------------', filter, options);

    const safePos = pos as any; // Type assertion para índices de array
    this.pos.set(safePos);

    if (this.columns[safePos]) {
      this.getAll2({ pos: safePos, node, filter, force });
    } else {
      // si ya se consulto al servidor, no se vuelve a consultar
      if (this.optionsFields[safePos]) {
        this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos]);
        this.getAll2({ pos: safePos, node, filter, force });
      } else {
        const app = this.app[safePos];
        this.showBlocked();
        this.crudS.options(app).subscribe({
          next: (resp: any) => {
            this.optionsFields[safePos] = resp.data.actions.POST;
            this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos]);
            this.showBlocked(false);
            this.getAll2({ pos: safePos, node, filter, force });
          }
        });
      }
    }
    //console.log('fin getAll');
  }

  getAll2(options: getAllOptions = {}) {
    let { pos = null, node = false, filter = null, force = false } = options;
    //console.log('inicio getAll2', filter, this.pos());
    pos = pos || this.typeDefault;
    const safePos = pos as any; // Type assertion para índices de array

    //lo limpio porque donde las app que combinan valores copn node y sin node,
    //hay un error entre la carga de los elementos y la carga de los elementos con node
    // el detalle es que muestra un parpadeo en la tabla cuando se recarga sobre la misma app
    //this.items.set([]);

    this.changePos(safePos); // actualice la posición y los valores correspondientes a la app
    this.showBlocked(); // muestra el bloqueo de la pantalla
    if ((this.sharedS as any).data[safePos]) {
      if ((this.sharedS as any).data[safePos].length > 0 && !force) {
        this.items.set((this.sharedS as any).data[safePos]);
        this.showBlocked(false);
        return;
      }
    }

    const include = this.include; // incluir todas las relaciones para que se muestren en la tabla
    const sort = this.sort; // ordenar por defecto por id
    const fields = this.fields; // incluir todos los campos para que se muestren en la tabla

    filter = filter || this.filter; // por el momento solo ocupo de filter sea se envie por parametro
    this.limit()[safePos] = this.limit()[safePos] ? this.limit()[safePos] : this.limit()[0]; // si no se envia el limite, se toma el limite por defecto
    this.offset[safePos] = this.offset[safePos] ? this.offset[safePos] : this.offset[0]; // si no se envia el offset, se toma el offset por defecto

    this.crudS.getObject({ include, filter, sort, fields, limit: this.limit()[safePos], offset: this.offset[safePos] }).subscribe({
      next: (resp: any) => {
        const additionalFieldsAppCols = this.additionalFieldsAppCols[safePos] || [];
        this.items.set(this.DJAtoObject({ resp, node, additionalFieldsAppCols })); // convierte el formato DJA a un objeto
        (this.sharedS as any).data[safePos] = this.items(); // almacena los datos para que esten disponibles en todas las apps y no se consulten nuevamente
        //this.selected.set([]); // limpia los elementos seleccionados

        //si items esta favios hay que desfragmentar para que se actualice el binding y enviar en message.
        if (this.items().length == 0) {
          this.messageS.changeMessage(`No se han encontrado ${this.pluralDefiniteArticle[safePos] || this.pluralDefiniteArticle[0]}.`, null, {}, 'info');
        }

        this.totalRecords()[safePos] = resp?.meta?.pagination?.count; // almacena el total de registros para la paginación

        this.showBlocked(false); // oculta el bloqueo de la pantalla
      },
      error: (err: any) => {
        this.showBlocked(false); // oculta el bloqueo de la pantalla
        this.items.set([]); // limpia los elementos
        this.messageS.changeMessage(`Hay un error al cargar ${this.pluralDefiniteArticle[safePos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[safePos]); // muestra un mensaje de error
      }
    });
    //console.log('fin getAll2');
  }

  /**
   * @param pos Posición de la app en el array, si no se envia valor se asume que es para la app principal
   * @param node true para que se muestre en el arbol, false para que no se muestre en el arbol
   * @param filter filtro para la consulta
   * @param force true para forzar la consulta al servidor, false para no forzar la consulta
   *
   */
  getAllSecundary(options: getAllSecundaryOptions = {}) {
    // para que las apps principales no tengan que poner la tipo en cada llamada
    let { pos = this.typeDefault, node = false, filter = '', force = false, sort = '', fields = '', include = '', app = '', type = '' } = options;

    const safePos = pos as any; // Type assertion para índices de array

    //si ya hay registro se presupone que tambien hay columnas y no se vuelve a consultar
    // a menos que se fuerce la consulta

    if (!force && this.itemsSecundary()[safePos].length > 0) {
      return;
    }

    // si ya hay columnas no se consulta al servidor
    if (this.optionsFields[safePos]) {
      this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos], safePos);
      this.columnsSecundary()[safePos] = this.columns[safePos];
      this.getAll2Secundary({ pos: safePos, node, filter, force, sort, fields, include, app, type });
    } else {
      const appVal = this.app[safePos];
      this.showBlocked();
      this.crudS.options(appVal).subscribe({
        next: (resp: any) => {
          this.optionsFields[safePos] = resp.data.actions.POST;
          this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos], safePos);
          this.columnsSecundary()[safePos] = this.columns[safePos];
          this.showBlocked(false);
          this.getAll2Secundary({ pos: safePos, node, filter, force, sort, fields, include, app, type });
        }
      });
    }
  }

  getAll2Secundary(options: getAllSecundaryOptions = {}) {
    let { pos = this.typeDefault, node = false, filter = null, force = false, sort = null, fields = null, include = '', app = null, type = null } = options;

    const safePos = pos as any; // Type assertion para índices de array
    this.showBlocked(); // muestra el bloqueo de la pantalla

    //al ser secundario por el momento no son relevantes ciertos oparamateros
    filter = filter || this.filter; // por el momento solo ocupo de filter sea se envie por parametro
    //include = include || this.include; // incluir todas las relaciones para que se muestren en la tabla

    //al ser una app secundaria, se debe enviar el app y type
    app = app || this.app[safePos];
    type = type || this.type[safePos];

    this.crudS.getObject({ app, type, filter, include }).subscribe({
      next: (resp: any) => {
        const data = this.DJAtoObject({ resp, node });
        this.itemsSecundary()[safePos] = data; // convierte el formato DJA a un objetothis.itemsSecundary()[pos] = data;//this.itemsSecundary();
        this.selectedSecundary()[safePos] = []; // limpia los elementos seleccionados
        this.showBlocked(false); // oculta el bloqueo de la pantalla
      },
      error: (err: any) => {
        this.showBlocked(false); // oculta el bloqueo de la pantalla
        this.itemsSecundary()[safePos] = []; // limpia los elementos
        this.messageS.changeMessage(`Hay un error al cargar ${this.pluralDefiniteArticle[safePos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[safePos]); // muestra un mensaje de error
      }
    });
  }

  onReloadIconDropdown($event: any) {
    console.log($event);
    console.log(123);
  }

  /**
   * Aplica los filtros a los datos
   * @param filters Filtros a aplicar
   * @param data Datos a filtrar
   * @returns Datos filtrados
   */
  applyFilters(filters: { [s: string]: any }, data: any[]): any[] {
    // Implementar el filtrado basado en los filtros específicos
    //console.log('inicia applyFilters', filters);

    for (let field in filters) {
      let filterValue = filters[field].value;
      let matchMode = filters[field].matchMode;

      // Filtrar los datos en base a las columnas seleccionadas
      data = data.filter((item) => {
        // Variable para indicar si se encontró una coincidencia en alguna columna
        let isMatch = false;

        this.selectedColumns().forEach((col) => {
          let fieldValue = item[col.field];
          switch (matchMode) {
            case 'contains':
              if (String(fieldValue).toLowerCase().includes(filterValue.toLowerCase())) {
                isMatch = true;
              }
              break;
            case 'equals':
              if (fieldValue === filterValue) {
                isMatch = true;
              }
              break;
            // Agregar otros casos de matchMode según sea necesario
            default:
              break;
          }
        });
        return isMatch;
      });
    }
    //console.log('finaliza applyFilters');

    return data;
  }

  //check que el usuario puede cambiar, empieza como undefined para que no se ejecute en el onLazyLoad al cargar el componente,
  // por eso esta en init para que cada componente lo inicialice
  searchRemote: any = undefined;
  // Variable para almacenar el valor del filtro global anterior
  previousGlobalFilterValue: string | null = null;
  //controla el retraso de la busqueda, para local debe ser 200, remote 800
  filterDelayTable = signal(200);
  /**
   * Se llama cuando debe cargarse por evento de paginación, ordenamiento o filtro
   * @param event datos del cambio puede ser paginación, ordenamiento o filtro
   */
  onLazyLoad({ event, pos = null, filter = '' }: { event: any; pos?: any; filter?: string }) {
    //console.log('inicio onLazyLoadddddddddddddddddddddddddddddddddddddddddddddddddddddddd', pos, this.pos());

    if (this.searchRemote === undefined) {
      this.searchRemote = false;
      return;
    }

    pos = pos || this.pos();
    if (pos === null) return; // Salir si pos es null
    let isLocal = false;
    //aqui vopy esoy bucandio porque pos() es nul en este momento

    // Detectar si se limpió el filtro global
    const currentGlobalFilterValue = event.globalFilter ? event.globalFilter : null;

    let filterQueries = '';
    // si el objeto de filtros no esta vacio y esta activado el remoto, se crea un string con los filtros para enviar al servidor
    if (Object.keys(event.filters).length > 0 && this.searchRemote) {
      //°°° PARA LAS BUSQUEDAS DEBERIA PONER UN ENTER PARA EVITAR QUE SE ESTE MOSTRADO EL ERROR DE 5 CARACTERES Y TAMBIEN EVITAR SOBRECARGAR EL SERVIDOR
      //°°° TAMBIEN DEBERIA PONER UN SWITCH PARA QUE DIGA SI LA BUSQUEDA EL GLOBAL O LOCAL (INFORMACION QUE SE VISUALIZA EN LA PAGINACIÓN)
      const filters = event.filters;
      filterQueries = Object.keys(filters)
        .map((key) => {
          const filter_search = filters[key];
          // search es el nombre del campo en el servidor
          return `filter[search]=${filter_search.value}`;
        })
        .join('&');

      // se valida que sea menor a 20 caracteres porque son 14 de filter[search] y 5 de la busqueda
      if (filterQueries.trim().length < 20) {
        this.messageS.changeMessage('La busqueda debe tener al menos 5 caracteres.');
        return;
      }
      filter = filter.length > 0 ? filter + '&' + filterQueries : filterQueries;
      // busqueda en la información que se visualiza en la paginación
    } else if (Object.keys(event.filters).length > 0 && !this.searchRemote) {
      const item = this.applyFilters(event.filters, this.items());
      this.items.set(item);

      this.totalRecords()[pos] = item.length;
      isLocal = true;

      // si el filtro se limpio y no es remoto, cargo los datos locales de la tabla
    } else if (this.previousGlobalFilterValue && !currentGlobalFilterValue && !this.searchRemote) {
      // si la busqueda es local, se carga la información local, si no, se carga la información del servidor
      this.items.set((this.sharedS as any).data[pos]);

      this.totalRecords()[pos] = this.items().length;
      isLocal = true;
    }

    this.previousGlobalFilterValue = currentGlobalFilterValue;

    // el retur se hace al final para que previousGlobalFilterValue se pueda inicializar
    if (isLocal) return;

    this.limit()[pos] = event.rows;
    this.offset[pos] = event.first;

    this.getAll({ pos: pos, filter: filter, force: true });
    //console.log('fin onLazyLoad');
  }

  /**
   * Actualiza la información desde el servidor, en lugar de la información local, además de estar mas reciente,
   * incluye la información que pudo no haberse consultado porque la columna estaba oculta en la info local
   * @param id id del elemento que se va a editar
   */
  getDetailEdit(id: string) {
    //console.log('inicio getDetailEdit');

    const pos: any = this.pos();
    // es necesario que incluya todas las relaciones para que se muestren en el form, sobre todo para la auditoria,
    //para este caso solo ocupo los include los fiends no porque quiero que se consulten todos los campos, para
    //poder mostarlos en el form

    // no llama a changePos porque no es necesario, la edición ocurre sobre la app actual y ademas
    //iniParam debe incluir tolas la relaciones
    this.iniParam(this.cols()); //se inicializa el include y el fields para que se muestren todos los campos en el form
    this.showBlocked();

    const include = this.include;
    this.crudS.getDetail({ id, include }).subscribe({
      next: (resp: any) => {
        this.showBlocked(false);
        const additionalFieldsAppCols = this.additionalFieldsAppCols[pos] || [];
        const data = this.DJAtoObject({ resp, additionalFieldsAppCols });

        //obtener los campos classifers del formulario form()
        // if (this.classifierFormGen) {
        this.classifierLevelsDropdown(data);
        // }else{
        //   this.resetFormDialog(data);
        //   this.selected.set([]);
        //   this.selected()[0] = data;
        // }
      },
      error: (err: any) => {
        this.showBlocked(false);
        this.messageS.changeMessage(`Hay un error al cargar ${this.pluralDefiniteArticle[pos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[pos]);
      }
    });
    //console.log('fin getDetailEdit');
  }

  getDetailEditSecundary(id: string) {
    const pos: any = this.pos() ?? 0;
    this.showBlocked();

    this.crudS.getDetail({ id }).subscribe({
      next: (resp: any) => {
        this.showBlocked(false);
        const data = this.DJAtoObject({ resp });
        this.unifyRestoreForm(data);
      },
      error: (err: any) => {
        this.showBlocked(false);
        this.messageS.changeMessage(`Hay un error al cargar ${this.pluralDefiniteArticle[pos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[pos]);
      }
    });
  }

  /**
   * Abre el dialogo para crear un nuevo elemento, crear el form y carga los datos en la tabla de la app correspondiente
   * @param pos Posición de la app en el array, si no se envia valor se asume que es para la app principal
   * @param node true para convertir el formato para node
   */
  openNew(options?: { pos?: string | null; node?: boolean; filter?: string }) {
    const pos: any = options?.pos ?? this.typeDefault;
    const node = options?.node ?? false;
    const filter = options?.filter ?? '';

    // para que las apps principales no tengan que poner la tipo en cada llamada
    //this.pos = pos;
    //console.log('inicio openNew');
    this.selected.set([]);
    //limpia el seleted para que no se muestre el ultimo elemento seleccionado en la auditoria al crear un elemento nuevo,
    // si pongo null marca un error en el html,
    // si no se han cargado los elementos, llama getAll() para cargarlos, si ya se cargaron los elementos,
    //muestro los que estan en momeria de la app correspondiente

    if (!(this.sharedS as any).data[pos]) {
      const force = true;
      this.getAll({ pos, node, force, filter });
    } else {
      // Aplica filtros si existe un query string tipo "filter[is_alternate]=false"
      if (filter) {
        let filteredData = [...(this.sharedS as any).data[pos]];
        const filters = filter.split('&');
        filters.forEach((part) => {
          const match = part.match(/filter\[(.+?)\]=(.*)/);
          if (match) {
            const fieldName = match[1];
            const fieldValue = match[2];
            filteredData = filteredData.filter((item) => String(item[fieldName]) === String(fieldValue));
          }
        });
        this.items.set(filteredData);
      } else {
        this.items.set((this.sharedS as any).data[pos]);
      }
    }

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de isCreate para inicializar el form
    this.isCreate = true;
    //llama a changePos para que se inicialicen los valores correspondientes a la app,
    //dado que crear tiene un menu para crear los elementos, a diferencia de edit o delete

    //////////////////////////
    this.changePos(pos);

    //crea el form
    this.createForm(pos);

    //pone el titulo del dialogo
    this.header.set(`Alta de ${this.singular[pos] || this.singular[0]}`);
  }

  // variables para las apps secundarias, no se pone como array ya que solo necesito para la principal o la secundaria,
  // no para cada app
  selectedSecundary = signal<any[]>([]);
  isCreateSecundary: boolean = false;
  headerSecundary = signal('');
  itemsSecundary = signal<any[]>([]);
  totalRecordsSecundary = signal(0);
  // tiene la función de mantener en memoria los datos de las apps secundarias, para que no se consulten nuevamente

  openNewSecundary(pos: any, node = false) {
    // similar a openNew pero para las apps secundarias (las app que se abren a partir de otras app como los documentos)

    //this.selectedSecundary.set(this.selected());

    // dado que no voy a llamar a changePos para que la app principal no cambie,
    // tengo que inicializar los valores correspondientes a la app
    //this.crudS.type = this.type[pos];
    this.isCreateSecundary = true;

    if (!this.formTempo[pos]) {
      // si ya se consulto al servidor, no se vuelve a consultar
      if (this.optionsFields[pos]) {
        this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
        this.form.set(this.formTempo);
        this.showFormDialog(pos);
      } else {
        this.showBlocked();
        // se crear el formulario, se envia la app secundaria para que se consulte el formulario correspondiente, en lugar de this.app
        this.crudS.options(this.app[pos]).subscribe({
          next: (resp: any) => {
            this.optionsFields[pos] = resp.data.actions.POST;
            this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
            this.form.set(this.formTempo);
            this.showFormDialog(pos);
            this.showBlocked(false);
          }
        });
      }
    } else {
      this.form.set(this.formTempo);
      this.showFormDialog(pos);
    }
    this.headerSecundary.set(`Alta de ${this.singular[pos] || this.singular[0]}`);
  }

  /**
   * Abre el dialogo para editar un elemento y crea e inicializa el formulario
   */
  edit(): void {
    // Edit no recibe la app porque solo es un boton para todas las apps
    //console.log('inicio edit');

    const pos: any = this.pos() ?? 0;
    if (pos === null) return; // Salir si pos es null

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de isCreate para inicializar el form
    this.isCreate = false;
    //crear o inicializa el form
    this.createForm(pos);
    this.getDetailEdit(this.selected()[0].id);
    this.header.set(`Editar ${this.singular[pos] || this.singular[0]}`);

    //recorre selected y pon null en todas las posiciones menos en la 0
    for (let i = 1; i < this.selected().length; i++) {
      this.selected()[i] = null;
    }
    //console.log('fin edit');
  }

  editSecundary(pos: any): void {
    // Edit no recibe la app porque solo is un boton para todas las apps

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de isCreate para inicializar el form
    this.isCreateSecundary = false;
    //crear o inicializa el form
    if (!this.formTempo[pos]) {
      // si ya se consulto al servidor, no se vuelve a consultar
      if (this.optionsFields[pos]) {
        this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
        this.form.set(this.formTempo);
        this.getDetailEditSecundary(this.selectedSecundary()[pos][0].id);
        this.showFormDialog(pos);
      } else {
        this.showBlocked();
        // se crear el formulario, se envia la app secundaria para que se consulte el formulario correspondiente, en lugar de this.app
        this.crudS.options(this.app[pos]).subscribe({
          next: (resp: any) => {
            this.optionsFields[pos] = resp.data.actions.POST;
            this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
            this.form.set(this.formTempo);
            this.showFormDialog(pos);
            this.showBlocked(false);
            this.getDetailEditSecundary(this.selectedSecundary()[pos][0].id);
          }
        });
      }
    } else {
      this.form.set(this.formTempo);
      this.showFormDialog(pos);
    }

    this.header.set(`Editar ${this.singular[pos] || this.singular[0]}`);

    //recorre selected y pon null en todas las posiciones menos en la 0
    for (let i = 1; i < this.selectedSecundary()[pos]().length; i++) {
      this.selectedSecundary()[pos]()[i] = null;
    }
  }

  /**
   * Restablece el form con los valores iniciales o del elemento seleccionado
   * @param selected Opcionalmente elemento seleccionado para rellenar el form
   * @param pos Posición de la app en el array, si no se envia valor de la posión actual
   */
  resetFormDialog(options: resetFormOptions = {}) {
    let { selected = null, pos = null } = options;
    //console.log('inicio resetFormDialog....', this.currentForm());

    pos = pos || this.pos();
    if (selected) {
      // agrega un objecto con id, key y label a los componentes multi, menos a los classifiers
      // se agrega key porque treeSelect lo necesita
      for (const [key, value] of Object.entries(selected)) {
        if (key != 'classifiers' && key != 'included' && Array.isArray(value) && value.length > 0) {
          const included = selected.included || [];
          for (let i = 0; i < value.length; i++) {
            const element = value[i];
            for (let j = 0; j < included.length; j++) {
              const el = included[j];
              if (el.id === element) {
                selected[key][i] = { key: el.id, id: el.id, label: el.attributes.name };
              }
            }
          }
        }
      }
      //necesito seprar las fechas que se conviertes en 2 campos una para las convertidas y otras para el formulario enviado al servidor
      //this.timeZone trae las fechas a convertir, para las fechas de crud no har problema porque esas no se envias

      //selected.scheduled_date = new Date(selected.scheduled_date),

      this.currentForm().reset(selected);
    } else {
      //const data = this.resetForm[pos] || this.resetForm[0]
      this.currentForm().reset(/*{
        ...data
      }*/);
    }
    //console.log('fin resetFormDialog', this.currentForm());
  }

  /**
   * enciende la badera para abrir el dialog del formulario
   */
  showFormDialog(pos: any = null) {
    pos = pos || this.pos();
    if (pos === null) return; // Salir si pos es null
    this.formDialogVisible[pos] = true;
  }

  /**
   * apaga la badera para abrir el dialog del formulario
   */
  hideFormDialog(pos: any = null) {
    pos = pos || this.pos();
    if (pos === null) return; // Salir si pos es null
    this.formDialogVisible[pos] = false;
  }

  /**
   * Actualiza el registro en los arrays de items y itemsNew
   * @param resp los datos del registro actualizado
   * @param id  id del registro actualizado
   * @param pos  posición de la app en el array
   */
  updateRecord(resp: any, id: any, pos: any) {
    const indice = this.items().findIndex((item) => item.id === id);

    //this.items[indice] = this.DJAtoObject(resp.data);
    // si lo pongo como la linea arriba comentada no actualiza cuando está ordenado
    const temp = [...this.items()];
    const additionalFieldsAppCols = this.additionalFieldsAppCols[pos] || [];
    const r = this.DJAtoObject({ resp, additionalFieldsAppCols });

    temp[indice] = r; //this.DJAtoObject({ resp });
    this.items.set(temp);
    (this.sharedS as any).data[pos] = temp;
    this.selected.set([]);
  }

  /**
   * Muestra los errores del formulario
   * @param pos Posición de la app en el array, si no se envia valor de la posión actual
   * @returns true si hay errores, false si no los hay
   */
  formErrors(pos = this.pos(), is_file = false): boolean {
    const form = this.currentForm(pos);
    if (pos === null) return false; // Retornar false si pos es null
    console.log('form().valid', form);

    if (is_file && this.files.length === 0 && this.files64.length === 0 && form.get('files')?.value.length === 0) {
      form.get('documents')?.setErrors({ required: true });
    } else {
      form.get('documents')?.setErrors(null);
    }

    // si el formulario no es valido, busco cuales son los campos que tienen errores y los muestro en el mensaje,
    // cpon esto el usuario sabe que campos son los que tienen errores
    if (!form.valid) {
      const errors: any = {};
      errors['local'] = []; // con local hago diferencia si el error es local o del servidor
      Object.keys(form.controls).forEach((controlName) => {
        const control: any = form.get(controlName);
        if (control.errors) {
          errors['local'].push({ errors: control.errors, field: controlName });
          //en caso que el form no sea valido, marco el campo como sucio para que lo ponga en rojo y lanzo el mensaje
          control?.markAsDirty();
          control?.markAsTouched();
        } else if (control.controls) {
          //°°°esta pendiente acceder el al thml para tomar el nombre de la etiqueta o otro
          //lugar para personalizar el mensaje
          Object.keys(control.controls).forEach((controlName) => {
            const controlSub: any = control.get(controlName);
            if (controlSub.errors) {
              //°°°esta deshabilitado porque el mensaje ya que no expesifico el campo
              //errors['local'].push({ errors: controlSub.errors, field: controlName })
              controlSub?.markAsDirty();
              controlSub?.markAsTouched();
            }
          });
        }
      });

      //muestro el mensaje con los error y detengo la función
      (this.messageS as any).changeMessage('Revise campos marcados en rojo.', errors, this.customField()[pos]);
      return true;
    }
    return false;
  }

  /**
   * Valida las relaciones del formulario
   * @param pos Posición de la app en el array
   */
  validateRelationships(pos: any) {
    // Pongo relationships=null en lugar de relationships=[], porque aunque esta vacio simpre entrará a la primera
    //condición (relationships=[]), tambin utilizó map para que no se modifique el array original
    this.crudS.relationships = this.relationships[pos] ? this.relationships[pos].map((obj: any) => ({ ...obj })) : [];
    // asigno el id de la relación al campo correspondiente, por ejemplo, si la relación es con user,
    //el campo se llama user ?????
    for (let element of this.crudS.relationships) {
      element.id = this.currentForm(pos).value[element.field];
    }
  }

  /**
   * comportamiento a la visibilidad del dialogo y al reseteo del formulario
   * @param options  opciones para el comportamiento del dialogo
   * @param pos Posición de la app en el array
   */
  commonVisibilityDialog(options: any) {
    const { pos = this.typeDefault, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true } = options;

    // cuando hide es true, se cierra el dialogo, cuando es false, se deja abierto para crear otro elemento
    if (hide) {
      this.hideFormDialog(pos);
    }

    if (reset) {
      this.resetFormDialog({ pos: pos });
    }

    this.showBlocked(false);
  }

  convertFileToBase64(file: File): Promise<{ file: string; file_name: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ file: reader.result as string, file_name: file.name }); // Este es el archivo en formato Base64 y su nombre
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file); // Esto convierte el archivo a Base64
    });
  }

  submitForm(options: saveOptions = {}) {
    //pepepepepep

    const { pos = this.typeDefault, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null } = options;

    const safePos = pos as any; // Type assertion para índices de array

    //this.fields siempre se debe inclui sino no es validado el form
    const formData = data ? data : this.currentForm(safePos).value;
    const include = this.include;
    const filter = this.filter;

    console.log('forrmmmmmmmmmmmmmmmmmm', formData);
    //revisar porque la primer seleccion del archivo se envia vacio de asset-document
    if (this.isCreate) {
      this.crudS.saveObject({ formData, include, filter /*, files*/ }).subscribe({
        next: (resp: any) => {
          const temp = [...this.items()];
          const additionalFieldsAppCols = this.additionalFieldsAppCols[safePos] || [];
          temp.unshift(this.DJAtoObject({ resp, node, additionalFieldsAppCols }));

          //es para que no se actualice el item de la app principal,
          if (update_item) {
            this.items.set(temp);
          }

          // tambien se actualiza el array de itemsNew para que cuando se cree un nuevo elemento se muestre en la tabla
          (this.sharedS as any).data[safePos] = temp;

          // comportamiento a la visibilidad del dialogo y al reseteo del formulario
          this.commonVisibilityDialog(options);
          this.files = [];
          this.files64 = [];
        },
        error: (e: any) => {
          this.messageS.changeMessage(`No fue posible crear ${this.singularIndefiniteArticle[safePos] || this.singularIndefiniteArticle[0]}.`, e, this.customField()[safePos]);
          this.showBlocked(false);
          // Va dentro de error para que se oculte hasta que responda el observable
        }
      });
    } else {
      const id = selected?.id || this.selected()[0]?.id;

      if (!id) {
        this.messageS.changeMessage(`Elija ${this.singularIndefiniteArticle[safePos] || this.singularIndefiniteArticle[0]} que desea editar.`);
        this.showBlocked(false);
        return;
      }

      this.crudS.edit({ formData, id, include /*, files*/ }).subscribe({
        next: (resp: any) => {
          const msg = this.singular[safePos] || this.singular[0];
          this.messageS.changeMessage(
            `${msg.charAt(0).toUpperCase()}${msg.slice(1)} 
                    ${formData.name} modificado/a.`,
            null,
            {},
            'success',
            'Aviso'
          );
          this.files = [];
          this.files64 = [];

          this.updateRecord(resp, id, safePos);
          if (hide) {
            this.hideFormDialog(safePos);
          } else {
            // si en la edición no se cierra el dialogo, se cambia la bandera a true para que cuando permita guardar
            // si se ponen nuevos datos ya que el boton se llama guardar y nuevo
            this.isCreate = true;
          }

          if (reset) {
            this.resetFormDialog({ pos: safePos });
          }

          this.showBlocked(false);
          // Va dentro de next para que se oculte hasta que responda el observable
        },
        error: (e: any) => {
          this.showBlocked(false);
          // Va dentro de error para que se oculte hasta que responda el observable
          this.messageS.changeMessage(`No fue posible editar ${this.singularIndefiniteArticle[safePos] || this.singularIndefiniteArticle[0]}.`, e, this.customField()[safePos]);
        }
      });
    }
    this.enableForm();
  }
  file(options: saveOptions = {}) {
    const { pos = this.typeDefault, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null } = options;

    const base64FilesPromises = [];

    // Convertir todos los archivos en promesas
    for (let i = 0; i < this.files.length; i++) {
      base64FilesPromises.push(this.convertFileToBase64(this.files[i]));
    }

    // Cuando todas las promesas se resuelvan
    Promise.all(base64FilesPromises)
      .then((base64Files) => {
        // Agregar todos los base64 al campo 'files'
        const form = this.currentForm(pos);
        form.get('documents')?.setValue([...base64Files, ...this.files64]);

        // Ahora sí, puedes enviar el formulario aquí o llamar a tu función de submit
        this.submitForm(options);
      })
      .catch((error) => {
        console.error('Error al convertir archivos a base64', error);
        this.messageS.changeMessage('Error al convertir los documentos.');
      });
  }

  /**
   * Guarda o actualiza los datos del formulario
   * @param pos Posición de la app en el array, si no se envia valor se asume que es para la app principal
   * @param hide true para cerrar el dialogo, false para dejarlo abierto
   * @param reset true para resetear el form, false para dejarlo como esta
   * @param is_file true para enviar un archivo, false para enviar un formulario normal application/vnd.api+json
   * @param node true para convertir el formato para node
   * @param selected Elemento seleccionado para la edición, si no se envia se toma el primer elemento seleccionado
   * @param update_item true para actualizar el item de la app principal, false para no hacerlo
   */
  save(options: saveOptions = {}) {
    const { pos = this.typeDefault, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null } = options;

    const safePos = pos as any; // Type assertion para índices de array

    const form = this.currentForm(safePos);
    this.generalS.initialize();
    const coords = this.generalS.getLocationSnapshot();

    if (coords) {
      form.get('latitude')?.setValue(coords.latitude);
      form.get('longitude')?.setValue(coords.longitude);
      form.get('time_zone')?.setValue(coords.time_zone);
    }

    if (this.formErrors(safePos, is_file)) return;
    this.validateRelationships(safePos);
    this.showBlocked();

    if (is_file) {
      if (this.files.length > 0) {
        this.file(options);
        /*const base64FilesPromises = [];

                // Convertir todos los archivos en promesas
                for (let i = 0; i < this.files.length; i++) {
                    base64FilesPromises.push(this.convertFileToBase64(this.files[i]));
                }

                // Cuando todas las promesas se resuelvan
                Promise.all(base64FilesPromises)
                    .then((base64Files) => {
                        // Agregar todos los base64 al campo 'files'
                        form.get('documents')?.setValue([...base64Files, ...this.files64]);

                        // Ahora sí, puedes enviar el formulario aquí o llamar a tu función de submit
                        this.submitForm({ pos, hide, reset, is_file, node, selected, update_item, data });
                    })
                    .catch((error) => {
                        console.error('Error al convertir archivos a base64', error);
                        this.messageS.changeMessage('Error al convertir los documentos.');
                    });*/
      } else {
        //°°°TEMPORAL
        form.get('maintenance_document_data_documents')?.setValue(this.files64);
        form.get('documents')?.setValue(this.files64);
        this.submitForm({ pos, hide, reset, is_file, node, selected, update_item, data });
      }
    } else {
      this.submitForm({ pos, hide, reset, is_file, node, selected, update_item, data });
    }
  }

  saveSecundary(options: saveOptions = {}) {
    const { pos = this.typeDefault, hide = true, reset = true, is_file = false, node = false } = options;

    const safePos = pos as any; // Type assertion para índices de array

    // si hay un error de validación, detiene la función
    if (this.formErrors(safePos, is_file)) return;
    this.validateRelationships(safePos);
    this.showBlocked();

    if (this.isCreateSecundary) {
      this.crudS.type = this.type[safePos];
      this.crudS.app = this.app[safePos];

      //this.fields siempre se debe inclui sino no es validado el form
      const formData = this.currentForm(safePos).value;
      //const include = this.include;
      const include = 'asset,file_type,file_status';
      //const filter = this.filter;
      //const files = is_file ? this.files : null;

      this.crudS.saveObject({ formData, /*files,*/ include }).subscribe({
        next: (resp: any) => {
          //aqui voy, falta pasar el nuevo elemento creado a documentos, tambien el edit
          const temp = [...this.itemsSecundary()[safePos]];
          temp.unshift(this.DJAtoObject({ resp, node }));

          //es para que no se actualice el item de la app principal,
          this.itemsSecundary()[safePos] = temp;
          // tambien se actualiza el array de itemsNew para que cuando se cree un nuevo elemento se muestre en la tabla
          //(this.sharedS as any).data[pos] = temp;

          // comportamiento a la visibilidad del dialogo y al reseteo del formulario
          this.commonVisibilityDialog(options);
        },
        error: (e: any) => {
          this.messageS.changeMessage(`No fue posible crear ${this.singularIndefiniteArticle[safePos] || this.singularIndefiniteArticle[0]}.`, e, this.customField()[safePos]);
          this.showBlocked(false);
          // Va dentro de error para que se oculte hasta que responda el observable
        }
      });

      const currentPos: any = this.pos();
      if (currentPos !== null) {
        this.crudS.type = this.type[currentPos];
        this.crudS.app = this.app[currentPos];
      }
    }
  }

  delete(pos: any = null, node = false) {
    pos = pos || this.pos();
    if (pos === null) return; // Salir si pos es null
    this.changePos(pos);
    // Esto no debería pasar porque el boton esta bloqueado cuando no hay selección, meramente preventivo
    let select;
    if (this.selected()) {
      // en caso de que sea node, se extrade de data, ya que tare este campo
      if (node) {
        select = this.selected()[0].data;
      } else {
        select = this.selected()[0];
      }
    } else {
      this.messageS.changeMessage(`Seleccione ${this.singularIndefiniteArticle[pos] || this.singularIndefiniteArticle[0]} que desea eliminar.`);
      return;
    }

    //el mensaje queda preparado para cuando elimine varios, actualmente solo elimina el primro, actualmente solo elimina el
    //primer registro seleccionado (no iene nada que cer el level)
    const msg = `¿Está seguro de que desea eliminar ${select.length > 1 ? this.pluralDefiniteArticle[pos] || this.pluralDefiniteArticle[0] : this.singularIndefiniteArticle[pos] || this.singularIndefiniteArticle[0] + ' ' + select.name}?`;
    this.confirmationS.confirm({
      message: msg,
      header: 'Advertencia',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      rejectIcon: '',
      acceptButtonStyleClass: 'p-button-raised p-button-text p-button-danger',
      rejectButtonStyleClass: 'p-button-raised p-button-text p-button-secondary',
      accept: () => {
        this.showBlocked();
        //como los asorvables son asincronos, no garantiza eliminar los registros en base al nivel, debe eliminarse desendente
        //para no violar las reglas de integridad
        const id: string = select.id;
        this.crudS.delete(id).subscribe({
          next: (resp: any) => {
            let indice;
            if (node) {
              indice = this.items().findIndex((elemento) => elemento.data.id === id);
            } else {
              indice = this.items().findIndex((elemento) => elemento.id === id);
            }
            // lo quita del array de elementos
            if (indice !== -1) {
              const temp = [...this.items()];
              temp.splice(indice, 1);
              this.items.set(temp);
              (this.sharedS as any).data[pos] = this.items();
            }
          },
          error: (e: any) => {
            this.messageS.changeMessage(`No fue posible eliminar ${this.singularIndefiniteArticle[pos] || this.singularIndefiniteArticle[0]}.`, e, this.customField()[pos]);
          }
        });
        this.selected.set([]);
        this.showBlocked(false);
      }
    });
  }

  import() {
    this.importDialogVisible.set(true);
  }

  sortable(e: any) {
    alert();
  }

  actionsSelection() {
    this.actionsSelectionDialogVisible = true;
  }

  /**
   * Es llamada cada vez que se cierra un dialogo de una app
   * @param app app que se va a ocultar
   */
  onHide(app = null) {
    this.isCreate = false;
    this.files = [];
    this.files64 = [];
  }

  /**
   * Es llamada cada vez que se abre un dialogo de una app, normalmente tiene que inicializar formularios antes de abrirse
   * @param app app que se va a mostrar
   */
  onShow(app = null) { }

  /**
   * bloquea la pantalla y muestra un gif de carga.
   * @param visible --true-- Bool true para mostrarlo, false para ocultarlo.
   */
  private _blockingCount = 0;
  showBlocked(visible = true) {
    this.messageS.showBlocked(visible);
    /*if (visible) {
      this._blockingCount++;
      if (this._blockingCount === 1) {
        this.messageS.showBlocked(true);
      }
    } else {
      this._blockingCount = Math.max(0, this._blockingCount - 1);
      if (this._blockingCount === 0) {
        this.messageS.showBlocked(false);
      }
    }*/
  }

  /**
    * Genero el objeto para el menú de más opciones, lo hago muy completo porque quiero que la llamada sea sencilla ya 
    * que lo utilizarán todos los componentes
     
    * @param concat Si requiere agregar texto a la leyenda Importar y Exportar repectivamente, sólo para las 2 primeras opciones
    * @param additionalElements agrega elementos adicionales al menú, si no envía nada, retornará 
    * @returns un array para tipo MenuItem para crear el menú de más opciones
    */
  commonSettings(concat: string[] = [], additionalElements: any[][] = []) {
    // para inpedir que se creen los menus se debe enviar null
    if (concat == null) {
      this.moreOptions.set([]);
      return;
    }

    let items: MenuItem[] = [];
    items = [
      {
        label: 0 in concat ? 'Importar ' + concat[0] : 'Importar',
        command: () => this.import()
      },
      {
        label: 1 in concat ? 'Exportar ' + concat[1] : 'Exportar',
        command: () => this.export()
      },
      {
        label: 'Acciones sobre selección',
        command: () => this.actionsSelection()
      }
      //°°° DEBE HABER UN DIALOGO QUE INDICA LAS PREFERENCIAS DE EXPORTACION/IMPORTACION?
      /*
            {
              label: 0 in concat ? 'Importar ' + concat[0] : 'Importar excel',
              command: () => this.import()
            },{
              label: 1 in concat ? 'Importar ' + concat[0] : 'Importar csv',
              command: () => this.import()
            },
            {
              label: 2 in concat ? 'Exportar ' + concat[1] : 'Exportar excel',
              command: () => this.export()
            },
            {
              label: 3 in concat ? 'Exportar ' + concat[2] : 'Exportar csv',
              command: () => this.export()
            },
            {
              label: 4 in concat ? 'Exportar ' + concat[2] : 'Exportar pdf',
              command: () => this.export()
            } 
            */
    ];

    items.push(
      { separator: true },
      {
        label: 'Configuración del módulo',
        command: () => this.localSettings()
      },
      { label: 'Ir a configuración', routerLink: ['/setup'] }
    );

    if (additionalElements.length > 0) {
      items.push({ separator: true });
    }

    for (let element of additionalElements) {
      items.push({ label: element[0], command: () => element[1]() });
    }

    this.moreOptions.set(items);
  }

  onRowDoubleClick(event: any) {
    this.selected()[0] = event;
    this.edit();
  }

  export() {
    this.exportDialogVisible.set(true);
  }

  /**
   * Activa la bandera para mostrar el dialogo de configuración local
   */
  localSettings() {
    this.localSettingsDialogVisible.set(true);
    //inicializa el select de las columnas visibles de cada app cuando se abre la configuración local,
    //tambien puedo poner una funcion que se ejecute cuando se dispare el evento de mostrar la pantalla de configuracion local
    //this.configForm.controls['columns'].setValue(this.selectedColumns().map(column => column.field));
    this.configForm.reset({
      columns: this.selectedColumns().map((column) => column.field)
    });
  }

  saveConfig() {
    const fieldsForm: any[] = this.configForm.value.columns;
    const missingFields = this.cols()
      .filter((col: any) => !fieldsForm.includes(col.field))
      .map((col: any) => col.field);
    this.removeColumns.set(missingFields);

    const currentPos: any = this.pos() ?? 0;
    if (currentPos !== null) {
      this.itemsRemove[currentPos] = missingFields;
    }
    this.iniParam();
    this.getAll({ pos: this.pos() ?? '0' });

    //this.configS.saveConfig(this.configForm.value);
    this.localSettingsDialogVisible.set(false);
  }

  onExportServer(e: any) { }
  /**
   * inicializa el select de las columnas visibles de cada app cuando se abre la configuración local
   */
  /*onShowConfig() {
      this.configForm.controls['columns'].setValue(this.selectedColumns().map(column => column.field));
    }*/

  /*
  public videoDevices: MediaDeviceInfo[] = [];
  public currentCameraIndex: number = -1;
  async previewCamera() {

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.video.nativeElement.srcObject = this.mediaStream;
      this.video.nativeElement.play();
      this.previewCameraDialogVisible = true;
    } catch (error) {
      this.messageS.changeMessage('Debe permitir el acceso a la cámara.')
    }
  }
  async getMediaDevices() {
    try {
      // Solicita permisos para acceder a la cámara y el micrófono
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Enumera los dispositivos de medios disponibles
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices;
    } catch (error) {
      console.error('Error al enumerar dispositivos de medios:', error);
      return [];
    }
  }
  async selectCamera() {
    try {
      if (this.videoDevices.length === 0) {
        this.videoDevices = await this.getMediaDevices();
        if (this.videoDevices.length === 0) {
          throw new Error('No se encontraron cámaras disponibles.');
        }

        // Intenta encontrar la cámara trasera
        let backCamera = this.videoDevices.find((device: MediaDeviceInfo) => device.label.toLowerCase().includes('back'));
        if (!backCamera) {
          // Si no encuentra la cámara trasera, intenta con la delantera
          backCamera = this.videoDevices.find((device: MediaDeviceInfo) => device.label.toLowerCase().includes('front'));
        }
        if (!backCamera) {
          // Si no encuentra ni la trasera ni la delantera, usa la primera disponible
          backCamera = this.videoDevices[0];
        }
        this.currentCameraIndex = this.videoDevices.indexOf(backCamera);
      } else {
        // Avanza al siguiente dispositivo de video
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.videoDevices.length;
      }

      const deviceId = this.videoDevices[this.currentCameraIndex].deviceId;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: true
      });
      this.video.nativeElement.srcObject = this.mediaStream;
      this.video.nativeElement.play();
      this.previewCameraDialogVisible = true;
    } catch (error: any) {
      if (error.name === 'OverconstrainedError') {
        console.error('No se pudo satisfacer las restricciones de video:', error);
        this.messageS.changeMessage('No se pudo satisfacer las restricciones de video. Intente con otra cámara.');
      } else if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        console.error('Permiso denegado para acceder a la cámara:', error);
        this.messageS.changeMessage('Debe permitir el acceso a la cámara.');
      } else {
        console.error('Error al acceder a la cámara:', error);
        this.messageS.changeMessage('Debe permitir el acceso a la cámara.');
      }
    }
  }
  captureMedia(type: 'image' | 'video' = 'image') {
    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    if (type === 'image') {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const canvasContext = canvas.getContext('2d');
      canvasContext?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imagenCapturada = canvas.toDataURL('image/jpeg'); // Cambia 'image/png' a 'image/jpeg'
      this.files64.push({ type: 'image', file_name: 'evidencia.jpg', file: imagenCapturada });

      this.previewCameraDialogVisible = false;
    } else if (type === 'video') {
      const mediaRecorder = new MediaRecorder(this.mediaStream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const videoBase64 = reader.result as string;
          this.files64.push({ type: 'video', file_name: 'evidencia.webm', file: videoBase64 });

        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();

      const interval = setInterval(() => {
        this.timeVideo.update(time => time - 1);
        if (this.timeVideo() <= 0) {
          clearInterval(interval);
          this.timeVideo.set(0);
          mediaRecorder.stop();
          this.previewCameraDialogVisible = false;
          this.timeVideo.set(6); // Reinicia el tiempo para la próxima grabación
        }
      }, 1000); // Decrementa cada segundo
    }
  }
  removeMedia(i: number) {
    this.files64.splice(i, 1);
  }
  onHidePreviousCamera() {
    if (this.mediaStream) {
      const tracks = this.mediaStream.getTracks();
      tracks.forEach(track => track.stop());
    }
  }
  removeImage(i: number, type: string = '64') {
    if (type == '64') {
      this.files64.splice(i, 1);
    } else if (type == 'bin') {
      this.files.splice(i, 1);
    }
  }
*/

  onFiles64(event: any[]) {
    this.files64 = event;
  }

  onFiles(event: any[]) {
    this.files = event;
  }

  onSelection(event: any[]) {
    this.selected.set(event);
  }

  /**
   * Maneja la selección de registros secundarios
   * @param event Registro seleccionado
   * @param pos Posición de la app en el array
   */
  onSelectionSecundary(event: any[], pos: any) {
    this.selectedSecundary()[pos] = event;
  }

  // Manejar la selección de nodos
  onNodeSelect(event: { node: TreeNode }) {
    const selectedNodes = [...this.selected(), event.node];
    this.selected.set(selectedNodes);
  }

  // Manejar la deselección de nodos
  onNodeUnselect(event: { node: TreeNode }) {
    const selectedNodes = this.selected().filter((node) => node !== event.node);
    this.selected.set(selectedNodes);
  }

  onExportDialogVisible(event: any) {
    this.exportDialogVisible.set(event);
  }

  onLocalSettingsDialogVisible(event: any) {
    this.localSettingsDialogVisible.set(event);
  }

  onImportDialogVisible(event: any) {
    this.importDialogVisible.set(event);
  }

  get classifierFormGen() {
    return this.currentForm().get('classifiers') as FormArray;
  }

  /**
   * Unifica las llamadas de restablecer el formulario para nuevo y editar, habilitar y deshabilitar campos,
   * @param data
   */
  unifyRestoreForm(data: any) {
    //console.log('inicio unifyRestoreForm');

    // se restablece el form, si se envia data vacio el form entiendo que es creación
    this.resetFormDialog({ selected: data });
    this.enableForm();

    // si se va a editar restablce la selección y verifica si el elemento es del sistema para bloquear los campos que no son del sitema
    if (!this.isCreate) {
      this.selected.set([]);
      this.selected()[0] = data;
      //inhabilita los campos del form cuando son del sistema, a excepción del array activate_sys
      if (this.selected()[0]?.sys) {
        this.disableForm();
      }
    }

    //return;
    this.showFormDialog();
    //console.log('fin unifyRestoreForm');
  }

  loadClassifiers(classifier_id: any, classifierLevel: any, i: any) {
    classifier_id = classifier_id.value;
    if (!classifier_id) return;
    //let filter;
    /*if (level === 1) {
          filters = 'filter[classifier_level]=' + classifier_level_id;
        } else {*/
    //const  filter = `filter[classifier_level.level]=${(parseInt(level) + 1)}`;
    //}
    //console.log('inicio loadClassifiers');

    const filter = `filter[classifiers]=${classifier_id}`; //${(parseInt(level) + 1)}
    const app = 'classifiers/classifier';
    const type = 'classifier';
    const include = 'classifier_level';
    const fields = 'classifier_level,name,is_required';

    this.crudS.getObject({ include, fields, filter, app, type }).subscribe(
      (data: any) => {
        // este  objecto es para que agregar campos adicionales al objecto principal desde la relación incluida
        /*const fields_include = {
                  'classifier_level': [
                    { original_field: 'level', renamed_fields: 'level' },
                    { original_field: 'classifier_type', renamed_fields: 'classifier_type' },
                    { original_field: 'is_required', renamed_fields: 'is_required' },
                  ]
                };*/
        // los array vacios es para que DJAtoObject no tome los valores por default o de la app donde se estan cargado
        //los clasificadores y evitar iteraciones innecesarias
        //const classifiers = this.DJAtoObject(data, null, [], [], []);
        const classifiers = this.DJAtoObject({ resp: data, customField: null, fieldsBool: null, moreFields: null });

        const level = classifierLevel.level;
        const classifier_type = classifierLevel.classifier_type;
        // este no se usa porque solo existiria en las clasificadores del elemento de cada hijo seleccionado,
        // si el usuario selecciona otro elemento yano deberia existir
        //let classifier_is_required = classifierLevel.classifier_is_required;
        let classifier_level_is_required = classifierLevel.is_required;

        /*// en el nivel 1, no debe haber clasificadores anteriores, por lo que no se requiere
                if (level > 0) {
                  classifiers_is_required = this.classifiersGen()[classifier_type + 'p'][level + 'p'];
                  //classifiers_is_required = classifiers_is_required.find((classifier) => classifier.id === classifier.value)
                  }*/

        // Ya que al seleccionar el elemto solo envia el ID, tengo que filtrar this.classifiers para obtener el resto de los valires, sobre todo is_required
        const currentPos = this.pos();
        if (currentPos === null) return;

        const selectedClassifier = (this.classifiersGen() as any)[currentPos][classifier_type + 'p'][level + 'p'].find((classifier: any) => classifier_id === classifier.id);
        const classifier_is_required = selectedClassifier.is_required;

        const laterFormControlName = parseInt((this.auxFormClassifiers as any)['formControlName'][i]) + 1;
        const classifierControl = this.classifierFormGen.controls[laterFormControlName];

        if (classifierControl) {
          if (classifier_is_required || classifier_level_is_required) {
            classifierControl.setValidators([Validators.required]);
          } else {
            classifierControl.clearValidators();
          }
          classifierControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
          this.classifierFormGen.updateValueAndValidity(); //{ onlySelf: true, emitEvent: false }
        }

        // no valido que evista el tipo y la app(pos) porque esto se carga classifierLevelsDropdown
        if (!(this.classifiersGen() as any)[currentPos][classifier_type + 'p'][level + 1 + 'p']) {
          (this.classifiersGen() as any)[currentPos][classifier_type + 'p'][level + 1 + 'p'] = [];
        }

        (this.classifiersGen() as any)[currentPos][classifier_type + 'p'][level + 1 + 'p'] = classifiers;
      },
      (err: any) => {
        (this.messageS as any).changeMessage('Hay un error al cargar los clasificadores.', err, {});
      }
    );
    //console.log('fin loadClassifiers');
  }

  /**
   * Retorna los clasificadores de un nivel en base al tipo de clasificador y actualiza el
   * auxFormClassifiers con el indice del array de clasificadores del form
   * @param classifier_type tipo de clasificador
   * @param level nivel del clasificador, normalmente el mismo que el index del array
   * @param i indice del array de clasificadores
   * @returns retona los clasificadores de un nivel en base al tipo de clasificador
   */
  classifierTypeByLevel(classifier_type: any, level: any, i: any) {
    if (!classifier_type) return [];
    const currentPos = this.pos() ?? 0;
    if (!(this.classifiersGen() as any)[currentPos][classifier_type]) return [];

    if (!(this.auxFormClassifiers as any)['formControlName']) {
      (this.auxFormClassifiers as any)['formControlName'] = [];
    }

    let classifiers = (this.classifiersGen() as any)[currentPos][classifier_type][level];

    if (this.isCreate) {
      (this.auxFormClassifiers as any)['formControlName'][i] = i;
      // si es creación, se limpian los clasificadores de los niveles superiores
      if (level > 1) {
        classifiers = [];
      }
    } else {
      const controls = this.classifierFormGen.value;
      for (const control in controls) {
        for (const classifier in classifiers) {
          if (controls[control] === classifiers[classifier].id) {
            (this.auxFormClassifiers as any)['formControlName'][i] = control;
            break;
          }
        }
      }
    }
    return classifiers;
  }

  funAuxFormClassifiers(element: any, i: any) {
    // por algún motivo no funciona this.auxFormClassifiers()[element][i] directamente en el html
    // a partir de un punto dejó de funcionar por eso lo encapsulo en una función
    return (this.auxFormClassifiers as any)[element][i];
  }

  /**
   * para los clasificadores que van en los documentos
   */
  classifierLevelsDropdown(data = null, pos: any = null) {
    //console.log('inicio classifierLevelsDropdown');

    pos = pos || this.pos();
    pos = pos ?? 0; // si no se envia pos, se asume que es la app principal

    if (this.classifierLevelsGen()[pos]) {
      this.unifyRestoreForm(data);
      return;
      // si la app no tiene clasificadores, se restablece el formulario
    } else if (!this.classifierFormGen) {
      this.unifyRestoreForm(data);
      return;
    }

    //const filter = `filter[classifier_type]=${this.module[pos]}`;
    //const sort = 'classifier_type, level';
    //const app = 'classifiers/classifier-level';

    const include = 'classifier_level';
    const filter = `filter[classifier_level.classifier_type]=${this.module[pos]}`; //'filter[classifier_level.classifier_type.in]=' + classifiers_type
    const fields = 'classifier_level,name,is_required';
    const app = 'classifiers/classifier';
    const type = 'classifier';
    //return this.crudS.get(include, filter, '', fields, '', 'classifiers/classifier', 'classifier');

    ///////////TEMPORAL
    // una vez que el seagreguen los campos de los clasificadores, se restablece el formulario
    //this.unifyRestoreForm(data);

    /*const filters = 'filter[app_classifier_type]=P';
        const sort = 'app_classifier_type';
        const apps = 'classifiers/app-classifier-type';

        this.crudS.get('classifier_level', filters, sort, '', '', apps).pipe(
            map((app_classifier_type: any) => {

                let classifiers_type = '';
                // busca por classifier_level entre app_classifier_type y classifier_level, para encontrar el classifier_type de classifier_level,
                // solo busco los classifier_type de los app_classifier_type que tienen classifier_level
                for (let data of app_classifier_type?.data) {
                    const id_classifier_level = data.relationships.classifier_level.data.id;
                    for (let included of app_classifier_type.included) {
                        if (included.id === id_classifier_level) {
                            classifiers_type += included.attributes.classifier_type + ',';
                            break;
                        }
                    }
                }
                return classifiers_type.slice(0, -1);
            }),

            // Me traigo los clasificadores del primer nivel
            switchMap((classifiers_type: any) => {
                const include = 'classifier_level';
                const filter = 'filter[classifier_level.classifier_type.in]=' + classifiers_type// + '&filter[classifier_level.level]=1'
                const fields = 'classifier_level,name,is_required';
                return this.crudS.get(include, filter, '', fields, '', 'classifiers/classifier', 'classifier');
            })
        ).*/
    this.crudS
      .getObject({ include, filter, fields, app, type })
      .pipe()
      .subscribe({
        next: (classifiers: any) => {
          // este  objecto es para que agregar campos adicionales al objecto principal desde la relación incluida
          const fields_include = {
            classifier_level: [
              { original_field: 'level', renamed_fields: 'level' },
              { original_field: 'classifier_type', renamed_fields: 'classifier_type' },
              { original_field: 'is_required', renamed_fields: 'is_required' }
            ]
          };

          // los array vacios es para que DJAtoObject no tome los valores por default o de la app donde se estan cargado
          //los clasificadores y evitar iteraciones innecesarias
          const classifiersFormat = this.DJAtoObject({
            resp: classifiers,
            additionalFieldsIncluded: null,
            customField: null,
            fieldsBool: null,
            moreFields: null
          });

          const pos: any = this.pos() ?? 0;

          const cla: any[][][] = [];
          const lev: any[] = [];
          const lev2: any[] = [];
          for (let classifierGen of classifiersFormat) {
            // se utilizan para separar los clasificadores por tipo y nivel, la p solo es para que
            // el valor no sea numérico para evfitar que los indices se llenen con valores undefined
            const classifier_type_letter: any = classifierGen.classifier_level_classifier_type + 'p';
            const level_letter: any = classifierGen.classifier_level_level + 'p';

            const pos: any = this.pos() ?? 0;

            // inicializa el array de clasificadores por tipo
            if (!cla[pos]) {
              cla[pos] = [];
            }
            // inicializa el array de clasificadores por tipo
            if (!cla[pos][classifier_type_letter]) {
              cla[pos][classifier_type_letter] = [];
            }

            // indica si el clasificador superior el obligatorio, inicia con false, porque el primer clasificador
            // no depende de otro clasificador
            let classifier_is_required = false;

            // inicializa el array de clasificadores por nivel, aqui ingresa solo cuando cambia tipo y nivel
            // es decir, solo la primera vez para cada indice

            if (!cla[pos][classifier_type_letter][level_letter]) {
              // iniciualiza los controles del formulario de los clasificadores
              //console.log(this.classifierFormGen);

              if (this.classifierFormGen) {
                this.classifierFormGen?.push(new FormControl(null, classifierGen.classifier_level_is_required || classifier_is_required ? Validators.required : null));
              }

              cla[pos][classifier_type_letter][level_letter] = [];

              if (!lev2[classifierGen.classifier_level_classifier_type]) {
                lev2[classifierGen.classifier_level_classifier_type] = [];
                lev2[classifierGen.classifier_level_classifier_type].push({
                  name: classifierGen.classifier_level__name,
                  level: classifierGen.classifier_level_level,
                  // le pongo is_required porque hace referencia al nivel y la variable es para almacenar info del nivel
                  is_required: classifierGen.classifier_level_is_required,
                  classifier_type: classifierGen.classifier_level_classifier_type,
                  classifier_level_id: classifierGen.classifier_level
                });
              }

              // inicializa el array de niveles de los clasificadores
              lev.push({
                name: classifierGen.classifier_level__name,
                level: classifierGen.classifier_level_level,
                // le pongo is_required porque hace referencia al nivel y la variable es para almacenar info del nivel
                is_required: classifierGen.classifier_level_is_required,
                classifier_type: classifierGen.classifier_level_classifier_type,
                classifier_level_id: classifierGen.classifier_level
                // como esta es info del clasificador no del nivel, se le agrega classifers_
                // notese que es diferente a la variable classifier_is_required de abajo porque esa lo utilizo para
                // inicializar el hijo y en padre debe ser el anterior
                //'classifier_is_required': classifierGen.is_required,
              });

              // si el clasificador es requerido, se pone en true para que los siguientes clasificadores sean requeridos
              // notese que se inicializa abajo para que se aplique al siguiente clasificador ya que dependen del anterior
              classifier_is_required = classifierGen.is_required;
            }

            // va a gregando los clasificadores
            cla[pos][classifier_type_letter][level_letter].push(classifierGen);
          }

          // una vez que el seagreguen los campos de los clasificadores, se restablece el formulario
          this.unifyRestoreForm(data);
          //carga los clasificadores de cada nivel

          this.classifiersGen.set(cla);
          // establce los niveles de los clasificadores, los combos que el usuariuo visualiza
          this.classifierLevelsGen()[pos] = lev;
        },
        error: (err: any) => {
          this.messageS.changeMessage(`Hay un error al cargar los clasificadores.`, err);
        }
      });
    //console.log('fin classifierLevelsDropdown');
  }

  //cuando se expande agrega los hijos al array por eso tengo que filtrar
  // nodeSelect(event) {
  //   this.selectClassifierLevelTreeTable = this.selectClassifierLevelTreeTable.filter(selec => !selec.parent);
  // }

  onTabChange(e: any) {
    const tab = e.originalEvent.target.innerText;
    //si se pica sobre la pestaña de documentos y si se esta en modo edición, carga los archivos
    if (tab === 'Documentos' && !this.isCreate) {
      // deberia existir una variable que le indique al componende de documentos app que se ingreso a la pestaña de documentos
      //para que sean cargados los documentos en lugar de que se acrguen cada vez que se abre el dialogo
    }
  }

  /**
   * es especial, por lo regular se usa para obtener los datos de un combo de los niveles de clasificadores, ya que es comun para
   * todas las apps, lo puedo utilizar en todos los que im´plementen el servicio
   * @param filter_id filtro para obtener los niveles de clasificadores
   */
  getClassifierLevelsGlogal(options: levelsOptions = {}) {
    //°°° se tiene que recargar por cada creacion de cada nivel clasificador
    const { filter_id = [], filter_level = [], filter_app = [], force = false } = options;

    //console.log('inicio getClassifierLevelsGlogal');

    // si se envia filter_id y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los id deben enviarse en filter en forma de array
    if (!force && filter_id.length > 0) {
      return this.classifierLevelsGlobal().filter((item: any) => filter_id.includes(item.id));
    }

    // si se envia filter_level y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los niveles deben enviarse en filter en forma de array
    if (!force && filter_level.length > 0) {
      return this.classifierLevelsGlobal().filter((item: any) => filter_level.includes(item.level));
    }

    // si se envia filter_app y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los niveles deben enviarse en filter en forma de array
    if (!force && filter_app.length > 0) {
      return this.classifierLevelsGlobal().filter((item: any) => filter_app.includes(item.app));
    }

    if (!force && this.classifierLevelsGlobal().length > 0) return null;

    this.messageS.showBlocked();

    let return_filter: any = null;

    this.crudS.getObject({ sort: 'classifier_type,level', app: 'classifiers/classifier-level', type: 'classifier-level' }).subscribe({
      next: (resp: any) => {
        const data = this.DJAtoObject({
          resp: resp,
          fieldsBool: null,
          moreFields: null
        });

        this.classifierLevelsGlobal.set(data);

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && filter_id.length > 0) {
          return_filter = this.classifierLevelsGlobal().filter((item: any) => filter_id.includes(item.id));
        }

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && filter_level.length > 0) {
          return_filter = this.classifierLevelsGlobal().filter((item: any) => filter_level.includes(item.level));
        }

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && filter_app.length > 0) {
          return_filter = this.classifierLevelsGlobal().filter((item: any) => filter_app.includes(item.app_classifier_type));
        }

        this.messageS.showBlocked(false);

        // retorna el filtro si se envia, si no, retorna null
        return return_filter;
      },
      error: (error: any) => {
        this.messageS.changeMessage('Hay un error al cangar los clasificadores', error);
      }
    });
    //console.log('fin getClassifierLevelsGlogal');

    return null;
  }

  /**
   * especial para obtener todos los clasificadores
   */
  getClassifierGlobal(options: classifierOptions = {}) {
    //°°° se tiene que recargar por cada creacion de cada clasificador
    const { filter_id = [], filter_level = [], level_id = [], force = false } = options;

    //console.log('inicio getClassifierGlobal');

    // si se envia filter_id y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los id deben enviarse en filter en forma de array
    if (!force && filter_id.length > 0) {
      return this.classifiersGlobal().filter((item: any) => filter_id.includes(item.id));
    }

    // si se envia filter_level y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los niveles deben enviarse en filter en forma de array
    if (!force && filter_level.length > 0) {
      return this.classifiersGlobal().filter((item: any) => filter_level.includes(item.level));
    }

    // si se envia level_id y force es falso, es porque se quiere filtrar classifierLevelsGlobal, no se colsulta al servidor,
    // y los niveles deben enviarse en filter en forma de array
    if (!force && level_id.length > 0) {
      return this.classifiersGlobal().filter((item: any) => level_id.includes(item.classifier_level_id));
    }

    if (!force && this.classifiersGlobal().length > 0) return null;

    this.messageS.showBlocked();

    let return_filter: any = null;

    this.crudS.getObject({ app: 'classifiers/classifier', type: 'classifier' }).subscribe({
      next: (resp: any) => {
        const data = this.DJAtoObject({
          resp: resp,
          fieldsBool: null,
          moreFields: null
        });
        this.classifiersGlobal.set(data);

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && filter_id.length > 0) {
          return_filter = this.classifiersGlobal().filter((item: any) => filter_id.includes(item.id));
        }

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && filter_level.length > 0) {
          return_filter = this.classifiersGlobal().filter((item: any) => filter_level.includes(item.level));
        }

        // mismo caso pero el filtro se hace despues de que se cargan los datos
        if (force && level_id.length > 0) {
          return_filter = this.classifiersGlobal().filter((item: any) => level_id.includes(item.classifier_level_id));
        }
        this.messageS.showBlocked(false);

        // retorna el filtro si se envia, si no, retorna null
        return return_filter;
      },
      error: (error: any) => {
        this.messageS.changeMessage('Hay un error al cangar los clasificadores', error);
      }
    });
    //console.log('fin getClassifierGlobal');

    return null;
  }

  /**
   * filtra los estados dependientes de la app y el id del registro seleccionado, asigna los estados al menu de iniciar,
   * también agrega la opcion de tareas
   * @param data Estatus
   * @param module/app Modulo de la app del servidor para obtener los estados
   * @param id del estado del registro seleccionado
   */
  dependentStatus(data: any, module: string, id: string) {
    const status = [];

    // (this.sharedS as any).data['status'] tra [{"app":"AZ"},{"app":"MA"}], filter por module
    for (let i = 0; i < data.length; i++) {
      if (data[i].module === module) {
        //buscar en el array dependsOn si existe id
        const exists = (this.sharedS as any).data['status'][i].depends_on.find((ele: any) => ele === id);
        if (exists) {
          const sta = (this.sharedS as any).data['status'][i];
          status.push({
            label: sta.name,
            command: () => this.setStatus(sta.id)
          });
        }
      }
    }

    // status.push({ separator: true });
    // status.push(
    //     { label: 'Diagnosticar', command: () => this.diagnosis() },
    //     { label: 'Solicitar refacciones', command: () => this.request() },
    //     { label: 'Instalar refacciones', command: () => this.getInstallation() },
    // );
    this.startMenu.set(status);
  }

  /**
   * Trae todos los estados del servidor, ademas llama a la funcion dependentStatus para cargar los estados dependientes
   * @param module, modulos/app abreviado de la app del servidor para obtener los estados
   * @param id del estado del registro seleccionado
   * @param force si se debe forzar la carga de los estados
   */
  getStatus(options: getStatusOptions = {}) {
    const { module = '', id = '', ids_task, force } = options;

    if ((this.sharedS as any).data['status'] && !force) {
      this.dependentStatus((this.sharedS as any).data['status'], module, id);
      this.getTask({ module, ids_task });
      return;
    }

    this.crudS.getObject({ app: 'status/status' }).subscribe({
      next: (resp: any) => {
        (this.sharedS as any).data['status'] = this.DJAtoObject({ resp });
        this.dependentStatus((this.sharedS as any).data['status'], module, id);
        this.getTask({ module, ids_task });
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al cargar los estados.`, err, this.customField());
      }
    });
  }

  /**
   * Estabelce el estatús del registro seleccionado en el servidor
   * @param val
   * @param pos
   */
  setStatus(status: any, pos = '') {
    const safePos: any = pos || this.pos();

    const id = this.selected()[0]?.id;
    const type = this.type[safePos];
    const app = this.app[safePos];
    const relationships = [{ field: 'status', type: 'status', id: status }];
    this.crudS.edit({ id, app, type, relationships, include: this.include }).subscribe({
      next: (resp: any) => {
        this.updateRecord(resp, id, pos);
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al modificar el estatús.`, err, this.customField());
      }
    });
  }

  tasks_module = [];
  runTask(options = []) {
    this.tasks_module = options;
  }

  taskModule(data: any, module: string, ids_task: []) {
    const task = [];

    for (let i = 0; i < data.length; i++) {
      //if (data[i].action_app[module]) {
      if (data[i].module == module) {
        const id = data[i]?.id;
        const exists = ids_task ? ids_task.find((ele) => ele === id) : [];

        if (exists) {
          const action_app = (this.sharedS as any).data['task'][i].action_app;
          const tas = (this.sharedS as any).data['task'][i];
          task.push({
            label: tas.name,
            command: () => this.runTask(action_app)
          });
        }
      }
    }

    return task;
  }

  getTask(options: getTaskOptions = {}) {
    const { module = '', ids_task, force } = options;

    if ((this.sharedS as any).data['task'] && !force) {
      const task = this.taskModule((this.sharedS as any).data['task'], module, ids_task);
      //añade a startMenu el valor que tare + el separador + el valor que trae task, utilizando update
      this.startMenu.update((current) => [...current, { separator: true }, ...task]);
      //this.startMenu.set([...this.startMenu(), { separator: true }, ...task]);
      //this.dependentStatus((this.sharedS as any).data['task'], module, id);
      return;
    }

    this.crudS.getObject({ app: 'tasks/task' }).subscribe({
      next: (resp: any) => {
        let task = this.DJAtoObject({ resp });
        (this.sharedS as any).data['task'] = task;
        task = this.taskModule(task, module, ids_task);
        //this.dependentStatus((this.sharedS as any).data['task'], module, id);
        this.startMenu.update((current) => [...current, { separator: true }, ...task]);
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al cargar las tareas.`, err, this.customField());
      }
    });
  }

  onImportSave(data: any) {
    const pos = this.pos();

    //this.submitForm({ pos: this.pos(), data })

    // const { pos = this.typeDefault, hide = true, reset = true,
    //     is_file = false, node = false, selected = null, update_item = true, data = null } = options;

    this.isCreate = true; // para que no se muestre el boton de editar
    data.forEach((data: any) => {
      this.resetFormDialog({ selected: data.attributes });
      this.save({ pos: pos ?? '0' }); //data:data?.attributes
    });
  }

  /**
   * Busca un campo específico dentro de la estructura del formulario dinámico (`drawForm`) y opcionalmente lo elimina.
   *
   * ### Parámetros:
   * - `field` (any): El valor del campo que se desea buscar dentro del formulario.
   * - `pos` (string): La posición del formulario dentro de `drawForm`. Por defecto, se utiliza `this.typeDefault`.
   * - `del` (boolean): Indica si el campo encontrado debe ser eliminado. Por defecto es `false`.
   *
   * ### Comportamiento:
   * 1. Itera sobre las pestañas (`tab`) del formulario dinámico.
   * 2. Dentro de cada pestaña, busca en las estructuras `grid` y `nested`:
   *    - Si encuentra el campo directamente, lo elimina o lo retorna según el valor de `del`.
   *    - Si no lo encuentra, busca dentro de las estructuras anidadas (`card`).
   * 3. Si el campo se encuentra dentro de una estructura `card`, realiza la misma búsqueda y eliminación.
   *
   * ### Retorno:
   * - Si `del` es `true`, elimina el campo y no retorna nada.
   * - Si `del` es `false`, retorna el campo encontrado.
   * - Si no se encuentra el campo, no retorna nada.
   *
   * ### Ejemplo de uso:
   * ```typescript
   * // Buscar un campo sin eliminarlo
   * const result = searchFieldDrawForm('fieldName');
   *
   * // Buscar y eliminar un campo
   * searchFieldDrawForm('fieldName', 'formPosition', true);
   * ```
   */
  searchFieldDrawForm(field: any, pos = this.typeDefault, del = false) {
    const safePos: any = pos ?? 0; // Asegura que pos sea un número válido, si no se envía, se usa 0

    const draw = this.drawForm()[safePos];

    for (const tab in draw) {
      if (!draw.hasOwnProperty(tab) || tab === 'dialog') continue;

      const grids = draw[tab];

      for (const grid in grids) {
        if (!grids.hasOwnProperty(grid)) continue;

        const element = grids[grid];

        if (grid === 'grid' || grid === 'nested') {
          const elementArray = Object.values(element);
          const general = this.searchByValueObject(field, elementArray, 'field');

          //Eliminar si lo encuentra directamente
          if (general[1] >= 0) {
            if (del) {
              // Si se encuentra, eliminar el elemento
              element.splice(general[1], 1);
              break;
            }
            return element.splice(general[1], 1);
          } else {
            // Si no lo encuentra, busca dentro de 'card' o 'fieldset'
            for (const key in element) {
              if (!element.hasOwnProperty(key)) continue;

              let nestedElement = this.searchByKeyObject('card', element[key]);
              nestedElement = nestedElement ? nestedElement : this.searchByKeyObject('fieldset', element[key]);

              if (nestedElement) {
                const nestedArray = Object.values(nestedElement);
                const r = this.searchByValueObject(field, nestedArray, 'field');

                // Eliminar del nestedElement si se encuentra
                if (r[1] >= 0) {
                  const nestedKey = Object.keys(nestedElement)[r[1]];
                  if (nestedKey) {
                    if (del) {
                      // Si se encuentra, eliminar el elemento
                      delete nestedElement[nestedKey]; // También puedes usar `splice` si `nestedElement` es array
                      break;
                    }
                    return nestedElement[nestedKey];
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  onChangeDropdown(e: any) {
    const field = e?.field;
    const id = e?.event.value;
  }



  onKeydownEnterNumber(e: any) {

  }

  onClosableIconDropdown(e: any) {

  }

  onKeydownEnterText(e: any) { }

  onChangeToggle(e: any) { }

  onNewIconDropdown(e: any) {
  }

  onSelectAutoComplete(e: any) { }

  configDialog() { }

  onVisibleChange(event: any) {
    this.actionsSelectionDialogVisible = event;
  }


  /**
   * @param elementos Elementos que se transformarán, respuesta del servidor
   * @param additionalFieldsIncluded Campos adicionales que se deben agregar de la relacion incluida, si no se envia,
   *   solo retornará nombre_de_campo_incluido__name, si quiero que regrese otro valor, por ejeplo, level, tengo que enviar
   *   [{ original_field_included: 'level', renamed_fields: 'level'}], notese que en valo lo regresara en level, por, renamed_fields: 'level',
   *   original_field_included debe existir en el included que retorna el servidor
   * @param customField nombre de campos personalizados, la clave es el campo en ingles que envía el servidor
   * @param fieldsBool Campos con valor booleano que convierte a texto en base al valor bool
   * @param moreFields Toma el id y agrega un campo nombre del campo __text, y lo convierte en texto debe ser un array
   * que contienes arrays donde debe venir el nombre del campo y el array de valores [[nombre_del_campo,{id:1, name:'Nombre'}],[]],
   * @returns elementos transformados, un array con todos los campos en el cuerpo del objeto principal
   */
  DJAtoObject({
    resp: resp,
    additionalFieldsIncluded: additionalFieldsIncluded = null,
    customField: customField = null,
    fieldsBool: fieldsBool = null,
    moreFields: moreFields = null,
    node: node = false,
    additionalFieldsAppCols: additionalFieldsAppCols = [],
    pos = null
  }: getDJAtoObject) {
    const safePos: any = pos || this.pos();

    /* retorno exactamente els mismo objecto, solo lo pongo aquí porque seuramente despues ocuape tranformarlo */
    return this.generalS.DJAtoObject({
      respDJA: resp,
      //trae un array de objector con los campos que se deben agregar de la relación incluida
      additionalFieldsIncluded: additionalFieldsIncluded,
      // si se envia el desde la funcion, se toma ese valor, si no se busca el valor de la app actual,
      customField: customField === null ? this.customField()[safePos] : customField,
      // si se envia el desde la funcion, se toma ese valor, si no se busca el valor de la app actual, si la app actual no trae campos booleanos,
      //se envia un array vacio
      fieldsBool: fieldsBool === null ? this.fieldsBool[safePos] || [] /*|| this.fieldsBool[0]*/ : fieldsBool,
      // si se envia el desde la funcion, se toma ese valor, si no se busca el valor de la app actual,
      moreFields: moreFields === null ? this.moreFields[safePos] : moreFields,
      timeZone: this.timeZone,
      node: node,
      additionalFieldsAppCols: additionalFieldsAppCols
    });
  }
}
