import { Component, OnInit, signal } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AssetService } from '../services/asset.service';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-maintenance',
  imports: [
    CommonModule,
    SelectModule,
    TagModule,
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


    this.initCRUD()
  }

}
