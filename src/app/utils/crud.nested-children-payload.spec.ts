// [[[II ESC:057-62 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-62
import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { CRUD } from './crud.class';
import { DERIVED_TABLE_DRAFT_FLAG, TABLE_ROW_LOCAL_SOURCE_FLAG, TABLE_ROW_SOURCE_FLAG } from './table-row-flags.const';

/**
 * El alta manual manda las partidas dentro del padre, en `<prefijo>_data`.
 *
 * Lo que se prueba aquí es el CONTRATO con el servidor, verificado contra él en
 * `apps/purchases/test_diag_manual.py`:
 *   - `{'product': {'type': 'product', 'id': uuid}}` -> 201
 *   - `{'product': uuid}`   -> 400 Incorrect type. Expected resource identifier object
 *   - `{'product': nombre}` -> 400 Incorrect type. Expected resource identifier object
 */
describe('CRUD._buildNestedChildrenPayload', () => {
  const COLUMNAS = {
    0: { field: 'product', type: 'auto-complete', data_type: { type: 'product' } },
    1: { field: 'requested', type: 'input-number' },
    2: { field: 'price', type: 'input-number' },
  };

  const buildCrud = (rows: FormGroup[]): any => {
    const tabla = {
      type: 'table',
      field: 'no_form_data_table_derived',
      data_type: { type: 'supplier-request-detail' },
      columns: COLUMNAS,
    };
    const draw = {
      fields_prefixes: {
        supplier_request_detail_data_: { kind: 'child', data_type: 'supplier-request-detail' },
      },
      general: { grid: { 0: tabla } },
    };

    const crud = Object.create(CRUD.prototype) as any;
    // `Object.create` no corre los inicializadores de campo de la clase: las
    // banderas y el prefijo son propiedades de INSTANCIA y hay que reponerlas.
    crud.noFormDataPrefix = 'no_form_data_';
    crud.derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
    crud.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
    crud._canonicalFormFieldName = (name: any) => String(name ?? '');
    crud._drawFormForDevice = () => draw;
    crud._collectDrawFormLayouts = () => [draw.general.grid];
    crud.currentForm = () => new FormGroup({
      no_form_data_table_derived: new FormArray(rows as any),
    });
    crud.generalS = {
      configuredTableColumns: (cols: any) => Object.keys(cols || {})
        .sort((a, b) => Number(a) - Number(b)).map((k) => cols[k]),
    };
    crud.crudS = { getAppType: (key: string) => (key ? { type: key } : undefined) };
    return crud;
  };

  const fila = (controles: any, fuente: any = {}, marcas: any = {}): FormGroup => {
    const group = new FormGroup(
      Object.keys(controles).reduce((acc: any, k) => {
        acc[k] = new FormControl(controles[k]);
        return acc;
      }, {}),
    );
    (group as any)[TABLE_ROW_SOURCE_FLAG] = fuente;
    Object.keys(marcas).forEach((k) => { (group as any)[k] = marcas[k]; });
    return group;
  };

  const UUID = '2ca0567d-5d84-4997-939f-0714dc761272';

  it('manda la relación como {type,id} tomando el UUID de la fila fuente', () => {
    // La celda autocomplete deja el TEXTO en el control y el UUID en la fuente.
    const crud = buildCrud([
      fila({ product: 'TORNILLO GALVANIZADO 1/2', requested: '2.10', price: '2122.76' },
           { product: UUID, product__name: 'TORNILLO GALVANIZADO 1/2' }),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, true);

    expect(formData.supplier_request_detail_data).toEqual([{
      product: { type: 'product', id: UUID },
      requested: '2.10',
      price: '2122.76',
    }]);
  });

  it('NO descarta la fila capturada a mano por tener fila fuente llena', () => {
    const crud = buildCrud([
      fila({ product: 'X', requested: '1', price: '2' }, { product: UUID }),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, true);

    expect(formData.supplier_request_detail_data?.length).toBe(1);
  });

  it('excluye la fila JALADA: ésa viaja por data.meta.sources', () => {
    const crud = buildCrud([
      fila({ product: 'X', requested: '1', price: '2' }, { product: UUID },
           { [TABLE_ROW_LOCAL_SOURCE_FLAG]: { document: 'doc-1', max: '5' } }),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, true);

    expect(formData.supplier_request_detail_data).toBeUndefined();
  });

  it('excluye la fila de vista previa (draft)', () => {
    const crud = buildCrud([
      fila({ product: 'X', requested: '1' }, { product: UUID },
           { [DERIVED_TABLE_DRAFT_FLAG]: true }),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, true);

    expect(formData.supplier_request_detail_data).toBeUndefined();
  });

  it('sin selección no inventa relación: la columna viaja con lo tecleado', () => {
    const crud = buildCrud([
      fila({ product: '', requested: '3', price: '10' }, {}),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, true);

    expect(formData.supplier_request_detail_data).toEqual([
      { requested: '3', price: '10' },
    ]);
  });

  it('en PATCH no compone la lista: el servidor la rechaza a propósito', () => {
    const crud = buildCrud([
      fila({ product: 'X', requested: '1' }, { product: UUID }),
    ]);
    const formData: any = {};

    crud._buildNestedChildrenPayload('supplier-request', formData, false);

    expect(formData.supplier_request_detail_data).toBeUndefined();
  });
});
// ]]]FI
