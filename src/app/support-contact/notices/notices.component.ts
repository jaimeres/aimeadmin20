import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { SupportContactService } from '../services/support-contact.service';

@Component({
  selector: 'app-notices',
  imports: [CrudPageShellComponent],
  templateUrl: './notices.component.html',
  styleUrl: './notices.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class NoticesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Aviso',
    command: () => this.openNew({ pos: 'support-contact-notices' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Avisos',
    command: () => this.getAll({ pos: 'support-contact-notices' })
  }]);

  constructor(crudS: SupportContactService) {
    super(crudS, 'support-contact-notices');
  }

  ngOnInit(): void {
    this.typeDefault = 'support-contact-notices';
    this.app[this.typeDefault] = 'support-contact/notices';
    this.module[this.typeDefault] = 'SC';
    this.initCRUD();
  }

}
