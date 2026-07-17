import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

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

  // [[[II ESC:030-05 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-05
  it('marks the OnPush table for refresh when its FormArray changes externally', () => {
    const rows = new FormArray<any>([]);
    const form = new FormGroup({ details: rows });
    const markForCheck = spyOn((component as any).cdr, 'markForCheck');

    component.tableConfig = { field: 'details', columns: [] };
    component.formGroup = form;
    component.ngOnChanges({
      tableConfig: new SimpleChange(null, component.tableConfig, true),
      formGroup: new SimpleChange(null, form, true),
    });

    rows.push(new FormGroup({}));

    expect(markForCheck).toHaveBeenCalled();
    expect(component.getTableData('details').length).toBe(1);
  });
  // ]]]FI
});
