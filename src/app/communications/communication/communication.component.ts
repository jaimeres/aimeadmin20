import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { CRUD } from '../../utils/crud.class';
import { CommunicationService } from '../services/communication.service';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-communication',
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    SelectModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './communication.component.html',
  styleUrl: './communication.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class CommunicationComponent extends CRUD implements OnInit {

  override openNewMenu = signal<MenuItem[]>([
    { label: 'Comunicación', command: () => this.openNew({ pos: 'communication' }) },
    { label: 'Destinatario', command: () => this.openNew({ pos: 'communication-recipient' }) },
    { label: 'Mensaje', command: () => this.openNew({ pos: 'communication-message' }) },
    { label: 'Adjunto', command: () => this.openNew({ pos: 'communication-attachment' }) },
    { label: 'Plantilla', command: () => this.openNew({ pos: 'communication-template' }) },
    { label: 'Canal', command: () => this.openNew({ pos: 'communication-channel' }) },
  ]);

  override getMenu = signal<MenuItem[]>([
    { label: 'Comunicaciones', command: () => this.getAll({ pos: 'communication' }) },
    { label: 'Destinatarios', command: () => this.getAll({ pos: 'communication-recipient' }) },
    { label: 'Mensajes', command: () => this.getAll({ pos: 'communication-message' }) },
    { label: 'Adjuntos', command: () => this.getAll({ pos: 'communication-attachment' }) },
    { label: 'Plantillas', command: () => this.getAll({ pos: 'communication-template' }) },
    { label: 'Canales', command: () => this.getAll({ pos: 'communication-channel' }) },
  ]);

  constructor(crudS: CommunicationService) {
    super(crudS, 'communication');
  }

  ngOnInit(): void {

    // communication (principal)
    this.typeDefault = 'communication';
    this.app[this.typeDefault] = 'communications/communication';
    this.module[this.typeDefault] = 'C';

    this.type['communication-recipient'] = 'communication-recipient';
    this.app['communication-recipient'] = 'communications/communication-recipient';
    this.module['communication-recipient'] = 'C';

    this.type['communication-message'] = 'communication-message';
    this.app['communication-message'] = 'communications/communication-message';
    this.module['communication-message'] = 'C';

    this.type['communication-attachment'] = 'communication-attachment';
    this.app['communication-attachment'] = 'communications/communication-attachment';
    this.module['communication-attachment'] = 'C';

    this.type['communication-template'] = 'communication-template';
    this.app['communication-template'] = 'communications/communication-template';
    this.module['communication-template'] = 'C';

    this.type['communication-channel'] = 'communication-channel';
    this.app['communication-channel'] = 'communications/communication-channel';
    this.module['communication-channel'] = 'C';

    this.initCRUD();
  }
}
