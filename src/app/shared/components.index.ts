import { CustomActionsSelectionComponent } from '../components/custom-actions-selection/custom-actions-selection.component';
import { CustomButtonCrudComponent } from '../components/custom-button-crud/custom-button-crud.component';
import { CustomButtonFooterComponent } from '../components/custom-button-footer/custom-button-footer.component';
import { CustomDrawFormComponent } from '../components/custom-draw-form/custom-draw-form.component';
import { CustomImportComponent } from '../components/custom-import/custom-import.component';
// [[[II ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07
import { CustomLocalSettingsLoaderComponent } from '../components/custom-local-settings/custom-local-settings-loader.component';
// ]]]FI
import { CustomTableComponent } from '../components/custom-table/custom-table.component';
import { CustomAuditComponent } from '../components/custom-audit/custom-audit.component';
import { CustomDocumentsComponent } from '../components/custom-documents/custom-documents.component';
import { TaskModuleLoaderComponent } from '../components/task-module-loader/task-module-loader.component';
import { PopupComponent } from '../tasks/popup/popup.component';

export const LOCAL_BASE = [
  CustomDrawFormComponent,
  CustomButtonFooterComponent,
  CustomActionsSelectionComponent,
  CustomImportComponent,
  // [[[II ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07
  CustomLocalSettingsLoaderComponent,
  // ]]]FI
  CustomButtonCrudComponent,
  CustomTableComponent,
  CustomAuditComponent,
  CustomDocumentsComponent,
  TaskModuleLoaderComponent,
  PopupComponent
];
