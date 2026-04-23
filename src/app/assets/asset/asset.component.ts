import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { MenuItem } from 'primeng/api';

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

  override openNewMenu = signal<MenuItem[]>([{
    label: 'Activo',
    command: () => this.openNew({ pos: 'asset' })
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

  override getMenu = signal<MenuItem[]>([{
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

  drawAccessorySignal = signal<any>({
    //app
    'dialog': {
      'width': 'width-650px-custom',
      'height': 'min-height-550px-custom',
    },
    'general': {
      'grid': {
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


  public assets = signal<any[]>([]); //los activos
  public fileTypes = signal<any[]>([]); //los tipos de documentos
  public fileStatus = signal<any[]>([]); //los estados de los documentos 
  public costCenter = signal<any[]>([]); //los centros de costo

  constructor(crudS: AssetService) {
    super(crudS, 'asset');
  }

  ngOnInit(): void {



    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'asset';
    this.app[this.typeDefault] = 'assets/asset';
    this.module[this.typeDefault] = 'A';

    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'classifiers', default: this.fb.array([]), reemplace: true },
      //{ field: 'subsidiary', },
    ];
    this.excludeFieldsCols[this.typeDefault] = [
      { field: 'other' },
    ];
    //******************************************************************** */

    this.type['asset-type'] = 'asset-type';
    this.app['asset-type'] = 'assets/asset-type';
    this.module['asset-type'] = 'A';

    //this.resetForm['asset-type'] = { name: '', description: '', is_active: true, }; //todos estas en el array por defecto
    this.type['capacity-type'] = 'capacity-type';
    this.app['capacity-type'] = 'assets/capacity-type';
    this.module['capacity-type'] = 'A';

    this.type['asset-document'] = 'asset-document';
    this.app['asset-document'] = 'assets/asset-document';
    this.module['asset-document'] = 'A';
    this.excludeFieldsForm['asset-document'] = [
      { field: 'status', },
    ];

    //-----------------------------
    this.type['asset-document-asset'] = 'asset-document';
    this.app['asset-document-asset'] = 'assets/asset-document';
    this.module['asset-document-asset'] = 'A';

    this.excludeFieldsForm['asset-document-asset'] = [
      { field: 'documents', reemplace: false },
      //°°° falta solucionar el errore para que acepte el array de files
      { field: 'files', reemplace: false }
    ];

    //------------------------------------------------------
    this.type['accessory'] = 'accessory';
    this.app['accessory'] = 'assets/accessory';
    this.module['accessory'] = 'A';

    this.initCRUD();
  }

  //especia para el componenet no se debe osayu para otrso componentes
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
