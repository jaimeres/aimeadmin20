import { CommonModule, KeyValue } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators, FormBuilder } from '@angular/forms';
import { Component, ElementRef, EventEmitter, inject, Input, Output, signal, computed, SimpleChanges, ViewChild } from '@angular/core';
// ************************ADAPTADO PARA CAPACITOR*********************
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { ImageModule } from 'primeng/image';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitButton } from 'primeng/splitbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TreeSelectModule } from 'primeng/treeselect';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AutoFocusModule } from 'primeng/autofocus';

import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CRUDService } from '../../utils/services/crud.service';
import { SharedDynamicDataService } from '@/utils/services/shared-dynamic-data.service';
import { GeneralService } from '@/utils/services/general.service';
import { CustomButtonCrudComponent } from '../custom-button-crud/custom-button-crud.component';

@Component({
  selector: 'app-custom-draw-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AutoCompleteModule,
    MultiSelectModule,
    ToggleButtonModule,
    TextareaModule,
    InputNumberModule,
    TreeSelectModule,
    DatePickerModule,
    SelectModule,
    SelectButtonModule,
    SplitButton,
    CardModule,
    FieldsetModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    ImageModule,
    PasswordModule,
    FloatLabelModule,
    InputGroupModule,
    InputGroupAddonModule,
    AutoFocusModule,
    TableModule,
    TagModule,
    TooltipModule,
    CustomButtonCrudComponent,

    SplitButtonModule
  ],
  templateUrl: './custom-draw-form.component.html',
  styleUrl: './custom-draw-form.component.scss',
  standalone: true
})
export class CustomDrawFormComponent {

  @ViewChild('videoElement') video!: ElementRef;
  @ViewChild('canvasElement') canvas!: ElementRef;

  private crudS: any = inject(CRUDService);
  private sharedS: SharedDynamicDataService = inject(SharedDynamicDataService);
  private generalS: GeneralService = inject(GeneralService); // funciones generales
  private fb: FormBuilder = inject(FormBuilder);

  @Input() formGroup!: FormGroup;
  @Input() drawForm: any;
  @Input() app: any;
  @Input() tabPanel!: string;
  //@Input() customField: any;
  @Input() optionLabel: any = 'label';
  @Input() showIcon: boolean = true;

  @Output() onChangeDropdownAction = new EventEmitter<any>();
  @Output() onShowDropdownAction = new EventEmitter<any>();
  @Output() onSelectAutoCompleteAction = new EventEmitter<any>();

  @Output() onNewIconDropdownAction = new EventEmitter<any>();
  @Output() onReloadIconDropdownAction = new EventEmitter<any>();
  @Output() onClosableIconDropdownAction = new EventEmitter<any>();
  @Output() onChangeToggleAction = new EventEmitter<any>();

  @Output() onKeydownEnterTextAction = new EventEmitter<any>();
  @Output() onKeydownTabTextAction = new EventEmitter<any>();

  @Output() onKeydownTabNumberAction = new EventEmitter<any>();
  @Output() onKeydownEnterNumberAction = new EventEmitter<any>();
  @Output() filesAction = new EventEmitter<[]>();
  @Output() files64Action = new EventEmitter<[]>();

  // Table outputs
  @Output() onTableRowSelect = new EventEmitter<any>();
  @Output() onTableRowUnselect = new EventEmitter<any>();
  @Output() onTableAddRow = new EventEmitter<any>();
  @Output() onTableEditRow = new EventEmitter<any>();
  @Output() onTableDeleteRow = new EventEmitter<any>();
  @Output() onTableCellEdit = new EventEmitter<any>();

  formGroupSignal = signal<FormGroup | null>(null);
  drawFormSignal = signal<any>(null);
  appSignal = signal<string>('');
  tabPanelSignal = signal<string>('');
  //customFieldSignal = signal<any>(null);
  optionLabelSignal = signal<any>('label');
  showIconSignal = signal<boolean>(true);

  dropdownOptionsSignal = signal<any>([]);

  // Signal para forzar recálculo del computed signal de firmas
  private signatureUpdateTrigger = signal<number>(0);

  /**
   * Computed signal que contiene los datos de todas las firmas
   * Se recalcula automáticamente solo cuando cambia formGroupSignal O signatureUpdateTrigger
   * Estructura: { [field: string]: { all: any[], history: any[], hasData: boolean, hasHistory: boolean } }
   */
  signatureDataSignal = computed(() => {
    // Incluir el trigger para forzar recalculación
    this.signatureUpdateTrigger();

    const formGroup = this.formGroupSignal();
    if (!formGroup) return {};

    const signatureData: Record<string, {
      all: any[];
      history: any[];
      hasData: boolean;
      hasHistory: boolean;
    }> = {};

    // Iterar sobre todos los controles del formulario
    Object.keys(formGroup.controls).forEach(fieldName => {
      const control = formGroup.get(fieldName);

      // Solo procesar FormArrays (campos de firma)
      if (control instanceof FormArray) {
        const allData = control.value || [];
        const historyData = allData.length > 1 ? allData.slice(0, -1) : [];

        signatureData[fieldName] = {
          all: allData,
          history: historyData,
          hasData: allData.length > 0,
          hasHistory: historyData.length > 0
        };

        // 🔍 DEBUG: Ver qué datos se están procesando
        console.log('📊 signatureDataSignal procesando:', {
          fieldName,
          allDataLength: allData.length,
          historyLength: historyData.length,
          hasHistory: historyData.length > 0,
          allData,
          historyData
        });
      }
    });

    console.log('✅ signatureDataSignal resultado completo:', signatureData);
    return signatureData;
  });

