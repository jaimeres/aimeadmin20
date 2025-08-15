import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from '../services/message.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-login',
  imports: [DialogModule, ReactiveFormsModule, InputIcon, IconField, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule,
    RippleModule,],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true
})
export class LoginComponent {

  loginForm: FormGroup = new FormGroup({});
  visible: boolean = false; // para el dialo que mostrará la contraseña
  header: string = '';
  showPassword: boolean = false; // Variable para controlar la visibilidad de la contraseña

  constructor(private fb: FormBuilder, private messageS: MessageService,) { }

  ngOnInit() {

    this.loginForm = this.fb.group({
      password: ["", [Validators.required, Validators.minLength(8)]],
      username: ["", Validators.required],
    });

    this.messageS.currentShowLoginDialog.subscribe((resp: any) => {
      this.visible = resp.visible;
      this.header = resp.header;
    });

  }


  login() {
    this.messageS.login(this.loginForm.value);
  }

  redirectMP() {
    alert('redirectMP')
  }

}
