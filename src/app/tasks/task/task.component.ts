import { Component, OnInit, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { CRUD } from 'src/app/utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from 'src/app/shared/primeng.index';
import { TaskService, } from '../services/task.service';
import { LOCAL_BASE } from '../../shared/components.index';

@Component({
  selector: 'app-task',
  imports: [
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  providers: [ConfirmationService],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
  standalone: true,
})
export class TaskComponent extends CRUD implements OnInit {

  constructor(crudS: TaskService) {
    super(crudS);
  }

  ngOnInit(): void {

    this.openNewMenu.set([{
      label: 'Activo',
      command: () => this.openNew()
    },
    ]);

    this.getMenu.set([{
      label: 'Activos',
      command: () => this.getAll({ pos: 'asset' })
    },
    ]);

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'task';
    this.type[this.typeDefault] = this.typeDefault;
    this.app[this.typeDefault] = 'tasks/task';
    this.singular[this.typeDefault] = 'tarea';
    this.plural[this.typeDefault] = 'tareas';
    this.singularIndefiniteArticle[this.typeDefault] = 'la tarea';
    this.pluralDefiniteArticle[this.typeDefault] = 'las tareas';
    this.module[this.typeDefault] = 'TA';

    this.includeFieldsForm[this.typeDefault] = [
      { field: 'VERIFICACION VEHICULAR', },
      { field: 'FECHA', },
    ];

    this.initCRUD();
  }
}
