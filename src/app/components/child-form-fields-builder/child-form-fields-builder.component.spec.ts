import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChildFormFieldsBuilderComponent } from './child-form-fields-builder.component';

describe('ChildFormFieldsBuilderComponent', () => {
  let component: ChildFormFieldsBuilderComponent;
  let fixture: ComponentFixture<ChildFormFieldsBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildFormFieldsBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChildFormFieldsBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
