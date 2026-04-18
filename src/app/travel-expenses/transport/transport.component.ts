import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-transport',
  imports: [CrudPageShellComponent],
  templateUrl: './transport.component.html',
  styleUrl: './transport.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class TransportComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Transporte',
    command: () => this.openNew({ pos: 'travel-expenses-transport' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Transportes',
    command: () => this.getAll({ pos: 'travel-expenses-transport' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-transport');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-transport';
    this.app[this.typeDefault] = 'travel-expenses/transport';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
