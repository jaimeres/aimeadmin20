import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { GeneralService } from './general.service';
import * as CryptoJS from 'crypto-js';
import { App } from '@capacitor/app';
import { environment } from '../../../environments/environment';

/** Campos cacheables por modo, resultado del escaneo de drawForm */
export interface FormCacheConfig {
  /** Campos que se cachean en modo creación */
  creationFields: string[];
  /** Campos que se cachean en modo edición */
  editionFields: string[];
  /** Si algún campo requiere cifrado AES */
  encrypted: boolean;
}

/** Internal structure stored in each cache entry */
interface CacheEntry {
  /** Serialized (and optionally encrypted) form data */
  d: string;
  /** Whether the data is encrypted */
  e: boolean;
  /** Timestamp of the save */
  t: number;
  /** App version when the entry was saved — si difiere, se descarta */
  v?: string;
}

/**
 * Servicio de caché automático de formularios (draw-form).
 *
 * Separa los datos por usuario y app, usando el almacenamiento
 * adecuado según la plataforma:
 *  - Mobile  (Capacitor native) → Capacitor Preferences
 *  - Desktop (Electron)        → localStorage
 *  - Web                       → sessionStorage
 *
 * Soporta cifrado opcional con AES (CryptoJS) cuando el dict
 * de configuración del servidor trae `encrypted: true`.
 */
@Injectable({ providedIn: 'root' })
export class FormCacheService {

  private readonly PREFIX = 'formAutoCache';
  // Clave de cifrado estática; puede cambiarse a derivada del dispositivo
  private readonly ENCRYPTION_KEY = 'fc-draw-frm-v1';

  /** Versión cacheada en memoria para no rellamar App.getInfo() en cada operación */
  private _cachedVersion: string | null = null;

  constructor(private generalS: GeneralService) { }

  // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
  private perfNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private logPerf(label: string, start: number, extra: any = {}): void {
    const elapsed = this.perfNow() - start;
    console.info(`[FormCache][perf] ${label}: ${elapsed.toFixed(2)}ms`, extra);
  }
  // ]]]FI

  /**
   * Devuelve el versionCode (build.gradle `versionCode`) en nativo Android/iOS,
   * o `environment.appVersion` en web. Resultado cacheado en memoria.
   */
  async getAppVersion(): Promise<string> {
    if (this._cachedVersion !== null) return this._cachedVersion;
    try {
      if (this.generalS.isMobile()) {
        const info = await App.getInfo();
        // info.build = versionCode (Android) / CFBundleVersion (iOS)
        this._cachedVersion = info.build || environment.appVersion;
      } else {
        this._cachedVersion = environment.appVersion;
      }
    } catch {
      this._cachedVersion = environment.appVersion;
    }
    return this._cachedVersion;
  }

  // ─────────────────────────────────────────────────

  // [[[II ESC:019-03 DOC:docs/documents/2026-06-04_019_dropdown-cache-platform-read.md#escenario-03
  /** Devuelve el tipo de dispositivo actual de forma síncrona */
  getDeviceType(): 'mobile' | 'web' | 'desktop' {
    if (typeof this.generalS.getClientPlatform === 'function') {
      return this.generalS.getClientPlatform();
    }

    if (this.generalS.isMobile()) return 'mobile';
    if (typeof this.generalS.isDesktopApp === 'function' && this.generalS.isDesktopApp()) return 'desktop';
    return 'web';
  }

  private getPlatformCacheConfig(el: any): any | null {
    const cache = el?.cache ?? {};
    const deviceType = this.getDeviceType();

    if (deviceType === 'mobile') {
      return cache.mobile ?? null;
    }

    if (deviceType === 'desktop') {
      return cache.desktop ?? cache.web ?? null;
    }

    return cache.web ?? cache.desktop ?? null;
  }
  // ]]]FI

