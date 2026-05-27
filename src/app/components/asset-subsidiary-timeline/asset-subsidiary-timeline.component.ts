import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, OnChanges,
  Output, signal, SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { forkJoin, of } from 'rxjs';
import { AssetSubsidiaryTimelineService } from './asset-subsidiary-timeline.service';
import { MessageService } from '../services/message.service';
import { GeneralService } from '../../utils/services/general.service';

/**
 * Vista de timeline diaria para administrar la ubicación temporal de un activo
 * en sucursales. Filas = sucursales; columnas = días dentro del rango.
 *
 * Reglas reflejadas:
 *  - Intervalo [start, end) — end exclusivo, null = vigente.
 *  - Mismo (asset+subsidiary) no puede solaparse.
 *  - La unión de intervalos de TODAS las sucursales debe ser continua (sin huecos).
 *  - Suma de % por día debería = 100 (warning local).
 *  - Cambios → diff (POST/PATCH/DELETE) consolidando días contiguos iguales.
 *
 * [[[II ESC:002-01 DOC:docs/documents/2026-05-19_002_ui_timeline_asset_subsidiary.md#escenario-01
 */
interface ServerRecord {
  id: string;
  subsidiary: string;        // uuid
  subsidiary_name?: string;
  start_date: string;        // ISO
  end_date: string | null;   // ISO o null (vigente)
  percentage: number;
  is_default: boolean;
}

interface CellState {
  subsidiary: string;
  percentage: number;
  is_default: boolean;
  // Origen para diff: id del registro original que cubre este día (si aplica)
  origin_id?: string;
}

// Estado por día: arreglo de asignaciones (split %).
type DayState = CellState[];

@Component({
  selector: 'app-asset-subsidiary-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, ButtonModule, DatePickerModule, DialogModule,
    SelectModule, InputNumberModule, ToggleSwitchModule, TooltipModule, TagModule, MessageModule,
  ],
  templateUrl: './asset-subsidiary-timeline.component.html',
  styleUrl: './asset-subsidiary-timeline.component.scss',
})
export class AssetSubsidiaryTimelineComponent implements OnChanges {

  private svc = inject(AssetSubsidiaryTimelineService);
  private messageS = inject(MessageService);
  private generalS = inject(GeneralService);

  /** Activo seleccionado (registro CRUD). Espera un array tipo `selected()`. */
  @Input() selected: any[] = [];
  /** Se activa al mostrarse el tab para disparar la carga inicial. */
  @Input() active: boolean = false;

  @Output() savedAction = new EventEmitter<void>();

  // ---------- estado ----------
  range = signal<Date[]>(this.defaultMonthRange());
  groupMode = signal<'day' | 'week' | 'month' | 'auto'>('day');
  loading = signal(false);
  saving = signal(false);

  /** Sucursales disponibles para el dropdown. */
  subsidiaries = signal<Array<{ id: string; name: string }>>([]);
  /** Registros originales (snapshot del servidor) ya normalizados. */
  original = signal<ServerRecord[]>([]);
  /** Estado editado por día → mapa 'YYYY-MM-DD' → DayState. */
  edited = signal<Map<string, DayState>>(new Map());

  assetId = signal<string | null>(null);
  assetName = signal<string>('');

  /** Lista de días en el rango (Date a medianoche UTC). */
  days = computed<Date[]>(() => {
    const r = this.range();
    if (!r || !r[0] || !r[1]) return [];
    const out: Date[] = [];
    const start = this.toUtcDay(r[0]);
    const end = this.toUtcDay(r[1]);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  });

  /** Sucursales que aparecen como fila (todas las que tienen al menos un día asignado en el rango). */
  rowSubsidiaries = signal<Array<{ id: string; name: string }>>([]);

  /** Bloques agrupados (runs contiguos iguales) — vista visual. */
  visibleBlocks = computed(() => this.computeBlocks());

  /** Validación: huecos y desbalance de %. */
  validation = computed(() => this.computeValidation());

  /** Diff a aplicar al guardar. */
  pendingDiff = computed(() => this.computeDiff());

