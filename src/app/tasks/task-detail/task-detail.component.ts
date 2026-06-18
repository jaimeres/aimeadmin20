import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
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

    // la tarea padre se marca como seleccionada para que openNewSecundary la valide
    // (is_detail_required) y resuelva su child_form_fields.
    this.selected.set([ctx.task]);
    this.openNewSecundary({ pos: 'task-detail', parent_id: 'task' });
  }

  /**
   * Tras crear el task-detail, hace el PATCH de retorno al modulo consumidor con la
   * relacion task_detail = id generado y luego cierra el dialogo.
   */
  protected override afterSecundaryCreateSuccess(resp: any, pos: any): void {
    if (pos !== 'task-detail') return;

    const ctx = this._consumerCtx;
    const newId = resp?.data?.id;

    if (!newId || !ctx?.consumerApp || ctx?.consumerId == null) {
      this.closeDialog.emit();
      return;
    }

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
