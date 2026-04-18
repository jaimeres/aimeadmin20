import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportContactService } from '../services/support-contact.service';
import { NoticesComponent } from './notices.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('NoticesComponent', () => {
  let component: NoticesComponent;
  let fixture: ComponentFixture<NoticesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(NoticesComponent, SupportContactService);

    fixture = TestBed.createComponent(NoticesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
