import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';

@Component({
  selector: 'app-asset',
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    SelectModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './asset.component.html',
  styleUrl: './asset.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AssetComponent extends CRUD implements OnInit {

  drawAccessorySignal = signal<any>({
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

  colsAccessorySignal = signal<any>([
    //{ field: 'id', header: 'Identificador', sortable: true },
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'asset__name', header: 'Activo', sortable: true },
    { field: 'persons__name', header: 'Personas', sortable: true },
    { field: 'quantity', header: 'Cantidad', sortable: true },
    { field: 'description', header: 'Descripción', sortable: true },
    { field: 'is_active__text', header: 'Situación', sortable: true },
    { field: 'start_date', header: 'Inicio', sortable: true },
    { field: 'end_date', header: 'Fin', sortable: true },
    { field: 'inactivated_by__name', header: 'Inactivado por', sortable: true },
    { field: 'created_by__name', header: 'Creado por', sortable: true },
    { field: 'modified_by__name', header: 'Modificado por', sortable: true },
  ]);

  valAccessorySignal = signal<any>([
    { id: 1, name: 'Tubo 3mm', is_active: true, start_date: '2021-01-01', end_date: '2021-12-31', persons__name: 'Juan Perez', quantity: 150 },
    { id: 2, name: 'Herramienta', is_active: true, asset__name: 'CAJA DE HERRAMIENTAS ', persons__name: 'Varios', quantity: 2 }

  ]);

  public assets = signal<any[]>([]); //los activos
  public fileTypes = signal<any[]>([]); //los tipos de documentos
  public fileStatus = signal<any[]>([]); //los estados de los documentos 
  public costCenter = signal<any[]>([]); //los centros de costo

  constructor(crudS: AssetService) {
    super(crudS);
  }

  ngOnInit(): void {

    this.openNewMenu.set([{
      label: 'Activo',
      command: () => this.openNew()
    },
    {
      label: 'Tipo de activo',
      command: () => this.openNew({ pos: 'asset-type' })
    },
    {
      label: 'Tipo de capacidad',
      command: () => this.openNew({ pos: 'capacity-type' })
    }, {
      label: 'Documento',
      command: () => this.openNew({ pos: 'asset-document' })
    }
    ]);

    // consultas
    this.getMenu.set([{
      label: 'Activos',
      command: () => this.getAll({ pos: 'asset' })
    }, {
      label: 'Tipos de activo',
      command: () => this.getAll({ pos: 'asset-type' }),
    }, {
      label: 'Tipos de capacidad',
      command: () => this.getAll({ pos: 'capacity-type' })
    }, {
      label: 'Documentos',
      command: () => this.getAll({ pos: 'asset-document' })
    }
    ]);

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'asset';
    this.type[this.typeDefault] = this.typeDefault;
    this.app[this.typeDefault] = 'assets/asset';
    this.singular[this.typeDefault] = 'activo';
    this.plural[this.typeDefault] = 'activos';
    this.singularIndefiniteArticle[this.typeDefault] = 'el activo';
    this.pluralDefiniteArticle[this.typeDefault] = 'los activos';
    this.module[this.typeDefault] = 'A';

    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'classifiers', default: this.fb.array([]), reemplace: true },
    ];

    this.excludeFieldsCols[this.typeDefault] = [
      { field: 'other' },
    ];
    //******************************************************************** */

    this.type['asset-type'] = 'asset-type';
    this.app['asset-type'] = 'assets/asset-type';
    //this.formDialogVisible['asset-type'] = false;
    this.singular['asset-type'] = 'tipo de activo';
    this.plural['asset-type'] = 'tipos de activos';
    this.singularIndefiniteArticle['asset-type'] = 'el tipo de activo';
    this.pluralDefiniteArticle['sset-type'] = 'los tipos de activos';
    this.module['capacity-type'] = 'A';

    //this.resetForm['asset-type'] = { name: '', description: '', is_active: true, }; //todos estas en el array por defecto
    this.type['capacity-type'] = 'capacity-type';
    this.app['capacity-type'] = 'assets/capacity-type';
    this.formDialogVisible['capacity-type'] = false;
    this.singular['capacity-type'] = 'tipo de capacidad';
    this.plural['capacity-type'] = 'tipos de capacidades';
    this.singularIndefiniteArticle['capacity-type'] = 'el tipo de capacidad';
    this.pluralDefiniteArticle['capacity-type'] = 'los tipos de capacidades';
    this.module['capacity-type'] = 'A';


    this.type['asset-document'] = 'asset-document';
    this.app['asset-document'] = 'assets/asset-document';
    this.singular['asset-document'] = 'documento';
    this.plural['asset-document'] = 'documentos';
    this.singularIndefiniteArticle['asset-document'] = 'el documento';
    this.pluralDefiniteArticle['asset-document'] = 'los documentos';
    this.module['asset-document'] = 'A';
    this.excludeFieldsCols['asset-document'] = [{ field: 'documents' }];
    this.excludeFieldsForm['asset-document'] = [
      { field: 'status', },
    ];


    //-----------------------------
    this.type['asset-document-asset'] = 'asset-document';
    this.app['asset-document-asset'] = 'assets/asset-document';
    this.formDialogVisible['asset-document-asset'] = false;
    this.singular['asset-document-asset'] = 'documento';
    this.plural['asset-document-asset'] = 'documentos';
    this.singularIndefiniteArticle['asset-document-asset'] = 'el documento';
    this.pluralDefiniteArticle['asset-document-asset'] = 'los documentos';
    this.module['asset-document-asset'] = 'A';

    this.excludeFieldsForm['asset-document-asset'] = [
      { field: 'documents', reemplace: false },
      //°°° falta solucionar el errore para que acepte el array de files
      { field: 'files', reemplace: false }
    ];

    //------------------------------------------------------
    this.type['accessory'] = 'accessory';
    this.app['asset-document-asset'] = 'assets/accessory';
    this.formDialogVisible['accessory'] = false;
    this.singular['accessory'] = 'accesorio';
    this.plural['accessory'] = 'accesorios';
    this.singularIndefiniteArticle['accessory'] = 'el accesorio';
    this.pluralDefiniteArticle['accessory'] = 'los accesorios';
    this.module['accessory'] = 'A';

    this.initCRUD();

  }

  onSelectFile(event: any) {

    //°°°solo falta cuando se modifican el campo files
    const form = this.currentForm(this.pos());
    this.files = event.currentFiles;
    //si selecciona archivos quita los posibles error del document de form
    if (this.files.length > 0 || (form.get('files')?.value?.length || 0) > 0) {
      form.get('documents')?.setErrors(null);
    }
  }

}

//
/*
°°°
casas pendientes 
1. que el archivo se guarde en el servidor ya que al momento no puedo enviar archivos utilizando el estandar json:api
2. poner un aimagen generica para los documentos que no sean imagen
3. las relaciones del campo files, marca como requeridos en el OPTIONS para crear el form, pero si se envias o no se 
  envia nada al servidor este no se queja, tambien si se envia valores que no corresponder no se que y crear el recurso
  si esta relacion por el momento se inicializa con un array [1,2,3] para que no se queje el el form (el servidor no se queja)
4.°°°hay un tema importante, ya soy capaz de subir archivos desde postman, falta hacer la configuracion aqui, 
5. sobreescribir las funciones oNShow y openNew** para cargar los datos de los combos hasta que se abra el dialogo en lugar de hacerlo en ngOnInit
 

*/
