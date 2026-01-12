import { computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MessageService } from '@/components/services/message.service';
import { CRUDService } from './services/crud.service';
import { GeneralService } from './services/general.service';
import { SharedDynamicDataService } from './services/shared-dynamic-data.service';
import { Router } from '@angular/router';

/**
  Contiene las declaraciones y las importaciones de curd 
*/
/*@Injectable({
  providedIn: 'root'
})*/
export class Vars {
  protected fb: FormBuilder = inject(FormBuilder); // para crear el formulario
  protected messageS: MessageService = inject(MessageService); // para mostrar mensajes
  protected generalS: GeneralService = inject(GeneralService); // funciones generales
  protected confirmationS: ConfirmationService = inject(ConfirmationService); // para confirmar acciones
  //protected classifierS: ClassifierService = inject(ClassifierService); // para clasificadores
  protected sharedS: SharedDynamicDataService = inject(SharedDynamicDataService); // para datos dinámicos
  //protected crudS: any = inject(CRUDService); // servicio CRUD


  constructor(protected crudS: CRUDService) {
    //°°° DESPRECIADO
    /*this.commonIdCode = [
            { field: 'id', },
            { field: 'code', },
        ]
        this.commonGeneralName = [

            { field: 'name', },
            { field: 'description', },
        ];
        this.commonGeneralName2 = [
            { field: 'short_name', },
            { field: 'name2', },
        ];
        this.commonGeneralBool = [
            { field: 'is_active__text', },
            { field: 'is_default__text', },
            { field: 'sys__text', },
        ];
        this.commonVoidable = [
            { field: 'is_voidable__text', }
        ];
        this.commonGeneralCrud = [
            { field: 'created_at', },
            { field: 'created_by__name', },
            { field: 'modified_at', },
            { field: 'modified_by__name', },
            { field: 'inactivated_at', },
            { field: 'inactivated_by__name', },
        ];
        this.commonId = [
            { field: 'id', },
        ]

        this.commonName = [
            { field: 'name', },
        ]*/
  }

  /**
   * muestra u oculta el dialogo para la configuración local
   */
  public localSettingsDialogVisible = signal<boolean>(false);

  /**
   * Más opciones del menú
   */
  public moreOptions = signal<any[]>([]);

  /**
   * indica si se crea o actualiza el registro, true para crear false para actualizar
   */
  public isCreate = false;

  /**
   * formulario para el crud, contiene el form de la app ACTUAL
   */
  public form = signal<FormGroup[]>([]);

  /**
   * Encabezado del dialogo para el crud, contiene el encabezado de la app ACTUAL
   */
  public headerDialog = signal('');

  /**
   * Encabezado del dialogo para el crud, contiene el encabezado de la app ACTUAL
   */
  public headerDialogSecundary = signal('');

  /**
   * Contiene los elementos seleccionados de la tabla de la app ACTUAL
   */
  public selected = signal<any[]>([]);

  public seletedNode = signal<any[]>([]);

  /**
   * Contiene los elementos de la tabla de la app ACTUAL
   */
  public items = signal<any[]>([]);

  /**
   * Caché de los elementos de la tabla de la app ACTUAL
   */
  protected itemsCache: { [key: string]: any[] } = {};


  /**
   * Muestra u oculta el dialogo para la exportación
   */
  protected exportDialogVisible = signal<boolean>(false);

  /**
   * Muestra u oculta el dialogo para la importación
   */
  protected importDialogVisible = signal<boolean>(false);

  /**
   * Muestra u oculta el dialogo para la acción de varios elementos seleccionados
   */
  protected actionsSelectionDialogVisible = false;

  /**
   * Form de la configuración local del modulo
   */
  configForm: FormGroup = this.fb.group({});

  /**
   * Varible que inicica donde inicia la app, se inicializa en la clase hija
   */
  protected typeDefault: string = ''//signal<string>(''); // por ejemplo, 'unit', 'currency', 'product', etc

  /**
   * indica la app sobre la que se esta trabajando, por ejemplo, tax, currency, etc
   */
  protected pos = signal<string>('');

  protected posBefore = -1;

  // paramateros url dja
  /**
   * relaciones para la consulta al servidor
   */
  protected include = '';

  /**
   * campos para la consulta al servidor
   **/
  protected fields: { [key: string]: string } = { 0: '' };

  /**
   * ordenamiento para la consulta al servidor
   */
  protected sort = '';

  /**
   * filtro para la consulta al servidor
   */
  protected filter = 'filter[is_active]=true';

  /**
   * numero de registros que retornará la consula
   */
  //protected limit = signal<string[]>([250]); //any[] = [2];
  limit = signal<{ [key: string]: number }>({ 0: 250 });

  /**
   * punto inicial de la paginación
   */
  protected offset: any[] = [0];

  totalRecords = signal<{ [key: string]: number }>({});

  // para todas las apps
  /**
   * se utiliza para completar las funciones crud del servicio, se inicializa en las clases heredadas
   */
  protected type: { [key: string]: string } = {};

  /**
   * se utiliza para completar las funciones crud del servicio, se inicializa en las clases heredadas
   */
  protected app: { [key: string]: string } = {};

  /**
   * muestra u oculta el dialogo del crud
   */
  protected formDialogVisible: { [key: string]: boolean } = { '0': false };

  /**
   * form temporal que contiene los forularios de las app
   */
  protected formTempo: FormGroup[] = [];

  /**
   * Contienes todas las columnas(campos) de la app ACTUAL, mismo caso que columns pero este contiene un array de
   * las columnas de cada app
   */
  public cols = signal<any[]>([]);

  /**
   * columnas de la tabla de elementos, se inicializa en las clases heredadas
   */
  protected columns: any[][] = [];

  /**
   * Contiene las columnas
   */
  protected removeColumns = signal<any[]>([]);

  protected columnsSecundary = signal<any[][]>([]);

  /**
   * Campos de cada app que se cargas desde el servidor
   */
  protected optionsFields: any[][] = [];

