import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
// [[[II ESC:054-02 DOC:docs/documents/2026-08-05-054-configuracion-por-documento.md#escenario-02
// Documento con documento INFERIOR: hereda el motor de conversión, que no
// carga el resto del sistema.
import { ConversionCRUD } from '../../utils/conversion-crud.class';
// ]]]FI
// [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
// Se importa aquí y NO en `LOCAL_BASE`: la tira de documentos origen sólo tiene
// sentido en un documento que se alimenta de otro, y `LOCAL_BASE` lo carga todo
// el sistema. Mismo criterio con el que `ConversionCRUD` vive fuera de `CRUD`.
import { CustomSourceDocumentsComponent }
  from '../../components/custom-source-documents/custom-source-documents.component';
// ]]]FI
import { PurchaseService } from '../services/purchase.service';
// [[[II ESC:057-157 Diálogo de firma; esta pantalla no usa el shell. ]]]FI
import { CustomAuthorizationComponent }
  from '../../components/custom-authorization/custom-authorization.component';
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
    CustomAuthorizationComponent,
    ...PRIME_MODULES,
    CustomSourceDocumentsComponent,
  ],
  templateUrl: './supplier-request.component.html',
  styleUrl: './supplier-request.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class SupplierRequestComponent extends ConversionCRUD implements OnInit {

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

    // [[[II ESC:057-157 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-157
    // Seguimiento de autorización de ESTE documento. Con esto el menú verde
    // ofrece «Autorizar nivel N» cuando hay firmas pendientes; si el tenant no
    // declaró niveles, no hay pendientes y el grupo no aparece.
    this.authorizationTracker['supplier-request'] = {
      app: 'purchases/supplier-request-authorization',
      type: 'supplier-request-authorization',
      field: 'supplier_request',
    };
    // ]]]FI
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
