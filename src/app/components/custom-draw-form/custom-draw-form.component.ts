import { CommonModule, KeyValue } from '@angular/common';
import { DROPDOWN_TYPES_PRELOAD } from '../../utils/dropdown-types.const';
import { TABLE_ROW_SOURCE_FLAG } from '../../utils/table-row-flags.const';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators, FormBuilder } from '@angular/forms';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, EventEmitter, inject, Input, Output, signal, computed, SimpleChange, SimpleChanges, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';
// ************************ADAPTADO PARA CAPACITOR*********************
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// Scanner de códigos de barras para Capacitor
// [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
// Import solo de tipos: se borra al compilar. El módulo runtime (html5-qrcode +
// ZXing, ~374 KB) se carga con import() dentro de onScanCode() al escanear.
import type { CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
// ]]]FI
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
import { SplitButton } from 'primeng/splitbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AutoFocusModule } from 'primeng/autofocus';
import { StepperModule } from 'primeng/stepper';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TooltipModule } from 'primeng/tooltip';
import { CRUDService } from '../../utils/services/crud.service';
import { GeneralService } from '@/utils/services/general.service';
import { MessageService } from '../services/message.service';
import { AuthService } from '@/auth/services/auth.service';
import { Capacitor } from '@capacitor/core';
import { FormCacheConfig, FormCacheService } from '@/utils/services/form-cache.service';
import { DynamicTableFieldComponent } from './dynamic-table-field/dynamic-table-field.component';
import { DynamicDropdownDataContext, DynamicDropdownDataService } from './dynamic-dropdown-data.service';
// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
// JoinOrSelfPipe vive ahora en su propio archivo (se re-exporta abajo por
// compatibilidad). Los tipos raros (tree-select, listbox, select-button) se
// extraen a hijos standalone usados solo dentro de @defer: sus módulos PrimeNG
// salen del chunk eager del formulario y se cargan solo si el formulario
// abierto contiene ese tipo.
import { JoinOrSelfPipe } from './join-or-self.pipe';
import { DrawTreeSelectFieldComponent } from './fields/draw-tree-select-field.component';
import { DrawListboxFieldComponent } from './fields/draw-listbox-field.component';
import { DrawSelectButtonFieldComponent } from './fields/draw-select-button-field.component';

export { JoinOrSelfPipe } from './join-or-self.pipe';
// ]]]FI

