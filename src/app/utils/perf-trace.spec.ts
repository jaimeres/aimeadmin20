import { perfLog, perfMark, perfMeasure, perfNow, perfTraceEnabled, setPerfTraceForTesting } from './perf-trace';

describe('perf-trace', () => {

  afterEach(() => {
    setPerfTraceForTesting(null);
    localStorage.removeItem('bos_perf_trace');
    sessionStorage.removeItem('bos_perf_trace');
  });

  it('está desactivado por defecto (sin flag)', () => {
    setPerfTraceForTesting(null);
    localStorage.removeItem('bos_perf_trace');
    sessionStorage.removeItem('bos_perf_trace');
    expect(perfTraceEnabled()).toBeFalse();
  });

  it('se activa con el flag bos_perf_trace en localStorage', () => {
    setPerfTraceForTesting(null);
    localStorage.setItem('bos_perf_trace', '1');
    expect(perfTraceEnabled()).toBeTrue();
  });

  it('perfLog no escribe en consola cuando está desactivado', () => {
    setPerfTraceForTesting(false);
    const consoleSpy = spyOn(console, 'log');
    perfLog('etiqueta', 12.3);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('perfLog escribe duración redondeada cuando está activado', () => {
    setPerfTraceForTesting(true);
    const consoleSpy = spyOn(console, 'log');
    perfLog('etiqueta', 12.34);
    expect(consoleSpy).toHaveBeenCalledWith('[perf] etiqueta: 12.3 ms');
  });

  it('perfLog incluye datos extra sin registrar valores sensibles', () => {
    setPerfTraceForTesting(true);
    const consoleSpy = spyOn(console, 'log');
    perfLog('cache.getItem clave', 5, { chars: 100 });
    expect(consoleSpy).toHaveBeenCalledWith('[perf] cache.getItem clave: 5 ms', { chars: 100 });
  });

  it('perfMark y perfMeasure generan una medición con performance API', () => {
    setPerfTraceForTesting(true);
    const consoleSpy = spyOn(console, 'log');
    perfMark('spec-start');
    perfMeasure('spec-measure', 'spec-start');
    expect(consoleSpy).toHaveBeenCalled();
    const firstArg = consoleSpy.calls.mostRecent().args[0] as string;
    expect(firstArg).toContain('[perf] spec-measure:');
  });

  it('perfMeasure no falla si la marca de inicio no existe', () => {
    setPerfTraceForTesting(true);
    expect(() => perfMeasure('sin-marca', 'marca-inexistente')).not.toThrow();
  });

  it('perfNow retorna un número monotónico', () => {
    const first = perfNow();
    const second = perfNow();
    expect(second).toBeGreaterThanOrEqual(first);
  });
});
