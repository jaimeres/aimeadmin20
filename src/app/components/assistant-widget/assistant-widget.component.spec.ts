import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantWidgetComponent } from './assistant-widget.component';

describe('AssistantWidgetComponent', () => {
  let component: AssistantWidgetComponent;
  let fixture: ComponentFixture<AssistantWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssistantWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
