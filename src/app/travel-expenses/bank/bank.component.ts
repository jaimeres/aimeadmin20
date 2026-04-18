import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-bank',
  imports: [CrudPageShellComponent],
  templateUrl: './bank.component.html',
  styleUrl: './bank.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class BankComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Movimiento bancario',
    command: () => this.openNew({ pos: 'travel-expenses-bank' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Banco',
    command: () => this.getAll({ pos: 'travel-expenses-bank' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-bank');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-bank';
    this.app[this.typeDefault] = 'travel-expenses/bank';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
