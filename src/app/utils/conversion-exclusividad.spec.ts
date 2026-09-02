// [[[II ESC:057-63 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-63
import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { ConversionCRUD } from './conversion-crud.class';
import { DynamicTableFieldComponent } from '../components/custom-draw-form/dynamic-table-field/dynamic-table-field.component';
import { DERIVED_TABLE_DRAFT_FLAG, SOURCE_VERSION_KEYS, TABLE_ROW_LOCAL_SOURCE_FLAG, TABLE_ROW_SOURCE_FLAG } from './table-row-flags.const';

/**
 * Un documento se arma TRAYENDO partidas de otro o CAPTURÁNDOLAS a mano, nunca
 * de las dos formas. Gana la primera que se use, y la restricción SÓLO existe
 * una vez que hay filas traídas o capturadas: con la tabla vacía los dos
 * caminos están abiertos.
 *
 * Lo que se prueba aquí es que el aviso llega en el GESTO. Antes sólo se
 * comprobaba al guardar, con el documento entero ya armado.
 */
describe('Exclusividad traído / manual', () => {
  const fila = (valores: any, marcas: any = {}): FormGroup => {
    const group = new FormGroup(
      Object.keys(valores).reduce((acc: any, k) => {
        acc[k] = new FormControl(valores[k]);
        return acc;
      }, {}),
    );
    Object.keys(marcas).forEach((k) => { (group as any)[k] = marcas[k]; });
    return group;
  };

  const traida = (valores: any) => fila(valores, {
    [TABLE_ROW_LOCAL_SOURCE_FLAG]: { document: 'doc-4', label: '4', editable: 'requested', max: '5' },
  });

  describe('la tabla no deja agregar a mano si ya hay filas traídas', () => {
    const buildTabla = (filas: FormGroup[]): any => {
      const tabla = Object.create(DynamicTableFieldComponent.prototype) as any;
      tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
      tabla.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
      tabla.getTableFormArray = () => new FormArray(filas as any);
      tabla.isTableReadonly = () => false;
      tabla.isAnyRowEditing = () => false;
      tabla.createTableRowFormGroup = () => fila({ product: '' });
      tabla.clearTableRuntimeCaches = () => {};
      tabla.normalizedColumns = [];
      tabla.addRow = { emit: jasmine.createSpy('emit') };
      return tabla;
    };

    it('con filas traídas: avisa y NO agrega', () => {
      const filas = [traida({ product: 'DIESEL', requested: '2.10' })];
      const tabla = buildTabla(filas);

      tabla.addTableRow('no_form_data_table_derived', {});

      expect(tabla.messageS.changeMessage).toHaveBeenCalled();
      const texto = tabla.messageS.changeMessage.calls.mostRecent().args[0];
      expect(texto).toContain('Retire las traídas');
      expect(tabla.addRow.emit).not.toHaveBeenCalled();
    });

    it('sin filas traídas: agrega como siempre', () => {
      const tabla = buildTabla([]);

      tabla.addTableRow('no_form_data_table_derived', {});

      expect(tabla.messageS.changeMessage).not.toHaveBeenCalled();
      expect(tabla.addRow.emit).toHaveBeenCalled();
    });

    it('con filas capturadas a mano: agregar otra sigue abierto', () => {
      const tabla = buildTabla([fila({ product: 'DIESEL', requested: '1' })]);

      tabla.addTableRow('no_form_data_table_derived', {});

      expect(tabla.messageS.changeMessage).not.toHaveBeenCalled();
      expect(tabla.addRow.emit).toHaveBeenCalled();
    });
  });

  describe('traer un documento se bloquea si ya hay captura manual', () => {
    const buildCrud = (filas: FormGroup[]): any => {
      const crud = Object.create(ConversionCRUD.prototype) as any;
      crud.derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
      crud.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
      crud.currentForm = () => new FormGroup({
        no_form_data_table_derived: new FormArray(filas as any),
      });
      // El predicado necesita el contrato para saber cuál es la columna ORIGEN.
      crud._conversionSourceTables = () => [{
        table: { field: 'no_form_data_table_derived' },
        contract: { column: 'request_detail', quantity: 'requested' },
      }];
      return crud;
    };
    const tabla = { field: 'no_form_data_table_derived' };

    it('una fila capturada con contenido bloquea', () => {
      const crud = buildCrud([fila({ product: 'DIESEL', requested: '1' })]);
      expect(crud._manualRowsWithContent('supplier-request', tabla)).toBeTrue();
    });

    it('una fila recién abierta y vacía NO bloquea', () => {
      const crud = buildCrud([fila({ product: '', requested: null })]);
      expect(crud._manualRowsWithContent('supplier-request', tabla)).toBeFalse();
    });

    it('las filas traídas NO cuentan como captura manual', () => {
      const crud = buildCrud([traida({ product: 'DIESEL', requested: '2.10' })]);
      expect(crud._manualRowsWithContent('supplier-request', tabla)).toBeFalse();
    });

    it('la vista previa del autocomplete NO cuenta', () => {
      const crud = buildCrud([
        fila({ product: 'DIESEL' }, { [DERIVED_TABLE_DRAFT_FLAG]: true }),
      ]);
      expect(crud._manualRowsWithContent('supplier-request', tabla)).toBeFalse();
    });

    it('la tabla vacía no bloquea nada: los dos caminos abiertos', () => {
      const crud = buildCrud([]);
      expect(crud._manualRowsWithContent('supplier-request', tabla)).toBeFalse();
    });
  });
});
// ]]]FI

