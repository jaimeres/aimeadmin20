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
    // [[[II ESC:027-09 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-09 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11 ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12 ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13
    // Los consumidores suelen agregar su propio texto al error HTTP. Se
    // normaliza aquí para que ninguno vuelva a mostrar "Unknown Error Failed
    // to fetch" después de que el interceptor detectó un fallo de transporte.
    if ((err as any)?.status === 0 && (err as any)?.error?.transportFailure) {
      const localServerFailure = Boolean((err as any)?.error?.localServerFailure);
      const serverUnavailable = Boolean((err as any)?.error?.serverUnavailable);
      msg = localServerFailure
        ? 'No fue posible conectarse con el servidor local. Verifica que el servicio esté iniciado en el equipo de desarrollo.'
        : serverUnavailable
          ? 'No fue posible comunicarse con el servidor. Tu conexión a Internet está disponible, pero el servicio no responde o está bloqueando el acceso.'
        : 'Sin acceso a Internet desde la aplicación. Revisa el Wi-Fi, los datos móviles o las restricciones de red de la aplicación.';
      err = null;
      severity = 'warn';
      summary = localServerFailure
        ? 'Servidor local no disponible'
        : serverUnavailable
          ? 'Servidor no disponible'
          : 'Sin conexión';
      swal = false;
      life = 20000;
    }
    // ]]]FI

    console.log('Mensaje cambiado:', { msg, err, customFields, severity, summary, swal, life });

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
    //console.log('MessageService showBlocked//////////////////', visible, source);
    this.showBlockedSource.next(visible);
  }
}
