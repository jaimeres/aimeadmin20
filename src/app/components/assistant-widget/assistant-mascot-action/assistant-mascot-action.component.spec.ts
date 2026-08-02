import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantExpression } from '../assistant-widget.component';
import { AssistantMascotActionComponent } from './assistant-mascot-action.component';

// [[[II ESC:032-04 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-04
describe('AssistantMascotActionComponent', () => {
  let fixture: ComponentFixture<AssistantMascotActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssistantMascotActionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AssistantMascotActionComponent);
    fixture.detectChanges();
  });

  it('should keep the body hidden while the mascot is idle', () => {
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('should render exactly one visual assigned to each active state', () => {
    const cases: Array<{ mood: AssistantExpression; selector: string; mode?: string }> = [
      { mood: 'think', selector: '.assistant-glasses' },
      { mood: 'searching', selector: '.assistant-magnifier' },
      { mood: 'working', selector: '.assistant-robot-body', mode: 'fast' },
      { mood: 'speed', selector: '.assistant-robot-body', mode: 'fast' },
      { mood: 'yawning', selector: '.assistant-robot-body', mode: 'sleepy' }
    ];

    cases.forEach(({ mood, selector, mode }) => {
      fixture.componentRef.setInput('mood', mood);
      fixture.detectChanges();
      const visual = fixture.nativeElement.querySelector(selector) as SVGElement | null;
      expect(visual).withContext(mood).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('svg').length).withContext(mood).toBe(1);
      if (mode) expect(visual?.getAttribute('data-mode')).withContext(mood).toBe(mode);
      if (mode === 'fast') expect(visual?.querySelector('.hanging-bag')).withContext(mood).not.toBeNull();
    });
  });
});
// ]]]FI