  //funcion para verificar si los datos ya existen en sharedS.data o sharedS.drawDropdown
  dataDropdownExists(element: any, force = false): boolean {
    // si tiene opciones no se consulta al servidor    
    //aqui voy estoy revisando porque option no se inicializa con los dartos del choice y como se parseMarkerlos dropdawn en sabe al modulo
    //no lleva force ya que no consulta al servidor
    if (element.options && Array.isArray(element.options) && element.options.length > 0) {
      return element.options;
    }


    //si ya existe datos para ese dropdown no se vuelve a consultar
    if (this.sharedS.data[element.field] && !force) {
      return this.sharedS.data[element.field];
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar, va depsues de la validación de generalS.data,
    // porque seguramente trae los datos mas actualizados, por ejemplo cuando se agregan  o eliminan elementos
    if (this.sharedS.drawDropdown[element.field] && !force) {
      return this.sharedS.drawDropdown[element.field];
    }

    return false;
  }

  dataDropdown(element: any, force = false) {

    const dropdownOptions = this.dataDropdownExists(element, force);
    if (dropdownOptions && !force) {
      this.dropdownOptionsSignal()[element.field] = dropdownOptions;
      return;
    }
    //si no existe datos para ese dropdown se consulta al servidor,
    // en lugar de poner la app y el type en cada campo de json que genera el draw se pone una referencia
    // a un objeto que tiene la app y el type para evitar que esta info se guarde en el servidor y se pueda inyectar en el componente
    const app = this.crudS.appType[element.data_type]?.app;
    const type = this.crudS.appType[element.data_type]?.type;
    if (app && type) {

      this.crudS.getObject({ app, type }).subscribe((data: any) => {
        //let dataDropdown = data.data.map((item: any) => {
        let dataDropdown = this.generalS.DJAtoObject({
          respDJA: data,
          additionalFieldsIncluded: []
        });
        /*return {
          id: item.id,
          name: item.attributes.name,
          module: item.attributes.module,
          "rear_plate": 222
        }*/
        //console.log('++++++++', dataDropdown);

        //return item;
        //});

        // Verificamos si al menos un objeto tiene un 'module' diferente de null,
        //esto es para los registros que tienen module, es decir, deferencia a que app pertenece
        const hasNonNullModule = dataDropdown.some((item: any) => item.module !== undefined);

        // Si existe al menos un module no nulo, filtramos solo los que sean 'MA'
        if (hasNonNullModule) {
          dataDropdown = dataDropdown.filter((item: any) => item.module === 'MA');
        }

        this.sharedS.drawDropdown[element.field] = dataDropdown;
        this.dropdownOptionsSignal()[element.field] = dataDropdown;
      });
    }
  }

  dropdownOptions(drawForm: any) {
    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];
          /*if(element.type=='choice'){
          #esto esta cubierto arriba porque aunque no diga explicitamente que es choice, cae en la segunda doncición,
          # y tiene la ventaja que si se envia options sobreescribe choices que se cargan en generar el fiormulario
              this.dropdownOptionsSignal()[element.field] = this.sharedS.data[element.field];
              ademas ya esta diseñado para cambiar optionValue y optionLabel por id y name, seria contraproducente
              agregar otro elemento

          }else*/ if (element?.type == 'dropdown' || element?.type == 'tree-select' || element?.type == 'multi-select') {
            this.dataDropdown(element);

          } else if (element?.card || element?.fieldset) {
            const nestedElements = element.card || element.fieldset;

            for (const key2 in nestedElements) {
              if (nestedElements.hasOwnProperty(key2)) {
                const element2 = nestedElements[key2];
                if (element2.type == 'dropdown' || element2.type == 'tree-select' || element2.type == 'multi-select') {

                  this.dataDropdown(element2);
                }
              }
            }
          }
        }
      }
    }
  }

  initializeTableFields(drawForm: any) {
    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];

          if (element?.type === 'table') {
            const control = this.getFormControl(element.field);
            if (control && (!control.value || control.value.length === 0)) {
              // Initialize with default value from config or empty array
              const defaultValue = element.default?.value || [];
              const initialData = defaultValue.length > 0 ? defaultValue : this.initializeTableData(element);
              control.setValue(initialData);
            }
          } else if (element?.card || element?.fieldset) {
            const nestedElements = element.card || element.fieldset;
            for (const key2 in nestedElements) {
              if (nestedElements.hasOwnProperty(key2)) {
                const element2 = nestedElements[key2];
                if (element2?.type === 'table') {
                  const control = this.getFormControl(element2.field);
                  if (control && (!control.value || control.value.length === 0)) {
                    const defaultValue = element2.default?.value || [];
                    const initialData = defaultValue.length > 0 ? defaultValue : this.initializeTableData(element2);
                    control.setValue(initialData);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Inicializa los campos de firma
   */
  initializeSignatureFields(drawForm: any) {
    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];

          if (element?.type === 'signature') {
            this.initSignatureData(element.field, element);
          } else if (element?.card || element?.fieldset) {
            const nestedElements = element.card || element.fieldset;
            for (const key2 in nestedElements) {
              if (nestedElements.hasOwnProperty(key2)) {
                const element2 = nestedElements[key2];
                if (element2?.type === 'signature') {
                  this.initSignatureData(element2.field, element2);
                }
              }
            }
          }
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {

    if (changes['formGroup']) {
      const previousValue = changes['formGroup'].previousValue;
      const currentValue = changes['formGroup'].currentValue;

      this.formGroupSignal.set(currentValue);

      // Si el formGroup cambió (reset o nuevo objeto), limpiar todos los canvas de firma
      if (previousValue !== currentValue && currentValue) {
        setTimeout(() => {
          this.clearAllSignatureCanvases();
        }, 300);
      }
    }
    if (changes['drawForm']) {
      this.drawFormSignal.set(changes['drawForm'].currentValue);

      this.dropdownOptions(changes['drawForm'].currentValue);
      this.initializeTableFields(changes['drawForm'].currentValue);
      this.initializeSignatureFields(changes['drawForm'].currentValue);

    }
    if (changes['app']) {
      this.appSignal.set(changes['app'].currentValue);
    }
    if (changes['tabPanel']) {
      this.tabPanelSignal.set(changes['tabPanel'].currentValue);
    }
    /*if (changes['customField']) {
      this.customFieldSignal.set(changes['customField'].currentValue);
    }*/
    if (changes['optionLabel']) {
      this.optionLabelSignal.set(changes['optionLabel'].currentValue);
    }
    if (changes['showIcon']) {
      this.showIconSignal.set(changes['showIcon'].currentValue);
    }

  }

  keyComparator(a: KeyValue<number, any>, b: KeyValue<number, any>): number {
    return a.key - b.key;
  }

  public suggestions = signal<any[]>([]);

  completeMethod(event: any, entry: any) {

    const filter = "filter[search]=" + event.query;
    const include = entry.include;
    const additionalFieldsIncluded = entry.additionalFieldsIncluded;
    const app = this.crudS.appType[entry.data_type]?.app;
    const type = this.crudS.appType[entry.data_type]?.type;

    this.crudS.getObject({ app, type, filter, include }).subscribe((data: any) => {
      data = this.generalS.DJAtoObject({
        respDJA: data,
        additionalFieldsIncluded: additionalFieldsIncluded
      });
      this.suggestions.set(data);
    });
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
   * Emite un evento cuando se modifica un dropdown
   * @param event evento del dropdown
   * @param object objeto que contiene el evento y el campo que se esta modificando
   */
  onChangeDropdown(event: any, object: any) {
    const field = object.field; //se obtiene el campo del objeto
    const currentValue = this.formGroupSignal()?.get(field)?.value;
    const formValues = this.formGroupSignal()?.value;

    // Asignar las opciones del dropdown al objeto
    /*if (this.dropdownOptionsSignal()[field]) {
      object.choices = this.dropdownOptionsSignal()[field];
      object.options = this.dropdownOptionsSignal()[field];
    }*/

    const eventValue = event.value; // ID/valor seleccionado del dropdown

    // Asignar las opciones del dropdown al objeto
    /*if (this.dropdownOptionsSignal()[field]) {
      object.choices = this.dropdownOptionsSignal()[field];
      object.options = this.dropdownOptionsSignal()[field];
    }*/

    //asigna el valor del campo object_parent_form_data_X al objeto completo
    if (field.startsWith('object_parent_form_data')) {
      const newField = field.replace('object_', '');
      const foundObject = this.dropdownOptionsSignal()[field]?.
        find((item: any) => item.id === currentValue || item.value === currentValue);

      // Si existe cols_values y es un array válido, filtrar el objeto, sino usar el objeto completo
      let currentValueObject = foundObject;
      if (foundObject && object?.cols_values && Array.isArray(object.cols_values) && object.cols_values.length > 0) {
        const filteredObject: any = {};
        object.cols_values.forEach((key: string) => {
          if (foundObject.hasOwnProperty(key)) {
            filteredObject[key] = foundObject[key];
          }
        });
        currentValueObject = filteredObject;
      }

      this.formGroupSignal()?.get(newField)?.setValue(currentValueObject);
    }

    // Crear el objeto con la información completa
    const changeInfo = {
      event,
      field,
      object,
      formValues,       // Todos los valores del formulario
      currentValue,  // Valor actual del campo que cambió
      changedField: field, // Campo específico que cambió (redundante pero claro)
      changedValue: currentValue // Valor específico que cambió (redundante pero claro)
    };

    this.onChangeDropdownAction.emit(changeInfo);
    const config = object || {};
    const children = config.children || {};
    const childrenActive = children?.active || false;
    const fields = children?.fields || {};


    if (childrenActive) {
      for (const key in fields) {
        let setCurrentValue = '';

        if (fields.hasOwnProperty(key)) {
          const dropdownOptions = this.dataDropdownExists(object);
          let currentDropdownOption: any = [];
          if (dropdownOptions) {
            currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
          }

          const final = fields[key]?.final; //active
          const manual = fields[key]?.manual;
          const remote = fields[key]?.remote;

          if (final) {

            const filterGroup = final?.filter_group;
            const dataType = final?.data_type;
            const fieldName = final?.field_name;
            const resultPosition = final?.result_position;
            const defaultField = final?.default_field;

            if (fieldName) {
              //°°°SI NO EXISTE VA UN IF CON ONSULTA POE ADTE TYPE, SI TRAE field_name A ESE SINO AL MISMO DEL COMBO
              if (currentDropdownOption[fieldName]) {
                this.formGroupSignal()?.get(key)?.setValue(currentDropdownOption[fieldName]);
              }
              //}
            }
          } else if (manual) {

            //datos del hijo de combo que se está seleccionado
            const filterGroup = manual?.filter_group;
            const defaultField = manual?.default_field;
            const resultPosition = manual?.result_position;
            const options = manual?.options;
            this.dropdownOptionsSignal()[key] = []

            setCurrentValue = options;
            if (filterGroup) {
              setCurrentValue = options.filter((item: any) => item[filterGroup] === currentDropdownOption[filterGroup]);
            }

            //para los select no funciona el this.formGroupSignal()?.get(key)?.setValue
            //°°°pendiente de revisar si afecta las cargar cuando esta filtrado
            this.dropdownOptionsSignal()[key] = setCurrentValue;

          } else if (remote) {
            const fieldName = remote?.field_name;

            if (fieldName) {
              //°°°pendiente de revisar si afecta las cargar cuando esta filtrado
            }
          }
        }
      }
    }
  }

  /**
   * Emite un evento cuando se selecciona un elemento en el autocomplete
   * @param event evento del autocomplete
   * @param field Campo que se esta modificando
   */
  onSelectAutoComplete(event: any, field: any, o: any = null) {
    // Buscar el objeto de configuración del campo en drawForm
    /*let fieldObject = null;
    const currentDrawForm = this.drawForm();

    if (currentDrawForm && Array.isArray(currentDrawForm)) {
      fieldObject = currentDrawForm.find((item: any) => item.field === field);
    }

    // Asignar las opciones del dropdown al objeto si existen
    if (fieldObject && this.dropdownOptionsSignal()[field]) {
      fieldObject.choices = this.dropdownOptionsSignal()[field];
      fieldObject.options = this.dropdownOptionsSignal()[field];
    }

    // Crear un evento similar al de onChangeDropdown
    const changeInfo = {
      event,
      field,
      object: fieldObject,
      formValues: this.formGroupSignal()?.value,
      currentValue: event,  // En autocomplete, el event ya contiene el objeto seleccionado
      changedField: field,
      changedValue: event
    };

    this.onSelectAutoCompleteAction.emit(changeInfo);*/

    this.onSelectAutoCompleteAction.emit({ event, field })
  }
  //PEPEPEPEP

  getType(value: any) {
    return value?.type //|| 'input-text';
  }

  /**
   * esta función establece el valor [] en un tree-select ya que cuando se limía pone un string vacio
   * (es posible que se tenga que separar los multi vs single)
   * @param field campo que se esta modificando
   */
  clearTreeSelect(field: any) {

    this.formGroup.get(field)?.setValue([]);

  }

  panelStyleSignal = signal<{ [key: string]: string }>({});

  adjustPanelStyle(autoCompleteRef: any): void {
    const width = autoCompleteRef.inputEL.nativeElement.offsetWidth;
    const panelStyle: { [key: string]: string } = width < 450 ? { width: `440px` } : {};
    this.panelStyleSignal.set(panelStyle);

  }

  onChangeToggle(event: any, field: any) {
    this.onChangeToggleAction.emit({ event, field });
  }

  //viene directo en el TS porque no hrml marca error si pongo las llaves {}
  onKeydownTabText(event: any, field: any) {
    this.onKeydownTabTextAction.emit({ event, field });
  }

  onKeydownEnterText(event: any, field: any) {
    this.onKeydownEnterTextAction.emit({ event, field });
  }

  onKeydownTabNumber(event: any, field: any) {
    this.onKeydownTabNumberAction.emit({ event, field });
  }

  onKeydownEnterNumber(event: any, field: any) {
    this.onKeydownEnterNumberAction.emit({ event, field });
  }


  public closeFieldset = signal<boolean>(false);
  close() {
    this.closeFieldset.set(true);
  }


  //iamgenes videos
  public files64: any = [];
  public files: any = [];
  public mediaStream!: MediaStream;

  public images: string[] = [];
  public previewCameraDialogVisible = false;
  /**
       * Muestra el tiempo del video en segundo
       */
  public timeVideo = signal<number>(6);

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

  // ************************ADAPTADO PARA CAPACITOR*********************
  private isCapacitorNative(): boolean {
    return !!(window && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.getPlatform() !== 'web');
  }

  private currentCameraIndex: number = -1;
  private videoDevices: MediaDeviceInfo[] = [];

  // ************************ADAPTADO PARA CAPACITOR*********************
  async previewCamera() {
    if (this.isCapacitorNative()) {
      // Usar Capacitor Camera en móvil

      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });
        this.files64.push({ type: 'image', file_name: 'evidencia.jpg', file: photo.dataUrl });
        this.files64Action.emit(this.files64);
        this.previewCameraDialogVisible = false;
      } catch (error) {
        console.error('Error al capturar imagen con Capacitor:', error);
      }
    } else {
      // Usar API web
      try {
        if (this.videoDevices.length === 0) {
          this.videoDevices = await this.getMediaDevices();
          if (this.videoDevices.length === 0) {
            throw new Error('No se encontraron cámaras disponibles.');
          }
          let backCamera = this.videoDevices.find(device => device.label.toLowerCase().includes('back'));
          if (!backCamera) {
            backCamera = this.videoDevices.find(device => device.label.toLowerCase().includes('front'));
          }
          if (!backCamera) {
            backCamera = this.videoDevices[0];
          }
          this.currentCameraIndex = this.videoDevices.indexOf(backCamera);
        } else {
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
        } else if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
          console.error('Permiso denegado para acceder a la cámara:', error);
        } else {
          console.error('Error al acceder a la cámara:', error);
        }
      }
    }
  }

  // ************************ADAPTADO PARA CAPACITOR*********************
  async captureMedia(type: 'image' | 'video' = 'image') {
    if (this.isCapacitorNative()) {
      if (type === 'image') {
        try {
          const photo = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });
          this.files64.push({ type: 'image', file_name: 'evidencia.jpg', file: photo.dataUrl });
          this.files64Action.emit(this.files64);
          this.previewCameraDialogVisible = false;
        } catch (error) {
          console.error('Error al capturar imagen con Capacitor:', error);
        }
      } else {
        // Capacitor Camera no soporta grabación de video directamente, se puede usar plugin adicional si se requiere
        console.warn('Grabación de video no soportada con Capacitor Camera por defecto.');
      }
    } else {
      // Web
      const video = this.video.nativeElement;
      const canvas = this.canvas.nativeElement;
      if (type === 'image') {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const canvasContext = canvas.getContext('2d');
        canvasContext?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imagenCapturada = canvas.toDataURL('image/jpeg');
        this.files64.push({ type: 'image', file_name: 'evidencia.jpg', file: imagenCapturada });
        this.files64Action.emit(this.files64);
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
            this.files64Action.emit(this.files64);
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
            this.timeVideo.set(6);
          }
        }, 1000);
      }
    }
  }

  /*removeMedia(i: number) {
      this.files64.splice(i, 1);
  }*/

  onHidePreviousCamera() {
    //cuando se cierra la camara reinicia el indice para que siempre inicie con la 1
    this.currentCameraIndex = -1;
    if (this.mediaStream) {
      const tracks = this.mediaStream.getTracks();
      tracks.forEach(track => track.stop());
    }
  }

  removeImage(i: number, type = '64') {
    if (type == '64') {
      this.files64.splice(i, 1);
      this.files64Action.emit(this.files64); // Emitir el evento con la lista actualizada de archivos
    } else if (type == 'bin') {
      this.filesAction.emit(this.files); // Emitir el evento con la lista actualizada de archivos
      this.files.splice(i, 1);
    }
  }

  removeFocus(event: any) {
    event.preventDefault();
    event.target.blur();  // fuerza pérdida de foco
  }


  // getFormControl(field: string): FormControl | null {
  //   return this.formGroupSignal()?.get(field) as FormControl | null;
  // }


  getFormControl(field: string): FormControl | null {
    const formGroup = this.formGroupSignal();
    if (formGroup && formGroup.get(field)) {
      return formGroup.get(field) as FormControl;
    }
    // Return null if form group doesn't exist or field doesn't exist
    return null;
  }

  // Table methods
  initializeTableData(tableConfig: any): any[] {
    const initialRows = tableConfig.table_config?.initial_rows || 0;
    const data: any[] = [];

    console.log('Inicializando tabla con filas:', initialRows);


    for (let i = 0; i < initialRows; i++) {
      const row: any = {};
      tableConfig.columns.forEach((col: any) => {
        row[col.field] = '';
      });
      data.push(row);
    }

    return data;
  }

  getTableData(field: string): any[] {
    const control = this.getFormControl(field);
    const currentValue = control?.value;

    if (Array.isArray(currentValue)) {
      return currentValue;
    }

    return [];
  }

  updateTableFormControl(field: string, data: any[]): void {
    const control = this.getFormControl(field);
    if (control) {
      control.setValue([...data]);
      control.markAsDirty();
    }
  }

  onRowSelect(event: any, field: string): void {
    this.onTableRowSelect.emit({ event, field, data: this.getTableData(field) });
  }

  onRowUnselect(event: any, field: string): void {
    this.onTableRowUnselect.emit({ event, field, data: this.getTableData(field) });
  }

  addTableRow(field: string, tableConfig: any): void {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return;

    const formArray = formGroup.get(field) as FormArray;
    if (!formArray) return;

    // Crear un nuevo FormGroup para la fila
    const newRowGroup: any = {};

    tableConfig.columns.forEach((col: any) => {
      const validators: any[] = [];

      if (col.required) {
        validators.push(Validators.required);
      }
      if (col.validation?.max_length) {
        validators.push(Validators.maxLength(col.validation.max_length));
      }
      if (col.validation?.min_length) {
        validators.push(Validators.minLength(col.validation.min_length));
      }

      let defaultValue: any = '';
      if (col.type === 'input-number') {
        defaultValue = null;
      } else if (col.type === 'date') {
        defaultValue = null;
      } else if (col.type === 'multi-select') {
        defaultValue = [];
      } else if (col.type === 'checkbox') {
        defaultValue = false;
      }

      newRowGroup[col.field] = new FormControl(defaultValue, validators);
    });

    formArray.push(this.fb.group(newRowGroup));

    this.onTableAddRow.emit({
      field,
      newRow: newRowGroup,
      data: formArray.value
    });
  }

  editTableRow(rowData: any, field: string): void {
    this.onTableEditRow.emit({ rowData, field, data: this.getTableData(field) });
  }

  deleteTableRow(rowIndex: number, field: string): void {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return;

    const formArray = formGroup.get(field) as FormArray;
    if (!formArray) return;

    const rowToDelete = formArray.at(rowIndex)?.value;

    // Eliminar del FormArray
    formArray.removeAt(rowIndex);
    
    // Forzar actualización de validación del FormArray
    formArray.markAsTouched();
    formArray.updateValueAndValidity();

    this.onTableDeleteRow.emit({
      rowData: rowToDelete,
      rowIndex,
      field,
      data: formArray.value
    });
  }

  onCellEdit(event: any, field: string, rowIndex: number, colField: string): void {
    const currentData = this.getTableData(field);
    if (currentData[rowIndex]) {
      currentData[rowIndex][colField] = event.target.value;
      this.updateTableFormControl(field, currentData);
      this.onTableCellEdit.emit({
        event,
        field,
        rowIndex,
        colField,
        value: event.target.value,
        data: currentData
      });
    }
  }

  getColumnType(column: any): string {
    return column.type || 'input-text';
  }

  isColumnEditable(column: any): boolean {
    return column.editable !== undefined ? column.editable : true;
  }

  isColumnRequired(column: any): boolean {
    return column.required !== undefined ? column.required : false;
  }

  getColumnWidth(column: any): string {
    return column.width || 'auto';
  }

  getTagSeverity(column: any): string {
    return column.tag?.severity || 'info';
  }

  formatTagValue(value: any, column: any): string {
    if (!column.tag?.active) return value;

    const tagType = column.tag?.type || 'none';

    switch (tagType) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      case 'capitalize-words':
        return String(value).replace(/\w\S*/g, (txt) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      default:
        return value;
    }
  }

  validateCell(value: any, column: any, showErrors: boolean = false): boolean {
    // Siempre validar campos obligatorios
    if (this.isColumnRequired(column) && (!value || value.toString().trim() === '')) {
      return showErrors ? false : true; // Solo mostrar error si showErrors es true
    }

    if (column.validation) {
      const validation = column.validation;
      const strValue = value?.toString() || '';

      if (validation.min_length && strValue.length < validation.min_length) {
        return showErrors ? false : true;
      }

      if (validation.max_length && strValue.length > validation.max_length) {
        return showErrors ? false : true;
      }
    }

    return true;
  }

  getCellClass(value: any, column: any, tableField: string, rowIndex: number): string {
    // Mostrar error si:
    // 1. La fila está en edición completa
    // 2. La celda específica está en edición
    // 3. Se solicitó validación de tabla
    const isRowEditing = this.isRowEditing(tableField, rowIndex);
    const isCellEditing = this.isCellEditing(tableField, rowIndex, column.field);
    const tableValidationRequested = this.tablesToValidate[tableField] || false;
    
    const showErrors = isRowEditing || isCellEditing || tableValidationRequested;
    
    const isValid = this.validateCell(value, column, showErrors);
    return isValid ? '' : 'p-invalid';
  }

  isAnyRowEditing(tableField: string): boolean {
    // Verificar si alguna fila está en edición (completa o celda)
    const rowEditingKeys = Object.keys(this.editingRows).filter(key => 
      key.startsWith(tableField + '_') && this.editingRows[key]
    );
    const cellEditingKeys = Object.keys(this.editingCells).filter(key => 
      key.startsWith(tableField + '_') && this.editingCells[key]
    );
    return rowEditingKeys.length > 0 || cellEditingKeys.length > 0;
  }

  isRowOrCellEditing(tableField: string, rowIndex: number): boolean {
    // Verificar si la fila está en edición completa o alguna de sus celdas
    if (this.isRowEditing(tableField, rowIndex)) return true;
    
    // Buscar si alguna celda de esta fila está en edición
    const cellPrefix = `${tableField}_${rowIndex}_`;
    return Object.keys(this.editingCells).some(key => 
      key.startsWith(cellPrefix) && this.editingCells[key]
    );
  }  // Métodos para edición de celdas
  editingRows: { [key: string]: boolean } = {};
  editingCells: { [key: string]: boolean } = {};
  tablesToValidate: { [key: string]: boolean } = {};
  originalRowData: { [key: string]: any } = {};

  startRowEdit(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;
    this.editingRows[rowKey] = true;

    // Guardar datos originales para poder cancelar
    const currentData = this.getTableData(tableField);
    this.originalRowData[rowKey] = { ...currentData[rowIndex] };
  }

  startCellEdit(tableField: string, rowIndex: number, colField: string): void {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    this.editingCells[cellKey] = true;

    // Guardar dato original de la celda
    const currentData = this.getTableData(tableField);
    this.originalRowData[cellKey] = currentData[rowIndex]?.[colField];
  }

  finishRowEdit(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;

    // Validar todas las celdas de la fila antes de guardar
    const currentData = this.getTableData(tableField);
    const formGroup = this.formGroupSignal();
    if (!formGroup) return;

    const formArray = formGroup.get(tableField) as FormArray;
    if (!formArray) return;

    const rowFormGroup = formArray.at(rowIndex) as FormGroup;
    if (!rowFormGroup) return;

    // Primero sincronizar todos los valores del rowData con el FormGroup
    const rowData = currentData[rowIndex];
    Object.keys(rowData).forEach(key => {
      const control = rowFormGroup.get(key);
      if (control) {
        control.setValue(rowData[key]);
      }
    });

    // Marcar todos los controles como touched para mostrar errores
    Object.keys(rowFormGroup.controls).forEach(key => {
      const control = rowFormGroup.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    // Verificar si es válido
    if (rowFormGroup.valid) {
      this.editingRows[rowKey] = false;
      delete this.originalRowData[rowKey];
      
      // Limpiar también cualquier edición de celda activa de esta fila
      const cellPrefix = `${tableField}_${rowIndex}_`;
      Object.keys(this.editingCells).forEach(cellKey => {
        if (cellKey.startsWith(cellPrefix)) {
          this.editingCells[cellKey] = false;
          delete this.originalRowData[cellKey];
        }
      });

      this.onTableCellEdit.emit({
        field: tableField,
        rowIndex,
        data: currentData
      });
    }
  }

  finishCellEdit(tableField: string, rowIndex: number, colField: string): void {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    
    // Obtener el FormGroup de la fila para validar
    const formGroup = this.formGroupSignal();
    if (!formGroup) return;

    const formArray = formGroup.get(tableField) as FormArray;
    if (!formArray) return;

    const rowFormGroup = formArray.at(rowIndex) as FormGroup;
    if (!rowFormGroup) return;

    const cellControl = rowFormGroup.get(colField);
    if (cellControl) {
      // Primero obtener el valor actual de rowData (que ya fue actualizado por ngModel)
      const currentData = this.getTableData(tableField);
      const currentValue = currentData[rowIndex]?.[colField];
      
      // Actualizar el FormControl con el valor actual
      cellControl.setValue(currentValue);
      
      // Marcar el control como touched para mostrar errores
      cellControl.markAsTouched();
      
      // Validar el control
      cellControl.updateValueAndValidity();
      
      // Solo guardar si es válido
      if (cellControl.valid) {
        this.editingCells[cellKey] = false;
        delete this.originalRowData[cellKey];

        this.onTableCellEdit.emit({
          field: tableField,
          rowIndex,
          colField,
          data: currentData
        });
      }
      // Si no es válido, no cerramos el modo edición para que el usuario corrija
    }
  }

  cancelRowEdit(tableField: string, rowIndex: number): void {
    const rowKey = `${tableField}_${rowIndex}`;

    // Restaurar datos originales
    if (this.originalRowData[rowKey]) {
      const currentData = this.getTableData(tableField);
      currentData[rowIndex] = { ...this.originalRowData[rowKey] };
      this.updateTableFormControl(tableField, currentData);
      delete this.originalRowData[rowKey];
    }

    this.editingRows[rowKey] = false;
    
    // Limpiar también cualquier edición de celda activa de esta fila
    const cellPrefix = `${tableField}_${rowIndex}_`;
    Object.keys(this.editingCells).forEach(cellKey => {
      if (cellKey.startsWith(cellPrefix)) {
        this.editingCells[cellKey] = false;
        delete this.originalRowData[cellKey];
      }
    });
  }

  cancelCellEdit(tableField: string, rowIndex: number, colField: string): void {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;

    // Restaurar dato original
    if (this.originalRowData[cellKey] !== undefined) {
      const currentData = this.getTableData(tableField);
      currentData[rowIndex][colField] = this.originalRowData[cellKey];
      this.updateTableFormControl(tableField, currentData);
      delete this.originalRowData[cellKey];
    }

    this.editingCells[cellKey] = false;
  }

  isRowEditing(tableField: string, rowIndex: number): boolean {
    const rowKey = `${tableField}_${rowIndex}`;
    return this.editingRows[rowKey] || false;
  }

  isCellEditing(tableField: string, rowIndex: number, colField: string): boolean {
    const cellKey = `${tableField}_${rowIndex}_${colField}`;
    return this.editingCells[cellKey] || false;
  }

  onCellKeydown(event: KeyboardEvent, tableField: string, rowIndex: number, colField: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.finishCellEdit(tableField, rowIndex, colField);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit(tableField, rowIndex, colField);
    }
  }

  validateTable(tableField: string): void {
    this.tablesToValidate[tableField] = true;
  }

  trackByFn(index: number, item: any): any {
    return item.field || index;
  }

  getColumnFields(columns: any[]): string[] {
    return columns?.map(col => col.field) || [];
  }

  /**
   * Obtiene archivos que no sean firmas para mostrar en la sección de archivos
   */
  getNonSignatureFiles(): any[] {
    return this.files64.filter((f: any) => f.type !== 'signature');
  }

  /**
   * Obtiene los datos del área principal de firma (índice 0) desde FormControl
   */
  /**
   * Obtiene los datos de la firma principal (último FormGroup activo) desde FormArray
   * Optimizado para evitar recálculos innecesarios
   */
  getMainSignatureData(field: string): any {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return null;

    const formArray = formGroup.get(field) as FormArray;
    if (!formArray || formArray.length === 0) return null;

    // El último FormGroup es la firma activa principal
    return formArray.at(formArray.length - 1)?.value || null;
  }

  /**
   * Obtiene el historial de firmas usando el computed signal (O(1))
   * Ya no recalcula, solo lee del cache del computed signal
   */
  getHistorySignatures(field: string): any[] {
    return this.signatureDataSignal()[field]?.history || [];
  }

  /**
   * Obtiene todos los datos de firma usando el computed signal (O(1))
   * Ya no recalcula, solo lee del cache del computed signal
   */
  getSignatureData(field: string): any[] {
    return this.signatureDataSignal()[field]?.all || [];
  }

  /**
   * Verifica si hay datos de firma usando el computed signal (O(1))
   */
  hasSignatureData(field: string): boolean {
    return this.signatureDataSignal()[field]?.hasData || false;
  }

  /**
   * Verifica si hay historial de firmas usando el computed signal (O(1))
   */
  hasHistorySignatures(field: string): boolean {
    return this.signatureDataSignal()[field]?.hasHistory || false;
  }

  /**
   * Fuerza la actualización del computed signal de firmas
   * Debe llamarse después de cualquier operación que modifique el FormArray
   */
  private triggerSignatureUpdate(): void {
    this.signatureUpdateTrigger.update(v => v + 1);
  }

  /**
   * Elimina una firma del historial (FormArray)
   */
  deleteHistorySignature(field: string, historyIndex: number): void {
    console.log('🗑️ Eliminando firma del historial:', { field, historyIndex });
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray) return;

    // El historyIndex es relativo al historial (0, 1, 2...), 
    // pero en el FormArray está en los índices (0, 1, 2... length-2)
    // El último FormGroup (length-1) es la firma activa, NO se puede eliminar

    if (historyIndex >= 0 && historyIndex < formArray.length - 1) {
      formArray.removeAt(historyIndex);
      formArray.markAsDirty();
      this.triggerSignatureUpdate(); // 🔄 Forzar recálculo
      console.log(`✅ Firma eliminada del índice ${historyIndex}. Total firmas: ${formArray.length}`);
    } else {
      console.warn(`⚠️ Índice ${historyIndex} inválido. No se puede eliminar la firma activa.`);
    }
  }

  // ===== SIGNATURE COMPONENT METHODS =====

  // Referencias para canvas de firma
  signatureCanvasRefs: { [key: string]: ElementRef } = {};

  /**
   * Inicializa los datos de firma desde el formulario (FormArray)
   */
  initSignatureData(field: string, config: any): void {
    const formArray = this.formGroupSignal()?.get(field) as FormArray;

    // El FormArray ya viene inicializado desde crud.class.ts con al menos 1 FormGroup
    // Solo inicializamos los canvas después del renderizado

    setTimeout(() => {
      this.initializeSignatureCanvases(field, config);
    }, 500);
  }

  /**
   * Inicializa todos los canvas de firma para un campo específico
   */
  private initializeSignatureCanvases(field: string, config: any): void {
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray || formArray.length === 0) return;

    // Inicializar canvas para cada FormGroup en el FormArray
    for (let index = 0; index < formArray.length; index++) {
      const signaturePadField = config.fields?.find((f: any) => f.type === 'signature-pad');
      if (signaturePadField) {
        // Intentar inicializar canvas para cada contexto (card, free, fieldset)
        const canvasIds = [
          `signature-canvas-${field}-${index}`,
          `signature-canvas-free-${field}-${index}`,
          `signature-canvas-fieldset-${field}-${index}`
        ];

        canvasIds.forEach(canvasId => {
          this.initSignatureCanvas(canvasId, signaturePadField);
        });
      }
    }
  }

  /**
   * Añade nueva firma al formulario
   */
  addSignature(field: string, config: any): void {
    console.log('➕ [v3.1.0] Agregando nueva firma:', { field });

    const newSignature: any = {};
    config.fields.forEach((fieldConfig: any) => {
      if (fieldConfig.type === 'date' && fieldConfig.default?.value === 'device') {
        newSignature[fieldConfig.field] = new Date().toISOString().split('T')[0];
      } else {
        newSignature[fieldConfig.field] = fieldConfig.default?.value || '';
      }
    });

    // Obtener datos actuales del FormControl
    const formControl = this.formGroupSignal()?.get(field);
    const currentFieldData = [...(formControl?.value || [])];

    // Si ya existe una firma, moverla hacia abajo y poner la nueva arriba
    if (currentFieldData.length > 0 && currentFieldData[0][field]) {
      // Insertar nueva firma al inicio
      currentFieldData.unshift(newSignature);
      // Limpiar el canvas principal (índice 0 después de la inserción será la nueva)
      setTimeout(() => {
        this.clearSignature(`signature-canvas-free-${field}-0`, field, 0);
      }, 100);
    } else {
      currentFieldData.push(newSignature);
    }

    // Actualizar FormControl
    formControl?.setValue(currentFieldData);

    // Inicializar canvas para la nueva firma después de renderizar
    setTimeout(() => {
      const newIndex = currentFieldData.length - 1;
      const signaturePadField = config.fields?.find((f: any) => f.type === 'signature-pad');
      if (signaturePadField) {
        const canvasIds = [
          `signature-canvas-${field}-${newIndex}`,
          `signature-canvas-free-${field}-${newIndex}`,
          `signature-canvas-fieldset-${field}-${newIndex}`
        ];

        canvasIds.forEach(canvasId => {
          this.initSignatureCanvas(canvasId, signaturePadField);
        });
      }
    }, 100);
  }

  /**
   * Nueva lógica: Mueve firma actual a historial y limpia área principal
   * Valida campos obligatorios usando FormArray antes de proceder
   */
  addNewSignature(field: string, config: any): void {
    console.log('🚀 [v3.1.0] Nueva Firma - validando campos obligatorios con FormArray');

    // 1. OBTENER EL FORMARRAY
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray || !formArray.controls) {
      console.warn('⚠️ FormArray no encontrado para', field);
      return;
    }

    const lastIndex = formArray.length - 1;
    const lastFormGroup = formArray.at(lastIndex);

    if (!lastFormGroup) {
      console.warn('⚠️ No existe FormGroup en el último índice');
      return;
    }

    // 2. VALIDAR solo los campos que están en la configuración en el ÚLTIMO FormGroup
    let hasErrors = false;
    config.fields?.forEach((fieldConfig: any) => {
      const control = lastFormGroup.get(fieldConfig.field);
      if (control) {
        control.markAsTouched();
        control.markAsDirty();
        if (control.invalid) {
          hasErrors = true;
          console.log(`❌ Campo inválido: ${fieldConfig.field}`, control.errors);
        }
      }
    });

    // Verificar si hay errores en los campos configurados
    if (hasErrors) {
      console.warn('❌ Formulario inválido - hay campos obligatorios faltantes');

      // Marcar el FormGroup y FormArray completos como touched para activar validación visual
      lastFormGroup.markAsTouched();
      formArray.markAsTouched();

      // Forzar actualización visual
      lastFormGroup.updateValueAndValidity({ emitEvent: true });
      formArray.updateValueAndValidity({ emitEvent: true });

      return; // Detener ejecución si hay errores de validación
    }

    console.log('✅ Validación exitosa - agregando nueva firma al FormArray');

    // 3. CREAR NUEVO FORMGROUP CLONANDO LA ESTRUCTURA DEL PRIMER ELEMENTO
    // Obtener el primer FormGroup del array (índice 0) que tiene la configuración correcta
    const firstFormGroup = formArray.at(0) as FormGroup;

    // Crear nuevo FormGroup clonando la estructura y validaciones del primero
    const newFormGroup = new FormGroup({
      name: new FormControl('', {
        nonNullable: true,
        validators: firstFormGroup.get('name')?.validator || [Validators.required, Validators.maxLength(100)]
      }),
      date: new FormControl(firstFormGroup.get('date')?.value || new Date(), {
        nonNullable: true,
        validators: firstFormGroup.get('date')?.validator || [Validators.required]
      }),
      signature: new FormControl<string | null>(null, {
        validators: firstFormGroup.get('signature')?.validator || [Validators.required]
      }),
      login: new FormControl('', {
        nonNullable: true,
        validators: firstFormGroup.get('login')?.validator || []
      }),
      pin_global: new FormControl('', {
        nonNullable: true,
        validators: firstFormGroup.get('pin_global')?.validator || []
      }),
      selfie: new FormControl<File | string | null>(null, {
        validators: firstFormGroup.get('selfie')?.validator || []
      }),
      pin_user: new FormControl('', {
        nonNullable: true,
        validators: firstFormGroup.get('pin_user')?.validator || []
      }),
    });

    // 4. AGREGAR EL NUEVO FORMGROUP AL FORMARRAY
    formArray.push(newFormGroup);
    const newIndex = formArray.length - 1;

    // 🔄 Forzar recálculo del computed signal
    this.triggerSignatureUpdate();

    console.log(`📊 Nueva firma agregada en índice ${newIndex}. Total firmas: ${formArray.length}`);

    // 5. LIMPIAR CANVAS DEL NUEVO ÍNDICE EN TODOS LOS CONTEXTOS
    setTimeout(() => {
      this.clearSignature(`signature-canvas-main-${field}`, field, newIndex);
      this.clearSignature(`signature-canvas-card-${field}`, field, newIndex);
      this.clearSignature(`signature-canvas-fieldset-${field}`, field, newIndex);
      console.log(`✅ Nueva firma lista para captura en índice ${newIndex}`);
    }, 100);
  }

  /**
   * Cancela la firma actual (elimina el último FormGroup del FormArray)
   * Solo funciona si hay al menos 2 firmas (para mantener al menos una)
   */
  cancelCurrentSignature(field: string): void {
    console.log(`🚫 Cancelando firma actual para campo: ${field}`);

    // 1. OBTENER FORMARRAY
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray) {
      console.error(`❌ No se encontró el FormArray para ${field}`);
      return;
    }

    // 2. VERIFICAR QUE HAYA AL MENOS 2 FIRMAS
    if (formArray.length < 2) {
      console.warn(`⚠️ No se puede cancelar. Se requiere al menos 2 firmas. Actual: ${formArray.length}`);
      return;
    }

    // 3. ELIMINAR EL ÚLTIMO FORMGROUP (firma actual)
    const removedIndex = formArray.length - 1;
    formArray.removeAt(removedIndex);

    // 🔄 Forzar recálculo del computed signal
    this.triggerSignatureUpdate();

    console.log(`✅ Firma en índice ${removedIndex} eliminada. Total firmas: ${formArray.length}`);

    // 4. OBTENER LA FIRMA DEL NUEVO ÚLTIMO ÍNDICE (la firma anterior)
    const newLastIndex = formArray.length - 1;
    const previousFormGroup = formArray.at(newLastIndex) as FormGroup;
    const previousSignature = previousFormGroup?.get('signature')?.value;

    // 5. CARGAR LA FIRMA ANTERIOR EN LOS CANVAS DE TODOS LOS CONTEXTOS
    setTimeout(() => {
      this.loadSignatureToCanvas(`signature-canvas-main-${field}`, previousSignature);
      this.loadSignatureToCanvas(`signature-canvas-card-${field}`, previousSignature);
      this.loadSignatureToCanvas(`signature-canvas-fieldset-${field}`, previousSignature);
      console.log(`✅ Canvas reinicializado con firma anterior en índice ${newLastIndex}`);
    }, 100);
  }

  /**
   * Carga una firma guardada (base64) en un canvas específico
   */
  private loadSignatureToCanvas(canvasId: string, signatureBase64: string | null): void {
    if (!signatureBase64) {
      console.log(`⚠️ No hay firma guardada para cargar en ${canvasId}`);
      return;
    }

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.warn(`⚠️ Canvas ${canvasId} no encontrado`);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar el canvas primero
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cargar la imagen de la firma
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      console.log(`✅ Firma cargada en ${canvasId}`);
    };
    img.onerror = () => {
      console.error(`❌ Error al cargar firma en ${canvasId}`);
    };
    img.src = signatureBase64;
  }

  /**
   * Verifica si se puede cancelar la firma actual
   * Retorna true solo si hay 2 o más firmas en el FormArray
   * Optimizado para evitar recálculos innecesarios
   */
  canCancelSignature(field: string): boolean {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return false;

    const formArray = formGroup.get(field) as FormArray;
    return formArray ? formArray.length >= 2 : false;
  }

  /**
   * Verifica si un campo específico tiene errores de validación usando FormArray
   * Valida el ÚLTIMO FormGroup (donde se está trabajando actualmente)
   * Optimizado para evitar recálculos innecesarios
   */
  hasFieldValidationError(signatureField: string, fieldName: string): boolean {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return false;

    const formArray = formGroup.get(signatureField) as FormArray;
    if (!formArray || !formArray.controls || formArray.length === 0) return false;

    // Obtener el ÚLTIMO FormGroup (el que se está editando actualmente)
    const currentFormGroup = formArray.at(formArray.length - 1);
    if (!currentFormGroup) return false;

    const control = currentFormGroup.get(fieldName);
    if (!control) return false;

    return (control.invalid && (control.dirty || control.touched)) || false;
  }

  /**
   * Obtiene el último índice del FormArray (firma activa)
   * Optimizado para evitar recálculos innecesarios
   */
  getLastFormArrayIndex(field: string): number {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return 0;

    const formArray = formGroup.get(field) as FormArray;
    if (!formArray || formArray.length === 0) return 0;
    return formArray.length - 1;
  }


  /**
   * Determina si se puede mostrar el botón "Nueva Firma"
   * Siempre se muestra - la validación ocurre al momento del click
   */
  canCreateNewSignature(field: string, config: any): boolean {
    // Siempre mostrar el botón "Nueva Firma" cuando add_signature esté habilitado
    // La validación se hará en el método addNewSignature
    return true;
  }

  /**
   * Verifica si hay campos obligatorios faltantes (solo para UI feedback)
   * Excluye signature-pad de la validación
   */
  hasRequiredFieldsMissing(field: string, config: any): boolean {
    const mainSignatureData = this.getMainSignatureData(field);
    if (!mainSignatureData) return false;

    // Solo validar campos requeridos que NO sean signature-pad
    const requiredFields = config.fields.filter((fieldConfig: any) =>
      fieldConfig.required && fieldConfig.type !== 'signature-pad'
    );
    if (requiredFields.length === 0) return false;

    return !requiredFields.every((fieldConfig: any) => {
      const fieldValue = mainSignatureData[fieldConfig.field];
      return fieldValue && (typeof fieldValue !== 'string' || fieldValue.trim() !== '');
    });
  }

  /**
   * Elimina una firma específica
   */
  deleteSignature(field: string, index: number): void {
    const formControl = this.formGroupSignal()?.get(field);
    const currentFieldData = [...(formControl?.value || [])];
    currentFieldData.splice(index, 1);

    // Actualizar FormControl
    formControl?.setValue(currentFieldData);
  }

  /**
   * Marca todos los controles como touched, incluyendo FormArrays de firma
   * Este método debe ser llamado desde el componente padre antes de validar el formulario
   */
  markAllSignatureFieldsAsTouched(): void {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return;

    console.log('🔍 Marcando todos los campos de firma como touched...');

    // Recorrer todos los controles del formulario
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);

      // Si es un FormArray (como los campos de firma)
      if (control instanceof FormArray) {
        control.markAsTouched();

        // Marcar cada FormGroup dentro del FormArray
        control.controls.forEach((formGroup: any) => {
          formGroup.markAsTouched();

          // Marcar cada control dentro del FormGroup
          Object.keys(formGroup.controls || {}).forEach((fieldKey: string) => {
            const fieldControl = formGroup.get(fieldKey);
            if (fieldControl) {
              fieldControl.markAsTouched();
              fieldControl.markAsDirty();
            }
          });
        });

        console.log(`✅ FormArray ${key} marcado como touched`);
      }
    });

    console.log('✅ Todos los campos de firma marcados como touched');
  }

  /**
   * Limpia el canvas de firma
   */
  clearSignature(canvasId: string, field: string, index: number): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Actualizar datos eliminando la firma - el control siempre se llama 'signature'
        const formControl = this.formGroupSignal()?.get(field);
        const currentData = [...(formControl?.value || [])];
        if (currentData[index]) {
          currentData[index]['signature'] = '';
          formControl?.setValue(currentData);

          // ✅ Actualizar validación después de limpiar
          // Marcar como touched para activar validación visual
          const formArray = formControl as FormArray;
          if (formArray && formArray.at(index)) {
            const signatureControl = formArray.at(index)?.get('signature');
            if (signatureControl) {
              signatureControl.markAsTouched();
              formArray.markAsTouched();
            }
          }
        }
      }
    }
  }

  /**
   * Limpia todos los canvas de firma en el formulario
   * Se usa cuando el formulario se resetea después de un submit
   */
  clearAllSignatureCanvases(): void {
    console.log('🧹 Limpiando todos los canvas de firma después del reset');

    // Obtener todos los canvas de firma del documento
    const allCanvases = document.querySelectorAll('canvas[id*="signature-canvas"]');

    allCanvases.forEach((canvas: any) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log(`✅ Canvas limpiado: ${canvas.id}`);
      }
    });

    console.log(`🧹 Total de canvas limpiados: ${allCanvases.length}`);
  }

  /**
   * Guarda la firma del canvas como base64
   */
  saveSignature(canvasId: string, field: string, index: number): void {
    console.log('🔍 [v3.1.0] saveSignature ejecutándose:', { canvasId, field, index });
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      const isEmpty = this.isCanvasEmpty(canvas);
      console.log('🔍 [v3.1.0] Canvas vacío?:', isEmpty);
      if (isEmpty) {
        console.warn('⚠️ [v3.1.0] La firma está vacía - no se guardará');
        return;
      }

      const signatureBase64 = canvas.toDataURL('image/png');

      // Actualizar datos con la firma - el control dentro del FormGroup siempre se llama 'signature'
      const formControl = this.formGroupSignal()?.get(field);
      const currentData = [...(formControl?.value || [])];
      if (currentData[index]) {
        currentData[index]['signature'] = signatureBase64;
        formControl?.setValue(currentData);

        // Marcar el control como touched y dirty para reflejar el cambio
        const formArray = this.formGroupSignal()?.get(field) as any;
        if (formArray && formArray.controls) {
          const formGroup = formArray.controls[index];
          if (formGroup) {
            const signatureControl = formGroup.get('signature');
            if (signatureControl) {
              signatureControl.markAsTouched();
              signatureControl.markAsDirty();
            }
          }
        }
      }



      // Añadir a files64 para compatibilidad
      this.files64.push({
        type: 'signature',
        file_name: `firma_${field}_${index}_${Date.now()}.png`,
        file: signatureBase64,
        field: field,
        index: index
      });
      this.files64Action.emit(this.files64);
    }
  }

  /**
   * Autoguardado automático al terminar de dibujar
   */
  autoSaveSignature(canvasId: string, field: string, index: number): void {
    console.log('🚀 [v3.1.0] Autoguardado iniciado:', { canvasId, field, index });
    // Pequeño delay para asegurar que el trazo se complete
    setTimeout(() => {
      this.saveSignature(canvasId, field, index);
      console.log('✅ [v3.1.0] Autoguardado completado');
    }, 200);
  }

  /**
   * Verifica si el canvas está vacío
   */
  private isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );

    return !pixelBuffer.some(color => color !== 0);
  }



  /**
   * Actualiza un campo específico de una firma usando FormControl
   */
  updateSignatureField(field: string, index: number, fieldName: string, value: any): void {
    console.log('📝 [DEBUG] updateSignatureField:', { field, index, fieldName, value });

    const formControl = this.formGroupSignal()?.get(field);
    const currentData = [...(formControl?.value || [])];

    console.log('📊 [DEBUG] currentData antes:', currentData);

    // Si el array está vacío, inicializar con un objeto vacío en el índice 0
    if (currentData.length === 0 && index === 0) {
      currentData.push({});
    }

    if (currentData[index]) {
      currentData[index][fieldName] = value;
      formControl?.setValue(currentData);
      formControl?.markAsDirty();

      console.log('📊 [DEBUG] currentData después:', currentData);

      // Marcar el control específico como touched para activar validación
      const formArray = this.formGroupSignal()?.get(field) as any;
      if (formArray && formArray.controls) {
        const formGroup = formArray.controls[index];
        if (formGroup) {
          const fieldControl = formGroup.get(fieldName);
          if (fieldControl) {
            fieldControl.markAsTouched();
            fieldControl.markAsDirty();
          }
        }
      }
    } else {
      console.warn('⚠️ [DEBUG] No existe currentData[' + index + ']');
    }
  }

  /**
   * Inicializa el canvas de firma con eventos de dibujo
   */
  initSignatureCanvas(canvasId: string, config: any, signatureField?: string): void {
    setTimeout(() => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Configurar canvas
      canvas.width = config?.width || config.signature_width || 300;
      canvas.height = config?.height || config.signature_height || 150;

      // Estilo del canvas
      canvas.style.border = config?.border_style || `${config.border_width || 1}px solid ${config.border_color || '#cccccc'}`;
      canvas.style.borderRadius = config?.border_radius || '4px';
      canvas.style.backgroundColor = config?.background_color || config.background_color || '#ffffff';

      // Configurar contexto de dibujo
      ctx.strokeStyle = config?.pen_color || config.pen_color || '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;
      let hasMarkedAsTouched = false; // Flag para marcar solo una vez

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        isDrawing = true;

        // Marcar el control como touched cuando el usuario empieza a dibujar
        if (!hasMarkedAsTouched && signatureField) {
          const formArray = this.formGroupSignal()?.get(signatureField) as FormArray;
          if (formArray && formArray.length > 0) {
            const lastIndex = formArray.length - 1;
            const currentFormGroup = formArray.at(lastIndex);
            const signatureControl = currentFormGroup?.get('signature');

            if (signatureControl) {
              signatureControl.markAsTouched();
              currentFormGroup?.markAsTouched();
              formArray.markAsTouched();
              hasMarkedAsTouched = true;
              console.log('✅ Control de firma marcado como touched al iniciar dibujo');
            }
          }
        }

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        [lastX, lastY] = [clientX - rect.left, clientY - rect.top];
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        [lastX, lastY] = [currentX, currentY];
      };

      const stopDrawing = () => {
        isDrawing = false;
      };

      // Eventos de mouse
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);

      // Eventos de touch para dispositivos móviles
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
      });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
      });
      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
      });
    }, 100);
  }

  /**
   * Captura una foto desde la cámara
   */
  onCapturePhoto(field: string, fieldName: string): void {
    console.log('📷 [DEBUG] onCapturePhoto:', { field, fieldName });
    // TODO: Implementar lógica para capturar foto desde cámara
    // Por ahora solo mostramos un mensaje en consola
    console.log('⚠️ Funcionalidad de captura de foto pendiente de implementación');
  }

  onUploadPhoto(field: string, fieldName: string): void {
    // Manejar la carga de foto desde archivo
  }

  onUploadSignature(field: string, fieldName: string): void {
    // Manejar la carga de firma desde archivo
  }

}
