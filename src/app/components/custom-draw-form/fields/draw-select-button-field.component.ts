// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
// Campo select-button extraído del template de CustomDrawForm para cargarse
// con @defer solo cuando un formulario contiene este tipo. Markup idéntico al
// ng-template original. El padre conserva datos, validaciones y eventos.
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-draw-select-button-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, SelectButtonModule],
  template: `
    <div *ngIf="fieldConfig().description" [style.height]="fieldConfig()?.description?.height"
      class="overflow-hidden text-ellipsis flex items-end justify-start">
      {{ fieldConfig().description?.label?.length > 100 ?
      (fieldConfig().description?.label | slice:0:fieldConfig().description?.slice) +
      fieldConfig().description?.caracter_slice :
      fieldConfig().description?.label }}
    </div>
    <p-selectButton styleClass="height-input-custom" [formControl]="control()"
      [disabled]="fieldConfig().readonly === true"
      [options]="options()"
      [optionLabel]="fieldConfig().option_label || 'name'" [optionValue]="fieldConfig().option_value || 'id'" class="w-full"
      (onChange)="changeAction.emit($event)" />
  `
})
export class DrawSelectButtonFieldComponent {
  fieldConfig = input.required<any>();
  control = input.required<FormControl>();
  options = input<any[]>([]);

  changeAction = output<any>();
}
// ]]]FI
