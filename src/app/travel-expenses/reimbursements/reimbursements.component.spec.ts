import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelExpensesService } from '../services/travel-expenses.service';
import { ReimbursementsComponent } from './reimbursements.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('ReimbursementsComponent', () => {
  let component: ReimbursementsComponent;
  let fixture: ComponentFixture<ReimbursementsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(ReimbursementsComponent, TravelExpensesService);

    fixture = TestBed.createComponent(ReimbursementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
