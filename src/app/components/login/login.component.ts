import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from '../services/message.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [DialogModule, ReactiveFormsModule, InputIcon, IconField, ButtonModule, CheckboxModule, InputTextModule, PasswordModule,
    RippleModule,],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true
})
export class LoginComponent {

  loginForm: FormGroup = new FormGroup({});
  visible = signal(false); // para el dialo que mostrará la contraseña
  header = signal('');
  showPassword: boolean = false; // Variable para controlar la visibilidad de la contraseña
  // [[[II ESC:027-05 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-05
  biometricLoading = signal(false);
  showBiometricOption = signal(false);
  showBiometricSetupOption = signal(false);
  // ]]]FI

  constructor(private fb: FormBuilder, private messageS: MessageService, private authS: AuthService) { }

  ngOnInit() {

    this.loginForm = this.fb.group({
      password: ["", [Validators.required]],
      username: ["", Validators.required],
      // [[[II ESC:027-05 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-05
      setupBiometricAfterLogin: [false],
      // ]]]FI
    });

    this.messageS.currentShowLoginDialog.subscribe((resp: any) => {
      this.visible.set(resp.visible);
      this.header.set(resp.header);
      // [[[II ESC:027-05 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-05
      if (resp.visible) {
        this.checkBiometricAvailability();
      }
      // ]]]FI
    });

  }

  // [[[II ESC:027-05 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-05
  private async checkBiometricAvailability() {
    try {
      const canLoginWithBiometrics = await firstValueFrom(this.authS.isBiometricAvailable());
      this.showBiometricOption.set(canLoginWithBiometrics);

      if (canLoginWithBiometrics) {
        this.showBiometricSetupOption.set(false);
        return;
      }

      this.authS.biometricAuthS.checkBiometricAvailability().subscribe({
        next: (result) => {
          this.showBiometricSetupOption.set(result.available);
        },
        error: (error) => {
          console.log('Biometric check failed:', error);
          this.showBiometricSetupOption.set(false);
        }
      });
    } catch (error) {
      console.log('Biometric availability check failed:', error);
      this.showBiometricOption.set(false);
      this.showBiometricSetupOption.set(false);
    }
  }

  async loginWithBiometrics() {
    this.biometricLoading.set(true);

    try {
      const user = await firstValueFrom(this.authS.loginWithBiometrics());

      if (user) {
        this.messageS.changeMessage('Acceso seguro exitoso', null, {}, 'success');
        this.messageS.showLoginDialog(false);
      }
    } catch (error: any) {
      console.error('Biometric login failed:', error);
      this.messageS.changeMessage('No se pudo usar el acceso seguro. Use su contraseña.', error, {}, 'warn');
    } finally {
      this.biometricLoading.set(false);
    }
  }
  // ]]]FI


  login() {
    const formValue = this.loginForm.value;
    this.messageS.login({
      username: formValue.username,
      password: formValue.password,
      // [[[II ESC:027-05 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-05
      setupBiometricAfterLogin: Boolean(formValue.setupBiometricAfterLogin && this.showBiometricSetupOption()),
      // ]]]FI
    });
  }

  redirectMP() {
    alert('redirectMP')
  }

}
