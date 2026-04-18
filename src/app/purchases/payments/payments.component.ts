import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-payments',
  imports: [CrudPageShellComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class PaymentsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Pago',
    command: () => this.openNew({ pos: 'purchase-payments' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Pagos',
    command: () => this.getAll({ pos: 'purchase-payments' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-payments');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-payments';
    this.app[this.typeDefault] = 'purchases/payments';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
