/**
 * [[[II Fuente única de tipos "dropdown-like" usados por el form dinámico.
 * - `crud.class.ts` los usa para reconstruir/aplanar payload (Escenarios 1-3).
 * - `custom-draw-form.component.ts` los usa para reconocer controles que llevan
 *   `object_<field>` y necesitan precarga/mapeo de opciones.
 *
 * NO incluir `auto-complete` para flujo de PRECARGA (usa completeMethod remoto).
 * Sí incluirlo cuando solo se necesite saber que el control tiene la dualidad
 * `object_<field>` / `<field>` (renombrado por addFieldsByPrefix).
 * Referencia: docs/documents/2025-XX-XX_consolidacion_dropdown_types.md ]]]FI
 */
export const DROPDOWN_TYPES_PAYLOAD: ReadonlySet<string> = new Set([
  'dropdown',
  'auto-complete',
  'tree-select',
  'dropdown-choice',
  'multi-select',
  'select-button',
]);

export const DROPDOWN_TYPES_PRELOAD: ReadonlySet<string> = new Set([
  'dropdown',
  'tree-select',
  'dropdown-choice',
  'multi-select',
  'select-button',
]);
