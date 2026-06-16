import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { GeneralService } from './general.service';

@Injectable({
  providedIn: 'root'
})
// [[[II ESC:001-07 DOC:docs/documents/2026-06-04-001-token-config-cache.md#escenario-07
export class ClientCacheStorageService {
  private readonly dbName = 'bos-client-cache-v1';
  private readonly storeName = 'entries';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private generalS: GeneralService) { }

  async getItem(key: string): Promise<string | null> {
    if (this.generalS.isMobile()) {
      return (await Preferences.get({ key })).value;
    }

    if (!this.canUseIndexedDb()) {
      return this.getLocalStorageItem(key);
    }

    try {
      const db = await this.openDb();
      const tx = db.transaction(this.storeName, 'readonly');
      return await this.request<string | null>(tx.objectStore(this.storeName).get(key));
    } catch {
      return this.getLocalStorageItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.generalS.isMobile()) {
      await Preferences.set({ key, value });
      return;
    }

    if (!this.canUseIndexedDb()) {
      this.setLocalStorageItem(key, value);
      return;
    }

    try {
      const db = await this.openDb();
      const tx = db.transaction(this.storeName, 'readwrite');
      await this.request(tx.objectStore(this.storeName).put(value, key));
      await this.transactionDone(tx);
    } catch {
      this.setLocalStorageItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.generalS.isMobile()) {
      await Preferences.remove({ key });
      return;
    }

    if (!this.canUseIndexedDb()) {
      this.removeLocalStorageItem(key);
      return;
    }

    try {
      const db = await this.openDb();
      const tx = db.transaction(this.storeName, 'readwrite');
      await this.request(tx.objectStore(this.storeName).delete(key));
      await this.transactionDone(tx);
    } catch {
      this.removeLocalStorageItem(key);
    }
  }

  async keys(prefix = ''): Promise<string[]> {
    if (this.generalS.isMobile()) {
      const { keys } = await Preferences.keys();
      return prefix ? keys.filter((key) => key.startsWith(prefix)) : keys;
    }

    if (!this.canUseIndexedDb()) {
      return this.localStorageKeys(prefix);
    }

    try {
      const db = await this.openDb();
      const tx = db.transaction(this.storeName, 'readonly');
      const keys = await this.request<IDBValidKey[]>(tx.objectStore(this.storeName).getAllKeys());
      const normalized = keys.map((key) => String(key));
      return prefix ? normalized.filter((key) => key.startsWith(prefix)) : normalized;
    } catch {
      return this.localStorageKeys(prefix);
    }
  }

  async removeByPrefix(prefix: string): Promise<void> {
    const keys = await this.keys(prefix);
    await Promise.all(keys.map((key) => this.removeItem(key)));
  }

  private canUseIndexedDb(): boolean {
    return typeof globalThis.indexedDB !== 'undefined';
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(request.error);
    }).catch((error) => {
      this.dbPromise = null;
      throw error;
    });

    this.dbPromise = dbPromise;
    return dbPromise;
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private getLocalStorageItem(key: string): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setLocalStorageItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }

  private removeLocalStorageItem(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch { /* Cache opcional. */ }
  }

  private localStorageKeys(prefix: string): string[] {
    if (typeof localStorage === 'undefined') return [];

    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && (!prefix || key.startsWith(prefix))) keys.push(key);
    }
    return keys;
  }
}
// ]]]FI
