import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomLocalSettingsComponent } from './custom-local-settings.component';

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
});
