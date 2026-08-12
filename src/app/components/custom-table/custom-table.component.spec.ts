import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTableComponent } from './custom-table.component';

describe('CustomTableComponent', () => {
  let component: CustomTableComponent;
  let fixture: ComponentFixture<CustomTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // [[[II ESC:005-16 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-16
  describe('exportCellFormatter', () => {

    it('formatea una columna dinamica con el option_label configurado en lugar de [object Object]', () => {
      component.field = {
        fields: {
          form_fields_data_moneda: { option_label: 'short_name' }
        }
      };

      const cell = component.exportCellFormatter({
        data: { id: 3, short_name: 'USD', name: 'Dolar americano' },
        field: 'form_data.form_fields_data_moneda'
      });

      expect(cell).toBe('USD');
    });

    it('une varias claves de option_label separadas por coma', () => {
      component.field = {
        fields: {
          form_fields_data_cluster: { option_label: 'code,name' }
        }
      };

      const cell = component.exportCellFormatter({
        data: { code: 'N1', name: 'NORESTE' },
        field: 'form_data.form_fields_data_cluster'
      });

      expect(cell).toBe('N1 NORESTE');
    });

    it('usa el mismo fallback de la celda visible cuando el campo no tiene configuracion', () => {
      component.field = { fields: {} };

      const cell = component.exportCellFormatter({
        data: { id: 7, name: 'Cabina' },
        field: 'parent_form_data.form_fields_data_componente'
      });

      expect(cell).toBe('Cabina');
    });

    it('conserva el comportamiento previo (String) en columnas sin punto', () => {
      component.field = { fields: {} };

      expect(component.exportCellFormatter({ data: 'PUERTO VALLARTA', field: 'plaza__name' }))
        .toBe('PUERTO VALLARTA');
      expect(component.exportCellFormatter({ data: 15, field: 'quantity' })).toBe('15');
    });

    it('escapa las comillas dobles en ambas ramas', () => {
      component.field = {
        fields: {
          form_fields_data_nota: { option_label: 'name' }
        }
      };

      expect(component.exportCellFormatter({ data: 'medida 5"', field: 'description' }))
        .toBe('medida 5""');
      expect(component.exportCellFormatter({
        data: { name: 'tubo 3"' },
        field: 'form_data.form_fields_data_nota'
      })).toBe('tubo 3""');
    });
  });
  // ]]]FI
});
