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

  // [[[II ESC:057-129 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-129
  describe('enrichRowRelationDataFromColumns: las columnas <relación>_data_<campo>', () => {
    /** La misma respuesta de arriba: el código y el nombre viven DOS saltos
     *  más adentro (partida → producto → producto base). */
    const respuesta = () => ({
      data: [{
        id: 'detalle-1',
        type: 'supplier-request-detail',
        attributes: { requested: '3.000' },
        relationships: { product: { data: { id: 'producto-1', type: 'product' } } },
      }],
      included: [
        {
          id: 'producto-1',
          type: 'product',
          attributes: { use_name: 'NO' },
          relationships: { base_product: { data: { id: 'base-1', type: 'base-product' } } },
        },
        { id: 'base-1', type: 'base-product', attributes: { code: 'PR-01', name: 'DIESEL' } },
      ],
    });

    /** Las columnas TAL CUAL las declara la configuración del pedido. */
    const columnas = () => ({
      0: { field: 'product', option_label: 'base_product_data_name' },
      1: {
        field: 'product_data_code',
        relationship_field: 'product',
        option_label: 'base_product_data_code',
      },
      2: {
        field: 'product_data_name',
        relationship_field: 'product',
        option_label: 'base_product_data_name',
      },
      3: { field: 'requested' },
    });

    const filas = (resp: any) => service.DJAtoObject({
      respDJA: resp, fields: { product: { option_label: 'base_product_data_name' } },
    }) as any[];

    it('llena el código y la descripción desde el included de la MISMA respuesta', () => {
      const resp = respuesta();
      const [fila] = service.enrichRowRelationDataFromColumns(
        filas(resp), resp, columnas());

      expect(fila['product_data_code']).toBe('PR-01');
      expect(fila['product_data_name']).toBe('DIESEL');
      // La relación y su etiqueta siguen intactas.
      expect(fila['product']).toBe('producto-1');
      expect(fila['product__name']).toBe('DIESEL');
    });

    it('cada columna usa SU option_label, no el de la relación', () => {
      const resp = respuesta();
      const cols: any = columnas();
      cols[1].option_label = 'base_product_data_code,base_product_data_name';

      const [fila] = service.enrichRowRelationDataFromColumns(filas(resp), resp, cols);

      expect(fila['product_data_code']).toBe('PR-01 DIESEL');
    });

    it('NO pisa un valor que la fila ya trae (captura local del usuario)', () => {
      const resp = respuesta();
      const previas = filas(resp).map((f: any) => ({ ...f, product_data_code: 'MÍO' }));

      const [fila] = service.enrichRowRelationDataFromColumns(previas, resp, columnas());

      expect(fila['product_data_code']).toBe('MÍO');
      expect(fila['product_data_name']).toBe('DIESEL');
    });

    it('ignora las columnas que no declaran las DOS mitades del contrato', () => {
      const resp = respuesta();
      const cols: any = {
        // Sin `relationship_field`: no se sabe de qué relación cuelga.
        0: { field: 'product_data_code', option_label: 'base_product_data_code' },
        // Sin forma `<relación>_data_<campo>`: es un campo propio de la partida.
        1: { field: 'requested', relationship_field: 'product', option_label: 'code' },
      };

      const [fila] = service.enrichRowRelationDataFromColumns(filas(resp), resp, cols);

      expect(fila['product_data_code']).toBeUndefined();
      expect(fila['requested']).toBe('3.000');
    });

    it('sin included devuelve las filas tal cual, sin romperse', () => {
      const resp: any = respuesta();
      const originales = filas(resp);
      delete resp.included;

      expect(service.enrichRowRelationDataFromColumns(originales, resp, columnas()))
        .toBe(originales);
    });
  });
  // ]]]FI

  // [[[II ESC:036-01 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-01
  describe('baseDJA: meta del resource object', () => {
    it('publica data.meta cuando la conversión lo pide', () => {
      const payload: any = service.baseDJA({
        attributes: { folio: 'F-1' },
        type: 'delivery-note',
        meta: {
          idempotency_key: 'e4f8c45f-7e32-4a1e-8b6c-b3fb1e87d17b',
          sources: [{
            type: 'supplier-request-detail',
            id: 'src-1',
            meta: { source_version: '2026-08-02T10:30:00Z', quantity: '50' },
          }],
        },
      });

      // El meta va en el RESOURCE OBJECT, no en la raíz: es donde lo lee el
      // parser del BOS (`_data_meta`). En la raíz el servidor no lo vería.
      expect(payload.data.meta.sources[0].id).toBe('src-1');
      expect(payload.data.meta.sources[0].meta.quantity).toBe('50');
      expect(payload.data.attributes.folio).toBe('F-1');
      expect(payload.meta).toBeUndefined();
    });

    it('sin meta el payload es el de siempre', () => {
      const payload: any = service.baseDJA({
        attributes: { folio: 'F-1' },
        type: 'delivery-note',
      });

      expect('meta' in payload.data).toBeFalse();
    });

    it('un meta vacío tampoco se publica', () => {
      const payload: any = service.baseDJA({
        attributes: { folio: 'F-1' },
        type: 'delivery-note',
        meta: {},
      });

      // Un `meta` vacío convertiría el POST en una conversión sin fuentes.
      expect('meta' in payload.data).toBeFalse();
    });
  });
  // ]]]FI
});
