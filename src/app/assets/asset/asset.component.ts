import { afterNextRender, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
import { perfLog, perfMeasure, perfNow, perfTraceEnabled } from '../../utils/perf-trace';
// ]]]FI
// [[[II ESC:031-03 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-03
import { ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';
import { ConfirmationService } from '../../shared/primeng.index';
import { MenuItem } from 'primeng/api';
import { CustomButtonCrudComponent } from '../../components/custom-button-crud/custom-button-crud.component';
import { CustomButtonFooterComponent } from '../../components/custom-button-footer/custom-button-footer.component';
import { CustomTableComponent } from '../../components/custom-table/custom-table.component';
import { CustomDrawFormComponent } from '../../components/custom-draw-form/custom-draw-form.component';
import { CustomImportComponent } from '../../components/custom-import/custom-import.component';
import { CustomLocalSettingsComponent } from '../../components/custom-local-settings/custom-local-settings.component';
import { CustomAuditComponent } from '../../components/custom-audit/custom-audit.component';
import { CustomDocumentsComponent } from '../../components/custom-documents/custom-documents.component';
import { CustomActionsSelectionComponent } from '../../components/custom-actions-selection/custom-actions-selection.component';
// ]]]FI
// [[[II ESC:002-01 DOC:docs/documents/2026-05-19_002_ui_timeline_asset_subsidiary.md#escenario-01
import { AssetSubsidiaryTimelineComponent } from '../../components/asset-subsidiary-timeline/asset-subsidiary-timeline.component';
// ]]]FI

@Component({
  selector: 'app-asset',
  // [[[II ESC:031-03 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-03
  // Imports exactos en lugar de LOCAL_BASE/PRIME_MODULES. Los componentes del
  // segundo grupo se usan solo dentro de bloques @defer del template, por lo
  // que el compilador los separa en chunks diferidos que se cargan al abrir
  // el dialog/acción correspondiente.
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    TabsModule,
    SelectModule,
    CustomButtonCrudComponent,
    CustomTableComponent,
    CustomButtonFooterComponent,
    // Diferidos (solo en @defer):
    CustomDrawFormComponent,
    CustomAuditComponent,
    CustomDocumentsComponent,
    CustomLocalSettingsComponent,
    CustomImportComponent,
    CustomActionsSelectionComponent,
    AssetSubsidiaryTimelineComponent,
  ],
  // ]]]FI
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
  },
  {
    label: 'Activo por sucursal',
    command: () => this.openNew({ pos: 'asset-subsidiary' })
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
  }, {
    label: 'Activos por sucursales',
    command: () => this.getAll({ pos: 'asset-subsidiary' })
  }
  ]);

  /*drawAccessorySignal = signal<any>({
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

  });*/


  public assets = signal<any[]>([]); //los activos
  public fileTypes = signal<any[]>([]); //los tipos de documentos
  public fileStatus = signal<any[]>([]); //los estados de los documentos 
  public costCenter = signal<any[]>([]); //los centros de costo

  constructor(crudS: AssetService) {
    super(crudS, 'asset');

    // [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
    // Primer render estable del listado, medible solo con el flag bos_perf_trace.
    if (perfTraceEnabled()) {
      const constructedAt = perfNow();
      afterNextRender(() => {
        perfMeasure('AssetComponent primer render desde NavigationStart', 'bos:nav-start');
        perfLog('AssetComponent constructor -> primer render', perfNow() - constructedAt);
      });
    }
    // ]]]FI
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

    //this.excludeFieldsForm['asset-document-asset'] = [
    //  { field: 'documents', reemplace: false },
    //  //°°° falta solucionar el errore para que acepte el array de files
    //  { field: 'files', reemplace: false }
    //];

    //------------------------------------------------------
    this.type['accessory'] = 'accessory';
    this.app['accessory'] = 'assets/accessory';
    this.module['accessory'] = 'A';

    this.type['asset-subsidiary'] = 'asset-subsidiary';
    this.app['asset-subsidiary'] = 'assets/asset-subsidiary';
    this.module['asset-subsidiary'] = 'APS';


    this.initCRUD();
  }

  //especia para el componenet no se debe osayu para otrso componentes
  //onSelectFile(event: any) {
  //
  //  //°°°solo falta cuando se modifican el campo files
  //  const form = this.currentForm(this.pos());
  //  this.files = event.currentFiles;
  //  //si selecciona archivos quita los posibles error del document de form
  //  if (this.files.length > 0 || (form.get('files')?.value?.length || 0) > 0) {
  //    form.get('documents')?.setErrors(null);
  //  }
  //}



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
