import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // mensages visible para el usuario globalmente
  //private messageSource = new BehaviorSubject<any>(null); // Definimos un BehaviorSubject para almacenar el mensaje actual
  private messageSource = new Subject<any>(); // Definimos un Subject para almacenar el mensaje actual
  currentMessage = this.messageSource.asObservable(); // Creamos un Observable que emitirá el mensaje actual

  // muestra el dialogo para el incio de sesión globalmente
  //private showLoginDialogSource = new BehaviorSubject<boolean>(false); // Definimos un BehaviorSubject para almacenar el mensaje actual
  private showLoginDialogSource = new Subject<any>(); // Definimos un Subject para almacenar el valor actual
  currentShowLoginDialog = this.showLoginDialogSource.asObservable(); // Creamos un Observable que emitirá el valor actual

  private loginSource = new Subject<any>(); // Definimos un Subject para almacenar el valor actual
  currentLogin = this.loginSource.asObservable(); // Creamos un Observable que emitirá el valor actual

  // private showBlockedSource = new Subject<any>(); // Usar Subject causaba que el componente no recibiera el último valor si se suscribía tarde
  // Se cambió a BehaviorSubject<boolean> para asegurar que el componente BlockedComponent reciba siempre el último estado de bloqueo, incluso si se suscribe después de emitir el valor
  private showBlockedSource = new BehaviorSubject<boolean>(false); // Definimos un BehaviorSubject para almacenar el valor actual
  currentShowBlocked = this.showBlockedSource.asObservable(); // Creamos un Observable que emitirá el valor actual

  /**
   * Mesaje para mostra un error global, hay 2 tipos toast de primeng y sweetalert2.
   * @param msg  (swal y toast) --No fue posible ejecutar la solicitud-- Mensaje a mostrar al usuario.
   * @param err (swal y toast) --null-- Error que regresa el servidor.
   * @param customFields (swal y toast) --{}--  Campos personalizados, la clave es el campo del servidor y el valor es personalizado.
   * @param severity (swal y toast) --error-- Gravedad del mesnaje, success, error.
   * @param summary (toast) --Error-- Titulo de la ventana de error.
   * @param swal (swal) --false-- librería sweetalert2.
   * @param life (toast) --15000-- tiempo de vida del mensaje en milisegundos.
   */
  changeMessage(msg: string = 'No fue posible ejecutar la solicitud', err = null, customFields = {}, severity = 'error', summary = 'Error', swal = false, life = 15000) {
    this.messageSource.next({ msg: msg, err: err, nameEsp: customFields, severity: severity, summary: summary, swal: swal, life: life });
    // Actualizamos el mensaje actual
  }

  showLoginDialog(visible = true, header = 'Inicie sesión') {
    this.showLoginDialogSource.next({ visible: visible, header: header });
  }

  login(form: any) {
    this.loginSource.next(form);
  }

  showBlocked(visible = true, source = '') {
    console.log('MessageService showBlocked//////////////////', visible, source);
    this.showBlockedSource.next(visible);
  }
}
