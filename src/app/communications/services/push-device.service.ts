// [[[II ESC:025-01 DOC:docs/documents/2026-06-28-025-push-notifications-fcm-capacitor.md#escenario-01
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'src/app/components/services/message.service';
import { GeneralService } from 'src/app/utils/services/general.service';
import { environment } from 'src/environments/environment';

type PushPlatform = 'AND' | 'IOS';

interface PushDeviceAttributes {
  token: string;
  provider: 'FCM';
  platform: PushPlatform;
  device_id: string;
  app_id: string;
  app_version: string;
  metadata: Record<string, any>;
}

interface PushClientMessage {
  id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  source: 'foreground' | 'tap';
  received_at: string;
}

const PUSH_DEVICE_ID_KEY = 'jukai_push_device_id';
const APP_ID = 'com.jukai.jukai';
const REGISTRATION_TIMEOUT_MS = 15000;
const PUSH_CHANNEL_ID = 'jukai_communications_alerts';

@Injectable({
  providedIn: 'root',
})
export class PushDeviceService {

  private http = inject(HttpClient);
  private generalS = inject(GeneralService);
  private messageS = inject(MessageService);
  private router = inject(Router);
  private readonly baseUrl = `${environment.base_url}/communications/push-device/`;
  private registerPromise: Promise<string | null> | null = null;
  private handlersPromise: Promise<void> | null = null;
  private handlersReady = false;
  private foregroundHandle: PluginListenerHandle | null = null;
  private actionHandle: PluginListenerHandle | null = null;
  private readonly _lastPushMessage = signal<PushClientMessage | null>(null);
  private readonly _foregroundPushCount = signal<number>(0);

  readonly lastPushMessage = this._lastPushMessage.asReadonly();
  readonly foregroundPushCount = this._foregroundPushCount.asReadonly();

  async initializePushHandlers(): Promise<void> {
    if (!this.isNativePushPlatform()) {
      return;
    }

    if (this.handlersReady) {
      return;
    }

    if (this.handlersPromise) {
      return this.handlersPromise;
    }

    this.handlersPromise = this.initializePushHandlersOnce().finally(() => {
      this.handlersPromise = null;
    });

    return this.handlersPromise;
  }

  async registerCurrentDevice(): Promise<string | null> {
    if (!this.isNativePushPlatform()) {
      return null;
    }

    if (this.registerPromise) {
      return this.registerPromise;
    }

    this.registerPromise = this.registerCurrentDeviceOnce().finally(() => {
      this.registerPromise = null;
    });

    return this.registerPromise;
  }