  /**
   * relaciones de la app para dar de alta no para consultar,los valores locales val [0][pos] y reemplazan los valores que vienen
   * del servidor, ejemplo, this.relationships[][this.typeDefault] = [{ id: 'asset_type', field: 'asset_type__', type: 'asset-type' }]
   * notar que primero va el 0
   */
  relationships: { [key: string]: any[] } = {};

  /**
     * Los campos que se que inicialmente no se mostraran en la tabla, se inicializan en las clases heredadas, pero
      °°°deberian venir del servidor por ejemplo: ['id', 'description', 'sys_data']
      'id', 'description', 'short_name', 'name2', 'sys__text', 'created_at', 'modified_at', 'inactivated_at',
      'created_by__name', 'modified_by__name', 'inactivated_by__name'
    */
  public itemsRemove: string[][] = [
    ['id', 'description', 'short_name', 'name2', 'sys__text', 'created_at', 'modified_at', 'inactivated_at', 'created_by__name', 'modified_by__name', 'inactivated_by__name', 'time_zone', 'external_code_number', 'external_code_text']
  ]; //la posicion 0 es el valor por default
  //la posicion 0 es el valor por default

  /**
   * valores para restablecer el formulario, se inicializan en las clases heredadas, name: '', description: '', short_name: '', name2: '',
   * is_active: true, is_default: false, external_code_text:'',  time_zone:''
   */
  //°°° DEPRECADO
  public resetForm: any[] = [
    {
      name: '',
      description: '',
      short_name: '',
      name2: '',
      is_active: true,
      is_default: false,
      external_code_text: '',
      time_zone: ''
    }
  ]; //external_code_number:'', debe ser nulo
  //la posicion 0 es el valor por default

  /**
   * Singular para los mensajes de cada app
   */
  protected singular: { [key: string]: string } = { default: 'registro' };

  /**
   * Plural para los mensajes de cada app
   */
  protected plural: { [key: string]: string } = { default: 'registros' };

  /**
   * Artículo indefinido singular para los mensajes de cada app
   */
  protected singularIndefiniteArticle: { [key: string]: string } = { default: 'el registro' };

  /**
   * Artículo definido plural para los mensajes de cada app
   */
  protected pluralDefiniteArticle: { [key: string]: string } = { default: 'los registros' };

  /**
   * Contiene los clasificadores de la app, se inicializa en las clases heredadas
   */
  protected module: { [key: string]: any } = {};

  /**
   * contiene los elementos que se muestra en la tabla de las apps, se utiliza para recargar los elementos
   * cuando se crea o edita un elemento, ya que cada vez que se crea un elemento se debe mostrar la tabla
   */
  //protected itemsNew: any[][] = [];

  /**
   * Los campos bool que requieran el texto cuando son verdaderos o falsos, los valores locales val [0][pos] y reemplazan los valores que vienen
   * del servidor, ejemplo, this.fieldsBool[0][this.typeDefault] = [{ field: 'is_active', default: false }];, notar que primero va el 0
   */
  protected fieldsBool: any[0][] = [[]];

  //[{ field: 'is_default', default: false }, { field: 'is_active', default: true }, { field: 'sys', default: false }]
  //la posicion 0 es donde estan los valores que no vienen del servidor y en caso de llamarse igual se reemplazan

  /**
   * Los campos con  información fija que requieran cambiar el valor por nombre, tipo producto, deve ser un array con la clave y el array de clave:clave:valor
   * ejemplo: [['product_type', this.crudS.product_types]]
   */
  protected moreFields: any[][] = []; //[['product_type', this.crudS.product_types]]

  /**
   * Los campos que contienen fechas y horas y que se deben formatear a la hora local
   */

  protected timeZone: { [key: string]: string[] } = {}; // Permite asignar arrays por tipo
  public getTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  /**
   * id, name, description
   */
  //°°° DEPRECADO
  protected commonGeneralName: any = null;

  /**
   * id, code
   */
  //°°° DEPRECADO
  protected commonIdCode: any = [];

  /**
   * short_name, name2
   */
  //°°° DEPRECADO
  protected commonGeneralName2: any = null;

  /**
   * is_active__text, is_default__text, sys__text
   */
  //°°° DEPRECADO
  protected commonGeneralBool: any = null;

  /**
   * is_voidable__text
   */
  //°°° DEPRECADO
  protected commonVoidable: any = null;

  /**
   * id
   */
  //°°° DEPRECADO
  protected commonId: any = null;

  /**
   * name
   */
  //°°° DEPRECADO
  protected commonName: any = null;

  /**
   * created_at, created_by__name, modified_at, modified_by__name, inactivated_at, inactivated_by__name
   */
  //°°° DEPRECADO
  protected commonGeneralCrud: any = null;

  /**
   * los campos que se se mostrarán como activos en los registros del sistema, por ejemplo, is_active, is_default
   */
  activate_sys: string[] = ['is_active'];

  /**
   * Campos que son de escritura en la consulta options al servidor y que deben excluirse en el formulario,
   * o que tienen un valor que se necesita personalizar
   */
  excludeFieldsForm: { [key: string]: any[] } = {};

  /**
   * Campos que no se encuentran en la consulta options al servidor y que se deben incluir en el formulario, principalmente para
   * procesos locales o adicionales como los campos de busqueda, normalmente no hay necesidad de los bool
   */
  protected includeFieldsForm: { [key: string]: any[] } = {};
  /**
   * Campos que pueden venir del servidor y que se deben agregar a las columnas, pero de viene en su propio diciconario, por ejemplo,
   * base_product _data, sirver para crear las columnas de la tabla, que contiene datos de mas de una app y que el Options
   * se envia nombreCampo _data normalmente son campos fk
   */
  additionalFieldsAppCols: { [key: string]: any } = {};

  /**
   * Campos que se deben excluir de la tabla, por ejemplo, id, description, sys_data
   */
  excludeFieldsCols: { [key: string]: any[] } = {};

