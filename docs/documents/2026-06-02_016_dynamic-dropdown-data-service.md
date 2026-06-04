# Custom Draw Form: servicio de datos para dropdowns dinamicos

## Datos

- Fecha: 2026-06-02
- Consecutivo: 016
- Tipo: Cambio funcional

## Resumen

Se movio la obtencion, normalizacion y cache de opciones de dropdown desde `custom-draw-form.component.ts` hacia `dynamic-dropdown-data.service.ts`, manteniendo el contrato publico de `dataDropdown(element, force)` y sin modificar el HTML.

## Alcance

- Crear `DynamicDropdownDataService` junto al componente de formulario dinamico.
- Centralizar llaves de dropdown, opciones locales, `SharedDynamicDataService`, cache movil, consulta HTTP y deduplicacion de requests.
- Normalizar `option_label` y `option_value` antes de publicar opciones.
- Mantener en el componente los eventos del template, `_updateDropdownOptions`, reaccion visual y conversiones visuales de `tree-select`/`listbox`.
- No modificar `SharedDynamicDataService`, `CRUDService` ni `GeneralService`.

<a id="escenario-01"></a>
## Escenario 01: Extraer resolucion de datos al servicio

El nuevo servicio concentra la lectura de opciones locales (`data_type.options` y `element.options`), la busqueda en caches compartidos namespaced, el fallback por sufijo, la lectura/escritura de cache movil y la consulta al servidor.

Tambien conserva la deduplicacion de requests en curso por llave de consulta y el control de version por campo para evitar que respuestas antiguas sobrescriban recargas forzadas.

<a id="escenario-02"></a>
## Escenario 02: Mantener el componente como publicador visual

`custom-draw-form.component.ts` conserva `dataDropdown(element, force)` y `dataDropdownExists(element, force)` como puntos de entrada. Estos metodos delegan datos al servicio, pero el componente mantiene `messageS.showBlocked`, `_updateDropdownOptions`, invalidacion de lazy tree en reload y `_buildDropdownOptionsForField`.

<a id="escenario-03"></a>
## Escenario 03: Cubrir normalizacion basica en pruebas

Se agregaron pruebas del servicio para validar opciones locales con `option_label` compuesto, aliases de `option_value` y prioridad de cache compartida namespaced frente a cache sin prefijo.

## Decisiones tomadas

- El servicio reutiliza los servicios existentes en lugar de duplicar contratos: `SharedDynamicDataService`, `CRUDService`, `GeneralService`, `AuthService` y `FormCacheService`.
- La salida del servicio queda normalizada para controles PrimeNG; el componente conserva la transformacion adicional para arboles y grupos de listbox porque esa parte esta ligada a reaccion visual.
- `force=true` sigue saltandose caches de lectura y evita reutilizar requests en curso.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.
- `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts` no completo por fallas preexistentes del runner: fuentes Roboto no resueltas desde `src/assets/styles.scss` y specs existentes que importan `../../../testing/crud-test.helpers` inexistente.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts`
- `docs/documents/2026-06-02_016_dynamic-dropdown-data-service.md`

## Pendientes

- Validar manualmente un formulario con dropdown local, dropdown desde servidor, reload forzado y cache movil activo.
