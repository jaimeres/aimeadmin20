import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-direct-invoices',
  imports: [CrudPageShellComponent],
  templateUrl: './direct-invoices.component.html',
  styleUrl: './direct-invoices.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class DirectInvoicesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Factura directa',
    command: () => this.openNew({ pos: 'purchase-direct-invoices' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Facturas factura directa',
    command: () => this.getAll({ pos: 'purchase-direct-invoices' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-direct-invoices');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-direct-invoices';
    this.app[this.typeDefault] = 'purchases/direct-invoices';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
