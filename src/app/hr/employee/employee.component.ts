import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-employee',
  imports: [CrudPageShellComponent],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class EmployeeComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Trabajador',
    command: () => this.openNew({ pos: 'hr-employees' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Trabajadores',
    command: () => this.getAll({ pos: 'hr-employees' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'hr-employees');
  }

  ngOnInit(): void {
    this.typeDefault = 'hr-employees';
    this.app[this.typeDefault] = 'hr/employees';
    this.module[this.typeDefault] = 'HR';
    this.initCRUD();
  }

}
