import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { OrdersComponent } from './orders.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(OrdersComponent, PurchaseService);

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
