// [[[II ESC:031-04 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-04
// Pipe movido desde custom-draw-form.component.ts sin cambios de lógica, para
// que los campos extraídos (listbox) puedan importarlo sin ciclo de imports.
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'joinOrSelf', standalone: true, pure: true })
export class JoinOrSelfPipe implements PipeTransform {

  /**
   * Normaliza `option_label` para PrimeNG.
   * - Si es array, lo concatena usando `sep`.
   * - Si es string con comas, lo divide y concatena usando `sep`.
   * - Si es string simple, lo retorna tal cual.
   */
  transform(value: unknown, sep = ''): string {

    if (Array.isArray(value)) {
      return value.join(sep);
    }

    if (typeof value === 'string') {
      const parts = value.split(','); // split funciona igual si no hay coma

      if (parts.length === 1) {
        const trimmed = parts[0].trim();
        return trimmed || 'name';
      }

      const cleaned: string[] = [];

      for (const p of parts) {
        const t = p.trim();
        if (t) cleaned.push(t);
      }

      return cleaned.join(sep);
    }

    return 'name';
  }
}
// ]]]FI
