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
import { AppConfigurator } from '@/layout/components/app.configurator';
import { AuthService } from '../../auth/services/auth.service';
import { MessageService } from '../../components/services/message.service';
import { CookieService } from 'ngx-cookie-service';
import { MessageComponent } from '../../components/message/message.component';
import { MessageService as MessagePrimeS } from 'primeng/api';
import { BlockUIModule } from 'primeng/blockui';
import { SkeletonModule } from 'primeng/skeleton';
// [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07
import { NetworkStatusService } from '../../utils/services/network-status.service';
import { resolveLoginErrorMessage } from '../../auth/utils/login-error.util';
// ]]]FI

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule,
    ReactiveFormsModule, RouterModule, RippleModule, InputIcon, IconField, AppConfigurator, MessageComponent,
    BlockUIModule, SkeletonModule],
  providers: [MessagePrimeS],
  template: `
    <form [formGroup]="loginForm" class="min-h-screen flex flex-col bg-cover"
      [style]="{ backgroundImage: 'url(/images/pages/login-bg.jpg)' }" novalidate>
    
      <div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/login-bg.jpg)' }">
        <div class="self-center mt-auto mb-auto">
          <div
            class="text-center z-50 flex flex-col border rounded-md border-surface bg-surface-0 dark:bg-surface-900 p-12">
            <span class="text-2xl font-semibold">Bienvenido</span>
            <div class="text-muted-color mb-12 px-12"></div>

            <!-- [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01 -->
            <div *ngIf="showBiometricOption && !blockedDocument" class="w-full flex flex-col gap-4 px-4 mb-6">
              <button
                pButton
                pRipple
                type="button"
                (click)="loginWithBiometrics()"
                [loading]="biometricLoading"
                class="w-full p-button-outlined p-button-primary"
                label="Acceder con biometria"
                icon="pi pi-fingerprint">
              </button>
            </div>
            <!-- ]]]FI -->

            <div class="w-full flex flex-col gap-4 px-4" *ngIf="!blockedDocument">
              <p-icon-field class="w-full">
                <p-inputicon class="pi pi-envelope" />
                <input pInputText type="email" class="w-full" placeholder="Usuario" formControlName="username" />
              </p-icon-field>

              <p-icon-field class="w-full">
                <p-inputicon class="pi pi-key" />
                <!--<input pInputText type="password" formControlName="password" class="w-full" placeholder="Contraseña" />-->
                <p-password formControlName="password" placeholder="contraseña" [toggleMask]="true" [feedback]="false"
                  inputStyleClass="w-full" styleClass="w-full" class="w-full" />
              </p-icon-field>

              <!-- [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01 -->
              <div *ngIf="showBiometricSetupOption" class="w-full flex items-center gap-2 text-left">
                <p-checkbox
                  [(ngModel)]="setupBiometricAfterLogin"
                  [ngModelOptions]="{standalone: true}"
                  inputId="setup-biometric"
                  class="flex-none"
                  binary="true">
                </p-checkbox>
                <label for="setup-biometric" class="m-0 text-sm leading-tight">
                  Activar acceso con huella, rostro o PIN del equipo
                </label>
              </div>
              <!-- ]]]FI -->

              <button pButton pRipple (click)="login()" class="w-full mt-4 px-4" label="Iniciar sesión"></button>
            </div>

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


              <div class="flex flex-col items-center mt-4 gap-2">
                <a routerLink="/auth/forgotpassword" class="text-primary-600 hover:underline">¿Olvidaste tu contraseña?</a>
                <a routerLink="/auth/register" class="text-primary-600 hover:underline">¿No tienes cuenta? Regístrate</a>
              </div>
              <div>
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
export class Login implements OnInit {

  public blockedDocument = false;
  public loginForm;
  // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
  public biometricLoading = false;
  public showBiometricOption = false;
  public showBiometricSetupOption = false;
  public setupBiometricAfterLogin = false;
  // ]]]FI
  // [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07
  private networkStatusS = inject(NetworkStatusService);
  // ]]]FI

  constructor(private fb: FormBuilder, private authS: AuthService, private router: Router, private messageS: MessageService,
    private cookieS: CookieService) {
    this.loginForm = this.fb.group({
      password: ["", [Validators.required]],
      username: ["", [Validators.required, Validators.email]],
    });
  }

  // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
  ngOnInit() {
    this.checkBiometricAvailability();
  }

  private async checkBiometricAvailability() {
    try {
      const available = await this.authS.isBiometricAvailable().toPromise();

      if (available) {
        this.showBiometricOption = true;
        return;
      }

      this.authS.biometricAuthS.checkBiometricAvailability().subscribe({
        next: (result) => {
          this.showBiometricSetupOption = result.available;
        },
        error: (error) => {
          console.log('Biometric check failed:', error);
        }
      });
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
        this.messageS.changeMessage('Acceso seguro exitoso', null, {}, 'success');
        const currentUser = this.authS.user() as any;
        if (currentUser?.erp?.is_active_ERP) {
          this.cookieS.delete('configuration');
          // ]]]FI
          // [[[II ESC:001-05 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-05
          const lastUrl = this.authS.normalizeLastModuleUrl(localStorage.getItem('lastModuleUrl'));
          this.router.navigateByUrl(lastUrl);
          // ]]]FI
          // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
        } else {
          this.authS.redirectMP();
        }
      }
    } catch (error: any) {
      console.error('Biometric login failed:', error);
      this.messageS.changeMessage('No se pudo usar el acceso seguro. Usa tu contraseña.', error, {}, 'warn');
      this.biometricLoading = false;
      this.blockedDocument = false;
    }
  }
  // ]]]FI

  login() {

    this.blockedDocument = true;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageS.changeMessage('Revise los campos marcados en rojo.',);
      this.blockedDocument = false;
      return;
    }
    const username = this.loginForm.get('username')?.value || '';
    const password = this.loginForm.get('password')?.value || '';

    this.authS.login({ username, password }).subscribe({
      next: (resp: any) => {
        // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
        if (this.setupBiometricAfterLogin && this.showBiometricSetupOption) {
          this.setupBiometricAuth();
        }
        // ]]]FI

        if (resp.erp.is_active_ERP) {
          this.cookieS.delete('configuration');
          // Restaurar el último módulo visitado o ir al inicio
          // [[[II ESC:001-05 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-05
          const lastUrl = this.authS.normalizeLastModuleUrl(localStorage.getItem('lastModuleUrl'));
          this.router.navigateByUrl(lastUrl);
          // ]]]FI
        } else {
          this.authS.redirectMP();
        }
      },
      error: (e: any) => {
        this.blockedDocument = false;
        // [[[II ESC:027-07 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-07
        this.messageS.changeMessage(resolveLoginErrorMessage(e, this.networkStatusS.connected()));
        // ]]]FI
      }
    });
  }

  // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
  private setupBiometricAuth() {
    this.authS.setupBiometricAuth().subscribe({
      next: (success) => {
        if (success) {
          this.messageS.changeMessage(
            'Acceso seguro configurado para este equipo',
            null,
            {},
            'success'
          );
        }
      },
      error: (error) => {
        console.warn('Biometric setup failed after login:', error);
      }
    });
  }
  // ]]]FI
}
