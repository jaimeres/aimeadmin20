import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { OffersPricesComponent } from './offers-prices.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('OffersPricesComponent', () => {
  let component: OffersPricesComponent;
  let fixture: ComponentFixture<OffersPricesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(OffersPricesComponent, PurchaseService);

    fixture = TestBed.createComponent(OffersPricesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
