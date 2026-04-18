import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-recruitment',
  imports: [CrudPageShellComponent],
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class RecruitmentComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Proceso de reclutamiento',
    command: () => this.openNew({ pos: 'hr-recruitment' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Reclutamiento',
    command: () => this.getAll({ pos: 'hr-recruitment' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'hr-recruitment');
  }

  ngOnInit(): void {
    this.typeDefault = 'hr-recruitment';
    this.app[this.typeDefault] = 'hr/recruitment';
    this.module[this.typeDefault] = 'HR';
    this.initCRUD();
  }

}