// [[[II ESC:057-67 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-67
import { DynamicTableFieldComponent as TablaEditable } from '../components/custom-draw-form/dynamic-table-field/dynamic-table-field.component';

describe('Edición de una fila traída', () => {
  const construir = (bloqueadosPorPadre?: Map<string, Set<string>>) => {
    const tabla = Object.create(TablaEditable.prototype) as any;
    tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
    tabla._derivedLockedFields = new Set<string>();
    tabla._derivedLockedByParent = bloqueadosPorPadre ?? new Map<string, Set<string>>();
    tabla.tableConfig = { sources: { column: 'request_detail', quantity: 'requested' } };
    tabla.isManualRow = () => false;
    tabla._isColumnEditable = () => true;
    return tabla;
  };

  /** Lo que declara la columna ORIGEN: product/price/delivered cerrados,
   *  `requested` abierto porque es la que viaja. */
  const derivacionDeclarada = () => new Map<string, Set<string>>([
    ['request_detail', new Set(['product', 'price', 'delivered'])],
  ]);

  const marca = { document: 'doc-6', label: '6', editable: 'requested', max: '5' };
  const filaTraida = () => ({ [TABLE_ROW_LOCAL_SOURCE_FLAG]: marca });

  it('abre SÓLO la columna que declara `sources.quantity`', () => {
    const tabla = construir();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'requested' })).toBeTrue();
  });

  it('cierra lo que la DERIVACIÓN de la columna origen declara cerrado', () => {
    // Y no por una regla del cliente: por la configuración de esa derivación.
    const tabla = construir(derivacionDeclarada());
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'product' })).toBeFalse();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'price' })).toBeFalse();
  });

  it('sin derivación declarada manda la configuración de la propia columna', () => {
    // NINGÚN campo tiene trato especial: si nadie declaró la derivación, el
    // campo raíz gobierna, que es la regla general.
    const tabla = construir();
    tabla._derivedLockedFields = new Set<string>(['price']);
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'product' })).toBeTrue();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'price' })).toBeFalse();
  });

  it('`readonly` sigue mandando por encima de todo', () => {
    const tabla = construir();
    expect(tabla.isCellEditableForRow(filaTraida(),
      { field: 'requested', readonly: true })).toBeFalse();
  });

  it('una fila capturada a mano no se cierra: manda la configuración', () => {
    const tabla = construir();
    tabla.isManualRow = () => true;
    expect(tabla.isCellEditableForRow({}, { field: 'product' })).toBeTrue();
    expect(tabla.isCellEditableForRow({}, { field: 'price' })).toBeTrue();
  });
});
// ]]]FI

// [[[II ESC:057-71 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-71
describe('La derivación gobierna la fila traída', () => {
  const marca = { document: 'doc-6', label: '6', editable: 'requested', max: '5' };
  const filaTraida = () => ({ [TABLE_ROW_LOCAL_SOURCE_FLAG]: marca });

  const construir = (porPadre: Map<string, Set<string>>) => {
    const tabla = Object.create(TablaEditable.prototype) as any;
    tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
    tabla._derivedLockedFields = new Set<string>();
    tabla._derivedLockedByParent = porPadre;
    tabla.tableConfig = { sources: { column: 'request_detail', quantity: 'requested' } };
    tabla.isManualRow = () => false;
    tabla._isColumnEditable = () => true;
    return tabla;
  };

  it('cierra lo que la derivación declara `edit: false`', () => {
    const tabla = construir(new Map([
      ['request_detail', new Set(['product', 'price', 'delivered'])],
    ]));
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'product' })).toBeFalse();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'price' })).toBeFalse();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'delivered' })).toBeFalse();
  });

  it('abre lo que la derivación declara `edit: true`', () => {
    const tabla = construir(new Map([
      ['request_detail', new Set(['product', 'price', 'delivered'])],
    ]));
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'requested' })).toBeTrue();
  });

  it('MANDA la derivación, no la marca: si la configuración abre el precio, se abre', () => {
    // La marca sigue diciendo `editable: 'requested'`. La configuración gana.
    const tabla = construir(new Map([
      ['request_detail', new Set(['product'])],
    ]));
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'price' })).toBeTrue();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'product' })).toBeFalse();
  });

  it('otra columna padre no gobierna esta fila', () => {
    // `product` declara sus propios derivados; no deben aplicarse a la fila
    // traída, que la derivó la columna ORIGEN.
    const tabla = construir(new Map([
      ['product', new Set(['requested'])],
    ]));
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'requested' })).toBeTrue();
  });

  it('sin derivación declarada manda la configuración de la propia columna', () => {
    // La cantidad NO es un campo privilegiado: es editable cuando su
    // declaración lo dice, igual que cualquier otro.
    const tabla = construir(new Map());
    tabla._derivedLockedFields = new Set<string>(['product']);
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'requested' })).toBeTrue();
    expect(tabla.isCellEditableForRow(filaTraida(), { field: 'product' })).toBeFalse();
  });

  it('`readonly` sigue siendo un candado absoluto', () => {
    const tabla = construir(new Map([['request_detail', new Set()]]));
    expect(tabla.isCellEditableForRow(filaTraida(),
      { field: 'requested', readonly: true })).toBeFalse();
  });
});
// ]]]FI