// Plugin nativo SafeCamera — decodifica con inSampleSize para evitar OOM
const SafeCamera: any = Capacitor.registerPlugin('SafeCamera');


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
    DatePickerModule,
    SelectModule,
    SplitButton,
    // [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
    // Usados solo dentro de @defer en el template: se compilan como chunks
    // diferidos (reemplazan a ListboxModule/TreeSelectModule/SelectButtonModule).
    DrawTreeSelectFieldComponent,
    DrawListboxFieldComponent,
    DrawSelectButtonFieldComponent,
    // ]]]FI
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
    TooltipModule,
    DynamicTableFieldComponent,

    SplitButtonModule
  ],
  templateUrl: './custom-draw-form.component.html',
  styleUrl: './custom-draw-form.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomDrawFormComponent implements OnInit, OnDestroy {

  @ViewChild('videoElement') video!: ElementRef;
  @ViewChild('canvasElement') canvas!: ElementRef;

  private crudS: any = inject(CRUDService);
  protected messageS: MessageService = inject(MessageService); // para mostrar mensajes
  private generalS: GeneralService = inject(GeneralService); // funciones generales
  private fb: FormBuilder = inject(FormBuilder);
  private authS: AuthService = inject(AuthService);
  private formCacheS: FormCacheService = inject(FormCacheService);
  private dynamicDropdownDataS: DynamicDropdownDataService = inject(DynamicDropdownDataService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  // [[[II ESC:030-05 host del componente: raiz para resolver el elemento enfocable
  // de focus_after_select (querySelector acotado a este formulario). ]]]FI
  private host: ElementRef = inject(ElementRef);

  // Suscripción para detectar cambios en el formulario
  private formSubscription?: Subscription;
  private formStatusSubscription?: Subscription;
  private messageSubscription?: Subscription;
  /** Suscripción para el autoguardado de caché */
  private cacheAutoSaveSub?: Subscription;
  private childRuntimePreviousValue: Record<string, any> = {};
  private childRuntimeRefreshing = false;
  private readonly childBaseRequired = new WeakMap<object, boolean>();
  private readonly childBaseHidden = new WeakMap<object, boolean>();
  private readonly childBaseReadonly = new WeakMap<object, boolean>();
  // [[[II ESC:030-01 Fuente única compartida en utils/table-row-flags.const.ts ]]]FI
  private readonly tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
  private wasDirty: boolean = false;

  /** Clave activa de caché para el formulario actual */
  private currentCacheKey: string | null = null;
  /** Config de caché del drawForm para la plataforma actual */
  private currentCacheConfig: FormCacheConfig | null = null;
  private handlingDrawFormChange = false;
  private isDiscardingCacheData = false;
  private formCacheInitVersion = 0;
  private readonly resolvedDrawFormCache = new WeakMap<object, { mobile?: any; desktop?: any }>();
  // [[[II ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02 ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
  private readonly PERF_LOG_THRESHOLD_MS = 8;
  private readonly MOBILE_DROPDOWN_PRELOAD_CONCURRENCY = 2;
  private readonly DESKTOP_DROPDOWN_PRELOAD_CONCURRENCY = 6;
  private readonly DEFERRED_DROPDOWN_PRELOAD_DELAY_MS = 15000;
  private dropdownPreloadQueue: any[] = [];
  private dropdownPreloadActive = 0;
  private dropdownPreloadQueuedFields = new Set<string>();
  private dropdownDeferredPreloadQueue: any[] = [];
  private dropdownDeferredPreloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly discardedCacheKeys = new Set<string>();
  // ]]]FI

  @Input() formGroup!: FormGroup;
  @Input() drawForm: any;
  @Input() type: any;
  @Input() tabPanel!: string;
  @Input() isCreate: boolean = true;
  @Input() optionLabel: any = 'label';
  @Input() showIcon: boolean = true;
  // [[[II Cuando el host provee el motor CRUD (extiende Crud), delega el alta/
  // edición de filas de tabla derivada al motor del form (save({table_row}))
  // en vez de persistir aquí. Opt-in para no cambiar el comportamiento de otras
  // páginas que no manejan el evento. ]]]FI
  @Input() delegateTableSave: boolean = false;
  // [[[II ESC:030-12 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-12
  // Desenlace del guardado de fila publicado por el motor (CRUD.tableRowSaveOutcome).
  // Sólo se transporta hasta la tabla; este componente no lo interpreta. ]]]FI
  @Input() tableRowSaveOutcome: { field: string; row_index: any; ok: boolean; token: number } | null = null;

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
  // [[[II Solicitud de alta/edición de una fila de tabla derivada delegada al
  // motor del host (contexto explícito, sin segundo motor de creación). ]]]FI
  @Output() onTableRowSave = new EventEmitter<any>();

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
  // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
  fileSplitButtonInvalidSignal = signal<Record<string, boolean>>({});
  private fileSplitButtonValidationTargets: Record<string, string[]> = {};
  private fileSplitButtonServerErrorFields = new Set<string>();
  // ]]]FI
  // [[[II ESC:020-04 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-04
  virtualOptionsReadySignal = signal<Record<string, boolean>>({});
  // ]]]FI
  // [[[II ESC:007-07 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-07
  selectionMultipleSignal = signal<Record<string, boolean>>({});
  // ]]]FI
  // [[[II ESC:020-01 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-01
  readonly listboxVirtualScrollOptions = {
    autoSize: false,
    delay: 0,
    numToleratedItems: 16,
    resizeDelay: 80
  };
  // ]]]FI

  // Signal para guardar los separators calculados de emails-chips
  emailSeparatorsSignal = signal<{ [key: string]: string | RegExp }>({ default: /[,;]/ });

  // [[[II ESC:015-01 DOC:docs/documents/2026-06-02_015_dynamic-table-field-component.md#escenario-01
  readonly tableOptions = { rows: 10 };
  editingRows: { [key: string]: boolean } = {};
  editingCells: { [key: string]: boolean } = {};
  tablesToValidate: { [key: string]: boolean } = {};
  originalRowData: { [key: string]: any } = {};
  tableValidationVersion = 0;
  // ]]]FI

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  // Una fila de tabla se guarda como operación independiente: mientras se edita,
  // el resto del formulario queda realmente deshabilitado para no mezclar datos.
  // Se conserva el estado disabled previo de cada control y se restaura igual.
  private readonly tableEditingFields = new Set<string>();
  private readonly tableEditingDisabledControls = new Map<FormControl, boolean>();
  readonly tableEditingLockOwner = signal<string | null>(null);
  readonly tableEditingActive = computed(() => this.tableEditingLockOwner() !== null);

  onTableEditingStateChange(event: { field: string; active: boolean }): void {
    if (!event?.field) return;
    if (event.active) this.tableEditingFields.add(event.field);
    else this.tableEditingFields.delete(event.field);

    const owner = this.tableEditingFields.values().next().value ?? null;
    this.tableEditingLockOwner.set(owner);
    this._setMainFormControlsDisabled(owner !== null);
  }

  private _setMainFormControlsDisabled(disabled: boolean): void {
    const form = this.formGroupSignal();
    if (!form) return;

    if (disabled) {
      Object.values(form.controls).forEach((control) => {
        if (!(control instanceof FormControl) || this.tableEditingDisabledControls.has(control)) return;
        this.tableEditingDisabledControls.set(control, control.disabled);
        if (!control.disabled) control.disable({ emitEvent: false });
      });
      return;
    }

    this.tableEditingDisabledControls.forEach((wasDisabled, control) => {
      if (!wasDisabled) control.enable({ emitEvent: false });
    });
    this.tableEditingDisabledControls.clear();
  }
  // ]]]FI

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

  // [[[II ESC:016-02 DOC:docs/documents/2026-06-02_016_dynamic-dropdown-data-service.md#escenario-02 ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
  private getDropdownDataContext(): DynamicDropdownDataContext {
    return {
      type: this.typeSignal() || this.type || '',
      isCreate: this.isCreateSignal(),
    };
  }

  /**
   * Mantiene el contrato usado por el componente y por handlers internos,
   * pero delega la resolución de opciones/caché al servicio especializado.
   */
  async dataDropdownExists(element: any, force = false): Promise<any[] | false> {
    return this.dynamicDropdownDataS.dataDropdownExists(
      element,
      this.getDropdownDataContext(),
      force
    );
  }

  /**
   * Punto de entrada del template. El componente conserva la reacción visual
   * y la publicación hacia dropdownOptionsSignal; el servicio resuelve datos.
   */
  async dataDropdown(element: any, force = false) {
    const perfStart = this.perfNow();
    const field = element?.field || '(sin-field)';
    const fieldType = element?.type || '(sin-type)';
    const context = this.getDropdownDataContext();
    const localOnlyDropdown = element?.type === 'multi-choice';
    const existsStart = this.perfNow();
    const dropdownOptions = force && !localOnlyDropdown
      ? false
      : await this.dynamicDropdownDataS.dataDropdownExists(element, context, localOnlyDropdown ? false : force);
    this.logPerf('dropdown.exists', existsStart, { field, type: fieldType, source: dropdownOptions === false ? 'miss' : 'cache/local' }, true);

    if (dropdownOptions !== false && (!force || localOnlyDropdown)) {
      const buildStart = this.perfNow();
      const resolvedOptions = await this._buildDropdownOptionsForField(element, dropdownOptions);
      this.logPerf('dropdown.buildOptions.cached', buildStart, {
        field,
        type: fieldType,
        rows: Array.isArray(dropdownOptions) ? dropdownOptions.length : 0,
        renderedRows: Array.isArray(resolvedOptions) ? resolvedOptions.length : 0
      }, true);
      this._updateDropdownOptions(element.field, resolvedOptions, element);
      this.logPerf('dropdown.total.cached', perfStart, { field, type: fieldType }, true);
      return;
    }

    // Reload: invalidar cache de lazy-load del árbol para volver a consultar
    // los hijos en la próxima expansión o precarga de listbox agrupado.
    if (force && this._treeLoadedKeys?.[element.field]) {
      this._treeLoadedKeys[element.field].clear();
    }

    if (!this.dynamicDropdownDataS.canRequestServer(element)) {
      this._updateDropdownOptions(element.field, [], element);
      this.logPerf('dropdown.total.noServer', perfStart, { field, type: fieldType }, true);
      return;
    }

    const shouldBlockUi = force === true;
    if (shouldBlockUi) {
      this.messageS.showBlocked(true);
    }

    try {
      const serverStart = this.perfNow();
      const dataDropdown = await this.dynamicDropdownDataS.loadServerOptions(element, context, force);
      this.logPerf('dropdown.server', serverStart, {
        field,
        type: fieldType,
        rows: Array.isArray(dataDropdown) ? dataDropdown.length : 0,
        force
      }, true);
      if (dataDropdown === false) {
        this.logPerf('dropdown.total.serverSkipped', perfStart, { field, type: fieldType }, true);
        return;
      }

      const buildStart = this.perfNow();
      const resolvedOptions = await this._buildDropdownOptionsForField(element, dataDropdown);
      this.logPerf('dropdown.buildOptions.server', buildStart, {
        field,
        type: fieldType,
        rows: dataDropdown.length,
        renderedRows: Array.isArray(resolvedOptions) ? resolvedOptions.length : 0
      }, true);
      this._updateDropdownOptions(element.field, resolvedOptions, element);
      this.logPerf('dropdown.total.server', perfStart, { field, type: fieldType, force }, true);
    } finally {
      if (shouldBlockUi) {
        this.messageS.showBlocked(false);
      }
    }
  }

  private normalizeOptionsForField(options: any[], fieldConfig: any): any[] {
    return this.dynamicDropdownDataS.normalizeOptionsForField(options, fieldConfig);
  }
  // ]]]FI

  /**
   * Obtiene la clave del usuario para separar el cache por cuenta.
   */
  private getCacheUserKey(): string {
    const userId = this.authS.userId?.() ?? null;
    const username = this.authS.username?.() ?? null;
    return String(userId ?? username ?? 'anonymous');
  }

  // [[[II Fuente única de tipos dropdown en utils/dropdown-types.const.ts ]]]FI
  private readonly DROPDOWN_TYPES = DROPDOWN_TYPES_PRELOAD;
  // [[[II ESC:007-07 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-07 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
  private readonly SELECTION_LIMIT_TYPES = new Set(['listbox', 'multi-select', 'multi-choice', 'tree-select']);
  private readonly ARRAY_SELECTION_TYPES = new Set(['multi-select', 'multi-choice', 'tree-select']);
  // ]]]FI

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

  // [[[II ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02
  /**
   * Procesa una colección { 0: {...}, 1: {...} } o array de elementos
   */
  private processElements(collection: any): void {
    if (!collection || typeof collection !== 'object') return;

    for (const el of Object.values(collection)) {
      this.walkElement(el, (node) => {
        if (this.isDropdown(node)) {
          this.enqueueDropdownPreload(node);
        }
      });
    }
  }

  private enqueueDropdownPreload(element: any): void {
    const field = element?.field;
    if (!field) return;
    if (this.shouldSkipDropdownPreload(element)) {
      return;
    }

    if (this.dropdownPreloadQueuedFields.has(field)) {
      return;
    }

    this.dropdownPreloadQueuedFields.add(field);
    if (this.shouldDeferDropdownPreload(element)) {
      this.dropdownDeferredPreloadQueue.push(element);
      this.scheduleDeferredDropdownPreload();
      return;
    }

    this.dropdownPreloadQueue.push(element);
    this.drainDropdownPreloadQueue();
  }

  private shouldSkipDropdownPreload(element: any): boolean {
    return element?.hidden === true
      || element?.hide === true
      || element?.visible === false
      || element?.preload === false
      || element?.preload_options === false;
  }

  private shouldDeferDropdownPreload(element: any): boolean {
    if (element?.defer_preload === true) return true;

    const field = String(element?.field || '').toLowerCase();
    if (!field) return false;

    return [
      'created_by',
      'modified_by',
      'inactivated_by',
      'deleted_by',
      'users_authorize',
      'tasks'
    ].includes(field);
  }

  private scheduleDeferredDropdownPreload(): void {
    if (this.dropdownDeferredPreloadTimer) return;

    this.dropdownDeferredPreloadTimer = setTimeout(() => {
      this.dropdownDeferredPreloadTimer = null;
      const deferred = this.dropdownDeferredPreloadQueue.splice(0);

      if (deferred.length === 0) return;

      this.dropdownPreloadQueue.push(...deferred);
      this.drainDropdownPreloadQueue();
    }, this.DEFERRED_DROPDOWN_PRELOAD_DELAY_MS);
  }

  private resetDropdownPreloadState(): void {
    this.dropdownPreloadQueue = [];
    this.dropdownDeferredPreloadQueue = [];
    this.dropdownPreloadQueuedFields.clear();
    this.virtualOptionsReadySignal.set({});

    if (this.dropdownDeferredPreloadTimer) {
      clearTimeout(this.dropdownDeferredPreloadTimer);
      this.dropdownDeferredPreloadTimer = null;
    }
  }

  private drainDropdownPreloadQueue(): void {
    const concurrency = this.generalS.isMobileScreen()
      ? this.MOBILE_DROPDOWN_PRELOAD_CONCURRENCY
      : this.DESKTOP_DROPDOWN_PRELOAD_CONCURRENCY;

    while (this.dropdownPreloadActive < concurrency && this.dropdownPreloadQueue.length > 0) {
      const element = this.dropdownPreloadQueue.shift();
      const field = element?.field || '(sin-field)';
      const fieldType = element?.type || '(sin-type)';
      const preloadStart = this.perfNow();

      this.dropdownPreloadActive++;

      void this.dataDropdown(element, false)
        .catch(() => { })
        .finally(() => {
          this.dropdownPreloadActive--;
          this.dropdownPreloadQueuedFields.delete(field);
          this.logPerf('dropdown.preload.finished', preloadStart, {
            field,
            type: fieldType,
            active: this.dropdownPreloadActive,
            queued: this.dropdownPreloadQueue.length
          }, true);
          this.drainDropdownPreloadQueue();
        });
    }
  }
  // ]]]FI

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
            // [[[II ESC:011-01 DOC:docs/documents/2026-06-02_011_custom-draw-form-table-formarray.md#escenario-01
            const formArray = this.getTableFormArray(node.field);
            if (formArray && formArray.length === 0) {
              const defaultValue = node.default?.value || [];
              const initialData = defaultValue.length > 0 ? defaultValue : this.initializeTableData(node);
              this.updateTableFormControl(node.field, initialData, false, node);
            }
            // ]]]FI
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

  // [[[II ESC:017-01 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-01
  private perfNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private logPerf(label: string, start: number, extra: any = {}, force = false): void {
    return;
  }

  private resolveDrawFormByDevice(drawForm: any): any {
    const perfStart = this.perfNow();
    if (!drawForm || typeof drawForm !== 'object') return drawForm;

    const hasMobileBranch = this.isDeviceDrawFormBranch(drawForm.mobile);
    const hasDesktopBranch = this.isDeviceDrawFormBranch(drawForm.desktop);
    const hasDeviceBranches = hasMobileBranch || hasDesktopBranch;
    const isMobileScreen = this.generalS.isMobileScreen();

    const selectedDrawForm = hasDeviceBranches
      ? (isMobileScreen
        ? (hasMobileBranch ? drawForm.mobile : drawForm.desktop)
        : (hasDesktopBranch ? drawForm.desktop : drawForm.mobile))
      : drawForm;

    if (!selectedDrawForm || typeof selectedDrawForm !== 'object') return selectedDrawForm;

    const cacheKey = isMobileScreen ? 'mobile' : 'desktop';
    const cached = this.resolvedDrawFormCache.get(selectedDrawForm)?.[cacheKey];
    if (cached) {
      this.logPerf('resolveDrawFormByDevice.cacheHit', perfStart, { cacheKey, hasDeviceBranches }, true);
      return cached;
    }

    const resolvedDrawForm = isMobileScreen
      ? this.normalizeMobileFieldTypes(selectedDrawForm)
      : selectedDrawForm;
    const cacheValue = this.resolvedDrawFormCache.get(selectedDrawForm) || {};
    cacheValue[cacheKey] = resolvedDrawForm;
    this.resolvedDrawFormCache.set(selectedDrawForm, cacheValue);
    this.logPerf('resolveDrawFormByDevice', perfStart, { cacheKey, hasDeviceBranches }, true);
    return resolvedDrawForm;
  }

  private isDeviceDrawFormBranch(value: any): boolean {
    return !!value
      && typeof value === 'object'
      && (!!value.grid || !!value.stepper);
  }

  private normalizeMobileFieldTypes(drawForm: any): any {
    if (!drawForm || typeof drawForm !== 'object') return drawForm;

    let normalizedDrawForm: any | null = null;

    if (drawForm.grid && typeof drawForm.grid === 'object') {
      const normalizedGrid = this.normalizeFieldCollectionForMobile(drawForm.grid);
      if (normalizedGrid !== drawForm.grid) {
        normalizedDrawForm = { ...drawForm, grid: normalizedGrid };
      }
    }

    const steps = drawForm.stepper?.steps;
    if (steps && typeof steps === 'object') {
      const normalizedSteps = this.normalizeStepperStepsForMobile(steps);
      if (normalizedSteps !== steps) {
        normalizedDrawForm = {
          ...(normalizedDrawForm || drawForm),
          stepper: {
            ...drawForm.stepper,
            steps: normalizedSteps
          }
        };
      }
    }

    return normalizedDrawForm || drawForm;
  }

  private normalizeStepperStepsForMobile(steps: any): any {
    if (!steps || typeof steps !== 'object') return steps;

    let nextSteps: any = null;

    Object.keys(steps).forEach(stepKey => {
      const step = steps[stepKey];
      if (!step || typeof step !== 'object') return;

      const normalizedFields = this.normalizeFieldCollectionForMobile(step.fields);
      if (normalizedFields === step.fields) return;

      if (!nextSteps) {
        nextSteps = Array.isArray(steps) ? [...steps] : { ...steps };
      }
      nextSteps[stepKey] = {
        ...step,
        fields: normalizedFields
      };
    });

    return nextSteps || steps;
  }

  private normalizeFieldCollectionForMobile(collection: any): any {
    if (!collection || typeof collection !== 'object') return collection;

    if (Array.isArray(collection)) {
      let normalizedArray: any[] | null = null;
      collection.forEach((fieldConfig: any, index: number) => {
        const normalizedField = this.normalizeFieldConfigForMobile(fieldConfig);
        if (normalizedField === fieldConfig) {
          if (normalizedArray) normalizedArray.push(fieldConfig);
          return;
        }
        if (!normalizedArray) {
          normalizedArray = collection.slice(0, index);
        }
        normalizedArray.push(normalizedField);
      });
      return normalizedArray || collection;
    }

    let normalizedCollection: any | null = null;
    Object.keys(collection).forEach(key => {
      const fieldConfig = collection[key];
      const normalizedField = this.normalizeFieldConfigForMobile(fieldConfig);
      if (normalizedField === fieldConfig) return;
      if (!normalizedCollection) {
        normalizedCollection = { ...collection };
      }
      normalizedCollection[key] = normalizedField;
    });

    return normalizedCollection || collection;
  }

  private normalizeFieldConfigForMobile(fieldConfig: any): any {
    if (!fieldConfig || typeof fieldConfig !== 'object') return fieldConfig;

    let normalizedField: any | null = null;
    const setNormalizedValue = (key: string, value: any): void => {
      if (!normalizedField) normalizedField = { ...fieldConfig };
      normalizedField[key] = value;
    };
    const mobileType = typeof fieldConfig.type_mobile === 'string'
      ? fieldConfig.type_mobile.trim()
      : fieldConfig.type_mobile;

    if (mobileType !== undefined && mobileType !== null && mobileType !== '' && fieldConfig.type !== mobileType) {
      setNormalizedValue('type', mobileType);
    }

    if (fieldConfig.card && typeof fieldConfig.card === 'object') {
      const normalizedCard = this.normalizeFieldCollectionForMobile(fieldConfig.card);
      if (normalizedCard !== fieldConfig.card) setNormalizedValue('card', normalizedCard);
    }

    if (fieldConfig.fieldset && typeof fieldConfig.fieldset === 'object') {
      const normalizedFieldset = this.normalizeFieldCollectionForMobile(fieldConfig.fieldset);
      if (normalizedFieldset !== fieldConfig.fieldset) setNormalizedValue('fieldset', normalizedFieldset);
    }

    if (fieldConfig.fields && typeof fieldConfig.fields === 'object') {
      const normalizedFields = this.normalizeFieldCollectionForMobile(fieldConfig.fields);
      if (normalizedFields !== fieldConfig.fields) setNormalizedValue('fields', normalizedFields);
    }

    if (Array.isArray(fieldConfig.columns)) {
      const normalizedColumns = this.normalizeFieldCollectionForMobile(fieldConfig.columns);
      if (normalizedColumns !== fieldConfig.columns) setNormalizedValue('columns', normalizedColumns);
    }

    if (fieldConfig.panel?.fields && typeof fieldConfig.panel.fields === 'object') {
      const normalizedPanelFields = this.normalizeFieldCollectionForMobile(fieldConfig.panel.fields);
      if (normalizedPanelFields !== fieldConfig.panel.fields) {
        setNormalizedValue('panel', {
          ...fieldConfig.panel,
          fields: normalizedPanelFields
        });
      }
    }

    if (fieldConfig.children?.fields && typeof fieldConfig.children.fields === 'object') {
      const normalizedChildren = this.normalizeChildrenFieldsForMobile(fieldConfig.children);
      if (normalizedChildren !== fieldConfig.children) setNormalizedValue('children', normalizedChildren);
    }

    return normalizedField || fieldConfig;
  }

  private normalizeChildrenFieldsForMobile(children: any): any {
    const fields = children.fields || {};
    let normalizedFields: any | null = null;
    let normalizedByGroup = false;

    ['static', 'dynamic', 'derived'].forEach(groupKey => {
      if (fields[groupKey] && typeof fields[groupKey] === 'object') {
        const normalizedGroup = this.normalizeFieldCollectionForMobile(fields[groupKey]);
        if (normalizedGroup !== fields[groupKey]) {
          if (!normalizedFields) normalizedFields = { ...fields };
          normalizedFields[groupKey] = normalizedGroup;
        }
        normalizedByGroup = true;
      }
    });

    if (!normalizedByGroup) {
      normalizedFields = this.normalizeFieldCollectionForMobile(fields);
    }

    return normalizedFields && normalizedFields !== fields
      ? { ...children, fields: normalizedFields }
      : children;
  }
  // ]]]FI

  // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
  ngOnInit(): void {
    this.messageSubscription = this.messageS.currentMessage.subscribe((msg: any) => {
      this.fileSplitButtonServerErrorFields = this.extractErrorFieldsFromMessage(msg);
      this.refreshFileSplitButtonInvalidState();
    });
  }
  // ]]]FI

  // [[[II ESC:008-01 DOC:docs/documents/2026-06-02_008_custom-draw-form-ngonchanges-signals.md#escenario-01 ESC:017-01 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-01 ESC:007-06 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-06 ESC:007-07 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-07 ESC:001-08 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-08 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
  ngOnChanges(changes: SimpleChanges) {
    const perfStart = this.perfNow();
    this.syncInputSignals(changes);

    this.handlingDrawFormChange = !!changes['drawForm'];

    try {
      if (changes['formGroup']) {
        this.handleFormGroupChange(changes['formGroup']);
      }

      if (changes['drawForm']) {
        this.handleDrawFormChange(this.drawFormSignal());
      }

      if (changes['formGroup'] || changes['drawForm'] || changes['type'] || /*changes['tabPanel'] ||*/ changes['isCreate']) {
        this.initFormAutoCache();
      }
    } finally {
      this.handlingDrawFormChange = false;
      this.logPerf('ngOnChanges', perfStart, { changes: Object.keys(changes) }, !!changes['drawForm']);
    }
  }

  private syncInputSignals(changes: SimpleChanges): void {
    if (changes['type']) {
      this.typeSignal.set(changes['type'].currentValue);
    }
    if (changes['tabPanel']) {
      this.tabPanelSignal.set(changes['tabPanel'].currentValue);
    }
    if (changes['isCreate']) {
      this.isCreateSignal.set(changes['isCreate'].currentValue);
    }
    if (changes['formGroup']) {
      this.formGroupSignal.set(changes['formGroup'].currentValue);
    }
    if (changes['drawForm']) {
      this.drawFormSignal.set(this.resolveDrawFormByDevice(changes['drawForm'].currentValue));
    }
  }

  private handleFormGroupChange(change: SimpleChange): void {
    const previousValue = change.previousValue;
    const currentValue = change.currentValue;

    // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
    if (previousValue !== currentValue) {
      this.fileSplitButtonServerErrorFields.clear();
    }
    // ]]]FI

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
    // se popule con las claves object_ correctas (dropdown, dropdown-choice, multi-select, multi-choice, etc.).
    if (!previousValue && currentValue && !this.handlingDrawFormChange) {
      const _dform = this.drawFormSignal();
      if (_dform) {
        this.dropdownOptions(_dform);
      }
    }

    if (currentValue) {
      this.normalizeListboxControlValues(this.drawFormSignal(), currentValue, true);
      this.childRuntimePreviousValue = currentValue.getRawValue();
      this.formSubscription = currentValue.valueChanges.subscribe(() => {
        this.normalizeListboxControlValues();
        this._refreshDependentChildren();
        // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
        this.fileSplitButtonServerErrorFields.clear();
        this.refreshFileSplitButtonInvalidState();
        // ]]]FI
      });
      // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
      this.rebuildFileSplitButtonValidationTargets(this.drawFormSignal(), currentValue);
      // ]]]FI
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
      this.wasDirty = currentValue.dirty;

      // Suscribirse al estado del formulario (pristine/dirty)
      this.formStatusSubscription = currentValue.statusChanges.subscribe(() => {
        // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
        this.refreshFileSplitButtonInvalidState();
        // ]]]FI
        const isPristine = currentValue.pristine;
        const isDirty = currentValue.dirty;

        if (this.isDiscardingCacheData) {
          this.wasDirty = isDirty;
          return;
        }

        // Detectar reset: el formulario estaba dirty y ahora es pristine
        if (this.wasDirty && isPristine) {
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

  private handleDrawFormChange(drawForm: any): void {
    const perfStart = this.perfNow();
    this._fileMenuCache = {};
    // [[[II ESC:030-05 El layout cambio: invalidar el registry de foco. ]]]FI
    this._clearFocusTargetCache();
    this.resetDropdownPreloadState();
    this.rebuildSelectionLimitState(drawForm);

    let stepStart = this.perfNow();
    this.dropdownOptions(drawForm);
    this.logPerf('handleDrawFormChange.dropdownOptions', stepStart);

    this.normalizeListboxControlValues(drawForm, this.formGroupSignal(), true);

    // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
    this.rebuildFileSplitButtonValidationTargets(drawForm, this.formGroupSignal());
    // ]]]FI

    stepStart = this.perfNow();
    this.initializeTableFields(drawForm);
    this.logPerf('handleDrawFormChange.initializeTableFields', stepStart);

    stepStart = this.perfNow();
    this.initializeSignatureFields(drawForm);
    this.logPerf('handleDrawFormChange.initializeSignatureFields', stepStart);

    stepStart = this.perfNow();
    this.initializeEmailChipsFields(drawForm);
    this.logPerf('handleDrawFormChange.initializeEmailChipsFields', stepStart);

    // Recuperar captura de cámara pendiente si Android mató la Activity
    this._checkPendingSafeCapture();

    // Inicializar el step actual si hay un stepper
    if (drawForm?.stepper) {
      const initialStep = drawForm.stepper.value || 1;
      this.setCurrentStep(initialStep);
    } else {
      // Si no hay stepper, usar null para mostrar toda la multimedia
      this.setCurrentStep(null);
    }

    this.logPerf('handleDrawFormChange.total', perfStart, {
      hasGrid: !!drawForm?.grid,
      hasStepper: !!drawForm?.stepper
    }, true);
  }

  private normalizeListboxControlValues(drawForm = this.drawFormSignal(), formGroup = this.formGroupSignal(), enforceSelectionLimits = false): void {
    if (!drawForm || !formGroup) return;

    const normalizeNode = (node: any): void => {
      if (!node?.field) return;

      const control = formGroup.get(node.field);
      if (!control) return;

      const value = control.value;
      const limit = this.getSelectionLimit(node);

      if (this.ARRAY_SELECTION_TYPES.has(node?.type)) {
        const arrayValue = Array.isArray(value)
          ? value
          : (value === null || value === undefined || value === '' ? [] : [value]);
        const nextValue = enforceSelectionLimits && limit !== null
          ? this.limitSelectionArrayValue(node, arrayValue, limit)
          : arrayValue;

        if (nextValue !== value) {
          control.setValue(nextValue, { emitEvent: false });
        }
        return;
      }

      if (node?.type !== 'listbox') {
        if (enforceSelectionLimits && limit !== null && Array.isArray(value)) {
          const limitedValue = this.limitSelectionArrayValue(node, value, limit);
          if (limitedValue !== value) {
            control.setValue(limitedValue, { emitEvent: false });
          }
        }
        return;
      }

      if (limit === 1) {
        const nextValue = Array.isArray(value) ? (value[0] ?? null) : value;
        if (nextValue !== value) {
          control.setValue(nextValue, { emitEvent: false });
        }
        return;
      }

      if (Array.isArray(value)) {
        if (enforceSelectionLimits && limit !== null && value.length > limit) {
          control.setValue(value.slice(0, limit), { emitEvent: false });
        }
        return;
      }

      const nextValue = value === null || value === undefined || value === '' ? [] : [value];
      control.setValue(nextValue, { emitEvent: false });
    };

    this.scanDrawFormFields(drawForm, normalizeNode);
  }

  private rebuildSelectionLimitState(drawForm = this.drawFormSignal()): void {
    const multipleByField: Record<string, boolean> = {};

    this.scanDrawFormFields(drawForm, (node: any): void => {
      if (node?.type !== 'listbox' || !node?.field) return;
      multipleByField[node.field] = this.getSelectionLimit(node) !== 1;
    });

    this.selectionMultipleSignal.set(multipleByField);
  }

  private scanDrawFormFields(drawForm: any, visit: (node: any) => void): void {
    if (!drawForm || typeof drawForm !== 'object') return;

    const scanCollection = (collection: any): void => {
      if (!collection || typeof collection !== 'object') return;

      for (const element of Object.values(collection)) {
        this.walkElement(element, visit);
      }
    };

    scanCollection(drawForm.grid);

    const steps = drawForm.stepper?.steps;
    if (steps && typeof steps === 'object') {
      for (const step of Object.values(steps)) {
        scanCollection((step as any)?.fields);
      }
    }
  }

  private getSelectionLimit(fieldConfig: any): number | null {
    if (!this.SELECTION_LIMIT_TYPES.has(fieldConfig?.type)) return null;

    const rawLimit = fieldConfig?.selection_limit;
    if (rawLimit === null || rawLimit === undefined || rawLimit === '') return null;

    const limit = Number(rawLimit);
    if (!Number.isFinite(limit) || limit <= 0) return null;

    return Math.floor(limit);
  }
  // ]]]FI

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
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.cacheAutoSaveSub) {
      this.cacheAutoSaveSub.unsubscribe();
    }
    this.resetDropdownPreloadState();
    // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
    this.releaseAllPreviewUrls();
    // ]]]FI
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
    const initVersion = ++this.formCacheInitVersion;
    const perfStart = this.perfNow();
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
    this.currentCacheKey = null;
    this.currentCacheConfig = null;

    if (!formGroup || !drawForm) {
      this.logPerf('formCache.init.skip', perfStart, { reason: 'missing formGroup/drawForm' });
      return;
    }

    // Escanear los campos del drawForm para obtener cuáles tienen caché habilitado
    const cacheConfigStart = this.perfNow();
    const cacheConfig = this.formCacheS.getCacheConfig(drawForm);
    this.logPerf('formCache.getCacheConfig', cacheConfigStart);
    if (!cacheConfig) {
      this.logPerf('formCache.init.skip', perfStart, { reason: 'no cache config' });
      return;
    }

    // Seleccionar qué campos aplican según el modo actual
    const cacheableFields = this.isCreateSignal()
      ? cacheConfig.creationFields
      : cacheConfig.editionFields;

    if (cacheableFields.length === 0) {
      this.logPerf('formCache.init.skip', perfStart, { reason: 'no cacheable fields' });
      return;
    }

    // Construir clave única por usuario + app + tabPanel
    const key = this.formCacheS.getKey(
      this.getCacheUserKey(),
      type || 'default',
      this.tabPanelSignal() || /*this.tabPanel ||*/ 'default'
    );

    this.currentCacheKey = key;
    this.currentCacheConfig = cacheConfig;

    // ── Restaurar borrador si existe ────────────────
    // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
    if (this.isCreateSignal() && !this.discardedCacheKeys.has(key)) {
      const loadStart = this.perfNow();
      const cached = await this.formCacheS.load(key);
      if (initVersion !== this.formCacheInitVersion) {
        this.logPerf('formCache.init.aborted', perfStart, { key, reason: 'stale load' }, true);
        return;
      }
      this.logPerf('formCache.load', loadStart, { key, found: !!cached }, true);
      if (cached) {
        // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
        const restoredCache = this.stripOmittedBase64FromCachedPayload(cached);
        if (this.hasRestorableCachePayload(restoredCache)) {
          const patchStart = this.perfNow();
          formGroup.patchValue(restoredCache, { emitEvent: false });
          this.normalizeListboxControlValues(drawForm, formGroup, true);
          this.logPerf('formCache.patchRestoredDraft', patchStart, { fields: Object.keys(restoredCache || {}).length }, true);
          formGroup.markAsDirty();
          this.wasDirty = true;
          this.isCacheRestored.set(true);
          // files64Signal no se restaura con patchValue (es solo memoria);
          // reconstruirlo a partir de los valores de tipo archivo del formulario
          const restoreFilesStart = this.perfNow();
          this.restoreFiles64FromCache(formGroup);
          this.logPerf('formCache.restoreFiles64FromCache', restoreFilesStart);
        } else {
          await this.formCacheS.clear(key);
          this.isCacheRestored.set(false);
        }
        // ]]]FI
      }
    } else if (this.isCreateSignal()) {
      this.isCacheRestored.set(false);
      this.logPerf('formCache.load.skipDiscarded', perfStart, { key }, true);
    }
    // ]]]FI

    if (initVersion !== this.formCacheInitVersion) {
      this.logPerf('formCache.init.aborted', perfStart, { key, reason: 'stale before subscribe' }, true);
      return;
    }

    // ── Autoguardado con debounce — solo campos permitidos ───────────
    this.cacheAutoSaveSub = formGroup.valueChanges
      .pipe(debounceTime(1500))
      .subscribe((value) => {
        if (!this.currentCacheKey || !this.currentCacheConfig) return;
        const saveStart = this.perfNow();
        // Filtrar solo los campos que tienen caché habilitado para evitar guardar datos sensibles
        const fields = this.isCreateSignal()
          ? this.currentCacheConfig.creationFields
          : this.currentCacheConfig.editionFields;
        // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
        const filtered = this.buildFormCachePayload(value, fields);
        // ]]]FI
        const keyToSave = this.currentCacheKey;
        const configToSave = this.currentCacheConfig;
        void this.formCacheS.save(keyToSave, filtered, configToSave).then(() => {
          // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
          this.discardedCacheKeys.delete(keyToSave);
          // ]]]FI
          this.logPerf('formCache.autoSave', saveStart, {
            key: keyToSave,
            fields: Object.keys(filtered).length
          }, true);
        });
      });

    this.logPerf('formCache.init.total', perfStart, {
      key,
      creationFields: cacheConfig.creationFields.length,
      editionFields: cacheConfig.editionFields.length
    }, true);
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
    // [[[II ESC:014-02 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-02
    const seen = new Set<string>();
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
          item.file !== this.OMITTED_BASE64_CACHE_VALUE &&
          !item._cache_omitted_base64 &&
          (item.type === 'image' || item.type === 'video') &&
          controlName === (item.send_field || item.field)
        ) {
          const identity = this.buildFileIdentity({
            field: item.send_field || item.field,
            key: item.key,
            file_name: item.file_name,
            file: item.file,
            size: item._file_size,
            hash: item._file_hash,
            timestamp: item._file_timestamp
          });
          const normalizedItem = {
            ...item,
            send_field: item.send_field || item.field,
            local_field: item.local_field || item.key || item.field,
            _file_size: identity.size,
            _file_hash: identity.hash,
            _file_timestamp: identity.timestamp
          };
          const dedupKey = this.fileDedupKey(normalizedItem);
          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);
          restoredFiles.push(this.buildPreviewFileObject(normalizedItem, normalizedItem.local_field));
        }
      }
    });

    this.setFiles64(restoredFiles);
    // ]]]FI
  }

  /**
   * Elimina el borrador en caché y apaga el indicador de recuperación.
   * La clave activa se limpia para que un reset no reprograme el borrador descartado.
   */
  private async clearFormCache(): Promise<void> {
    this.formCacheInitVersion++;
    const clearStart = this.perfNow();
    const keyToClear = this.currentCacheKey;
    if (keyToClear) {
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      this.discardedCacheKeys.add(keyToClear);
      // ]]]FI
      await this.formCacheS.clear(keyToClear);
    }
    this.currentCacheKey = null;
    this.currentCacheConfig = null;
    this.isCacheRestored.set(false);
    this.logPerf('formCache.clear', clearStart, { key: keyToClear }, true);
  }

  /**
   * Guarda el formulario en caché de forma inmediata (sin debounce).
   * Se usa después de capturar multimedia para que si Android mata la Activity,
   * la foto ya esté persistida y se restaure automáticamente al volver.
   */
  private _saveFormCacheNow(): void {
    const formGroup = this.formGroupSignal();
    if (!formGroup || !this.currentCacheKey || !this.currentCacheConfig) return;
    const saveStart = this.perfNow();
    const value = formGroup.value;
    const fields = this.isCreateSignal()
      ? this.currentCacheConfig.creationFields
      : this.currentCacheConfig.editionFields;
    // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
    const filtered = this.buildFormCachePayload(value, fields);
    // ]]]FI
    const keyToSave = this.currentCacheKey;
    const configToSave = this.currentCacheConfig;
    void this.formCacheS.save(keyToSave, filtered, configToSave).then(() => {
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      this.discardedCacheKeys.delete(keyToSave);
      // ]]]FI
      this.logPerf('formCache.saveNow', saveStart, {
        key: keyToSave,
        fields: Object.keys(filtered).length
      }, true);
    });
  }

  /**
   * Descarta el borrador y limpia el formulario.
   * Llamado desde el botón "Descartar borrador" en el template.
   */
  async discardCacheData(): Promise<void> {
    const discardStart = this.perfNow();
    this.isDiscardingCacheData = true;

    if (this.cacheAutoSaveSub) {
      this.cacheAutoSaveSub.unsubscribe();
      this.cacheAutoSaveSub = undefined;
    }

    try {
      await this.clearFormCache();
      const formGroup = this.formGroupSignal();
      formGroup?.reset(undefined, { emitEvent: false });
      formGroup?.markAsPristine();
      formGroup?.markAsUntouched();
      this.wasDirty = false;
      this.clearAllMediaFiles();
      this.clearAllSignatureCanvases();
    } finally {
      this.isDiscardingCacheData = false;
      await this.initFormAutoCache();
      this.logPerf('formCache.discardCacheData', discardStart, {}, true);
    }
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
    // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
    this.refreshFileSplitButtonInvalidState();
    // ]]]FI
    return allValid;
  }

  keyComparator(a: KeyValue<number, any>, b: KeyValue<number, any>): number {
    return a.key - b.key;
  }

  // [[[II ESC:009-01 DOC:docs/documents/2026-06-02_009_custom-draw-form-trackby-ngfor.md#escenario-01
  trackByIndex(index: number): number {
    return index;
  }

  trackByField(index: number, item: any): any {
    return item?.field ?? item?.id ?? index;
  }

  trackByKey(index: number, item: KeyValue<unknown, unknown>): any {
    const value = item?.value as any;
    return value?.field ?? value?.id ?? item?.key ?? index;
  }

  // [[[II ESC:030-14 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-14
  // El panel de sugerencias es lectura de datos: respeta la configuración
  // decimal de CADA columna, igual que p-inputNumber, sin afectar valores. ]]]FI
  formatSuggestionValue(value: any, panelField: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const numericConfig = panelField?.type === 'input-number'
      || panelField?.min_fraction_digits !== undefined
      || panelField?.max_fraction_digits !== undefined
      || panelField?.mode === 'currency';
    if (!numericConfig || !Number.isFinite(Number(value))) return String(value);

    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: panelField?.min_fraction_digits ?? 0,
      maximumFractionDigits: panelField?.max_fraction_digits ?? Math.max(panelField?.min_fraction_digits ?? 0, 2),
    };
    if (panelField?.mode === 'currency' && panelField?.currency) {
      options.style = 'currency';
      options.currency = panelField.currency;
    }
    const formatted = new Intl.NumberFormat(panelField?.locale || undefined, options).format(Number(value));
    return `${panelField?.prefix || ''}${formatted}${panelField?.suffix || ''}`;
  }

  // [[[II ESC:030-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-15
  // `panel.active` decide si se usa el panel compuesto; sin él la sugerencia
  // conserva la etiqueta declarada por `option_label`, sin asumir un campo. ]]]FI
  optionLabelText(option: any, fieldConfig: any): string {
    return this.generalS.formatDynamicValue(option, fieldConfig);
  }

  trackByColumnField(index: number, column: any): any {
    return column?.field ?? column?.id ?? index;
  }

  trackByFile(index: number, file: any): any {
    if (file?.id) return file.id;
    if (file?.field) return `${file.field}:${file.file_name ?? file.name ?? 'file'}:${index}`;
    return file?.file_name ?? file?.name ?? index;
  }

  trackBySignature(index: number, signature: any): any {
    return signature?.field ?? signature?.id ?? signature?.signature_id ?? signature?.created_at ?? index;
  }
  // ]]]FI

  public suggestions = signal<any[]>([]);

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  // Contrato de búsqueda por CONFIGURACIÓN, compartido con las celdas: para
  // parcial `smart_search` decide entre filter[search] y field.icontains;
  // `min_search_length` es sólo umbral de consulta (no un validador del dato).
  // Ningún campo es especial por su nombre. ]]]FI

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  private _autoCompleteSearchMode(config: any): 'exact' | 'partial' {
    return config?.search_mode === 'exact' ? 'exact' : 'partial';
  }

  /**
   * `search_key` ausente conserva una interacción explícita segura: Enter.
   * En exacto, un valor vacío no puede habilitar búsqueda automática: cae en
   * Enter, pero una tecla explícita (F3/Tab/flechas) se conserva.
   */
  private _autoCompleteSearchKeys(config: any): Set<string> {
    if (!Object.prototype.hasOwnProperty.call(config || {}, 'search_key')) return new Set(['enter']);
    const raw = config?.search_key;
    if (typeof raw !== 'string') return new Set(['enter']);
    if (raw.trim() === '') return this._autoCompleteSearchMode(config) === 'exact'
      ? new Set(['enter'])
      : new Set<string>();
    return new Set(raw.split(',').map((key: string) => key.trim().toLowerCase()).filter((key: string) => !!key));
  }

  private _autoCompleteSearchesOnType(config: any): boolean {
    return this._autoCompleteSearchKeys(config).size === 0;
  }

  // El servidor exige >= 5 caracteres en `filter[search]`; el mismo piso se
  // aplica a toda búsqueda parcial, incluso la dirigida por el nombre de campo.
  private readonly SEARCH_MIN_CHARS = 5;

  /** Umbral de consulta parcial; nunca usa `min_length` de validación del dato. */
  autoCompleteMinLength(config: any): number {
    if (this._autoCompleteSearchMode(config) === 'exact') return 0;
    return Math.max(this.SEARCH_MIN_CHARS, Number(config?.min_search_length) || 0);
  }

  /** Filtro genérico: el campo declara si usa búsqueda global o su propio nombre. */
  private _searchFilterFor(config: any, query: string): string {
    const q = encodeURIComponent(query);
    const field = typeof config?.field === 'string' ? config.field.trim() : '';
    let fallbackFilter = '';
    if (this._autoCompleteSearchMode(config) === 'exact') {
      fallbackFilter = field ? `filter[${field}.iexact]=${q}` : '';
    } else if (config?.smart_search === true) {
      fallbackFilter = `filter[search]=${q}`;
    } else {
      fallbackFilter = field ? `filter[${field}.icontains]=${q}` : `filter[search]=${q}`;
    }
    // [[[II ESC:030-17 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-17
    // `data_type.filter` decide el atributo remoto sin acoplar el control a
    // una relación concreta. Sin binding declarativo conserva el perfil previo.
    return this.crudS.buildConfiguredSearchFilter(config?.data_type?.filter, query, fallbackFilter);
    // ]]]FI
  }
  // ]]]FI

  /** Panel suprimido mientras no haya una búsqueda real (evita "No hay resultados"). */
  public autoCompletePanelSuppressed = signal<boolean>(false);
  // Token de la última búsqueda por campo: descarta respuestas que llegan tarde
  // (evita que una respuesta vieja pise a la nueva — "a veces no encuentra").
  private _autoCompleteSearchToken: { [field: string]: number } = {};

  showAutoCompleteEmptyMessage(config: any): boolean {
    return config?.show_empty_message !== false && !this.autoCompletePanelSuppressed();
  }

  completeMethod(event: any, entry: any) {
    const query = (event?.query ?? '').toString();
    // [[[II ESC:030-16 ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
    if (this._autoCompleteSearchMode(entry) === 'exact') {
      // Exacto sólo se consulta con Enter: ni al escribir ni con el botón
      // dropdown se abre el panel de sugerencias. Tampoco se desvincula la
      // relación mientras se escribe: el resultado de Enter decide si cambia.
      this.autoCompletePanelSuppressed.set(true);
      this.suggestions.set([]);
      return;
    }
    // ]]]FI
    // [[[II ESC:001-16 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-16
    this._clearAutoCompleteSelectionIfManual(entry, query);
    // ]]]FI
    // Petición del botón `dropdown` (query vacío): siempre permitida.
    const isDropdownRequest = query.trim() === '';
    if (!isDropdownRequest) {
      const minLength = this.autoCompleteMinLength(entry);
      if (!this._autoCompleteSearchesOnType(entry) || (minLength > 0 && query.length < minLength)) {
        // La config exige tecla (o faltan caracteres): sin búsqueda y sin panel.
        this.autoCompletePanelSuppressed.set(true);
        this.suggestions.set([]);
        return;
      }
    }
    this.autoCompletePanelSuppressed.set(false);
    // Escritura parcial no auto-selecciona: conserva el panel para elegir.
    this._runAutoCompleteSearch(entry, query);
  }

  /**
   * Ejecuta la búsqueda del autocomplete del formulario. Con
   * `search_mode: 'exact'` una coincidencia exacta ÚNICA se selecciona sin
   * desplegar el panel; en otro caso se publican las sugerencias. Descarta
   * respuestas obsoletas (guard por token) y ante error deja el panel vacío sin
   * perder el texto escrito.
   */
  private _runAutoCompleteSearch(entry: any, query: string, options: { advanceOnNoMatch?: boolean; autoApplyUnique?: boolean } = {}): void {
    const { advanceOnNoMatch = false, autoApplyUnique = false } = options;
    const filter = this._searchFilterFor(entry, query);
    const include = entry.include;
    const _dt = entry?.data_type ?? {};
    const app = this.crudS.getAppType(_dt?.type)?.app;
    const type = this.crudS.getAppType(_dt?.type)?.type;

    const field = entry?.field;
    const token = (this._autoCompleteSearchToken[field] = (this._autoCompleteSearchToken[field] || 0) + 1);
    const isStale = () => this._autoCompleteSearchToken[field] !== token;

    this.crudS.getObject({ app, type, filter, include }).subscribe({
      next: (resp: any) => {
        if (isStale()) return; // llegó una búsqueda más nueva: se ignora esta
        let data = this.generalS.DJAtoObject({
          respDJA: resp,
          fields: { [entry.field]: entry }
        });
        // [[[II ESC:001-16 ESC:030-06 Enriquecimiento `<rel>_data_<attr>` en
        // GeneralService (fuente única compartida con las celdas). ]]]FI
        data = this.generalS.enrichSuggestionRelationData(data, resp, entry);

        // Coincidencia exacta ÚNICA => se selecciona sin mostrar el panel — SOLO
        // cuando se pidió (exacto/tecla), nunca durante escritura parcial. La
        // comparación usa el `option_label` declarado (soporta concatenación).
        const target = (query || '').trim().toLowerCase();
        const exactMatches = target
          ? data.filter((row: any) => {
            const label = this.generalS.formatDynamicValue(row, entry);
            return typeof label === 'string' && label.trim().toLowerCase() === target;
          })
          : [];

        if (autoApplyUnique && target && exactMatches.length === 1) {
          this.suggestions.set([]);
          this.onSelectAutoComplete({ value: exactMatches[0] }, entry);
          return;
        }

        // [[[II ESC:030-16 ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
        if (this._autoCompleteSearchMode(entry) === 'exact') {
          // Enter confirmó que el texto no identifica una relación. Se limpian
          // todos los buscadores hermanos de esa relación y se restablecen los
          // derivados AHORA; esperar otro valueChanges exigía un segundo intento.
          this._clearAutoCompleteSelectionIfManual(entry, query, true);
          this._processChildrenFields(entry.field, query, entry, null, 0, 'selection');
          // El modo exacto nunca publica opciones: la única coincidencia se
          // aplica arriba y las restantes se mantienen como texto libre.
          this.autoCompletePanelSuppressed.set(true);
          this.suggestions.set([]);
          if (advanceOnNoMatch) this.applyFocusAfterSelect(entry);
          return;
        }
        // ]]]FI

        this.autoCompletePanelSuppressed.set(false);
        this.suggestions.set(data);

        // Búsqueda por tecla sin selección: el texto libre se CONSERVA (no se
        // resetea) y, si se pidió, se avanza el foco (free_or_relationship).
        if (advanceOnNoMatch) this.applyFocusAfterSelect(entry);
      },
      // Error (p.ej. 400): sin sugerencias, pero se conserva el texto escrito.
      error: () => {
        if (isStale()) return;
        this.suggestions.set([]);
        if (advanceOnNoMatch) this.applyFocusAfterSelect(entry);
      }
    });
  }

  // [[[II ESC:001-16 ESC:030-06 El enriquecimiento de sugerencias `<rel>_data_<attr>`
  // se movió a GeneralService.enrichSuggestionRelationData (fuente única reutilizada
  // por el form dinámico y las celdas de tabla derivada). Ver general.service.ts. ]]]FI

  // [[[II ESC:001-15 ESC:030-20 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-15 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  private _isFreeOrRelationshipAutoComplete(config: any): boolean {
    return config?.type === 'auto-complete'
      && (config?.free_or_relationship === true || config?.save_mode === 'free_or_relationship')
      && typeof config?.relationship_field === 'string'
      && config.relationship_field.trim() !== '';
  }

  private _extractAutoCompleteSelectedValue(event: any): any {
    return event?.value ?? event?.item ?? event?.event ?? event;
  }

  private _autoCompleteObjectFieldName(fieldName: string): string {
    return `__autocomplete_object_${fieldName}`;
  }

  private _ensureAutoCompleteSelectionControl(config: any): FormControl | null {
    const formGroup = this.formGroupSignal();
    const fieldName = config?.field;
    if (!formGroup || typeof fieldName !== 'string' || fieldName.trim() === '') return null;

    const objectFieldName = this._autoCompleteObjectFieldName(fieldName);
    let control = formGroup.get(objectFieldName) as FormControl | null;
    if (!control) {
      control = new FormControl(null);
      formGroup.addControl(objectFieldName, control);
      control.disable({ emitEvent: false });
    }
    return control;
  }

  private _autoCompleteDisplayValue(selectedValue: any, config: any): string {
    if (!selectedValue || typeof selectedValue !== 'object' || Array.isArray(selectedValue)) return '';
    return this.generalS.formatDynamicValue(selectedValue, config);
  }

  private _clearAutoCompleteSelectionIfManual(
    config: any,
    rawValue?: any,
    confirmedNoMatch: boolean = false,
  ): boolean {
    if (!this._isFreeOrRelationshipAutoComplete(config)) return false;

    const form = this.formGroupSignal();
    const fieldName = config.field;
    const relationField = config.relationship_field.trim();
    const selectedControl = form?.get(this._autoCompleteObjectFieldName(fieldName));
    const selectedValue = selectedControl?.value;

    // Un no-match confirmado por Enter invalida la relación completa, no sólo
    // el buscador donde se escribió. Si otro autocomplete hermano conserva su
    // objeto anterior, el guardado volvería a reconstruir la relación eliminada.
    if (confirmedNoMatch) {
      this.scanDrawFormFields(this.drawFormSignal(), (fieldConfig: any) => {
        if (!this._isFreeOrRelationshipAutoComplete(fieldConfig)) return;
        if (fieldConfig.relationship_field.trim() !== relationField) return;
        form?.get(this._autoCompleteObjectFieldName(fieldConfig.field))
          ?.setValue(null, { emitEvent: false });
      });
      form?.get(relationField)?.setValue(null);
      return true;
    }

    if (!selectedValue || typeof selectedValue !== 'object' || Array.isArray(selectedValue)) return false;

    const currentValue = rawValue ?? form?.get(fieldName)?.value;
    if (typeof currentValue !== 'string') return false;

    const selectedDisplay = this._autoCompleteDisplayValue(selectedValue, config);
    if (currentValue.trim() === selectedDisplay.trim()) return false;

    selectedControl?.setValue(null, { emitEvent: false });
    form?.get(relationField)?.setValue(null);
    return true;
  }

  private _syncAutoCompleteRelationshipField(config: any, selectedValue: any): void {
    if (!this._isFreeOrRelationshipAutoComplete(config)) return;
    if (!selectedValue || typeof selectedValue !== 'object' || Array.isArray(selectedValue)) return;

    const relationField = config.relationship_field.trim();
    const relationControl = this.formGroupSignal()?.get(relationField);
    if (!relationControl) return;

    this._ensureAutoCompleteSelectionControl(config)?.setValue(selectedValue, { emitEvent: false });
    const relationId = selectedValue?.id ?? selectedValue?.data?.id ?? selectedValue?.value ?? null;
    relationControl.setValue(relationId, { emitEvent: false });

    const displayValue = this._autoCompleteDisplayValue(selectedValue, config);
    if (displayValue) {
      this.formGroupSignal()?.get(config.field)?.setValue(displayValue, { emitEvent: false });
    }
  }
  // ]]]FI


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

  // [[[II ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01
  /**
   * Motor común para `filter`, `activate` y `requested`. Resuelve primero la
   * fuente declarada y después compara contra `value` o `values`; en filtros
   * de opciones `candidate` reemplaza el lado izquierdo de la comparación.
   */
  private _evaluateOperator(operator: string, target: any, expected: any[] = []): boolean {
    const values = Array.isArray(expected) ? expected : [expected];
    const isEmpty = (value: any) => value === null || value === undefined || value === ''
      || (Array.isArray(value) && value.length === 0)
      || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value || {}).length === 0);
    const equals = (left: any, right: any) => left === right || String(left) === String(right);
    const toNumber = (value: any): number | null => {
      if (isEmpty(value)) return null;
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    };

    switch (operator) {
      case 'equals': return values.some((value: any) => equals(target, value));
      case 'not_equals': return values.every((value: any) => !equals(target, value));
      case 'in': return values.some((value: any) => equals(target, value));
      case 'not_in': return values.every((value: any) => !equals(target, value));
      case 'greater_than': {
        const left = toNumber(target);
        return left !== null && values.some((value: any) => {
          const right = toNumber(value);
          return right !== null && left > right;
        });
      }
      case 'less_than': {
        const left = toNumber(target);
        return left !== null && values.some((value: any) => {
          const right = toNumber(value);
          return right !== null && left < right;
        });
      }
      case 'range': {
        const left = toNumber(target);
        const low = toNumber(values[0]);
        const high = toNumber(values[1]);
        return values.length === 2 && left !== null && low !== null && high !== null
          && left >= low && left <= high;
      }
      case 'isnull': return isEmpty(target);
      case 'not_null': return !isEmpty(target);
      case 'icontains': return values.some((value: any) => String(target ?? '').toLowerCase().includes(String(value ?? '').toLowerCase()));
      case 'iexact': return values.some((value: any) => String(target ?? '').toLowerCase() === String(value ?? '').toLowerCase());
      default: return false;
    }
  }

  private _canonicalChildField(field: any): string {
    return typeof field === 'string' && field.startsWith('object_')
      ? field.slice('object_'.length)
      : String(field || '');
  }

  private _selectedConditionValue(field: string): any {
    const canonical = this._canonicalChildField(field);
    const form = this.formGroupSignal();
    const selectedObject = form?.get(this._autoCompleteObjectFieldName(canonical))?.value;
    if (selectedObject && typeof selectedObject === 'object' && !Array.isArray(selectedObject)) {
      return selectedObject;
    }
    const raw = form?.get(field)?.value ?? form?.get(canonical)?.value;
    if (raw && typeof raw === 'object') return raw;

    const candidates = [field, canonical, `object_${canonical}`];
    for (const candidate of candidates) {
      const options = this.dropdownOptionsSignal()[candidate];
      const found = Array.isArray(options)
        ? options.find((option: any) => (option?.id ?? option?.value) === raw)
        : null;
      if (found) return found;
    }
    return raw;
  }

  private _resolveConditionValue(
    condition: any, parentField: string, parentOption: any, node?: any, selectedField?: string
  ): any {
    const source = String(condition?.source || 'parent').toLowerCase();
    const field = condition?.field;
    const canonicalParent = this._canonicalChildField(parentField);

    if (source === 'literal') return condition?.value ?? field;
    if (source === 'node') return node ?? parentOption;
    if (source === 'selected') return this._selectedConditionValue(field || selectedField || '');
    if (source === 'form') return this._selectedConditionValue(field);

    if (this._canonicalChildField(field) === canonicalParent || !field) return parentOption;
    if (parentOption && typeof parentOption === 'object' && parentOption[field] !== undefined) {
      return parentOption[field];
    }
    return this.formGroupSignal()?.get(field)?.value
      ?? this.formGroupSignal()?.get(this._canonicalChildField(field))?.value;
  }

  private _conditionOperand(condition: any, value: any): any {
    const key = condition?.value_key ?? condition?.filter_group;
    return key && value && typeof value === 'object' ? value[key] : value;
  }

  private _conditionExpectedValues(condition: any): any[] {
    if (Array.isArray(condition?.values)) return condition.values;
    return Object.prototype.hasOwnProperty.call(condition || {}, 'value') ? [condition.value] : [];
  }

  private _evaluateConditions(
    conditions: any[], logic: string, parentField: string, parentOption: any, candidate?: any, node?: any,
    selectedField?: string, candidateKey?: string
  ): boolean | null {
    const rules = Array.isArray(conditions) ? conditions : [];
    if (!rules.length) return null;

    const results = rules.map((condition: any) => {
      const sourceValue = this._conditionOperand(
        condition, this._resolveConditionValue(condition, parentField, parentOption, node, selectedField)
      );
      const target = candidate === undefined
        ? sourceValue
        : (candidateKey && candidate && typeof candidate === 'object'
          ? candidate[candidateKey]
          : this._conditionOperand(condition, candidate));
      const expected = candidate === undefined
        ? this._conditionExpectedValues(condition)
        : [sourceValue];

      return this._evaluateOperator(condition?.operator || 'equals', target, expected);
    });
    return String(logic || 'AND').toUpperCase() === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  /**
   * Resuelve el contrato común root→child. Las propiedades explícitas del child
   * prevalecen; `default`, `data_type` y `data_type.filter` se mezclan por
   * propiedad. `filter`, `activate` y `requested` son orquestación exclusiva del
   * child y no heredan bloques homónimos del root.
   */
  private _effectiveChildNode(rootFieldConfig: any, childConfig: any): any {
    const root = rootFieldConfig && typeof rootFieldConfig === 'object' ? rootFieldConfig : {};
    const child = childConfig && typeof childConfig === 'object' ? childConfig : {};
    return {
      ...root,
      ...child,
      default: {
        ...(root.default || {}),
        ...(child.default || {}),
      },
      data_type: {
        ...(root.data_type || {}),
        ...(child.data_type || {}),
        filter: {
          ...(root.data_type?.filter || {}),
          ...(child.data_type?.filter || {}),
        },
      },
      filter: child.filter || {},
      activate: child.activate || {},
      requested: child.requested || {},
    };
  }

  /** Calcula el overlay sin reemplazar el contrato base del control destino. */
  private getEffectiveChildConfig(
    rootFieldConfig: any, parentFieldConfig: any, childKey: string, childConfig: any, formValue: any
  ): { state: 'active' | 'inactive' | 'hidden' | 'readonly'; required: boolean; edit: boolean } {
    const activate = childConfig?.activate || {};
    const requested = childConfig?.requested || {};
    type ChildState = 'active' | 'inactive' | 'hidden' | 'readonly';
    const allowedStates = new Set<ChildState>(['active', 'inactive', 'hidden', 'readonly']);
    let state: ChildState = 'active';
    if (activate.active === true) {
      const configuredDefault = activate.default_state as ChildState;
      const defaultState: ChildState = allowedStates.has(configuredDefault) ? configuredDefault : 'active';
      const conditionMet = this._evaluateConditions(
        activate.conditions, activate.logic, parentFieldConfig?.field, formValue,
        undefined, undefined, childConfig?.field || childKey
      );
      const configuredAction = activate.action as ChildState;
      const actionState: ChildState = allowedStates.has(configuredAction) ? configuredAction : 'inactive';
      state = conditionMet === null ? 'active' : (conditionMet ? actionState : defaultState);
    }

    const baseRequired = rootFieldConfig?.required === true;
    let required = baseRequired;
    if (requested.active === true) {
      const requestedMet = this._evaluateConditions(
        requested.conditions, requested.logic, parentFieldConfig?.field, formValue,
        undefined, undefined, childConfig?.field || childKey
      );
      if (requestedMet === true) required = requested.action !== 'not_required';
    }

    // [[[II ESC:003-07 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-07
    // El child es un overlay del root: `default` se mezcla por propiedad y la
    // declaración del child prevalece. `default.edit` es exclusivamente permiso
    // de edición; `default.active` solo activa el valor por defecto y nunca
    // concede ni revoca edición.
    const effectiveDefault = {
      ...(rootFieldConfig?.default || {}),
      ...(childConfig?.default || {}),
    };
    const rootReadonly = rootFieldConfig?.readonly === true;
    // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
    // Un campo que INICIALIZA la relación (`free_or_relationship` +
    // `relationship_field`) nunca se bloquea por un valor derivado de esa misma
    // relación: bloquearlo deja al usuario sin forma de cambiar de producto
    // antes de agregar la fila. El candado del child sigue aplicando a los
    // campos de destino normales (price, currency, ...); sólo se exceptúa el
    // propio buscador. `readonly` del root sigue mandando por encima.
    const isRelationshipSearcher = this._isFreeOrRelationshipAutoComplete(rootFieldConfig);
    const edit = (effectiveDefault.edit !== false || isRelationshipSearcher)
      && !rootReadonly && state === 'active';
    // ]]]FI
    if (state === 'active' && !edit) state = 'readonly';
    // ]]]FI

    // Seguridad: un control no visible/no editable nunca puede pedir una captura nueva.
    if (state === 'inactive' || state === 'hidden') required = false;
    if (state === 'readonly') required = false;

    return { state, required, edit };
  }

  /** Reevalúa una cascada cuando cambia su padre o alguno de sus hermanos declarados. */
  private _refreshDependentChildren(): void {
    const form = this.formGroupSignal();
    if (!form || this.childRuntimeRefreshing) return;

    const currentValue = form.getRawValue();
    const changedFields = new Set<string>();
    const allFields = new Set([
      ...Object.keys(this.childRuntimePreviousValue || {}),
      ...Object.keys(currentValue || {}),
    ]);
    allFields.forEach((field) => {
      if (this.childRuntimePreviousValue?.[field] !== currentValue?.[field]) {
        changedFields.add(this._canonicalChildField(field));
      }
    });
    if (!changedFields.size) return;

    this.childRuntimeRefreshing = true;
    try {
      this.scanDrawFormFields(this.drawFormSignal(), (rootConfig: any) => {
        if (rootConfig?.children?.active !== true || !rootConfig?.field) return;
        // [[[II ESC:007-08 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-08
        // Los niveles lazy de un campo árbol (children.fields.dynamic) se cargan
        // al expandir con _loadTreeNodeChildren y quedan cacheados en
        // _treeLoadedKeys; no son cascada dependiente. Reprocesarlos aquí hacía
        // una consulta al servidor en cada selección de nodo (web y móvil).
        if (this._isTreeLikeField(rootConfig)
          && rootConfig?.tree?.lazy
          && Array.isArray(rootConfig?.tree?.levels)
          && rootConfig.tree.levels.length > 0) return;
        // ]]]FI
        const rootField = this._canonicalChildField(rootConfig.field);
        const childGroups = rootConfig.children?.fields || {};
        const conditions = ['static', 'dynamic', 'derived'].flatMap((group) =>
          Object.entries(childGroups[group] || {}).flatMap(([childKey, child]: [string, any]) => [
            ...(child?.activate?.conditions || []),
            ...(child?.requested?.conditions || []),
            ...(child?.filter?.conditions || []),
          ].map((condition: any) => ({ condition, targetField: child?.field || childKey })))
        );
        const dependsOnChangedField = changedFields.has(rootField) || conditions.some(({ condition, targetField }: any) => {
          const source = String(condition?.source || 'parent').toLowerCase();
          const dependencyField = source === 'selected' ? (condition?.field || targetField) : condition?.field;
          return source !== 'literal' && changedFields.has(this._canonicalChildField(dependencyField));
        });
        if (!dependsOnChangedField) return;

        const controlValue = form.get(rootConfig.field)?.value ?? form.get(rootField)?.value;
        const selected = form.get(`__autocomplete_object_${rootField}`)?.value
          ?? this._selectedConditionValue(rootConfig.field);
        // Reevaluación, no selección: los derived sólo rellenan huecos.
        this._processChildrenFields(rootConfig.field, controlValue, rootConfig, selected, 0, 'refresh');
      });
    } finally {
      this.childRuntimePreviousValue = form.getRawValue();
      this.childRuntimeRefreshing = false;
      this.cdr.markForCheck();
    }
  }
  // ]]]FI

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
    depth: number = 0,
    // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
    // 'selection' = el usuario acaba de elegir una opción del padre: la
    // derivación manda y refresca el valor. 'refresh' = reevaluación por un
    // cambio cualquiera del formulario: la derivación NO puede pisar lo que el
    // usuario ya escribió si tiene permiso de edición. Sin esta distinción cada
    // pulsación reescribía el control con el valor del padre cacheado. ]]]FI
    origin: 'selection' | 'refresh' = 'selection'
  ): void {
    const children = config.children || {};
    const fields = children?.fields || {};
    if (children?.active !== true || !fields || Object.keys(fields).length === 0) return;

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

        // [[[II ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01
        // La configuración del child solo es un overlay: conserva las reglas base
        // del control renderizado y actualiza visibilidad, edición y required.
        if (targetFieldConfig && typeof targetFieldConfig === 'object') {
          if (!this.childBaseRequired.has(targetFieldConfig)) {
            this.childBaseRequired.set(targetFieldConfig, targetFieldConfig.required === true);
            this.childBaseHidden.set(targetFieldConfig, targetFieldConfig.hide === true);
            this.childBaseReadonly.set(targetFieldConfig, targetFieldConfig.readonly === true);
          }
        }
        const baseControlConfig = targetFieldConfig && typeof targetFieldConfig === 'object'
          ? {
            ...targetFieldConfig,
            required: this.childBaseRequired.get(targetFieldConfig) === true,
            hide: this.childBaseHidden.get(targetFieldConfig) === true,
            readonly: this.childBaseReadonly.get(targetFieldConfig) === true,
          }
          : targetFieldConfig;
        const effectiveFieldConfig = this._effectiveChildNode(baseControlConfig, fieldConfig);
        const parentHasContext = config?.type === 'auto-complete'
          ? !!(currentDropdownOption && typeof currentDropdownOption === 'object')
          : currentValue !== null && currentValue !== undefined && currentValue !== '';
        const effective = this.getEffectiveChildConfig(
          baseControlConfig, config, key, effectiveFieldConfig, currentDropdownOption
        );
        const baseHidden = targetFieldConfig && typeof targetFieldConfig === 'object'
          ? this.childBaseHidden.get(targetFieldConfig) === true
          : false;
        if (targetFieldConfig && typeof targetFieldConfig === 'object') {
          targetFieldConfig.hide = baseHidden || effective.state === 'hidden';
          targetFieldConfig.readonly = effective.state === 'readonly';
          targetFieldConfig.required = effective.required;
        }
        this._applyEffectiveChildState({
          formControl, mirroredField, state: effective.state, required: effective.required,
          preserveValue: targetField.startsWith('no_form_data_') && formControl instanceof FormArray,
        });

        const childScope = String(effectiveFieldConfig?.filter?.scope ?? 'client').toLowerCase();

        // Sin selección real del autocomplete no existe overlay de datos. El
        // root conserva valor/opciones. La tabla NUNCA se toca por selección.
        if (!parentHasContext) {
          // [[[II ESC:030-07 REGRESIÓN corregida: un child `filter.scope='server'`
          // lo resuelve SIEMPRE el servidor; sin padre tampoco debe pedirse al
          // usuario. Antes, esta rama evaluaba el estado con el child vacío
          // (perdía edit:False/scope) y `_applyEffectiveChildState` re-imponía el
          // required base: tras el reset del guardado ("Guardar y nuevo"), el
          // segundo envío se bloqueaba por los campos calculados del servidor
          // (p.ej. Cluster/Región). Se re-aplica el relax respetando
          // `default.edit`
          // declarado por el child, como nace el form. ]]]FI
          if (childScope === 'server') {
            this._applyServerScopedChild({
              fieldConfig: effectiveFieldConfig, targetField, formControl, mirroredField,
              state: effective.state,
              edit: effective.edit,
            });
            continue;
          }
          // Un derived sin selección conserva el contrato root y aplica su
          // default efectivo cuando está activo. No consulta ni toca tablas.
          if (fieldType === 'derived') {
            // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
            // DUEÑO DE LA RELACIÓN. Un formulario puede tener VARIOS buscadores
            // del mismo `relationship_field` (code y name -> product). Cualquier
            // cambio reevalúa a los dos, y el que no tiene selección propia
            // llegaba hasta aquí y aplicaba su `default.value` (''), borrando lo
            // que acababa de poner el otro. Al quedar el texto vacío,
            // `_clearAutoCompleteSelectionIfManual` anulaba `product` y la fila
            // pasaba a "manual" (icono naranja) pese a venir del servidor.
            // Sin selección propia este buscador NO es dueño de la relación: si
            // la relación ya está resuelta, no deriva ni aplica su default. Si
            // no hay relación alguna, conserva el comportamiento previo. ]]]FI
            const relationField = typeof config?.relationship_field === 'string'
              ? config.relationship_field.trim() : '';
            const relationResolved = relationField
              ? ![null, undefined, ''].includes(this.formGroupSignal()?.get(relationField)?.value)
              : false;
            if (relationResolved) continue;
            this._processDerivedChild({
              fieldConfig: effectiveFieldConfig, targetField, targetFieldConfig, formControl,
              parentField: field, parentOption: null, parentValue: currentValue,
              childFilterGroup: effectiveFieldConfig?.filter_group || 'id',
              parentFieldConfig: config,
              isActive: effective.state === 'active' || effective.state === 'readonly',
              depth, origin,
            });
            continue;
          }
          if (this.isDropdown(targetFieldConfig)) {
            void this.dataDropdown(targetFieldConfig, false);
          }
          continue;
        }

        if (childScope === 'server') {
          this._applyServerScopedChild({
            fieldConfig: effectiveFieldConfig, targetField, formControl, mirroredField,
            state: effective.state, edit: effective.edit,
          });
          continue;
        }
        const isActive = effective.state === 'active' || effective.state === 'readonly';
        // ]]]FI

        // ── 3. PROCESAR SEGÚN TIPO ──
        // [[[II ESC:003-04 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-04
        // Contrato unificado: los 3 modos comparten el mismo pipeline.
        //   - La fuente (servidor/local) se decide por la presencia de data_type.type.
        //   - El filtrado (filter.conditions), result_position y auto_select son
        //     idénticos en static y dynamic.
        //   - 'derived' copia un atributo del padre (from: 'parent') o del servidor
        //     (from: 'server'); también respeta activate/requested.
        // El valor del padre para los filtros se extrae con filter_group (default 'id').
        const childFilterGroup = effectiveFieldConfig?.filter_group || 'id';
        const parentValue = (currentDropdownOption && typeof currentDropdownOption === 'object')
          ? (currentDropdownOption[childFilterGroup] ?? (childFilterGroup === 'id' ? currentValue : null))
          : currentValue;

        if (fieldType === 'derived') {
          this._processDerivedChild({
            fieldConfig: effectiveFieldConfig, targetField, targetFieldConfig, formControl,
            parentField: field, parentOption: currentDropdownOption, parentValue,
            childFilterGroup, parentFieldConfig: config, isActive, depth, origin,
          });
        } else {
          // static + dynamic comparten el mismo motor de carga unificado.
          this._loadChildOptions({
            fieldConfig: effectiveFieldConfig, targetField, targetFieldConfig, formControl,
            parentField: field, parentOption: currentDropdownOption, parentValue,
            childFilterGroup, isActive, depth,
          });
        }
        // ]]]FI
      }
    });
  }

  // [[[II ESC:030-01 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-01
  private _applyEffectiveChildState(ctx: {
    formControl: any; mirroredField: string | null; state: string; required: boolean; preserveValue?: boolean;
  }): void {
    const { formControl, mirroredField, state, required, preserveValue = false } = ctx;

    // [[[II ESC:030-09 Una tabla `no_form_data_*` es un CONTENEDOR local de
    // borradores, no un campo de captura: el overlay no debe deshabilitarla ni
    // exigirla. Al deshabilitarse quedaba `isTableReadonly()` en true y el botón
    // "+" (y el alta desde el formulario) dejaban de funcionar de forma
    // intermitente, según el estado del padre. Se mantiene habilitada siempre. ]]]FI
    const isLocalDraftTable = preserveValue && formControl instanceof FormArray;
    if (isLocalDraftTable) {
      formControl.enable({ emitEvent: false });
      formControl.removeValidators(Validators.required);
      formControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    const disabled = state === 'inactive' || state === 'hidden';
    // [[[II ESC:030-08 REGRESIÓN: un campo dropdown-like vive como PAREJA
    // (`object_<campo>` renderizado + `<campo>` canónico enviado). Aplicar
    // `required` a AMBOS producía DOS entradas de error para el mismo campo y el
    // toast repetía la etiqueta ("Tipo de gasto" x2), porque ambos nombres
    // resuelven al mismo label. El espejo replica habilitado/valor, pero el
    // `required` lo porta SOLO el control primario; al espejo se le retira
    // siempre. La validación sigue bloqueando (el primario queda inválido y en
    // rojo) y se reporta una sola vez. ]]]FI
    const setState = (control: any, isMirror: boolean) => {
      if (!control) return;
      if (disabled) {
        control.disable({ emitEvent: false });
        if (!preserveValue && (state === 'inactive' || state === 'hidden')) {
          if (control instanceof FormArray) control.clear({ emitEvent: false });
          else control.setValue(null, { emitEvent: false });
        }
      } else {
        control.enable({ emitEvent: false });
      }
      if (required && !isMirror) control.addValidators(Validators.required);
      else control.removeValidators(Validators.required);
      control.updateValueAndValidity({ emitEvent: false });
    };

    setState(formControl, false);
    if (mirroredField) setState(this.formGroupSignal()?.get(mirroredField), true);
  }
  // ]]]FI

  // [[[II ESC:003-05 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-05
  /**
   * Aplica un child declarado con `filter.scope: 'server'`: el cliente NO consulta
   * al servidor por selección del padre. El servidor resuelve y llena el valor al
   * hacer create. En cliente:
   *   - `default.edit: false` → control deshabilitado (solo-lectura).
   *   - `default.edit: true`  → control habilitado con valor sugerido vacío.
   * En ambos casos se limpian las opciones y el valor previo (queda obsoleto al
   * cambiar el padre) y se relaja el `required` para poder enviar el create sin el
   * campo; la obligatoriedad real la reimpone el servidor.
   */
  private _applyServerScopedChild(ctx: {
    fieldConfig: any; targetField: string; formControl: any; mirroredField: string | null; state: string; edit: boolean;
  }): void {
    const { fieldConfig, targetField, formControl, mirroredField, state, edit } = ctx;
    const editable = state === 'active' && edit === true;

    // No mostramos opciones: la resolución es responsabilidad del servidor.
    this._updateDropdownOptions(targetField, [], fieldConfig);

    const reset = (ctrl: any) => {
      if (!ctrl) return;
      ctrl.removeValidators(Validators.required);
      if (ctrl instanceof FormArray) ctrl.clear({ emitEvent: false });
      else ctrl.setValue(null, { emitEvent: false });
      if (editable) { ctrl.enable({ emitEvent: false }); }
      else { ctrl.disable({ emitEvent: false }); }
      ctrl.updateValueAndValidity({ emitEvent: false });
    };

    reset(formControl);
    if (mirroredField) { reset(this.formGroupSignal()?.get(mirroredField)); }
  }
  // ]]]FI

  // [[[II ESC:003-04 DOC:docs/documents/2026-05-25_003_dynamic-children-field-loading.md#escenario-04 ESC:001-17 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-17 ESC:030-02 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-02
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
   *   2. `filter.conditions` mapeables. `filter.scope` decide quién resuelve el
   *      child; el `scope` legado de cada condición se ignora.
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

    const conds: any[] = childFilter?.active && Array.isArray(childFilter?.conditions)
      ? childFilter.conditions
      : [];
    for (const cond of conds) {
      if (!cond?.field) continue;
      const serverOp = this._mapOperatorToServerOp(cond.operator || 'equals');
      if (!serverOp) continue; // operador no mapeable → se aplica en cliente
      const cv = this._resolveConditionValue(cond, parentField, parentOption);
      if (cv == null) continue;
      const resolved = this._conditionOperand(
        { ...cond, value_key: cond.value_key || cond.filter_group || childFilterGroup }, cv
      );
      const value = resolved;
      if (value == null || value === '') continue;
      filterCfg[childFilterGroup] = { active: true, default: serverOp, default_value: value };
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
      const serverOp = this._mapOperatorToServerOp(cond.operator || 'equals');
      return !isServer || !serverOp;
    });

    if (clientConds.length) {
      return options.filter((option: any) => {
        return this._evaluateConditions(
          clientConds, childFilter.logic || 'AND', parentField, parentOption, option,
          undefined, undefined, childFilterGroup
        ) === true;
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
   * Publica las opciones del child y aplica auto_select (+ cascada recursiva).
   * Sin coincidencias limpia el control. `default_field` se retiró del contrato:
   * ninguna configuración activa lo utilizaba durante la auditoría de 2026-07-25.
   * auto_select reemplaza al antiguo `selected`; se conserva `selected` como alias legado.
   */
  private _publishChildOptions(ctx: {
    fieldConfig: any; targetField: string; targetFieldConfig: any; formControl: any; rows: any[]; depth: number;
  }): void {
    const { fieldConfig, targetField, targetFieldConfig, formControl, rows, depth } = ctx;
    const normalized = this.normalizeOptionsForField(rows, targetFieldConfig);
    this._updateDropdownOptions(targetField, this._toTreeNodesIfNeeded(targetFieldConfig, normalized), targetFieldConfig);

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
      formControl?.setValue(null);
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
      this._updateDropdownOptions(targetField, [], targetFieldConfig);
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
   * Procesa un child 'derived': copia un atributo escalar desde el padre
   * seleccionado (from: 'parent', default) o desde el primer registro del
   * servidor (from: 'server') hacia un campo HERMANO del formulario.
   *
   * [[[II ESC:030-02 Un child derived NUNCA modifica una tabla. Al seleccionar el
   * autocomplete la tabla debe permanecer sin cambios (spec: solo el boton save
   * agrega filas, con la respuesta aplanada del servidor). Antes existia una
   * "vista previa derivada" que insertaba la opcion seleccionada como fila sin
   * aplanar (Descripcion=UUID); se elimino por contradecir ese contrato. ]]]FI
   */
  private _processDerivedChild(ctx: {
    fieldConfig: any; targetField: string; targetFieldConfig: any; formControl: any;
    parentField: string; parentOption: any; parentValue: any; childFilterGroup: string;
    parentFieldConfig: any; isActive: boolean; depth: number;
    origin?: 'selection' | 'refresh';
  }): void {
    const { fieldConfig, targetField, targetFieldConfig, formControl,
      parentField, parentOption, parentValue, childFilterGroup, isActive,
      origin = 'selection' } = ctx;

    // La tabla se llena exclusivamente por el boton save; un derived solo llena
    // campos escalares hermanos (code, price, currency, ...).
    if (targetFieldConfig?.type === 'table' || fieldConfig?.type === 'table') return;

    if (!isActive) {
      formControl?.setValue(null);
      return;
    }

    // `type` y los contratos anidados comunes se heredan del root; el child
    // solo sobrescribe las propiedades que declara.
    const effectiveDefault = {
      ...(targetFieldConfig?.default || {}),
      ...(fieldConfig?.default || {}),
    };
    const effectiveDataType = {
      ...(targetFieldConfig?.data_type || {}),
      ...(fieldConfig?.data_type || {}),
      filter: {
        ...(targetFieldConfig?.data_type?.filter || {}),
        ...(fieldConfig?.data_type?.filter || {}),
      },
    };
    const effectiveType = fieldConfig?.type ?? targetFieldConfig?.type;
    const fieldName = fieldConfig?.field_name ?? targetFieldConfig?.field_name ?? targetField;
    const from = fieldConfig?.from || 'parent';
    const fallback = effectiveDefault.active === true ? effectiveDefault.value : undefined;

    // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
    // `default.edit` es PERMISO de edición, también para la derivación:
    //   - edit:false  -> el valor de la relación manda siempre.
    //   - edit:true   -> el usuario es dueño del valor. Una SELECCIÓN nueva del
    //     padre sí lo refresca (es una acción explícita), pero una reevaluación
    //     ('refresh', disparada por cualquier cambio del formulario) sólo puede
    //     rellenar un control vacío. Sin esto, cada cambio reescribía el control
    //     con el valor del padre cacheado y el usuario no lograba conservar el
    //     suyo (hacían falta 2-3 intentos).
    // Además el fallback (`default.value`) NUNCA vacía un control que ya tiene
    // valor: es un relleno para cuando la fuente no aporta dato, no un borrado.
    const editable = effectiveDefault.edit !== false;
    const hasValue = (v: any) => v !== undefined && v !== null && v !== '';

    const applyValue = (val: any) => {
      const current = formControl?.value;
      // Reevaluación sobre un valor que el usuario controla: no se toca.
      if (editable && origin === 'refresh' && hasValue(current)) return;
      // La fuente aportó dato: manda en ambos permisos.
      if (hasValue(val)) { formControl?.setValue(val); return; }
      if (fallback === undefined) return;
      // Sin dato de la fuente entra el fallback. Con permiso de edición sólo
      // rellena un hueco (nunca borra lo escrito); sin permiso, la relación
      // sigue siendo la autoridad y el fallback se impone.
      if (editable && hasValue(current)) return;
      formControl?.setValue(fallback);
    };
    // ]]]FI

    if (from === 'server') {
      const dt = effectiveDataType;
      const app = this.crudS.getAppType(dt?.type)?.app;
      const type = this.crudS.getAppType(dt?.type)?.type;
      if (!app || !type || !fieldName) { applyValue(undefined); return; }
      const filter = this._buildChildServerFilter({
        fieldConfig: {
          ...fieldConfig,
          type: effectiveType,
          data_type: effectiveDataType,
        },
        parentField, parentOption, parentValue, childFilterGroup,
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
      // [[[II ESC:030-20 La clave fuente puede llegar plana, anidada en
      // `<rel>_data` o dentro del objeto de la relación; resolución compartida
      // con las celdas de tabla (GeneralService). ]]]FI
      applyValue(this.generalS.resolveRelationDataValue(parentOption, fieldName));
    } else {
      applyValue(undefined);
    }
  }
  // ]]]FI

  // [[[II ESC:020-04 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-04
  /** Helper: actualiza una entrada de dropdownOptionsSignal sin repetir el spread. */
  private _updateDropdownOptions(field: string, options: any[], fieldConfig?: any): void {
    const virtualActive = fieldConfig?.virtual_scrolling?.active === true;
    const nextOptions = options || [];
    if (virtualActive) {
      this.virtualOptionsReadySignal.set({
        ...this.virtualOptionsReadySignal(),
        [field]: false
      });
    }

    this.dropdownOptionsSignal.set({
      ...this.dropdownOptionsSignal(),
      [field]: virtualActive ? [...nextOptions] : nextOptions
    });

    if (virtualActive) {
      this.markVirtualOptionsReady(field);
    }
  }

  private markVirtualOptionsReady(field: string): void {
    const setReady = () => {
      this.virtualOptionsReadySignal.set({
        ...this.virtualOptionsReadySignal(),
        [field]: true
      });
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(setReady));
      return;
    }

    setTimeout(setReady, 0);
  }
  // ]]]FI

  // [[[II ESC:007-03 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-03 ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02 ESC:020-03 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-03
  private _isListboxTreeField(fieldConfig: any): boolean {
    return fieldConfig?.type === 'listbox' && !!fieldConfig?.tree;
  }

  private _isTreeLikeField(fieldConfig: any): boolean {
    return fieldConfig?.type === 'tree-select' || this._isListboxTreeField(fieldConfig);
  }

  private _parseTreeLabelFields(labelField: any): string[] {
    if (Array.isArray(labelField)) {
      return labelField.map((field) => String(field).trim()).filter((field) => field.length > 0);
    }

    if (typeof labelField === 'string') {
      return labelField
        .split(',')
        .map((field: string) => field.trim())
        .filter((field: string) => field.length > 0);
    }

    return [];
  }

  private _resolveTreeLabel(opt: any, labelField: any): string {
    const labelFields = this._parseTreeLabelFields(labelField);
    const fields = labelFields.length > 0 ? labelFields : ['name'];
    const label = fields
      .map((field: string) => opt?.[field])
      .filter((value: any) => value != null && String(value).trim() !== '')
      .map((value: any) => String(value))
      .join(' ');

    if (label.trim()) return label;

    const fallback = opt?.label ?? opt?.display_name ?? opt?.name ?? opt?.code ?? opt?.id ?? '';
    return String(fallback ?? '');
  }

  private _buildTreeFilterText(opt: any, labelField: any, label: string): string {
    const fields = new Set<string>([
      ...this._parseTreeLabelFields(labelField),
      'label',
      'name',
      'display_name',
      'code',
      'id',
    ]);

    const values = [label];
    for (const field of fields) {
      const value = opt?.[field];
      if (value == null || String(value).trim() === '') continue;
      values.push(String(value));
    }

    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(' ');
  }

  private async _buildDropdownOptionsForField(fieldConfig: any, options: any[]): Promise<any[]> {
    const perfStart = this.perfNow();
    const normalizedOptions = this._toTreeNodesIfNeeded(fieldConfig, options);
    if (fieldConfig?.type === 'listbox') {
      const listboxOptions = await this._toListboxOptionsIfNeeded(fieldConfig, normalizedOptions);
      this.logPerf('dropdown.buildOptionsForField.listbox', perfStart, {
        field: fieldConfig?.field,
        type: fieldConfig?.type,
        inputRows: Array.isArray(options) ? options.length : 0,
        treeRows: Array.isArray(normalizedOptions) ? normalizedOptions.length : 0,
        outputRows: Array.isArray(listboxOptions) ? listboxOptions.length : 0,
        tree: !!fieldConfig?.tree
      }, true);
      return listboxOptions;
    }
    this.logPerf('dropdown.buildOptionsForField', perfStart, {
      field: fieldConfig?.field,
      type: fieldConfig?.type,
      inputRows: Array.isArray(options) ? options.length : 0,
      outputRows: Array.isArray(normalizedOptions) ? normalizedOptions.length : 0
    });
    return normalizedOptions;
  }
  // ]]]FI

  /**
   * Transforma una lista plana de opciones en `TreeNode[]` cuando el field
   * usa contrato de árbol (`tree-select` o `listbox` con `tree`). Soporta
   * hijos preargados en `option.children` (configurable vía
   * `field.tree_children_field`). Para otros tipos devuelve las opciones tal cual.
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
    if (!this._isTreeLikeField(fieldConfig)) return options;
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
    const toNode = (opt: any): any => {
      const kids = Array.isArray(opt?.[childrenField]) ? opt[childrenField] : [];
      const id = opt?.[valueField] ?? '';
      const label = this._resolveTreeLabel(opt, labelField);
      const filterText = this._buildTreeFilterText(opt, labelField, label);
      const node: any = {
        key: rootResource ? `${rootResource}:${id}` : String(id),
        label,
        filter_text: filterText,
        data: {
          ...opt,
          id: opt?.id ?? id,
          type: rootResource || opt?.type || null,
          __level: 0,
          filter_text: filterText,
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

  // [[[II ESC:007-02 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-02 ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02
  private async _toListboxOptionsIfNeeded(fieldConfig: any, options: any[]): Promise<any[]> {
    if (fieldConfig?.type !== 'listbox') return options || [];
    if (!this._isListboxTreeField(fieldConfig)) return options || [];
    if (!Array.isArray(options) || options.length === 0) return [];
    if (Array.isArray(options[0]?.items)) return options;

    const ensureStart = this.perfNow();
    await this._ensureListboxTreeNodesLoaded(fieldConfig, options);
    this.logPerf('listbox.ensureTreeLoaded', ensureStart, {
      field: fieldConfig?.field,
      rootNodes: options.length,
      loadedKeys: this._treeLoadedKeys[fieldConfig?.field]?.size ?? 0
    }, true);

    const groupStart = this.perfNow();
    const groups = this._toListboxGroups(options, fieldConfig);
    this.logPerf('listbox.toGroups', groupStart, {
      field: fieldConfig?.field,
      groups: groups.length,
      items: groups.reduce((acc: number, group: any) => acc + (Array.isArray(group.items) ? group.items.length : 0), 0)
    }, true);
    return groups;
  }

  private async _ensureListboxTreeNodesLoaded(fieldConfig: any, nodes: any[]): Promise<void> {
    const perfStart = this.perfNow();
    let visited = 0;
    for (const node of nodes) {
      visited++;
      await this._ensureListboxTreeNodeLoaded(fieldConfig, node);
    }
    this.logPerf('listbox.ensureRootNodesLoaded', perfStart, {
      field: fieldConfig?.field,
      visited
    }, true);
  }

  private async _ensureListboxTreeNodeLoaded(fieldConfig: any, node: any): Promise<void> {
    if (!node || typeof node !== 'object') return;

    await this._loadTreeNodeChildren(fieldConfig, node);

    if (!Array.isArray(node.children) || node.children.length === 0) return;

    for (const child of node.children) {
      if (child?.leaf === false || (Array.isArray(child?.children) && child.children.length > 0)) {
        await this._ensureListboxTreeNodeLoaded(fieldConfig, child);
      }
    }
  }

  private _toListboxGroups(nodes: any[], fieldConfig: any): any[] {
    return nodes
      .map((node: any) => {
        const items = this._collectSelectableListboxItems(node, fieldConfig, node);
        if (!items.length && node?.selectable !== false) {
          items.push(this._createListboxItemFromTreeNode(node, fieldConfig, node));
        }
        return {
          label: node?.label ?? '',
          value: node?.key ?? node?.data?.id ?? node?.label ?? '',
          items,
        };
      })
      .filter((group: any) => Array.isArray(group.items) && group.items.length > 0);
  }

  private _collectSelectableListboxItems(node: any, fieldConfig: any, groupNode: any): any[] {
    const items: any[] = [];
    const children = Array.isArray(node?.children) ? node.children : [];

    for (const child of children) {
      if (child?.selectable !== false) {
        items.push(this._createListboxItemFromTreeNode(child, fieldConfig, groupNode));
      }

      if (Array.isArray(child?.children) && child.children.length > 0) {
        items.push(...this._collectSelectableListboxItems(child, fieldConfig, groupNode));
      }
    }

    return items;
  }

  private _createListboxItemFromTreeNode(node: any, fieldConfig: any, groupNode: any): any {
    const rawSource = node?.data?.raw && typeof node.data.raw === 'object'
      ? node.data.raw
      : (node?.data && typeof node.data === 'object' ? node.data : {});
    const raw = { ...rawSource };
    const id = node?.data?.id ?? raw.id ?? node?.key ?? null;
    const label = node?.label ?? raw.label ?? '';
    const filterText = node?.filter_text ?? node?.data?.filter_text ?? this._buildTreeFilterText(raw, fieldConfig?.option_label || 'name', label);

    if (raw.id === undefined) {
      raw.id = id;
    }

    if (!raw.label && label) {
      raw.label = label;
    }

    if (!raw.filter_text && filterText) {
      raw.filter_text = filterText;
    }

    return {
      id,
      label,
      filter_text: filterText,
      type: node?.data?.type ?? raw.type ?? null,
      parent: node?.data?.parent ?? (groupNode && groupNode !== node
        ? {
          id: groupNode?.data?.id ?? null,
          type: groupNode?.data?.type ?? null,
        }
        : null),
      raw,
      __serialized: this._buildListboxTreeSerializedItem(node, fieldConfig?.tree),
    };
  }

  private _buildListboxTreeSerializedItem(node: any, treeCfg: any): any | null {
    const explicit = node?.__serialized ?? node?.data?.__serialized;
    if (explicit && typeof explicit === 'object') {
      return explicit;
    }

    const data = node?.data || {};
    if (!data.id) return null;

    const serialization = treeCfg?.serialization || {};
    const strategy = serialization.strategy || 'child_relationship_with_parent_meta';

    if (strategy === 'child_relationship_with_parent_meta') {
      const parentData = data.parent || null;
      const item: any = {
        __rich: true,
        type: data.type || serialization.relationship_type_default,
        id: data.id,
      };

      if (serialization.meta && typeof serialization.meta === 'object') {
        const metaOut: any = {};
        for (const key of Object.keys(serialization.meta)) {
          const metaCfg = serialization.meta[key] || {};
          const idFrom = metaCfg.id_from || 'parent_node.id';
          let metaId: any = null;

          if (idFrom === 'parent_node.id') {
            metaId = parentData?.id ?? null;
          } else if (idFrom === 'selected_node.id') {
            metaId = data.id;
          }

          if (!metaId) continue;
          metaOut[key] = { type: metaCfg.type, id: metaId };
        }

        if (Object.keys(metaOut).length) {
          item.meta = metaOut;
        }
      }

      if (serialization.extra && typeof serialization.extra === 'object') {
        Object.assign(item, serialization.extra);
      }

      return item;
    }

    return { __rich: true, type: data.type || serialization.relationship_type_default, id: data.id };
  }
  // ]]]FI

  private _emptyMirroredDropdownValue(fieldConfig: any): any {
    // [[[II ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
    return this.ARRAY_SELECTION_TYPES.has(fieldConfig?.type) || fieldConfig?.type === 'listbox'
      ? []
      : null;
    // ]]]FI
  }

  private _flattenDropdownOptions(options: any[]): any[] {
    const flat: any[] = [];

    const visit = (option: any): void => {
      if (!option || typeof option !== 'object') return;

      const isGroup = Array.isArray(option.items) && option.id === undefined && option.value !== undefined && option.raw === undefined && option.data === undefined;

      if (option.raw && typeof option.raw === 'object') {
        flat.push(option.raw);
      } else if (option.data?.raw && typeof option.data.raw === 'object') {
        flat.push(option.data.raw);
      } else if (option.data && typeof option.data === 'object' && (option.data.id !== undefined || option.data.value !== undefined)) {
        flat.push(option.data);
      } else if (!isGroup) {
        flat.push(option);
      }

      if (Array.isArray(option.items)) {
        option.items.forEach(visit);
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

  // [[[II ESC:007-07 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-07
  private applySelectionLimitForDropdownChange(fieldConfig: any, currentValue: any): any {
    const limit = this.getSelectionLimit(fieldConfig);
    if (limit === null || !fieldConfig?.field) return currentValue;

    if (limit === 1 && fieldConfig?.type === 'listbox') {
      const nextValue = Array.isArray(currentValue) ? (currentValue[0] ?? null) : currentValue;
      if (nextValue !== currentValue) {
        this.formGroupSignal()?.get(fieldConfig.field)?.setValue(nextValue);
      }
      return nextValue;
    }

    if (!Array.isArray(currentValue)) return currentValue;

    const limitedValue = this.limitSelectionArrayValue(fieldConfig, currentValue, limit);
    if (limitedValue === currentValue) return currentValue;

    this.formGroupSignal()?.get(fieldConfig.field)?.setValue(limitedValue);
    this.notifySelectionLimitReached(fieldConfig, limit);
    return limitedValue;
  }

  private limitSelectionArrayValue(fieldConfig: any, currentValue: any[], limit: number): any[] {
    if (this.isTreeSelectLimitedByLevel(fieldConfig)) {
      const perLevelCount = new Map<string, number>();
      const selected: any[] = [];
      let changed = false;

      for (const item of currentValue) {
        const level = this.getSelectionLevelKey(item);
        const count = perLevelCount.get(level) ?? 0;

        if (count >= limit) {
          changed = true;
          continue;
        }

        perLevelCount.set(level, count + 1);
        selected.push(item);
      }

      return changed ? selected : currentValue;
    }

    return currentValue.length > limit ? currentValue.slice(0, limit) : currentValue;
  }

  private isTreeSelectLimitedByLevel(fieldConfig: any): boolean {
    return fieldConfig?.type === 'tree-select' && !!fieldConfig?.tree;
  }

  private getSelectionLevelKey(item: any): string {
    const rawLevel = item?.data?.__level
      ?? item?.__level
      ?? item?.raw?.__level
      ?? item?.data?.raw?.__level
      ?? item?.level
      ?? item?.data?.level
      ?? 0;
    const numericLevel = Number(rawLevel);

    return Number.isFinite(numericLevel) ? String(Math.floor(numericLevel)) : String(rawLevel ?? 0);
  }

  private notifySelectionLimitReached(fieldConfig: any, limit: number): void {
    const fieldLabel = fieldConfig?.label || fieldConfig?.placeholder || fieldConfig?.field || 'campo';
    const scope = this.isTreeSelectLimitedByLevel(fieldConfig) ? ' por nivel' : '';
    const itemLabel = limit === 1 ? 'elemento' : 'elementos';

    this.messageS.changeMessage(
      `Se alcanzó el límite de ${limit} ${itemLabel}${scope} en ${fieldLabel}.`,
      null,
      {},
      'warn',
      'Límite de selección'
    );
  }
  // ]]]FI

  // ─── FIN MOTOR DE EVALUACIÓN ───────────────────────────────────────────────


  /**
   * Emite un evento cuando se modifica un dropdown
   * @param event evento del dropdown
   * @param object objeto que contiene el evento y el campo que se esta modificando
   */
  // [[[II ESC:020-06 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-06
  onTreeSelectNodeChange(event: any, fieldConfig: any): void {
    const emitChange = () => this.onChangeDropdown(event, fieldConfig);

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(emitChange);
      return;
    }

    Promise.resolve().then(emitChange);
  }
  // ]]]FI

  /*async*/ onChangeDropdown(event: any, object: any) {
    const field = object.field; //se obtiene el campo del objeto
    let currentValue = this.formGroupSignal()?.get(field)?.value;
    currentValue = this.applySelectionLimitForDropdownChange(object, currentValue);
    const formValues = this.formGroupSignal()?.value;
    //const eventValue = event.value; // ID/valor seleccionado del dropdown

    console.log('onChangeDropdown ------------------ field:', field);

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
    // [[[II ESC:007-04 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-04
    if (this._isListboxTreeField(object)) {
      return;
    }
    // ]]]FI

    // El mismo camino atiende cambios UI y programáticos; si valueChanges ya lo
    // evaluó, no habrá diferencias y no se repite la carga del child.
    this._refreshDependentChildren();
    // [[[II ESC:030-05 focus_after_select tras elegir opcion de dropdown/select. ]]]FI
    this.applyFocusAfterSelect(object);

  }

  /**
   * Emite un evento cuando se selecciona un elemento en el autocomplete
   * Aplica las mismas validaciones que on ChangeDropdown
   * @param event evento del autocomplete
   * @param config configuración del campo
   */
  async onSelectAutoComplete(event: any, config: any) {
    const field = config.field;
    const selectedValue = this._extractAutoCompleteSelectedValue(event);
    this._syncAutoCompleteRelationshipField(config, selectedValue);
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

    // [[[II ESC:030-18 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-18
    // La selección puede conservar exactamente el texto que el usuario escribió
    // (p.ej. code="6"), por lo que valueChanges no detecta diferencia. Procesar
    // este padre con el objeto elegido garantiza que sus derived se inicialicen
    // sin depender de que cambie el texto visible.
    this._processChildrenFields(field, currentValue, config, selectedValue);
    // ]]]FI
    // La sincronización anterior no emite tres valueChanges separados. Esta
    // reevaluación única conserva las demás dependencias que sí cambiaron.
    this._refreshDependentChildren();
    // [[[II ESC:030-05 focus_after_select tras seleccionar del autocomplete. ]]]FI
    this.applyFocusAfterSelect(config);

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

  // [[[II ESC:001-16 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-16
  clearAutoComplete(config: any): void {
    if (!config?.field) return;
    this.formGroupSignal()?.get(config.field)?.setValue('');
    this.formGroupSignal()?.get(this._autoCompleteObjectFieldName(config.field))?.setValue(null);
    if (this._isFreeOrRelationshipAutoComplete(config)) {
      this.formGroupSignal()?.get(config.relationship_field.trim())?.setValue(null);
    }
  }
  // ]]]FI

  /**
   * Set de keys ya cargadas por field para no re-disparar requests al
   * re-expandir el mismo nodo. Reload (ícono de recarga) deberá vaciar la
   * entrada para volver a consultar.
   */
  private _treeLoadedKeys: { [field: string]: Set<string> } = {};

  // [[[II ESC:007-02 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-02 ESC:017-02 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-02
  private _loadTreeNodeChildren(fieldConfig: any, node: any): Promise<void> {
    return new Promise((resolve) => {
      const perfStart = this.perfNow();
      const tree = fieldConfig?.tree;
      const lazyLevels: any[] = Array.isArray(tree?.levels) ? tree.levels : [];

      if (!tree?.lazy || lazyLevels.length === 0 || !node) {
        resolve();
        return;
      }

      const currentLevel: number = (node?.data?.__level ?? 0);
      const targetLevelIdx = currentLevel;
      const levelCfg = lazyLevels[targetLevelIdx];
      if (!levelCfg) {
        resolve();
        return;
      }

      const cacheKey = String(node.key ?? node?.data?.id ?? '');
      const loaded = (this._treeLoadedKeys[fieldConfig.field] ||= new Set<string>());
      if (loaded.has(cacheKey)) {
        resolve();
        return;
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        loaded.add(cacheKey);
        resolve();
        return;
      }

      const dynamicMap = fieldConfig?.children?.fields?.dynamic || {};
      const childKey = levelCfg.child_field
        ?? levelCfg.name
        ?? (Object.keys(dynamicMap).length === 1 ? Object.keys(dynamicMap)[0] : null);
      const childCfg = childKey ? dynamicMap[childKey] : null;
      const parentNodeData = node?.data || {};

      if (childCfg?.activate?.active) {
        const conds: any[] = childCfg.activate.conditions || [];
        const logic = childCfg.activate.logic || 'AND';
        const action = childCfg.activate.action || 'inactive';
        const results = conds.map((c: any) => {
          if (c?.source && c.source !== 'parent') return true;
          const vk = c?.value_key || 'id';
          const value = parentNodeData?.[vk] ?? parentNodeData?.raw?.[vk] ?? null;
          const op = c?.operator || 'equals';
          const expected = c?.value;
          if (op === 'isnull') return value == null || value === '';
          if (op === 'not_null' || op === 'isnotnull') return !(value == null || value === '');
          if (op === 'equals') return value === expected;
          if (op === 'not_equals') return value !== expected;
          if (op === 'in' && Array.isArray(c?.values)) return c.values.includes(value);
          if (op === 'not_in' && Array.isArray(c?.values)) return !c.values.includes(value);
          return false;
        });
        const met = logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
        const isActive = action === 'inactive' ? !met : met;
        if (!isActive) {
          node.children = [];
          node.loading = false;
          loaded.add(cacheKey);
          resolve();
          return;
        }
      }

      const filterCfg: any = {};
      if (childCfg?.data_type?.filter && typeof childCfg.data_type.filter === 'object') {
        Object.assign(filterCfg, childCfg.data_type.filter);
      }
      if (childCfg?.filter?.active && Array.isArray(childCfg.filter.conditions)) {
        for (const cond of childCfg.filter.conditions) {
          if (cond?.source && cond.source !== 'parent') continue;
          if (!cond?.field) continue;
          const vk = cond.value_key || 'id';
          const value = parentNodeData?.[vk] ?? parentNodeData?.raw?.[vk] ?? null;
          if (value == null || value === '') continue;
          const op = cond.operator === 'equals' ? 'exact' : (cond.operator || 'exact');
          filterCfg[cond.field] = {
            active: true,
            forced: true,
            default: op,
            default_value: value,
          };
        }
      }

      const resource = childCfg?.data_type?.type
        || levelCfg.resource
        || levelCfg.data_type?.type
        || levelCfg.name
        || childKey;
      const at = this.crudS.getAppType(resource) || {};
      const app = at.app;
      const type = at.type;
      if (!app || !type) {
        resolve();
        return;
      }

      const filter = this.crudS.buildDropdownFilterString(filterCfg);
      const sort = childCfg?.data_type?.ordering || levelCfg?.data_type?.ordering || '';
      const limit = childCfg?.data_type?.limit || levelCfg?.data_type?.limit || 0;

      node.loading = true;
      const shouldBlockUi = fieldConfig?.type === 'tree-select';
      if (shouldBlockUi) {
        this.messageS.showBlocked(true);
      }
      this.crudS.getObject({ app, type, filter, sort, limit }).subscribe({
        next: (data: any) => {
          const parseStart = this.perfNow();
          const rows = this.generalS.DJAtoObject({
            respDJA: data,
            fields: { [fieldConfig.field]: fieldConfig },
          }) || [];
          this.logPerf('tree.loadNodeChildren.parse', parseStart, {
            field: fieldConfig?.field,
            node: node?.label ?? node?.key,
            rows: rows.length
          }, true);

          const labelField = childCfg?.option_label || levelCfg.label_field || fieldConfig.option_label || 'name';
          const valueField = childCfg?.option_value || levelCfg.value_field || fieldConfig.option_value || 'id';
          const hasMoreLevels = !!lazyLevels[targetLevelIdx + 1];
          const selectable = levelCfg.selectable !== false;
          const parentRef = {
            id: node?.data?.id ?? null,
            type: node?.data?.type ?? null,
          };
          node.children = rows.map((opt: any) => {
            const id = opt?.[valueField] ?? opt?.id ?? '';
            const label = this._resolveTreeLabel(opt, labelField);
            const filterText = this._buildTreeFilterText(opt, labelField, label);
            return {
              key: `${resource}:${id}`,
              label,
              filter_text: filterText,
              data: {
                ...opt,
                id: opt?.id ?? id,
                type: resource,
                __level: targetLevelIdx + 1,
                parent: parentRef,
                filter_text: filterText,
                raw: opt,
              },
              selectable,
              leaf: !hasMoreLevels,
              children: hasMoreLevels ? [] : undefined,
            };
          });
          node.loading = false;
          loaded.add(cacheKey);

          if (fieldConfig?.type === 'tree-select') {
            const current = this.dropdownOptionsSignal()[fieldConfig.field] || [];
            this._updateDropdownOptions(fieldConfig.field, [...current], fieldConfig);
          }

          if (shouldBlockUi) {
            this.messageS.showBlocked(false);
          }
          this.logPerf('tree.loadNodeChildren.total', perfStart, {
            field: fieldConfig?.field,
            type: fieldConfig?.type,
            node: node?.label ?? node?.key,
            children: Array.isArray(node.children) ? node.children.length : 0
          }, true);
          resolve();
        },
        error: () => {
          node.loading = false;
          if (shouldBlockUi) {
            this.messageS.showBlocked(false);
          }
          this.logPerf('tree.loadNodeChildren.error', perfStart, {
            field: fieldConfig?.field,
            type: fieldConfig?.type,
            node: node?.label ?? node?.key
          }, true);
          resolve();
        },
      });
    });
  }
  // ]]]FI

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
      void this._loadTreeNodeChildren(fieldConfig, node);
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
  // [[[II ESC:020-05 DOC:docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md#escenario-05
  treeSelectPanelStyleSignal = signal<{ [key: string]: string }>({ minWidth: '260px', maxWidth: 'min(92vw, 520px)' });
  // ]]]FI

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


  // ============================================================================
  // [[[II ESC:030-05 focus_after_select: navegacion de foco reusable y barata.
  // Registry/cache `field -> elemento enfocable` resuelto SOLO en eventos de foco
  // (onSelect de autocomplete, cambio de dropdown, Enter, Tab), NUNCA por tecla, y
  // sin escanear ni clonar el drawForm. Si `focus_after_select` no esta, viene
  // vacio o el destino no existe, NO se fuerza nada: actua la navegacion nativa
  // por tabindex.
  //
  // ALCANCE: formulario normal de este componente. La tabla (type='table') puede
  // reutilizar `resolveFocusTargetElement`/`applyFocusAfterSelect` para su propio
  // destino. Si a futuro se amplia a foco global, REUTILIZAR esta base, no
  // duplicarla.
  // ============================================================================
  private readonly _focusTargetCache = new Map<string, HTMLElement | null>();

  private _clearFocusTargetCache(): void {
    this._focusTargetCache.clear();
  }

  /** Clave canonica del destino (quita el prefijo object_ de los dropdown-like). */
  private _canonicalFocusField(field: any): string {
    if (typeof field !== 'string') return '';
    const trimmed = field.trim();
    return trimmed.startsWith('object_') ? trimmed.slice('object_'.length) : trimmed;
  }

  /**
   * Resuelve (y cachea) el elemento enfocable de un field dentro de ESTE
   * formulario. Soporta el marcador `data-focus-field`, el `inputId=field` que ya
   * ponen varios componentes PrimeNG (`#field`) y el espejo `object_<field>`. Si
   * el nodo hallado no es enfocable, baja al input interno. La resolucion se
   * cachea hasta el proximo cambio de drawForm.
   */
  resolveFocusTargetElement(field: string): HTMLElement | null {
    const key = this._canonicalFocusField(field);
    if (!key) return null;
    if (this._focusTargetCache.has(key)) return this._focusTargetCache.get(key) ?? null;

    const root: HTMLElement | undefined = this.host?.nativeElement;
    let el: HTMLElement | null = null;
    if (root) {
      const escaped = (typeof CSS !== 'undefined' && (CSS as any).escape) ? CSS.escape(key) : key;
      el = root.querySelector<HTMLElement>(`[data-focus-field="${key}"]`)
        ?? root.querySelector<HTMLElement>(`[data-focus-field="object_${key}"]`)
        ?? root.querySelector<HTMLElement>(`#${escaped}`);
      if (el && !this._isFocusableElement(el)) {
        el = el.querySelector<HTMLElement>('input, textarea, select, [tabindex]') ?? el;
      }
    }
    this._focusTargetCache.set(key, el);
    return el;
  }

  private _isFocusableElement(el: HTMLElement): boolean {
    const tag = el.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select'
      || tag === 'button' || el.hasAttribute('tabindex');
  }

  /**
   * Aplica `focus_after_select`. Devuelve true si movio el foco. No hace nada si
   * el destino no esta configurado o no existe (fallback: navegacion tabindex).
   */
  applyFocusAfterSelect(config: any): boolean {
    const target = config?.focus_after_select;
    if (typeof target !== 'string' || target.trim() === '') return false;
    const el = this.resolveFocusTargetElement(target.trim());
    if (!el) return false;
    // [[[II ESC:030-05 p-autoComplete re-enfoca su propio input tras onSelect (en
    // un timeout interno), lo que "regresaba" el foco al autocomplete. Se reasegura
    // el foco en una macrotarea posterior para ganar esa carrera sin depender de
    // detalles internos de PrimeNG. Solo ocurre en select/Enter/Tab, no por tecla. ]]]FI
    const focusTarget = () => { try { el.focus(); } catch { /* noop */ } };
    setTimeout(focusTarget, 0);
    setTimeout(focusTarget, 60);
    return true;
  }

  /**
   * [[[II ESC:030-05 Un autocomplete `free_or_relationship` permite captura MANUAL
   * aunque el servidor lo marque `readonly`, MIENTRAS no exista una opcion
   * seleccionada. Con seleccion activa se respeta el `readonly` del servidor. Los
   * autocompletes normales (no free_or_relationship) respetan el readonly tal
   * cual. No se hardcodea ningun nombre de campo. ]]]FI
   */
  isFreeAutoCompleteReadonly(config: any): boolean {
    if (config?.readonly !== true) return false;
    if (!this._isFreeOrRelationshipAutoComplete(config)) return true;
    const selected = this.formGroupSignal()?.get(this._autoCompleteObjectFieldName(config.field))?.value;
    return !!(selected && typeof selected === 'object' && !Array.isArray(selected));
  }
  // ]]]FI

  onKeydownTab(event: any, config: any) {
    this.onKeydownTabAction.emit({ event, field: config.field, config });
    if (this._autoCompleteSearchKeys(config).has('tab') && this._triggerAutoCompleteSearchKey(event, config)) return;
    // [[[II ESC:030-05 Solo se sobreescribe el Tab nativo cuando focus_after_select
    // resuelve un destino real; si no, se respeta la navegacion por tabindex. ]]]FI
    if (this.applyFocusAfterSelect(config)) {
      event?.preventDefault?.();
    }
  }

  onKeydownEnter(event: any, config: any) {
    this.onKeydownEnterAction.emit({ event, field: config.field, config });

    // [[[II ESC:030-16 Enter es la ruta explícita (también el default cuando no
    // viene search_key). En parcial conserva el mínimo de cinco caracteres. ]]]FI
    if (this._autoCompleteSearchKeys(config).has('enter') && this._triggerAutoCompleteSearchKey(event, config)) return;

    // [[[II ESC:030-05 ]]]FI
    this.applyFocusAfterSelect(config);
  }

  // [[[II ESC:030-16 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-16
  /** Ejecuta una tecla de búsqueda explícita sin inventar perfiles por campo. */
  onAutoCompleteKeydown(event: KeyboardEvent, config: any): void {
    const key = String(event?.key || '').toLowerCase();
    if (key === 'enter' || key === 'tab') return; // manejados por bindings propios
    if (!this._autoCompleteSearchKeys(config).has(key)) return;
    this._triggerAutoCompleteSearchKey(event, config);
  }

  private _triggerAutoCompleteSearchKey(event: any, config: any): boolean {
    const query = (this.formGroupSignal()?.get(config.field)?.value ?? '').toString().trim();
    const exact = this._autoCompleteSearchMode(config) === 'exact';
    if (!query || (!exact && query.length < this.autoCompleteMinLength(config))) {
      this.autoCompletePanelSuppressed.set(true);
      this.suggestions.set([]);
      return !!query;
    }

    event?.preventDefault?.();
    this.autoCompletePanelSuppressed.set(exact);
    this._runAutoCompleteSearch(config, query, { advanceOnNoMatch: true, autoApplyUnique: true });
    return true;
  }
  // ]]]FI

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

  // [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
  /**
   * Carga diferida del plugin de escáner. Separado en un método para poder
   * espiarlo en los specs sin abrir la cámara real.
   */
  private loadBarcodeScanner(): Promise<typeof import('@capacitor/barcode-scanner')> {
    return import('@capacitor/barcode-scanner');
  }
  // ]]]FI

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

      // [[[II ESC:031-02 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-02
      // Carga el plugin solo al escanear; un fallo de carga cae en el catch
      // existente y emite el mismo evento de error que antes.
      const { CapacitorBarcodeScanner } = await this.loadBarcodeScanner();
      // ]]]FI

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

  // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
  private readonly OMITTED_BASE64_CACHE_VALUE = '[cache:base64-omitted]';
  private readonly previewObjectUrls = new Set<string>();

  private isDataUrl(value: any): boolean {
    return typeof value === 'string' && /^data:[^;]+;base64,/.test(value);
  }

  private fileSizeFromDataUrl(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    const b64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    const padding = b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
  }

  private simpleFileHash(value: string): string {
    const len = value.length;
    const sample = len <= 384
      ? value
      : `${value.slice(0, 128)}${value.slice(Math.max(0, Math.floor(len / 2) - 64), Math.floor(len / 2) + 64)}${value.slice(-128)}`;
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
    }
    return `${len}:${Math.abs(hash)}`;
  }

  private buildFileIdentity(input: {
    field?: string;
    key?: string;
    file_name?: string;
    file?: string;
    size?: number;
    timestamp?: number;
    hash?: string;
  }): { size: number; hash: string; timestamp: number } {
    const file = input.file || '';
    const size = input.size ?? (this.isDataUrl(file) ? this.fileSizeFromDataUrl(file) : file.length);
    const hash = input.hash || (file ? this.simpleFileHash(file) : `${input.field || ''}:${input.key || ''}:${input.file_name || ''}`);
    const timestamp = input.timestamp || Date.now();
    return { size, hash, timestamp };
  }

  private fileDedupKey(file: any): string {
    const field = file?.field || file?.send_field || '';
    const key = file?.key || file?.local_field || '';
    const fileName = file?.file_name || file?.name || '';
    const size = file?._file_size ?? file?.size ?? (typeof file?.file === 'string' ? (this.isDataUrl(file.file) ? this.fileSizeFromDataUrl(file.file) : file.file.length) : 0);
    const fingerprint = file?._file_hash || file?.relation_id || file?.id || file?.hash || file?._file_timestamp || file?.timestamp || '';
    return `${field}|${key}|${fileName}|${size}|${fingerprint}`;
  }

  private dedupeFileList(files: any[]): any[] {
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const file of files) {
      const key = this.fileDedupKey(file);
      if (seen.has(key)) {
        this.releasePreviewUrl(file);
        continue;
      }
      seen.add(key);
      deduped.push(file);
    }
    return deduped;
  }

  private sameFileIdentity(a: any, b: any): boolean {
    const aHash = a?._file_hash || a?.hash;
    const bHash = b?._file_hash || b?.hash;
    if (aHash && bHash) {
      const sameHash = aHash === bHash;
      const sameSize = (a?._file_size ?? a?.size ?? null) === (b?._file_size ?? b?.size ?? null);
      const sameName = (a?.file_name || a?.name || '') === (b?.file_name || b?.name || '');
      const aSendField = a?.send_field || a?.field || '';
      const bSendField = b?.send_field || b?.field || '';
      return sameHash && sameSize && sameName && (!aSendField || !bSendField || aSendField === bSendField);
    }
    return this.fileDedupKey(a) === this.fileDedupKey(b);
  }

  private createPreviewUrl(file: string): { file: string; previewUrl?: string } {
    if (!this.isDataUrl(file)) {
      return { file };
    }
    try {
      const blob = this._dataUrlToBlob(file);
      const previewUrl = URL.createObjectURL(blob);
      this.previewObjectUrls.add(previewUrl);
      return { file: previewUrl, previewUrl };
    } catch {
      return { file };
    }
  }

  private releasePreviewUrl(file: any): void {
    const previewUrl = file?._preview_url;
    if (!previewUrl || !this.previewObjectUrls.has(previewUrl)) return;
    URL.revokeObjectURL(previewUrl);
    this.previewObjectUrls.delete(previewUrl);
  }

  private releaseAllPreviewUrls(): void {
    for (const previewUrl of this.previewObjectUrls) {
      URL.revokeObjectURL(previewUrl);
    }
    this.previewObjectUrls.clear();
  }

  private setFiles64(files: any[]): void {
    const nextFiles = this.dedupeFileList(files);
    const nextUrls = new Set(nextFiles.map((file: any) => file?._preview_url).filter(Boolean));
    for (const file of this.files64Signal()) {
      const previewUrl = file?._preview_url;
      if (previewUrl && !nextUrls.has(previewUrl)) {
        this.releasePreviewUrl(file);
      }
    }
    this.files64Signal.set(nextFiles);
    this.files64Action.emit(nextFiles);
  }

  private resolveDocumentsField(fieldName?: string, formGroup: FormGroup | null = this.formGroupSignal()): string | null {
    if (!fieldName) return null;
    const documentsCandidate = fieldName.replace(/files$/, 'documents');
    if (documentsCandidate === fieldName) return null;
    return formGroup?.get(documentsCandidate) ? documentsCandidate : null;
  }

  // [[[II ESC:001-12 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-12
  private rebuildFileSplitButtonValidationTargets(drawForm = this.drawFormSignal(), formGroup = this.formGroupSignal()): void {
    const targets: Record<string, string[]> = {};

    if (!drawForm || !formGroup) {
      this.fileSplitButtonValidationTargets = targets;
      this.fileSplitButtonInvalidSignal.set({});
      return;
    }

    const seen = new WeakSet<object>();
    const walk = (node: any): void => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);

      if (node.type === 'files' || node.type === 'file' || node.type === 'document') {
        const stateKey = this.fileSplitButtonStateKey(node, formGroup);
        if (stateKey) {
          node._fileSplitButtonInvalidKey = stateKey;
          const current = targets[stateKey] || [];
          targets[stateKey] = Array.from(new Set([...current, ...this.fileSplitButtonControlNames(node, formGroup)]));
        }
      }

      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') walk(child);
      }
    };

    walk(drawForm);
    this.fileSplitButtonValidationTargets = targets;
    this.refreshFileSplitButtonInvalidState();
  }

  private fileSplitButtonStateKey(fieldConfig: any, formGroup: FormGroup): string {
    const fieldName = fieldConfig?.field;
    const keyName = fieldConfig?.key;

    if (keyName && keyName !== fieldName) return keyName;
    if (fieldName) return fieldName;

    const documentsField = this.resolveDocumentsField(fieldName, formGroup);
    return documentsField || '';
  }

  private fileSplitButtonControlNames(fieldConfig: any, formGroup: FormGroup): string[] {
    const fieldName = fieldConfig?.field;
    const keyName = fieldConfig?.key;
    const controls = new Set<string>();
    const hasDistinctKey = !!(keyName && keyName !== fieldName);

    if (hasDistinctKey) controls.add(keyName);
    if (fieldName) controls.add(fieldName);

    if (!hasDistinctKey) {
      const documentsField = this.resolveDocumentsField(fieldName, formGroup);
      if (documentsField) controls.add(documentsField);
    }

    return Array.from(controls);
  }

  private refreshFileSplitButtonInvalidState(): void {
    const formGroup = this.formGroupSignal();
    const next: Record<string, boolean> = {};

    if (!formGroup) {
      this.fileSplitButtonInvalidSignal.set(next);
      return;
    }

    for (const [stateKey, controlNames] of Object.entries(this.fileSplitButtonValidationTargets)) {
      next[stateKey] = controlNames.some((controlName) => {
        const control = formGroup.get(controlName);
        return (!!control?.invalid && (control.dirty || control.touched)) || this.fileSplitButtonHasServerError(controlName);
      });
    }

    this.fileSplitButtonInvalidSignal.set(next);
  }

  private extractErrorFieldsFromMessage(msg: any): Set<string> {
    const fields = new Set<string>();
    const err = msg?.err;
    if (!err) return fields;

    if (Array.isArray(err.local)) {
      err.local.forEach((errorObject: any) => this.addErrorField(fields, errorObject?.field));
      return fields;
    }

    const errors = err.error?.errors;
    const errorsArray = Array.isArray(errors) ? errors : (errors ? [errors] : []);
    errorsArray.forEach((error: any) => {
      const pointer = error?.source?.pointer;
      if (typeof pointer === 'string') {
        const parts = pointer.split('/').filter(Boolean);
        this.addErrorField(fields, parts[parts.length - 1]);
      }
      this.addErrorField(fields, error?.source?.parameter);
    });

    return fields;
  }

  private addErrorField(fields: Set<string>, field: any): void {
    if (typeof field === 'string' && field.trim()) fields.add(field.trim());
  }

  private fileSplitButtonHasServerError(controlName: string): boolean {
    if (!this.fileSplitButtonServerErrorFields.size) return false;
    return this.fileSplitButtonControlAliases(controlName)
      .some((alias) => this.fileSplitButtonServerErrorFields.has(alias));
  }

  private fileSplitButtonControlAliases(controlName: string): string[] {
    const clean = controlName.startsWith('object_') ? controlName.slice('object_'.length) : controlName;
    const aliases = new Set<string>([controlName, clean]);

    const filesIndex = clean.lastIndexOf('_files');
    if (filesIndex >= 0) aliases.add(clean.slice(filesIndex + 1));
    if (clean.endsWith('_files')) aliases.add('files');

    const documentsIndex = clean.lastIndexOf('_documents');
    if (documentsIndex >= 0) aliases.add(clean.slice(documentsIndex + 1));
    if (clean.endsWith('_documents')) aliases.add('documents');

    return Array.from(aliases).filter(Boolean);
  }
  // ]]]FI

  private resolveFileTargets(payload: { field?: string; fieldConfig?: any }): { sendField?: string; localField?: string; key?: string } {
    const formGroup = this.formGroupSignal();
    const currentKey = payload.fieldConfig?.key;
    const documentsField = this.resolveDocumentsField(payload.field, formGroup);
    const isFileLike = payload.fieldConfig?.type === 'files'
      || payload.fieldConfig?.type === 'file'
      || payload.fieldConfig?.type === 'document'
      || !!documentsField;
    const keyControlExists = !!(currentKey && currentKey !== payload.field && formGroup?.get(currentKey));
    const sendField = isFileLike && documentsField ? documentsField : (keyControlExists ? currentKey : (payload.field || currentKey));
    const localField = keyControlExists ? currentKey : sendField;
    return { sendField, localField, key: currentKey };
  }

  private buildPreviewFileObject(fileObject: any, previewField?: string): any {
    const preview = this.createPreviewUrl(fileObject.file);
    return {
      ...fileObject,
      file: preview.file,
      field: previewField || fileObject.local_field || fileObject.field,
      send_field: fileObject.send_field || fileObject.field,
      _preview_url: preview.previewUrl,
      _preview_only: true
    };
  }

  private buildLocalFileRef(fileObject: any, localField: string): any {
    return {
      type: fileObject.type,
      file_name: fileObject.file_name,
      file: `[ref:${fileObject._file_hash}]`,
      step: fileObject.step,
      field: fileObject.send_field || fileObject.field,
      key: fileObject.send_field || fileObject.field,
      local_field: localField,
      send_field: fileObject.send_field || fileObject.field,
      _file_size: fileObject._file_size,
      _file_hash: fileObject._file_hash,
      _file_timestamp: fileObject._file_timestamp,
      _local_only: true
    };
  }

  private fileControlItems(value: any): any[] {
    if (value == null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  }

  private setFileRecordInControl(controlName: string | undefined, record: any): void {
    if (!controlName) return;
    const control = this.formGroupSignal()?.get(controlName);
    if (!control) return;

    const currentItems = this.fileControlItems(control.value);
    const existingUrls = currentItems.filter((item: any) => typeof item === 'string');
    const existingRecords = currentItems.filter((item: any) => item && typeof item === 'object');
    const nextRecords = this.dedupeFileList([...existingRecords, record]);
    const combined = [...existingUrls, ...nextRecords];
    control.setValue(combined.length > 0 ? combined : null);
    control.markAsDirty();
  }

  private removeFileRecordFromControl(controlName: string | undefined, fileToRemove: any): void {
    if (!controlName) return;
    const control = this.formGroupSignal()?.get(controlName);
    if (!control) return;

    const currentItems = this.fileControlItems(control.value);
    const nextItems = currentItems.filter((item: any) => {
      if (!item || typeof item !== 'object') return true;
      return !this.sameFileIdentity(item, fileToRemove);
    });
    control.setValue(nextItems.length > 0 ? nextItems : null);
    control.markAsDirty();
  }

  private collectServerUploadCacheFields(): Set<string> {
    const drawForm = this.drawFormSignal();
    const formGroup = this.formGroupSignal();
    const fields = new Set<string>();

    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      if ((node.type === 'files' || node.type === 'file' || node.type === 'document') && node.server_upload?.active === true) {
        if (node.field) {
          fields.add(node.field);
          const documentsField = this.resolveDocumentsField(node.field, formGroup);
          if (documentsField) fields.add(documentsField);
        }
        if (node.key) fields.add(node.key);
      }
      ['grid', 'card', 'fieldset', 'fields'].forEach(key => {
        if (node[key] && typeof node[key] === 'object') {
          Object.values(node[key]).forEach((child: any) => visit(child));
        }
      });
      if (node.stepper?.steps) {
        Object.values(node.stepper.steps).forEach((step: any) => {
          if (step?.fields) Object.values(step.fields).forEach((child: any) => visit(child));
        });
      }
    };

    visit(drawForm);
    return fields;
  }

  private isFileRecordLike(record: any): boolean {
    return !!(
      record &&
      typeof record === 'object' &&
      ('file' in record || 'file_name' in record || '_file_hash' in record || 'relation_id' in record)
    );
  }

  private sanitizeFileRecordForCache(record: any, omitBase64: boolean): any {
    if (!this.isFileRecordLike(record)) return record;
    const sanitized = { ...record };
    delete sanitized._preview_url;
    delete sanitized._preview_only;
    if (omitBase64 && this.isDataUrl(sanitized.file)) {
      sanitized.file = this.OMITTED_BASE64_CACHE_VALUE;
      sanitized._cache_omitted_base64 = true;
    }
    if (omitBase64 && sanitized._local_only) {
      sanitized._cache_omitted_base64 = true;
    }
    return sanitized;
  }

  private stripOmittedBase64FromCachedPayload(data: any): any {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const cleaned: any = {};
    for (const [field, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        const next = value.filter((item: any) => {
          if (!item || typeof item !== 'object') return true;
          return item.file !== this.OMITTED_BASE64_CACHE_VALUE && !item._cache_omitted_base64;
        });
        cleaned[field] = next.length > 0 ? next : null;
      } else if (
        value &&
        typeof value === 'object' &&
        ((value as any).file === this.OMITTED_BASE64_CACHE_VALUE || (value as any)._cache_omitted_base64)
      ) {
        cleaned[field] = null;
      } else {
        cleaned[field] = value;
      }
    }
    return cleaned;
  }

  private hasRestorableCachePayload(data: any): boolean {
    const hasValue = (value: any): boolean => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.some((item: any) => hasValue(item));
      if (typeof value === 'boolean') return value === true;
      if (typeof value === 'object') return Object.values(value).some((item: any) => hasValue(item));
      return true;
    };

    return hasValue(data);
  }

  private sanitizeCachePayloadForFiles(data: any): any {
    const serverUploadFields = this.collectServerUploadCacheFields();
    const sanitized: any = {};
    for (const [field, value] of Object.entries(data || {})) {
      const omitBase64 = serverUploadFields.has(field);
      if (Array.isArray(value)) {
        const items = value.map((item: any) => this.sanitizeFileRecordForCache(item, omitBase64));
        const hasFileRecords = items.some((item: any) => this.isFileRecordLike(item));
        sanitized[field] = hasFileRecords ? this.dedupeFileList(items) : items;
      } else {
        sanitized[field] = this.sanitizeFileRecordForCache(value, omitBase64);
      }
    }
    return sanitized;
  }

  private buildFormCachePayload(value: any, fields: string[]): any {
    const filtered: any = {};
    for (const field of fields) {
      if (field in value) filtered[field] = value[field];
      const documentsField = this.resolveDocumentsField(field);
      if (documentsField && documentsField in value) filtered[documentsField] = value[documentsField];
    }
    return this.sanitizeCachePayloadForFiles(filtered);
  }
  // ]]]FI

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

    // [[[II ESC:014-01 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-01
    // Ruteo de base64:
    //   - `sendField`: control que viaja al servidor. Si existe sibling
    //     *_documents, ahi queda el base64 completo.
    //   - `localField`: control separado por key/step. Si difiere de sendField,
    //     recibe solo un placeholder liviano para validar sin duplicar base64.
    //   Ver tambien docs/documents/2026-05-16_001. ]]]FI
    const formGroup = this.formGroupSignal();
    const targets = this.resolveFileTargets(payload);
    const base64TargetField = targets.sendField;
    const localTargetField = targets.localField;
    const currentKey = targets.key;
    const fileIdentity = this.buildFileIdentity({
      field: base64TargetField,
      key: currentKey,
      file_name: fileName,
      file: payload.file
    });

    const fileObject = {
      type: payload.type,
      file_name: fileName,
      file: payload.file,
      step: currentStep,
      field: base64TargetField, // [[[II marcar destino real para el sweep de submitForm ]]]FI
      key: currentKey,
      local_field: localTargetField,
      send_field: base64TargetField,
      _file_size: fileIdentity.size,
      _file_hash: fileIdentity.hash,
      _file_timestamp: fileIdentity.timestamp
    };

    const previewObject = this.buildPreviewFileObject(fileObject, localTargetField || base64TargetField);
    this.setFiles64([...this.files64Signal(), previewObject]);

    // Escribir base64 en el control destino
    if (base64TargetField) {
      this.setFileRecordInControl(base64TargetField, fileObject);

      if (localTargetField && localTargetField !== base64TargetField) {
        this.setFileRecordInControl(localTargetField, this.buildLocalFileRef(fileObject, localTargetField));
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
    // [[[II ESC:014-03 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-03
    this.setFiles64([...this.files64Signal(), entry]);
    this._saveFormCacheNow();
    // ]]]FI
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
        this.setFiles64(newFiles);
      }
      this._saveFormCacheNow();
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

      // [[[II ESC:014-02 DOC:docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md#escenario-02
      // Crear nueva referencia del array sin el elemento eliminado
      const newFiles = allFiles.filter((_, index) => index !== realIndex);
      this.setFiles64(newFiles);
      //console.log(`🗑️ Archivo eliminado del step ${fileToRemove.step}`);

      this.removeFileRecordFromControl(fileToRemove.send_field || fileToRemove.field, fileToRemove);
      if (fileToRemove.local_field && fileToRemove.local_field !== (fileToRemove.send_field || fileToRemove.field)) {
        this.removeFileRecordFromControl(fileToRemove.local_field, fileToRemove);
      }
      this._saveFormCacheNow();
      // ]]]FI
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

    this.setFiles64(filteredFiles);
  }

  /**
   * Limpia TODOS los archivos multimedia (incluidas firmas) cuando se resetea el formulario
   */
  clearAllMediaFiles(): void {
    //console.log('🧹 Limpiando TODOS los archivos multimedia por reset del formulario');
    this.setFiles64([]);
  }

  /**
   * Inicializa los datos de una tabla con filas vacías
   */
  // [[[II ESC:011-01 DOC:docs/documents/2026-06-02_011_custom-draw-form-table-formarray.md#escenario-01 ESC:015-01 DOC:docs/documents/2026-06-02_015_dynamic-table-field-component.md#escenario-01 ESC:001-09 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-09
  initializeTableData(tableConfig: any): any[] {
    const data: any[] = [];
    const initialRows = tableConfig?.initial_rows || 0;
    // [[[II ESC:030-06 columns acepta lista o dict numerado {0:...} ]]]FI
    const columns = this.generalS.configuredTableColumns(tableConfig?.columns);
    for (let i = 0; i < initialRows; i++) {
      const row: any = {};
      columns.forEach((col: any) => {
        row[col.field] = this.getTableColumnDefaultValue(col);
      });
      data.push(row);
    }

    return data;
  }
  // ]]]FI

  getFormControl(field: string): FormControl | null {
    const formGroup = this.formGroupSignal();
    if (!formGroup) return null;
    return formGroup.get(field) as FormControl;
  }

  // [[[II ESC:011-01 DOC:docs/documents/2026-06-02_011_custom-draw-form-table-formarray.md#escenario-01 ESC:015-01 DOC:docs/documents/2026-06-02_015_dynamic-table-field-component.md#escenario-01 ESC:001-17 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-17 ESC:030-03 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-03
  getTableFormArray(field: string): FormArray | null {
    const formGroup = this.formGroupSignal();
    const control = formGroup?.get(field);
    return control instanceof FormArray ? control : null;
  }

  private getTableColumnDefaultValue(column: any): any {
    if (column?.type === 'input-number' || column?.type === 'date') {
      return null;
    }
    if (column?.type === 'multi-select' || column?.type === 'multi-choice' || column?.type === 'listbox') {
      return [];
    }
    // [[[II ESC:030-06 toggle-button es el tipo bool de columnas (is_bool); sin
    // esta rama caía a '' y la celda booleana quedaba vacía. ]]]FI
    if (column?.type === 'checkbox' || column?.type === 'toggle-button') {
      return false;
    }
    return '';
  }

  private createTableRowFormGroup(tableConfig: any, rowData: any = {}): FormGroup {
    const rowGroup: any = {};

    this.generalS.configuredTableColumns(tableConfig?.columns).forEach((col: any) => {
      const validators: any[] = [];
      // [[[II ESC:030-14 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-14
      // Misma resolución que la celda: `editable` no es permiso de tabla,
      // local_editable está temporalmente deshabilitado; readonly/edit/default.edit
      // deciden el validator required. ]]]FI
      const editable = col.readonly !== true && col.edit !== false && col.default?.edit !== false;

      if (col.required && editable) {
        validators.push(Validators.required);
      }
      // Longitudes: validation.* o los campos naturales de input_text (max_length/
      // min_length top-level). En auto-complete el umbral es
      // min_search_length, no una validación del valor persistido.
      const isTextColumn = col.type === 'input-text' || col.type === 'textarea';
      const maxLength = col.validation?.max_length ?? (isTextColumn ? col.max_length : undefined);
      const minLength = col.validation?.min_length ?? (isTextColumn ? col.min_length : undefined);
      if (maxLength) {
        validators.push(Validators.maxLength(maxLength));
      }
      if (minLength) {
        validators.push(Validators.minLength(minLength));
      }

      const rawValue = rowData?.[col.field];
      const isDropdown = col.type === 'dropdown' || col.type === 'dropdown-choice';
      const displayValue = rowData?.[`${col.field}__name`];
      const value = isDropdown
        ? rawValue
        : (displayValue !== undefined && displayValue !== null && displayValue !== ''
          ? displayValue
        : (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
          ? this.generalS.formatDynamicValue(rawValue, col)
          : rawValue));

      rowGroup[col.field] = new FormControl(
        value !== undefined ? value : this.getTableColumnDefaultValue(col),
        validators
      );
    });

    // [[[II ESC:030-20 La relación viaja como control real de la fila. ]]]FI
    this.generalS.configuredRelationshipFields(tableConfig?.columns).forEach((field: string) => {
      if (rowGroup[field]) return;
      rowGroup[field] = new FormControl(rowData?.[field] ?? null);
    });

    const group = this.fb.group(rowGroup);
    (group as any)[this.tableRowSourceFlag] = rowData;
    return group;
  }

  updateTableFormControl(field: string, data: any[], markDirty: boolean = true, tableConfig: any = null): void {
    const formArray = this.getTableFormArray(field);
    if (!formArray) return;

    while (formArray.length) {
      formArray.removeAt(0, { emitEvent: false });
    }

    const config = tableConfig || { columns: Object.keys(data?.[0] || {}).map((columnField: string) => ({ field: columnField })) };
    (data || []).forEach((rowData: any) => {
      formArray.push(this.createTableRowFormGroup(config, rowData), { emitEvent: false });
    });

    if (markDirty) {
      formArray.markAsDirty();
      formArray.root?.markAsDirty();
    }

    formArray.updateValueAndValidity();
  }

  private _tableServerResource(tableConfig: any): { app: string; type: string } | null {
    const resource = this.crudS.getAppType(tableConfig?.data_type?.type);
    return resource?.app && resource?.type ? { app: resource.app, type: resource.type } : null;
  }

  private _rollbackTableEdit(event: any): void {
    const row = this.getTableFormArray(event?.field)?.at(event?.rowIndex);
    if (!(row instanceof FormGroup)) return;

    if (event?.colField && Object.prototype.hasOwnProperty.call(event, 'previousValue')) {
      row.get(event.colField)?.setValue(event.previousValue, { emitEvent: false });
    } else if (event?.previousRowData && typeof event.previousRowData === 'object') {
      row.patchValue(event.previousRowData, { emitEvent: false });
    }
    row.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Persiste solo columnas con `scope_edition: 'server'`. Las demás conservan
   * la edición local y las filas derivadas de vista previa nunca hacen PATCH.
   */
  handleTableEdit(event: any, tableConfig: any, output: EventEmitter<any>): void {
    output.emit(event);
    if (event?.isDerivedDraft === true) return;

    // [[[II ESC:030-06 columns acepta lista o dict numerado {0:...}; se normaliza
    // UNA vez y se propaga ya como array (el host no re-normaliza). ]]]FI
    const configuredColumns = this.generalS.configuredTableColumns(tableConfig?.columns);

    // [[[II Delegación al motor del host: en vez de persistir aquí (segundo motor),
    // se emite el contexto explícito de la fila para que el host reutilice
    // save({table_row}) (pos transitorio) — mismo flujo del detalle: validación,
    // relaciones, creación del padre, POST/PATCH y proyección de respuesta. ]]]FI
    if (this.delegateTableSave) {
      const rowId = event?.sourceRow?.id ?? event?.rowData?.id;
      this.onTableRowSave.emit({
        field: tableConfig?.field,
        row_index: event?.rowIndex,
        row_data: event?.rowData,
        source_row: event?.sourceRow,
        columns: configuredColumns,
        mode: rowId ? 'edit' : 'create',
      });
      return;
    }

    const resource = this._tableServerResource(tableConfig);
    const sourceRow = event?.sourceRow;
    const rowId = sourceRow?.id ?? event?.rowData?.id;
    if (!resource || !rowId) return;

    const serverColumns = event?.colField
      ? configuredColumns.filter((column: any) => column?.field === event.colField && column?.scope_edition === 'server')
      : configuredColumns.filter((column: any) => column?.scope_edition === 'server');
    if (!serverColumns.length) return;

    const rowData = event?.rowData ?? event?.data?.[event?.rowIndex] ?? {};
    const formData: any = {};
    const relationships: any[] = [];
    serverColumns.forEach((column: any) => {
      const value = rowData?.[column.field];
      const relation = this.crudS.getAppType(column?.data_type?.type);
      if (relation?.type) {
        relationships.push({ field: column.field, id: value, type: relation.type });
      } else {
        formData[column.field] = value;
      }
    });

    this.crudS.edit({
      app: resource.app,
      type: resource.type,
      id: rowId,
      formData,
      relationships,
    }).subscribe({
      next: () => {
        if (sourceRow && typeof sourceRow === 'object') Object.assign(sourceRow, formData);
      },
      error: (error: any) => {
        this._rollbackTableEdit(event);
        this.messageS.changeMessage('No fue posible guardar la edición de la tabla.', error, {}, 'error');
      },
    });
  }

  /** Elimina en `data_type` únicamente filas confirmadas; ante error restaura la fila local. */
  handleTableDelete(event: any, tableConfig: any): void {
    this.onTableDeleteRow.emit(event);
    if (event?.isDerivedDraft === true) return;

    const resource = this._tableServerResource(tableConfig);
    const rowId = event?.sourceRow?.id ?? event?.rowData?.id;
    if (!resource || !rowId) return;

    this.crudS.delete(rowId, resource.app).subscribe({
      error: (error: any) => {
        const formArray = this.getTableFormArray(event.field);
        if (formArray) {
          const restoredData = { ...(event.sourceRow || {}), ...(event.rowData || {}) };
          const restored = this.createTableRowFormGroup(tableConfig, restoredData);
          formArray.insert(Math.min(event.rowIndex ?? 0, formArray.length), restored, { emitEvent: false });
          formArray.updateValueAndValidity({ emitEvent: false });
        }
        this.messageS.changeMessage('No fue posible eliminar la fila de la tabla.', error, {}, 'error');
      },
    });
  }

  validateTable(tableField: string): void {
    this.tablesToValidate[tableField] = true;
    this.tableValidationVersion++;
  }
  // ]]]FI

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
      this.setFiles64(newFiles);
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
