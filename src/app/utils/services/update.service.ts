import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { GeneralService } from './general.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timeout, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';

export interface UpdatePolicy {
  platform: string;
  channel: string;                 // dev | qa | prod
  minVersionCode: number;          // por debajo = BLOQUEO obligatorio
  latest: {
    versionCode: number;
    versionName: string;
    url: string;
    sha256?: string;               // hash para verificar (opcional pero recomendado)
    size?: number;
  };
  forceFrom?: number;              // desde este code hacia abajo = forzar (útil para cortes graduales)
  deadline?: string | null;        // fecha límite de gracia; luego se bloquea incluso offline
  message?: string;
  maintenance?: boolean;           // kill switch si true
  blockedVersions?: number[];      // versiones explícitamente bloqueadas
  rolloutPercent?: number;         // 0–100, para despliegues graduales
  allowSkipOffline?: boolean;      // permite saltarse la actualización si no hay internet
  changelogUrl?: string;           // URL con detalles de cambios
  whitelist?: string[];            // deviceIds que pueden saltarse el bloqueo (QA)
}

export interface UpdateCheckResult {
  updateRequired: boolean;
  forced: boolean;
  url?: string;
  message?: string;
  versionName?: string;
  // [[[II ESC:028-06 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-06
  refreshPage?: boolean;
  // ]]]FI
  canSkipOffline?: boolean;
  isBlocked?: boolean;
  isMaintenance?: boolean;
  deadline?: Date | null;
  changelogUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  private readonly UPDATE_POLICY_KEY = 'last_update_policy';
  private readonly LAST_CHECK_KEY = 'last_update_check';
  private readonly LAST_NAG_KEY = 'last_update_nag';
  private readonly SKIP_UNTIL_KEY = 'skip_update_until';

  constructor(
    private http: HttpClient,
    private generalS: GeneralService
  ) { }

  /**
   * Verifica si la app necesita actualización
   * @param channel Canal de actualización (dev | qa | prod)
   * @param forceCheck Forzar verificación ignorando cache temporal (pero siempre consulta servidor)
   * @returns Resultado de la verificación de actualización
   */
  public async checkForUpdates(
    channel: 'dev' | 'qa' | 'prod' = 'qa',
    forceCheck: boolean = false
  ): Promise<UpdateCheckResult> {

    // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
    // Las verificaciones automáticas conservan el alcance móvil previo; los
    // bloqueos del backend usan forceCheck para web/desktop y deben ir al servidor.
    if (!this.generalS.isMobile() && !forceCheck) {
      return {
        updateRequired: false,
        forced: false
      };
    }
    // ]]]FI

    try {
      // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
      const appInfo = await this.getCurrentAppInfo();
      const deviceId = await this.generalS.getDeviceId();
      const currentVersionCode = appInfo.versionCode;

      console.log(`📱 Versión actual: ${currentVersionCode} (${appInfo.versionName})`);
      // ]]]FI

      let policy: UpdatePolicy | null = null;
      let isOffline = false;
      let shouldCheckServer = forceCheck || (await this.shouldCheckForUpdates());

      // Intentar obtener política del servidor solo si corresponde (una vez al día)
      if (shouldCheckServer) {
        try {
          // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
          policy = await this.fetchUpdatePolicy(channel, currentVersionCode, deviceId, appInfo.platform);
          // ]]]FI

          // Guardar la política para uso offline
          await Preferences.set({
            key: this.UPDATE_POLICY_KEY,
            value: JSON.stringify(policy)
          });

          // Actualizar timestamp de última verificación al servidor
          await Preferences.set({
            key: this.LAST_CHECK_KEY,
            value: Date.now().toString()
          });

          console.log('✅ Política de actualización obtenida del servidor');
        } catch (error) {
          console.log('🚫 Error al obtener política del servidor:', error);
          isOffline = true;
          policy = null;
        }
      } else {
        console.log('📅 Usando cache - última consulta al servidor hace menos de 24h');
      }

      // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
      if (!policy && forceCheck) {
        console.error('❌ Verificación forzada sin política fresca del servidor; no se usará cache local');
        return {
          updateRequired: false,
          forced: false
        };
      }
      // ]]]FI

      // Si no se pudo obtener del servidor o no tocaba consultar, usar cache
      if (!policy) {
        const cachedPolicy = await Preferences.get({ key: this.UPDATE_POLICY_KEY });
        if (cachedPolicy.value) {
          policy = JSON.parse(cachedPolicy.value);
          console.log('📦 Usando política cached');
          isOffline = true; // Marcamos como offline porque no consultamos servidor
        } else {
          console.error('❌ No hay política cached disponible y no se pudo consultar servidor');
          return {
            updateRequired: false,
            forced: false
          };
        }
      }

      // Verificar que tenemos una política válida
      if (!policy) {
        console.error('❌ No se pudo obtener política de actualización');
        return {
          updateRequired: false,
          forced: false
        };
      }

      // Analizar política y determinar acción
      const result = await this.analyzeUpdatePolicy(
        policy,
        currentVersionCode,
        deviceId,
        isOffline
      );

      console.log('🔍 Resultado de verificación:', result);
      return result;

    } catch (error) {
      console.error('💥 Error en checkForUpdates:', error);
      return {
        updateRequired: false,
        forced: false
      };
    }
  }

