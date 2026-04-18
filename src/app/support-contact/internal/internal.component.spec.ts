import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportContactService } from '../services/support-contact.service';
import { InternalComponent } from './internal.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('InternalComponent', () => {
  let component: InternalComponent;
  let fixture: ComponentFixture<InternalComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(InternalComponent, SupportContactService);

    fixture = TestBed.createComponent(InternalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
