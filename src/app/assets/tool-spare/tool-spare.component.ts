import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';

@Component({
  selector: 'app-tool-spare',
  imports: [CrudPageShellComponent],
  templateUrl: './tool-spare.component.html',
  styleUrl: './tool-spare.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ToolSpareComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Herramienta o refacción',
    command: () => this.openNew({ pos: 'asset-tools-and-spares' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Herramientas y refacciones',
    command: () => this.getAll({ pos: 'asset-tools-and-spares' })
  }]);

  constructor(crudS: AssetService) {
    super(crudS, 'asset-tools-and-spares');
  }

  ngOnInit(): void {
    this.typeDefault = 'asset-tools-and-spares';
    this.app[this.typeDefault] = 'assets/tools-and-spares';
    this.module[this.typeDefault] = 'AS';
    this.initCRUD();
  }

}
