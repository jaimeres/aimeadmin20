import { CommonModule, KeyValue } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, ElementRef, EventEmitter, inject, Input, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
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

import { CRUDService } from '../../utils/services/crud.service';
import { SharedDynamicDataService } from '@/utils/services/shared-dynamic-data.service';
import { GeneralService } from '@/utils/services/general.service';

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
    FloatLabelModule,
    InputGroupModule,
    InputGroupAddonModule,
    AutoFocusModule,
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

  @Input() formGroup!: FormGroup;
  @Input() drawForm: any;
  @Input() app: any;
  @Input() tabPanel!: string;
  @Input() customField: any;
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

  formGroupSignal = signal<FormGroup | null>(null);
  drawFormSignal = signal<any>(null);
  appSignal = signal<string>('');
  tabPanelSignal = signal<string>('');
  customFieldSignal = signal<any>(null);
  optionLabelSignal = signal<any>('label');
  showIconSignal = signal<boolean>(true);

  dropdownOptionsSignal = signal<any>([]);

  dataDropdown(element: any, force = false) {
    // si tiene opciones no se consulta al servidor    
    //aqui voy estoy revisando porque option no se inicializa con los dartos del choice y como se parseMarkerlos dropdawn en sabe al modulo
    //no lleva force ya que no consulta al servidor
    if (element.options) {
      this.dropdownOptionsSignal()[element.field] = element.options;
      return;//continue;
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar

    if (this.sharedS.data[element.field] && !force) {
      this.dropdownOptionsSignal()[element.field] = this.sharedS.data[element.field];
      return;//continue;
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar, va depsues de la validación de generalS.data,
    // porque seguramente trae los datos mas actualizados, por ejemplo cuando se agregan  o eliminan elementos
    if (this.sharedS.drawDropdown[element.field] && !force) {
      this.dropdownOptionsSignal()[element.field] = this.sharedS.drawDropdown[element.field];
      return;//continue;
    }

    //si no existe datos para ese dropdown se consulta al servidor,
    // en lugar de poner la app y el type en cada campo de json que genera el draw se pone una referencia
    // a un objeto que tiene la app y el type para evitar que esta info se guarde en el servidor y se pueda inyectar en el componente
    const app = this.crudS.appType[element.data_type]?.app;
    const type = this.crudS.appType[element.data_type]?.type;
    if (app && type) {

      this.crudS.getObject({ app, type }).subscribe((data: any) => {
        let dataDropdown = data.data.map((item: any) => {
          return {
            id: item.id,
            name: item.attributes.name,
            module: item.attributes.module,
          }
        });

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

                    }else*/ if (element.type == 'dropdown' || element.type == 'tree-select' || element.type == 'multi-select') {
            this.dataDropdown(element);

          } else if (element.card || element.fieldset) {
            const nestedElements = element.card || element.fieldset; //data_type //field

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

  ngOnChanges(changes: SimpleChanges) {

    if (changes['formGroup']) {
      this.formGroupSignal.set(changes['formGroup'].currentValue);
    }
    if (changes['drawForm']) {
      this.drawFormSignal.set(changes['drawForm'].currentValue);

      this.dropdownOptions(changes['drawForm'].currentValue);

    }
    if (changes['app']) {
      this.appSignal.set(changes['app'].currentValue);
    }
    if (changes['tabPanel']) {
      this.tabPanelSignal.set(changes['tabPanel'].currentValue);
    }
    if (changes['customField']) {
      this.customFieldSignal.set(changes['customField'].currentValue);
    }
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
   * Emite un evento cuando se modifica un dropdown
   * @param event evento del dropdown
   * @param object objeto que contiene el evento y el campo que se esta modificando
   */
  onChangeDropdown(event: any, object: any) {
    const field = object.field; //se obtiene el campo del objeto
    this.onChangeDropdownAction.emit({ event, field, object })
  }

  /**
   * Emite un evento cuando se selecciona un elemento en el autocomplete
   * @param event evento del autocomplete
   * @param field Campo que se esta modificando
   */
  onSelectAutoComplete(event: any, field: any, o: any = null) {
    this.onSelectAutoCompleteAction.emit({ event, field })
  }

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
    return !!(window && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform);
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


}
