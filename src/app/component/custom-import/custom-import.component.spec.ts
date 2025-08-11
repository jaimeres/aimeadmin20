import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomImportComponent } from './custom-import.component';

describe('CustomImportComponent', () => {
  let component: CustomImportComponent;
  let fixture: ComponentFixture<CustomImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomImportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
