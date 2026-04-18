import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { SupportContactService } from '../services/support-contact.service';

@Component({
  selector: 'app-alerts',
  imports: [CrudPageShellComponent],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AlertsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Alerta',
    command: () => this.openNew({ pos: 'support-contact-alerts' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Alertas',
    command: () => this.getAll({ pos: 'support-contact-alerts' })
  }]);

  constructor(crudS: SupportContactService) {
    super(crudS, 'support-contact-alerts');
  }

  ngOnInit(): void {
    this.typeDefault = 'support-contact-alerts';
    this.app[this.typeDefault] = 'support-contact/alerts';
    this.module[this.typeDefault] = 'SC';
    this.initCRUD();
  }

}
