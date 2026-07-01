import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService extends CRUDService {

  private readonly placeholderModules = [
    //'purchase-supplier-request',
    // [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01
    'supplier-product',
    'delivery-note',
    'bill',
    // ]]]FI
    'purchase-offers-prices',
    'purchase-auctions',
    'purchase-delivery-notes',
    'purchase-bills',
    'purchase-direct-invoices',
    'purchase-payments',
    'purchase-request-detail'
  ];

  constructor() {
    super();

    ensurePlaceholderCrudConfigs(this.authS.config, this.placeholderModules);

    this.customField.set({
      'request-detail': this.authS.config['request-detail']['cols'],
      'supplier-request': this.authS.config['supplier-request']['cols'],
      // [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01
      'delivery-note': this.authS.config['delivery-note']['cols'],
      'bill': this.authS.config['bill']['cols'],
      'supplier-product': this.authS.config['supplier-product']['cols'],
      // ]]]FI
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });

  }
}