  /**
   * Verifica si hay actualizaciones usando SOLO la cache (sin consultar servidor)
   * Útil para verificaciones rápidas en cada apertura de app
   * @param channel Canal de actualización (dev | qa | prod)  
   * @returns Resultado de la verificación de actualización basada en cache
   */
  public async checkForUpdatesFromCache(
    channel: 'dev' | 'qa' | 'prod' = 'qa'
  ): Promise<UpdateCheckResult> {

    // Solo verificar actualizaciones en móviles
    if (!this.generalS.isMobile()) {
      return {
        updateRequired: false,
        forced: false
      };
    }

    try {
      // Obtener información de la app actual
      const appInfo = await App.getInfo();
      const deviceId = await this.generalS.getDeviceId();
      const currentVersionCode = parseInt(appInfo.build) || 0;

      console.log(`📱 Verificación de cache - Versión actual: ${currentVersionCode} (${appInfo.version})`);

      // Intentar usar política cached
      const cachedPolicy = await Preferences.get({ key: this.UPDATE_POLICY_KEY });
      if (!cachedPolicy.value) {
        console.log('📦 No hay política cached - realizando verificación completa');
        return await this.checkForUpdates(channel, false);
      }

      const policy: UpdatePolicy = JSON.parse(cachedPolicy.value);
      console.log('⚡ Usando política cached para verificación rápida');

      // Analizar política y determinar acción (marcamos como offline ya que usamos cache)
      const result = await this.analyzeUpdatePolicy(
        policy,
        currentVersionCode,
        deviceId,
        true // isOffline = true porque usamos cache
      );

      console.log('🔍 Resultado de verificación (cache):', result);
      return result;

    } catch (error) {
      console.error('💥 Error en checkForUpdatesFromCache:', error);
      return {
        updateRequired: false,
        forced: false
      };
    }
  }

  /**
   * Abre la URL de descarga del APK
   * @param url URL del APK
   * @param sha256 Hash para verificar (opcional)
   */
  public async openDownload(url: string, sha256?: string): Promise<void> {
    try {
      console.log('🔗 Abriendo descarga:', url);

      // Verificar que la URL sea HTTPS
      if (!url.startsWith('https://')) {
        throw new Error('URL de descarga debe usar HTTPS');
      }

      // Verificar SHA256 si se proporciona
      if (sha256) {
        console.log('🔐 SHA256 esperado:', sha256);

        // TODO: Implementar descarga interna con verificación SHA256
        // const isValid = await this.downloadAndVerify(url, sha256);
        // if (!isValid) {
        //   throw new Error('Verificación SHA256 falló. El archivo podría estar corrupto.');
        // }
      }

      await Browser.open({ url });
    } catch (error) {
      console.error('💥 Error al abrir descarga:', error);
      throw error;
    }
  }

