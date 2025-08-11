import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, Renderer2, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PurchaseService } from '../services/purchase.service';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { CustomAuditComponent } from '../../component/custom-audit/custom-audit.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-request',
  imports: [
    TableModule,
    TagModule,
    CommonModule,
    CustomAuditComponent,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class RequestComponent extends CRUD implements OnInit {


  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  public formSA: FormGroup = new FormGroup({});

  /**
   * Muestra u oculta partes del componente
   */
  @Input() showComponent: any = null;
  public showComponentSignal = signal<any>({
    'local': true,
    'create': false,
    'read': false,
    'update': false,
    'delete': false,
    'field': {
    }
  });

  /**
   * Emite el cierre del dialogo al componente padre
   */
  @Output() closeDialog = new EventEmitter<void>();

  public products = signal<any[]>([]);
  public stock = signal<any[]>([]);
  private fbLoc: FormBuilder = inject(FormBuilder);
  private search_name = signal<string>('');

  tDataSignal = signal<any>({
    'dialog': {
      'width': 'width-650px-custom',
      'height': 'min-height-550px-custom',
    },
    'general': {
      'grid': {
        0: {
          "class": "col-6",
          "class_md": "md:col-6",
          "field": "subsidiary_sends",
          "type": "dropdown",
          "name": "Sucursal envia",
          "hide": false,
          "autofocus": false,
          "data_type": "subsidiary",
          "reload_icon": false,
          "new_icon": false,
          "closable_icon": false,
        },
        1: {
          "class": "col-6",
          "class_md": "md:col-6",
          "field": "subsidiary_receives",
          "type": "dropdown",
          "name": "Sucursal recibe",
          "hide": false,
          "autofocus": false,
          "data_type": "subsidiary",
          "reload_icon": false,
          "new_icon": false,
          "closable_icon": false,
        },
        3: {
          "class": "col-6",
          "class_md": "md:col-3",
          "field": "code",
          "type": "input-text",
          "hide": false,
          "autofocus": true,
          "name": "Código"
        },
        4: {
          "class": "col-6",
          "class_md": "md:col-9",
          "field": "search_name",
          "name": "Buscar producto",
          "type": "auto-complete",
          "hide": false,
          "autofocus": false,
          "delay": 400,
          "option_label": "base_product__name",
          "data_type": "product",
          "include": "base_product,slots",
          "additionalFieldsIncluded": {
            'base_product': [
              { original_field: 'description', renamed_fields: 'description' },
              { original_field: 'short_name', renamed_fields: 'short_name' },
              { original_field: 'name2', renamed_fields: 'name2' },
              { original_field: 'code', renamed_fields: 'code' },
            ]
          },
          "icon2": {
            "icon": "pi pi-qrcode",
            "styleClass": "p-button-success",
          },
          "icon": {
            "icon": "pi pi-camera",
            "styleClass": "p-button-success",
          },
          "panel": {
            "fields": {
              0: {
                "field": "url",
                "header": "Imagen",
                "type": "image",
                "class": "col-1",
                "class_md": "col-2",
              },
              1: {
                "field": "base_product_code",
                //no tiene doble guiin porque son campos adicionales de la relacion
                "header": "Código",
                "type": "text",
                "class": "col-3",
                "class_md": "col-2",
              },
              2: {
                "field": "base_product__name",
                // tiene doble guion porque po defecto en a las relaciones se les asigna por denefcot __name 
                "type": "text",
                "class": "col-4",
                "class_md": "md:col-4",
              },
              //esta informacion aun no se muestra porque son relaciones y no estan directo en el modelo de product
              3: {
                "field": "stock",
                "header": "Existencia",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-3",
              },
              4: {
                "field": "price",
                "header": "Precio",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-1",
              },
              5: {
                "field": "warehouse",
                "header": "warehouse",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-2",
              },

            }
          }
        }
      }
    }
  });

  public drawFormStock = signal<any>({
    'dialog': {
      'width': 'width-650px-custom',
      'height': 'min-height-550px-custom',
    },
    'general': {
      'grid': {
        0: {
          "class": "col-6",
          "class_md": "md:col-3",
          "field": "code",
          "type": "input-text",
          "hide": false,
          "autofocus": true,
          "name": "Código"
        },
        1: {
          "class": "col-6",
          "class_md": "md:col-9",
          "field": "search_name",
          "name": "Buscar producto",
          "type": "auto-complete",
          "hide": false,
          "autofocus": false,
          "delay": 400,
          "option_label": "base_product__name",
          "data_type": "product",
          "include": "base_product,slots",
          "additionalFieldsIncluded": {
            'base_product': [
              { original_field: 'description', renamed_fields: 'description' },
              { original_field: 'short_name', renamed_fields: 'short_name' },
              { original_field: 'name2', renamed_fields: 'name2' },
              { original_field: 'code', renamed_fields: 'code' },
            ]
          },
          "icon2": {
            "icon": "pi pi-qrcode",
            "styleClass": "p-button-success",
          },
          "icon": {
            "icon": "pi pi-camera",
            "styleClass": "p-button-success",
          },
          "panel": {
            "fields": {
              0: {
                "field": "url",
                "header": "Imagen",
                "type": "image",
                "class": "col-1",
                "class_md": "col-2",
              },
              1: {
                "field": "base_product_code",
                //no tiene doble guiin porque son campos adicionales de la relacion
                "header": "Código",
                "type": "text",
                "class": "col-3",
                "class_md": "col-2",
              },
              2: {
                "field": "base_product__name",
                // tiene doble guion porque po defecto en a las relaciones se les asigna por denefcot __name 
                "type": "text",
                "class": "col-4",
                "class_md": "md:col-4",
              },
              //esta informacion aun no se muestra porque son relaciones y no estan directo en el modelo de product
              3: {
                "field": "stock",
                "header": "Existencia",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-3",
              },
              4: {
                "field": "price",
                "header": "Precio",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-1",
              },
              5: {
                "field": "warehouse",
                "header": "warehouse",
                "type": "text",
                "class": "col-2",
                "class_md": "md:col-2",
              },

            }
          }
        }
      }
    }
  });


  constructor(crudS: PurchaseService, private renderer: Renderer2) {
    super(crudS,);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.showComponentSignal()['local'] = false;

    if (changes['showComponent'] && changes['showComponent'].currentValue) {
      // Verifica si el valor actual de showComponent es válido
      const currentValue = changes['showComponent'].currentValue;

      if (currentValue['create']) {
        this.openNew(); // Aquí se realiza la lógica para crear
        this.showComponentSignal()['create'] = true;
      } else if (currentValue['update']) {
        this.showComponentSignal()['update'] = true;
        this.edit();
      } else if (currentValue['delete']) {
        this.showComponentSignal()['delete'] = true;
        this.delete();
      } else if (currentValue['read']) {
        this.showComponentSignal()['read'] = true;
        this.getAll();
      }
    }
  }

  ngOnInit() {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'request-detail';
    this.type[this.typeDefault] = this.typeDefault;
    this.app[this.typeDefault] = 'purchases/request-detail';
    this.singular[this.typeDefault] = 'solicitud';
    this.plural[this.typeDefault] = 'solicitudes';
    this.singularIndefiniteArticle[this.typeDefault] = 'una solicitud';
    this.pluralDefiniteArticle[this.typeDefault] = 'las solicitudes';

    this.relationships[this.typeDefault] = [
      { id: 'subsidiary', field: 'request_data_subsidiary', type: 'subsidiary' },
    ]

    this.includeFieldsForm[this.typeDefault] = [
      { field: 'request_data_code', },
      { field: 'request_data_description', },
      { field: 'request_data_folio', },
      { field: 'request_data_request_type', required: true },
      { field: 'group', },
      { field: 'company', },
      { field: 'request_data_subsidiary', required: true, },//aqui voy tengo que poner un objecto y que el includeFieldsForm lo AutoComplete, ahora solo acepta 
      { field: 'name', default: '', required: true, disabled: true, },
      { field: 'committed_budget', default: 0, disabled: true },
      { field: 'executed_budget', default: 0, disabled: true },
      { field: 'request_data_date', },
      { field: 'request_data_delivery_date', },
      { field: 'request_data_maximum_delivery_date', },
      { field: 'request_data_validate_maximum_delivery_date', default: false, },
      { field: 'search_name', required: true }, //para que tenga texrto cuando buscado cuando se solicita
      { field: 'requested', default: 1, required: true }, // por defecrto lo establece en 1 la catidad solicitada
      { field: 'request', required: false, },
      { field: 'price', default: 0, disabled: true },
      { field: 'currency', disabled: true },
      { field: 'is_manual', },

      { field: 'Componente', },
      { field: 'Subcomponente', },
      { field: 'Sintoma de falla', },
      { field: 'Tipo de gasto', },
    ];

    this.startMenu.set([{
      label: 'Existencias (F5)',
      command: () => this.actionsRequest('E')
    },
    {
      label: 'Pedido a proveedor (F6)',
      command: () => this.actionsRequest('PP')
    }, {
      label: 'Subastar/Cotizar (F7)',
      command: () => this.actionsRequest('SC')
    }, {
      label: 'Remisión (F8)',
      command: () => this.actionsRequest('R')
    }, {
      label: 'Salida de almacén (F9)',
      command: () => this.actionsRequest('SA')
    }, {
      label: 'Autorizar (F10)',
      command: () => this.actionsRequest('A')
    }, {
      label: 'Duplicar (F11)',
      command: () => this.actionsRequest('D')
    }, {
      label: 'Cancelar y rechazar (F12)',
      command: () => this.actionsRequest('C')
    }, {
      label: 'Programar',
      command: () => this.actionsRequest('P')
    }, {
      label: 'Traspaso',
      command: () => this.actionsRequest('T')
    },
    ]);

    const option_label = this.searchFieldDrawForm('search_name', 'request-detail')
    console.log('option_label', option_label);
    this.search_name.set(option_label.option_label);


    this.initCRUD();
    this.formSA = this.fb.group({
      person: ['']

    });
  }

  scFormSignal = signal<FormGroup>(this.fbLoc.group({
    description: [''],
  }));

  tFormSignal = signal<FormGroup>(this.fbLoc.group({
    subsidiary_sends: [''],
    search_name: [''],
    code: [''],
    subsidiary_receives: [''],
  }));

  scDataSignal = signal<any>({
    //app
    'dialog': {
      'width': 'width-650px-custom',
      'height': 'min-height-550px-custom',
    },
    'general': {
      'grid': {
        0: {
          "class": "col-6",
          "class_md": "md:col-6",
          "field": "supplier",
          "type": "dropdown",
          "hide": false,
          "autofocus": false,
          "data_type": "supplier",
        },
        4: {
          "class": "col-6",
          "class_md": "md:col-12",
          "field": "description",
          "type": "textarea",
          "hide": false,
          "autofocus": false,
        },
        2: {
          "class": "col-6",
          "class_md": "md:col-3",
          "field": "date",
          "type": "date",
          "hide": false,
          "autofocus": false,
        },
        3: {
          "class": "col-6",
          "class_md": "md:col-3",
          "field": "warehouse",
          "type": "dropdown",
          "hide": false,
          "autofocus": false,
          "data_type": "warehouse",
        }
      }
    }

  });

  ppDialogVisible = false;
  scDialogVisible = false;
  rDialogVisible = false;
  saDialogVisible = false;
  aDialogVisible = false;
  pDialogVisible = false;
  cDialogVisible = false;
  tDialogVisible = false;

  eDialogVisible = false;
  public eFormSignal = signal<FormGroup>(this.fbLoc.group({

    search_name: [''],
  }));

  cDataSignal = signal<any>({
    //app
    'dialog': {
      'width': 'width-650px-custom',
      'height': 'min-height-550px-custom',
    },
    'general': {
      'grid': {
        /*0: {
          "class": "col-12",
          "class_md": "md:col-12",
          "field": "supplier",
          "type": "dropdown",
          "hide": false,
          "autofocus": false,
          "data_type": "supplier",
        },*/
        1: {
          "class": "col-12",
          "class_md": "md:col-12",
          "field": "description",
          "type": "textarea",
          "hide": false,
          "autofocus": false,
        }
      }
    }

  });

  actionsRequest(status: string) {
    switch (status) {
      case 'PP':
        this.ppDialogVisible = true;
        break;
      case 'SC':
        this.scDialogVisible = true;
        break;
      case 'R':
        this.rDialogVisible = true;
        break;
      case 'SA':
        this.saDialogVisible = true;
        break;
      case 'A':
        this.aDialogVisible = true;
        break;
      case 'D':
        //logica para duplicar
        break;
      case 'P':
        this.pDialogVisible = true;
        break;
      case 'C':
        this.cDialogVisible = true;
        break;
      case 'E':
        this.eDialogVisible = true;
        break;
      case 'T':
        this.tDialogVisible = true;
        break;
    }
  }

  /**
   * Sobreescribe el método onHide para poder avisar al padre que se cerro el dialogo
   * @param app 
   */
  override onHide(app: any = null) {
    super.onHide();
    this.closeDialog.emit();
  }

  showMore(item: any) {
    console.log('showMore---------', item);
  }

  override onSelectAutoComplete(event: any) {

    console.log('onSelectAutoComplete------------------', event);

    this.currentForm()?.get('product')?.setValue(event.event.id);

    //°°°POR EL MOMENTO ES EL PRIMER ELEMENTO PERO DESPUES DEBE RESIOLVERSE COMO LIDIar cuando se retorna mas de uno
    /*const sName = this.search_name();  // Cadena dinámica
    const option_label: any = {};
    // Asigna el valor de manera dinámica
    option_label[sName] = event[sName];
    this.currentForm()?.get('search_name')?.setValue(option_label)*/
    //option_label
    this.replaceValDrawForm(
      [['', '', true]],
      [['requested', 'autofocus'],],
      this.drawForm()['request-detail']['general']['grid']);

    //desfragmentar this.draw() para foear la actuaklizacion de la vista
    const updatedDraw = { ...this.drawForm() };
    this.drawForm.set(updatedDraw);

    /*this.replaceValDrawForm(
      [['', '', true]],
      [['requested', 'autofocus'],],
      this.drawForm()['request-detail']['general']['grid']);*/
  }


  override onChangeDropdown($event: any) {

    /*console.log('onChangeDropdown', $event);

    const field = $event.field;
    const id = $event.event.value;
    const object = $event.event.object;

    if (object && object.cascading) {
      const { field, group, filter, searchLocale } = object.cascading;
      const options = object.options || [];
      console.log('Cascading:', field, group, filter, searchLocale);

      if (searchLocale) {
        //VA DENTRO DE UNFFOR
        console.log(this.searchByValueObject(filter, options, group));
        // this.currentForm()?.get(field)?.setValue();
      }
    }*/

    /*// Mapa de relaciones entre los campos
    const fieldMap: { [key: string]: string[] } = {
      group: ['company', 'subsidiary', 'warehouse', 'section', 'rack', 'slot'],
      company: ['subsidiary', 'warehouse', 'section', 'rack', 'slot'],
      subsidiary: ['warehouse', 'section', 'rack', 'slot'],
      warehouse: ['section', 'rack', 'slot'],
      section: ['rack', 'slot'],
      rack: ['slot'],
    };

    if (!fieldMap[field]) {
      console.warn(`No hay campos dependientes para el campo: ${field}`);
      return;
    }

    const dependentFields = fieldMap[field] || [];
    const app_simple = dependentFields[0] || '';

    // Limpiar los valores de los campos dependientes
    dependentFields.forEach((dependentField) => {
      this.currentForm()?.get(dependentField)?.setValue(null);
    });

    if (!id) {
      if (this.sharedS[app_simple]) {
        this.currentForm()?.get(app_simple)?.setValue(this.sharedS[app_simple]);
        console.log('if', this.sharedS[app_simple]);
        return;
      }
    } else {
      if (this.sharedS[app_simple]) {
        console.log('else', this.searchByValueObject(id, this.sharedS[app_simple], field));
        return;
      }
    }

    const app = `companies/${app_simple}`;
    const type = $event.field;
    const filter = `filter[${field}]=${id}`;

    this.crudS.getObject({ app, type, filter }).subscribe({
      next: (res: any) => {
        this.sharedS[field] = this.generalS.DJAtoObject({ respDJA: res });
        this.currentForm()?.get(app_simple)?.setValue(this.sharedS[app_simple]);
        console.log('noooo', this.sharedS[field]);
      },
      error: (err: any) => {
        console.log(err);
      },
    });*/
  }

  onnew_iconDropdown($event: any) {
    console.log($event);
  }

  onreload_iconDropdown($event: any) {
    console.log($event);
  }

  onclosable_iconDropdown($event: any) {
    const draw = this.drawForm()['request-detail'];

    this.searchFieldDrawForm($event, 'request-detail', true);



    /*for (const tab in draw) {
      if (!draw.hasOwnProperty(tab) || tab === 'dialog') continue;

      const grids = draw[tab];

      for (const grid in grids) {
        if (!grids.hasOwnProperty(grid)) continue;

        const element = grids[grid];

        if (grid === 'grid' || grid === 'nested') {
          const elementArray = Object.values(element);
          const general = this.searchByValueObject($event, elementArray, 'field');

          //Eliminar si lo encuentra directamente
          if (general[1] >= 0) {
            element.splice(general[1], 1);
            break;
          } else {
            // Si no lo encuentra, busca dentro de 'card'
            for (const key in element) {
              if (!element.hasOwnProperty(key)) continue;

              const card = this.searchByKeyObject('card', element[key]);
              if (card) {
                const cardArray = Object.values(card);
                const field = this.searchByValueObject($event, cardArray, 'field');

                //Eliminar del card si se encuentra
                if (field[1] >= 0) {
                  // Obtener la clave que corresponde al array para poder hacer splice
                  const cardKey = Object.keys(card)[field[1]];
                  if (cardKey) {
                    delete card[cardKey]; // También puedes usar `splice` si `card` es array
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }*/
  }

  override onChangeToggle($event: any) {

    const ch = $event.event.checked;
    const field = $event.field;
    if (field === 'is_manual') {

      //limiar base_product, poprque el posible que no se limpie en requested
      const form = this.currentForm()
      form?.get('base_product')?.setValue(null);

      //muestra/oculta el name y el buscador 
      this.replaceValDrawForm(
        [['', '', !ch], ['', '', ch]], [['name', 'hide'], ['search_name', 'hide']],
        this.drawForm()['request-detail']['general']['grid']);

      //deshabilita/habilita los campos manuales del formulario
      if (ch) {
        form?.get('price')?.enable();
        form?.get('currency')?.enable();
        form?.get('name')?.enable();
        //form?.get('search_name')?.disable();
      } else {
        form?.get('price')?.disable();
        form?.get('currency')?.disable();
        form?.get('name')?.disable();
        //form?.get('search_name')?.enable();
      }
    }
  }

  override onKeydownEnterText($event: any) {
    console.log('onKeydownEnterText', $event);

    const value = $event.event.target.value.trim();
    const field = $event.field;
    if (field === 'code') {
      if (value.length > 0) {
        this.crudS.getObject({
          app: 'products/product',
          type: 'products',
          filter: `filter[base_product.code.iexact]=${value}`,
          include: 'base_product',
        }).subscribe({
          next: (res: any) => {

            const temp = this.generalS.DJAtoObject({ respDJA: res });
            if (temp.length == 0) {
              this.messageS.changeMessage(`Artículo no encontrado.`);
              return;
            }

            this.currentForm()?.get('product')?.setValue(temp[0].id);
            //°°°POR EL MOMENTO ES EL PRIMER ELEMENTO PERO DESPUES DEBE RESIOLVERSE COMO LIDIar cuando se retorna mas de uno
            //para que le asignaba dicaminacmente a search_name del fomr el valor que respondia el servidor (temp[0][sName])
            const sName = this.search_name();  // Cadena dinámica
            const option_label: any = {};
            // Asigna el valor de manera dinámica
            option_label[sName] = temp[0][sName];
            this.currentForm()?.get('search_name')?.setValue(option_label);

            //option_label
            this.replaceValDrawForm(
              [['', '', true]],
              [['requested', 'autofocus'],],
              this.drawForm()['request-detail']['general']['grid']);

            //desfragmentar this.draw() para foear la actuaklizacion de la vista
            const updatedDraw = { ...this.drawForm() };
            this.drawForm.set(updatedDraw);
          },
          error: (err: any) => {
            this.messageS.changeMessage(`Hay un error al cargar el producto.`, err, this.customField()['request-detail']);
          }

        })
      }
    }

  }

  public columnsExist: any[] = [
    { field: 'code', header: 'Código', maxlength: 40, type: 'text' },
    { field: 'name', header: 'Nombre', maxlength: 50 },
    { field: 'price', header: 'Precio' },
    { field: 'requested', header: 'Cantidad' },
    { field: 'discard_proof', header: 'Desecho' },
  ];

  override onKeydownEnterNumber($event: any) {
    const value = $event.event.target.value.trim();
    console.log(value);

    const pos = 'request-detail';
    if (this.formErrors(pos, false)) return;
    this.validateRelationships(pos);

    const form = this.currentForm();

    const formData = form.value;
    const include = this.include;
    const filter = this.filter;
    this.showBlocked();

    this.crudS.saveObject({ formData, include, filter }).subscribe({
      next: (resp: any) => {
        const temp = [...this.products()];
        const r = this.DJAtoObject({ resp });
        r['editing'] = true;

        /*if(form?.get('search_name')?.value) {
          r['name'] = form?.get('search_name')?.value[this.search_name()];
        }else{
          r['name'] = form?.get('name')?.value || '';
        }*/

        temp.unshift(r);
        this.products.set(temp);
        form?.get('request')?.setValue(r?.request);
        form?.get('code')?.setValue('');
        //form?.get('request_data_code')?.setValue;
        form?.get('search_name')?.setValue(null);
        form?.get('name')?.setValue('');
        form?.get('requested')?.setValue(1);
        this.replaceValDrawForm(
          [['', '', false], ['', '', true]],
          [['requested', 'autofocus'], ['code', 'autofocus'],],
          this.drawForm()['request-detail']['general']['grid']);

        this.files = [];
        this.files64 = [];
        this.showBlocked(false);
      },
      error: e => {
        this.messageS.changeMessage(`No fue posible crear ${this.singularIndefiniteArticle[pos] ||
          this.singularIndefiniteArticle[0]}.`, e, this.customField()[pos]);
        this.showBlocked(false);
      }
    });

  }

  cancelRequestDetail() {
    console.log('cancelRequestDetail');

  }

  // ...existing code...



  private getCanvasPosition(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    let clientX = 0, clientY = 0;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const { x, y } = this.getCanvasPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    event.preventDefault();
    const { x, y } = this.getCanvasPosition(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  guardarFirma() {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    console.log('Firma en base64:', dataUrl);
    // Aquí puedes enviarlo al backend si lo deseas
  }

  initCanvas() {
    console.log('initCanvas');
    if (!this.canvasRef) return;
    console.log('funciona cambas');


    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

}