  /**
   * Escanea todos los campos del drawForm (grid + stepper) y devuelve
   * qué campos tienen caché habilitado para el dispositivo actual, separados
   * por modo (creación / edición). Así los campos sensibles que no declaran
   * `cache` nunca se guardan en almacenamiento local.
   *
   * Estructura esperada en cada campo del drawForm:
   * {
   *   field: 'name',
   *   cache: {
   *     web:    { creation: true, edition: false, encrypted: false },
   *     desktop:{ creation: true, edition: false, encrypted: false },
   *     mobile: { creation: true, edition: true,  encrypted: true  }
   *   }
   * }
   *
   * @returns objeto con los campos cacheables o `null` si ningún campo tiene caché.
   */
  getCacheConfig(drawForm: any): FormCacheConfig | null {
    const creationFields: string[] = [];
    const editionFields: string[] = [];
    let encrypted = false;

    const checkElement = (el: any) => {
      const fieldCache = this.getPlatformCacheConfig(el);
      if (!fieldCache) return;
      // Para campos de documento, el elemento puede tener tanto `field` como `key`;
      // ambos controles almacenan el mismo fileObject y deben guardarse/restaurarse.
      if (el.field) {
        if (fieldCache.creation === true) creationFields.push(el.field);
        if (fieldCache.edition === true) editionFields.push(el.field);
      }
      if (el.key && el.key !== el.field) {
        if (fieldCache.creation === true) creationFields.push(el.key);
        if (fieldCache.edition === true) editionFields.push(el.key);
      }
      // Fallback: si no hay ni field ni key usa lo que haya
      if (!el.field && !el.key) return;
      if (fieldCache.encrypted === true) encrypted = true;
    };

    const walkElement = (el: any) => {
      if (!el) return;
      checkElement(el);
      const nested = el.card || el.fieldset;
      if (nested && typeof nested === 'object') {
        for (const child of Object.values(nested)) walkElement(child);
      }
    };

    // Recorrer grid
    if (drawForm?.grid) {
      for (const el of Object.values(drawForm.grid)) walkElement(el);
    }

    // Recorrer stepper
    const steps = drawForm?.stepper?.steps;
    if (steps) {
      for (const step of Object.values(steps)) {
        const fields = (step as any)?.fields;
        if (fields) for (const el of Object.values(fields)) walkElement(el);
      }
    }

    if (creationFields.length === 0 && editionFields.length === 0) return null;
    return { creationFields, editionFields, encrypted };
  }

  // ─────────────────────────────────────────────────
  // Claves
  // ─────────────────────────────────────────────────

  /**
   * Construye la clave de almacenamiento.
   * Formato: `formAutoCache:{userId}:{app}:{tabPanel}`
   */
  getKey(userId: string, app: string, tabPanel: string): string {
    return `${this.PREFIX}:${userId}:${app}:${tabPanel}`;
  }

  // ─────────────────────────────────────────────────
  // CRUD de caché
  // ─────────────────────────────────────────────────

  /**
   * Guarda los datos del formulario en el almacenamiento
   * correspondiente a la plataforma actual.
   */
  async save(key: string, data: any, cacheConfig: any): Promise<void> {
    try {
      const encrypted = cacheConfig?.encrypted === true;
      let payload = JSON.stringify(data);

      if (encrypted) {
        payload = CryptoJS.AES.encrypt(payload, this.ENCRYPTION_KEY).toString();
      }

      const entry: CacheEntry = { d: payload, e: encrypted, t: Date.now(), v: await this.getAppVersion() };
      const raw = JSON.stringify(entry);

      const deviceType = this.getDeviceType();

      if (deviceType === 'mobile') {
        await Preferences.set({ key, value: raw });
      } else if (deviceType === 'desktop') {
        localStorage.setItem(key, raw);
      } else {
        sessionStorage.setItem(key, raw);
      }
    } catch {
      // El caché es opcional; ignorar errores silenciosamente
    }
  }

