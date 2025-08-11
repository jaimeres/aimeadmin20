import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService as MessagePrimeS } from 'primeng/api';
import { MessageService } from '../services/message.service';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-message',
  imports: [CommonModule, ToastModule],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  standalone: true,
})
export class MessageComponent implements OnInit {
  msgError: string = ''
  print_errors: string[] = [];

  constructor(private messageS: MessageService, private messagePrimeS: MessagePrimeS) { }

  ngOnInit() {
    this.messageS.currentMessage.subscribe(
      msg => {

        this.messagePrimeS.clear();
        this.print_errors = [];

        if (!msg) {
          return;
        }
        this.msgError = msg.msg;
        // Si solo viene msg, lo mostramos aunque no haya err
        if (!msg.err && msg.msg) {
          this.print_errors = [msg.msg];
        }
        // msg.err se agrega en el observable de message.service.ts
        if (msg.err) {
          // Si el error es local, es decir, viene del formulario
          if (msg.err?.local) {
            const local = msg.err.local;
            local.forEach((errorObject: any) => {
              for (const key in errorObject.errors) {
                const field = errorObject.field;
                if (errorObject.errors.hasOwnProperty(key)) {
                  const e = msg.nameEsp[field] ? `${msg.nameEsp[field]} - ` : '';
                  this.print_errors.push(e + this.getErrorMessage(key, errorObject.errors[key]))
                }
              }
            });
          } else if (typeof (msg.err.error) != 'string') {
            // Si el revidor responde con error interno,
            const errors = msg.err.error?.errors;
            // hasta msg.err.error siempre se enviará, pero errors viene de dja por lo que si el servidor falla este último no será enviado
            if (errors) {
              errors.forEach((error: any) => {
                // recorre cada error enviado por el servidor
                let e = '';
                if (error?.source?.pointer) {
                  let field = error.source.pointer.split('/');
                  field = field[field.length - 1]; //accedo al ultimo elemento de la ruta que es donde viene el nombre, /data/attributes/name
                  e = msg.nameEsp[field] ? `${msg.nameEsp[field]} - ` : ''; //si el campo existe, lo conviero al español
                }
                this.print_errors.push(e + error.detail) // concateno
              });
            } else {
              // si la respuesta falla tratará de buscar msg.err?.statusText e imprimirá ese error, en caso contrario una cadena generíca
              const errors = msg.err?.statusText;
              if (errors) {
                this.print_errors.push(errors);
              } else {
                this.print_errors.push('Hay un error desconocido.');
              }
            }
          }
        }

        if (msg.swal) {
          // Indica si aparece el mensaje por swal
          let html = '';
          html = this.msgError;
          this.print_errors.forEach(element => {
            html += `
            <ul>
              <li> ${this.print_errors} </li>
            </ul>`
          });
          //Swal.fire({ html: html, icon: msg.severity });
          //ya no quiero utilizar sweetalert2
          this.messagePrimeS.add({ severity: msg.severity, summary: msg.summary, life: msg.life });
        } else {
          this.messagePrimeS.add({ severity: msg.severity, summary: msg.summary, life: msg.life });
        }
      }/*,error => console.log('errorororor'),
    () => console.log('erroTERMINADO')*/
    );

  }


  getErrorMessage(errorType: string, errorValue: any): string {
    switch (errorType) {
      case 'min':
        return `El valor mínimo permitido es ${errorValue.min}.`;
      case 'max':
        return `El valor máximo permitido es ${errorValue.max}.`;
      case 'required':
        return 'Este campo es requerido.';
      case 'requiredTrue':
        return 'Debe ser marcado como verdadero.';
      case 'email':
        return 'Debe ser una dirección de correo electrónico válida.';
      case 'minlength':
        return `Debe tener al menos ${errorValue.requiredLength} caracteres.`;
      case 'maxlength':
        return `Debe tener como máximo ${errorValue.requiredLength} caracteres.`;
      case 'pattern':
        return 'El formato no es válido.';
      default:
        return 'Error desconocido.';
    }
  }
}