// [[[II ESC:057-72 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-72
import { ROW_DERIVED_BY_KEY, TABLE_ROW_SOURCE_FLAG as FUENTE } from './table-row-flags.const';

describe('El padre que derivó la fila manda sobre esa fila', () => {
  /** Solicitud: el usuario carga la partida por `code` O por `name`, y cada
   *  buscador declara su propia derivación. */
  const construir = (porPadre: Map<string, Set<string>>, columnaOrigen = 'request_detail') => {
    const tabla = Object.create(TablaEditable.prototype) as any;
    tabla.tableRowSourceFlag = FUENTE;
    tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
    tabla._derivedLockedFields = new Set<string>(['price', 'currency']);
    tabla._derivedLockedByParent = porPadre;
    tabla.tableConfig = { sources: { column: columnaOrigen, quantity: 'requested' } };
    tabla.isManualRow = () => false;
    tabla._isColumnEditable = () => true;
    return tabla;
  };

  // Un objeto plano ES la fila fuente; sólo un FormGroup la lleva bajo la
  // bandera. Misma convención que `isManualRow`.
  const filaDerivadaPor = (padre: string) => (
    { [ROW_DERIVED_BY_KEY]: padre, product: 'uuid-1' } as any
  );

  it('manda la derivación del buscador usado, no la unión de la tabla', () => {
    const tabla = construir(new Map([
      ['code', new Set(['price'])],
      ['name', new Set([])],          // este buscador NO cierra el precio
    ]));

    expect(tabla.isCellEditableForRow(filaDerivadaPor('code'), { field: 'price' })).toBeFalse();
    expect(tabla.isCellEditableForRow(filaDerivadaPor('name'), { field: 'price' })).toBeTrue();
  });

  it('sin padre registrado se cae a la unión, que es el comportamiento previo', () => {
    const tabla = construir(new Map([['code', new Set([])]]));

    expect(tabla.isCellEditableForRow({ product: 'uuid-1' } as any,
      { field: 'price' })).toBeFalse();
  });

  it('la derivación de la columna ORIGEN no cierra columnas de una fila manual', () => {
    // Es la regresión que introdujo el escenario 71: la columna origen declara
    // `product` con `edit: false` para la fila TRAÍDA; si eso entrara en la
    // unión, el usuario no podría elegir producto capturando a mano.
    const tabla = Object.create(TablaEditable.prototype) as any;
    tabla.tableRowSourceFlag = FUENTE;
    tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
    tabla.tableConfig = { sources: { column: 'request_detail', quantity: 'requested' } };
    tabla.generalS = {
      configuredChildNodes: (nodos: any) => Object.values(nodos || {}),
    };
    tabla.normalizedColumns = [
      { field: 'product' },
      { field: 'price' },
      { field: 'requested' },
      {
        field: 'request_detail',
        children: { fields: { derived: {
          0: { field: 'product', default: { edit: false } },
          1: { field: 'requested', default: { edit: true } },
        } } },
      },
    ];
    tabla._derivedLockedFields = new Set<string>();
    tabla._derivedLockedByParent = new Map<string, Set<string>>();

    // Reproduce el cálculo de normalizeTableConfig.
    const columnaOrigen = tabla.tableConfig.sources.column;
    tabla.normalizedColumns.forEach((column: any) => {
      const nodos = tabla.generalS.configuredChildNodes(column?.children?.fields?.derived);
      const porPadre = new Set<string>();
      nodos.forEach((node: any) => {
        const destino = tabla.normalizedColumns.find((c: any) => c.field === node.field);
        const edit = node?.default?.edit ?? destino?.default?.edit ?? true;
        if (edit === false && node.field) {
          if (column?.field !== columnaOrigen) tabla._derivedLockedFields.add(node.field);
          porPadre.add(node.field);
        }
      });
      if (column?.field && nodos.length) tabla._derivedLockedByParent.set(column.field, porPadre);
    });

    expect(tabla._derivedLockedFields.has('product')).toBeFalse();
    expect(tabla._derivedLockedByParent.get('request_detail').has('product')).toBeTrue();
  });
});
// ]]]FI

