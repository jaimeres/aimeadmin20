// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04 ESC:007-09 DOC:docs/documents/2026-06-01_007_custom-draw-form-listbox.md#escenario-09
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DrawListboxFieldComponent } from './draw-listbox-field.component';
import { DynamicDropdownDataService } from '../dynamic-dropdown-data.service';

describe('DrawListboxFieldComponent', () => {
  let dynamicDropdownDataS: jasmine.SpyObj<DynamicDropdownDataService>;

  beforeEach(async () => {
    dynamicDropdownDataS = jasmine.createSpyObj<DynamicDropdownDataService>('DynamicDropdownDataService', ['logAssetSearch']);
    await TestBed.configureTestingModule({
      imports: [DrawListboxFieldComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DynamicDropdownDataService, useValue: dynamicDropdownDataS },
      ],
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

  // [[[II ESC:001-18 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-18
  it('emite searchAction sólo cuando la búsqueda adicional está habilitada', () => {
    const fixture = create({
      field: 'asset',
      option_label: 'name',
      additional_search: { active: true },
    });
    const emitted: string[] = [];
    fixture.componentInstance.searchAction.subscribe((field: string) => emitted.push(field));

    fixture.nativeElement.querySelector('button[icon="pi pi-search"]').click();

    expect(emitted).toEqual(['asset']);
  });
  // ]]]FI

  it('registra cache, búsqueda y todas las opciones únicamente para asset', () => {
    const assetConfig = { field: 'asset', option_label: 'name', option_value: 'id' };
    const fixture = create(assetConfig);

    fixture.componentInstance.filterEvent.set({ filter: 'BP0696' });
    fixture.detectChanges();

    expect(dynamicDropdownDataS.logAssetSearch).toHaveBeenCalledWith(
      assetConfig,
      { filter: 'BP0696' },
      [{ id: 1, name: 'Opción uno' }],
    );

    dynamicDropdownDataS.logAssetSearch.calls.reset();
    const otherFixture = create({ field: 'responsible', option_label: 'name', option_value: 'id' });
    otherFixture.componentInstance.filterEvent.set({ filter: 'Ada' });
    otherFixture.detectChanges();

    expect(dynamicDropdownDataS.logAssetSearch).not.toHaveBeenCalled();
  });
});
// ]]]FI
