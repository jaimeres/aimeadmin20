import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, tap, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PermissionSpec,
  PermissionStrings,
  PermissionTree,
  parsePermissionStringsResponse,
  parsePermissionTreeResponse,
  projectPermissionTree,
} from '../schemas/permissions.schema';

export type { PermissionLeaf, PermissionSpec, PermissionStrings, PermissionTree } from '../schemas/permissions.schema';

/* ════════════════════════════════════════════════════════════════════════════
 * Tipos
 * ════════════════════════════════════════════════════════════════════════════ */

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
  readonly hasTreeData = computed(() => Object.keys(this._tree()).length > 0);

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
        this._tree.set(parsePermissionTreeResponse(perms.tree));
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
  // [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
  refresh(): Observable<{ strings: PermissionStrings; tree: PermissionTree }> {
    this._loading.set(true);
    return forkJoin({
      strings: this.http.get<unknown>(`${this._baseUrl}/permissions/me/strings/`).pipe(
        map(parsePermissionStringsResponse),
      ),
      tree: this.http.get<unknown>(`${this._baseUrl}/permissions/me/tree/`).pipe(
        map(parsePermissionTreeResponse),
      ),
    }).pipe(
      tap(({ strings, tree }) => {
        this._strings.set(strings);
        this._tree.set(tree);
        this._lastLoaded.set(Date.now());
        this._hasCache.clear();
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        return of({ strings: this._strings(), tree: this._tree() });
      })
    );
  }
  // ]]]FI

  /** Refresca permisos para una app concreta (solo me) */
  refreshForApp(app: string): Observable<PermissionTree> {
    return this.http.get<any>(`${this._baseUrl}/permissions/me/tree/${app}/`).pipe(
      map(parsePermissionTreeResponse),
      tap((t) => {
        // mezcla la rama de la app sin pisar otras
        this._tree.update((cur) => ({ ...cur, ...t }));
        this._hasCache.clear();
      }),
      catchError(() => of({} as PermissionTree))
    );
  }

  /** Permisos de un usuario específico (admin) */
  // [[[II ESC:022-07 DOC:../aimeServidor2/docs/documents/2026-06-19-022-status-edit-records.md#escenario-07
  loadForUser(userId: string, app?: string): Observable<{ strings: PermissionStrings; tree: PermissionTree }> {
    const stringsUrl = app
      ? `${this._baseUrl}/permissions/${userId}/strings/${app}/`
      : `${this._baseUrl}/permissions/${userId}/strings/`;
    const treeUrl = app
      ? `${this._baseUrl}/permissions/${userId}/tree/${app}/`
      : `${this._baseUrl}/permissions/${userId}/tree/`;

    return forkJoin({
      strings: this.http.get<any>(stringsUrl).pipe(
        map(parsePermissionStringsResponse),
        catchError(() => of({} as PermissionStrings)),
      ),
      tree: this.http.get<any>(treeUrl).pipe(
        map(parsePermissionTreeResponse),
        catchError(() => of({} as PermissionTree)),
      ),
    });
  }
  // ]]]FI

  /** Convierte tree → strings o viceversa usando endpoint backend */
  convert(payload: any): Observable<any> {
    return this.http.post<any>(`${this._baseUrl}/permissions/convert/`, payload).pipe(
      catchError(() => of(null))
    );
  }

  /** Persiste cambios al backend (admin: para otro usuario) */
  // [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
  saveForUser(userId: string, tree: PermissionTree, declaredTree: PermissionTree, app?: string): Observable<any> {
    const url = app
      ? `${this._baseUrl}/permissions/${userId}/tree/${app}/`
      : `${this._baseUrl}/permissions/${userId}/tree/`;
    const payload = {
      data: {
        type: 'permission',
        attributes: projectPermissionTree(declaredTree, tree),
      },
    };
    return this.http.put<any>(url, payload);
  }
  // ]]]FI

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

    // Formato app.module.action; la acción puede ser granular y contener puntos.
    const parts = s.split('.');
    if (parts.length >= 3) {
      const [app, mod] = parts;
      // [[[II ESC:022-07 DOC:../aimeServidor2/docs/documents/2026-06-19-022-status-edit-records.md#escenario-07
      const action = parts.slice(2).join('.');
      // ]]]FI
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

}