  /**
   * Carga los datos del formulario desde el almacenamiento.
   * Devuelve `null` si no existe entrada o si está vacía.
   */
  async load(key: string): Promise<any | null> {
    // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
    const perfStart = this.perfNow();
    let rawBytes = 0;
    // ]]]FI
    try {
      const deviceType = this.getDeviceType();
      let raw: string | null = null;

      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      const storageStart = this.perfNow();
      // ]]]FI
      if (deviceType === 'mobile') {
        const { value } = await Preferences.get({ key });
        raw = value;
      } else if (deviceType === 'desktop') {
        raw = localStorage.getItem(key);
      } else {
        raw = sessionStorage.getItem(key);
      }
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      rawBytes = raw?.length || 0;
      this.logPerf('load.storage', storageStart, { key, deviceType, bytes: rawBytes });
      // ]]]FI

      if (!raw) {
        this.logPerf('load.total', perfStart, { key, found: false, bytes: rawBytes });
        return null;
      }

      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      const parseEntryStart = this.perfNow();
      // ]]]FI
      const entry: CacheEntry = JSON.parse(raw);
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      this.logPerf('load.parseEntry', parseEntryStart, { key });
      // ]]]FI

      // Descartar si la versión de la app cambió (p.ej. deploy con cambios de formulario)
      if (entry.v && entry.v !== await this.getAppVersion()) {
        // Limpiar la entrada obsoleta de forma asíncrona (sin bloquear)
        this.clear(key).catch(() => { });
        this.logPerf('load.total', perfStart, { key, found: false, reason: 'version-changed', bytes: rawBytes });
        return null;
      }

      let payload = entry.d;

      if (entry.e) {
        // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
        const decryptStart = this.perfNow();
        // ]]]FI
        const bytes = CryptoJS.AES.decrypt(payload, this.ENCRYPTION_KEY);
        payload = bytes.toString(CryptoJS.enc.Utf8);
        // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
        this.logPerf('load.decrypt', decryptStart, { key, bytes: payload.length });
        // ]]]FI
        if (!payload) {
          this.logPerf('load.total', perfStart, { key, found: false, reason: 'decrypt-empty', bytes: rawBytes });
          return null;
        } // descifrado fallido
      }

      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      const parsePayloadStart = this.perfNow();
      // ]]]FI
      const data = JSON.parse(payload);
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      this.logPerf('load.parsePayload', parsePayloadStart, { key, bytes: payload.length });
      // ]]]FI

      // No restaurar si todo es null / vacío
      const result = this.hasNonNullValue(data) ? data : null;
      this.logPerf('load.total', perfStart, { key, found: !!result, bytes: rawBytes });
      return result;
    } catch {
      // [[[II ESC:017-03 DOC:docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md#escenario-03
      this.logPerf('load.total', perfStart, { key, found: false, reason: 'error', bytes: rawBytes });
      // ]]]FI
      return null;
    }
  }

  /**
   * Elimina una entrada de caché específica.
   */
  async clear(key: string): Promise<void> {
    try {
      const deviceType = this.getDeviceType();

      if (deviceType === 'mobile') {
        await Preferences.remove({ key });
      } else if (deviceType === 'desktop') {
        localStorage.removeItem(key);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Silencioso
    }
  }

  /**
   * Elimina TODOS los cachés de formulario para un usuario dado.
   * Útil al cerrar sesión.
   */
  async clearAllForUser(userId: string): Promise<void> {
    try {
      const prefix = `${this.PREFIX}:${userId}:`;
      const deviceType = this.getDeviceType();

      if (deviceType === 'mobile') {
        const { keys } = await Preferences.keys();
        for (const k of keys) {
          if (k.startsWith(prefix)) {
            await Preferences.remove({ key: k });
          }
        }
      } else if (deviceType === 'desktop') {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(prefix)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
      } else {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith(prefix)) toRemove.push(k);
        }
        toRemove.forEach(k => sessionStorage.removeItem(k));
      }
    } catch {
      // Silencioso
    }
  }

  // ─────────────────────────────────────────────────
  // Utilidades internas
  // ─────────────────────────────────────────────────

  /** Verifica que al menos un valor del objeto no sea nulo / vacío */
  private hasNonNullValue(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    return Object.values(data).some(
      v => v !== null && v !== undefined && v !== ''
    );
  }
}
