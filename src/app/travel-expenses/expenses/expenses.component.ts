import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-expenses',
  imports: [CrudPageShellComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ExpensesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Gasto',
    command: () => this.openNew({ pos: 'travel-expenses-expenses' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Gastos',
    command: () => this.getAll({ pos: 'travel-expenses-expenses' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-expenses');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-expenses';
    this.app[this.typeDefault] = 'travel-expenses/expenses';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
