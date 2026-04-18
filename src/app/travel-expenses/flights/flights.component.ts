import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-flights',
  imports: [CrudPageShellComponent],
  templateUrl: './flights.component.html',
  styleUrl: './flights.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class FlightsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Vuelo',
    command: () => this.openNew({ pos: 'travel-expenses-flights' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Vuelos',
    command: () => this.getAll({ pos: 'travel-expenses-flights' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-flights');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-flights';
    this.app[this.typeDefault] = 'travel-expenses/flights';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
