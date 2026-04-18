import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { TravelExpensesService } from '../services/travel-expenses.service';

@Component({
  selector: 'app-verification',
  imports: [CrudPageShellComponent],
  templateUrl: './verification.component.html',
  styleUrl: './verification.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class VerificationComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Comprobación',
    command: () => this.openNew({ pos: 'travel-expenses-verification' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Comprobaciones',
    command: () => this.getAll({ pos: 'travel-expenses-verification' })
  }]);

  constructor(crudS: TravelExpensesService) {
    super(crudS, 'travel-expenses-verification');
  }

  ngOnInit(): void {
    this.typeDefault = 'travel-expenses-verification';
    this.app[this.typeDefault] = 'travel-expenses/verification';
    this.module[this.typeDefault] = 'TV';
    this.initCRUD();
  }

}
