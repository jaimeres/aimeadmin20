import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelExpensesService } from '../services/travel-expenses.service';
import { FlightsComponent } from './flights.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('FlightsComponent', () => {
  let component: FlightsComponent;
  let fixture: ComponentFixture<FlightsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(FlightsComponent, TravelExpensesService);

    fixture = TestBed.createComponent(FlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
