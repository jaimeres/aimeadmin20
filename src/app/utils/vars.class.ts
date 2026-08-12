import { computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { MessageService } from '@/components/services/message.service';
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
  protected generalS: GeneralService = inject(GeneralService); // funciones generales
  protected confirmationS: ConfirmationService = inject(ConfirmationService); // para confirmar acciones
  //protected classifierS: ClassifierService = inject(ClassifierService); // para clasificadores
  protected sharedS: SharedDynamicDataService = inject(SharedDynamicDataService); // para datos dinámicos
  //protected crudS: any = inject(CRUDService); // servicio CRUD


  constructor(protected crudS: CRUDService) { }

  /**
   * muestra u oculta el dialogo para la configuración local
   */
  public localSettingsDialogVisible = false;

  /**
   * Más opciones del menú
   */
  public moreOptions = signal<any[]>([]);

  /**
   * indica si se crea o actualiza el registro, true para crear false para actualizar
   */
  public isCreate = signal<boolean>(false);

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
  protected exportDialogVisible = false;

  /**
   * Muestra u oculta el dialogo para la importación
   */
  protected importDialogVisible = false;

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
  protected include: { [key: string]: string } = { 0: '' };
  /**
   * campos para la consulta al servidor
   **/
  protected fields: { [key: string]: string } = { 0: '' };

  /**
   * [[[II ESC:024-06 Campos fijos por pos que SIEMPRE deben viajar en la consulta
   * de lista, independientes de las columnas visibles. iniParam() reconstruye
   * this.fields desde las columnas y sobreescribe cualquier asignacion manual; los
   * campos declarados aqui se concatenan en getAll2 para garantizar su presencia
   * (ej: is_detail_required en tareas, necesario para iniciar el detalle). ]]]FI
   */
  protected fixedFields: { [key: string]: string } = {};

  /**
   * ordenamiento para la consulta al servidor
   */
  protected sort = '';

  /**
   * filtro para la consulta al servidor
   */
  protected filter = ''//'filter[is_active]=true';

  /**
   * numero de registros que retornará la consula
   */
  //protected limit = signal<string[]>([250]); //any[] = [2];
  limit = signal<{ [key: string]: number }>({ 0: 20 });

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
   * NOTA: parece que esta demas porque columns ya contiene lo mismo, pero es necesario que cuando cambia cols 
   * para que selectedColumns compute
   */
  public cols = signal<any[]>([]);

  /**
   * columnas de la tabla de elementos, se inicializa en las clases heredadas
   */
  //protected columns: any[][] = [];
  protected columns: { [key: string]: any[] } = {};

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
    //ya no son necesarios, el servidor tra una vandera que dice si se miestra o no
    //['id', 'description', 'short_name', 'name2', 'sys__text', 'created_at', 'modified_at', 'inactivated_at', 'created_by__name', 'modified_by__name', 'inactivated_by__name', 'time_zone', 'external_code_number', 'external_code_text']
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

  // [[[II ESC:021-04 DOC:docs/documents/2026-06-05_021_crud-onshow-maximize-small-screens.md#escenario-04
  //selectedColumns = computed(() => this.cols().filter(col =>  !this.removeColumns().includes(col.field)));
  selectedColumns = computed(() => {
    const columns = Array.isArray(this.cols()) ? this.cols() : [];
    const removedColumns = Array.isArray(this.removeColumns()) ? this.removeColumns() : [];
    return columns.filter((col: any) => {
      return !removedColumns.includes(col.field);
    });
    //this.configForm.controls['columns'].setValue(col);
  });
  // ]]]FI

  /**
   * Los campos y valores que se mostrarán en el formulario de configuración local
   */
  public fieldConfig = signal<any>({
    cols: ([] = []),
    fields: ([] = [])
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


  tasksModule = signal<any>({});

  /**
   * Almacena los estados iniciales de deshabilitación por posición y campo
   */
  public initialDisabledForm: { [pos: string]: { [fieldName: string]: boolean } } = {};

  /**
   * Almacena los valores para separarar los componentes hijos
   */
  public showComponentSignal = signal<any[]>([]);


  public configGeneral = signal<any[]>([]);

  // no tiene caso la opcion espacio en blanco ya que el usuario puede mover el tamaño
  public drawForm = signal<any>({});
  public drawForm2 = signal<any>({});
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
