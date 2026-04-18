import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportContactService } from '../services/support-contact.service';
import { ClientsComponent } from './clients.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('ClientsComponent', () => {
  let component: ClientsComponent;
  let fixture: ComponentFixture<ClientsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(ClientsComponent, SupportContactService);

    fixture = TestBed.createComponent(ClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
