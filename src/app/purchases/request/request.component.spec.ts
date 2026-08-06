import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';

import { RequestComponent } from './request.component';

describe('RequestComponent', () => {
  let component: RequestComponent;
  let fixture: ComponentFixture<RequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .compileComponents();

    fixture = TestBed.createComponent(RequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // [[[II ESC:030-20 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-20
  it('preserves a shared product relationship while one sibling autocomplete owns the selection', () => {
    const codeConfig = {
      field: 'code',
      type: 'auto-complete',
      free_or_relationship: true,
      relationship_field: 'product',
      option_label: 'base_product_data_code',
    };
    const nameConfig = {
      field: 'name',
      type: 'auto-complete',
      free_or_relationship: true,
      relationship_field: 'product',
      option_label: 'base_product_data_name',
    };
    const selectedProduct = {
      id: 'product-id',
      base_product_data_code: '6',
      base_product_data_name: 'DIESEL',
    };
    const form = new FormGroup({
      code: new FormControl('6'),
      name: new FormControl('DIESEL'),
      product: new FormControl<any>(null),
      __autocomplete_object_code: new FormControl<any>(selectedProduct),
      __autocomplete_object_name: new FormControl<any>(null),
    });
    component.form.set({ 'request-detail': form } as any);
    component.drawForm.set({
      'request-detail': {
        general: {
          grid: {
            0: codeConfig,
            1: nameConfig,
          },
        },
      },
    });

    (component as any)._syncAutoCompleteRelationshipControls('request-detail');
    expect(form.get('product')?.value).toBe('product-id');

    form.get('__autocomplete_object_code')?.setValue(null);
    (component as any)._syncAutoCompleteRelationshipControls('request-detail');
    expect(form.get('product')?.value).toBeNull();
  });
  // ]]]FI

  // [[[II ESC:034-01 DOC:docs/documents/2026-07-31-034-tabla-derivada-padre-hijo.md#escenario-01
  // El papel se declara en `fields_prefixes`, el mismo contrato que ya usan las
  // relaciones hijas con archivos. El servidor sólo declara `kind`, `data_type`
  // y `filter`; aquí se comprueba que el motor lo interpreta sin nombrar ningún
  // recurso por dentro.
  describe('tabla derivada padre-hijo', () => {
    const POS = 'request-detail';

    /** Declaración tal como la publica el servidor en `fields_prefixes`. */
    const asChild = () => [{
      request_data_: { data_type: 'request', kind: 'parent', filter: 'request' },
    }];
    const asParent = (dataType = 'request-detail') => [{
      request_detail_data_: { data_type: dataType, kind: 'child', filter: 'request' },
    }];

    const setUp = (fieldsPrefixes: any, rows: FormGroup[] = []) => {
      const table: any = {
        field: 'no_form_data_table_derived',
        type: 'table',
        hide: false,
        data_type: { type: 'request-detail' },
        response_include: 'currency',
        columns: { 0: { field: 'name' } },
      };
      const form = new FormGroup({
        name: new FormControl('linea'),
        request_data_folio: new FormControl('F-1'),
        request_data_description: new FormControl('x'),
        no_form_data_table_derived: new FormArray<FormGroup>(rows),
      });
      (component as any).pos.set(POS);
      component.form.set({ [POS]: form } as any);
      component.drawForm.set({
        [POS]: { fields_prefixes: fieldsPrefixes, general: { grid: { 0: table } } },
      } as any);
      return { table, form };
    };

    it('rol hijo: al EDITAR oculta la tabla y bloquea los campos del padre', () => {
      const { table, form } = setUp(asChild());
      component.isCreate.set(false);

      (component as any)._applyParentChildTables(POS, { id: 'detail-1' });

      expect(table.hide).toBeTrue();
      expect(form.get('request_data_folio')?.disabled).toBeTrue();
      expect(form.get('request_data_description')?.disabled).toBeTrue();
      // El campo propio del hijo sigue editable: es lo que el usuario vino a cambiar.
      expect(form.get('name')?.enabled).toBeTrue();
    });

    it('rol hijo: tras una edición, al CREAR la tabla vuelve a su estado configurado', () => {
      // Secuencia real: el nodo del draw es el mismo objeto entre aperturas, así
      // que ocultarlo al editar no puede dejarlo oculto para el alta siguiente.
      const { table, form } = setUp(asChild());

      component.isCreate.set(false);
      (component as any)._applyParentChildTables(POS, { id: 'detail-1' });
      expect(table.hide).toBeTrue();

      // enableForm() corre antes que el contrato en el flujo real.
      form.enable();
      component.isCreate.set(true);
      (component as any)._applyParentChildTables(POS, null);

      expect(table.hide).toBeFalse();
      expect(form.get('request_data_folio')?.enabled).toBeTrue();
    });

    it('rol padre: al EDITAR carga los hijos del padre filtrando por su ForeignKey', () => {
      const { table, form } = setUp(asParent());
      component.isCreate.set(false);

      (component as any)._applyParentChildTables(POS, { id: 'request-1' });

      const http = TestBed.inject(HttpTestingController);
      const pedido = http.expectOne((r) => r.url.includes('purchases/request-detail'));
      expect(pedido.request.urlWithParams).toContain('filter[request]=request-1');
      pedido.flush({ data: [{ id: 'd-1', type: 'request-detail', attributes: { name: 'uno' } }] });

      const filas = form.get('no_form_data_table_derived') as FormArray;
      expect(filas.length).toBe(1);
      expect(filas.at(0).get('name')?.value).toBe('uno');
      // La tabla del padre NO se oculta y su formulario no se bloquea.
      expect(table.hide).toBeFalse();
      expect(form.get('request_data_folio')?.enabled).toBeTrue();
      http.verify();
    });

    // [[[II ESC:034-02 DOC:docs/documents/2026-07-31-034-tabla-derivada-padre-hijo.md#escenario-02
    it('rol padre: el alta se apaga al CREAR y se restituye al EDITAR', () => {
      const { table } = setUp(asParent());
      table.add_row = true;

      component.isCreate.set(true);
      (component as any)._applyParentChildTables(POS, null);
      // Sin padre guardado no hay FK a la que colgar la partida.
      expect(table.add_row).toBeFalse();

      component.isCreate.set(false);
      (component as any)._applyParentChildTables(POS, { id: 'request-1' });
      expect(table.add_row).toBeTrue();
    });

    it('rol padre: el guardado de fila inyecta la ForeignKey al padre', () => {
      const { table } = setUp(asParent());
      table.add_row = true;
      component.isCreate.set(false);
      component.selected.set([{ id: 'request-1' } as any]);

      const saveSpy = spyOn(component, 'save');
      component.handleTableRowSave({
        field: 'no_form_data_table_derived',
        row_index: 0,
        row_data: { name: 'linea' },
        source_row: {},
        columns: [{ field: 'name' }],
        mode: 'create',
      });

      expect(saveSpy).toHaveBeenCalled();
      // El motor construye el form transitorio dentro de save(); aquí se verifica
      // que la delegación viaja con el contexto correcto.
      const args: any = saveSpy.calls.mostRecent().args[0];
      expect(args.table_row.base_pos).toBe(POS);
      expect(args.table_row.mode).toBe('create');
    });

    it('rol padre sin padre guardado: no intenta guardar la fila', () => {
      setUp(asParent());
      component.selected.set([]);

      (component as any)._saveTableRowTransient({
        table_row: {
          base_pos: POS,
          field: 'no_form_data_table_derived',
          row_index: 0,
          row_data: {},
          source_row: {},
          columns: [{ field: 'name' }],
          mode: 'create',
        },
      });

      // La fila se marca como NO guardada en vez de mandar un POST sin relación.
      expect(component.tableRowSaveOutcome()?.ok).toBeFalse();
      TestBed.inject(HttpTestingController).verify();
    });
    // ]]]FI

    it('un contrato sin resolver se ignora en vez de aplicar un rol inventado', () => {
      // Sin declaración de papel, la tabla se comporta como cualquier otra.
      const { table, form } = setUp([]);
      component.isCreate.set(false);

      (component as any)._applyParentChildTables(POS, { id: 'detail-1' });

      expect(table.hide).toBeFalse();
      expect(form.get('request_data_folio')?.enabled).toBeTrue();
      TestBed.inject(HttpTestingController).verify();
    });
  });
  // ]]]FI

  // [[[II ESC:036-03 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-03
  // La conversión es el POST del documento destino con `data.meta.sources`. Aquí
  // se comprueba que el motor arma ese bloque desde las filas de la tabla sin
  // nombrar ningún recurso por dentro, y que sin filas origen no cambia nada.
  describe('conversión por data.meta.sources', () => {
    const POS = 'delivery-note';
    const SOURCE_FLAG = '__bosTableRowSource';

    /** Tabla derivada con contrato `sources`, tal como la publica el servidor. */
    const setUp = (rows: FormGroup[] = [], sources: any = {
      column: 'supplier_request_detail',
      quantity: 'requested',
      version: 'modified_at,created_at',
    }) => {
      const table: any = {
        field: 'no_form_data_table_derived',
        type: 'table',
        hide: false,
        add_row: true,
        data_type: { type: 'delivery-note-detail' },
        sources,
        columns: {
          0: {
            field: 'supplier_request_detail',
            type: 'auto-complete',
            data_type: { type: 'supplier-request-detail' },
          },
          1: { field: 'requested' },
          2: { field: 'price' },
        },
      };
      const form = new FormGroup({
        no_form_data_table_derived: new FormArray<FormGroup>(rows),
      });
      (component as any).pos.set(POS);
      component.form.set({ [POS]: form } as any);
      component.drawForm.set({
        [POS]: {
          fields_prefixes: [{
            delivery_note_detail_data_: {
              data_type: 'delivery-note-detail', kind: 'child', filter: 'delivery_note',
            },
          }],
          general: {
            grid: {
              // El buscador se reconoce por su `data_type`, no por declararse.
              0: {
                field: 'no_form_data_source_code',
                type: 'auto-complete',
                data_type: { type: 'supplier-request' },
              },
              1: table,
            },
          },
        },
      } as any);
      return { table, form };
    };

    /** Fila ya resuelta por el buscador de la celda origen. */
    const sourceRow = (id: string, quantity: string, version: string) => {
      const row = new FormGroup({
        supplier_request_detail: new FormControl('PEDIDO-1 / DIESEL'),
        requested: new FormControl(quantity),
        price: new FormControl('10'),
      });
      (row as any)[SOURCE_FLAG] = {
        supplier_request_detail: id,
        supplier_request_detail__source_version: version,
      };
      return row;
    };

    it('arma sources con id, tipo, versión y cantidad de cada fila', () => {
      setUp([
        sourceRow('src-1', '4', '2026-08-02T10:30:00Z'),
        sourceRow('src-2', '6.000000001', '2026-08-02T11:00:00Z'),
      ]);

      const { sources, manualRows } = (component as any)._collectConversionSources(POS);

      expect(manualRows).toBe(0);
      expect(sources.length).toBe(2);
      // El `type` sale del `data_type` de la columna origen, no de una llave nueva.
      expect(sources[0]).toEqual({
        type: 'supplier-request-detail',
        id: 'src-1',
        meta: { source_version: '2026-08-02T10:30:00Z', quantity: '4' },
      });
      // La cantidad viaja como TEXTO: el float de JavaScript perdería el noveno
      // decimal que el servidor sí admite.
      expect(sources[1].meta.quantity).toBe('6.000000001');
    });

    it('la llave de idempotencia se conserva entre reintentos y se renueva al reiniciar', () => {
      setUp([sourceRow('src-1', '4', '2026-08-02T10:30:00Z')]);

      const first = (component as any)._conversionMetaForCreate(POS).meta;
      const retry = (component as any)._conversionMetaForCreate(POS).meta;
      // Mismo intento = misma llave, o el reintento crearía un segundo documento.
      expect(retry.idempotency_key).toBe(first.idempotency_key);

      (component as any)._clearConversionIdempotencyKey(POS);
      const nueva = (component as any)._conversionMetaForCreate(POS).meta;
      expect(nueva.idempotency_key).not.toBe(first.idempotency_key);
    });

    it('corta el guardado si se mezclan filas de origen con filas manuales', () => {
      const manual = new FormGroup({
        supplier_request_detail: new FormControl(''),
        requested: new FormControl('2'),
        price: new FormControl('10'),
      });
      setUp([sourceRow('src-1', '4', '2026-08-02T10:30:00Z'), manual]);

      const resultado = (component as any)._conversionMetaForCreate(POS);

      // No se degrada a un POST normal: eso crearía el documento con la fila
      // manual y perdería la de origen sin avisar.
      expect(resultado.abort).toBeTrue();
      expect(resultado.meta).toBeNull();
    });

    it('sin filas origen no hay meta: el POST sigue siendo el CRUD de siempre', () => {
      const manual = new FormGroup({
        supplier_request_detail: new FormControl(''),
        requested: new FormControl('2'),
        price: new FormControl('10'),
      });
      setUp([manual]);

      const resultado = (component as any)._conversionMetaForCreate(POS);

      expect(resultado.meta).toBeNull();
      expect(resultado.abort).toBeFalse();
    });

    it('una tabla sin contrato sources nunca entra al flujo de conversión', () => {
      // `null` y no `undefined`: el default del parámetro repondría el contrato.
      setUp([sourceRow('src-1', '4', '2026-08-02T10:30:00Z')], null);

      const { sources } = (component as any)._collectConversionSources(POS);

      expect(sources.length).toBe(0);
      expect((component as any)._conversionMetaForCreate(POS).meta).toBeNull();
    });

    it('con sources el alta queda disponible al CREAR, sin padre guardado', () => {
      const { table } = setUp([]);

      component.isCreate.set(true);
      (component as any)._applyParentChildTables(POS, null);

      // Sin `sources` esto sería false: una partida normal necesita la FK al
      // padre. Las filas origen no se cuelgan de ninguna FK.
      expect(table.add_row).toBeTrue();
    });

    it('la fila origen no se persiste sola mientras se crea el documento', () => {
      setUp([]);
      component.isCreate.set(true);
      const saveSpy = spyOn(component, 'save');

      component.handleTableRowSave({
        field: 'no_form_data_table_derived',
        row_index: 0,
        row_data: { requested: '4' },
        source_row: { supplier_request_detail: 'src-1' },
        columns: [{ field: 'requested' }],
        mode: 'create',
      });

      // Un POST suelto del detalle crearía una partida sin asignación ni tope.
      expect(saveSpy).not.toHaveBeenCalled();
      // La fila se cierra en la tabla: queda local hasta el POST del documento.
      expect(component.tableRowSaveOutcome()?.ok).toBeTrue();
      TestBed.inject(HttpTestingController).verify();
    });

    // [[[II ESC:036-05 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-05
    it('la fila se guarda contra el formulario ABIERTO, no contra typeDefault', () => {
      setUp([]);
      component.isCreate.set(true);
      const saveSpy = spyOn(component, 'save');

      component.handleTableRowSave({
        field: 'no_form_data_table_derived',
        row_index: 0,
        row_data: { requested: '4' },
        source_row: {},
        columns: [{ field: 'requested' }],
        mode: 'create',
      });

      // `typeDefault` de este componente es 'request-detail'; el formulario
      // abierto es 'delivery-note'. Con typeDefault la partida se guardaba
      // contra el recurso equivocado.
      const args: any = saveSpy.calls.mostRecent().args[0];
      expect(args.pos).toBe(POS);
      expect(args.table_row.base_pos).toBe(POS);
    });
    // ]]]FI

    // [[[II ESC:036-06 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-06
    describe('jalar el documento origen completo', () => {
      const withDocument = (rows: FormGroup[] = []) => {
        // Contrato reducido: cinco llaves planas, sin `document` ni `match`.
        const built = setUp(rows, {
          column: 'supplier_request_detail',
          quantity: 'requested',
          version: 'modified_at,created_at',
          filter: 'supplier_request',
          pending: 'requested,delivered',
        });
        // `addControl` sobre un FormGroup tipado exige el literal declarado; el
        // motor trabaja con controles dinámicos, así que aquí se usa la forma no
        // tipada, igual que en tiempo de ejecución.
        const form = built.form as any;
        form.addControl('no_form_data_source_code', new FormControl('pedido-1'));
        form.addControl('supplier', new FormControl('prov-1'));
        form.addControl('currency', new FormControl(''));
        return { ...built, form };
      };

      it('trae las partidas del documento y las deja como filas ORIGEN', () => {
        const { form } = withDocument();

        (component as any).pullSourceDocument({ pos: POS });

        const http = TestBed.inject(HttpTestingController);
        const req = http.expectOne((r) => r.url.includes('purchases/supplier-request-detail'));
        expect(req.request.urlWithParams).toContain('filter[supplier_request]=pedido-1');
        req.flush({
          data: [
            { id: 'src-1', type: 'supplier-request-detail',
              attributes: { requested: 10, delivered: 4, modified_at: '2026-08-02T10:30:00Z' } },
            { id: 'src-2', type: 'supplier-request-detail',
              attributes: { requested: 5, delivered: 5, created_at: '2026-08-01T09:00:00Z' } },
          ],
        });

        const filas = form.get('no_form_data_table_derived') as FormArray;
        // La segunda partida ya no tiene saldo: no se ofrece.
        expect(filas.length).toBe(1);
        // La cantidad propuesta es el PENDIENTE, no lo pedido.
        expect(filas.at(0).get('requested')?.value).toBe(6);

        const { sources } = (component as any)._collectConversionSources(POS);
        expect(sources.length).toBe(1);
        expect(sources[0].id).toBe('src-1');
        expect(sources[0].meta.source_version).toBe('2026-08-02T10:30:00Z');
        http.verify();
      });

      it('jalar dos veces no duplica una partida ya presente', () => {
        const { form } = withDocument();
        const http = TestBed.inject(HttpTestingController);
        const respuesta = () => ({
          data: [{ id: 'src-1', type: 'supplier-request-detail',
                   attributes: { requested: 10, delivered: 0, modified_at: '2026-08-02T10:30:00Z' } }],
        });

        (component as any).pullSourceDocument({ pos: POS });
        http.expectOne((r) => r.url.includes('purchases/supplier-request-detail')).flush(respuesta());
        (component as any).pullSourceDocument({ pos: POS });
        http.expectOne((r) => r.url.includes('purchases/supplier-request-detail')).flush(respuesta());

        const filas = form.get('no_form_data_table_derived') as FormArray;
        expect(filas.length).toBe(1);
        http.verify();
      });

      it('sin documento elegido no sale petición', () => {
        const { form } = withDocument();
        (form.get('no_form_data_source_code') as any)?.setValue('');

        (component as any).pullSourceDocument({ pos: POS });

        TestBed.inject(HttpTestingController).verify();
      });

      // [[[II ESC:055-03 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-03
      it('reconoce los buscadores por su data_type, sin declararlos', () => {
        withDocument();

        const campos = (component as any)._sourceDocumentFields(POS, {
          filter: 'supplier_request',
        });

        // El campo no se declara en `sources`: se reconoce porque su `data_type`
        // resuelve al mismo recurso que la ForeignKey.
        expect(campos).toContain('no_form_data_source_code');
      });
      // ]]]FI
    });
    // ]]]FI

    it('una fila manual sigue delegando el guardado normal', () => {
      setUp([]);
      component.isCreate.set(true);
      const saveSpy = spyOn(component, 'save');

      component.handleTableRowSave({
        field: 'no_form_data_table_derived',
        row_index: 0,
        row_data: { requested: '4' },
        source_row: {},
        columns: [{ field: 'requested' }],
        mode: 'create',
      });

      expect(saveSpy).toHaveBeenCalled();
    });
  });
  // ]]]FI
});
