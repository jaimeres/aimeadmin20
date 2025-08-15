import { Injectable } from '@angular/core';
import { User } from '../../types/user';
import { CookieOptions, CookieService } from 'ngx-cookie-service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { MessageService } from '../../components/services/message.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _tokenAccess: string = '';
  private _tokenRefresh: string = '';
  private _base_url: String = environment.base_url;
  private _loggedin: boolean = false;
  private _cookieOptions: CookieOptions = {
    expires: 1, // la cookie expirará en 1 día
    path: '/', // la cookie solo puede ser leída por scripts cargados desde el camino raíz del sitio
    domain: environment.mk, // la cookie solo puede ser leída por scripts cargados desde midominio.com y subdominios
    secure: true, // la cookie solo será enviada a través de una conexión segura HTTPS
    sameSite: 'Strict', // la cookie solo puede ser enviada en solicitudes del mismo sitio
    //HttpOnly: true, //la cookie sea accesible a través del protocolo HTTP y NO permite que la cookie sea accedida por un script de JavaScript en el navegador, SOLO atraves del servidor
  };

  constructor(private http: HttpClient, private cookieS: CookieService, private messageS: MessageService, private router: Router) {
    // Solo se agrega una vez al inicializar el servicio
    window.addEventListener('unload', () => {
      alert('Refrescando cookie...');
      this.refreshCookie();
    });
    this.messageS.currentLogin.subscribe(
      (resp: any) => {
        this.login(resp).subscribe({
          next: (resp: any) => {
            this.messageS.showLoginDialog(false)
          },
          error: (e: any) => {
            this.messageS.changeMessage('', e)
          }
        })
      })
  }

  /**
   * redirecciona al merket
   */
  redirectMP() {
    this.router.navigateByUrl('/ecommerce/product-list');
    //window.location.href = environddment.mk_red;
    //ya no deberia existir mk
  }

  /**Redireccionar a login */
  redirectLogin() {
    this.router.navigateByUrl('/auth/login');
  }

  /**
   * Desloguea al usuario
   * @returns data vacio 
   */
  logout() {
    const data = {
      'authorizationCheck': true,
      "data": {
        "type": "logout",
        "attributes": {
          'refresh': this.refresh,
        }
      }
    }

    this.loggedin = false;
    return this.http.post(`${this._base_url}/auth/logout/`, data).pipe(
      tap((resp: any) => {
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.loggedin = false;
        this.messageS.changeMessage('Sesión cerrada correctamente', null, {}, 'success');
        this.redirectMP();
      }),
      catchError((err) => {
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.loggedin = false;
        this.messageS.changeMessage('Sesión cerrada correctamente');
        this.redirectMP();
        return of(null);
      })
    );
  }

  /**
  * Indicar el esta o no logueado, exclusivo para los guard, ya que no garantiza que el observable se resuelva antes que se ocupen los toekns
  * @returns Observable que emite un valor bool.
  */
  tokenValidate(): Observable<boolean> {


    if (!this.refresh) {
      this.messageS.showLoginDialog();
      return of(false);
    }

    console.log('tokenValidate');

    const data = {
      'authorizationCheck': true,
      "data": {
        "type": "refresh",
        "attributes": {
          'refresh': this.refresh,
        }
      }
    }

    return this.http.post(`${this._base_url}/auth/refresh/`, data).pipe(
      tap((resp: any) => {
        this.access = resp.data.access;
        this.refresh = resp.data.refresh;
        this.loggedin = true;
      }),
      map(resp => {
        return true
      }),
      catchError(resp => {
        this.messageS.changeMessage('Su sesión ha terminado');
        this.loggedin = false;
        return of(false)
        // Si el token de refresh existe lo verifica contra el servidor para válidar si existe la sesión
        // dado que estoy utilizando catchError tengo que regresar un Observable de tipo bool, estoy utilizando
        // catchError aquí para poder inicializar this.loggedin  en false para que el sistema sepa que hubo un error 
        // al recuperar el token y diga que la sesión esta cerrada ||| TENGO QUE TENER CUIDADO PORQUE SI HAY UN ERROR 
        // AL RECUPERAR EL TOKEN DE ACTUALIZACIÓN DIRÁ QUE LA SESION SE CERRÓ, POR EJEMPLO SI SE VA EL INTERNET UNOS SEGUNDOS
        // Y NO REGRESA EL TOVKEN LA SESIÓN SE CERRARÁ
      }),
    );
  }

  /**
   * Valida el token de feresh y regresa el token de acceso valido por 5min
   * @returns token de acceso
   */
  tokenValidateInterceptor(): Observable<string> {
    console.log('tokenValidateInterceptor fiu llamado');
    alert('tokenValidateInterceptor fiu llamado');

    if (!this.refresh) {
      this.messageS.showLoginDialog();
      return of('');
    }

    const data = {
      'authorizationCheck': true,
      "data": {
        "type": "refresh",
        "attributes": {
          'refresh': this.refresh,
        }
      }
    }

    return this.http.post(`${this._base_url}/auth/refresh/`, data).pipe(
      tap((resp: any) => {
        this.access = resp.data.access;
        this.refresh = resp.data.refresh;
        this.loggedin = true;
      }),
      map(resp => {
        return resp.data.access
      }),
      catchError(resp => {
        this.messageS.showLoginDialog();
        this.loggedin = false;
        return of('')
        // Si el token de refresh existe lo verifica contra el servidor para válidar si existe la sesión
        // dado que estoy utilizando catchError tengo que regresar un Observable de tipo bool, estoy utilizando
        // catchError aquí para poder inicializar this.loggedin  en false para que el sistema sepa que hubo un error 
        // al recuperar el token y diga que la sesión esta cerrada ||| TENGO QUE TENER CUIDADO PORQUE SI HAY UN ERROR 
        // AL RECUPERAR EL TOKEN DE ACTUALIZACIÓN DIRÁ QUE LA SESION SE CERRÓ, POR EJEMPLO SI SE VA EL INTERNET UNOS SEGUNDOS
        // Y NO REGRESA EL TOVKEN LA SESIÓN SE CERRARÁ
      }),
    );
  }

  /**
   * Loguea al usuario
   * @param formData Credenciales
   * @returns observable con el usuario logueado
   */
  public login(formData: { username: string; password: string }): Observable<User> {

    // dja
    const data = { // dja
      'authorizationCheck': true,
      "data": {
        "type": "login",
        "attributes": {
          ...formData
        }
      }
    }

    return this.http.post(` ${this._base_url}/auth/login/ `, data).pipe(
      tap((resp: any) => {
        this.access = resp.data.access; // dja
        this.refresh = resp.data.refresh; // dja
        this.loggedin = true;
      }),
      map(resp => resp.data.user) // dja
    );
  }

  /**
  * Indica los segundos que faltan para que el token de acceso expire o 0 si ya esta expirado
  * @returns Número entero en segundos.
  */
  get getTimeUntilTokenExpiration(): number {
    if (!this.access || typeof this.access !== 'string' || this.access.split('.').length !== 3) {
      return 0;
    }
    try {
      const decodedToken: any = jwtDecode(this.access);
      const expirationDate = new Date(decodedToken.exp * 1000); // Convertir segundos a milisegundos
      const currentDate = new Date();
      const timeRemainingInSeconds = (expirationDate.getTime() - currentDate.getTime()) / 1000;
      return Math.max(0, timeRemainingInSeconds); // Tiempo restante en segundos, como mínimo es 0
    } catch (e) {
      return 0;
    }
  }


  /**
   * Retorna un valor bool para indicar si el usuario esta o no logueado
   */
  get loggedin(): boolean {
    return this._loggedin;
  }

  /**
   * Retorna los datos del usuario logueado
   */
  get user(): User {
    return JSON.parse(this.cookieS.get('user')) //|| '';
    //return JSON.parse(localStorage.getItem('user'));
  }

  /**
   * establece si el usuario esta logueado
   */
  private set loggedin(loggedin: boolean) {
    this._loggedin = loggedin;
  }

  /**
   * Obtiene el ultimo token para refrescar las credenciales de logueo
   */
  get refresh(): string {
    return this._tokenRefresh || this.cookieS.get('refresh');
    // el token el la cookie solo estará 30 segundos o se elimina cuando se recarga el componente main y cuando se solicite el token se actualiza _tokenRefresh
  }

  /**
   * Establece el token de refresh que se utilizar para comprobar si el usuario esta logueado
   */
  private set refresh(refresh: string) {
    this._tokenRefresh = refresh;
  }

  /**
   * Retiorna el token de acceso
   */
  get access(): string {
    return this._tokenAccess//this.cookieS.get('access') || '';
    //return localStorage.getItem('access') || '';
  }


  /**
   * Establece el token de acceso
   */
  private set access(access: string) {
    this._tokenAccess = access;
  }

  /**
   * Establece el token de refresh temporalmente en una cookie
   */
  refreshCookie() {
    // Es llamado antes de que se recargie la página, lo guarda en un cokkie un cuando carga el componente main lo elimina
    this._cookieOptions.expires = new Date(new Date().getTime() + 30000)
    this.cookieS.set('refresh', this.refresh, this._cookieOptions);
  }

  /**
   * Perzonaliza el nombre de los campos del formulario y para los mensajes de error
   */
  get userFieldTranslation() {
    return {
      username: 'Nombre de usuario',
      name: 'Nombre',
      last_name: 'Apellidos',
      email: 'Correo',
      user_type: 'Tipo de usuario',
      default_user_type: 'Usuario predeterminado',
      gender: 'Genero',
      is_voidable: 'Configuración anulable',
      is_active: 'Activo',
      image: 'Avatar',
      terms: 'Terminos',
    }
  }

}
