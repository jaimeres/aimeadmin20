import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TreeNode } from 'primeng/api';

import { PermissionsService, PermissionTree, PermissionLeaf } from '../../auth/services/permissions.service';
import { MessageService } from '../services/message.service';

interface NodeData {
  kind: 'app' | 'module' | 'action';
  app: string;
  module?: string;
  action?: string;
  leaf?: PermissionLeaf;
}

/**
 * Componente reutilizable para visualizar / editar permisos.
 *
 * Modos:
 *   - mode = 'me'   → permisos del usuario actual (solo lectura por defecto).
 *   - mode = 'user' → permisos de otro usuario (admin); requiere `userId`.
 *
 * Filtros:
 *   - app (opcional)  → muestra solo esa app.
 *   - editable        → habilita la edición.
 *   - showSearch      → caja de búsqueda.
 *
 * Reutilización:
 *   - Sin `<p-dialog>` envoltorio si `inDialog=false` (puede embebirse).
 *   - Con dialog si `inDialog=true` (controlado por `visible`).
 */
@Component({
  selector: 'app-permissions-tree',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, DialogModule, TabsModule, TreeModule, CheckboxModule,
    InputTextModule, ProgressSpinnerModule, TagModule, TooltipModule, ToggleButtonModule
  ],
  templateUrl: './permissions-tree.component.html',
  styleUrl: './permissions-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionsTreeComponent implements OnInit {

  /* ──────── Inputs / Outputs ───────────────────────────────────────────── */
  readonly mode = input<'me' | 'user'>('me');
  readonly userId = input<string | null>(null);
  readonly app = input<string | null>(null);
  readonly editable = input<boolean>(false);
  readonly showSearch = input<boolean>(true);
  readonly inDialog = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly header = input<string>('Permisos');

  readonly visibleChange = output<boolean>();
  readonly saved = output<PermissionTree>();
  readonly closed = output<void>();

  /* ──────── Servicios ──────────────────────────────────────────────────── */
  private readonly permsS = inject(PermissionsService);
  private readonly messageS = inject(MessageService);

  /* ──────── Estado local ───────────────────────────────────────────────── */
  /** Árbol local editable (clon profundo del servicio o de la carga puntual) */
  readonly localTree = signal<PermissionTree>({});
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  /** App activa en el tabbed por aplicación */
  readonly activeApp = signal<string>('');
  /** dirty: hay cambios sin guardar */
  readonly dirty = signal<boolean>(false);

  /* ──────── Computeds ──────────────────────────────────────────────────── */

  /** Lista de apps disponibles según filtro `app` o todas */
  readonly apps = computed<string[]>(() => {
    const filter = this.app();
    const all = Object.keys(this.localTree() ?? {});
    return filter ? all.filter((a) => a === filter) : all;
  });

  /** Diálogo visible reflejado en signal local para [(visible)] */
  readonly _visible = signal<boolean>(true);

  /** TreeNode[] para PrimeNG, agrupado por aplicación activa */
  readonly treeNodesByApp = computed<Record<string, TreeNode[]>>(() => {
    const tree = this.localTree();
    const term = this.searchTerm().trim().toLowerCase();
    const out: Record<string, TreeNode[]> = {};
    for (const app of Object.keys(tree)) {
      const modules = tree[app] ?? {};
      const moduleNodes: TreeNode[] = [];
      for (const moduleName of Object.keys(modules)) {
        const actions = modules[moduleName] ?? {};
        const actionNodes: TreeNode[] = [];
        for (const actionName of Object.keys(actions)) {
          const leaf = actions[actionName];
          if (!leaf) continue;
          const label = leaf.label || actionName;
          if (term && !label.toLowerCase().includes(term) && !actionName.toLowerCase().includes(term)) {
            continue;
          }
          actionNodes.push({
            key: `${app}.${moduleName}.${actionName}`,
            label,
            icon: leaf.value ? 'pi pi-check-circle text-green-500' : 'pi pi-circle text-color-secondary',
            data: { kind: 'action', app, module: moduleName, action: actionName, leaf } as NodeData,
            leaf: true
          });
        }
        if (actionNodes.length === 0 && term) continue;
        const allOn = actionNodes.length > 0 && actionNodes.every((n) => (n.data as NodeData).leaf?.value === true);
        const someOn = actionNodes.some((n) => (n.data as NodeData).leaf?.value === true);
        moduleNodes.push({
          key: `${app}.${moduleName}`,
          label: moduleName,
          icon: allOn ? 'pi pi-folder-open text-primary' : (someOn ? 'pi pi-folder text-orange-500' : 'pi pi-folder'),
          data: { kind: 'module', app, module: moduleName } as NodeData,
          children: actionNodes,
          expanded: term.length > 0
        });
      }
      out[app] = moduleNodes;
    }
    return out;
  });

  /** Total de acciones permitidas por app */
  readonly grantedByApp = computed<Record<string, number>>(() => {
    const tree = this.localTree();
    const out: Record<string, number> = {};
    for (const app of Object.keys(tree)) {
      let count = 0;
      for (const mod of Object.values(tree[app] ?? {})) {
        for (const leaf of Object.values(mod ?? {})) {
          if (leaf?.value) count++;
        }
      }
      out[app] = count;
    }
    return out;
  });

  /* ──────── Ciclo de vida ──────────────────────────────────────────────── */

  constructor() {
    // Sincroniza el estado local con servicio en modo 'me'
    effect(() => {
      if (this.mode() === 'me') {
        // dependencia: tree del servicio
        const t = this.permsS.tree();
        if (!this.dirty()) {
          this.localTree.set(JSON.parse(JSON.stringify(t)));
          this._initActiveApp();
        }
      }
    });

    // Sincroniza visibilidad
    effect(() => { this._visible.set(this.visible()); });
  }

  ngOnInit(): void {
    if (this.mode() === 'user' && this.userId()) {
      this._loadUser();
    } else if (this.mode() === 'me') {
      // si ya hay datos, los usa; si no, los pide
      if (!this.permsS.hasData()) {
        this.loading.set(true);
        this.permsS.refresh().subscribe({
          next: () => {
            this.localTree.set(JSON.parse(JSON.stringify(this.permsS.tree())));
            this._initActiveApp();
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      } else {
        this.localTree.set(JSON.parse(JSON.stringify(this.permsS.tree())));
        this._initActiveApp();
      }
    }
  }

  /* ──────── Acciones ───────────────────────────────────────────────────── */

  setActiveApp(app: string): void { this.activeApp.set(app); }

  setSearch(value: string): void { this.searchTerm.set(value ?? ''); }

  toggleLeaf(node: TreeNode): void {
    if (!this.editable()) return;
    const d = node.data as NodeData;
    if (d?.kind !== 'action' || !d.leaf) return;
    const newValue = !d.leaf.value;
    this._mutateLeaf(d.app, d.module!, d.action!, newValue);
  }

  toggleAllInModule(app: string, moduleName: string, value: boolean): void {
    if (!this.editable()) return;
    this.localTree.update((t) => {
      const next: PermissionTree = JSON.parse(JSON.stringify(t));
      const mod = next?.[app]?.[moduleName];
      if (!mod) return t;
      for (const action of Object.keys(mod)) {
        if (mod[action]) mod[action].value = value;
      }
      return next;
    });
    this.dirty.set(true);
  }

  toggleAllInApp(app: string, value: boolean): void {
    if (!this.editable()) return;
    this.localTree.update((t) => {
      const next: PermissionTree = JSON.parse(JSON.stringify(t));
      const a = next?.[app];
      if (!a) return t;
      for (const mod of Object.values(a)) {
        for (const action of Object.keys(mod)) {
          if (mod[action]) mod[action].value = value;
        }
      }
      return next;
    });
    this.dirty.set(true);
  }

  reset(): void {
    if (this.mode() === 'me') {
      this.localTree.set(JSON.parse(JSON.stringify(this.permsS.tree())));
    } else if (this.userId()) {
      this._loadUser();
    }
    this.dirty.set(false);
  }

  save(): void {
    if (!this.editable() || !this.dirty()) return;
    if (this.mode() === 'user' && this.userId()) {
      this.saving.set(true);
      this.permsS.saveForUser(this.userId()!, this.localTree(), this.app() ?? undefined).subscribe({
        next: () => {
          this.saving.set(false);
          this.dirty.set(false);
          this.messageS.changeMessage('Permisos guardados', null, {}, 'success', 'Éxito');
          this.saved.emit(this.localTree());
        },
        error: (e) => {
          this.saving.set(false);
          this.messageS.changeMessage('No fue posible guardar los permisos', e);
        }
      });
    } else {
      // modo 'me' editable: actualiza localmente solo
      this.permsS.setAll(this.permsS.strings(), this.localTree());
      this.dirty.set(false);
      this.saved.emit(this.localTree());
      this.messageS.changeMessage('Permisos actualizados localmente', null, {}, 'success', 'Éxito');
    }
  }

  onHide(): void {
    this._visible.set(false);
    this.visibleChange.emit(false);
    this.closed.emit();
  }

  onVisibleChange(v: boolean): void {
    this._visible.set(v);
    this.visibleChange.emit(v);
    if (!v) this.closed.emit();
  }

  /* ──────── Privados ───────────────────────────────────────────────────── */

  private _initActiveApp(): void {
    if (this.activeApp()) return;
    const list = this.apps();
    if (list.length > 0) this.activeApp.set(list[0]);
  }

  private _loadUser(): void {
    const id = this.userId();
    if (!id) return;
    this.loading.set(true);
    this.permsS.loadForUser(id, this.app() ?? undefined).subscribe({
      next: (resp) => {
        this.localTree.set(JSON.parse(JSON.stringify(resp.tree ?? {})));
        this._initActiveApp();
        this.loading.set(false);
        this.dirty.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private _mutateLeaf(app: string, moduleName: string, action: string, value: boolean): void {
    this.localTree.update((t) => {
      const next: PermissionTree = JSON.parse(JSON.stringify(t));
      const leaf = next?.[app]?.[moduleName]?.[action];
      if (!leaf) return t;
      leaf.value = value;
      return next;
    });
    this.dirty.set(true);
  }
}
