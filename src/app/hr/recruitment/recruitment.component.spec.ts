import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrService } from '../services/hr.service';
import { RecruitmentComponent } from './recruitment.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('RecruitmentComponent', () => {
  let component: RecruitmentComponent;
  let fixture: ComponentFixture<RecruitmentComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(RecruitmentComponent, HrService);

    fixture = TestBed.createComponent(RecruitmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
