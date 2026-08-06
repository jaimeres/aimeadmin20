import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantExpression } from '../assistant-widget.component';
import { AssistantMascotActionComponent } from './assistant-mascot-action.component';

// [[[II ESC:032-04,032-05 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-05
describe('AssistantMascotActionComponent', () => {
  let fixture: ComponentFixture<AssistantMascotActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssistantMascotActionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AssistantMascotActionComponent);
    fixture.detectChanges();
  });

  it('should keep accessories hidden while the mascot is idle', () => {
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('should render glasses only while thinking', () => {
    fixture.componentRef.setInput('mood', 'think');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.assistant-glasses')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(1);

    const moodsWithoutAccessories: AssistantExpression[] = ['searching', 'working', 'speed', 'yawning'];
    moodsWithoutAccessories.forEach((mood) => {
      fixture.componentRef.setInput('mood', mood);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('svg')).withContext(mood).toBeNull();
    });
  });
});
// ]]]FI
