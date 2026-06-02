# Habilitar HTTP local en APK de prueba Android

- **Fecha:** 2026-06-01
- **Consecutivo:** 006
- **Tipo:** Cambio funcional

## Resumen de lo pedido

Permitir que el APK de prueba Android se conecte a un servidor local de pruebas
por HTTP, evitando el bloqueo `ERR_CLEARTEXT_NOT_PERMITTED`, y dejar explícito
cómo deshacer el cambio para no afectar la seguridad en producción.

## Alcance del cambio

- Se habilitó tráfico HTTP solo para builds Android `debug`.
- Se reescriben URLs `localhost` y `127.0.0.1` a un host utilizable por Android
  nativo durante desarrollo.
- Se alineó también la URL del socket para pruebas locales en Android.
- No se habilitó HTTP en `release`/producción.

## Escenario 01: HTTP local solo en Android de prueba

- Se creó un `AndroidManifest.xml` en `android/app/src/debug/` con:
  - `android:usesCleartextTraffic="true"`
  - `android:networkSecurityConfig="@xml/debug_network_security_config"`
- Se creó `android/app/src/debug/res/xml/debug_network_security_config.xml`
  permitiendo tráfico cleartext solo en builds debug.
- Se agregó un interceptor HTTP para Android nativo que reescribe
  `http://127.0.0.1` y `http://localhost` hacia `10.0.2.2` por defecto.
- Se agregó el mismo ajuste para `environment.socket_url`.
- Se dejó configurable `android_native_loopback_host` en `environment.ts` para
  cambiarlo a la IP LAN de la PC si la prueba se hace desde un teléfono físico.

## Decisiones tomadas

- Se limitó la habilitación de HTTP a `src/debug` para que producción siga
  usando la política segura por defecto de Android.
- Se resolvió la reescritura de loopback en un solo punto central (interceptor)
  para no tocar todos los servicios que consumen `environment.base_url`.
- Se usó `10.0.2.2` como valor por defecto porque es el alias estándar del host
  en el emulador oficial de Android.

## Validaciones aplicadas

- Revisión de `AndroidManifest.xml` principal: no tenía `usesCleartextTraffic`
  ni `networkSecurityConfig`.
- Revisión de `environment.ts`: apuntaba a `http://127.0.0.1:8000/v1`.
- El cambio quedó encapsulado en debug Android y en una reescritura condicional
  solo para Android nativo.

## Notas importantes

- `127.0.0.1` dentro de Android apunta al propio dispositivo, no a la PC.
- En emulador oficial Android usar `10.0.2.2`.
- En dispositivo físico usar la IP LAN de la PC en
  `environment.ts -> android_native_loopback_host`.
- El backend local debe escuchar en `0.0.0.0:8000` para que otro dispositivo
  de la red pueda alcanzarlo.

## Cómo deshacerlo para producción

- No es necesario deshacer nada si el APK de producción se construye en modo
  `release`, porque la habilitación de HTTP vive solo en `android/app/src/debug`.
- Si deseas eliminar también el soporte de pruebas locales, borrar:
  - `android/app/src/debug/AndroidManifest.xml`
  - `android/app/src/debug/res/xml/debug_network_security_config.xml`
  - `src/app/auth/interceptors/native-localhost.interceptor.ts`
  - `src/app/utils/native-local-url.util.ts`
  y retirar su registro en `src/app.config.ts`.

## Archivos modificados

- `src/environments/environment.ts`
- `src/app.config.ts`
- `src/app/utils/services/notification-socket.service.ts`
- `src/app/utils/native-local-url.util.ts`
- `src/app/auth/interceptors/native-localhost.interceptor.ts`
- `android/app/src/debug/AndroidManifest.xml`
- `android/app/src/debug/res/xml/debug_network_security_config.xml`

## Pendientes

- Si el APK de prueba se usa en teléfono físico, ajustar
  `android_native_loopback_host` a la IP LAN real de la PC.

## Pruebas sugeridas

- Ejecutar la app Android `debug` con backend local levantado.
- Verificar login contra `http://10.0.2.2:8000/v1` en emulador.
- Si se usa dispositivo físico, probar con la IP LAN configurada.