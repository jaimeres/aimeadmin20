import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomLocalSettingsComponent } from './custom-local-settings.component';
import { schemaForType } from './type-schemas';

describe('CustomLocalSettingsComponent', () => {
  let component: CustomLocalSettingsComponent;
  let fixture: ComponentFixture<CustomLocalSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomLocalSettingsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CustomLocalSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps default.edit visible independently from default.active', () => {
    for (const type of ['input-text', 'date', 'toggle-button']) {
      const editDef = schemaForType(type)
        .flatMap(section => section.defs)
        .find(def => def.path === 'default.edit');
      expect(editDef).toBeDefined();
      expect(editDef?.showIf).toBeUndefined();
    }
  });
});
