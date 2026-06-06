# Custom Draw Form: cache de requests en curso para dropdowns

## Datos

- Fecha: 2026-06-02
- Consecutivo: 012
- Tipo: Cambio funcional

## Resumen

Se ajusto la carga de dropdowns en `custom-draw-form.component.ts` para evitar llamadas HTTP duplicadas cuando varios campos usan el mismo recurso de `data_type`, filtro, ordering y limit.

## Alcance

- Agregar un mapa privado de requests en curso por llave de consulta.
- Construir la llave con `app`, `type`, `filter`, `ordering` y `limit`.
- Separar la consulta HTTP de dropdowns en un metodo privado.
- Mantener el contrato publico de `dataDropdown(element, force)`.
- Mantener el formato actual de `dropdownOptionsSignal`.
- Mantener soporte para `data_type.options` y `element.options`.
- No modificar `SharedDynamicDataService` ni HTML.

<a id="escenario-01"></a>
## Escenario 01: Reutilizar requests identicos mientras estan en curso

Cuando `dropdownOptions()` precarga varios campos dropdown-like, dos campos diferentes podian iniciar al mismo tiempo consultas equivalentes antes de que `sharedS.drawDropdown` quedara poblado por campo. El nuevo flujo revisa primero la cache existente y, si debe ir al servidor, busca una promesa activa en `dropdownInFlight` usando la llave de consulta.

Si la promesa ya existe, el campo actual espera esa misma respuesta y luego publica sus opciones bajo su propio `element.field`. Si no existe, se crea con `fetchDropdownRows(element)` y se registra hasta que termine.

<a id="escenario-02"></a>
## Escenario 02: Mantener versión al reutilizar request compartida

Cuando dos consumidores pedían simultáneamente la misma consulta, se reutilizaba la promesa en vuelo, pero se incrementaba una versión por `field` en cada llamada. Eso podía hacer que el primer consumidor marcara como obsoleta una respuesta que en realidad compartía con el segundo.

La entrada `dropdownInFlight` ahora guarda la promesa junto con su versión. Si un consumidor reutiliza la misma request, reutiliza también la misma versión. Solo una request nueva incrementa la versión del campo.

## Decisiones tomadas

- `force=true` sigue saltandose la cache existente; si ya hay una consulta viva con la misma llave, se espera esa misma consulta de servidor.
- La cache compartida `sharedS.drawDropdown` se sigue escribiendo por campo para no cambiar consumidores existentes.
- La transformacion final hacia `dropdownOptionsSignal` sigue pasando por `_buildDropdownOptionsForField`, para conservar `tree-select`, `listbox`, `multi-select` y labels compuestos.
- Si el campo no resuelve `app/type` y no tenia opciones locales, se conserva el comportamiento anterior de no consultar ni publicar opciones nuevas.
- La version de request se conserva al reutilizar una promesa en curso para evitar falsos descartes de opciones.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings propios del proyecto sobre budgets, CommonJS y stylesheet no localizado.
- Se agrego spec de concurrencia para confirmar que dos llamadas simultaneas a la misma request reciben opciones y solo disparan un HTTP.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts`
- `docs/documents/2026-06-02_012_custom-draw-form-dropdown-inflight-cache.md`

## Pendientes

- Validar manualmente en navegador un formulario con dos dropdowns que compartan `data_type.type`, `filter`, `ordering` y `limit`.
