import { Component, OnInit, signal } from '@angular/core';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { CommonModule } from '@angular/common';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { WarehouseMovementService } from '../services/warehouse-movement.service';

@Component({
  selector: 'app-warehouse-movement',
  imports: [
    CommonModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './warehouse-movement.component.html',
  styleUrl: './warehouse-movement.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class WarehouseMovementComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Movimientos de almacén',
    command: () => this.openNew({ pos: 'inventory-movement-detail' })
  }
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Movimientos de almacén',
    command: () => this.getAll({ pos: 'inventory-movement-detail' })
  }
  ]);

  constructor(crudS: WarehouseMovementService) {
    super(crudS, 'inventory-movement-detail');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'inventory-movement-detail';
    this.app[this.typeDefault] = 'inventories/inventory-movement-detail';
    //this.module[this.typeDefault] = 'MA';
    //this.columns[this.typeDefault] = ['id', 'quantity']

    this.initCRUD();


  }

}
