import { ChangeDetectorRef, Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ConfigService } from 'src/app/auth/services/config.service';
import { MessageService } from 'src/app/component/services/message.service';
import { CRUDService } from './services/crud.service';
import { GeneralService } from './services/general.service';
import { SharedDynamicDataService } from './services/shared-dynamic-data.service';

/**
  Contiene las declaraciones y las importaciones de curd 
*/
/*@Injectable({
  providedIn: 'root'
})*/
export class Vars {
  protected fb: FormBuilder = inject(FormBuilder); // para crear el formulario
  protected messageS: MessageService = inject(MessageService); // para mostrar mensajes
  protected configS: ConfigService = inject(ConfigService); // configuración del sistema
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
            { field: 'utc_created_at', },
            { field: 'created_by__name', },
            { field: 'utc_modified_at', },
            { field: 'modified_by__name', },
            { field: 'utc_inactivated_at', },
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
  public header = signal('');

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
  protected fields = '';

  /**
   * ordenamiento para la consulta al servidor
   */
  protected sort = '';

  /**
   * filtro para la consulta al servidor
   */
  protected filter = '';

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
  protected formDialogVisible: boolean[] = [false];

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
      'id', 'description', 'short_name', 'name2', 'sys__text', 'utc_created_at', 'utc_modified_at', 'utc_inactivated_at',
      'created_by__name', 'modified_by__name', 'inactivated_by__name'
    */
  public itemsRemove: string[][] = [
    ['id', 'description', 'short_name', 'name2', 'sys__text', 'utc_created_at', 'utc_modified_at', 'utc_inactivated_at', 'created_by__name', 'modified_by__name', 'inactivated_by__name', 'time_zone', 'external_code_number', 'external_code_text']
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

  protected timeZone: string[] = []; //['start_date', 'end_date', 'scheduled_date', 'required_date', 'expiration_date'];
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
   * utc_created_at, created_by__name, utc_modified_at, modified_by__name, utc_inactivated_at, inactivated_by__name
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
  additionalFieldsAppCols: any[] = [];

  /**
   * Campos que se deben excluir de la tabla, por ejemplo, id, description, sys_data
   */
  excludeFieldsCols: any[][] = [];

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
  public openNewMenu: MenuItem = signal<MenuItem[]>([]);
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
  public classifierLevelsGlobal = signal<any[]>([]);

  /**
   * contiene los clasificadores para cargar los combos, ya que es una consulta general para todos las apps
   */
  public classifiersGlobal = signal<any[]>([]);

  /**
   * Contiene os estados a nivel global
   */
  public statusGlobal = signal<any[]>([]);

  /**
   * Almacena los estados iniciales de deshabilitación
   */
  public initialDisabledForm: { [key: string]: boolean } = {}; //

  // no tiene caso la opcion espacio en blanco ya que el usuario puede mover el tamaño
  public drawForm = signal<any>({
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
        width: 'width-1200px-Custom',
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

    asset: {
      dialog: {
        width: 'width-1200px-Custom',
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
            field: 'asset_type',
            type: 'dropdown',
            autofocus: false,
            data_type: 'asset_type'
          },
          4: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'cost_center',
            type: 'dropdown',
            autofocus: false,
            data_type: 'cost_center'
          },
          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'is_leasing',
            type: 'toggle-button',
            hide: false,
            autofocus: false
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'capacity_type',
            type: 'dropdown',
            autofocus: false,
            data_type: 'capacity_type'
          },
          7: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'brand',
            type: 'input-text',
            autofocus: false
          },

          8: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'model',
            type: 'input-text',
            autofocus: false
          },
          9: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'serial_number',
            type: 'input-text',
            autofocus: false
          },
          10: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'economic_number',
            type: 'input-text',
            autofocus: false
          },
          11: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'color',
            type: 'input-text',
            autofocus: false
          },
          12: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'phone_number',
            type: 'input-text',
            autofocus: false
          },
          13: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'motor_number',
            type: 'input-text',
            autofocus: false
          },
          14: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'rear_plate',
            type: 'input-text',
            autofocus: false
          },
          15: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'front_plate',
            type: 'input-text',
            autofocus: false
          },
          16: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'vin',
            type: 'input-text',
            autofocus: false
          },
          17: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'fuel_capacity',
            type: 'input-text',
            autofocus: false
          },
          18: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'imei',
            type: 'input-text',
            autofocus: false
          },
          19: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'iccid',
            type: 'input-text',
            autofocus: false
          },
          20: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'mac_address',
            type: 'input-text',
            autofocus: false
          },
          21: {
            class: 'col-span-6',
            class_md: 'md:col-span-2',
            field: 'year',
            type: 'input-text',
            autofocus: false
          },
          22: {
            class: 'col-span-6',
            class_md: 'md:col-span-6',
            field: 'name2',
            type: 'input-text',
            autofocus: false
          },
          23: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'short_name',
            type: 'input-text',
            autofocus: false
          },
          24: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'description',
            type: 'textarea',
            autofocus: false
          }
        }
      }
    },
    maintenance: {
      dialog: {
        width: 'width-1200px-Custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'code',
            type: 'input-text',
            autofocus: true,
            hide: false
          },
          1: {
            class: 'col-span-6',
            class_md: 'md:col-span-6',
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
            class_md: 'md:col-span-3',
            //"field": "documents", # no ocupa field porque no va en el formulario
            type: 'document',
            label: 'Evidencia',
            autofocus: false
          },
          3: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'service_type',
            option_value: 'value',
            option_label: 'display_name',
            type: 'dropdown',
            hide: false,
            autofocus: false
          },
          4: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'asset',
            editable: false,
            filter: true,
            filter_by: 'name',
            type: 'dropdown',
            autofocus: false,
            hide: false,
            data_type: 'asset',
            label: 'Activo',
            reload_icon: true,
            new_icon: false,
            closable_icon: false
          },
          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'requester',
            editable: false,
            filter: true,
            filter_by: 'name',
            type: 'dropdown',
            hide: false,
            autofocus: false,
            data_type: 'employee',
            label: 'Solicitante',
            reload_icon: false,
            new_icon: false,
            closable_icon: false
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'priority',
            option_value: 'value',
            option_label: 'display_name',
            type: 'dropdown',
            hide: false,
            autofocus: false,
            editable: false,
            label: 'Prioridad',
            reload_icon: false,
            new_icon: false,
            closable_icon: false
          },
          7: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'scheduled_date',
            type: 'date',
            hide: false,
            autofocus: false,
            label: 'Programado',
            readonlyInput: true
          },
          8: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'required_date',
            type: 'date',
            hide: false,
            autofocus: false,
            label: 'Requerido',
            readonlyInput: true
          },
          9: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'expiration_date',
            type: 'date',
            hide: false,
            autofocus: false,
            label: 'Expiración',
            readonlyInput: true
          },
          10: {
            class: 'col-span-6',
            class_md: 'md:col-span-3',
            field: 'short_name',
            hide: false,
            type: 'input-text',
            autofocus: false
          },
          11: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'name2',
            hide: false,
            type: 'input-text',
            autofocus: false
          },

          12: {
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

    'request-detail': {
      dialog: {
        width: 'width-650px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          1: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            title: 'Generales',
            fieldset: {
              0: {
                class: 'col-span-5',
                class_md: 'md:col-span-2',
                field: 'request_data_code',
                label: 'Código',
                type: 'input-text',
                hide: false,
                autofocus: false
              },

              1: {
                class: 'col-span-7',
                class_md: 'md:col-span-3',
                field: 'request_data_description',
                label: 'Descripción',
                type: 'input-text',
                hide: false,
                autofocus: false
              },
              2: {
                class: 'col-span-3',
                class_md: 'md:col-span-1',
                field: 'request_data_folio',
                label: 'Folio',
                type: 'input-text'
              },
              3: {
                class: 'col-span-3',
                class_md: 'md:col-span-2',
                field: 'request_data_request_type',
                label: 'Tipo de solicitud',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                //"option_value": "value",
                //"option_label": "display_name",
                //"data_type": "request_type",
                //utiliza options porque request_data_request_type no se carga directamente de
                // de la consulta OPTIONS ya que se consulta request-detail y este viene de resquet
                options: [
                  { id: 'SC', name: 'Solicitud de compra' },
                  { id: 'SA', name: 'Solicitud a almacén' },
                  { id: 'O', name: 'Otro' }
                ]
              },

              4: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'group',
                type: 'dropdown',
                label: 'Grupo',
                hide: true,
                autofocus: false,
                data_type: 'group',
                reload_icon: false,
                new_icon: false,
                closable_icon: false
              },
              5: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'company',
                option_label: 'company_name',
                type: 'dropdown',
                label: 'Empresa',
                hide: true,
                autofocus: false,
                data_type: 'company',
                reload_icon: false,
                new_icon: false,
                closable_icon: true
              },
              6: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'request_data_subsidiary',
                type: 'dropdown',
                label: 'Sucursal',
                hide: false,
                autofocus: false,
                data_type: 'subsidiary',
                reload_icon: false,
                new_icon: false,
                closable_icon: false
              },
              7: {
                class: 'hidden',
                class_md: 'col-span-1  md:col-span-1 md:block',
                type: 'input-number',
                field: 'executed_budget',
                label: 'Ejercido',
                disabled: true,
                suffix: '%',
                hide: false,
                autofocus: false
              },
              8: {
                class: 'hidden',
                class_md: 'col-span-1  md:col-span-1 md:block',
                type: 'input-number',
                field: 'committed_budget',
                label: 'Comprometido',
                disabled: true,
                suffix: '%',
                hide: false,
                autofocus: false,
                mode: 'decimal',
                min: -1000000,
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                max: 1000000,
                prefix: '',
                show_buttons: false,
                button_layout: 'horizontal',
                spinner_mode: 'horizontal',
                decrement_button_class: 'p-button-secondary',
                increment_button_class: 'p-button-secondary',
                increment_button_icon: 'pi pi-plus',
                decrement_button_icon: 'pi pi-minus'
              },

              9: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'request_data_date',
                label: 'Fecha de solicitud',
                type: 'date',
                hide: false,
                autofocus: false
              },

              11: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'request_data_delivery_date',
                label: 'Fecha de entrega',
                type: 'date',
                hide: false,
                autofocus: false
              },
              12: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'request_data_maximum_delivery_date',
                label: 'Máxima de entrega',
                type: 'date',
                hide: false,
                autofocus: false
              },
              13: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'request_data_validate_maximum_delivery_date',
                name_false: 'No validar fecha',
                name_true: 'Validar fecha',
                type: 'toggle-button',
                hide: false,
                autofocus: false
              }
            }
          },
          /*2: {

                        "class": "col-span-12",
                        "class_md": "md:col-span-12",
                        "title": "Filtros",
                        "fieldset": {

                        }
                    },*/
          3: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            title: 'Datalle',
            fieldset: {
              0: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'Componente',
                label: 'Componente',
                editable: false,
                filter: true,
                filter_by: 'name',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                reload_icon: false,
                new_icon: false,
                closable_icon: false,
                //"option_value": "value",
                //"option_label": "display_name",
                cascading: {
                  field: 'Subcomponente', //campo que debe existir en el mismo formulario
                  filter: 'group', //en el caso del remoto es el id del componente para el filtro, en el caso local es agrupador
                  searchLocale: true //para que busque en options en lugar de hacerlo al servidor
                },
                options: [
                  { id: 'C010', name: 'Tuberia', group: 'TUBERIA' },
                  { id: 'C100', name: 'Cabina', group: 'MECANICA' },
                  { id: 'C110', name: 'Caja de Transferencia', group: 'MECANICA' },
                  { id: 'C120', name: 'Chasis', group: 'MECANICA' },
                  { id: 'C130', name: 'Diferenciales', group: 'MECANICA' },
                  { id: 'C140', name: 'Dirección', group: 'MECANICA' },
                  { id: 'C150', name: 'Embrague (Clutch)', group: 'MECANICA' },
                  { id: 'C160', name: 'Estabilizadores', group: 'MECANICA' },
                  { id: 'C170', name: 'Estructura de la Pluma', group: 'MECANICA' },
                  { id: 'C180', name: 'Frenos', group: 'MECANICA' },
                  { id: 'C190', name: 'Imagen', group: 'MECANICA' },
                  { id: 'C200', name: 'Llantas', group: 'MECANICA' },
                  { id: 'C210', name: 'Masas', group: 'MECANICA' },
                  { id: 'C220', name: 'Motor', group: 'MECANICA' },
                  { id: 'C230', name: 'Sistema Eléctrico de Bombeo', group: 'MECANICA' },
                  { id: 'C240', name: 'Sistema Eléctrico del camión', group: 'MECANICA' },
                  { id: 'C250', name: 'Sistema Hidráulico de bombeo', group: 'MECANICA' },
                  { id: 'C260', name: 'Sistema Mecánico de bombeo', group: 'MECANICA' },
                  { id: 'C270', name: 'Suspensión Delantera', group: 'MECANICA' },
                  { id: 'C280', name: 'Suspensión Trasera', group: 'MECANICA' },
                  { id: 'C290', name: 'Transmisión', group: 'MECANICA' }, //aqui voy estor poniedno los drop depednientes, tanto mnual como automatico de sistema
                  { id: 'C400', name: 'Taller mantenimiento', group: '', disable: true, required: false }, //son para el componente hijo
                  { id: 'C410', name: 'MOE pago por iguala para Mantto.', group: '', disable: true, required: false }, //disable, deshabilita el componente
                  { id: 'C420', name: 'Herramientas para mantenimiento', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C430', name: 'Herramientas para operaciones', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C440', name: 'Materiales para Stock', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C450', name: 'Materiales para Operaciones', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C460', name: 'MOE para Operaciones', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C470', name: 'Vehículos Utilitarios', group: '', disable: true, required: false }, //disable, deshabilita el componente dependiente
                  { id: 'C480', name: 'Servicio de grúa para arrastre', group: '', disable: true, required: false } //disable, deshabilita el componente dependiente
                ]
              },

              1: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'Subcomponente',
                label: 'Subcomponente',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                reload_icon: false,
                new_icon: false,
                closable_icon: false,
                //"option_value": "value",
                //"option_label": "display_name",
                options: [
                  { id: 'SC010', name: 'Codo', group: 'TUBERIA' },
                  { id: 'SC020', name: 'Abrazadera', group: 'TUBERIA' },
                  { id: 'SC030', name: 'Empaque', group: 'TUBERIA' },
                  { id: 'SC040', name: 'Tubo', group: 'TUBERIA' },
                  { id: 'SC050', name: 'Manguera 1 casquillo', group: 'TUBERIA' },
                  { id: 'SC060', name: 'Manguera 2 casquillos', group: 'TUBERIA' },
                  { id: 'SC070', name: 'Reductor', group: 'TUBERIA' },
                  { id: 'SC080', name: 'Boquilla', group: 'TUBERIA' },
                  { id: 'SC090', name: 'Fabricacion a medida', group: 'TUBERIA' },
                  { id: 'SC200', name: 'Ajuste de Puertas y Cofre', group: 'MECANICA' },
                  { id: 'SC210', name: 'Alerones', group: 'MECANICA' },
                  { id: 'SC220', name: 'Aletillas', group: 'MECANICA' },
                  { id: 'SC230', name: 'Alineación de las Ruedas', group: 'MECANICA' },
                  { id: 'SC240', name: 'Almohadillas para estabilizar (Pads)', group: 'MECANICA' },
                  { id: 'SC250', name: 'Amortiguadores', group: 'MECANICA' },
                  { id: 'SC260', name: 'Anillo de Chapaletas', group: 'MECANICA' },
                  { id: 'SC270', name: 'Anillo de Corte e Inserto', group: 'MECANICA' },
                  { id: 'SC280', name: 'Arneses eléctricos', group: 'MECANICA' },
                  { id: 'SC290', name: 'Asientos y Respaldos', group: 'MECANICA' },
                  { id: 'SC300', name: 'Baleros', group: 'MECANICA' },
                  { id: 'SC310', name: 'Barra Telescópica', group: 'MECANICA' },
                  { id: 'SC320', name: 'Barra Torsional', group: 'MECANICA' },
                  { id: 'SC330', name: 'Bastidor del modulo de Bombeo', group: 'MECANICA' },
                  { id: 'SC340', name: 'Birlos', group: 'MECANICA' },
                  { id: 'SC350', name: 'Block de bombeo', group: 'MECANICA' },
                  { id: 'SC360', name: 'Block de la pluma', group: 'MECANICA' },
                  { id: 'SC370', name: 'Bomba de Agua para lavado', group: 'MECANICA' },
                  { id: 'SC380', name: 'Bomba de Combustible', group: 'MECANICA' },
                  { id: 'SC390', name: 'Bomba de la Dirección', group: 'MECANICA' },
                  { id: 'SC400', name: 'Bomba hidráulica principal', group: 'MECANICA' },
                  { id: 'SC410', name: 'Bomba de refrigerante', group: 'MECANICA' },
                  { id: 'SC420', name: 'Bujes de Flecha de la Válvula Rock', group: 'MECANICA' },
                  { id: 'SC430', name: 'Caja de Contactores', group: 'MECANICA' },
                  { id: 'SC440', name: 'Caja de control', group: 'MECANICA' },
                  { id: 'SC450', name: 'Caja de Dirección', group: 'MECANICA' },
                  { id: 'SC460', name: 'Cardanes del tren motriz (1) (2) (3)', group: 'MECANICA' },
                  { id: 'SC470', name: 'Cárter', group: 'MECANICA' },
                  { id: 'SC480', name: 'Cilindro de transporte', group: 'MECANICA' },
                  { id: 'SC490', name: 'Cilindros Diferenciales', group: 'MECANICA' },
                  { id: 'SC500', name: 'Cilindros Hidráulicos de la pluma', group: 'MECANICA' },
                  { id: 'SC510', name: 'Cilindros o Motor de giro de la pluma', group: 'MECANICA' },
                  { id: 'SC520', name: 'Cincho de pluma', group: 'MECANICA' },
                  { id: 'SC530', name: 'Cinchos para manipulación de tubería', group: 'MECANICA' },
                  { id: 'SC540', name: 'Cinto de Rebote', group: 'MECANICA' },
                  { id: 'SC550', name: 'Cinturón de seguridad piloto y copiloto', group: 'MECANICA' },
                  { id: 'SC560', name: 'Códigos de Falla en Motor', group: 'MECANICA' },
                  { id: 'SC570', name: 'Columpios', group: 'MECANICA' },
                  { id: 'SC580', name: 'Compresor y Tanques de aire (Purgas)', group: 'MECANICA' },
                  { id: 'SC590', name: 'Condiciones de la Tolva', group: 'MECANICA' },
                  { id: 'SC600', name: 'Condiciones de tubería y codos', group: 'MECANICA' },
                  { id: 'SC610', name: 'Condiciones del tablero', group: 'MECANICA' },
                  { id: 'SC620', name: 'Conos herméticos', group: 'MECANICA' },
                  { id: 'SC630', name: 'Control Crucero', group: 'MECANICA' },
                  { id: 'SC640', name: 'Correcto Funcionamiento del A/C', group: 'MECANICA' },
                  { id: 'SC650', name: 'Cristales Delanteros', group: 'MECANICA' },
                  { id: 'SC660', name: 'Cristales Traseros', group: 'MECANICA' },
                  { id: 'SC670', name: 'Cruceta de barras cardan', group: 'MECANICA' },
                  { id: 'SC680', name: 'Crucetas de Freno Magnético', group: 'MECANICA' },
                  { id: 'SC690', name: 'Dispositivo atrapa bolas', group: 'MECANICA' },
                  { id: 'SC700', name: 'Émbolos de empuje', group: 'MECANICA' },
                  { id: 'SC710', name: 'Empaque y abrazaderas', group: 'MECANICA' },
                  { id: 'SC720', name: 'Enfriador de Aceite de transmisión', group: 'MECANICA' },
                  { id: 'SC730', name: 'Enfriador de Aceite Hidráulico', group: 'MECANICA' },
                  { id: 'SC740', name: 'Engrasado General', group: 'MECANICA' },
                  { id: 'SC750', name: 'Engrasadora automática', group: 'MECANICA' },
                  { id: 'SC760', name: 'Engrase General de estabilizadores', group: 'MECANICA' },
                  { id: 'SC770', name: 'Escaleras de acceso al modulo', group: 'MECANICA' },
                  { id: 'SC780', name: 'Escape y/o Silenciador', group: 'MECANICA' },
                  { id: 'SC790', name: 'Espejo Banquetero', group: 'MECANICA' },
                  { id: 'SC800', name: 'Espejo de punto ciego frontal derecho', group: 'MECANICA' },
                  { id: 'SC810', name: 'Espejo de punto ciego frontal izquierdo', group: 'MECANICA' },
                  { id: 'SC820', name: 'Espejos convexos (Der-Izq)', group: 'MECANICA' },
                  { id: 'SC830', name: 'Espejos Laterales (Der-Izq)', group: 'MECANICA' },
                  { id: 'SC840', name: 'Estado de bandas del motor', group: 'MECANICA' },
                  { id: 'SC850', name: 'Estado de los Hules de la Suspensión Trasera', group: 'MECANICA' },
                  { id: 'SC860', name: 'Estado de los Hules Tensores', group: 'MECANICA' },
                  { id: 'SC870', name: 'Estado Físico de las llantas Delanteras', group: 'MECANICA' },
                  { id: 'SC880', name: 'Estado Físico de las llantas Traseras', group: 'MECANICA' },
                  { id: 'SC890', name: 'Estribos antiderrapantes', group: 'MECANICA' },
                  { id: 'SC900', name: 'Estructura de la cuarta sección', group: 'MECANICA' },
                  { id: 'SC910', name: 'Estructura de la primera sección', group: 'MECANICA' },
                  { id: 'SC920', name: 'Estructura de la quinta sección', group: 'MECANICA' },
                  { id: 'SC930', name: 'Estructura de la segunda sección', group: 'MECANICA' },
                  { id: 'SC940', name: 'Estructura de la Suspensión', group: 'MECANICA' },
                  { id: 'SC950', name: 'Estructura de la tercera sección', group: 'MECANICA' },
                  { id: 'SC960', name: 'Estructura de los Estabilizadores y Placas de Apoyo', group: 'MECANICA' },
                  { id: 'SC970', name: 'Extinguidor', group: 'MECANICA' },
                  { id: 'SC980', name: 'Fan Clutch y ventilador.', group: 'MECANICA' },
                  { id: 'SC990', name: 'Filtro de aceite', group: 'MECANICA' },
                  { id: 'SC1000', name: 'Filtro de Combustible', group: 'MECANICA' },
                  { id: 'SC1010', name: 'Filtro de refrigerante', group: 'MECANICA' },
                  { id: 'SC1020', name: 'Filtros de Aire', group: 'MECANICA' },
                  { id: 'SC1030', name: 'Filtros hidráulicos', group: 'MECANICA' },
                  { id: 'SC1040', name: 'Flecha del agitador', group: 'MECANICA' },
                  { id: 'SC1050', name: 'Freno Auxiliar', group: 'MECANICA' },
                  { id: 'SC1060', name: 'Fuelles', group: 'MECANICA' },
                  { id: 'SC1070', name: 'Fugas de Aceite', group: 'MECANICA' },
                  { id: 'SC1080', name: 'Funcionamiento Alarma de Reversa', group: 'MECANICA' },
                  { id: 'SC1090', name: 'Funcionamiento de Alarmas de Baja', group: 'MECANICA' },
                  { id: 'SC1100', name: 'Funcionamiento de control remoto alámbrico', group: 'MECANICA' },
                  { id: 'SC1110', name: 'Funcionamiento de control remoto inalámbrico', group: 'MECANICA' },
                  { id: 'SC1120', name: 'Funcionamiento de Cornetas', group: 'MECANICA' },
                  { id: 'SC1130', name: 'Funcionamiento de Elevadores', group: 'MECANICA' },
                  { id: 'SC1140', name: 'Funcionamiento de Embrague (Clutch)', group: 'MECANICA' },
                  { id: 'SC1150', name: 'Funcionamiento de Mangueras, Tubos hidráulicos y válvulas de seguridad de estabilizadores', group: 'MECANICA' },
                  { id: 'SC1160', name: 'Funcionamiento de paro de emergencia de tolva', group: 'MECANICA' },
                  { id: 'SC1170', name: 'Funcionamiento de paros de emergencia', group: 'MECANICA' },
                  { id: 'SC1180', name: 'Funcionamiento de Válvula de Estacionamiento', group: 'MECANICA' },
                  { id: 'SC1190', name: 'Funcionamiento de válvulas de seguridad de los cilindros de la pluma', group: 'MECANICA' },
                  { id: 'SC1200', name: 'Funcionamiento frenos de servicio', group: 'MECANICA' },
                  { id: 'SC1210', name: 'Funcionamiento General de los Diferenciales', group: 'MECANICA' },
                  { id: 'SC1220', name: 'Funcionamiento General del motor del camión', group: 'MECANICA' },
                  { id: 'SC1230', name: 'Funcionamiento Manija, Puerta y Cerradura', group: 'MECANICA' },
                  { id: 'SC1240', name: 'Guardafangos', group: 'MECANICA' },
                  { id: 'SC1250', name: 'Hermeticidad en Tubería de Admisión y Filtro de Vacío', group: 'MECANICA' },
                  { id: 'SC1260', name: 'Juego libre Pedal y Embrague', group: 'MECANICA' },
                  { id: 'SC1270', name: 'Limpiabrisas', group: 'MECANICA' },
                  { id: 'SC1280', name: 'Limpieza Externa', group: 'MECANICA' },
                  { id: 'SC1290', name: 'Limpieza Interna', group: 'MECANICA' },
                  { id: 'SC1300', name: 'Loderas', group: 'MECANICA' },
                  { id: 'SC1310', name: 'Lubricación del Collarín y Barras', group: 'MECANICA' },
                  { id: 'SC1320', name: 'Luces Delanteras', group: 'MECANICA' },
                  { id: 'SC1330', name: 'Luces Direccionales e Intermitentes', group: 'MECANICA' },
                  { id: 'SC1340', name: 'Luces Reversa', group: 'MECANICA' },
                  { id: 'SC1350', name: 'Luces Stop', group: 'MECANICA' },
                  { id: 'SC1360', name: 'Luces Traseras', group: 'MECANICA' },
                  { id: 'SC1370', name: 'Mango y Perno de la Dirección', group: 'MECANICA' },
                  { id: 'SC1380', name: 'Mangueras de descarga y sujetador', group: 'MECANICA' },
                  { id: 'SC1390', name: 'Mangueras y Tubos hidráulicos', group: 'MECANICA' },
                  { id: 'SC1400', name: 'Medidores de Temperatura de los Diferenciales y Transmisión', group: 'MECANICA' },
                  { id: 'SC1410', name: 'Motor Hidráulico del agitador', group: 'MECANICA' },
                  { id: 'SC1420', name: 'Muelles y Abrazaderas', group: 'MECANICA' },
                  { id: 'SC1430', name: 'Nivel de Aceite', group: 'MECANICA' },
                  { id: 'SC1440', name: 'Nivel y limpieza de agua en caja de enfriamiento', group: 'MECANICA' },
                  { id: 'SC1450', name: 'Nivel/Fugas de aceite de depósito de dirección', group: 'MECANICA' },
                  { id: 'SC1460', name: 'Nivel/Fugas de aceite motor', group: 'MECANICA' },
                  { id: 'SC1470', name: 'Nivel/Fugas de aceite sistema hidráulico', group: 'MECANICA' },
                  { id: 'SC1480', name: 'Nivel/Fugas de combustible', group: 'MECANICA' },
                  { id: 'SC1490', name: 'Nivel/Fugas de refrigerante motor', group: 'MECANICA' },
                  { id: 'SC1500', name: 'Pasamanos', group: 'MECANICA' },
                  { id: 'SC1510', name: 'Pasillos', group: 'MECANICA' },
                  { id: 'SC1520', name: 'Pedestal de giro', group: 'MECANICA' },
                  { id: 'SC1530', name: 'Perchas', group: 'MECANICA' },
                  { id: 'SC1540', name: 'Pintura y Carrocería del Chasis Cabina', group: 'MECANICA' },
                  { id: 'SC1550', name: 'Pintura y Carrocería del Modulo', group: 'MECANICA' },
                  { id: 'SC1560', name: 'Pistón de la Válvula Rock o Válvula "S"', group: 'MECANICA' },
                  { id: 'SC1570', name: 'Pistones Hidráulicos', group: 'MECANICA' },
                  { id: 'SC1580', name: 'Plataforma para limpieza de tolva', group: 'MECANICA' },
                  { id: 'SC1590', name: 'Postenfriador', group: 'MECANICA' },
                  { id: 'SC1600', name: 'Presión de agitador', group: 'MECANICA' },
                  { id: 'SC1610', name: 'Protección zona CERO', group: 'MECANICA' },
                  { id: 'SC1620', name: 'Punto de anclaje, línea de vida y Arnés de seguridad.', group: 'MECANICA' },
                  { id: 'SC1630', name: 'Puntos de engrase', group: 'MECANICA' },
                  { id: 'SC1640', name: 'Radiador', group: 'MECANICA' },
                  { id: 'SC1650', name: 'Radio para comunicación', group: 'MECANICA' },
                  { id: 'SC1660', name: 'Reemplazo de aceite', group: 'MECANICA' },
                  { id: 'SC1670', name: 'Refrigerante de acuerdo a especificación Premezclado 50/50', group: 'MECANICA' },
                  { id: 'SC1680', name: 'Revisión de Barras de Dirección', group: 'MECANICA' },
                  { id: 'SC1690', name: 'Revisión de Batería,Cableado,Soporte y Tapa', group: 'MECANICA' },
                  { id: 'SC1700', name: 'Revisión de Hules de las Puertas', group: 'MECANICA' },
                  { id: 'SC1710', name: 'Revisión de Largueros', group: 'MECANICA' },
                  { id: 'SC1720', name: 'Revisión de Puentes del Chasis', group: 'MECANICA' },
                  { id: 'SC1730', name: 'Revisión de Uniones del chasis con bases del sist.Hid.', group: 'MECANICA' },
                  { id: 'SC1740', name: 'Revisión de Uniones del Chasis con Cabina', group: 'MECANICA' },
                  { id: 'SC1750', name: 'Revisión de Uniones del chasis con el módulo', group: 'MECANICA' },
                  { id: 'SC1760', name: 'Revisión del Turbo', group: 'MECANICA' },
                  { id: 'SC1770', name: 'Rines', group: 'MECANICA' },
                  { id: 'SC1780', name: 'Secador de Aire', group: 'MECANICA' },
                  { id: 'SC1790', name: 'Sello Riñón y Luneta', group: 'MECANICA' },
                  { id: 'SC1800', name: 'Sensor de nivel de Refrigerante y Filtro', group: 'MECANICA' },
                  { id: 'SC1810', name: 'Sensores de proximidad', group: 'MECANICA' },
                  { id: 'SC1820', name: 'Sensores y válvulas ABS', group: 'MECANICA' },
                  { id: 'SC1830', name: 'Señalética de seguridad', group: 'MECANICA' },
                  { id: 'SC1840', name: 'Sistema EGR (Sistema de recirculación de gases)', group: 'MECANICA' },
                  { id: 'SC1850', name: 'Soportes de Freno Magnético', group: 'MECANICA' },
                  { id: 'SC1860', name: 'Soportes de motor', group: 'MECANICA' },
                  { id: 'SC1870', name: 'Tablero de Instrumentos Medidores de Aceite', group: 'MECANICA' },
                  { id: 'SC1880', name: 'Tablero de Instrumentos Medidores de Aire', group: 'MECANICA' },
                  { id: 'SC1890', name: 'Tablero de Instrumentos Medidores de Combustible', group: 'MECANICA' },
                  { id: 'SC1900', name: 'Tablero de Instrumentos Medidores de Horómetro', group: 'MECANICA' },
                  { id: 'SC1910', name: 'Tablero de Instrumentos Medidores de Tacómetro RPM', group: 'MECANICA' },
                  { id: 'SC1920', name: 'Tablero de Instrumentos Medidores de Temperatura', group: 'MECANICA' },
                  { id: 'SC1930', name: 'Tablero de Instrumentos Medidores de Velocímetro', group: 'MECANICA' },
                  { id: 'SC1940', name: 'Tablero de Instrumentos Medidores de Voltaje', group: 'MECANICA' },
                  { id: 'SC1950', name: 'Tacones de la Caja de Transferencia', group: 'MECANICA' },
                  { id: 'SC1960', name: 'Tacones de la pluma', group: 'MECANICA' },
                  { id: 'SC1970', name: 'Tacones de la tolva y rejilla', group: 'MECANICA' },
                  { id: 'SC1980', name: 'Tacones para tubería horizontal', group: 'MECANICA' },
                  { id: 'SC1990', name: 'Tanque de Aceite Hidráulico', group: 'MECANICA' },
                  { id: 'SC2000', name: 'Tanque de agua', group: 'MECANICA' },
                  { id: 'SC2010', name: 'Tanques de combustible', group: 'MECANICA' },
                  { id: 'SC2020', name: 'Terminales de Dirección', group: 'MECANICA' },
                  { id: 'SC2030', name: 'Topes para bloqueo de ruedas', group: 'MECANICA' },
                  { id: 'SC2040', name: 'Tubo reductor', group: 'MECANICA' },
                  { id: 'SC2050', name: 'Válvula de alivio', group: 'MECANICA' },
                  { id: 'SC2060', name: 'Válvula de Transferencia', group: 'MECANICA' },
                  { id: 'SC2070', name: 'Yugo, pernos y bujes de la horquilla del pistón de la valv. Rock o valv."S"', group: 'MECANICA' },
                  { id: 'SC2080', name: 'Yugos y crucetas', group: 'MECANICA' },
                  { id: 'SC2090', name: 'Zepelines', group: 'MECANICA' }
                ]
              },

              2: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'Sintoma de falla',
                label: 'Sintoma de falla',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                reload_icon: false,
                new_icon: false,
                closable_icon: false,
                options: [
                  { id: 'SF010', name: 'Primer brazo', group: 'TUBERIA' },
                  { id: 'SF020', name: 'Segundo brazo', group: 'TUBERIA' },
                  { id: 'SF030', name: 'Tercer brazo', group: 'TUBERIA' },
                  { id: 'SF040', name: 'Cuarto brazo', group: 'TUBERIA' },
                  { id: 'SF050', name: 'Quinto brazo', group: 'TUBERIA' },
                  { id: 'SF060', name: 'Salida tolva', group: 'TUBERIA' },
                  { id: 'SF070', name: 'Pasillo/Torre BP', group: 'TUBERIA' },
                  { id: 'SF080', name: 'Obra vertical', group: 'TUBERIA' },
                  { id: 'SF090', name: 'Obra horizontal', group: 'TUBERIA' },
                  { id: 'SF100', name: 'Obra otro', group: 'TUBERIA' },
                  { id: 'SF300', name: 'Abrasión', group: 'MECANICA' },
                  { id: 'SF310', name: 'Aflojamiento/Juego Mecánico', group: 'MECANICA' },
                  { id: 'SF320', name: 'Agua de Mala Calidad', group: 'MECANICA' },
                  { id: 'SF330', name: 'Bajo Rendimiento', group: 'MECANICA' },
                  { id: 'SF340', name: 'Cables Tocando Partes de Metal', group: 'MECANICA' },
                  { id: 'SF350', name: 'Carga Excesiva', group: 'MECANICA' },
                  { id: 'SF360', name: 'Contaminación', group: 'MECANICA' },
                  { id: 'SF370', name: 'Corrosión', group: 'MECANICA' },
                  { id: 'SF380', name: 'Corto Circuito', group: 'MECANICA' },
                  { id: 'SF390', name: 'Desajuste', group: 'MECANICA' },
                  { id: 'SF400', name: 'Desalineamiento', group: 'MECANICA' },
                  { id: 'SF410', name: 'Desbalance', group: 'MECANICA' },
                  { id: 'SF420', name: 'Descalibración', group: 'MECANICA' },
                  { id: 'SF430', name: 'Desgaste', group: 'MECANICA' },
                  { id: 'SF440', name: 'Desnivelamiento', group: 'MECANICA' },
                  { id: 'SF450', name: 'Diseño/Fabricación Débil', group: 'MECANICA' },
                  { id: 'SF460', name: 'Eje Doblado', group: 'MECANICA' },
                  { id: 'SF470', name: 'Energía inapropiada', group: 'MECANICA' },
                  { id: 'SF480', name: 'Erosión', group: 'MECANICA' },
                  { id: 'SF490', name: 'Estiramiento', group: 'MECANICA' },
                  { id: 'SF500', name: 'Exceso de Lubricación', group: 'MECANICA' },
                  { id: 'SF510', name: 'Exceso de Temperatura', group: 'MECANICA' },
                  { id: 'SF520', name: 'Exceso de Vibración', group: 'MECANICA' },
                  { id: 'SF530', name: 'Excesos de Intentos de Arranques', group: 'MECANICA' },
                  { id: 'SF540', name: 'Falla de Agua', group: 'MECANICA' },
                  { id: 'SF550', name: 'Falla de Aire', group: 'MECANICA' },
                  { id: 'SF560', name: 'Falla Eléctrica C/T', group: 'MECANICA' },
                  { id: 'SF570', name: 'Falla en Equipo de Control', group: 'MECANICA' },
                  { id: 'SF580', name: 'Falla Mecánica C/T', group: 'MECANICA' },
                  { id: 'SF590', name: 'Falla Operación C/T', group: 'MECANICA' },
                  { id: 'SF600', name: 'Falla Por Mala Operación C/T', group: 'MECANICA' },
                  { id: 'SF610', name: 'Falla Software / Programación', group: 'MECANICA' },
                  { id: 'SF620', name: 'Falta de Aire', group: 'MECANICA' },
                  { id: 'SF630', name: 'Falta de Energía', group: 'MECANICA' },
                  { id: 'SF640', name: 'Falta de Limpieza', group: 'MECANICA' },
                  { id: 'SF650', name: 'Falta de Limpieza o Material Extraño', group: 'MECANICA' },
                  { id: 'SF660', name: 'Falta de Lubricación', group: 'MECANICA' },
                  { id: 'SF670', name: 'Fatiga', group: 'MECANICA' },
                  { id: 'SF680', name: 'Frenado', group: 'MECANICA' },
                  { id: 'SF690', name: 'Fuga de Aceite', group: 'MECANICA' },
                  { id: 'SF700', name: 'Fuga de Agua', group: 'MECANICA' },
                  { id: 'SF710', name: 'Fuga de Aire', group: 'MECANICA' },
                  { id: 'SF720', name: 'Fuga de Lubricante', group: 'MECANICA' },
                  { id: 'SF730', name: 'Fuga o Emisión', group: 'MECANICA' },
                  { id: 'SF740', name: 'Incendio', group: 'MECANICA' },
                  { id: 'SF750', name: 'Incrustación', group: 'MECANICA' },
                  { id: 'SF760', name: 'Lubricante Contaminado', group: 'MECANICA' },
                  { id: 'SF770', name: 'Lubricante de Baja Calidad', group: 'MECANICA' },
                  { id: 'SF780', name: 'Lubricante Viscosidad Baja', group: 'MECANICA' },
                  { id: 'SF790', name: 'Mal Ensamble', group: 'MECANICA' },
                  { id: 'SF800', name: 'Mantenimiento; Ejecución Deficiente', group: 'MECANICA' },
                  { id: 'SF810', name: 'Material Inadecuado/Baja Calidad', group: 'MECANICA' },
                  { id: 'SF820', name: 'Motor Dañado', group: 'MECANICA' },
                  { id: 'SF830', name: 'No Abre', group: 'MECANICA' },
                  { id: 'SF840', name: 'No Arranca', group: 'MECANICA' },
                  { id: 'SF850', name: 'No Cierra', group: 'MECANICA' },
                  { id: 'SF860', name: 'No Opera Correctamente', group: 'MECANICA' },
                  { id: 'SF870', name: 'Objeto Extraño', group: 'MECANICA' },
                  { id: 'SF880', name: 'Obstrucción/Bloqueo', group: 'MECANICA' },
                  { id: 'SF890', name: 'Parte de Equipo Roto', group: 'MECANICA' },
                  { id: 'SF900', name: 'Paso de Engrane', group: 'MECANICA' },
                  { id: 'SF910', name: 'Rozamiento', group: 'MECANICA' },
                  { id: 'SF920', name: 'Soltura Mecánica', group: 'MECANICA' },
                  { id: 'SF930', name: 'Temperatura Anormal', group: 'MECANICA' },
                  { id: 'SF940', name: 'Torque Inadecuado', group: 'MECANICA' },
                  { id: 'SF950', name: 'Uso de Herramientas Inadecuado', group: 'MECANICA' },
                  { id: 'SF960', name: 'Vandalismo', group: 'MECANICA' },
                  { id: 'SF970', name: 'Vida Útil Vencida', group: 'MECANICA' },
                  { id: 'SF980', name: 'Mejora', group: 'MECANICA' }
                ]
              },

              3: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'Tipo de gasto',
                label: 'Tipo de gasto',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                reload_icon: false,
                new_icon: false,
                closable_icon: false,
                options: [
                  { id: 'TG010', name: 'Desgaste', group: 'TUBERIA' },
                  { id: 'TG020', name: 'Ruptura', group: 'TUBERIA' },
                  { id: 'TG030', name: 'Taponamiento', group: 'TUBERIA' },
                  { id: 'TG100', name: 'Capex', group: 'MECANICA' },
                  { id: 'TG110', name: 'Correctivo', group: 'MECANICA' },
                  { id: 'TG120', name: 'Correctivo planeado', group: 'MECANICA' },
                  { id: 'TG130', name: 'Mala Operación', group: 'MECANICA' },
                  { id: 'TG140', name: 'Preventivo', group: 'MECANICA' },
                  { id: 'TG150', name: 'Siniestro por desastre natural', group: 'MECANICA' },
                  { id: 'TG160', name: 'Campañas', group: 'MECANICA' },
                  { id: 'TG170', name: 'Proyecto', group: 'MECANICA' }
                ]
              },

              /*4: {
                                "class": "col-span-6",
                                "class_md": "md:col-span-3",
                                "field": "warehouse",
                                "type": "dropdown",
                                "hide": false,
                                "autofocus": false,
                                "data_type": "warehouse",
                                "reload_icon": true,
                                "new_icon": false,
                                "closable_icon": true,
                            },
                            5: {
                                "class": "col-span-6",
                                "class_md": "md:col-span-3",
                                "field": "section",
                                "type": "dropdown",
                                "hide": false,
                                "autofocus": false,
                                "data_type": "section",
                                "reload_icon": true,
                                "new_icon": false,
                                "closable_icon": true,
                            },
                            6: {
                                "class": "col-span-6",
                                "class_md": "md:col-span-3",
                                "field": "rack",
                                "type": "dropdown",
                                "hide": false,
                                "autofocus": false,
                                "data_type": "rack",
                                "reload_icon": true,
                                "new_icon": false,
                                "closable_icon": true,
                            },
                            7: {
                                "class": "col-span-6",
                                "class_md": "md:col-span-3",
                                "field": "slots",
                                "type": "dropdown",
                                "hide": false,
                                "autofocus": false,
                                "data_type": "slot",
                                "reload_icon": true,
                                "new_icon": true,
                                "closable_icon": true,
                            },*/
              8: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'asset',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'asset',
                reload_icon: false,
                closable_icon: false
              },

              16: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
                field: 'supplier',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'supplier',
                reload_icon: true,
                new_icon: false,
                closable_icon: false
              },

              17: {
                class: 'col-span-6',
                class_md: 'md:col-span-3',
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
              },
              18: {
                class: 'col-span-6',
                class_md: 'md:col-span-3'
              },

              /*19: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'code',
                type: 'input-text',
                hide: false,
                autofocus: true
              },*/
              20: {
                class: 'col-span-7',
                class_md: 'md:col-span-4',
                field: 'search_name',
                type: 'auto-complete',
                hide: false,
                autofocus: false,
                delay: 400,
                option_label: 'base_product__name',
                data_type: 'product',
                include: 'base_product,slots',
                additionalFieldsIncluded: {
                  base_product: [
                    { original_field: 'description', renamed_fields: 'description' },
                    { original_field: 'short_name', renamed_fields: 'short_name' },
                    { original_field: 'name2', renamed_fields: 'name2' },
                    { original_field: 'code', renamed_fields: 'code' }
                  ]
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
                      field: 'base_product_code',
                      //no tiene doble guiin porque son campos adicionales de la relacion
                      header: 'Código',
                      type: 'text',
                      class: 'col-span-3',
                      class_md: 'col-span-2'
                    },
                    2: {
                      field: 'base_product__name',
                      // tiene doble guion porque po defecto en a las relaciones se les asigna por denefcot __name
                      type: 'text',
                      class: 'col-span-4',
                      class_md: 'md:col-span-4'
                    },
                    //esta informacion aun no se muestra porque son relaciones y no estan directo en el modelo de product
                    3: {
                      field: 'stock',
                      header: 'Existencia',
                      type: 'text',
                      class: 'col-span-2',
                      class_md: 'md:col-span-3'
                    },
                    4: {
                      field: 'price',
                      header: 'Precio',
                      type: 'text',
                      class: 'col-span-2',
                      class_md: 'md:col-span-1'
                    },
                    5: {
                      field: 'warehouse',
                      header: 'warehouse',
                      type: 'text',
                      class: 'col-span-2',
                      class_md: 'md:col-span-2'
                    }
                  }
                }
              },
              21: {
                class: 'col-span-7',
                class_md: 'md:col-span-4',
                field: 'name',
                type: 'input-text',
                hide: true,
                random_name: {
                  compressed_random_name2: true,
                  maximum_characters_random: 5
                },
                autofocus: false
              },
              22: {
                class: 'col-span-3',
                class_md: 'md:col-span-1',
                field: 'price',
                type: 'input-number',
                mode: 'decimal',
                min_fraction_digits: 5,
                max_fraction_digits: 5,
                //"min": 0,
                max: 1000000,
                prefix: '$'
              },

              23: {
                class: 'col-span-2',
                class_md: 'md:col-span-1',
                field: 'requested',
                autofocus: false,
                type: 'input-number',
                mode: 'decimal',
                min_fraction_digits: 2,
                max_fraction_digits: 2,
                min: 0,
                max: 1000000
                //"suffix": "cm",
              },
              24: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'currency',
                type: 'dropdown',
                hide: false,
                autofocus: false,
                data_type: 'currency'
              },

              25: {
                class: 'col-span-6',
                class_md: 'md:col-span-2',
                field: 'is_manual',
                type: 'toggle-button',
                hide: false,
                autofocus: false
              }
            }
          }
          /*0: {
                      "class": "col-span-4",
                      "class_md": "md:col-span-4",
                      "field": "description",
                      "type": "auto-complete",
                      "hide": false,
                      "autofocus": true,
                    },*/

          /*8: { // esto va en los tipos de respuestas
                      "class": "col-span-6",
                      "class_md": "md:col-span-4",
                      "field": "supplier",
                      "type": "dropdown",
                      "hide": false,
                      "autofocus": false,
                      "data_type": "supplier",       
                    },*/
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

    task: {
      dialog: {
        width: 'width-650px-custom',
        height: 'min-height-550px-custom'
      },
      general: {
        grid: {
          0: {
            class: 'col-span-12',
            class_md: 'md:col-span-4',
            field: 'FECHA',
            label: 'FECHA',
            type: 'date',
            autofocus: false
          },
          1: {
            class: 'col-span-12',
            class_md: 'md:col-span-4',
            field: 'REGION',
            label: 'REGION',
            type: 'dropdown',
            options: [
              { id: 'CENTRO', name: 'CENTRO' },
              { id: 'NORESTE', name: 'NORESTE' },
              { id: 'SURESTE', name: 'SURESTE' },
              { id: 'PACIFICO', name: 'PACIFICO' }
            ],
            hide: false,
            autofocus: false
          },
          2: {
            class: 'col-span-12',
            class_md: 'md:col-span-4',
            field: 'PLAZA',
            label: 'PLAZA',
            type: 'dropdown',
            options: [
              { id: 'TIJUANA', name: 'TIJUANA' },
              { id: 'MONTERREY', name: 'MONTERREY' },
              { id: 'GUADALAJARA', name: 'GUADALAJARA' }
            ],
            hide: false,
            autofocus: false
          },

          3: {
            class: 'col-span-12',
            class_md: 'md:col-span-4',
            field: 'TIPO_BOMBA',
            label: 'TIPO DE BOMBA',
            type: 'dropdown',
            options: [
              { id: 'BOMBA', name: 'BOMBA' },
              { id: 'TANQUE', name: 'TANQUE' }
            ],
            hide: false,
            autofocus: false
          },

          4: {
            class: 'col-span-12',
            class_md: 'md:col-span-4',
            field: 'asset',
            label: 'NUMERO ECONOMICO',
            description: '',
            type: 'dropdown',
            autofocus: false,
            data_type: 'asset'
          },

          5: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'PLACA DELANTERA',
            label: 'PLACA DELANTERA',
            description: '',
            type: 'input-text',
            hide: false,
            autofocus: true
          },
          6: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'PLACA TRASERA',
            label: 'PLACA TRASERA',
            description: '',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          7: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'HOROMETRO',
            label: 'HOROMETRO',
            description: '',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          8: {
            class: 'col-span-6',
            class_md: 'md:col-span-4',
            field: 'KILOMETRAJE',
            label: 'KILOMETRAJE',
            description: '',
            type: 'input-text',
            hide: false,
            autofocus: false
          },
          9: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'VERIFICACION VEHICULAR',
            label: 'VERIFICACION VEHICULAR',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: 'VERIFICACION VEHICULAR',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          10: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'TARJETA DE CIRCULACION',
            label: 'TARJETA DE CIRCULACION',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: 'TARJETA DE CIRCULACION',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //POLIZA DE SEGURO
          11: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'POLIZA_DE_SEGURO',
            label: 'POLIZA DE SEGURO',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: 'POLIZA DE SEGURO',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //01. PAROS DE EMERGENCIA LATERALES - ¿CUENTA CON LOS 2 BOTONES DE PARO DE EMERGENCIA?
          12: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PAROS_DE_EMERGENCIA_LATERALES',
            label: 'PAROS DE EMERGENCIA LATERALES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '01. PAROS DE EMERGENCIA LATERALES - ¿CUENTA CON LOS 2 BOTONES DE PARO DE EMERGENCIA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //01. PAROS DE EMERGENCIA LATERALES - ¿DESACTIVAN EL BOMBEO EN CUANTO SE ACCIONAN?
          13: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PAROS_DE_EMERGENCIA_LATERALES_DESACTIVAN_BOMBEO',
            label: 'PAROS DE EMERGENCIA LATERALES DESACTIVAN BOMBEO',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '01. PAROS DE EMERGENCIA LATERALES - ¿DESACTIVAN EL BOMBEO EN CUANTO SE ACCIONAN?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //02. PARO DE EMERGENCIA DE LA TOLVA - REVISAR QUE CUENTE CON EL MICROSWITCH Y LEVA DEL PARO DE REJILLA
          14: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PARO_DE_EMERGENCIA_DE_LA_TOLVA',
            label: 'PARO DE EMERGENCIA DE LA TOLVA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '02. PARO DE EMERGENCIA DE LA TOLVA - REVISAR QUE CUENTE CON EL MICROSWITCH Y LEVA DEL PARO DE REJILLA',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //02. PARO DE EMERGENCIA DE LA TOLVA - COMPRUEBA QUE EN CUANTO SE LEVANTE LA PARRILLA SE DETENGA AGITADORES Y VALVULA S
          15: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PARO_DE_EMERGENCIA_DE_LA_TOLVA_COMPRUEBA_AGITADORES_VALVULA',
            label: 'PARO DE EMERGENCIA DE LA TOLVA COMPRUEBA AGITADORES Y VALVULA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '02. PARO DE EMERGENCIA DE LA TOLVA - COMPRUEBA QUE EN CUANTO SE LEVANTE LA PARRILLA SE DETENGA AGITADORES Y VALVULA S',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //03. ESCALERAS DE ACCESO AL MODULO - ¿LAS ESCALERAS ESTAN BIEN SUJETAS?
          16: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESCALERAS_DE_ACCESO_AL_MODULO',
            label: 'ESCALERAS DE ACCESO AL MODULO',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '03. ESCALERAS DE ACCESO AL MODULO - ¿LAS ESCALERAS ESTAN BIEN SUJETAS?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //03. ESCALERAS DE ACCESO AL MODULO - ¿PRESENTAN GOLPES U OBSTRUCCIONES?
          17: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESCALERAS_DE_ACCESO_AL_MODULO_PRESENTAN_GOLPES_OBSTRUCCIONES',
            label: 'ESCALERAS DE ACCESO AL MODULO PRESENTAN GOLPES U OBSTRUCCIONES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '03. ESCALERAS DE ACCESO AL MODULO - ¿PRESENTAN GOLPES U OBSTRUCCIONES?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //04. ZONA CERO Y CALZAS - ¿LAS PROTECCIONES PRESENTAN GOLPE, ABOLLADURAS O FALTA PARTES?
          18: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ZONA_CERO_Y_CALZAS_PRESENTAN_GOLPE_ABOLLADURAS_O_FALTA_PARTES',
            label: 'ZONA CERO Y CALZAS PRESENTAN GOLPE, ABOLLADURAS O FALTA PARTES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '04. ZONA CERO Y CALZAS - ¿LAS PROTECCIONES PRESENTAN GOLPE, ABOLLADURAS O FALTA PARTES?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //04. ZONA CERO Y CALZAS - ¿PRESENTA FALTA DE TORNILLERIA?
          19: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ZONA_CERO_Y_CALZAS_PRESENTA_FALTA_DE_TORNILLERIA',
            label: 'ZONA CERO Y CALZAS PRESENTA FALTA DE TORNILLERIA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '04. ZONA CERO Y CALZAS - ¿PRESENTA FALTA DE TORNILLERIA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //04. ZONA CERO Y CALZAS - ¿EL EQUIPO CUENTA CON SUS 2 CALZAS DE SEGURIDAD?
          20: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ZONA_CERO_Y_CALZAS_CUENTA_CON_2_CALZAS_DE_SEGURIDAD',
            label: 'ZONA CERO Y CALZAS CUENTA CON 2 CALZAS DE SEGURIDAD',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '04. ZONA CERO Y CALZAS - ¿EL EQUIPO CUENTA CON SUS 2 CALZAS DE SEGURIDAD?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //05. CINTURÓN DE SEGURIDAD - ¿CINTURONES Y CONTRA SE ENCUENTRAN BIEN SUJETOS?
          21: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'CINTURON_DE_SEGURIDAD',
            label: 'CINTURÓN DE SEGURIDAD',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '05. CINTURÓN DE SEGURIDAD - ¿CINTURONES Y CONTRA SE ENCUENTRAN BIEN SUJETOS?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //05. CINTURÓN DE SEGURIDAD - REVISAR QUE NO SE PRESENTAN CORTES, DESGARRES O DESHILACHADURAS
          22: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'CINTURON_DE_SEGURIDAD_REVISAR_CORTES_DESGARRES_DESHILACHADURAS',
            label: 'CINTURÓN DE SEGURIDAD REVISAR CORTES, DESGARRES O DESHILACHADURAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '05. CINTURÓN DE SEGURIDAD - REVISAR QUE NO SE PRESENTAN CORTES, DESGARRES O DESHILACHADURAS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿FUNCIONAN CORRECTAMENTE LAS LUCES?
          23: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'LUCES_DELANTERAS_LATERALES_Y_TRASERAS_FUNCIONAN_CORRECTAMENTE',
            label: 'LUCES DELANTERAS, LATERALES Y TRASERAS FUNCIONAN CORRECTAMENTE',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿FUNCIONAN CORRECTAMENTE LAS LUCES?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿LAS LUCES DELANTERAS HACEN CAMBIO DE ALTA Y BAJA?
          24: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'LUCES_DELANTERAS_LATERALES_Y_TRASERAS_CAMBIO_ALTA_BAJA',
            label: 'LUCES DELANTERAS, LATERALES Y TRASERAS CAMBIO ALTA Y BAJA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿LAS LUCES DELANTERAS HACEN CAMBIO DE ALTA Y BAJA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿LAS LUCES DE POSICION, DIRECCIONALES E INTERMITENTES FUNCIONAN AL MENOS UNA POR CADA LADO?
          25: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'LUCES_DELANTERAS_LATERALES_Y_TRASERAS_POSICION_DIRECCIONALES_INTERMITENTES',
            label: 'LUCES DELANTERAS, LATERALES Y TRASERAS POSICION, DIRECCIONALES E INTERMITENTES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '06. LUCES DELANTERAS, LATERALES Y TRASERAS - ¿LAS LUCES DE POSICION, DIRECCIONALES E INTERMITENTES FUNCIONAN AL MENOS UNA POR CADA LADO?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - SE CUENTAN CON ESPEJOS EN BUEN ESTADO, NO ESTAN ROTOS
          26: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESPEJOS_LATERALES_CONCAVOS_Y_PUNTO_CIEGO',
            label: 'ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - SE CUENTAN CON ESPEJOS EN BUEN ESTADO, NO ESTAN ROTOS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - SOPORTES DE ESPEJOS EN BUEN ESTADO Y FIJADOS CORRECTAMENTE
          27: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESPEJOS_LATERALES_CONCAVOS_Y_PUNTO_CIEGO_SOPORTES',
            label: 'ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO SOPORTES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - SOPORTES DE ESPEJOS EN BUEN ESTADO Y FIJADOS CORRECTAMENTE',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - LOS ESPEJOS SE VEN DE FORMA CLARA
          28: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESPEJOS_LATERALES_CONCAVOS_Y_PUNTO_CIEGO_SE_VEN_CLARO',
            label: 'ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO SE VEN CLARO',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '07. ESPEJOS LATERALES, CONCAVOS Y PUNTO CIEGO - LOS ESPEJOS SE VEN DE FORMA CLARA',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //08. ALARMA DE REVERSA - FUNCIONAMIENTO CORRECTO DE ALARMA DE REVERSA
          29: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ALARMA_DE_REVERSA',
            label: 'ALARMA DE REVERSA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '08. ALARMA DE REVERSA - FUNCIONAMIENTO CORRECTO DE ALARMA DE REVERSA',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //08. ALARMA DE REVERSA - ¿LA ALARMA DE REVERSA SE ESCUCHA AL MENOS 3 MTS DE DISTANCIA?
          30: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ALARMA_DE_REVERSA_SE_ESCUCHA_3_MTS',
            label: 'ALARMA DE REVERSA SE ESCUCHA A 3 MTS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '08. ALARMA DE REVERSA - ¿LA ALARMA DE REVERSA SE ESCUCHA AL MENOS 3 MTS DE DISTANCIA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //09. CODO BISAGRA EN BUENAS CONDICIONES - ¿CUENTA CON PERNO DE LA BISAGRA?
          31: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'CODO_BISAGRA_EN_BUENAS_CONDICIONES',
            label: 'CODO BISAGRA EN BUENAS CONDICIONES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '09. CODO BISAGRA EN BUENAS CONDICIONES - ¿CUENTA CON PERNO DE LA BISAGRA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //09. CODO BISAGRA EN BUENAS CONDICIONES - ¿CUENTA CON CUÑA PARA CIERRE?
          32: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'CODO_BISAGRA_EN_BUENAS_CONDICIONES_CUENTA_CON_CUÑA',
            label: 'CODO BISAGRA EN BUENAS CONDICIONES CUENTA CON CUÑA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '09. CODO BISAGRA EN BUENAS CONDICIONES - ¿CUENTA CON CUÑA PARA CIERRE?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //09. CODO BISAGRA EN BUENAS CONDICIONES - ¿PRESENTAN FISURAS EN LOS COSTADOS?
          33: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'CODO_BISAGRA_EN_BUENAS_CONDICIONES_PRESENTAN_FISURAS',
            label: 'CODO BISAGRA EN BUENAS CONDICIONES PRESENTAN FISURAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '09. CODO BISAGRA EN BUENAS CONDICIONES - ¿PRESENTAN FISURAS EN LOS COSTADOS?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //10. ESTRUCTURA DE TODAS LAS SECCIONES. (QUINCENAL) - NO PRESENTA FISURAS, GOLPES O DEFORMACIONES EN SU ESTRUCTURA
          34: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESTRUCTURA_DE_TODAS_LAS_SECCIONES',
            label: 'ESTRUCTURA DE TODAS LAS SECCIONES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '10. ESTRUCTURA DE TODAS LAS SECCIONES. (QUINCENAL) - NO PRESENTA FISURAS, GOLPES O DEFORMACIONES EN SU ESTRUCTURA',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //10. ESTRUCTURA DE TODAS LAS SECCIONES. (QUINCENAL) - CUENTA CON TORNILLERIA QUE SUJETA CILINDROS HIDRAULICOS
          35: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESTRUCTURA_DE_TODAS_LAS_SECCIONES_TORNILLERIA_CILINDROS_HIDRAULICOS',
            label: 'ESTRUCTURA DE TODAS LAS SECCIONES TORNILLERIA CILINDROS HIDRAULICOS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '10. ESTRUCTURA DE TODAS LAS SECCIONES. (QUINCENAL) - CUENTA CON TORNILLERIA QUE SUJETA CILINDROS HIDRAULICOS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //11. VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA - NO PRESENTAN FUGAS EN CONEXIONES O CUERPO DE LA MISMA
          36: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'VALVULAS_DE_SEGURIDAD_DE_LOS_CILINDROS_DE_LA_PLUMA',
            label: 'VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '11. VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA - NO PRESENTAN FUGAS EN CONEXIONES O CUERPO DE LA MISMA',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //11. VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA - NO PRESENTA GOLPES
          37: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'VALVULAS_DE_SEGURIDAD_DE_LOS_CILINDROS_DE_LA_PLUMA_NO_PRESENTA_GOLPES',
            label: 'VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA NO PRESENTA GOLPES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '11. VÁLVULAS DE SEGURIDAD DE LOS CILINDROS DE LA PLUMA - NO PRESENTA GOLPES',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿LOS PERNOS PRESENTAN JUEGO ANORMAL?
          38: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'FUNCIONAMIENTO_Y_ESTADO_DE_BRAZOS_DE_PLUMA',
            label: 'FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿LOS PERNOS PRESENTAN JUEGO ANORMAL?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿CUENTAN CON TORNILLERIA Y PLACA DE FIJACION?
          39: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'FUNCIONAMIENTO_Y_ESTADO_DE_BRAZOS_DE_PLUMA_CUENTAN_CON_TORNILLERIA_Y_PLACA',
            label: 'FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA CUENTAN CON TORNILLERIA Y PLACA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿CUENTAN CON TORNILLERIA Y PLACA DE FIJACION?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿PRESENTAN FISURAS EN LAS ARTICULACIONES?
          40: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'FUNCIONAMIENTO_Y_ESTADO_DE_BRAZOS_DE_PLUMA_PRESENTAN_FISURAS_EN_LAS_ARTICULACIONES',
            label: 'FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA PRESENTAN FISURAS EN LAS ARTICULACIONES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '12. FUNCIONAMIENTO Y ESTADO DE BRAZOS DE PLUMA - ¿PRESENTAN FISURAS EN LAS ARTICULACIONES?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //13. TUBERÍA DE TRANSPORTE - NO CUENTAN CON FISURAS EN LOS COSTADOS O DEFORMACION
          41: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'TUBERIA_DE_TRANSPORTE_NO_CUENTAN_CON_FISURAS_EN_LOS_COSTADOS_O_DEFORMACION',
            label: 'TUBERÍA DE TRANSPORTE NO CUENTAN CON FISURAS EN LOS COSTADOS O DEFORMACION',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '13. TUBERÍA DE TRANSPORTE - NO CUENTAN CON FISURAS EN LOS COSTADOS O DEFORMACION',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //13. TUBERÍA DE TRANSPORTE - ¿CUENTAN CON TODOS SUS SOPORTES DE TUBERIA?
          42: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'TUBERIA_DE_TRANSPORTE_CUENTAN_CON_TODOS_SUS_SOPORTES',
            label: 'TUBERÍA DE TRANSPORTE CUENTAN CON TODOS SUS SOPORTES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '13. TUBERÍA DE TRANSPORTE - ¿CUENTAN CON TODOS SUS SOPORTES DE TUBERIA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //13. TUBERÍA DE TRANSPORTE - ¿CUENTA CON TODAS SUS ABRAZADERAS Y CHAVETAS?
          43: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'TUBERIA_DE_TRANSPORTE_CUENTA_CON_TODAS_SUS_ABRAZADERAS_Y_CHAVETAS',
            label: 'TUBERÍA DE TRANSPORTE CUENTA CON TODAS SUS ABRAZADERAS Y CHAVETAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '13. TUBERÍA DE TRANSPORTE - ¿CUENTA CON TODAS SUS ABRAZADERAS Y CHAVETAS?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //13. TUBERÍA DE TRANSPORTE - ¿CUENTA CON EL CABLE DE SEGURIDAD PARA LA MANGUERA DE DESCARGA?
          44: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'TUBERIA_DE_TRANSPORTE_CUENTA_CON_EL_CABLE_DE_SEGURIDAD_PARA_LA_MANGUERA_DE_DESCARGA',
            label: 'TUBERÍA DE TRANSPORTE CUENTA CON EL CABLE DE SEGURIDAD PARA LA MANGUERA DE DESCARGA',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '13. TUBERÍA DE TRANSPORTE - ¿CUENTA CON EL CABLE DE SEGURIDAD PARA LA MANGUERA DE DESCARGA?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //14. ESTABILIZADORES Y PLACAS DE APOYO - NO EXISTEN FISURAS O FRACTURAS
          45: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESTABILIZADORES_Y_PLACAS_DE_APOYO_NO_EXISTEN_FISURAS_O_FRACTURAS',
            label: 'ESTABILIZADORES Y PLACAS DE APOYO NO EXISTEN FISURAS O FRACTURAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '14. ESTABILIZADORES Y PLACAS DE APOYO - NO EXISTEN FISURAS O FRACTURAS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //14. ESTABILIZADORES Y PLACAS DE APOYO - LOS GATOS ESTABILIZADORES NO PRESENTEN FUGAS
          46: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESTABILIZADORES_Y_PLACAS_DE_APOYO_GATOS_NO_PRESENTEN_FUGAS',
            label: 'ESTABILIZADORES Y PLACAS DE APOYO GATOS NO PRESENTEN FUGAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '14. ESTABILIZADORES Y PLACAS DE APOYO - LOS GATOS ESTABILIZADORES NO PRESENTEN FUGAS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //14. ESTABILIZADORES Y PLACAS DE APOYO - PLACAS DE APOYO SIN FISURAS
          47: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'ESTABILIZADORES_Y_PLACAS_DE_APOYO_PLACAS_SIN_FISURAS',
            label: 'ESTABILIZADORES Y PLACAS DE APOYO PLACAS SIN FISURAS',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '14. ESTABILIZADORES Y PLACAS DE APOYO - PLACAS DE APOYO SIN FISURAS',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //15. PADS PARA ESTABILIZADORES - ¿CUENTA CON SUS 4 PADS PARA ESTABILIZAR?
          48: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PADS_PARA_ESTABILIZADORES_CUENTA_CON_SUS_4_PADS_PARA_ESTABILIZAR',
            label: 'PADS PARA ESTABILIZADORES CUENTA CON SUS 4 PADS PARA ESTABILIZAR',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '15. PADS PARA ESTABILIZADORES - ¿CUENTA CON SUS 4 PADS PARA ESTABILIZAR?',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          //15. PADS PARA ESTABILIZADORES - REVISAR QUE NO CUENTEN CON FISURAS O DEFORMACIONES
          49: {
            class: 'col-span-12',
            class_md: 'md:col-span-6',
            field: 'PADS_PARA_ESTABILIZADORES_REVISAR_FISURAS_O_DEFORMACIONES',
            label: 'PADS PARA ESTABILIZADORES REVISAR FISURAS O DEFORMACIONES',
            multiple: false,
            options: [
              { id: 'SI', name: 'SI' },
              { id: 'NO', name: 'NO' },
              { id: 'NO APLICA', name: 'NO APLICA' }
            ],
            description: '15. PADS PARA ESTABILIZADORES - REVISAR QUE NO CUENTEN CON FISURAS O DEFORMACIONES',
            type: 'select-button',
            hide: false,
            autofocus: false
          },
          50: {
            class: 'col-span-12',
            class_md: 'md:col-span-12',
            field: 'description',
            type: 'textarea',
            hide: false,
            autofocus: false
          }
        }
      }
    }
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