  async deactivateRegisteredDevice(): Promise<void> {
    const id = await this.getStoredPushDeviceId();
    if (!id) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.baseUrl}${encodeURIComponent(id)}/`,
          this.generalS.baseDJA({
            attributes: { is_active: false },
            type: 'push-device',
            id,
          }),
        ),
      );
      await Preferences.remove({ key: PUSH_DEVICE_ID_KEY });
    } catch (error) {
      console.warn('[PushDevice] No fue posible desactivar el dispositivo push:', error);
    }
  }

  private async registerCurrentDeviceOnce(): Promise<string | null> {
    try {
      await this.initializePushHandlers();
      const token = await this.readRegistrationToken();
      if (!token) {
        return null;
      }

      const attributes = await this.buildRegistrationAttributes(token);
      if (!attributes) {
        return null;
      }

      const response = await firstValueFrom(
        this.http.post(
          this.baseUrl,
          this.generalS.baseDJA({
            attributes,
            type: 'push-device',
          }),
        ),
      );
      const id = this.extractPushDeviceId(response);

      if (id) {
        await Preferences.set({ key: PUSH_DEVICE_ID_KEY, value: id });
      }

      return id;
    } catch (error) {
      console.warn('[PushDevice] No fue posible registrar el dispositivo push:', error);
      return null;
    }
  }

  private async readRegistrationToken(): Promise<string | null> {
    const permissionGranted = await this.ensurePermission();
    if (!permissionGranted) {
      return null;
    }

    return new Promise<string | null>(async (resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let registrationHandle: { remove: () => Promise<void> } | null = null;
      let errorHandle: { remove: () => Promise<void> } | null = null;

      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        registrationHandle?.remove().catch(() => undefined);
        errorHandle?.remove().catch(() => undefined);
      };

      const settle = (token: string | null) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(token);
      };

      try {
        [registrationHandle, errorHandle] = await Promise.all([
          PushNotifications.addListener('registration', (token) => {
            settle(token.value || null);
          }),
          PushNotifications.addListener('registrationError', (error) => {
            console.warn('[PushDevice] Error de registro FCM:', error?.error ?? error);
            settle(null);
          }),
        ]);

        timeout = setTimeout(() => settle(null), REGISTRATION_TIMEOUT_MS);
        await PushNotifications.register();
      } catch (error) {
        console.warn('[PushDevice] No fue posible iniciar registro FCM:', error);
        settle(null);
      }
    });
  }

  private async ensurePermission(): Promise<boolean> {
    try {
      let status = await PushNotifications.checkPermissions();
      if (status.receive === 'prompt') {
        status = await PushNotifications.requestPermissions();
      }
      return status.receive === 'granted';
    } catch (error) {
      console.warn('[PushDevice] No fue posible validar permisos push:', error);
      return false;
    }
  }

  private async buildRegistrationAttributes(token: string): Promise<PushDeviceAttributes | null> {
    const platform = this.getPushPlatform();
    if (!platform) {
      return null;
    }

    const [deviceId, appInfo, deviceInfo] = await Promise.all([
      this.generalS.getDeviceId().catch(() => null),
      this.getAppInfo(),
      this.getDeviceInfo(),
    ]);

    return {
      token,
      provider: 'FCM',
      platform,
      device_id: deviceId ?? '',
      app_id: APP_ID,
      app_version: appInfo.version || environment.appVersion,
      metadata: {
        app_build: appInfo.build ?? '',
        push_channel_id: PUSH_CHANNEL_ID,
        device_model: deviceInfo['model'] ?? '',
        device_manufacturer: deviceInfo['manufacturer'] ?? '',
        operating_system: deviceInfo['operatingSystem'] ?? '',
        os_version: deviceInfo['osVersion'] ?? '',
        is_virtual: deviceInfo['isVirtual'] ?? false,
        web_view_version: deviceInfo['webViewVersion'] ?? '',
      },
    };
  }

  private async getAppInfo(): Promise<{ version?: string; build?: string }> {
    try {
      return await App.getInfo();
    } catch {
      return { version: environment.appVersion };
    }
  }

  private async getDeviceInfo(): Promise<Record<string, any>> {
    try {
      return await Device.getInfo();
    } catch {
      return {};
    }
  }

  private getPushPlatform(): PushPlatform | null {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'AND';
    }
    if (platform === 'ios') {
      return 'IOS';
    }
    return null;
  }

  private isNativePushPlatform(): boolean {
    return Capacitor.isNativePlatform() && this.getPushPlatform() !== null;
  }

  private async initializePushHandlersOnce(): Promise<void> {
    try {
      await this.createAndroidCommunicationChannel();

      const [foregroundHandle, actionHandle] = await Promise.all([
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.handleForegroundNotification(notification);
        }),
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          this.handleNotificationAction(action);
        }),
      ]);

      this.foregroundHandle = foregroundHandle;
      this.actionHandle = actionHandle;
      this.handlersReady = true;
    } catch (error) {
      console.warn('[PushDevice] No fue posible inicializar listeners push:', error);
    }
  }

  private async createAndroidCommunicationChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await PushNotifications.createChannel({
        id: PUSH_CHANNEL_ID,
        name: 'Jukai comunicaciones',
        description: 'Avisos, tareas y comunicaciones importantes de Jukai.',
        importance: 4,
        visibility: 1,
        lights: true,
        lightColor: '#2563EB',
        vibration: true,
      });
    } catch (error) {
      console.warn('[PushDevice] No fue posible crear el canal push Android:', error);
    }
  }

  private handleForegroundNotification(notification: PushNotificationSchema): void {
    const message = this.buildClientMessage(notification, 'foreground');
    console.info('[PushDevice] pushNotificationReceived', {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      data: message.data,
      rawData: notification.data,
    });
    this._lastPushMessage.set(message);
    this._foregroundPushCount.update((count) => count + 1);
    this.messageS.changeMessage(
      message.body,
      null,
      {},
      this.getToastSeverity(message.data),
      message.title,
      false,
      9000,
    );
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const message = this.buildClientMessage(action.notification, 'tap');
    console.info('[PushDevice] pushNotificationActionPerformed', {
      actionId: action.actionId,
      inputValue: action.inputValue,
      id: action.notification.id,
      title: action.notification.title,
      body: action.notification.body,
      link: action.notification.link,
      data: message.data,
      rawData: action.notification.data,
    });
    this._lastPushMessage.set(message);

    const target = this.resolveNavigationTarget(action.notification, message.data);
    console.info('[PushDevice] resolved navigation target', {
      target,
      route: message.data['route'],
      deep_link: message.data['deep_link'],
      url: message.data['url'],
      path: message.data['path'],
      link: message.data['link'],
      notificationLink: action.notification.link,
    });
    if (!target) {
      return;
    }

    this.router.navigateByUrl(target).catch((error) => {
      console.warn('[PushDevice] No fue posible navegar desde la notificación:', error);
    });
  }

  private buildClientMessage(notification: PushNotificationSchema, source: 'foreground' | 'tap'): PushClientMessage {
    const data = this.normalizePushData(notification.data);
    const title = String(notification.title || data['title'] || 'Jukai');
    const body = String(notification.body || data['body'] || data['message'] || 'Tienes una nueva notificación');

    return {
      id: String(notification.id || data['notification_id'] || data['delivery_id'] || Date.now()),
      title,
      body,
      data,
      source,
      received_at: new Date().toISOString(),
    };
  }

  private normalizePushData(rawData: any): Record<string, any> {
    if (!rawData) {
      return {};
    }

    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    if (typeof rawData === 'object') {
      return { ...rawData };
    }

    return {};
  }

  private resolveNavigationTarget(notification: PushNotificationSchema, data: Record<string, any>): string | null {
    // °°° Temporal: se fuerza navegación fija mientras se corrige el payload/ruteo de notificaciones push.
    // °°° Pendiente: retirar este hardcode y restaurar la resolución por deep_link/route del servidor.
    const temporaryTarget = '/assets/maintenance?pos=maintenance';
    if (temporaryTarget) {
      return temporaryTarget;
    }

    const explicitRoute = this.firstDataString(data, ['route', 'deep_link', 'url', 'path', 'link']) || notification.link || '';
    const normalizedRoute = this.normalizeInternalRoute(explicitRoute);
    if (normalizedRoute) {
      return normalizedRoute;
    }

    const notificationType = String(data['notification_type'] || '').toUpperCase();
    if (notificationType === 'TAR' || data['task_id']) {
      return '/tasks/task?pos=task';
    }

    if (data['communication_id'] || data['recipient_id'] || data['notification_id'] || notificationType) {
      return '/communications/communication?pos=communication';
    }

    return '/communications/communication?pos=communication';
  }

  private normalizeInternalRoute(route: string): string | null {
    const value = String(route || '').trim();
    if (!value) {
      return null;
    }

    if (/^https?:\/\//i.test(value)) {
      return null;
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        return this.normalizeInternalRoute(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        return null;
      }
    }

    return value.startsWith('/') ? value : `/${value}`;
  }

  private firstDataString(data: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
      const value = data[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }
    return '';
  }

  private getToastSeverity(data: Record<string, any>): string {
    const priority = String(data['priority'] || '').toUpperCase();
    const notificationType = String(data['notification_type'] || '').toUpperCase();
    if (priority === 'H' || notificationType === 'ALE') {
      return 'warn';
    }
    return 'info';
  }

  private async getStoredPushDeviceId(): Promise<string | null> {
    try {
      const stored = await Preferences.get({ key: PUSH_DEVICE_ID_KEY });
      return stored.value || null;
    } catch {
      return null;
    }
  }

  private extractPushDeviceId(response: any): string | null {
    const id = response?.data?.id;
    return id === undefined || id === null ? null : String(id);
  }
}
// ]]]FI
