import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseService } from '../services/purchase.service';
import { DeliveryNotesComponent } from './delivery-notes.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('DeliveryNotesComponent', () => {
  let component: DeliveryNotesComponent;
  let fixture: ComponentFixture<DeliveryNotesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(DeliveryNotesComponent, PurchaseService);

    fixture = TestBed.createComponent(DeliveryNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
