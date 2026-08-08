import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';

import { PermissionsService } from '../../auth/services/permissions.service';
import {
  PermissionLeaf,
  PermissionTree,
  clonePermissionTree,
  permissionTreeEntries,
  projectPermissionTree,
} from '../../auth/schemas/permissions.schema';
import { MessageService } from '../services/message.service';

type PermissionNodeKind = 'resource' | 'group' | 'permission';

interface NodeData {
  kind: PermissionNodeKind;
  app: string;
  resource: string;
  action?: string;
  leaf?: PermissionLeaf;
}

interface ActionBranch {
  segment: string;
  action: string;
  leaf?: PermissionLeaf;
  children: Map<string, ActionBranch>;
}

interface PermissionChange {
  path: string;
  label: string;
  value: boolean;
}

// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
@Component({
  selector: 'app-permissions-tree',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    ProgressSpinnerModule,
    TabsModule,
    TagModule,
    ToggleButtonModule,
    TooltipModule,
    TreeModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './permissions-tree.component.html',
  styleUrl: './permissions-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsTreeComponent {
  readonly mode = input<'me' | 'user'>('me');
  readonly userId = input<string | null>(null);
  readonly userLabel = input<string>('');
  readonly app = input<string | null>(null);
  readonly editable = input<boolean>(false);
  readonly showSearch = input<boolean>(true);
  readonly inDialog = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly header = input<string>('Permisos');

  readonly visibleChange = output<boolean>();
  readonly saved = output<PermissionTree>();
  readonly closed = output<void>();

  private readonly permsS = inject(PermissionsService);
  private readonly messageS = inject(MessageService);
  private readonly confirmationS = inject(ConfirmationService);
  private loadedKey = '';

  readonly declaredTree = signal<PermissionTree>({});
  readonly localTree = signal<PermissionTree>({});
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly searchTerm = signal('');
  readonly activeApp = signal('');
  readonly reviewVisible = signal(false);
  readonly _visible = signal(true);

  readonly apps = computed(() => {
    const filter = this.app();
    const all = Object.keys(this.localTree());
    return filter ? all.filter((item) => item === filter) : all;
  });

  readonly changes = computed<PermissionChange[]>(() => {
    const current = this.localTree();
    return permissionTreeEntries(this.declaredTree())
      .filter((entry) => current?.[entry.app]?.[entry.resource]?.[entry.action]?.value !== entry.leaf.value)
      .map((entry) => ({
        path: entry.path,
        label: entry.leaf.label,
        value: current[entry.app][entry.resource][entry.action].value,
      }));
  });

  readonly added = computed(() => this.changes().filter((item) => item.value));
  readonly removed = computed(() => this.changes().filter((item) => !item.value));
  readonly dirty = computed(() => this.changes().length > 0);

  readonly grantedByApp = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const app of this.apps()) {
      result[app] = permissionTreeEntries({ [app]: this.localTree()[app] ?? {} })
        .filter((entry) => entry.leaf.value).length;
    }
    return result;
  });

  readonly treeNodesByApp = computed<Record<string, TreeNode[]>>(() => {
    const result: Record<string, TreeNode[]> = {};
    const term = this.searchTerm().trim().toLocaleLowerCase('es');
    for (const app of this.apps()) {
      result[app] = Object.entries(this.localTree()[app] ?? {})
        .map(([resource, actions]) => this.resourceNode(app, resource, actions, term))
        .filter((node): node is TreeNode => !!node);
    }
    return result;
  });

  constructor() {
    effect(() => this._visible.set(this.visible()));
    effect(() => {
      const mode = this.mode();
      const id = this.userId();
      const visible = this.visible();
      const key = `${mode}:${id ?? 'me'}:${this.app() ?? '*'}`;
      // [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03
      // Al vivir embebido en el diálogo CRUD, cada reapertura debe consultar el
      // estado vigente; mantener loadedKey oculto conservaría una edición anterior.
      if (!visible) {
        this.loadedKey = '';
        return;
      }
      // ]]]FI
      if (key === this.loadedKey || (mode === 'user' && !id)) return;
      this.loadedKey = key;
      this.loadTree();
    });
  }

  setActiveApp(app: string): void {
    this.activeApp.set(app);
  }

  setSearch(value: string): void {
    this.searchTerm.set(value ?? '');
  }

  toggleLeaf(node: TreeNode): void {
    if (!this.editable()) return;
    const data = node.data as NodeData;
    if (data?.kind !== 'permission' || !data.action || !data.leaf) return;
    this.setPermission(data.app, data.resource, data.action, !data.leaf.value);
  }

  requestModuleToggle(app: string, resource: string, value: boolean): void {
    if (!this.editable()) return;
    this.confirmBulk(
      value ? 'Otorgar todos los permisos del recurso' : 'Quitar todos los permisos del recurso',
      resource,
      value,
      () => this.setResource(app, resource, value),
    );
  }

  requestAppToggle(app: string, value: boolean): void {
    if (!this.editable()) return;
    this.confirmBulk(
      value ? 'Otorgar todos los permisos de la aplicación' : 'Quitar todos los permisos de la aplicación',
      app,
      value,
      () => {
        for (const resource of Object.keys(this.localTree()[app] ?? {})) this.setResource(app, resource, value);
      },
    );
  }

  reset(): void {
    this.localTree.set(clonePermissionTree(this.declaredTree()));
    this.reviewVisible.set(false);
  }

  review(): void {
    if (this.editable() && this.dirty()) this.reviewVisible.set(true);
  }

  confirmSave(): void {
    if (!this.editable() || !this.dirty()) return;
    const projected = projectPermissionTree(this.declaredTree(), this.localTree());
    const id = this.userId();
    if (this.mode() === 'user' && id) {
      this.saving.set(true);
      this.permsS.saveForUser(id, projected, this.declaredTree(), this.app() ?? undefined).subscribe({
        next: () => this.finishSave(projected),
        error: (error) => {
          this.saving.set(false);
          this.messageS.changeMessage('No fue posible guardar los permisos', error);
        },
      });
      return;
    }
    this.permsS.setAll(this.permsS.strings(), projected);
    this.finishSave(projected);
  }

  onHide(): void {
    this._visible.set(false);
    this.visibleChange.emit(false);
    this.closed.emit();
  }

  onVisibleChange(value: boolean): void {
    this._visible.set(value);
    this.visibleChange.emit(value);
    if (!value) this.closed.emit();
  }

  private loadTree(): void {
    this.loading.set(true);
    const source = this.mode() === 'user' && this.userId()
      ? this.permsS.loadForUser(this.userId()!, this.app() ?? undefined)
      : this.permsS.refresh();
    source.subscribe({
      next: ({ tree }) => {
        this.declaredTree.set(clonePermissionTree(tree));
        this.localTree.set(clonePermissionTree(tree));
        this.initActiveApp();
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messageS.changeMessage('No fue posible cargar los permisos', error);
      },
    });
  }

  private initActiveApp(): void {
    const available = this.apps();
    if (!available.includes(this.activeApp())) this.activeApp.set(available[0] ?? '');
  }

  private setPermission(app: string, resource: string, action: string, value: boolean): void {
    this.localTree.update((tree) => {
      const next = clonePermissionTree(tree);
      const leaf = next?.[app]?.[resource]?.[action];
      if (!leaf) return tree;
      leaf.value = value;

      const rootAction = action.split('.')[0];
      if (value && action.includes('.') && next[app][resource][rootAction]) {
        next[app][resource][rootAction].value = true;
      }
      if (!value && action === rootAction) {
        for (const [candidateAction, candidateLeaf] of Object.entries(next[app][resource])) {
          if (candidateAction.startsWith(`${rootAction}.`)) candidateLeaf.value = false;
        }
      }
      return next;
    });
  }

  private setResource(app: string, resource: string, value: boolean): void {
    this.localTree.update((tree) => {
      const next = clonePermissionTree(tree);
      for (const leaf of Object.values(next?.[app]?.[resource] ?? {})) leaf.value = value;
      return next;
    });
  }

  private confirmBulk(header: string, target: string, value: boolean, accept: () => void): void {
    this.confirmationS.confirm({
      header,
      message: `${value ? 'Se otorgarán' : 'Se quitarán'} todos los permisos de “${target}”. Podrás revisar el resumen antes de guardar.`,
      icon: value ? 'pi pi-check-square' : 'pi pi-exclamation-triangle',
      acceptLabel: value ? 'Sí, otorgar' : 'Sí, quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: value ? undefined : 'p-button-danger',
      accept,
    });
  }

  private finishSave(tree: PermissionTree): void {
    this.saving.set(false);
    this.reviewVisible.set(false);
    this.declaredTree.set(clonePermissionTree(tree));
    this.localTree.set(clonePermissionTree(tree));
    this.saved.emit(tree);
    this.messageS.changeMessage('Permisos guardados', null, {}, 'success', 'Éxito');
  }

  private resourceNode(
    app: string,
    resource: string,
    actions: Record<string, PermissionLeaf>,
    term: string,
  ): TreeNode | null {
    const roots = new Map<string, ActionBranch>();
    const includeAll = !term
      || app.toLocaleLowerCase('es').includes(term)
      || resource.toLocaleLowerCase('es').includes(term);

    for (const [action, leaf] of Object.entries(actions)) {
      if (!includeAll
        && !action.toLocaleLowerCase('es').includes(term)
        && !leaf.label.toLocaleLowerCase('es').includes(term)) continue;
      const parts = action.split('.');
      let current = roots;
      let path = '';
      for (const segment of parts) {
        path = path ? `${path}.${segment}` : segment;
        let branch = current.get(segment);
        if (!branch) {
          branch = { segment, action: path, children: new Map() };
          current.set(segment, branch);
        }
        if (path === action) branch.leaf = leaf;
        current = branch.children;
      }
    }
    if (roots.size === 0) return null;

    return {
      key: `${app}.${resource}`,
      label: resource,
      icon: 'pi pi-folder',
      data: { kind: 'resource', app, resource } as NodeData,
      expanded: !!term,
      children: Array.from(roots.values()).map((branch) => this.actionNode(app, resource, branch, !!term)),
    };
  }

  private actionNode(app: string, resource: string, branch: ActionBranch, expanded: boolean): TreeNode {
    const children = Array.from(branch.children.values())
      .map((child) => this.actionNode(app, resource, child, expanded));
    const leaf = branch.leaf;
    return {
      key: `${app}.${resource}.${branch.action}`,
      label: leaf?.label || branch.segment,
      icon: leaf
        ? (leaf.value ? 'pi pi-check-circle text-green-500' : 'pi pi-circle text-color-secondary')
        : 'pi pi-folder',
      data: {
        kind: leaf ? 'permission' : 'group',
        app,
        resource,
        action: branch.action,
        leaf,
      } as NodeData,
      leaf: children.length === 0,
      expanded: expanded || children.length > 0,
      children,
    };
  }
}
// ]]]FI
