import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-bills',
  imports: [CrudPageShellComponent],
  templateUrl: './bills.component.html',
  styleUrl: './bills.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class BillsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Factura',
    command: () => this.openNew({ pos: 'purchase-bills' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Facturas',
    command: () => this.getAll({ pos: 'purchase-bills' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-bills');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-bills';
    this.app[this.typeDefault] = 'purchases/bills';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
