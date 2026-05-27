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
import { TooltipModule } from 'primeng/tooltip';

import { ConditionNodeComponent } from './condition-node.component';
import { RuleHelpComponent } from './rule-help.component';
import {
  ConditionNode,
  ConditionsFieldConfig,
  ValidationError,
  findRuleField,
  sanitizeConditions,
  validateConditions,
} from './types';

/**
 * Editor de campo `conditions` (editor_type: 'rule_tree').
 *
 *  Uso (sin métodos en HTML):
 *
 *    <app-responsible
 *      [formGroup]="form()['responsible-rule']"
 *      [drawForm]="drawForm()['responsible-rule']"
 *      controlName="conditions"
 *      siblingType="responsible_type">
 *    </app-responsible>
 *
 *  • `field` se descubre internamente vía `computed` recorriendo `drawForm`.
 *  • Si todavía no llega field-config, muestra placeholder visible.
 *  • Reactivo a cambios en el control hermano `responsible_type`.
 *  • Bidireccional Visual ↔ JSON; bloquea el guardado si el JSON es inválido.
 */
@Component({
  selector: 'app-responsible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TabsModule,
    TooltipModule,
    ConditionNodeComponent,
    RuleHelpComponent,
  ],
  templateUrl: './responsible.component.html',
  styleUrl: './responsible.component.scss',
})
export class ResponsibleComponent implements OnInit, OnChanges {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input() controlName = 'conditions';
  /** Sección del drawForm para este pos (ej: drawForm()['responsible-rule']). */
  @Input() drawForm: any = null;
  /** Field-config explícito (opcional). Si no se pasa, se descubre desde drawForm. */
  @Input() field: ConditionsFieldConfig | null = null;
  /** Nombre del control hermano que selecciona el catálogo. */
  @Input() siblingType = 'responsible_type';

  private readonly destroyRef = inject(DestroyRef);

  // Inputs reflejados en signals para reactividad pura
  private readonly drawFormSig = signal<any>(null);
  private readonly fieldExplicitSig = signal<ConditionsFieldConfig | null>(null);

  /** Field-config descubierto. */
  readonly fieldCfg = computed<ConditionsFieldConfig | null>(() => {
    return this.fieldExplicitSig() ?? findRuleField(this.drawFormSig(), 'rule_tree');
  });

  /** Tipo (catálogo) actualmente seleccionado en el form padre. */
  readonly type = signal<string>('');
  readonly tree = signal<ConditionNode>({});
  readonly jsonCtrl = new FormControl<string>('{}', { nonNullable: true });
  readonly jsonParseError = signal<string | null>(null);
  readonly errors = signal<ValidationError[]>([]);
  readonly tabCtrl = new FormControl<number>(0, { nonNullable: true });

  readonly catalog = computed(() => this.fieldCfg()?.catalogs?.[this.type()]);
  readonly paths = computed(() => this.catalog()?.paths ?? {});
  readonly opsMeta = computed(() => this.fieldCfg()?.ops_meta ?? {});
  readonly allowedOps = computed(() => this.fieldCfg()?.allowed_ops ?? []);
  readonly availableTypes = computed(() => Object.keys(this.fieldCfg()?.catalogs ?? {}));
  readonly hasField = computed(() => !!this.fieldCfg());

  ngOnChanges(c: SimpleChanges): void {
    if (c['drawForm']) this.drawFormSig.set(this.drawForm);
    if (c['field']) this.fieldExplicitSig.set(this.field);
  }

  ngOnInit(): void {
    this.drawFormSig.set(this.drawForm);
    this.fieldExplicitSig.set(this.field);

    const ctrl = this.formGroup?.get(this.controlName);
    const initial = this.coerceNode(ctrl?.value);
    this.tree.set(initial);
    this.jsonCtrl.setValue(JSON.stringify(initial, null, 2), { emitEvent: false });

    const sibling = this.formGroup?.get(this.siblingType);
    this.type.set(this.normalizeType(sibling?.value));
    sibling?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        this.type.set(this.normalizeType(v));
        this.runValidation();
      });

    ctrl?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        const n = this.coerceNode(v);
        if (JSON.stringify(n) !== JSON.stringify(this.tree())) {
          this.tree.set(n);
          this.jsonCtrl.setValue(JSON.stringify(n, null, 2), { emitEvent: false });
          this.jsonParseError.set(null);
          this.runValidation();
        }
      });

    this.jsonCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(text => this.onJsonInput(text));

    this.runValidation();
  }

  private normalizeType(v: any): string {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') return v.code ?? v.id ?? '';
    return '';
  }

  private coerceNode(v: any): ConditionNode {
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return {}; }
    }
    return (v && typeof v === 'object') ? v : {};
  }

  protected onTreeChange(n: ConditionNode): void {
    this.tree.set(n);
    this.jsonCtrl.setValue(JSON.stringify(n, null, 2), { emitEvent: false });
    this.jsonParseError.set(null);
    this.commitToControl(n);
    this.runValidation();
  }

  private onJsonInput(text: string): void {
    try {
      const parsed = JSON.parse(text);
      this.jsonParseError.set(null);
      this.tree.set(parsed);
      this.commitToControl(parsed);
      this.runValidation();
    } catch (e: any) {
      this.jsonParseError.set(e?.message ?? 'JSON inválido');
      this.setControlError({ jsonParse: true });
    }
  }

  protected formatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonCtrl.value);
      this.jsonCtrl.setValue(JSON.stringify(parsed, null, 2), { emitEvent: false });
    } catch { /* noop */ }
  }

  protected resetEmpty(): void {
    const empty: ConditionNode = {};
    this.tree.set(empty);
    this.jsonCtrl.setValue('{}', { emitEvent: false });
    this.jsonParseError.set(null);
    this.commitToControl(empty);
    this.runValidation();
  }

  private commitToControl(node: ConditionNode): void {
    const ctrl = this.formGroup?.get(this.controlName);
    if (!ctrl) return;
    ctrl.setValue(sanitizeConditions(node), { emitEvent: false });
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
    const errs = validateConditions(this.tree(), cfg, this.type());
    this.errors.set(errs);
    if (errs.length > 0) this.setControlError({ ruleTree: errs });
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
    delete errs['ruleTree'];
    ctrl.setErrors(Object.keys(errs).length ? errs : null);
  }
}
