import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetService } from '../services/asset.service';
import { ResponsibilitiesCustodiesComponent } from './responsibilities-custodies.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('ResponsibilitiesCustodiesComponent', () => {
  let component: ResponsibilitiesCustodiesComponent;
  let fixture: ComponentFixture<ResponsibilitiesCustodiesComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(ResponsibilitiesCustodiesComponent, AssetService);

    fixture = TestBed.createComponent(ResponsibilitiesCustodiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
