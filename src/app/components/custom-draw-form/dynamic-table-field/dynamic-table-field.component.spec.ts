import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicTableFieldComponent } from './dynamic-table-field.component';

describe('DynamicTableFieldComponent', () => {
  let component: DynamicTableFieldComponent;
  let fixture: ComponentFixture<DynamicTableFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicTableFieldComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicTableFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