  // ---------- popup edición ----------
  popupVisible = false;
  popupDay: Date | null = null;
  popupRowSub: { id: string; name: string } | null = null;
  popupForm = {
    subsidiaryId: '' as string | null,
    percentage: 100 as number,
    is_default: false,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selected'] || changes['active']) {
      this.resolveAssetFromSelected();
      if (this.active && this.assetId()) {
        this.reload();
      }
    }
  }

  // ---------- carga ----------
  resolveAssetFromSelected(): void {
    const sel = this.selected?.[0];
    if (!sel) {
      this.assetId.set(null);
      this.assetName.set('');
      return;
    }
    // Caso 1: selected es el propio activo
    if (sel.type_type === 'asset' || sel.type === 'asset') {
      this.assetId.set(sel.id);
      this.assetName.set(sel.name || sel.code || sel.id);
      return;
    }
    // Caso 2: selected es un asset-subsidiary; extraer asset relacionado
    const rel = sel.relationships?.asset?.data;
    if (rel?.id) {
      this.assetId.set(rel.id);
      this.assetName.set(sel.asset__name || sel.asset_name || rel.id);
      return;
    }
    // Fallback: si trae campo plano "asset"
    if (sel.asset) {
      const id = typeof sel.asset === 'string' ? sel.asset : sel.asset.id;
      this.assetId.set(id || null);
      this.assetName.set(sel.asset__name || sel.asset_name || id || '');
    }
  }

  reload(): void {
    const aid = this.assetId();
    if (!aid) return;
    const r = this.range();
    if (!r?.[0] || !r?.[1]) return;
    this.loading.set(true);
    const startGte = this.toIsoZ(this.toUtcDay(r[0]));
    const endLte = this.toIsoZ(this.endOfDayUtc(r[1]));

    forkJoin({
      list: this.svc.list({ assetId: aid, startGte, endLte }),
      subs: this.subsidiaries().length ? of({ data: this.subsidiaries().map(s => ({ id: s.id, attributes: { name: s.name } })) }) : this.svc.subsidiaries(),
    }).subscribe({
      next: ({ list, subs }: any) => {
        // sucursales
        const subItems = (subs?.data || []).map((d: any) => ({ id: d.id, name: d.attributes?.name || d.id }));
        this.subsidiaries.set(subItems);
        const subsMap = new Map(subItems.map((s: { id: string; name: string }) => [s.id, s.name]));

        // registros
        const records: ServerRecord[] = (list?.data || []).map((d: any) => {
          const subId = d.relationships?.subsidiary?.data?.id || '';
          return {
            id: d.id,
            subsidiary: subId,
            subsidiary_name: subsMap.get(subId) || subId,
            start_date: d.attributes?.start_date,
            end_date: d.attributes?.end_date ?? null,
            percentage: parseFloat(d.attributes?.percentage ?? '0'),
            is_default: !!d.attributes?.is_default,
          } as ServerRecord;
        });
        this.original.set(records);
        this.buildEditedFromOriginal();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messageS.changeMessage('Error al cargar el timeline de sucursales', err, []);
      },
    });
  }

  private buildEditedFromOriginal(): void {
    const days = this.days();
    const map = new Map<string, DayState>();
    for (const day of days) {
      map.set(this.keyDay(day), []);
    }
    const recs = this.original();
    for (const rec of recs) {
      const startDay = this.toUtcDay(new Date(rec.start_date));
      // end exclusivo: día final ocupado = endDay - 1
      const endExcl = rec.end_date ? this.toUtcDay(new Date(rec.end_date)) : null;
      for (const day of days) {
        if (day < startDay) continue;
        if (endExcl && day >= endExcl) continue;
        const k = this.keyDay(day);
        const arr = map.get(k);
        if (!arr) continue;
        arr.push({
          subsidiary: rec.subsidiary,
          percentage: rec.percentage,
          is_default: rec.is_default,
          origin_id: rec.id,
        });
      }
    }
    this.edited.set(map);
    this.refreshRowSubsidiaries();
  }

  private refreshRowSubsidiaries(): void {
    const ids = new Set<string>();
    for (const day of this.edited().values()) {
      for (const c of day) ids.add(c.subsidiary);
    }
    const subsAll = this.subsidiaries();
    const rows = Array.from(ids)
      .map(id => subsAll.find(s => s.id === id) || { id, name: id })
      .sort((a, b) => a.name.localeCompare(b.name));
    this.rowSubsidiaries.set(rows);
  }

  // ---------- celdas (visualización) ----------
  cellOf(subId: string, day: Date): CellState | undefined {
    const arr = this.edited().get(this.keyDay(day)) || [];
    return arr.find(c => c.subsidiary === subId);
  }

  daySum(day: Date): number {
    const arr = this.edited().get(this.keyDay(day)) || [];
    return arr.reduce((s, c) => s + (c.percentage || 0), 0);
  }

  isDayEmpty(day: Date): boolean {
    return (this.edited().get(this.keyDay(day)) || []).length === 0;
  }

  hasAnyEmpty(): boolean {
    for (const d of this.days()) if (this.isDayEmpty(d)) return true;
    return false;
  }

  /** Construye runs contiguos por sucursal con mismos (% , is_default) para agrupar visualmente. */
  private computeBlocks() {
    const result: Array<{ subId: string; subName: string; cells: Array<{ from: Date; to: Date; percentage: number; is_default: boolean; span: number }> }> = [];
    const subs = this.rowSubsidiaries();
    const days = this.days();
    const mode = this.groupMode();
    const map = this.edited();
    for (const sub of subs) {
      const cells: Array<{ from: Date; to: Date; percentage: number; is_default: boolean; span: number }> = [];
      let i = 0;
      while (i < days.length) {
        const cur = this.findInArr(map.get(this.keyDay(days[i])) || [], sub.id);
        if (!cur) { i++; continue; }
        let j = i + 1;
        if (mode === 'auto' || mode === 'day') {
          while (j < days.length) {
            const nxt = this.findInArr(map.get(this.keyDay(days[j])) || [], sub.id);
            if (!nxt) break;
            if (mode === 'auto' && (nxt.percentage !== cur.percentage || nxt.is_default !== cur.is_default)) break;
            if (mode === 'day') break; // no agrupar
            j++;
          }
        } else {
          j = i + 1;
        }
        cells.push({ from: days[i], to: days[j - 1], percentage: cur.percentage, is_default: cur.is_default, span: j - i });
        i = j;
      }
      result.push({ subId: sub.id, subName: sub.name, cells });
    }
    return result;
  }

  private findInArr(arr: DayState, subId: string): CellState | undefined {
    return arr.find(c => c.subsidiary === subId);
  }

  // ---------- validación ----------
  private computeValidation() {
    const issues: Array<{ level: 'error' | 'warn'; message: string }> = [];
    let gapDays = 0;
    let oversumDays = 0;
    let undersumDays = 0;
    for (const day of this.days()) {
      const arr = this.edited().get(this.keyDay(day)) || [];
      if (arr.length === 0) { gapDays++; continue; }
      const s = arr.reduce((a, c) => a + (c.percentage || 0), 0);
      if (s > 100.0001) oversumDays++;
      else if (s < 99.9999) undersumDays++;
    }
    if (gapDays > 0) issues.push({ level: 'error', message: `Hay ${gapDays} día(s) sin asignación (la línea de tiempo debe ser continua).` });
    if (oversumDays > 0) issues.push({ level: 'warn', message: `Hay ${oversumDays} día(s) con suma de % > 100.` });
    if (undersumDays > 0) issues.push({ level: 'warn', message: `Hay ${undersumDays} día(s) con suma de % < 100.` });
    return issues;
  }

  // ---------- popup edición ----------
  openCellPopup(sub: { id: string; name: string } | null, day: Date): void {
    this.popupDay = day;
    this.popupRowSub = sub;
    const existing = sub ? this.cellOf(sub.id, day) : undefined;
    this.popupForm = {
      subsidiaryId: existing ? existing.subsidiary : (sub?.id || null),
      percentage: existing?.percentage ?? 100,
      is_default: existing?.is_default ?? false,
    };
    this.popupVisible = true;
  }

  /** Aplicar al rango (desde popupDay hasta otro día) */
  popupApplyRangeUntil: Date | null = null;

  applyPopup(): void {
    if (!this.popupDay || !this.popupForm.subsidiaryId) return;
    const subId = this.popupForm.subsidiaryId;
    const pct = Number(this.popupForm.percentage) || 0;
    const isDef = !!this.popupForm.is_default;
    const start = this.popupDay;
    const end = this.popupApplyRangeUntil && this.popupApplyRangeUntil >= start ? this.popupApplyRangeUntil : start;

    const map = new Map(this.edited());
    for (const day of this.days()) {
      if (day < this.toUtcDay(start) || day > this.toUtcDay(end)) continue;
      const k = this.keyDay(day);
      let arr = [...(map.get(k) || [])];
      // Si is_default, desmarcar otros en el mismo día
      if (isDef) arr = arr.map(c => ({ ...c, is_default: false }));
      const idx = arr.findIndex(c => c.subsidiary === subId);
      if (idx >= 0) arr[idx] = { ...arr[idx], percentage: pct, is_default: isDef };
      else arr.push({ subsidiary: subId, percentage: pct, is_default: isDef });
      map.set(k, arr);
    }
    this.edited.set(map);
    this.refreshRowSubsidiaries();
    this.popupVisible = false;
    this.popupApplyRangeUntil = null;
  }

  removeAssignment(): void {
    if (!this.popupDay || !this.popupForm.subsidiaryId) return;
    const subId = this.popupForm.subsidiaryId;
    const start = this.popupDay;
    const end = this.popupApplyRangeUntil && this.popupApplyRangeUntil >= start ? this.popupApplyRangeUntil : start;
    const map = new Map(this.edited());
    for (const day of this.days()) {
      if (day < this.toUtcDay(start) || day > this.toUtcDay(end)) continue;
      const k = this.keyDay(day);
      const arr = (map.get(k) || []).filter(c => c.subsidiary !== subId);
      map.set(k, arr);
    }
    this.edited.set(map);
    this.refreshRowSubsidiaries();
    this.popupVisible = false;
    this.popupApplyRangeUntil = null;
  }

  // ---------- diff ----------
  /**
   * Construye el conjunto de runs deseados desde `edited` y los empareja con los
   * registros originales por (subsidiary). El emparejamiento es por orden de
   * start_date. Pares con atributos distintos → PATCH; sobrantes → POST/DELETE.
   *
   * NOTA: Sólo se contabilizan runs cuyo rango cae dentro del rango visualizado;
   * los registros originales fuera del rango se preservan (no se incluyen aquí).
   */
  private computeDiff() {
    const desiredBySub = new Map<string, Array<{ start: Date; endExcl: Date; percentage: number; is_default: boolean }>>();
    const days = this.days();
    // Recorrer cada sucursal-fila y armar runs consecutivos
    const allSubs = new Set<string>();
    for (const arr of this.edited().values()) for (const c of arr) allSubs.add(c.subsidiary);

    for (const subId of allSubs) {
      const runs: Array<{ start: Date; endExcl: Date; percentage: number; is_default: boolean }> = [];
      let current: { start: Date; endExcl: Date; percentage: number; is_default: boolean } | null = null;
      for (const day of days) {
        const cell = this.cellOf(subId, day);
        if (!cell) {
          if (current) { runs.push(current); current = null; }
          continue;
        }
        if (!current) {
          current = {
            start: day,
            endExcl: this.addDay(day),
            percentage: cell.percentage,
            is_default: cell.is_default,
          };
        } else if (cell.percentage === current.percentage && cell.is_default === current.is_default) {
          current.endExcl = this.addDay(day);
        } else {
          runs.push(current);
          current = {
            start: day,
            endExcl: this.addDay(day),
            percentage: cell.percentage,
            is_default: cell.is_default,
          };
        }
      }
      if (current) runs.push(current);
      desiredBySub.set(subId, runs);
    }

    // Originales agrupados por subsidiary, intersectados con el rango visible
    const rangeStart = this.toUtcDay(this.range()[0]);
    const rangeEndExcl = this.addDay(this.toUtcDay(this.range()[1]));
    const originalBySub = new Map<string, ServerRecord[]>();
    for (const rec of this.original()) {
      const recStart = this.toUtcDay(new Date(rec.start_date));
      const recEnd = rec.end_date ? this.toUtcDay(new Date(rec.end_date)) : null;
      // ¿se intersecta con el rango?
      if (recEnd && recEnd <= rangeStart) continue;
      if (recStart >= rangeEndExcl) continue;
      const arr = originalBySub.get(rec.subsidiary) || [];
      arr.push(rec);
      originalBySub.set(rec.subsidiary, arr);
    }
    for (const arr of originalBySub.values()) arr.sort((a, b) => a.start_date.localeCompare(b.start_date));

    const ops: Array<{ kind: 'POST' | 'PATCH' | 'DELETE'; payload: any; id?: string }> = [];

    const allSubsAll = new Set<string>([...desiredBySub.keys(), ...originalBySub.keys()]);
    for (const subId of allSubsAll) {
      const desired = desiredBySub.get(subId) || [];
      const origs = originalBySub.get(subId) || [];
      const n = Math.max(desired.length, origs.length);
      for (let i = 0; i < n; i++) {
        const d = desired[i];
        const o = origs[i];
        if (d && o) {
          // PATCH si difieren atributos
          const patchAttrs: any = {};
          const oStart = this.toIsoZ(this.toUtcDay(new Date(o.start_date)));
          const oEnd = o.end_date ? this.toIsoZ(this.toUtcDay(new Date(o.end_date))) : null;
          const dStart = this.toIsoZ(d.start);
          const dEnd = this.toIsoZ(d.endExcl);
          if (dStart !== oStart) patchAttrs.start_date = dStart;
          if (dEnd !== oEnd) patchAttrs.end_date = dEnd;
          if (Math.abs((d.percentage || 0) - (o.percentage || 0)) > 1e-9) patchAttrs.percentage = d.percentage.toFixed(2);
          if (d.is_default !== o.is_default) patchAttrs.is_default = d.is_default;
          if (Object.keys(patchAttrs).length > 0) {
            ops.push({ kind: 'PATCH', id: o.id, payload: patchAttrs });
          }
        } else if (d && !o) {
          ops.push({
            kind: 'POST',
            payload: {
              subsidiaryId: subId,
              attrs: {
                start_date: this.toIsoZ(d.start),
                end_date: this.toIsoZ(d.endExcl),
                percentage: d.percentage.toFixed(2),
                is_default: d.is_default,
              },
            },
          });
        } else if (!d && o) {
          ops.push({ kind: 'DELETE', id: o.id, payload: null });
        }
      }
    }
    return ops;
  }

  // ---------- save ----------
  save(): void {
    const aid = this.assetId();
    if (!aid) return;
    const ops = this.pendingDiff();
    if (ops.length === 0) {
      this.messageS.changeMessage('No hay cambios para guardar.', null, []);
      return;
    }
    this.saving.set(true);
    // Estrategia: ejecutar PATCH de cierre primero, luego DELETE, luego POST, para no chocar con uniques.
    const ordered = [
      ...ops.filter(o => o.kind === 'PATCH'),
      ...ops.filter(o => o.kind === 'DELETE'),
      ...ops.filter(o => o.kind === 'POST'),
    ];
    this.runSerial(ordered, 0, aid);
  }

  private runSerial(ops: any[], i: number, aid: string): void {
    if (i >= ops.length) {
      this.saving.set(false);
      this.messageS.changeMessage('Timeline guardado.', null, []);
      this.savedAction.emit();
      this.reload();
      return;
    }
    const op = ops[i];
    let obs;
    if (op.kind === 'POST') obs = this.svc.create(op.payload.attrs, aid, op.payload.subsidiaryId);
    else if (op.kind === 'PATCH') obs = this.svc.patch(op.id, op.payload);
    else /* DELETE */            obs = this.svc.remove(op.id);

    obs.subscribe({
      next: () => this.runSerial(ops, i + 1, aid),
      error: (err: any) => {
        this.saving.set(false);
        this.messageS.changeMessage(`Error en operación ${op.kind} (${i + 1}/${ops.length}).`, err, []);
      },
    });
  }

  // ---------- range & group ----------
  onRangeChange(r: Date[]): void {
    if (!r?.[0] || !r?.[1]) return;
    this.range.set([r[0], r[1]]);
    if (this.assetId()) this.reload();
  }

  setGroup(mode: 'day' | 'week' | 'month' | 'auto'): void {
    this.groupMode.set(mode);
  }

  // ---------- utilidades de fecha ----------
  private defaultMonthRange(): Date[] {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return [start, end];
  }

  private toUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private endOfDayUtc(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
  }

  private addDay(d: Date): Date {
    const n = new Date(d);
    n.setUTCDate(n.getUTCDate() + 1);
    return n;
  }

  private keyDay(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toIsoZ(d: Date): string {
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  // helpers para template
  fmtDay = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  fmtDow = (d: Date) => ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][d.getUTCDay()];
  trackById = (_: number, x: { id: string }) => x.id;
  trackByKey = (i: number, d: Date) => this.keyDay(d);
}
// ]]]FI
