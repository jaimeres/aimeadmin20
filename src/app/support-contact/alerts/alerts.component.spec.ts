import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportContactService } from '../services/support-contact.service';
import { AlertsComponent } from './alerts.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('AlertsComponent', () => {
  let component: AlertsComponent;
  let fixture: ComponentFixture<AlertsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(AlertsComponent, SupportContactService);

    fixture = TestBed.createComponent(AlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