  //selectedColumns = computed(() => this.cols().filter(col =>  !this.removeColumns().includes(col.field)));
  selectedColumns = computed(() => {
    if (!this.cols()) return [];
    return this.cols().filter((col: any) => {
      //console.log('filter');
      return !this.removeColumns().includes(col.field);
    });
    //this.configForm.controls['columns'].setValue(col);
  });

  /**
   * Los campos y valores que se mostrarán en el formulario de configuración local
   */
  public fieldConfig = signal<any>({
    cols: ([] = [])
  });

  /**
   * Los campos y valores que se mostrarán en el formulario de exportación
   */
  public fieldExport = signal<any>({
    cols: ([] = [])
  });

  /**
   * Las funciones que se mostrarán en el boton de nuevo registro, se inicializan en las clases heredadas
   * si no es un array se muestra como un botton simple, si esta inicializado como splitButton
   */
  public openNewMenu = signal<MenuItem[]>([]);
  /**
   * Las funciones que se mostrarán en el boton de recargar los datos, se inicializan en las clases heredadas
   * si no es un array se muestra como un botton simple, si esta inicializado como splitButton
   */
  public getMenu = signal<MenuItem[]>([]);
  /**
   * Las funciones que se mostrarán en el boton de iniciar servicios, se inicializan en las clases heredadas
   * si no es un array se muestra como un botton simple, si esta inicializado como splitButton
   */
  public startMenu = signal<MenuItem[]>([]);

  public taskMenu = signal<MenuItem[]>([]);

  //iamgenes videos
  public images: string[] = [];
  public mediaStream!: MediaStream;
  public video: any;
  public canvas!: any;
  public previewCameraDialogVisible = false;

  /**
   * muestra u oculta el dialogo para el formulario de tipo de servicio
   */
  public serviceTypeFormDialogVisible: boolean = false;

  /**
   * Contiene los documentos que se van subiendo desde la camara o galeria en formato binario
   */
  public files: any = [];

  /**
   * Contiene los documentos que se van subiendo desde la camara o galeria en formato base64
   */
  public files64: any = [];

  /**
   * Muestra el tiempo del video en segundo
   */
  public timeVideo = signal<number>(6);

  /**
   * responsables de mantenimiento
   */
  public responsibles = signal<any[]>([]);

  /**
   * asignado a mecanicos mantenimiento
   */
  public assignedTo = signal<any[]>([]);

  /**
     *contiene los niveles de clasificadores, se pone Gen para que no choque con el modulo de clasificadores,
     para todos los módulos que usan un clasificador
     */
  public classifierLevelsGen = signal<any[]>([]);

  /**
   * contiene los tipos de clasificadores asignados a la app, se pone Gen para que no choque con el modulo de clasificadores
   */
  //public classifierLevelTypeGen = signal<any[]>([]);

  /**
     * contiene los clasificadores, se pone Gen para que no choque con el modulo de clasificadores,
     para todos los módulos que usan un clasificador
     */
  public classifiersGen = signal<any[]>([]);

  /**
   * contiene los indices de formArrayName en base al indice del ngFor
   */
  public auxFormClassifiers: any[] = [];
  //lo cambio por variable ya que por alguna extraña razon no se actualiza el valor en el html
  //public auxFormClassifiers = signal<any[]>([]);

  /**
   * contiene los clasificadores para cargar los combos, ya que es una consulta general para todos las apps
   */
  //public classifierLevelsGlobal = signal<any[]>([]);

  /**
   * contiene los clasificadores para cargar los combos, ya que es una consulta general para todos las apps
   */
  //public classifiersGlobal = signal<any[]>([]);

  /**
   * Contiene os estados a nivel global
   */
  public statusGlobal = signal<any[]>([]);

  /**
   * Almacena los estados iniciales de deshabilitación por posición y campo
   */
  public initialDisabledForm: { [pos: string]: { [fieldName: string]: boolean } } = {};

