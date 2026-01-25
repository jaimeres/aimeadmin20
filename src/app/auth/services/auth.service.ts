import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../types/user';
import { LoggedUser } from '../../types/logged-user';
import { CookieOptions, CookieService } from 'ngx-cookie-service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { MessageService } from '../../components/services/message.service';
import { Router } from '@angular/router';
import { GeneralService } from '../../utils/services/general.service';
import { BiometricAuthService } from './biometric-auth.service';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _tokenAccess: string = '';
  private _tokenRefresh: string = '';
  private _base_url: String = environment.base_url;
  private _config: any = {};
  private _storageReady: Promise<void> = Promise.resolve();
  private _cookieOptions: CookieOptions = {
    expires: 1, // la cookie expirará en 1 día
    path: '/', // la cookie solo puede ser leída por scripts cargados desde el camino raíz del sitio
    domain: environment.mk, // la cookie solo puede ser leída por scripts cargados desde midominio.com y subdominios
    secure: true, // la cookie solo será enviada a través de una conexión segura HTTPS
    sameSite: 'Strict', // la cookie solo puede ser enviada en solicitudes del mismo sitio
    //HttpOnly: true, //la cookie sea accesible a través del protocolo HTTP y NO permite que la cookie sea accedida por un script de JavaScript en el navegador, SOLO atraves del servidor
  };

  // ========== SIGNALS PARA USUARIO Y ESTADO DE LOGIN ==========
  private readonly _user = signal<LoggedUser | null>(null);
  private readonly _loggedin = signal<boolean>(false);

  // Solo lectura (no expones el setter)
  readonly user = this._user.asReadonly();

  // Computed útiles
  readonly loggedin = computed(() => this._loggedin());
  readonly userId = computed(() => this._user()?.id ?? null);
  readonly username = computed(() => this._user()?.username ?? null);
  readonly userImage = computed(() => this._user()?.image ?? null);

  constructor(private http: HttpClient, private cookieS: CookieService, private messageS: MessageService, private router: Router, private generalS: GeneralService, public biometricAuthS: BiometricAuthService) {
    // Cargar tokens y usuario al inicializar (solo importante para móviles)
    this._storageReady = this.loadTokensFromStorage();

    // Guardar/restaurar tokens en segundo plano en móvil
    if (this.generalS.isMobile()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          this._storageReady = this.loadTokensFromStorage();
        } else {
          this.saveTokensToStorage();
        }
      });
    }

    // Evento unload: guardar tokens antes de cerrar/recargar
    // WEB: guarda en cookie temporal por 30s para reload
    // MÓVIL: guarda en Preferences persistente
    window.addEventListener('unload', () => {
      this.saveTokensToStorage();
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

  // ========== MÉTODOS PARA MODIFICAR EL USUARIO ==========

  /**
   * Establece los datos del usuario logueado
   */
  setUser(userData: LoggedUser | null) {
    this._user.set(userData);

    console.log(this._user());
    // Persistir en cookie para web (por si hay reload)
    if (userData) {
      this.cookieS.set('user', JSON.stringify(userData), this._cookieOptions);
    } else {
      this.cookieS.delete('user');
    }
  }

  /**
   * Actualiza parcialmente los datos del usuario
   */
  patchUser(partial: Partial<LoggedUser>) {

    this._user.update(u => {
      if (u) {
        const updated = { ...u, ...partial };
        // Persistir cambios
        this.cookieS.set('user', JSON.stringify(updated), this._cookieOptions);
        return updated;
      }
      return u;
    });
  }

  /**
   * Establece el estado de login
   */
  private setLoggedin(value: boolean) {
    this._loggedin.set(value);
  }

  /**
   * redirecciona al merket
   */
  redirectMP() {
    this.router.navigateByUrl('/ecommerce/product-list');
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

    this.setLoggedin(false);
    return this.http.post(`${this._base_url}/auth/logout/`, data).pipe(
      tap(async (resp: any) => {
        await this.clearTokensFromStorage();
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.setLoggedin(false);
        this.setUser(null);
        this.messageS.changeMessage('Sesión cerrada correctamente', null, {}, 'success');
        this.redirectMP();
      }),
      catchError(async (err) => {
        await this.clearTokensFromStorage();
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.setLoggedin(false);
        this.setUser(null);
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
    //console.log('tokenValidate');

    // Crear la función async que maneje device_id
    const performTokenValidate = async () => {
      await this._storageReady;

      if (!this.refresh) {
        this.messageS.showLoginDialog();
        return of(false);
      }

      // Obtener device_id solo para móviles
      const deviceId = await this.generalS.getDeviceId();

      // Construir el objeto de atributos
      const attributes: any = {
        'refresh': this.refresh,
      };

      // Agregar device_id solo si estamos en móvil y se obtuvo correctamente
      if (deviceId) {
        attributes.device_id = deviceId;
      }

      const data = {
        'authorizationCheck': true,
        "data": {
          "type": "refresh",
          "attributes": attributes
        }
      }

      return this.http.post(`${this._base_url}/auth/refresh/`, data).pipe(
        tap(async (resp: any) => {
          this.access = resp.data.access;
          this.refresh = resp.data.refresh;
          this.setLoggedin(true);
          await this.saveTokensToStorage(); // Guardar tokens actualizados
        }),
        switchMap((resp: any) => {
          // Si no existe config, consultar settings/me
          if (!this._config || Object.keys(this._config).length === 0) {
            return this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
              tap((config: any) => {
                console.log('refresh', config);
                this.config = config; // Asignar la configuración
              }),
              map(() => true), // Retornar true para indicar éxito
              catchError((configError) => {
                console.warn('Warning: Could not load configuration after refresh:', configError);
                // No fallar el refresh si la configuración falla, solo advertir
                return of(true);
              })
            );
          } else {
            // Si ya existe config, solo retornar true
            return of(true);
          }
        }),
        catchError(resp => {
          this.messageS.changeMessage('Su sesión ha terminado');
          this.setLoggedin(false);
          return of(false)
          // Si el token de refresh existe lo verifica contra el servidor para válidar si existe la sesión
          // dado que estoy utilizando catchError tengo que regresar un Observable de tipo bool, estoy utilizando
          // catchError aquí para poder inicializar this.loggedin  en false para que el sistema sepa que hubo un error 
          // al recuperar el token y diga que la sesión esta cerrada ||| TENGO QUE TENER CUIDADO PORQUE SI HAY UN ERROR 
          // AL RECUPERAR EL TOKEN DE ACTUALIZACIÓN DIRÁ QUE LA SESION SE CERRÓ, POR EJEMPLO SI SE VA EL INTERNET UNOS SEGUNDOS
          // Y NO REGRESA EL TOVKEN LA SESIÓN SE CERRARÁ
        }),
      );
    };

    // Convertir la función async en Observable
    return new Observable<boolean>(observer => {
      performTokenValidate().then(observable => {
        observable.subscribe(observer);
      }).catch(error => {
        observer.error(error);
      });
    });
  }


  /**
   * Valida el token de feresh y regresa el token de acceso valido por 5min
   * @returns token de acceso
   */
  tokenValidateInterceptor(): Observable<string> {
    //console.log('tokenValidateInterceptor fiu llamado');

    // Crear la función async que maneje device_id
    const performTokenValidateInterceptor = async () => {
      await this._storageReady;

      if (!this.refresh) {
        this.messageS.showLoginDialog();
        return of('');
      }

      // Obtener device_id solo para móviles
      const deviceId = await this.generalS.getDeviceId();

      // Construir el objeto de atributos
      const attributes: any = {
        'refresh': this.refresh,
      };

      // Agregar device_id solo si estamos en móvil y se obtuvo correctamente
      if (deviceId) {
        attributes.device_id = deviceId;
      }

      const data = {
        'authorizationCheck': true,
        "data": {
          "type": "refresh",
          "attributes": attributes
        }
      }

      return this.http.post(`${this._base_url}/auth/refresh/`, data).pipe(
        tap(async (resp: any) => {
          this.access = resp.data.access;
          this.refresh = resp.data.refresh;
          this.setLoggedin(true);
          await this.saveTokensToStorage(); // Guardar tokens actualizados
        }),
        map(resp => {
          return resp.data.access
        }),
        catchError(resp => {
          this.messageS.showLoginDialog();
          this.setLoggedin(false);
          return of('')
          // Si el token de refresh existe lo verifica contra el servidor para válidar si existe la sesión
          // dado que estoy utilizando catchError tengo que regresar un Observable de tipo bool, estoy utilizando
          // catchError aquí para poder inicializar this.loggedin  en false para que el sistema sepa que hubo un error 
          // al recuperar el token y diga que la sesión esta cerrada ||| TENGO QUE TENER CUIDADO PORQUE SI HAY UN ERROR 
          // AL RECUPERAR EL TOKEN DE ACTUALIZACIÓN DIRÁ QUE LA SESION SE CERRÓ, POR EJEMPLO SI SE VA EL INTERNET UNOS SEGUNDOS
          // Y NO REGRESA EL TOVKEN LA SESIÓN SE CERRARÁ
        }),
      );
    };

    // Convertir la función async en Observable
    return new Observable<string>(observer => {
      performTokenValidateInterceptor().then(observable => {
        observable.subscribe(observer);
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Loguea al usuario
   * @param formData Credenciales
   * @returns observable con el usuario logueado
   */
  public login(formData: { username: string; password: string }): Observable<User> {

    // Crear la función async que maneje device_id
    const performLogin = async () => {
      // Obtener device_id solo para móviles
      const deviceId = await this.generalS.getDeviceId();

      // Construir el objeto de atributos
      const attributes: any = { ...formData };

      // Agregar device_id solo si estamos en móvil y se obtuvo correctamente
      if (deviceId) {
        attributes.device_id = deviceId;
      }

      // dja
      const data = { // dja
        'authorizationCheck': true,
        "data": {
          "type": "login",
          "attributes": attributes
        }
      }

      return this.http.post(` ${this._base_url}/auth/login/ `, data).pipe(
        tap(async (resp: any) => {
          this.access = resp.data.access; // dja
          this.refresh = resp.data.refresh; // dja
          this.setLoggedin(true);
          this.setUser(resp.data.user);
          await this.saveTokensToStorage(); // Guardar inmediatamente después del login
        }),
        switchMap((resp: any) => {
          // Hacer llamada a configuración después del login exitoso
          return this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
            tap((config: any) => {
              console.log('login', config);

              this.config = config; // Guardar la configuración en el servicio

            }),
            map(() => resp.data.user), // Retornar el usuario original
            catchError((configError) => {
              console.warn('Warning: Could not load configuration after login:', configError);
              // No fallar el login si la configuración falla, solo advertir
              return of(resp.data.user);
            })
          );
        }),
        catchError((loginError) => {
          // Manejar errores del login original
          throw loginError;
        })
      );
    };

    // Convertir la función async en Observable
    return new Observable<User>(observer => {
      performLogin().then(observable => {
        observable.subscribe(observer);
      }).catch(error => {
        observer.error(error);
      });
    });
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
   * Obtiene el ultimo token para refrescar las credenciales de logueo
   */
  get refresh(): string {
    return this._tokenRefresh;
    // El token se carga desde Preferences/Cookie al inicializar el servicio
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
    return this._tokenAccess
    //return localStorage.getItem('access') || '';
  }


  /**
   * Establece el token de acceso
   */
  private set access(access: string) {
    this._tokenAccess = access;
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

  get config(): any {
    return this._config
  }

  set config(value: any) {
    // Recorrer recursivamente la estructura de attributes
    this._config = this.getCustomField(value?.data?.attributes);
  }

  /**
   * Procesa la configuración de draw para una aplicación específica
   * @param draw Objeto que contiene la configuración de draw
   * @param fields Objeto que contiene los campos con su configuración detallada
   * @param appKey Clave de la aplicación (clave2)
   * @param customField Objeto donde se almacenará la configuración procesada
   * @param fieldsPrefixes Objeto fields_prefixes si existe
   */
  private processDrawConfig(draw: any, fields: any, appKey: string, customField: any, fieldsPrefixes?: any): void {
    if (!draw || typeof draw !== "object") return;

    // Inicializar la estructura si no existe
    if (!customField[appKey]) {
      customField[appKey] = {};
    }

    // Inicializar draw si no existe
    if (!customField[appKey]['draw']) {
      customField[appKey]['draw'] = {};
    }

    // Agregar fields_prefixes si existe
    if (fieldsPrefixes && typeof fieldsPrefixes === "object") {
      customField[appKey]['draw']['fields_prefixes'] = fieldsPrefixes;
    }

    // Procesar cada hijo de draw
    for (const [drawKey, drawValue] of Object.entries(draw)) {
      if (drawKey === 'dialog') {
        // Dialog se pasa tal como viene
        customField[appKey]['draw'][drawKey] = drawValue;
      } else {
        // Para el resto de hijos, procesar recursivamente
        customField[appKey]['draw'][drawKey] = this.processDrawSection(drawValue, fields);
      }
    }
  }

  /**
   * Procesa una sección de draw recursivamente hasta encontrar los objetos más profundos
   * @param section Sección actual del draw
   * @param fields Objeto fields para obtener la configuración de los campos
   * @returns Objeto procesado con la configuración reemplazada
   */
  private processDrawSection(section: any, fields: any): any {
    if (!section || typeof section !== "object") return section;

    const result: any = {};

    for (const [key, value] of Object.entries(section)) {
      if (value && typeof value === "object") {
        // Si el objeto tiene una propiedad 'field', es un objeto terminal
        if ((value as any).hasOwnProperty('field')) {
          const fieldName = (value as any).field;

          // Buscar la configuración en fields y reemplazar el contenido
          if (fields && fields[fieldName]) {
            // Mantener algunas propiedades originales si existen
            const originalField = value as any;

            result[key] = {
              ...fields[fieldName], // Configuración completa del campo desde fields
              //esta sobreescribiendo fieldName el por field
              //field: fieldName, // Usar la clave del diccionario (nombre completo con prefijos) //lo comento porque en teoria field el el nombre del formulario
              // Preservar propiedades específicas del draw original si existen
              ...(originalField.class && { class: originalField.class }),
              ...(originalField.class_md && { class_md: originalField.class_md }),
              ...(originalField.autofocus !== undefined && { autofocus: originalField.autofocus }),
              ...(originalField.hide !== undefined && { hide: originalField.hide }),
              ...(originalField.random_name && { random_name: originalField.random_name })
            };
          } else {
            // Si no se encuentra en fields, mantener el objeto original
            result[key] = value;
          }
        } else {
          // Si no tiene 'field', continuar navegando recursivamente
          result[key] = this.processDrawSection(value, fields);
        }
      } else {
        // Si no es un objeto, mantener el valor tal como está
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Procesa la configuración de columnas para una aplicación específica
   * @param cols Objeto que contiene la configuración de columnas
   * @param appKey Clave de la aplicación (clave2)
   * @param customField Objeto donde se almacenará la configuración procesada
   * @param fields Objeto fields que contiene la configuración completa de los campos
   */
  private processColumnsConfig(cols: any, appKey: string, customField: any, fields: any): void {
    if (!cols || typeof cols !== "object") return;

    //console.log('appKey:', appKey, 'cols:', cols, 'customField antes:', customField);

    // Inicializar la estructura si no existe
    if (!customField[appKey]) {
      customField[appKey] = {};
    }

    if (!customField[appKey]['cols']) {
      customField[appKey]['cols'] = {};
    }
    if (!customField[appKey]['config_cols']) {
      customField[appKey]['config_cols'] = {};
    }

    // Procesar todos los hijos de cols
    for (const [claveHijo, hijo] of Object.entries(cols)) {
      const hijoObj = hijo as any;
      const fieldName = hijoObj['field'];
      if (!fieldName) continue; // Si no tiene field, saltar

      // Verificar si el objeto tiene información completa o solo el field
      let columnInfo: any = {};

      /*if (hijoObj['label'] !== undefined || hijoObj['hide'] !== undefined || hijoObj['sortable'] !== undefined) {
        // Objeto completo: usar información directa
        columnInfo = {
          label: hijoObj['label'],
          order: claveHijo,
          hide: hijoObj['hide'],
          sortable: hijoObj['sortable']
        };
      } else {*/
      // Objeto simplificado: buscar información en fields.cols

      const fieldConfig = fields?.[fieldName]?.cols;
      if (fieldConfig) {
        columnInfo = {
          label: fieldConfig['label'] /*|| fieldName*/,
          order: fieldConfig['order'] || claveHijo,
          hide: fieldConfig['hide'] !== undefined ? fieldConfig['hide'] : false,
          sortable: fieldConfig['sortable'] !== undefined ? fieldConfig['sortable'] : true,
          locked: fieldConfig['locked'] !== undefined ? fieldConfig['locked'] : false,
          fields: fieldConfig['fields']
        };
      } /*else {
          // Si no se encuentra en fields.cols, usar valores por defecto
          columnInfo = {
            label: fieldName,
            order: claveHijo,
            hide: false,
            sortable: true
          };
        }*/
      //}

      // Almacenar la etiqueta del campo
      customField[appKey]['cols'][fieldName] = columnInfo.label;

      // Configuración de columnas (orden, visibilidad, ordenamiento)
      customField[appKey]['config_cols'][fieldName] = {
        'order': columnInfo.order,
        'hide': columnInfo.hide,
        'sortable': columnInfo.sortable,
        //'label': columnInfo.label,
        'locked': columnInfo.locked,
        'fields': columnInfo.fields
      };
    }
  }


  /**
   * Verifica si la autenticación biométrica está disponible y configurada
   */
  isBiometricAvailable(): Observable<boolean> {
    return this.biometricAuthS.checkBiometricAvailability().pipe(
      map(result => result.available && this.biometricAuthS.isDeviceRegistered())
    );
  }

  /**
   * Configura la autenticación biométrica para el usuario actual
   */
  setupBiometricAuth(): Observable<boolean> {
    const currentUser = this.user();
    if (!currentUser || !currentUser.username) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.biometricAuthS.checkBiometricAvailability().pipe(
      switchMap(availability => {
        if (!availability.available) {
          return throwError(() => new Error(`Autenticación biométrica no disponible: ${availability.status}`));
        }

        return this.biometricAuthS.registerDeviceForBiometric(currentUser.username).pipe(
          tap(() => {
            this.messageS.changeMessage(
              'Autenticación biométrica configurada correctamente',
              null,
              {},
              'success'
            );
          }),
          map(() => true)
        );
      }),
      catchError(error => {
        this.messageS.changeMessage(
          'Error al configurar autenticación biométrica',
          error,
          {},
          'error'
        );
        return of(false);
      })
    );
  }

  /**
   * Inicia sesión usando autenticación biométrica
   */
  loginWithBiometrics(username?: string): Observable<User> {
    return this.biometricAuthS.loginWithBiometrics(username).pipe(
      tap((resp: any) => {
        this.access = resp.access;
        this.refresh = resp.refresh;
        this.setLoggedin(true);
        if (resp.user) {
          this.setUser(resp.user);
        }
      }),
      switchMap((resp: any) => {
        // Cargar configuración después del login biométrico
        if (!this._config || Object.keys(this._config).length === 0) {
          return this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
            tap((config: any) => {
              console.log('biometric', config);

              this.config = config;
            }),
            map(() => resp.user),
            catchError((configError) => {
              console.warn('Warning: Could not load configuration after biometric login:', configError);
              return of(resp.user);
            })
          );
        } else {
          return of(resp.user);
        }
      }),
      catchError(error => {
        this.messageS.changeMessage(
          'Error en autenticación biométrica',
          error,
          {},
          'error'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Desactiva la autenticación biométrica para el usuario actual
   */
  disableBiometricAuth(): Observable<boolean> {
    const currentUser = this.user();
    if (!currentUser || !currentUser.username) {
      return of(true); // No hay usuario, no hay nada que desactivar
    }

    return this.biometricAuthS.unregisterDevice(currentUser.username).pipe(
      tap(() => {
        this.messageS.changeMessage(
          'Autenticación biométrica desactivada',
          null,
          {},
          'success'
        );
      }),
      map(() => true),
      catchError(error => {
        this.messageS.changeMessage(
          'Error al desactivar autenticación biométrica',
          error,
          {},
          'warning'
        );
        return of(false);
      })
    );
  }

  /**
   * Verifica si el dispositivo tiene configurada la autenticación biométrica
   */
  isDeviceRegisteredForBiometric(username?: string): boolean {
    return this.biometricAuthS.isDeviceRegistered(username);
  }

  /**
   * Obtiene información del registro biométrico
   */
  getBiometricInfo(username?: string) {
    return this.biometricAuthS.getBiometricInfo(username);
  }

  getCustomField(data: any): any {
    if (!data || typeof data !== "object") return {};

    //console.log('originallllllllllllll', data);

    // Declaración de customField con estructura que incluye cols, config_cols, draw, general, fields
    const customField: {
      [key: string]: {
        cols?: { [field: string]: string };
        config_cols?: { [field: string]: any };
        draw?: any;
        general?: any;
        fields?: any;
      }
    } = {};

    // 1er nivel: dinámico (addresses, assets, etc.)
    for (const [clave1, nivel1] of Object.entries(data)) {
      if (!nivel1 || typeof nivel1 !== "object") {
        continue;
      }

      // 2º nivel: dinámico (accessory, asset, etc.)
      for (const [clave2, nivel2] of Object.entries(nivel1 as any)) {
        if (!nivel2 || typeof nivel2 !== "object") {
          continue;
        }

        // Inicializar la estructura para esta aplicación
        if (!customField[clave2]) {
          customField[clave2] = {};
        }

        // 3er nivel: verificar si existen las claves fijas 'cols', 'draw', 'general', 'fields', 'fields_prefixes'
        const cols = (nivel2 as any)["cols"];
        const draw = (nivel2 as any)["draw"];
        const general = (nivel2 as any)["general"];
        const fields = (nivel2 as any)["fields"];
        const fieldsPrefixes = (nivel2 as any)["fields_prefixes"];

        // Procesar cols si existe
        if (cols && typeof cols === "object") {
          this.processColumnsConfig(cols, clave2, customField, fields);
        }

        // Procesar draw si existe
        if (draw && typeof draw === "object") {

          this.processDrawConfig(draw, fields, clave2, customField, fieldsPrefixes);
        }

        // Agregar general directamente si existe
        if (general && typeof general === "object") {
          customField[clave2]['general'] = general;
        }

        // Agregar fields directamente si existe
        if (fields && typeof fields === "object") {
          customField[clave2]['fields'] = fields;
        }
      }
    }

    return customField;
  }

  /**
   * Guarda los tokens en storage persistente
   * WEB: Cookie temporal de 30s (solo para reload, se elimina en ngOnInit del layout)
   * MÓVIL: Preferences persistente (sobrevive cierre de app)
   */
  private async saveTokensToStorage() {
    try {
      const currentUser = this._user();
      if (this.generalS.isMobile()) {
        // MÓVIL: Guardar en Preferences (persistente entre cierres de app)
        await Preferences.set({ key: 'refresh_token', value: this._tokenRefresh });
        await Preferences.set({ key: 'access_token', value: this._tokenAccess });
        if (currentUser && Object.keys(currentUser).length > 0) {
          await Preferences.set({ key: 'user_data', value: JSON.stringify(currentUser) });
        }
      } else {
        // WEB: Cookie temporal de 30s (diseño original por seguridad)
        this._cookieOptions.expires = new Date(new Date().getTime() + 30000); // 30 segundos
        this.cookieS.set('refresh', this._tokenRefresh, this._cookieOptions);
        // También guardar user en cookie para reloads
        if (currentUser && Object.keys(currentUser).length > 0) {
          this.cookieS.set('user', JSON.stringify(currentUser), this._cookieOptions);
        }
      }
    } catch (error) {
      console.warn('Error saving tokens to storage:', error);
    }
  }

  /**
   * Carga los tokens desde storage al inicializar
   * WEB: Desde cookie temporal (si existe por reload de página)
   * MÓVIL: Desde Preferences persistente
   */
  private async loadTokensFromStorage() {
    try {
      if (this.generalS.isMobile()) {
        // MÓVIL: Cargar desde Preferences
        const refresh = await Preferences.get({ key: 'refresh_token' });
        const access = await Preferences.get({ key: 'access_token' });
        const userData = await Preferences.get({ key: 'user_data' });

        if (refresh.value) this._tokenRefresh = refresh.value;
        if (access.value) this._tokenAccess = access.value;
        if (userData.value) {
          try {
            this._user.set(JSON.parse(userData.value));
          } catch (e) {
            console.warn('Error parsing user data:', e);
          }
        }
      } else {
        // WEB: Cargar desde cookie temporal (solo existe si hubo reload)
        const refreshCookie = this.cookieS.get('refresh');
        if (refreshCookie) {
          this._tokenRefresh = refreshCookie;
        }
        // Cargar usuario desde cookie si existe
        const userCookie = this.cookieS.get('user');
        if (userCookie) {
          try {
            this._user.set(JSON.parse(userCookie));
          } catch (e) {
            console.warn('Error parsing user cookie:', e);
          }
        }
      }
    } catch (error) {
      console.warn('Error loading tokens from storage:', error);
    }
  }

  /**
   * Limpia los tokens del storage
   */
  private async clearTokensFromStorage() {
    try {
      if (this.generalS.isMobile()) {
        await Preferences.remove({ key: 'refresh_token' });
        await Preferences.remove({ key: 'access_token' });
        await Preferences.remove({ key: 'user_data' });
      }
      // Limpiar el signal del usuario
      this._user.set(null);
    } catch (error) {
      console.warn('Error clearing tokens from storage:', error);
    }
  }


}
