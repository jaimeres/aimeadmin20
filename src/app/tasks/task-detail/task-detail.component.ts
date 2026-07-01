import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { TaskService } from '../services/task.service';

/**
 * [[[II ESC:024-09 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md
 * Componente que abre la tarea-detalle (General + Datos) DENTRO de cualquier modulo
 * consumidor cuando la tarea seleccionada trae is_detail_required=true. Se carga via
 * TASK_MODULE_REGISTRY['TASK_DETAIL'] desde TaskModuleLoaderComponent.
 *
 * Flujo:
 *  1. Recibe en `showComponent` el contexto: { task, consumerApp, consumerType, consumerId }.
 *  2. Marca la tarea como seleccionada y abre el dialogo secundario task-detail
 *     reutilizando openNewSecundary (General = OPTIONS de task-detail, Datos = dinamicos
 *     de child_form_fields obtenidos on-demand).
 *  3. Al guardar con exito el task-detail, hace un PATCH de retorno al registro
 *     consumidor: relacion `task_detail` = id del task-detail recien creado.
 * ]]]FI
 */
@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  providers: [ConfirmationService],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent extends CRUD implements OnInit {

  /**
   * Contexto enviado por el loader: { task, consumerApp, consumerType, consumerId }
   */
  @Input() showComponent: any = null;

  /**
   * Avisa al loader/padre que el dialogo se cerro para limpiar tasksModule.
   */
  @Output() closeDialog = new EventEmitter<void>();

  private _pendingCtx: any = null;
  private _consumerCtx: any = null;
  private _savingPatch = false;
  // [[[II ESC:024-13 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-13
  taskDetailEditMode = signal(false);
  private _editingDetail: any = null;
  // ]]]FI
  // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
  taskDetailDocumentsActive = signal(false);
  taskDetailDocumentSelected = signal<any[]>([]);
  taskDetailDocumentType = signal('task-detail');
  taskDetailDocumentApp = signal('tasks/task-detail');
  taskDetailDocumentFilter = signal('');
  taskDetailDocumentRelated = signal('files');
  taskDetailDocumentRelatedType = signal('file');
  private _taskDetailFileRelations: any[] = [];
  // ]]]FI

  constructor(crudS: TaskService) {
    super(crudS, 'task-detail');
  }

  ngOnInit(): void {
    this.typeDefault = 'task-detail';
    this.app[this.typeDefault] = 'tasks/task-detail';
    this.module[this.typeDefault] = 'TAD';

    // datos del padre (tarea) requeridos para resolver child_form_fields on-demand
    this.app['task'] = 'tasks/task';
    this.module['task'] = 'TA';
    this.type['task'] = 'task';

    this.initCRUD();
    this._tryOpen();
  }

  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    const ctx = changes?.['showComponent']?.currentValue;
    if (ctx && ctx.task) {
      this._pendingCtx = ctx;
      this._tryOpen();
    }
  }

  /**
   * Abre el detalle cuando la app ya esta inicializada. ngOnChanges puede dispararse
   * antes de ngOnInit en componentes creados dinamicamente, por eso se reintenta.
   */
  private _tryOpen(): void {
    if (!this._pendingCtx) return;
    if (!this.app['task-detail']) return; // aun no listo, se reintenta desde ngOnInit

    const ctx = this._pendingCtx;
    this._pendingCtx = null;
    this._consumerCtx = ctx;
    // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
    this._syncTaskDetailDocumentsConfig(ctx);
    // ]]]FI

    // [[[II ESC:024-13 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-13
    if (ctx?.mode === 'edit' && ctx?.detail) {
      this._openEdit(ctx);
      return;
    }

    this.taskDetailEditMode.set(false);
    this._editingDetail = null;
    // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
    this.taskDetailDocumentSelected.set([]);
    this.taskDetailDocumentsActive.set(false);
    this._taskDetailFileRelations = [];
    // ]]]FI
    // ]]]FI

    // la tarea padre se marca como seleccionada para que openNewSecundary la valide
    // (is_detail_required) y resuelva su child_form_fields.
    this.selected.set([ctx.task]);
    this.openNewSecundary({ pos: 'task-detail', parent_id: 'task' });
  }

  // [[[II ESC:024-13 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-13
  private _openEdit(ctx: any): void {
    const task = { ...(ctx.task || {}), is_detail_required: true };
    this.taskDetailEditMode.set(true);
    this._editingDetail = ctx.detail;
    this._taskDetailFileRelations = [];
    this.selected.set([task]);
    this.openNewSecundary({ pos: 'task-detail', parent_id: 'task' });
    this._patchEditForm(ctx.detail, task);
  }

  private _patchEditForm(detail: any, task: any, attempt = 0): void {
    const form = (this.form() as any)?.['task-detail'];
    if (!form) {
      if (attempt < 30) {
        setTimeout(() => this._patchEditForm(detail, task, attempt + 1), 100);
      }
      return;
    }

    const selected = this._detailToFormData(detail, task);
    this.resetFormDialog({ pos: 'task-detail', selected });
    this.selected.set([selected]);
    // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
    this.taskDetailDocumentSelected.set([selected]);
    this._reconcileParentFormFileControls('task-detail');
    // [[[II ESC:024-17 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-17
    this._hydrateTaskDetailFileRelations(detail);
    // ]]]FI
    // ]]]FI
    this.isCreate.set(false);
    this.headerDialogSecundary.set(`Editar ${this.singular['task-detail'] || 'detalle de tarea'}`);
  }

  private _detailToFormData(detail: any, task: any): any {
    const selected = {
      ...detail,
      task: task?.id ?? detail?.task,
    };
    const parentData = detail?.parent_form_data && typeof detail.parent_form_data === 'object'
      ? detail.parent_form_data
      : {};

    for (const [key, value] of Object.entries(parentData)) {
      const field = String(key).startsWith('parent_form_data_') ? String(key) : `parent_form_data_${key}`;
      selected[field] = value;
      selected['object_' + field] = this._objectControlValue(value);
    }

    for (const [key, value] of Object.entries(detail || {})) {
      if (!String(key).startsWith('parent_form_data.')) continue;
      const field = `parent_form_data_${String(key).slice('parent_form_data.'.length)}`;
      selected[field] = value;
      selected['object_' + field] = this._objectControlValue(value);
    }

    return selected;
  }

  private _objectControlValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this._objectControlValue(item));
    }
    if (value && typeof value === 'object') {
      return value.id ?? value.value ?? value;
    }
    return value;
  }

  saveTaskDetail(options: any = {}): void {
    // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
    // [[[II ESC:024-17 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-17
    this._mergeTaskDetailFileRelationsIntoForm('task-detail');
    // ]]]FI
    this._reconcileParentFormFileControls('task-detail');
    // ]]]FI

    if (!this.taskDetailEditMode()) {
      this.saveSecundary(options);
      return;
    }

    const pos = 'task-detail';
    const hide = options?.hide !== false;
    const reset = options?.reset !== false;
    const form = this.currentForm(pos);

    this.local(form);
    if (this.formErrors(pos, options?.is_file === true)) return;
    this.validateRelationships(pos);
    this.showBlocked();

    this.crudS.type = this.type[pos] || pos;
    this.crudS.app = this.app[pos];

    const formData = { ...form.value };
    this._mergeFormDataFiles(pos, formData);
    this._rebuildFormDataDicts(pos, formData);

    this.crudS.edit({
      id: this._editingDetail?.id,
      app: this.app[pos],
      type: this.type[pos] || pos,
      formData,
      include: this.include[pos],
    }).subscribe({
      next: () => {
        this.messageS.changeMessage('Detalle de tarea modificado.', null, {}, 'success', 'Aviso');
        this.showBlocked(false);
        if (reset) this.resetFormDialog({ pos });
        if (hide) {
          this._savingPatch = true;
          this.closeDialog.emit();
        }
      },
      error: (err: any) => {
        this.showBlocked(false);
        this.messageS.changeMessage('No fue posible editar el detalle de tarea.', err, this.customField()[pos]);
      }
    });
  }
  // ]]]FI

  // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
  onTaskDetailTabChange(value: any): void {
    this.tabVisibleSecundary.set(value);
    this.taskDetailDocumentsActive.set(value === 2 || value === '2');
  }

  private _syncTaskDetailDocumentsConfig(ctx: any): void {
    const cfg = ctx?.documents
      ?? ctx?.task?.documents
      ?? ctx?.task?.child_form_fields?.documents
      ?? ctx?.task?.child_form_fields?.document;
    const usesIndependentEndpoint = !!(cfg?.filter || cfg?.parent_field);

    this.taskDetailDocumentType.set(cfg?.type || cfg?.data_type || 'task-detail');
    this.taskDetailDocumentApp.set(cfg?.app || 'tasks/task-detail');
    this.taskDetailDocumentFilter.set(cfg?.filter || cfg?.parent_field || '');
    this.taskDetailDocumentRelated.set(cfg?.related ?? (usesIndependentEndpoint ? '' : 'files'));
    this.taskDetailDocumentRelatedType.set(cfg?.related_type || cfg?.relatedType || 'file');
  }

  private _reconcileParentFormFileControls(pos: any): void {
    const form = this.currentForm(pos);
    const draw = this.drawForm()?.[pos + '_child_form_fields'];
    if (!form || !draw) return;

    const hasValue = (value: any): boolean => {
      if (value === null || value === undefined || value === '') return false;
      return Array.isArray(value) ? value.length > 0 : true;
    };

    const clearRequired = (control: any): void => {
      if (!control) return;
      control.clearValidators();
      control.updateValueAndValidity({ emitEvent: false });
    };

    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') return;

      const rawField = typeof node.field === 'string' ? node.field : '';
      const field = rawField.startsWith('object_') ? rawField.slice('object_'.length) : rawField;
      const isFileField = node.type === 'files' || node.type === 'file' || node.type === 'document';

      if (isFileField && field.startsWith('parent_form_data_')) {
        const filesCtrl = form.get(field);
        const docsFields = Array.from(new Set([
          field.replace(/files$/, 'documents'),
          'parent_form_data_documents',
        ])).filter((docsField) => docsField !== field);
        const docsCtrl = docsFields
          .map((docsField) => form.get(docsField))
          .find((control) => !!control) || null;
        const keyCtrl = node.key && node.key !== field ? form.get(node.key) : null;

        if (hasValue(filesCtrl?.value)) {
          clearRequired(docsCtrl);
          clearRequired(keyCtrl);
        } else if (hasValue(docsCtrl?.value)) {
          clearRequired(filesCtrl);
          clearRequired(keyCtrl);
        } else if (hasValue(keyCtrl?.value)) {
          clearRequired(filesCtrl);
          clearRequired(docsCtrl);
        }
      }

      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') visit(child);
      }
    };

    visit(draw);
  }

  // [[[II ESC:024-17 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-17
  private _hydrateTaskDetailFileRelations(detail: any): void {
    const detailId = detail?.id;
    const related = this.taskDetailDocumentRelated();
    if (!detailId || !related) {
      this._taskDetailFileRelations = [];
      return;
    }

    this.showBlocked();
    this.crudS.getRelated({
      id: detailId,
      app: this.taskDetailDocumentApp() || this.app['task-detail'],
      type: this.taskDetailDocumentRelatedType() || 'file',
      related,
      fields: 'name,file,is_active,created_at,modified_at,',
    }).subscribe({
      next: (resp: any) => {
        const data = Array.isArray(resp?.data) ? resp.data : [];
        const relations = data
          .map((item: any) => this._normalizeTaskDetailFileRelation(item))
          .filter((item: any) => !!item);

        this._taskDetailFileRelations = this._mergeTaskDetailFileRelationArrays(this._taskDetailFileRelations, relations);
        this._mergeTaskDetailFileRelationsIntoForm('task-detail');
        this._reconcileParentFormFileControls('task-detail');
        this.showBlocked(false);
      },
      error: (err: any) => {
        this.showBlocked(false);
        this.messageS.changeMessage(
          'No fue posible cargar las relaciones de documentos del detalle de tarea.',
          err,
          this.customField()?.['task-detail'] || []
        );
      }
    });
  }

  private _mergeTaskDetailFileRelationsIntoForm(pos: any): void {
    if (!this._taskDetailFileRelations.length) return;

    const form = this.currentForm(pos);
    if (!form) return;

    for (const field of this._taskDetailFileControlNames(pos)) {
      const control = form.get(field);
      if (!control) continue;

      const current = Array.isArray(control.value)
        ? control.value
        : (control.value ? [control.value] : []);
      const merged = this._mergeTaskDetailFileRelationArrays(this._taskDetailFileRelations, current);

      control.setValue(merged, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });

      const documentsField = field.replace(/files$/, 'documents');
      if (documentsField !== field) {
        const documentsControl = form.get(documentsField);
        documentsControl?.clearValidators();
        documentsControl?.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  private _taskDetailFileControlNames(pos: any): string[] {
    const form = this.currentForm(pos);
    if (!form) return [];

    const fields = new Set<string>();
    if (form.get('files')) fields.add('files');

    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') return;

      const rawField = typeof node.field === 'string' ? node.field : '';
      const field = rawField.startsWith('object_') ? rawField.slice('object_'.length) : rawField;
      const isFileField = node.type === 'files' || node.type === 'file' || node.type === 'document';

      if (isFileField && field && form.get(field)) {
        fields.add(field);
      }

      for (const child of Object.values(node)) {
        if (child && typeof child === 'object') visit(child);
      }
    };

    visit(this.drawForm()?.[pos]);
    visit(this.drawForm()?.[pos + '_child_form_fields']);
    return Array.from(fields);
  }

  private _mergeTaskDetailFileRelationArrays(...sources: any[][]): any[] {
    const merged: any[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      for (const item of source || []) {
        const relation = this._normalizeTaskDetailFileRelation(item);
        if (!relation) continue;

        const key = `${relation.type || 'file'}:${relation.id}`;
        if (seen.has(key)) continue;

        seen.add(key);
        merged.push(relation);
      }
    }

    return merged;
  }

  private _normalizeTaskDetailFileRelation(item: any): any | null {
    const id = item?.id ?? item?.relation_id ?? null;
    if (!id) return null;

    return {
      id,
      type: item?.type || this.taskDetailDocumentRelatedType() || 'file',
    };
  }
  // ]]]FI
  // ]]]FI

  // [[[II ESC:005-11 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-11
  override configDialog(): void {
    this.localSettings();
  }
  // ]]]FI

  /**
   * Tras crear el task-detail, hace el PATCH de retorno al modulo consumidor con la
   * relacion task_detail = id generado y luego cierra el dialogo.
   */
  protected override afterSecundaryCreateSuccess(resp: any, pos: any): void {
    if (pos !== 'task-detail') return;

    const ctx = this._consumerCtx;
    const newId = resp?.data?.id;

    if (!newId || !ctx?.consumerApp || ctx?.consumerId == null) {
      if (newId) this.taskDetailDocumentSelected.set([{ id: newId, type_type: 'task-detail' }]);
      this.closeDialog.emit();
      return;
    }

    this.taskDetailDocumentSelected.set([{ id: newId, type_type: 'task-detail' }]);

    this._savingPatch = true;
    this.showBlocked();
    this.crudS.type = ctx.consumerType;
    this.crudS.app = ctx.consumerApp;

    // [[[II ESC:024-11 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-11
    const taskDetailRelationships = [{ field: 'task_details', type: 'task-detail', id: [newId] }];
    // ]]]FI
    console.log('PATCH ---*-*-*-*-', taskDetailRelationships)
    this.crudS.edit({
      id: ctx.consumerId,
      app: ctx.consumerApp,
      type: ctx.consumerType,
      formData: {},
      relationships: taskDetailRelationships,
    }).subscribe({
      next: () => {
        this.messageS.changeMessage('Tarea detalle generada y asociada al registro.', null, {}, 'success', 'Aviso');
        this.showBlocked(false);
        this._savingPatch = false;
        this.closeDialog.emit();
      },
      error: (err: any) => {
        this.showBlocked(false);
        this._savingPatch = false;
        this.messageS.changeMessage('No fue posible asociar la tarea detalle al registro.', err, this.customField());
        this.closeDialog.emit();
      }
    });
  }

  /**
   * Avisa el cierre al padre. Durante el PATCH de retorno NO se emite aqui: lo hace
   * afterSecundaryCreateSuccess al terminar para no destruir el componente antes.
   */
  override onHide(app: any = null): void {
    super.onHide(app);
    if (this._savingPatch) return;
    this.closeDialog.emit();
  }
}
