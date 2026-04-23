import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-supplier-request',
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    ...LOCAL_BASE,
    ...PRIME_MODULES,
  ],
  templateUrl: './supplier-request.component.html',
  styleUrl: './supplier-request.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class SupplierRequestComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Pedido',
    command: () => this.openNew({ pos: 'supplier-request' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Pedidos',
    command: () => this.getAll({ pos: 'supplier-request' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'supplier-request');
  }

  ngOnInit(): void {
    this.typeDefault = 'supplier-request';
    this.app[this.typeDefault] = 'purchases/supplier-request';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }

  // Temporal: dialogo de acciones desde startMenu.
  tempActionDialogVisible = false;
  tempActionLabel = '';

  override onSelection(event: any[]) {
    super.onSelection(event);

    const baseMenu = this.startMenu().filter((item: MenuItem) => !(item.id ?? '').startsWith('temp-supplier-'));
    this.startMenu.set([
      ...baseMenu,
      { separator: true, id: 'temp-supplier-separator' },
      { id: 'temp-supplier-p', label: 'Recibir', command: () => this.openTempDialogFor('P', 'Recibir') },

    ]);
  }

  private openTempDialogFor(status: string, label: string) {
    this.tempActionLabel = label;
    this.tempActionDialogVisible = true;
  }

  products = [
    {
      id: '1000',
      code: 'f230fh0g3',
      name: 'bomba de agua',
      quantity: 1,
    },
  ];

  selectedProducts: any[] = [];

  getSeverity(status: string) {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warn';
      case 'OUTOFSTOCK':
        return 'danger';
    }
    return 'danger';
  }

  onCapturePhoto() {
  }

}
