import { Component, OnInit, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { CRUD } from 'src/app/utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from 'src/app/shared/primeng.index';
import { SelectModule } from 'primeng/select';
import { TaskService, } from '../services/task.service';
import { LOCAL_BASE } from '../../shared/components.index';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-task',
  imports: [
    SelectModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  providers: [ConfirmationService],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
  standalone: true,
})
export class TaskComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Tarea',
    command: () => this.openNew({ pos: 'task' })
  },
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Tarea',
    command: () => this.getAll({ pos: 'task' })
  },
  ]);

  constructor(crudS: TaskService) {
    super(crudS, 'task');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'task';
    this.app[this.typeDefault] = 'tasks/task';
    this.fields[this.typeDefault] = 'is_detail_required,child_form_fields,';
    this.module[this.typeDefault] = 'TA';

    this.app['task-detail'] = 'tasks/task-detail';
    this.module['task-detail'] = 'TAD';

    this.app['task-detail'] = 'tasks/task-detail';
    this.module['task-detail'] = 'TAD';

    this.initCRUD();
  }


  /* styleDetailClassDialog = signal<string>('width-650px-custom min-height-550px-custom');
   headerDetailDialog = signal<string>('Detalles de la Tarea');
   childFormFields = signal<any>({});
 
   openTasksDetail1() {
 
     const tasksDetailSelect = this.selected()[0];
     if (!tasksDetailSelect) {
       this.messageS.changeMessage('Seleccione una tarea que requiera detalle.', null, {}, 'info');
       return;
     }
 
     if (!tasksDetailSelect.is_detail_required) {
       this.messageS.changeMessage('La tarea seleccionada no requiere detalle.', null, {}, 'info');
       return;
     }
 
     const pos: any = 'task-detail';
 
     this.headerDetailDialog.set(`${tasksDetailSelect.name || 'etalles de la Tarea'}`);
 
     if (!this.formTempo[pos]) {
       this.showBlocked();
       this.crudS.options('tasks/task-detail').subscribe({
         next: (resp: any) => {
           this.optionsFields[pos] = resp.data.actions.POST;
           this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos], pos);
 
           //recorre tasksDetailSelect.child_form_fields y asigna los valores al formTempo
           if (tasksDetailSelect.child_form_fields) {
             const childFields = tasksDetailSelect.child_form_fields;
 
             // Verifica si el primer elemento es 'grid' o 'nested'
             const firstKey = Object.keys(childFields)[0];
             let fieldsContainer = childFields;
 
             if (firstKey === 'grid' || firstKey === 'nested') {
               fieldsContainer = childFields[firstKey];
             }
 
             // Recorre todos los objetos y agrega controles dinámicamente
             Object.keys(fieldsContainer).forEach(key => {
               const fieldData = fieldsContainer[key];
 
               // Toma directamente el field del diccionario
               if (fieldData && fieldData.field) {
 
                 const active = fieldData?.default?.active || false;
                 const value = fieldData?.default?.value || null;
                 let defaultValue = value;
                 const edit = fieldData?.default?.edit || false;
                 if (active && edit) {
                   if (value == 'device') {
                     defaultValue = new Date();
                   }
                 }
                 const disabled = fieldData.readonly || false;
                 const validators: any[] = [];
 
                 // Agrega validadores si es requerido
                 if (fieldData.required) {
                   validators.push(Validators.required);
                   //max_length
                   if (fieldData.max_length) {
                     validators.push(Validators.maxLength(fieldData.max_length));
                   }
                   if (fieldData.min_length) {
                     validators.push(Validators.minLength(fieldData.min_length));
                   }
                 }
 
                 // Agrega directamente al FormGroup principal
                 this.isCreate = true;
                 (this.formTempo[pos] as any).addControl(
                   fieldData.field,
                   this.fb.control(
                     { value: defaultValue, disabled: disabled },
                     { nonNullable: true, validators: validators }
                   )
                 );
               }
             });
           }
 
           (this.formTempo[pos] as any).get('task').setValue(tasksDetailSelect?.id)
           this.form.set(this.formTempo);
           this.showBlocked(false);
           this.formDialogVisible[pos] = true;
 
         }
       });
     } else {
       this.formDialogVisible[pos] = true;
     }
 
     this.childFormFields.set(tasksDetailSelect.child_form_fields || {});
 
   }*/
}
