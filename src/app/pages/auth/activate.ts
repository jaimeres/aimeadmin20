import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { AppConfigurator } from '@/layout/components/app.configurator';
import { AuthService } from '../../auth/services/auth.service';

type ActivationStatus = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [ButtonModule, RouterModule, Ripple, AppConfigurator],
  template: `
    <div class="min-h-screen flex w-full bg-surface-50 dark:bg-surface-950">
      <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center px-4">
        <div class="w-full max-w-[30rem]">
          <div class="flex flex-col">
            <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
              <i [class]="statusIconClass()"></i>
            </div>
            <div class="mt-6">
              <h1 class="m-0 text-primary font-semibold text-4xl">{{ title() }}</h1>
              <span class="block text-surface-700 dark:text-surface-100 mt-2 leading-relaxed">
                {{ subtitle() }}
              </span>
            </div>
          </div>

          <div
            class="mt-10 rounded-md border-2 px-5 py-4 shadow-xl"
            [class.border-primary]="activationStatus() === 'loading'"
            [class.bg-primary-50]="activationStatus() === 'loading'"
            [class.text-primary-900]="activationStatus() === 'loading'"
            [class.border-green-500]="activationStatus() === 'success'"
            [class.bg-green-50]="activationStatus() === 'success'"
            [class.text-green-900]="activationStatus() === 'success'"
            [class.border-red-500]="activationStatus() === 'error'"
            [class.bg-red-50]="activationStatus() === 'error'"
            [class.text-red-900]="activationStatus() === 'error'">
            <div class="flex items-start gap-3">
              <i [class]="noticeIconClass()"></i>
              <div class="flex flex-col gap-1">
                <strong class="text-base">{{ noticeTitle() }}</strong>
                <span class="text-sm leading-relaxed">{{ activationMessage() }}</span>
              </div>
            </div>
          </div>

          @if (activationStatus() !== 'loading') {
            <div class="flex flex-col gap-3 mt-8">
              <button
                [routerLink]="'/auth/login'"
                pButton
                pRipple
                class="w-full"
                label="IR A INICIAR SESION">
              </button>
              @if (activationStatus() === 'error') {
                <button
                  [routerLink]="'/auth/register'"
                  pButton
                  pRipple
                  class="w-full text-primary-500"
                  text
                  label="VOLVER A REGISTRARME">
                </button>
              }
            </div>
          }
        </div>
      </div>
      <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
        <img src="/layout/images/logo/vector_logo.png" alt="" />
      </div>
    </div>
    <app-configurator simple />
  `
})
export class Activate implements OnInit {
  // [[[II ESC:029-02 DOC:docs/documents/2026-07-11-029-registro-usuario-auth.md#escenario-02
  activationStatus = signal<ActivationStatus>('loading');
  activationMessage = signal('Estamos activando su cuenta. Espere un momento.');

  title = computed(() => {
    const status = this.activationStatus();
    if (status === 'success') return 'Cuenta activada';
    if (status === 'error') return 'No se pudo activar';
    return 'Activando cuenta';
  });

  subtitle = computed(() => {
    const status = this.activationStatus();
    if (status === 'success') return 'Ya puede iniciar sesion con el correo y la contrasena registrados.';
    if (status === 'error') return 'Revise el estado del enlace o solicite un nuevo registro si el token vencio.';
    return 'Validando el enlace de activacion enviado a su correo.';
  });

  noticeTitle = computed(() => {
    const status = this.activationStatus();
    if (status === 'success') return 'Activacion completada';
    if (status === 'error') return 'Enlace no activado';
    return 'Procesando activacion';
  });

  statusIconClass = computed(() => {
    const status = this.activationStatus();
    if (status === 'success') return 'pi pi-check text-surface-0 dark:text-surface-900 text-4xl!';
    if (status === 'error') return 'pi pi-exclamation-triangle text-surface-0 dark:text-surface-900 text-3xl!';
    return 'pi pi-spin pi-spinner text-surface-0 dark:text-surface-900 text-3xl!';
  });

  noticeIconClass = computed(() => {
    const status = this.activationStatus();
    if (status === 'success') return 'pi pi-check-circle mt-1 text-2xl text-green-600';
    if (status === 'error') return 'pi pi-exclamation-triangle mt-1 text-2xl text-red-600';
    return 'pi pi-spin pi-spinner mt-1 text-2xl text-primary-600';
  });

  constructor(
    private route: ActivatedRoute,
    private authS: AuthService,
  ) { }

  ngOnInit(): void {
    const uid = this.route.snapshot.paramMap.get('uid') || '';
    const token = this.route.snapshot.paramMap.get('token') || '';

    if (!uid || !token) {
      this.activationStatus.set('error');
      this.activationMessage.set('El enlace de activacion no contiene la informacion necesaria.');
      return;
    }

    this.authS.activate({ uid, token }).subscribe({
      next: (response) => {
        this.activationStatus.set('success');
        this.activationMessage.set(this.resolveApiMessage(response, 'Cuenta activada correctamente. Ya puede iniciar sesion.'));
      },
      error: (error) => {
        this.activationStatus.set('error');
        this.activationMessage.set(this.resolveApiMessage(error?.error || error, 'No fue posible activar la cuenta. El enlace puede estar vencido o ya fue utilizado.'));
      },
    });
  }

  private resolveApiMessage(source: any, fallback: string): string {
    const apiErrors = source?.errors;
    if (Array.isArray(apiErrors) && apiErrors.length > 0) {
      const message = apiErrors
        .map((apiError: any) => apiError?.detail)
        .filter(Boolean)
        .join(' ');

      if (message) return message;
    }

    return source?.data?.attributes?.message
      || source?.data?.attributes?.detail
      || source?.message
      || source?.detail
      || fallback;
  }
  // ]]]FI
}
