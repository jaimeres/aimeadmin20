import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-bills',
  imports: [CrudPageShellComponent],
  templateUrl: './bills.component.html',
  styleUrl: './bills.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class BillsComponent extends CRUD implements OnInit {

  // [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01
  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Factura',
    command: () => this.openNew({ pos: 'bill' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Facturas',
    command: () => this.getAll({ pos: 'bill' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'bill');
  }

  ngOnInit(): void {
    this.typeDefault = 'bill';
    this.app[this.typeDefault] = 'purchases/bill';
    this.module[this.typeDefault] = 'CO';

    // [[[II ESC:057-157 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-157
    // Seguimiento de autorización de ESTE documento. Con esto el menú verde
    // ofrece «Autorizar nivel N» cuando hay firmas pendientes; si el tenant no
    // declaró niveles, no hay pendientes y el grupo no aparece.
    this.authorizationTracker['bill'] = {
      app: 'purchases/bill-authorization',
      type: 'bill-authorization',
      field: 'bill',
    };
    // ]]]FI
    this.initCRUD();
  }
  // ]]]FI

}
