import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomButtonCrudComponent } from './custom-button-crud.component';

describe('CustomButtonCrudComponent', () => {
  let component: CustomButtonCrudComponent;
  let fixture: ComponentFixture<CustomButtonCrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomButtonCrudComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomButtonCrudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
