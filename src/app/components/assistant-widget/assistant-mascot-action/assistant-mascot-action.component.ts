import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AssistantExpression } from '../assistant-widget.component';

type AssistantVisualMode = 'glasses' | 'magnifier' | 'fast' | 'sleepy' | null;

// [[[II ESC:032-04 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-04
@Component({
  selector: 'app-assistant-mascot-action',
  templateUrl: './assistant-mascot-action.component.html',
  styleUrl: './assistant-mascot-action.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantMascotActionComponent {
  readonly mood = input<AssistantExpression>('idle');

  readonly visualMode = computed<AssistantVisualMode>(() => {
    const mood = this.mood();
    if (mood === 'think') return 'glasses';
    if (mood === 'searching') return 'magnifier';
    if (mood === 'working' || mood === 'speed') return 'fast';
    return mood === 'yawning' ? 'sleepy' : null;
  });
}
// ]]]FI
