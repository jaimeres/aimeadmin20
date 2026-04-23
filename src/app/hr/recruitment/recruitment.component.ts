import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-recruitment',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class RecruitmentComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Proceso de reclutamiento',
    command: () => this.openNew({ pos: 'recruitment' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Reclutamiento',
    command: () => this.getAll({ pos: 'recruitment' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'recruitment');
  }

  ngOnInit(): void {
    this.typeDefault = 'recruitment';
    this.app[this.typeDefault] = 'employees/recruitment';
    this.module[this.typeDefault] = 'REC';
    this.initCRUD();
  }

}
