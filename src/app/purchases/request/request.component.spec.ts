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
});
