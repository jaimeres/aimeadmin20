import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AssistantExpression } from '../assistant-widget.component';

type AssistantVisualMode = 'glasses' | null;

// [[[II ESC:032-04,032-05 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-05
@Component({
  selector: 'app-assistant-mascot-action',
  templateUrl: './assistant-mascot-action.component.html',
  styleUrl: './assistant-mascot-action.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantMascotActionComponent {
  readonly mood = input<AssistantExpression>('idle');

  readonly visualMode = computed<AssistantVisualMode>(() => (this.mood() === 'think' ? 'glasses' : null));
}
// ]]]FI
