import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';

@Component({
  selector: 'app-responsibilities-custodies',
  imports: [LOCAL_BASE, PRIME_MODULES],
  templateUrl: './responsibilities-custodies.component.html',
  styleUrl: './responsibilities-custodies.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ResponsibilitiesCustodiesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Responsiva o resguardo',
    command: () => this.openNew({ pos: 'employee-asset-document' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Responsivas y resguardos',
    command: () => this.getAll({ pos: 'employee-asset-document' })
  }]);

  constructor(crudS: AssetService) {
    super(crudS, 'employee-asset-document');
  }

  ngOnInit(): void {
    this.typeDefault = 'employee-asset-document';
    this.app[this.typeDefault] = 'employees/employee-asset-document';
    this.module[this.typeDefault] = 'DR';
    this.initCRUD();
  }

}
