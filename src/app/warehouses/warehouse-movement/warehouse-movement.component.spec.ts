import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseMovementComponent } from './warehouse-movement.component';

describe('WarehouseMovementComponent', () => {
  let component: WarehouseMovementComponent;
  let fixture: ComponentFixture<WarehouseMovementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseMovementComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WarehouseMovementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
