import { Component, OnInit, signal } from '@angular/core';
// [[[II ESC:057-157 Diálogo de firma; esta pantalla no usa el shell. ]]]FI
import { CustomAuthorizationComponent }
  from '../../components/custom-authorization/custom-authorization.component';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AssetService } from '../services/asset.service';
import { CommonModule } from '@angular/common';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { SelectModule } from 'primeng/select';

import { TableModule } from 'primeng/table';

import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ResponsibleComponent } from '../../components/responsible/responsible.component';
import { ResponsibleActionComponent } from '../../components/responsible-action/responsible-action.component';
import { CustomTaskTreeComponent } from '../../components/custom-task-tree/custom-task-tree.component';


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
    ResponsibleComponent,
    ResponsibleActionComponent,
    CustomTaskTreeComponent,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
    CustomAuthorizationComponent,

    //QUITAR
    TagModule,
    TableModule,
    ToastModule,
    ButtonModule,
    InputTextModule,

  ],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class MaintenanceComponent extends CRUD implements OnInit {
  // [[[II ESC:024-12 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-12
  taskTreeActive = signal(false);
  taskTreeRefreshKey = signal(0);
  // ]]]FI

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Solicitud',
    command: () => this.openNew({ pos: 'maintenance' })
  }, {
    label: 'Regla de responsables',
    command: () => this.openNew({ pos: 'maintenance-responsible-rule' })
  }, {
    label: 'Acción de regla',
    command: () => this.openNew({ pos: 'maintenance-responsible-rule-action' })
  }
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Solicitudes',
    command: () => this.getAll({ pos: 'maintenance' })
  }, {
    label: 'Reglas de responsables',
    command: () => this.getAll({ pos: 'maintenance-responsible-rule' })
  }, {
    label: 'Acciones de reglas',
    command: () => this.getAll({ pos: 'maintenance-responsible-rule-action' })
  },
  ]);

  constructor(crudS: AssetService) {
    super(crudS, 'maintenance');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'maintenance';
    this.app[this.typeDefault] = 'assets/maintenance';

    // [[[II ESC:057-157 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-157
    // La autorización es TRANSVERSAL: los niveles se declaran por
    // `authorization_type` (código de MODULES_CHOICES), así que el mismo
    // catálogo y el mismo menú sirven fuera de compras. Mantenimiento guarda sus
    // firmas en `maintenance-authorization`
    // (apps/assets/models/maintenance.py:400) y con esta línea el botón verde le
    // ofrece «Autorizar nivel N» igual que a un documento de compras.
    this.authorizationTracker['maintenance'] = {
      app: 'assets/maintenance-authorization',
      type: 'maintenance-authorization',
      field: 'maintenance',
    };
    // ]]]FI
    this.module[this.typeDefault] = 'MA';


    //this.timeZone[this.typeDefault] = ['start_date', 'end_date', 'scheduled_date', 'required_date', 'expiration_date'];
    //es estatus no se debe enviar en la edicion
    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'status', },];

    //this.includeFieldsForm[this.typeDefault] = [
    //  { field: 'maintenance_document_data_documents', },//required: true,
    //  { field: 'maintenance_document_data_name', default: 'Evidencia' },
    //  { field: 'maintenance_document_data_file_type' },
    //]<

    //this.relationships[this.typeDefault] = [
    //  { field: 'maintenance_document_data_file_type', type: 'file-type', app: 'files/file-type' },
    //];

    //this.type['maintenance-document-maintenance'] = 'maintenance-document';
    this.app['maintenance-document-maintenance'] = 'assets/maintenance-document';
    this.module['maintenance-document-maintenance'] = 'A';

    this.excludeFieldsForm['maintenance-document-maintenance'] = [
      //{ field: 'documents', reemplace: false },
      //°°° falta solucionar el errore para que acepte el array de files
      //{ field: 'files', reemplace: false }
    ];

    this.app['maintenance-responsible-rule'] = 'assets/maintenance-responsible-rule';
    this.module['maintenance-responsible-rule'] = 'MA';

    this.app['maintenance-responsible-rule-action'] = 'assets/maintenance-responsible-rule-action';
    this.module['maintenance-responsible-rule-action'] = 'MA';

    this.initCRUD();
  }

  // [[[II ESC:024-12 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-12
  override onTabChange(e: any): void {
    super.onTabChange(e);
    this.taskTreeActive.set(e === 5 || e === '5');
  }

  override closeTaskModule(): void {
    super.closeTaskModule();
    this.taskTreeRefreshKey.update((value) => value + 1);
  }
  // ]]]FI
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
