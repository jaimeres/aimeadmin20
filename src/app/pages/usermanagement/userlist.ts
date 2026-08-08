import { Component, OnInit, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { PermissionsService } from '../../auth/services/permissions.service';
import { PermissionsTreeComponent } from '../../components/permissions-tree/permissions-tree.component';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { UserManagementService } from './user.service';

// [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
@Component({
  selector: 'user-list',
  standalone: true,
  imports: [ButtonModule, PermissionsTreeComponent, ...PRIME_MODULES, ...LOCAL_BASE],
  templateUrl: './userlist.html',
  styleUrl: './userlist.scss',
  providers: [ConfirmationService],
})
export class UserList extends CRUD implements OnInit {
  private readonly permissionsS = inject(PermissionsService);

  readonly canViewPermissions = this.permissionsS.has$('users.user-permissions.list');
  readonly canEditPermissions = this.permissionsS.has$('users.user-permissions.update');
  readonly userDialogTab = signal('general');

  constructor(crudS: UserManagementService) {
    super(crudS, 'user');
  }

  ngOnInit(): void {
    this.typeDefault = 'user';
    this.app[this.typeDefault] = 'users/local-user';
    this.module[this.typeDefault] = 'U';
    this.initCRUD();
  }

  override onTabChange(value: any): void {
    super.onTabChange(value);
    this.userDialogTab.set(String(value));
  }

  override onHide(app: any = null): void {
    super.onHide(app);
    this.userDialogTab.set('general');
  }

  // [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
  override onShow(app: string = '', dialog: any = null): void {
    super.onShow(app, dialog);
    const forms: any = this.form();
    const userForm = forms?.[this.typeDefault];
    if (!userForm) return;

    // LocalUserSerializer conserva estos datos en PATCH. Se deshabilitan en
    // edición para que el formulario no sugiera una modificación inexistente y
    // para que contraseña/confirmación no bloqueen la validación del CRUD.
    const createOnlyFields = [
      'username', 'email', 'password', 're_password', 'series',
      'default_user_type',
    ];
    for (const field of createOnlyFields) {
      const control = userForm.get(field);
      if (this.isCreate()) control?.enable({ emitEvent: false });
      else control?.disable({ emitEvent: false });
    }
  }
  // ]]]FI

  selectedUserId(): string | null {
    const id = this.selected()?.[0]?.id;
    return id == null ? null : String(id);
  }

  selectedUsername(): string {
    return String(this.selected()?.[0]?.username ?? '');
  }

  openPermissionCatalog(): void {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.router.navigate(['/profile/user', userId, 'permission-catalog'], {
      queryParams: { username: this.selectedUsername() },
    });
  }
}
// ]]]FI
