import { CommonModule, KeyValue } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators, FormBuilder } from '@angular/forms';
import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, inject, Input, Output, signal, computed, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
// ************************ADAPTADO PARA CAPACITOR*********************
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// Scanner de códigos de barras para Capacitor
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
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
import { StepperModule } from 'primeng/stepper';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CRUDService } from '../../utils/services/crud.service';
import { SharedDynamicDataService } from '@/utils/services/shared-dynamic-data.service';
import { GeneralService } from '@/utils/services/general.service';
import { CustomButtonCrudComponent } from '../custom-button-crud/custom-button-crud.component';
import { MessageService } from '../services/message.service';
import { AuthService } from '@/auth/services/auth.service';
import { Preferences } from '@capacitor/preferences';
import { FormCacheConfig, FormCacheService } from '@/utils/services/form-cache.service';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'joinOrSelf', standalone: true, pure: true })
export class JoinOrSelfPipe implements PipeTransform {

  /**
   * Normaliza `option_label` para PrimeNG.
   * - Si es array, lo concatena usando `sep`.
   * - Si es string con comas, lo divide y concatena usando `sep`.
   * - Si es string simple, lo retorna tal cual.
   */
  transform(value: unknown, sep = ''): string {

    if (Array.isArray(value)) {
      return value.join(sep);
    }

    if (typeof value === 'string') {
      const parts = value.split(','); // split funciona igual si no hay coma

      if (parts.length === 1) {
        const trimmed = parts[0].trim();
        return trimmed || 'name';
      }

      const cleaned: string[] = [];

      for (const p of parts) {
        const t = p.trim();
        if (t) cleaned.push(t);
      }

      return cleaned.join(sep);
    }

    return 'name';
  }
}