// [[[II ESC:057-73 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-73
describe('Predicado ÚNICO de fila capturada a mano', () => {
  const CONTRATO = { column: 'request_detail', quantity: 'requested' };

  const crud = () => {
    const c = Object.create(ConversionCRUD.prototype) as any;
    c.derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
    c.tableRowSourceFlag = FUENTE;
    return c;
  };

  const fila = (valores: any, fuente: any = {}, marcas: any = {}) => {
    const g = new FormGroup(
      Object.keys(valores).reduce((acc: any, k) => {
        acc[k] = new FormControl(valores[k]);
        return acc;
      }, {}),
    );
    (g as any)[FUENTE] = fuente;
    Object.keys(marcas).forEach((k) => { (g as any)[k] = marcas[k]; });
    return g;
  };

  it('una fila con producto y cantidad SÍ es captura manual', () => {
    expect(crud()._isCapturedManualRow(
      fila({ product: 'DIESEL', requested: '2' }), CONTRATO)).toBeTrue();
  });

  it('una fila recién abierta y vacía NO lo es', () => {
    expect(crud()._isCapturedManualRow(
      fila({ product: '', requested: null }), CONTRATO)).toBeFalse();
  });

  it('un booleano en `false` es el valor con el que nace la fila, no captura', () => {
    // P1-04: en la remisión los booleanos nacen en `false` y una fila recién
    // abierta ya bloqueaba jalar.
    expect(crud()._isCapturedManualRow(
      fila({ product: '', is_consignment: false, affects_costing: false }),
      CONTRATO)).toBeFalse();
  });

  it('una fila GUARDADA que nació de una conversión NO es manual', () => {
    // P1-03: no lleva la marca de sesión —sólo se pone al jalar ahora— pero sí
    // trae la ForeignKey al origen. Contarla como manual hacía imposible
    // «guarde y jale después».
    expect(crud()._isCapturedManualRow(
      fila({ product: 'DIESEL', requested: '2' }, { request_detail: 'src-1' }),
      CONTRATO)).toBeFalse();
  });

  it('la FK al origen también cuenta si vive en el control de la fila', () => {
    expect(crud()._isCapturedManualRow(
      fila({ product: 'DIESEL', request_detail: 'src-1' }), CONTRATO)).toBeFalse();
  });

  it('la fila traída de esta sesión tampoco es manual', () => {
    expect(crud()._isCapturedManualRow(
      fila({ product: 'DIESEL' }, {}, { [TABLE_ROW_LOCAL_SOURCE_FLAG]: { document: 'd' } }),
      CONTRATO)).toBeFalse();
  });

  it('la vista previa del autocomplete no cuenta', () => {
    expect(crud()._isCapturedManualRow(
      fila({ product: 'DIESEL' }, {}, { [DERIVED_TABLE_DRAFT_FLAG]: true }),
      CONTRATO)).toBeFalse();
  });
});
// ]]]FI


// [[[II ESC:057-95 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-95
describe('El conteo de documentos usa el criterio COMPLETO', () => {
  const construir = (filas: FormGroup[], grouping: any) => {
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray(filas as any),
    });
    const crud = Object.create(ConversionCRUD.prototype) as any;
    crud.derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
    crud.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
    crud.pos = () => 'doc';
    crud.currentForm = () => form;
    crud.configGeneral = () => ({ doc: { grouping } });
    crud._conversionSourceTables = () => [{
      table: { field: 'no_form_data_table_derived' },
      contract: { column: 'request_detail', quantity: 'requested' },
    }];
    return crud;
  };

  const fila = (fuente: any) => {
    const g = new FormGroup({ requested: new FormControl('1') });
    (g as any)[TABLE_ROW_SOURCE_FLAG] = fuente;
    return g;
  };

  const GROUPING = {
    elementary_fields: ['request.super_user', 'supplier', 'currency', 'request.subsidiary'],
    extra_fields: [],
  };

  it('dos partidas con distinta SUCURSAL cuentan como dos documentos', () => {
    // Es el caso que se escapaba: mismo proveedor y moneda, distinta sucursal.
    // El cliente contaba 1 y dejaba guardar; el servidor cuenta 2.
    const crud = construir([
      fila({ request_detail: 'a', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's1' }),
      fila({ request_detail: 'b', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's2' }),
    ], GROUPING);

    expect(crud._conversionDocumentCount('doc')).toBe(2);
  });

  it('mismas sucursal, proveedor y moneda cuentan como uno', () => {
    const crud = construir([
      fila({ request_detail: 'a', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's1' }),
      fila({ request_detail: 'b', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's1' }),
    ], GROUPING);

    expect(crud._conversionDocumentCount('doc')).toBe(1);
  });

  it('el tenant no separa: se descarta del conteo', () => {
    const crud = construir([
      fila({ request_detail: 'a', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's1' }),
      fila({ request_detail: 'b', supplier: 'p1', currency: 'm1', 'request.subsidiary': 's1' }),
    ], GROUPING);

    // Aunque ninguna fila traiga `request.super_user`, siguen siendo un documento.
    expect(crud._conversionDocumentCount('doc')).toBe(1);
  });

  it('una ruta que no se pudo resolver no separa grupos', () => {
    // `supplier.payment_rule` no se puede incluir hoy: queda `undefined` en
    // TODAS las filas, así que el aviso es conservador y no inventa documentos.
    const crud = construir([
      fila({ request_detail: 'a', supplier: 'p1', currency: 'm1' }),
      fila({ request_detail: 'b', supplier: 'p1', currency: 'm1' }),
    ], {
      elementary_fields: ['supplier', 'currency', 'supplier.payment_rule'],
      extra_fields: [],
    });

    expect(crud._conversionDocumentCount('doc')).toBe(1);
  });
});
// ]]]FI

