# Custom Draw Form: cache de tabla dinamica

## Datos

- Fecha: 2026-06-02
- Consecutivo: 010
- Tipo: Cambio funcional

## Resumen

Se optimizo la tabla dinamica de `custom-draw-form` para reducir llamadas repetidas desde el template, especialmente dentro de filas y columnas.

## Alcance

- Normalizar columnas de tabla cuando cambia `drawForm`.
- Precalcular tipo, ancho, editable, requerido, severidad de tag y campos de `globalFilter`.
- Mantener los metodos publicos existentes como compatibilidad, consultando cache o metadatos normalizados.
- Cachear estado de edicion por fila/celda y clases de celda.
- No cambiar estructura de `FormArray`.
- No cambiar `ngModel`.
- No dividir el componente.
- No cambiar nombres de configuracion enviados por servidor.
- No modificar comportamiento visual esperado.

## Escenario 01: Reducir llamadas repetidas en tabla dinamica

Se agregaron caches simples y propiedades locales con prefijo `_` sobre la configuracion de tabla:

- `_normalizedColumns`
- `_columnFields`
- `_type`
- `_width`
- `_editable`
- `_required`
- `_tagSeverity`
- `_tagType`
- `_tagActive`

## Decisiones tomadas

- Los metadatos locales usan prefijo `_` para no reemplazar nombres de configuracion del servidor.
- La normalizacion corre en `handleDrawFormChange` antes de inicializar datos de tabla.
- El template usa el estado de edicion calculado una vez por fila mediante `getTableRowState`.
- `getColumnType`, `getColumnWidth`, `isColumnEditable`, `getTagSeverity`, `formatTagValue`, `getCellClass`, `isRowEditing`, `isCellEditing`, `isRowOrCellEditing` y `getColumnFields` se mantienen publicos.
- `getColumnFields(columns)` conserva fallback con `columns.map(...)` si recibe columnas no normalizadas.

## Validaciones aplicadas

- Revision del bloque de tabla en HTML.
- Revision de funciones publicas relacionadas con columnas, tags, clases y edicion.
- Compilacion sugerida con `npm run build` o el comando equivalente del proyecto.

## Notas importantes

- El cambio reduce calculos en ciclos de deteccion, pero mantiene algunas llamadas necesarias para datos dinamicos por celda, como formato visual y clase de validacion.
- No se migro a formularios reactivos para edicion de celda porque la restriccion indica no cambiar `ngModel` todavia.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`

## Pendientes

- Validar en navegador una tabla con edicion por fila y por celda.
- Considerar en una tarea posterior migrar `ngModel` dentro de tabla a controles reactivos si se decide cambiar la estructura de edicion.
