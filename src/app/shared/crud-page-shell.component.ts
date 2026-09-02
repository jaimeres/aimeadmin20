import { Component, Input } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { LOCAL_BASE } from './components.index';
import { PRIME_MODULES } from './primeng.index';
import { TaskModuleLoaderComponent } from '../components/task-module-loader/task-module-loader.component';
// [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
// Tira de documentos ORIGEN cargados. Se pinta sola: si el CRUD del módulo no
// es de conversión, el método no existe y el bloque no se instancia.
import { CustomSourceDocumentsComponent }
  from '../components/custom-source-documents/custom-source-documents.component';
// ]]]FI

/**
 * Configuración de tabs adicionales para el dialog.
 * Los tabs General (0), Clasificadores (1), y Auditoría (3) siempre están presentes.
 * Se pueden agregar tabs opcionales con esta interfaz.
 */
export interface ShellTabConfig {
  /** Nombre del tab que se muestra */
  label: string;
  /** Valor numérico del tab (usar 2, 4, 5, etc. — 0, 1, 3 están reservados) */
  value: number;
  /** Tipo de contenido del tab */
  type: 'documents' | 'notes';
  /** Configuración específica para documents */
  documents?: {
    type: string;        // ej: 'maintenance-document'
    app: string;         // ej: 'assets/maintenance-document'
    filter: string;      // ej: 'maintenance'
    newPos: string;      // ej: 'maintenance-document-maintenance'
  };
}

/**
 * Configuración del save del footer.
 */
export interface ShellSaveConfig {
  /** true cuando el save maneja archivos (is_file: true) */
  is_file?: boolean;
}

@Component({
  selector: 'app-crud-page-shell',
  standalone: true,
  imports: [SelectModule, TaskModuleLoaderComponent, CustomSourceDocumentsComponent,
    ...PRIME_MODULES, ...LOCAL_BASE],
  template: `
    <p-confirmdialog />

    <!-- Botones CRUD: visibles siempre en modo local, o controlados por showComponentSignal cuando es hijo -->
    <div style="position: absolute; z-index: 2;"
      *ngIf="!showComponentPos || crud.showComponentSignal()[$any(showComponentPos)]?.local || crud.showComponentSignal()[$any(showComponentPos)]?.read">
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
        (startAction)="crud.setStatus($event)"
      />
    </div>

    <div class="table-fit-Custom"
      *ngIf="!showComponentPos || crud.showComponentSignal()[$any(showComponentPos)]?.local || crud.showComponentSignal()[$any(showComponentPos)]?.read">
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

    <!-- [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06 ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07 -->
    @defer (when crud.localSettingsDialogVisible) {
      <app-custom-local-settings
        *ngIf="crud.showLocalSettingsComponent() && crud.localSettingsDialogVisible"
        [sectionConfiguration]="crud.localSettingsConfiguration()"
        [visible]="crud.localSettingsDialogVisible"
        [field]="crud.fieldConfig()"
        [formGroup]="crud.configForm"
        (saveAction)="crud.saveConfig()"
        (visibleAction)="crud.onLocalSettingsDialogVisible($event)"
      />
    }
    <!-- ]]]FI -->

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
        <p-tabs [scrollable]="true" [value]="crud.tabVisible()" (valueChange)="crud.onTabChange($event)">
          <p-tablist>
            <p-tab [value]="0">General</p-tab>
            <!-- [[[II ESC:001-08 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-08 -->
            <p-tab [value]="1" *ngIf="crud.form()[$any(crud.typeDefault)]?.get('classifiers')">Clasificadores</p-tab>
            <!-- ]]]FI -->
            <p-tab *ngFor="let tab of tabs" [value]="tab.value">{{ tab.label }}</p-tab>
            <p-tab [value]="3">Auditoría</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel [value]="0">
              <!-- [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
                   Sólo aparece en un documento que se alimenta de otro: el
                   método existe únicamente en ConversionCRUD. Nada de comillas
                   invertidas aquí dentro: la plantilla del shell ES un template
                   literal y las cerraría a media línea. ]]]FI -->
              <app-custom-source-documents *ngIf="crud.conversionSourceDocuments"
                [documents]="crud.conversionSourceDocuments()"
                (removeDocument)="crud.removeConversionSourceDocument($event.field, $event.id)" />

              <app-custom-draw-form
                *ngIf="crud.form()[$any(crud.typeDefault)] && crud.drawForm()[crud.typeDefault]?.['general']"
                [drawForm]="crud.drawForm()[crud.typeDefault]['general']"
                [formGroup]="crud.form()[$any(crud.typeDefault)]"
                [isCreate]="crud.isCreate()"
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

            <!-- [[[II ESC:001-08 DOC:docs/documents/2026-05-16_001_consolidacion_dropdown_types_y_fix_escenarios.md#escenario-08 -->
            <p-tabpanel [value]="1" *ngIf="crud.form()[$any(crud.typeDefault)]?.get('classifiers')">
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
            <!-- ]]]FI -->

            <!-- Tabs dinámicos -->
            <ng-container *ngFor="let tab of tabs">
              <p-tabpanel [value]="tab.value" *ngIf="tab.type === 'documents' && tab.documents">
                <app-custom-documents
                  [selected]="crud.selected()"
                  [type]="tab.documents.type"
                  [app]="tab.documents.app"
                  [filter]="tab.documents.filter"
                  (newAction)="crud.openNewSecundary({ pos: tab.documents.newPos })"
                />
              </p-tabpanel>
            </ng-container>

            <p-tabpanel [value]="3">
              <app-custom-audit [cf]="crud.customField()[crud.typeDefault]" [selected]="crud.selected()" />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </form>

      <ng-template #footer>
        <div class="p-dialog-footer">
          <app-custom-button-footer
            [config]="crud.configGeneral()[$any(crud.typeDefault)]"
            (saveAction)="crud.save({ pos: crud.typeDefault, is_file: saveConfig.is_file || false })"
            (saveNotHideAction)="crud.save({ pos: crud.typeDefault, hide: false, is_file: saveConfig.is_file || false })"
            (resetFormAction)="crud.resetFormDialog()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Carga perezosa de módulos de tareas -->
    <app-task-module-loader
      *ngIf="crud.tasksModule()"
      [tasksModule]="crud.tasksModule()"
      (closeDialog)="crud.closeTaskModule()"
    />
  `
})
export class CrudPageShellComponent {
  @Input({ required: true }) crud!: any;

  /** Tabs adicionales al dialog (documents, notes, etc.) */
  @Input() tabs: ShellTabConfig[] = [];

  /** Configuración del save (is_file, etc.) */
  @Input() saveConfig: ShellSaveConfig = {};

  /**
   * Pos del showComponentSignal para controlar visibilidad cuando el componente
   * es cargado como hijo via app-task-module-loader. Si no se define, se renderiza
   * siempre (modo local/standalone).
   */
  @Input() showComponentPos: string = '';
}
