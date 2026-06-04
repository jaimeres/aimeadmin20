# Custom Draw Form: orden de signals en ngOnChanges

## Datos

- Fecha: 2026-06-02
- Consecutivo: 008
- Tipo: Cambio funcional

## Resumen

Se corrigio el orden de actualizacion de signals dentro de `ngOnChanges` en `custom-draw-form.component.ts` para que la logica dependiente, especialmente `initFormAutoCache()`, lea los valores actuales de `type`, `tabPanel`, `isCreate`, `formGroup` y `drawForm`.

## Alcance

- Sincronizar primero los inputs hacia signals.
- Ejecutar despues la inicializacion dependiente de `drawForm`, `formGroup` y cache automatico.
- Encapsular bloques grandes de `ngOnChanges` en metodos privados.
- Mantener nombres publicos, outputs y HTML sin cambios.

## Escenario 01: Reordenar ngOnChanges

`ngOnChanges` ahora llama primero a `syncInputSignals(changes)` y despues delega la logica existente a:

- `handleFormGroupChange(change: SimpleChange)`
- `handleDrawFormChange(drawForm: any)`
- `syncInputSignals(changes: SimpleChanges)`

## Decisiones tomadas

- Se mantuvo el disparo de `initFormAutoCache()` bajo las mismas condiciones existentes.
- Se conservo la excepcion existente donde `tabPanel` no dispara por si solo la reinicializacion de cache.
- Se evito duplicar la precarga de dropdowns cuando `formGroup` y `drawForm` cambian en el mismo ciclo.
- Se agrego `try/finally` para limpiar el flag interno de ciclo aunque falle una inicializacion.

## Validaciones aplicadas

- Revision del diff del componente.
- `git diff --check` sin errores.
- `npm run build` exitoso.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `docs/documents/2026-06-02_008_custom-draw-form-ngonchanges-signals.md`

## Pendientes

- No quedan pendientes para este cambio.
