import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CustomLocalSettingsLoaderComponent } from './custom-local-settings-loader.component';

describe('CustomLocalSettingsLoaderComponent', () => {
  let component: CustomLocalSettingsLoaderComponent;
  let fixture: ComponentFixture<CustomLocalSettingsLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomLocalSettingsLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomLocalSettingsLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // [[[II ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07
  it('does not create the heavy editor while the dialog is closed', () => {
    expect(component).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-custom-local-settings-editor'))).toBeNull();
  });
  // ]]]FI
});
