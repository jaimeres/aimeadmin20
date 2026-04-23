import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';

import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-employee',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class EmployeeComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Trabajador',
    command: () => this.openNew({ pos: 'employee' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Trabajadores',
    command: () => this.getAll({ pos: 'employee' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'employee');
  }

  ngOnInit(): void {
    this.typeDefault = 'employee';
    this.app[this.typeDefault] = 'employees/employee';
    this.module[this.typeDefault] = 'EP';

    this.excludeFieldsForm[this.typeDefault] = [
      { field: 'classifiers', default: this.fb.array([]), reemplace: true },
      //{ field: 'subsidiary', },
    ];





    this.initCRUD();
  }


  mostrarInv() {
    this.tasksModule.set({
      "EP": {
        //local: false,
        create: true,
        read: false,
        update: false,
        delete: false,
        field: {}
      }
    })
    console.log(this.tasksModule());

  }

  //temporal
  override onSelection(event: any[]) {

    super.onSelection(event);

    this.startMenu().push({

      label: 'Uniformes',
      command: () => this.mostrarInv()
    })

  }


  url = 'https://jukai.io/archivo/123?token=7f9a2d4c8e1b6a93xk45';
  copied = false;

  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      this.copied = true;

      setTimeout(() => {
        this.copied = false;
      }, 1500);
    } catch (error) {
      console.error('No se pudo copiar la URL', error);
    }
  }


}

