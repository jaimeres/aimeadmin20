import { Injectable } from '@angular/core';

import { CRUDService } from '../../utils/services/crud.service';

// [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
/** Servicio CRUD del recurso local-user; el contrato de campos sigue viniendo de configuración. */
@Injectable({ providedIn: 'root' })
export class UserManagementService extends CRUDService {}
// ]]]FI
