import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TooltipModule } from 'primeng/tooltip';

import { CRUDService } from '../../utils/services/crud.service';
import { WhereRowComponent } from '../responsible/where-row.component';
import { RuleHelpComponent } from '../responsible/rule-help.component';
import {
  ActionFieldConfig,
  ActionPayload,
  SimpleExpr,
  ValidationError,
  findRuleField,
  sanitizeAction,
  validateAction,
} from '../responsible/types';

interface FixedTargetState {
  key: string;
  data_type: string;
  desc?: string;
  loading: boolean;
  options: Array<{ label: string; value: string }>;
  loadError?: string;
  loaded: boolean;
  selectionCtrl: FormControl<string[]>;
}

/**
 * Editor de campo `action` (editor_type: 'rule_action').
 *
 *  Uso (sin métodos en HTML):
 *
 *    <app-responsible-action
 *      [formGroup]="form()['responsible-rule-action']"
 *      [drawForm]="drawForm()['responsible-rule-action']"
 *      controlName="action">
 *    </app-responsible-action>
 *
 *  • `field` se descubre internamente desde el `drawForm`.
 *  • Pickers de fixed_targets se cargan vía `crudS.appType[data_type]`.
 *  • Bidireccional Visual ↔ JSON; bloquea guardado si la estructura es inválida.
 */
@Component({
  selector: 'app-responsible-action',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TabsModule,
    MultiSelectModule,
    PanelModule,
    FloatLabelModule,
    TooltipModule,
    WhereRowComponent,
    RuleHelpComponent,
  ],
  templateUrl: './responsible-action.component.html',
  styleUrl: './responsible-action.component.scss',
})
export class ResponsibleActionComponent implements OnInit, OnChanges {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input() controlName = 'action';
  @Input() drawForm: any = null;
  @Input() field: ActionFieldConfig | null = null;

  private readonly crudS = inject(CRUDService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly drawFormSig = signal<any>(null);
  private readonly fieldExplicitSig = signal<ActionFieldConfig | null>(null);

  readonly fieldCfg = computed<ActionFieldConfig | null>(() => {
    return this.fieldExplicitSig() ?? findRuleField(this.drawFormSig(), 'rule_action');
  });
  readonly hasField = computed(() => !!this.fieldCfg());

  readonly payload = signal<ActionPayload>({});
  readonly jsonCtrl = new FormControl<string>('{}', { nonNullable: true });
  readonly jsonParseError = signal<string | null>(null);
  readonly errors = signal<ValidationError[]>([]);
  readonly tabCtrl = new FormControl<number>(0, { nonNullable: true });
  readonly fixedTargets = signal<FixedTargetState[]>([]);

  readonly autoPaths = computed(() => this.fieldCfg()?.auto_users?.paths ?? {});
  readonly autoOpsMeta = computed(() => this.fieldCfg()?.auto_users?.ops_meta ?? {});
  readonly allowedOps = computed(() => this.fieldCfg()?.allowed_ops ?? []);
  readonly applyTo = computed(() => this.fieldCfg()?.auto_users?.applies_to ?? 'User');
  readonly whereLogic = computed(() => this.fieldCfg()?.auto_users?.where_logic ?? 'AND');
  readonly whereRows = computed<SimpleExpr[]>(() => this.payload().auto_users?.where ?? []);

  ngOnChanges(c: SimpleChanges): void {
    if (c['drawForm']) this.drawFormSig.set(this.drawForm);
    if (c['field']) this.fieldExplicitSig.set(this.field);
    if (c['drawForm'] || c['field']) this.rebuildFixedTargets();
  }

  ngOnInit(): void {
    this.drawFormSig.set(this.drawForm);
    this.fieldExplicitSig.set(this.field);
    this.rebuildFixedTargets();

    const ctrl = this.formGroup?.get(this.controlName);
    const initial = this.coercePayload(ctrl?.value);
    this.payload.set(initial);
    this.jsonCtrl.setValue(JSON.stringify(initial, null, 2), { emitEvent: false });
    this.syncFixedSelectionsFromPayload();

    ctrl?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        const p = this.coercePayload(v);
        if (JSON.stringify(p) !== JSON.stringify(this.payload())) {
          this.payload.set(p);
          this.jsonCtrl.setValue(JSON.stringify(p, null, 2), { emitEvent: false });
          this.jsonParseError.set(null);
          this.syncFixedSelectionsFromPayload();
          this.runValidation();
        }
      });

    this.jsonCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(text => this.onJsonInput(text));

