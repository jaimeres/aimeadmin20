import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelExpensesService } from '../services/travel-expenses.service';
import { TransportComponent } from './transport.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('TransportComponent', () => {
  let component: TransportComponent;
  let fixture: ComponentFixture<TransportComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(TransportComponent, TravelExpensesService);

    fixture = TestBed.createComponent(TransportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
