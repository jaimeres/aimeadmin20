import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AssetService } from '../services/asset.service';

@Component({
  selector: 'app-responsibilities-custodies',
  imports: [CrudPageShellComponent],
  templateUrl: './responsibilities-custodies.component.html',
  styleUrl: './responsibilities-custodies.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ResponsibilitiesCustodiesComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Responsiva o resguardo',
    command: () => this.openNew({ pos: 'asset-responsibilities-custodies' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Responsivas y resguardos',
    command: () => this.getAll({ pos: 'asset-responsibilities-custodies' })
  }]);

  constructor(crudS: AssetService) {
    super(crudS, 'asset-responsibilities-custodies');
  }

  ngOnInit(): void {
    this.typeDefault = 'asset-responsibilities-custodies';
    this.app[this.typeDefault] = 'assets/responsibilities-custodies';
    this.module[this.typeDefault] = 'AS';
    this.initCRUD();
  }

}
