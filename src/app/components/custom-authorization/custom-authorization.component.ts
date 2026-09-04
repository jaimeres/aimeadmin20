import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

/**
 * Diálogo para firmar una autorización desde el botón verde de acciones.
 *
 * Es un componente propio y no marcado dentro del shell porque las pantallas de
 * PEDIDO y de SOLICITUD tienen plantilla propia y no usan `app-crud-page-shell`;
 * el diálogo tiene que estar en las tres sin escribirlo tres veces.
 *
 * Todo el estado vive en la clase `CRUD` —`authorizationRows`,
 * `authorizationTarget`, `authorizationDialogVisible`…— porque es la que ya
 * conoce el documento seleccionado y su seguimiento. Aquí sólo se dibuja.
 *
 * El USUARIO es opcional y la CONTRASEÑA no. Son los dos escenarios que resuelve
 * `resolve_approver` en `apps/authorizations/credential_services.py:36`:
 * con usuario vacío firma quien tiene la sesión abierta y se le pide su propia
 * contraseña; con usuario lleno firma otra persona y se validan sus credenciales.
 */
@Component({
  selector: 'app-custom-authorization',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule],
  template: `
  <p-dialog
    [(visible)]="crud.authorizationDialogVisible"
    [modal]="true"
    [style]="{ width: '32rem' }"
    header="Autorizar"
  >
    <div class="flex flex-col gap-3">
      <div class="text-sm">
        <div class="font-medium">Nivel {{ crud.authorizationTarget()?.level }}</div>
        <small class="text-muted-color">
          Un nivel no se puede firmar mientras su anterior siga pendiente.
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <span class="font-medium text-sm">Niveles del documento</span>
        @for (fila of crud.authorizationRows(); track fila.id) {
          <div class="flex justify-between text-sm py-1 border-b border-surface-200">
            <span>Nivel {{ fila.level }}</span>
            <span [class.text-green-600]="fila.authorization_status === 'A'"
                  [class.text-red-600]="fila.authorization_status === 'R'">
              {{ fila.authorization_status === 'A' ? 'Aprobado'
                 : fila.authorization_status === 'R' ? 'Rechazado'
                 : fila.authorization_status === 'D' ? 'Desautorizado' : 'Pendiente' }}
            </span>
          </div>
        }
      </div>

      <div class="flex flex-col gap-1">
        <label for="aut-comentario">Comentario</label>
        <textarea pTextarea id="aut-comentario" rows="2" [autoResize]="true"
                  [(ngModel)]="crud.authorizationComment"
                  placeholder="Opcional; queda guardado con la firma."></textarea>
      </div>

      <div class="flex flex-col gap-1">
        <label for="aut-usuario">Usuario autorizador</label>
        <input pInputText id="aut-usuario" [(ngModel)]="crud.authorizationUsername"
               autocomplete="off"
               placeholder="Déjelo vacío para autorizar usted mismo" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="aut-password">Contraseña</label>
        <input pInputText id="aut-password" type="password"
               [(ngModel)]="crud.authorizationPassword" autocomplete="new-password" />
      </div>
    </div>

    <ng-template #footer>
      <p-button label="Cancelar" severity="secondary" [text]="true"
                (onClick)="crud.authorizationDialogVisible = false" />
      <p-button label="Rechazar" severity="danger" [outlined]="true"
                [loading]="crud.authorizationSending()"
                (onClick)="crud.resolveAuthorization('R')" />
      <p-button label="Autorizar" severity="success"
                [loading]="crud.authorizationSending()"
                (onClick)="crud.resolveAuthorization('A')" />
    </ng-template>
  </p-dialog>
  `,
})
export class CustomAuthorizationComponent {
  /** Instancia de `CRUD` de la pantalla; de ahí sale y ahí vuelve todo el estado. */
  @Input({ required: true }) crud!: any;
}
