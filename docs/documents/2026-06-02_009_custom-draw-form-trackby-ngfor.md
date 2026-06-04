# Custom Draw Form: trackBy en ngFor

## Datos

- Fecha: 2026-06-02
- Consecutivo: 009
- Tipo: Cambio funcional

## Resumen

Se agregaron funciones `trackBy` reutilizables en `custom-draw-form.component.ts` y se aplicaron en los `*ngFor` relevantes de `custom-draw-form.component.html` para reducir recreacion innecesaria de nodos en Angular.

## Alcance

- Mantener `*ngFor` sin migrar a `@for`.
- No modificar estructura visual del formulario.
- No modificar nombres de inputs, outputs ni logica del formulario.
- Usar `field` como identificador principal, `id` como fallback y el indice cuando no existe identificador estable.

## Escenario 01: Optimizar identidad de listas renderizadas

Se agregaron funciones:

- `trackByIndex`
- `trackByField`
- `trackByKey`
- `trackByColumnField`
- `trackByFile`
- `trackBySignature`

## Decisiones tomadas

- Los loops basados en `keyvalue` usan `trackByKey`, priorizando `value.field`, luego `value.id`, luego `key`.
- Las columnas de tabla usan `trackByColumnField`.
- Los archivos usan una clave compuesta con `field` y nombre/identificador disponible para no depender solo del indice.
- Las firmas usan identificadores conocidos si existen y caen al indice si no hay metadatos estables.
- Se mantuvo `trackByFn` como alias de compatibilidad hacia `trackByField`.

## Validaciones aplicadas

- Revision de todos los `*ngFor` del template.
- Revision del diff de HTML y TS.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`

## Pendientes

- No quedan pendientes para este cambio.