  // no tiene caso la opcion espacio en blanco ya que el usuario puede mover el tamaño
  public drawForm = signal<any>({});
  public drawForm2 = signal<any>({
    unit: {
      //app
      dialog: {
        width: 'width-850px-custom',
        height: 'min-height-550px-custom'
        //falta espesificar para los moviles
      },
      general: {
        //tab-panel
        grid: {
          // clase de la rejilla
          0: {
            // orden del campo
            class: 'col-span-8', //movil
            class_md: 'md:col-span-9', //pantalla y monitores
            field: 'name',
            hide: false, //ocultable, aunque es un campo obligatorio se complementa con la bandera random_name
            random_name: {
              // el campo name siempre es obligatorio, si el usuario quiere poder repetir nombres debe activar esta bandera
              compressed_random_name2: true, // si es true, el nombre se comprime y se agrega un aleatorio de maximum_characters_random,
              // en caso contario se agreha un aleatorio alfanumerico
              maximum_characters_random: 5 // maximo de caracteres para el aleatorio cuando compressed_random_name2 el true
            },
            type: 'input-text',
            autofocus: false //autofoco
          },
          2: {
            // orden del campo
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'abbreviated',
            type: 'input-text',
            //"hide":false // no existe ya que no se permite por ser un campo obligatorio
            autofocus: false //autofoco
          },
          3: {
            // orden del campo
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'description',
            type: 'textarea',
            hide: false, // ocultable porque no es obligatorio
            autofocus: false //autofoco
          },
          1: {
            // orden del campo
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'is_active',
            type: 'toggle-button',
            hide: false, // ocultable porque puede tener un valor por defecto
            autofocus: false //autofoco
          }
        }
      }
    },
    currency: {
      //app
      dialog: {
        width: 'width-650px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-8',
            class_md: 'md:col-span-9',
            field: 'name',
            hide: false,
            random_name: {
              compressed_random_name2: true,
              maximum_characters_random: 5
            },
            type: 'input-text',
            autofocus: false
          },
          1: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'is_active',
            type: 'toggle-button',
            hide: false,
            autofocus: true
          },
          2: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'letter',
            type: 'input-text',
            autofocus: false
          },
          3: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'abbreviated_letter',
            type: 'input-text',
            autofocus: false
          },
          4: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'symbol',
            type: 'input-text',
            autofocus: false
          },
          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'tax_key',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          6: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'is_default',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          7: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'is_local',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          8: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'description',
            type: 'textarea',
            hide: false,
            autofocus: false
          }
        }
      }
    },

    product: {
      dialog: {
        width: 'width-1200px-Custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          1: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'search_code',
            type: 'input-text',
            hide: false,
            random_name: {
              compressed_random_name2: true,
              maximum_characters_random: 5
            },
            autofocus: false
          },
          2: {
            class: 'col-span-8',
            class_md: 'md:col-span-4',
            field: 'search_name',
            type: 'auto-complete',
            hide: false,
            autofocus: false,
            delay: 400,
            option_label: 'name',
            data_type: 'base_product',
            include: '',
            additionalFieldsIncluded: {
              /*'base_product': [
                                { original_field: 'description', renamed_fields: 'description' },
                                { original_field: 'short_name', renamed_fields: 'short_name' },
                                { original_field: 'name2', renamed_fields: 'name2' },
                                { original_field: 'code', renamed_fields: 'code' },
                            ]*/
            },
            icon2: {
              icon: 'pi pi-qrcode',
              styleClass: 'p-button-success'
            },
            icon: {
              icon: 'pi pi-camera',
              styleClass: 'p-button-success'
            },
            panel: {
              fields: {
                0: {
                  field: 'url',
                  header: 'Imagen',
                  type: 'image',
                  class: 'col-span-1',
                  class_md: 'col-span-2'
                },
                1: {
                  field: 'code',
                  //no tiene doble guiin porque son campos adicionales de la relacion
                  header: 'Código',
                  type: 'text',
                  class: 'col-span-3',
                  class_md: 'col-span-2'
                },
                2: {
                  field: 'name',
                  // tiene doble guion porque po defecto en a las relaciones se les asigna por denefcot __name
                  type: 'text',
                  class: 'col-span-4',
                  class_md: 'md:col-span-6'
                },
                4: {
                  field: 'price',
                  header: 'Precio',
                  type: 'text',
                  class: 'col-span-2',
                  class_md: 'md:col-span-1'
                }
              }
            }
          },

          5: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'base_product_data_is_stored',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          3: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'base_product_data_is_public',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          4: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'base_product_data_is_active',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'base_product_data_code',
            type: 'input-text'
          },
          7: {
            class: 'col-span-5',
            class_md: 'md:col-span-5',
            field: 'base_product_data_name',
            hide: false,
            random_name: {
              compressed_random_name2: true,
              maximum_characters_random: 5
            },
            type: 'input-text'
          },
          8: {
            class: 'col-span-3',
            class_md: 'md:col-span-3',
            field: 'base_product_data_name2',
            type: 'input-text'
          },
          9: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'is_active',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },

          10: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'base_product_data_short_name',
            type: 'input-text'
          },

          13: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'base_product_data_weight',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'cm'
          },
          14: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'base_product_data_height',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'cm'
          },
          15: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'base_product_data_width',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'cm'
          },
          16: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'base_product_data_length',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'cm'
          },
          17: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'max',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'cm'
          },
          18: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'min',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000
            //"suffix": "cm",
          },
          19: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'reorder_point',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: '',
            hide: false,
            prefix: ''
          },

          20: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'base_product_data_life_time',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: 'días'
          },

          21: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'base_product_data_is_kit',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          22: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'base_product_data_life_time_type',
            option_value: 'value',
            option_label: 'display_name',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          23: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'safety_stock',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: '',
            hide: false,
            prefix: ''
          },
          24: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'lead_time',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: ' días',
            hide: false,
            prefix: ''
          },
          25: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'transaction_type',
            option_value: 'value',
            option_label: 'display_name',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          26: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'product_type',
            option_value: 'value',
            option_label: 'display_name',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          27: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'allowed_sale_fractions',
            option_value: 'value',
            option_label: 'display_name',
            type: 'multi-select',
            hide: false,
            autofocus: false
          },
          28: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'discard_proof',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          29: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'fraction_minimum_increment',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            suffix: ' días',
            hide: false,
            prefix: ''
          },

          30: {
            class: 'col-span-2',
            class_md: 'md:col-span-9'
          },

          31: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'is_sale_fractionable',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },

          33: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'supplier_item_code',
            type: 'input-text'
          },
          34: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'supplier',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          35: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'customer_item_code',
            type: 'input-text'
          },
          36: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'customer',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },

          39: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'is_purchase_fractionable',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },

          40: {
            class: 'col-span-12',
            title: 'Compra',
            class_md: 'md:col-span-6',
            card: {
              31: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'purchase_unit',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'unit'
              },
              32: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'purchase_currency',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                //"options": [{id:'id', name:"<script>alert('Hacked!');</script>"}], //si se envia vacio siempre se mostrará vacio
                data_type: 'currency'
              },
              33: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'purchase_price',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              34: {
                class: 'col-span-4',
                class_md: 'md:col-span-2',
                field: 'purchase_last_price',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              35: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'purchase_discount_type',
                option_value: 'value', //asi la retorna el sservidor
                option_label: 'display_name', //asi la retorna el sservidor
                type: 'dropdown',
                hide: false,
                autofocus: false
                //"default": "D", //esto puede ser contraproducente ya que si en la tabla del campo tiene un valor por defecto, puede ser diferente
                //"options": [], //se pone vacio ara que sea llenado en el form mediante la consulta a options
              },
              36: {
                class: 'col-span-4',
                class_md: 'md:col-span-2',
                field: 'purchase_discount',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              37: {
                class: 'col-span-4',
                class_md: 'md:col-span-2',
                field: 'purchase_factor',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              38: {
                class: 'col-span-4',
                class_md: 'md:col-span-4',
                field: 'inherit_purchase_taxes',
                type: 'toggle-button',
                hide: false,
                autofocus: false
              },
              39: {
                //la estructura es personalizada y se genera en componente de los impuestos
                class: 'col-span-12',
                class_md: 'md:col-span-12',
                field: 'purchase_taxes',
                type: 'tree-select',
                hide: false,
                autofocus: false,
                options: []
              }
            }
          },
          55: {
            class: 'col-span-12',
            title: 'Venta',
            class_md: 'md:col-span-6',
            card: {
              56: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'sales_unit',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'unit'
              },
              57: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'price_product_currency',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                //"options": [{id:'id', name:"<script>alert('Hacked!');</script>"}], //si se envia vacio siempre se mostrará vacio
                data_type: 'currency'
              },
              58: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'price_product_price',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              59: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'price_product_discount_type',
                option_value: 'value', //asi la retorna el sservidor
                option_label: 'display_name', //asi la retorna el sservidor
                type: 'dropdown',
                hide: false,
                autofocus: false
                //"default": "D", //esto puede ser contraproducente ya que si en la tabla del campo tiene un valor por defecto, puede ser diferente
                //"options": [], //se pone vacio ara que sea llenado en el form mediante la consulta a options
              },
              60: {
                class: 'col-span-4',
                class_md: 'md:col-span-2',
                field: 'price_product_discount',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              61: {
                class: 'col-span-12',
                class_md: 'md:col-span-12',
                field: 'sales_taxes',
                type: 'tree-select',
                hide: false,
                autofocus: false,
                options: []
              }
            }
          }
        }
      },
      custom: {
        grid: {
          0: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product_by_custom_user_data_code',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          1: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product_by_custom_user_data_name',
            type: 'input-text',
            hide: false,
            autofocus: false
          },

          2: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product_by_custom_user_data_name2',
            type: 'input-text',
            hide: false,
            autofocus: false
          },

          3: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product_by_custom_user_data_short_name',
            type: 'input-text',
            hide: false,
            autofocus: false
          },

          4: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product_by_custom_user_data_is_stored',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },

          5: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'product_by_custom_user_data_weight',
            type: 'input-number',
            hide: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            prefix: '',
            suffix: 'cm',
            autofocus: false,
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },

          6: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'product_by_custom_user_data_height',
            type: 'input-number',
            hide: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            prefix: '',
            suffix: 'cm',
            autofocus: false,
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },

          7: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'product_by_custom_user_data_width',
            type: 'input-number',
            hide: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            prefix: '',
            suffix: 'cm',
            autofocus: false,
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },

          8: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'product_by_custom_user_data_length',
            type: 'input-number',
            hide: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            prefix: '',
            suffix: 'cm',
            autofocus: false,
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },

          9: {
            class: 'col-span-2',
            class_md: 'md:col-span-1',
            field: 'product_by_custom_user_data_life_time',
            type: 'input-number',
            hide: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0,
            max: 1000000,
            prefix: '',
            suffix: 'días',
            autofocus: false,
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },

          10: {
            class: 'col-span-3',
            class_md: 'md:col-span-3',
            field: 'product_by_custom_user_data_life_time_type',
            type: 'dropdown',
            option_value: 'value',
            option_label: 'display_name',
            hide: false,
            autofocus: false,
            options: [
              { value: 'D', display_name: 'Días' },
              { value: 'M', display_name: 'Meses' },
              { value: 'A', display_name: 'Años' }
            ]
          },

          11: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'product_by_custom_user_data_description',
            type: 'textarea',
            hide: false,
            autofocus: false
          }
        }
      }
    },

    'product-variation': {
      dialog: {
        width: 'width-500px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          /*0: {
                        "class": "col-span-4",
                        "class_md": "md:col-span-2",
                        "field": "product",
                        "type": "dropdown",
                        "hide": false,
                        "autofocus": false,
                        "data_type": "product",
                    },*/

          0: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'code',
            type: 'input-text',
            hide: false,
            autofocus: false
          },

          1: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'transaction_type',
            type: 'dropdown',
            option_value: 'value',
            option_label: 'display_name',
            hide: false,
            autofocus: false
            /*"options": [
                            { "value": "T", "display_name": "Todos" },
                            { "value": "C", "display_name": "Solo de compra" },
                            { "value": "V", "display_name": "Solo de venta" },
                            { "value": "CV", "display_name": "Compra y venta" },
                            { "value": "I", "display_name": "Uso interno" },
                        ]*/
          },

          3: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'variants',
            type: 'tree-select',
            data_type: 'variant',
            hide: false,
            autofocus: false,
            options: []
          },
          4: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'sales_taxes',
            type: 'tree-select',
            data_type: 'tax',
            hide: false,
            autofocus: false,
            options: []
          },
          5: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'purchase_taxes',
            type: 'tree-select',
            data_type: 'tax',
            hide: false,
            autofocus: false,
            options: []
          }
        }
      }
    },

    'alternate-equivalent': {
      dialog: {
        width: 'width-500px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'code',
            type: 'input-text',
            autofocus: false
          },
          1: {
            class: 'col-span-8',
            class_md: 'md:col-span-4',
            field: 'name',
            type: 'input-text',
            hide: false,
            random_name: {
              compressed_random_name2: true,
              maximum_characters_random: 5
            },
            autofocus: false
          },
          2: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'transaction_type',
            type: 'dropdown',
            option_value: 'value',
            option_label: 'display_name',
            options: [
              { value: 'T', display_name: 'Todos' },
              { value: 'C', display_name: 'Solo de compra' },
              { value: 'V', display_name: 'Solo de venta' },
              { value: 'CV', display_name: 'Compra y venta' },
              { value: 'I', display_name: 'Uso interno' }
            ],
            autofocus: false
          },
          3: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'supplier_code',
            type: 'input-text',
            autofocus: false
          },
          4: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'purchase_price',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000,
            autofocus: false
          },
          5: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'purchase_discount_type',
            type: 'dropdown',
            option_value: 'value',
            option_label: 'display_name',
            options: [
              { value: 'P', display_name: 'Porcentaje' },
              { value: 'I', display_name: 'Importe' }
            ],
            autofocus: false
          },
          6: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'purchase_discount',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000,
            autofocus: false
          },
          7: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'factor',
            type: 'input-number',
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000,
            autofocus: false
          },
          8: {
            class: 'col-span-4',
            class_md: 'md:col-span-2',
            field: 'is_active',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          9: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'customer',
            type: 'dropdown',
            data_type: 'customer',
            hide: false,
            autofocus: false
          },
          10: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'supplier',
            type: 'dropdown',
            data_type: 'supplier',
            hide: false,
            autofocus: false
          },
          11: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'purchase_unit',
            type: 'dropdown',
            data_type: 'unit',
            hide: false,
            autofocus: false
          },
          12: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'purchase_currency',
            type: 'dropdown',
            data_type: 'currency',
            hide: false,
            autofocus: false
          },
          13: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'sales_unit',
            type: 'dropdown',
            data_type: 'unit',
            hide: false,
            autofocus: false
          },
          14: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'sales_taxes',
            type: 'tree-select',
            data_type: 'tax',
            hide: false,
            autofocus: false,
            options: []
          },
          15: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'purchase_taxes',
            type: 'tree-select',
            data_type: 'tax',
            hide: false,
            autofocus: false,
            options: []
          }
        }
      }
    },

    'web-product': {
      dialog: {
        width: 'width-1200px-Custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          '0': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'code',
            type: 'input-text',
            autofocus: false
          },
          '1': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'slug',
            type: 'input-text',
            autofocus: false
          },
          '2': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'description',
            type: 'input-text',
            autofocus: false
          },
          '3': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'model',
            type: 'input-text',
            autofocus: false
          },
          '4': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'internal_memory',
            type: 'input-text',
            autofocus: false
          },
          '5': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'ram',
            type: 'input-text',
            autofocus: false
          },
          '6': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'memory_card_slot',
            type: 'toggle-button',
            autofocus: false
          },
          '7': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'network',
            type: 'input-text',
            autofocus: false
          },
          '8': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'charging_connector_type',
            type: 'input-text',
            autofocus: false
          },
          '9': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'usb_connector',
            type: 'toggle-button',
            autofocus: false
          },
          '10': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'headphone_jack',
            type: 'toggle-button',
            autofocus: false
          },
          '11': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'wifi',
            type: 'toggle-button',
            autofocus: false
          },
          '12': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'gps',
            type: 'toggle-button',
            autofocus: false
          },
          '13': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'bluetooth',
            type: 'toggle-button',
            autofocus: false
          },
          '14': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'nfc',
            type: 'toggle-button',
            autofocus: false
          },
          '15': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'mini_hdmi',
            type: 'toggle-button',
            autofocus: false
          },
          '16': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'radio',
            type: 'toggle-button',
            autofocus: false
          },
          '17': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'tv_tuner',
            type: 'toggle-button',
            autofocus: false
          },
          '18': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'rear_camera_resolution',
            type: 'input-text',
            autofocus: false
          },
          '19': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'rear_camera_video_resolution',
            type: 'input-text',
            autofocus: false
          },
          '20': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'front_camera_resolution',
            type: 'input-text',
            autofocus: false
          },
          '21': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'rear_camera_count',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '22': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'front_camera_count',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '23': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'camera_zoom',
            type: 'input-text',
            autofocus: false
          },
          '24': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'front_flash',
            type: 'toggle-button',
            autofocus: false
          },
          '25': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'gesture_recognition',
            type: 'toggle-button',
            autofocus: false
          },
          '26': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'weight',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000
          },
          '27': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'height',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000
          },
          '28': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'width',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000
          },
          '29': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'length',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -1000000,
            max: 1000000
          },
          '30': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'accelerometer',
            type: 'toggle-button',
            autofocus: false
          },
          '31': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'proximity_sensor',
            type: 'toggle-button',
            autofocus: false
          },
          '32': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'gyroscope',
            type: 'toggle-button',
            autofocus: false
          },
          '33': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'compass',
            type: 'toggle-button',
            autofocus: false
          },
          '34': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'barometer',
            type: 'toggle-button',
            autofocus: false
          },
          '35': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'dual_sim',
            type: 'toggle-button',
            autofocus: false
          },
          '36': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'sim_card_size',
            type: 'input-text',
            autofocus: false
          },
          '37': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'sim_card_count',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '38': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'esim_count',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '39': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'esim',
            type: 'toggle-button',
            autofocus: false
          },
          '40': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'os',
            type: 'input-text',
            autofocus: false
          },
          '41': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'version_os',
            type: 'input-text',
            autofocus: false
          },
          '42': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'processor',
            type: 'input-text',
            autofocus: false
          },
          '43': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'processor_speed',
            type: 'input-text',
            autofocus: false
          },
          '44': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'cpu_m',
            type: 'input-text',
            autofocus: false
          },
          '45': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'gpu_model',
            type: 'input-text',
            autofocus: false
          },
          '46': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'processor_cores',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '47': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'launch_month',
            type: 'input-text',
            autofocus: false
          },
          '48': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'launch_year',
            type: 'input-text',
            autofocus: false
          },
          '49': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'screen_size',
            type: 'input-text',
            autofocus: false
          },
          '50': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'resolution',
            type: 'input-text',
            autofocus: false
          },
          '51': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'screen_technology',
            type: 'input-text',
            autofocus: false
          },
          '52': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'pixels_per_inch',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '53': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'screen_max_brightness',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '54': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'touch_screen',
            type: 'toggle-button',
            autofocus: false
          },
          '55': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'battery_capacity',
            type: 'input-number',
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: -2147483648,
            max: 2147483647
          },
          '56': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'battery_type',
            type: 'input-text',
            autofocus: false
          },
          '57': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'wireless_charging',
            type: 'toggle-button',
            autofocus: false
          },
          '58': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'removable_battery',
            type: 'toggle-button',
            autofocus: false
          },
          '59': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'fingerprint_reader',
            type: 'toggle-button',
            autofocus: false
          },
          '60': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'face_recognition',
            type: 'toggle-button',
            autofocus: false
          },
          '61': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'iris_recognition',
            type: 'toggle-button',
            autofocus: false
          },
          '62': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'physical_qwerty_keyboard',
            type: 'toggle-button',
            autofocus: false
          },
          '63': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'splash_resistant',
            type: 'toggle-button',
            autofocus: false
          },
          '64': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'water_resistant',
            type: 'toggle-button',
            autofocus: false
          },
          '65': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'waterproof',
            type: 'toggle-button',
            autofocus: false
          },
          '66': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'dust_resistant',
            type: 'toggle-button',
            autofocus: false
          },
          '67': {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'drop_resistant',
            type: 'toggle-button',
            autofocus: false
          }
        }
      }
    },

    'asset-document': {
      dialog: {
        width: 'width-600px-Custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-4',
            class_md: 'md:col-span-3',
            field: 'code',
            type: 'input-text',
            autofocus: true
          },
          1: {
            class: 'col-span-8',
            class_md: 'md:col-span-5',
            field: 'name',
            hide: false,
            random_name: {
              compressed_random_name2: true,
              maximum_characters_random: 5
            },
            type: 'input-text',
            autofocus: false
          },
          2: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'is_active',
            type: 'toggle-button',
            hide: false,
            autofocus: true
          },
          3: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'start_date',
            type: 'date',
            autofocus: false
          },
          4: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'end_date',
            type: 'date',
            autofocus: false
          },
          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'file_type',
            type: 'dropdown',
            autofocus: false,
            data_type: 'file_type'
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'asset',
            type: 'dropdown',
            autofocus: false,
            data_type: 'asset'
          },
          /*7: {
                        "class": "col-span-6",
                        "class_md": "md:col-span-4",
                        "field": "status",
                        "type": "dropdown",
                        "autofocus": false,
                        "data_type": "status",
                    },*/
          8: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'description',
            type: 'textarea',
            autofocus: false
          }
        }
      }
    },


    employee: {
      dialog: {
        width: 'width-650px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-12',
            title: 'Datos personales',
            class_md: 'md:col-span-12',
            card: {
              0: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'search_person',
                type: 'auto-complete',
                hide: false,
                autofocus: true,
                delay: 500,
                minLength: 5,
                showEmptyMessage: true,
                emptyMessage: 'No hay resultados',
                hidden_field: {
                  field: 'person'
                },
                data_type: 'person',
                panel: {
                  fields: {
                    0: { class: 'col-span-2', class_md: 'md:col-span-1 text-xs', field: 'url', header: 'Imagen', type: 'image' },
                    1: { class: 'col-span-5', class_md: 'md:col-span-3 text-xs', field: 'name', type: 'text' },
                    2: { class: 'col-span-5', class_md: 'md:col-span-5 text-xs', field: 'last_name', type: 'text' },
                    3: { class: 'hidden', class_md: 'md:block md:col-span-1 text-xs', field: 'gender', type: 'text' },
                    4: { class: 'hidden', class_md: 'md:block md:col-span-2 text-xs', type: 'text', field: 'date_of_birth' }
                  }
                }
              },
              1: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_name',
                hide: false,
                random_name: {
                  compressed_random_name2: true,
                  maximum_characters_random: 5
                },
                type: 'input-text',
                autofocus: false
              },
              2: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_last_name',
                type: 'input-text',
                autofocus: false
              },
              3: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_gender',
                type: 'dropdown',
                option_value: 'value',
                option_label: 'display_name',
                hide: false
              },
              4: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_date_of_birth',
                type: 'date',
                hide: false
              },
              5: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_tax_id',
                type: 'input-text',
                hide: false
              },
              6: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_national_identification_number',
                type: 'input-text',
                hide: false
              },
              7: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_government_id_number',
                type: 'input-text',
                hide: false
              },
              8: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_social_security_number',
                type: 'input-text',
                hide: false
              },
              9: {
                //icon
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_contact',
                type: 'auto-complete',
                hide: false,
                autofocus: false,
                delay: 500,
                minLength: 5,
                showEmptyMessage: true,
                emptyMessage: 'No hay resultados',
                hidden_field: {
                  field: 'contact'
                },
                data_type: 'contact',
                panel: {
                  fields: {
                    1: { class: 'col-span-5', class_md: 'md:col-span-3 text-xs', field: 'name', type: 'text' },
                    2: { class: 'col-span-5', class_md: 'md:col-span-5 text-xs', field: 'last_name', type: 'text' },
                    3: { class: 'hidden', class_md: 'md:block md:col-span-1 text-xs', field: '', type: '' },
                    4: { class: '', class_md: '', type: '' }
                  }
                },
                icon: {
                  icon: 'pi pi-plus',
                  styleClass: 'p-button-success'
                  //"func": ""// debe ser localmente para que en la apli no sepan estos datos
                }
              },
              //person_data_username
              10: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'person_data_username',
                type: 'auto-complete',
                hide: false,
                autofocus: false,
                delay: 500,
                minLength: 5,
                showEmptyMessage: true,
                emptyMessage: 'No hay resultados',
                hidden_field: {
                  field: 'user'
                },
                data_type: 'user',
                panel: {
                  fields: {
                    0: { class: 'col-span-2', class_md: 'md:col-span-1 text-xs', field: 'url', header: 'Imagen', type: 'image' },
                    1: { class: 'col-span-5', class_md: 'md:col-span-3 text-xs', field: 'username', type: 'text' },
                    2: { class: 'col-span-5', class_md: 'md:col-span-5 text-xs', field: 'email', type: 'text' },
                    3: { class: 'hidden', class_md: 'md:block md:col-span-1 text-xs', field: 'gender', type: 'text' },
                    4: { class: 'hidden', class_md: 'md:block md:col-span-2 text-xs', type: 'text', field: 'date_of_birth' }
                  }
                },
                icon: {
                  icon: 'pi pi-plus',
                  styleClass: 'p-button-success'
                }
              }
            }
          },
          2: {
            class: 'col-span-12',
            title: 'Datos laborales',
            class_md: 'md:col-span-12',
            card: {
              0: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'code',
                type: 'input-text',
                autofocus: false
              },
              1: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'salary',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: -1000000,
                max: 1000000,
                prefix: '',
                suffix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              2: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'is_active',
                type: 'toggle-button',
                hide: false,
                autofocus: false
              },
              3: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'work_days',
                type: 'dropdown',
                option_value: 'value',
                option_label: 'display_name',
                hide: false
              },
              4: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'date_hired',
                type: 'date',
                hide: false
              },
              5: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'start_date',
                type: 'date',
                hide: false
              },
              6: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'end_date',
                type: 'date',
                hide: false
              },
              7: {
                class: 'col-span-3',
                class_md: 'md:col-span-2',
                field: 'clock_in_time',
                type: 'time',
                hide: false
              },
              8: {
                class: 'col-span-3',
                class_md: 'md:col-span-2',
                field: 'clock_out_time',
                type: 'time',
                hide: false
              },
              9: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'interbank_account_number',
                type: 'input-text',
                hide: false
              },
              10: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'bank_account_number',
                type: 'input-text',
                hide: false
              },
              11: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'bank',
                type: 'input-text',
                hide: false
              },
              12: {
                class: 'col-span-3',
                class_md: 'md:col-span-2',
                field: 'payment_days',
                type: 'input-number',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min_fraction_digits: 0,
                max_fraction_digits: 0,
                min: -1,
                max: 365,
                prefix: '',
                suffix: ' días',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },
              13: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'payment_method',
                type: 'dropdown',
                option_value: 'value',
                option_label: 'display_name',
                hide: false
              },
              14: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'show_organizational_chart',
                type: 'dropdown',
                option_value: 'value',
                option_label: 'display_name',
                hide: false
              },
              15: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'department',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'department'
              },
              16: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'job_title',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'job_title'
              },
              17: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'contact',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'contact'
              },
              18: {
                class: 'col-span-6',
                class_md: 'md:col-span-4',
                field: 'contract',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'employee-contract'
              }
            }
          }
        }
      }
    },



    inventory: {
      dialog: {
        width: 'width-650px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'product',
            type: 'input-text',
            hide: false,
            autofocus: true
          },
          1: {
            class: 'col-span-6',
            class_md: 'md:col-span-6',
            field: 'name',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          //quantity
          2: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'quantity',
            type: 'input-number',
            hide: false,
            autofocus: false,
            mode: 'decimal',
            min_fraction_digits: 2,
            max_fraction_digits: 2,
            min: 0.000001,
            max: 1000000,
            prefix: '',
            suffix: '',
            show_buttons: false,
            button_layout: 'horizontal',
            spinner_mode: 'horizontal',
            decrement_button_class: 'p-button-secondary',
            increment_button_class: 'p-button-secondary',
            increment_button_icon: 'pi pi-plus',
            decrement_button_icon: 'pi pi-minus'
          },
          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'employee',
            data_type: 'employee',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'movement_type',
            data_type: 'movement_type',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          7: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'date_time',
            data_type: 'date_time',
            type: 'date',
            hide: false,
            autofocus: false
          }
        }
      }
    },
    'warehouse-output': {
      dialog: {
        width: 'width-400px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'persons',
            type: 'dropdown',
            hide: false,
            autofocus: false,
            data_type: 'person',
            filter: true,
            filter_by: 'name',
            reload_icon: true,
            new_icon: false,
            closable_icon: false
          }
        }
      }
    },

  });
  /*
  <app-custom-textarea class=" col-span-12 p-fluid" [for]="'description'" [labelText]="customField().description"
    [formGroup]="form()['currency']" />*/
}

