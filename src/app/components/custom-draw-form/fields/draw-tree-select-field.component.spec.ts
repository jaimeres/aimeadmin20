// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DrawTreeSelectFieldComponent } from './draw-tree-select-field.component';

describe('DrawTreeSelectFieldComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawTreeSelectFieldComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function create(fieldConfig: any = { field: 'clasificador', label: 'Clasificador' }): ComponentFixture<DrawTreeSelectFieldComponent> {
    const fixture = TestBed.createComponent(DrawTreeSelectFieldComponent);
    fixture.componentRef.setInput('fieldConfig', fieldConfig);
    fixture.componentRef.setInput('control', new FormControl(null));
    fixture.detectChanges();
    return fixture;
  }

  it('should create y renderiza el tree-select con su etiqueta', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-treeselect')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Clasificador');
  });

  it('emite reloadAction con el nombre del campo al pulsar recargar', () => {
    const fixture = create({ field: 'clasificador', label: 'Clasificador', reload_icon: true });
    const emitted: string[] = [];
    fixture.componentInstance.reloadAction.subscribe((field: string) => emitted.push(field));

    const reloadButton = fixture.nativeElement.querySelector('button[icon="pi pi-replay"]');
    expect(reloadButton).toBeTruthy();
    reloadButton.click();

    expect(emitted).toEqual(['clasificador']);
  });
});
// ]]]FI
