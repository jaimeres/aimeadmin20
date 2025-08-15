import { Component, inject } from '@angular/core';
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

            <div class="w-full flex flex-col gap-4 px-4" *ngIf="!blockedDocument">
              <p-icon-field>
                <p-inputicon class="pi pi-envelope" />
                <input pInputText class="w-full" placeholder="Usuario" formControlName="username" />
              </p-icon-field>

              <p-icon-field>
                <p-inputicon class="pi pi-key" />
                <!--<input pInputText type="password" formControlName="password" class="w-full" placeholder="Contraseña" />-->
                <p-password formControlName="password" placeholder="contraseña" [toggleMask]="true" />
              </p-icon-field>
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
export class Login {

  public blockedDocument = false;
  public loginForm;
  constructor(private fb: FormBuilder, private authS: AuthService, private router: Router, private messageS: MessageService,
    private cookieS: CookieService) {
    this.loginForm = this.fb.group({
      password: ["", [Validators.required]],
      username: ["", [Validators.required, Validators.email]],
    });
  }

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
        if (resp.erp.is_active_ERP) {
          this.cookieS.delete('configuration');
          this.router.navigateByUrl('/');
        } else {
          this.authS.redirectMP();
        }
      },
      error: (e: any) => {
        this.blockedDocument = false;
        this.messageS.changeMessage('', e);
      }
    });
  }
}
