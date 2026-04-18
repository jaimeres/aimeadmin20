import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { AuctionsComponent } from './auctions.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('AuctionsComponent', () => {
  let component: AuctionsComponent;
  let fixture: ComponentFixture<AuctionsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(AuctionsComponent, PurchaseService);

    fixture = TestBed.createComponent(AuctionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
