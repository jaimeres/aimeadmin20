import { TestBed } from '@angular/core/testing';

import { GeneralService } from './general.service';

describe('GeneralService', () => {
  let service: GeneralService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:030-02 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-02
  it('merges configured table columns and formats a relationship with option_label', () => {
    const row = service.mergeConfiguredTableRow(
      { product: 'product-id', price: 10 },
      [{ field: 'base_product_data_code' }, { field: 'product' }, { field: 'price' }],
      {
        id: 'product-id',
        base_product_data_code: 'PR-01',
        base_product_data_name: 'Producto configurado',
      },
      { relationship_field: 'product', option_label: 'base_product_data_name' },
    );

    expect(row).toEqual({
      base_product_data_code: 'PR-01',
      product: 'Producto configurado',
      price: 10,
    });
  });
  // ]]]FI
});
