// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
// Campo listbox extraído del template de CustomDrawForm para cargarse con
// @defer solo cuando un formulario contiene este tipo. Markup idéntico al
// ng-template original (trazabilidad previa: docs 2026-06-01_007 listbox y
// 2026-06-04_020 virtual scroll). El padre conserva datos, validaciones y
// manejo de eventos.
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListboxModule } from 'primeng/listbox';
import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { JoinOrSelfPipe } from '../join-or-self.pipe';

@Component({
  selector: 'app-draw-listbox-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ListboxModule, ButtonModule, AutoFocusModule, JoinOrSelfPipe],
  template: `
    <div class="flex flex-col gap-2 w-full">
      <div class="flex items-center justify-between gap-2"
        *ngIf="fieldConfig()?.label || fieldConfig().reload_icon || fieldConfig().icon || fieldConfig()?.icon2">
        <label *ngIf="fieldConfig()?.label" [for]="fieldConfig().field" class="text-sm listbox-label">
          {{ fieldConfig()?.label }}
        </label>

        <!-- acciones movidas junto a la caja de búsqueda dentro del listbox -->
        <div class="hidden md:flex items-center gap-1">
          <button *ngIf="fieldConfig().icon" type="button" pButton [icon]="fieldConfig().icon.icon"
            class="height-icon-custom"></button>
        </div>
      </div>

      <div class="listbox-container">
        <p-listbox [options]="options()" [pAutoFocus]="fieldConfig().autofocus"
          [formControl]="control()" [disabled]="fieldConfig().readonly === true"
          [multiple]="multiple()"
          [checkbox]="multiple()" [metaKeySelection]="false"
          [showToggleAll]="false" [dataKey]="fieldConfig().option_value || 'id'"
          [optionLabel]="fieldConfig().tree ? 'label' : (fieldConfig().option_label | joinOrSelf)"
          [optionValue]="fieldConfig().tree ? null : (fieldConfig().option_value || 'id')"
          [group]="fieldConfig().tree ? true : false" [optionGroupChildren]="'items'" [optionGroupLabel]="'label'" [filter]="fieldConfig().tree
          ? (fieldConfig().filter_local !== undefined ? fieldConfig().filter_local : false)
          : (fieldConfig().filter_local !== undefined ? fieldConfig().filter_local : true)"
          [virtualScroll]="fieldConfig().virtual_scrolling?.active === true && virtualReady()"
          [virtualScrollItemSize]="40" [virtualScrollOptions]="virtualScrollOptions()"
          [styleClass]="fieldConfig().virtual_scrolling?.active === true ? 'listbox-virtual-fixed' : undefined" [filterBy]="fieldConfig().tree
          ? (fieldConfig().filter_by ? fieldConfig().filter_by + ',label,filter_text,raw.name,raw.display_name,raw.code,raw.id' : 'label,filter_text,raw.name,raw.display_name,raw.code,raw.id')
          : (fieldConfig().filter_by ? fieldConfig().filter_by : (fieldConfig().option_label | joinOrSelf))"
          [scrollHeight]="fieldConfig().scroll_height || '120px'" class="w-full listbox-float"
          (onChange)="changeAction.emit($event)">

          <ng-template #group let-group>
            <div class="text-sm font-semibold text-color-secondary listbox-group-label floating-listbox-simple-label ">
              {{ group.label }}
            </div>
          </ng-template>

          <ng-template #item let-option>
            <div class="flex items-center leading-normal min-h-6 listbox-virtual-option-content">
              {{ fieldConfig().tree ? option.label : option[(fieldConfig().option_label | joinOrSelf)] || option.label }}
            </div>
          </ng-template>
        </p-listbox>
        <div class="listbox-actions">
          <button *ngIf="fieldConfig().reload_icon !== undefined ? fieldConfig().reload_icon : false" type="button" pButton
            icon="pi pi-replay" class="height-icon-custom" title="Recargar"
            (click)="reloadAction.emit(fieldConfig().field)"></button>
          <button *ngIf="fieldConfig().new_icon !== undefined ? fieldConfig().new_icon : false" type="button" pButton
            icon="pi pi-plus" class="height-icon-custom" title="Nuevo"
            (click)="newAction.emit(fieldConfig().field)"></button>
          <button *ngIf="fieldConfig().closable_icon !== undefined ? fieldConfig().closable_icon : false" type="button"
            pButton icon="pi pi-times" class="height-icon-custom" title="Cerrar"
            (click)="closableAction.emit(fieldConfig().field)"></button>
        </div>
      </div>
    </div>
  `
})
export class DrawListboxFieldComponent {
  fieldConfig = input.required<any>();
  control = input.required<FormControl>();
  options = input<any[]>([]);
  multiple = input<boolean>(true);
  virtualReady = input<boolean>(false);
  virtualScrollOptions = input<any>(null);

  changeAction = output<any>();
  reloadAction = output<string>();
  newAction = output<string>();
  closableAction = output<string>();
}
// ]]]FI
