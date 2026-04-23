import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-attendance',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AttendanceComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Asistencia',
    command: () => this.openNew({ pos: 'attendance' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Asistencias',
    command: () => this.getAll({ pos: 'attendance' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'attendance');
  }

  ngOnInit(): void {
    this.typeDefault = 'attendance';
    this.app[this.typeDefault] = 'employees/attendance';
    this.module[this.typeDefault] = 'AS';
    this.initCRUD();
  }

}
