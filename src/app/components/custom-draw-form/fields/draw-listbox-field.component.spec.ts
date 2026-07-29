// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DrawListboxFieldComponent } from './draw-listbox-field.component';

describe('DrawListboxFieldComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawListboxFieldComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function create(fieldConfig: any): ComponentFixture<DrawListboxFieldComponent> {
    const fixture = TestBed.createComponent(DrawListboxFieldComponent);
    fixture.componentRef.setInput('fieldConfig', fieldConfig);
    fixture.componentRef.setInput('control', new FormControl([]));
    fixture.componentRef.setInput('options', [{ id: 1, name: 'Opción uno' }]);
    fixture.detectChanges();
    return fixture;
  }

  it('should create y renderiza las opciones con option_label', () => {
    const fixture = create({ field: 'grupos', label: 'Grupos', option_label: 'name' });
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-listbox')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Opción uno');
  });

  it('emite newAction y closableAction con el nombre del campo', () => {
    const fixture = create({ field: 'grupos', option_label: 'name', new_icon: true, closable_icon: true });
    const emitted: string[] = [];
    fixture.componentInstance.newAction.subscribe((field: string) => emitted.push('new:' + field));
    fixture.componentInstance.closableAction.subscribe((field: string) => emitted.push('close:' + field));

    fixture.nativeElement.querySelector('button[icon="pi pi-plus"]').click();
    fixture.nativeElement.querySelector('button[icon="pi pi-times"]').click();

    expect(emitted).toEqual(['new:grupos', 'close:grupos']);
  });
});
// ]]]FI
