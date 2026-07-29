// [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
/**
 * Instrumentación mínima de rendimiento, activable por flag local.
 *
 * Activar (en consola del dispositivo/navegador y recargar):
 *   localStorage.setItem('bos_perf_trace', '1')
 * Desactivar:
 *   localStorage.removeItem('bos_perf_trace')
 *
 * Desactivada por defecto, también en producción. Nunca registra tokens ni
 * contenido de valores: solo nombres de clave/etiquetas, duraciones y tamaños.
 */
const PERF_TRACE_FLAG = 'bos_perf_trace';

let cachedEnabled: boolean | null = null;

export function perfTraceEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    cachedEnabled =
      (typeof localStorage !== 'undefined' && localStorage.getItem(PERF_TRACE_FLAG) === '1') ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PERF_TRACE_FLAG) === '1');
  } catch {
    cachedEnabled = false;
  }
  return cachedEnabled;
}

/** Solo para specs: fuerza el estado del gate sin tocar storage. `null` re-lee el flag. */
export function setPerfTraceForTesting(enabled: boolean | null): void {
  cachedEnabled = enabled;
}

function hasPerformanceApi(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

/** Timestamp monotónico para medir manualmente con perfLog. */
export function perfNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function perfMark(name: string): void {
  if (!perfTraceEnabled() || !hasPerformanceApi()) return;
  try {
    performance.mark(name);
  } catch { /* Instrumentación opcional. */ }
}

/** Mide desde startMark hasta ahora con performance.measure() y loguea la duración. */
export function perfMeasure(name: string, startMark: string, extra?: Record<string, unknown>): void {
  if (!perfTraceEnabled() || !hasPerformanceApi() || typeof performance.measure !== 'function') return;
  try {
    const measure = performance.measure(name, startMark);
    perfLog(name, measure?.duration ?? NaN, extra);
  } catch { /* startMark puede no existir; instrumentación opcional. */ }
}

export function perfLog(label: string, durationMs: number, extra?: Record<string, unknown>): void {
  if (!perfTraceEnabled()) return;
  const rounded = Math.round(durationMs * 10) / 10;
  if (extra) {
    console.log(`[perf] ${label}: ${rounded} ms`, extra);
  } else {
    console.log(`[perf] ${label}: ${rounded} ms`);
  }
}
// ]]]FI
