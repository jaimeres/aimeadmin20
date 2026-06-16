import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { DividerModule } from 'primeng/divider';
import { AppConfigurator } from '@/layout/components/app.configurator';
import { AuthService } from '../../auth/services/auth.service';
import { MessageService } from '../../components/services/message.service';
import { CookieService } from 'ngx-cookie-service';
import { MessageComponent } from '../../components/message/message.component';
import { MessageService as MessagePrimeS } from 'primeng/api';
import { BlockUIModule } from 'primeng/blockui';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-login-enhanced',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule,
    FormsModule, ReactiveFormsModule, RouterModule, RippleModule, InputIcon,
    IconField, DividerModule, AppConfigurator, MessageComponent, BlockUIModule, SkeletonModule
  ],
  providers: [MessagePrimeS],
  template: `
    <form [formGroup]="loginForm" class="min-h-screen flex flex-col bg-cover"
      [style]="{ backgroundImage: 'url(/images/pages/login-bg.jpg)' }" novalidate>
    
      <div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/login-bg.jpg)' }">
        <div class="self-center mt-auto mb-auto">
          <div class="text-center z-50 flex flex-col border rounded-md border-surface bg-surface-0 dark:bg-surface-900 p-12">
            <span class="text-2xl font-semibold">Bienvenido</span>
            <div class="text-muted-color mb-6 px-12"></div>

            <!-- Autenticación Biométrica (Solo móvil y si está disponible) -->
            <div *ngIf="showBiometricOption && !blockedDocument" class="w-full flex flex-col gap-4 px-4 mb-6">
              <div class="flex flex-col items-center gap-3">
                <i class="pi pi-fingerprint text-4xl text-primary-500"></i>
                <p class="text-sm text-muted-color text-center">Usa tu huella dactilar o reconocimiento facial para acceder rápidamente</p>
              </div>
              
              <button 
                pButton 
                pRipple 
                (click)="loginWithBiometrics()" 
                [loading]="biometricLoading"
                class="w-full p-button-outlined p-button-primary"
                label="Acceder con Biometría"
                icon="pi pi-fingerprint">
              </button>

              <p-divider align="center">
                <span class="text-sm text-muted-color px-2">o usa tu contraseña</span>
              </p-divider>
            </div>

            <!-- Formulario tradicional -->
            <div class="w-full flex flex-col gap-4 px-4" *ngIf="!blockedDocument">
              <p-icon-field>
                <p-inputicon class="pi pi-envelope" />
                <input pInputText class="w-full" placeholder="Usuario" formControlName="username" />
              </p-icon-field>

              <p-icon-field>
                <p-inputicon class="pi pi-key" />
                <p-password formControlName="password" placeholder="Contraseña" [toggleMask]="true" />
              </p-icon-field>
              
              <!-- Checkbox para activar biometría después del login -->
              <div *ngIf="showBiometricSetupOption" class="flex align-items-center">
                <p-checkbox 
                  [(ngModel)]="setupBiometricAfterLogin" 
                  [ngModelOptions]="{standalone: true}"
                  inputId="setup-biometric"
                  binary="true">
                </p-checkbox>
                <label for="setup-biometric" class="ml-2 text-sm">
                  Configurar acceso biométrico para futuros inicios de sesión
                </label>
              </div>
              
              <button 
                pButton 
                pRipple 
                (click)="login()" 
                [loading]="tradLoading"
                class="w-full mt-4 px-4" 
                label="Iniciar sesión">
              </button>
            </div>

            <!-- Loading skeleton -->
            <div class="card" *ngIf="blockedDocument">
              <div class="rounded border border-surface-200 dark:border-surface-700 p-6 bg-surface-0 dark:bg-surface-900">
                <div class="flex mb-4">
                  <p-skeleton shape="circle" size="4rem" class="mr-2" />
                  <div>
                    <p-skeleton width="10rem" class="mb-2" />
                    <p-skeleton width="5rem" class="mb-2" />
                    <p-skeleton height=".5rem" />
                  </div>
                </div>
                <p-skeleton width="100%" height="150px" />
                <div class="flex justify-between mt-4">
                  <p-skeleton width="4rem" height="2rem" />
                  <p-skeleton width="4rem" height="2rem" />
                </div>
              </div>
            </div>

            <!-- Links adicionales -->
            <div class="flex flex-col items-center mt-4 gap-2" *ngIf="!blockedDocument">
              <a routerLink="/auth/forgotpassword" class="text-primary-600 hover:underline">¿Olvidaste tu contraseña?</a>
              <a routerLink="/auth/register" class="text-primary-600 hover:underline">¿No tienes cuenta? Regístrate</a>
            </div>
            
            <div *ngIf="!blockedDocument">
              <button [routerLink]="'/'" pButton pRipple class="w-full text-primary-500" text label="VOLVER AL INICIO"></button>
            </div>
          </div>
        </div>
      </div>
    </form>
    
    <app-message />
    <app-configurator simple />
  `
})
export class LoginEnhanced implements OnInit {

