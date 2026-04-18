import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelExpensesService } from '../services/travel-expenses.service';
import { ExpensesComponent } from './expenses.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('ExpensesComponent', () => {
  let component: ExpensesComponent;
  let fixture: ComponentFixture<ExpensesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(ExpensesComponent, TravelExpensesService);

    fixture = TestBed.createComponent(ExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
