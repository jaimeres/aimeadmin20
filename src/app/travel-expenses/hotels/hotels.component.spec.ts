import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelExpensesService } from '../services/travel-expenses.service';
import { HotelsComponent } from './hotels.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('HotelsComponent', () => {
  let component: HotelsComponent;
  let fixture: ComponentFixture<HotelsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(HotelsComponent, TravelExpensesService);

    fixture = TestBed.createComponent(HotelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
