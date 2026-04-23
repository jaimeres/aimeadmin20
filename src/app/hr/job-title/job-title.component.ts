import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-job-title',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './job-title.component.html',
  styleUrl: './job-title.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class JobTitleComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Departamento',
    command: () => this.openNew({ pos: 'department' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Departamentos',
    command: () => this.getAll({ pos: 'department' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'department');
  }

  ngOnInit(): void {
    this.typeDefault = 'department';
    this.app[this.typeDefault] = 'employees/department';
    this.module[this.typeDefault] = 'DE';
    this.initCRUD();
  }

}
