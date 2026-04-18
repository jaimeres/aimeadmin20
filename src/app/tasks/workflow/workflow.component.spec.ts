import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskService } from '../services/task.service';
import { WorkflowComponent } from './workflow.component';
import { configureCrudComponentTesting } from '../../../testing/crud-test.helpers';

describe('WorkflowComponent', () => {
  let component: WorkflowComponent;
  let fixture: ComponentFixture<WorkflowComponent>;

  beforeEach(async () => {
    await configureCrudComponentTesting(WorkflowComponent, TaskService);

    fixture = TestBed.createComponent(WorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
