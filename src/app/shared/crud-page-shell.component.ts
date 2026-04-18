import { Component, Input } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { LOCAL_BASE } from './components.index';
import { PRIME_MODULES } from './primeng.index';

@Component({
  selector: 'app-crud-page-shell',
  standalone: true,
  imports: [SelectModule, ...PRIME_MODULES, ...LOCAL_BASE],
  template: `
    <div style="position: absolute; z-index: 2;">
      <app-custom-button-crud
        (deleteAction)="crud.delete()"
        (editAction)="crud.edit()"
        (refreshAction)="crud.getAll({ force: true, pos: crud.pos() })"
        (newAction)="crud.openNew({ pos: crud.pos() })"
        [moreOptions]="crud.moreOptions()"
        [getMenu]="crud.getMenu()"
        [openNewMenu]="crud.openNewMenu()"
        [selected]="crud.selected()"
        [startMenu]="crud.startMenu()"
      />
    </div>

    <div class="table-fit-Custom">
      <app-custom-table
        class="table-fit-Custom"
        [value]="crud.items()"
        [columns]="crud.selectedColumns()"
        [selected]="crud.selected()"
        (selectionAction)="crud.onSelection($event)"
        (rowDoubleClick)="crud.onRowDoubleClick($event)"
        [exportDialogVisible]="crud.exportDialogVisible"
        [field]="crud.fieldExport()"
        (exportDialogVisibleAction)="crud.onExportDialogVisible($event)"
        (exportServerAction)="crud.onExportServer($event)"
        (lazyLoadAction)="crud.onLazyLoad({ event: $event })"
        [rows]="crud.limit()[crud.pos()]"
        [totalRecords]="crud.totalRecords()[crud.pos()]"
        [filterDelayTable]="crud.filterDelayTable()"
      />
    </div>

    <app-custom-local-settings
      [visible]="crud.localSettingsDialogVisible"
      [field]="crud.fieldConfig()"
      [formGroup]="crud.configForm"
      (saveAction)="crud.saveConfig()"
      (visibleAction)="crud.onLocalSettingsDialogVisible($event)"
    />

    <app-custom-import
      [visible]="crud.importDialogVisible"
      (visibleAction)="crud.onImportDialogVisible($event)"
      (saveAction)="crud.onImportSave($event)"
    />

    <app-custom-actions-selection
      [visible]="crud.actionsSelectionDialogVisible"
      (visibleChange)="crud.onVisibleChange($event)"
    />

    <p-dialog
      [(visible)]="crud.formDialogVisible[$any(crud.typeDefault)]"
      (onHide)="crud.onHide($any(crud.typeDefault))"
      (onShow)="crud.onShow($any(crud.typeDefault))"
      [styleClass]="crud.styleClassDialog()"
      modal="true"
    >
      <ng-template #header>
        <div class="p-dialog-title">
          <span class="p-dialog-title-text">{{ crud.headerDialog() }}</span>
          <button type="button" class="p-dialog-titlebar-icon p-link" (click)="crud.configDialog()">
            <i class="pi pi-spin pi-cog p-dialog-icon"></i>
          </button>
        </div>
      </ng-template>

      <form [formGroup]="crud.form()[$any(crud.typeDefault)]" *ngIf="crud.form()[$any(crud.typeDefault)]">
        <p-tabs [scrollable]="true" [value]="crud.tabVisible()">
          <p-tablist>
            <p-tab [value]="0">General</p-tab>
            <p-tab [value]="1">Clasificadores</p-tab>
            <p-tab [value]="3">Auditoría</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel [value]="0">
              <app-custom-draw-form
                *ngIf="crud.form()[$any(crud.typeDefault)] && crud.drawForm()[crud.typeDefault]?.['general']"
                [drawForm]="crud.drawForm()[crud.typeDefault]['general']"
                [formGroup]="crud.form()[$any(crud.typeDefault)]"
                (onSelectAutoCompleteAction)="crud.onSelectAutoComplete($event)"
                (onChangeDropdownAction)="crud.onChangeDropdown($event)"
                (onNewIconDropdownAction)="crud.onNewIconDropdown($event)"
                (onReloadIconDropdownAction)="crud.onReloadIconDropdown($event)"
                (onChangeToggleAction)="crud.onChangeToggle($event)"
                (onKeydownEnterAction)="crud.onKeydownEnter($event)"
                (onClosableIconDropdownAction)="crud.onClosableIconDropdown($event)"
                (files64Action)="crud.onFiles64($event)"
                (filesAction)="crud.onFiles($event)"
              />
            </p-tabpanel>

            <p-tabpanel [value]="1">
              <div formArrayName="classifiers" class="pt-3">
                <div
                  class="p-fluid grid separator-form-small pl-2"
                  *ngFor="let level of crud.classifierLevelsGen()[$any(crud.pos())]; let i = index"
                >
                  <div class="field col-12 md:col-6">
                    <span class="p-float-label">
                      <p-select
                        styleClass="height-input-custom"
                        [options]="crud.classifierTypeByLevel(level.classifier_type + 'p', level.level + 'p', i)"
                        optionValue="id"
                        optionLabel="name"
                        [formControlName]="crud.funAuxFormClassifiers('formControlName', i)"
                        (onChange)="crud.loadClassifiers($event, level, i)"
                        placeholder="."
                        [showClear]="true"
                      >
                      </p-select>
                      <label for="dropdown">{{ level.name | slice: 0 : 29 }}</label>
                    </span>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <p-tabpanel [value]="3">
              <app-custom-audit [cf]="crud.customField()[crud.typeDefault]" [selected]="crud.selected()" />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </form>

      <ng-template #footer>
        <div class="p-dialog-footer">
          <app-custom-button-footer
            (saveAction)="crud.save({ pos: crud.typeDefault })"
            (saveNotHideAction)="crud.save({ pos: crud.typeDefault, hide: false })"
            (resetFormAction)="crud.resetFormDialog()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `
})
export class CrudPageShellComponent {
  @Input({ required: true }) crud!: any;
}