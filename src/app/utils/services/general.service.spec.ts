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

  // [[[II ESC:035-01 DOC:docs/documents/2026-07-31-035-option-label-relacion-anidada.md#escenario-01
  describe('DJAtoObject: quién resuelve la etiqueta de una relación', () => {
    /** Respuesta JSON:API de un detalle con `include=product.base_product`. */
    const respuesta = () => ({
      data: [{
        id: 'detalle-1',
        type: 'delivery-note-detail',
        attributes: { requested: '3.000' },
        relationships: { product: { data: { id: 'producto-1', type: 'product' } } },
      }],
      included: [
        {
          id: 'producto-1',
          type: 'product',
          // ProductByUserSerializer excluye `name` y `code` a propósito.
          attributes: { use_name: 'NO' },
          relationships: { base_product: { data: { id: 'base-1', type: 'base-product' } } },
        },
        {
          id: 'base-1',
          type: 'base-product',
          attributes: { code: 'PR-01', name: 'DIESEL' },
        },
      ],
    });

    it('option_label manda aunque la etiqueta viva una relación más adentro', () => {
      const flat: any = service.DJAtoObject({
        respDJA: respuesta(),
        fields: { product: { option_label: 'base_product_data_name' } },
      });

      expect(flat[0].product).toBe('producto-1');
      expect(flat[0]['product__name']).toBe('DIESEL');
    });

    it('varias claves de option_label se concatenan desde la relación anidada', () => {
      const flat: any = service.DJAtoObject({
        respDJA: respuesta(),
        fields: { product: { option_label: 'base_product_data_code,base_product_data_name' } },
      });

      expect(flat[0]['product__name']).toBe('PR-01 DIESEL');
    });

    it('sin option_label cae al fallback y, si el recurso no tiene name, queda vacío', () => {
      const flat: any = service.DJAtoObject({ respDJA: respuesta(), fields: {} });

      // Esto es exactamente lo que ocurría antes en toda tabla de detalle.
      expect(flat[0]['product__name']).toBe('');
    });

    it('option_label "name" se ignora a propósito y usa el fallback del recurso', () => {
      const resp: any = respuesta();
      resp.included[0].attributes.name = 'Nombre propio';

      const flat: any = service.DJAtoObject({
        respDJA: resp,
        fields: { product: { option_label: 'name' } },
      });

      expect(flat[0]['product__name']).toBe('Nombre propio');
    });
  });
  // ]]]FI
});
