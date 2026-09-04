import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

/**
 * Servicio del módulo de autorizaciones.
 *
 * Cubre dos cosas distintas y a propósito separadas:
 *
 * - el CATÁLOGO transversal (`authorization-level`, `authorization`), que vive
 *   en `authorizations` porque los niveles se declaran por `authorization_type`
 *   —un código de MODULES_CHOICES—, así que el mismo catálogo sirve a compras,
 *   a mantenimiento o a cualquier módulo que declare los suyos;
 *
 * - los SEGUIMIENTOS por documento, que viven en el módulo dueño del documento
 *   (`purchases/...-authorization`) porque la firma pertenece al documento, no
 *   al catálogo. Por eso son cuatro recursos y no uno: no hay una bandeja
 *   universal de autorizaciones, hay las autorizaciones DE cada documento.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthorizationService extends CRUDService {

  constructor() {
    super();

    this.customField.set({
      // Catálogo transversal
      'authorization-level': this.authS.config['authorization-level']?.cols ?? {},
      'authorization': this.authS.config['authorization']?.cols ?? {},
      // Seguimientos por documento de compras
      'request-authorization': this.authS.config['request-authorization']?.cols ?? {},
      'supplier-request-authorization': this.authS.config['supplier-request-authorization']?.cols ?? {},
      'delivery-note-authorization': this.authS.config['delivery-note-authorization']?.cols ?? {},
      'bill-authorization': this.authS.config['bill-authorization']?.cols ?? {},
    });
  }
}