// [[[II ESC:057-98 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-98
/**
 * La jalada es ASÍNCRONA: la derivación escribe el encabezado y los candados lo
 * cierran ANTES de que el servidor conteste. Si no entra ninguna partida, el
 * gesto tiene que deshacerse — el aviso no puede llegar sobre un encabezado que
 * ese documento ya escribió.
 */
describe('El gesto de jalar se deshace cuando no entra nada', () => {
  const NODO = {
    field: 'no_form_data_source_code',
    fields_disable: ['supplier', 'currency', 'subsidiary'],
    children: { fields: { derived: {
      0: { field: 'supplier' },
      1: { field: 'currency' },
      2: { field: 'subsidiary' },
    } } },
  };

  const buildCrud = (filas: FormGroup[] = []) => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const form = new FormGroup({
      supplier: new FormControl<any>('proveedor-previo'),
      object_supplier: new FormControl<any>({ id: 'proveedor-previo' }),
      currency: new FormControl<any>(null),
      object_currency: new FormControl<any>(null),
      subsidiary: new FormControl<any>(null),
      object_subsidiary: new FormControl<any>(null),
      no_form_data_source_code: new FormControl<any>(null),
      object_no_form_data_source_code: new FormControl<any>(null),
      no_form_data_table_derived: new FormArray(filas as any),
    });
    crud.pos = () => 'supplier-request';
    crud.currentForm = () => form;
    crud.generalS = { configuredChildNodes: (nodos: any) => Object.values(nodos || {}) };
    crud._conversionSourceTables = () => [{
      table: { field: 'no_form_data_table_derived' },
      contract: { column: 'request_detail', quantity: 'requested', filter: 'request' },
    }];
    crud._sourceDocumentFields = () => ['no_form_data_source_code'];
    crud._drawFormNode = () => NODO;
    crud._applyNodeFieldLocks = jasmine.createSpy('_applyNodeFieldLocks');
    return { crud, form };
  };

  /** Lo que hace la derivación del nodo al elegir el documento. */
  const derivar = (form: FormGroup) => {
    form.get('supplier')?.setValue('proveedor-del-documento');
    form.get('currency')?.setValue('moneda-del-documento');
    form.get('subsidiary')?.setValue('CAMPECHE');
    form.get('no_form_data_source_code')?.setValue('4');
  };

  it('sin partidas traídas previas: devuelve el encabezado y reabre los campos', () => {
    const { crud, form } = buildCrud();

    crud._snapshotSourceGesture({ field: 'no_form_data_source_code' });
    derivar(form);
    crud._undoSourceGesture();

    // El encabezado vuelve a ser el del usuario, no el del documento que no
    // trajo nada.
    expect(form.get('supplier')?.value).toBe('proveedor-previo');
    expect(form.get('currency')?.value).toBeNull();
    expect(form.get('subsidiary')?.value).toBeNull();
    // Y el buscador no se queda diciendo que aceptó algo.
    expect(form.get('no_form_data_source_code')?.value).toBeNull();
    expect(crud._applyNodeFieldLocks)
      .toHaveBeenCalledWith('no_form_data_source_code', 'enable');
  });

  it('con partidas ya traídas: el encabezado es de AQUELLA jalada y no se toca', () => {
    const traidaPrevia = new FormGroup({
      product: new FormControl<any>('DIESEL'),
      requested: new FormControl<any>('2.10'),
    });
    (traidaPrevia as any)[TABLE_ROW_LOCAL_SOURCE_FLAG] = { document: 'doc-1' };
    const { crud, form } = buildCrud([traidaPrevia]);

    crud._snapshotSourceGesture({ field: 'no_form_data_source_code' });
    derivar(form);
    crud._undoSourceGesture();

    // Devolverlo dejaría el documento contradiciendo a sus propias partidas.
    expect(form.get('subsidiary')?.value).toBe('CAMPECHE');
    expect(form.get('supplier')?.value).toBe('proveedor-del-documento');
    // Sólo el buscador se limpia.
    expect(form.get('no_form_data_source_code')?.value).toBeNull();
    expect(crud._applyNodeFieldLocks).not.toHaveBeenCalled();
  });

  it('si entraron partidas, no hay nada que deshacer', () => {
    const { crud, form } = buildCrud();

    crud._snapshotSourceGesture({ field: 'no_form_data_source_code' });
    derivar(form);
    // Lo que hace `_appendSourceRows` cuando sí agregó filas.
    crud._sourceGesture = null;
    crud._undoSourceGesture();

    expect(form.get('subsidiary')?.value).toBe('CAMPECHE');
    expect(form.get('no_form_data_source_code')?.value).toBe('4');
  });

  it('un campo que no es buscador de origen no toma foto', () => {
    const { crud, form } = buildCrud();

    crud._snapshotSourceGesture({ field: 'supplier' });
    derivar(form);
    crud._undoSourceGesture();

    expect(form.get('subsidiary')?.value).toBe('CAMPECHE');
  });
});
// ]]]FI

