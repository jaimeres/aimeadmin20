# Dropdown cache: plataforma y read

## Datos

- Fecha: 2026-06-04
- Consecutivo: 019
- Tipo: Cambio funcional

## Resumen

Se adapto la cache persistente de dropdowns para resolver configuracion por plataforma (`mobile`, `desktop`, `web`) y usar `cache.<platform>.load/read` como propiedades de activacion, conservando compatibilidad con `active` cuando no existan.

## Alcance

- Distinguir cliente movil nativo, desktop nativo y web desde `GeneralService`.
- Resolver `cache.mobile` cuando `generalS.isMobile()` sea verdadero.
- Resolver `cache.desktop` o `cache.web` con fallback cruzado cuando no sea movil.
- Aplicar la misma resolucion `mobile` / `desktop` / `web` al autoguardado de formulario.
- Mantener compatibilidad con `cache.<platform>.active` y configuraciones legacy `mobile.cache`, `desktop.cache` y `web.cache`.
- Exigir `cache.<platform>.time` mayor a cero para habilitar lectura y escritura persistente.
- Conservar llaves de almacenamiento, validacion de version y flujo de lectura/escritura existente.

<a id="escenario-01"></a>
## Escenario 01: Distinguir plataforma del cliente

`GeneralService` ahora expone helpers explicitos para identificar movil nativo, desktop nativo y web. `isDesktop()` se conserva como alias amplio para no romper consumidores existentes, pero la nueva logica puede usar `isDesktopApp()` e `isWeb()` cuando necesite separar desktop de web.

<a id="escenario-02"></a>
## Escenario 02: Resolver cache por plataforma y read

`DynamicDropdownDataService` selecciona la configuracion de cache segun la plataforma actual. En movil usa `cache.mobile`; en desktop usa `cache.desktop` con fallback a `cache.web`; en web usa `cache.web` con fallback a `cache.desktop`.

La propiedad `load` queda como activador preferente para opciones de dropdown; si falta, se usa `read` y despues `active` como fallback retrocompatible. Cuando el activador es objeto, `active`, `enabled`, `load` o `read` pueden apagarlo o encenderlo explicitamente.

Corrección posterior: la persistencia de opciones de dropdown usa `ClientCacheStorageService`. En web/desktop se guarda en IndexedDB y en móvil se conserva Preferences hasta la etapa de SQLite. La lógica de activación por `load/read/active + time` no cambia.

<a id="escenario-03"></a>
## Escenario 03: Resolver plataforma en autoguardado de formulario

`FormCacheService` ahora usa `GeneralService.getClientPlatform()` para identificar `mobile`, `desktop` o `web`. Al escanear campos cacheables del formulario, movil usa `cache.mobile`; desktop usa `cache.desktop` con fallback a `cache.web`; web usa `cache.web` con fallback a `cache.desktop`.

El almacenamiento sigue separado por plataforma: movil usa Capacitor Preferences, desktop usa `localStorage` y web usa `sessionStorage`.

## Decisiones tomadas

- No se cambio `getMobileCacheKey(...)` ni el formato guardado en Capacitor Preferences.
- La llave de dropdown se conserva, pero el storage fisico ya no es Preferences en web/desktop.
- No se cambio la validacion de version de app en lectura.
- El TTL sigue convirtiendose desde segundos a milisegundos mediante `getMobileCacheTtlMs(element)`.
- Sin TTL valido no se lee ni se escribe cache persistente.
- No se agrego cifrado a dropdowns porque eso cambiaria el formato persistido de esa cache y el alcance definido indicaba no modificar la forma de cifrado.

## Validaciones aplicadas

- `git diff --check` sin errores.
- `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts` no completo por fallas preexistentes del runner: fuentes Roboto no resueltas desde `src/assets/styles.scss` y specs existentes que importan `../../../testing/crud-test.helpers` inexistente.
- `npx tsc --noEmit` no completo por fallas preexistentes: specs con `../../../testing/crud-test.helpers` inexistente y errores previos en `src/app/auth/components/biometric-setup.component.ts` por acceso a `username` sobre un `Signal`.

## Notas importantes

- `load/read` gobierna tanto lectura como escritura persistente de opciones porque el flujo existente usa el mismo habilitador para ambas operaciones.
- `creation` y `edition` no se usan para opciones de dropdown; esos flags pertenecen al autoguardado/restauracion de borradores de formulario.
- `active` queda solo como compatibilidad para configuraciones existentes.

## Archivos modificados

- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.spec.ts`
- `src/app/utils/services/form-cache.service.ts`
- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/client-cache-storage.service.ts`
- `docs/documents/2026-06-04_019_dropdown-cache-platform-read.md`

## Pendientes

- Validar manualmente en APK/IPA y navegador un dropdown con `cache.mobile.load/read`, `cache.web.load/read` y fallback `desktop`/`web`.

## Pruebas sugeridas

- Confirmar que `cache.mobile.load/read === true` con `time > 0` lee y escribe Preferences en movil nativo.
- Confirmar que `cache.web.load/read === true` con `time > 0` habilita cache en navegador.
- Confirmar que `cache.desktop` se usa como fallback cuando falta `cache.web`.
- Confirmar que `active === true` sigue funcionando cuando `read` no existe.
