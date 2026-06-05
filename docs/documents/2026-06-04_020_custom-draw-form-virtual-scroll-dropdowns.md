# Custom Draw Form: virtual scroll en dropdowns dinamicos

## Datos

- Fecha: 2026-06-04
- Consecutivo: 020
- Tipo: Cambio funcional

## Resumen

Se agrego soporte declarativo para virtual scroll en controles dinamicos que consumen opciones de dropdown, usando la configuracion hermana de `cache`:

```ts
virtual_scrolling: {
  active: true,
  item_size: 20
}
```

## Alcance

- Activar virtual scroll en `p-select` usado por `dropdown` y `dropdown-choice`.
- Activar virtual scroll en `p-multiSelect`.
- Activar virtual scroll en `p-treeSelect`.
- Activar virtual scroll en `p-listbox`.
- Activar virtual scroll en `p-autoComplete`.
- Cambiar la prioridad de lectura para campos cacheables: opciones locales del draw, cache persistente, memoria compartida y servidor.
- Corregir busqueda local en controles tree-like agregando texto de filtro estable a nodos e items.

<a id="escenario-01"></a>
## Escenario 01: Virtualizar render de opciones

Los templates reutilizables de `custom-draw-form` leen `fieldConfig.virtual_scrolling.active` para habilitar virtual scroll y `fieldConfig.virtual_scrolling.item_size` para definir el alto de item.

Si `item_size` no viene configurado, o viene por debajo del alto real minimo de las filas de PrimeNG, se usa `38` para mantener sincronizado el calculo del virtual scroller con el alto efectivo de cada opcion.

En `p-listbox`, cuando `virtual_scrolling.active === true`, se fija `virtualScrollItemSize` en `40` y se agrega una clase local que elimina padding vertical de la lista virtualizada y fuerza `box-sizing: border-box` en filas y grupos. Los listbox sin virtual scroll no reciben esa clase ni cambian su comportamiento visual.

El `item_size` generico de `fieldConfig.virtual_scrolling` no se usa para `p-listbox` con checkbox porque valores altos separan las filas y valores bajos desincronizan el scroller. En este caso el contrato seguro es que el scroller y la fila renderizada midan ambos `40px`, permitiendo conservar el tamano real del checkbox definido por PrimeNG o los estilos globales.

Para evitar que el scroll lento se recalcule y parezca ciclarse, el `p-listbox` virtualizado tambien pasa `virtualScrollOptions` estable al `p-scroller` interno: `autoSize: false`, `delay: 0`, `numToleratedItems: 16` y `resizeDelay: 80`. Esto evita recrear opciones desde el template y reduce los cambios de rango durante movimientos pequenos de rueda o touchpad.

Ademas se desactiva `overflow-anchor` solo dentro del listbox virtualizado. Esto evita que el navegador reajuste automaticamente el `scrollTop` cuando PrimeNG cambia el rango de nodos renderizados, que era perceptible como salto o retorno al hacer scroll pequeno/despacio.

Esta configuracion solo afecta el render del panel/lista; no cambia la estructura de datos ni el contrato de opciones.

<a id="escenario-02"></a>
## Escenario 02: Prioridad de cache persistente antes de memoria

`DynamicDropdownDataService.dataDropdownExists` mantiene la prioridad maxima de opciones declaradas en el draw (`data_type.options` o `element.options`). Despues, si la cache persistente esta habilitada para la plataforma y tiene TTL valido, intenta leerla antes de consultar memoria compartida.

Si la cache persistente esta deshabilitada, no existe, esta vencida o no supera validaciones de version/label, el flujo cae a `sharedS.data`, luego `sharedS.drawDropdown` y finalmente servidor.

<a id="escenario-03"></a>
## Escenario 03: Buscar correctamente en campos tree

Los campos `tree-select` y `listbox` con `tree` transforman respuestas planas en `TreeNode` o grupos de listbox. Para que el filtro local no dependa solo de una clave puntual, cada nodo e item ahora incluye `filter_text`, construido con `label`, campos declarados en `option_label` y aliases comunes (`name`, `display_name`, `code`, `id`).

Los templates de `tree-select` y `listbox` incluyen `filter_text` dentro de `filterBy`, conservando cualquier `filter_by` declarado en el draw.

<a id="escenario-04"></a>
## Escenario 04: Primer render de opciones virtualizadas

Se retiro el parche visual `listbox-virtual-spaced` y los `min-height`/padding agregados al item template. El componente ahora publica las opciones en `dropdownOptionsSignal` y activa el virtual scroll del campo despues de un ciclo de render, mediante `virtualOptionsReadySignal`.

Esto evita que `p-listbox`, `p-select`, `p-multiSelect`, `p-treeSelect` y `p-autoComplete` creen el `p-scroller` mientras sus opciones aun estan vacias o acaban de cambiar, que era el origen del primer render sin elementos o con filas no consecutivas.

## Decisiones tomadas

- No se agrego paginacion remota ni lazy loading de servidor; el virtual scroll solicitado virtualiza el render local de opciones ya cargadas.
- No se cambio el formato persistido de cache ni el cifrado.
- `force=true` sigue saltando caches de lectura y fuerza servidor desde `dataDropdown`.
- Se conservaron las opciones locales declaradas en el draw como prioridad principal porque no requieren servidor ni persistencia.
- El virtual scroll no cambia la carga lazy por niveles del arbol: solo virtualiza las filas que ya estan en el panel. Las consultas de nivel/hijos siguen ocurriendo igual.
- No se usan reglas CSS artificiales para separar filas del listbox; el alto lo controla `virtualScrollItemSize`.
- La normalizacion CSS del listbox solo aplica cuando el campo declara `virtual_scrolling.active === true`, para no cambiar listbox no virtualizados.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings propios del proyecto sobre budgets, CommonJS y stylesheet no localizado.
- Corrección posterior validada con `npm run build`: sin errores de TypeScript/template; solo warnings existentes de budgets, CommonJS y stylesheet no localizado.
- Correccion de altura real de `p-listbox` virtualizado validada con `npm run build`: sin errores; se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.
- Correccion adicional del espaciado visible en `p-listbox`: `virtualScrollItemSize` y CSS de filas quedan fijos en `40px` para impedir huecos cuando `fieldConfig.virtual_scrolling.item_size` venga alto. Validada con `git diff --check` y `npm run build`.
- Correccion de scroll lento en `p-listbox`: se desactiva `autoSize` del `p-scroller` interno mediante `virtualScrollOptions` estable, se aumenta la tolerancia de items renderizados y se desactiva `overflow-anchor` en el contenedor virtualizado.
- Ajuste posterior: se restauro el tamano real del checkbox y se subio la fila virtual a `40px`; ademas, los campos sin `virtual_scrolling` vuelven a publicar sus opciones sin copia de array para evitar costo extra de carga.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `docs/documents/2026-06-04_020_custom-draw-form-virtual-scroll-dropdowns.md`

## Pendientes

- Validar manualmente un dropdown con una lista grande y `virtual_scrolling.active === true`.
- Validar manualmente `tree-select` y `listbox` porque su composicion visual depende del modo tree/grupos.

## Pruebas sugeridas

- Confirmar que un `dropdown` grande no renderiza todos los items visibles al abrir.
- Confirmar que `multi-select`, `listbox`, `tree-select` y `auto-complete` siguen seleccionando valores correctamente.
- Confirmar que con cache persistente habilitada se lee primero persistencia valida.
- Confirmar que `force=true` consulta servidor y actualiza cache.
