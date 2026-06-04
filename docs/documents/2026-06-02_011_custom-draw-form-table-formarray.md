# Custom Draw Form: tablas dinamicas con FormArray

## Datos

- Fecha: 2026-06-02
- Consecutivo: 011
- Tipo: Cambio funcional

## Resumen

Se unifico la logica interna de tablas dinamicas en `custom-draw-form` para trabajar con `FormArray` y `FormGroup` de fila, evitando mezclar arrays planos de `control.value` con controles reactivos durante alta, baja y edicion.

## Alcance

- Crear `getTableFormArray(field: string): FormArray | null`.
- Renderizar PrimeNG con controles de fila derivados del `FormArray`.
- Mantener los eventos existentes y sus payloads `data` como arrays planos.
- Mantener el contrato JSON del servidor y los nombres de columnas.
- Marcar la tabla/formulario como dirty al agregar o eliminar filas.
- No modificar otros tipos de campos.

## Escenario 01: Unificar tabla dinamica sobre FormArray

La tabla usa el `FormArray` como fuente interna unica. PrimeNG recibe `formArray.controls` como adaptador de renderizado, y los valores emitidos o serializados se obtienen con `getRawValue()`.

## Escenario 02: Conectar celdas editables con formControlName

Se reforzo el template de la tabla para que cada fila renderizada declare su `FormGroup` y cada celda editable se conecte por `formControlName`, eliminando el acoplamiento directo de los inputs a `rowData.get(...)` como binding principal.

## Decisiones tomadas

- `getTableData(field)` queda como adaptador para PrimeNG y devuelve controles de fila.
- Los eventos `onTableAddRow`, `onTableEditRow`, `onTableDeleteRow` y `onTableCellEdit` siguen emitiendo `data` como array plano.
- La edicion por fila y celda escribe directamente en el `FormControl` de la celda.
- El sort y filtro global de PrimeNG apuntan a `value.<columna>` porque cada fila visible es un `FormGroup`.
- `updateTableFormControl` conserva compatibilidad recibiendo array plano, pero lo sincroniza reconstruyendo el `FormArray`.
- En el template, el `<tr>` recibe `[formGroup]="$any(rowData)"` y las celdas editables usan `[formControlName]="col.field"` para no depender de `ngModel`.

## Validaciones aplicadas

- Revision de inicializacion, agregar, eliminar, editar, guardar y cancelar filas/celdas.
- Revision del template de tabla para quitar `ngModel` de las celdas de tabla.
- Revision del binding reactivo de columnas `input-text`, `input-number`, default y tag en modo lectura.
- Build de Angular ejecutado con `npm run build` correctamente.

## Notas importantes

- La tabla queda en modo hibrido controlado solo hacia PrimeNG: internamente es `FormArray`, la vista consume `FormGroup[]` y los payloads externos son arrays planos derivados.
- No se cambia el JSON esperado por el servidor porque el valor del `FormArray` sigue siendo un array de objetos.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`

## Pendientes

- Validar manualmente en navegador una tabla con edicion por fila, edicion por celda, agregar, eliminar, sort y filtro global.
