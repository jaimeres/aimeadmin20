import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-work-schedule',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './work-schedule.component.html',
  styleUrl: './work-schedule.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class WorkScheduleComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Horario de trabajo',
    command: () => this.openNew({ pos: 'work-schedule' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Horarios de trabajo',
    command: () => this.getAll({ pos: 'work-schedule' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'work-schedule');
  }

  ngOnInit(): void {
    this.typeDefault = 'work-schedule';
    this.app[this.typeDefault] = 'employees/work-schedule';
    this.module[this.typeDefault] = 'HL';
    this.initCRUD();
  }

}
