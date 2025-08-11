import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomButtonFooterComponent } from './custom-button-footer.component';

describe('CustomButtonFooterComponent', () => {
  let component: CustomButtonFooterComponent;
  let fixture: ComponentFixture<CustomButtonFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomButtonFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomButtonFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
