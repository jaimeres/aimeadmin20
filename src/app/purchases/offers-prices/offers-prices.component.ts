import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-offers-prices',
  imports: [CrudPageShellComponent],
  templateUrl: './offers-prices.component.html',
  styleUrl: './offers-prices.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class OffersPricesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Oferta o precio',
    command: () => this.openNew({ pos: 'purchase-offers-prices' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Ofertas y precios',
    command: () => this.getAll({ pos: 'purchase-offers-prices' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'purchase-offers-prices');
  }

  ngOnInit(): void {
    this.typeDefault = 'purchase-offers-prices';
    this.app[this.typeDefault] = 'purchases/offers-prices';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

}
