import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-attendance',
  imports: [CrudPageShellComponent],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AttendanceComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Asistencia',
    command: () => this.openNew({ pos: 'hr-attendance' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Asistencia',
    command: () => this.getAll({ pos: 'hr-attendance' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'hr-attendance');
  }

  ngOnInit(): void {
    this.typeDefault = 'hr-attendance';
    this.app[this.typeDefault] = 'hr/attendance';
    this.module[this.typeDefault] = 'HR';
    this.initCRUD();
  }

}
