// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04 ESC:001-19 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-19
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

  function create(
    fieldConfig: any = { field: 'clasificador', label: 'Clasificador' },
    control: FormControl = new FormControl(null),
  ): ComponentFixture<DrawTreeSelectFieldComponent> {
    const fixture = TestBed.createComponent(DrawTreeSelectFieldComponent);
    fixture.componentRef.setInput('fieldConfig', fieldConfig);
    fixture.componentRef.setInput('control', control);
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

  it('conserva visibles los chips, la flecha y la recarga dentro del layout flexible', () => {
    const control = new FormControl([
      { key: '1', label: 'ERNESTO' },
      { key: '2', label: 'LUIS JAVIER' },
    ]);
    const fixture = create({ field: 'responsables', label: 'Responsables', reload_icon: true }, control);
    fixture.nativeElement.style.width = '220px';
    const treeSelect = fixture.nativeElement.querySelector('p-treeselect.tree-select-control');
    const dropdownTrigger = treeSelect.querySelector('.p-treeselect-dropdown');
    const reloadButton = fixture.nativeElement.querySelector('button.tree-select-action[icon="pi pi-replay"]');
    const hostBounds = fixture.nativeElement.getBoundingClientRect();

    expect(fixture.nativeElement.querySelector('p-floatlabel.tree-select-field')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.p-chip').length).toBe(2);
    expect(dropdownTrigger).toBeTruthy();
    expect(getComputedStyle(treeSelect).minWidth).toBe('0px');
    expect(getComputedStyle(reloadButton).flexShrink).toBe('0');
    expect(dropdownTrigger.getBoundingClientRect().right).toBeLessThanOrEqual(hostBounds.right + 0.5);
    expect(reloadButton.getBoundingClientRect().right).toBeLessThanOrEqual(hostBounds.right + 0.5);
  });
});
// ]]]FI
