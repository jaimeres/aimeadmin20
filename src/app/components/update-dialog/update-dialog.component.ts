import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { UpdateCheckResult } from '../../utils/services/update.service';

@Component({
  selector: 'app-update-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    MessageModule,
    ProgressBarModule
  ],
  template: `
    <p-dialog 
      [(visible)]="visible" 
      [modal]="true" 
      [closable]="!updateResult?.forced"
      [draggable]="false"
      [resizable]="false"
      styleClass="update-dialog"
      header="{{getDialogTitle()}}"
      [style]="{ width: '90vw', maxWidth: '500px' }">
      
      <div class="update-dialog-content">
        <!-- Icono de estado -->
        <div class="text-center mb-4">
          <i [class]="getStatusIcon()" 
             [style.color]="getStatusColor()" 
             style="font-size: 4rem;"></i>
        </div>

        <!-- Mensaje principal -->
        <p-message 
          [severity]="getMessageSeverity()" 
          [text]="updateResult?.message || getDefaultMessage()"
          styleClass="mb-4 w-full">
        </p-message>

        <!-- Información de versión -->
        <div class="version-info mb-4 p-3 border-round surface-100" 
             *ngIf="updateResult?.versionName">
          <div class="flex justify-content-between align-items-center mb-2">
            <span class="font-medium">Versión actual:</span>
            <span class="text-600">{{ currentVersion }}</span>
          </div>
          <div class="flex justify-content-between align-items-center">
            <span class="font-medium">Nueva versión:</span>
            <span class="text-primary font-bold">{{ updateResult?.versionName }}</span>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="additional-info mb-4" *ngIf="showAdditionalInfo()">
          
          <!-- Deadline -->
          <div class="deadline-warning mb-3" 
               *ngIf="updateResult?.deadline && updateResult?.forced">
            <p-message 
              severity="warn" 
              text="{{getDeadlineMessage()}}"
              styleClass="w-full">
            </p-message>
          </div>

          <!-- Estado offline -->
          <div class="offline-info mb-3" *ngIf="isOffline && updateResult?.canSkipOffline">
            <p-message 
              severity="info" 
              text="Sin conexión a internet. Puedes usar la app temporalmente."
              styleClass="w-full">
            </p-message>
          </div>

          <!-- Mantenimiento -->
          <div class="maintenance-info mb-3" *ngIf="updateResult?.isMaintenance">
            <p-message 
              severity="error" 
              text="La aplicación está en mantenimiento. La actualización es obligatoria."
              styleClass="w-full">
            </p-message>
          </div>

          <!-- Changelog -->
          <div class="changelog-info mb-3" 
               *ngIf="updateResult?.changelogUrl && !updateResult?.forced">
            <a [href]="updateResult?.changelogUrl" 
               target="_blank" 
               class="text-primary text-sm">
              <i class="pi pi-external-link mr-1"></i>
              Ver detalles de los cambios
            </a>
          </div>
        </div>

        <!-- Progreso de descarga (para uso futuro) -->
        <div class="download-progress mb-4" *ngIf="downloadProgress > 0">
          <div class="flex justify-content-between align-items-center mb-2">
            <span class="font-medium">Descargando actualización...</span>
            <span class="text-sm text-600">{{ downloadProgress }}%</span>
          </div>
          <p-progressBar [value]="downloadProgress"></p-progressBar>
        </div>
      </div>

      <!-- Botones de acción -->
      <ng-template pTemplate="footer">
        <div class="update-dialog-footer">
          
          <!-- Actualización forzada -->
          <div *ngIf="updateResult?.forced" class="flex justify-content-center w-full">
            <p-button 
              label="Actualizar Ahora" 
              icon="pi pi-download"
              [loading]="isDownloading"
              (click)="onUpdateClick()"
              styleClass="p-button-lg p-button-danger w-full">
            </p-button>
          </div>

          <!-- Actualización opcional -->
          <div *ngIf="!updateResult?.forced" class="flex gap-2 w-full">
            
            <!-- Botón Después (solo si no es offline o puede saltarse) -->
            <p-button 
              *ngIf="!isOffline || updateResult?.canSkipOffline"
              label="Después" 
              icon="pi pi-clock"
              [disabled]="isDownloading"
              (click)="onLaterClick()"
              styleClass="p-button-outlined flex-1">
            </p-button>

            <!-- Botón Actualizar -->
            <p-button 
              label="Actualizar" 
              icon="pi pi-download"
              [loading]="isDownloading"
              (click)="onUpdateClick()"
              styleClass="p-button-primary flex-1">
            </p-button>
          </div>

          <!-- Botón de emergencia (solo offline con posibilidad de saltar) -->
          <div *ngIf="isOffline && updateResult?.canSkipOffline && updateResult?.forced" 
               class="flex justify-content-center w-full mt-3">
            <p-button 
              label="Usar sin actualizar (Solo offline)" 
              icon="pi pi-wifi"
              severity="secondary"
              size="small"
              [disabled]="isDownloading"
              (click)="onSkipOfflineClick()"
              styleClass="p-button-text">
            </p-button>
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .update-dialog .p-dialog-header {
      text-align: center;
      padding: 1.5rem 2rem 1rem;
    }
    
    :host ::ng-deep .update-dialog .p-dialog-content {
      padding: 0 2rem 1.5rem;
    }
    
    :host ::ng-deep .update-dialog .p-dialog-footer {
      padding: 1rem 2rem 1.5rem;
      border-top: 1px solid var(--surface-200);
    }

    .update-dialog-content {
      min-height: 200px;
    }

    .version-info {
      border: 1px solid var(--surface-300);
    }

    .update-dialog-footer {
      width: 100%;
    }

    :host ::ng-deep .p-button-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1.1rem;
    }

    .additional-info {
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      :host ::ng-deep .update-dialog {
        margin: 1rem;
      }
      
      :host ::ng-deep .update-dialog .p-dialog-header,
      :host ::ng-deep .update-dialog .p-dialog-content,
      :host ::ng-deep .update-dialog .p-dialog-footer {
        padding-left: 1rem;
        padding-right: 1rem;
      }
    }
  `]
})
export class UpdateDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() updateResult: UpdateCheckResult | null = null;
  @Input() currentVersion: string = '';
  @Input() isOffline: boolean = false;
  @Input() downloadProgress: number = 0;
  @Input() isDownloading: boolean = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updateClicked = new EventEmitter<void>();
  @Output() laterClicked = new EventEmitter<void>();
  @Output() skipOfflineClicked = new EventEmitter<void>();

  ngOnInit() {
    // Configuración inicial si es necesaria
  }

  getDialogTitle(): string {
    if (!this.updateResult) return 'Actualización';

    if (this.updateResult.isMaintenance) return 'Mantenimiento Programado';
    if (this.updateResult.isBlocked) return 'Versión Bloqueada';
    if (this.updateResult.forced) return 'Actualización Obligatoria';

    return 'Actualización Disponible';
  }

  getStatusIcon(): string {
    if (!this.updateResult) return 'pi pi-info-circle';

    if (this.updateResult.isMaintenance || this.updateResult.isBlocked) {
      return 'pi pi-exclamation-triangle';
    }
    if (this.updateResult.forced) {
      return 'pi pi-exclamation-circle';
    }

    return 'pi pi-download';
  }

  getStatusColor(): string {
    if (!this.updateResult) return 'var(--blue-500)';

    if (this.updateResult.isMaintenance || this.updateResult.isBlocked) {
      return 'var(--red-500)';
    }
    if (this.updateResult.forced) {
      return 'var(--orange-500)';
    }

    return 'var(--green-500)';
  }

  getMessageSeverity(): string {
    if (!this.updateResult) return 'info';

    if (this.updateResult.isMaintenance || this.updateResult.isBlocked) {
      return 'error';
    }
    if (this.updateResult.forced) {
      return 'warn';
    }

    return 'info';
  }

  getDefaultMessage(): string {
    if (!this.updateResult) return 'Verificando actualizaciones...';

    if (this.updateResult.forced) {
      return 'Esta actualización es obligatoria para continuar usando la aplicación.';
    }

    return 'Una nueva versión está disponible con mejoras y correcciones.';
  }

  getDeadlineMessage(): string {
    if (!this.updateResult?.deadline) return '';

    const deadline = new Date(this.updateResult.deadline);
    const now = new Date();
    const isExpired = now > deadline;

    if (isExpired) {
      return `La fecha límite para actualizar ha vencido (${deadline.toLocaleDateString()}).`;
    }

    const hoursLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft <= 24) {
      return `Tienes ${hoursLeft} horas para actualizar antes del bloqueo.`;
    }

    const daysLeft = Math.ceil(hoursLeft / 24);
    return `Tienes ${daysLeft} días para actualizar antes del bloqueo.`;
  }

  showAdditionalInfo(): boolean {
    return !!(
      this.updateResult?.deadline ||
      (this.isOffline && this.updateResult?.canSkipOffline) ||
      this.updateResult?.isMaintenance ||
      this.updateResult?.changelogUrl
    );
  }

  onUpdateClick(): void {
    this.updateClicked.emit();
  }

  onLaterClick(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.laterClicked.emit();
  }

  onSkipOfflineClick(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.skipOfflineClicked.emit();
  }
}
