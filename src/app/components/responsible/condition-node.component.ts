import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { WhereRowComponent } from './where-row.component';
import {
  ConditionNode,
  OpMeta,
  PathMeta,
  SimpleExpr,
  isAll,
  isAny,
  isEmpty,
  isSimple,
} from './types';

type NodeMode = 'empty' | 'all' | 'any' | 'simple';

@Component({
  selector: 'app-condition-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule, WhereRowComponent],
  templateUrl: './condition-node.component.html',
  styleUrl: './condition-node.component.scss',
})
export class ConditionNodeComponent implements OnChanges {
  @Input({ required: true }) node!: ConditionNode;
  @Input({ required: true }) paths!: Record<string, PathMeta>;
  @Input({ required: true }) opsMeta!: Record<string, OpMeta>;
  @Input({ required: true }) allowedOps!: string[];
  @Input() depth = 0;
  @Input() removable = true;

  @Output() nodeChange = new EventEmitter<ConditionNode>();
  @Output() removeSelf = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);

  readonly modeCtrl = new FormControl<NodeMode>('empty', { nonNullable: true });

  protected readonly nodeSig = signal<ConditionNode>({});

  protected readonly mode = computed<NodeMode>(() => {
    const n = this.nodeSig();
    if (isEmpty(n)) return 'empty';
    if (isAll(n)) return 'all';
    if (isAny(n)) return 'any';
    if (isSimple(n)) return 'simple';
    return 'empty';
  });

  protected readonly children = computed<ConditionNode[]>(() => {
    const n = this.nodeSig() as any;
    if (Array.isArray(n.all)) return n.all;
    if (Array.isArray(n.any)) return n.any;
    return [];
  });

  protected readonly ctxPaths = computed(() => Object.keys(this.paths ?? {}).sort());

  protected readonly modeOptions = [
    { label: 'Y (todas)', value: 'all' },
    { label: 'O (alguna)', value: 'any' },
    { label: 'Simple', value: 'simple' },
    { label: 'Vacío {}', value: 'empty' },
  ];

  private hydrating = false;

  constructor() {
    this.modeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(m => {
        if (this.hydrating) return;
        this.applyMode(m);
      });
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['node']) this.hydrate(this.node);
  }

  private hydrate(n: ConditionNode | undefined): void {
    this.hydrating = true;
    const safe = (n ?? {}) as ConditionNode;
    this.nodeSig.set(safe);
    this.modeCtrl.setValue(this.mode(), { emitEvent: false });
    this.hydrating = false;
  }

  private applyMode(m: NodeMode): void {
    let next: ConditionNode;
    switch (m) {
      case 'empty': next = {}; break;
      case 'all': next = { all: this.children().length ? [...this.children()] : [{}] }; break;
      case 'any': next = { any: this.children().length ? [...this.children()] : [{}] }; break;
      case 'simple': {
        const cur = this.nodeSig() as any;
        next = isSimple(cur) ? { ...cur } : { path: '', op: '' };
        break;
      }
    }
    this.nodeSig.set(next);
    this.nodeChange.emit(next);
  }

  protected onSimpleChange(v: SimpleExpr): void {
    this.nodeSig.set(v);
    this.nodeChange.emit(v);
  }

  protected addChild(): void {
    const cur = this.nodeSig() as any;
    const key: 'all' | 'any' = isAny(cur) ? 'any' : 'all';
    const next: any = { [key]: [...(cur[key] ?? []), {}] };
    this.nodeSig.set(next);
    this.nodeChange.emit(next);
  }

  protected onChildChange(idx: number, v: ConditionNode): void {
    const cur = this.nodeSig() as any;
    const key: 'all' | 'any' = isAny(cur) ? 'any' : 'all';
    const arr = [...(cur[key] ?? [])];
    arr[idx] = v;
    const next: any = { [key]: arr };
    this.nodeSig.set(next);
    this.nodeChange.emit(next);
  }

  protected onChildRemove(idx: number): void {
    const cur = this.nodeSig() as any;
    const key: 'all' | 'any' = isAny(cur) ? 'any' : 'all';
    const arr = [...(cur[key] ?? [])];
    arr.splice(idx, 1);
    const next: any = { [key]: arr };
    this.nodeSig.set(next);
    this.nodeChange.emit(next);
  }

  protected emitRemove(): void { this.removeSelf.emit(); }
}
