import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/* ════════════════════════════════════════════════════════════════════════════
 * Tipos
 * ════════════════════════════════════════════════════════════════════════════ */

/** Nodo del árbol de permisos: por acción individual */
export interface PermissionLeaf {
  value: boolean;
  label: string;
  field_permissions: string; // clave del bit-string
  position: number;          // índice 0-based dentro del bit-string
  description?: string;
}

/** Estructura jerárquica `app.module.action` */
export type PermissionTree = Record<string, Record<string, Record<string, PermissionLeaf>>>;

/** Mapa `field_permissions_key → cadena de '0' / '1'` */
export type PermissionStrings = Record<string, string>;

/**
 * Especificación a evaluar:
 *   - number               → posición global dentro del string default ('default' o 'permissions')
 *   - 'app.module.action'  → ruta jerárquica dentro del árbol (preferido)
 *   - 'fp_key:position'    → field_permissions explícito + posición
 */
export type PermissionSpec = number | string;

/* ════════════════════════════════════════════════════════════════════════════
 * Servicio
 * ════════════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class PermissionsService {

  private readonly http = inject(HttpClient);
  private readonly _baseUrl: string = environment.base_url as string;

  /** Cadenas binarias por clave field_permissions */
  private readonly _strings = signal<PermissionStrings>({});
  /** Árbol jerárquico app→módulo→acción */
  private readonly _tree = signal<PermissionTree>({});
  /** Última carga (timestamp ms) */
  private readonly _lastLoaded = signal<number>(0);
  /** Cargando */
  private readonly _loading = signal<boolean>(false);

  readonly strings = this._strings.asReadonly();
  readonly tree = this._tree.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasData = computed(() => Object.keys(this._strings()).length > 0 || Object.keys(this._tree()).length > 0);

  /** Cache de signals computadas por path para evitar recomputar */
  private readonly _hasCache = new Map<string, Signal<boolean>>();

  /* ────────────────────────────────────────────────────────────────────────
   * Hidratación desde login / cookie
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Llama al hacer login. Acepta el objeto `user` devuelto por /auth/login/.
   * Si `user.permissions` es string → se guarda como `default`.
   * Si es objeto → se asume mapa de strings.
   */
  loadFromLogin(user: any): void {
    if (!user) return;
    const perms = user.permissions ?? user.permission ?? null;
    if (perms == null) return;

    if (typeof perms === 'string') {
      this._strings.set({ default: perms });
    } else if (typeof perms === 'object') {
      // Si trae { strings: {...}, tree: {...} }
      if (perms.strings && typeof perms.strings === 'object') {
        this._strings.set({ ...perms.strings });
      } else {
        // Asumir que es directamente un mapa de strings
        this._strings.set({ ...perms });
      }
      if (perms.tree && typeof perms.tree === 'object') {
        this._tree.set(perms.tree as PermissionTree);
      }
    }
    this._lastLoaded.set(Date.now());
    this._hasCache.clear();
  }

  /** Limpia todos los permisos (logout). */
  clear(): void {
    this._strings.set({});
    this._tree.set({});
    this._hasCache.clear();
    this._lastLoaded.set(0);
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Llamadas HTTP
   * ──────────────────────────────────────────────────────────────────────── */

  /** Refresca strings + tree completos */
  refresh(): Observable<{ strings: PermissionStrings; tree: PermissionTree }> {
    this._loading.set(true);
    return this.http.get<any>(`${this._baseUrl}/permissions/me/strings/`).pipe(
      map((resp) => this._extractStrings(resp)),
      tap((s) => this._strings.set(s)),
      // segunda llamada: tree
      map((s) => s),
      tap(() => {
        this.http.get<any>(`${this._baseUrl}/permissions/me/tree/`).pipe(
          map((resp) => this._extractTree(resp)),
          tap((t) => this._tree.set(t)),
          catchError(() => of({}))
        ).subscribe();
      }),
      map((s) => ({ strings: s, tree: this._tree() })),
      tap(() => {
        this._lastLoaded.set(Date.now());
        this._hasCache.clear();
        this._loading.set(false);
      }),
      catchError((err) => {
        this._loading.set(false);
        return of({ strings: this._strings(), tree: this._tree() });
      })
    );
  }

  /** Refresca permisos para una app concreta (solo me) */
  refreshForApp(app: string): Observable<PermissionTree> {
    return this.http.get<any>(`${this._baseUrl}/permissions/me/tree/${app}/`).pipe(
      map((resp) => this._extractTree(resp)),
      tap((t) => {
        // mezcla la rama de la app sin pisar otras
        this._tree.update((cur) => ({ ...cur, ...t }));
        this._hasCache.clear();
      }),
      catchError(() => of({} as PermissionTree))
    );
  }

  /** Permisos de un usuario específico (admin) */
  loadForUser(userId: string, app?: string): Observable<{ strings: PermissionStrings; tree: PermissionTree }> {
    const stringsUrl = app
      ? `${this._baseUrl}/permissions/${userId}/strings/${app}/`
      : `${this._baseUrl}/permissions/${userId}/strings/`;
    const treeUrl = app
      ? `${this._baseUrl}/permissions/${userId}/tree/${app}/`
      : `${this._baseUrl}/permissions/${userId}/tree/`;

    return this.http.get<any>(stringsUrl).pipe(
      map((respStr) => ({
        strings: this._extractStrings(respStr),
        tree: {} as PermissionTree
      })),
      tap((acc) => {
        this.http.get<any>(treeUrl).pipe(
          map((resp) => this._extractTree(resp)),
          tap((t) => { acc.tree = t; }),
          catchError(() => of({}))
        ).subscribe();
      }),
      catchError(() => of({ strings: {}, tree: {} as PermissionTree }))
    );
  }

  /** Convierte tree → strings o viceversa usando endpoint backend */
  convert(payload: any): Observable<any> {
    return this.http.post<any>(`${this._baseUrl}/permissions/convert/`, payload).pipe(
      catchError(() => of(null))
    );
  }

  /** Persiste cambios al backend (admin: para otro usuario) */
  saveForUser(userId: string, tree: PermissionTree, app?: string): Observable<any> {
    const url = app
      ? `${this._baseUrl}/permissions/${userId}/tree/${app}/`
      : `${this._baseUrl}/permissions/${userId}/tree/`;
    const payload = { data: { type: 'permission', attributes: tree } };
    return this.http.put<any>(url, payload);
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Evaluación de permisos
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * `has(spec)` devuelve `true` si el usuario tiene el permiso indicado.
   *   - número → posición dentro del string `default`
   *   - 'app.module.action' → busca en árbol; si existe `position` evalúa contra string del field_permissions
   *   - 'fp_key:position'   → clave de field_permissions explícita + posición
   */
  has(spec: PermissionSpec): boolean {
    if (spec == null) return false;
    if (typeof spec === 'number') {
      return this._bitAt('default', spec);
    }
    const s = String(spec);

    // Formato fp_key:position
    if (s.includes(':')) {
      const [key, pos] = s.split(':');
      const idx = Number(pos);
      if (!Number.isFinite(idx)) return false;
      return this._bitAt(key, idx);
    }

    // Formato app.module.action
    const parts = s.split('.');
    if (parts.length >= 3) {
      const [app, mod, action] = parts;
      const leaf = this._tree()?.[app]?.[mod]?.[action];
      if (!leaf) return false;
      // value directo del backend
      if (typeof leaf.value === 'boolean') return leaf.value;
      // si trae position + field_permissions y tenemos el string
      if (leaf.field_permissions && typeof leaf.position === 'number') {
        return this._bitAt(leaf.field_permissions, leaf.position);
      }
      return false;
    }
    return false;
  }

  /** Igual que `has()` pero devuelve un Signal cacheado y reactivo */
  has$(spec: PermissionSpec): Signal<boolean> {
    const key = String(spec);
    let sig = this._hasCache.get(key);
    if (!sig) {
      sig = computed(() => {
        // dependencias: strings + tree
        this._strings();
        this._tree();
        return this.has(spec);
      });
      this._hasCache.set(key, sig);
    }
    return sig;
  }

  /** OR lógico */
  hasAny(specs: PermissionSpec[]): boolean {
    return specs.some((s) => this.has(s));
  }

  /** AND lógico */
  hasAll(specs: PermissionSpec[]): boolean {
    return specs.every((s) => this.has(s));
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Mutaciones locales (para componente de edición)
   * ──────────────────────────────────────────────────────────────────────── */

  /** Cambia el valor de una hoja en el árbol y sincroniza el bit en strings */
  setLeaf(app: string, module: string, action: string, value: boolean): void {
    this._tree.update((t) => {
      const next: PermissionTree = JSON.parse(JSON.stringify(t));
      const leaf = next?.[app]?.[module]?.[action];
      if (!leaf) return t;
      leaf.value = value;
      // reflejar en strings si hay field_permissions
      if (leaf.field_permissions && typeof leaf.position === 'number') {
        this._strings.update((s) => {
          const cur = s[leaf.field_permissions] ?? '';
          const padded = cur.padEnd(leaf.position + 1, '0');
          const arr = padded.split('');
          arr[leaf.position] = value ? '1' : '0';
          return { ...s, [leaf.field_permissions]: arr.join('') };
        });
      }
      return next;
    });
    this._hasCache.clear();
  }

  /** Set masivo: reemplaza tree y strings */
  setAll(strings: PermissionStrings, tree: PermissionTree): void {
    this._strings.set(strings ?? {});
    this._tree.set(tree ?? {});
    this._hasCache.clear();
    this._lastLoaded.set(Date.now());
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Helpers internos
   * ──────────────────────────────────────────────────────────────────────── */

  private _bitAt(key: string, position: number): boolean {
    const str = this._strings()[key];
    if (!str || position < 0 || position >= str.length) return false;
    return str.charAt(position) === '1';
  }

  private _extractStrings(resp: any): PermissionStrings {
    if (!resp) return {};
    // {data: {attributes: {strings: {...}}}} | {strings:{...}} | {...}
    const a = resp?.data?.attributes ?? resp?.attributes ?? resp;
    if (a?.strings && typeof a.strings === 'object') return { ...a.strings };
    if (typeof a === 'object' && Object.values(a).every(v => typeof v === 'string')) {
      return { ...a } as PermissionStrings;
    }
    return {};
  }

  private _extractTree(resp: any): PermissionTree {
    if (!resp) return {};
    const a = resp?.data?.attributes ?? resp?.attributes ?? resp;
    // Excluir 'strings' por si viene combinado
    const { strings, ...rest } = a ?? {};
    return rest as PermissionTree;
  }
}
