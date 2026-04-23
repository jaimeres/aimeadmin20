import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationDetailComponent } from './evaluation-detail.component';

describe('EvaluationDetailComponent', () => {
  let component: EvaluationDetailComponent;
  let fixture: ComponentFixture<EvaluationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
