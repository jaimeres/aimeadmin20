import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { DirectInvoicesComponent } from './direct-invoices.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('DirectInvoicesComponent', () => {
  let component: DirectInvoicesComponent;
  let fixture: ComponentFixture<DirectInvoicesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(DirectInvoicesComponent, PurchaseService);

    fixture = TestBed.createComponent(DirectInvoicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
