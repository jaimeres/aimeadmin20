import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-requests',
  imports: [CrudPageShellComponent],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class RequestsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Solicitud',
    command: () => this.openNew({ pos: 'travel-expenses-requests' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Solicitudes',
    command: () => this.getAll({ pos: 'travel-expenses-requests' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-requests');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-requests';
    this.app[this.typeDefault] = 'travel-expenses/requests';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
