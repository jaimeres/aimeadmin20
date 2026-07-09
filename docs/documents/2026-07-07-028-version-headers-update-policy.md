# Headers de versión y bloqueo por política de actualización

## Datos

- Fecha: 2026-07-07
- Consecutivo: 028
- Tipo: Cambio funcional
- Resumen: El cliente oficial web/desktop debe enviar versión, build, plataforma y tipo de dispositivo para quedar sujeto a la política de actualización del backend. Cuando el backend deniega acceso por versión obligatoria, el frontend debe consultar `/app/update-policy` ignorando cache y mostrar el diálogo de actualización.

## Alcance

- Se agregan `appBuild: 4` y `appVersion: '1.0.8'` a environments como fallback explícito para web/desktop.
- El interceptor HTTP conserva Android/iOS con `App.getInfo()` y usa environment en web/desktop.
- El interceptor detecta respuestas 403 de actualización obligatoria y dispara `UpdateManagerService.checkForUpdatesAndShow(true)`.
- El servicio de actualización permite checks forzados en web/desktop y evita usar cache local en ese caso.
- El manager evita consultas simultáneas cuando varias peticiones fallan al mismo tiempo.
- En web/desktop, el diálogo de actualización usa recarga de página en vez de abrir una URL de descarga.

## Escenario 01: Fallback de build y versión en environments

Se documenta `appBuild` junto a `appVersion` para que web y desktop puedan enviar `X-App-Build` y `X-App-Version` sin depender de `android/app/build.gradle`, que solo aplica al build nativo Android.

## Escenario 02: Headers oficiales de cliente

El interceptor resuelve `X-Device-Type` desde `GeneralService.getClientPlatform()` y envía `X-Platform` como `android`, `ios`, `web` o `desktop`.

En móvil nativo conserva `App.getInfo()` para `X-App-Build` y `X-App-Version`. En web/desktop usa `environment.appBuild` y `environment.appVersion`.

## Escenario 03: Detección de bloqueo por versión en HTTP

Las respuestas 403 con mensajes de versión/actualización obligatoria disparan una verificación forzada de actualización. Se excluye `/app/update-policy` para evitar loops.

## Escenario 04: Consulta forzada sin cache

`UpdateService.checkForUpdates(..., true)` consulta explícitamente el servidor con la plataforma actual. Si no recibe una política fresca, no cae a la política cacheada.

## Escenario 05: Diálogo sin duplicados simultáneos

`UpdateManagerService` permite checks forzados fuera de móvil, actualiza la versión actual visible en el diálogo y evita checks forzados concurrentes o repetidos mientras el diálogo ya está visible.

## Escenario 06: Web refresca página en lugar de descargar

Cuando la política bloquea al cliente web o desktop, el resultado se marca con `refreshPage`. El diálogo muestra botón de refrescar y `UpdateManagerService.handleUpdateClick()` recarga la página. Android/iOS conservan el comportamiento previo de abrir la URL de descarga.

## Decisiones

- No se intentó leer `versionCode/versionName` desde `android/app/build.gradle` en runtime web/desktop porque ese archivo pertenece al build Android nativo y no está disponible como contrato del bundle web.
- No se agregó `X-Device-Id` para web/desktop porque no hay un identificador persistente web existente en el alcance revisado.
- Se preservan verificaciones automáticas solo móvil; web/desktop se activa por bloqueo backend mediante `forceCheck=true`.
- Se preserva la descarga nativa en móvil; solo web/desktop cambia a recarga de página.

## Validaciones aplicadas

- Revisar que navegador web envíe `X-Device-Type: web`, `X-Platform: web`, `X-App-Build: 4`, `X-App-Version: 1.0.8`.
- Revisar que desktop envíe `X-Device-Type: desktop`, `X-Platform: desktop`, `X-App-Build: 4`, `X-App-Version: 1.0.8` cuando `GeneralService` lo identifique así.
- Revisar que Android nativo conserve `App.getInfo()` para build/version.
- Revisar que un 403 por actualización obligatoria fuerce consulta a `/app/update-policy` y muestre diálogo sin usar cache.
- Revisar que el botón de actualización en web/desktop recargue la página y no abra la URL de descarga.

## Archivos modificados

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `src/app/auth/interceptors/token-access.interceptor.ts`
- `src/app/utils/services/update.service.ts`
- `src/app/utils/services/update-manager.service.ts`
- `src/app/components/update-dialog/update-dialog.component.ts`

## Pendientes

- Agregar una prueba automatizada del interceptor cuando exista harness HTTP para interceptores funcionales.
- Confirmar manualmente en una app desktop real si `GeneralService.getClientPlatform()` resuelve `desktop` con el runtime usado.
