import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UpdateManagerService } from '../utils/services/update-manager.service';

/**
 * Guard que bloquea navegación cuando hay actualizaciones críticas pendientes
 * 
 * Uso en routes:
 * {
 *   path: 'protected-route',
 *   component: ProtectedComponent,
 *   canActivate: [UpdateGuard]
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class UpdateGuard implements CanActivate {

  constructor(
    private updateManager: UpdateManagerService,
    private router: Router
  ) { }

  async canActivate(): Promise<boolean> {

    // Verificar si hay actualización crítica pendiente
    if (this.updateManager.hasCriticalUpdate()) {

      // Mostrar el diálogo de actualización si no está visible
      this.updateManager.showUpdateDialog();

      // Bloquear navegación
      return false;
    }

    // Permitir navegación normal
    return true;
  }
}
