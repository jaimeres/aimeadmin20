// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
// Campo tree-select extraído del template de CustomDrawForm para cargarse con
// @defer solo cuando un formulario contiene este tipo. Markup idéntico al
// ng-template original (trazabilidad previa: docs 2026-06-04_020 virtual
// scroll). El padre conserva datos, validaciones y manejo de eventos.
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TreeSelectModule } from 'primeng/treeselect';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';

@Component({
  selector: 'app-draw-tree-select-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, TreeSelectModule, FloatLabelModule, ButtonModule, AutoFocusModule],
  template: `
    <p-floatlabel variant="on">
      <p-treeSelect display="chip" [metaKeySelection]="false" selectionMode="checkbox"
        [options]="options()" [pAutoFocus]="fieldConfig().autofocus"
        [formControl]="control()" key="id" [appendTo]="'body'" [showClear]="true"
        [disabled]="fieldConfig().readonly === true" (onClear)="clearAction.emit(fieldConfig().field)"
        (onNodeSelect)="nodeChangeAction.emit($event)"
        (onNodeUnselect)="nodeChangeAction.emit($event)"
        (onNodeExpand)="nodeExpandAction.emit($event)" [containerStyleClass]="'height-input-custom'"
        [panelStyleClass]="'custom-tree-select-panel'" class="height-input-custom"
        [filter]="fieldConfig().filter_local !== undefined ? fieldConfig().filter_local : false"
        [virtualScroll]="fieldConfig().virtual_scrolling?.active === true && virtualReady()"
        [virtualScrollItemSize]="60" [scrollHeight]="fieldConfig().scroll_height || '220px'"
        [panelStyle]="panelStyle()"
        [filterBy]="fieldConfig().filter_by ? fieldConfig().filter_by + ',label,filter_text' : 'label,filter_text'" />

      <button *ngIf="fieldConfig().reload_icon !== undefined ? fieldConfig().reload_icon : false" type="button" pButton
        icon="pi pi-replay" class="height-icon-custom" style="width: 40px !important;"
        (click)="reloadAction.emit(fieldConfig().field)"></button>
      <button *ngIf="fieldConfig().icon" type="button" pButton [icon]="fieldConfig().icon.icon" class="height-icon-custom"
        style="width: 40px !important;"></button>
      <button *ngIf="fieldConfig()?.icon2" type="button" pButton [icon]="fieldConfig().icon2.icon" class="height-icon-custom"
        style="width: 40px !important;"></button>
      <label [for]="fieldConfig().field">
        {{ fieldConfig()?.label }}
      </label>
    </p-floatlabel>
  `
})
export class DrawTreeSelectFieldComponent {
  fieldConfig = input.required<any>();
  control = input.required<FormControl>();
  options = input<any[]>([]);
  virtualReady = input<boolean>(false);
  panelStyle = input<any>(null);

  clearAction = output<string>();
  nodeChangeAction = output<any>();
  nodeExpandAction = output<any>();
  reloadAction = output<string>();
}
// ]]]FI
