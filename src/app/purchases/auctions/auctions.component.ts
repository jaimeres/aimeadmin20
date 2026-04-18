import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-auctions',
  imports: [CrudPageShellComponent],
  templateUrl: './auctions.component.html',
  styleUrl: './auctions.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AuctionsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Subasta',
    command: () => this.openNew({ pos: 'purchase-auctions' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Subastas',
    command: () => this.getAll({ pos: 'purchase-auctions' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-auctions');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-auctions';
    this.app[this.typeDefault] = 'purchases/auctions';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
