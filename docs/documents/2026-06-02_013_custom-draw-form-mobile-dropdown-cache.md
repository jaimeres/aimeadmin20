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
- Mantener prioridad de opciones locales y memoria compartida; cuando `cache.<platform>.load/read` esta activo, el cache persistente se revisa despues de memoria y antes de servidor.
- Escribir cache movil cuando el dropdown se carga desde servidor, incluyendo reload forzado.
- Garantizar que `reload_icon` con `force=true` no use cache local, memoria, Preferences ni request en curso.
- Separar la memoria `drawDropdown` por filtro/ordering/limit/labels/usuario para que cambiar la configuracion del campo no reutilice opciones de una consulta anterior.
- No modificar HTML ni el formato del JSON enviado por el servidor.

<a id="escenario-01"></a>
## Escenario 01: Reutilizar cache movil valido para dropdowns

Antes el componente podia guardar dropdowns en Preferences, pero la lectura estaba comentada en `dataDropdownExists`. El resultado era un cache persistente que se llenaba sin reducir consultas posteriores.

Ahora `dataDropdownExists` revisa memoria compartida despues de opciones locales. Solo si no encuentra datos en memoria revisa el cache persistente y, si encuentra datos validos, los publica en `sharedS.drawDropdown` con llave de consulta y llave legacy de compatibilidad, y los devuelve al flujo existente de construccion de opciones.

## Decisiones tomadas

- El contrato principal de configuracion es `cache.mobile`; se conserva compatibilidad con `mobile.cache` porque era la forma que el componente ya consultaba.
- El cache persistente de opciones queda activo con `load`, `read` o `active` habilitado y `time > 0`; `creation` y `edition` no gobiernan opciones de dropdown porque pertenecen al borrador del formulario.
- La llave de Preferences incluye usuario, app, type, field, filtro, ordering, limit, `option_label`, separador y `option_value`, para no mezclar respuestas de dropdowns con configuraciones distintas.
- Los registros sin version de app se descartan como obsoletos.
- `force=true` no lee cache persistente, pero si la consulta al servidor termina correctamente actualiza Preferences para no conservar datos viejos.

<a id="escenario-02"></a>
## Escenario 02: Dar prioridad real al reload manual

El boton `reload_icon` llama `dataDropdown(fieldConfig, true)`. Para que ese flujo tenga preferencia real sobre cualquier cache, `force=true` ahora omite `dataDropdownExists`, no reutiliza `dropdownInFlight` y crea una llamada nueva al servidor.

Tambien se agrego una version de request por campo. Si habia una carga anterior en curso y termina despues del reload, esa respuesta anterior no puede sobrescribir `sharedS.drawDropdown` ni `dropdownOptionsSignal` para el campo recargado.

<a id="escenario-03"></a>
## Escenario 03: Evitar memoria stale al cambiar filtros

Antes `sharedS.drawDropdown` guardaba las opciones con una llave corta (`type:field`). Si el servidor cambiaba `data_type.filter`, `ordering`, `limit`, `option_label` u `option_value` durante la misma sesion, el dropdown podia reutilizar las opciones viejas aunque el cache persistente estuviera desactivado.

Ahora los campos que pueden consultar servidor leen primero una llave de memoria con firma de consulta: usuario, app, type, filtro, ordering, limit, labels, separador y option value. La llave corta se sigue escribiendo solo como compatibilidad para reconstruccion de payload legacy, pero la lectura normal del dropdown no la usa cuando el campo tiene endpoint resoluble.

<a id="escenario-04"></a>
## Escenario 04: Priorizar memoria sobre Preferences y separar borrador de opciones

Se corrigio el orden de resolucion para dropdowns: opciones locales, memoria compartida (`sharedS.data` / `sharedS.drawDropdown`), cache persistente y finalmente servidor. Con esto, si el usuario abre de nuevo un formulario dentro de la misma sesion, la app ya no cruza el puente nativo de Capacitor Preferences para un dropdown que ya vive en memoria.

Tambien se separo la semantica de `creation` / `edition`: esos flags siguen siendo del autoguardado de formulario, pero ya no desactivan la lectura/escritura persistente de opciones de dropdown. Para opciones se usan `load`, `read` o `active` junto con `time > 0`.

<a id="escenario-05"></a>
## Escenario 05: IndexedDB para dropdowns web y cache persistente separada

La cache persistente de opciones deja de depender directamente de Capacitor Preferences en todos los clientes. Ahora usa `ClientCacheStorageService`: en móvil conserva Preferences como etapa actual, y en web/desktop usa IndexedDB para evitar límites bajos de `localStorage` y no mezclar esta cache con la configuración de módulos.

El contrato funcional no cambia: primero se revisa memoria, después persistencia y al final servidor. `force=true` sigue obligando a consultar servidor y, si responde correctamente, actualiza la entrada persistente. `creation` y `edition` continúan reservados para borradores de formulario, no para opciones.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings propios del proyecto sobre budgets, CommonJS y stylesheet no localizado.
- `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts` no completo por fallas preexistentes del runner: fuentes Roboto no resueltas desde `src/assets/styles.scss` y specs existentes que importan `../../../testing/crud-test.helpers` inexistente.

## Notas importantes

- El cache persistente se consulta despues de opciones locales y memoria compartida cuando `cache.<platform>.load/read` esta activo.
- Desactivar `cache.<platform>.load/read` impide lectura/escritura persistente, pero no borra por si mismo entradas ya guardadas; esas entradas quedan ignoradas mientras la lectura este apagada y solo se eliminan si luego se vuelven a leer y fallan TTL, version o shape.
- La memoria `sharedS.drawDropdown` se limpia al reiniciar la app/web o al reconstruir el servicio; dentro de la misma sesion se evita reutilizar consultas viejas mediante la nueva firma de consulta.
- Si el cache no puede satisfacer el `optionLabelField`, se elimina la entrada y se fuerza el flujo normal hacia servidor.
- No se implemento cifrado adicional para dropdowns; la configuracion mostrada por el usuario usa `encrypted: false`.
- El reload manual requiere que el campo tenga `data_type.type` resoluble a `app/type`; si el campo es solo de opciones locales no hay endpoint que consultar.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts`
- `src/app/utils/services/client-cache-storage.service.ts`
- `docs/documents/2026-06-02_013_custom-draw-form-mobile-dropdown-cache.md`

## Pendientes

- Validar manualmente en APK/IPA un dropdown con `cache.mobile.active === true`.
- Etapa 2: migrar dropdowns móviles grandes de Preferences a SQLite.

## Pruebas sugeridas

- Abrir un formulario movil con un dropdown cacheable y confirmar que la primera carga consulta servidor y la segunda carga lee Preferences.
- Abrir un mismo formulario dos veces en la misma sesion y confirmar que la segunda apertura usa memoria antes de Preferences.
- Confirmar que `force=true` consulta servidor y refresca la entrada persistente.
- Confirmar que `force=true` no reutiliza una request en curso iniciada por precarga.
- Confirmar que al cambiar version de app el cache anterior se descarta.
- Confirmar que al cambiar `data_type.filter` en la misma sesion no se reutilizan opciones de la llave corta anterior de `drawDropdown`.
- Confirmar en navegador que un dropdown con `cache.web.load/read === true` escribe y lee desde IndexedDB.
