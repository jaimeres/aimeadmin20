import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CustomTaskTreeComponent } from './custom-task-tree.component';
import { MessageService } from '../services/message.service';
import { GeneralService } from '../../utils/services/general.service';
import { TaskService } from '../../tasks/services/task.service';

describe('CustomTaskTreeComponent', () => {
  let component: CustomTaskTreeComponent;
  let fixture: ComponentFixture<CustomTaskTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTaskTreeComponent],
      providers: [
        {
          provide: TaskService,
          useValue: {
            getObject: () => of({ data: [] }),
            getRelated: () => of({ data: [] }),
            fieldsForm: () => ({}),
          },
        },
        {
          provide: GeneralService,
          useValue: {
            DJAtoObject: () => [],
          },
        },
        {
          provide: MessageService,
          useValue: {
            changeMessage: jasmine.createSpy('changeMessage'),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomTaskTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
