import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';
import { buildPlaceholderCustomFields, ensurePlaceholderCrudConfigs } from '../../utils/placeholder-crud-config';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService extends CRUDService {

  private readonly placeholderModules = [
    //'purchase-supplier-request',
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
      ...buildPlaceholderCustomFields(this.authS.config, this.placeholderModules)
    });

  }
}