import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { PermissionCatalog, PermissionCatalogField } from '../../auth/schemas/permission-catalog.schema';
import { PermissionCatalogService } from '../../auth/services/permission-catalog.service';
import { MessageService } from '../../components/services/message.service';

interface DependencyRow extends PermissionCatalogField {
  formPath: string;
  formLabel: string;
  directPermission: string;
  configurationSource: string;
}

interface ImpactRow {
  permission: string;
  consumers: number;
  forms: number;
  examples: string;
}

// [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
@Component({
  selector: 'app-permission-catalog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, MessageModule,
    ProgressSpinnerModule, SelectModule, TableModule, TabsModule, TagModule,
    TooltipModule,
  ],
  templateUrl: './permission-catalog.html',
  styleUrl: './permission-catalog.scss',
})
export class PermissionCatalogPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogS = inject(PermissionCatalogService);
  private readonly messageS = inject(MessageService);

  readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';
  readonly username = this.route.snapshot.queryParamMap.get('username') ?? this.userId;
  readonly catalog = signal<PermissionCatalog | null>(null);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly selectedApp = signal<string | null>(null);

  readonly apps = computed(() => {
    const values = new Set(Object.keys(this.catalog()?.forms ?? {}).map((path) => path.split('.')[0]));
    return Array.from(values).sort().map((value) => ({ label: value, value }));
  });

  readonly dependencyRows = computed<DependencyRow[]>(() => {
    const rows: DependencyRow[] = [];
    for (const [formPath, form] of Object.entries(this.catalog()?.forms ?? {})) {
      for (const field of form.fields) {
        rows.push({
          ...field,
          formPath,
          formLabel: form.label,
          directPermission: form.direct_permission,
          configurationSource: form.configuration_source,
        });
      }
    }
    return this.filterRows(rows, (row) => [
      row.formPath, row.formLabel, row.label, row.path, row.source_resource,
      row.access.preferred, row.access.mode,
    ]);
  });

  readonly impactRows = computed<ImpactRow[]>(() => {
    const rows = Object.entries(this.catalog()?.consumers_by_permission ?? {}).map(([permission, consumers]) => ({
      permission,
      consumers: consumers.length,
      forms: new Set(consumers.map((item) => item.form)).size,
      examples: consumers.slice(0, 3).map((item) => item.field_label || item.form).join(', '),
    }));
    return this.filterRows(rows, (row) => [row.permission, row.examples]);
  });

  readonly totals = computed(() => {
    const catalog = this.catalog();
    const permissions = catalog
      ? Object.values(catalog.permissions).reduce((appTotal, resources) => appTotal
        + Object.values(resources).reduce((resourceTotal, actions) => resourceTotal + Object.keys(actions).length, 0), 0)
      : 0;
    return {
      forms: Object.keys(catalog?.forms ?? {}).length,
      fields: Object.values(catalog?.forms ?? {}).reduce((total, form) => total + form.fields.length, 0),
      permissions,
    };
  });

  constructor() {
    this.load();
  }

  setSearch(value: string): void { this.search.set(value ?? ''); }
  setApp(value: string | null): void { this.selectedApp.set(value || null); }
  back(): void { this.router.navigate(['/profile/list']); }
  reload(): void { this.load(); }

  modeSeverity(mode: string): 'success' | 'info' | 'warn' | 'secondary' {
    if (mode === 'referencia') return 'success';
    if (mode === 'completo') return 'info';
    if (mode === 'implícito legado') return 'warn';
    return 'secondary';
  }

  private load(): void {
    if (!this.userId) return;
    this.loading.set(true);
    this.catalogS.loadForUser(this.userId).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messageS.changeMessage('No fue posible cargar el catálogo de permisos', error);
      },
    });
  }

  private filterRows<T>(rows: T[], values: (row: T) => unknown[]): T[] {
    const term = this.search().trim().toLocaleLowerCase('es');
    const app = this.selectedApp();
    return rows.filter((row: any) => {
      const path = String(row.formPath ?? row.permission ?? '');
      if (app && !path.startsWith(`${app}.`)) return false;
      return !term || values(row).some((value) => String(value ?? '').toLocaleLowerCase('es').includes(term));
    });
  }
}
// ]]]FI
