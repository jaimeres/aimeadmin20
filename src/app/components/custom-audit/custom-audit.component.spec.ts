import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomAuditComponent } from './custom-audit.component';

describe('CustomAuditComponent', () => {
  let component: CustomAuditComponent;
  let fixture: ComponentFixture<CustomAuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomAuditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
