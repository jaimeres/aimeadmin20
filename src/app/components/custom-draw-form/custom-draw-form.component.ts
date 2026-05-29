import { CommonModule, KeyValue } from '@angular/common';
import { DROPDOWN_TYPES_PRELOAD } from '../../utils/dropdown-types.const';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators, FormBuilder } from '@angular/forms';
import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, inject, Input, Output, signal, computed, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';
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
import { Capacitor } from '@capacitor/core';
import { FormCacheConfig, FormCacheService } from '@/utils/services/form-cache.service';
import { Pipe, PipeTransform } from '@angular/core';

// Plugin nativo SafeCamera — decodifica con inSampleSize para evitar OOM
const SafeCamera: any = Capacitor.registerPlugin('SafeCamera');

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

  // --- TEMPORAL: eliminar metadatos EXIF/GPS de imágenes ---
  private _stripImageMetadata(dataUrl: string, quality = 0.85): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl); // fallback: devolver sin modificar
      img.src = dataUrl;
    });
  }
  // --- FIN TEMPORAL ---

  /** Construye el query string de filtro desde data_type.filter. */
  private _buildDropdownFilter(filterConfig: { [key: string]: any } | undefined): string {
    return this.crudS.buildDropdownFilterString(filterConfig ?? {});
  }

  /** Genera la clave namespaced por tipo para sharedS.data y sharedS.drawDropdown. */
  private _sharedKey(field: string): string {
    const prefix = this.typeSignal() || (this as any).type || '';
    return prefix ? `${prefix}:${field}` : field;
  }

  /**
   * Busca en `bag` cualquier clave cuyo sufijo sea `:${field}`. Sirve de fallback
   * para cuando `generateJSONform` escribió con prefijo namespaced (`<pos>:<field>`)
   * pero el componente padre no propagó `[type]` al `<app-custom-draw-form>`,
   * dejando `typeSignal()` vacío y por tanto `_sharedKey` sin prefijo.
   */
  private _lookupBySuffix(bag: Record<string, any>, field: string): any {
    if (!bag || typeof bag !== 'object') return null;
    const suffix = `:${field}`;
    for (const key of Object.keys(bag)) {
      if (key.endsWith(suffix) && bag[key]) return bag[key];
    }
    return null;
  }

  /**
   * Verifica si ya existen opciones en caché para un dropdown.
   * Además valida que el campo calculado de `option_label` exista.
   */
  /*async*/ dataDropdownExists(element: any, force = false)/*: Promise<any[] | false>*/ {
    const optionLabelField = this.getOptionLabelField(element);
    // si tiene opciones no se consulta al servidor    
    //aqui voy estoy revisando porque option no se inicializa con los dartos del choice y como se parseMarkerlos dropdawn en sabe al modulo
    //no lleva force ya que no consulta al servidor //inicia cambio data_type
    const _dt = element?.data_type ?? {};
    if (_dt?.options && Array.isArray(_dt.options) && _dt.options.length > 0) {
      if (optionLabelField) {
        this.applyOptionLabelToOptions(_dt.options, element, optionLabelField);
      }
      return _dt.options;
    }

    // Opciones del campo con prefijo (ej. form_fields_data_*): el servidor ya no las
    // envía vía HTTP OPTIONS sino que vienen en el array `options` del propio config
    // del drawForm (equivalente a data_type.options pero en el nivel raíz del elemento).
    if (element?.options && Array.isArray(element.options) && element.options.length > 0) {
      if (optionLabelField) {
        this.applyOptionLabelToOptions(element.options, element, optionLabelField);
      }
      return element.options;
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar
    // Se busca en `sharedS.data` con la clave namespaced (<pos>:<field>); si el padre
    // no propaga `[type]` se cae al lookup sin prefijo y, como último recurso, se
    // escanea cualquier clave que termine en `:<field>` para soportar el caso en
    // que `generateJSONform` escribió con un prefijo distinto al typeSignal local.
    const _dataKey = this._sharedKey(element.field);
    const _data = this.sharedS.data[_dataKey]
      ?? this.sharedS.data[element.field]
      ?? this._lookupBySuffix(this.sharedS.data, element.field);
    if (_data && !force) {
      if (optionLabelField && !this.hasOptionLabelField(_data, optionLabelField)) {
        return false;
      }
      return _data;
    }

    //si ya existe datos para ese dropdown no se vuelve a consultar, va depsues de la validación de generalS.data,
    // porque seguramente trae los datos mas actualizados, por ejemplo cuando se agregan  o eliminan elementos
    const _ddKey = this._sharedKey(element.field);
    const _dd = this.sharedS.drawDropdown[_ddKey]
      ?? this.sharedS.drawDropdown[element.field]
      ?? this._lookupBySuffix(this.sharedS.drawDropdown, element.field);
    if (_dd && !force) {
      if (optionLabelField && !this.hasOptionLabelField(_dd, optionLabelField)) {
        return false;
      }
      return _dd;
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
        [element.field]: this._toTreeNodesIfNeeded(element, dropdownOptions)
      });
      return;
    }
    // Reload: invalidar cache de lazy-load del tree-select para volver a
    // consultar los hijos en la próxima expansión.
    if (force && this._treeLoadedKeys?.[element.field]) {
      this._treeLoadedKeys[element.field].clear();
    }
    //si no existe datos para ese dropdown se consulta al servidor,
    // en lugar de poner la app y el type en cada campo de json que genera el draw se pone una referencia
    // a un objeto que tiene la app y el type para evitar que esta info se guarde en el servidor y se pueda inyectar en el componente
    const _dt2 = element?.data_type ?? {};
    const app = this.crudS.getAppType(_dt2?.type)?.app;
    const type = this.crudS.getAppType(_dt2?.type)?.type;
    if (app && type) {
      const filter = this._buildDropdownFilter(_dt2?.filter);
      const sort = _dt2?.ordering || '';
      const limit = _dt2?.limit || 0;

      this.messageS.showBlocked(true);
      this.crudS.getObject({ app, type, filter, sort, limit }).subscribe(async (data: any) => {
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
          [element.field]: this._toTreeNodesIfNeeded(element, dataDropdown)
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
    const _dt = element?.data_type ?? {};
    const app = this.crudS.getAppType(_dt?.type)?.app || 'app';
    const type = this.crudS.getAppType(_dt?.type)?.type || 'type';
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

  // [[[II ESC:003-03 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-03
  private normalizeOptionsForField(options: any[], fieldConfig: any): any[] {
    if (!Array.isArray(options) || options.length === 0) return options || [];

    const optionValue = fieldConfig?.option_value;
    const labelFields = this.parseOptionLabel(fieldConfig?.option_label);
    const aliases: Record<string, string[]> = {
      'value': ['id'],
      'id': ['value'],
      'display_name': ['name', 'label'],
      'name': ['display_name', 'label'],
      'label': ['display_name', 'name'],
    };

    const normalized = options.map((option: any) => {
      if (!option || typeof option !== 'object') return option;

      const next = { ...option };

      if (optionValue && next[optionValue] === undefined) {
        const aliasKey = (aliases[optionValue] || []).find((alias) => next[alias] !== undefined);
        if (aliasKey !== undefined) {
          next[optionValue] = next[aliasKey];
        }
      }

      for (const labelField of labelFields) {
        if (next[labelField] !== undefined) continue;
        const aliasKey = (aliases[labelField] || []).find((alias) => next[alias] !== undefined);
        if (aliasKey !== undefined) {
          next[labelField] = next[aliasKey];
        }
      }

      return next;
    });

    const labelField = this.getOptionLabelField(fieldConfig);
    if (labelField) {
      this.applyOptionLabelToOptions(normalized, fieldConfig, labelField);
    }

    return normalized;
  }
  // ]]]FI

  // [[[II Fuente única de tipos dropdown en utils/dropdown-types.const.ts ]]]FI
  private readonly DROPDOWN_TYPES = DROPDOWN_TYPES_PRELOAD;

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

  // [[[II ESC:003-03 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-03
  private findFieldConfigByField(field: string): any | null {
    if (!field) return null;

    const drawForm = this.drawFormSignal();
    let found: any = null;

    const scanCollection = (collection: any): void => {
      if (!collection || typeof collection !== 'object' || found) return;

      for (const el of Object.values(collection)) {
        this.walkElement(el, (node: any) => {
          if (!found && node?.field === field) {
            found = node;
          }
        });

        if (found) return;
      }
    };

    scanCollection(drawForm?.grid);

    const steps = drawForm?.stepper?.steps;
    if (!found && steps && typeof steps === 'object') {
      for (const step of Object.values(steps)) {
        scanCollection((step as any)?.fields);
        if (found) break;
      }
    }

    return found;
  }
  // ]]]FI

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
    // REFACTORIZADO: usa walkElement en lugar de iterar manualmente grid > card/fieldset
    if (drawForm?.grid) {
      for (const el of Object.values(drawForm.grid)) {
        this.walkElement(el, (node: any) => {
          if (node?.type === 'table') {
            const control = this.getFormControl(node.field);
            if (control && (!control.value || control.value.length === 0)) {
              const defaultValue = node.default?.value || [];
              const initialData = defaultValue.length > 0 ? defaultValue : this.initializeTableData(node);
              control.setValue(initialData);
            }
          }
        });
      }
    }

    /* ── BLOQUE ORIGINAL COMENTADO (initializeTableFields) ──
    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];
          if (element?.type === 'table') {
            const control = this.getFormControl(element.field);
            if (control && (!control.value || control.value.length === 0)) {
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
    ── FIN BLOQUE ORIGINAL ── */
  }

  /**
   * Inicializa los campos de firma
   */
  initializeSignatureFields(drawForm: any) {
    // REFACTORIZADO: usa walkElement en lugar de iterar manualmente grid > card/fieldset
    if (drawForm?.grid) {
      for (const el of Object.values(drawForm.grid)) {
        this.walkElement(el, (node: any) => {
          if (node?.type === 'signature') {
            this.initSignatureData(node.field, node);
          }
        });
      }
    }

    /* ── BLOQUE ORIGINAL COMENTADO (initializeSignatureFields) ──
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
    ── FIN BLOQUE ORIGINAL ── */
  }

  /**
   * Inicializa los campos de tipo emails-chips
   * Calcula y cachea los separators en un signal
   */
  initializeEmailChipsFields(drawForm: any) {
    // REFACTORIZADO: usa walkElement en lugar de iterar manualmente grid > card/fieldset
    const separators: { [key: string]: string | RegExp } = {};

    if (drawForm?.grid) {
      for (const el of Object.values(drawForm.grid)) {
        this.walkElement(el, (node: any) => {
          if (node?.type === 'emails-chips') {
            separators[node.field] = this.calculateSeparator(node.separator);
          }
        });
      }
    }

    this.emailSeparatorsSignal.set(separators);

    /* ── BLOQUE ORIGINAL COMENTADO (initializeEmailChipsFields) ──
    const separatorsOld: { [key: string]: string | RegExp } = {};
    if (drawForm.hasOwnProperty('grid')) {
      for (const key in drawForm.grid) {
        if (drawForm.grid.hasOwnProperty(key)) {
          const element = drawForm.grid[key];
          if (element?.type === 'emails-chips') {
            separatorsOld[element.field] = this.calculateSeparator(element.separator);
          } else if (element?.card || element?.fieldset) {
            const nestedElements = element.card || element.fieldset;
            for (const key2 in nestedElements) {
              if (nestedElements.hasOwnProperty(key2)) {
                const element2 = nestedElements[key2];
                if (element2?.type === 'emails-chips') {
                  separatorsOld[element2.field] = this.calculateSeparator(element2.separator);
                }
              }
            }
          }
        }
      }
    }
    this.emailSeparatorsSignal.set(separatorsOld);
    ── FIN BLOQUE ORIGINAL ── */
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

      // Cuando el formulario se construye por primera vez (transición null → FormGroup),
      // addFieldsByPrefix ya muté los nombres de campo a 'object_...' y data_type.options
      // sigue intacto en el elemento. Re-ejecutar dropdownOptions para que el signal
      // se popule con las claves object_ correctas (dropdown, dropdown-choice, multi-select, etc.).
      if (!previousValue && currentValue) {
        const _dform = this.drawFormSignal();
        if (_dform) {
          this.dropdownOptions(_dform);
        }
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

      // Recuperar captura de cámara pendiente si Android mató la Activity
      this._checkPendingSafeCapture();

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
   * Guarda el formulario en caché de forma inmediata (sin debounce).
   * Se usa después de capturar multimedia para que si Android mata la Activity,
   * la foto ya esté persistida y se restaure automáticamente al volver.
   */
  private _saveFormCacheNow(): void {
    const formGroup = this.formGroupSignal();
    if (!formGroup || !this.currentCacheKey || !this.currentCacheConfig) return;
    const value = formGroup.value;
    const fields = this.isCreateSignal()
      ? this.currentCacheConfig.creationFields
      : this.currentCacheConfig.editionFields;
    const filtered: any = {};
    for (const f of fields) {
      if (f in value) filtered[f] = value[f];
    }
    this.formCacheS.save(this.currentCacheKey, filtered, this.currentCacheConfig);
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
      const fieldType = (fieldConfig as any).type;
      const fieldHide = (fieldConfig as any).hide;

      if (!fieldName && !keyName) continue;
      // Los campos ocultos no los puede llenar el usuario → no bloquear navegación
      if (fieldHide) continue;

      // [[[II Diferenciador 2: para type='files'/'document' sin key explícito o con
      //   sibling *_documents, reconciliar validators antes de validar.
      //   - *_documents con valor (cámara) → limpiar required de *_files.
      //   - *_files con valor (servidor) → limpiar required de *_documents
      //     Y del keyCtrl per-step (si existe).
      //   Refleja lo que hacen appendFile() y _pushServerFileToForm().
      //   NOTA: los controles se inicializan con [] (array vacío) que es truthy
      //   en JS; se usa hasValue() para detectar contenido real. ]]]FI
      if ((fieldType === 'files' || fieldType === 'file' || fieldType === 'document') && fieldName) {
        const docsCandidate = fieldName.replace(/files$/, 'documents');
        if (docsCandidate !== fieldName) {
          const docsCtrl = formGroup.get(docsCandidate);
          const filesCtrl = formGroup.get(fieldName);
          const hasValue = (v: any) => v != null && (Array.isArray(v) ? v.length > 0 : !!v);
          if (hasValue(docsCtrl?.value) && filesCtrl) {
            // Captura cámara satisfecha → liberar required de *_files
            filesCtrl.clearValidators();
            filesCtrl.updateValueAndValidity({ emitEvent: false });
          } else if (hasValue(filesCtrl?.value) && docsCtrl) {
            // Subida servidor satisfecha → liberar required de *_documents
            docsCtrl.clearValidators();
            docsCtrl.updateValueAndValidity({ emitEvent: false });
            // Liberar también el keyCtrl per-step si existe
            if (keyName && keyName !== fieldName) {
              const keyCtrlAux = formGroup.get(keyName);
              if (keyCtrlAux) {
                keyCtrlAux.clearValidators();
                keyCtrlAux.updateValueAndValidity({ emitEvent: false });
              }
            }
          }
          // Validar explícitamente el sibling *_documents: es quien porta el
          // required cuando upload.active=true (filesCtrl no lo tiene).
          if (docsCtrl) {
            docsCtrl.markAsTouched();
            docsCtrl.markAsDirty();
            docsCtrl.updateValueAndValidity();
            if (docsCtrl.invalid) { allValid = false; }
          }
        }
      }

      // Validar field
      if (fieldName) {
        const control = formGroup.get(fieldName);
        if (control) {
          control.markAsTouched();
          control.markAsDirty();
          control.updateValueAndValidity();
          if (control.invalid) {
            allValid = false;
          }
        }
      }

      // Validar key (si existe y es diferente de field)
      if (keyName && keyName !== fieldName) {
        const keyControl = formGroup.get(keyName);
        if (keyControl) {
          keyControl.markAsTouched();
          keyControl.markAsDirty();
          keyControl.updateValueAndValidity();
          if (keyControl.invalid) {
            allValid = false;
          }
        }
      }
    }
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
    const _dt = entry?.data_type ?? {};
    const app = this.crudS.getAppType(_dt?.type)?.app;
    const type = this.crudS.getAppType(_dt?.type)?.type;

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

  // ─── MOTOR DE EVALUACIÓN DE CONDICIONES (extraído de onChangeDropdown / onSelectAutoComplete) ───
  // Antes esta lógica estaba duplicada ~1000 líneas entre ambos métodos.
  // Para restaurar la versión anterior: buscar los bloques comentados con
  // «REFACTORIZADO: lógica movida a _processChildrenFields» dentro de
  // onChangeDropdown y onSelectAutoComplete.

  /**
   * Evalúa un operador de comparación con soporte de: equals, not_equals,
   * in, not_in, greater_than, less_than, range.
   */
  private _evaluateOperator(operator: string, compareValue: any, values: any[], optionValue?: any): boolean {
    const target = optionValue !== undefined ? optionValue : compareValue;
    switch (operator) {
      case 'equals':
        return values.length > 0
          ? values.some((v: any) => v === target)
          : target === compareValue;
      case 'not_equals':
        return values.length > 0
          ? !values.some((v: any) => v === target)
          : target !== compareValue;
      case 'in':
        return values.length > 0
          ? values.some((v: any) => String(target).includes(String(v)))
          : String(target).includes(String(compareValue));
      case 'not_in':
        return values.length > 0
          ? !values.some((v: any) => String(target).includes(String(v)))
          : !String(target).includes(String(compareValue));
      case 'greater_than':
        return values.length > 0
          ? values.some((v: any) => target > v)
          : target > compareValue;
      case 'less_than':
        return values.length > 0
          ? values.some((v: any) => target < v)
          : target < compareValue;
      case 'range':
        return this._evaluateRange(target, values, compareValue);
      default:
        return false;
    }
  }

  /** Evalúa operador range para fechas, números y strings. */
  private _evaluateRange(target: any, values: any[], compareValue?: any): boolean {
    let inicio: any, fin: any;
    if (values.length === 2) {
      inicio = values[0]; fin = values[1];
    } else if (Array.isArray(compareValue) && compareValue.length === 2) {
      inicio = compareValue[0]; fin = compareValue[1];
    } else {
      return false;
    }
    if (typeof target === 'string' && /^\d{4}-\d{2}-\d{2}/.test(target)) {
      const d = new Date(target);
      return d >= new Date(inicio) && d <= new Date(fin);
    }
    return target >= inicio && target <= fin;
  }

  /**
   * Resuelve el valor real de un campo para evaluación de condiciones.
   * Si es el campo padre devuelve el objeto completo del dropdown seleccionado,
   * si no, busca en el formulario y opcionalmente enriquece con las opciones.
   */
  private _resolveConditionValue(
    conditionField: string,
    parentField: string,
    parentOption: any
  ): any {
    const isParent = conditionField === parentField
      || conditionField === parentField.replace('object_', '');
    if (isParent) return parentOption;

    const formValue = this.formGroupSignal()?.get(conditionField)?.value;
    if (formValue && typeof formValue === 'string') {
      const opts = this.dropdownOptionsSignal()[conditionField];
      return opts?.find((o: any) => o.id === formValue) || formValue;
    }
    return formValue;
  }

  /**
   * Evalúa un array de condiciones con lógica AND/OR.
   * Devuelve true si las condiciones se cumplen.
   */
  private _evaluateConditions(
    conditions: any[],
    logic: string,
    parentField: string,
    parentOption: any
  ): boolean {
    const results = conditions.map((cond: any) => {
      if (!cond.field) return false;
      const condValue = this._resolveConditionValue(cond.field, parentField, parentOption);
      if (!condValue) return false;
      const filterGroup = cond.filter_group || 'id';
      const compareValue = filterGroup ? condValue[filterGroup] : condValue;
      return this._evaluateOperator(cond.operator || 'equals', compareValue, cond.values || []);
    });
    return logic === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  /**
   * Procesa los children.fields de un dropdown/autocomplete padre.
   * Evalúa activate, requested y filtra opciones hijas por condiciones.
   * Esta lógica estaba duplicada en onChangeDropdown y onSelectAutoComplete.
   *
   * ──────────────────────────────────────────────────────────────────────────
   * Documentación de `activate` (también aplica a `requested` y `filter`)
   * ──────────────────────────────────────────────────────────────────────────
   * `activate` controla SI un campo (o un hijo declarado en children.fields)
   * está activo, deshabilitado, oculto o sólo lectura, en función del estado
   * de otros campos del formulario o del nodo padre seleccionado.
   *
   *   activate: {
   *     active: boolean,            // si false, no se evalúa nada
   *     conditions: Condition[],    // reglas que cruzan campos/valores
   *     logic: 'AND' | 'OR',        // cómo se combinan las conditions
   *     action: 'inactive'|'active' // qué hacer cuando se cumplen las cond.
   *                                 //   'inactive' (default): si se cumple
   *                                 //   la regla, el campo se DESACTIVA.
   *                                 //   'active': si se cumple, se ACTIVA.
   *     default_state: 'active'|'inactive'|'hidden'|'readonly'
   *                                 // estado inicial antes de tener datos
   *                                 // o cuando la regla aún no es evaluable.
   *                                 // Para children dinámicos como
   *                                 // responsible_persons → person, usar
   *                                 // 'inactive' evita cargar nada hasta
   *                                 // que exista un padre válido.
   *   }
   *
   * `activate.conditions[*]` es una regla con esta forma:
   *
   *   {
   *     source: 'form' | 'parent' | 'node' | 'selected',
   *                              // de dónde se lee el valor a comparar.
   *                              //   form     → otro campo del formulario.
   *                              //   parent   → el objeto padre seleccionado
   *                              //              (tree-select / dropdown).
   *                              //   node     → el TreeNode actual (lazy).
   *                              //   selected → la opción seleccionada del
   *                              //              field de origen.
   *     field: string,           // nombre del campo origen.
   *     value_key: string,       // propiedad a leer dentro de ese valor
   *                              // (p.ej. 'id' para comparar IDs).
   *     filter_group: string,    // alternativa a value_key cuando se cruzan
   *                              // grupos de filtro entre padre/hijo.
   *     operator: 'equals' | 'not_equals' | 'in' | 'not_in'
   *             | 'isnull' | 'not_null' | 'icontains' | 'iexact',
   *     value: any,              // valor único a comparar.
   *     values: any[]            // o lista (para in/not_in).
   *   }
   *
   * Diferencia entre `action` y `default_state`:
   *   - `default_state` es el estado inicial: cómo arranca el campo cuando
   *     todavía no se han cumplido (o no se pueden evaluar) las condiciones.
   *   - `action` describe qué hacer al cumplirse las condiciones. La lógica
   *     existente trata `action: 'inactive'` como "desactivar cuando se
   *     cumplen", invirtiendo el estado en caso contrario.
   *
   * Ejemplo `responsible_persons.children.fields.dynamic.person`:
   *   activate: {
   *     active: true,
   *     default_state: 'inactive', // sin padre válido, no carga.
   *     logic: 'AND',
   *     conditions: [{ source: 'parent', field: 'responsible',
   *                    value_key: 'id', operator: 'not_equals', value: '' }]
   *   }
   * ──────────────────────────────────────────────────────────────────────────
   */
  private _processChildrenFields(
    field: string,
    currentValue: any,
    config: any,
    currentDropdownOption: any,
    depth: number = 0
  ): void {
    const children = config.children || {};
    const fields = children?.fields || {};
    if (!fields || Object.keys(fields).length === 0) return;

    ['static', 'dynamic', 'derived'].forEach(fieldType => {
      if (!fields[fieldType]) return;
      for (const key in fields[fieldType]) {
        if (!fields[fieldType].hasOwnProperty(key)) continue;
        const fieldConfig = fields[fieldType][key];
        // [[[II ESC:003-02 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-02
        const isDropdownLikeChild = this.isDropdown(fieldConfig);
        const objectField = key.startsWith('object_') ? key : `object_${key}`;
        const candidateFields = [
          isDropdownLikeChild ? objectField : null,
          fieldConfig?.field,
          key,
        ].filter((candidate, index, arr): candidate is string =>
          typeof candidate === 'string' && candidate.length > 0 && arr.indexOf(candidate) === index
        );
        const targetField = candidateFields.find(candidate => !!this.formGroupSignal()?.get(candidate))
          ?? candidateFields[0]
          ?? key;
        const formControl = this.formGroupSignal()?.get(targetField);
        const mirroredField = targetField.startsWith('object_')
          ? targetField.replace(/^object_/, '')
          : null;
        const targetFieldConfig = this.findFieldConfigByField(targetField) ?? fieldConfig;
        // ]]]FI

        // ── 1. ACTIVACIÓN ──
        let isActive = true;
        const act = fieldConfig?.activate;
        if (act?.active) {
          const met = this._evaluateConditions(
            act.conditions || [], act.logic || 'AND', field, currentDropdownOption
          );
          isActive = (act.action || 'inactive') === 'inactive' ? !met : met;
        }
        if (formControl) {
          if (isActive) { formControl.enable(); }
          else { formControl.disable(); formControl.setValue(null); }
        }
        if (mirroredField) {
          const rel = this.formGroupSignal()?.get(mirroredField);
          if (rel) {
            if (isActive) { rel.enable(); } else { rel.disable(); rel.setValue(null); }
          }
        }

        // ── 2. REQUIRED/NOT_REQUIRED ──
        const req = fieldConfig?.requested;
        if (req?.active && req.action) {
          const met = this._evaluateConditions(
            req.conditions || [], req.logic || 'AND', field, currentDropdownOption
          );
          const isRequired = req.action === 'required' ? met : !met;
          if (formControl) {
            formControl.setValidators(isRequired ? [Validators.required] : []);
            formControl.updateValueAndValidity();
          }
          if (mirroredField) {
            const rel = this.formGroupSignal()?.get(mirroredField);
            if (rel) {
              rel.setValidators(isRequired ? [Validators.required] : []);
              rel.updateValueAndValidity();
            }
          }
        }

        // ── 3. PROCESAR SEGÚN TIPO ──
        // [[[II ESC:003-04 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-04
        // Contrato unificado: los 3 modos comparten el mismo pipeline.
        //   - La fuente (servidor/local) se decide por la presencia de data_type.type.
        //   - El filtrado (filter.conditions), result_position y auto_select son
        //     idénticos en static y dynamic.
        //   - 'derived' copia un atributo del padre (from: 'parent') o del servidor
        //     (from: 'server'); también respeta activate/requested.
        // El valor del padre para los filtros se extrae con filter_group (default 'id').
        const childFilterGroup = fieldConfig?.filter_group || 'id';
        const parentValue = (currentDropdownOption && typeof currentDropdownOption === 'object')
          ? (currentDropdownOption[childFilterGroup] ?? (childFilterGroup === 'id' ? currentValue : null))
          : currentValue;

        if (fieldType === 'derived') {
          this._processDerivedChild({
            fieldConfig, targetField, targetFieldConfig, formControl,
            parentField: field, parentOption: currentDropdownOption, parentValue,
            childFilterGroup, isActive, depth,
          });
        } else {
          // static + dynamic comparten el mismo motor de carga unificado.
          this._loadChildOptions({
            fieldConfig, targetField, targetFieldConfig, formControl,
            parentField: field, parentOption: currentDropdownOption, parentValue,
            childFilterGroup, isActive, depth,
          });
        }
        // ]]]FI
      }
    });
  }

  // [[[II ESC:003-04 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-04
  // ─── PIPELINE UNIFICADO DE children.fields (static / dynamic / derived) ───

  /** Profundidad máxima de la cascada recursiva disparada por auto_select. */
  private readonly _MAX_CASCADE_DEPTH = 6;

  /** Traduce un operador del contrato a operador de filtro del servidor (o null si no es mapeable). */
  private _mapOperatorToServerOp(operator: string): string | null {
    switch (operator) {
      case 'equals': return 'exact';
      case 'in': return 'in';
      case 'range': return 'range';
      case 'isnull': return 'isnull';
      case 'icontains': return 'icontains';
      default: return null; // not_equals, not_in, greater_than, less_than → se resuelven en cliente
    }
  }

  /**
   * Construye el filtro de servidor para un child, combinando:
   *   1. data_type.filter — entradas `forced` reciben parentValue; `active` se respetan.
   *   2. filter.conditions con scope 'server' (o 'auto' cuando la fuente es servidor).
   */
  private _buildChildServerFilter(ctx: {
    fieldConfig: any; parentField: string; parentOption: any; parentValue: any; childFilterGroup: string;
  }): string {
    const { fieldConfig, parentField, parentOption, parentValue, childFilterGroup } = ctx;
    const dt = fieldConfig?.data_type ?? {};
    const childFilter = fieldConfig?.filter;
    const filterCfg: Record<string, any> = {};

    if (dt?.filter && typeof dt.filter === 'object') {
      for (const [fk, fv] of Object.entries(dt.filter) as [string, any][]) {
        if (fk === 'logic') continue;
        if (fv?.forced) {
          if (parentValue != null && parentValue !== '') {
            filterCfg[fk] = { ...fv, active: true, default_value: parentValue };
          }
        } else if (fv?.active) {
          filterCfg[fk] = fv;
        }
      }
    }

    const conds: any[] = Array.isArray(childFilter?.conditions) ? childFilter.conditions : [];
    for (const cond of conds) {
      if (!cond?.field) continue;
      const scope = cond.scope || 'auto';
      if (scope === 'client') continue;
      const serverOp = this._mapOperatorToServerOp(cond.operator || 'equals');
      if (!serverOp) continue; // operador no mapeable → se aplica en cliente
      const cv = this._resolveConditionValue(cond.field, parentField, parentOption);
      if (cv == null) continue;
      const vk = cond.value_key || cond.filter_group || childFilterGroup;
      const resolved = (vk && typeof cv === 'object') ? cv[vk] : cv;
      const value = (Array.isArray(cond.values) && cond.values.length) ? cond.values : resolved;
      if (value == null || value === '') continue;
      filterCfg[cond.field] = { active: true, default: serverOp, default_value: value };
    }

    return this.crudS.buildDropdownFilterString(filterCfg);
  }

  /**
   * Aplica en cliente las conditions de filter que no se resolvieron en el servidor,
   * más el filtro implícito por filter_group declarado (solo para fuente local).
   */
  private _applyClientFilter(ctx: {
    options: any[]; fieldConfig: any; parentField: string; parentOption: any;
    childFilterGroup: string; isServer: boolean;
  }): any[] {
    const { options, fieldConfig, parentField, parentOption, childFilterGroup, isServer } = ctx;
    if (!Array.isArray(options)) return [];
    const childFilter = fieldConfig?.filter;
    const declaredFg = fieldConfig?.filter_group; // sin default → para filtro implícito

    const allConds: any[] = (childFilter?.active && Array.isArray(childFilter.conditions))
      ? childFilter.conditions : [];
    const clientConds = allConds.filter((cond: any) => {
      if (!cond?.field) return false;
      const scope = cond.scope || 'auto';
      const serverOp = this._mapOperatorToServerOp(cond.operator || 'equals');
      if (scope === 'client') return true;
      if (scope === 'server') return !isServer || !serverOp;
      return !isServer ? true : !serverOp; // auto
    });

    if (clientConds.length) {
      return options.filter((option: any) => {
        const results = clientConds.map((cond: any) => {
          const cv = this._resolveConditionValue(cond.field, parentField, parentOption);
          if (cv == null) return false;
          const fg = cond.filter_group || cond.value_key || childFilterGroup;
          const cmpVal = (fg && typeof cv === 'object') ? cv[fg] : cv;
          const optVal = (fg && option && typeof option === 'object') ? option[fg] : option?.id;
          return this._evaluateOperator(cond.operator || 'equals', cmpVal, cond.values || [], optVal);
        });
        return (childFilter.logic || 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
      });
    }

    if (!isServer && !childFilter?.active && declaredFg && parentOption && typeof parentOption === 'object') {
      const parentVal = parentOption[declaredFg];
      if (parentVal !== undefined) {
        return options.filter((o: any) => o && typeof o === 'object' && o[declaredFg] === parentVal);
      }
    }

    return options;
  }

  /** Recorta el resultado según result_position: 'all' (default) | 'first' | 'last' | índice numérico. */
  private _applyResultPosition(rows: any[], pos: any): any[] {
    if (!Array.isArray(rows) || rows.length === 0) return rows || [];
    if (pos === 'first') return [rows[0]];
    if (pos === 'last') return [rows[rows.length - 1]];
    if (typeof pos === 'number' && Number.isInteger(pos) && pos >= 0 && pos < rows.length) return [rows[pos]];
    return rows; // 'all'
  }

  /**
   * Publica las opciones del child y aplica auto_select (+ cascada recursiva) o default_field.
   * auto_select reemplaza al antiguo `selected`; se conserva `selected` como alias legado.
   */
  private _publishChildOptions(ctx: {
    fieldConfig: any; targetField: string; targetFieldConfig: any; formControl: any; rows: any[]; depth: number;
  }): void {
    const { fieldConfig, targetField, targetFieldConfig, formControl, rows, depth } = ctx;
    const normalized = this.normalizeOptionsForField(rows, targetFieldConfig);
    this._updateDropdownOptions(targetField, this._toTreeNodesIfNeeded(targetFieldConfig, normalized));

    const optionValue = fieldConfig?.option_value || 'id';
    const autoSelect = fieldConfig?.auto_select === true || fieldConfig?.selected === true;

    if (autoSelect && normalized.length) {
      const selectedRow = normalized[0];
      const value = selectedRow?.[optionValue] ?? null;
      formControl?.setValue(value);
      this._syncMirroredField(targetField, selectedRow, targetFieldConfig);
      // Cascada recursiva: el child auto-seleccionado dispara sus propios children.
      if (depth < this._MAX_CASCADE_DEPTH) {
        this._processChildrenFields(targetField, value, targetFieldConfig, selectedRow, depth + 1);
      }
    } else if (!normalized.length) {
      if (fieldConfig?.default_field !== undefined && fieldConfig?.default_field !== null) {
        formControl?.setValue(fieldConfig.default_field);
      } else {
        formControl?.setValue(null);
      }
    }
  }

  /** Sincroniza el campo espejo (sin prefijo object_) con el payload de la opción seleccionada. */
  private _syncMirroredField(targetField: string, selectedRow: any, targetFieldConfig: any): void {
    if (!targetField.startsWith('object_')) return;
    const mirror = targetField.replace(/^object_/, '');
    const ctrl = this.formGroupSignal()?.get(mirror);
    if (!ctrl) return;
    ctrl.setValue(this._mapDropdownOptionToPayload(selectedRow, targetFieldConfig));
  }

  /**
   * Carga las opciones de un child static/dynamic. La fuente es servidor cuando
   * data_type.type resuelve un app/type; en otro caso usa options locales.
   */
  private _loadChildOptions(ctx: {
    fieldConfig: any; targetField: string; targetFieldConfig: any; formControl: any;
    parentField: string; parentOption: any; parentValue: any; childFilterGroup: string;
    isActive: boolean; depth: number;
  }): void {
    const { fieldConfig, targetField, targetFieldConfig, formControl,
            parentField, parentOption, parentValue, childFilterGroup, isActive, depth } = ctx;

    if (!isActive) {
      this._updateDropdownOptions(targetField, []);
      formControl?.setValue(null);
      return;
    }

    const dt = fieldConfig?.data_type ?? {};
    const app = this.crudS.getAppType(dt?.type)?.app;
    const type = this.crudS.getAppType(dt?.type)?.type;
    const isServer = !!(app && type);

    const finish = (rows: any[]) => {
      const filtered = this._applyClientFilter({
        options: rows, fieldConfig, parentField, parentOption, childFilterGroup, isServer,
      });
      const positioned = this._applyResultPosition(
        filtered, fieldConfig?.filter?.result_position ?? fieldConfig?.result_position ?? 'all'
      );
      this._publishChildOptions({
        fieldConfig, targetField, targetFieldConfig, formControl, rows: positioned, depth,
      });
    };

    if (isServer) {
      const filter = this._buildChildServerFilter({
        fieldConfig, parentField, parentOption, parentValue, childFilterGroup,
      });
      const sort = dt?.ordering || '';
      const limit = dt?.limit || 0;
      this.messageS.showBlocked(true);
      this.crudS.getObject({ app, type, filter, sort, limit }).subscribe((data: any) => {
        const rows = this.generalS.DJAtoObject({
          respDJA: data,
          fields: { [targetField]: targetFieldConfig },
        }) || [];
        finish(rows);
        this.messageS.showBlocked(false);
      });
    } else {
      const options = (Array.isArray(fieldConfig?.options) && fieldConfig.options.length)
        ? fieldConfig.options
        : (Array.isArray(dt?.options) ? dt.options : []);
      finish(options);
    }
  }

  /**
   * Procesa un child 'derived': copia un atributo desde el padre seleccionado
   * (from: 'parent', default) o desde el primer registro del servidor (from: 'server').
   */
  private _processDerivedChild(ctx: {
    fieldConfig: any; targetField: string; targetFieldConfig: any; formControl: any;
    parentField: string; parentOption: any; parentValue: any; childFilterGroup: string;
    isActive: boolean; depth: number;
  }): void {
    const { fieldConfig, targetField, targetFieldConfig, formControl,
            parentField, parentOption, parentValue, childFilterGroup, isActive } = ctx;

    if (!isActive) { formControl?.setValue(null); return; }

    const fieldName = fieldConfig?.field_name ?? fieldConfig?.derived?.field_name;
    const from = fieldConfig?.derived?.from || 'parent';
    const fallback = fieldConfig?.derived?.fallback;

    const applyValue = (val: any) => {
      if (val !== undefined && val !== null && val !== '') { formControl?.setValue(val); }
      else if (fallback !== undefined) { formControl?.setValue(fallback); }
    };

    if (from === 'server') {
      const dt = fieldConfig?.data_type ?? {};
      const app = this.crudS.getAppType(dt?.type)?.app;
      const type = this.crudS.getAppType(dt?.type)?.type;
      if (!app || !type || !fieldName) { applyValue(undefined); return; }
      const filter = this._buildChildServerFilter({
        fieldConfig, parentField, parentOption, parentValue, childFilterGroup,
      });
      const sort = dt?.ordering || '';
      this.messageS.showBlocked(true);
      this.crudS.getObject({ app, type, filter, sort, limit: 1 }).subscribe((data: any) => {
        const rows = this.generalS.DJAtoObject({
          respDJA: data, fields: { [targetField]: targetFieldConfig },
        }) || [];
        applyValue(rows.length ? rows[0]?.[fieldName] : undefined);
        this.messageS.showBlocked(false);
      });
      return;
    }

    // from === 'parent'
    if (fieldName && parentOption && typeof parentOption === 'object') {
      applyValue(parentOption[fieldName]);
    } else {
      applyValue(undefined);
    }
  }
  // ]]]FI

  /** Helper: actualiza una entrada de dropdownOptionsSignal sin repetir el spread. */
  private _updateDropdownOptions(field: string, options: any[]): void {
    this.dropdownOptionsSignal.set({
      ...this.dropdownOptionsSignal(),
      [field]: options
    });
  }

  /**
   * Transforma una lista plana de opciones en `TreeNode[]` cuando el field
   * es tipo `tree-select`. Soporta hijos preargados en `option.children`
   * (configurable vía `field.tree_children_field`). Para otros tipos
   * devuelve las opciones tal cual.
   *
   * Si el field declara `tree.root` el nodo raíz se marca con:
   *   - `key = "<root.resource>:<id>"` (namespace por recurso para evitar
   *     colisiones con hijos lazy de otros niveles).
   *   - `selectable = tree.root.selectable !== false` (por defecto seleccionable).
   *   - `leaf = false` cuando `tree.lazy === true` o existen `tree.levels`,
   *     para que p-treeSelect dibuje el chevron de expansión.
   *   - `data.type = root.resource` y `data.__level = 0` para enrutar el
   *     lazy-load del siguiente nivel.
   */
  private _toTreeNodesIfNeeded(fieldConfig: any, options: any[]): any[] {
    if (!Array.isArray(options)) return options || [];
    if (fieldConfig?.type !== 'tree-select') return options;
    // Si ya viene shaped (label/key/children), no re-envolver
    const first = options[0];
    if (first && (first.label !== undefined && (first.key !== undefined || first.data !== undefined))) {
      return options;
    }
    const tree = fieldConfig?.tree;
    const rootCfg = tree?.root;
    const rootSelectable = rootCfg ? rootCfg.selectable !== false : true;
    const rootResource: string | null = rootCfg?.resource || tree?.root?.resource || null;
    const isLazy = !!tree?.lazy && Array.isArray(tree?.levels) && tree.levels.length > 0;

    const labelField = rootCfg?.label_field || fieldConfig?.option_label || 'name';
    const valueField = rootCfg?.value_field || fieldConfig?.option_value || 'id';
    const childrenField = fieldConfig?.tree_children_field || 'children';
    const labelFromOption = (opt: any): string => {
      if (!labelField) return String(opt?.id ?? '');
      if (typeof labelField === 'string' && labelField.includes(',')) {
        return labelField.split(',')
          .map((f: string) => opt?.[f.trim()])
          .filter((v: any) => v != null && String(v).trim() !== '')
          .map((v: any) => String(v))
          .join(' ');
      }
      return String(opt?.[labelField] ?? '');
    };
    const toNode = (opt: any): any => {
      const kids = Array.isArray(opt?.[childrenField]) ? opt[childrenField] : [];
      const id = opt?.[valueField] ?? '';
      const node: any = {
        key: rootResource ? `${rootResource}:${id}` : String(id),
        label: labelFromOption(opt),
        data: {
          ...opt,
          id: opt?.id ?? id,
          type: rootResource || opt?.type || null,
          __level: 0,
          raw: opt,
        },
        selectable: rootSelectable,
      };
      if (kids.length) {
        node.children = kids.map(toNode);
        node.leaf = false;
      } else if (isLazy) {
        // Lazy: aunque no haya children precargados, mostramos chevron.
        node.children = [];
        node.leaf = false;
      } else {
        node.leaf = true;
      }
      return node;
    };
    return options.map(toNode);
  }

  private _emptyMirroredDropdownValue(fieldConfig: any): any {
    return fieldConfig?.type === 'multi-select' || fieldConfig?.type === 'tree-select'
      ? []
      : null;
  }

  private _flattenDropdownOptions(options: any[]): any[] {
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
  }

  private _findDropdownOption(fieldConfig: any, selectedValue: any): any {
    const optionValueKey = fieldConfig?.option_value || 'id';
    const options = this._flattenDropdownOptions(this.dropdownOptionsSignal()[fieldConfig.field] ?? []);

    if (selectedValue?.raw && typeof selectedValue.raw === 'object') {
      return selectedValue.raw;
    }

    const normalizedValue = selectedValue?.data?.id
      ?? selectedValue?.id
      ?? selectedValue?.value
      ?? (typeof selectedValue?.key === 'string' ? selectedValue.key.split(':').pop() : selectedValue);

    return options.find((item: any) => {
      const candidate = item?.[optionValueKey] ?? item?.id ?? item?.value;
      return candidate === normalizedValue;
    }) ?? null;
  }

  private _mapDropdownOptionToPayload(foundObject: any, fieldConfig: any): any {
    if (!foundObject) return null;

    let currentValueObject = foundObject;

    if (fieldConfig?.cols_values && Array.isArray(fieldConfig.cols_values) && fieldConfig.cols_values.length > 0) {
      let filteredObject: any = null;

      const FIELD_ALIASES: Record<string, string[]> = {
        'id': ['value'],
        'name': ['display_name', 'label'],
        'value': ['id'],
        'display_name': ['name', 'label'],
      };

      fieldConfig.cols_values.forEach((colConfig: any) => {
        const fieldName = colConfig.field;

        if (!fieldName) {
          return;
        }

        if (!filteredObject) {
          filteredObject = {};
        }

        const sourceKey = colConfig.source || fieldName;

        if (foundObject.hasOwnProperty(sourceKey)) {
          filteredObject[fieldName] = foundObject[sourceKey];
        } else {
          const aliases = FIELD_ALIASES[sourceKey] || [];
          const aliasKey = aliases.find((alias) => foundObject.hasOwnProperty(alias));
          if (aliasKey !== undefined) {
            filteredObject[fieldName] = foundObject[aliasKey];
          } else if (colConfig.hasOwnProperty('default')) {
            filteredObject[fieldName] = colConfig.default;
          }
        }
      });

      currentValueObject = filteredObject;
    } else {
      const autoId = foundObject.id ?? foundObject.value ?? null;
      const autoName = foundObject.name ?? foundObject.display_name ?? foundObject.label ?? null;
      currentValueObject = { id: autoId, name: autoName };

      const SKIP_KEYS = new Set(['id', 'name', 'parent', 'children', 'expanded',
        'partialChecked', 'leaf', 'key', 'label', 'icon', 'styleClass',
        'draggable', 'droppable', 'selectable', 'data', 'type']);

      for (const key of Object.keys(foundObject)) {
        if (key in currentValueObject || SKIP_KEYS.has(key)) continue;
        const value = foundObject[key];
        if (value === null || typeof value !== 'object') {
          currentValueObject[key] = value;
        }
      }
    }

    if (foundObject?.type_type && currentValueObject && !fieldConfig?.field?.startsWith('form_data_') && !fieldConfig?.field?.startsWith('parent_form_data_')) {
      currentValueObject['type'] = foundObject.type_type;
      currentValueObject['id'] = foundObject.id;
    }

    return currentValueObject;
  }

  private _buildMirroredDropdownValue(currentValue: any, fieldConfig: any): any {
    if (currentValue == null || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0)) {
      return this._emptyMirroredDropdownValue(fieldConfig);
    }

    if (Array.isArray(currentValue)) {
      return currentValue
        .map((value) => this._mapDropdownOptionToPayload(this._findDropdownOption(fieldConfig, value), fieldConfig))
        .filter((value) => value !== null && value !== undefined);
    }

    return this._mapDropdownOptionToPayload(this._findDropdownOption(fieldConfig, currentValue), fieldConfig)
      ?? this._emptyMirroredDropdownValue(fieldConfig);
  }

  // ─── FIN MOTOR DE EVALUACIÓN ───────────────────────────────────────────────


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
      const mirroredValue = this._buildMirroredDropdownValue(currentValue, object);
      this.formGroupSignal()?.get(newField)?.setValue(mirroredValue);
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

    // REFACTORIZADO: lógica de children movida a _processChildrenFields
    // El bloque original (~500 líneas) evaluaba activate, requested y filtraba
    // opciones estáticas duplicando la misma lógica de onSelectAutoComplete.
    const currentDropdownOption = Array.isArray(currentValue)
      ? this._findDropdownOption(object, currentValue[0])
      : this._findDropdownOption(object, currentValue);
    this._processChildrenFields(field, currentValue, object, currentDropdownOption);

    /* ── BLOQUE ORIGINAL COMENTADO (onChangeDropdown children) ──
    const config = object || {};
    const children = config.children || {};
    const fields = children?.fields || {};

    if (fields && Object.keys(fields).length > 0) {
      const dropdownOptions = this.dataDropdownExists(object);
      let currentDropdownOption: any = null;
      if (dropdownOptions) {
        currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
      }

      ['static', 'dynamic', 'derived'].forEach(fieldType => {
        if (fields[fieldType]) {
          for (const key in fields[fieldType]) {
            if (fields[fieldType].hasOwnProperty(key)) {
              // ... ~500 líneas de lógica de activate, requested, static filter, derived, dynamic
              // Ahora centralizada en _processChildrenFields, _evaluateConditions, _evaluateOperator
            }
          }
        }
      });
    }
    ── FIN BLOQUE ORIGINAL ── */
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

    // REFACTORIZADO: lógica de children movida a _processChildrenFields
    // El bloque original (~400 líneas) era idéntico al de onChangeDropdown.
    const dropdownOptions = this.dataDropdownExists(config);
    let currentDropdownOption: any = null;
    if (dropdownOptions) {
      currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
    }
    this._processChildrenFields(field, currentValue, config, currentDropdownOption);

    /* ── BLOQUE ORIGINAL COMENTADO (onSelectAutoComplete children) ──
    const children = config.children || {};
    const fields = children?.fields || {};

    if (fields && Object.keys(fields).length > 0) {
      const dropdownOptions = this.dataDropdownExists(config);
      let currentDropdownOption: any = null;
      if (dropdownOptions) {
        currentDropdownOption = this.searchByValueObject(currentValue, dropdownOptions, 'id', false)[0];
      }

      ['static', 'dynamic', 'derived'].forEach(fieldType => {
        if (fields[fieldType]) {
          for (const key in fields[fieldType]) {
            if (fields[fieldType].hasOwnProperty(key)) {
              const fieldConfig = fields[fieldType][key];

              const activateConfig = fieldConfig?.activate;
              let isActive = true;

              if (activateConfig?.active) {
                const conditions = activateConfig.conditions || [];
                const logic = activateConfig.logic || 'AND';
                const action = activateConfig.action || 'inactive';

                // ... ~350 líneas adicionales de lógica de activate, requested, static filter,
                // derived, dynamic — Ahora centralizada en _processChildrenFields,
                // _evaluateConditions, _evaluateOperator
              }
            }
          }
        }
      });
    }
    ── FIN BLOQUE ORIGINAL (onSelectAutoComplete children) ── */
  }

  /**
   * esta función establece el valor [] en un tree-select ya que cuando se limía pone un string vacio
   * (es posible que se tenga que separar los multi vs single)
   * @param field campo que se esta modificando
   */
  clearTreeSelect(field: any) {

    this.formGroup.get(field)?.setValue([]);
    if (typeof field === 'string' && field.startsWith('object_')) {
      this.formGroup.get(field.replace('object_', ''))?.setValue([]);
    }

  }

  /**
   * Set de keys ya cargadas por field para no re-disparar requests al
   * re-expandir el mismo nodo. Reload (ícono de recarga) deberá vaciar la
   * entrada para volver a consultar.
   */
  private _treeLoadedKeys: { [field: string]: Set<string> } = {};

  /**
   * Lazy load de hijos al expandir un nodo de un tree-select.
   *
   * La carga de hijos vive en `children.fields.dynamic[<key>]`, alineado con
   * la cascada de dropdown. `tree.levels[i]` solo declara metadatos de
   * navegación (qué key del dynamic resolver, si es seleccionable, label/value
   * field, si hay más niveles); NO inventa filtros ni backend params.
   *
   * Resolución del child config (en orden):
   *   1) `level.child_field` → `config.children.fields.dynamic[level.child_field]`
   *   2) `level.name`        → `config.children.fields.dynamic[level.name]`
   *   3) Único entry de `dynamic` cuando hay solo uno.
   *
   * Filtro construido (reusa `crudS.buildDropdownFilterString`):
   *   - Base: `child.data_type.filter` tal cual (mismo formato que dropdown).
   *   - Más: por cada `child.filter.conditions[*]` con `source: 'parent'`,
   *     se inyecta `{ [cond.field]: { active:true, forced:true,
   *     default: <op>, default_value: <parent[value_key]> } }`.
   *     Esto evita asumir nombres de filtro (`filter[responsible]`) y respeta
   *     exactamente la config existente.
   *
   * Activación:
   *   - Si `child.activate.active` está habilitado se evalúan condiciones
   *     contra el nodo padre (source 'parent'). Si la regla resultante es
   *     "inactive" el nodo se marca como hoja vacía y no se hace request.
   */
  onTreeNodeExpand(event: any, fieldConfig: any): void {
    const node = event?.node;
    if (!node) return;

    const tree = fieldConfig?.tree;
    const lazyLevels: any[] = Array.isArray(tree?.levels) ? tree.levels : [];

    if (tree?.lazy && lazyLevels.length > 0) {
      const currentLevel: number = (node?.data?.__level ?? 0);
      const targetLevelIdx = currentLevel; // levels[0] es el primer hijo del root
      const levelCfg = lazyLevels[targetLevelIdx];
      if (!levelCfg) return; // no hay más niveles configurados

      const cacheKey = String(node.key ?? node?.data?.id ?? '');
      const loaded = (this._treeLoadedKeys[fieldConfig.field] ||= new Set<string>());
      if (loaded.has(cacheKey)) return;
      if (Array.isArray(node.children) && node.children.length > 0) {
        loaded.add(cacheKey);
        return;
      }

      // 1) Resolver child config en children.fields.dynamic ──────────────────
      const dynamicMap = fieldConfig?.children?.fields?.dynamic || {};
      const childKey = levelCfg.child_field
        ?? levelCfg.name
        ?? (Object.keys(dynamicMap).length === 1 ? Object.keys(dynamicMap)[0] : null);
      const childCfg = childKey ? dynamicMap[childKey] : null;

      // 2) Activación basada en activate.conditions con source:'parent' ─────
      const parentNodeData = node?.data || {};
      if (childCfg?.activate?.active) {
        const conds: any[] = childCfg.activate.conditions || [];
        const logic = childCfg.activate.logic || 'AND';
        const action = childCfg.activate.action || 'inactive';
        const results = conds.map((c: any) => {
          if (c?.source && c.source !== 'parent') return true; // ignorar reglas no-padre aquí
          const vk = c?.value_key || 'id';
          const v = parentNodeData?.[vk] ?? parentNodeData?.raw?.[vk] ?? null;
          const op = c?.operator || 'equals';
          const expected = c?.value;
          if (op === 'isnull') return v == null || v === '';
          if (op === 'not_null' || op === 'isnotnull') return !(v == null || v === '');
          if (op === 'equals') return v === expected;
          if (op === 'not_equals') return v !== expected;
          if (op === 'in' && Array.isArray(c?.values)) return c.values.includes(v);
          if (op === 'not_in' && Array.isArray(c?.values)) return !c.values.includes(v);
          return false;
        });
        const met = (logic === 'AND') ? results.every(Boolean) : results.some(Boolean);
        // action:'inactive' → al cumplirse la condición, DESACTIVA. invertimos.
        const isActive = action === 'inactive' ? !met : met;
        if (!isActive) {
          node.children = [];
          node.loading = false;
          loaded.add(cacheKey);
          return;
        }
      }

      // 3) Construir filtro JSON:API a partir del child config ─────────────
      const filterCfg: any = {};
      if (childCfg?.data_type?.filter && typeof childCfg.data_type.filter === 'object') {
        Object.assign(filterCfg, childCfg.data_type.filter);
      }
      if (childCfg?.filter?.active && Array.isArray(childCfg.filter.conditions)) {
        for (const cond of childCfg.filter.conditions) {
          if (cond?.source && cond.source !== 'parent') continue;
          if (!cond?.field) continue;
          const vk = cond.value_key || 'id';
          const v = parentNodeData?.[vk] ?? parentNodeData?.raw?.[vk] ?? null;
          if (v == null || v === '') continue;
          const op = cond.operator === 'equals' ? 'exact' : (cond.operator || 'exact');
          filterCfg[cond.field] = {
            active: true,
            forced: true,
            default: op,
            default_value: v,
          };
        }
      }

      // 4) Resolver recurso/endpoint preferentemente desde el child ────────
      const resource = childCfg?.data_type?.type
        || levelCfg.resource
        || levelCfg.data_type?.type
        || levelCfg.name
        || childKey;
      const at = this.crudS.getAppType(resource) || {};
      const app = at.app;
      const type = at.type;
      if (!app || !type) return;

      const filter = this.crudS.buildDropdownFilterString(filterCfg);
      const sort = childCfg?.data_type?.ordering || levelCfg?.data_type?.ordering || '';
      const limit = childCfg?.data_type?.limit || levelCfg?.data_type?.limit || 0;

      node.loading = true;
      this.messageS.showBlocked(true);
      this.crudS.getObject({ app, type, filter, sort, limit }).subscribe({
        next: (data: any) => {
          // Convierte la respuesta JSON:API a objetos planos usando la misma
          // tubería que dataDropdown — así heredamos `_data_` includes y label.
          const rows = this.generalS.DJAtoObject({
            respDJA: data,
            fields: { [fieldConfig.field]: fieldConfig },
          }) || [];

          const labelField = childCfg?.option_label || levelCfg.label_field || fieldConfig.option_label || 'name';
          const valueField = childCfg?.option_value || levelCfg.value_field || fieldConfig.option_value || 'id';
          const hasMoreLevels = !!lazyLevels[targetLevelIdx + 1];
          const selectable = levelCfg.selectable !== false;
          const parentRef = {
            id: node?.data?.id ?? null,
            type: node?.data?.type ?? null,
          };
          const labelFrom = (opt: any): string => {
            if (typeof labelField === 'string' && labelField.includes(',')) {
              return labelField.split(',')
                .map((f: string) => opt?.[f.trim()])
                .filter((v: any) => v != null && String(v).trim() !== '')
                .map((v: any) => String(v))
                .join(' ');
            }
            return String(opt?.[labelField] ?? '');
          };

          node.children = rows.map((opt: any) => {
            const id = opt?.[valueField] ?? opt?.id ?? '';
            return {
              key: `${resource}:${id}`,
              label: labelFrom(opt),
              data: {
                ...opt,
                id: opt?.id ?? id,
                type: resource,
                __level: targetLevelIdx + 1,
                parent: parentRef,
                raw: opt,
              },
              selectable,
              leaf: !hasMoreLevels,
              children: hasMoreLevels ? [] : undefined,
            };
          });
          node.loading = false;
          loaded.add(cacheKey);

          // Refresca la referencia del array de opciones para que p-treeSelect
          // reaccione (PrimeNG OnPush en algunas versiones requiere nueva ref).
          const current = this.dropdownOptionsSignal()[fieldConfig.field] || [];
          this._updateDropdownOptions(fieldConfig.field, [...current]);
          this.messageS.showBlocked(false);
        },
        error: () => {
          node.loading = false;
          this.messageS.showBlocked(false);
        },
      });
      return;
    }

    // Comportamiento previo (modo clásico, sin tree.levels):
    if (Array.isArray(node.children) && node.children.length > 0) return;
    const childOption = node?.data ?? null;
    const value = node?.key ?? childOption?.id ?? null;
    if (childOption) {
      this._processChildrenFields(fieldConfig.field, value, fieldConfig, childOption);
    }
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

    console.log('🔘 Botón clickeado:', buttonInfo);
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

    // [[[II Ruteo Escenarios 1/2/3 — base64 (flujo "(formulario)"):
    //   Prioridad 1: control key per-step (cuando key != field Y el control
    //     existe en el formGroup). Garantiza captura independiente por step en
    //     stepper multi-step donde distintos steps comparten el mismo `field`
    //     pero tienen `key` distintos (p.e. _inicial/_final).
    //   Prioridad 2: sibling *_documents (cuando no hay key per-step). Aplica
    //     a 'files', 'file' y 'document' (deprecated) sin key per-step.
    //   Prioridad 3 (legacy): key sin control en formGroup (type='document').
    //   Fallback: propio field.
    //   Ver docs/documents/2026-05-16_001 ]]]FI
    const formGroup = this.formGroupSignal();
    const currentKey = payload.fieldConfig?.key;
    let base64TargetField: string | undefined;

    // Prioridad 1: control key per-step (key != field y existe en formGroup)
    if (currentKey && currentKey !== payload.field && formGroup?.get(currentKey)) {
      base64TargetField = currentKey;
    }
    // Prioridad 2: sibling *_documents (aplica a 'files', 'file' y 'document' deprecated)
    if (!base64TargetField && payload.field && (
      payload.fieldConfig?.type === 'files'
      || payload.fieldConfig?.type === 'file'
      || payload.fieldConfig?.type === 'document'
    )) {
      const documentsCandidate = payload.field.replace(/files$/, 'documents');
      if (documentsCandidate !== payload.field && formGroup?.get(documentsCandidate)) {
        base64TargetField = documentsCandidate;
      }
    }
    // Prioridad 3 (fallback legacy): key sin control en formGroup
    if (!base64TargetField && currentKey && currentKey !== payload.field) {
      base64TargetField = currentKey;
    }
    if (!base64TargetField) base64TargetField = payload.field;

    const fileObject = {
      type: payload.type,
      file_name: fileName,
      file: payload.file,
      step: currentStep,
      field: base64TargetField, // [[[II marcar destino real para el sweep de submitForm ]]]FI
      key: payload.fieldConfig?.key
    };

    const newFiles = [
      ...this.files64Signal(),
      fileObject
    ];

    this.files64Signal.set(newFiles);
    this.files64Action.emit(newFiles);

    // Escribir base64 en el control destino
    if (base64TargetField) {
      const control = formGroup?.get(base64TargetField);
      if (control) {
        const targetFiles = newFiles.filter(f => f.field === base64TargetField);
        // Preservar URLs previas (PATCH) si las hay
        const current = control.value;
        const existingUrls: any[] = Array.isArray(current)
          ? current.filter((v: any) => typeof v === 'string')
          : (typeof current === 'string' && current ? [current] : []);
        const combined = [...existingUrls, ...targetFiles];
        control.setValue(combined.length > 0 ? combined : null);
        control.markAsDirty();
      }

      // Si la captura es de tipo `files` o `document` (deprecated) y el destino
      // fue el control hermano `*_documents`, limpiar required del control
      // `*_files` (la relación queda satisfecha por cámara / diferenciador 2).
      if (
        (payload.fieldConfig?.type === 'files' || payload.fieldConfig?.type === 'file' || payload.fieldConfig?.type === 'document')
        && payload.field
        && base64TargetField !== payload.field
      ) {
        const filesCtrl = formGroup?.get(payload.field);
        if (filesCtrl) {
          filesCtrl.clearValidators();
          filesCtrl.updateValueAndValidity({ emitEvent: false });
        }
      }
    }

    // Guardar caché inmediatamente después de agregar multimedia
    // para que si Android mata la Activity, la foto ya esté persistida
    this._saveFormCacheNow();
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
          // ────────────────────────────────────────────────────────────────────
          // FIX: Plugin SafeCamera nativo reemplaza a @capacitor/camera.
          //
          // El plugin de Capacitor Camera hace BitmapFactory.decodeFile() SIN
          // inSampleSize → en fotos de 12 MP+ consume ~48 MB de RAM → OOM
          // → Android mata la Activity/WebView.
          //
          // SafeCamera:
          //  1. Guarda ruta del archivo + contexto del campo en SharedPreferences
          //     ANTES de lanzar la cámara (persiste si Android mata la Activity).
          //  2. Lanza camera intent con EXTRA_OUTPUT → la foto se escribe a disco
          //     por la app de cámara nativa (sin pasar por nuestro proceso).
          //  3. Al volver, decodifica con inSampleSize (2 pasadas) → ~4× menos RAM.
          //  4. Si Android mató la Activity, checkPendingCapture() recupera la foto
          //     del archivo que la cámara ya escribió a disco.
          //  5. _saveFormCacheNow() ANTES de cámara → protege fotos previas.
          //  6. _saveFormCacheNow() DESPUÉS de appendFile → persiste foto nueva.
          // ────────────────────────────────────────────────────────────────────

          // Guardar caché ANTES de abrir cámara para proteger fotos previas
          this._saveFormCacheNow();

          const result: any = await SafeCamera['takePhoto']({
            maxDimension: 1280,
            quality: 60,
            field: this.activeFieldCapture || '',
            fieldKey: this.activeFieldConfig?.key || '',
            url: window.location.pathname
          });

          // --- TEMPORAL: eliminar metadatos EXIF/GPS ---
          const dataUrl = await this._stripImageMetadata(result.dataUrl);
          // const dataUrl = result.dataUrl; // ORIGINAL: descomentar cuando no se necesite strip
          // --- FIN TEMPORAL ---

          this.appendFile({
            type: 'image',
            file_name: 'evidencia.jpg',
            file: dataUrl,
            field: this.activeFieldCapture || undefined,
            fieldConfig: this.activeFieldConfig
          });

          this.previewCameraDialogVisible = false;
        } catch (error: any) {
          // Si el usuario cancela la cámara, no mostrar error
          if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')
            || error?.message?.includes('User cancelled')) {
            return;
          }
          console.error('SafeCamera error:', error);
          this.messageS.changeMessage('Error al capturar imagen: ' + (error?.message || error?.errorMessage || JSON.stringify(error)));
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

      // --- TEMPORAL: eliminar metadatos EXIF/GPS ---
      const imagenCapturada = await this._stripImageMetadata(canvas.toDataURL('image/jpeg'));
      // const imagenCapturada = canvas.toDataURL('image/jpeg'); // ORIGINAL: descomentar cuando no se necesite strip
      // --- FIN TEMPORAL ---

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

  /**
   * Convierte un Blob a DataUrl string (base64).
   * Se usa para convertir la imagen capturada por URI a base64 sin
   * cargar todo en memoria nativa del plugin de cámara.
   */
  private _blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Verifica si SafeCamera tiene una captura pendiente de una sesión anterior
   * donde Android mató la Activity. Si existe, recupera la foto del archivo
   * en disco (que la cámara nativa ya escribió) y la agrega al formulario.
   */
  private async _checkPendingSafeCapture(): Promise<void> {
    if (!this.isCapacitorNative()) return;
    try {
      const pending: any = await SafeCamera['checkPendingCapture']();
      if (!pending.hasPending) return;

      // --- TEMPORAL: eliminar metadatos EXIF/GPS ---
      const dataUrl = await this._stripImageMetadata(pending.dataUrl);
      // const dataUrl = pending.dataUrl; // ORIGINAL: descomentar cuando no se necesite strip
      // --- FIN TEMPORAL ---

      this.appendFile({
        type: 'image',
        file_name: 'evidencia.jpg',
        file: dataUrl,
        field: pending.field || undefined,
        fieldConfig: pending.fieldKey ? { key: pending.fieldKey } : undefined
      });

      this.messageS.changeMessage('Se recuperó la foto de la sesión anterior.');
    } catch {
      // Silencioso: si falla la recuperación, no bloquear
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOQUE: type "files" — template unificado con 3 modos combinables
  // ───────────────────────────────────────────────────────────────────────────
  // Modos controlados por la configuración del field:
  //   upload.active=true        → captura (cámara/galería) → base64 → se envía
  //                              junto con el formulario. Reutiliza el flujo
  //                              de `document` (previewCamera / appendFile).
  //   server_upload.active=true → sube inmediatamente al endpoint resuelto por
  //                              crudS.appType['file'] (files/file) como
  //                              multipart/form-data; agrega la relación al
  //                              FormControl m2m del field.
  //   búsqueda                 → autocomplete sobre el endpoint resuelto por
  //                              data_type.type (via crudS.appType), devuelve
  //                              archivos existentes para agregar como relación.
  //
  // allow_camera / allow_gallery: solo true habilita la opción; cualquier otro
  // valor (false/undefined) la deshabilita.
  // readonly / disabled los controla el formulario padre (no repetimos aquí).
  // ═══════════════════════════════════════════════════════════════════════════

  /** Resultados del autocomplete por field */
  public fileSearchResults: { [field: string]: any[] } = {};
  /** Modelo del autocomplete por field */
  public fileSearchModel: { [field: string]: any } = {};

  /**
    * Lista todos los fields type='files' presentes en el drawForm.
    * Acepta el alias legacy 'file' para compatibilidad.
   * (grid libre, card, fieldset y stepper). Se usa para renderizar las
   * barras de busqueda en el area global de preview de imagenes.
   */
  public fileSearchFields = computed<any[]>(() => {
    const df = this.drawFormSignal();
    if (!df) return [];
    const found: any[] = [];
    const seen = new Set<string>();
    const isFileType = (t: any) => t === 'file' || t === 'files';
    const visit = (cfg: any) => {
      if (!cfg) return;
      if (isFileType(cfg?.type) && cfg?.field && !seen.has(cfg.field) && !cfg.readonly) {
        seen.add(cfg.field);
        found.push(cfg);
      }
      // Recorremos contenedores conocidos
      ['card', 'fieldset', 'fields'].forEach(key => {
        if (cfg?.[key] && typeof cfg[key] === 'object') {
          Object.values(cfg[key]).forEach((v: any) => visit(v));
        }
      });
    };
    if (df.grid) Object.values(df.grid).forEach((v: any) => visit(v));
    if (df.stepper?.steps) Object.values(df.stepper.steps).forEach((s: any) => {
      if (s?.fields) Object.values(s.fields).forEach((v: any) => visit(v));
    });
    return found;
  });

  /** true estricto: allow_* solo habilita cuando es === true */
  private _allowed(flag: any): boolean {
    return flag === true;
  }

  /**
    * Items del p-splitbutton para un fieldConfig type='files'.
    * Acepta el alias legacy 'file'.
   * Se construyen una sola vez por llamada; el template los bindea por
   * referencia estable cacheada en `_fileMenuCache` para evitar recálculos.
   */
  private _fileMenuCache: { [field: string]: MenuItem[] } = {};

  getFileMenuItems(fieldConfig: any): MenuItem[] {
    // Incluir el `key` en el cache key para que steps con el mismo `field`
    // pero distinto `key` (stepper per-step) tengan entradas independientes.
    const key = `${fieldConfig?.field || ''}::${fieldConfig?.key || ''}`;
    if (this._fileMenuCache[key]) return this._fileMenuCache[key];

    const items: MenuItem[] = [];
    const up = fieldConfig?.upload;
    const sv = fieldConfig?.server_upload;

    if (up?.active) {
      if (this._allowed(up.allow_camera)) {
        items.push({ label: 'Cámara (formulario)', icon: 'pi pi-camera', command: () => this.previewCamera(fieldConfig.field, fieldConfig) });
      }
      if (this._allowed(up.allow_gallery)) {
        items.push({ label: 'Galería (formulario)', icon: 'pi pi-images', command: () => this.pickFromGalleryBase64(fieldConfig.field, fieldConfig) });
      }
    }
    if (sv?.active) {
      if (this._allowed(sv.allow_camera)) {
        items.push({ label: 'Cámara (subida directa)', icon: 'pi pi-cloud-upload', command: () => this.serverUploadCapture(fieldConfig, 'camera') });
      }
      if (this._allowed(sv.allow_gallery)) {
        items.push({ label: 'Galería (subida directa)', icon: 'pi pi-upload', command: () => this.serverUploadCapture(fieldConfig, 'gallery') });
      }
    }

    this._fileMenuCache[key] = items;
    return items;
  }

  /** Acción del click principal del splitbutton: primera opción habilitada */
  fileMenuPrimary(fieldConfig: any): void {
    const items = this.getFileMenuItems(fieldConfig);
    if (items.length === 0) return;
    const cmd = items[0].command as any;
    if (typeof cmd === 'function') cmd();
  }

  /**
   * Selecciona imagen de la galería y la deja como base64 en el formulario,
   * reutilizando appendFile (mismo contrato del tipo 'document').
   */
  async pickFromGalleryBase64(fieldName: string, fieldConfig: any): Promise<void> {
    this.activeFieldCapture = fieldName || null;
    this.activeFieldConfig = fieldConfig || null;
    try {
      const photo = await Camera.getPhoto({
        quality: fieldConfig?.upload?.quality ?? 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: fieldConfig?.upload?.max_width,
        height: fieldConfig?.upload?.max_height,
      });
      const dataUrl = await this._stripImageMetadata(photo.dataUrl || '');
      this.appendFile({
        type: 'image',
        file_name: 'evidencia.jpg',
        file: dataUrl,
        field: fieldName || undefined,
        fieldConfig: fieldConfig
      });
    } catch (error: any) {
      if (error?.message?.toLowerCase?.().includes('cancel')) return;
      this.messageS.changeMessage('Error al seleccionar imagen: ' + (error?.message || error));
    }
  }

  /**
   * Captura (cámara/galería) y sube inmediatamente al endpoint files/file
   * via CRUDService.uploadFile. Agrega la relación al FormControl m2m y
   * muestra la miniatura en files64Signal.
   *
   * Nota: el endpoint files/file recibe una sola imagen por request.
   */
  async serverUploadCapture(fieldConfig: any, source: 'camera' | 'gallery'): Promise<void> {
    try {
      const sv = fieldConfig?.server_upload || {};
      const photo = await Camera.getPhoto({
        quality: sv.quality ?? 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        width: sv.max_width,
        height: sv.max_height,
      });
      const dataUrl = await this._stripImageMetadata(photo.dataUrl || '');
      const blob = this._dataUrlToBlob(dataUrl);
      const name = sv.name_file_user || 'evidencia.jpg';

      this.crudS.uploadFile({ file: blob, name, appKey: 'file' }).subscribe({
        next: (resp: any) => {
          const data = resp?.data;
          if (!data?.id) {
            this.messageS.changeMessage('Respuesta de servidor sin id de archivo.');
            return;
          }
          this._pushServerFileToForm(fieldConfig, data);
        },
        error: (err: any) => this.messageS.changeMessage('Error al subir archivo al servidor.', err)
      });
    } catch (error: any) {
      if (error?.message?.toLowerCase?.().includes('cancel')) return;
      this.messageS.changeMessage('Error al subir al servidor: ' + (error?.message || error));
    }
  }

  /** DataURL → Blob */
  private _dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const meta = parts[0] || '';
    const b64 = parts[1] || '';
    const mimeMatch = /data:([^;]+);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /**
   * Agrega la relación retornada por el servidor al FormControl m2m y
   * empuja una entrada en files64Signal para reutilizar la sección de
   * miniaturas (nonSignatureFilesSignal).
   */
  private _pushServerFileToForm(fieldConfig: any, fileData: any): void {
    const fg = this.formGroupSignal();
    const fieldName: string = fieldConfig?.field || 'files';
    const control = fg?.get(fieldName);
    const attrs = fileData?.attributes || {};
    const relation = { id: fileData.id, type: fileData.type || 'file' };

    if (control) {
      const current = control.value;
      let next: any[] = Array.isArray(current) ? [...current] : (current ? [current] : []);
      if (!next.some((r: any) => r?.id === relation.id)) next.push(relation);
      control.setValue(next);
      control.markAsDirty();

      // [[[II Subida directa satisface la relación → limpiar required del
      // control hermano `*_documents` (si existe) y del control per-step
      // `key` (si key != field y existe). Ver 2026-05-16_001 ]]]FI
      const docsCandidate = fieldName.replace(/files$/, 'documents');
      if (docsCandidate !== fieldName) {
        const docsCtrl = fg?.get(docsCandidate);
        if (docsCtrl) {
          docsCtrl.clearValidators();
          docsCtrl.updateValueAndValidity({ emitEvent: false });
        }
        // Limpiar también el keyCtrl per-step cuando servidor satisface el campo
        const keyCandidate = fieldConfig?.key;
        if (keyCandidate && keyCandidate !== fieldName) {
          const keyCtrl = fg?.get(keyCandidate);
          if (keyCtrl) {
            keyCtrl.clearValidators();
            keyCtrl.updateValueAndValidity({ emitEvent: false });
          }
        }
      }
    }

    const isImage = /\.(jpe?g|png|gif|webp|bmp)$/i.test(attrs.file || attrs.name || '');
    const entry = {
      type: isImage ? 'image' : 'file',
      file_name: attrs.name || 'archivo',
      file: attrs.file || '',
      step: this.currentStepSignal(),
      field: fieldName,
      key: fieldConfig?.key,
      server: true,
      relation_id: fileData.id
    };
    const newFiles = [...this.files64Signal(), entry];
    this.files64Signal.set(newFiles);
    this.files64Action.emit(newFiles);
  }

  /**
   * Autocomplete de búsqueda — consulta el endpoint resuelto por
   * data_type.type (via crudS.appType). Mínimo 5 caracteres.
   */
  onFileSearchComplete(event: any, fieldConfig: any): void {
    const q = (event?.query || '').trim();
    if (q.length < 5) { this.fileSearchResults[fieldConfig.field] = []; return; }

    const dt = fieldConfig?.data_type ?? {};
    const app = this.crudS.getAppType(dt?.type)?.app;
    const type = this.crudS.getAppType(dt?.type)?.type;
    if (!app || !type) { this.fileSearchResults[fieldConfig.field] = []; return; }

    const filter = `filter[search]=${encodeURIComponent(q)}`;
    this.crudS.getObject({ app, type, filter, limit: 10 }).subscribe({
      next: (resp: any) => {
        const rows = (resp?.data || []).map((d: any) => ({
          id: d.id,
          type: d.type || type,
          name: d?.attributes?.name || '(sin nombre)',
          // ─── MINIATURA: URL devuelta tal cual. No siempre es imagen
          //     (puede ser pdf u otro). Si impacta al servidor, comentar
          //     el img en el template.
          thumb: d?.attributes?.file || '',
          raw: d
        }));
        this.fileSearchResults[fieldConfig.field] = rows;
      },
      error: () => { this.fileSearchResults[fieldConfig.field] = []; }
    });
  }

  /** Selección del autocomplete: agrega relación */
  onFileSearchSelect(event: any, fieldConfig: any): void {
    const item = event?.value || event;
    if (!item?.id) return;
    const fake = item.raw || { id: item.id, type: item.type || 'file', attributes: { name: item.name, file: item.thumb } };
    this._pushServerFileToForm(fieldConfig, fake);
    this.fileSearchModel[fieldConfig.field] = null;
  }

  /** Archivos (no firmas) filtrados al field actual para preview por campo */
  getFieldFiles(fieldName: string): any[] {
    return this.nonSignatureFilesSignal().filter((f: any) => f.field === fieldName);
  }

  /**
   * Elimina una entrada. Si viene del servidor, remueve la relación del
   * FormControl m2m; si es base64, delega en removeImage (flujo existente).
   */
  removeFileEntry(entry: any): void {
    if (!entry) return;
    if (entry.server) {
      const fg = this.formGroupSignal();
      const control = fg?.get(entry.field);
      if (control) {
        const current = control.value;
        if (Array.isArray(current)) {
          const next = current.filter((r: any) => r?.id !== entry.relation_id);
          control.setValue(next);
          control.markAsDirty();
        }
      }
      const allFiles = this.files64Signal();
      const realIndex = allFiles.findIndex((f: any) => f.server && f.relation_id === entry.relation_id);
      if (realIndex !== -1) {
        const newFiles = allFiles.filter((_, idx) => idx !== realIndex);
        this.files64Signal.set(newFiles);
        this.files64Action.emit(newFiles);
      }
      return;
    }
    // Para base64: localizamos el índice en nonSignatureFilesSignal y delegamos
    const nsIdx = this.nonSignatureFilesSignal().indexOf(entry);
    if (nsIdx !== -1) this.removeImage(nsIdx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIN BLOQUE: type "files"
  // ═══════════════════════════════════════════════════════════════════════════


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

          const control = formGroup?.get(fileToRemove.field);
          if (control) {
            // En edición (PATCH): preservar URLs de archivos ya existentes en el servidor.
            const current = control.value;
            const existingUrls: any[] = Array.isArray(current)
              ? current.filter((v: any) => typeof v === 'string')
              : (typeof current === 'string' && current ? [current] : []);

            const combined = [...existingUrls, ...remainingFieldFiles];
            // Siempre se establece como array para que los campos tipo List reciban el formato correcto
            control.setValue(combined.length > 0 ? combined : null);
            control.markAsDirty();
          }
        }

        // Actualizar el FormControl del campo "key" (si existe y es diferente de field)
        // Mismo tratamiento ligero que en appendFile: solo placeholder para satisfacer required
        if (fileToRemove.key && fileToRemove.key !== fileToRemove.field) {
          const remainingKeyFiles = newFiles.filter(f => f.key === fileToRemove.key);

          let valueToSet = null;
          if (remainingKeyFiles.length >= 1) {
            const toLightRef = (f: any) => ({
              type: f.type,
              file_name: f.file_name,
              file: `[ref:${f.field}]`,
              step: f.step,
              field: f.field,
              key: f.key
            });
            valueToSet = remainingKeyFiles.length === 1
              ? toLightRef(remainingKeyFiles[0])
              : remainingKeyFiles.map(toLightRef);
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

    // Los botones "Siguiente" siempre validan campos antes de avanzar
    // (diferenciador 1). La prop linear solo controla las pestañas del header.
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