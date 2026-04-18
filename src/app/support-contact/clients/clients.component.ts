import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { SupportContactService } from '../services/support-contact.service';

@Component({
  selector: 'app-clients',
  imports: [CrudPageShellComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ClientsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Cliente',
    command: () => this.openNew({ pos: 'support-contact-clients' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Clientes',
    command: () => this.getAll({ pos: 'support-contact-clients' })
  }]);

  constructor(crudS: SupportContactService) {
    super(crudS, 'support-contact-clients');
  }

  ngOnInit(): void {
    this.typeDefault = 'support-contact-clients';
    this.app[this.typeDefault] = 'support-contact/clients';
    this.module[this.typeDefault] = 'SC';
    this.initCRUD();
  }

}
