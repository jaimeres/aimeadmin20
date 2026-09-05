import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AuthorizationService } from '../services/authorization.service';

/**
 * CRUD del catálogo de autorizaciones, con las TRES posiciones del módulo:
 *
 * - `authorization-level`: la ESCALERA. Un renglón por nivel y por tipo de
 *   documento (`authorization_type`, código de MODULES_CHOICES: CO solicitud,
 *   SPR pedido, NDR remisión, FAC factura). `is_required` decide si el
 *   documento puede liberarse sin ese nivel; `min_amount` a partir de qué monto
 *   aplica; `subsidiary` vacío significa TODAS las sucursales.
 *
 * - `authorization`: QUIÉN puede firmar cada nivel. Sin al menos una
 *   elegibilidad, un nivel existe pero nadie puede resolverlo.
 *
 * [[[II ESC:045-24 DOC:docs/documents/2026-08-01-045-autorizaciones-desacoplar-purchases.md#escenario-24
 * - `purchase-authorization-conditions-user`: la CONDICIÓN DE COMPRAS, que es
 *   el peldaño que faltaba y sin el cual la escalera no se puede subir.
 *
 *   `build_document_authorizations` recorre los niveles aplicables y, dentro de
 *   cada uno, sus CONDICIONES; un nivel sin condición no produce seguimiento
 *   (apps/authorizations/document_rules.py:327). Pero `is_fully_authorized`
 *   lo sigue contando como obligatorio, así que el documento queda pidiendo una
 *   firma que nadie puede dar. Por eso este recurso no es un catálogo opcional:
 *   es el que hace firmable un nivel.
 *
 *   Se administra AQUÍ porque es el mismo oficio —configurar el flujo—, pero el
 *   recurso NO es transversal: vive en `purchases` porque cada módulo hereda su
 *   propia tabla de `BaseAuthorizationConditionsUser` y le agrega sus campos de
 *   dominio (apps/assets agrega `workshop`). Cuando otro módulo necesite
 *   administrar las suyas, se suma su posición aquí, no se generaliza ésta.
 * ]]]FI
 *
 * El servidor exige que la escalera sea contigua: el nivel 1 no tiene padre y
 * cualquier nivel mayor apunta a su INMEDIATO anterior dentro del mismo tipo.
 * Esa regla la valida `AuthorizationLevel.save()`, así que aquí no se duplica.
 */
@Component({
  selector: 'app-authorization-levels',
  imports: [CrudPageShellComponent],
  templateUrl: './authorization-levels.component.html',
  styleUrl: './authorization-levels.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AuthorizationLevelsComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Nivel de autorización',
    command: () => this.openNew({ pos: 'authorization-level' })
  }, {
    label: 'Quién autoriza',
    command: () => this.openNew({ pos: 'authorization' })
  }, {
    // [[[II ESC:045-24 ]]]FI
    label: 'Condición de compras',
    command: () => this.openNew({ pos: 'purchase-authorization-conditions-user' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Niveles de autorización',
    command: () => this.getAll({ pos: 'authorization-level' })
  }, {
    label: 'Quién autoriza',
    command: () => this.getAll({ pos: 'authorization' })
  }, {
    // [[[II ESC:045-24 ]]]FI
    label: 'Condiciones de compras',
    command: () => this.getAll({ pos: 'purchase-authorization-conditions-user' })
  }]);

  constructor(crudS: AuthorizationService) {
    super(crudS, 'authorization-level');
  }

  ngOnInit(): void {
    this.typeDefault = 'authorization-level';
    this.app[this.typeDefault] = 'authorizations/authorization-level';
    this.module[this.typeDefault] = 'AZ';

    this.app['authorization'] = 'authorizations/authorization';
    this.module['authorization'] = 'AZ';

    // [[[II ESC:045-24 DOC:docs/documents/2026-08-01-045-autorizaciones-desacoplar-purchases.md#escenario-24
    // La condición vive en COMPRAS: su ruta es `purchases/...` y su módulo de
    // permisos es `CO` (`app_custom` de
    // apps/purchases/views/authorization.py:53), no `AZ` como el catálogo
    // transversal. Declararla con `AZ` pediría el bit equivocado.
    this.app['purchase-authorization-conditions-user'] =
      'purchases/purchase-authorization-conditions-user';
    this.module['purchase-authorization-conditions-user'] = 'CO';
    // ]]]FI

    this.initCRUD();
  }

}
