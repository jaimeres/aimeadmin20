import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from '../services/auth.service';
import { BiometricAuthService } from '../services/biometric-auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-biometric-setup',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    MessageModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="card">
      <h3>Configuración de Autenticación Biométrica</h3>
      
      <div class="flex flex-col gap-4">
        <!-- Estado actual -->
        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4>Estado Actual</h4>
          <div class="flex gap-2 items-center mt-2">
            <i [class]="biometricAvailable ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
            <span>Biometría disponible: {{ biometricAvailable ? 'Sí' : 'No' }}</span>
          </div>
          <div class="flex gap-2 items-center mt-2">
            <i [class]="deviceRegistered ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
            <span>Dispositivo registrado: {{ deviceRegistered ? 'Sí' : 'No' }}</span>
          </div>
          <div *ngIf="biometricInfo" class="mt-2 text-sm text-gray-600">
            <p>Nivel de seguridad: {{ biometricInfo.securityLevel }}</p>
            <p>Registrado: {{ biometricInfo.registeredAt | date:'short' }}</p>
            <p *ngIf="biometricInfo.lastUsedAt">Último uso: {{ biometricInfo.lastUsedAt | date:'short' }}</p>
          </div>
        </div>

        <!-- Disponibilidad de biometría -->
        <p-message 
          *ngIf="!biometricAvailable" 
          severity="warn" 
          text="La autenticación biométrica no está disponible en este dispositivo o plataforma">
        </p-message>

        <!-- Botones de acción -->
        <div class="flex gap-3">
          <p-button
            *ngIf="biometricAvailable && !deviceRegistered"
            label="Configurar Biometría"
            icon="pi pi-fingerprint"
            [loading]="loading"
            (click)="setupBiometric()"
            styleClass="p-button-success">
          </p-button>

          <p-button
            *ngIf="deviceRegistered"
            label="Probar Login Biométrico"
            icon="pi pi-sign-in"
            [loading]="loading"
            (click)="testBiometricLogin()"
            styleClass="p-button-info">
          </p-button>

          <p-button
            *ngIf="deviceRegistered"
            label="Desactivar Biometría"
            icon="pi pi-times"
            [loading]="loading"
            (click)="confirmDisableBiometric()"
            styleClass="p-button-danger p-button-outlined">
          </p-button>
        </div>

        <!-- Información adicional -->
        <div class="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h4>Información</h4>
          <ul class="text-sm mt-2 space-y-1">
            <li>• La autenticación biométrica permite un login más rápido y seguro</li>
            <li>• Se requiere configuración inicial con credenciales tradicionales</li>
            <li>• Funciona con huella dactilar, reconocimiento facial, etc.</li>
            <li>• Los datos biométricos se almacenan de forma segura en el dispositivo</li>
          </ul>
        </div>
      </div>
    </div>

    <p-confirmDialog></p-confirmDialog>
  `
})
export class BiometricSetupComponent implements OnInit {
  biometricAvailable: boolean = false;
  deviceRegistered: boolean = false;
  loading: boolean = false;
  biometricInfo: any = null;

  constructor(
    private authService: AuthService,
    private biometricAuthService: BiometricAuthService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    this.checkBiometricStatus();
  }

  private checkBiometricStatus() {
    // Verificar disponibilidad
    this.biometricAuthService.checkBiometricAvailability().subscribe({
      next: (result) => {
        this.biometricAvailable = result.available;
      },
      error: (error) => {
        console.error('Error checking biometric availability:', error);
        this.biometricAvailable = false;
      }
    });

    // Verificar si el dispositivo está registrado
    const currentUser = this.authService.user;
    if (currentUser?.username) {
      this.deviceRegistered = this.authService.isDeviceRegisteredForBiometric(currentUser.username);
      if (this.deviceRegistered) {
        this.biometricInfo = this.authService.getBiometricInfo(currentUser.username);
      }
    }
  }

  setupBiometric() {
    this.loading = true;
    this.authService.setupBiometricAuth().subscribe({
      next: (success) => {
        if (success) {
          this.checkBiometricStatus(); // Actualizar estado
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Setup failed:', error);
        this.loading = false;
      }
    });
  }

  testBiometricLogin() {
    const currentUser = this.authService.user;
    if (!currentUser?.username) return;

    this.loading = true;
    this.authService.loginWithBiometrics(currentUser.username).subscribe({
      next: (user) => {
        console.log('Biometric login successful:', user);
        this.checkBiometricStatus(); // Actualizar último uso
        this.loading = false;
      },
      error: (error) => {
        console.error('Biometric login failed:', error);
        this.loading = false;
      }
    });
  }

  confirmDisableBiometric() {
    this.confirmationService.confirm({
      message: '¿Está seguro que desea desactivar la autenticación biométrica? Tendrá que volver a configurarla si desea usarla nuevamente.',
      header: 'Confirmar Desactivación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.disableBiometric();
      }
    });
  }

  private disableBiometric() {
    this.loading = true;
    this.authService.disableBiometricAuth().subscribe({
      next: (success) => {
        if (success) {
          this.checkBiometricStatus(); // Actualizar estado
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Disable failed:', error);
        this.loading = false;
      }
    });
  }
}
