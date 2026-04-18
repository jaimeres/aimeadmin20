import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { BillsComponent } from './bills.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('BillsComponent', () => {
  let component: BillsComponent;
  let fixture: ComponentFixture<BillsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(BillsComponent, PurchaseService);

    fixture = TestBed.createComponent(BillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
