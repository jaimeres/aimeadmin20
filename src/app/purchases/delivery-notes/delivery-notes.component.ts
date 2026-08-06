import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
// [[[II ESC:054-02 DOC:docs/documents/2026-08-05-054-configuracion-por-documento.md#escenario-02
// Documento con documento INFERIOR: hereda el motor de conversión, que no
// carga el resto del sistema.
import { ConversionCRUD } from '../../utils/conversion-crud.class';
// ]]]FI
import { PurchaseService } from '../services/purchase.service';

@Component({
  selector: 'app-delivery-notes',
  imports: [CrudPageShellComponent],
  templateUrl: './delivery-notes.component.html',
  styleUrl: './delivery-notes.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class DeliveryNotesComponent extends ConversionCRUD implements OnInit {

  // [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01
  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Remisión',
    command: () => this.openNew({ pos: 'delivery-note' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Remisiones',
    command: () => this.getAll({ pos: 'delivery-note' })
  }]);

  constructor(crudS: PurchaseService) {
    super(crudS, 'delivery-note');
  }

  ngOnInit(): void {
    this.typeDefault = 'delivery-note';
    this.app[this.typeDefault] = 'purchases/delivery-note';
    this.module[this.typeDefault] = 'CO';
    this.initCRUD();
  }
  // ]]]FI

}
