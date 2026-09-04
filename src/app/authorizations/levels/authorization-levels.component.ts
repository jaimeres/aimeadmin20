import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { AuthorizationService } from '../services/authorization.service';

/**
 * CRUD del catálogo de autorizaciones, con las DOS posiciones del módulo:
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
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Niveles de autorización',
    command: () => this.getAll({ pos: 'authorization-level' })
  }, {
    label: 'Quién autoriza',
    command: () => this.getAll({ pos: 'authorization' })
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

    this.initCRUD();
  }

}
