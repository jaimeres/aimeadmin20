// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DrawSelectButtonFieldComponent } from './draw-select-button-field.component';

describe('DrawSelectButtonFieldComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawSelectButtonFieldComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function create(fieldConfig: any): ComponentFixture<DrawSelectButtonFieldComponent> {
    const fixture = TestBed.createComponent(DrawSelectButtonFieldComponent);
    fixture.componentRef.setInput('fieldConfig', fieldConfig);
    fixture.componentRef.setInput('control', new FormControl(null));
    fixture.componentRef.setInput('options', [{ id: 'a', name: 'Alfa' }, { id: 'b', name: 'Beta' }]);
    fixture.detectChanges();
    return fixture;
  }

  it('should create y renderiza las opciones', () => {
    const fixture = create({ field: 'modo', option_label: 'name' });
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-selectbutton')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Alfa');
    expect(fixture.nativeElement.textContent).toContain('Beta');
  });

  it('muestra la descripción recortada cuando supera 100 caracteres', () => {
    const longLabel = 'x'.repeat(120);
    const fixture = create({
      field: 'modo', option_label: 'name',
      description: { label: longLabel, slice: 10, caracter_slice: '…' },
    });
    expect(fixture.nativeElement.textContent).toContain('x'.repeat(10) + '…');
    expect(fixture.nativeElement.textContent).not.toContain(longLabel);
  });
});
// ]]]FI
