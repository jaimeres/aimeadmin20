import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { SupportContactService } from '../services/support-contact.service';

@Component({
  selector: 'app-suppliers',
  imports: [CrudPageShellComponent],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class SuppliersComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Proveedor',
    command: () => this.openNew({ pos: 'support-contact-suppliers' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Proveedores',
    command: () => this.getAll({ pos: 'support-contact-suppliers' })
  }]);

  constructor(crudS: SupportContactService) {
    super(crudS, 'support-contact-suppliers');
  }

  ngOnInit(): void {
    this.typeDefault = 'support-contact-suppliers';
    this.app[this.typeDefault] = 'support-contact/suppliers';
    this.module[this.typeDefault] = 'SC';
    this.initCRUD();
  }

}