/*
-Los campos bool o pk  se les agrega text y name respectivamente, por ejemplo, is_active__text, is_default__text, created_by__name, etc,
con la intencion de que esten por separodo que el campo original y este conserve su valor, en los campos encabezados de las tablas
no es necesario aregarle __text o __name ya que el nombre será el mismo, ejemplo, header: this.customField().is_active, notar que
en el ejemplo de abajo field si debe tener__text o __name pero header no, para saber cual es un campo pk, este lleva doble guion bajo 
__name y el bool __text

{ field: 'asset_type__name', header: this.customField().asset_type, sortable: true },
{ field: 'is_leasing__text', header: this.customField().is_leasing, sortable: true },

°°° Tengo que revisar porque los @Inpunt de selectedColumns se llaman muchas veces cuando cargo datos,

-los botones de delete y edit no tienen la opcion de splitButton porque para que un registro se pueda eliminar o 
editar necesita estas visible en la tabla, es decir primero se tienen que cargar

- ||| DECIDI QUE LAS CONSULTAS SE DEBEN REALIZARSE EN BASE A LAS COLUMNAS QUE SE MUESTRAN, EN LUGAR DE TODOS LOS CAMPOS, Y CUANDO EDITE SE CONSULTE AL SERVIDOR
      CON TODOS LOS DATOS,  
    // ventaja - la consuLta al servidor traería menos datos, EVITA que se generen mas ciclos en los campos relacionados para ponerles el nombre, 
    los booleanos les pone el nombre cuando es verdadero o flaso, las fechas y horas se tengan que formatear, otros campos que se les ponga un valor definido, etc
    desventaja - se hace una consulta adicional por cada edición, y se debe cargar los datos cada vez que se agrega un nuevo campo

*/

/**
 * esta clase es para las app principales los datos adicionales que se cargar o crear a partir de la app principal
    deberia de vivir en un componente por separado (por ejemplo los logs, la creacion de documentos) o hacerlo en el ts de componente que hereda
 * 
 * 2. Revisar que los campos de json o del form cuadren con los options del servidor
 * 
 * 3. configurar itemsRemove en el servidor
 * 
 * 4. configurar drawForm desde el servidor
 * 
 * 5. el orden de la columna se debe configurar desde el servidor
 * 
 * 
 * ATAJOS GLOBALES DE TECLADO
 * F4 - Editar
 * F5 - actualizar/cargar
 * Insert - Nuevo
 * Suprimir - Eliminar
 */