  public blockedDocument = false;
  public loginForm;
  public biometricLoading = false;
  public tradLoading = false;
  public showBiometricOption = false;
  public showBiometricSetupOption = false;
  public setupBiometricAfterLogin = false;

  constructor(
    private fb: FormBuilder,
    private authS: AuthService,
    private router: Router,
    private messageS: MessageService,
    private cookieS: CookieService
  ) {
    this.loginForm = this.fb.group({
      password: ["", [Validators.required]],
      username: ["", [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
    this.checkBiometricAvailability();
  }

  private async checkBiometricAvailability() {
    try {
      // Verificar si la biometría está disponible
      const available = await this.authS.isBiometricAvailable().toPromise();

      if (available) {
        // Mostrar opción de login biométrico si está configurado
        this.showBiometricOption = true;
      } else {
        // Verificar si podemos configurar biometría (disponible pero no configurado)
        this.authS.biometricAuthS.checkBiometricAvailability().subscribe({
          next: (result) => {
            this.showBiometricSetupOption = result.available;
          },
          error: (error) => {
            console.log('Biometric check failed:', error);
          }
        });
      }
    } catch (error) {
      console.log('Biometric availability check failed:', error);
    }
  }

  async loginWithBiometrics() {
    this.biometricLoading = true;
    this.blockedDocument = true;

    try {
      const user = await this.authS.loginWithBiometrics().toPromise();

      if (user) {
        this.messageS.changeMessage('¡Acceso biométrico exitoso!', null, {}, 'success');

        // Verificar si el usuario tiene ERP activo (mismo flujo que login tradicional)
        const currentUser = this.authS.user() as any;
        if (currentUser?.erp?.is_active_ERP) {
          this.cookieS.delete('configuration');
          // [[[II ESC:001-05 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-05
          const lastUrl = this.authS.normalizeLastModuleUrl(localStorage.getItem('lastModuleUrl'));
          this.router.navigateByUrl(lastUrl);
          // ]]]FI
        } else {
          this.authS.redirectMP();
        }
      }
    } catch (error: any) {
      console.error('Biometric login failed:', error);
      this.messageS.changeMessage('Error en autenticación biométrica. Usa tu contraseña.', error, {}, 'warn');
      this.biometricLoading = false;
      this.blockedDocument = false;
    }
  }

  login() {
    this.tradLoading = true;
    this.blockedDocument = true;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageS.changeMessage('Revise los campos marcados en rojo.');
      this.tradLoading = false;
      this.blockedDocument = false;
      return;
    }

    const username = this.loginForm.get('username')?.value || '';
    const password = this.loginForm.get('password')?.value || '';

    this.authS.login({ username, password }).subscribe({
      next: (resp: any) => {
        // Si el login fue exitoso y el usuario marcó configurar biometría
        if (this.setupBiometricAfterLogin && this.showBiometricSetupOption) {
          this.setupBiometricAuth(username);
        }

        // Navegación normal
        if (resp.erp.is_active_ERP) {
          this.cookieS.delete('configuration');
          // [[[II ESC:001-05 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-05
          const lastUrl = this.authS.normalizeLastModuleUrl(localStorage.getItem('lastModuleUrl'));
          this.router.navigateByUrl(lastUrl);
          // ]]]FI
        } else {
          this.authS.redirectMP();
        }
      },
      error: (e: any) => {
        this.tradLoading = false;
        this.blockedDocument = false;
        this.messageS.changeMessage('', e);
      }
    });
  }

  private setupBiometricAuth(username: string) {
    // Configurar biometría en segundo plano (no bloquear navegación)
    this.authS.setupBiometricAuth().subscribe({
      next: (success) => {
        if (success) {
          this.messageS.changeMessage(
            '¡Autenticación biométrica configurada! Podrás usarla en el próximo inicio de sesión.',
            null,
            {},
            'success'
          );
        }
      },
      error: (error) => {
        console.warn('Biometric setup failed after login:', error);
        // No mostrar error al usuario ya que el login fue exitoso
      }
    });
  }
}
