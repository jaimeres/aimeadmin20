import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-delivery-notes',
  imports: [CrudPageShellComponent],
  templateUrl: './delivery-notes.component.html',
  styleUrl: './delivery-notes.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class DeliveryNotesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Remisión',
    command: () => this.openNew({ pos: 'purchase-delivery-notes' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Remisiones',
    command: () => this.getAll({ pos: 'purchase-delivery-notes' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-delivery-notes');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-delivery-notes';
    this.app[this.typeDefault] = 'purchases/delivery-notes';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