  /**
   * Descarga un archivo y verifica su SHA256 (implementación futura)
   * @param url URL del archivo
   * @param expectedSha256 Hash esperado
   */
  private async downloadAndVerify(url: string, expectedSha256: string): Promise<boolean> {
    try {
      // 1. Descargar el archivo usando fetch
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 2. Obtener el ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // 3. Verificar el hash
      const isValid = await this.verifyFileHash(arrayBuffer, expectedSha256);

      console.log(`🔐 Verificación SHA256: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
      return isValid;

    } catch (error) {
      console.error('💥 Error descargando/verificando archivo:', error);
      return false;
    }
  }

  /**
   * Marca que el usuario quiere saltarse la actualización temporalmente
   * @param hours Horas que saltarse la notificación
   */
  public async snoozeUpdate(hours: number = 24): Promise<void> {
    const skipUntil = Date.now() + (hours * 60 * 60 * 1000);
    await Preferences.set({
      key: this.SKIP_UNTIL_KEY,
      value: skipUntil.toString()
    });
    console.log(`😴 Actualización pospuesta por ${hours} horas`);
  }

  /**
   * Verifica si se debe hacer una nueva verificación de actualización al servidor
   * Solo permite consultar al servidor una vez por día (24 horas)
   */
  private async shouldCheckForUpdates(): Promise<boolean> {
    const lastCheck = await Preferences.get({ key: this.LAST_CHECK_KEY });

    if (!lastCheck.value) return true;

    const lastCheckTime = parseInt(lastCheck.value);
    const hoursSinceLastCheck = (Date.now() - lastCheckTime) / (1000 * 60 * 60);

    // Verificar servidor solo una vez al día (24 horas)
    return hoursSinceLastCheck >= 24;
  }

  /**
   * Obtiene la política de actualización del servidor
   */
  private async fetchUpdatePolicy(
    channel: string,
    versionCode: number,
    deviceId: string | null,
    platform: string = 'android'
  ): Promise<UpdatePolicy> {
    // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
    const params = new URLSearchParams({
      platform,
      channel,
      versionCode: versionCode.toString()
    });
    // ]]]FI

    if (deviceId) {
      params.append('deviceId', deviceId);
    }

    const urlSinUltimos3 = environment.base_url.substring(0, environment.base_url.length - 3);
    const url = `${urlSinUltimos3}/app/update-policy?${params.toString()}`;

    return this.http.get<UpdatePolicy>(url).pipe(
      timeout(10000), // 10 segundos timeout usando operador
      catchError(error => {
        console.error('Error al obtener política de actualización:', url, error);
        throw error;
      })
    ).toPromise() as Promise<UpdatePolicy>;
  }

  /**
   * Analiza la política de actualización y determina qué acción tomar
   */
  private async analyzeUpdatePolicy(
    policy: UpdatePolicy,
    currentVersionCode: number,
    deviceId: string | null,
    isOffline: boolean
  ): Promise<UpdateCheckResult> {

    const latest = policy.latest?.versionCode ?? currentVersionCode;
    const mustBlock = currentVersionCode < policy.minVersionCode;
    const forceUpdate = policy.forceFrom && currentVersionCode < policy.forceFrom;
    const isBlocked = policy.blockedVersions?.includes(currentVersionCode) ?? false;
    const deadline = policy.deadline ? new Date(policy.deadline) : null;

    console.log('🔍 Analizando política:', policy);
    console.error(`-----latest: ${latest}  ${policy.latest?.versionCode} ?? ${currentVersionCode}`);
    console.error(`------mustBlock: ${mustBlock} ${currentVersionCode} < ${policy.minVersionCode}`);
    console.error(`------forceUpdate: ${forceUpdate} ${currentVersionCode} && ${policy.forceFrom}`);
    console.error(`------isBlocked: ${isBlocked} ${policy.blockedVersions} includes ${currentVersionCode}`);
    console.error(`------deadline: ${deadline} `);


    // Verificar si el dispositivo está en whitelist (para QA)
    const isWhitelisted = policy.whitelist?.includes(deviceId || '') ?? false;

    // Kill switch de mantenimiento
    if (policy.maintenance && !isWhitelisted) {
      return {
        updateRequired: true,
        forced: true,
        url: policy.latest.url,
        message: policy.message + 'maintenance' || 'Mantenimiento en curso. Por favor, actualiza la aplicación.',
        versionName: policy.latest.versionName,
        isMaintenance: true,
        canSkipOffline: false
      };
    }

    // Versión bloqueada explícitamente
    if (isBlocked && !isWhitelisted) {
      return {
        updateRequired: true,
        forced: true,
        url: policy.latest.url,
        message: policy.message + 'mustBlock' || `Versión ${currentVersionCode} bloqueada. Actualiza inmediatamente.`,
        versionName: policy.latest.versionName,
        isBlocked: true,
        canSkipOffline: false
      };
    }

    // Bloqueo por versión mínima
    if (mustBlock && !isWhitelisted) {
      // Si estamos offline y hay deadline vencido, bloquear
      if (isOffline && deadline && new Date() > deadline) {
        return {
          updateRequired: true,
          forced: true,
          url: policy.latest.url,
          message: policy.message + 'mustBlock1' || 'Actualización obligatoria vencida. No puedes usar la app sin actualizar.',
          versionName: policy.latest.versionName,
          deadline: deadline,
          canSkipOffline: false
        };
      }

      return {
        updateRequired: true,
        forced: true,
        url: policy.latest.url,
        message: policy.message + 'mustBlock not Offline' || `Actualiza a ${policy.latest.versionName} para continuar.`,
        versionName: policy.latest.versionName,
        canSkipOffline: isOffline && (policy.allowSkipOffline ?? false),
        deadline: deadline
      };
    }

    // Actualización forzada gradual
    if (forceUpdate && !isWhitelisted) {
      return {
        updateRequired: true,
        forced: true,
        url: policy.latest.url,
        message: policy.message + 'forceUpdate' || `Actualización obligatoria a ${policy.latest.versionName}`,
        versionName: policy.latest.versionName,
        canSkipOffline: isOffline && (policy.allowSkipOffline ?? false),
        deadline: deadline
      };
    }

    // Actualización opcional disponible
    if (currentVersionCode < latest) {
      // Verificar rollout percentage
      if (policy.rolloutPercent !== undefined && policy.rolloutPercent < 100) {
        if (!await this.isInRolloutPercentage(deviceId, policy.rolloutPercent)) {
          console.log(`📊 Fuera del rollout (${policy.rolloutPercent}%)`);
          return { updateRequired: false, forced: false };
        }
      }

      // Verificar si ya se mostró la notificación recientemente
      if (!(await this.shouldShowUpdateNag())) {
        return { updateRequired: false, forced: false };
      }

      // Verificar si el usuario pospuso la actualización
      const skipUntil = await Preferences.get({ key: this.SKIP_UNTIL_KEY });
      if (skipUntil.value && Date.now() < parseInt(skipUntil.value)) {
        console.log('😴 Actualización pospuesta por el usuario');
        return { updateRequired: false, forced: false };
      }

      // Actualizar timestamp de última notificación
      await Preferences.set({
        key: this.LAST_NAG_KEY,
        value: Date.now().toString()
      });

      return {
        updateRequired: true,
        forced: false,
        url: policy.latest.url,
        message: policy.message + 'opcional' || `Nueva versión disponible: ${policy.latest.versionName}`,
        versionName: policy.latest.versionName,
        changelogUrl: policy.changelogUrl,
        canSkipOffline: true
      };
    }

    // No se necesita actualización
    return {
      updateRequired: false,
      forced: false
    };
  }

  /**
   * Verifica si el dispositivo está incluido en el porcentaje de rollout
   */
  private async isInRolloutPercentage(deviceId: string | null, rolloutPercent: number): Promise<boolean> {
    if (!deviceId || rolloutPercent >= 100) return true;

    // Usar hash del deviceId para distribución consistente
    const hash = CryptoJS.SHA256(deviceId).toString();
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    const percentage = hashNumber % 100;

    return percentage < rolloutPercent;
  }

  /**
   * Verifica si se debe mostrar la notificación de actualización opcional
   */
  private async shouldShowUpdateNag(): Promise<boolean> {
    const lastNag = await Preferences.get({ key: this.LAST_NAG_KEY });

    if (!lastNag.value) return true;

    const lastNagTime = parseInt(lastNag.value);
    const hoursSinceLastNag = (Date.now() - lastNagTime) / (1000 * 60 * 60);

    // Mostrar notificación cada 24 horas como máximo
    return hoursSinceLastNag >= 24;
  }

  /**
   * Verifica el SHA256 de un archivo (para uso futuro)
   */
  private async verifyFileHash(fileArrayBuffer: ArrayBuffer, expectedSha256: string): Promise<boolean> {
    try {
      const wordArray = CryptoJS.lib.WordArray.create(fileArrayBuffer);
      const hash = CryptoJS.SHA256(wordArray).toString();
      return hash.toLowerCase() === expectedSha256.toLowerCase();
    } catch (error) {
      console.error('Error verificando hash:', error);
      return false;
    }
  }

  /**
   * Obtiene información de la app actual
   */
  // [[[II ESC:028-04 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-04
  public async getCurrentAppInfo(): Promise<{
    versionCode: number;
    versionName: string;
    platform: string;
  }> {
    if (!this.generalS.isMobile()) {
      return {
        versionCode: Number(environment.appBuild) || 0,
        versionName: environment.appVersion || '0.0.0',
        platform: this.resolveUpdatePlatform()
      };
    }

    const [appInfo, deviceInfo] = await Promise.all([
      App.getInfo(),
      Device.getInfo()
    ]);

    return {
      versionCode: parseInt(appInfo.build) || 0,
      versionName: appInfo.version || '0.0.0',
      platform: this.resolveUpdatePlatform(deviceInfo.platform)
    };
  }

  private resolveUpdatePlatform(deviceInfoPlatform?: string): 'android' | 'ios' | 'web' | 'desktop' {
    if (this.generalS.isMobile()) {
      return String(deviceInfoPlatform).toLowerCase() === 'ios' ? 'ios' : 'android';
    }

    try {
      const clientPlatform = this.generalS.getClientPlatform?.();
      return clientPlatform === 'desktop' ? 'desktop' : 'web';
    } catch {
      return 'web';
    }
  }
  // ]]]FI

  /**
   * Limpia cache de verificaciones
   * Esto forzará una nueva consulta al servidor en la próxima verificación
   */
  public async clearUpdateCache(): Promise<void> {
    await Preferences.remove({ key: this.UPDATE_POLICY_KEY });
    await Preferences.remove({ key: this.LAST_CHECK_KEY });
    await Preferences.remove({ key: this.LAST_NAG_KEY });
    await Preferences.remove({ key: this.SKIP_UNTIL_KEY });
    console.log('🧹 Cache de actualizaciones limpiado');
  }

  /**
   * Obtiene estadísticas de verificación para debug
   */
  public async getDebugInfo(): Promise<{
    lastCheck?: Date;
    lastNag?: Date;
    skipUntil?: Date;
    hasCachedPolicy: boolean;
  }> {
    const lastCheck = await Preferences.get({ key: this.LAST_CHECK_KEY });
    const lastNag = await Preferences.get({ key: this.LAST_NAG_KEY });
    const skipUntil = await Preferences.get({ key: this.SKIP_UNTIL_KEY });
    const cachedPolicy = await Preferences.get({ key: this.UPDATE_POLICY_KEY });

    return {
      lastCheck: lastCheck.value ? new Date(parseInt(lastCheck.value)) : undefined,
      lastNag: lastNag.value ? new Date(parseInt(lastNag.value)) : undefined,
      skipUntil: skipUntil.value ? new Date(parseInt(skipUntil.value)) : undefined,
      hasCachedPolicy: !!cachedPolicy.value
    };
  }
}
