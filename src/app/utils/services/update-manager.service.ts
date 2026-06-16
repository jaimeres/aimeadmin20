import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { filter } from 'rxjs/operators';
import { App } from '@capacitor/app';
import { UpdateService, UpdateCheckResult } from './update.service';
import { GeneralService } from './general.service';

@Injectable({
  providedIn: 'root'
})
export class UpdateManagerService {

  private updateDialogVisible$ = new BehaviorSubject<boolean>(false);
  private currentUpdateResult$ = new BehaviorSubject<UpdateCheckResult | null>(null);
  private currentVersion$ = new BehaviorSubject<string>('');
  private isOffline$ = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public updateDialogVisible = this.updateDialogVisible$.asObservable();
  public currentUpdateResult = this.currentUpdateResult$.asObservable();
  public currentVersion = this.currentVersion$.asObservable();
  public isOffline = this.isOffline$.asObservable();

  //inicializo el sistema de actualizaciones
  private isInitialized = true;

  constructor(
    private updateService: UpdateService,
    private generalService: GeneralService
  ) {
    this.setupEventListeners();
  }

  /**
   * Inicializa el sistema de actualizaciones
   * Debe llamarse desde app.component.ts o el componente principal
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Solo inicializar en móviles
    if (!this.generalService.isMobile()) {
      //console.log('📱 UpdateManager: No inicializando en web');
      return;
    }

    try {
      // Obtener versión actual
      const appInfo = await this.updateService.getCurrentAppInfo();
      //console.log(appInfo);
      this.currentVersion$.next(`${appInfo.versionCode} (${appInfo.versionName})`);

      //console.log('🚀 UpdateManager inicializado');
      this.isInitialized = true;

      // Verificar actualizaciones al iniciar
      await this.checkForUpdatesAndShow();

    } catch (error) {
      //console.error('💥 Error inicializando UpdateManager:', error);
    }
  }

  /**
   * Verifica actualizaciones y muestra diálogo si es necesario
   */
  public async checkForUpdatesAndShow(forceCheck: boolean = false): Promise<void> {
    if (!this.generalService.isMobile()) return;

    try {
      //console.log('🔍 Verificando actualizaciones...');

      // Detectar estado de conexión
      const isOnline = navigator.onLine;
      this.isOffline$.next(!isOnline);

      // Verificar actualizaciones
      const result = await this.updateService.checkForUpdates('qa', forceCheck);

      //console.log('📊 Resultado verificación:', result);

      if (result.updateRequired) {
        this.currentUpdateResult$.next(result);
        this.showUpdateDialog();
      } else {
        console.log('✅ No se requiere actualización');
      }

    } catch (error) {
      //console.error('💥 Error verificando actualizaciones:', error);
    }
  }

  /**
   * Muestra el diálogo de actualización
   */
  public showUpdateDialog(): void {
    this.updateDialogVisible$.next(true);
  }

  /**
   * Oculta el diálogo de actualización
   */
  public hideUpdateDialog(): void {
    this.updateDialogVisible$.next(false);
  }

  /**
   * Maneja el clic en "Actualizar"
   */
  public async handleUpdateClick(): Promise<void> {
    const result = this.currentUpdateResult$.value;
    if (!result?.url) return;

    try {
      //console.log('📥 Iniciando descarga...');
      await this.updateService.openDownload(result.url, result.versionName);

      // Ocultar diálogo después de abrir descarga
      this.hideUpdateDialog();

    } catch (error) {
      //console.error('💥 Error abriendo descarga:', error);
      // Aquí podrías mostrar un toast de error
    }
  }

  /**
   * Maneja el clic en "Después" (posponer)
   */
  public async handleLaterClick(): Promise<void> {
    try {
      // Posponer por 24 horas
      await this.updateService.snoozeUpdate(24);
      //console.log('😴 Actualización pospuesta por 24 horas');

    } catch (error) {
      //console.error('💥 Error posponiendo actualización:', error);
    }
  }

  /**
   * Maneja el clic en "Usar sin actualizar" (solo offline)
   */
  public handleSkipOfflineClick(): void {
    //console.log('📱 Usuario continuó sin actualizar (offline)');
    // Aquí podrías registrar este evento para analítica
  }

  /**
   * Configura listeners para eventos de la app
   */
  private setupEventListeners(): void {
    if (!this.generalService.isMobile()) return;

    try {
      // Listener para cuando la app vuelve al foreground
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          //console.log('📱 App volvió al foreground, verificando actualizaciones...');
          setTimeout(() => {
            this.checkForUpdatesAndShow();
          }, 2000); // Esperar 2 segundos para que la app se estabilice
        }
      });

      // Listener para cambios de conectividad
      window.addEventListener('online', () => {
        //console.log('🌐 Conexión restaurada');
        this.isOffline$.next(false);
        setTimeout(() => {
          this.checkForUpdatesAndShow();
        }, 1000);
      });

      window.addEventListener('offline', () => {
        //console.log('📡 Conexión perdida');
        this.isOffline$.next(true);
      });

      //console.log('👂 Event listeners configurados');

    } catch (error) {
      //console.error('💥 Error configurando event listeners:', error);
    }
  }

  /**
   * Fuerza una verificación inmediata (para botones de "Verificar actualizaciones")
   */
  public async forceUpdateCheck(): Promise<boolean> {
    if (!this.generalService.isMobile()) return false;

    try {
      await this.checkForUpdatesAndShow(true);
      return true;
    } catch (error) {
      //console.error('💥 Error en verificación forzada:', error);
      return false;
    }
  }

  /**
   * Obtiene información de debug del sistema de actualizaciones
   */
  public async getDebugInfo(): Promise<{
    isInitialized: boolean;
    currentVersion: string;
    isOnline: boolean;
    dialogVisible: boolean;
    lastUpdateResult: UpdateCheckResult | null;
    updateServiceDebug: any;
  }> {
    return {
      isInitialized: this.isInitialized,
      currentVersion: this.currentVersion$.value,
      isOnline: !this.isOffline$.value,
      dialogVisible: this.updateDialogVisible$.value,
      lastUpdateResult: this.currentUpdateResult$.value,
      updateServiceDebug: await this.updateService.getDebugInfo()
    };
  }

  /**
   * Limpia el cache del sistema de actualizaciones
   */
  public async clearCache(): Promise<void> {
    await this.updateService.clearUpdateCache();
    this.currentUpdateResult$.next(null);
    this.hideUpdateDialog();
    //console.log('🧹 Cache del UpdateManager limpiado');
  }

  /**
   * Verifica si hay una actualización pendiente (para mostrar badges, etc.)
   */
  public hasPendingUpdate(): boolean {
    const result = this.currentUpdateResult$.value;
    return !!(result?.updateRequired && !result.forced);
  }

  /**
   * Verifica si hay una actualización crítica (forzada)
   */
  public hasCriticalUpdate(): boolean {
    const result = this.currentUpdateResult$.value;
    return !!(result?.updateRequired && result.forced);
  }

  /**
   * Destruir el servicio (cleanup)
   */
  public destroy(): void {
    // Limpiar subscripciones si las hubiera
    this.isInitialized = false;
    //console.log('🗑️ UpdateManager destruido');
  }
}
