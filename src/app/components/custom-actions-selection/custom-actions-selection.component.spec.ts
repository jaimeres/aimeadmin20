import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomActionsSelectionComponent } from './custom-actions-selection.component';

describe('CustomActionsSelectionComponent', () => {
  let component: CustomActionsSelectionComponent;
  let fixture: ComponentFixture<CustomActionsSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomActionsSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomActionsSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
