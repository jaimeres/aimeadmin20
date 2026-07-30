import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
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
});
