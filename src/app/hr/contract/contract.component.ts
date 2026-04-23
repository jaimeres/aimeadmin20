import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-contract',
  imports: [...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './contract.component.html',
  styleUrl: './contract.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ContractComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Contrato',
    command: () => this.openNew({ pos: 'contract' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Contratos',
    command: () => this.getAll({ pos: 'contract' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'contract');
  }

  ngOnInit(): void {
    this.typeDefault = 'contract';
    this.app[this.typeDefault] = 'employees/contract';
    this.module[this.typeDefault] = 'CT';
    this.initCRUD();
  }

}
