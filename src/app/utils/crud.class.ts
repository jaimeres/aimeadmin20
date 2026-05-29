import { computed, signal, inject, OnChanges, SimpleChanges, Injectable, Directive, DestroyRef } from '@angular/core';
import { Location } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuItem, TreeNode } from 'primeng/api';
import { CRUDService } from './services/crud.service';
import {
  getAllOptions, getAllSecundaryOptions, getDJAtoObject, getStatusOptions, getTaskOptions,
  resetFormOptions, saveOptions
} from './types/crud.types';
import { Vars } from './vars.class';
import { DROPDOWN_TYPES_PAYLOAD } from './dropdown-types.const';

@Directive()
export class CRUD extends Vars implements OnChanges  /*implements OnInit*/ {
  public readonly crudPage = this;

  // cada vez que cambian los customField se actualiza
  public customField = computed(() => this.crudS.customField());
  // calcula el estilo del dialogo, cada vez que hay un cambio de aplicacion

  // Inyección directa del Router
  protected router = inject(Router);
  private _location = inject(Location);
  private _route = inject(ActivatedRoute);
  private _destroyRef = inject(DestroyRef);

  /** pos leído de la URL que aún no estaba configurado en this.app al momento del constructor */
  private _pendingUrlPos: string | null = null;

  constructor(protected override crudS: CRUDService, pos = '') {
    super(crudS);

    // Obtener pos de la URL si existe, si no usar el del constructor
    const urlParams = new URLSearchParams(this.router.url.split('?')[1] || '');
    const posFromUrl = urlParams.get('pos');

    // Solo usar el pos de la URL si la posición ya está configurada en this.app
    // (las apps se configuran en ngOnInit de cada componente, que corre DESPUÉS del constructor)
    if (posFromUrl && this.app[posFromUrl]) {
      this.changePos(posFromUrl);
    } else {
      // Guardar como pendiente para que initCRUD lo resuelva cuando this.app ya tenga la config
      if (posFromUrl && posFromUrl !== pos) {
        this._pendingUrlPos = posFromUrl;
      }
      this.changePos(pos);
    }
    this.commonSettings();
    this.showComponentLocal(pos);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.showComponentLocal((this.typeDefault || this.pos()) as string, changes);
  }

  private shouldLoadOnStart(pos: any): boolean {
    const loadConfig = this.configGeneral()[pos]?.load;
    if (!loadConfig) return false;

    const isMobile = this.generalS.isMobileScreen();
    return isMobile ? !!loadConfig.load_on_start_mobile : !!loadConfig.load_on_start;
  }

  private syncColumnsState(pos: any): void {
    const safePos = pos ?? 0;
    this.removeColumns.set(this.itemsRemove[safePos] || this.itemsRemove[0]);
    this.cols.set((this.columns[safePos] || []) as any);

    this.fieldConfig.update(cfg => ({
      ...cfg,
      cols: this.cols(),
      fields: this.crudS.fieldsForm(pos),
      app: safePos,
    }));
    this.fieldExport.update(exp => ({ ...exp, cols: this.cols() }));
  }

  showComponentLocal(pos: string, changes: any = {}) {
    this.showComponentSignal.update(value => ({
      ...value,
      [pos]: {
        local: true,
        create: false,
        read: false,
        update: false,
        delete: false,
        field: {}
      }
    }));

    const currentValue = changes?.showComponent?.currentValue;
    if (!currentValue) return;

    // Cuando el componente se crea dinámicamente, ngOnChanges puede ejecutarse
    // antes de ngOnInit. En ese momento this.app[pos] aún no existe y termina
    // llamando OPTIONS a /undefined/. Reintentamos en microtarea cuando la app
    // ya esté inicializada.
    if (!this.app[pos]) {
      Promise.resolve().then(() => {
        if (this.app[pos]) {
          this.showComponentLocal(pos, { showComponent: { currentValue } });
        }
      });
      return;
    }

    //actulizar this.showComponentSignal para cambiar local por false
    this.showComponentSignal.update(value => ({
      ...value,
      [pos]: {
        ...value[pos as any],
        local: false
      }
    }));

    if (currentValue.create) {
      this.showComponentSignal.update(value => ({
        ...value,
        [pos]: {
          ...value[pos as any],
          local: false,
          create: true
        }
      }));
      this.openNew({ pos });
    } /*else if (currentValue.update) {
    this.showComponentSignal.update(value => ({
      ...value,
      [pos]: {
        ...value[pos],
        local: false,
        update: true
      }
    }));
    this.edit(pos);
  }*/ else if (currentValue.delete) {
      this.showComponentSignal.update(value => ({
        ...value,
        [pos]: {
          ...value[pos as any],
          local: false,
          delete: true
        }
      }));
      this.delete(pos);
    } else if (currentValue.read) {
      this.showComponentSignal.update(value => ({
        ...value,
        [pos]: {
          ...value[pos as any],
          local: false,
          read: true
        }
      }));
      this.getAll({ pos });
    }
  }

  /**
   * Inicializa la carga de datos (esto se ejecuta depues del constructor, por lo tanto, hay funciones que se ejcutan antes,
   * como ini Param)
   * @param options filtros iniciale de la consulta
   */
  initCRUD(options: { node?: boolean; filter?: string } = {}): void {

    // Resolver pos pendiente de la URL (el constructor lo guardó porque this.app aún no estaba listo)
    if (this._pendingUrlPos && this.app[this._pendingUrlPos]) {
      this.changePos(this._pendingUrlPos);
      this._pendingUrlPos = null;
    }

    const node = options.node ?? false;
    const filter = options.filter ?? '';

    // Verificar configuración de carga automática desde configGeneral
    const pos = this.pos() as any;
    const shouldLoad = this.shouldLoadOnStart(pos);
    const silentLoadMessage = !!this.configGeneral()[pos]?.load?.silent;
    //console.log(`[initCRUD] pos="${pos}" | isMobile=${isMobile} | loadConfig=`, loadConfig, `| shouldLoad=${shouldLoad}`);
    if (shouldLoad) {
      this.getAll({ pos, node, filter }); // carga los elementos al inicio
    } else if (!silentLoadMessage) {
      this.showBlocked(false); // asegurar que no quede bloqueado si la autocarga no está activa
      this.messageS.changeMessage('Autocarga deshabilitada, cargue manualmente en el botón de actualizar.', null, {}, 'info');
    } else {
      this.showBlocked(false);
    }
    //console.log('1 initCRUD selected Columns');

    this.configForm = this.fb.group({
      columns: [this.selectedColumns().map((column: any) => column.field), [Validators.required]],
      filters: this.fb.group({}),
      filters_query: ['']
    });
    //this.getClassifierLevelsGlogal();
    //this.getClassifierGlobal();
    this.searchRemote = undefined;

    // Suscribirse a cambios de queryParams para que al navegar entre ?pos=X
    // dentro del mismo componente se cambie la posición y recargue datos.
    // Se usa `skip(1)` para ignorar la emisión inicial (ya resuelta por _pendingUrlPos
    // o por shouldLoad arriba), y solo reaccionar a navegaciones posteriores.
    let _firstEmit = true;
    this._route.queryParams.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(params => {
      const newPos = params['pos'];
      if (_firstEmit) {
        _firstEmit = false;
        // Si shouldLoad fue false y el pos de la URL difiere del typeDefault,
        // forzar la carga ahora (el usuario navegó explícitamente a esta URL).
        if (!shouldLoad && newPos && this.app[newPos] && newPos === pos) {
          this.getAll({ pos: newPos, node, filter });
        }
        return;
      }
      // Navegaciones posteriores dentro del mismo componente
      if (newPos && newPos !== this.pos() && this.app[newPos]) {
        this.changePos(newPos);
        this.getAll({ pos: newPos });
      }
    });
  }

  dialogSizeClass(drawFormData: any): string {
    // Verificar que drawFormData existe y tiene dialog
    if (!drawFormData || !drawFormData['dialog']) {
      return 'width-650px-custom min-height-550px-custom'; // Valores por defecto
    }

    const dialog = drawFormData['dialog'];
    let width = dialog['height'] ? dialog['height'] : 'width-650px-custom';
    let height = dialog['width'] ? dialog['width'] : 'min-height-550px-custom';
    return `${width} ${height}`;
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
    let fields: string = 'sys,status,tasks,';
    const posIndex = this.pos() || 0; // Asegurarse de que posIndex tenga un valor válido

    // si no envia nada, toma los seleccionados
    const selectedColumns = arr.length > 0 ? arr : this.selectedColumns();

    const fields_prefixes = this.drawForm()[posIndex]?.fields_prefixes || {};
    // Lista plana de strings para detectar si el field empieza con algún prefijo,
    // tolerando ambas formas (array de strings o objeto { prefix: config }).
    const prefixList: string[] = Array.isArray(fields_prefixes)
      ? fields_prefixes.filter((p: any) => typeof p === 'string')
      : Object.keys(fields_prefixes);

    selectedColumns.forEach((obj) => {

      //debe saltarse el valor si el campo inicial igual que cualquieda de los valores de array fields_prefixes
      if (prefixList.length && prefixList.some(prefix => obj.field.startsWith(prefix))) {
        return;
      }

      //estrategicamente va al inicio
      //|||esta primera parte tambiene sta pensada para los productos
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

    this.fields[posIndex] = include + fields.slice(0, -1);
    this.include[posIndex] = include.slice(0, -1);
  }

  styleClassDialog = signal<string>('width-650px-custom min-height-550px-custom');
  //hideDialogMobile = signal<boolean>(this.generalS.isMobileScreen());

  /**
   * Identifica si se campio de app e inicializa los valores correnpondientes
   * @param pos nombre de la app/posición
   */
  changePos(pos: any): void {

    this.pos.set(pos);
    if (!this.drawForm()[pos]) {
      const drawForm = this.crudS.drawForm(pos);
      this.drawForm()[pos] = drawForm;
      this.type[pos] = pos;
      this.unifyDialog(pos, drawForm?.dialog);
    }

    if (!this.configGeneral()[pos]) {
      this.configGeneral.set({
        ... this.configGeneral(),
        [pos]: this.crudS.configGeneral(pos)
      });
    }

    const safePos = pos ?? 0; // Crear una variable segura para usar como índice
    this.crudS.type = this.type[safePos];
    this.crudS.app = this.app[safePos];

    if (this.posBefore != pos) {

      // Calcular la URL con el pos actual (se usa tanto para replaceState como para lastVisited)
      const currentUrl = this._location.path() || this.router.url;
      const urlWithoutParams = currentUrl.split('?')[0];
      const newUrl = `${urlWithoutParams}?pos=${pos}`;

      // Actualizar la URL silenciosamente solo cuando no estamos resolviendo un pendingUrlPos
      // (en ese caso la URL ya tiene el ?pos correcto porque el usuario navegó a ella)
      if (this.router && pos && !this._pendingUrlPos) {
        this._location.replaceState(newUrl);
        try { localStorage.setItem('lastModuleUrl', newUrl); } catch (_) { }
      }

      // Guardar icono en historial de breadcrumb siempre (incluso al resolver pendingUrlPos)
      if (this.router && pos) {
        const appTypeObj = this.crudS.getAppType(pos);
        if (appTypeObj) {
          let history = JSON.parse(localStorage.getItem('lastVisited') || '[]');
          const entry = { icon: appTypeObj.icon, url: newUrl, name: appTypeObj.name };
          history = history.filter((h: any) => h.url !== entry.url);
          history.unshift(entry);
          if (history.length > 5) history = history.slice(0, 5);
          localStorage.setItem('lastVisited', JSON.stringify(history));
          this.crudS.lastVisitedChanged$.next();
        }
      }

      this.syncColumnsState(pos);

      // Asegurar que dialogSizeClass devuelve un string válido
      const dialogClass = this.dialogSizeClass(this.drawForm()[pos]);
      this.styleClassDialog.set(dialogClass || 'width-650px-custom min-height-550px-custom');
      /*const pos_shareable = pos.toString().replace(/-/g, '_');
      this.crudS.registerVisit(pos_shareable);*/

      //busca los parametros del servidor para la paginación dependiendo si es pantalla movil o no, si no existe toma por defecto
      const isMobileScreen = this.generalS.isMobileScreen();
      const pagination = this.configGeneral()[safePos]?.pagination || {};
      const limit = isMobileScreen ? pagination.rows_mobile : pagination.rows;
      this.limit.set({
        ...this.limit(),
        [safePos]: limit || this.limit()[0]
      });

      //this.hideDialogMobile.set(this.generalS.isMobileScreen() && this.drawForm()[pos]?.dialog?.hide_mobile);

      // Generar la cadena de filtros a partir de los fields de la posición actual.
      // Se ejecuta siempre que cambie la posición para que getAll2 use los filtros
      // persistentes sin necesidad de consultar el servidor.


      //quitar temporal is_active
      //this.filter = this.crudS.buildFilterString(this.crudS.fieldsForm(pos));
      console.log('antes de ini Param  de changePos');

      this.iniParam();
    }
    if (this.columns[safePos]) {
      //aveces cuanso se llama a change Pos todavia no hay this.columns[pos], si ese es el caso
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
    if (!Array.isArray(values)) {
      return -1;
    }
    const index = values.indexOf(value);
    if (index !== -1 && deleteVal) {
      values.splice(index, 1);
    }
    return index;
  }


  /**
   * 
   * @param options 
   */
  openTasksDetail(options: { pos: any, formFields: any, childFormFields: any, parentField: any }) {

    const pos = options.pos;
    const formFields = options.formFields;
    let draw = options.childFormFields?.draw;
    const fields = options.childFormFields?.fields;
    const draw_child: any = []

    if (draw) {

      Object.keys(draw).forEach(keyBase => {
        if (keyBase == 'dialog' || keyBase === '') return;

        const drawLayOut = draw[keyBase];
        // Recorre todos los objetos y agrega controles dinámicamente
        Object.keys(drawLayOut).forEach(key => {
          const fieldData = drawLayOut[key];
          const field = fields[fieldData.field];

          // Toma directamente el field del diccionario
          if (field) {

            const active = field?.default?.active || false;
            const value = field?.default?.value || null;
            let defaultValue = value;
            const edit = field?.default?.edit !== false; // si edit no está definido, se asume true
            if (active && edit) {
              if (value == 'device') {
                defaultValue = new Date();
              } else if (value === 'current') {
                defaultValue = null;
              } else {
                defaultValue = value;
              }
            }

            // Si edit es false o readonly es true, el campo debe ser disabled
            const disabled = field.readonly || !edit;

            // Guardar el estado readonly en la variable para saber que campos debe deshabilitar al guardar
            if (disabled) {
              if (!this.initialDisabledForm[pos]) {
                this.initialDisabledForm[pos] = {};
              }
              this.initialDisabledForm[pos][fieldData.field] = true;
            }

            const validators: any[] = [];
            // Agrega validadores si es requerido
            if (field.required) {
              validators.push(Validators.required);
            }

            if (field.max_length) {
              validators.push(Validators.maxLength(field.max_length));
            }

            if (field.min_length) {
              validators.push(Validators.minLength(field.min_length));
            }

            // Crear campo oculto para objetos completos en campos de tipo select
            if (field.type === 'dropdown' || field.type === 'auto-complete' || field.type === 'tree-select') {
              const hiddenFieldName = 'object_' + fieldData.field;

              // Crear validadores para el campo oculto
              /*  
                const hiddenValidators: any[] = [];
  
                // Agrega validadores si es requerido
                if (field.required) {
                  hiddenValidators.push(Validators.required);
                }
  
                if (field.max_length) {
                  hiddenValidators.push(Validators.maxLength(field.max_length));
                }
  
                if (field.min_length) {
                  hiddenValidators.push(Validators.minLength(field.min_length));
                }
              */

              formFields[hiddenFieldName] = this.fb.control(
                { value: defaultValue, disabled: disabled },
                { nonNullable: false, validators: validators }
              );

              //quita expliictamente required cuando es drowpdown, auto-complete o tree-select PARA QUE LOS CAMPOS QUE NO
              // CONTIENE object_ no se quejen si son obligatorios, pero despues de haberlo establecido al que inicio con object_
              validators.splice(validators.indexOf(Validators.required), 1);

              // se le agrega object_ al elemento que se va a dibujar para poder dejar el nombre del campo libre y agregarle el onjeto con id y name
              // Solo agregar object_ si no lo tiene ya
              if (!field.field.startsWith('object_' + options.parentField)) {
                field.field = 'object_' + field.field;
              }



              //si field trae children recorre el objecto (no es array para que no se recorre con forEach)
              if (field.children && field.children.fields) {
                //tambien le agrega a los campos que estan dentro del children, es decir, aquellos que van a recibir los valores
                //en cascada

                // Iterar primero por tipos: static, dynamic, derived
                ['static', 'dynamic', 'derived'].forEach(typeKey => {
                  if (field.children.fields[typeKey]) {
                    for (const [fieldKey, fieldValue] of Object.entries(field.children.fields[typeKey])) {
                      const typedFieldValue = fieldValue as any;

                      //solo necesita cambiar el campo de los siguientes tipos porque son los unicos que requieren cambio
                      //para poder ser duplicados y se pueda enviar el objeto en lugar de solo el id como lo hace el form
                      if (typedFieldValue.type === 'dropdown' || typedFieldValue.type === 'auto-complete' || typedFieldValue.type === 'tree-select') {
                        // Solo agregar object_ si no lo tiene ya
                        const newFieldKey = fieldKey.startsWith('object_' + options.parentField) ? fieldKey : 'object_' + fieldKey;

                        // Actualizar dentro del grupo de tipo
                        field.children.fields[typeKey][newFieldKey] = typedFieldValue;
                        delete field.children.fields[typeKey][fieldKey];
                      }
                    }
                  }
                });
              }
            }
            //los validadores para los campos ocultos no aplican porque los detiene su equivalente de dropdown, auto-complete y tree-select
            //en teoria no debria causra problema esto ya que cuando se asigna el valor visible tambien al campo oculto

            //si field.type es signature agregarlo en this.fb.array<FirmaGroup>
            if (field.type === 'signature') {

              const subFields = field.fields || [];

              // Crear objeto dinámico para el FormGroup basado en subFields
              const signatureFormGroup: any = {};

              // Procesar cada campo en subFields
              subFields.forEach((subField: any) => {
                const fieldName = subField.field;
                const fieldType = subField.type;
                const required = subField.required || false;
                const maxLength = subField.max_length;

                // Crear validadores según configuración
                const validators: any[] = [];
                if (required) {
                  validators.push(Validators.required);
                }
                if (maxLength) {
                  validators.push(Validators.maxLength(maxLength));
                }

                // Valor por defecto
                let defaultValue: any = '';

                // Procesar valor por defecto si existe
                if (subField.default) {
                  const active = subField.default.active || false;
                  const value = subField.default.value || null;
                  const subEdit = subField.default.edit !== false; // si edit no está definido, se asume true

                  if (active && subEdit) {
                    if (value === 'device') {
                      defaultValue = new Date();
                    } else if (value === 'current') {
                      defaultValue = null;
                    } else {
                      defaultValue = value;
                    }
                  }
                }

                // Determinar si el campo debe ser de solo lectura
                const isReadonly = subField.default?.edit === false || subField.readonly || disabled;

                // Agregar campos según el tipo
                if (fieldType === 'login') {
                  // Para tipo login, agregar los campos user y password
                  const userField = subField.user?.field || 'username';
                  const passwordField = subField.password?.field || 'password';

                  //console.log('-------', fieldName, userField, passwordField);


                  const userValidators: any[] = [];
                  const passwordValidators: any[] = [];

                  if (required) {
                    userValidators.push(Validators.required);
                    passwordValidators.push(Validators.required);
                  }

                  if (maxLength) {
                    userValidators.push(Validators.maxLength(maxLength));
                    passwordValidators.push(Validators.maxLength(maxLength));
                  }

                  signatureFormGroup[userField] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, userValidators);
                  signatureFormGroup[passwordField] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, passwordValidators);

                } else if (fieldType === 'input-text') {
                  signatureFormGroup[fieldName] = this.fb.nonNullable.control({ value: defaultValue, disabled: isReadonly }, validators);

                } else if (fieldType === 'date') {
                  // Si defaultValue es 'current', inicializarlo con null
                  if (defaultValue === 'current') {
                    defaultValue = null;
                  }
                  signatureFormGroup[fieldName] = this.fb.nonNullable.control({ value: defaultValue || null, disabled: isReadonly }, validators);

                } else if (fieldType === 'signature-pad') {
                  signatureFormGroup[fieldName] = this.fb.control<string | null>({ value: null, disabled: isReadonly }, validators);

                } else if (fieldType === 'selfie') {
                  signatureFormGroup[fieldName] = this.fb.control<File | string | null>({ value: null, disabled: isReadonly }, validators);

                } else if (fieldType === 'pin_global' || fieldType === 'pin_user') {
                  signatureFormGroup[fieldName] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, validators);

                } else {
                  // Tipo genérico
                  signatureFormGroup[fieldName] = this.fb.control({ value: defaultValue, disabled: isReadonly }, validators);
                }
              });

              // Crear el FormArray con el FormGroup dinámico
              formFields[fieldData.field] = this.fb.array<FormGroup>([
                this.fb.group(signatureFormGroup)
              ]);

              //console.log('FormGroup de firma creado:', signatureFormGroup);

            } else if (field.type === 'table') {
              // Procesar tipo table - crear FormArray con FormGroups para cada fila
              const columns = field.columns || [];
              const initialRows = field.initial_rows || 0;
              const isRequired = field.required || false;

              // Validador personalizado para FormArray: requiere al menos una fila
              const minLengthArrayValidator = (min: number): ValidatorFn => {
                return (control: AbstractControl): ValidationErrors | null => {
                  if (control instanceof FormArray) {
                    return control.length < min ? { 'minlength': { requiredLength: min, actualLength: control.length } } : null;
                  }
                  return null;
                };
              };

              // Crear función para generar un FormGroup vacío para una fila
              const createRowFormGroup = () => {
                const rowGroup: any = {};

                columns.forEach((column: any) => {
                  const columnField = column.field;
                  const columnType = column.type;
                  const required = column.required || false;
                  const editable = column.editable !== false;

                  // Crear validadores según configuración de columna
                  const columnValidators: any[] = [];
                  if (required && editable) {
                    columnValidators.push(Validators.required);
                  }
                  if (column.validation?.max_length) {
                    columnValidators.push(Validators.maxLength(column.validation.max_length));
                  }
                  if (column.validation?.min_length) {
                    columnValidators.push(Validators.minLength(column.validation.min_length));
                  }

                  // Valor por defecto según tipo de columna
                  let defaultColumnValue: any = '';

                  if (columnType === 'input-number') {
                    defaultColumnValue = null;
                  } else if (columnType === 'date') {
                    defaultColumnValue = null;
                  } else if (columnType === 'dropdown' || columnType === 'multi-select') {
                    defaultColumnValue = columnType === 'multi-select' ? [] : '';
                  } else if (columnType === 'checkbox') {
                    defaultColumnValue = false;
                  }

                  // Crear control para la columna
                  if (columnType === 'checkbox') {
                    rowGroup[columnField] = this.fb.control(defaultColumnValue, columnValidators);
                  } else {
                    rowGroup[columnField] = this.fb.control(defaultColumnValue, columnValidators);
                  }
                });

                return this.fb.group(rowGroup);
              };

              // Crear array con filas iniciales
              const initialRowsArray: FormGroup[] = [];
              for (let i = 0; i < initialRows; i++) {
                initialRowsArray.push(createRowFormGroup());
              }

              // Crear validadores del FormArray (si la tabla es requerida, debe tener al menos una fila)
              const arrayValidators: ValidatorFn[] = [];
              if (isRequired) {
                arrayValidators.push(minLengthArrayValidator(1)); // Al menos una fila
              }

              // Crear el FormArray con validadores
              formFields[fieldData.field] = this.fb.array<FormGroup>(initialRowsArray, arrayValidators);

            } else if (field.type === 'date') {
              // Procesar tipo date fuera de signature
              let dateDefaultValue = defaultValue;

              // Si defaultValue es 'current', inicializarlo con null
              if (dateDefaultValue === 'current') {
                dateDefaultValue = null;
              }

              formFields[fieldData.field] = this.fb.control(
                { value: dateDefaultValue, disabled: disabled },
                { nonNullable: true, validators: validators }
              );
              formFields[fieldData.field].updateValueAndValidity();

            } else {

              formFields[fieldData.field] = this.fb.control(
                { value: defaultValue, disabled: disabled },
                { nonNullable: true, validators: validators }
              );
              formFields[fieldData.field].updateValueAndValidity();
            }
          }
          draw_child.push(field);
        });

        if (options.parentField == 'parent_form_data_') {

          this.drawForm()[pos + '_' + 'child_form_fields'] = {};
          this.drawForm()[pos + '_' + 'child_form_fields'][keyBase] = draw_child;
        }
      });
    }
  }

