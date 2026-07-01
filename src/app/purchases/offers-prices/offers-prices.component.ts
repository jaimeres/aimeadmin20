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

  // [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01
  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Oferta o precio',
    command: () => this.openNew({ pos: 'supplier-product' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Ofertas y precios',
    command: () => this.getAll({ pos: 'supplier-product' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'supplier-product');
  }

  ngOnInit(): void {
    this.typeDefault = 'supplier-product';
    this.app[this.typeDefault] = 'purchases/supplier-product';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }
  // ]]]FI

}
