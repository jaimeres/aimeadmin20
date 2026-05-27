import { Directive, effect, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionsService, PermissionSpec } from '../services/permissions.service';

/**
 * Directiva estructural: renderiza el template solo si el usuario tiene el permiso.
 *
 * Uso:
 *   <button *appHasPermission="'assets.maintenance.create'">Nuevo</button>
 *   <div    *appHasPermission="['mod.a.x','mod.b.y']; mode: 'all'">…</div>
 *   <span   *appHasPermission="42">…</span>  <!-- posición numérica -->
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {

  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permsS = inject(PermissionsService);

  private _spec: PermissionSpec | PermissionSpec[] | null = null;
  private _mode: 'any' | 'all' = 'any';
  private _rendered = false;

  @Input('appHasPermission') set spec(v: PermissionSpec | PermissionSpec[] | null) {
    this._spec = v ?? null;
    this._render();
  }

  @Input('appHasPermissionMode') set mode(v: 'any' | 'all') {
    this._mode = v === 'all' ? 'all' : 'any';
    this._render();
  }

  constructor() {
    // Reactiva: re-evalúa cuando cambian strings o tree
    effect(() => {
      this.permsS.strings();
      this.permsS.tree();
      this._render();
    });
  }

  private _render(): void {
    const allow = this._evaluate();
    if (allow && !this._rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this._rendered = true;
    } else if (!allow && this._rendered) {
      this.vcr.clear();
      this._rendered = false;
    }
  }

  private _evaluate(): boolean {
    if (this._spec == null) return false;
    const list = Array.isArray(this._spec) ? this._spec : [this._spec];
    if (list.length === 0) return true;
    return this._mode === 'all' ? this.permsS.hasAll(list) : this.permsS.hasAny(list);
  }
}