  /**
   * Agrega campos al formulario filtrando por prefijo de campo
   * @param formFields - Referencia al objeto de campos del formulario
   * @param dynamicFields - Objeto con la estructura de campos dinámicos (contiene nodos con grid/nested)
   * @param fieldPrefix - Cadena raíz para filtrar los campos (ej: 'request_data_')
   */
  addFieldsByPrefix(formFields: any, dynamicFields: any, fieldPrefix: string, pos: string) {

    if (!dynamicFields || typeof dynamicFields !== 'object') {
      return;
    }

    // Iterar sobre todos los nodos del objeto dinámico, excluyendo dialog y fields_prefixes
    Object.keys(dynamicFields).forEach(nodeKey => {
      //console.log(nodeKey);

      if (nodeKey === 'dialog' || nodeKey === 'fields_prefixes') {
        return; // Saltar estos nodos
      }

      const node = dynamicFields[nodeKey];
      if (!node || typeof node !== 'object') return;

      // Array para almacenar múltiples layouts a procesar
      const layoutsToProcess: any[] = [];

      // Buscar grid o nested dentro del nodo
      if (node.grid && typeof node.grid === 'object') {
        layoutsToProcess.push(node.grid);
      } else if (node.nested && typeof node.nested === 'object') {
        layoutsToProcess.push(node.nested);
      }

      // Buscar stepper dentro del nodo
      if (node.stepper && typeof node.stepper === 'object' && node.stepper.steps) {
        // Iterar sobre cada step del stepper y agregar sus fields
        Object.keys(node.stepper.steps).forEach(stepKey => {
          const step = node.stepper.steps[stepKey];
          if (step && step.fields && typeof step.fields === 'object') {
            layoutsToProcess.push(step.fields);
          }
        });
      }

      // Si no hay layouts para procesar, saltar este nodo
      if (layoutsToProcess.length === 0) return;

      // Procesar cada layout encontrado (grid, nested, o fields de cada step)
      layoutsToProcess.forEach(fieldsLayout => {
        // Iterar sobre los campos dentro del layout (estructura 0:{field:'', ...}, 1:{field:'', ...})
        Object.keys(fieldsLayout).forEach(key => {
          const fieldData = fieldsLayout[key];
          const fieldName = fieldData?.field;
          if (!fieldName) return;

          // Verificar si el campo inicia con el prefijo especificado
          if (!fieldName.startsWith(fieldPrefix)) {
            return; // Saltar campos que no tienen el prefijo
          }

          // Obtener valores por defecto
          const active = fieldData?.default?.active || false;
          const value = fieldData?.default?.value || null;
          let defaultValue = value;
          const edit = fieldData?.default?.edit !== false; // si edit no está definido, se asume true

          if (active && edit) {
            if (value === 'device') {
              defaultValue = new Date();
            } else if (value === 'current') {
              defaultValue = null;
            } else {
              defaultValue = value;
            }
          }

          // Si edit es false o readonly es true, el campo debe ser disabled
          const disabled = fieldData.readonly || !edit;

          // Guardar el estado readonly en el fieldData para que el template pueda usarlo
          if (disabled) {
            if (!this.initialDisabledForm[pos]) {
              this.initialDisabledForm[pos] = {};
            }
            this.initialDisabledForm[pos][fieldName] = true;
          }

          const validators: any[] = [];

          // Agregar validadores
          if (fieldData.required) {
            validators.push(Validators.required);
          }
          if (fieldData.max_length) {
            validators.push(Validators.maxLength(fieldData.max_length));
          }
          if (fieldData.min_length) {
            validators.push(Validators.minLength(fieldData.min_length));
          }

          // Procesar según el tipo de campo
          if (DROPDOWN_TYPES_PAYLOAD.has(fieldData.type)) {
            // Crear campo oculto para objetos completos
            const hiddenFieldName = 'object_' + fieldName;
            formFields[hiddenFieldName] = this.fb.control(
              { value: defaultValue, disabled: disabled },
              { nonNullable: false, validators: validators }
            );

            //quita expliictamente required cuando es drowpdown, auto-complete o tree-select PARA QUE LOS CAMPOS QUE NO
            // CONTIENE object_ no se quejen si son obligatorios, pero despues de haberlo establecido al que inicio con object_
            validators.splice(validators.indexOf(Validators.required), 1);

            // Agregar prefijo object_ al field si no lo tiene
            if (!fieldData.field.startsWith('object_')) {
              fieldData.field = 'object_' + fieldData.field;
            }

            // Espejar choices en sharedS.data: generateJSONform guardó las choices
            // (tipos Choice / List) bajo la clave `${pos}:${fieldName}` (sin object_),
            // pero el renderer ahora consultará usando el field renombrado
            // `object_${fieldName}`. Replicamos la entrada para que el dropdown
            // encuentre las opciones sin tener que tocar generateJSONform.
            const _sharedData = (this.sharedS as any).data;
            const _origKey = pos + ':' + fieldName;
            const _objectKey = pos + ':object_' + fieldName;
            if (_sharedData && _sharedData[_origKey] !== undefined && _sharedData[_objectKey] === undefined) {
              _sharedData[_objectKey] = _sharedData[_origKey];
            }

            // Si field trae children, recorrer el objeto para procesar campos en cascada
            if (fieldData.children && fieldData.children.fields) {
              // Procesar campos children que recibirán valores en cascada

              // Iterar primero por tipos: static, dynamic, derived
              ['static', 'dynamic', 'derived'].forEach(typeKey => {
                if (fieldData.children.fields[typeKey]) {
                  for (const [childFieldKey, childFieldValue] of Object.entries(fieldData.children.fields[typeKey])) {
                    const typedChildFieldValue = childFieldValue as any;

                    // Solo necesita cambiar el campo de los siguientes tipos porque son los únicos que requieren cambio
                    // para poder ser duplicados y se pueda enviar el objeto en lugar de solo el id
                    if (typedChildFieldValue.type === 'dropdown' || typedChildFieldValue.type === 'auto-complete' || typedChildFieldValue.type === 'tree-select' || typedChildFieldValue.type === 'dropdown-choice' || typedChildFieldValue.type === 'multi-select' || typedChildFieldValue.type === 'select-button') {
                      // Solo agregar object_ si no lo tiene ya
                      const newChildFieldKey = childFieldKey.startsWith('object_' + fieldPrefix) ? childFieldKey : 'object_' + childFieldKey;

                      // [[[II ESC:003-02 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-02
                      // Mantiene alineados la clave del mapa children.fields y el
                      // metadata `field` consumido por custom-draw-form.
                      typedChildFieldValue.field = newChildFieldKey;
                      // ]]]FI
                      fieldData.children.fields[typeKey][newChildFieldKey] = typedChildFieldValue;
                      delete fieldData.children.fields[typeKey][childFieldKey];
                    }
                  }
                }
              });
            }

          } //no lleva else para que carga el el else del if y agregue el campo normal, sin object_
          // ya que los combos el campo normal del form que será para guardar un objeto en lugar del id
          // y un campo que inicie con object para que guarde la referencia al campo del formulario y se pueda poner el rojo
          //y cause los evenetos necesarios para visualizar el usuario

          if (fieldData.type === 'signature') {
            // Procesar campos de firma
            const subFields = fieldData.fields || [];
            const signatureFormGroup: any = {};

            subFields.forEach((subField: any) => {
              const subFieldName = subField.field;
              const fieldType = subField.type;
              const required = subField.required || false;
              const maxLength = subField.max_length;
              const subValidators: any[] = [];
              if (required) subValidators.push(Validators.required);
              if (maxLength) subValidators.push(Validators.maxLength(maxLength));

              let subDefaultValue: any = '';
              if (subField.default?.active && subField.default?.edit) {
                subDefaultValue = subField.default.value === 'device' ? new Date() : (subField.default.value === 'current' ? null : subField.default.value);
              }

              // Determinar si el campo debe ser de solo lectura
              const isReadonly = subField.default?.edit === false;


              if (fieldType === 'login') {
                const userField = subField.user?.field || 'username';
                const passwordField = subField.password?.field || 'password';
                const loginValidators: any[] = required ? [Validators.required] : [];
                if (maxLength) loginValidators.push(Validators.maxLength(maxLength));

                signatureFormGroup[userField] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, loginValidators);
                signatureFormGroup[passwordField] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, loginValidators);
              } else if (fieldType === 'input-text') {
                signatureFormGroup[subFieldName] = this.fb.nonNullable.control({ value: subDefaultValue, disabled: isReadonly }, subValidators);
              } else if (fieldType === 'date') {
                //si subDefaultValue==current entonces inicializalo con null, hacerlo de solo lectura y quitar el validador de requerido
                //console.log('entro a fecha222222222222222222222');

                if (subDefaultValue === 'current') {
                  //console.log("dejo en null la fecha 333333333333333");

                  subDefaultValue = null;
                  //subValidators.splice(subValidators.indexOf(Validators.required), 1);
                }

                signatureFormGroup[subFieldName] = this.fb.nonNullable.control({ value: subDefaultValue, disabled: isReadonly }, subValidators);
              } else if (fieldType === 'signature-pad') {
                signatureFormGroup[subFieldName] = this.fb.control<string | null>({ value: null, disabled: isReadonly }, subValidators);
              } else if (fieldType === 'selfie') {
                signatureFormGroup[subFieldName] = this.fb.control<File | string | null>({ value: null, disabled: isReadonly }, subValidators);
              } else if (fieldType === 'pin_global' || fieldType === 'pin_user') {
                signatureFormGroup[subFieldName] = this.fb.nonNullable.control({ value: '', disabled: isReadonly }, subValidators);
              } else {
                signatureFormGroup[subFieldName] = this.fb.control({ value: subDefaultValue, disabled: isReadonly }, subValidators);
              }
            });

            formFields[fieldName] = this.fb.array<FormGroup>([this.fb.group(signatureFormGroup)]);

          } else if (fieldData.type === 'table') {
            // Procesar tipo table
            const columns = fieldData.columns || [];
            const initialRows = fieldData.initial_rows || 0;
            const isRequired = fieldData.required || false;

            // Validador personalizado para FormArray
            const minLengthArrayValidator = (min: number): ValidatorFn => {
              return (control: AbstractControl): ValidationErrors | null => {
                if (control instanceof FormArray) {
                  return control.length < min ? { 'minlength': { requiredLength: min, actualLength: control.length } } : null;
                }
                return null;
              };
            };

            const createRowFormGroup = () => {
              const rowGroup: any = {};
              columns.forEach((column: any) => {
                const columnValidators: any[] = [];
                if (column.required && column.editable !== false) {
                  columnValidators.push(Validators.required);
                }
                if (column.validation?.max_length) {
                  columnValidators.push(Validators.maxLength(column.validation.max_length));
                }
                if (column.validation?.min_length) {
                  columnValidators.push(Validators.minLength(column.validation.min_length));
                }

                let defaultColumnValue: any = '';
                if (column.type === 'input-number') defaultColumnValue = null;
                else if (column.type === 'date') defaultColumnValue = null;
                else if (column.type === 'dropdown' || column.type === 'multi-select') {
                  defaultColumnValue = column.type === 'multi-select' ? [] : '';
                } else if (column.type === 'checkbox') defaultColumnValue = false;

                rowGroup[column.field] = this.fb.control(defaultColumnValue, columnValidators);
              });
              return this.fb.group(rowGroup);
            };

            const initialRowsArray: FormGroup[] = [];
            for (let i = 0; i < initialRows; i++) {
              initialRowsArray.push(createRowFormGroup());
            }

            const arrayValidators: ValidatorFn[] = [];
            if (isRequired) arrayValidators.push(minLengthArrayValidator(1));

            formFields[fieldName] = this.fb.array<FormGroup>(initialRowsArray, arrayValidators);

          } else if (fieldData.type === 'date') {
            // Procesar tipo date
            let dateDefaultValue = defaultValue;

            // Si defaultValue es 'current', inicializarlo con null
            if (dateDefaultValue === 'current') {
              dateDefaultValue = null;
            }

            formFields[fieldName] = this.fb.control(
              { value: dateDefaultValue, disabled: disabled },
              { nonNullable: true, validators: validators }
            );
            formFields[fieldName].updateValueAndValidity();

          } if (fieldData.type === 'files') {
            // [[[II Escenario 1/2 — campo `files` (relación M2M o relación hija).
            // Reglas confirmadas con usuario (docs/documents/2026-05-16_001):
            //   - `{prefix}files`     → valor inicial = default.value ([]). Almacena
            //                           [{id, type}] cuando el usuario usa subida
            //                           directa. NO se registra como relationship
            //                           JSON:API: el valor viaja en `attributes`.
            //   - `{prefix}documents` → valor inicial = default.value ([]). Almacena
            //                           base64 cuando el usuario usa "(formulario)".
            //                           En submit, [] se transforma a null.
            //   - root.required=true se propaga a:
            //       · documents si upload.active (solo cuando key == field)
            //       · files     si server_upload.active
            //       · key ctrl  si upload.active Y key != field (per-step stepper)
            //       (si ambos activos → ambos requeridos; appendFile y
            //        _pushServerFileToForm limpian el opuesto al llenar uno).
            //   - upload.required / server_upload.required SOLO endurecen su lado.
            // Escenario multi-step (key != field): cuando dos o más steps usan el
            //   mismo `field` pero con `key` distintos (p.e. _inicial/_final), se
            //   crea un FormControl per-step para cada key. El sibling `*_documents`
            //   se crea sin required (es almacenamiento compartido). Esto permite que
            //   formErrors() valide cada step de forma independiente.
            // Importante: las relaciones padres/hijas `relacion_data_*` NO son
            // exclusivas de files; este bloque ataca solo cuando el field es
            // de tipo `files`. Otros tipos (date, dropdown, etc.) caen en sus
            // ramas correspondientes arriba/abajo. ]]]FI
            const upload = fieldData.upload || {};
            const serverUpload = fieldData.server_upload || {};
            const initialValue = Array.isArray(fieldData?.default?.value)
              ? fieldData.default.value
              : (fieldData?.default?.value ?? []);

            // Detectar si hay un key per-step (key != field → stepper multi-step)
            const perStepKey = fieldData.key;
            const hasPerStepKey = !!(perStepKey
              && perStepKey !== fieldName
              && perStepKey !== fieldPrefix + 'documents'
              && fieldPrefix !== 'form_fields_data_');

            // Reaprovechamos validators que ya trae max_length/min_length y
            // quitamos required, para añadirlo selectivamente abajo.
            const baseValidators = validators.filter((v: any) => v !== Validators.required);

            const filesValidators: any[] = [...baseValidators];
            const documentsValidators: any[] = [...baseValidators];

            // Cuando hay control per-step, *_documents no porta required:
            // el required va al control per-step (perStepKey).
            if (fieldData.required && upload.active && !hasPerStepKey) {
              documentsValidators.push(Validators.required);
            }
            if (fieldData.required && serverUpload.active) {
              filesValidators.push(Validators.required);
            }
            if (fieldData.required && !upload.active && !serverUpload.active) {
              // Sin sub-modos declarados: required aplica al control base files.
              filesValidators.push(Validators.required);
            }
            if (upload.required && !hasPerStepKey) {
              documentsValidators.push(Validators.required);
            }
            if (serverUpload.required) {
              filesValidators.push(Validators.required);
            }

            formFields[fieldName] = this.fb.control(
              { value: initialValue, disabled: disabled },
              { nonNullable: false, validators: filesValidators }
            );

            // El control `{prefix}documents` solo se crea cuando NO estamos
            // dentro de form_fields_data_ (Escenario 3 no usa documents).
            if (fieldPrefix !== 'form_fields_data_') {
              formFields[fieldPrefix + 'documents'] = this.fb.control(
                { value: initialValue, disabled: disabled },
                { nonNullable: false, validators: documentsValidators }
              );
            }

            // Control per-step: un FormControl independiente por key distinto.
            // Se protege con !formFields[perStepKey] para no sobreescribir si
            // ya fue creado al procesar otro step con el mismo field.
            if (hasPerStepKey && !formFields[perStepKey]) {
              const perStepValidators: any[] = [...baseValidators];
              if (fieldData.required && upload.active) {
                perStepValidators.push(Validators.required);
              }
              if (upload.required) {
                perStepValidators.push(Validators.required);
              }
              formFields[perStepKey] = this.fb.control(
                { value: null, disabled: disabled },
                { nonNullable: false, validators: perStepValidators }
              );
            }

            formFields[fieldName].updateValueAndValidity();

          } else {
            // AQUI VUELVEN A CAER LOS dropdown, auto-complete y tree-select y agrega las validaciones al form del campo principa
            formFields[fieldName] = this.fb.control(
              { value: defaultValue, disabled: disabled },
              { nonNullable: true, validators: validators }
            );
            formFields[fieldName].updateValueAndValidity();

          }
        }); // Cierre del forEach de campos (fieldsLayout)
      }); // Cierre del forEach de layouts (layoutsToProcess)
    }); // Cierre del forEach de nodos (dynamicFields)
  }

  // ============================================================================
  // HELPERS para escenarios de campos `files` (1, 2 y 3)
  // ----------------------------------------------------------------------------
  // ESCENARIO 1: campo `files` del modelo principal (relación M2M) + `documents`
  // ESCENARIO 2: campos `files` en modelos relacionados (addFieldsByPrefix)
  // ESCENARIO 3: campos `files` dentro de form_data / form_fields_data_*
  // ============================================================================

  /**
   * Normaliza `drawForm[pos].fields_prefixes` a un array de objetos
   * `{ prefix, config }` con compatibilidad hacia atrás.
   *
   * Acepta:
   *   - Array de strings legacy:        ['request_data_', 'form_fields_data_']
   *   - Objeto nuevo con config:         { 'maintenance_document_data_': { data_type:'document', kind:'child' } }
   *
   * Siempre garantiza que el prefijo `form_fields_data_` esté presente.
   */
  protected _normalizeFieldsPrefixes(pos: any): { prefix: string; config: any }[] {
    const draw = this.drawForm()[pos];
    const raw = draw?.fields_prefixes;
    const out: { prefix: string; config: any }[] = [];
    const seen = new Set<string>();

    const push = (prefix: string, config: any = {}) => {
      if (!prefix || seen.has(prefix)) return;
      seen.add(prefix);
      out.push({ prefix, config: config || {} });
    };

    if (Array.isArray(raw)) {
      // Formatos soportados dentro del array:
      //   - 'prefix_'                              (legacy)
      //   - { prefix:'prefix_', kind, data_type }  (forma autodescriptiva)
      //   - { 'prefix_': { kind, data_type, filter } }  (forma compacta real)
      for (const p of raw) {
        if (typeof p === 'string') {
          push(p);
        } else if (p && typeof p === 'object') {
          if (typeof (p as any).prefix === 'string') {
            push((p as any).prefix, p);
          } else {
            for (const [prefix, config] of Object.entries(p)) push(prefix, config);
          }
        }
      }
    } else if (raw && typeof raw === 'object') {
      for (const [prefix, config] of Object.entries(raw)) push(prefix, config);
    }

    // Garantizar siempre form_fields_data_ (Escenario 3)
    push('form_fields_data_');
    return out;
  }

  /**
   * Recorre recursivamente el drawForm de una posición para detectar si bajo el
   * `prefix` existe al menos un campo `type === 'files'`. Lo usamos para decidir
   * si hay que hacer GETs de relaciones secundarias (Escenario 2).
   */
  protected _prefixHasFilesField(pos: any, prefix: string): boolean {
    const draw = this.drawForm()[pos];
    if (!draw) return false;
    let found = false;
    const walk = (node: any) => {
      if (found || !node || typeof node !== 'object') return;
      if (node.type === 'files' && typeof node.field === 'string' && node.field.startsWith(prefix)) {
        found = true;
        return;
      }
      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(draw);
    return found;
  }

  /**
   * ESCENARIO 3: aplana el dict `form_data` que ahora trae el servidor para que
   * la lógica existente del formulario encuentre los valores en la raíz del
   * item al hacer `reset(selected)`.
   *
    * Reglas (basadas en cómo `addFieldsByPrefix` genera los controles):
   *   - Dropdowns y derivados (`dropdown`, `auto-complete`, `tree-select`,
    *     `dropdown-choice`, `multi-select`, `select-button`) crean DOS controles:
    *       · `object_<field>` → control enlazado al dropdown (debe recibir el id).
    *       · `<field>`        → control espejo para payload.
    *     En edit dejamos ambos con el id escalar; si el usuario cambia la
    *     selección, `app-custom-draw-form` vuelve a poblar `<field>` con el dict.
   *   - `files`: array (URLs o base64). Va a `<field>`.
   *   - Resto (escalares, fechas, booleanos): valor tal cual a `<field>`.
   *
   * Mutates `data` y devuelve la misma referencia para encadenar.
   */
  protected _flattenFormData(data: any, pos: any): any {
    if (!data || typeof data !== 'object') return data;
    const fd = data.form_data;
    if (!fd || typeof fd !== 'object' || Array.isArray(fd)) return data;

    // [[[II DROPDOWN_TYPES_PAYLOAD: fuente única en utils/dropdown-types.const.ts ]]]FI
    // field -> type según el drawForm de esta posición.
    // Importante: `addFieldsByPrefix` renombra `fieldData.field` a `object_<field>`
    // para los dropdowns, por lo que buscamos también por ese alias.
    const typeByField: { [k: string]: string } = {};
    const draw = this.drawForm()[pos];
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      const f = node.field;
      if (typeof f === 'string' && (f.startsWith('form_fields_data_') || f.startsWith('object_form_fields_data_'))) {
        const canonical = f.startsWith('object_') ? f.slice('object_'.length) : f;
        if (node.type) typeByField[canonical] = node.type;
      }
      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(draw);

    for (const [k, v] of Object.entries(fd)) {
      const t = typeByField[k];
      if (t && DROPDOWN_TYPES_PAYLOAD.has(t)) {
        const normalizedId = (v && typeof v === 'object' && !Array.isArray(v)) ? (v as any).id : v;
        // El dropdown se enlaza al control `object_<field>` y matchea por id.
        if (!('object_' + k in data)) data['object_' + k] = normalizedId;
        // El control espejo queda con el id; si el usuario toca el campo luego,
        // custom-draw-form lo convertirá al dict completo usando las opciones.
        if (!(k in data)) data[k] = normalizedId;
      } else {
        if (!(k in data)) data[k] = v;
      }
    }
    return data;
  }

  /**
   * ESCENARIO 3: para cada campo `form_fields_data_*` de tipo `files`, fusiona
   * las URLs previamente guardadas en `selected[0].form_data[campo]` con los
   * nuevos archivos en base64 que el usuario haya añadido en `formData[campo]`.
   *
   * Reglas:
   *   - Si el control viene `null` o sin cambios → conserva las URLs previas.
   *   - Si viene array → conserva URLs previas que no se hayan eliminado y
   *     concatena los nuevos elementos base64.
   *   - Si viene array vacío `[]` → respeta la intención del usuario (borrar todo).
   */
  protected _mergeFormDataFiles(pos: any, formData: any): void {
    if (!formData || typeof formData !== 'object') return;
    const draw = this.drawForm()[pos];
    if (!draw) return;
    const selectedItem = this.selected()[0];
    const previousFormData = selectedItem?.form_data || {};

    // Construye un mapa rápido fieldName -> drawNode (solo de tipo files dentro de form_fields_data_)
    const filesByField: { [field: string]: any } = {};
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'files' && typeof node.field === 'string' && node.field.startsWith('form_fields_data_')) {
        filesByField[node.field] = node;
      }
      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(draw);

    for (const fieldName of Object.keys(filesByField)) {
      const current = formData[fieldName];
      const previous = Array.isArray(previousFormData[fieldName]) ? previousFormData[fieldName] : [];

      // null/undefined: no se modificó → conservar previas (server reescribe el campo siempre)
      if (current === null || current === undefined) {
        if (previous.length > 0) formData[fieldName] = [...previous];
        continue;
      }

      // El control puede contener: URLs (strings), objetos {file, file_name} (base64 nuevos)
      // o mezcla. Mantenemos el orden que vino del control y completamos con URLs previas
      // que aún no estén ahí.
      if (Array.isArray(current)) {
        const present = new Set(
          current.filter((x: any) => typeof x === 'string')
        );
        const merged: any[] = [...current];
        for (const url of previous) {
          if (typeof url === 'string' && !present.has(url)) merged.push(url);
        }
        formData[fieldName] = merged;
      }
    }
  }

  /**
   * ESCENARIO 3: recompone los dropdown-like `form_fields_data_*` dentro de
   * `formData.form_data` antes del POST/PATCH.
   *
   * En la UI, `object_<field>` guarda el id/string para que PrimeNG seleccione
   * correctamente. El control `<field>` puede llegar aquí como string (si el
   * usuario no tocó el campo tras cargar edit) o como dict (si sí lo cambió y
   * custom-draw-form espejó la opción completa).
   *
   * `code`/`name` se recuperan primero desde `selected()[0].form_data[field]`
   * cuando el id coincide; si ya cambió la selección, se buscan en las opciones
   * del drawForm o en la caché `sharedS.data/drawDropdown` para reconstruir el
   * mismo shape que espera el backend dentro de `form_data`.
   */
  protected _rebuildFormDataDicts(pos: any, formData: any): void {
    if (!formData || typeof formData !== 'object') return;

    const draw = this.drawForm()[pos];
    if (!draw) return;

    const selectedItem = this.selected()[0];
    const previousFormData = selectedItem?.form_data || {};
    // [[[II DROPDOWN_TYPES_PAYLOAD compartido (utils/dropdown-types.const.ts) ]]]FI
    const nestedFormData = (
      formData.form_data
      && typeof formData.form_data === 'object'
      && !Array.isArray(formData.form_data)
    ) ? { ...formData.form_data } : {};

    const flattenOptions = (options: any[]): any[] => {
      const flat: any[] = [];

      const visit = (option: any): void => {
        if (!option || typeof option !== 'object') return;

        if (option.data?.raw && typeof option.data.raw === 'object') {
          flat.push(option.data.raw);
        } else if (option.data && typeof option.data === 'object' && (option.data.id !== undefined || option.data.value !== undefined)) {
          flat.push(option.data);
        } else {
          flat.push(option);
        }

        if (Array.isArray(option.children)) {
          option.children.forEach(visit);
        }
      };

      options.forEach(visit);
      return flat;
    };

    const collectOptions = (fieldName: string, fieldCfg: any): any[] => {
      const out: any[] = [];
      const dt = fieldCfg?.data_type && typeof fieldCfg.data_type === 'object' ? fieldCfg.data_type : null;
      const dataBag = (this.sharedS as any).data || {};
      const drawDropdownBag = (this.sharedS as any).drawDropdown || {};

      const pushOptions = (source: any): void => {
        if (!Array.isArray(source) || source.length === 0) return;
        out.push(...flattenOptions(source));
      };

      pushOptions(fieldCfg?.options);
      pushOptions(dt?.options);
      pushOptions(dataBag[pos + ':object_' + fieldName]);
      pushOptions(dataBag[pos + ':' + fieldName]);
      pushOptions(drawDropdownBag[pos + ':object_' + fieldName]);
      pushOptions(drawDropdownBag[pos + ':' + fieldName]);

      return out;
    };

    const toPayloadDict = (option: any, fallbackId: any): any => {
      if (!option || typeof option !== 'object') {
        return { id: fallbackId, code: null, name: null };
      }

      const payload: any = {
        id: option.id ?? option.value ?? fallbackId ?? null,
        code: option.code ?? null,
        name: option.name ?? option.display_name ?? option.label ?? null,
      };
      const skipKeys = new Set([
        'parent', 'children', 'expanded', 'partialChecked', 'leaf', 'key',
        'label', 'icon', 'styleClass', 'draggable', 'droppable', 'selectable',
        'data', 'type'
      ]);

      for (const [key, value] of Object.entries(option)) {
        if (key in payload || skipKeys.has(key)) continue;
        if (value === null || typeof value !== 'object') {
          payload[key] = value;
        }
      }

      return payload;
    };

    const rebuildSingleValue = (fieldName: string, rawValue: any, fieldCfg: any): any => {
      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        return rawValue;
      }

      const previousValue = previousFormData[fieldName];
      if (previousValue && typeof previousValue === 'object' && !Array.isArray(previousValue) && previousValue.id === rawValue) {
        return previousValue;
      }

      const optionValueKey = fieldCfg?.option_value || 'id';
      const match = collectOptions(fieldName, fieldCfg).find((option: any) => {
        const candidate = option?.[optionValueKey] ?? option?.id ?? option?.value;
        return candidate === rawValue;
      });

      return toPayloadDict(match, rawValue);
    };

    const rebuildArrayValue = (fieldName: string, rawValue: any[], fieldCfg: any): any[] => {
      return rawValue
        .map((value: any) => rebuildSingleValue(fieldName, value, fieldCfg))
        .filter((value: any) => value !== null && value !== undefined);
    };

    const candidateFields = new Set<string>();
    Object.keys(formData).forEach((key) => {
      if (key.startsWith('form_fields_data_')) candidateFields.add(key);
      if (key.startsWith('object_form_fields_data_')) candidateFields.add(key.slice('object_'.length));
    });

    for (const fieldName of candidateFields) {
      const objectFieldName = 'object_' + fieldName;
      const hasPayloadControl = Object.prototype.hasOwnProperty.call(formData, fieldName);
      const hasUiControl = Object.prototype.hasOwnProperty.call(formData, objectFieldName);
      if (!hasPayloadControl && !hasUiControl) continue;

      const fieldCfg = this._findFieldConfigInDraw(draw, fieldName)
        ?? this._findFieldConfigInDraw(draw, objectFieldName);
      if (!fieldCfg || !DROPDOWN_TYPES_PAYLOAD.has(fieldCfg.type)) continue;

      const sourceValue = hasPayloadControl ? formData[fieldName] : formData[objectFieldName];

      if (Array.isArray(sourceValue)) {
        nestedFormData[fieldName] = sourceValue.length > 0
          ? rebuildArrayValue(fieldName, sourceValue, fieldCfg)
          : [];
      } else if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
        nestedFormData[fieldName] = null;
      } else {
        nestedFormData[fieldName] = rebuildSingleValue(fieldName, sourceValue, fieldCfg);
      }

      delete formData[objectFieldName];
      delete formData[fieldName];
    }

    if (Object.keys(nestedFormData).length > 0) {
      formData.form_data = nestedFormData;
    }
  }

  /**
   * ESCENARIO 1: en PATCH del modelo principal, si el registro ya tenía
   * relaciones en `files` y el usuario NO añadió archivos nuevos, eliminamos
   * el campo `documents` del payload para que el servidor no intente crear
   * nuevos archivos y conserve las relaciones existentes.
   *
   * Si el usuario sí añadió archivos (this.files / this.files64), `documents`
   * se mantiene para que el servidor cree los nuevos y los AGREGUE a las
   * relaciones existentes (NO las reemplaza).
   */
  protected _pruneDocumentsOnPatch(formData: any): void {
    if (!formData || typeof formData !== 'object') return;
    const selectedItem = this.selected()[0];
    const itemHasFiles = Array.isArray(selectedItem?.files) && selectedItem.files.length > 0;
    const userAddedNewFiles =
      (Array.isArray(this.files) && this.files.length > 0) ||
      (Array.isArray(this.files64) && this.files64.length > 0) ||
      (Array.isArray(formData.documents) && formData.documents.length > 0);

    if (itemHasFiles && !userAddedNewFiles) {
      delete formData.documents;
    }
  }

  /**
   * ESCENARIO 2 (relaciones PADRE): NO se modifica el `include` aquí.
   *
   * Las relaciones padre con campos `files` ya vienen aplanadas en el item por
   * el flujo normal: `iniParam` construye `this.include[pos]` desde las columnas
   * visibles, el server las devuelve en `included` y `DJAtoObject` las copia
   * a la raíz del objeto. Por lo tanto, los controles `{prefix}files` se
   * llenan automáticamente al hacer `reset(selected)` en `resetFormDialog`.
   *
   * Razón del cambio: el prefijo del frontend (ej. `maintenance_document_data_`)
   * usa `_data_` como separador y NO corresponde 1:1 con el nombre JSON:API
   * de la relación. Intentar derivar el nombre quitando el `_` final genera
   * peticiones inválidas (`parse_error` del servidor). Si una relación padre
   * con archivos no estuviese ya en `include`, lo correcto es añadir su
   * columna canónica a `this.cols()` (o `this.include[pos]`) — no inferirla
   * desde el prefijo.
   */
  protected _includeForParentPrefixes(pos: any, baseInclude: string): string {
    return baseInclude;
  }

  /**
   * ESCENARIO 2 — relaciones HIJAS: dispara en paralelo un GET por cada prefijo
   * declarado en `drawForm[pos].fields_prefixes` con `kind:'child'`, un único
   * request por prefijo aunque el prefijo agrupe múltiples campos. Pobla los
   * controles `{prefix}files` con las URLs existentes y limpia los validadores
   * `required` de `{prefix}files`/`{prefix}documents` cuando ya hay archivos
   * guardados (la relación está completa, no debe bloquear el save).
   *
   * Fuente de la verdad para el endpoint (acordado con el usuario):
   *   fields_prefixes: [
   *     { 'maintenance_document_data_': {
   *         kind:'child',
   *         data_type:'maintenance-document',  // app/type JSON:API
   *         filter:'maintenance'               // → filter[maintenance]=<parentId>
   *     }}
   *   ]
   *
   * Si un prefijo TIENE campos `files` en drawForm pero NO está configurado
   * como `child` con `data_type`, se considera mal configurado: los controles
   * `{prefix}files` y `{prefix}documents` se deshabilitan y se avisa al usuario.
   */
  protected _loadChildPrefixData(pos: any, parentId: string): void {
    const prefixes = this._normalizeFieldsPrefixes(pos);
    const tasks: { prefix: string; obs: any }[] = [];
    const unconfigured: string[] = [];

    // Lookup rápido por prefijo de la config declarada.
    const configByPrefix: { [p: string]: any } = {};
    for (const { prefix, config } of prefixes) configByPrefix[prefix] = config;

    // Detectar TODOS los prefijos declarados como `kind:'child'` (no solo los
    // que tienen campos `files`). Las relaciones hijas pueden tener cualquier
    // tipo de campos; el GET aplica para poblar todos sus controles, no solo
    // files/documents.
    const candidatePrefixes: string[] = [];
    for (const { prefix, config } of prefixes) {
      if (prefix === 'form_fields_data_') continue;
      if (config?.kind === 'child') candidatePrefixes.push(prefix);
    }

    for (const prefix of candidatePrefixes) {
      const config = configByPrefix[prefix] || {};

      // `data_type` siempre es la CLAVE del diccionario `appType` del CRUDService
      // (ej. 'maintenance-document'). NUNCA construir la URL desde el string
      // crudo: `getAppType` es el ÚNICO punto autorizado para resolver
      // `app` (ruta JSON:API completa, ej. 'assets/maintenance-document') y
      // `type` (resource type JSON:API).
      const dtKey = typeof config.data_type === 'string'
        ? config.data_type
        : (config.data_type?.type || config.data_type?.app || '');
      const appTypeEntry = this.crudS.getAppType(dtKey);
      const app = appTypeEntry?.app;
      const type = appTypeEntry?.type;

      if (!app) {
        unconfigured.push(prefix);
        continue;
      }

      const parentRel = config.filter || config.parent_field;
      if (!parentRel) {
        unconfigured.push(prefix);
        continue;
      }
      const filter = `filter[${parentRel}]=${parentId}`;

      tasks.push({
        prefix,
        obs: this.crudS.getObject({ app, type, filter, include: '' }).pipe(
          // Importante: NO usar DJAtoObject aquí. Necesitamos el shape JSON:API
          // crudo para extraer `relationships.files.data` como `[{id, type}]`
          // (lo que validateRelationships + baseDJA esperan para reenviar la
          // relación). DJAtoObject aplanaría a URLs y perderíamos el `type`.
          map((resp: any) => resp),
          catchError(err => {
            console.warn(`[_loadChildPrefixData] fallo prefijo ${prefix}`, err);
            return of({ data: [] });
          })
        )
      });
    }

    // Deshabilitar controles de prefijos mal configurados.
    if (unconfigured.length) {
      const form = this.currentForm(pos);
      for (const prefix of unconfigured) {
        form?.get(prefix + 'files')?.disable();
        form?.get(prefix + 'documents')?.disable();
      }
      this.messageS.changeMessage(
        `Campos de relación sin configurar en fields_prefixes: ${unconfigured.join(', ')}. Revise la configuración.`,
        null, {}, 'warn'
      );
    }

    if (tasks.length === 0) return;

    this.showBlocked();
    forkJoin(tasks.map(t => t.obs)).subscribe({
      next: (results: any[]) => {
        const form = this.currentForm(pos);
        const selectedItem = this.selected()[0];
        tasks.forEach((task, i) => {
          const resp = results[i] || { data: [] };
          const dataArr: any[] = Array.isArray(resp?.data) ? resp.data : [];
          if (dataArr.length === 0) return;

          // Tomar primer hijo (modelo 1:1 implícito). Para 1:N este loader
          // necesita ampliarse, pero la config actual no lo cubre.
          const first = dataArr[0];

          // Aplanar attributes del hijo a los controles `{prefix}<field>`.
          const attrs = first?.attributes || {};
          for (const [k, v] of Object.entries(attrs)) {
            const ctrl = form?.get(task.prefix + k);
            if (ctrl) ctrl.setValue(v as any, { emitEvent: false });
          }

          // Extraer `relationships.files.data` como `[{id, type}]` para
          // viajar directamente en attributes (no en relationships JSON:API).
          const filesCtrl = form?.get(task.prefix + 'files');
          if (filesCtrl) {
            const rel = first?.relationships?.files?.data;
            const filesArr = Array.isArray(rel)
              ? rel.filter((r: any) => r?.id).map((r: any) => ({ id: r.id, type: r.type || 'file' }))
              : [];
            filesCtrl.setValue(filesArr, { emitEvent: false });
          }

          // documents arranca con [] (default). En PATCH se envía null si vacío.
          const docsCtrl = form?.get(task.prefix + 'documents');
          docsCtrl?.setValue([], { emitEvent: false });

          // Capturar id del hijo para PATCH (`{prefix}id`).
          if (selectedItem && first?.id) {
            selectedItem[task.prefix + 'id'] = first.id;
          }

          // En edición con archivos previos, relajar required.
          const filesArrLen = Array.isArray(filesCtrl?.value) ? filesCtrl!.value.length : 0;
          if (filesArrLen > 0) {
            filesCtrl?.clearValidators();
            filesCtrl?.updateValueAndValidity({ emitEvent: false });
            docsCtrl?.clearValidators();
            docsCtrl?.updateValueAndValidity({ emitEvent: false });
          }
        });
        this.showBlocked(false);
      },
      error: () => this.showBlocked(false)
    });
  }

  /**
   * Devuelve la lista de prefijos (string) que aparecen como prefijo de algún
   * campo `type==='files'` en el drawForm de la posición indicada.
   * Se usa para detectar relaciones que requieren config en fields_prefixes.
   */
  protected _collectFilesPrefixes(pos: any): string[] {
    const draw = this.drawForm()[pos];
    const declared = this._normalizeFieldsPrefixes(pos).map(x => x.prefix);
    const found = new Set<string>();
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'files' && typeof node.field === 'string') {
        // Busca el prefijo declarado más largo que coincida (evita falsos positivos).
        const match = declared
          .filter(p => node.field.startsWith(p))
          .sort((a, b) => b.length - a.length)[0];
        if (match) found.add(match);
      }
      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(draw);
    return Array.from(found);
  }

  /**
   * Genera un form dinamicamente en base a un JSON
   * @param jsonFields Consulta al servidor de tipo OPTIONS
   * @param main_field Campos del formulario
   * @returns el form
   */
  generateJSONform(jsonFields: any, pos = '', formFields: any = {}, relationOptions: any[] = [], field_prefix = '') {
    //aqui no se aplica la configuración  del sistema, toma la que trae el servidor (options) directamente
    // en estricta teoria es lo mismo ya que esa configuracion de aplica en el servidor al generar el options
    // aqui no aplica la logica de field/clave del campo de la configuracion, en particular para documents

    //pos = pos ?? this.pos(); // Asegurar que pos no sea null
    pos = (pos !== null && pos !== undefined && pos !== "") ? pos : this.pos();
    const posIndex = pos as string; // Cast explícito a string

    // se desestructura el array para para poder eliminar los campos afectados y optimizar la busqueda
    const boolLocal = this.fieldsBool[0][posIndex] ? [...this.fieldsBool][0][posIndex] : [];
    const relationshipsLocal = this.relationships[posIndex] ? [...this.relationships[posIndex]] : [];

    // lo utilizo para abrir los campos hijos solo una vez
    let auxParentSelect = true;
    const parentSelect = this.selected()[0];
    //console.log(jsonFields);
    for (const field in jsonFields) {

      if (jsonFields.hasOwnProperty(field)) {

        //se envia campo individual
        if (field in ['parent_form_data', 'form_data', 'form_fields', 'child_form_fields']) {
          continue;
        }

        const fieldObj = jsonFields[field];
        const validators = [];

        // si el padre child_form_fields, se abre el detalle del formulario
        if (parentSelect?.child_form_fields?.draw && auxParentSelect) {
          auxParentSelect = false;
          this.openTasksDetail({ pos: posIndex, formFields: formFields, childFormFields: parentSelect.child_form_fields, parentField: 'parent_form_data_' });
        }

        // si el modelo del servidor tiene modelos anidadas, se llama recursivamente,
        // fieldObj.relationship_type !== 'ManyToMany' es para excluir las relaciones
        // de muchos a muchos
        if (fieldObj.children && fieldObj.relationship_type !== 'ManyToMany') {
          this.generateJSONform(fieldObj.children, pos, formFields, relationOptions, field + '_');
        }

        // los componentes de solo lectura no se incluyen en el formulario
        if (fieldObj.read_only) {
          //para el caso de los campos solo lectura deben ser deshabilitados
          if (!this.initialDisabledForm[posIndex]) {
            this.initialDisabledForm[posIndex] = {};
          }
          this.initialDisabledForm[posIndex][field] = true;
          //°°°PROBANDO
          //continue;
        }

        // carga las relaciones antes de los excludeFieldsForm ya que esto no afecta al formulario, afecta al standar json api
        if (fieldObj.relationship_type == 'ManyToMany' || fieldObj.relationship_type == 'ManyToOne' || fieldObj.relationship_type == 'OneToOne'
          //hay que tener en cuenta que dejar solo Relationship puede afectar con otras relaciones
          || fieldObj.type == 'Relationship'
        ) {
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
        } else if (fieldObj.type == 'Integer' || fieldObj.type == 'Decimal') {
          //para que los ceros no se muestren como null
          val = fieldObj.initial !== undefined && fieldObj.initial !== null ? fieldObj.initial : null;

        } else if (fieldObj.type == 'DateTime') {
          console.log('¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿¿', fieldObj.initial);

          val = fieldObj.initial !== undefined && fieldObj.initial !== null ? fieldObj.initial : null;

        } else if (fieldObj.type == 'Choice') {
          (this.sharedS as any).data[posIndex + ':' + field_prefix + field] = fieldObj?.choices || null;
          val = fieldObj.initial || '';
        } else if (fieldObj.relationship_type == 'ManyToMany') {
          // Soporta dos formas de inicial:
          //  - JSON string  → JSON.parse
          //  - array nativo → se usa tal cual
          //  - cualquier otra cosa → []
          let initial: any[] = [];
          if (Array.isArray(fieldObj.initial)) {
            initial = fieldObj.initial;
          } else if (typeof fieldObj.initial === 'string' && fieldObj.initial.trim() !== '') {
            try { initial = JSON.parse(fieldObj.initial); } catch { initial = []; }
            if (!Array.isArray(initial)) initial = [];
          }
          val = initial;

          // Si el field expone un sub-serializer (child.type === 'Serializer'),
          // persistimos el esquema de cada elemento de la colección para que el
          // emisor pueda construir `data: [{ type, id, meta:{...}, ... }]` JSON:API.
          // El esquema queda accesible vía sharedS.data en la clave `${pos}:${field}__child_schema`.
          if (fieldObj?.child?.type === 'Serializer' && fieldObj?.child?.children) {
            (this.sharedS as any).data[posIndex + ':' + field_prefix + field + '__child_schema'] = {
              parent_resource: fieldObj.relationship_resource || null,
              fields: fieldObj.child.children
            };
          }

          // required en colecciones: al menos 1 elemento.
          if (fieldObj.required) {
            const minOne = (ctrl: AbstractControl): ValidationErrors | null => {
              const v = ctrl.value;
              return Array.isArray(v) && v.length > 0 ? null : { required: true };
            };
            // reemplazamos el Validators.required (no aplica a arrays) por minOne
            const idx = validators.indexOf(Validators.required);
            if (idx !== -1) validators.splice(idx, 1);
            validators.push(minOne);
          }
        } else if (fieldObj.type == 'GenericField') {
          val = fieldObj.initial || null;
        } else if (fieldObj.type == 'Image') {
          val = fieldObj.initial || null;
        } else if (fieldObj.type == 'List') { //child
          //si initian es un array, ub objecto o un json

          //°°°aqui caen los documents deberia llamar a la configuración y agregar elementos por documents_ y algo, por ejemplo
          //document_inicial, document_final, etc, para permitir que e usuario pueda separar los documentos en mas de un campo
          //como se hace en addFieldsByPrefix

          if (fieldObj?.choices) {
            (this.sharedS as any).data[posIndex + ':' + field_prefix + field] = fieldObj?.choices;
          } else if (fieldObj?.child) {
            if (fieldObj.child?.type == 'Choice') {
              (this.sharedS as any).data[posIndex + ':' + field_prefix + field] = fieldObj?.child?.choices;
            }
          }

          if (Array.isArray(fieldObj.initial)) {
            val = fieldObj.initial;
          } else if (fieldObj.initial && typeof fieldObj.initial === 'object') {
            val = fieldObj.initial;
          } else if (typeof fieldObj.initial === 'string' && fieldObj.initial.trim() !== '') {
            try {
              val = JSON.parse(fieldObj.initial);
            } catch {
              // Algunos List (p.ej. choices locales) llegan como valor simple, no como JSON.
              val = fieldObj.initial;
            }
          } else {
            val = [];
          }
          //val = fieldObj.initial ? JSON.parse(fieldObj.initial) : [];
        }

        // se agrega nonNullable para que se restablezca al valor por defecto
        formFields[field_prefix + field] = this.fb.control({ value: val, disabled: false }, { nonNullable: true, validators: validators });
      }
    }

    const draw = this.drawForm()[posIndex];
    // Normaliza fields_prefixes a una lista uniforme (compat array de strings y objeto)
    const fields_prefixes = this._normalizeFieldsPrefixes(posIndex);

    for (const { prefix: field_prefix } of fields_prefixes) {
      console.log('?????????????????????????', field_prefix);

      this.addFieldsByPrefix(formFields, draw, field_prefix, posIndex);
    }

    this.relationships[posIndex] = relationOptions;
    console.log('formmmmmmmmmmmmmmmmmm', formFields);
    return this.fb.group(formFields);
  }

  generateJSONColumns(jsonFields: any, pos: any = null, cols: any = [], field_prefix = '', header_prefix = '', field_relationship = '') {
    pos = pos || this.pos();
    console.log('cols--------------', cols, typeof cols);

    if (pos === null) return cols; // Retornar cols vacío si pos es null

    // Guard: si customField()[pos] aún no está disponible (timing: constructor antes de ngOnInit),
    // retornar cols vacío para evitar TypeError al acceder a propiedades de undefined
    if (!this.customField()[pos]) return cols;

    // La configuración está directamente en configCols, no en configCols.cols
    const colsConfig = this.crudS.configCols(pos) //|| {};

    const safePos = pos ?? 0; // Crear una variable segura para usar como índice

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
        //|||practicamente es para productos
        /* const joinModelFields = field; //+ '__name'
         if ((fieldObj.children && fieldObj.relationship_type != 'ManyToMany') || this.searchByKeyObject(joinModelFields, this.additionalFieldsAppCols[pos])) {
 
           // si se definieron prefijos y sufijos para los campos, se agregan
           if (this.additionalFieldsAppCols[pos][joinModelFields]) {
             //en la relación se agrega el campo del nombre,
             //cols.push({
             //    field: field_prefix + field + '__name',
             //    header: this.customField()[pos][field + '_name'] + ' ' + header_prefix, sortable: true
             //});
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
         }*/

        // Crear el objeto columna base
        let columnObj: any = {};

        if (fieldObj.type == 'Relationship' || fieldObj.type == 'Serializer') {
          columnObj = {
            field: field_prefix + field + '__name',
            header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix,
            //sortable: true
          };
        } else if (fieldObj.type == 'Boolean') {
          columnObj = {
            field: field_prefix + field + '__text',
            header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix,
            //sortable: true
          };
          if (!this.fieldsBool[pos]) {
            this.fieldsBool[pos] = [];
          }
          // no tiene caso validar si existe en fieldsBool[0] porque esto es para el form ya se validó en generateJSON
          this.fieldsBool[pos].push({ field: field_relationship + field /*, default: fieldObj.initial */ });
          //this.fieldsBool[pos].push({ field: field_prefix + '__' + field/*, default: fieldObj.initial */ });
        } else if (fieldObj.type == 'Choice') {
          columnObj = { field: field_prefix + field + '__text', header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix, /*sortable: true*/ };
          if (!this.moreFields[pos]) {
            this.moreFields[pos] = [];
          }
          // se alimenta el array con los campos que tienen choices, anterioemente se ponia namualmente y
          // la clave valor eran id y nombre, se cambian  por value y display_name
          this.moreFields[pos].push([field, fieldObj.choices]);

          //agregar __text a los fieldObj.type == 'DateTime' para que se muestre la fecha en la tabla siempre y cuando existan en this.timeZone
          // usando la funcion searchByValue
        } else if (fieldObj.type == 'DateTime' && this.searchByValue(field, this.timeZone[pos], false) !== -1) {
          columnObj = { field: field_prefix + field + '__text', header: this.customField()[pos][field_relationship + field] + ' ' + header_prefix, /*sortable: true*/ };
        } else {
          columnObj = { field: field_prefix + field, header: this.customField()[pos][field_relationship + field] + header_prefix, /*sortable: true*/ };
        }

        // Aplicar configuración de cols si existe
        if (colsConfig && colsConfig[field]) {
          const fieldConfig = colsConfig[field];

          // Aplicar sortable de la configuración
          if (fieldConfig.hasOwnProperty('sortable')) {
            columnObj.sortable = fieldConfig.sortable;
          }

          // Si hide es true, agregar a itemsRemove
          if (fieldConfig.hide === true) {
            if (!this.itemsRemove[safePos]) {
              this.itemsRemove[safePos] = [];
            }
            this.itemsRemove[safePos].push(columnObj.field);
          }

          // Asignar orden para uso posterior (convertir a número)
          if (fieldConfig.hasOwnProperty('order')) {
            const orderValue = parseInt(fieldConfig.order, 10);
            columnObj._order = orderValue;
          }
        }

        cols.push(columnObj);
      }
    }

    // Agregar columnas para los campos form_fields_data_ declarados en el drawForm,
    // análogo a cómo generateJSONform agrega controles mediante addFieldsByPrefix.
    // El header se obtiene de customField()[pos] (settings/settings/me): se consideran
    // solo las claves que inician con 'form_fields_data_'.
    // Se agrega ANTES del sort para que el order de colsConfig las ubique en la posición correcta.
    const drawForCols = this.drawForm()[pos];
    if (drawForCols) {
      const fieldsPrefixes = this._normalizeFieldsPrefixes(pos);
      for (const { prefix: pfx } of fieldsPrefixes) {
        if (pfx !== 'form_fields_data_') continue;

        Object.keys(drawForCols).forEach(nodeKey => {
          if (nodeKey === 'dialog' || nodeKey === 'fields_prefixes') return;

          const node = drawForCols[nodeKey];
          if (!node || typeof node !== 'object') return;

          const layoutsToProcess: any[] = [];
          if (node.grid && typeof node.grid === 'object') {
            layoutsToProcess.push(node.grid);
          } else if (node.nested && typeof node.nested === 'object') {
            layoutsToProcess.push(node.nested);
          }

          if (node.stepper?.steps) {
            Object.keys(node.stepper.steps).forEach(stepKey => {
              const step = node.stepper.steps[stepKey];
              if (step?.fields && typeof step.fields === 'object') {
                layoutsToProcess.push(step.fields);
              }
            });
          }

          layoutsToProcess.forEach(fieldsLayout => {
            Object.keys(fieldsLayout).forEach(key => {
              const fieldData = fieldsLayout[key];
              const fieldName = fieldData?.field;
              if (!fieldName || !fieldName.startsWith(pfx)) return;
              // Saltar controles object_ (son duplicados UI para dropdown)
              if (fieldName.startsWith('object_')) return;

              // El header proviene de customField()[pos] (settings/settings/me) o del drawForm
              const header = this.customField()[pos]?.[fieldName] || fieldData.header || fieldName;

              // En los items de la tabla, form_fields_data_* está anidado en form_data (atributo del modelo)
              const colField = 'form_data.' + fieldName;
              const columnObj: any = { field: colField, header };

              // Aplicar colsConfig (sortable, hide, order) igual que los campos regulares
              if (colsConfig && colsConfig[fieldName]) {
                const fieldConfig = colsConfig[fieldName];
                if (fieldConfig.hasOwnProperty('sortable')) {
                  columnObj.sortable = fieldConfig.sortable;
                }
                if (fieldConfig.hide === true) {
                  if (!this.itemsRemove[safePos]) this.itemsRemove[safePos] = [];
                  this.itemsRemove[safePos].push(columnObj.field);
                }
                if (fieldConfig.hasOwnProperty('order')) {
                  columnObj._order = parseInt(fieldConfig.order, 10);
                }
              }

              cols.push(columnObj);
            });
          });
        });
      }
    }

    // Ordenar columnas por orden si se especificó
    cols.sort((a: any, b: any) => {
      // Si ambos tienen orden, comparar numéricamente
      if (a._order !== undefined && b._order !== undefined) {
        const result = a._order - b._order;
        return result;
      }
      // Si solo 'a' tiene orden, va primero
      else if (a._order !== undefined && b._order === undefined) {
        return -1;
      }
      // Si solo 'b' tiene orden, va primero
      else if (a._order === undefined && b._order !== undefined) {
        return 1;
      }
      // Si ninguno tiene orden, mantener orden original
      return 0;
    });

    // Limpiar la propiedad temporal _order
    cols.forEach((col: any) => {
      delete col._order;
    });

    console.log('colssssssss ordenadas:', cols);
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

    const currentPos = this.pos();
    if (!this.initialDisabledForm[currentPos]) {
      this.initialDisabledForm[currentPos] = {};
    }

    for (const [key, isDisabled] of Object.entries(this.initialDisabledForm[currentPos])) {

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
        if (!this.columns[pos]) {
          this.columns[pos] = this.generateJSONColumns(this.optionsFields[pos], pos);
          this.syncColumnsState(pos);
        }
        this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
        this.form.set(this.formTempo);

        if (this.isCreate()) {
          this.classifierLevelsDropdown();
        }
      } else {
        this.showBlocked();
        // se crear el formulario, se envia la app secundaria para que se consulte el formulario correspondiente, en lugar de this.app
        this.crudS.options(this.app[pos]).subscribe({
          next: (resp: any) => {
            this.optionsFields[pos] = resp.data.actions.POST;
            if (!this.columns[pos]) {
              this.columns[pos] = this.generateJSONColumns(this.optionsFields[pos], pos);
              this.syncColumnsState(pos);
            }
            this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos]);
            this.form.set(this.formTempo);
            this.showFormDialog(pos);
            this.showBlocked(false);
          }
        });
      }
    } else {
      this.form.set(this.formTempo);
      if (this.isCreate()) {
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
    let { pos, node = false, filter = '', force = false, sort = '' } = options;
    console.log('inicio getAll----------------------------', filter, options);

    const safePos = pos as any; // Type assertion para índices de array
    this.pos.set(safePos);

    if (this.columns[safePos]) {
      this.getAll2({ pos: safePos, node, filter, force, sort });
    } else {
      // si ya se consulto al servidor, no se vuelve a consultar
      if (this.optionsFields[safePos]) {

        this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos]);
        this.getAll2({ pos: safePos, node, filter, force, sort });

      } else {
        const app = this.app[safePos];
        this.showBlocked();
        this.crudS.options(app).subscribe({
          next: (resp: any) => {

            this.optionsFields[safePos] = resp.data.actions.POST;
            this.columns[safePos] = this.generateJSONColumns(this.optionsFields[safePos]);
            this.showBlocked(false);
            this.getAll2({ pos: safePos, node, filter, force, sort });
          },
          error: (err: any) => {
            this.showBlocked(false);
            this.messageS.changeMessage(`Hay un error al cargar la configuración de ${this.pluralDefiniteArticle[safePos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[safePos]);
          }
        });
      }
    }
  }

  getAll2(options: getAllOptions = {}) {
    let { pos, node = false, filter = null, force = false, sort = '' } = options;
    //console.log('inicio getAll2', filter, this.pos());
    const safePos = pos as any; // Type assertion para índices de array

    //lo limpio porque donde las app que combinan valores copn node y sin node,
    //hay un error entre la carga de los elementos y la carga de los elementos con node
    // el detalle es que muestra un parpadeo en la tabla cuando se recarga sobre la misma app
    //this.items.set([]);
    console.log('llama a change pos');

    this.changePos(safePos); // actualice la posición y los valores correspondientes a la app
    this.showBlocked(); // muestra el bloqueo de la pantalla
    if (this.itemsCache[safePos]) {
      if (this.itemsCache[safePos].length > 0 && !force) {
        this.items.set(this.itemsCache[safePos]);
        this.showBlocked(false);
        return;
      }
    }

    //const include = this.include; // incluir todas las relaciones para que se muestren en la tabla
    const include = this.include[safePos];
    sort = sort || this.sort; // ordenar por defecto por id
    const fields = this.fields[safePos]; // incluir todos los campos para que se muestren en la tabla

    filter = filter || this.filter; // por el momento solo ocupo de filter sea se envie por parametro
    this.offset[safePos] = this.offset[safePos] ? this.offset[safePos] : this.offset[0]; // si no se envia el offset, se toma el offset por defecto

    this.crudS.getObject({ include, filter: filter || undefined, sort, fields, limit: this.limit()[safePos], offset: this.offset[safePos] }).subscribe({
      next: (resp: any) => {
        const additionalFieldsAppCols = this.additionalFieldsAppCols[safePos] || [];
        const convertedItems = this.DJAtoObject({ resp, node, additionalFieldsAppCols }); // convierte el formato DJA a un objeto

        this.items.set(convertedItems);
        this.itemsCache[safePos] = [...convertedItems]; // guarda una copia en cache de los elementos

        // Guardar copia SOLO si NO es una búsqueda con filtros
        // filter contiene filtros del servidor (ej: "filter[search]=texto")
        const isSearchQuery = filter && filter.includes('filter[search]');
        if (!isSearchQuery) {
          this.originalPageItems = [...convertedItems];
        }

        //this.selected.set([]); // limpia los elementos seleccionados

        //si items esta vacío hay que desfragmentar para que se actualice el binding y enviar en message.
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
    let { pos, node = false, filter = '', force = false, sort = '', fields = '', include = '', app = '', type = '' } = options;

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
        },
        error: (err: any) => {
          this.showBlocked(false);
          this.messageS.changeMessage(`Hay un error al cargar la configuración de ${this.pluralDefiniteArticle[safePos] || this.pluralDefiniteArticle[0]}.`, err, this.customField()[safePos]);
        }
      });
    }
  }

  getAll2Secundary(options: getAllSecundaryOptions = {}) {
    let { pos, node = false, filter = null, force = false, sort = null, fields = null, include = '', app = null, type = null } = options;

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
    const timestamp = new Date().toISOString();
    console.log(`🔄 [${timestamp}] CRUD onReloadIconDropdown`, { event: $event });
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
        console.log('3 selected Columns');
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

  // Control de búsqueda remota - controlado por el usuario mediante icono
  // undefined: no inicializado (evita ejecución en carga inicial)
  // false: búsqueda LOCAL (solo en página visible actual)
  // true: búsqueda REMOTA (consulta al servidor en toda la BD)
  searchRemote: any = undefined;

  // Variable para almacenar el valor del filtro global anterior
  previousGlobalFilterValue: string | null = null;

  // Variable para almacenar los datos originales de la página antes de filtrar localmente
  originalPageItems: any[] = [];

  // Controla el retraso de la búsqueda: local=200ms, remote=800ms
  filterDelayTable = signal(200);

  // Evita doble llamada al servidor en la carga inicial del componente
  private lazyLoadInitialized: { [key: string]: boolean } = {};

  /**
   * Maneja la búsqueda y paginación de la tabla.
   * - Los datos SIEMPRE vienen paginados del servidor (items() = solo página actual)
   * - searchRemote=false: busca solo en los ~10-20 items visibles
   * - searchRemote=true: envía búsqueda al servidor para buscar en toda la BD
   * 
   * @param event - datos del evento (paginación, ordenamiento, filtro)
   * @param pos - posición de la app
   * @param filter - filtro adicional
   */
  onLazyLoad({ event, pos = null, filter = '' }: { event: any; pos?: any; filter?: string }) {
    // Actualizar searchRemote si viene en el evento (desde custom-table)
    if (event.searchRemote !== undefined) {
      this.searchRemote = event.searchRemote;
    }

    // Evitar ejecución en la carga inicial del componente
    if (this.searchRemote === undefined) {
      this.searchRemote = false;
      return;
    }

    pos = pos || this.pos();
    if (pos === null) return;

    // Evitar doble llamada al cargar: PrimeNG dispara onLazyLoad en init
    const lazyKey = String(pos ?? 0);
    if (!this.lazyLoadInitialized[lazyKey]) {
      this.lazyLoadInitialized[lazyKey] = true;
      return;
    }

    // Determinar ordenamiento desde el evento
    const sortParam = this.buildSortParam(event);
    if (sortParam !== null) {
      this.sort = sortParam;
    }

    const currentGlobalFilterValue = event.globalFilter || null;
    const hasFilters = currentGlobalFilterValue && currentGlobalFilterValue.trim().length > 0;

    //console.log('🔍 onLazyLoad - searchRemote:', this.searchRemote, '| hasFilters:', hasFilters, '| filterValue:', currentGlobalFilterValue);

    // ============== LIMPIAR FILTROS (cuando se borra el texto de búsqueda) ==============
    if (this.previousGlobalFilterValue && !hasFilters) {
      if (this.searchRemote) {
        // Búsqueda remota: recargar desde el servidor
        this.limit()[pos] = event.rows;
        this.offset[pos] = event.first;
        this.getAll({ pos: pos, filter: '', force: true, sort: this.sort });
        //console.log('🔄 Limpiando filtros REMOTOS - Recargando desde servidor');
      } else {
        // Búsqueda local: restaurar datos originales de la página
        this.items.set([...this.originalPageItems]);
        //console.log('🔄 Limpiando filtros LOCALES - Restaurando datos originales');
      }

      this.previousGlobalFilterValue = currentGlobalFilterValue;
      return;
    }

    // ============== BÚSQUEDA REMOTA (SERVIDOR) ==============
    if (hasFilters && this.searchRemote) {
      // Validar mínimo 5 caracteres
      if (currentGlobalFilterValue.trim().length < 5) {
        this.messageS.changeMessage('La búsqueda debe tener al menos 5 caracteres.');
        this.previousGlobalFilterValue = currentGlobalFilterValue;
        return;
      }

      // Con Enter ya no necesitamos validar duplicados - el usuario controla cuándo buscar
      const filterQuery = `filter[search]=${currentGlobalFilterValue}`;
      filter = filter.length > 0 ? filter + '&' + filterQuery : filterQuery;
      this.limit()[pos] = event.rows;
      this.offset[pos] = event.first;

      //console.log('🌐 Búsqueda remota en servidor:', currentGlobalFilterValue);
      this.getAll({ pos: pos, filter: filter, force: true, sort: this.sort });
      this.previousGlobalFilterValue = currentGlobalFilterValue;
      return;
    }

    // ============== BÚSQUEDA LOCAL (SOLO DATOS VISIBLES) ==============
    if (hasFilters && !this.searchRemote) {
      // Buscar solo en los items ORIGINALES de la página actual (no los ya filtrados)
      const filteredItems = this.applyFilters(event.filters, this.originalPageItems);
      const sortedItems = this.applyLocalSort(filteredItems, event);
      this.items.set(sortedItems);

      //console.log('📊 Búsqueda local en página visible - Items encontrados:', filteredItems.length);
      this.previousGlobalFilterValue = currentGlobalFilterValue;
      return;
    }

    // ============== PAGINACIÓN NORMAL (SIN FILTROS) ==============
    // Actualizar offset/limit y recargar datos desde servidor
    this.limit()[pos] = event.rows;
    this.offset[pos] = event.first;
    this.getAll({ pos: pos, filter: filter, force: true, sort: this.sort });
    //console.log('📄 Paginación normal - recargando página:', { pos, rows: event.rows, first: event.first });

    this.previousGlobalFilterValue = currentGlobalFilterValue;
  }

  /**
   * Construye el parámetro sort para el backend (JSON:API)
   * Soporta sort simple y múltiple
   */
  private buildSortParam(event: any): string | null {
    if (!event) return null;

    const normalizeField = (field: string) => {
      if (!field) return field;
      return field.replace(/(__name|__text)$/g, '');
    };

    // Multi sort
    if (Array.isArray(event.multiSortMeta) && event.multiSortMeta.length > 0) {
      const sortParts = event.multiSortMeta
        .filter((m: any) => !!m?.field)
        .map((m: any) => `${m.order === -1 ? '-' : ''}${normalizeField(m.field)}`);
      return sortParts.length > 0 ? sortParts.join(',') : null;
    }

    // Single sort
    if (event.sortField) {
      return `${event.sortOrder === -1 ? '-' : ''}${normalizeField(event.sortField)}`;
    }

    return null;
  }

  /**
   * Aplica ordenamiento local cuando la búsqueda es local
   */
  private applyLocalSort(items: any[], event: any): any[] {
    if (!items || items.length === 0) return items;

    const meta = Array.isArray(event?.multiSortMeta) && event.multiSortMeta.length > 0
      ? event.multiSortMeta
      : (event?.sortField ? [{ field: event.sortField, order: event.sortOrder }] : []);

    if (meta.length === 0) return items;

    const compareValues = (a: any, b: any, order: number) => {
      if (a == null && b == null) return 0;
      if (a == null) return -1 * order;
      if (b == null) return 1 * order;

      if (typeof a === 'string' || typeof b === 'string') {
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * order;
      }

      if (a < b) return -1 * order;
      if (a > b) return 1 * order;
      return 0;
    };

    const sorted = [...items].sort((a: any, b: any) => {
      for (const m of meta) {
        const field = m?.field;
        const order = m?.order ?? 1;
        if (!field) continue;

        const result = compareValues(a?.[field], b?.[field], order);
        if (result !== 0) return result;
      }
      return 0;
    });

    return sorted;
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

    // no llama a change Pos porque no es necesario, la edición ocurre sobre la app actual y ademas
    //ini Param debe incluir tolas la relaciones
    this.iniParam(this.cols()); //se inicializa el include y el fields para que se muestren todos los campos en el form
    this.showBlocked();

    // ESCENARIO 2 (relaciones padre con files): no se manipula el `include`.
    // El flujo normal ya las trae via `iniParam` + `DJAtoObject` (aplanado).
    // Ver `_includeForParentPrefixes` para el detalle.
    const include = this._includeForParentPrefixes(pos, this.include[pos]);

    this.crudS.getDetail({ id, include }).subscribe({
      next: (resp: any) => {
        this.showBlocked(false);
        const additionalFieldsAppCols = this.additionalFieldsAppCols[pos] || [];
        const data = this.DJAtoObject({ resp, additionalFieldsAppCols });

        // ESCENARIO 3: aplanar `form_data` para que la lógica existente de
        // dropdowns/files encuentre `form_fields_data_xxx` en la raíz del item.
        this._flattenFormData(data, pos);

        console.log('000*****', additionalFieldsAppCols, data);

        //obtener los campos classifers del formulario form()
        this.classifierLevelsDropdown(data);

        // ESCENARIO 2 (relaciones HIJAS con files): un GET por prefijo `kind:'child'`
        // (en paralelo con forkJoin) para poblar `{prefix}files` / `{prefix}documents`.
        // Se dispara DESPUÉS de classifierLevelsDropdown para no bloquear la apertura
        // del diálogo: el usuario verá el formulario y los hijos se rellenan al llegar.
        this._loadChildPrefixData(pos, id);
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
    const pos: any = options?.pos ?? this.pos();
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

    // Debe ejecutarse antes para asegurar configGeneral() y this.app de la posición actual.
    this.changePos(pos);

    if (!this.itemsCache[pos]) {
      const shouldLoad = this.shouldLoadOnStart(pos);
      if (shouldLoad) {
        const force = true;
        this.getAll({ pos, node, force, filter });
      } else {
        // Sin autocarga: tabla vacía y solo estructura vía OPTIONS (createForm).
        this.items.set([]);
      }
    } else {
      // Aplica filtros si existe un query string tipo "filter[is_alternate]=false"
      if (filter) {
        let filteredData = [...this.itemsCache[pos]];
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
        this.items.set(this.itemsCache[pos]);
      }
    }

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de is Create para inicializar el form
    this.isCreate.set(true);
    //llama a change Pos para que se inicialicen los valores correspondientes a la app,
    //dado que crear tiene un menu para crear los elementos, a diferencia de edit o delete

    //crea el form
    this.createForm(pos);

    //pone el titulo del dialogo
    this.headerDialog.set(`Alta de ${this.singular[pos] || this.singular[0]}`);
  }

  /**
   * Unifica y configura las propiedades de un diálogo según su prioridad (principal o secundario).
   * Esta función centraliza la configuración de diálogos CRUD, estableciendo dimensiones,
   * textos de etiquetas, pestañas visibles y relaciones padre-hijo.
   * 
   * @param pos - Posición o identificador del diálogo en la estructura de datos
   * @param dialog - Objeto de configuración del diálogo que contiene las propiedades específicas
   * @param dialog.width - Ancho personalizado del diálogo (aplicable solo para diálogos secundarios)
   * @param dialog.height - Alto personalizado del diálogo (aplicable solo para diálogos secundarios)
   * @param dialog.singular - Forma singular del nombre de la entidad (ej: "Usuario")
   * @param dialog.plural - Forma plural del nombre de la entidad (ej: "Usuarios")
   * @param dialog.singular_indefinite_article - Artículo indefinido singular (ej: "un usuario")
   * @param dialog.plural_definite_article - Artículo definido plural (ej: "los usuarios")
   * @param dialog.tab - Índice de la pestaña que debe mostrarse (base 1)
   * @param priority - Prioridad del diálogo: 'main' para principal, 'secundary' para secundario
   * @param parent_id - ID del campo padre para establecer relaciones en formularios anidados
   * @param id - Valor que se asignará al campo padre en el formulario
   * 
   * @description
   * Funcionalidades principales:
   * - **Configuración de dimensiones**: Establece width y height para diálogos secundarios
   * - **Gestión de etiquetas**: Configura textos singular/plural para la interfaz
   * - **Control de pestañas**: Determina qué pestaña mostrar según la prioridad
   * - **Relaciones padre-hijo**: Establece valores en formularios anidados
   * 
   * @example
   * ```typescript
   * // Configurar diálogo principal
   * this.unifyDialog('users', {
   *   singular: 'Usuario',
   *   plural: 'Usuarios',
   *   tab: 2
   * }, 'main');
   * 
   * // Configurar diálogo secundario con dimensiones personalizadas
   * this.unifyDialog('roles', {
   *   width: 'width-800px-custom',
   *   height: 'min-height-600px-custom',
   *   singular: 'Rol',
   *   tab: 1
   * }, 'secundary', 'user_id', '123');
   * ```
   * 
   * @note
   * - Las dimensiones personalizadas solo se aplican a diálogos secundarios
   * - Los índices de pestañas se convierten de base 1 a base 0 internamente
   * - La relación padre-hijo se establece automáticamente en el formulario temporal
   */
  unifyDialog(pos: any, dialog: any, priority: string = 'main', parent_id?: string, id?: string) {

    //se puede poner datos espesificamente de dialog
    const width = dialog?.width;
    const height = dialog?.height;
    const singular = dialog?.singular;
    const plural = dialog?.plural;
    const singularIndefiniteArticle = dialog?.singularIndefiniteArticle;
    const pluralDefiniteArticle = dialog?.pluralDefiniteArticle;
    const tab = dialog?.tab;

    //los principales tienen su propia  width y height, ESTO CASI ES EXLUCIVO PARA child_form_fields
    if (width && height && priority == 'secundary') {
      this.styleClassSecundaryDialog.set(width + ' ' + height);
    }

    if (singular) {
      this.singular[pos] = singular;
    }
    if (plural) {
      this.plural[pos] = plural;
    }
    if (singularIndefiniteArticle) {
      this.singularIndefiniteArticle[pos] = singularIndefiniteArticle;
    }
    if (pluralDefiniteArticle) {
      this.pluralDefiniteArticle[pos] = pluralDefiniteArticle;
    }
    if (tab > 0) {
      if (priority == 'main') {
        this.tabVisible.set(tab - 1);
      } else if (priority == 'secundary') {
        this.tabVisibleSecundary.set(tab - 1);
      }
    } else {
      if (priority == 'main') {
        this.tabVisible.set(0);
      } else if (priority == 'secundary') {
        this.tabVisibleSecundary.set(0);
      }
    }

    //|||DEBOR PONERLO FUERA DEL IF, PARA QUE AGREGUE EL VALOR AL FORMULARIO EN LOS SECUNDARIOS
    if (parent_id && id) {
      this.formTempo[pos].get(parent_id)?.setValue(id);
    }
  }

  // variables para las apps secundarias, no se pone como array ya que solo necesito para la principal o la secundaria,
  // no para cada app
  selectedSecundary = signal<any[]>([]);
  private isCreateSecundary: boolean = false;
  headerSecundary = signal('');
  itemsSecundary = signal<any[]>([]);
  totalRecordsSecundary = signal(0);
  // tiene la función de mantener en memoria los datos de las apps secundarias, para que no se consulten nuevamente
  styleClassSecundaryDialog = signal('width-650px-custom min-height-550px-custom');
  tabVisibleSecundary = signal(1);
  tabVisible = signal(1);

  openNewSecundary(options: { pos: any, node?: boolean, parent_id?: string }) {
    // similar a openNew pero para las apps secundarias (las app que se abren a partir de otras app como los documentos)


    const pos: any = options.pos;
    const parent_id = options?.parent_id;
    //this.selectedSecundary.set(this.selected());
    // dado que no voy a llamar a change Pos para que la app principal no cambie,
    // tengo que inicializar los valores correspondientes a la app secundaria
    this.isCreateSecundary = true;
    const parentSelect = this.selected()[0];
    const child_form_fields = parentSelect?.child_form_fields || {};
    console.log('child_form_fields', parentSelect, child_form_fields);
    if (!parentSelect.is_detail_required) {
      this.messageS.changeMessage(`${parentSelect?.name} no requiere detalle.`, null, {}, 'info');
      return;
    }

    if (!this.drawForm()[pos]) {
      // divide pos __, debido a que this.crudS.drawForm requiere el type de la app, solo puede haber una clave por app,
      //normalmente las app que llaman a la función openNewSecundary son app secundaria y se le pone diferenciador __ y type, ejemplo,
      // task--task-detail
      /*const posArr = String(pos).split('--');
      const posIndex = posArr.length > 1 ? posArr[1] : posArr[0];*/
      this.drawForm()[pos] = this.crudS.drawForm(pos);
      this.type[pos] = pos;
    }


    //obliga a regenerar el formulario sobre para todo aquellos regitros hijos que cambian en base al padre como child_form_fields
    //if (!this.formTempo[pos]) {
    // si ya se consulto al servidor, no se vuelve a consultar
    if (this.optionsFields[pos]) {
      this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos], pos);
      this.form.set(this.formTempo);
      this.resetFormDialog({ pos });

      if (child_form_fields?.draw) {
        //si children tiene sus propios valores de dialog, les da prioridad, sino los que ya se hayan inilizazado desde if (!this.drawForm()[pos]) 
        // y por ultimo los valores del padre
        //this.drawForm()[pos + '_' + 'child_form_fields'] = child_form_fields.draw;

        this.unifyDialog(pos, child_form_fields.draw?.dialog, 'secundary', parent_id, parentSelect?.id);
      }
      //si no entra a  if (child_form_fields?.draw) this.singular[pos] traeria los valores de if (!this.drawForm()[pos]), sino los del padre
      this.headerDialogSecundary.set(`Alta de ${this.singular[pos] || parentSelect?.name}`);
      this.showFormDialog(pos);
    } else {
      this.showBlocked();
      // se crear el formulario, se envia la app secundaria para que se consulte el formulario correspondiente, en lugar de this.app
      this.crudS.options(this.app[pos]).subscribe({
        next: (resp: any) => {
          this.optionsFields[pos] = resp.data.actions.POST;
          this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos], pos);
          this.form.set(this.formTempo);
          this.resetFormDialog({ pos });
          if (child_form_fields?.draw) {
            //const draw = child_form_fields.draw || {};
            //const field = child_form_fields.fields || {};    
            //this.drawForm()[pos + '_' + 'child_form_fields'] = child_form_fields.draw;
            //si children tiene sus propios valores de dialog, les da prioridad, sino los que ya se hayan inilizazado desde if (!this.drawForm()[pos]) 
            // y por ultimo los valores del padre
            this.unifyDialog(pos, child_form_fields.draw?.dialog, 'secundary', parent_id, parentSelect?.id);
          }
          //si no entra a  if (child_form_fields?.draw) this.singular[pos] traeria los valores de if (!this.drawForm()[pos]), sino los del padre
          this.headerDialogSecundary.set(`Alta de ${this.singular[pos] || parentSelect?.name}`);
          this.showFormDialog(pos);
          this.showBlocked(false);
        }
      });
    }
    /* } else {
       this.form.set(this.formTempo);
       this.showFormDialog(pos);
     }*/
  }

  /**
   * Abre el dialogo para editar un elemento y crea e inicializa el formulario
   */
  edit(): void {
    // Edit no recibe la app porque solo es un boton para todas las apps
    //console.log('inicio edit');

    const pos: any = this.pos() ?? 0;
    if (pos === null) return; // Salir si pos es null

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de is Create para inicializar el form
    this.isCreate.set(false);
    //crear o inicializa el form
    this.createForm(pos);
    this.getDetailEdit(this.selected()[0].id);
    this.headerDialog.set(`Editar ${this.singular[pos] || this.singular[0]}`);

    //recorre selected y pon null en todas las posiciones menos en la 0
    for (let i = 1; i < this.selected().length; i++) {
      this.selected()[i] = null;
    }
    //console.log('fin edit');
  }

  editSecundary(pos: any): void {
    // Edit no recibe la app porque solo is un boton para todas las apps

    // es indispensable que vaya antes de createF orm porque createF orm utiliza el valor de is Create para inicializar el form
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

    this.headerDialog.set(`Editar ${this.singular[pos] || this.singular[0]}`);

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

    pos = pos || this.pos();
    this.files = [];
    this.files64 = [];

    if (selected) {
      // [[[II ESC:001-07 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-07
      // Rehidrata tree-selects al shape real de PrimeNG (array de nodos con
      // key/label) y conserva la relación serializada para reenvío en edición.
      const drawAtPos = this.drawForm()[pos];
      for (const [key, value] of Object.entries(selected)) {
        if (key === 'classifiers' || key === 'included' || !Array.isArray(value)) continue;
        const fieldCfg = this._findFieldConfigInDraw(drawAtPos, key);
        if (fieldCfg?.type !== 'tree-select') continue;
        selected[key] = this._hydrateTreeSelectControlValue(selected, key, fieldCfg);
      }
      // ]]]FI
      //necesito seprar las fechas que se conviertes en 2 campos una para las convertidas y otras para el formulario enviado al servidor
      //this.timeZone trae las fechas a convertir, para las fechas de crud no har problema porque esas no se envias

      //selected.scheduled_date = new Date(selected.scheduled_date),

      this.currentForm(pos).reset(selected);
    } else {
      //const data = this.resetForm[pos] || this.resetForm[0]
      //console.log('reset formmm0000');
      this.currentForm(pos).reset(/*{
        ...data
      }*/);
    }
    //console.log('fin resetFormDialog', this.currentForm());
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
    this.itemsCache[pos] = temp;
    this.selected.set([]);
  }

  /**
   * Muestra los errores del formulario
   * @param pos Posición de la app en el array, si no se envia valor de la posión actual
   * @returns true si hay errores, false si no los hay
   */

  formErrors(pos = this.pos(), is_file = false): boolean {
    const form = this.currentForm(pos) as FormGroup;
    if (pos === null || !form) return false;


    if (form.valid) return false;

    const errors: any = { local: [] };

    const mark = (c: AbstractControl) => {
      c.markAsDirty({ onlySelf: true });
      c.markAsTouched({ onlySelf: true });
    };

    // Recorrido que soporta FormGroup y FormArray
    const visit = (ctrl: AbstractControl, path: string[]) => {
      if (ctrl.errors) {
        const fieldPath = path.join('.');
        console.log('[FIELD ERROR]', fieldPath, ctrl.errors);
        errors.local.push({ field: path.join('.'), errors: ctrl.errors });
        mark(ctrl);
      }

      if (ctrl instanceof FormGroup) {
        Object.entries(ctrl.controls).forEach(([k, child]) => visit(child, [...path, k]));
      } else if (ctrl instanceof FormArray) {
        ctrl.controls.forEach((child, i) => visit(child, [...path, String(i)]));
      }
      // FormControl: no hijos
    };

    visit(form, []);

    // Mensaje y salida
    console.log(this.customField()[pos]);

    (this.messageS as any).changeMessage('Revise campos marcados en rojo...', errors, this.customField()[pos]);
    return true;
  }


  /**
   * Valida las relaciones del formulario
   * @param pos Posición de la app en el array
   *
   * Para campos `tree-select` con `tree.serialization` declarado en su config
   * (estrategia genérica `child_relationship_with_parent_meta`) se transforma
   * la selección de TreeNodes en un array JSON:API "rico" con `meta` y campos
   * extra. `baseDJA` reconoce el flag `__rich:true` y los preserva tal cual.
   * El resto de campos mantienen el comportamiento original.
   */
  validateRelationships(pos: any) {
    // Pongo relationships=null en lugar de relationships=[], porque aunque esta vacio simpre entrará a la primera
    //condición (relationships=[]), tambin utilizó map para que no se modifique el array original
    this.crudS.relationships = this.relationships[pos] ? this.relationships[pos].map((obj: any) => ({ ...obj })) : [];
    // asigno el id de la relación al campo correspondiente, por ejemplo, si la relación es con user,
    //el campo se llama user ?????

    const formValueAll = this.currentForm(pos).value;
    const drawAtPos = this.drawForm()[pos];

    for (let element of this.crudS.relationships) {
      const rawValue = formValueAll[element.field];

      // Detección genérica de tree-select con serialización configurable.
      // No se hardcodea por nombre de campo: se busca la config del field en
      // el drawForm de esta posición.
      const fieldCfg = this._findFieldConfigInDraw(drawAtPos, element.field);
      const treeCfg = fieldCfg?.tree;
      if (fieldCfg?.type === 'tree-select' && treeCfg?.serialization && Array.isArray(rawValue)) {
        const serialized = this._serializeTreeSelection(rawValue, treeCfg);
        element.id = serialized;
        // Si la estrategia define un type diferente al declarado en relationships
        // (p.ej. el padre es `responsible` pero la relación es a `person`),
        // se respeta el type del primer item serializado para que baseDJA lo
        // use como fallback cuando algún item no traiga `type`.
        if (serialized.length && serialized[0].type) {
          element.type = serialized[0].type;
        }
        continue;
      }

      element.id = rawValue;
    }
  }

  /**
   * Busca recursivamente en la config `drawForm[pos]` el primer objeto cuyo
   * `field === fieldName`. Cubre `grid`, `card`, `fieldset`, `stepper.steps`,
   * `children.fields.{static|dynamic|derived}` y cualquier otra estructura
   * anidada sin acoplarse a un layout específico.
   */
  private _findFieldConfigInDraw(draw: any, fieldName: string): any | null {
    if (!draw || !fieldName) return null;
    const seen = new WeakSet<object>();
    const walk = (n: any): any | null => {
      if (!n || typeof n !== 'object') return null;
      if (seen.has(n)) return null;
      seen.add(n);
      if (Array.isArray(n)) {
        for (const it of n) {
          const r = walk(it);
          if (r) return r;
        }
        return null;
      }
      if (n.field === fieldName && (n.type || n.data_type || n.tree)) {
        return n;
      }
      for (const k of Object.keys(n)) {
        // evitar campos no estructurales que pueden contener strings idénticos
        const v = n[k];
        if (v && typeof v === 'object') {
          const r = walk(v);
          if (r) return r;
        }
      }
      return null;
    };
    return walk(draw);
  }

  // [[[II ESC:001-07 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-07
  /**
   * Rehidrata un tree-select en edición al shape que PrimeNG compara por `key`
   * y renderiza por `label`, conservando además la relación serializada para
   * poder reenviarla intacta cuando el usuario no toca el campo.
   */
  private _hydrateTreeSelectControlValue(selected: any, fieldName: string, fieldCfg: any): any[] {
    const current = Array.isArray(selected?.[fieldName]) ? selected[fieldName] : [];
    if (!current.length) return [];

    const first = current[0];
    if (first && typeof first === 'object' && first.key !== undefined && first.label !== undefined) {
      return current;
    }

    const relationItems = Array.isArray(selected?.[`${fieldName}__array`]) ? selected[`${fieldName}__array`] : [];
    const included = Array.isArray(selected?.included) ? selected.included : [];

    return current
      .map((rawValue: any) => {
        const relationId = rawValue?.data?.id ?? rawValue?.id ?? rawValue?.value ?? rawValue;
        if (!relationId) return null;

        const relation = relationItems.find((item: any) => item?.id === relationId)
          ?? (rawValue && typeof rawValue === 'object' ? rawValue : null);
        const includedItem = included.find((item: any) => item?.id === relationId) ?? null;
        const nodeType = this._resolveTreeSelectNodeType(relation, includedItem, fieldCfg);
        const serialized = this._buildTreeSerializedItemFromRelation(relation, fieldCfg, nodeType, relationId);

        return {
          key: nodeType ? `${nodeType}:${relationId}` : String(relationId),
          label: this._resolveTreeSelectNodeLabel(includedItem, relation, fieldCfg, relationId),
          data: {
            id: relationId,
            type: nodeType,
            parent: this._getTreeSelectParentFromSerializedItem(serialized),
            __serialized: serialized,
          },
          selectable: true,
          leaf: true,
          __serialized: serialized,
        };
      })
      .filter((node: any) => node !== null);
  }

  private _buildTreeSerializedItemFromRelation(relation: any, fieldCfg: any, fallbackType: string | null, fallbackId: any): any | null {
    const treeSer = fieldCfg?.tree?.serialization || {};
    const relationMeta = this._normalizeTreeRelationMeta(relation?.meta);
    const itemId = relation?.id ?? fallbackId ?? null;
    if (!itemId) return null;

    const item: any = {
      __rich: true,
      type: relation?.type || fallbackType || treeSer.relationship_type_default,
      id: itemId,
    };

    if (treeSer.meta && typeof treeSer.meta === 'object') {
      const metaOut: any = {};
      for (const key of Object.keys(treeSer.meta)) {
        const metaCfg = treeSer.meta[key] || {};
        const source = relationMeta?.[key] ?? relation?.meta?.[key] ?? null;
        if (!source?.id) continue;
        metaOut[key] = { type: source.type || metaCfg.type, id: source.id };
      }
      if (Object.keys(metaOut).length) item.meta = metaOut;
    }

    if (treeSer.extra && typeof treeSer.extra === 'object') {
      for (const key of Object.keys(treeSer.extra)) {
        if (relation?.[key] !== undefined) item[key] = relation[key];
        else if (relationMeta?.[key] !== undefined) item[key] = relationMeta[key];
        else item[key] = treeSer.extra[key];
      }
    }

    return item;
  }

  private _normalizeTreeRelationMeta(meta: any): any | null {
    if (Array.isArray(meta)) {
      return meta.find((item: any) => item && typeof item === 'object') || null;
    }
    return meta && typeof meta === 'object' ? meta : null;
  }

  private _resolveTreeSelectNodeType(relation: any, includedItem: any, fieldCfg: any): string | null {
    const levels = Array.isArray(fieldCfg?.tree?.levels) ? fieldCfg.tree.levels : [];
    const fallbackLevel = [...levels].reverse().find((level: any) => level?.selectable !== false)
      ?? [...levels].reverse().find((level: any) => !!level);
    return relation?.type
      || includedItem?.type
      || fallbackLevel?.resource
      || fallbackLevel?.data_type?.type
      || fallbackLevel?.name
      || null;
  }

  private _resolveTreeSelectLabelField(relation: any, includedItem: any, fieldCfg: any): any {
    const nodeType = this._resolveTreeSelectNodeType(relation, includedItem, fieldCfg);
    const rootCfg = fieldCfg?.tree?.root || {};
    const rootType = rootCfg?.resource || rootCfg?.data_type?.type || rootCfg?.name || null;
    if (rootCfg?.label_field && (!nodeType || rootType === nodeType)) {
      return rootCfg.label_field;
    }

    const levels = Array.isArray(fieldCfg?.tree?.levels) ? fieldCfg.tree.levels : [];
    const levelCfg = levels.find((level: any) => {
      const levelType = level?.resource || level?.data_type?.type || level?.name || null;
      return !!levelType && levelType === nodeType;
    });

    return levelCfg?.label_field || rootCfg?.label_field || fieldCfg?.option_label || 'name';
  }

  private _resolveTreeSelectNodeLabel(includedItem: any, relation: any, fieldCfg: any, fallbackId: any): string {
    const labelField = this._resolveTreeSelectLabelField(relation, includedItem, fieldCfg);
    const includedSource = includedItem?.attributes
      ? { id: includedItem.id, type: includedItem.type, ...includedItem.attributes }
      : includedItem;
    const includeLabel = this._readTreeSelectLabel(includedSource, labelField, String(fallbackId));
    return this._readTreeSelectLabel(relation, labelField, includeLabel);
  }

  private _readTreeSelectLabel(source: any, labelField: any, fallback: string): string {
    if (!source || typeof source !== 'object') return fallback;
    if (typeof source.label === 'string' && source.label.trim() !== '') return source.label.trim();

    const labelFields = typeof labelField === 'string' && labelField.includes(',')
      ? labelField.split(',').map((field: string) => field.trim()).filter((field: string) => field !== '')
      : [labelField || 'name'];
    const parts = labelFields
      .map((field: string) => source?.[field])
      .filter((value: any) => value != null && String(value).trim() !== '')
      .map((value: any) => String(value).trim());
    if (parts.length) return parts.join(' ');

    return String(source?.name ?? source?.display_name ?? source?.username ?? fallback ?? '');
  }

  private _getTreeSelectParentFromSerializedItem(serialized: any): any | null {
    if (!serialized?.meta || typeof serialized.meta !== 'object') return null;
    const parent = Object.values(serialized.meta)
      .find((value: any) => value && typeof value === 'object' && value.id);
    return parent ? { id: (parent as any).id, type: (parent as any).type || null } : null;
  }

  private _getPreserializedTreeSelectionItem(node: any, treeCfg: any): any | null {
    const explicit = node?.__serialized ?? node?.data?.__serialized;
    if (explicit && typeof explicit === 'object') {
      return this._buildTreeSerializedItemFromRelation(
        explicit,
        { tree: treeCfg },
        explicit?.type ?? node?.data?.type ?? null,
        explicit?.id ?? node?.data?.id ?? null,
      );
    }

    if (node?.__rich || node?.__jsonapi) {
      return this._buildTreeSerializedItemFromRelation(node, { tree: treeCfg }, node?.type ?? null, node?.id ?? null);
    }

    if ((!node?.data || typeof node.data !== 'object') && node?.id) {
      return this._buildTreeSerializedItemFromRelation(node, { tree: treeCfg }, node?.type ?? null, node?.id ?? null);
    }

    return null;
  }
  // ]]]FI

  /**
   * Convierte la selección actual de un `<p-treeSelect>` (array de TreeNodes)
   * en un array JSON:API "rico" segun `tree.serialization`.
   *
   * Estrategia soportada: `child_relationship_with_parent_meta`
   *   - Solo se serializan nodos seleccionables (hojas configuradas con
   *     `selectable: true`), descartando nodos raíz no seleccionables.
   *   - El `type` del item es el del nodo hijo (`selected_node.resource`).
   *   - El `id` del item es `selected_node.data.id`.
   *   - El `meta` se construye desde `tree.serialization.meta`, tomando
   *     `id_from`/`type` del nodo padre cuando se indica `parent_node.id`.
   *   - Cualquier `tree.serialization.extra` se mezcla en cada item
   *     (p.ej. `source: "M"` para selección manual).
   *
   * Si falta info crítica (parent en meta, id de child) el item se omite
   * para no enviar relaciones incompletas al backend.
   */
  private _serializeTreeSelection(selection: any[], treeCfg: any): any[] {
    if (!Array.isArray(selection)) return [];
    const ser = treeCfg?.serialization || {};
    const strategy = ser.strategy || 'child_relationship_with_parent_meta';
    const out: any[] = [];

    for (const node of selection) {
      // [[[II ESC:001-07 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-07
      const preserved = this._getPreserializedTreeSelectionItem(node, treeCfg);
      if (preserved) {
        out.push(preserved);
        continue;
      }
      // ]]]FI

      if (!node || typeof node !== 'object') continue;
      const data = node.data || {};
      // Solo nodos hoja seleccionables. p-treeSelect en checkbox propaga la
      // selección al padre; ese padre vendrá con selectable:false desde el
      // mapeo de TreeNodes y debe descartarse.
      if (node.selectable === false) continue;
      if (!data.id) continue;

      if (strategy === 'child_relationship_with_parent_meta') {
        const parentData = data.parent || node.parent?.data || null;
        const item: any = {
          __rich: true,
          type: data.type || ser.relationship_type_default,
          id: data.id,
        };
        // meta declarado en config: { meta: { responsible: { type: 'responsible', id_from: 'parent_node.id' } } }
        if (ser.meta && typeof ser.meta === 'object') {
          const metaOut: any = {};
          for (const k of Object.keys(ser.meta)) {
            const m = ser.meta[k] || {};
            const idFrom = m.id_from || 'parent_node.id';
            let metaId: any = null;
            if (idFrom === 'parent_node.id') metaId = parentData?.id ?? null;
            else if (idFrom === 'selected_node.id') metaId = data.id;
            if (!metaId) continue; // sin metadata padre no se serializa
            metaOut[k] = { type: m.type, id: metaId };
          }
          if (Object.keys(metaOut).length) item.meta = metaOut;
          else continue; // meta requerido y no resuelto
        }
        if (ser.extra && typeof ser.extra === 'object') {
          Object.assign(item, ser.extra);
        }
        out.push(item);
      } else {
        // Estrategia default: enviar como relación simple { type, id }
        out.push({ __rich: true, type: data.type, id: data.id });
      }
    }
    return out;
  }

  /**
   * comportamiento a la visibilidad del dialogo y al reseteo del formulario
   * @param options  opciones para el comportamiento del dialogo
   * @param pos Posición de la app en el array
   */
  commonVisibilityDialog(options: any) {
    const { pos, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true } = options;

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

    let { pos, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null, custom_user = null } = options;

    const safePos = pos as any; // Type assertion para índices de array

    //this.fields siempre se debe inclui sino no es validado el form
    const formData = data ? data : this.currentForm(safePos).value;
    const include = this.include[safePos];
    const filter = this.filter;
    //console.log('save if', this.currentForm(safePos).get('maintenance_document_data_documents')?.value, formData)


    //recorer formData y quitar todos los campos quue tiene la cadena document_
    Object.keys(formData).forEach((key) => {

      //console.log(key, typeof formData[key] === 'object', formData[key] !== null, formData[key]);

      const value = formData[key];

      if (value && typeof value === 'object') {
        const target = Array.isArray(value) ? value[0] : value;

        if (target && typeof target === 'object' && target.constructor === Object) {
          const field = (target as any).field;
          const innerKey = (target as any).key;

          // [[[II Borrar solo controles "duplicados" legacy: cuando el key del
          // formulario no coincide ni con el `field` ni con el `key` del
          // payload base64. Con la inversión de ruteo (base64 → key/documents),
          // el control `{prefix}documents` queda con items cuyo `key` ES su
          // propio nombre — NO debe borrarse. Ver docs/documents/2026-05-16_001. ]]]FI
          if (field && key && key !== field && key !== innerKey) {
            delete formData[key];
          } else if (field && key && key === field && !Array.isArray(value) && (target as any).file !== undefined) {
            // ✅ Normaliza campo tipo List: si el valor es un objeto suelto (caché antigua)
            // con datos de archivo (propiedad 'file'), lo envuelve en un array.
            formData[key] = [value];
          }
        }
      }
    });

    // ESCENARIO 3: fusionar URLs previas + nuevos base64 en form_fields_data_* tipo files
    this._mergeFormDataFiles(safePos, formData);

    // ESCENARIO 3: los dropdown-like de `form_fields_data_*` se dibujan con un
    // control string (`object_<field>`), pero el backend recibe un dict dentro
    // de `form_data`. Aquí se recompone ese dict antes de enviar.
    this._rebuildFormDataDicts(safePos, formData);

    // [[[II ESC:001-06 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-06
    // Parche temporal: NO convertir `*_documents=[]` a null. Mientras se
    // investiga por qué algunos controles se nulifican, es mejor omitir la
    // clave y dejar que el serializador final sanee el payload. ]]]FI
    for (const k of Object.keys(formData)) {
      if (!k.endsWith('documents')) continue;
      const v = formData[k];
      if (Array.isArray(v) && v.length === 0) delete formData[k];
    }

    //console.log('forrmmmmmmmmmmmmmmmmmm', formData);
    //revisar porque la primer seleccion del archivo se envia vacio de asset-document
    if (this.isCreate()) {
      this.crudS.saveObject({ formData, include, filter /*, files*/ }).subscribe({
        next: (resp: any) => {
          const temp = [...this.items()];
          const additionalFieldsAppCols = this.additionalFieldsAppCols[safePos] || [];
          temp.unshift(this.DJAtoObject({ resp, node, additionalFieldsAppCols }));

          //si se envia explicitamente true se asigna el predeterminado items, si se renvia una referencia se establece a esa referencia
          if (update_item === true) {
            this.items.set(temp);
          } else if (update_item) {
            update_item = temp
          }

          if (custom_user) {
            this.customUser(custom_user);
          }

          // tambien se actualiza el array de itemsNew para que cuando se cree un nuevo elemento se muestre en la tabla
          this.itemsCache[safePos] = temp;

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

      // ESCENARIO 1 (PATCH modelo principal): si el registro ya tenía relaciones
      // en `files` y el usuario NO añadió archivos nuevos, eliminar `documents`
      // del payload para conservar las relaciones existentes intactas.
      this._pruneDocumentsOnPatch(formData);

      // ESCENARIO 2 (PATCH): siempre enviar el id del hijo (`{prefix}id`) para
      // que el backend sepa a qué registro relacionado aplicar el cambio.
      // El id se capturó en _loadChildPrefixData → selected()[0][prefix+'id'].
      const _selPatch = this.selected()[0];
      if (_selPatch) {
        const _prefixes = this._normalizeFieldsPrefixes(safePos);
        for (const { prefix, config } of _prefixes) {
          if (!config || config.kind !== 'child') continue;
          const idKey = prefix + 'id';
          const childId = _selPatch[idKey];
          if (childId && formData[idKey] == null) {
            formData[idKey] = childId;
          }
        }
      }

      this.crudS.edit({ formData, id, include /*, files*/ }).subscribe({
        next: (resp: any) => {
          const msg = this.singular[safePos] || this.singular[0];

          this.messageS.changeMessage(
            `${msg.charAt(0).toUpperCase()}${msg.slice(1)} ${formData.name} modificado/a.`,
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
            this.isCreate.set(true);
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
    const { pos, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null } = options;

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

  local(form: FormGroup) {
    this.generalS.initialize();
    // Ahora siempre retorna un objeto válido, nunca null
    const coords = this.generalS.getLocationSnapshot();

    //const coords = await this.generalS.getCurrentLocation();
    // Garantiza coordenadas frescas y actualizadas

    // Forzar actualización
    //const location = await this.generalS.forceLocationUpdate();

    // Validar que coords existe y tiene las propiedades necesarias
    if (coords && typeof coords === 'object') {
      // Validar y asignar latitude
      if (coords.hasOwnProperty('latitude') && coords.latitude !== undefined && coords.latitude !== null) {
        const latitudeControl = form.get('latitude');
        if (latitudeControl) {
          latitudeControl.setValue(coords.latitude);
        }
      }

      // Validar y asignar longitude
      if (coords.hasOwnProperty('longitude') && coords.longitude !== undefined && coords.longitude !== null) {
        const longitudeControl = form.get('longitude');
        if (longitudeControl) {
          longitudeControl.setValue(coords.longitude);
        }
      }

      // Validar y asignar time_zone
      if (coords.hasOwnProperty('time_zone') && coords.time_zone !== undefined && coords.time_zone !== null) {
        const timeZoneControl = form.get('time_zone');
        if (timeZoneControl) {
          timeZoneControl.setValue(coords.time_zone);
        }
      }
    }
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
    const { pos, hide = true, reset = true, is_file = false, node = false, selected = null, update_item = true, data = null, custom_user = null } = options;
    const safePos = pos as any; // Type assertion para índices de array
    const form = this.currentForm(safePos);

    // Validar que el formulario existe antes de proceder
    if (!form) {
      console.log('Formulario no existe para la posición:', safePos);
      return;
    }

    this.local(form);

    if (this.formErrors(safePos, is_file)) return;
    this.validateRelationships(safePos);
    this.showBlocked();

    //if (is_file) {
    if (this.files.length > 0) {
      this.file(options);
    } else {

      //form.get('maintenance_document_data_documents')?.setValue(this.files64);

      console.log('save else', data, form.get('documents'), form.get('maintenance_document_data_documents'), this.files64)
      //form.get('documents')?.setValue(this.files64);
      this.submitForm({ pos, hide, reset, is_file, node, selected, update_item, data, custom_user });
    }
    /*} else {
      this.submitForm({ pos, hide, reset, is_file, node, selected, update_item, data, custom_user });
    }*/
  }

  saveSecundary(options: saveOptions = {}) {
    const { pos, hide = true, reset = true, is_file = false, node = false } = options;

    const safePos = pos as any; // Type assertion para índices de array

    this.local(this.currentForm(safePos));

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
      const include = this.fields[safePos] ? this.fields[safePos] : '';
      //const filter = this.filter;
      //const files = is_file ? this.files : null;

      this.crudS.saveObject({ formData, /*files,*/ include }).subscribe({
        next: (resp: any) => {
          //aqui voy, falta pasar el nuevo elemento creado a documentos, tambien el edit

          //Cuando el secundario no tabla que cargar el item no existe
          if (this.itemsSecundary()[safePos]) {
            const temp = [...this.itemsSecundary()[safePos]];
            temp.unshift(this.DJAtoObject({ resp, node }));
            //es para que no se actualice el item de la app principal,
            this.itemsSecundary()[safePos] = temp;
            // tambien se actualiza el array de itemsNew para que cuando se cree un nuevo elemento se muestre en la tabla
            //(this.sharedS as any).data[pos] = temp;
          }

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

  cancel() {
    //cancela la accion y elimina lo registrado en la bd
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
              this.itemsCache[pos] = this.items();
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
    this.importDialogVisible = true;
  }

  sortable(e: any) {
    alert();
  }

  actionsSelection() {
    this.actionsSelectionDialogVisible = true;
  }

  /**
   * Evento que se dispara al cerrar un dialogo de una app
   * @param app app que se va a ocultar
   */
  onHide(app = null) {
    this.isCreate.set(false);
    this.files = [];
    this.files64 = [];
  }

  /**
   * Evento que se dispara al mostrar un dialogo de una app, normalmente tiene que inicializar formularios antes de abrirse
   * @param app app que se va a mostrar
   */
  onShow(app: string = '') {

  }

  // aqui voy debo quitar el documernts 
  isShowDocumentsTab = signal<any[]>([]);
  onTabChange(e: any) {
    console.log('onTabChangeonTabChangeonTabChangeonTabChange', e);

    //const tab = e.originalEvent.target.innerText;
    //si se pica sobre la pestaña de documentos y si se esta en modo edición, carga los archivos
    if (e == 4 /*&& !this.isCreate*/) {
      // deberia existir una variable que le indique al componende de documentos app que se ingreso a la pestaña de documentos
      //para que sean cargados los documentos en lugar de que se acrguen cada vez que se abre el dialogo
      this.isShowDocumentsTab.set({
        ...this.isShowDocumentsTab(),
        [this.pos()]: true
      });
    } else {
      this.isShowDocumentsTab.set({
        ...this.isShowDocumentsTab(),
        [this.pos()]: false
      });
    }
  }

  /**
   * enciende la badera para abrir el dialog del formulario, no es el evento que se dispara al abrir el dialogo, 
   * sino que es la función que se debe llamar para abrir el dialogo, 
    * @param pos Posición de la app en el array, si no se envia valor de la posión actual
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
  commonSettings(concat: string[] | null = [], additionalElements: any[][] = []) {
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
    this.exportDialogVisible = true;
  }

  /**
   * Activa la bandera para mostrar el dialogo de configuración local
   */
  localSettings() {
    this.localSettingsDialogVisible = true;
    //inicializa el select de las columnas visibles de cada app cuando se abre la configuración local,
    //tambien puedo poner una funcion que se ejecute cuando se dispare el evento de mostrar la pantalla de configuracion local
    //this.configForm.controls['columns'].setValue(this.selected Columns().map(column => column.field));
    console.log('4 selected Columns');
    this.configForm.patchValue({
      columns: this.selectedColumns().map((column) => column.field)
    });
  }

  saveConfig() {
    const cols: any[] = this.configForm.value?.columns || [];
    const fields = this.configForm.value?.fields || {};

    const missingFields = this.cols().filter((col: any) => !cols.includes(col.field)).map((col: any) => col.field);
    this.removeColumns.set(missingFields);

    const currentPos: any = this.pos() ?? 0;
    if (currentPos !== null) {
      this.itemsRemove[currentPos] = missingFields;
    }

    this.filter = this.crudS.buildFilterString(fields);
    this.iniParam();
    this.getAll({ pos: currentPos, force: true });

    //this.configS.saveConfig(this.configForm.value);
    this.localSettingsDialogVisible = false;
  }

  onExportServer(e: any) { }
  /**
   * inicializa el select de las columnas visibles de cada app cuando se abre la configuración local
   */
  /*onShowConfig() {
      this.configForm.controls['columns'].setValue(this.selected Columns().map(column => column.field));
    }*/

  onFiles64(event: any[]) {
    console.log('event', event);

    this.files64 = event;
  }

  onFiles(event: any[]) {
    this.files = event;
  }

  onSelection(event: any[]) {
    this.selected.set(event);

    const ids_task = this.selected()[0]?.tasks;
    //if (ids_task) {
    const id = this.selected()[0]?.status;

    this.getStatus({ module: this.module[this.pos()], id, ids_task });
    //}
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
    console.log(event);

    this.exportDialogVisible = event;
  }

  onLocalSettingsDialogVisible(event: any) {
    this.localSettingsDialogVisible = event;
  }

  onImportDialogVisible(event: any) {
    this.importDialogVisible = event;
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
    if (!this.isCreate()) {
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

    const filter = `filter[classifiers]=${classifier_id}`; //${(parseInt(level) + 1)}
    const app = 'classifiers/classifier';
    const type = 'classifier';
    const include = 'classifier_level';
    const fields = 'classifier_level,name,is_required';

    this.crudS.getObject({ include, fields, filter, app, type }).subscribe(
      (data: any) => {

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

    if (this.isCreate()) {
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

    pos = pos || this.pos();
    pos = pos ?? 0;
    if (this.classifierLevelsGen()[pos]) {
      this.unifyRestoreForm(data);
      return;
      // si la app no tiene clasificadores, se restablece el formulario
    } else if (!this.classifierFormGen) {
      this.unifyRestoreForm(data);
      return;
    }

    const include = 'classifier_level';
    const filter = `filter[classifier_level.classifier_type]=${this.module[pos]}`; //'filter[classifier_level.classifier_type.in]=' + classifiers_type
    const fields = 'classifier_level,name,is_required';
    const app = 'classifiers/classifier';
    const type = 'classifier';

    this.crudS
      .getObject({ include, filter, fields, app, type })
      .pipe()
      .subscribe({
        next: (classifiers: any) => {
          // este  objecto es para que agregar campos adicionales al objecto principal desde la relación incluida
          const fields_include = {
            classifier_level: [
              { field: 'level', renamed_fields: 'level' },
              { field: 'classifier_type', renamed_fields: 'classifier_type' },
              { field: 'is_required', renamed_fields: 'is_required' }
            ]
          };

          // los array vacios es para que DJAtoObject no tome los valores por default o de la app donde se estan cargado
          //los clasificadores y evitar iteraciones innecesarias
          const classifiersFormat = this.DJAtoObject({
            resp: classifiers,
            /*additionalFieldsIncluded: null,
            customField: null,
            fieldsBool: null,
            moreFields: null*/
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

    for (let i = 0; i < data.length; i++) {
      if (data[i].module === module) {
        //buscar en el array dependsOn si existe id
        //dejo shared porque status siempre se consulta con todos los campos y se comparte  en todos los lugares
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

    // dejo shared porque status siempre se consulta con todos los campos y se comparte  en todos los lugares
    if ((this.sharedS as any).data['status'] && !force) {
      this.dependentStatus((this.sharedS as any).data['status'], module, id);
      this.getTask({ module, ids_task });
      return;
    }

    // dejo shared porque status siempre se consulta con todos los campos y se comparte  en todos los lugares
    this.showBlocked();
    this.crudS.getObject({ app: 'status/status' }).subscribe({
      next: (resp: any) => {
        (this.sharedS as any).data['status'] = this.DJAtoObject({ resp });
        this.dependentStatus((this.sharedS as any).data['status'], module, id);
        this.getTask({ module, ids_task });
        this.showBlocked(false);
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al cargar los estados.`, err, this.customField());
        this.showBlocked(false);
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
    this.showBlocked();


    const id = this.selected()[0]?.id;
    const type = this.type[safePos];
    const app = this.app[safePos];
    const relationships = [{ field: 'status', type: 'status', id: status }];

    this.crudS.edit({ id, app, type, relationships, include: this.include[safePos] }).subscribe({
      next: (resp: any) => {
        this.updateRecord(resp, id, pos);
        this.showBlocked(false);
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al modificar el estatús.`, err, this.customField());
        this.showBlocked(false);
      }
    });
  }



  /*get hasTaskModule(): boolean {
    return Object.keys(this.tasksModule).length > 0;
  }*/

  runTask(options: any = {}) {
    this.tasksModule.set(options);
  }



  closeTaskModule() {
    this.tasksModule.set({});
  }

  taskModule(data: any, module: string, ids_task: []) {
    const task = [];

    for (let i = 0; i < data.length; i++) {
      //if (data[i].action_app[module]) {

      // Verificar si modules es un array y contiene el module buscado
      const modules = data[i].modules;
      const moduleMatch = Array.isArray(modules) ? modules.includes(module) : modules === module;

      if (moduleMatch) {
        const id = data[i]?.id;
        const exists = ids_task ? ids_task.find((ele) => ele === id) : [];

        //dejo shared porque task siempre se consulta con todos los campos y se comparte  en todos los lugares
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

    if (ids_task == null || ids_task.length === 0) {
      return;
    }

    // dejo shared porque task siempre se consulta con todos los campos y se comparte  en todos los lugares
    if ((this.sharedS as any).data['task'] && !force) {
      const task = this.taskModule((this.sharedS as any).data['task'], module, ids_task);
      //añade a startMenu el valor que tare + el separador + el valor que trae task, utilizando update
      this.startMenu.update((current) => [...current, { separator: true }, ...task]);
      //this.startMenu.set([...this.startMenu(), { separator: true }, ...task]);
      return;
    }

    this.crudS.getObject({ app: 'tasks/task' }).subscribe({
      next: (resp: any) => {
        let task = this.DJAtoObject({ resp });

        // dejo shared porque task siempre se consulta con todos los campos y se comparte  en todos los lugares
        (this.sharedS as any).data['task'] = task;
        task = this.taskModule(task, module, ids_task);
        console.log('*************', task);

        this.startMenu.update((current) => [...current, { separator: true }, ...task]);
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al cargar las tareas.`, err, this.customField());
      }
    });
  }

  onImportSave(data: any) {
    const pos = this.pos();

    this.isCreate.set(true); // para que no se muestre el boton de editar
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
  searchFieldDrawForm(field: any, pos = this.pos(), del = false) {
    const safePos: any = pos ?? 0; // Asegura que pos sea un número válido, si no se envía, se usa 0

    const draw = this.drawForm()[safePos];

    for (const tab in draw) {
      if (!draw.hasOwnProperty(tab) || tab === 'dialog') continue;

      const grids = draw[tab];

      for (const grid in grids) {
        if (!grids.hasOwnProperty(grid)) continue;

        const element = grids[grid];

        if (grid === 'grid' || grid === 'nested') {
          // Puede ser Array o un objeto tipo {0:{},1:{}}; tratamos ambos casos
          const isArray = Array.isArray(element);
          const elementValues = isArray ? element : Object.values(element);
          const general = this.searchByValueObject(field, elementValues, 'field');

          if (general[1] >= 0) {
            // clave/indice real dentro de element
            const realKey = isArray ? general[1] : Object.keys(element)[general[1]];
            if (del) {
              if (isArray) {
                element.splice(realKey as number, 1);
              } else {
                delete element[realKey as any];
              }
              break; // deja de buscar en este grid
            }
            // Retorna el elemento (sin eliminar). No usar splice porque modifica y rompe cuando es objeto.
            return isArray ? element[realKey as number] : element[realKey as any];
          }

          // No lo encontró directamente, buscar dentro de card o fieldset de cada item
          for (const key in element) {
            if (!element.hasOwnProperty(key)) continue;

            const current = element[key];
            if (!current) continue;

            let nestedElement = this.searchByKeyObject('card', current);
            if (!nestedElement) nestedElement = this.searchByKeyObject('fieldset', current);

            if (nestedElement) {
              const nestedValues = Object.values(nestedElement);
              const r = this.searchByValueObject(field, nestedValues, 'field');
              if (r[1] >= 0) {
                const nestedKey = Object.keys(nestedElement)[r[1]];
                if (nestedKey) {
                  if (del) {
                    // eliminar respetando si es array u objeto
                    const nestedIsArray = Array.isArray(nestedElement);
                    if (nestedIsArray) {
                      (nestedElement as any).splice(r[1], 1);
                    } else {
                      delete (nestedElement as any)[nestedKey];
                    }
                    break;
                  }
                  return (nestedElement as any)[nestedKey];
                }
              }
            }
          }
        }
      }
    }
  }


  onChangeDropdown(e: any) {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    console.log(`🔄 [${timestamp}] CRUD onChangeDropdown INICIO`, {
      field: e?.field,
      eventValue: e?.event?.value,
      hasObject: !!e?.object
    });

    const field = e?.field;
    const id = e?.event.value;
    /*const object = e?.object;

    console.log('onChangeDropdown:', { field, id, object, event: e?.event });

    // Verificar si el campo tiene un campo oculto asociado para objetos
    if (object?._hidden_object_field) {
      const hiddenFieldName = object._hidden_object_field;

      // Buscar el objeto completo en las opciones/choices del campo
      let selectedObject = null;

      if (object.choices && Array.isArray(object.choices)) {
        selectedObject = object.choices.find((choice: any) => choice.id === id || choice.value === id);
        console.log('Buscando en choices:', object.choices, 'ID buscado:', id, 'Encontrado:', selectedObject);
      } else if (object.options && Array.isArray(object.options)) {
        selectedObject = object.options.find((option: any) => option.id === id || option.value === id);
        console.log('Buscando en options:', object.options, 'ID buscado:', id, 'Encontrado:', selectedObject);
      }

      // Actualizar el campo oculto con el objeto completo
      if (selectedObject && this.currentForm()?.get(hiddenFieldName)) {
        this.currentForm()?.get(hiddenFieldName)?.setValue(selectedObject);
        console.log(`Campo oculto ${hiddenFieldName} actualizado con:`, selectedObject);
      } else {
        console.log('No se pudo actualizar:', {
          selectedObject,
          hiddenField: this.currentForm()?.get(hiddenFieldName),
          hiddenFieldName
        });
      }
    } else {
      console.log('No tiene campo oculto asociado:', object);
    }*/

    const endTime = performance.now();
    const duration = endTime - startTime;
    const endTimestamp = new Date().toISOString();
    console.log(`✅ [${endTimestamp}] CRUD onChangeDropdown FIN`, {
      field: e?.field,
      durationMs: duration.toFixed(2)
    });
  }

  onKeydownEnter(e: any) {

  }

  onClosableIconDropdown(e: any) {

  }


  onChangeToggle(e: any) { }

  onNewIconDropdown(e: any) {
  }

  onSelectAutoComplete(e: any) {
    const startTime = performance.now();
    const field = e?.field;
    const selectedObject = e?.event; // En autocomplete, el event es el objeto seleccionado
    const object = e?.object;

    // Verificar si el campo tiene un campo oculto asociado para objetos
    if (object?._hidden_object_field) {
      const hiddenFieldName = object._hidden_object_field;

      // En autocomplete, el event ya es el objeto completo seleccionado
      if (selectedObject && this.currentForm()?.get(hiddenFieldName)) {
        this.currentForm()?.get(hiddenFieldName)?.setValue(selectedObject);
        console.log(`Campo oculto ${hiddenFieldName} actualizado con:`, selectedObject);
      }
    }
  }

  configDialog() { }

  onVisibleChange(event: any) {
    this.actionsSelectionDialogVisible = event;
  }

  customUser(buttonInfo: any) {
    const { action, config, formValues } = buttonInfo;
    const formGroup = this.currentForm();

    // ============================================
    // RESETEAR CAMPOS ESPECÍFICOS DEL FORMULARIO
    // ============================================
    if (config.fields_reset_form && typeof config.fields_reset_form === 'object') {
      if (formGroup) {

        // Iterar sobre las propiedades del objeto fields_reset_form
        Object.keys(config.fields_reset_form).forEach((fieldName: string) => {
          const fieldSettings = config.fields_reset_form[fieldName];

          if (fieldName && formGroup.get(fieldName)) {
            const control = formGroup.get(fieldName);
            // Verificar si el campo es un objeto para realizar el mismo proceso
            const object_control = formGroup.get('object_' + fieldName);

            if (control) {
              // Establecer el valor
              control.setValue(fieldSettings.value !== undefined ? fieldSettings.value : '');
              object_control?.setValue(fieldSettings.object_value !== undefined ? fieldSettings.object_value : null);
              //aqui voy debo estabñecer los mosmo procesode para los campos que inician en objec_

              // Configurar required
              if (fieldSettings.required !== undefined) {
                if (fieldSettings.required) {
                  control.setValidators([Validators.required]);
                  object_control?.setValidators([Validators.required]);
                } else {
                  control.clearValidators();
                  object_control?.clearValidators();
                }
                control.updateValueAndValidity();
                object_control?.updateValueAndValidity();
              }

              // Configurar disabled
              if (fieldSettings.disabled !== undefined) {
                if (fieldSettings.disabled) {
                  control.disable();
                  object_control?.disable();
                } else {
                  control.enable();
                  object_control?.enable();
                }
              }

              console.log(`✅ [CRUD] Campo "${fieldName}" reseteado:`, {
                value: fieldSettings.value,
                required: fieldSettings.required,
                disabled: fieldSettings.disabled
              });
            }
          } else {
            console.warn(`⚠️ [CRUD] Campo "${fieldName}" no encontrado en el formulario`);
          }
        });
      }
    }

    // ============================================
    // DESHABILITAR CAMPOS ESPECÍFICOS
    // ============================================
    if (config.fields_disable && Array.isArray(config.fields_disable)) {
      if (formGroup) {
        console.log('🔒 [CRUD] Deshabilitando campos específicos:', config.fields_disable);


        config.fields_disable.forEach((fieldName: string) => {
          if (fieldName && formGroup.get(fieldName)) {
            const control = formGroup.get(fieldName);
            const object_control = formGroup.get('object_' + fieldName);

            if (control) {
              control.disable();
              object_control?.disable();
              console.log(`✅ [CRUD] Campo "${fieldName}" deshabilitado`);
            }
          } else {
            console.warn(`⚠️ [CRUD] Campo "${fieldName}" no encontrado en el formulario`);
          }
        });
      }
    }
  }

  /**
   * Esta función es similar a SAVE, pero permite que el usuario realice ciertas acciones adicionales
   * y la ejecute el button del custom-draw-form que el usuario puede personalizar. por eso se separa
   * de SAVE, se pone aqui para aprovechas funciones similares de SAVE
   * @param buttonInfo Información del botón clickeado que incluye action, config, formValues, etc.
   */
  handleButtonClick(buttonInfo: any): void {
    const { action, config, formValues } = buttonInfo;
    const formGroup = this.currentForm();
    const currentPos: any = this.pos();

    console.log('🔘 [CRUD] Botón clickeado::::', buttonInfo);

    // ============================================
    // LÓGICA CRUD SEGÚN LA ACCIÓN
    // ============================================

    // AGREGAR/CREAR - Guardar nuevo registro
    if (action === 'save') {
      this.save({ pos: currentPos, hide: false, reset: false, is_file: true, update_item: false, custom_user: buttonInfo });

      // TODO: Agregar lógica para crear nuevo registro
      // Ejemplo: llamar al servicio CRUD para guardar
      // this.crudS.create(this.app, formValues).subscribe(...)
    }

    // EDITAR/ACTUALIZAR - Modificar registro existente
    if (action === 'edit') {
      console.log('✏️ [CRUD] Acción: EDITAR/ACTUALIZAR');

      // Validar formulario antes de editar
      if (formGroup?.invalid) {
        console.warn('⚠️ [CRUD] Formulario inválido, no se puede editar');
        // TODO: Mostrar mensaje de error al usuario
        return;
      }

      // TODO: Agregar lógica para actualizar registro existente
      // Ejemplo: llamar al servicio CRUD para actualizar
      // const id = formValues.id || config.send_additional_data?.id;
      // this.crudS.update(this.app, id, formValues).subscribe(...)
    }

    // ELIMINAR - Borrar registro
    if (action === 'delete') {
      console.log('🗑️ [CRUD] Acción: ELIMINAR');

      // TODO: Agregar confirmación antes de eliminar
      // TODO: Agregar lógica para eliminar registro
      // Ejemplo: mostrar confirmación y luego llamar al servicio
      // const id = formValues.id || config.send_additional_data?.id;
      // confirm() && this.crudS.delete(this.app, id).subscribe(...)
    }

    // RESTABLECER/RESETEAR - Limpiar formulario
    if (action === 'reset') {
      console.log('🔄 [CRUD] Acción: RESTABLECER/RESETEAR');

      // Resetear todo el formulario
      formGroup?.reset();

      // TODO: Agregar lógica adicional después de resetear
      // Ejemplo: limpiar arrays, resetear estados, etc.
    }

    // CANCELAR - Cancelar operación
    if (action === 'cancel') {
      console.log('❌ [CRUD] Acción: CANCELAR');

      // Restablecer formulario a valores originales
      formGroup?.reset();

      // TODO: Agregar lógica para cancelar y volver al estado anterior
      // Ejemplo: cerrar dialog, navegar atrás, etc.
    }

    // BUSCAR - Buscar registros
    if (action === 'search' || action === 'find') {
      console.log('🔍 [CRUD] Acción: BUSCAR');

      // TODO: Agregar lógica de búsqueda
      // Ejemplo: llamar servicio con filtros del formulario
      // this.crudS.search(this.app, formValues).subscribe(...)
    }
  }

  /**
   * @param elementos Elementos que se transformarán, respuesta del servidor

   * @param additionalFieldsIncluded Campos adicionales que se deben agregar de la relacion incluida, si no se envia,
   *   solo retornará nombre_de_campo_incluido__name, si quiero que regrese otro valor, por ejeplo, level, tengo que enviar
   *   [{ field_included: 'level', renamed_fields: 'level'}], notese que en valo lo regresara en level, por, renamed_fields: 'level',

   * @param customField nombre de campos personalizados, la clave es el campo en ingles que envía el servidor
   * @param fieldsBool Campos con valor booleano que convierte a texto en base al valor bool
   * @param moreFields Toma el id y agrega un campo nombre del campo __text, y lo convierte en texto debe ser un array
   * que contienes arrays donde debe venir el nombre del campo y el array de valores [[nombre_del_campo,{id:1, name:'Nombre'}],[]],
   * @param node regresa los valores en formato para nodo, con children, expanded, etc
   * @param additionalFieldsAppCols Campos adicionales que se deben agregar desde las columnas de la app actual
   *        °°°realmente esta pensado para el productos o campos que tiene el mismo principio, debo deprecarlo ya que cols de la configuración ya hace eso
   *          "cols": {
                "hide": True,
                "label": "",
                "sortable": True,
                "locked": False,
                "fields":  {
                    #0:{"field":"name"}
                }
            },
            OJOOOOOO: si pienso reemplzarlo por additionalFieldsIncluded debo revisar el autocomplete ya que el panel lo considera y si lo pongo
            para el panel podria afectar a las columnas de la tabla
            tambien hay que tomar en cuenta que additionalFieldsAppCols requieere que el campo termine en _data
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
      timeZone: this.timeZone[safePos],
      node: node,
      additionalFieldsAppCols: additionalFieldsAppCols,
      //los capos para las configuraciones
      fields: this.crudS.fieldsForm(safePos)
    });
  }
}
