# Custom Draw Form: extraccion de tabla dinamica a componente

## Datos

- Fecha: 2026-06-02
- Consecutivo: 015
- Tipo: Cambio funcional

## Resumen

Se extrajo el primer corte seguro de la tabla dinamica de `custom-draw-form` hacia el componente standalone `dynamic-table-field.component`, sin cambiar el JSON del servidor ni los nombres de eventos publicos del componente padre.

## Alcance

- Crear `app-dynamic-table-field` como componente standalone con spec.
- Mover el template de PrimeNG Table al componente nuevo.
- Mover la logica de render, edicion de filas/celdas, alta, baja, validacion visual y payloads de eventos al hijo.
- Mantener en el padre la inicializacion del `FormArray` desde `drawForm`.
- Reemitir desde el padre los outputs publicos existentes.
- Mantener estilos/clases de tabla en el nuevo componente para conservar el aspecto visual.
- No extraer dropdowns, archivos, firmas ni cambiar el contrato del servidor.

<a id="escenario-01"></a>
## Escenario 01: Extraer componente de tabla dinamica

El nuevo componente recibe `tableConfig`, `formGroup`, estado de edicion compartido (`editingRows`, `editingCells`, `tablesToValidate`, `originalRowData`), opciones de tabla y version de validacion. Renderiza la tabla con PrimeNG usando el mismo `FormArray` de filas y conserva los modos de lectura, edicion por fila y edicion por celda.

Los outputs del hijo son `rowSelect`, `rowUnselect`, `addRow`, `editRow`, `deleteRow` y `cellEdit`. El padre los conecta a sus eventos publicos actuales: `onTableRowSelect`, `onTableRowUnselect`, `onTableAddRow`, `onTableEditRow`, `onTableDeleteRow` y `onTableCellEdit`.

<a id="escenario-02"></a>
## Escenario 02: Mantener al padre como orquestador del formulario

`custom-draw-form` conserva el recorrido del `drawForm`, la inicializacion inicial del `FormArray` y `validateTable(tableField)`. La normalizacion de columnas y caches de render se movieron al hijo, porque ya son parte del render de la tabla.

## Decisiones tomadas

- Se mantuvo `tableTemplate` como wrapper reusable para no tocar las tres ubicaciones actuales donde se renderizan tablas.
- El padre sigue pasando estado de edicion por referencia para evitar cambiar comportamiento entre renderizados y conservar compatibilidad con `validateTable`.
- No se hizo refactor de otros campos ni de la estructura JSON.
- Se copiaron los estilos de tabla al SCSS del hijo porque la encapsulacion de Angular impide que las reglas del padre apliquen dentro del componente extraido.

## Validaciones aplicadas

- `npm run build` exitoso.
- El build conserva warnings existentes de budgets, CommonJS y stylesheet no localizado.

## Notas importantes

- `onTableEditRow` se mantiene cableado como output publico del padre. No se agrego una nueva emision al boton de lapiz para no cambiar el comportamiento actual del template original.
- La tabla sigue usando `FormArray`/`FormGroup` y emite `data` como array plano mediante `getRawValue()`.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.html`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.scss`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.spec.ts`
- `src/app/components/custom-draw-form/dynamic-table-field/dynamic-table-field.component.ts`
- `docs/documents/2026-06-02_015_dynamic-table-field-component.md`

## Pendientes

- Validar manualmente en navegador una tabla con agregar, eliminar, editar fila, editar celda, cancelar, guardar, sort y seleccion de fila.

## Pruebas sugeridas

- Abrir un formulario con tabla editable y confirmar que el toolbar, columnas, tags y clases visuales se mantienen.
- Agregar y eliminar filas y confirmar que el `FormArray` queda dirty y el payload externo conserva `data`.
- Editar una celda requerida vacia y confirmar que la validacion visual sigue apareciendo.
