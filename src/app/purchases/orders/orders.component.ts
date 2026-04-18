import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-orders',
  imports: [CrudPageShellComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class OrdersComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Pedido',
    command: () => this.openNew({ pos: 'purchase-orders' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Pedidos',
    command: () => this.getAll({ pos: 'purchase-orders' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-orders');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-orders';
    this.app[this.typeDefault] = 'purchases/orders';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
