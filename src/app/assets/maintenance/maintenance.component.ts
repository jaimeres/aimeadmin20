import { Component, OnInit, signal } from '@angular/core';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AssetService } from '../services/asset.service';
import { CommonModule } from '@angular/common';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { SelectModule } from 'primeng/select';
import { PopupComponent } from '../../tasks/popup/popup.component';

import { TableModule } from 'primeng/table';

import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';


type ChatMessage = {
  text: string;
  align: 'left' | 'right';
  user: string | null;
};

@Component({
  selector: 'app-maintenance',
  imports: [
    CommonModule,
    SelectModule,
    TagModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
    PopupComponent,

    //QUITAR
    TableModule,
    ToastModule,
    ButtonModule,
    InputTextModule

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
  }

  //temporal
  public installation = false;
  getInstallation() {
    this.installation = true;
  }

  //temporal

  messages: ChatMessage[] = [
    {
      text: 'Lleva 2 días sin llegar las refacciones',
      align: 'left',
      user: 'Juan'
    },
    {
      text: 'Ya lo estoy revisando con el proveedor',
      align: 'right',
      user: 'Yo'
    },
    {
      text: 'Avísame cualquier cambio',
      align: 'left',
      user: 'María'
    },
    {
      text: 'Lleva 2 días sin llegar las refacciones',
      align: 'left',
      user: 'Juan'
    },
    {
      text: 'Ya lo estoy revisando con el proveedor',
      align: 'right',
      user: null
    },
    {
      text: 'Avísame cualquier cambio',
      align: 'left',
      user: 'Ana'
    }
  ];

  //°°°temporal notas
  getInitials(user: string | null): string {
    if (!user) return '';

    return user
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }


  //°°°Temporal instalaciones
  dealogInstalacionesVisible = false
  desecho() {
    this.dealogInstalacionesVisible = true;
  }


  //temporal
  override onSelection(event: any[]) {

    super.onSelection(event);
    console.log(this.startMenu());

    this.startMenu().push({

      label: 'Instalaciones',
      command: () => this.desecho()
    })

  }


  products = [
    {
      id: '1000',
      code: 'f230fh0g3',
      name: 'bomba de agua',
      image: 'bamboo-watch.jpg',
      quantity: 1,
      desecho: 'NA',
    },
    {
      id: '1001',
      code: 'nvklal433',
      name: 'Manguera de alta presión',
      quantity: 61,
      desecho: '15',
    },
    {
      id: '1002',
      code: 'zz21cz3c1',
      name: 'Buje',
      quantity: 2,
      desecho: '2',

    },
  ];

  selectedProducts: any[] = [];


  getSeverity(status: string) {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warn';
      case 'OUTOFSTOCK':
        return 'danger';
    }
    return 'danger';
  }

  onCapturePhoto() {

  }






}
