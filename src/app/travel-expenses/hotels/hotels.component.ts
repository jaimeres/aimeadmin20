import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-hotels',
  imports: [CrudPageShellComponent],
  templateUrl: './hotels.component.html',
  styleUrl: './hotels.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class HotelsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Hotel',
    command: () => this.openNew({ pos: 'travel-expenses-hotels' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Hoteles',
    command: () => this.getAll({ pos: 'travel-expenses-hotels' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-hotels');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-hotels';
    this.app[this.typeDefault] = 'travel-expenses/hotels';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
