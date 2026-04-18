import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetService } from '../services/asset.service';
import { LocationsComponent } from './locations.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('LocationsComponent', () => {
  let component: LocationsComponent;
  let fixture: ComponentFixture<LocationsComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(LocationsComponent, AssetService);

    fixture = TestBed.createComponent(LocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
