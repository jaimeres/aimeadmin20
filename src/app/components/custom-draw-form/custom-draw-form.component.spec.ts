import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDrawFormComponent } from './custom-draw-form.component';

describe('CustomDrawFormComponent', () => {
  let component: CustomDrawFormComponent;
  let fixture: ComponentFixture<CustomDrawFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDrawFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDrawFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
