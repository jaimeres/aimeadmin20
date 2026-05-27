import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { OpMeta, PathMeta, SimpleExpr } from './types';

/**
 * Editor de una expresión simple { path, op, value? }.
 *
 * — Sin `ngModel`: usa `FormControl` internos.
 * — Sin lógica imperativa en el template: opciones y "kind" son `computed`.
 * — 100% data-driven: paths/opsMeta/allowedOps/ctxPaths vienen del field-config.
 */
@Component({
  selector: 'app-where-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    AutoCompleteModule,
    ButtonModule,
  ],
  templateUrl: './where-row.component.html',
  styleUrl: './where-row.component.scss',
})
export class WhereRowComponent implements OnChanges {
  @Input({ required: true }) value!: SimpleExpr;
  @Input({ required: true }) paths!: Record<string, PathMeta>;
  @Input({ required: true }) opsMeta!: Record<string, OpMeta>;
  @Input({ required: true }) allowedOps!: string[];
  @Input() ctxPaths: string[] = [];

  @Output() valueChange = new EventEmitter<SimpleExpr>();
  @Output() removeRow = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);

  readonly pathCtrl = new FormControl<string>('', { nonNullable: true });
  readonly opCtrl = new FormControl<string>('', { nonNullable: true });
  readonly scalarCtrl = new FormControl<string>('', { nonNullable: true });
  readonly chipsCtrl = new FormControl<any[]>([], { nonNullable: true });
  readonly minCtrl = new FormControl<string>('', { nonNullable: true });
  readonly maxCtrl = new FormControl<string>('', { nonNullable: true });
  readonly pathRefCtrl = new FormControl<string>('', { nonNullable: true });

  private readonly pathSig = signal<string>('');
  private readonly opSig = signal<string>('');
  private readonly pathsSig = signal<Record<string, PathMeta>>({});
  private readonly opsMetaSig = signal<Record<string, OpMeta>>({});
  private readonly allowedOpsSig = signal<string[]>([]);
  private readonly ctxPathsSig = signal<string[]>([]);

  private hydrating = false;

  readonly pathOptions = computed(() => {
    const meta = this.pathsSig();
    return Object.keys(meta).sort().map(p => ({
      label: meta[p]?.label || meta[p]?.desc || p,
      value: p,
    }));
  });
  readonly opOptions = computed(() => {
    const cur = this.pathSig();
    const allowed = this.pathsSig()?.[cur]?.ops ?? [];
    const allow = new Set(this.allowedOpsSig());
    const meta = this.opsMetaSig();
    return allowed.filter(o => allow.has(o)).map(o => ({
      label: meta[o]?.desc || o,
      value: o,
    }));
  });
  readonly ctxPathOptions = computed(() =>
    this.ctxPathsSig().map(p => ({ label: p, value: p })),
  );

  /** scalar | array | between | path | none | unset | unknown */
  readonly kind = computed<string>(() => {
    const m = this.opsMetaSig()[this.opSig()];
    if (!m) return this.opSig() ? 'unknown' : 'unset';
    return m.value_type === null ? 'none' : m.value_type;
  });

  constructor() {
    this.pathCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.pathSig.set(v ?? ''));
    this.opCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.opSig.set(v ?? ''));

    // Si el operador deja de ser válido para el path actual, lo corrige.
    effect(() => {
      const opts = this.opOptions().map(o => o.value);
      const cur = this.opCtrl.value;
      if (cur && !opts.includes(cur)) {
        this.opCtrl.setValue(opts[0] ?? '');
      }
    });

    merge(
      this.pathCtrl.valueChanges,
      this.opCtrl.valueChanges,
      this.scalarCtrl.valueChanges,
      this.chipsCtrl.valueChanges,
      this.minCtrl.valueChanges,
      this.maxCtrl.valueChanges,
      this.pathRefCtrl.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emit());
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['paths']) this.pathsSig.set(this.paths ?? {});
    if (c['opsMeta']) this.opsMetaSig.set(this.opsMeta ?? {});
    if (c['allowedOps']) this.allowedOpsSig.set(this.allowedOps ?? []);
    if (c['ctxPaths']) this.ctxPathsSig.set(this.ctxPaths ?? []);
    if (c['value']) this.hydrate(this.value);
  }

  private hydrate(v: SimpleExpr | undefined): void {
    this.hydrating = true;
    const safe = v ?? { path: '', op: '' };
    this.pathCtrl.setValue(safe.path ?? '', { emitEvent: false });
    this.opCtrl.setValue(safe.op ?? '', { emitEvent: false });
    this.pathSig.set(safe.path ?? '');
    this.opSig.set(safe.op ?? '');

    this.scalarCtrl.setValue('', { emitEvent: false });
    this.chipsCtrl.setValue([], { emitEvent: false });
    this.minCtrl.setValue('', { emitEvent: false });
    this.maxCtrl.setValue('', { emitEvent: false });
    this.pathRefCtrl.setValue('', { emitEvent: false });

    const k = this.opsMetaSig()[safe.op]?.value_type ?? null;
    if (k === 'scalar') {
      this.scalarCtrl.setValue(safe.value == null ? '' : String(safe.value), { emitEvent: false });
    } else if (k === 'array') {
      this.chipsCtrl.setValue(Array.isArray(safe.value) ? [...safe.value] : [], { emitEvent: false });
    } else if (k === 'between') {
      this.minCtrl.setValue(safe.value?.min == null ? '' : String(safe.value.min), { emitEvent: false });
      this.maxCtrl.setValue(safe.value?.max == null ? '' : String(safe.value.max), { emitEvent: false });
    } else if (k === 'path') {
      this.pathRefCtrl.setValue(typeof safe.value === 'string' ? safe.value : '', { emitEvent: false });
    }
    this.hydrating = false;
  }

  private emit(): void {
    if (this.hydrating) return;
    const expr: SimpleExpr = { path: this.pathCtrl.value, op: this.opCtrl.value };
    const k = this.opsMetaSig()[expr.op]?.value_type ?? null;
    if (k === 'scalar') expr.value = this.scalarCtrl.value;
    else if (k === 'array') expr.value = [...(this.chipsCtrl.value ?? [])];
    else if (k === 'between') {
      const v: any = {};
      if (this.minCtrl.value !== '') v.min = this.minCtrl.value;
      if (this.maxCtrl.value !== '') v.max = this.maxCtrl.value;
      expr.value = v;
    } else if (k === 'path') expr.value = this.pathRefCtrl.value;
    this.valueChange.emit(expr);
  }

  protected emitRemove(): void { this.removeRow.emit(); }
}
