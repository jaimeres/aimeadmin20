import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';

@Component({
  selector: 'app-locations',
  imports: [CrudPageShellComponent],
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class LocationsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Ubicación',
    command: () => this.openNew({ pos: 'asset-locations' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Ubicaciones',
    command: () => this.getAll({ pos: 'asset-locations' })
  }]);

  constructor(crudS: AssetService) {
    super(crudS, 'asset-locations');
  }

  ngOnInit(): void {
    this.typeDefault = 'asset-locations';
    this.app[this.typeDefault] = 'assets/locations';
    this.module[this.typeDefault] = 'AS';
    this.initCRUD();
  }

}
