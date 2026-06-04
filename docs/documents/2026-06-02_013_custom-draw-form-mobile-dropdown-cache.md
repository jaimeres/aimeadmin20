# Custom Draw Form: cache movil de dropdowns

## Datos

- Fecha: 2026-06-02
- Consecutivo: 013
- Tipo: Cambio funcional

## Resumen

Se hizo consistente el flujo de cache movil de dropdowns en `custom-draw-form.component.ts`: la escritura en Capacitor Preferences ahora tiene una lectura equivalente, validada por TTL, version de app y `option_label`.

## Alcance

- Activar lectura de Preferences desde `dataDropdownExists`.
- Convertir `dataDropdownExists` a `async` y ajustar consumidores internos con `await`.
- Mantener prioridad de opciones locales (`data_type.options` y `element.options`).
- Mantener prioridad de `sharedS.data` y `sharedS.drawDropdown` antes del cache persistente.
- Escribir cache movil cuando el dropdown se carga desde servidor, incluyendo reload forzado.
- Garantizar que `reload_icon` con `force=true` no use cache local, memoria, Preferences ni request en curso.
- No modificar HTML ni el formato del JSON enviado por el servidor.

<a id="escenario-01"></a>
## Escenario 01: Reutilizar cache movil valido para dropdowns

Antes el componente podia guardar dropdowns en Preferences, pero la lectura estaba comentada en `dataDropdownExists`. El resultado era un cache persistente que se llenaba sin reducir consultas posteriores.

Ahora `dataDropdownExists` revisa el cache movil solo despues de opciones locales y caches en memoria, y solo si el campo tiene cache movil activo para la plataforma y modo actual. Si encuentra datos validos, los publica en `sharedS.drawDropdown` con la llave normal del componente y los devuelve al flujo existente de construccion de opciones.

## Decisiones tomadas

- El contrato principal de configuracion es `cache.mobile`; se conserva compatibilidad con `mobile.cache` porque era la forma que el componente ya consultaba.
- El cache movil queda activo solo en plataforma nativa movil, con `active === true` y con `creation` o `edition` permitido cuando el flag existe.
- La llave de Preferences incluye usuario, app, type, field, filtro, ordering, limit, `option_label`, separador y `option_value`, para no mezclar respuestas de dropdowns con configuraciones distintas.
- Los registros sin version de app se descartan como obsoletos.
- `force=true` no lee cache persistente, pero si la consulta al servidor termina correctamente actualiza Preferences para no conservar datos viejos.

<a id="escenario-02"></a>
## Escenario 02: Dar prioridad real al reload manual

El boton `reload_icon` llama `dataDropdown(fieldConfig, true)`. Para que ese flujo tenga preferencia real sobre cualquier cache, `force=true` ahora omite `dataDropdownExists`, no reutiliza `dropdownInFlight` y crea una llamada nueva al servidor.

Tambien se agrego una version de request por campo. Si habia una carga anterior en curso y termina despues del reload, esa respuesta anterior no puede sobrescribir `sharedS.drawDropdown` ni `dropdownOptionsSignal` para el campo recargado.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings propios del proyecto sobre budgets, CommonJS y stylesheet no localizado.

## Notas importantes

- El cache persistente no cambia el orden de prioridad de `sharedS.data` ni `sharedS.drawDropdown`.
- Si el cache no puede satisfacer el `optionLabelField`, se elimina la entrada y se fuerza el flujo normal hacia servidor.
- No se implemento cifrado adicional para dropdowns; la configuracion mostrada por el usuario usa `encrypted: false`.
- El reload manual requiere que el campo tenga `data_type.type` resoluble a `app/type`; si el campo es solo de opciones locales no hay endpoint que consultar.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md`

## Pendientes

- Validar manualmente en APK/IPA un dropdown con `cache.mobile.active === true`.

## Pruebas sugeridas

- Abrir un formulario movil con un dropdown cacheable y confirmar que la primera carga consulta servidor y la segunda carga lee Preferences.
- Confirmar que `force=true` consulta servidor y refresca la entrada persistente.
- Confirmar que `force=true` no reutiliza una request en curso iniciada por precarga.
- Confirmar que al cambiar version de app el cache anterior se descarta.
