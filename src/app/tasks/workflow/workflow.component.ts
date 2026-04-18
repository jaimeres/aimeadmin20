import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-workflow',
  imports: [CrudPageShellComponent],
  templateUrl: './workflow.component.html',
  styleUrl: './workflow.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class WorkflowComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Formulario',
    command: () => this.openNew({ pos: 'task-workflow' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Formularios',
    command: () => this.getAll({ pos: 'task-workflow' })
  }]);

  constructor(crudS: TaskService) {
    super(crudS, 'task-workflow');
  }

  ngOnInit(): void {
    this.typeDefault = 'task-workflow';
    this.app[this.typeDefault] = 'tasks/workflow';
    this.module[this.typeDefault] = 'TA';
    this.initCRUD();
  }

}