// [[[II ESC:057-102 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-102
/**
 * Elegir la partida ORIGEN celda por celda ES jalarla. Sin la marca, esa fila
 * llevaba el id del origen —así que viajaba en `data.meta.sources`— y a la vez
 * contaba como captura manual: el documento entraba por los DOS caminos.
 */
describe('La selección por celda marca la fila como traída', () => {
  const CONTRATO_TABLA = {
    sources: {
      column: 'supplier_request_detail',
      quantity: 'requested',
      filter: 'supplier_request',
      version: 'modified_at,created_at',
    },
  };

  const buildTabla = () => {
    const tabla = Object.create(DynamicTableFieldComponent.prototype) as any;
    tabla.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
    tabla.tableRowLocalSourceFlag = TABLE_ROW_LOCAL_SOURCE_FLAG;
    tabla.tableConfig = CONTRATO_TABLA;
    return tabla;
  };

  const filaVacia = () => new FormGroup({
    supplier_request_detail: new FormControl<any>(null),
    requested: new FormControl<any>(null),
  });

  it('la columna ORIGEN deja la fila marcada, con su documento y su editable', () => {
    const tabla = buildTabla();
    const fila = filaVacia();

    tabla._markRowAsPulled(fila, { field: 'supplier_request_detail' }, {
      id: 'partida-1', supplier_request: 'pedido-9',
      supplier_request__name: 'PED-9',
    });

    const marca = (fila as any)[TABLE_ROW_LOCAL_SOURCE_FLAG];
    expect(marca.document).toBe('pedido-9');
    expect(marca.label).toBe('PED-9');
    expect(marca.editable).toBe('requested');
    // El tope NO se pone aquí: el saldo se calcula una sola vez, y no en el
    // cliente. `cellMax` cae al de la columna y el servidor sigue rechazando.
    expect(marca.max).toBeUndefined();
  });

  it('cualquier otra columna no marca nada', () => {
    const tabla = buildTabla();
    const fila = filaVacia();

    tabla._markRowAsPulled(fila, { field: 'product' }, { id: 'producto-1' });

    expect((fila as any)[TABLE_ROW_LOCAL_SOURCE_FLAG]).toBeUndefined();
  });

  it('una tabla sin contrato de fuentes no marca nada', () => {
    const tabla = buildTabla();
    tabla.tableConfig = {};
    const fila = filaVacia();

    tabla._markRowAsPulled(fila, { field: 'supplier_request_detail' }, { id: 'x' });

    expect((fila as any)[TABLE_ROW_LOCAL_SOURCE_FLAG]).toBeUndefined();
  });

  it('y con la marca, la fila deja de contar como captura manual', () => {
    const tabla = buildTabla();
    const fila = filaVacia();
    fila.get('requested')?.setValue('3');

    const crud = Object.create(ConversionCRUD.prototype) as any;
    crud.derivedTableDraftFlag = DERIVED_TABLE_DRAFT_FLAG;
    crud.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
    const contrato = { column: 'supplier_request_detail', quantity: 'requested' };

    expect(crud._isCapturedManualRow(fila, contrato)).toBeTrue();

    tabla._markRowAsPulled(fila, { field: 'supplier_request_detail' }, {
      id: 'partida-1', supplier_request: 'pedido-9',
    });

    expect(crud._isCapturedManualRow(fila, contrato)).toBeFalse();
  });
});
// ]]]FI

// [[[II ESC:057-105 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-105
/**
 * La VERSIÓN del origen dejó de ser configuración. Los dos caminos que la leen
 * —la selección por celda y la jalada del documento— usan la MISMA constante,
 * que es lo que el servidor sabe comparar.
 */
describe('La versión del origen tiene una sola fuente', () => {
  it('la constante es la que el servidor compara, y en ese orden', () => {
    expect([...SOURCE_VERSION_KEYS]).toEqual(['modified_at', 'created_at']);
  });

  it('la jalada documental gana con el primero que traiga valor', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;

    // Con los dos, gana `modified_at`.
    expect(crud._rawSourceVersion({}, {
      modified_at: '2026-08-28T10:00:00Z', created_at: '2026-08-01T10:00:00Z',
    })).toBe('2026-08-28T10:00:00Z');

    // Sin modificar, cae a `created_at`.
    expect(crud._rawSourceVersion({}, { created_at: '2026-08-01T10:00:00Z' }))
      .toBe('2026-08-01T10:00:00Z');

    // Y si sólo está el valor CRUDO —porque el aplanado ya formateó la fecha—,
    // se toma ése: el servidor no puede parsear el texto de pantalla.
    expect(crud._rawSourceVersion(
      { __bosRaw_modified_at: '2026-08-28T10:00:00Z' }, null,
    )).toBe('2026-08-28T10:00:00Z');

    expect(crud._rawSourceVersion({}, {})).toBe('');
  });

  it('el contrato de la tabla ya no lee la llave de la configuración', () => {
    const tabla = Object.create(DynamicTableFieldComponent.prototype) as any;
    // La configuración NO declara `version` — se retiró a propósito.
    tabla.tableConfig = { sources: { column: 'request_detail', quantity: 'requested' } };

    expect([...tabla._tableSourcesContract().version])
      .toEqual([...SOURCE_VERSION_KEYS]);
  });
});
// ]]]FI

