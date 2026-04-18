import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrService } from '../services/hr.service';
import { AttendanceComponent } from './attendance.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('AttendanceComponent', () => {
  let component: AttendanceComponent;
  let fixture: ComponentFixture<AttendanceComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(AttendanceComponent, HrService);

    fixture = TestBed.createComponent(AttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
