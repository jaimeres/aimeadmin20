import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AuthorizationService } from '../services/authorization.service';

/**
 * Autorizaciones de los documentos de compras.
 *
 * NO es una bandeja universal: son CUATRO posiciones, una por documento, porque
 * la firma pertenece al documento y cada módulo guarda las suyas. Verlas juntas
 * en una sola lista daría a entender que existe un recurso único de
 * autorizaciones, y no lo hay.
 *
 * Se usa el CRUD estándar y no una pantalla propia porque los cuatro recursos
 * YA están configurados —con sus columnas, su formulario y hasta los campos
 * `username` y `password` que exige la firma—, así que no hay nada que
 * reimplementar: firmar es editar el registro y poner `authorization_status`.
 *
 * Lo que decide el SERVIDOR y esta pantalla no replica:
 * - el orden de la escalera (un nivel no se firma si su anterior sigue
 *   pendiente), en `apps/authorizations/resolution_services.py`;
 * - la exigencia de contraseña cuando firma el propio usuario de la sesión
 *   (`require_self_credential`), en `apps/authorizations/credential_services.py`;
 * - la evidencia obligatoria cuando el nivel la pide (`requires_evidence`).
 */
@Component({
  selector: 'app-approvals',
  imports: [CrudPageShellComponent],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ApprovalsComponent extends CRUD implements OnInit {

  // Las firmas no se dan de alta a mano: las materializa el servidor al guardar
  // el documento (`build_document_authorizations`). Por eso el menú de alta
  // queda vacío y sólo se ofrece consultar.
  public override openNewMenu = signal<MenuItem[]>([]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Autorizaciones de solicitudes',
    command: () => this.getAll({ pos: 'request-authorization' })
  }, {
    label: 'Autorizaciones de pedidos',
    command: () => this.getAll({ pos: 'supplier-request-authorization' })
  }, {
    label: 'Autorizaciones de remisiones',
    command: () => this.getAll({ pos: 'delivery-note-authorization' })
  }, {
    label: 'Autorizaciones de facturas',
    command: () => this.getAll({ pos: 'bill-authorization' })
  }]);

  constructor(crudS: AuthorizationService) {
    super(crudS, 'request-authorization');
  }

  ngOnInit(): void {
    this.typeDefault = 'request-authorization';
    this.app[this.typeDefault] = 'purchases/request-authorization';
    this.module[this.typeDefault] = 'CO';

    this.app['supplier-request-authorization'] = 'purchases/supplier-request-authorization';
    this.module['supplier-request-authorization'] = 'CO';

    this.app['delivery-note-authorization'] = 'purchases/delivery-note-authorization';
    this.module['delivery-note-authorization'] = 'CO';

    this.app['bill-authorization'] = 'purchases/bill-authorization';
    this.module['bill-authorization'] = 'CO';

    this.initCRUD();
  }

}