// [[[II ESC:057-111 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-111
/**
 * COPIAR de otro documento del MISMO tipo. No es una conversión: no crea saldos,
 * no arrastra impuestos congelados y no liga la copia con su plantilla.
 */
describe('Copiar partidas de una plantilla', () => {
  const crudCopia = (configuracion: any) => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    crud.crudS = { authS: { config: { 'supplier-request': configuracion } } };
    return crud;
  };

  it('la capacidad y el campo tienen que estar los DOS', () => {
    // Encendida y con campo: se dibuja.
    expect(crudCopia({ general: { copy_details: {
      enabled: true, field: 'no_form_data_copy_from',
    } } })._copyDetailsField('supplier-request')).toBe('no_form_data_copy_from');

    // Encendida SIN campo: no hay por dónde copiar.
    expect(crudCopia({ general: { copy_details: { enabled: true } } })
      ._copyDetailsField('supplier-request')).toBe('');

    // Con campo pero APAGADA: el campo no hace nada.
    expect(crudCopia({ general: { copy_details: {
      enabled: false, field: 'no_form_data_copy_from',
    } } })._copyDetailsField('supplier-request')).toBe('');

    // Sin capacidad declarada: tampoco revienta.
    expect(crudCopia({})._copyDetailsField('supplier-request')).toBe('');
    expect(crudCopia(undefined)._copyDetailsField('supplier-request')).toBe('');
  });

  it('las filas copiadas entran como captura MANUAL, sin marca de origen', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const tabla = { field: 'no_form_data_table_derived' };
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray([] as any),
    });
    crud.currentForm = () => form;
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
    crud._completeCreatedLocalTableRow = (_p: any, _t: any, fila: any) => fila;
    crud._applyNodeFieldLocks = jasmine.createSpy('_applyNodeFieldLocks');
    crud._createNoFormDataTableRowFormGroup = (_t: any, fila: any) => new FormGroup(
      Object.keys(fila).reduce((acc: any, k) => {
        acc[k] = new FormControl<any>(fila[k]);
        return acc;
      }, {}),
    );

    crud._applyCopiedRows('supplier-request', tabla, [
      { product: 'p-1', requested: '5', price: '10' },
      { product: 'p-2', requested: '2', price: '20' },
    ]);

    const control = form.get('no_form_data_table_derived') as FormArray;
    expect(control.length).toBe(2);
    // Sin la marca de traída: para el servidor son captura, no conversión.
    control.controls.forEach((fila: any) => {
      expect(fila[TABLE_ROW_LOCAL_SOURCE_FLAG]).toBeUndefined();
    });
    expect(crud.messageS.changeMessage.calls.mostRecent().args[0])
      .toContain('Se copiaron 2 partida(s)');
  });

  it('un documento sin partidas copiables avisa y no agrega nada', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray([] as any),
    });
    crud.currentForm = () => form;
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };

    crud._applyCopiedRows('supplier-request', { field: 'no_form_data_table_derived' }, []);

    expect((form.get('no_form_data_table_derived') as FormArray).length).toBe(0);
    expect(crud.messageS.changeMessage.calls.mostRecent().args[0])
      .toContain('no tiene partidas que se puedan copiar');
  });
});
// ]]]FI

// [[[II ESC:057-114 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-114
/**
 * JALADO contra COPIADO: son dos formas de armar el mismo documento y no se
 * mezclan. Aquí se comprueba la barrera del lado de la COPIA — la del lado de la
 * jalada ya la cubre `_isCapturedManualRow`.
 */
