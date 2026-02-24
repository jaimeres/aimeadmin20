import { Component, OnInit, signal } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AssetService } from '../services/asset.service';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { SelectModule } from 'primeng/select';
import { RequestComponent } from '../../purchases/request/request.component';

@Component({
  selector: 'app-maintenance',
  imports: [
    CommonModule,
    SelectModule,
    TagModule,
    RequestComponent,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class MaintenanceComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Solicitud',
    command: () => this.openNew({ pos: 'maintenance' })
  }, {
    label: 'Responsables',
    command: () => this.openNew({ pos: 'responsible-user-rule' })
  }
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Solicitudes',
    command: () => this.getAll({ pos: 'maintenance' })
  }, {
    label: 'Clasificador',
    command: () => this.getAll({ pos: 'responsible-user-rule' })
  }
  ]);

  constructor(crudS: AssetService) {
    super(crudS, 'maintenance');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'maintenance';
    this.app[this.typeDefault] = 'assets/maintenance';
    this.module[this.typeDefault] = 'MA';
    this.timeZone[this.typeDefault] = ['start_date', 'end_date', 'scheduled_date', 'required_date', 'expiration_date'];

    //es estatus no se debe enviar en la edicion
    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'status', },];

    this.includeFieldsForm[this.typeDefault] = [
      { field: 'maintenance_document_data_documents', },//required: true,
      { field: 'maintenance_document_data_name', default: 'Evidencia' },
      { field: 'maintenance_document_data_file_type' },
    ]

    this.relationships[this.typeDefault] = [
      { field: 'maintenance_document_data_file_type', type: 'file-type', app: 'files/file-type' },
    ]



    this.type['maintenance-document-maintenance'] = 'maintenance-document';
    this.app['maintenance-document-maintenance'] = 'assets/maintenance-document';
    this.formDialogVisible['maintenance-document-maintenance'] = false;
    this.singular['maintenance-document-maintenance'] = 'documento';
    this.plural['maintenance-document-maintenance'] = 'documentos';
    this.singularIndefiniteArticle['maintenance-document-maintenance'] = 'el documento';
    this.pluralDefiniteArticle['maintenance-document-maintenance'] = 'los documentos';
    this.module['maintenance-document-maintenance'] = 'A';

    this.excludeFieldsForm['maintenance-document-maintenance'] = [
      { field: 'documents', reemplace: false },
      //°°° falta solucionar el errore para que acepte el array de files
      { field: 'files', reemplace: false }
    ];



    this.initCRUD();

    /*this.startMenu.set([
      {
        label: 'Cargando...',
        //command: () => this.setStatus(null)
      }
    ]);*/
  }

  /**
 * se llama cuando el componente hijo avisa que el dialogo fue cerrado
 */
  closeDialogRequest() {
    this.tasks_module = {};
  }

  public installation = false;
  getInstallation() {
    this.installation = true;
  }


  /**
    * Sobre escribo la funcion para que se ejecute cada vez que se selecciona un registro y poder cargar los botones de estados
    * @param event Elemento seleccionado
    */
  /*override onSelection(event: any) {
    super.onSelection(event);

    const ids_task = this.selected()[0]?.tasks;
    console.log('ids_task..................', this.selected()[0]);

    if (ids_task) {
      const id = this.selected()[0]?.status;

      this.getStatus({ module: 'MA', id, ids_task });
      const ins = {
        label: 'Instalar',
        command: () => this.getInstallation()
      }

      this.startMenu.update(current => [...current, ins,]);
    }
  }*/

}
