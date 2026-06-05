import { Injectable, signal, computed, inject } from '@angular/core';
import { User } from '../../types/user';
import { LoggedUser } from '../../types/logged-user';
import { CookieOptions, CookieService } from 'ngx-cookie-service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { MessageService } from '../../components/services/message.service';
import { Router } from '@angular/router';
import { GeneralService } from '../../utils/services/general.service';
import { BiometricAuthService } from './biometric-auth.service';
import { FormCacheService } from '../../utils/services/form-cache.service';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { PermissionsService } from './permissions.service';
// [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
import { NotificationSocketService } from '../../utils/services/notification-socket.service';
// ]]]FI

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _tokenAccess: string = '';
  private _tokenRefresh: string = '';
  private _base_url: String = environment.base_url;
  private _config: any = {};
  // [[[II ESC:001-01 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-01
  private readonly _configCachePrefix = 'bos_config_module';
  private readonly _configCacheIndex = 'bos_config_module_index';
  private readonly _configCacheAppIndex = 'bos_config_module_app_index';
  private _configFetchPromise: Promise<Record<string, any>> | null = null;
  // ]]]FI
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

  /** Servicio de permisos (inicializado en el constructor) */
  public permissionsS!: PermissionsService;

  // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
  /** Servicio de avisos/alertas en tiempo real (Socket.IO). */
  private notificationSocketS = inject(NotificationSocketService);
  // ]]]FI

  constructor(private http: HttpClient, private cookieS: CookieService, private messageS: MessageService, private router: Router, private generalS: GeneralService, public biometricAuthS: BiometricAuthService, private formCacheS: FormCacheService) {
    // Servicio de permisos (inject para evitar romper la firma del constructor existente)
    this.permissionsS = inject(PermissionsService);

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
      // Hidratar permisos a partir del payload de login
      this.permissionsS?.loadFromLogin(userData);
    } else {
      this.cookieS.delete('user');
      this.permissionsS?.clear();
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
        // Limpiar todos los cachés de formulario del usuario antes de cerrar sesión
        try {
          const userId = String(this.userId() ?? this.username() ?? 'anonymous');
          await this.formCacheS.clearAllForUser(userId);
        } catch { /* silencioso */ }
        await this.clearTokensFromStorage();
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.setLoggedin(false);
        this.setUser(null);
        this.messageS.changeMessage('Sesión cerrada correctamente', null, {}, 'success');
        // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
        this.notificationSocketS.disconnect(); // Cerrar socket de avisos al salir
        // ]]]FI
        this.redirectMP();
      }),
      catchError(async (err) => {
        // Limpiar cachés de formulario incluso si el logout fañó en el servidor
        try {
          const userId = String(this.userId() ?? this.username() ?? 'anonymous');
          await this.formCacheS.clearAllForUser(userId);
        } catch { /* silencioso */ }
        await this.clearTokensFromStorage();
        this.cookieS.delete('refresh');
        this.cookieS.delete('user');
        this.access = '';
        this.refresh = '';
        this.setLoggedin(false);
        this.setUser(null);
        this.messageS.changeMessage('Sesión cerrada correctamente');
        // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
        this.notificationSocketS.disconnect(); // Cerrar socket de avisos al salir
        // ]]]FI
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
    //console.log('tokenValidate---------------------------------------------------------------------------');

    // Crear la función async que maneje device_id
    const performTokenValidate = async () => {
      await this._storageReady;

      // [[[II ESC:001-01 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-01
      //si el token de acceso el valido no necesita refrescar el token
      if (this.getTimeUntilTokenExpiration > 20) {
        this.setLoggedin(true);
        return of(true);
      }
      // ]]]FI

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
        map(() => true),
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

          // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
          // ====================================================================
          // AVISO DE INICIO DE SESIÓN (Socket.IO) — PREPARADO LOCALMENTE
          // El servidor de avisos AÚN NO está implementado; esto queda listo.
          // Conecta el socket con el token y emite el aviso de login.
          //
          // 👉 PARA DEJAR DE ENVIAR EL AVISO DE LOGIN: comenta las DOS líneas
          //    siguientes (connect + emitLoginNotice). Con eso el socket no se
          //    conecta ni notifica el inicio de sesión.
          this.notificationSocketS.connect(this.access);
          this.notificationSocketS.emitLoginNotice(resp.data.user);
          // ====================================================================
          // ]]]FI
        }),
        switchMap((resp: any) => {
          // Hacer llamada a configuración después del login exitoso
          return this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
            switchMap((config: any) => {
              return from(this.replaceConfigResponse(config));
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
    // [[[II ESC:001-04 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-04
    return new Proxy(this._config, {
      get: (target: Record<string, any>, property: string | symbol) => {
        if (typeof property !== 'string') {
          return (target as any)[property];
        }

        if (!(property in target)) {
          const cachedModule = this.readConfigModuleFromStorageSync(property);
          if (cachedModule) {
            target[property] = cachedModule;
          }
        }

        return target[property] ?? this.buildTransientEmptyConfigModule();
      },
    });
    // ]]]FI
  }

  set config(value: any) {
    // [[[II ESC:001-02 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-02
    this.cacheConfigResponse(value).catch((error) => {
      console.warn('Warning: Could not cache configuration:', error);
    });
    // ]]]FI
  }

  // [[[II ESC:001-02 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-02
  /**
   * Asegura la configuración necesaria para una navegación sin declarar módulos en rutas.
   * Primero intenta resolver por índice local; si falta, actualiza la configuración desde servidor.
   */
  ensureConfigForUrl(url: string, modules: string[] = []): Observable<boolean> {
    return from(this.ensureConfigForUrlAsync(url, modules)).pipe(
      map(() => true),
      catchError((error) => {
        console.warn('Warning: Could not ensure route configuration:', error);
        return of(false);
      })
    );
  }

  /**
   * Asegura que los módulos de configuración requeridos estén disponibles en memoria.
   * La memoria se limita a los módulos solicitados; el resto queda separado en storage local.
   */
  ensureConfigModules(modules: string[] = []): Observable<boolean> {
    return from(this.ensureConfigModulesAsync(modules)).pipe(
      map(() => true),
      catchError((error) => {
        console.warn('Warning: Could not ensure configuration modules:', error);
        return of(false);
      })
    );
  }

  private async ensureConfigForUrlAsync(url: string, modules: string[] = []): Promise<void> {
    const explicitModules = this.normalizeConfigModules(modules);
    if (explicitModules.length) {
      await this.ensureConfigModulesAsync(explicitModules);
      return;
    }

    await this._storageReady;

    let routeModules = await this.resolveConfigModulesForUrl(url);
    const hasAppIndex = Object.keys(await this.readConfigAppIndexFromStorage()).length > 0;
    if (!routeModules.length || !hasAppIndex) {
      await this.fetchAndCacheFullConfig();
      routeModules = await this.resolveConfigModulesForUrl(url);
    }

    if (!routeModules.length) {
      return;
    }

    await this.ensureConfigModulesAsync(routeModules);
  }

  private async ensureConfigModulesAsync(modules: string[] = []): Promise<void> {
    const requestedModules = this.normalizeConfigModules(modules);
    if (!requestedModules.length) {
      this._config = {};
      return;
    }

    await this._storageReady;

    const activeConfig: Record<string, any> = {};
    const missingModules: string[] = [];

    for (const module of requestedModules) {
      if (this._config?.[module]) {
        activeConfig[module] = this._config[module];
        continue;
      }

      const cachedModule = await this.readConfigModuleFromStorage(module);
      if (cachedModule) {
        activeConfig[module] = cachedModule;
      } else {
        missingModules.push(module);
      }
    }

    if (missingModules.length) {
      const processedConfig = await this.fetchAndCacheFullConfig();
      for (const module of requestedModules) {
        if (processedConfig[module]) {
          activeConfig[module] = processedConfig[module];
        }
      }
    }

    this._config = activeConfig;
  }

  private normalizeConfigModules(modules: string[] = []): string[] {
    return Array.from(new Set(
      modules
        .map(module => String(module || '').trim())
        .filter(module => module.length > 0)
    ));
  }

  private async fetchAndCacheFullConfig(): Promise<Record<string, any>> {
    if (!this._configFetchPromise) {
      this._configFetchPromise = firstValueFrom(
        this.http.get(`${this._base_url}/settings/settings/me/`).pipe(
          map((config: any) => this.processConfigResponse(config))
        )
      ).then(async ({ processedConfig, appIndex }) => {
        await this.writeConfigModulesToStorage(processedConfig, appIndex);
        return processedConfig;
      }).finally(() => {
        this._configFetchPromise = null;
      });
    }

    return this._configFetchPromise;
  }

  private async replaceConfigResponse(value: any, activeModules: string[] = []): Promise<void> {
    await this.clearConfigStorageForCurrentUser();
    await this.cacheConfigResponse(value, activeModules);
  }

  private async cacheConfigResponse(value: any, activeModules: string[] = []): Promise<void> {
    const { processedConfig, appIndex } = this.processConfigResponse(value);
    await this.writeConfigModulesToStorage(processedConfig, appIndex);

    const requestedModules = this.normalizeConfigModules(activeModules);
    this._config = requestedModules.reduce((acc: Record<string, any>, module) => {
      if (processedConfig[module]) {
        acc[module] = processedConfig[module];
      }
      return acc;
    }, {});
  }

  private processConfigResponse(value: any): { processedConfig: Record<string, any>; appIndex: Record<string, string[]> } {
    const attributes = value?.data?.attributes;
    return {
      processedConfig: this.getCustomField(attributes),
      appIndex: this.buildConfigAppIndex(attributes),
    };
  }

  private async writeConfigModulesToStorage(config: Record<string, any>, appIndex: Record<string, string[]> = {}): Promise<void> {
    const modules = Object.keys(config || {});
    const existingIndex = await this.readConfigIndexFromStorage();
    const nextIndex = Array.from(new Set([...existingIndex, ...modules]));

    for (const module of modules) {
      await this.writeConfigModuleToStorage(module, config[module]);
    }

    await this.writeConfigIndexToStorage(nextIndex);
    if (Object.keys(appIndex).length) {
      await this.writeConfigAppIndexToStorage(appIndex);
    }
  }

  private configStorageScope(): string {
    return String(this.userId() ?? this.username() ?? 'anonymous');
  }

  private configStorageKey(module: string): string {
    return `${this._configCachePrefix}:${this.configStorageScope()}:${module}`;
  }

  private configIndexStorageKey(): string {
    return `${this._configCacheIndex}:${this.configStorageScope()}`;
  }

  private configAppIndexStorageKey(): string {
    return `${this._configCacheAppIndex}:${this.configStorageScope()}`;
  }

  private async resolveConfigModulesForUrl(url: string): Promise<string[]> {
    const routeKeys = this.extractConfigRouteKeys(url);
    if (!routeKeys.length) return [];

    const [moduleIndex, appIndex] = await Promise.all([
      this.readConfigIndexFromStorage(),
      this.readConfigAppIndexFromStorage()
    ]);
    const resolvedModules = new Set<string>();

    for (const routeKey of routeKeys) {
      const routeAliases = this.configKeyAliases(routeKey);

      for (const alias of routeAliases) {
        for (const module of appIndex[alias] || []) {
          resolvedModules.add(module);
        }
      }

      const indexedModule = this.findIndexedConfigModule(routeAliases, moduleIndex);
      if (indexedModule) {
        resolvedModules.add(indexedModule);
        for (const modules of Object.values(appIndex)) {
          if (modules.includes(indexedModule)) {
            modules.forEach(module => resolvedModules.add(module));
          }
        }
      }
    }

    return this.normalizeConfigModules(Array.from(resolvedModules));
  }

  private extractConfigRouteKeys(url: string): string[] {
    const rawUrl = String(url || '');
    const [pathPart, queryPart = ''] = rawUrl.split('?');
    const segments = pathPart
      .split('#')[0]
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);
    const query = queryPart.split('#')[0];
    const keys = [...segments];

    if (query) {
      const params = new URLSearchParams(query);
      ['pos', 'type', 'module'].forEach(param => {
        const value = params.get(param);
        if (value) keys.push(value);
      });
    }

    return this.normalizeConfigModules(keys);
  }

  private findIndexedConfigModule(routeAliases: string[], modules: string[]): string | null {
    const aliasSet = new Set(routeAliases);
    return modules.find(module => this.configKeyAliases(module).some(alias => aliasSet.has(alias))) || null;
  }

  private buildConfigAppIndex(data: any): Record<string, string[]> {
    const appIndex: Record<string, string[]> = {};
    if (!data || typeof data !== 'object') return appIndex;

    for (const [appKey, appConfig] of Object.entries(data)) {
      if (!appConfig || typeof appConfig !== 'object') continue;
      const modules = Object.keys(appConfig as Record<string, any>);
      if (!modules.length) continue;

      for (const alias of this.configKeyAliases(appKey)) {
        appIndex[alias] = this.normalizeConfigModules([...(appIndex[alias] || []), ...modules]);
      }
    }

    return appIndex;
  }

  private configKeyAliases(key: string): string[] {
    const normalized = String(key || '').trim().toLowerCase();
    if (!normalized) return [];

    const baseVariants = new Set<string>([
      normalized,
      normalized.replace(/_/g, '-'),
      normalized.replace(/-/g, '_')
    ]);

    for (const variant of Array.from(baseVariants)) {
      if (variant.endsWith('ies') && variant.length > 3) {
        baseVariants.add(`${variant.slice(0, -3)}y`);
      } else if (variant.endsWith('y') && variant.length > 1) {
        baseVariants.add(`${variant.slice(0, -1)}ies`);
      }

      if (variant.endsWith('s') && variant.length > 1) {
        baseVariants.add(variant.slice(0, -1));
      } else {
        baseVariants.add(`${variant}s`);
      }
    }

    const aliases = new Set<string>();
    for (const variant of baseVariants) {
      aliases.add(variant);
      aliases.add(variant.replace(/_/g, '-'));
      aliases.add(variant.replace(/-/g, '_'));
    }

    return Array.from(aliases).filter(Boolean);
  }

  private async readConfigModuleFromStorage(module: string): Promise<any | null> {
    try {
      const key = this.configStorageKey(module);
      const raw = this.generalS.isMobile()
        ? (await Preferences.get({ key })).value
        : localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private readConfigModuleFromStorageSync(module: string): any | null {
    try {
      if (this.generalS.isMobile() || typeof localStorage === 'undefined') return null;

      const raw = localStorage.getItem(this.configStorageKey(module));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private buildTransientEmptyConfigModule(): any {
    return {
      cols: {},
      config_cols: {},
      draw: {},
      general: {},
      fields: {}
    };
  }

  private async writeConfigModuleToStorage(module: string, value: any): Promise<void> {
    const key = this.configStorageKey(module);
    const raw = JSON.stringify(value ?? {});
    if (this.generalS.isMobile()) {
      await Preferences.set({ key, value: raw });
    } else {
      localStorage.setItem(key, raw);
    }
  }

  private async readConfigIndexFromStorage(): Promise<string[]> {
    try {
      const key = this.configIndexStorageKey();
      const raw = this.generalS.isMobile()
        ? (await Preferences.get({ key })).value
        : localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async readConfigAppIndexFromStorage(): Promise<Record<string, string[]>> {
    try {
      const key = this.configAppIndexStorageKey();
      const raw = this.generalS.isMobile()
        ? (await Preferences.get({ key })).value
        : localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

      return Object.entries(parsed).reduce((acc: Record<string, string[]>, [key, modules]) => {
        acc[key] = this.normalizeConfigModules(Array.isArray(modules) ? modules : []);
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  private async writeConfigIndexToStorage(modules: string[]): Promise<void> {
    const key = this.configIndexStorageKey();
    const raw = JSON.stringify(this.normalizeConfigModules(modules));
    if (this.generalS.isMobile()) {
      await Preferences.set({ key, value: raw });
    } else {
      localStorage.setItem(key, raw);
    }
  }

  private async writeConfigAppIndexToStorage(appIndex: Record<string, string[]>): Promise<void> {
    const normalizedIndex = Object.entries(appIndex || {}).reduce((acc: Record<string, string[]>, [key, modules]) => {
      acc[key] = this.normalizeConfigModules(modules);
      return acc;
    }, {});
    const key = this.configAppIndexStorageKey();
    const raw = JSON.stringify(normalizedIndex);
    if (this.generalS.isMobile()) {
      await Preferences.set({ key, value: raw });
    } else {
      localStorage.setItem(key, raw);
    }
  }

  private async removeConfigStorageKey(key: string): Promise<void> {
    if (this.generalS.isMobile()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }

  private async clearConfigStorageForCurrentUser(): Promise<void> {
    const modules = await this.readConfigIndexFromStorage();
    for (const module of modules) {
      await this.removeConfigStorageKey(this.configStorageKey(module));
    }

    await this.removeConfigStorageKey(this.configIndexStorageKey());
    await this.removeConfigStorageKey(this.configAppIndexStorageKey());
    this._config = {};
  }

  // ]]]FI

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
              key: fieldName,
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
            switchMap((config: any) => {
              return from(this.replaceConfigResponse(config));
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