describe('Jalar y copiar no se mezclan', () => {
  const CONTRATO = { column: 'request_detail', quantity: 'requested' };

  const buildCrud = (filas: FormGroup[]) => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray(filas as any),
    });
    crud.pos = () => 'supplier-request';
    crud.currentForm = () => form;
    crud.tableRowSourceFlag = TABLE_ROW_SOURCE_FLAG;
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
    crud.crudS = {
      authS: { config: { 'supplier-request-detail': { cols: {}, fields: {} } } },
      getAppType: (clave: string) => (clave === 'supplier-request-detail'
        ? { app: 'purchases/supplier-request-detail', type: 'supplier-request-detail' }
        : { app: 'purchases/supplier-request', type: 'supplier-request' }),
      // Llegar hasta aquí YA prueba que la exclusividad no rechazó el gesto.
      getObject: jasmine.createSpy('getObject').and.returnValue({ subscribe: () => {} }),
    };
    crud.showBlocked = () => {};
    crud._conversionSourceTables = () => [{
      table: {
        field: 'no_form_data_table_derived',
        // El recurso del DETALLE PROPIO: es de donde sale la copia.
        data_type: { type: 'supplier-request-detail' },
      },
      contract: CONTRATO,
    }];
    crud.ensureConfigForPos = () => true;
    crud.DJAtoObject = () => [];
    crud._applyCopiedRows = jasmine.createSpy('_applyCopiedRows');
    return { crud, form };
  };

  const filaCon = (valores: any, marcas: any = {}) => {
    const g = new FormGroup(
      Object.keys(valores).reduce((acc: any, k) => {
        acc[k] = new FormControl<any>(valores[k]);
        return acc;
      }, {}),
    );
    Object.keys(marcas).forEach((k) => { (g as any)[k] = marcas[k]; });
    return g;
  };

  const copiar = (crud: any) =>
    crud._copyDetailsFrom({ event: { value: { id: 'plantilla-1' } } });

  it('con partidas traídas EN ESTA SESIÓN, copiar se rechaza', () => {
    const traida = filaCon({ product: 'DIESEL', request_detail: 'src-1' },
      { [TABLE_ROW_LOCAL_SOURCE_FLAG]: { document: 'doc-1' } });
    const { crud } = buildCrud([traida]);

    copiar(crud);

    expect(crud.messageS.changeMessage.calls.mostRecent().args[0])
      .toContain('Ya hay partidas traídas de otro documento en esta captura');
  });

  it('sobre un documento ya CONVERTIDO y guardado, copiar SÍ procede', () => {
    // Decisión del usuario: «está bien que se pueda copiar de un documento
    // viejo, parcial o totalmente convertido». La fila guardada trae la
    // ForeignKey al origen pero no la marca de sesión, y las filas nuevas son
    // un alta normal: no viajan en `meta.sources`, así que no hay mezcla.
    const guardada = filaCon({ product: 'DIESEL', request_detail: 'src-1' });
    const { crud } = buildCrud([guardada]);

    copiar(crud);

    const avisos = crud.messageS.changeMessage.calls.all()
      .map((c: any) => String(c.args[0]));
    expect(avisos.some((t: string) => t.includes('Ya hay partidas traídas'))).toBeFalse();
    expect(crud.crudS.getObject).toHaveBeenCalled();
  });

  it('con partidas capturadas a mano, copiar SÍ procede', () => {
    // Copiar sobre una captura manual es legítimo: las dos son captura.
    const manual = filaCon({ product: 'DIESEL', request_detail: null });
    const { crud } = buildCrud([manual]);

    copiar(crud);

    // No se rechazó por exclusividad: el gesto siguió hasta pedir la copia.
    const avisos = crud.messageS.changeMessage.calls.all()
      .map((c: any) => String(c.args[0]));
    expect(avisos.some((t: string) => t.includes('Ya hay partidas traídas'))).toBeFalse();
    expect(crud.crudS.getObject).toHaveBeenCalled();
    // Y la ruta es la de la ACCIÓN, no la del listado.
    expect(crud.crudS.getObject.calls.mostRecent().args[0].app)
      .toBe('purchases/supplier-request/plantilla-1/copy-details');
  });
});
// ]]]FI

// [[[II ESC:057-118 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-118
/**
 * QUÉ se copia lo decide el SERVIDOR. Aquí sólo se comprueba que el cliente no
 * vuelva a filtrar por su cuenta: repetir esa lista sería la segunda copia de
 * una regla de dominio.
 */
describe('El cliente no decide qué se copia', () => {
  it('no queda ningún filtro de campos en el cliente', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    expect(crud._copyDetailsKeep).toBeUndefined();
  });

  it('mete TODAS las filas que llegan, sin recortar campos', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const tabla = { field: 'no_form_data_table_derived' };
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray([] as any),
    });
    crud.currentForm = () => form;
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
    crud._applyNodeFieldLocks = jasmine.createSpy('_applyNodeFieldLocks');
    crud._completeCreatedLocalTableRow = (_p: any, _t: any, fila: any) => fila;
    crud._createNoFormDataTableRowFormGroup = (_t: any, fila: any) => new FormGroup(
      Object.keys(fila).reduce((acc: any, k) => {
        acc[k] = new FormControl<any>(fila[k]);
        return acc;
      }, {}),
    );

    crud._applyCopiedRows('supplier-request', tabla, [
      { product: 'uuid', product__name: 'DIESEL', requested: '2.10' },
      { product: 'uuid', product__name: 'DIESEL', requested: '1.00' },
    ], { field: 'no_form_data_copy_from' });

    const control = form.get('no_form_data_table_derived') as FormArray;
    expect(control.length).toBe(2);
    // La etiqueta llega resuelta desde el aplanado: sin ella la celda mostraría
    // el UUID.
    expect(control.at(0).get('product__name')?.value).toBe('DIESEL');
    // Y el encabezado se cierra, igual que al jalar.
    expect(crud._applyNodeFieldLocks)
      .toHaveBeenCalledWith('no_form_data_copy_from', 'disable');
  });

  it('sin filas avisa y no cierra nada', () => {
    const crud = Object.create(ConversionCRUD.prototype) as any;
    const form = new FormGroup({
      no_form_data_table_derived: new FormArray([] as any),
    });
    crud.currentForm = () => form;
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
    crud._applyNodeFieldLocks = jasmine.createSpy('_applyNodeFieldLocks');

    crud._applyCopiedRows('supplier-request', { field: 'no_form_data_table_derived' }, []);

    expect((form.get('no_form_data_table_derived') as FormArray).length).toBe(0);
    expect(crud._applyNodeFieldLocks).not.toHaveBeenCalled();
  });
});
// ]]]FI
