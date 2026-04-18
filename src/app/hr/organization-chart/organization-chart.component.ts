import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-organization-chart',
  imports: [CrudPageShellComponent],
  templateUrl: './organization-chart.component.html',
  styleUrl: './organization-chart.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class OrganizationChartComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Organigrama',
    command: () => this.openNew({ pos: 'hr-organization-chart' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Organigrama',
    command: () => this.getAll({ pos: 'hr-organization-chart' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'hr-organization-chart');
  }

  ngOnInit(): void {
    this.typeDefault = 'hr-organization-chart';
    this.app[this.typeDefault] = 'hr/organization-chart';
    this.module[this.typeDefault] = 'HR';
    this.initCRUD();
  }

}