    this.runValidation();
  }

  private rebuildFixedTargets(): void {
    const ft = this.fieldCfg()?.fixed_targets ?? {};
    const list: FixedTargetState[] = Object.entries(ft).map(([key, def]) => {
      const ctrl = new FormControl<string[]>([], { nonNullable: true });
      ctrl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(ids => this.onFixedChange(key, ids));
      return {
        key,
        data_type: def.data_type,
        desc: def.desc,
        loading: false,
        options: [],
        loaded: false,
        selectionCtrl: ctrl,
      };
    });
    this.fixedTargets.set(list);
    this.syncFixedSelectionsFromPayload();
  }

  private syncFixedSelectionsFromPayload(): void {
    const fixed = this.payload().fixed ?? {};
    for (const t of this.fixedTargets()) {
      const ids = (fixed as any)[t.key] ?? [];
      if (JSON.stringify(t.selectionCtrl.value) !== JSON.stringify(ids)) {
        t.selectionCtrl.setValue(ids, { emitEvent: false });
      }
    }
  }

  private coercePayload(v: any): ActionPayload {
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return {}; }
    }
    return (v && typeof v === 'object') ? v : {};
  }

  protected ensureLoaded(t: FixedTargetState): void {
    if (t.loaded || t.loading) return;
    const def = this.crudS.getAppType(t.data_type);
    if (!def?.app) {
      t.loadError = `appType["${t.data_type}"] no configurado.`;
      t.loaded = true;
      this.bumpFixed();
      return;
    }
    t.loading = true;
    this.bumpFixed();
    this.crudS.getObject({ app: def.app, type: def.type ?? def.app }).subscribe({
      next: (resp: any) => {
        t.options = (resp?.data ?? []).map((d: any) => ({
          label: d?.attributes?.name ?? d?.attributes?.code ?? d?.attributes?.email ?? d?.id,
          value: d.id,
        }));
        t.loading = false; t.loaded = true; this.bumpFixed();
      },
      error: () => {
        t.loadError = 'No se pudo cargar.';
        t.loading = false; t.loaded = true; this.bumpFixed();
      },
    });
  }

  private bumpFixed(): void { this.fixedTargets.set([...this.fixedTargets()]); }

  private onFixedChange(key: string, ids: string[]): void {
    const cur = this.payload();
    const nextFixed: any = { ...(cur.fixed ?? {}) };
    if (Array.isArray(ids) && ids.length) nextFixed[key] = ids;
    else delete nextFixed[key];
    const next: ActionPayload = { ...cur };
    if (Object.keys(nextFixed).length) next.fixed = nextFixed;
    else delete next.fixed;
    this.applyChange(next);
  }

  protected onWhereChange(idx: number, v: SimpleExpr): void {
    const cur = this.payload();
    const arr = [...(cur.auto_users?.where ?? [])];
    arr[idx] = v;
    this.applyChange({ ...cur, auto_users: { where: arr } });
  }

  protected onWhereRemove(idx: number): void {
    const cur = this.payload();
    const arr = [...(cur.auto_users?.where ?? [])];
    arr.splice(idx, 1);
    const next = { ...cur };
    if (arr.length) next.auto_users = { where: arr };
    else delete next.auto_users;
    this.applyChange(next);
  }

  protected addWhereRow(): void {
    const cur = this.payload();
    const arr = [...(cur.auto_users?.where ?? []), { path: '', op: '' } as SimpleExpr];
    this.applyChange({ ...cur, auto_users: { where: arr } });
  }

  private onJsonInput(text: string): void {
    try {
      const parsed = JSON.parse(text);
      this.jsonParseError.set(null);
      this.payload.set(parsed);
      this.commitToControl(parsed);
      this.syncFixedSelectionsFromPayload();
      this.runValidation();
    } catch (e: any) {
      this.jsonParseError.set(e?.message ?? 'JSON inválido');
      this.setControlError({ jsonParse: true });
    }
  }

  protected formatJson(): void {
    try {
      this.jsonCtrl.setValue(JSON.stringify(JSON.parse(this.jsonCtrl.value), null, 2), { emitEvent: false });
    } catch { /* noop */ }
  }

  protected resetEmpty(): void { this.applyChange({}); }

  private applyChange(next: ActionPayload): void {
    this.payload.set(next);
    this.jsonCtrl.setValue(JSON.stringify(next, null, 2), { emitEvent: false });
    this.jsonParseError.set(null);
    this.syncFixedSelectionsFromPayload();
    this.commitToControl(next);
    this.runValidation();
  }

  private commitToControl(p: ActionPayload): void {
    const ctrl = this.formGroup?.get(this.controlName);
    if (!ctrl) return;
    ctrl.setValue(sanitizeAction(p), { emitEvent: false });
    ctrl.markAsDirty();
  }

  private runValidation(): void {
    const cfg = this.fieldCfg();
    if (!cfg) { this.errors.set([]); this.clearControlError(); return; }
    if (this.jsonParseError()) {
      this.errors.set([{ path: '', message: this.jsonParseError()! }]);
      this.setControlError({ jsonParse: true });
      return;
    }
    const errs = validateAction(this.payload(), cfg);
    this.errors.set(errs);
    if (errs.length > 0) this.setControlError({ ruleAction: errs });
    else this.clearControlError();
  }

  private setControlError(err: any): void {
    const ctrl = this.formGroup?.get(this.controlName);
    if (!ctrl) return;
    ctrl.setErrors({ ...(ctrl.errors ?? {}), ...err });
  }

  private clearControlError(): void {
    const ctrl = this.formGroup?.get(this.controlName);
    if (!ctrl) return;
    const errs = { ...(ctrl.errors ?? {}) };
    delete errs['jsonParse'];
    delete errs['ruleAction'];
    ctrl.setErrors(Object.keys(errs).length ? errs : null);
  }
}
