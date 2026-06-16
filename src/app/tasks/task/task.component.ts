import { Component, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { CRUD } from 'src/app/utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from 'src/app/shared/primeng.index';
import { SelectModule } from 'primeng/select';
import { TaskService, } from '../services/task.service';
import { LOCAL_BASE } from '../../shared/components.index';
import { ChildFormFieldsBuilderComponent } from '../../components/child-form-fields-builder/child-form-fields-builder.component';

@Component({
  selector: 'app-task',
  imports: [
    SelectModule,
    ChildFormFieldsBuilderComponent,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  providers: [ConfirmationService],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
  standalone: true,
})
export class TaskComponent extends CRUD implements OnInit {

  //taeraPersonalizada
  personalizedTask = signal<boolean>(false);
  // [[[II ESC:023-02 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-02
  childFormFieldsDraft = signal<any>({ fields: {}, draw: { general: {} } });
  // ]]]FI

  public override openNewMenu = signal<MenuItem[]>([
    {
      label: 'Tarea',
      command: () => this.openNew({ pos: 'task' })
    }, {
      label: 'Detalle de Tarea',
      command: () => this.openNew({ pos: 'task-detail' })
    }
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([
    {
      label: 'Tarea',
      command: () => this.getAll({ pos: 'task' })
    },
    {
      label: 'Detalle de Tarea',
      command: () => this.getAll({ pos: 'task-detail' })
    }
  ]);

  constructor(crudS: TaskService) {
    super(crudS, 'task');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'task';
    this.app[this.typeDefault] = 'tasks/task';
    // [[[II ESC:024-06 is_detail_required debe viajar SIEMPRE en la lista de tareas
    // para permitir iniciar el detalle (openNewSecundary lo valida). Se usa
    // fixedFields porque iniParam reconstruye this.fields desde columnas y antes
    // sobreescribia esta asignacion. child_form_fields NO se carga en lista (puede
    // ser un JSON grande por fila); se obtiene on-demand al iniciar el detalle. ]]]FI
    this.fixedFields[this.typeDefault] = 'is_detail_required,child_form_fields,';
    this.module[this.typeDefault] = 'TA';

    this.app['task-detail'] = 'tasks/task-detail';
    this.module['task-detail'] = 'TAD';

    this.initCRUD();
  }

  override onChangeToggle(e: any) {
    this.personalizedTask.set(e.event?.checked);
    if (e.event?.checked) {
      this.syncChildFormFieldsDraftFromForm();
    }
  }

  override openNew(e: any) {
    super.openNew(e);

    // [[[II ESC:023-01 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-01
    if ((e?.pos ?? this.typeDefault) === 'task') {
      this.syncPersonalizedTaskFromForm();
    }
    // ]]]FI
  }

  // [[[II ESC:023-01 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-01
  private syncPersonalizedTaskFromForm(attempt = 0): void {
    const taskForm = (this.form() as any)?.[this.typeDefault];
    const control = taskForm?.get('is_detail_required');

    if (control) {
      this.personalizedTask.set(control.value === true);
      this.syncChildFormFieldsDraftFromForm();
      return;
    }

    if (attempt < 30) {
      setTimeout(() => this.syncPersonalizedTaskFromForm(attempt + 1), 100);
      return;
    }

    this.personalizedTask.set(false);
  }
  // ]]]FI

  // [[[II ESC:023-02 DOC:docs/documents/2026-06-14_023_task-personalized-opennew.md#escenario-02
  onChildFormFieldsChange(value: any): void {
    this.childFormFieldsDraft.set(value ?? { fields: {}, draw: { general: {} } });
    this.ensureChildFormFieldsControl()?.setValue(this.childFormFieldsDraft(), { emitEvent: false });
  }

  override save(options: any = {}) {

    if ((options?.pos ?? this.pos() ?? this.typeDefault) === 'task') {
      this.ensureChildFormFieldsControl()?.setValue(this.childFormFieldsDraft(), { emitEvent: false });
    }

    super.save(options);
  }

  private syncChildFormFieldsDraftFromForm(): void {
    const control = this.ensureChildFormFieldsControl();
    const value = this.parseChildFormFieldsValue(control?.value);
    this.childFormFieldsDraft.set(value);
  }

  private ensureChildFormFieldsControl(): FormControl<any> | null {
    const taskForm = (this.form() as any)?.[this.typeDefault];
    if (!taskForm) return null;

    if (!taskForm.contains('child_form_fields')) {
      taskForm.addControl('child_form_fields', new FormControl(null));
    }

    return taskForm.get('child_form_fields') as FormControl<any>;
  }

  private parseChildFormFieldsValue(value: any): any {
    if (!value) return { fields: {}, draw: { general: {} } };
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return { fields: {}, draw: { general: {} } }; }
    }
    return value;
  }
  // ]]]FI
}