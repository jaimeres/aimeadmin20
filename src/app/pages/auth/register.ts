import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { AppConfigurator } from '@/layout/components/app.configurator';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '../../auth/services/auth.service';

// [[[II ESC:029-01 DOC:docs/documents/2026-07-11-029-registro-usuario-auth.md#escenario-01
const passwordMatchValidator = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const rePassword = control.get('re_password')?.value;

  if (!password || !rePassword) return null;
  return password === rePassword ? null : { passwordMismatch: true };
};
// ]]]FI

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ButtonModule, RouterModule, ReactiveFormsModule, InputText, Ripple, AppConfigurator, InputGroupModule, InputGroupAddonModule],
  template: `
    <form [formGroup]="registerForm" (ngSubmit)="register()" class="h-screen flex w-full bg-surface-50 dark:bg-surface-950" novalidate>
      @if (registerNotice()) {
        <div class="fixed left-1/2 top-6 z-[1200] w-[min(92vw,520px)] -translate-x-1/2 rounded-md border-2 border-green-500 bg-green-50 px-5 py-4 text-green-900 shadow-xl">
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle mt-1 text-2xl text-green-600"></i>
            <div class="flex flex-col gap-1">
              <strong class="text-base">Registro creado</strong>
              <span class="text-sm leading-relaxed">{{ registerNotice() }}</span>
            </div>
          </div>
        </div>
      }

      @if (registerErrorNotice()) {
        <div class="fixed left-1/2 top-6 z-[1200] w-[min(92vw,520px)] -translate-x-1/2 rounded-md border-2 border-red-500 bg-red-50 px-5 py-4 text-red-900 shadow-xl">
          <div class="flex items-start gap-3">
            <i class="pi pi-exclamation-triangle mt-1 text-2xl text-red-600"></i>
            <div class="flex flex-col gap-1">
              <strong class="text-base">Revise el registro</strong>
              <span class="text-sm leading-relaxed">{{ registerErrorNotice() }}</span>
            </div>
          </div>
        </div>
      }

      <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center">
        <div class="w-11/12 sm:w-120">
          <div class="flex flex-col">
            <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
              <i class="pi pi-users text-surface-0 dark:text-surface-900 text-4xl!"></i>
            </div>
            <!--<div class="mt-6">
              <h1 class="m-0 text-primary font-semibold text-4xl">Join us!</h1>
              <span class="block text-surface-700 dark:text-surface-100 mt-2">Please fill the fields to sign-up Ultima network</span>
            </div>-->
          </div>
          <div class="flex flex-col gap-4 mt-12">
            <p-input-group>
              <p-inputgroup-addon>
                <i class="pi pi-user"></i>
              </p-inputgroup-addon>
              <input pInputText formControlName="name" placeholder="Nombre" />
            </p-input-group>
            <p-input-group>
              <p-inputgroup-addon>
                <i class="pi pi-user"></i>
              </p-inputgroup-addon>
              <input pInputText formControlName="last_name" placeholder="Apellidos" />
            </p-input-group>
            <p-input-group>
              <p-inputgroup-addon>
                <i class="pi pi-at"></i>
              </p-inputgroup-addon>
              <input pInputText type="email" formControlName="email" placeholder="Correo" />
            </p-input-group>
            <p-input-group>
              <p-inputgroup-addon>
                <i class="pi pi-key"></i>
              </p-inputgroup-addon>
              <input pInputText id="password1" type="password" formControlName="password" placeholder="Contraseña" />
            </p-input-group>
            <p-input-group>
              <p-inputgroup-addon>
                <i class="pi pi-key"></i>
              </p-inputgroup-addon>
              <input pInputText id="password2" type="password" formControlName="re_password" placeholder="Repetir contraseña" />
            </p-input-group>
            <div>
              <button
                pButton
                pRipple
                type="submit"
                class="w-full"
                label="Registrarme"
                [loading]="registering()"
                [disabled]="registering()">
              </button>
            </div>
            <div>
              <button [routerLink]="'/auth/login'" pButton pRipple class="w-full text-primary-500" text label="IR A INICIAR SESIÓN"></button>
            </div>
          </div>
        </div>
      </div>
      <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
        <img src="/layout/images/logo/vector_logo.png" alt="" />
      </div>
    </form>
    <app-configurator simple />
  `
})
export class Register {
  // [[[II ESC:029-01 DOC:docs/documents/2026-07-11-029-registro-usuario-auth.md#escenario-01
  registering = signal(false);
  registerNotice = signal('');
  registerErrorNotice = signal('');
  registerForm;

  constructor(
    private fb: FormBuilder,
    private authS: AuthService,
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(40)]],
      last_name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(40)]],
      password: ['', [Validators.required]],
      re_password: ['', [Validators.required]],
    }, { validators: passwordMatchValidator });
  }

  register() {
    this.registerNotice.set('');
    this.registerErrorNotice.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.registerErrorNotice.set('Complete los campos requeridos y verifique que las contraseñas coincidan.');
      return;
    }

    this.registering.set(true);
    const formValue = this.registerForm.getRawValue();
    this.authS.register({
      name: formValue.name || '',
      last_name: formValue.last_name || '',
      email: formValue.email || '',
      password: formValue.password || '',
      re_password: formValue.re_password || '',
    }).subscribe({
      next: (response: any) => {
        this.registering.set(false);
        const serverMessage = this.resolveRegisterMessage(response);
        this.registerForm.reset({
          name: '',
          last_name: '',
          email: '',
          password: '',
          re_password: '',
        });
        this.registerForm.markAsPristine();
        this.registerForm.markAsUntouched();
        this.registerNotice.set(serverMessage);
      },
      error: (error) => {
        this.registering.set(false);
        this.registerErrorNotice.set(this.resolveRegisterErrorMessage(error));
      },
    });
  }

  private resolveRegisterMessage(response: any): string {
    return response?.data?.attributes?.message
      || response?.data?.attributes?.detail
      || response?.message
      || response?.detail
      || 'Registro creado. Revise su correo para activar la cuenta.';
  }

  private resolveRegisterErrorMessage(error: any): string {
    const apiErrors = error?.error?.errors;
    if (Array.isArray(apiErrors) && apiErrors.length > 0) {
      return apiErrors
        .map((apiError: any) => apiError?.detail)
        .filter(Boolean)
        .join(' ');
    }

    return error?.error?.detail
      || error?.error?.message
      || error?.message
      || 'No fue posible registrar el usuario.';
  }
  // ]]]FI
}
