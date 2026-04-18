import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-reimbursements',
  imports: [CrudPageShellComponent],
  templateUrl: './reimbursements.component.html',
  styleUrl: './reimbursements.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ReimbursementsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Reembolso',
    command: () => this.openNew({ pos: 'travel-expenses-reimbursements' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Reembolsos',
    command: () => this.getAll({ pos: 'travel-expenses-reimbursements' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-reimbursements');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-reimbursements';
    this.app[this.typeDefault] = 'travel-expenses/reimbursements';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