@Component({
  selector: 'app-custom-draw-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    JoinOrSelfPipe,

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
    ChipModule,
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
    StepperModule,
    TableModule,
    TagModule,
    TooltipModule,
    CustomButtonCrudComponent,

    SplitButtonModule
  ],
  templateUrl: './custom-draw-form.component.html',
  styleUrl: './custom-draw-form.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomDrawFormComponent implements OnDestroy {

  @ViewChild('videoElement') video!: ElementRef;
  @ViewChild('canvasElement') canvas!: ElementRef;

  private crudS: any = inject(CRUDService);
  protected messageS: MessageService = inject(MessageService); // para mostrar mensajes
  private sharedS: SharedDynamicDataService = inject(SharedDynamicDataService);
  private generalS: GeneralService = inject(GeneralService); // funciones generales
  private fb: FormBuilder = inject(FormBuilder);
  private authS: AuthService = inject(AuthService);
  private formCacheS: FormCacheService = inject(FormCacheService);

  // Suscripción para detectar cambios en el formulario
  private formSubscription?: Subscription;
  private formStatusSubscription?: Subscription;
  /** Suscripción para el autoguardado de caché */
  private cacheAutoSaveSub?: Subscription;
  private wasDirty: boolean = false;

  /** Clave activa de caché para el formulario actual */
  private currentCacheKey: string | null = null;
  /** Config de caché del drawForm para la plataforma actual */
  private currentCacheConfig: FormCacheConfig | null = null;

  @Input() formGroup!: FormGroup;
  @Input() drawForm: any;
  @Input() type: any;
  @Input() tabPanel!: string;
  @Input() isCreate: boolean = true;
  @Input() optionLabel: any = 'label';
  @Input() showIcon: boolean = true;

  @Output() onChangeDropdownAction = new EventEmitter<any>();
  @Output() onShowDropdownAction = new EventEmitter<any>();
  @Output() onSelectAutoCompleteAction = new EventEmitter<any>();
  @Output() onNewIconDropdownAction = new EventEmitter<any>();
  @Output() onReloadIconDropdownAction = new EventEmitter<any>();
  @Output() onClosableIconDropdownAction = new EventEmitter<any>();
  @Output() onChangeToggleAction = new EventEmitter<any>();
  @Output() onNewIconAction = new EventEmitter<any>();
  @Output() onScanCodeAction = new EventEmitter<any>();
  @Output() onKeydownEnterAction = new EventEmitter<any>();
  @Output() onKeydownTabAction = new EventEmitter<any>();
  @Output() filesAction = new EventEmitter<any[]>();
  @Output() files64Action = new EventEmitter<any[]>();
  @Output() onButtonClickAction = new EventEmitter<any>();
  @Output() onTableRowSelect = new EventEmitter<any>();
  @Output() onTableRowUnselect = new EventEmitter<any>();
  @Output() onTableAddRow = new EventEmitter<any>();
  @Output() onTableEditRow = new EventEmitter<any>();
  @Output() onTableDeleteRow = new EventEmitter<any>();
  @Output() onTableCellEdit = new EventEmitter<any>();

  formGroupSignal = signal<FormGroup | null>(null);
  drawFormSignal = signal<any>(null);
  typeSignal = signal<string>('');
  tabPanelSignal = signal<string>('');
  //customFieldSignal = signal<any>(null);
  //optionLabelSignal = signal<any>('label');
  //showIconSignal = signal<boolean>(true);
  isCreateSignal = signal<boolean>(true);

  /** Indica que el formulario fue restaurado desde un borrador en caché (solo en creaciones) */
  readonly isCacheRestored = signal<boolean>(false);

  dropdownOptionsSignal = signal<any>({});

  // Signal para guardar los separators calculados de emails-chips
  emailSeparatorsSignal = signal<{ [key: string]: string | RegExp }>({ default: /[,;]/ });

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
      }
    });

    //console.log('✅ signatureDataSignal resultado completo:', signatureData);
    return signatureData;
  });

  /** Genera la clave namespaced por tipo para sharedS.data y sharedS.drawDropdown. */
  private _sharedKey(field: string): string {
    const prefix = this.typeSignal() || (this as any).type || '';
    return prefix ? `${prefix}:${field}` : field;
  }

  /**
   * Verifica si ya existen opciones en caché para un dropdown.
   * Además valida que el campo calculado de `option_label` exista.
   */
  /*async*/ dataDropdownExists(element: any, force = false)/*: Promise<any[] | false>*/ {
    const optionLabelField = this.getOptionLabelField(element);
    // si tiene opciones no se consulta al servidor    
    //aqui voy estoy revisando porque option no se inicializa con los dartos del choice y como se parseMarkerlos dropdawn en sabe al modulo
    //no lleva force ya que no consulta al servidor
    if (element.options && Array.isArray(element.options) && element.options.length > 0) {
      if (optionLabelField) {
        this.applyOptionLabelToOptions(element.options, element, optionLabelField);
      }
      return element.options;
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar
    const _dataKey = this._sharedKey(element.field);
    if (this.sharedS.data[_dataKey] && !force) {
      if (optionLabelField && !this.hasOptionLabelField(this.sharedS.data[_dataKey], optionLabelField)) {
        return false;
      }
      return this.sharedS.data[_dataKey];
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar, va depsues de la validación de generalS.data,
    // porque seguramente trae los datos mas actualizados, por ejemplo cuando se agregan  o eliminan elementos
    const _ddKey = this._sharedKey(element.field);
    if (this.sharedS.drawDropdown[_ddKey] && !force) {
      if (optionLabelField && !this.hasOptionLabelField(this.sharedS.drawDropdown[_ddKey], optionLabelField)) {
        return false;
      }
      return this.sharedS.drawDropdown[_ddKey];
    }

    // Cache persistente solo para móviles usando Preferences
    /*if (!force && this.isMobileCacheEnabled(element)) {
      const cached = await this.readMobileCache(element, optionLabelField);
      if (cached) {
        this.sharedS.drawDropdown[this._sharedKey(element.field)] = cached;
        return cached;
      }
    }*/

    return false;
  }

  /**
   * Carga opciones de dropdown desde servidor si no hay caché.
   * Soporta `option_label` como string separado por coma.
   */
  async dataDropdown(element: any, force = false) {

    const dropdownOptions = /*await*/ this.dataDropdownExists(element, force);
    if (dropdownOptions && !force) {
      this.dropdownOptionsSignal.set({
        ...this.dropdownOptionsSignal(),
        [element.field]: dropdownOptions
      });
      return;
    }
    //si no existe datos para ese dropdown se consulta al servidor,
    // en lugar de poner la app y el type en cada campo de json que genera el draw se pone una referencia
    // a un objeto que tiene la app y el type para evitar que esta info se guarde en el servidor y se pueda inyectar en el componente
    const app = this.crudS.appType[element.data_type]?.app;
    const type = this.crudS.appType[element.data_type]?.type;
    if (app && type) {

      this.messageS.showBlocked(true);
      this.crudS.getObject({ app, type }).subscribe(async (data: any) => {
        //let dataDropdown = data.data.map((item: any) => {
        let dataDropdown = this.generalS.DJAtoObject({
          respDJA: data,
          //como este camo es para llenar los drow se envia la configuracion del campo
          "fields": { [element.field]: element }
          //option_label: element?.option_label || ''
        });

        // Verificamos si al menos un objeto tiene un 'module' diferente de null,
        //esto es para los registros que tienen module, es decir, deferencia a que app pertenece
        const hasNonNullModule = dataDropdown.some((item: any) => item.module !== undefined);

        // Si existe al menos un module no nulo, filtramos solo los que sean 'MA'
        if (hasNonNullModule) {
          //°°° se debe definir el tema de los modulos, porque no todos necesitas filtar por module
          dataDropdown = dataDropdown.filter((item: any) => item.module === 'MA');
        }

        this.sharedS.drawDropdown[this._sharedKey(element.field)] = dataDropdown;
        this.dropdownOptionsSignal.set({
          ...this.dropdownOptionsSignal(),
          [element.field]: dataDropdown
        });
        if (!force && this.isMobileCacheEnabled(element)) {
          await this.writeMobileCache(element, dataDropdown);
        }
        this.messageS.showBlocked(false);
      });
    }
  }

  /**
   * Verifica si el cache móvil está habilitado por configuración del servidor.
   */
  private isMobileCacheEnabled(element: any): boolean {
    return this.generalS.isMobile() && element?.mobile?.cache?.active === true;
  }

  /**
   * Obtiene la clave del usuario para separar el cache por cuenta.
   */
  private getCacheUserKey(): string {
    const userId = this.authS.userId?.() ?? null;
    const username = this.authS.username?.() ?? null;
    return String(userId ?? username ?? 'anonymous');
  }

  /**
   * Genera la llave de cache móvil para un dropdown por usuario.
   */
  private getMobileCacheKey(element: any): string {
    const app = this.crudS.appType[element?.data_type]?.app || 'app';
    const type = this.crudS.appType[element?.data_type]?.type || 'type';
    const field = element?.field || 'field';
    const userKey = this.getCacheUserKey();
    return `dropdownCache:${userKey}:${app}:${type}:${field}`;
  }

  /**
   * Lee el cache móvil y valida expiración y labelField.
   */
  private async readMobileCache(element: any, optionLabelField: string | null): Promise<any[] | null> {
    try {
      const key = this.getMobileCacheKey(element);
      const { value } = await Preferences.get({ key });
      if (!value) return null;

      const parsed = JSON.parse(value);
      const data = parsed?.data;
      const savedAt = parsed?.savedAt;
      const ttlSeconds = element?.mobile?.cache?.time ?? 0;
      const ttlMs = Number(ttlSeconds) * 1000;

      if (!Array.isArray(data) || !savedAt || ttlMs <= 0) {
        return null;
      }

      // Descartar si la versión de la app ha cambiado (estructura del dropdown puede haber variado)
      const appVersion = await this.formCacheS.getAppVersion();
      if (parsed.version && parsed.version !== appVersion) {
        await Preferences.remove({ key });
        return null;
      }

      if (Date.now() - savedAt > ttlMs) {
        await Preferences.remove({ key });
        return null;
      }

      if (optionLabelField && !this.hasOptionLabelField(data, optionLabelField)) {
        this.applyOptionLabelToOptions(data, element, optionLabelField);
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Guarda el cache móvil con timestamp para expiración.
   */
  private async writeMobileCache(element: any, data: any[]): Promise<void> {
    try {
      const key = this.getMobileCacheKey(element);
      await Preferences.set({
        key,
        value: JSON.stringify({
          savedAt: Date.now(),
          version: await this.formCacheS.getAppVersion(),
          data
        })
      });
    } catch {
      // Silencioso: cache opcional
    }
  }

  /**
   * Normaliza `option_label` a array de campos.
   * Acepta array o string con comas: "name,last_name".
   */
  private parseOptionLabel(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }

    return [];
  }

  /**
   * Obtiene el nombre del campo concatenado usado como `optionLabel`.
   * Se concatena SIN espacios para construir el nombre de propiedad.
   */
  private getOptionLabelField(element: any): string | null {
    const labels = this.parseOptionLabel(element?.option_label);
    return labels.length > 0 ? labels.join('') : null;
  }

  /**
   * Verifica si el primer elemento ya contiene la propiedad del label concatenado.
   */
  private hasOptionLabelField(options: any[], labelField: string): boolean {
    if (!Array.isArray(options) || options.length === 0) return true;
    return options[0]?.hasOwnProperty(labelField);
  }

  /**
   * Aplica el label concatenado a cada opción cuando no existe.
   */
  private applyOptionLabelToOptions(options: any[], element: any, labelField: string): void {
    if (!Array.isArray(options) || options.length === 0) return;
    if (options[0]?.hasOwnProperty(labelField)) return;

    const separator = element?.option_label_separator ?? ' ';
    const labelFields = this.parseOptionLabel(element?.option_label);
    if (labelFields.length === 0) return;

    for (const opt of options) {
      const label = labelFields
        .map((key: string) => opt?.[key])
        .filter((val: any) => val !== undefined && val !== null && String(val).trim() !== '')
        .map((val: any) => String(val))
        .join(separator);
      opt[labelField] = label;
    }
  }

  private readonly DROPDOWN_TYPES = new Set([
    'dropdown',
    'tree-select',
    'multi-select',
    'dropdown-choice',
  ]);

  private isDropdown(el: any): boolean {
    return !!el?.type && this.DROPDOWN_TYPES.has(el.type);
  }

  /**
   * Recorre un elemento y sus hijos (card/fieldset) de forma recursiva.
   */
  private walkElement(el: any, visit: (node: any) => void): void {
    if (!el) return;

    visit(el);

    const nested = el.card || el.fieldset;
    if (nested && typeof nested === 'object') {
      for (const child of Object.values(nested)) {
        this.walkElement(child, visit);
      }
    }
  }

  /**
   * Procesa una colección { 0: {...}, 1: {...} } o array de elementos
   */
  private processElements(collection: any): void {
    if (!collection || typeof collection !== 'object') return;

    for (const el of Object.values(collection)) {
      this.walkElement(el, (node) => {
        if (this.isDropdown(node)) {
          this.dataDropdown(node);
        }
      });
    }
  }

  dropdownOptions(drawForm: any): void {
    // grid
    if (drawForm?.grid) {
      this.processElements(drawForm.grid);
    }

    // stepper
    const steps = drawForm?.stepper?.steps;
    if (steps) {
      for (const step of Object.values(steps)) {
        this.processElements((step as any)?.fields);
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

  /**
   * Inicializa los campos de tipo emails-chips
   * Calcula y cachea los separators en un signal
   */
  initializeEmailChipsFields(drawForm: any) {
    const separators: { [key: string]: string | RegExp } = {};

    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];

          if (element?.type === 'emails-chips') {
            separators[element.field] = this.calculateSeparator(element.separator);
          } else if (element?.card || element?.fieldset) {
            const nestedElements = element.card || element.fieldset;
            for (const key2 in nestedElements) {
              if (nestedElements.hasOwnProperty(key2)) {
                const element2 = nestedElements[key2];
                if (element2?.type === 'emails-chips') {
                  separators[element2.field] = this.calculateSeparator(element2.separator);
                }
              }
            }
          }
        }
      }
    }

    this.emailSeparatorsSignal.set(separators);
  }

  /**
   * Calcula el separator para un campo emails-chips
   * Retorna string (un carácter) o RegExp (múltiples caracteres)
   */
  private calculateSeparator(separatorConfig: any): string | RegExp {
    if (!separatorConfig) {
      // Por defecto: coma o punto y coma (RegExp)
      return /[,;]/;
    }

    const separatorChars: string[] = [];

    // Los separadores que NO son blur ni tab se agregan al array
    // blur y tab se manejan con propiedades [addOnBlur] y [addOnTab]
    if (separatorConfig.comma !== false) separatorChars.push(',');
    if (separatorConfig.semicolon !== false) separatorChars.push(';');
    if (separatorConfig.space === true) separatorChars.push(' ');
    if (separatorConfig.pipe === true) separatorChars.push('\\|'); // Escapar pipe para RegExp

    // Otros separadores personalizados que no son blur ni tab
    Object.keys(separatorConfig).forEach(key => {
      if (key !== 'blur' && key !== 'tab' &&
        key !== 'comma' && key !== 'semicolon' &&
        key !== 'space' && key !== 'pipe' &&
        separatorConfig[key] === true && key.length === 1) {
        // Escapar caracteres especiales de RegExp
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        separatorChars.push(escaped);
      }
    });

    // Si no hay separadores, usar coma y punto y coma por defecto
    if (separatorChars.length === 0) {
      return /[,;]/;
    }

    // Si solo hay un separador, devolver string de un carácter
    if (separatorChars.length === 1 && separatorChars[0].length === 1) {
      return separatorChars[0];
    }

    // Si hay múltiples separadores, devolver RegExp
    const pattern = `[${separatorChars.join('')}]`;
    return new RegExp(pattern);
  }



  ngOnChanges(changes: SimpleChanges) {

    if (changes['formGroup']) {
      const previousValue = changes['formGroup'].previousValue;
      const currentValue = changes['formGroup'].currentValue;

      this.formGroupSignal.set(currentValue);

      // Limpiar suscripciones anteriores si existen
      if (this.formSubscription) {
        this.formSubscription.unsubscribe();
      }
      if (this.formStatusSubscription) {
        this.formStatusSubscription.unsubscribe();
      }

      // Si el formGroup cambió (reset o nuevo objeto), limpiar todos los canvas de firma Y archivos multimedia
      if (previousValue !== currentValue && currentValue) {
        setTimeout(() => {
          this.clearAllSignatureCanvases();
          this.clearAllMediaFiles();
          // Si initFormAutoCache() ya terminó y restauró archivos desde caché,
          // reconstruir files64Signal porque clearAllMediaFiles() los acaba de borrar
          if (this.isCacheRestored()) {
            this.restoreFiles64FromCache(currentValue);
          }
        }, 300);
      }

      // Suscribirse a cambios de estado del formulario para detectar reset automático
      if (currentValue) {
        //console.log('📋 Inicializando suscripción al formulario');
        this.wasDirty = currentValue.dirty;

        // Suscribirse al estado del formulario (pristine/dirty)
        this.formStatusSubscription = currentValue.statusChanges.subscribe(() => {
          const isPristine = currentValue.pristine;
          const isDirty = currentValue.dirty;

          // Detectar reset: el formulario estaba dirty y ahora es pristine
          if (this.wasDirty && isPristine) {
            //console.log('🔄 Reset detectado (dirty -> pristine) - limpiando multimedia, firmas y reseteando stepper');
            setTimeout(async () => {
              if (this.hasMultimediaFiles()) {
                this.clearAllMediaFiles();
                this.clearAllSignatureCanvases();
              }
              // Resetear el stepper al valor inicial
              const drawForm = this.drawFormSignal();
              if (drawForm?.stepper) {
                const initialStep = drawForm.stepper.value || 1;
                this.setCurrentStep(initialStep);
                //console.log(`📍 Stepper reseteado al step inicial: ${initialStep}`);
              }
              // Limpiar caché de formulario al resetear (incluye luego de guardar en servidor)
              await this.clearFormCache();
              // Re-inicializar el sistema de caché para el próximo uso:
              // Si el padre reutiliza la misma instancia de FormGroup (sin cambiar la referencia),
              // ngOnChanges no dispara, así que reiniciamos aquí para que el autoguardado
              // quede activo en la siguiente apertura del formulario.
              this.initFormAutoCache();
            }, 50);
          }

          // Actualizar estado
          this.wasDirty = isDirty;
        });
      }
    }
    if (changes['drawForm']) {
      this.drawFormSignal.set(changes['drawForm'].currentValue);

      this.dropdownOptions(changes['drawForm'].currentValue);
      this.initializeTableFields(changes['drawForm'].currentValue);
      this.initializeSignatureFields(changes['drawForm'].currentValue);
      this.initializeEmailChipsFields(changes['drawForm'].currentValue);

      // Inicializar el step actual si hay un stepper
      const drawForm = changes['drawForm'].currentValue;
      if (drawForm?.stepper) {
        const initialStep = drawForm.stepper.value || 1;
        this.setCurrentStep(initialStep);
        //console.log('📍 Step inicial del stepper:', initialStep);
      } else {
        // Si no hay stepper, usar null para mostrar toda la multimedia
        this.setCurrentStep(null);
        //console.log('📍 Sin stepper - mostrando toda la multimedia');
      }
    }
    if (changes['type']) {
      this.typeSignal.set(changes['type'].currentValue);
    }
    if (changes['tabPanel']) {
      this.tabPanelSignal.set(changes['tabPanel'].currentValue);
    }
    /*if (changes['customField']) {
      this.customFieldSignal.set(changes['customField'].currentValue);
    }*/
    /*if (changes['optionLabel']) {
      this.optionLabelSignal.set(changes['optionLabel'].currentValue);
    }*/
    //if (changes['showIcon']) {
    //  this.showIconSignal.set(changes['showIcon'].currentValue);
    //}

    if (changes['formGroup'] || changes['drawForm'] || changes['type'] || /*changes['tabPanel'] ||*/ changes['isCreate']) {
      this.initFormAutoCache();
    }

    if (changes['isCreate']) {
      this.isCreateSignal.set(changes['isCreate'].currentValue);
    }

  }

  /**
   * Limpia las suscripciones cuando el componente se destruye.
   * El caché NO se borra aquí: los datos persisten para recuperación futura.
   */
  ngOnDestroy(): void {
    //console.log('🧹 Limpiando suscripciones del componente');
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    if (this.formStatusSubscription) {
      this.formStatusSubscription.unsubscribe();
    }
    if (this.cacheAutoSaveSub) {
      this.cacheAutoSaveSub.unsubscribe();
    }
  }

  // ─────────────────────────────────────────────────
  // Caché automático de formulario
  // ─────────────────────────────────────────────────

  /**
   * Inicializa el sistema de caché para el formulario actual.
   * Lee la config `cache` del drawForm, decide si aplica para el
   * dispositivo / modo actual, restaura datos del borrador si existen
   * y se suscribe a valueChanges para autoguardar.
   */
  private async initFormAutoCache(): Promise<void> {
    const formGroup = this.formGroupSignal();
    const drawForm = this.drawFormSignal();
    // Usar el @Input directo como fallback porque typeSignal solo se actualiza
    // cuando 'app' aparece en changes, y puede no coincidir con el ciclo actual
    const type = this.typeSignal() || this.type;

    // Limpiar suscripción de autoguardado anterior
    if (this.cacheAutoSaveSub) {
      this.cacheAutoSaveSub.unsubscribe();
      this.cacheAutoSaveSub = undefined;
    }

    if (!formGroup || !drawForm) {
      return;
    }

    // Escanear los campos del drawForm para obtener cuáles tienen caché habilitado
    const cacheConfig = this.formCacheS.getCacheConfig(drawForm);
    if (!cacheConfig) {
      return;
    }

    // Seleccionar qué campos aplican según el modo actual
    const cacheableFields = this.isCreateSignal()
      ? cacheConfig.creationFields
      : cacheConfig.editionFields;

    if (cacheableFields.length === 0) {
      return;
    }

    // Construir clave única por usuario + app + tabPanel
    const key = this.formCacheS.getKey(
      this.getCacheUserKey(),
      type || 'default',
      this.tabPanelSignal() || /*this.tabPanel ||*/ 'default'
    );

    console.log('[FormCache] cache key:', key);

    this.currentCacheKey = key;
    this.currentCacheConfig = cacheConfig;

    // ── Restaurar borrador si existe ────────────────
    if (this.isCreateSignal()) {
      const cached = await this.formCacheS.load(key);
      if (cached) {
        formGroup.patchValue(cached, { emitEvent: false });
        formGroup.markAsDirty();
        this.wasDirty = true;
        this.isCacheRestored.set(true);
        // files64Signal no se restaura con patchValue (es solo memoria);
        // reconstruirlo a partir de los valores de tipo archivo del formulario
        this.restoreFiles64FromCache(formGroup);
      }
    }

    // ── Autoguardado con debounce — solo campos permitidos ───────────
    this.cacheAutoSaveSub = formGroup.valueChanges
      .pipe(debounceTime(1500))
      .subscribe((value) => {
        if (!this.currentCacheKey || !this.currentCacheConfig) return;
        // Filtrar solo los campos que tienen caché habilitado para evitar guardar datos sensibles
        const fields = this.isCreateSignal()
          ? this.currentCacheConfig.creationFields
          : this.currentCacheConfig.editionFields;
        const filtered: any = {};
        for (const f of fields) {
          if (f in value) filtered[f] = value[f];
          // Para dropdowns de tipo object_X, también persiste el campo derivado X
          // (objeto completo establecido por on ChangeDropdown via setValue)
          //esto ya no es necesario ya que  el patchValue lo debe agregaer
          //if (f.startsWith('object_')) {
          //  const derived = f.replace('object_', '');
          //  if (derived in value) filtered[derived] = value[derived];
          //}
        }
        this.formCacheS.save(this.currentCacheKey, filtered, this.currentCacheConfig);
      });

    console.log('[FormCache] ✅ autoSave subscription active, key:', key);
  }

  /**
   * Reconstruye files64Signal a partir de los valores del formulario restaurados
   * desde caché. Necesario porque appendFile guarda el archivo en dos lugares:
   * el FormControl (persistido en caché) y files64Signal (solo en memoria).
   * Al restaurar con patchValue solo se recupera el form; este método sincroniza
   * files64Signal para que las imágenes/videos vuelvan a mostrarse en el template.
   */
  private restoreFiles64FromCache(formGroup: FormGroup): void {
    // patchValue ya restauró todos los FormControls (documents, object_, etc.).
    // Aquí solo reconstruimos files64Signal (memoria) desde lo que ya está en el form.
    // NO llamamos appendFile: eso volvería a hacer setValue y acumularía en cada llamada.
    const seen = new Set<string>(); // dedup por base64: field y key tienen los mismos fileObjects
    const restoredFiles: any[] = [];

    Object.keys(formGroup.controls).forEach(controlName => {
      const value = formGroup.get(controlName)?.value;
      if (!value) return;

      const items: any[] = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (
          item &&
          typeof item === 'object' &&
          typeof item.file === 'string' &&
          (item.type === 'image' || item.type === 'video') &&
          //esto es exclusivo para cuando se agrega documentos por separado por ejemplo campos_inicial, campo_final
          //esa seria la clave, pero el field seria documents
          controlName === item.field //
        ) {
          //const dedupKey = item.file.slice(0, 60);
          //if (seen.has(dedupKey)) continue;
          //seen.add(dedupKey);
          restoredFiles.push(item);
        }
      }
    });

    this.files64Signal.set(restoredFiles);
    this.files64Action.emit(restoredFiles);
  }

  /**
   * Elimina el borrador en caché y apaga el indicador de recuperación.
   * La clave permanece activa para seguir autoguardando nuevas entradas.
   */
  private async clearFormCache(): Promise<void> {
    if (this.currentCacheKey) {
      await this.formCacheS.clear(this.currentCacheKey);
    }
    this.isCacheRestored.set(false);
  }

  /**
   * Descarta el borrador y limpia el formulario.
   * Llamado desde el botón "Descartar borrador" en el template.
   */
  async discardCacheData(): Promise<void> {
    await this.clearFormCache();
    this.formGroupSignal()?.reset();
  }

  /**
   * Verifica si hay archivos multimedia guardados
   */
  private hasMultimediaFiles(): boolean {
    return this.files64Signal().length > 0;
  }

  /**
   * Valida todos los campos que pertenecen a un step específico
   * Valida tanto field como key (si existe)
   * Retorna true si todos los campos del step son válidos
   */
  validateStepFields(stepNumber: number): boolean {
    const drawForm = this.drawFormSignal();
    if (!drawForm?.stepper?.steps) return true;

    const step = drawForm.stepper.steps[stepNumber];
    if (!step?.fields) return true;

    const formGroup = this.formGroupSignal();
    if (!formGroup) return false;

    // Obtener todos los campos del step
    const stepFields = Object.values(step.fields);
    let allValid = true;

    for (const fieldConfig of stepFields) {
      const fieldName = (fieldConfig as any).field;
      const keyName = (fieldConfig as any).key;

      if (!fieldName && !keyName) continue;

      // Validar field
      if (fieldName) {
        const control = formGroup.get(fieldName);
        if (control) {
          // Marcar como touched Y dirty para mostrar errores visualmente
          control.markAsTouched();
          control.markAsDirty();
          control.updateValueAndValidity();

          if (control.invalid) {
            //console.log(`❌ Campo field "${fieldName}" inválido:`, control.errors);
            allValid = false;
          } else {
            //console.log(`✅ Campo field "${fieldName}" válido`);
          }
        }
      }

      // Validar key (si existe y es diferente de field)
      if (keyName && keyName !== fieldName) {
        const keyControl = formGroup.get(keyName);
        if (keyControl) {
          // Marcar como touched Y dirty para mostrar errores visualmente
          keyControl.markAsTouched();
          keyControl.markAsDirty();
          keyControl.updateValueAndValidity();

          if (keyControl.invalid) {
            //console.log(`❌ Campo key "${keyName}" inválido:`, keyControl.errors);
            allValid = false;
          } else {
            //console.log(`✅ Campo key "${keyName}" válido`);
          }
        }
      }
    }

    //console.log(`${allValid ? '✅' : '❌'} Step ${stepNumber} es ${allValid ? 'válido' : 'inválido'}`);
    return allValid;
  }

  keyComparator(a: KeyValue<number, any>, b: KeyValue<number, any>): number {
    return a.key - b.key;
  }

  public suggestions = signal<any[]>([]);

  completeMethod(event: any, entry: any) {
    const filter = "filter[search]=" + event.query;
    const include = entry.include;
    //debo cambiarlo por cols de de combo
    //"cols": {
    //    "hide": True,
    //    "label": "",
    //    "sortable": True,
    //    "locked": False,
    //    "fields":  {
    //        #0:{"field":"name"}
    //    }
    //}
    const additionalFieldsIncluded = entry.fields_included_relationships;
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
  /*async*/ onChangeDropdown(event: any, object: any) {
    const field = object.field; //se obtiene el campo del objeto
    const currentValue = this.formGroupSignal()?.get(field)?.value;
    const formValues = this.formGroupSignal()?.value;
    //const eventValue = event.value; // ID/valor seleccionado del dropdown

    //asigna el valor del campo object_parent_form_data_X al objeto completo
    if (field.startsWith('object_')) {
      const newField = field.replace('object_', '');
      const foundObject = this.dropdownOptionsSignal()[field]?.
        find((item: any) => item.id === currentValue || item.value === currentValue);
      alert()
      // Si existe cols_values y es un array válido, filtrar el objeto, sino usar el objeto completo
      // cols_values ahora es un array de objetos: [{field: 'id', required: true, default: null}, ...]
      //°°°falta required aunque no creo que deba llevalor
      let currentValueObject = foundObject;

      if (foundObject && object?.cols_values && Array.isArray(object.cols_values) && object.cols_values.length > 0) {
        let filteredObject: any = null;

        object.cols_values.forEach((colConfig: any) => {
          // Extraer el nombre del campo de la configuración
          const fieldName = colConfig.field;

          if (!fieldName) {
            return;
          }

          if (!filteredObject) {
            filteredObject = {};
          }

          // Asignar valor desde foundObject, o usar default si no existe
          if (foundObject.hasOwnProperty(fieldName)) {
            filteredObject[fieldName] = foundObject[fieldName];
          } else if (colConfig.hasOwnProperty('default')) {
            // Si el campo no existe en foundObject pero tiene default, usar el default
            filteredObject[fieldName] = colConfig.default;
          }
        });

        currentValueObject = filteredObject;
      }

      //siempre se envia id y hay type, porque se asume que es una relacion y puede ser que se ocupe si no es 
      // no incia con parent_form_data_, form_data_ 

      if (foundObject?.type_type && currentValueObject && !field.startsWith('form_data_') && !field.startsWith('parent_form_data_')) {
        currentValueObject['type'] = foundObject.type_type;
        currentValueObject['id'] = foundObject.id;
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
    const fields = children?.fields || {};

    if (fields && Object.keys(fields).length > 0) {
      // Obtener opciones del dropdown padre actual
      const dropdownOptions = /*await*/ this.dataDropdownExists(object);
      let currentDropdownOption: any = null;
      if (dropdownOptions) {
        currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
      }

      // Procesar cada tipo de campo: static, dynamic, derived
      ['static', 'dynamic', 'derived'].forEach(fieldType => {
        if (fields[fieldType]) {
          for (const key in fields[fieldType]) {
            if (fields[fieldType].hasOwnProperty(key)) {
              const fieldConfig = fields[fieldType][key];

              // 1. EVALUAR CONDICIONES DE ACTIVACIÓN
              const activateConfig = fieldConfig?.activate;
              let isActive = true; // Por defecto activo

              if (activateConfig?.active) {
                const conditions = activateConfig.conditions || [];
                const logic = activateConfig.logic || 'AND';
                const action = activateConfig.action || 'inactive'; // inactive/active

                // Evaluar cada condición
                const conditionResults = conditions.map((condition: any) => {
                  // VALIDAR: field es OBLIGATORIO
                  if (!condition.field) {
                    return false;
                  }

                  const conditionField = condition.field;

                  // Determinar si conditionField es el campo padre
                  // Comparar sin el prefijo "object_" porque el form almacena con "object_" pero las condiciones usan el nombre sin prefijo
                  const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                  let conditionValue;
                  if (isParentField) {
                    // Si es el campo padre, usar el objeto completo del dropdown
                    conditionValue = currentDropdownOption;
                  } else {
                    // Si es otro campo, buscar en el formulario
                    const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                    // Si el formValue es solo un ID, intentar obtener el objeto completo de las opciones
                    if (formValue && typeof formValue === 'string') {
                      const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                      conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                    } else {
                      conditionValue = formValue;
                    }
                  }

                  // Si no viene filter_group, usar 'id' por defecto
                  const filterGroup = condition.filter_group || 'id';
                  const operator = condition.operator || 'equals';
                  const values = condition.values || [];

                  if (!conditionValue) {
                    //console.log('❌ Condición sin valor:', { conditionField, isParentField });
                    return false;
                  }

                  // Obtener el valor a comparar según filter_group
                  const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                  // Evaluar según operador
                  let result = false;
                  switch (operator) {
                    case 'equals':
                      // EQUALS: Cada elemento del array values debe ser exactamente igual al compareValue
                      // Verifica si compareValue está en el array values
                      result = values.some((val: any) => val === compareValue);
                      break;

                    case 'not_equals':
                      // NOT_EQUALS: compareValue NO debe estar en values
                      result = !values.some((val: any) => val === compareValue);
                      break;

                    case 'in':
                      // IN: compareValue debe contener alguno de los valores en values (substring)
                      result = values.some((val: any) =>
                        String(compareValue).includes(String(val))
                      );
                      break;

                    case 'not_in':
                      // NOT_IN: compareValue NO debe contener ninguno de los valores en values
                      result = !values.some((val: any) =>
                        String(compareValue).includes(String(val))
                      );
                      break;

                    case 'greater_than':
                      // GREATER_THAN: compareValue debe ser mayor que alguno de los valores en values
                      result = values.some((val: any) => compareValue > val);
                      break;

                    case 'less_than':
                      // LESS_THAN: compareValue debe ser menor que alguno de los valores en values
                      result = values.some((val: any) => compareValue < val);
                      break;

                    case 'range':
                      // RANGE: compareValue debe estar entre values[0] (inicio) y values[1] (fin)
                      // Formato: values = [inicio, fin] - EXACTAMENTE 2 valores
                      // Soporta: fechas, números, strings
                      if (values.length === 2) {
                        const inicio = values[0];
                        const fin = values[1];

                        // Detectar tipo de dato y comparar
                        // Si son fechas (string ISO), convertir a Date
                        if (typeof compareValue === 'string' &&
                          /^\d{4}-\d{2}-\d{2}/.test(compareValue)) {
                          const dateCompare = new Date(compareValue);
                          const dateInicio = new Date(inicio);
                          const dateFin = new Date(fin);
                          result = dateCompare >= dateInicio && dateCompare <= dateFin;
                        }
                        // Si son números
                        else if (typeof compareValue === 'number') {
                          result = compareValue >= inicio && compareValue <= fin;
                        }
                        // String o cualquier otro tipo
                        else {
                          result = compareValue >= inicio && compareValue <= fin;
                        }
                      } else {
                        //console.error(`❌ ERROR: Operador 'range' requiere EXACTAMENTE 2 valores [inicio, fin]. Recibidos: ${values.length}`, values);
                        result = false;
                      }
                      break;

                    default:
                      //console.warn('⚠️ Operador desconocido:', operator);
                      result = false;
                  }

                  //console.log(`${result ? '✅' : '❌'} Resultado de condición:`, result);
                  return result;
                });

                // Aplicar lógica AND/OR
                if (logic === 'AND') {
                  isActive = conditionResults.every((result: boolean) => result);
                } else { // OR
                  isActive = conditionResults.some((result: boolean) => result);
                }

                // Aplicar acción: inactive invierte el resultado, active lo mantiene
                if (action === 'inactive') {
                  isActive = !isActive; // Si action es 'inactive', invertir (desactivar cuando se cumpla)
                }
                // Si action === 'active', mantener isActive como está (activar cuando se cumpla)

                //console.log(`${isActive ? '✅' : '❌'} Campo ${key} ${isActive ? 'ACTIVO' : 'INACTIVO'}`);
              }

              // Habilitar/deshabilitar campo según resultado
              const formControl = this.formGroupSignal()?.get(key);
              if (formControl) {
                if (isActive) {
                  formControl.enable();
                } else {
                  formControl.disable();
                  formControl.setValue(null); // Limpiar valor cuando se desactiva
                }
              }

              // Si key inicia con object_, verificar si existe campo sin prefijo y sincronizar estado
              if (key.startsWith('object_')) {
                const relatedField = key.replace('object_', '');
                const relatedControl = this.formGroupSignal()?.get(relatedField);
                if (relatedControl) {
                  if (isActive) {
                    relatedControl.enable();
                  } else {
                    relatedControl.disable();
                    relatedControl.setValue(null);
                  }
                  //console.log(`🔗 Campo relacionado '${relatedField}' ${isActive ? 'ACTIVADO' : 'DESACTIVADO'}`);
                }
              }

              // 3. EVALUAR CONDICIONES DE REQUIRED/NOT_REQUIRED
              const requestedConfig = fieldConfig?.requested;

              if (requestedConfig?.active) {
                const conditions = requestedConfig.conditions || [];
                const logic = requestedConfig.logic || 'AND';
                const action = requestedConfig.action; // required/not_required

                // VALIDAR: action es OBLIGATORIO
                if (!action) {
                  console.error('❌ ERROR: requested.action es obligatorio. Debe ser "required" o "not_required"', {
                    fieldConfig: key,
                    requestedConfig
                  });
                  // No aplicar ninguna validación si no hay action explícito
                } else {

                  // Evaluar cada condición (misma lógica que activate)
                  const conditionResults = conditions.map((condition: any) => {
                    if (!condition.field) {
                      //console.error('❌ ERROR: condition.field es obligatorio en requested', { condition, fieldConfig: key });
                      return false;
                    }

                    const conditionField = condition.field;
                    const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                    let conditionValue;
                    if (isParentField) {
                      conditionValue = currentDropdownOption;
                    } else {
                      const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                      if (formValue && typeof formValue === 'string') {
                        const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                        conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                      } else {
                        conditionValue = formValue;
                      }
                    }

                    const filterGroup = condition.filter_group || 'id';
                    const operator = condition.operator || 'equals';
                    const values = condition.values || [];

                    if (!conditionValue) {
                      //console.log('❌ Condición sin valor (requested):', { conditionField, isParentField });
                      return false;
                    }

                    const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                    // Evaluar según operador (mismos operadores que activate)
                    let result = false;
                    switch (operator) {
                      case 'equals':
                        result = values.some((val: any) => val === compareValue);
                        break;
                      case 'not_equals':
                        result = !values.some((val: any) => val === compareValue);
                        break;
                      case 'in':
                        result = values.some((val: any) => String(compareValue).includes(String(val)));
                        break;
                      case 'not_in':
                        result = !values.some((val: any) => String(compareValue).includes(String(val)));
                        break;
                      case 'greater_than':
                        result = values.some((val: any) => compareValue > val);
                        break;
                      case 'less_than':
                        result = values.some((val: any) => compareValue < val);
                        break;
                      case 'range':
                        if (values.length === 2) {
                          const inicio = values[0];
                          const fin = values[1];
                          if (typeof compareValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(compareValue)) {
                            const dateCompare = new Date(compareValue);
                            const dateInicio = new Date(inicio);
                            const dateFin = new Date(fin);
                            result = dateCompare >= dateInicio && dateCompare <= dateFin;
                          } else if (typeof compareValue === 'number') {
                            result = compareValue >= inicio && compareValue <= fin;
                          } else {
                            result = compareValue >= inicio && compareValue <= fin;
                          }
                        } else {
                          console.error(`❌ ERROR: Operador 'range' requiere EXACTAMENTE 2 valores [inicio, fin]. Recibidos: ${values.length}`, values);
                          result = false;
                        }
                        break;
                      default:
                        console.warn('⚠️ Operador desconocido en requested:', operator);
                        result = false;
                    }

                    return result;
                  });

                  // Aplicar lógica AND/OR
                  let conditionsMet = false;
                  if (logic === 'AND') {
                    conditionsMet = conditionResults.every((result: boolean) => result);
                  } else { // OR
                    conditionsMet = conditionResults.some((result: boolean) => result);
                  }

                  // Determinar si es requerido según action
                  let isRequired = false;
                  if (action === 'required') {
                    // Si action es 'required': campo REQUERIDO cuando condiciones se cumplan
                    isRequired = conditionsMet;
                  } else if (action === 'not_required') {
                    // Si action es 'not_required': campo NO REQUERIDO cuando condiciones se cumplan
                    // Es decir, REQUERIDO cuando NO se cumplan
                    isRequired = !conditionsMet;
                  }

                  //console.log(`${isRequired ? '📌' : '⭕'} Campo ${key} ${isRequired ? 'REQUERIDO' : 'NO REQUERIDO'}`);

                  // Aplicar validador required/optional al FormControl
                  if (formControl) {
                    if (isRequired) {
                      formControl.setValidators([Validators.required]);
                    } else {
                      formControl.clearValidators();
                    }
                    formControl.updateValueAndValidity();
                  }

                  // Sincronizar required/optional con campo relacionado (si tiene prefijo object_)
                  if (key.startsWith('object_')) {
                    const relatedField = key.replace('object_', '');
                    const relatedControl = this.formGroupSignal()?.get(relatedField);
                    if (relatedControl) {
                      if (isRequired) {
                        relatedControl.setValidators([Validators.required]);
                      } else {
                        relatedControl.clearValidators();
                      }
                      relatedControl.updateValueAndValidity();
                      //console.log(`🔗 Campo relacionado '${relatedField}' ${isRequired ? 'REQUERIDO' : 'NO REQUERIDO'}`);
                    }
                  }
                }
              }

              //#########fin de required/not_required

              // 2. PROCESAR SEGÚN TIPO DE CAMPO
              if (fieldType === 'derived') {
                // DERIVED: Asignar valor del campo específico del objeto seleccionado
                const fieldName = fieldConfig?.field_name;
                if (fieldName && currentDropdownOption && isActive) {
                  if (currentDropdownOption[fieldName]) {
                    this.formGroupSignal()?.get(key)?.setValue(currentDropdownOption[fieldName]);
                  }
                }

              } else if (fieldType === 'static') {
                // STATIC: Filtrar opciones hardcodeadas
                // Opciones ahora están a la altura de filter (fuera)
                const options = fieldConfig?.options || [];
                const filterConfig = fieldConfig?.filter;

                if (filterConfig?.active && isActive) {
                  const conditions = filterConfig.conditions || [];
                  const logic = filterConfig.logic || 'AND';
                  const resultPosition = filterConfig.result_position || 'all';

                  // Filtrar opciones según condiciones
                  let filteredOptions = options.filter((option: any) => {
                    // Si no hay condiciones, no filtrar nada
                    if (conditions.length === 0) return true;

                    const conditionResults = conditions.map((condition: any) => {
                      // VALIDAR: field es OBLIGATORIO
                      if (!condition.field) {
                        //console.error('❌ ERROR: condition.field es obligatorio en filter', { condition, fieldConfig: key });
                        return false;
                      }

                      const conditionField = condition.field;

                      // Determinar si conditionField es el campo padre
                      const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                      let conditionValue;
                      if (isParentField) {
                        // Si es el campo padre, usar el objeto completo del dropdown
                        conditionValue = currentDropdownOption;
                      } else {
                        // Si es otro campo, buscar en el formulario
                        const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                        // Si el formValue es solo un ID, intentar obtener el objeto completo de las opciones
                        if (formValue && typeof formValue === 'string') {
                          const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                          conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                        } else {
                          conditionValue = formValue;
                        }
                      }

                      // Si no viene filter_group, usar 'id' por defecto
                      const filterGroup = condition.filter_group || 'id';
                      const operator = condition.operator || 'equals';
                      const values = condition.values || [];

                      if (!conditionValue) return false;

                      // Obtener el valor a comparar de la opción (hijo) y del padre
                      const optionValue = filterGroup ? option[filterGroup] : option.id;
                      const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                      switch (operator) {
                        case 'equals':
                          // EQUALS: optionValue debe ser exactamente igual a compareValue
                          // O si hay values, optionValue debe estar en values
                          if (values.length > 0) {
                            return values.some((val: any) => val === optionValue);
                          }
                          return optionValue === compareValue;

                        case 'not_equals':
                          // NOT_EQUALS: optionValue NO debe ser igual a compareValue
                          if (values.length > 0) {
                            return !values.some((val: any) => val === optionValue);
                          }
                          return optionValue !== compareValue;

                        case 'in':
                          // IN: optionValue debe contener alguno de los valores en values (substring)
                          if (values.length > 0) {
                            return values.some((val: any) =>
                              String(optionValue).includes(String(val))
                            );
                          }
                          return String(optionValue).includes(String(compareValue));

                        case 'not_in':
                          // NOT_IN: optionValue NO debe contener ninguno de los valores en values
                          if (values.length > 0) {
                            return !values.some((val: any) =>
                              String(optionValue).includes(String(val))
                            );
                          }
                          return !String(optionValue).includes(String(compareValue));

                        case 'greater_than':
                          if (values.length > 0) {
                            return values.some((val: any) => optionValue > val);
                          }
                          return optionValue > compareValue;

                        case 'less_than':
                          if (values.length > 0) {
                            return values.some((val: any) => optionValue < val);
                          }
                          return optionValue < compareValue;

                        case 'range':
                          // RANGE: optionValue debe estar entre values[0] (inicio) y values[1] (fin)
                          // O si no hay values, entre compareValue[0] y compareValue[1]
                          // Formato: EXACTAMENTE 2 valores [inicio, fin]
                          if (values.length === 2) {
                            const inicio = values[0];
                            const fin = values[1];

                            // Detectar tipo de dato y comparar
                            if (typeof optionValue === 'string' &&
                              /^\d{4}-\d{2}-\d{2}/.test(optionValue)) {
                              // Fechas ISO
                              const dateOption = new Date(optionValue);
                              const dateInicio = new Date(inicio);
                              const dateFin = new Date(fin);
                              return dateOption >= dateInicio && dateOption <= dateFin;
                            } else if (typeof optionValue === 'number') {
                              // Números
                              return optionValue >= inicio && optionValue <= fin;
                            } else {
                              // String o cualquier otro tipo
                              return optionValue >= inicio && optionValue <= fin;
                            }
                          } else if (Array.isArray(compareValue) && compareValue.length === 2) {
                            // Si compareValue es un array [inicio, fin] - EXACTAMENTE 2
                            const inicio = compareValue[0];
                            const fin = compareValue[1];

                            if (typeof optionValue === 'string' &&
                              /^\d{4}-\d{2}-\d{2}/.test(optionValue)) {
                              const dateOption = new Date(optionValue);
                              const dateInicio = new Date(inicio);
                              const dateFin = new Date(fin);
                              return dateOption >= dateInicio && dateOption <= dateFin;
                            } else if (typeof optionValue === 'number') {
                              return optionValue >= inicio && optionValue <= fin;
                            } else {
                              return optionValue >= inicio && optionValue <= fin;
                            }
                          } else {
                            const received = values.length > 0 ? values.length : (Array.isArray(compareValue) ? compareValue.length : 0);
                            console.error(`❌ ERROR: Operador 'range' requiere EXACTAMENTE 2 valores [inicio, fin]. Recibidos: ${received}`, values.length > 0 ? values : compareValue);
                            return false;
                          }

                        default:
                          return false;
                      }
                    });

                    // Aplicar lógica AND/OR
                    if (logic === 'AND') {
                      return conditionResults.every((result: boolean) => result);
                    } else {
                      return conditionResults.some((result: boolean) => result);
                    }
                  });

                  // Aplicar result_position
                  if (resultPosition === 'first' && filteredOptions.length > 0) {
                    filteredOptions = [filteredOptions[0]];
                  } else if (resultPosition === 'last' && filteredOptions.length > 0) {
                    filteredOptions = [filteredOptions[filteredOptions.length - 1]];
                  }

                  // Asignar opciones filtradas
                  this.dropdownOptionsSignal.set({
                    ...this.dropdownOptionsSignal(),
                    [key]: filteredOptions
                  });
                } else {
                  //console.log('⚠️ Campo ' + key + ' sin filtro activo o inactivo');
                  // Si no hay filtro activo, limpiar opciones
                  this.dropdownOptionsSignal.set({
                    ...this.dropdownOptionsSignal(),
                    [key]: []
                  });
                }

              } else if (fieldType === 'dynamic') {
                // DYNAMIC: Cargar datos del servidor
                const dataType = fieldConfig?.data_type;
                const filterConfig = fieldConfig?.filter;
              }
            }
          }
        }
      });
    }
  }

  /**
   * Emite un evento cuando se selecciona un elemento en el autocomplete
   * Aplica las mismas validaciones que on ChangeDropdown
   * @param event evento del autocomplete
   * @param config configuración del campo
   */
  async onSelectAutoComplete(event: any, config: any) {
    const field = config.field;
    const currentValue = this.formGroupSignal()?.get(field)?.value;
    const formValues = this.formGroupSignal()?.value;

    // Crear el objeto con la información completa
    const changeInfo = {
      event,
      field,
      object: config,
      formValues,
      currentValue,
      changedField: field,
      changedValue: currentValue
    };

    this.onSelectAutoCompleteAction.emit(changeInfo);

    // Aplicar las mismas validaciones que on ChangeDropdown
    const children = config.children || {};
    const fields = children?.fields || {};

    if (fields && Object.keys(fields).length > 0) {
      // Obtener opciones del autocomplete padre actual
      const dropdownOptions = /*await*/ this.dataDropdownExists(config);
      let currentDropdownOption: any = null;
      if (dropdownOptions) {
        currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
      }

      // Procesar cada tipo de campo: static, dynamic, derived (misma lógica que on ChangeDropdown)
      ['static', 'dynamic', 'derived'].forEach(fieldType => {
        if (fields[fieldType]) {
          for (const key in fields[fieldType]) {
            if (fields[fieldType].hasOwnProperty(key)) {
              const fieldConfig = fields[fieldType][key];

              // 1. EVALUAR CONDICIONES DE ACTIVACIÓN
              const activateConfig = fieldConfig?.activate;
              let isActive = true;

              if (activateConfig?.active) {
                const conditions = activateConfig.conditions || [];
                const logic = activateConfig.logic || 'AND';
                const action = activateConfig.action || 'inactive';

                const conditionResults = conditions.map((condition: any) => {
                  if (!condition.field) {
                    console.error('❌ ERROR: condition.field es obligatorio', { condition, fieldConfig: key });
                    return false;
                  }

                  const conditionField = condition.field;
                  const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                  let conditionValue;
                  if (isParentField) {
                    conditionValue = currentDropdownOption;
                  } else {
                    const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                    if (formValue && typeof formValue === 'string') {
                      const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                      conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                    } else {
                      conditionValue = formValue;
                    }
                  }

                  const filterGroup = condition.filter_group || 'id';
                  const operator = condition.operator || 'equals';
                  const values = condition.values || [];

                  if (!conditionValue) return false;

                  const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                  let result = false;
                  switch (operator) {
                    case 'equals':
                      result = values.some((val: any) => val === compareValue);
                      break;
                    case 'not_equals':
                      result = !values.some((val: any) => val === compareValue);
                      break;
                    case 'in':
                      result = values.some((val: any) => String(compareValue).includes(String(val)));
                      break;
                    case 'not_in':
                      result = !values.some((val: any) => String(compareValue).includes(String(val)));
                      break;
                    case 'greater_than':
                      result = values.some((val: any) => compareValue > val);
                      break;
                    case 'less_than':
                      result = values.some((val: any) => compareValue < val);
                      break;
                    case 'range':
                      if (values.length === 2) {
                        const inicio = values[0];
                        const fin = values[1];
                        if (typeof compareValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(compareValue)) {
                          const dateCompare = new Date(compareValue);
                          const dateInicio = new Date(inicio);
                          const dateFin = new Date(fin);
                          result = dateCompare >= dateInicio && dateCompare <= dateFin;
                        } else if (typeof compareValue === 'number') {
                          result = compareValue >= inicio && compareValue <= fin;
                        } else {
                          result = compareValue >= inicio && compareValue <= fin;
                        }
                      }
                      break;
                  }

                  return result;
                });

                if (logic === 'AND') {
                  isActive = conditionResults.every((result: boolean) => result);
                } else {
                  isActive = conditionResults.some((result: boolean) => result);
                }

                if (action === 'inactive') {
                  isActive = !isActive;
                }
              }

              // Habilitar/deshabilitar campo
              const formControl = this.formGroupSignal()?.get(key);
              if (formControl) {
                if (isActive) {
                  formControl.enable();
                } else {
                  formControl.disable();
                  formControl.setValue(null);
                }
              }

              // Sincronizar campo relacionado
              if (key.startsWith('object_')) {
                const relatedField = key.replace('object_', '');
                const relatedControl = this.formGroupSignal()?.get(relatedField);
                if (relatedControl) {
                  if (isActive) {
                    relatedControl.enable();
                  } else {
                    relatedControl.disable();
                    relatedControl.setValue(null);
                  }
                }
              }

              // 2. EVALUAR CONDICIONES DE REQUIRED/NOT_REQUIRED
              const requestedConfig = fieldConfig?.requested;

              if (requestedConfig?.active) {
                const conditions = requestedConfig.conditions || [];
                const logic = requestedConfig.logic || 'AND';
                const action = requestedConfig.action;

                if (action) {
                  const conditionResults = conditions.map((condition: any) => {
                    if (!condition.field) return false;

                    const conditionField = condition.field;
                    const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                    let conditionValue;
                    if (isParentField) {
                      conditionValue = currentDropdownOption;
                    } else {
                      const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                      if (formValue && typeof formValue === 'string') {
                        const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                        conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                      } else {
                        conditionValue = formValue;
                      }
                    }

                    const filterGroup = condition.filter_group || 'id';
                    const operator = condition.operator || 'equals';
                    const values = condition.values || [];

                    if (!conditionValue) return false;

                    const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                    let result = false;
                    switch (operator) {
                      case 'equals':
                        result = values.some((val: any) => val === compareValue);
                        break;
                      case 'not_equals':
                        result = !values.some((val: any) => val === compareValue);
                        break;
                      case 'in':
                        result = values.some((val: any) => String(compareValue).includes(String(val)));
                        break;
                      case 'not_in':
                        result = !values.some((val: any) => String(compareValue).includes(String(val)));
                        break;
                      case 'greater_than':
                        result = values.some((val: any) => compareValue > val);
                        break;
                      case 'less_than':
                        result = values.some((val: any) => compareValue < val);
                        break;
                      case 'range':
                        if (values.length === 2) {
                          const inicio = values[0];
                          const fin = values[1];
                          if (typeof compareValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(compareValue)) {
                            const dateCompare = new Date(compareValue);
                            const dateInicio = new Date(inicio);
                            const dateFin = new Date(fin);
                            result = dateCompare >= dateInicio && dateCompare <= dateFin;
                          } else if (typeof compareValue === 'number') {
                            result = compareValue >= inicio && compareValue <= fin;
                          } else {
                            result = compareValue >= inicio && compareValue <= fin;
                          }
                        }
                        break;
                    }

                    return result;
                  });

                  let conditionsMet = false;
                  if (logic === 'AND') {
                    conditionsMet = conditionResults.every((result: boolean) => result);
                  } else {
                    conditionsMet = conditionResults.some((result: boolean) => result);
                  }

                  let isRequired = false;
                  if (action === 'required') {
                    isRequired = conditionsMet;
                  } else if (action === 'not_required') {
                    isRequired = !conditionsMet;
                  }

                  if (formControl) {
                    if (isRequired) {
                      formControl.setValidators([Validators.required]);
                    } else {
                      formControl.clearValidators();
                    }
                    formControl.updateValueAndValidity();
                  }

                  if (key.startsWith('object_')) {
                    const relatedField = key.replace('object_', '');
                    const relatedControl = this.formGroupSignal()?.get(relatedField);
                    if (relatedControl) {
                      if (isRequired) {
                        relatedControl.setValidators([Validators.required]);
                      } else {
                        relatedControl.clearValidators();
                      }
                      relatedControl.updateValueAndValidity();
                    }
                  }
                }
              }

              // 3. PROCESAR SEGÚN TIPO DE CAMPO
              if (fieldType === 'derived') {
                const fieldName = fieldConfig?.field_name;
                if (fieldName && currentDropdownOption && isActive) {
                  if (currentDropdownOption[fieldName]) {
                    this.formGroupSignal()?.get(key)?.setValue(currentDropdownOption[fieldName]);
                  }
                }
              } else if (fieldType === 'static') {
                const options = fieldConfig?.options || [];
                const filterConfig = fieldConfig?.filter;

                if (filterConfig?.active && isActive) {
                  const conditions = filterConfig.conditions || [];
                  const logic = filterConfig.logic || 'AND';
                  const resultPosition = filterConfig.result_position || 'all';

                  let filteredOptions = options.filter((option: any) => {
                    if (conditions.length === 0) return true;

                    const conditionResults = conditions.map((condition: any) => {
                      if (!condition.field) return false;

                      const conditionField = condition.field;
                      const isParentField = conditionField === field || conditionField === field.replace('object_', '');

                      let conditionValue;
                      if (isParentField) {
                        conditionValue = currentDropdownOption;
                      } else {
                        const formValue = this.formGroupSignal()?.get(conditionField)?.value;
                        if (formValue && typeof formValue === 'string') {
                          const fieldOptions = this.dropdownOptionsSignal()[conditionField];
                          conditionValue = fieldOptions?.find((opt: any) => opt.id === formValue) || formValue;
                        } else {
                          conditionValue = formValue;
                        }
                      }

                      const filterGroup = condition.filter_group || 'id';
                      const operator = condition.operator || 'equals';
                      const values = condition.values || [];

                      if (!conditionValue) return false;

                      const optionValue = filterGroup ? option[filterGroup] : option.id;
                      const compareValue = filterGroup ? conditionValue[filterGroup] : conditionValue;

                      switch (operator) {
                        case 'equals':
                          return values.length > 0 ? values.some((val: any) => val === optionValue) : optionValue === compareValue;
                        case 'not_equals':
                          return values.length > 0 ? !values.some((val: any) => val === optionValue) : optionValue !== compareValue;
                        case 'in':
                          return values.length > 0 ? values.some((val: any) => String(optionValue).includes(String(val))) : String(optionValue).includes(String(compareValue));
                        case 'not_in':
                          return values.length > 0 ? !values.some((val: any) => String(optionValue).includes(String(val))) : !String(optionValue).includes(String(compareValue));
                        case 'greater_than':
                          return values.length > 0 ? values.some((val: any) => optionValue > val) : optionValue > compareValue;
                        case 'less_than':
                          return values.length > 0 ? values.some((val: any) => optionValue < val) : optionValue < compareValue;
                        case 'range':
                          if (values.length === 2) {
                            const inicio = values[0];
                            const fin = values[1];
                            if (typeof optionValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(optionValue)) {
                              const dateOption = new Date(optionValue);
                              const dateInicio = new Date(inicio);
                              const dateFin = new Date(fin);
                              return dateOption >= dateInicio && dateOption <= dateFin;
                            } else if (typeof optionValue === 'number') {
                              return optionValue >= inicio && optionValue <= fin;
                            } else {
                              return optionValue >= inicio && optionValue <= fin;
                            }
                          } else if (Array.isArray(compareValue) && compareValue.length === 2) {
                            const inicio = compareValue[0];
                            const fin = compareValue[1];
                            if (typeof optionValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(optionValue)) {
                              const dateOption = new Date(optionValue);
                              const dateInicio = new Date(inicio);
                              const dateFin = new Date(fin);
                              return dateOption >= dateInicio && dateOption <= dateFin;
                            } else if (typeof optionValue === 'number') {
                              return optionValue >= inicio && optionValue <= fin;
                            } else {
                              return optionValue >= inicio && optionValue <= fin;
                            }
                          }
                          return false;
                        default:
                          return false;
                      }
                    });

                    if (logic === 'AND') {
                      return conditionResults.every((result: boolean) => result);
                    } else {
                      return conditionResults.some((result: boolean) => result);
                    }
                  });

                  if (resultPosition === 'first' && filteredOptions.length > 0) {
                    filteredOptions = [filteredOptions[0]];
                  } else if (resultPosition === 'last' && filteredOptions.length > 0) {
                    filteredOptions = [filteredOptions[filteredOptions.length - 1]];
                  }

                  this.dropdownOptionsSignal.set({
                    ...this.dropdownOptionsSignal(),
                    [key]: filteredOptions
                  });
                } else {
                  this.dropdownOptionsSignal.set({
                    ...this.dropdownOptionsSignal(),
                    [key]: []
                  });
                }
              } else if (fieldType === 'dynamic') {
                const dataType = fieldConfig?.data_type;
                const filterConfig = fieldConfig?.filter;

                if (dataType && isActive) {
                  /*console.log('🔄 Dynamic field to load from server:', {
                    field: key,
                    dataType,
                    filterConfig,
                    currentValue: currentDropdownOption
                  });*/
                }
              }
            }
          }
        }
      });
    }
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
  /*onKeydownTabText(event: any, field: any) {
    this.onKeydownTabTextAction.emit({ event, field });onSelectAutoComplete
  }

  onKeydownEnterText(event: any, field: any) {
    this.onKeydownEnterTextAction.emit({ event, field });
  }

  onKeydownTabNumber(event: any, field: any) {
    this.onKeydownTabNumberAction.emit({ event, field });
  }

  onKeydownEnterNumber(event: any, field: any) {
    this.onKeydownEnterNumberAction.emit({ event, field });
  }*/


  onKeydownTab(event: any, config: any) {
    this.onKeydownTabAction.emit({ event, field: config.field, config });
  }

  onKeydownEnter(event: any, config: any) {
    this.onKeydownEnterAction.emit({ event, field: config.field, config });
  }

  /**
   * Maneja el click en botones personalizados del formulario con lógica CRUD
   * Emite un evento con la acción y datos configurados en el botón
   * Resetea campos del formulario si se especifica fields_reset_form
   * @param buttonConfig Configuración del botón que incluye action, send_additional_data, sent_data, fields_reset_form
   */
  onButtonClick(buttonConfig: any) {
    const formValues = this.formGroupSignal()?.value;
    const action = buttonConfig.action || '';

    // Crear el objeto con la información completa
    const buttonInfo = {
      action: action,
      label: buttonConfig.label || '',
      config: buttonConfig,
      formValues: formValues,
      send_additional_data: buttonConfig.send_additional_data || {},
      sent_data: buttonConfig.sent_data || ''
    };

    //console.log('🔘 Botón clickeado:', buttonInfo);
    this.onButtonClickAction.emit(buttonInfo);
  }

  /**
   * Escanea códigos de barras/QR usando la cámara del dispositivo
   * Soporta múltiples formatos: QR, EAN, UPC, Code128, Data Matrix, etc.
   * @param fieldConfig Configuración del campo que contiene info del scanner
   */
  async onScanCode(fieldConfig: any) {
    try {
      //console.log('📷 Iniciando scanner de códigos...', fieldConfig);

      // Configurar formato de código a escanear
      // Si no se especifica formato, usa ALL (todos los formatos)
      const hint: CapacitorBarcodeScannerTypeHint = fieldConfig.scanner?.hint || 17; // 17 = ALL

      //console.log('📋 Formato configurado:', hint);

      // Iniciar el scanner con opciones
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: hint,
        scanInstructions: fieldConfig.scanner?.instructions || 'Apunta la cámara al código',
        scanButton: false
      });

      if (result.ScanResult) {
        //console.log('✅ Código escaneado:', result.ScanResult);
        //console.log('📋 Formato detectado:', result.format);

        // Asignar el valor al campo del formulario
        const formGroup = this.formGroupSignal();
        if (formGroup) {
          const control = formGroup.get(fieldConfig.field);
          if (control) {
            control.setValue(result.ScanResult);
            control.markAsTouched();
            control.markAsDirty();
            //console.log(`✅ Valor "${result.ScanResult}" asignado al campo "${fieldConfig.field}"`);
          }
        }

        // Emitir evento con el resultado
        this.onScanCodeAction.emit({
          success: true,
          content: result.ScanResult,
          format: result.format,
          field: fieldConfig.field,
          fieldConfig: fieldConfig
        });

      } else {
        //console.log('❌ Scanner cancelado o sin contenido');
        this.onScanCodeAction.emit({
          success: false,
          error: 'Scanner cancelado',
          field: fieldConfig.field
        });
      }

    } catch (error) {
      console.error('❌ Error al escanear código:', error);

      // Emitir evento de error
      this.onScanCodeAction.emit({
        success: false,
        error: error,
        field: fieldConfig.field
      });
    }
  }

  /**
   * Detiene el scanner de códigos si está activo
   */
  stopScanner() {
    try {
      document.body.classList.remove('scanner-active');
      //console.log('🛑 Scanner limpiado');
    } catch (error) {
      //console.error('Error al limpiar scanner:', error);
    }
  }



  public closeFieldset = signal<boolean>(false);
  close() {
    this.closeFieldset.set(true);
  }


  //iamgenes videos
  public files64Signal = signal<any[]>([]);
  public files: any = [];
  public mediaStream!: MediaStream;

  public images: string[] = [];
  public previewCameraDialogVisible = false;
  /**
       * Muestra el tiempo del video en segundo
       */
  public timeVideo = signal<number>(6);
  /**
   * Signal para trackear el step actual del stepper
   */
  public currentStepSignal = signal<number | null>(null);

  /**
   * Computed signal que filtra los archivos multimedia (no firmas)
   * Opcionalmente por step si currentStepSignal tiene valor
   */
  public nonSignatureFilesSignal = computed(() => {
    const allFiles = this.files64Signal();
    const currentStep = this.currentStepSignal();

    // Filtrar archivos que no son firmas
    const nonSignatureFiles = allFiles.filter((f: any) => f.type !== 'signature');

    // Si hay un step activo, filtrar solo los archivos de ese step
    if (currentStep !== null) {
      return nonSignatureFiles.filter((f: any) => f.step === currentStep);
    }

    // Si no hay step activo, mostrar todos (comportamiento global)
    return nonSignatureFiles;
  });

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

  private appendFile(payload: {
    type: 'image' | 'video';
    file_name: string;
    file: string;
    field?: string;
    fieldConfig?: any;
  }) {
    const currentStep = this.currentStepSignal();

    // Determinar el nombre del archivo basado en name_file_user o usar 'evidencia'
    let fileName = payload.file_name;
    if (payload.fieldConfig?.name_file_user) {
      const extension = payload.file_name.split('.').pop();
      fileName = `${payload.fieldConfig.name_file_user}.${extension}`;
    }

    const fileObject = {
      type: payload.type,
      file_name: fileName,
      file: payload.file,
      step: currentStep,
      field: payload.field, // Agregar el campo que capturó la imagen
      key: payload.fieldConfig?.key // Agregar la key si existe
    };

    const newFiles = [
      ...this.files64Signal(),
      fileObject
    ];

    this.files64Signal.set(newFiles);
    this.files64Action.emit(newFiles);

    // Establecer el valor en el FormControl si hay un campo especificado
    if (payload.field || payload.fieldConfig?.key) {
      const formGroup = this.formGroupSignal();
      const currentKey = payload.fieldConfig?.key;

      // Establecer valor en el campo "field"
      if (payload.field) {
        // PERF: por `field` se suman todas las imágenes aunque provengan de distintas keys
        const fieldFiles = newFiles.filter(f => f.field === payload.field);

        // Si es un solo archivo, establecer el objeto; si son múltiples, establecer el array
        const valueToSet = fieldFiles.length === 1 ? fieldFiles[0] : (fieldFiles.length > 1 ? fieldFiles : null);

        const control = formGroup?.get(payload.field);
        if (control) {
          control.setValue(valueToSet);
          control.markAsDirty();
        }
      }

      // Establecer valor en el campo "key" (si existe y es diferente de field)
      if (currentKey && currentKey !== payload.field) {
        const fieldFiles = newFiles.filter(f => f.key === currentKey);
        const valueToSet = fieldFiles.length === 1 ? fieldFiles[0] : (fieldFiles.length > 1 ? fieldFiles : null);

        const keyControl = formGroup?.get(currentKey);
        if (keyControl) {
          keyControl.setValue(valueToSet);
          keyControl.markAsDirty();
        }
      }
    }
  }

  // Campo activo que está capturando multimedia
  public activeFieldCapture: string | null = null;
  public activeFieldConfig: any = null;

  async previewCamera(fieldName?: string | null, fieldConfig?: any) {
    // Guardar el campo que está capturando
    this.activeFieldCapture = fieldName || null;
    this.activeFieldConfig = fieldConfig || null;

    if (this.isCapacitorNative()) {
      // En móvil, "preview" = abrir cámara nativa y tomar foto
      return this.captureMedia('image');
    }

    // WEB: solo abrir preview (stream)
    try {
      // (Opcional) detener stream anterior si existe
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
      }

      if (this.videoDevices.length === 0) {
        this.videoDevices = await this.getMediaDevices();
        if (this.videoDevices.length === 0) {
          this.messageS.changeMessage('No se encontraron cámaras disponibles');
          return;
        }

        let backCamera = this.videoDevices.find(d => (d.label || '').toLowerCase().includes('back'))
          || this.videoDevices.find(d => (d.label || '').toLowerCase().includes('rear'))
          || this.videoDevices[0];

        this.currentCameraIndex = this.videoDevices.indexOf(backCamera);
      } else {
        // si usas previewCamera también para cambiar cámara
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.videoDevices.length;
      }

      const deviceId = this.videoDevices[this.currentCameraIndex].deviceId;

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false
        });
      } catch {
        // fallback si exact falla
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      this.video.nativeElement.srcObject = this.mediaStream;
      await this.video.nativeElement.play();
      this.previewCameraDialogVisible = true;
    } catch (error: any) {
      if (error?.name === 'OverconstrainedError') {
        this.messageS.changeMessage('No se pudo satisfacer las restricciones de video:', error);
      } else if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        this.messageS.changeMessage('Permiso denegado para acceder a la cámara:', error);
      } else {
        this.messageS.changeMessage('Error al acceder a la cámara:', error);
      }
    }
  }

  async captureMedia(type: 'image' | 'video' = 'image') {
    if (this.isCapacitorNative()) {
      if (type === 'image') {
        try {
          // PERF: en móviles reducimos 30% la calidad para optimizar tamaño
          const mobileQuality = Math.round(90 * 0.7);
          const photo = await Camera.getPhoto({
            quality: mobileQuality,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });

          this.appendFile({
            type: 'image',
            file_name: 'evidencia.jpg',
            file: photo.dataUrl!,
            field: this.activeFieldCapture || undefined,
            fieldConfig: this.activeFieldConfig
          });

          this.previewCameraDialogVisible = false;
        } catch (error) {
          this.messageS.changeMessage('Error al capturar imagen.');
        }
      } else {
        this.messageS.changeMessage('Grabación de video no soportada.');
      }
      return;
    }

    // WEB
    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    if (type === 'image') {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imagenCapturada = canvas.toDataURL('image/jpeg');

      this.appendFile({
        type: 'image',
        file_name: 'evidencia.jpg',
        file: imagenCapturada,
        field: this.activeFieldCapture || undefined,
        fieldConfig: this.activeFieldConfig
      });

      this.previewCameraDialogVisible = false;

      // (Opcional) cerrar stream al capturar
      if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());

      return;
    }

    // WEB video
    const mediaRecorder = new MediaRecorder(this.mediaStream);
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();

      reader.onloadend = () => {
        const videoBase64 = reader.result as string;

        this.appendFile({
          type: 'video',
          file_name: 'evidencia.webm',
          file: videoBase64,
          field: this.activeFieldCapture || undefined,
          fieldConfig: this.activeFieldConfig
        });
      };

      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();

    const interval = setInterval(() => {
      this.timeVideo.update((t: number) => t - 1);

      if (this.timeVideo() <= 0) {
        clearInterval(interval);
        this.timeVideo.set(0);

        mediaRecorder.stop();
        this.previewCameraDialogVisible = false;

        this.timeVideo.set(6);

        // (Opcional) cerrar stream al terminar
        if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
      }
    }, 1000);
  }


  /*removeMedia(i: number) {
      this.files64.splice(i, 1);
  }*/

  onHidePreviousCamera() {
    //cuando se cierra la camara reinicia el indice para que siempre inicie con la 1
    this.currentCameraIndex = -1;
    //this.files64Signal.set([]);
    //this.files = [];
    if (this.mediaStream) {
      const tracks = this.mediaStream.getTracks();
      tracks.forEach(track => track.stop());
    }
  }

  removeImage(i: number, type = '64') {
    if (type == '64') {
      const currentStep = this.currentStepSignal();
      const allFiles = this.files64Signal();
      const fileToRemove = this.nonSignatureFilesSignal()[i];

      // Verificar que el archivo pertenece al step actual
      if (currentStep !== null && fileToRemove.step !== currentStep) {
        //console.warn(`⚠️ No se puede eliminar archivo de otro step. Step actual: ${currentStep}, Step del archivo: ${fileToRemove.step}`);
        return;
      }

      // Buscar el índice real en el array completo
      const realIndex = allFiles.findIndex(f =>
        f.file === fileToRemove.file &&
        f.file_name === fileToRemove.file_name &&
        f.step === fileToRemove.step
      );

      if (realIndex === -1) {
        //console.warn('⚠️ No se encontró el archivo para eliminar');
        return;
      }

      // Crear nueva referencia del array sin el elemento eliminado
      const newFiles = allFiles.filter((_, index) => index !== realIndex);
      this.files64Signal.set(newFiles);
      this.files64Action.emit(newFiles);
      //console.log(`🗑️ Archivo eliminado del step ${fileToRemove.step}`);

      // Actualizar el valor del FormControl si el archivo tenía campo asociado
      if (fileToRemove.field || fileToRemove.key) {
        const formGroup = this.formGroupSignal();

        // Actualizar el FormControl del campo "field"
        if (fileToRemove.field) {
          // PERF: por `field` se suman todas las imágenes aunque provengan de distintas keys
          const remainingFieldFiles = newFiles.filter(f => f.field === fileToRemove.field);

          // Si no quedan archivos, establecer null; si queda uno, establecer el objeto; si son múltiples, establecer el array
          let valueToSet = null;
          if (remainingFieldFiles.length === 1) {
            valueToSet = remainingFieldFiles[0];
          } else if (remainingFieldFiles.length > 1) {
            valueToSet = remainingFieldFiles;
          }

          const control = formGroup?.get(fileToRemove.field);
          if (control) {
            control.setValue(valueToSet);
            control.markAsDirty();
          }
        }

        // Actualizar el FormControl del campo "key" (si existe y es diferente de field)
        if (fileToRemove.key && fileToRemove.key !== fileToRemove.field) {
          const remainingKeyFiles = newFiles.filter(f => f.key === fileToRemove.key);

          let valueToSet = null;
          if (remainingKeyFiles.length === 1) {
            valueToSet = remainingKeyFiles[0];
          } else if (remainingKeyFiles.length > 1) {
            valueToSet = remainingKeyFiles;
          }

          const keyControl = formGroup?.get(fileToRemove.key);
          if (keyControl) {
            keyControl.setValue(valueToSet);
            keyControl.markAsDirty();
          }
        }
      }
    } else if (type == 'bin') {
      this.filesAction.emit(this.files);
      this.files.splice(i, 1);
    }
  }

  removeFocus(event: any) {
    event.preventDefault();
    event.target.blur();  // fuerza pérdida de foco
  }

  /**
   * Actualiza el step actual para filtrar multimedia
   * @param stepNumber número del step (usar null para mostrar todos)
   */
  setCurrentStep(stepNumber: number | null): void {
    //console.log('📍 Cambiando a step:', stepNumber);
    this.currentStepSignal.set(stepNumber);
  }

  /**
   * Maneja el evento de cambio de step del p-stepper
   * @param event evento emitido por el stepper
   */
  onStepChange(event: any): void {
    const stepNumber = event?.value ?? event;
    //console.log('📍 Evento de cambio de step:', event, 'Valor extraído:', stepNumber);
    this.setCurrentStep(stepNumber);
  }

  /**
   * Activa un callback y actualiza el step actual
   * Se usa en los botones de navegación del stepper
   */
  activateStepAndCallback(callback: Function, stepNumber: number): void {
    this.setCurrentStep(stepNumber);
    callback(stepNumber);
  }

  /**
   * Verifica si se puede avanzar al siguiente step
   * Si linear es true, valida los campos del step actual antes de permitir avanzar
   */
  canNavigateToStep(targetStep: number): boolean {
    const drawForm = this.drawFormSignal();
    if (!drawForm?.stepper) return true;

    const isLinear = drawForm.stepper.linear === true;
    if (!isLinear) return true; // Si no es linear, permitir navegar libremente

    const currentStep = this.currentStepSignal();
    if (currentStep === null) return true;

    // Si vamos hacia atrás, siempre permitir
    if (targetStep <= currentStep) return true;

    // Si vamos hacia adelante, validar todos los steps intermedios
    for (let step = currentStep; step < targetStep; step++) {
      if (!this.validateStepFields(step)) {
        //console.warn(`⚠️ No se puede avanzar al step ${targetStep}. El step ${step} tiene campos inválidos.`);
        return false;
      }
    }

    return true;
  }

  /**
   * Intenta navegar a un step específico
   * Valida si es posible navegar según la configuración linear
   */
  navigateToStep(stepNumber: number, callback?: Function): void {
    if (this.canNavigateToStep(stepNumber)) {
      this.setCurrentStep(stepNumber);
      if (callback) {
        callback(stepNumber);
      }
    } else {
      // Mantener en el step actual si la validación falla
      //console.log(`🚫 Navegación bloqueada al step ${stepNumber}`);
    }
  }

  /**
   * Limpia archivos multimedia de un step específico o todos si step es null
   * @param step número del step o null para limpiar todos
   */
  clearMediaFiles(step: number | null = null): void {
    const currentFiles = this.files64Signal();
    let filteredFiles: any[];

    if (step === null) {
      // Limpiar todos los archivos excepto firmas
      filteredFiles = currentFiles.filter((f: any) => f.type === 'signature');
      //console.log('🧹 Limpiando toda la multimedia');
    } else {
      // Limpiar solo los archivos del step específico
      filteredFiles = currentFiles.filter((f: any) => f.step !== step || f.type === 'signature');
      //console.log(`🧹 Limpiando multimedia del step ${step}`);
    }

    this.files64Signal.set(filteredFiles);
    this.files64Action.emit(filteredFiles);
  }

  /**
   * Limpia TODOS los archivos multimedia (incluidas firmas) cuando se resetea el formulario
   */
  clearAllMediaFiles(): void {
    //console.log('🧹 Limpiando TODOS los archivos multimedia por reset del formulario');
    this.files64Signal.set([]);
    this.files64Action.emit([]);
  }

  /**
   * Inicializa los datos de una tabla con filas vacías
   */
  initializeTableData(tableConfig: any): any[] {
    const data: any[] = [];
    const initialRows = tableConfig?.initial_rows || 0;
    //console.log('Inicializando tabla con filas::::::::::', initialRows);
    for (let i = 0; i < initialRows; i++) {
      const row: any = {};
      tableConfig.columns.forEach((col: any) => {
        row[col.field] = '';
      });
      data.push(row);
    }

    return data;
  }

  getFormControl(field: string): FormControl | null {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return null;
    return formGroup.get(field) as FormControl;
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

  getTagSeverity(column: any): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | null | undefined {
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
   * Ahora usa el computed signal para mejor rendimiento
   * @deprecated Usar directamente nonSignatureFilesSignal() en el template
   */
  getNonSignatureFiles(): any[] {
    return this.nonSignatureFilesSignal();
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
    //console.log('🗑️ Eliminando firma del historial:', { field, historyIndex });
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray) return;

    // El historyIndex es relativo al historial (0, 1, 2...), 
    // pero en el FormArray está en los índices (0, 1, 2... length-2)
    // El último FormGroup (length-1) es la firma activa, NO se puede eliminar

    if (historyIndex >= 0 && historyIndex < formArray.length - 1) {
      formArray.removeAt(historyIndex);
      formArray.markAsDirty();
      this.triggerSignatureUpdate(); // 🔄 Forzar recálculo
      //console.log(`✅ Firma eliminada del índice ${historyIndex}. Total firmas: ${formArray.length}`);
    } else {
      //console.warn(`⚠️ Índice ${historyIndex} inválido. No se puede eliminar la firma activa.`);
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
    //console.log('➕ [v3.1.0] Agregando nueva firma:', { field });

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
    //console.log('🚀 [v3.1.0] Nueva Firma - validando campos obligatorios con FormArray');

    // 1. OBTENER EL FORMARRAY
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray || !formArray.controls) {
      //console.warn('⚠️ FormArray no encontrado para', field);
      return;
    }

    const lastIndex = formArray.length - 1;
    const lastFormGroup = formArray.at(lastIndex);

    if (!lastFormGroup) {
      //console.warn('⚠️ No existe FormGroup en el último índice');
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
          //console.log(`❌ Campo inválido: ${fieldConfig.field}`, control.errors);
        }
      }
    });

    // Verificar si hay errores en los campos configurados
    if (hasErrors) {
      //console.warn('❌ Formulario inválido - hay campos obligatorios faltantes');

      // Marcar el FormGroup y FormArray completos como touched para activar validación visual
      lastFormGroup.markAsTouched();
      formArray.markAsTouched();

      // Forzar actualización visual
      lastFormGroup.updateValueAndValidity({ emitEvent: true });
      formArray.updateValueAndValidity({ emitEvent: true });

      return; // Detener ejecución si hay errores de validación
    }

    //console.log('✅ Validación exitosa - agregando nueva firma al FormArray');

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

    //console.log(`📊 Nueva firma agregada en índice ${newIndex}. Total firmas: ${formArray.length}`);

    // 5. LIMPIAR CANVAS DEL NUEVO ÍNDICE EN TODOS LOS CONTEXTOS
    setTimeout(() => {
      this.clearSignature(`signature-canvas-main-${field}`, field, newIndex);
      this.clearSignature(`signature-canvas-card-${field}`, field, newIndex);
      this.clearSignature(`signature-canvas-fieldset-${field}`, field, newIndex);
      //console.log(`✅ Nueva firma lista para captura en índice ${newIndex}`);
    }, 100);
  }

  /**
   * Cancela la firma actual (elimina el último FormGroup del FormArray)
   * Solo funciona si hay al menos 2 firmas (para mantener al menos una)
   */
  cancelCurrentSignature(field: string): void {
    //console.log(`🚫 Cancelando firma actual para campo: ${field}`);
    // 1. OBTENER FORMARRAY
    const formArray = this.formGroupSignal()?.get(field) as FormArray;
    if (!formArray) {
      //console.error(`❌ No se encontró el FormArray para ${field}`);
      return;
    }

    // 2. VERIFICAR QUE HAYA AL MENOS 2 FIRMAS
    if (formArray.length < 2) {
      //console.warn(`⚠️ No se puede cancelar. Se requiere al menos 2 firmas. Actual: ${formArray.length}`);
      return;
    }

    // 3. ELIMINAR EL ÚLTIMO FORMGROUP (firma actual)
    const removedIndex = formArray.length - 1;
    formArray.removeAt(removedIndex);

    // 🔄 Forzar recálculo del computed signal
    this.triggerSignatureUpdate();

    //console.log(`✅ Firma en índice ${removedIndex} eliminada. Total firmas: ${formArray.length}`);

    // 4. OBTENER LA FIRMA DEL NUEVO ÚLTIMO ÍNDICE (la firma anterior)
    const newLastIndex = formArray.length - 1;
    const previousFormGroup = formArray.at(newLastIndex) as FormGroup;
    const previousSignature = previousFormGroup?.get('signature')?.value;

    // 5. CARGAR LA FIRMA ANTERIOR EN LOS CANVAS DE TODOS LOS CONTEXTOS
    setTimeout(() => {
      this.loadSignatureToCanvas(`signature-canvas-main-${field}`, previousSignature);
      this.loadSignatureToCanvas(`signature-canvas-card-${field}`, previousSignature);
      this.loadSignatureToCanvas(`signature-canvas-fieldset-${field}`, previousSignature);
      //console.log(`✅ Canvas reinicializado con firma anterior en índice ${newLastIndex}`);
    }, 100);
  }

  /**
   * Carga una firma guardada (base 64) en un canvas específico
   */
  private loadSignatureToCanvas(canvasId: string, signatureBase64: string | null): void {
    if (!signatureBase64) {
      //console.log(`⚠️ No hay firma guardada para cargar en ${canvasId}`);
      return;
    }

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      //console.warn(`⚠️ Canvas ${canvasId} no encontrado`);
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
      //console.log(`✅ Firma cargada en ${canvasId}`);
    };
    img.onerror = () => {
      //console.error(`❌ Error al cargar firma en ${canvasId}`);
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

    //console.log('🔍 Marcando todos los campos de firma como touched...');

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
        //console.log(`✅ FormArray ${key} marcado como touched`);
      }
    });
    //console.log('✅ Todos los campos de firma marcados como touched');
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
    //console.log('🧹 Limpiando todos los canvas de firma después del reset');

    // Obtener todos los canvas de firma del documento
    const allCanvases = document.querySelectorAll('canvas[id*="signature-canvas"]');

    allCanvases.forEach((canvas: any) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //console.log(`✅ Canvas limpiado: ${canvas.id}`);
      }
    });

    //console.log(`🧹 Total de canvas limpiados: ${allCanvases.length}`);
  }

  /**
   * Guarda la firma del canvas como base 64
   */
  saveSignature(canvasId: string, field: string, index: number): void {
    //console.log('🔍 [v3.1.0] saveSignature ejecutándose:', { canvasId, field, index });
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      const isEmpty = this.isCanvasEmpty(canvas);
      //console.log('🔍 [v3.1.0] Canvas vacío?:', isEmpty);
      if (isEmpty) {
        //console.warn('⚠️ [v3.1.0] La firma está vacía - no se guardará');
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



      // Añadir a files64Signal para compatibilidad
      const currentStep = this.currentStepSignal();
      // Crear nueva referencia del array para que el signal reaccione
      const newFiles = [
        ...this.files64Signal(),
        {
          type: 'signature',
          file_name: `firma_${field}_${index}_${Date.now()}.png`,
          file: signatureBase64,
          field: field,
          index: index,
          step: currentStep
        }
      ];
      this.files64Signal.set(newFiles);
      this.files64Action.emit(newFiles);
    }
  }

  /**
   * Autoguardado automático al terminar de dibujar
   */
  autoSaveSignature(canvasId: string, field: string, index: number): void {
    //console.log('🚀 [v3.1.0] Autoguardado iniciado:', { canvasId, field, index });
    // Pequeño delay para asegurar que el trazo se complete
    setTimeout(() => {
      this.saveSignature(canvasId, field, index);
      //console.log('✅ [v3.1.0] Autoguardado completado');
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
    //console.log('📝 [DEBUG] updateSignatureField:', { field, index, fieldName, value });

    const formControl = this.formGroupSignal()?.get(field);
    const currentData = [...(formControl?.value || [])];

    //console.log('📊 [DEBUG] currentData antes:', currentData);

    // Si el array está vacío, inicializar con un objeto vacío en el índice 0
    if (currentData.length === 0 && index === 0) {
      currentData.push({});
    }

    if (currentData[index]) {
      currentData[index][fieldName] = value;
      formControl?.setValue(currentData);
      formControl?.markAsDirty();

      //console.log('📊 [DEBUG] currentData después:', currentData);

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
              //('✅ Control de firma marcado como touched al iniciar dibujo');
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
    //('📷 [DEBUG] onCapturePhoto:', { field, fieldName });
    // TODO: Implementar lógica para capturar foto desde cámara
    // Por ahora solo mostramos un mensaje en consola
    //console.log('⚠️ Funcionalidad de captura de foto pendiente de implementación');
  }

  onUploadPhoto(field: string, fieldName: string): void {
    // Manejar la carga de foto desde archivo
  }

  onUploadSignature(field: string, fieldName: string): void {
    // Manejar la carga de firma desde archivo
  }

  /**
   * Construye el string de separadores para la propiedad [separator] de PrimeNG AutoComplete
   * @param separatorConfig Configuración de separadores del campo
   * @returns String con separadores concatenados (ej: ",;" o ", " o ";")
   */
  /**
   * Valida un correo electrónico según las reglas configuradas
   * @param email Correo a validar
   * @param config Configuración de validación del campo
   * @returns true si es válido, false si no
   */
  private validateEmail(email: string, config: any): boolean {
    if (!email || typeof email !== 'string') return false;

    // Validación básica de formato email (RFC 5322 simplificado)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
      console.warn('❌ Email inválido (formato):', email);
      return false;
    }

    // Validar longitud máxima
    const maxLength = config?.validation?.max_length_per_email || 254;
    if (email.length > maxLength) {
      console.warn('❌ Email excede longitud máxima:', email);
      return false;
    }

    // Validar dominio whitelist
    if (config?.validation?.domain_whitelist?.length > 0) {
      const domain = email.split('@')[1];
      if (!config.validation.domain_whitelist.includes(domain)) {
        console.warn('❌ Email no está en whitelist de dominios:', email);
        return false;
      }
    }

    // Validar dominio blacklist
    if (config?.validation?.domain_blacklist?.length > 0) {
      const domain = email.split('@')[1];
      if (config.validation.domain_blacklist.includes(domain)) {
        console.warn('❌ Email está en blacklist de dominios:', email);
        return false;
      }
    }

    return true;
  }

  /**
   * Valida y procesa los emails cuando cambia el valor del FormControl
   * Se ejecuta automáticamente con los separadores configurados
   */
  validateEmailsField(fieldConfig: any): void {
    const control = this.formGroupSignal()?.get(fieldConfig.field);
    if (!control) return;

    const currentEmails: string[] = control.value || [];
    const validEmails: string[] = [];

    for (const email of currentEmails) {
      // Validar formato de email
      if (!this.validateEmailFormat(email, fieldConfig)) {
        console.warn('❌ Email inválido:', email);
        continue;
      }

      // Validar duplicados
      if (fieldConfig.validation?.allow_duplicates === false) {
        if (validEmails.includes(email)) {
          console.warn('❌ Email duplicado no permitido:', email);
          continue;
        }
      }

      // Validar longitud máxima por email
      const maxLength = fieldConfig.validation?.max_length_per_email || 254;
      if (email.length > maxLength) {
        console.warn('❌ Email excede longitud máxima:', email);
        continue;
      }

      // Validar dominio whitelist
      if (fieldConfig.validation?.domain_whitelist?.length > 0) {
        const domain = email.split('@')[1];
        if (!fieldConfig.validation.domain_whitelist.includes(domain)) {
          console.warn('❌ Dominio no permitido:', domain);
          continue;
        }
      }

      // Validar dominio blacklist
      if (fieldConfig.validation?.domain_blacklist?.length > 0) {
        const domain = email.split('@')[1];
        if (fieldConfig.validation.domain_blacklist.includes(domain)) {
          console.warn('❌ Dominio bloqueado:', domain);
          continue;
        }
      }

      validEmails.push(email);
    }

    // Validar máximo de emails
    const maxEmails = fieldConfig.validation?.max_emails || 100;
    if (validEmails.length > maxEmails) {
      console.warn('❌ Se excedió el máximo de correos permitidos:', maxEmails);
      validEmails.splice(maxEmails);
    }

    // Actualizar el control solo si cambió
    if (JSON.stringify(currentEmails) !== JSON.stringify(validEmails)) {
      control.setValue(validEmails, { emitEvent: false });
    }
  }

  /**
   * Valida formato de email según RFC 5322
   */
  validateEmailFormat(email: string, fieldConfig: any): boolean {
    if (!email || typeof email !== 'string') return false;

    // RFC 5322 regex simplificado
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email);
  }

  /**
   * Obtiene sugerencias de emails para el autocompletado
   */
  getEmailSuggestions(query: string, fieldConfig: any): string[] {
    const suggestions = fieldConfig.suggestions;

    if (!suggestions?.enabled) return [];

    const minChars = suggestions.min_chars || 3;
    if (query.length < minChars) return [];

    let results: string[] = [];

    switch (suggestions.data_source) {
      case 'local':
        results = (suggestions.local_list || [])
          .filter((email: string) => email.toLowerCase().includes(query.toLowerCase()));
        break;

      case 'api':
        // Aquí se haría la llamada a la API
        // Por ahora devolvemos vacío
        break;

      case 'users':
        // Aquí se obtendrían emails de usuarios del sistema
        // Por ahora devolvemos vacío
        break;

      default:
        return [];
    }

    const maxSuggestions = suggestions.max_suggestions || 10;
    return results.slice(0, maxSuggestions);
  }

  /**
   * Método para manejar el evento completeMethod del autocomplete
   * Se ejecuta cuando el usuario escribe en el campo
   */
  completeEmailMethod(event: any, fieldConfig: any): void {
    const query = event.query || '';
    const suggestionsList = this.getEmailSuggestions(query, fieldConfig);
    this.suggestions.set(suggestionsList);
  }

  /**
   * Configura la validación automática para un campo de emails-chips
   * Se debe llamar cuando el componente autocomplete se inicializa
   */
  setupEmailValidation(fieldConfig: any): void {
    const control = this.formGroupSignal()?.get(fieldConfig.field);
    if (!control) return;

    // Suscribirse a los cambios del FormControl
    control.valueChanges.subscribe((value: string[]) => {
      // Validar inmediatamente cuando se agrega un nuevo email
      this.validateEmailsField(fieldConfig);
    });
  }


}



/**
 * falta configurar el campos de selfie he indicar que allow_image_upload del dispositivo es dieferente a allow_image_upload del json principal
 * 
 * 
 * 
 */